const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { hashPassword, validatePasswordStrength } = require('../auth');
const { requireAdmin, sensitiveLimiter } = require('../middleware');
const { getClientPreference, setAdminDefaultViewMode } = require('../clientPreferences');
const { processMetaCSV, formatForTrafficDash } = require('../csvParser');

router.use(requireAdmin);
router.use(['/clients', '/clients/:id', '/import-csv', '/analyze-csv', '/visibility/:clientId', '/access-history'], sensitiveLimiter);

router.get('/clients', async (_req, res) => {
  const { data, error } = await supabase
    .from('traffic_users')
    .select('id, username, client_id, role')
    .eq('role', 'client')
    .order('id', { ascending: true });
  if (error) return res.status(500).json({ error: 'Erro ao buscar clientes' });
  const enriched = (data || []).map(client => ({ ...client, preferences: getClientPreference(client.client_id) }));
  res.json(enriched);
});

router.post('/clients', async (req, res) => {
  const { username, password, client_id } = req.body;
  if (!username || !password || !client_id) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }
  const passwordValidationError = validatePasswordStrength(password);
  if (passwordValidationError) {
    return res.status(400).json({ error: passwordValidationError });
  }
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from('traffic_users')
    .insert({ username, password: passwordHash, client_id, role: 'client' })
    .select('id, username, client_id')
    .single();
  if (error) return res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
  res.json(data);
});

router.put('/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, client_id } = req.body;
  const payload = { username, client_id };
  if (password) {
    const passwordValidationError = validatePasswordStrength(password);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
    }
    payload.password = await hashPassword(password);
  }
  const { data: existing, error: findErr } = await supabase
    .from('traffic_users')
    .select('client_id, username')
    .eq('id', id)
    .eq('role', 'client')
    .single();
  if (findErr || !existing) return res.status(404).json({ error: 'Cliente não encontrado' });
  const oldClientId = existing.client_id;
  const oldUsername = existing.username;
  const { error } = await supabase
    .from('traffic_users')
    .update(payload)
    .eq('id', id)
    .eq('role', 'client');
  if (error) return res.status(500).json({ error: error.message || 'Erro ao atualizar' });
  if (oldClientId && client_id && oldClientId !== client_id) {
    await supabase.from('traffic_performance').update({ client_id }).eq('client_id', oldClientId);
    const { data: currentVisibility } = await supabase.from('traffic_client_visibility').select('*').eq('client_id', oldClientId).maybeSingle();
    if (currentVisibility) {
      const { id: _id, ...visPayload } = currentVisibility;
      await supabase.from('traffic_client_visibility').upsert({ ...visPayload, client_id }, { onConflict: 'client_id' });
      await supabase.from('traffic_client_visibility').delete().eq('client_id', oldClientId);
    }
  }
  if (oldUsername && username && oldUsername !== username) {
    await supabase.from('traffic_access_log').update({ username }).eq('username', oldUsername);
  }
  res.json({ success: true });
});

router.delete('/clients/:id', async (req, res) => {
  const { id } = req.params;
  const { data: client, error: findErr } = await supabase
    .from('traffic_users')
    .select('id, username, client_id')
    .eq('id', id)
    .eq('role', 'client')
    .single();
  if (findErr || !client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const clientId = client.client_id;
  const perfDel = await supabase.from('traffic_performance').delete().eq('client_id', clientId);
  if (perfDel.error) return res.status(500).json({ error: 'Erro ao deletar dados do cliente' });
  const visDel = await supabase.from('traffic_client_visibility').delete().eq('client_id', clientId);
  if (visDel.error) return res.status(500).json({ error: 'Erro ao deletar visibilidade do cliente' });
  const logDel = await supabase.from('traffic_access_log').delete().eq('user_id', client.id);
  if (logDel.error) return res.status(500).json({ error: 'Erro ao deletar histórico do cliente' });
  const userDel = await supabase.from('traffic_users').delete().eq('id', id).eq('role', 'client');
  if (userDel.error) return res.status(500).json({ error: 'Erro ao deletar cliente' });
  res.json({ success: true, deletedClientId: clientId });
});

router.delete('/data/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('traffic_performance').delete().eq('id', id);
  if (error) return res.status(500).json({ error: 'Erro ao deletar' });
  res.json({ success: true });
});

router.put('/data/:id', async (req, res) => {
  const { id } = req.params;
  const { date, clicks, impressions, spend, conversions } = req.body;
  const { error } = await supabase
    .from('traffic_performance')
    .update({ date, clicks, impressions, spend, conversions })
    .eq('id', id);
  if (error) return res.status(500).json({ error: 'Erro ao atualizar' });
  res.json({ success: true });
});

// Rota para analisar CSV misto e retornar preview antes de importar
router.post('/analyze-csv', async (req, res) => {
  const { csv_text } = req.body;
  if (!csv_text) return res.status(400).json({ error: 'CSV vazio' });

  try {
    const processed = processMetaCSV(csv_text);
    const formattedData = formatForTrafficDash(processed);

    res.json({
      success: true,
      analysis: {
        totalRows: processed.totalRows,
        isMixed: processed.analysis.isMixed,
        types: processed.analysis.types,
        clicksRows: processed.clickRows.length,
        conversationRows: processed.conversationRows.length,
      },
      preview: formattedData.slice(0, 10),
      formattedData,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/import-csv', async (req, res) => {
  const { client_id, data, csv_text } = req.body;

  // Se veio CSV bruto, processa automaticamente (modo misto)
  if (csv_text && !data) {
    try {
      const processed = processMetaCSV(csv_text);
      const formattedData = formatForTrafficDash(processed);
      
      const rows = formattedData.map(row => ({
        client_id,
        date: row.date,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        spend: Number(row.spend || 0),
        conversions: Number(row.conversions || 0),
        import_mode: 'auto_mixed',
      }));

      if (!rows.length) return res.status(400).json({ error: 'Nenhum dado válido encontrado' });

      const { error } = await supabase.from('traffic_performance').insert(rows);
      if (error) return res.status(500).json({ error: error.message });

      return res.json({
        success: true,
        imported: rows.length,
        analysis: {
          totalRows: processed.totalRows,
          isMixed: processed.analysis.isMixed,
          types: processed.analysis.types,
        },
        warning: processed.analysis.isMixed 
          ? 'CSV misto processado automaticamente: cliques + conversas combinados por data'
          : null,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // Modo tradicional: dados já parseados
  if (!client_id || !Array.isArray(data) || !data.length) {
    return res.status(400).json({ error: 'Dados inválidos para importação' });
  }

  const modeCount = data.reduce((acc, row) => {
    const mode = row?.import_mode || 'daily';
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {});

  const detectedImportMode = modeCount.daily && modeCount.aggregated ? 'mixed' : modeCount.aggregated ? 'aggregated' : modeCount.daily ? 'daily' : (data[0]?.import_mode || 'unknown');
  const hasAggregatedData = !!modeCount.aggregated;
  const hasMixedData = detectedImportMode === 'mixed';

  const rows = data.map(row => ({
    client_id,
    date: row.date,
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    spend: Number(row.spend || 0),
    conversions: Number(row.conversions || 0),
  })).filter(row => row.date);

  const { error } = await supabase.from('traffic_performance').insert(rows);
  if (error) return res.status(500).json({ error: error.message || 'Erro ao importar dados' });

  res.json({
    success: true,
    imported: rows.length,
    import_mode: detectedImportMode,
    stats: { daily: modeCount.daily || 0, aggregated: modeCount.aggregated || 0 },
    warning: hasMixedData
      ? 'Arquivo misto detectado. Linhas combinadas automaticamente.'
      : hasAggregatedData
      ? 'Arquivo agregado por período/campanha importado.'
      : null,
  });
});

router.get('/visibility/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { data, error } = await supabase
    .from('traffic_client_visibility')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) return res.json({ show_spend: true, show_conversions: true, show_cpa: true, show_ctr: true });
  res.json(data || { client_id: clientId, show_spend: true, show_conversions: true, show_cpa: true, show_ctr: true });
});

router.post('/visibility/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { show_spend, show_conversions, show_cpa, show_ctr } = req.body;
  const payload = {
    client_id: clientId,
    show_spend: !!show_spend,
    show_conversions: !!show_conversions,
    show_cpa: !!show_cpa,
    show_ctr: !!show_ctr,
  };
  const { error } = await supabase.from('traffic_client_visibility').upsert(payload, { onConflict: 'client_id' });
  if (error) return res.status(500).json({ error: 'Erro ao salvar' });
  res.json({ success: true });
});

router.get('/client-preferences/:clientId', async (req, res) => {
  const { clientId } = req.params;
  res.json(getClientPreference(clientId));
});

router.post('/client-preferences/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { defaultViewMode } = req.body || {};
  const normalizedMode = defaultViewMode === 'simplified' ? 'simplified' : 'standard';
  const updated = setAdminDefaultViewMode(clientId, normalizedMode);
  res.json({ success: true, preferences: updated });
});

router.get('/access-history', async (_req, res) => {
  const { data, error } = await supabase
    .from('traffic_access_log')
    .select('*')
    .order('accessed_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: 'Erro ao buscar histórico' });
  res.json(data || []);
});

module.exports = router;

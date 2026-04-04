const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { ensureClientAccess } = require('../middleware');

function applyUserScope(query, req, clientIdColumn = 'client_id') {
  if (req.user?.role === 'client') {
    return query.eq(clientIdColumn, req.user.client_id);
  }
  return query;
}

function normalizeClientIdForWrite(req, requestedClientId) {
  if (req.user?.role === 'client') {
    return req.user.client_id;
  }
  return requestedClientId;
}

router.get('/performance', async (req, res) => {
  let query = supabase
    .from('traffic_performance')
    .select('*')
    .order('date', { ascending: false });

  query = applyUserScope(query, req);
  const { data, error } = await query;

  if (error) return res.status(500).json({ error: 'Erro ao buscar dados' });
  res.json(data || []);
});

router.get('/performance/client/:clientId', async (req, res) => {
  const { clientId } = req.params;
  if (!ensureClientAccess(clientId, req)) {
    return res.status(403).json({ error: 'Acesso restrito para este cliente' });
  }

  const { data, error } = await supabase
    .from('traffic_performance')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: 'Erro ao buscar dados' });
  res.json(data || []);
});

router.get('/comparison/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const { start, end } = req.query;
  if (!ensureClientAccess(clientId, req)) {
    return res.status(403).json({ error: 'Acesso restrito para este cliente' });
  }
  if (!start || !end) return res.status(400).json({ error: 'Informe start e end dates' });

  const startDate = new Date(start);
  const endDate = new Date(end);
  const duration = endDate - startDate;
  const prevStart = new Date(startDate - duration);
  const prevEnd = new Date(startDate);
  const prevStartStr = prevStart.toISOString().split('T')[0];
  const prevEndStr = prevEnd.toISOString().split('T')[0];

  const { data: currentRows, error: currErr } = await supabase
    .from('traffic_performance')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', start)
    .lte('date', end);
  if (currErr) return res.status(500).json({ error: 'Erro ao buscar dados' });

  const { data: prevRows, error: prevErr } = await supabase
    .from('traffic_performance')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', prevStartStr)
    .lte('date', prevEndStr);
  if (prevErr) return res.status(500).json({ error: 'Erro ao buscar dados' });

  const current = calculateMetrics(currentRows || []);
  const previous = calculateMetrics(prevRows || []);

  res.json({
    current,
    previous,
    change: {
      clicks: previous.clicks > 0 ? ((current.clicks - previous.clicks) / previous.clicks * 100).toFixed(1) : 0,
      spend: previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend * 100).toFixed(1) : 0,
      conversions: previous.conversions > 0 ? ((current.conversions - previous.conversions) / previous.conversions * 100).toFixed(1) : 0,
      ctr: previous.ctr > 0 ? ((current.ctr - previous.ctr) / previous.ctr * 100).toFixed(1) : 0,
    }
  });
});

function calculateMetrics(rows) {
  const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const spend = rows.reduce((s, r) => s + parseFloat(r.spend || 0), 0);
  const conversions = rows.reduce((s, r) => s + (r.conversions || 0), 0);
  const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;
  const cpa = conversions > 0 ? (spend / conversions) : 0;
  const cpc = clicks > 0 ? (spend / clicks) : 0;
  return { clicks, spend, conversions, impressions, ctr, cpa, cpc };
}

router.get('/visibility/:clientId', async (req, res) => {
  const { clientId } = req.params;
  if (!ensureClientAccess(clientId, req)) {
    return res.status(403).json({ error: 'Acesso restrito para este cliente' });
  }

  const { data, error } = await supabase
    .from('traffic_client_visibility')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) return res.json({ show_spend: true, show_conversions: true, show_cpa: true, show_ctr: true });
  res.json(data || { client_id: clientId, show_spend: true, show_conversions: true, show_cpa: true, show_ctr: true });
});

router.get('/access-history/:username', async (req, res) => {
  const requestedUsername = req.params.username;
  const allowedUsername = req.user?.role === 'admin' ? requestedUsername : req.user?.username;
  if (req.user?.role !== 'admin' && requestedUsername !== req.user?.username) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }

  const { data, error } = await supabase
    .from('traffic_access_log')
    .select('*')
    .eq('username', allowedUsername)
    .order('accessed_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: 'Erro ao buscar histórico' });
  res.json(data || []);
});

module.exports = router;

// Import JS - AdDash Lab (Detecção automática de CSVs mistos)
console.log('Import JS carregando');

function parseCSV(text) {
  const normalizedText = (text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!normalizedText) return [];
  const lines = normalizedText.split('\n').filter(line => line.trim());
  if (!lines.length) return [];
  const delimiter = detectCSVDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter).map(normalizeHeader);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ? values[idx].trim() : ''; });
    data.push(row);
  }
  return data;
}

function detectCSVDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function normalizeHeader(h) { return (h || '').replace(/^\uFEFF/, '').trim().toLowerCase(); }

function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') { if (inQuotes && nextChar === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (char === delimiter && !inQuotes) { result.push(current); current = ''; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

function detectSemanticRowType(resultType, campaignName) {
  const t = normalizeHeader(resultType || '');
  const c = normalizeHeader(campaignName || '');
  
  // Só 'Conversas por mensagem iniciadas' conta como conversão
  if (t.includes('conversa') && t.includes('mensagem')) return 'conversas';
  // Cliques no link e Leads contam como cliques
  if (t.includes('clique') && t.includes('link')) return 'cliques';
  if (t.includes('lead')) return 'cliques';
  if (/alcance|reach/.test(t)) return 'alcance';
  
  // Se tipo vazio, detecta pelo nome da campanha
  if (!t || t === 'desconhecido') {
    if (c.includes('[conversas]') && c.includes('[perene]')) return 'conversas';
    if (/\[leads\]|\[cliques\]/.test(c)) return 'cliques';
    if (/\[alcance\]/.test(c)) return 'alcance';
  }
  
  return 'desconhecido';
}

function processImportedData(rows) {
  return rows.map(row => {
    const date = normalizeDate(row['dia'] || row['date'] || row['data'] || '');
    const resultType = row['tipo de resultado'] || row['result type'] || '';
    const campaignName = row['nome da campanha'] || row['campaign name'] || '';
    const semanticType = detectSemanticRowType(resultType, campaignName);
    const impressions = parseIntegerField(row['impressões'] || row['impressoes'] || row['impressions'] || 0);
    const spend = parseNumberField(row['valor usado (brl)'] || row['spend'] || row['gasto'] || row['valor usado'] || 0);
    const results = parseIntegerField(row['resultados'] || row['results'] || 0);
    const linkClicks = parseIntegerField(row['cliques no link'] || row['clicks'] || 0);

    let clicks = 0, conversions = 0;
    if (semanticType === 'cliques') { clicks = results; }
    else if (semanticType === 'conversas') { conversions = results; clicks = linkClicks; }
    else if (semanticType === 'leads') { clicks = results; }
    else { clicks = linkClicks; conversions = results; }

    return {
      date, clicks, impressions, spend, conversions,
      import_mode: 'daily',
      source_row_type: semanticType,
      result_type: resultType,
      campaign_name: row['nome da campanha'] || row['campaign name'] || ''
    };
  }).filter(row => row.date && (row.impressions > 0 || row.spend > 0));
}

function analyzeResultTypes(rows) {
  const types = { cliques: 0, conversas: 0, alcance: 0, leads: 0, desconhecido: 0 };
  for (const row of rows) {
    const t = row.source_row_type || 'desconhecido';
    if (types.hasOwnProperty(t)) types[t]++;
  }
  return types;
}

function parseNumberField(v) {
  if (v == null) return 0;
  const n = String(v).trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const p = parseFloat(n);
  return Number.isFinite(p) ? p : 0;
}

function parseIntegerField(v) { const p = parseNumberField(v); return Number.isFinite(p) ? Math.round(p) : 0; }

function normalizeDate(v) {
  if (!v) return '';
  let d = String(v).replace(/[^\d\-\/]/g, '');
  if (d.includes('/')) {
    const p = d.split('/');
    if (p.length === 3) {
      // Detecta formato: se primeiro valor > 12, é DD/MM/YYYY (brasileiro)
      // Se segundo valor > 12, é MM/DD/YYYY (americano)
      const first = parseInt(p[0], 10);
      const second = parseInt(p[1], 10);
      
      // Se dia > 12, com certeza é DD/MM
      if (first > 12) {
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      // Se mês > 12, com certeza é MM/DD
      if (second > 12) {
        return `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
      }
      // Ambíguo: assume MM/DD/YYYY (formato americano do Meta Ads)
      return `${p[2]}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`;
    }
  }
  return d;
}

async function loadImportPage() {
  const content = document.getElementById('contentArea');
  const role = getRole();
  if (role !== 'admin') { content.innerHTML = '<div class="text-center text-silver py-12">Acesso restrito</div>'; return; }

  content.innerHTML = `
    <div class="fade-enter">
      <div class="glass-card rounded-2xl p-6 mb-6">
        <h3 class="text-xl font-display font-semibold text-white mb-6">Importar Dados</h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-silver mb-2">Selecione o Cliente</label>
            <select id="importClientId" class="premium-input w-full rounded-xl px-4 py-3 mb-4"><option value="">Carregando...</option></select>
            <div class="bg-royal/10 border border-royal/30 rounded-xl p-4 mb-4">
              <p class="text-white font-medium mb-2">⚡ Detecção Automática</p>
              <p class="text-silver text-sm">O sistema detecta automaticamente linhas de <span class="text-white">Cliques no link</span> e <span class="text-white">Conversas</span> no mesmo CSV.</p>
              <p class="text-silver/80 text-xs mt-2">Não precisa separar manualmente. O tratamento é feito linha a linha.</p>
            </div>
            <label class="block text-sm font-medium text-silver mb-2">Arquivo CSV</label>
            <div class="border-2 border-dashed border-graphite rounded-xl p-8 text-center hover:border-royal transition cursor-pointer" id="dropZone">
              <svg class="w-12 h-12 mx-auto text-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p class="text-silver mb-2">Arraste o arquivo aqui ou clique para selecionar</p>
              <p class="text-silver/80 text-sm">Formato: CSV do Meta Ads</p>
              <input type="file" id="fileInput" class="hidden" accept=".csv">
            </div>
            <div id="fileInfo" class="hidden mt-4 p-4 bg-royal/10 rounded-xl border border-royal/30">
              <p class="text-white font-medium" id="fileName"></p>
              <p class="text-silver text-sm" id="fileSize"></p>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-silver mb-4">Pré-visualização</h4>
            <div id="previewArea" class="bg-dark/50 rounded-xl p-4 max-h-80 overflow-auto"><p class="text-silver/80 text-center">Nenhum arquivo selecionado</p></div>
            <div class="mt-4 flex gap-3">
              <button id="importBtn" class="flex-1 btn-premium rounded-xl py-3 px-4 text-white font-semibold disabled:opacity-50" disabled>Importar Dados</button>
              <button id="clearBtn" class="px-4 py-3 border border-graphite rounded-xl hover:bg-graphite/30 transition text-white">Limpar</button>
            </div>
            <div id="importResult" class="mt-4 hidden"></div>
          </div>
        </div>
      </div>
    </div>`;

  const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
  const clients = await clientsRes.json();
  const select = document.getElementById('importClientId');
  select.innerHTML = clients.length > 0 ? clients.map(c => `<option value="${c.client_id}">${c.username} (${c.client_id})</option>`).join('') : '<option value="">Nenhum cliente cadastrado</option>';

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  let parsedData = [], processedData = [];

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-royal'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-royal'));
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('border-royal'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

  async function handleFile(file) {
    document.getElementById('fileInfo').classList.remove('hidden');
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    const text = await file.text();
    parsedData = parseCSV(text);
    processedData = processImportedData(parsedData);
    renderPreview(processedData);
  }

  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('previewArea').innerHTML = '<p class="text-silver/80 text-center">Nenhum arquivo selecionado</p>';
    document.getElementById('importBtn').disabled = true;
    parsedData = []; processedData = []; fileInput.value = '';
  });

  function renderPreview(processed) {
    const preview = document.getElementById('previewArea');
    const importBtn = document.getElementById('importBtn');
    if (!processed.length) { preview.innerHTML = '<p class="text-danger text-center">Nenhum dado válido encontrado</p>'; importBtn.disabled = true; return; }

    const resultTypes = analyzeResultTypes(processed);
    const hasClicks = resultTypes.cliques > 0;
    const hasConversations = resultTypes.conversas > 0;
    const hasMixed = hasClicks && hasConversations;

    let warningHtml = '';
    if (hasMixed) {
      warningHtml = `<div class="mb-4 p-3 bg-royal/20 border border-royal/40 rounded-xl">
        <p class="text-white font-medium">📊 CSV com múltiplos tipos detectado</p>
        <p class="text-silver text-sm mt-2"><span class="text-white">${resultTypes.cliques}</span> linhas de <span class="text-sky-400">Cliques no link</span> · <span class="text-white">${resultTypes.conversas}</span> linhas de <span class="text-emerald-400">Conversas</span></p>
        <p class="text-silver/80 text-xs mt-2">Cada linha será tratada automaticamente: linhas de clique alimentam métricas de clique, linhas de conversa alimentam conversões.</p>
      </div>`;
    } else if (hasClicks) {
      warningHtml = `<div class="mb-4 p-3 bg-sky/10 border border-sky/30 rounded-xl"><p class="text-sky-400 font-medium">🖱️ CSV de Cliques no link</p><p class="text-silver text-sm mt-1">${resultTypes.cliques} linhas detectadas.</p></div>`;
    } else if (hasConversations) {
      warningHtml = `<div class="mb-4 p-3 bg-emerald/10 border border-emerald/30 rounded-xl"><p class="text-emerald-400 font-medium">💬 CSV de Conversas</p><p class="text-silver text-sm mt-1">${resultTypes.conversas} linhas detectadas.</p></div>`;
    }

    const totalClicks = processed.reduce((s, r) => s + (r.clicks || 0), 0);
    const totalConversions = processed.reduce((s, r) => s + (r.conversions || 0), 0);
    const totalSpend = processed.reduce((s, r) => s + (r.spend || 0), 0);

    preview.innerHTML = `${warningHtml}
      <table class="premium-table w-full text-sm">
        <thead><tr><th class="text-left py-2 px-3">Data</th><th class="text-left py-2 px-3">Tipo</th><th class="text-right py-2 px-3">Cliques</th><th class="text-right py-2 px-3">Conv.</th><th class="text-right py-2 px-3">Gasto</th></tr></thead>
        <tbody>${processed.slice(0, 20).map(r => `<tr class="border-t border-graphite/50"><td class="py-2 px-3">${r.date}</td><td class="py-2 px-3"><span class="px-2 py-1 rounded text-xs ${r.source_row_type === 'cliques' ? 'bg-sky/20 text-sky-400' : r.source_row_type === 'conversas' ? 'bg-emerald/20 text-emerald-400' : 'bg-graphite/30 text-silver'}">${r.source_row_type}</span></td><td class="text-right py-2 px-3">${r.clicks || '-'}</td><td class="text-right py-2 px-3">${r.conversions || '-'}</td><td class="text-right py-2 px-3">R$ ${(r.spend || 0).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      ${processed.length > 20 ? `<p class="text-silver/60 text-xs mt-2">Mostrando 20 de ${processed.length} linhas.</p>` : ''}
      <div class="mt-4 pt-4 border-t border-graphite/50 grid grid-cols-3 gap-4 text-center">
        <div><p class="text-silver/60 text-xs">Total Cliques</p><p class="text-white font-semibold">${totalClicks.toLocaleString('pt-BR')}</p></div>
        <div><p class="text-silver/60 text-xs">Total Conversões</p><p class="text-white font-semibold">${totalConversions.toLocaleString('pt-BR')}</p></div>
        <div><p class="text-silver/60 text-xs">Total Gasto</p><p class="text-white font-semibold">R$ ${totalSpend.toFixed(2)}</p></div>
      </div>`;

    importBtn.disabled = false;
  }

  document.getElementById('importBtn').addEventListener('click', async () => {
    if (!processedData.length) return;
    const clientId = document.getElementById('importClientId').value;
    if (!clientId) { alert('Selecione um cliente'); return; }

    const importBtn = document.getElementById('importBtn');
    importBtn.disabled = true;
    importBtn.textContent = 'Importando...';

    try {
      const res = await apiFetch('/api/admin/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, data: processedData })
      });
      const result = await res.json();
      const resultDiv = document.getElementById('importResult');
      resultDiv.classList.remove('hidden');
      if (result.success) {
        resultDiv.innerHTML = `<div class="p-4 bg-success/10 border border-success/30 rounded-xl"><p class="text-success font-medium">✅ Importação concluída</p><p class="text-silver text-sm mt-1">${result.imported} linhas importadas.</p>${result.warning ? `<p class="text-silver/80 text-xs mt-2">${result.warning}</p>` : ''}</div>`;
      } else {
        resultDiv.innerHTML = `<div class="p-4 bg-danger/10 border border-danger/30 rounded-xl"><p class="text-danger font-medium">❌ Erro na importação</p><p class="text-silver text-sm mt-1">${result.error || 'Erro desconhecido'}</p></div>`;
      }
    } catch (err) {
      const resultDiv = document.getElementById('importResult');
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = `<div class="p-4 bg-danger/10 border border-danger/30 rounded-xl"><p class="text-danger font-medium">❌ Erro</p><p class="text-silver text-sm mt-1">${err.message}</p></div>`;
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = 'Importar Dados';
    }
  });
}

window.loadImportPage = loadImportPage;

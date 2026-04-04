// Import JS - AdDash
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
        headers.forEach((h, idx) => {
            row[h] = values[idx] ? values[idx].trim() : '';
        });
        data.push(row);
    }
    return data;
}

function detectCSVDelimiter(headerLine) {
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
}

function normalizeHeader(header) {
    return (header || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase();
}

function parseCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function processImportedData(rows, campaignType) {
    const importMode = detectImportMode(rows);
    
    const data = rows.map(row => {
        const endDate = normalizeDate(
            row['término dos relatórios']
            || row['termino dos relatorios']
            || ''
        );
        const startDate = normalizeDate(
            row['início dos relatórios']
            || row['inicio dos relatorios']
            || ''
        );
        
        let date = normalizeDate(
            row['dia']
            || row['date']
            || row['data']
            || endDate
            || startDate
            || ''
        );
        
        const clicks = parseIntegerField(
            row['cliques no link'] || row['clicks'] || row['cliques'] || 0
        );
        const impressions = parseIntegerField(
            row['impressões'] || row['impressoes'] || row['impressions'] || 0
        );
        const spend = parseNumberField(
            row['valor usado (brl)'] || row['spend'] || row['gasto'] || row['valor usado'] || 0
        );
        const conversions = parseIntegerField(
            row['resultados'] || row['results'] || row['conversões'] || row['conversoes'] || 0
        );
        
        return {
            date,
            clicks,
            impressions,
            spend,
            conversions,
            import_mode: importMode,
            date_range_start: startDate || date,
            date_range_end: endDate || date,
            campaign_name: row['nome da campanha'] || row['campaign name'] || '',
            ad_set_name: row['nome do conjunto de anúncios'] || row['ad set name'] || '',
            result_type: row['tipo de resultado'] || row['result type'] || ''
        };
    }).filter(row => row.date && (row.impressions > 0 || row.spend > 0));
    
    return data;
}

function detectImportMode(rows) {
    if (!rows || !rows.length) return 'daily';
    const sample = rows[0];
    const hasDailyDate = !!(sample['dia'] || sample['date'] || sample['data']);
    const hasRangeDate = !!(
        sample['início dos relatórios']
        || sample['inicio dos relatorios']
        || sample['término dos relatórios']
        || sample['termino dos relatorios']
    );
    
    if (hasDailyDate) return 'daily';
    if (hasRangeDate) return 'aggregated';
    return 'unknown';
}

function parseNumberField(value) {
    if (value === null || value === undefined) return 0;
    const normalized = String(value)
        .trim()
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntegerField(value) {
    const parsed = parseNumberField(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeDate(value) {
    if (!value) return '';
    let date = String(value).replace(/[^\d\-\/]/g, '');
    if (date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return date;
}

async function loadImportPage() {
    const content = document.getElementById('contentArea');
    const role = getRole();
    
    if (role !== 'admin') {
        content.innerHTML = '<div class="text-center text-silver py-12">Acesso restrito</div>';
        return;
    }
    
    content.innerHTML = `
<div class="fade-enter">
    <div class="glass-card rounded-2xl p-6 mb-6">
        <h3 class="text-xl font-display font-semibold text-white mb-6">Importar Dados</h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <label class="block text-sm font-medium text-silver mb-2">Selecione o Cliente</label>
                <select id="importClientId" class="premium-input w-full rounded-xl px-4 py-3 mb-4">
                    <option value="">Carregando...</option>
                </select>
                
                <label class="block text-sm font-medium text-silver mb-2">Tipo de Campanha</label>
                <select id="campaignType" class="premium-input w-full rounded-xl px-4 py-3 mb-4">
                    <option value="cliques">Cliques (Tráfego)</option>
                    <option value="conversas">Conversas (Mensagens)</option>
                </select>
                
                <label class="block text-sm font-medium text-silver mb-2">Arquivo CSV</label>
                <div class="border-2 border-dashed border-graphite rounded-xl p-8 text-center hover:border-royal transition cursor-pointer" id="dropZone">
                    <svg class="w-12 h-12 mx-auto text-silver mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
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
                <div id="previewArea" class="bg-dark/50 rounded-xl p-4 max-h-80 overflow-auto">
                    <p class="text-silver/80 text-center">Nenhum arquivo selecionado</p>
                </div>
                
                <div class="mt-4 flex gap-3">
                    <button id="importBtn" class="flex-1 btn-premium rounded-xl py-3 px-4 text-white font-semibold disabled:opacity-50" disabled>
                        Importar Dados
                    </button>
                    <button id="clearBtn" class="px-4 py-3 border border-graphite rounded-xl hover:bg-graphite/30 transition text-white">
                        Limpar
                    </button>
                </div>
                
                <div id="importResult" class="mt-4 hidden"></div>
            </div>
        </div>
    </div>
    
    <div class="glass-card rounded-2xl p-6">
        <h4 class="text-sm font-medium text-silver mb-3">Formato esperado (CSV do Meta Ads):</h4>
        <div class="bg-dark/50 rounded-xl p-4 overflow-x-auto">
            <code class="text-xs text-silver/80 whitespace-pre">Dia,"Cliques no link",Impressões,"Valor usado (BRL)","Tipo de resultado",Resultados
2026-03-24,13,3639,30,"Conversas por mensagem iniciadas",9
2026-03-23,14,3337,20.63,"Conversas por mensagem iniciadas",6</code>
        </div>
        <p class="text-xs text-silver/80 mt-3">O sistema detecta automaticamente colunas como: Dia, Impressões, Valor usado, Resultados</p>
    </div>
</div>`;
    
    const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
    const clients = await clientsRes.json();
    const select = document.getElementById('importClientId');
    select.innerHTML = clients.length > 0 
        ? clients.map(c => `<option value="${c.client_id}">${c.username} (${c.client_id})</option>`).join('')
        : '<option value="">Nenhum cliente cadastrado</option>';
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    let parsedData = [];
    let processedData = [];
    
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-royal');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-royal');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-royal');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
    
    async function handleFile(file) {
        document.getElementById('fileInfo').classList.remove('hidden');
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        
        const text = await file.text();
        parsedData = parseCSV(text);
        const campaignType = document.getElementById('campaignType').value;
        processedData = processImportedData(parsedData, campaignType);
        renderPreview(processedData);
    }
    
    document.getElementById('campaignType').addEventListener('change', () => {
        if (parsedData.length > 0) {
            const campaignType = document.getElementById('campaignType').value;
            processedData = processImportedData(parsedData, campaignType);
            renderPreview(processedData);
        }
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
        document.getElementById('fileInfo').classList.add('hidden');
        document.getElementById('previewArea').innerHTML = '<p class="text-silver/80 text-center">Nenhum arquivo selecionado</p>';
        document.getElementById('importBtn').disabled = true;
        parsedData = [];
        processedData = [];
        fileInput.value = '';
    });

    function renderPreview(processed) {
        const preview = document.getElementById('previewArea');
        const importBtn = document.getElementById('importBtn');

        if (!processed.length) {
            preview.innerHTML = '<p class="text-danger text-center">Nenhum dado válido encontrado</p>';
            importBtn.disabled = true;
            return;
        }

        const importMode = processed[0]?.import_mode || 'unknown';
        const isAggregated = importMode === 'aggregated';
        const warningHtml = isAggregated
            ? `<div class="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                <p class="text-warning font-medium">⚠️ CSV agregado por período/campanha</p>
                <p class="text-silver text-sm mt-1">Este arquivo não é diário. Cada linha será importada com a data final do relatório para manter compatibilidade, mas isso pode distorcer gráficos por dia.</p>
            </div>`
            : `<div class="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
                <p class="text-success font-medium">✅ CSV diário detectado</p>
                <p class="text-silver text-sm mt-1">Formato ideal para gráficos e séries temporais.</p>
            </div>`;

        preview.innerHTML = `
${warningHtml}
<table class="premium-table w-full text-sm">
    <thead>
        <tr>
            <th class="text-left py-2 px-3">Data</th>
            <th class="text-right py-2 px-3">Cliques</th>
            <th class="text-right py-2 px-3">Impressões</th>
            <th class="text-right py-2 px-3">Gasto</th>
            <th class="text-right py-2 px-3">Resultados</th>
        </tr>
    </thead>
    <tbody>
        ${processed.slice(0, 10).map(r => `
        <tr class="hover:bg-white/5">
            <td class="py-2 px-3">${r.date}</td>
            <td class="text-right py-2 px-3">${r.clicks.toLocaleString('pt-BR')}</td>
            <td class="text-right py-2 px-3">${r.impressions.toLocaleString('pt-BR')}</td>
            <td class="text-right py-2 px-3 text-beige">R$ ${r.spend.toFixed(2)}</td>
            <td class="text-right py-2 px-3 text-success">${r.conversions}</td>
        </tr>`).join('')}
        ${processed.length > 10 ? `<tr><td colspan="5" class="text-center py-3 text-silver/80">... mais ${processed.length - 10} registros</td></tr>` : ''}
    </tbody>
</table>`;

        importBtn.disabled = false;
        importBtn.onclick = () => importData(processed);
    }
    
    async function importData(data) {
        const clientId = document.getElementById('importClientId').value;
        if (!clientId) {
            alert('Selecione um cliente');
            return;
        }
        
        const btn = document.getElementById('importBtn');
        btn.textContent = 'Importando...';
        btn.disabled = true;
        
        try {
            const res = await apiFetch('/api/admin/import-csv', {
                method: 'POST',
                body: JSON.stringify({ client_id: clientId, data })
            });
            const result = await res.json();
            
            if (res.ok) {
                document.getElementById('importResult').classList.remove('hidden');
                document.getElementById('importResult').innerHTML = `
<div class="p-4 bg-success/10 border border-success/30 rounded-xl">
    <p class="text-success font-medium">✅ Importado com sucesso! ${result.imported} registros</p>
    ${result.warning ? `<p class="text-silver text-sm mt-2">${result.warning}</p>` : ''}
</div>`;
            } else {
                alert(result.error || 'Erro ao importar');
            }
        } catch (e) {
            alert('Erro de conexão');
        }
        
        btn.textContent = 'Importar Dados';
        btn.disabled = false;
    }
}

console.log('Import JS carregado');

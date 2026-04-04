// Data Management - Gerenciamento de Resultados
let dataFilter = { clientId: '', startDate: '', endDate: '', period: 'all', sortBy: 'date', sortOrder: 'desc' };
let allData = [];

async function loadDataManagementPage() {
    const content = document.getElementById('contentArea');
    const role = getRole();
    if (role !== 'admin') { content.innerHTML = '<div class="text-center text-silver py-12">Acesso restrito</div>'; return; }
    let clientsOptions = '<option value="">Todos os clientes</option>';
    try {
        const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
        const clients = await clientsRes.json();
        clientsOptions += clients.map(c => '<option value="'+c.client_id+'">'+c.username+' ('+c.client_id+')</option>').join('');
    } catch (e) { console.error('Erro ao carregar clientes:', e); }

    content.innerHTML = '<div class="glass-card rounded-2xl p-6 sm:p-8 fade-enter"><div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6"><div><h3 class="text-2xl font-display font-bold text-white">Gerenciar Dados</h3><p class="text-silver text-sm mt-1">Visualize e gerencie resultados por cliente</p></div><button onclick="exportFilteredData()" class="btn-premium px-4 py-2 rounded-xl text-sm flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Exportar</button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><div><label class="block text-sm font-medium text-silver mb-2">Cliente</label><select id="filterClient" onchange="filterData()" class="premium-input w-full rounded-xl px-4 py-3 touch-target">'+clientsOptions+'</select></div><div><label class="block text-sm font-medium text-silver mb-2">Data Início</label><input type="date" id="filterStartDate" onchange="filterData()" class="premium-input w-full rounded-xl px-4 py-3 touch-target"></div><div><label class="block text-sm font-medium text-silver mb-2">Data Fim</label><input type="date" id="filterEndDate" onchange="filterData()" class="premium-input w-full rounded-xl px-4 py-3 touch-target"></div><div><label class="block text-sm font-medium text-silver mb-2">Ordenar por</label><select id="sortField" onchange="sortData()" class="premium-input w-full rounded-xl px-4 py-3 touch-target"><option value="date">Data</option><option value="client_id">Cliente</option><option value="clicks">Cliques</option><option value="spend">Gasto</option><option value="conversions">Conversões</option></select></div></div><div class="flex flex-wrap gap-2 mb-6"><button onclick="setDataPeriod(\'all\')" data-period="all" class="data-period-btn px-4 py-2 rounded-xl text-sm border border-graphite text-silver hover:bg-graphite/30 transition">Tudo</button><button onclick="setDataPeriod(\'today\')" data-period="today" class="data-period-btn px-4 py-2 rounded-xl text-sm border border-graphite text-silver hover:bg-graphite/30 transition">Hoje</button><button onclick="setDataPeriod(\'week\')" data-period="week" class="data-period-btn px-4 py-2 rounded-xl text-sm border border-graphite text-silver hover:bg-graphite/30 transition">Última semana</button><button onclick="setDataPeriod(\'month\')" data-period="month" class="data-period-btn px-4 py-2 rounded-xl text-sm border border-graphite text-silver hover:bg-graphite/30 transition">Este mês</button></div><div class="overflow-x-auto"><table class="premium-table w-full text-sm"><thead><tr><th class="text-left py-3 px-4 cursor-pointer hover:text-white" onclick="sortBy(\'date\')">Data <span class="sort-icon">↕</span></th><th class="text-left py-3 px-4 cursor-pointer hover:text-white" onclick="sortBy(\'client_id\')">Cliente <span class="sort-icon">↕</span></th><th class="text-right py-3 px-4 cursor-pointer hover:text-white" onclick="sortBy(\'clicks\')">Cliques <span class="sort-icon">↕</span></th><th class="text-right py-3 px-4">Impressões</th><th class="text-right py-3 px-4 cursor-pointer hover:text-white" onclick="sortBy(\'spend\')">Gasto <span class="sort-icon">↕</span></th><th class="text-right py-3 px-4 cursor-pointer hover:text-white" onclick="sortBy(\'conversions\')">Conversões <span class="sort-icon">↕</span></th><th class="text-right py-3 px-4">CTR</th><th class="text-right py-3 px-4">CPC</th><th class="text-right py-3 px-4">CPA</th><th class="text-center py-3 px-4">Ações</th></tr></thead><tbody id="dataTableBody"><tr><td colspan="10" class="text-center py-8 text-graphite">Carregando dados...</td></tr></tbody></table></div><div class="mt-6 pt-6 border-t border-white/5"><div class="grid grid-cols-2 sm:grid-cols-4 gap-4"><div class="text-center"><p class="text-silver text-xs uppercase tracking-wider">Total Cliques</p><p class="text-white text-xl font-bold mt-1" id="totalClicks">-</p></div><div class="text-center"><p class="text-silver text-xs uppercase tracking-wider">Total Gasto</p><p class="text-beige text-xl font-bold mt-1" id="totalSpend">-</p></div><div class="text-center"><p class="text-silver text-xs uppercase tracking-wider">Total Conversões</p><p class="text-success text-xl font-bold mt-1" id="totalConversions">-</p></div><div class="text-center"><p class="text-silver text-xs uppercase tracking-wider">Registros</p><p class="text-white text-xl font-bold mt-1" id="totalRecords">-</p></div></div></div></div>';
    await loadAllData();
}

async function loadAllData() {
    try {
        const res = await apiFetch('/api/data/performance', { headers: {} });
        allData = await res.json();
        renderDataTable();
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="10" class="text-center py-8 text-danger">Erro ao carregar dados</td></tr>';
    }
}

function renderDataTable() {
    let filtered = [...allData];
    if (dataFilter.clientId) filtered = filtered.filter(d => d.client_id === dataFilter.clientId);
    if (dataFilter.startDate) filtered = filtered.filter(d => d.date >= dataFilter.startDate);
    if (dataFilter.endDate) filtered = filtered.filter(d => d.date <= dataFilter.endDate);
    filtered.sort((a, b) => {
        let aVal = a[dataFilter.sortBy];
        let bVal = b[dataFilter.sortBy];
        if (dataFilter.sortBy === 'date') { aVal = new Date(aVal); bVal = new Date(bVal); }
        else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        if (aVal < bVal) return dataFilter.sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return dataFilter.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
    const tbody = document.getElementById('dataTableBody');
    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-graphite">Nenhum dado encontrado</td></tr>'; updateSummary(0, 0, 0, 0); return; }
    tbody.innerHTML = filtered.map(d => {
        const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00';
        const cpc = d.clicks > 0 ? (parseFloat(d.spend) / d.clicks).toFixed(2) : '0.00';
        const cpa = d.conversions > 0 ? (parseFloat(d.spend) / d.conversions).toFixed(2) : '0.00';
        return '<tr class="hover:bg-white/5"><td class="py-3 px-4">'+new Date(d.date).toLocaleDateString('pt-BR')+'</td><td class="py-3 px-4 text-white font-medium">'+d.client_id+'</td><td class="text-right py-3 px-4">'+d.clicks.toLocaleString('pt-BR')+'</td><td class="text-right py-3 px-4">'+d.impressions.toLocaleString('pt-BR')+'</td><td class="text-right py-3 px-4 text-beige">R$ '+parseFloat(d.spend).toFixed(2)+'</td><td class="text-right py-3 px-4 text-success">'+d.conversions+'</td><td class="text-right py-3 px-4 text-silver">'+ctr+'%</td><td class="text-right py-3 px-4 text-silver">R$ '+cpc+'</td><td class="text-right py-3 px-4 text-silver">R$ '+cpa+'</td><td class="text-center py-3 px-4"><button onclick="deleteDataRow('+d.id+')" class="p-2 hover:bg-danger/20 rounded-lg transition" title="Excluir"><svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></td></tr>';
    }).join('');
    const totalClicks = filtered.reduce((sum, d) => sum + d.clicks, 0);
    const totalSpend = filtered.reduce((sum, d) => sum + parseFloat(d.spend), 0);
    const totalConversions = filtered.reduce((sum, d) => sum + d.conversions, 0);
    updateSummary(filtered.length, totalClicks, totalSpend, totalConversions);
}

function updateSummary(count, clicks, spend, conversions) {
    document.getElementById('totalRecords').textContent = count.toLocaleString('pt-BR');
    document.getElementById('totalClicks').textContent = clicks.toLocaleString('pt-BR');
    document.getElementById('totalSpend').textContent = 'R$ ' + spend.toFixed(2);
    document.getElementById('totalConversions').textContent = conversions.toLocaleString('pt-BR');
}

function setDataPeriod(period) {
    dataFilter.period = period;
    document.querySelectorAll('.data-period-btn').forEach(btn => {
        btn.classList.toggle('bg-royal', btn.dataset.period === period);
        btn.classList.toggle('text-white', btn.dataset.period === period);
        btn.classList.toggle('border', btn.dataset.period !== period);
        btn.classList.toggle('border-graphite', btn.dataset.period !== period);
        btn.classList.toggle('text-silver', btn.dataset.period !== period);
    });
    const today = new Date();
    const startInput = document.getElementById('filterStartDate');
    const endInput = document.getElementById('filterEndDate');
    if (period === 'all') { startInput.value = ''; endInput.value = ''; dataFilter.startDate = ''; dataFilter.endDate = ''; }
    else if (period === 'today') { const s = today.toISOString().split('T')[0]; startInput.value = s; endInput.value = s; dataFilter.startDate = s; dataFilter.endDate = s; }
    else if (period === 'week') { const w = new Date(today); w.setDate(w.getDate() - 7); startInput.value = w.toISOString().split('T')[0]; endInput.value = today.toISOString().split('T')[0]; dataFilter.startDate = startInput.value; dataFilter.endDate = endInput.value; }
    else if (period === 'month') { const m = today.toISOString().slice(0, 7) + '-01'; startInput.value = m; endInput.value = today.toISOString().split('T')[0]; dataFilter.startDate = m; dataFilter.endDate = endInput.value; }
    renderDataTable();
}

function filterData() {
    dataFilter.clientId = document.getElementById('filterClient')?.value || '';
    dataFilter.startDate = document.getElementById('filterStartDate')?.value || '';
    dataFilter.endDate = document.getElementById('filterEndDate')?.value || '';
    dataFilter.period = 'custom';
    renderDataTable();
}

function sortBy(field) {
    if (dataFilter.sortBy === field) dataFilter.sortOrder = dataFilter.sortOrder === 'asc' ? 'desc' : 'asc';
    else { dataFilter.sortBy = field; dataFilter.sortOrder = 'desc'; }
    const sortSelect = document.getElementById('sortField');
    if (sortSelect) sortSelect.value = field;
    renderDataTable();
}

function sortData() { dataFilter.sortBy = document.getElementById('sortField')?.value || 'date'; renderDataTable(); }

async function deleteDataRow(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
        const res = await apiFetch('/api/admin/data/' + id, { method: 'DELETE', headers: {} });
        if (res.ok) await loadAllData();
        else alert('Erro ao excluir registro');
    } catch (e) { alert('Erro de conexão'); }
}

function exportFilteredData() {
    let filtered = [...allData];
    if (dataFilter.clientId) filtered = filtered.filter(d => d.client_id === dataFilter.clientId);
    if (dataFilter.startDate) filtered = filtered.filter(d => d.date >= dataFilter.startDate);
    if (dataFilter.endDate) filtered = filtered.filter(d => d.date <= dataFilter.endDate);
    if (filtered.length === 0) { alert('Nenhum dado para exportar'); return; }
    const headers = ['Data', 'Cliente', 'Cliques', 'Impressões', 'Gasto', 'Conversões', 'CTR', 'CPC', 'CPA'];
    const rows = filtered.map(d => {
        const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '0.00';
        const cpc = d.clicks > 0 ? (parseFloat(d.spend) / d.clicks).toFixed(2) : '0.00';
        const cpa = d.conversions > 0 ? (parseFloat(d.spend) / d.conversions).toFixed(2) : '0.00';
        return [d.date, d.client_id, d.clicks, d.impressions, d.spend, d.conversions, ctr, cpc, cpa].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_exportados_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}
console.log('Data Management JS carregado');

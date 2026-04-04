// Dashboard JS - AdDash v2.2
console.log('Dashboard JS carregando v2.2');

const pages = {
    dashboard: { title: 'Dashboard', subtitle: 'Visão geral', icon: 'chart', adminOnly: false },
    data: { title: 'Gerenciar Dados', subtitle: 'Gerencie resultados', icon: 'database', adminOnly: true },
    manual: { title: 'Inserir Dados', subtitle: 'Adicione dados', icon: 'plus', adminOnly: true },
    import: { title: 'Importar', subtitle: 'Importar CSV', icon: 'upload', adminOnly: true },
    clients: { title: 'Clientes', subtitle: 'Gerenciar clientes', icon: 'users', adminOnly: true },
    visibility: { title: 'Configurações', subtitle: 'Visibilidade', icon: 'eye', adminOnly: true },
    password: { title: 'Alterar Senha', subtitle: 'Mude sua senha', icon: 'lock', adminOnly: false }
};

let currentPage = 'dashboard';
let dashboardData = [];
let currentPeriod = 'all';
let filterStart = '';
let filterEnd = '';
let clientVisibility = { show_spend: 1, show_conversions: 1, show_cpa: 1, show_ctr: 1 };
let showComparison = false;
let chartInstance = null;
let allClientsList = [];
let currentRole = 'admin';
let clientViewMode = 'standard';

const icons = {
    chart: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
    database: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
    plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>',
    upload: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>',
    users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
    eye: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>',
    lock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>'
};

function getCurrentUser() {
    return window.currentUser || null;
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        window.location.href = '/index.html';
        throw new Error('Sessão expirada');
    }

    return response;
}

function getRole() {
    return getCurrentUser()?.role || 'client';
}

function initNavigation() {
    const nav = document.getElementById('navMenu');
    if (!nav) return;
    const role = getRole();
    let html = '';
    for (const [key, page] of Object.entries(pages)) {
        if (page.adminOnly && role !== 'admin') continue;
        const isActive = currentPage === key;
        html += `<button onclick="navigateTo('${key}')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition touch-target ${isActive ? 'bg-royal/20 text-white' : 'text-silver hover:bg-white/5'}" data-page="${key}"><svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons[page.icon]}</svg><span class="nav-label truncate">${page.title}</span></button>`;
    }
    nav.innerHTML = html;
}

async function navigateTo(pageKey) {
    if (!pages[pageKey]) return;
    const page = pages[pageKey];
    const role = getRole();
    const content = document.getElementById('contentArea');

    if (page.adminOnly && role !== 'admin') {
        if (content) content.innerHTML = '<div class="text-center text-silver py-12">Acesso restrito</div>';
        return;
    }

    currentPage = pageKey;
    document.getElementById('pageTitle').textContent = page.title;
    document.getElementById('pageSubtitle').textContent = page.subtitle;

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('bg-royal/20', btn.dataset.page === pageKey);
        btn.classList.toggle('text-white', btn.dataset.page === pageKey);
        btn.classList.toggle('text-silver', btn.dataset.page !== pageKey);
    });

    if (typeof closeSidebarOnMobile === 'function') closeSidebarOnMobile();

    const loaders = {
        dashboard: loadDashboardPage,
        data: typeof loadDataManagementPage === 'function' ? loadDataManagementPage : null,
        manual: typeof loadManualDataPage === 'function' ? loadManualDataPage : null,
        import: typeof loadImportPage === 'function' ? loadImportPage : null,
        clients: typeof loadClientsPage === 'function' ? loadClientsPage : null,
        visibility: typeof loadSettingsPage === 'function' ? loadSettingsPage : null,
        password: loadPasswordPage
    };

    if (loaders[pageKey]) await loaders[pageKey]();
    else if (content) content.innerHTML = '<div class="text-center text-silver py-12">Página em desenvolvimento</div>';
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

function exportPDF() { window.print(); }

function getClientViewMode() {
    if (currentRole !== 'client') return 'standard';
    const effectiveMode = getCurrentUser()?.preferences?.effectiveViewMode;
    if (effectiveMode === 'simplified' || effectiveMode === 'standard') {
        clientViewMode = effectiveMode;
        try { localStorage.setItem('dashlab_client_view_mode', clientViewMode); } catch (_) {}
        return clientViewMode;
    }
    try {
        const saved = localStorage.getItem('dashlab_client_view_mode');
        if (saved === 'simplified' || saved === 'standard') clientViewMode = saved;
    } catch (_) {}
    return clientViewMode;
}

async function setClientViewMode(mode) {
    clientViewMode = mode === 'simplified' ? 'simplified' : 'standard';
    try { localStorage.setItem('dashlab_client_view_mode', clientViewMode); } catch (_) {}
    try {
        const res = await apiFetch('/api/auth/client-view-mode', {
            method: 'POST',
            body: JSON.stringify({ viewMode: clientViewMode })
        });
        if (res.ok) {
            const data = await res.json();
            if (window.currentUser) window.currentUser.preferences = data.preferences;
        }
    } catch (e) {
        console.error('Erro ao salvar preferência do cliente:', e);
    }
    applyDashFilter();
}

function getSimplifiedTone(metrics) {
    return getPerformanceNarrative(metrics).tone;
}

function getPerformanceNarrative(metrics) {
    const { clicks, spend, conv, ctr, cpa, cpc, days, hasData } = metrics;
    if (!hasData) {
        return {
            headline: 'Sem base suficiente para leitura executiva',
            tone: 'neutral',
            summary: 'Ainda não há volume de dados suficiente no período selecionado para gerar uma interpretação confiável.',
            bullets: [
                'Amplie a janela de análise ou aguarde mais dados entrarem.',
                'Use a visualização padrão para inspecionar os registros individuais.'
            ]
        };
    }

    let efficiency = 'em observação';
    let momentum = 'estável';
    let sustainability = 'sob controle';
    let headline = 'Leitura equilibrada do desempenho';
    let tone = 'neutral';

    if (conv >= 8 && cpa > 0 && cpa <= 35) {
        efficiency = 'forte';
        tone = 'positive';
    } else if (conv >= 4 && cpa > 0 && cpa <= 60) {
        efficiency = 'consistente';
    } else if (conv === 0 && spend > 0) {
        efficiency = 'pressionada';
        tone = 'warning';
    }

    if (ctr >= 2.5) momentum = 'acima do esperado';
    else if (ctr >= 1.2) momentum = 'saudável';
    else if (ctr > 0) momentum = 'abaixo do ideal';

    if (cpc > 0 && cpc <= 1.5) sustainability = 'eficiente';
    else if (cpc > 0 && cpc <= 3.5) sustainability = 'aceitável';
    else if (cpc > 3.5) sustainability = 'cara para o volume atual';

    if (efficiency === 'forte' && ['acima do esperado', 'saudável'].includes(momentum)) {
        headline = 'Campanhas com boa resposta e eficiência operacional';
        tone = 'positive';
    } else if (efficiency === 'consistente' && ['acima do esperado', 'saudável'].includes(momentum)) {
        headline = 'Desempenho sólido, com boa aderência do público';
    } else if (efficiency === 'pressionada') {
        headline = 'Investimento ativo, mas conversão ainda sem tração suficiente';
        tone = 'warning';
    } else if (ctr > 0 && conv === 0) {
        headline = 'Existe interesse inicial, mas a resposta final ainda é baixa';
        tone = 'warning';
    }

    const bullets = [
        `Eficiência de resultado: ${efficiency}.`,
        `Resposta do público: ${momentum} (CTR de ${ctr.toFixed(2)}%).`,
        `Pressão de custo: ${sustainability}${cpc > 0 ? `, com CPC médio de R$ ${cpc.toFixed(2)}` : ''}.`,
        conv > 0
            ? `Custo por conversão atual em R$ ${cpa.toFixed(2)}, considerando ${conv} conversões no período.`
            : `Há investimento e cliques (${clicks}), mas o período ainda não registrou conversões.`
    ];

    const summary = `Nos últimos ${days} dias analisados, o painel mostra ${clicks.toLocaleString('pt-BR')} cliques, gasto de R$ ${spend.toFixed(2)} e ${conv.toLocaleString('pt-BR')} conversões.`;

    const badge = tone === 'positive' ? 'Leitura favorável' : tone === 'warning' ? 'Ponto de atenção' : 'Leitura estável';
    return { headline, tone, summary, bullets, badge, efficiency, momentum, sustainability };
}

function buildSimplifiedClientView(metrics) {
    const narrative = getPerformanceNarrative(metrics);
    const shellClass = narrative.tone === 'positive'
        ? 'border-success/30 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_38%),linear-gradient(135deg,rgba(22,32,26,0.96),rgba(8,14,10,0.98))]'
        : narrative.tone === 'warning'
            ? 'border-warning/30 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_38%),linear-gradient(135deg,rgba(38,24,12,0.96),rgba(18,12,7,0.98))]'
            : 'border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_38%),linear-gradient(135deg,rgba(18,24,22,0.96),rgba(10,14,13,0.98))]';
    const badgeClass = narrative.tone === 'positive'
        ? 'bg-success/15 text-green-300 border-success/30'
        : narrative.tone === 'warning'
            ? 'bg-warning/15 text-amber-300 border-warning/30'
            : 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20';

    return `
      <div id="simplifiedClientView" class="rounded-[28px] border ${shellClass} p-6 md:p-7 mb-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] overflow-hidden">
        <div class="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div class="max-w-3xl">
            <div class="flex items-center gap-3 flex-wrap mb-3">
              <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs uppercase tracking-[0.18em] ${badgeClass}">${narrative.badge}</span>
              <span class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/70">Visão guiada</span>
            </div>
            <h3 class="text-2xl md:text-3xl font-display font-semibold text-white leading-tight">${narrative.headline}</h3>
            <p class="text-emerald-50/80 text-sm md:text-[15px] mt-3 max-w-3xl leading-6">${narrative.summary}</p>
          </div>
          <div class="grid grid-cols-1 gap-2 min-w-[220px]">
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/60">Eficiência</p>
              <p class="text-white text-lg font-semibold mt-1 capitalize">${narrative.efficiency}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/60">Resposta do público</p>
              <p class="text-white text-lg font-semibold mt-1 capitalize">${narrative.momentum}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <div class="rounded-2xl border border-emerald-300/15 bg-emerald-400/8 p-4 backdrop-blur-sm">
            <p class="text-[11px] text-emerald-100/65 uppercase tracking-[0.18em]">Conversões</p>
            <p class="text-3xl font-bold text-white mt-2">${metrics.conv.toLocaleString('pt-BR')}</p>
            <p class="text-xs text-emerald-50/75 mt-2 leading-5">Quantidade de ações concluídas no período, como leads, vendas ou contatos gerados.</p>
          </div>
          <div class="rounded-2xl border border-emerald-300/15 bg-white/5 p-4 backdrop-blur-sm">
            <p class="text-[11px] text-emerald-100/65 uppercase tracking-[0.18em]">CPA</p>
            <p class="text-3xl font-bold text-white mt-2">R$ ${metrics.cpa.toFixed(2)}</p>
            <p class="text-xs text-emerald-50/75 mt-2 leading-5">Custo por aquisição/resultado. Mostra quanto, em média, foi investido para gerar cada conversão.</p>
          </div>
          <div class="rounded-2xl border border-emerald-300/15 bg-white/5 p-4 backdrop-blur-sm">
            <p class="text-[11px] text-emerald-100/65 uppercase tracking-[0.18em]">CTR</p>
            <p class="text-3xl font-bold text-white mt-2">${metrics.ctr.toFixed(2)}%</p>
            <p class="text-xs text-emerald-50/75 mt-2 leading-5">Taxa de cliques. Indica o quanto o anúncio desperta interesse em relação às impressões.</p>
          </div>
          <div class="rounded-2xl border border-emerald-300/15 bg-white/5 p-4 backdrop-blur-sm">
            <p class="text-[11px] text-emerald-100/65 uppercase tracking-[0.18em]">CPC</p>
            <p class="text-3xl font-bold text-white mt-2">R$ ${metrics.cpc.toFixed(2)}</p>
            <p class="text-xs text-emerald-50/75 mt-2 leading-5">Custo por clique. Mostra o preço médio pago por cada visita/interação gerada pelo anúncio.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          ${narrative.bullets.map(item => `<div class="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-pearl leading-6 backdrop-blur-sm">${item}</div>`).join('')}
        </div>

        <div class="rounded-2xl border border-white/8 bg-black/20 p-4 md:p-5 backdrop-blur-sm">
          <p class="text-[11px] uppercase tracking-[0.18em] text-emerald-100/60 mb-3">Como interpretar estes indicadores</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-emerald-50/85 leading-6">
            <div class="rounded-xl bg-white/5 border border-white/6 p-3"><span class="text-white font-medium">CPC menor</span> tende a indicar tráfego mais eficiente para gerar visitas.</div>
            <div class="rounded-xl bg-white/5 border border-white/6 p-3"><span class="text-white font-medium">CTR maior</span> costuma sinalizar boa aderência entre anúncio, oferta e público.</div>
            <div class="rounded-xl bg-white/5 border border-white/6 p-3"><span class="text-white font-medium">CPA menor</span> normalmente representa melhor eficiência para gerar resultado final.</div>
          </div>
        </div>
      </div>`;
}

async function loadDashboardPage() {
    const content = document.getElementById('contentArea');
    const user = getCurrentUser();
    const role = user?.role || 'client';
    currentRole = role;
    const clientId = user?.client_id || '';
    const username = user?.username || 'Usuário';
    content.innerHTML = '<div class="flex items-center justify-center h-64"><div class="text-silver">Carregando...</div></div>';

    try {
        if (role === 'admin') {
            try {
                const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
                allClientsList = await clientsRes.json();
                if (!Array.isArray(allClientsList)) allClientsList = [];
            } catch (e) {
                console.log('Erro ao buscar clientes:', e);
                allClientsList = [];
            }
        }

        let apiUrl = '/api/data/performance';
        if (role === 'client' && clientId) apiUrl = '/api/data/performance/client/' + encodeURIComponent(clientId);

        const res = await apiFetch(apiUrl, { headers: {} });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        dashboardData = await res.json();
        if (!Array.isArray(dashboardData)) dashboardData = [];

        if (clientId) {
            try {
                const visRes = await apiFetch('/api/data/visibility/' + encodeURIComponent(clientId), { headers: {} });
                clientVisibility = await visRes.json();
            } catch (e) {
                clientVisibility = { show_spend: 1, show_conversions: 1, show_cpa: 1, show_ctr: 1 };
            }
        } else {
            clientVisibility = { show_spend: 1, show_conversions: 1, show_cpa: 1, show_ctr: 1 };
        }

        const greeting = getGreeting();
        const showSpend = role === 'admin' ? true : !!clientVisibility.show_spend;
        const showConversions = role === 'admin' ? true : !!clientVisibility.show_conversions;
        const showCpa = role === 'admin' ? true : !!clientVisibility.show_cpa;
        const showCtr = role === 'admin' ? true : !!clientVisibility.show_ctr;

        content.innerHTML = buildDashboardHTML(greeting, username, role, showSpend, showConversions, showCpa, showCtr);
        setDashPeriod('all');
    } catch (e) {
        console.error('Erro ao carregar dashboard:', e);
        content.innerHTML = '<div class="text-center text-danger py-12">Erro ao carregar dados</div>';
    }
}

function buildDashboardHTML(greeting, username, role, showSpend, showConversions, showCpa, showCtr) {
    let clientFilterHTML = '';
    if (role === 'admin' && allClientsList.length > 0) {
        clientFilterHTML = `<div class="flex items-center gap-2"><label class="text-sm text-silver">Cliente:</label><select id="clientFilter" onchange="filterByClient()" class="premium-input rounded-lg px-3 py-2 text-sm min-w-40"><option value="all">Todos os clientes</option>${allClientsList.map(c => `<option value="${c.client_id}">${c.client_id}</option>`).join('')}</select></div>`;
    }

    const clientModeToggle = role === 'client' ? `
      <div class="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
        <button onclick="setClientViewMode('standard')" id="viewModeStandard" class="px-3 py-2 rounded-lg text-sm transition">Padrão</button>
        <button onclick="setClientViewMode('simplified')" id="viewModeSimplified" class="px-3 py-2 rounded-lg text-sm transition">Simplificado</button>
      </div>` : '';

    let tableHeader = '<tr><th class="text-left py-3 px-4">Data</th>';
    if (role === 'admin') tableHeader += '<th class="text-left py-3 px-4">Cliente</th>';
    tableHeader += '<th class="text-right py-3 px-4">Cliques</th><th class="text-right py-3 px-4">Gasto</th><th class="text-right py-3 px-4">Conv.</th></tr>';

    return `
    <div class="fade-enter">
      <div class="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-display font-bold text-white">${greeting}, ${username}!</h2>
          <p class="text-silver text-sm mt-1">${role === 'admin' ? 'Visualizando todos os clientes' : 'Seus dados de performance'}</p>
        </div>
        <button onclick="exportPDF()" class="px-4 py-2 rounded-xl border border-graphite text-silver hover:bg-royal/20 hover:text-white transition flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Exportar PDF
        </button>
      </div>

      <div class="glass-card rounded-2xl p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          ${clientFilterHTML}
          ${clientModeToggle}
          <button onclick="setDashPeriod('week')" id="btnWeek" class="px-4 py-2 rounded-lg text-sm border border-graphite text-silver hover:bg-royal/20 hover:text-white transition">7 dias</button>
          <button onclick="setDashPeriod('month')" id="btnMonth" class="px-4 py-2 rounded-lg text-sm border border-graphite text-silver hover:bg-royal/20 hover:text-white transition">30 dias</button>
          <button onclick="setDashPeriod('all')" id="btnAll" class="px-4 py-2 rounded-lg text-sm border border-graphite text-silver hover:bg-royal/20 hover:text-white transition">Tudo</button>
          <button onclick="setDashPeriod('custom')" id="btnCustom" class="px-4 py-2 rounded-lg text-sm border border-graphite text-silver hover:bg-royal/20 hover:text-white transition">Personalizado</button>
        </div>
        <div id="customDateInputs" class="hidden mt-4 flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2"><label class="text-sm text-silver">De:</label><input type="date" id="dashFilterStart" class="premium-input rounded-lg px-3 py-2 text-sm"></div>
          <div class="flex items-center gap-2"><label class="text-sm text-silver">Até:</label><input type="date" id="dashFilterEnd" class="premium-input rounded-lg px-3 py-2 text-sm"></div>
          <button onclick="applyCustomFilter()" class="px-4 py-2 rounded-lg text-sm btn-premium">Aplicar</button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="metric-card rounded-2xl p-6"><div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-royal/20 flex items-center justify-center"><svg class="w-5 h-5 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/></svg></div><span class="text-silver text-sm">Cliques</span></div><p class="text-3xl font-bold text-white" id="kpiClicks">-</p><p class="text-xs text-silver/80 mt-2" id="kpiCPC">-</p></div>
        <div class="metric-card rounded-2xl p-6 ${showSpend ? '' : 'opacity-50'}"><div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-beige/20 flex items-center justify-center"><svg class="w-5 h-5 text-beige" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 0v1m0-1h1m-1 0H9"/></svg></div><span class="text-silver text-sm">Gasto</span></div><p class="text-3xl font-bold text-beige" id="kpiSpend">${showSpend ? '-' : '***'}</p><p class="text-xs text-silver/80 mt-2" id="kpiDailySpend">-</p></div>
        <div class="metric-card rounded-2xl p-6 ${showConversions ? '' : 'opacity-50'}"><div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"><svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="text-silver text-sm">Conversões</span></div><p class="text-3xl font-bold text-success" id="kpiConversions">${showConversions ? '-' : '***'}</p><p class="text-xs text-silver/80 mt-2 ${showCpa ? '' : 'blur-sm'}" id="kpiCPA">-</p></div>
        <div class="metric-card rounded-2xl p-6 ${showCtr ? '' : 'opacity-50'}"><div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-cyan/20 flex items-center justify-center"><svg class="w-5 h-5 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></div><span class="text-silver text-sm">CTR</span></div><p class="text-3xl font-bold text-cyan" id="kpiCTR">${showCtr ? '-' : '***'}</p></div>
      </div>

      <div id="simplifiedClientViewHost"></div>

      <div class="glass-card rounded-2xl p-6 mb-8">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 class="text-lg font-display font-semibold text-white">Performance</h3>
          <label class="text-sm text-silver cursor-pointer flex items-center gap-2"><input type="checkbox" id="showComparisonCheck" onchange="toggleComparison()" class="rounded"><span>Comparar período anterior</span></label>
        </div>
        <div id="dataModeNotice" class="hidden mb-4"></div>
        <div id="comparisonStats" class="hidden grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4"></div>
        <div class="h-64 sm:h-80"><canvas id="performanceChart"></canvas></div>
      </div>

      <div class="glass-card rounded-2xl p-6">
        <h3 class="text-lg font-display font-semibold text-white mb-4">Dados Recentes</h3>
        <div class="overflow-x-auto">
          <table class="premium-table w-full text-sm">
            <thead>${tableHeader}</thead>
            <tbody id="recentDataTable"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function setDashPeriod(period) {
    currentPeriod = period;
    ['week', 'month', 'all', 'custom'].forEach(btn => {
        const el = document.getElementById('btn' + btn.charAt(0).toUpperCase() + btn.slice(1));
        if (el) {
            el.classList.toggle('bg-royal/20', period === btn);
            el.classList.toggle('text-white', period === btn);
            el.classList.toggle('border-royal', period === btn);
        }
    });

    const customInputs = document.getElementById('customDateInputs');
    if (period === 'custom') {
        customInputs.classList.remove('hidden');
        return;
    } else {
        customInputs.classList.add('hidden');
    }

    const t = new Date();
    if (period === 'all') {
        filterStart = '';
        filterEnd = '';
    } else if (period === 'week') {
        const w = new Date(t);
        w.setDate(w.getDate() - 7);
        filterStart = w.toISOString().split('T')[0];
        filterEnd = t.toISOString().split('T')[0];
    } else if (period === 'month') {
        const m = new Date(t);
        m.setDate(m.getDate() - 30);
        filterStart = m.toISOString().split('T')[0];
        filterEnd = t.toISOString().split('T')[0];
    }
    applyDashFilter();
}


function calculateMetricBundle(rows) {
    const clicks = rows.reduce((s, d) => s + Number(d.clicks || 0), 0);
    const spend = rows.reduce((s, d) => s + Number(d.spend || 0), 0);
    const conv = rows.reduce((s, d) => s + Number(d.conversions || 0), 0);
    const imp = rows.reduce((s, d) => s + Number(d.impressions || 0), 0);
    const uniqueDays = new Set(rows.map(d => d.date).filter(Boolean)).size;
    const days = Math.max(uniqueDays, 1);
    const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
    const cpa = conv > 0 ? (spend / conv) : 0;
    const cpc = clicks > 0 ? (spend / clicks) : 0;
    return { clicks, spend, conv, imp, ctr, cpa, cpc, days, hasData: rows.length > 0 };
}

function getPreviousPeriodRows(filteredRows) {
    const datedRows = filteredRows.filter(d => d.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!datedRows.length) return [];

    let start = filterStart;
    let end = filterEnd;
    if (!start || !end) {
        start = datedRows[0].date;
        end = datedRows[datedRows.length - 1].date;
    }

    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return [];

    const diffDays = Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - (diffDays - 1));

    const prevStart = prevStartDate.toISOString().split('T')[0];
    const prevEnd = prevEndDate.toISOString().split('T')[0];
    return dashboardData.filter(d => {
        const clientFilter = document.getElementById('clientFilter');
        if (clientFilter && clientFilter.value !== 'all' && d.client_id !== clientFilter.value) return false;
        if (!d.date) return false;
        if (d.import_mode === 'aggregated') return false;
        return d.date >= prevStart && d.date <= prevEnd;
    });
}

function formatDelta(current, previous, inverse = false, suffix = '') {
    if (!previous || previous === 0) return { text: 'Sem base anterior', tone: 'neutral' };
    const raw = ((current - previous) / previous) * 100;
    const better = inverse ? raw <= 0 : raw >= 0;
    const tone = better ? 'positive' : 'warning';
    const signal = raw > 0 ? '+' : '';
    return { text: `${signal}${raw.toFixed(1)}%${suffix}`, tone };
}

function renderComparisonStats(currentMetrics, previousMetrics) {
    const container = document.getElementById('comparisonStats');
    if (!container) return;
    if (!showComparison) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    const cards = [
        { label: 'Conversões', value: currentMetrics.conv.toLocaleString('pt-BR'), delta: formatDelta(currentMetrics.conv, previousMetrics.conv) },
        { label: 'CPA', value: `R$ ${currentMetrics.cpa.toFixed(2)}`, delta: formatDelta(currentMetrics.cpa, previousMetrics.cpa, true) },
        { label: 'CTR', value: `${currentMetrics.ctr.toFixed(2)}%`, delta: formatDelta(currentMetrics.ctr, previousMetrics.ctr) },
        { label: 'Cliques', value: currentMetrics.clicks.toLocaleString('pt-BR'), delta: formatDelta(currentMetrics.clicks, previousMetrics.clicks) },
        { label: 'Gasto', value: `R$ ${currentMetrics.spend.toFixed(2)}`, delta: formatDelta(currentMetrics.spend, previousMetrics.spend, true) },
        { label: 'CPC', value: `R$ ${currentMetrics.cpc.toFixed(2)}`, delta: formatDelta(currentMetrics.cpc, previousMetrics.cpc, true) }
    ];

    container.classList.remove('hidden');
    container.className = 'grid grid-cols-2 xl:grid-cols-6 gap-3 mb-4';
    container.innerHTML = cards.map(card => `
      <div class="rounded-xl border border-white/8 bg-black/20 px-4 py-3 min-w-0">
        <p class="text-[11px] uppercase tracking-[0.16em] text-silver/80">${card.label}</p>
        <p class="text-lg xl:text-xl font-semibold text-white mt-2 truncate">${card.value}</p>
        <p class="text-xs mt-2 ${card.delta.tone === 'positive' ? 'text-success' : card.delta.tone === 'warning' ? 'text-warning' : 'text-silver'}">${card.delta.text}</p>
      </div>
    `).join('');
}

function applyCustomFilter() {
    filterStart = document.getElementById('dashFilterStart')?.value || '';
    filterEnd = document.getElementById('dashFilterEnd')?.value || '';
    applyDashFilter();
}

function filterByClient() { applyDashFilter(); }

function applyDashFilter() {
    let filtered = [...dashboardData];
    const mode = getClientViewMode();
    const clientFilter = document.getElementById('clientFilter');
    if (clientFilter && clientFilter.value !== 'all') filtered = filtered.filter(d => d.client_id === clientFilter.value);
    if (filterStart) filtered = filtered.filter(d => d.date >= filterStart);
    if (filterEnd) filtered = filtered.filter(d => d.date <= filterEnd);

    const aggregatedRows = filtered.filter(d => d.import_mode === 'aggregated');
    const dailyRows = filtered.filter(d => d.import_mode !== 'aggregated');
    const hasAggregated = aggregatedRows.length > 0;
    const hasDaily = dailyRows.length > 0;
    const rowsForChart = hasDaily ? dailyRows : [];
    const rowsForMetrics = hasDaily ? dailyRows : filtered;

    const currentMetrics = calculateMetricBundle(rowsForMetrics);
    const previousRows = getPreviousPeriodRows(filtered);
    const previousMetrics = calculateMetricBundle(previousRows);
    const { clicks, spend, conv, imp, days } = currentMetrics;
    const ctr = currentMetrics.ctr.toFixed(2);
    const cpa = currentMetrics.cpa.toFixed(2);
    const cpc = currentMetrics.cpc.toFixed(2);

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const simplifiedTone = getSimplifiedTone(currentMetrics);
    const setActiveViewButton = (id, active, variant = 'neutral') => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('bg-royal/20', 'border-royal', 'bg-success/20', 'border-success', 'bg-warning/20', 'border-warning', 'text-white', 'text-silver');
        if (active) {
            if (variant === 'success') {
                el.classList.add('bg-success/20', 'border-success', 'text-white');
            } else if (variant === 'warning') {
                el.classList.add('bg-warning/20', 'border-warning', 'text-white');
            } else {
                el.classList.add('bg-royal/20', 'border-royal', 'text-white');
            }
        } else {
            el.classList.add('text-silver');
        }
    };
    setActiveViewButton('viewModeStandard', mode === 'standard', 'neutral');
    setActiveViewButton('viewModeSimplified', mode === 'simplified', simplifiedTone === 'warning' ? 'warning' : 'success');
    setText('kpiClicks', clicks.toLocaleString('pt-BR'));
    setText('kpiSpend', 'R$ ' + spend.toFixed(2));
    setText('kpiConversions', conv.toLocaleString('pt-BR'));
    setText('kpiCTR', ctr + '%');
    setText('kpiCPC', 'CPC: R$ ' + cpc);
    setText('kpiCPA', 'CPA: R$ ' + cpa);
    setText('kpiDailySpend', hasDaily ? 'Média diária: R$ ' + (spend / days).toFixed(2) : 'Média diária indisponível');

    const notice = document.getElementById('dataModeNotice');
    if (notice) {
        if (hasAggregated && hasDaily) {
            notice.classList.remove('hidden');
            notice.innerHTML = '<div class="p-3 bg-warning/10 border border-warning/30 rounded-xl"><p class="text-warning font-medium">⚠️ Dados agregados ocultados do gráfico</p><p class="text-silver text-sm mt-1">Existem linhas agregadas por período/campanha misturadas com dados diários. O gráfico e a média diária mostram apenas os dados diários para evitar distorção.</p></div>';
        } else if (hasAggregated && !hasDaily) {
            notice.classList.remove('hidden');
            notice.innerHTML = '<div class="p-3 bg-warning/10 border border-warning/30 rounded-xl"><p class="text-warning font-medium">⚠️ Apenas dados agregados disponíveis</p><p class="text-silver text-sm mt-1">Este conjunto foi importado por período/campanha. Os KPIs refletem os totais importados, mas o gráfico diário foi desativado porque não há série temporal real.</p></div>';
        } else {
            notice.classList.add('hidden');
            notice.innerHTML = '';
        }
    }

    const simplifiedHost = document.getElementById('simplifiedClientViewHost');
    const metrics = currentMetrics;
    if (simplifiedHost) {
        simplifiedHost.innerHTML = currentRole === 'client' && mode === 'simplified' ? buildSimplifiedClientView(metrics) : '';
    }

    renderComparisonStats(currentMetrics, previousMetrics);

    const tbody = document.getElementById('recentDataTable');
    if (tbody) {
        const recent = filtered.slice(-10).reverse();
        const colspan = currentRole === 'admin' ? '5' : '4';
        if (currentRole === 'client') {
            tbody.innerHTML = recent.length === 0
                ? `<tr><td colspan="${colspan}" class="text-center py-6 text-silver/80">Sem dados</td></tr>`
                : recent.map(d => `<tr class="hover:bg-white/5"><td class="py-3 px-4">${new Date(d.date).toLocaleDateString('pt-BR')}${d.import_mode === 'aggregated' ? ' <span class="text-xs text-warning">(agregado)</span>' : ''}</td><td class="text-right py-3 px-4">${Number(d.clicks || 0).toLocaleString('pt-BR')}</td><td class="text-right py-3 px-4 text-beige">R$ ${Number(d.spend || 0).toFixed(2)}</td><td class="text-right py-3 px-4 text-success">${Number(d.conversions || 0)}</td></tr>`).join('');
        } else {
            tbody.innerHTML = recent.length === 0
                ? `<tr><td colspan="${colspan}" class="text-center py-6 text-silver/80">Sem dados</td></tr>`
                : recent.map(d => `<tr class="hover:bg-white/5"><td class="py-3 px-4">${new Date(d.date).toLocaleDateString('pt-BR')}${d.import_mode === 'aggregated' ? ' <span class="text-xs text-warning">(agregado)</span>' : ''}</td><td class="py-3 px-4 text-white font-medium">${d.client_id || '-'}</td><td class="text-right py-3 px-4">${Number(d.clicks || 0).toLocaleString('pt-BR')}</td><td class="text-right py-3 px-4 text-beige">R$ ${Number(d.spend || 0).toFixed(2)}</td><td class="text-right py-3 px-4 text-success">${Number(d.conversions || 0)}</td></tr>`).join('');
        }
    }

    const canvas = document.getElementById('performanceChart');
    if (typeof Chart !== 'undefined' && canvas) {
        const ctx = canvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();

        if (!hasDaily) {
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Gasto', 'Conversões', 'Cliques', 'Impressões'],
                    datasets: [{
                        label: 'Totais do período agregado',
                        data: [spend, conv, clicks, imp],
                        backgroundColor: ['rgba(212,168,83,0.7)', 'rgba(34,197,94,0.7)', 'rgba(99,102,241,0.7)', 'rgba(6,182,212,0.7)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#8C8C8C' } } },
                    scales: {
                        x: { ticks: { color: '#8C8C8C' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#8C8C8C' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
            return;
        }

        const sorted = [...rowsForChart].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30);
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(d => new Date(d.date).toLocaleDateString('pt-BR')),
                datasets: [
                    { label: 'Gasto', data: sorted.map(d => Number(d.spend || 0)), borderColor: '#D4A853', backgroundColor: 'rgba(212,168,83,0.1)', tension: 0.4, fill: true },
                    { label: 'Conversões', data: sorted.map(d => Number(d.conversions || 0)), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#8C8C8C' } } },
                scales: {
                    x: { ticks: { color: '#8C8C8C' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8C8C8C' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

function toggleComparison() {
    showComparison = document.getElementById('showComparisonCheck')?.checked || false;
    applyDashFilter();
}

async function loadPasswordPage() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="fade-enter max-w-md mx-auto"><div class="glass-card rounded-2xl p-8"><h3 class="text-xl font-display font-semibold text-white mb-6">Alterar Senha</h3><form id="passwordForm" class="space-y-4"><div><label class="block text-sm text-silver mb-2">Senha Atual</label><input type="password" id="currentPassword" class="premium-input w-full rounded-xl px-4 py-3" required></div><div><label class="block text-sm text-silver mb-2">Nova Senha</label><input type="password" id="newPassword" class="premium-input w-full rounded-xl px-4 py-3" required></div><div><label class="block text-sm text-silver mb-2">Confirmar Nova Senha</label><input type="password" id="confirmPassword" class="premium-input w-full rounded-xl px-4 py-3" required></div><div id="passwordError" class="hidden text-danger text-sm"></div><div id="passwordSuccess" class="hidden text-success text-sm"></div><button type="submit" class="w-full btn-premium rounded-xl px-6 py-3">Alterar Senha</button></form></div></div>';
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('passwordError');
        const successEl = document.getElementById('passwordSuccess');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        if (newPassword !== confirmPassword) { errorEl.textContent = 'As senhas não coincidem'; errorEl.classList.remove('hidden'); return; }
        if (newPassword.length < 8) { errorEl.textContent = 'A senha deve ter pelo menos 8 caracteres'; errorEl.classList.remove('hidden'); return; }
        try {
            const res = await apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
            const data = await res.json();
            if (res.ok) { successEl.textContent = 'Senha alterada com sucesso!'; successEl.classList.remove('hidden'); document.getElementById('passwordForm').reset(); }
            else { errorEl.textContent = data.error || 'Erro ao alterar senha'; errorEl.classList.remove('hidden'); }
        } catch (e) { errorEl.textContent = 'Erro de conexão'; errorEl.classList.remove('hidden'); }
    });
}

console.log('Dashboard JS v2.2 carregado');

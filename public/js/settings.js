// Settings JS - AdDash
console.log('Settings JS carregando');

let adminClientSettings = [];
let expandedClientId = null;

async function loadSettingsPage() {
    const content = document.getElementById('contentArea');
    const role = getRole();
    
    if (role !== 'admin') {
        content.innerHTML = '<div class="text-center text-silver py-12">Acesso restrito</div>';
        return;
    }
    
    content.innerHTML = `
<div class="fade-enter">
    <div class="glass-card rounded-2xl p-6 mb-6">
        <h3 class="text-xl font-display font-semibold text-white mb-6">Configurações</h3>
        
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] gap-6">
            <div>
                <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <h4 class="text-lg font-semibold text-white mb-2">Visibilidade e experiência por cliente</h4>
                        <p class="text-silver text-sm">Busque um cliente e expanda apenas o item que deseja editar. Bem mais escalável para bases grandes.</p>
                    </div>
                    <div class="w-full sm:w-80">
                        <input id="clientSettingsSearch" type="text" placeholder="Buscar por usuário ou ID do cliente"
                            class="w-full premium-input rounded-xl px-4 py-3 text-white"
                            oninput="renderClientSettingsList()">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div class="rounded-xl border border-white/5 bg-black/20 p-4">
                        <p class="text-xs uppercase tracking-[0.18em] text-silver">Clientes</p>
                        <p id="settingsTotalClients" class="text-2xl font-semibold text-white mt-2">-</p>
                    </div>
                    <div class="rounded-xl border border-white/5 bg-black/20 p-4">
                        <p class="text-xs uppercase tracking-[0.18em] text-silver">Padrão simplificado</p>
                        <p id="settingsSimplifiedCount" class="text-2xl font-semibold text-success mt-2">-</p>
                    </div>
                    <div class="rounded-xl border border-white/5 bg-black/20 p-4">
                        <p class="text-xs uppercase tracking-[0.18em] text-silver">Busca atual</p>
                        <p id="settingsFilteredCount" class="text-2xl font-semibold text-white mt-2">-</p>
                    </div>
                </div>
                
                <div id="visibilityList" class="space-y-3">
                    <p class="text-silver/80">Carregando...</p>
                </div>
            </div>
            
            <div>
                <h4 class="text-lg font-semibold text-white mb-4">Histórico de Acesso</h4>
                <p class="text-silver text-sm mb-4">Últimos logins no sistema</p>
                
                <div id="accessHistory" class="space-y-2 max-h-[720px] overflow-auto pr-1">
                    <p class="text-silver/80">Carregando...</p>
                </div>
            </div>
        </div>
    </div>
</div>`;
    
    await loadVisibilitySettings();
    loadAccessHistory();
}

async function loadVisibilitySettings() {
    try {
        const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
        const clients = await clientsRes.json();
        
        if (!Array.isArray(clients) || clients.length === 0) {
            const container = document.getElementById('visibilityList');
            if (container) container.innerHTML = '<p class="text-silver/80">Nenhum cliente cadastrado</p>';
            return;
        }

        const visibilityEntries = await Promise.all(clients.map(async (client) => {
            const visRes = await apiFetch(`/api/admin/visibility/${client.client_id}`, { headers: {} });
            const vis = await visRes.json();
            return {
                ...client,
                vis,
                adminDefaultViewMode: client.preferences?.adminDefaultViewMode === 'simplified' ? 'simplified' : 'standard',
                clientSelectedViewMode: client.preferences?.clientSelectedViewMode === 'simplified' || client.preferences?.clientSelectedViewMode === 'standard' ? client.preferences.clientSelectedViewMode : null,
                effectiveViewMode: client.preferences?.effectiveViewMode === 'simplified' ? 'simplified' : 'standard',
                overriddenByClient: !!client.preferences?.overriddenByClient
            };
        }));

        adminClientSettings = visibilityEntries;
        renderClientSettingsList();
    } catch (e) {
        const container = document.getElementById('visibilityList');
        if (container) container.innerHTML = '<p class="text-danger">Erro ao carregar</p>';
    }
}

function renderClientSettingsList() {
    const container = document.getElementById('visibilityList');
    if (!container) return;

    const search = (document.getElementById('clientSettingsSearch')?.value || '').trim().toLowerCase();
    const filtered = adminClientSettings.filter(client => {
        if (!search) return true;
        return client.username.toLowerCase().includes(search) || client.client_id.toLowerCase().includes(search);
    });

    const totalClientsEl = document.getElementById('settingsTotalClients');
    const simplifiedCountEl = document.getElementById('settingsSimplifiedCount');
    const filteredCountEl = document.getElementById('settingsFilteredCount');
    if (totalClientsEl) totalClientsEl.textContent = String(adminClientSettings.length);
    if (simplifiedCountEl) simplifiedCountEl.textContent = String(adminClientSettings.filter(c => c.effectiveViewMode === 'simplified').length);
    if (filteredCountEl) filteredCountEl.textContent = String(filtered.length);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="rounded-xl border border-white/5 bg-black/20 p-6 text-center text-silver/80">Nenhum cliente encontrado para essa busca.</div>';
        return;
    }

    container.innerHTML = filtered.map(client => {
        const expanded = expandedClientId === client.client_id;
        const vis = client.vis || {};
        const metricsEnabled = [vis.show_spend, vis.show_conversions, vis.show_cpa, vis.show_ctr].filter(Boolean).length;
        return `
<div class="rounded-2xl border border-white/6 bg-black/20 overflow-hidden">
    <button onclick="toggleClientSettingsCard('${client.client_id}')" class="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/5 transition">
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3 flex-wrap">
                <p class="text-white font-medium truncate">${client.username}</p>
                <span class="text-xs px-2 py-1 rounded-full border ${client.effectiveViewMode === 'simplified' ? 'border-success/30 bg-success/15 text-green-300' : 'border-royal/30 bg-royal/15 text-sky-200'}">${client.effectiveViewMode === 'simplified' ? 'Simplificada' : 'Padrão'}</span>
                <span class="text-xs px-2 py-1 rounded-full border border-white/8 bg-white/5 text-silver">${metricsEnabled}/4 métricas visíveis</span>
            </div>
            <p class="text-xs text-silver/80 mt-2">ID do cliente: ${client.client_id}</p>
        </div>
        <div class="text-silver text-sm shrink-0">${expanded ? 'Ocultar' : 'Editar'}</div>
    </button>

    ${expanded ? `
    <div class="border-t border-white/6 px-4 py-4 bg-white/[0.02]">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="rounded-xl border border-white/6 bg-black/20 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-silver mb-3">Visualização inicial</p>
                <div class="flex items-center gap-2 flex-wrap">
                    <button onclick="updateClientDefaultView('${client.client_id}', 'standard')" class="px-3 py-2 rounded-lg text-sm border ${client.adminDefaultViewMode === 'standard' ? 'border-royal bg-royal/20 text-white' : 'border-graphite text-silver hover:bg-white/5'}">Padrão</button>
                    <button onclick="updateClientDefaultView('${client.client_id}', 'simplified')" class="px-3 py-2 rounded-lg text-sm border ${client.adminDefaultViewMode === 'simplified' ? 'border-success bg-success/20 text-white' : 'border-graphite text-silver hover:bg-white/5'}">Simplificada</button>
                </div>
                <p class="text-xs text-silver/80 mt-3">Define a visualização inicial do cliente.</p>
                ${client.overriddenByClient ? `<p class="text-xs text-warning mt-2">Cliente com preferência personalizada ativa.</p>` : `<p class="text-xs text-silver/80 mt-2">Sem personalização ativa.</p>`}
            </div>

            <div class="rounded-xl border border-white/6 bg-black/20 p-4">
                <p class="text-xs uppercase tracking-[0.18em] text-silver mb-3">Métricas visíveis</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 text-sm text-silver cursor-pointer">
                        <input type="checkbox" ${vis.show_spend ? 'checked' : ''} onchange="updateVisibility('${client.client_id}', 'show_spend', this.checked)" class="rounded">
                        Mostrar Gasto
                    </label>
                    <label class="flex items-center gap-2 text-sm text-silver cursor-pointer">
                        <input type="checkbox" ${vis.show_conversions ? 'checked' : ''} onchange="updateVisibility('${client.client_id}', 'show_conversions', this.checked)" class="rounded">
                        Mostrar Conversões
                    </label>
                    <label class="flex items-center gap-2 text-sm text-silver cursor-pointer">
                        <input type="checkbox" ${vis.show_cpa ? 'checked' : ''} onchange="updateVisibility('${client.client_id}', 'show_cpa', this.checked)" class="rounded">
                        Mostrar CPA
                    </label>
                    <label class="flex items-center gap-2 text-sm text-silver cursor-pointer">
                        <input type="checkbox" ${vis.show_ctr ? 'checked' : ''} onchange="updateVisibility('${client.client_id}', 'show_ctr', this.checked)" class="rounded">
                        Mostrar CTR
                    </label>
                </div>
            </div>
        </div>
    </div>` : ''}
</div>`;
    }).join('');
}

function toggleClientSettingsCard(clientId) {
    expandedClientId = expandedClientId === clientId ? null : clientId;
    renderClientSettingsList();
}

async function updateVisibility(clientId, field, value) {
    try {
        const current = adminClientSettings.find(item => item.client_id === clientId);
        if (!current) return;
        const vis = { ...(current.vis || {}) };
        vis[field] = value ? 1 : 0;
        await apiFetch(`/api/admin/visibility/${clientId}`, {
            method: 'POST',
            body: JSON.stringify(vis)
        });
        current.vis = vis;
        renderClientSettingsList();
    } catch (e) {
        console.error('Erro ao atualizar visibilidade:', e);
    }
}

async function updateClientDefaultView(clientId, defaultViewMode) {
    try {
        await apiFetch(`/api/admin/client-preferences/${clientId}`, {
            method: 'POST',
            body: JSON.stringify({ defaultViewMode })
        });
        const current = adminClientSettings.find(item => item.client_id === clientId);
        if (current) {
            current.adminDefaultViewMode = defaultViewMode === 'simplified' ? 'simplified' : 'standard';
            current.clientSelectedViewMode = null;
            current.effectiveViewMode = current.adminDefaultViewMode;
            current.overriddenByClient = false;
        }
        renderClientSettingsList();
    } catch (e) {
        console.error('Erro ao atualizar visualização padrão:', e);
        alert('Erro ao atualizar visualização padrão');
    }
}

async function loadAccessHistory() {
    try {
        const res = await apiFetch('/api/admin/access-history', { headers: {} });
        const history = await res.json();
        
        const container = document.getElementById('accessHistory');
        
        if (history.length === 0) {
            container.innerHTML = '<p class="text-silver/80">Nenhum acesso registrado</p>';
            return;
        }
        
        container.innerHTML = history.map(h => `
<div class="bg-dark/50 rounded-xl p-3 flex items-center justify-between gap-4">
    <div class="min-w-0">
        <p class="text-white font-medium truncate">${h.username || 'Desconhecido'}</p>
        <p class="text-xs text-silver/80 truncate">${h.ip_address || 'IP desconhecido'}</p>
    </div>
    <div class="text-right shrink-0">
        <p class="text-silver text-sm">${h.role || '-'}</p>
        <p class="text-xs text-silver/80">${h.accessed_at ? new Date(h.accessed_at).toLocaleString('pt-BR') : '-'}</p>
    </div>
</div>`).join('');
    } catch (e) {
        document.getElementById('accessHistory').innerHTML = '<p class="text-danger">Erro ao carregar</p>';
    }
}

console.log('Settings JS carregado');

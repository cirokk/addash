// Inserção Manual de Dados
async function loadManualDataPage() {
    const content = document.getElementById('contentArea');
    const role = getRole();
    
    if (role !== 'admin') {
        content.innerHTML = '<div class="text-center text-silver">Acesso restrito</div>';
        return;
    }
    
    content.innerHTML = `
        <div class="glass-card rounded-2xl p-6 sm:p-8 fade-enter">
            <div class="mb-8">
                <h3 class="text-2xl font-display font-bold text-white">Inserir Dados Manualmente</h3>
                <p class="text-silver text-sm mt-1">Adicione ou edite dados de campanhas</p>
            </div>
            
            <form id="manualDataForm" class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Cliente *</label>
                        <select id="manualClientId" required class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Data *</label>
                        <input type="date" id="manualDate" required class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Cliques *</label>
                        <input type="number" id="manualClicks" required min="0" value="0" class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Impressões *</label>
                        <input type="number" id="manualImpressions" required min="0" value="0" class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Gasto (R$) *</label>
                        <input type="number" id="manualSpend" required min="0" step="0.01" value="0.00" class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-silver mb-2">Conversões *</label>
                        <input type="number" id="manualConversions" required min="0" value="0" class="premium-input w-full rounded-xl px-4 py-3 touch-target">
                    </div>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button type="submit" class="btn-premium px-6 py-3 rounded-xl touch-target">
                        Salvar Dados
                    </button>
                    <button type="button" onclick="clearManualForm()" class="px-6 py-3 rounded-xl border border-graphite hover:bg-graphite/30 transition text-silver touch-target">
                        Limpar
                    </button>
                </div>
                
                <div id="manualResult" class="hidden"></div>
            </form>
            
            <div class="mt-10 pt-8 border-t border-white/5">
                <h4 class="text-lg font-display font-semibold text-white mb-4">Registros Recentes</h4>
                <div class="overflow-x-auto">
                    <table class="premium-table w-full text-sm">
                        <thead>
                            <tr>
                                <th class="text-left py-3 px-4">Data</th>
                                <th class="text-left py-3 px-4">Cliente</th>
                                <th class="text-right py-3 px-4">Cliques</th>
                                <th class="text-right py-3 px-4">Gasto</th>
                                <th class="text-right py-3 px-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="recentEntries">
                            <tr><td colspan="5" class="text-center py-6 text-graphite">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div id="editModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
            <div class="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-lg">
                <h3 class="text-xl font-display font-semibold text-white mb-6">Editar Registro</h3>
                <form id="editDataForm" class="space-y-4">
                    <input type="hidden" id="editId">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-silver mb-2">Data</label>
                            <input type="date" id="editDate" required class="premium-input w-full rounded-xl px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-silver mb-2">Cliques</label>
                            <input type="number" id="editClicks" required min="0" class="premium-input w-full rounded-xl px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-silver mb-2">Impressões</label>
                            <input type="number" id="editImpressions" required min="0" class="premium-input w-full rounded-xl px-4 py-3">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-silver mb-2">Gasto (R$)</label>
                            <input type="number" id="editSpend" required min="0" step="0.01" class="premium-input w-full rounded-xl px-4 py-3">
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-silver mb-2">Conversões</label>
                            <input type="number" id="editConversions" required min="0" class="premium-input w-full rounded-xl px-4 py-3">
                        </div>
                    </div>
                    
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 btn-premium py-3 rounded-xl">Salvar</button>
                        <button type="button" onclick="closeEditModal()" class="px-6 py-3 rounded-xl border border-graphite hover:bg-graphite/30 transition text-silver">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    const clientsRes = await apiFetch('/api/admin/clients', { headers: {} });
    const clients = await clientsRes.json();
    document.getElementById('manualClientId').innerHTML = 
        '<option value="">Selecione...</option>' + 
        clients.map(c => `<option value="${c.client_id}">${c.username} (${c.client_id})</option>`).join('');
    
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    
    await loadRecentEntries();
    
    document.getElementById('manualDataForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveManualData();
    });
    
    document.getElementById('editDataForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateManualData();
    });
}

async function loadRecentEntries() {
    const res = await apiFetch('/api/data/performance', { headers: {} });
    const data = await res.json();
    
    const recent = data.slice(-10).reverse();
    const tbody = document.getElementById('recentEntries');
    
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-graphite">Nenhum registro encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = recent.map(d => `
        <tr>
            <td class="py-3 px-4">${new Date(d.date).toLocaleDateString('pt-BR')}</td>
            <td class="py-3 px-4 text-white font-medium">${d.client_id}</td>
            <td class="text-right py-3 px-4">${d.clicks.toLocaleString('pt-BR')}</td>
            <td class="text-right py-3 px-4 text-beige">R$ ${parseFloat(d.spend).toFixed(2)}</td>
            <td class="text-right py-3 px-4">
                <div class="flex gap-2 justify-end">
                    <button onclick="openEditModal(${d.id}, '${d.date}', ${d.clicks}, ${d.impressions}, ${d.spend}, ${d.conversions})" class="p-2 hover:bg-graphite/50 rounded-lg transition touch-target" title="Editar">
                        <svg class="w-4 h-4 text-silver" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="deleteManualData(${d.id})" class="p-2 hover:bg-danger/20 rounded-lg transition touch-target" title="Excluir">
                        <svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function saveManualData() {
    const data = {
        client_id: document.getElementById('manualClientId').value,
        date: document.getElementById('manualDate').value,
        clicks: parseInt(document.getElementById('manualClicks').value),
        impressions: parseInt(document.getElementById('manualImpressions').value),
        spend: parseFloat(document.getElementById('manualSpend').value),
        conversions: parseInt(document.getElementById('manualConversions').value)
    };
    
    if (!data.client_id || !data.date) {
        showManualResult('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    try {
        const res = await apiFetch('/api/admin/import-csv', {
            method: 'POST',
            body: JSON.stringify({ client_id: data.client_id, data: [data] })
        });
        
        if (res.ok) {
            showManualResult('Dados salvos com sucesso!', 'success');
            clearManualForm();
            await loadRecentEntries();
        } else {
            const err = await res.json();
            showManualResult(err.error || 'Erro ao salvar', 'error');
        }
    } catch (e) {
        showManualResult('Erro de conexão', 'error');
    }
}

function clearManualForm() {
    document.getElementById('manualClientId').value = '';
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('manualClicks').value = '0';
    document.getElementById('manualImpressions').value = '0';
    document.getElementById('manualSpend').value = '0.00';
    document.getElementById('manualConversions').value = '0';
}

function showManualResult(msg, type) {
    const el = document.getElementById('manualResult');
    el.classList.remove('hidden');
    el.innerHTML = `<p class="text-${type === 'success' ? 'success' : 'danger'} text-center py-3 rounded-xl ${type === 'success' ? 'bg-success/10' : 'bg-danger/10'}">${msg}</p>`;
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function openEditModal(id, date, clicks, impressions, spend, conversions) {
    document.getElementById('editId').value = id;
    document.getElementById('editDate').value = date;
    document.getElementById('editClicks').value = clicks;
    document.getElementById('editImpressions').value = impressions;
    document.getElementById('editSpend').value = spend;
    document.getElementById('editConversions').value = conversions;
    
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('flex');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModal').classList.remove('flex');
}

async function updateManualData() {
    const id = document.getElementById('editId').value;
    const data = {
        date: document.getElementById('editDate').value,
        clicks: parseInt(document.getElementById('editClicks').value),
        impressions: parseInt(document.getElementById('editImpressions').value),
        spend: parseFloat(document.getElementById('editSpend').value),
        conversions: parseInt(document.getElementById('editConversions').value)
    };
    
    const res = await apiFetch(`/api/admin/data/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        closeEditModal();
        await loadRecentEntries();
        showManualResult('Dados atualizados!', 'success');
    } else {
        showManualResult('Erro ao atualizar', 'error');
    }
}

async function deleteManualData(id) {
    if (!confirm('Excluir este registro?')) return;
    
    const res = await apiFetch(`/api/admin/data/${id}`, { method: 'DELETE', headers: {} });
    if (res.ok) {
        await loadRecentEntries();
    } else {
        alert('Erro ao excluir');
    }
}

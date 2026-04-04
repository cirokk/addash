// Gerenciamento de Clientes
async function loadClientsPage() {
    const content = document.getElementById('contentArea');
    const role = getRole();
    
    if (role !== 'admin') {
        content.innerHTML = '<div class="text-center text-gray-500">Acesso restrito</div>';
        return;
    }
    
    content.innerHTML = `
        <div class="glass-card rounded-2xl p-8 fade-enter">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-semibold text-white">Gerenciar Clientes</h3>
                <button onclick="showClientModal()" class="btn-premium text-white font-semibold py-2 px-4 rounded-xl transition-all">
                    + Novo Cliente
                </button>
            </div>
            
            <div id="clientsList" class="space-y-3">
                <p class="text-gray-500 text-center">Carregando...</p>
            </div>
        </div>
        
        <div id="clientModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center z-50">
            <div class="glass-card rounded-2xl p-8 w-full max-w-md">
                <h3 id="modalTitle" class="text-xl font-semibold text-white mb-6">Novo Cliente</h3>
                <form id="clientForm" class="space-y-4">
                    <input type="hidden" id="clientId">
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-2">Usuário</label>
                        <input type="text" id="clientUsername" required
                            class="w-full premium-input rounded-xl px-4 py-3 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-2">ID do Cliente</label>
                        <input type="text" id="clientIdInput" required
                            class="w-full premium-input rounded-xl px-4 py-3 text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-2">Senha</label>
                        <input type="password" id="clientPassword"
                            class="w-full premium-input rounded-xl px-4 py-3 text-white">
                        <p class="text-xs text-gray-500 mt-1">No mínimo 8 caracteres. Em edição, deixe em branco para manter a senha atual.</p>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="submit" class="flex-1 btn-premium text-white font-semibold py-3 rounded-xl transition-all">
                            Salvar
                        </button>
                        <button type="button" onclick="closeClientModal()" class="px-6 py-3 border border-gray-700 rounded-xl hover:bg-gray-800 transition">
                            <span class="text-white">Cancelar</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    await loadClientsList();
    
    document.getElementById('clientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveClient();
    });
}

async function loadClientsList() {
    const res = await apiFetch('/api/admin/clients', { headers: {} });
    const clients = await res.json();
    
    const list = document.getElementById('clientsList');
    if (clients.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center py-8">Nenhum cliente cadastrado</p>';
        return;
    }
    
    list.innerHTML = clients.map(c => `
        <div class="glass-card rounded-xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-royal/20 to-cyan/20 flex items-center justify-center">
                    <span class="text-white font-bold">${c.username.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                    <p class="text-white font-medium">${c.username}</p>
                    <p class="text-gray-500 text-sm">ID: ${c.client_id}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="editClient(${c.id}, '${c.username}', '${c.client_id}')" class="p-2 hover:bg-gray-700 rounded-lg transition">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button onclick="deleteClient(${c.id}, '${c.username}')" class="p-2 hover:bg-red-900/30 rounded-lg transition">
                    <svg class="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function showClientModal(edit = false) {
    document.getElementById('clientModal').classList.remove('hidden');
    document.getElementById('clientModal').classList.add('flex');
    document.getElementById('modalTitle').textContent = edit ? 'Editar Cliente' : 'Novo Cliente';
    
    if (!edit) {
        document.getElementById('clientForm').reset();
        document.getElementById('clientId').value = '';
    }
}

function closeClientModal() {
    document.getElementById('clientModal').classList.add('hidden');
    document.getElementById('clientModal').classList.remove('flex');
}

async function editClient(id, username, clientId) {
    document.getElementById('clientId').value = id;
    document.getElementById('clientUsername').value = username;
    document.getElementById('clientIdInput').value = clientId;
    document.getElementById('clientPassword').value = '';
    showClientModal(true);
}

async function deleteClient(id, username) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${username}"?`)) return;
    
    const res = await apiFetch(`/api/admin/clients/${id}`, { method: 'DELETE', headers: {} });
    if (res.ok) {
        loadClientsList();
    } else {
        alert('Erro ao excluir cliente');
    }
}

async function saveClient() {
    const id = document.getElementById('clientId').value;
    const username = document.getElementById('clientUsername').value;
    const client_id = document.getElementById('clientIdInput').value;
    const password = document.getElementById('clientPassword').value;
    
    const data = { username, client_id };
    if (!id && !password) {
        alert('Defina uma senha para o novo cliente');
        return;
    }
    if (password) data.password = password;
    
    const res = id 
        ? await apiFetch(`/api/admin/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) })
        : await apiFetch('/api/admin/clients', { method: 'POST', body: JSON.stringify(data) });
    
    if (res.ok) {
        closeClientModal();
        loadClientsList();
    } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar');
    }
}

/**
 * ============================================================
 * TechFix - Aplicacao Principal
 * ============================================================
 * Descricao: Modulo principal com todas as funcionalidades:
 *            - Navegacao entre paginas (sidebar)
 *            - Dashboard (cards + graficos)
 *            - CRUD de Ordens de Servico
 *            - CRUD de Clientes
 *            - CRUD de Usuarios
 *            - Helpers (toast, formatacao, modais)
 *            - Geracao de PDF
 *            - Envio de WhatsApp
 * ============================================================
 */

const TechFixApp = (function() {
    'use strict';

    // ==========================================================
    // FLAG: Impede registrar event listeners duplicados
    // ==========================================================
    let appListenersSetup = false;
    let loginListenersSetup = false;

    // ==========================================================
    // 1. HELPERS - Funcoes utilitarias
    // ==========================================================

    /**
     * Exibe uma notificacao toast na tela
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duracao em ms (default: 3000)
     */
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icones por tipo
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Forca o reflow para animacao
        toast.offsetHeight;
        toast.classList.add('show');

        // Remove apos a duracao
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Formata uma data para exibicao (dd/mm/aaaa)
     * @param {string} dateStr - Data em formato ISO ou string
     * @returns {string} Data formatada
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString('pt-BR');
        } catch {
            return dateStr;
        }
    }

    /**
     * Formata um valor monetario (R$ 0.000,00)
     * @param {number} value - Valor numerico
     * @returns {string} Valor formatado em Reais
     */
    function formatCurrency(value) {
        if (!value && value !== 0) return 'R$ 0,00';
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /**
     * Formata um telefone brasileiro
     * @param {string} phone - Telefone bruto
     * @returns {string} Telefone formatado
     */
    function formatPhone(phone) {
        if (!phone) return '-';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length <= 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        }
        return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }

    /**
     * Retorna o rotulo legivel para o status da OS
     * @param {string} status - Status interno (analise, reparo, etc.)
     * @returns {string} Rotulo em portugues
     */
    function getStatusLabel(status) {
        const labels = {
            'analise': 'Em Analise',
            'aguardando': 'Aguardando Peca',
            'reparo': 'Em Reparo',
            'concluido': 'Concluido',
            'nao_consertado': 'Nao Consertado',
            'entregue': 'Entregue'
        };
        return labels[status] || status;
    }

    /**
     * Retorna a classe CSS do badge para o status
     * @param {string} status - Status interno
     * @returns {string} Classe CSS do badge
     */
    function getStatusBadgeClass(status) {
        const classes = {
            'analise': 'badge-analysis',
            'aguardando': 'badge-waiting',
            'reparo': 'badge-repair',
            'concluido': 'badge-completed',
            'nao_consertado': 'badge-not-repaired',
            'entregue': 'badge-delivered'
        };
        return classes[status] || 'badge-secondary';
    }

    /**
     * Retorna o rotulo legivel para a funcao do usuario
     * @param {string} role - Funcao interna (atendente, tecnico, etc.)
     * @returns {string} Rotulo em portugues
     */
    function getRoleLabel(role) {
        const labels = {
            'atendente': 'Atendente',
            'tecnico': 'Tecnico',
            'gerente': 'Gerente',
            'administrador': 'Administrador'
        };
        return labels[role] || role;
    }

    /**
     * Retorna a cor do icone para o tipo de equipamento
     * @param {string} type - Tipo do equipamento
     * @returns {string} Classe de cor CSS
     */
    function getEquipIconColor(type) {
        const colors = {
            'Celular': '#3B82F6',
            'Tablet': '#8B5CF6',
            'Notebook': '#10B981',
            'Desktop': '#6366F1',
            'Equipamento de Som': '#F59E0B',
            'Microondas': '#EF4444',
            'Bateria JBL/BMS': '#06B6D4',
            'Outro': '#6B7280'
        };
        return colors[type] || '#6B7280';
    }

    /**
     * Abre um modal
     * @param {string} modalId - ID do modal
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Fecha um modal
     * @param {string} modalId - ID do modal
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    /**
     * Retorna o icone Font Awesome para o tipo de equipamento
     * @param {string} type - Tipo do equipamento
     * @returns {string} Classe do icone FA
     */
    function getEquipIcon(type) {
        const icons = {
            'Celular': 'fa-mobile-alt',
            'Tablet': 'fa-tablet-alt',
            'Notebook': 'fa-laptop',
            'Desktop': 'fa-desktop',
            'Equipamento de Som': 'fa-volume-up',
            'Microondas': 'fa-radiation',
            'Bateria JBL/BMS': 'fa-battery-full',
            'Outro': 'fa-microchip'
        };
        return icons[type] || 'fa-microchip';
    }


    // ==========================================================
    // 2. NAVEGACAO - Controle de paginas e sidebar
    // ==========================================================

    let currentPage = 'dashboard';

    /**
     * Navega para uma pagina especifica
     * @param {string} page - Nome da pagina (dashboard, orders, new-order, clients, users)
     */
    async function navigateTo(page, orderId = null) {
        // Atualiza a pagina ativa
        currentPage = page;

        // Atualiza os links ativos na sidebar
        document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Alterna a visibilidade das secoes
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(`page-${page}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Atualiza o titulo da pagina
        const titles = {
            'dashboard': 'Dashboard',
            'orders': 'Ordens de Servico',
            'new-order': 'Nova Ordem de Servico',
            'clients': 'Clientes',
            'users': 'Usuarios',
            'report': 'Relatorio'
        };
        document.getElementById('pageTitle').textContent = titles[page] || 'TechFix';

        // Carrega os dados da pagina
        switch (page) {
            case 'dashboard': await loadDashboard(); break;
            case 'orders': await loadOrders(); break;
            case 'new-order': await loadOrderForm(orderId || null); break;
            case 'clients': await loadClients(); break;
            case 'users': await loadUsers(); break;
            case 'report': await loadReport(); break;
        }

        // Fecha sidebar no mobile
        document.getElementById('sidebar').classList.remove('open');
    }


    // ==========================================================
    // 3. DASHBOARD - Cards de estatisticas e graficos
    // ==========================================================

    let statusChart = null;  // Instancia do grafico de status
    let typeChart = null;    // Instancia do grafico de tipo

    /**
     * Carrega e renderiza todos os dados do dashboard
     */
    async function loadDashboard() {
        try {
            // Obtem estatisticas
            const stats = await TechFixAPI.getDashboardStats();
            renderStatsCards(stats);

            // Obtem ordens para graficos
            const orders = await TechFixAPI.getOrders();
            renderStatusChart(orders);
            renderTypeChart(orders);
            renderRecentOrders(orders);
        } catch (error) {
            showToast('Erro ao carregar dashboard: ' + error.message, 'error');
        }
    }

    /**
     * Renderiza os cards de estatisticas no topo
     * @param {object} stats - Dados agregados
     */
    function renderStatsCards(stats) {
        const grid = document.getElementById('statsGrid');
        if (!grid) return;

        // Verifica se o usuario pode ver valor total (gerente/admin)
        const showValue = TechFixAuth.isGerenteOrAbove();

        grid.innerHTML = `
            <div class="stat-card" style="--card-color: var(--primary)">
                <div class="stat-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="stat-info">
                    <h3>${stats.total || 0}</h3>
                    <p>Total de Ordens</p>
                </div>
            </div>
            <div class="stat-card" style="--card-color: var(--warning)">
                <div class="stat-icon"><i class="fas fa-search"></i></div>
                <div class="stat-info">
                    <h3>${stats.em_analise || 0}</h3>
                    <p>Em Analise</p>
                </div>
            </div>
            <div class="stat-card" style="--card-color: var(--info)">
                <div class="stat-icon"><i class="fas fa-box"></i></div>
                <div class="stat-info">
                    <h3>${stats.aguardando_peca || 0}</h3>
                    <p>Aguardando Peca</p>
                </div>
            </div>
            <div class="stat-card" style="--card-color: #8B5CF6">
                <div class="stat-icon"><i class="fas fa-wrench"></i></div>
                <div class="stat-info">
                    <h3>${stats.em_reparo || 0}</h3>
                    <p>Em Reparo</p>
                </div>
            </div>
            <div class="stat-card" style="--card-color: var(--success)">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-info">
                    <h3>${stats.concluidos || 0}</h3>
                    <p>Concluidos</p>
                </div>
            </div>
            ${showValue ? `
            <div class="stat-card" style="--card-color: var(--success)">
                <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="stat-info">
                    <h3>${formatCurrency(stats.valor_total || 0)}</h3>
                    <p>Valor Total</p>
                </div>
            </div>` : ''}
        `;
    }

    /**
     * Renderiza o grafico de rosca (donut) com status das OS
     * @param {Array} orders - Lista de ordens de servico
     */
    function renderStatusChart(orders) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        // Conta quantas OS ha em cada status
        const statusCounts = {
            'Em Analise': orders.filter(o => o.status === 'analise').length,
            'Aguardando Peca': orders.filter(o => o.status === 'aguardando').length,
            'Em Reparo': orders.filter(o => o.status === 'reparo').length,
            'Concluido': orders.filter(o => o.status === 'concluido').length,
            'Nao Consertado': orders.filter(o => o.status === 'nao_consertado').length,
            'Entregue': orders.filter(o => o.status === 'entregue').length
        };

        // Cores para cada status
        const colors = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#6B7280'];

        // Destroi grafico anterior se existir
        if (statusChart) statusChart.destroy();

        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Renderiza o grafico de barras com tipos de equipamentos
     * @param {Array} orders - Lista de ordens de servico
     */
    function renderTypeChart(orders) {
        const ctx = document.getElementById('typeChart');
        if (!ctx) return;

        // Conta OS por tipo de equipamento
        const typeCounts = {};
        orders.forEach(o => {
            const type = o.equipType || 'Outro';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Cores para cada tipo
        const typeColors = Object.keys(typeCounts).map(t => getEquipIconColor(t));

        // Destroi grafico anterior se existir
        if (typeChart) typeChart.destroy();

        typeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    label: 'Ordens',
                    data: Object.values(typeCounts),
                    backgroundColor: typeColors,
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } }
                    },
                    x: {
                        ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 }
                    }
                }
            }
        });
    }

    /**
     * Renderiza a tabela de ordens recentes no dashboard
     * @param {Array} orders - Lista completa de ordens
     */
    function renderRecentOrders(orders) {
        const tbody = document.getElementById('recentOrdersBody');
        if (!tbody) return;

        // Pega as 5 mais recentes
        const recent = [...orders]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma ordem encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = recent.map(o => `
            <tr>
                <td data-label="OS"><strong>#${o.osNumber || o.id}</strong></td>
                <td data-label="Cliente">${o.clientName || '-'}</td>
                <td data-label="Equipamento">
                    <i class="fas ${getEquipIcon(o.equipType)}" style="color:${getEquipIconColor(o.equipType)};margin-right:6px"></i>
                    ${o.equipType || '-'}
                </td>
                <td data-label="Status"><span class="badge ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span></td>
                <td data-label="Data">${formatDate(o.updatedAt || o.createdAt)}</td>
            </tr>
        `).join('');
    }


    // ==========================================================
    // 4. ORDENS DE SERVICO - CRUD completo
    // ==========================================================

    let currentOrderId = null;  // ID da OS sendo visualizada
    let orderFormMode = 'create'; // 'create' ou 'edit'


    /**
     * Carrega a lista de ordens de servico
     */
    async function loadOrders() {
        try {
            const orders = await TechFixAPI.getOrders();
            renderOrdersTable(orders);
        } catch (error) {
            showToast('Erro ao carregar ordens: ' + error.message, 'error');
        }
    }

    /**
     * Renderiza a tabela de ordens com filtros
     * @param {Array} orders - Lista de ordens (todas ou filtradas)
     */
    function renderOrdersTable(orders) {
        const tbody = document.getElementById('ordersBody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma ordem de servico encontrada.</td></tr>';
            return;
        }

        // Ordena por data de atualizacao (mais recente primeiro)
        const sorted = [...orders].sort((a, b) =>
            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );

        tbody.innerHTML = sorted.map(o => `
            <tr>
                <td data-label="OS"><strong>#${o.osNumber || o.id}</strong></td>
                <td data-label="Cliente">${o.clientName || '-'}</td>
                <td data-label="Equipamento">
                    <i class="fas ${getEquipIcon(o.equipType)}" style="color:${getEquipIconColor(o.equipType)};margin-right:4px"></i>
                    ${o.equipType || '-'}
                </td>
                <td data-label="Defeito" title="${(o.defect || '').substring(0, 80)}">${(o.defect || '-').substring(0, 40)}${(o.defect || '').length > 40 ? '...' : ''}</td>
                <td data-label="Status"><span class="badge ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span></td>
                <td data-label="Prazo">${formatDate(o.deadline)}</td>
                <td data-label="Valor">${formatCurrency(o.value || 0)}</td>
                <td class="action-buttons" data-label="">
                    <button class="btn-icon" title="Ver detalhes" data-action="view-order" data-id="${o.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" title="Editar" data-action="edit-order" data-id="${o.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" title="WhatsApp" data-action="whatsapp-order" data-id="${o.id}" style="background:#f0fdf4;color:#25D366">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn-icon" title="E-mail" data-action="email-order" data-id="${o.id}" style="background:#eff6ff;color:#2563eb">
                        <i class="fas fa-envelope"></i>
                    </button>
                    ${TechFixAuth.canDelete() ? `
                    <button class="btn-icon btn-icon-danger" title="Excluir" data-action="delete-order" data-id="${o.id}">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filtra as ordens de servico na tabela
     */
    async function filterOrders() {
        const searchTerm = document.getElementById('orderSearch').value.toLowerCase().trim();
        const statusFilter = document.getElementById('orderStatusFilter').value;

        try {
            let orders = await TechFixAPI.getOrders();

            // Aplica filtro de busca
            if (searchTerm) {
                orders = orders.filter(o =>
                    (o.osNumber || '').toString().includes(searchTerm) ||
                    (o.clientName || '').toLowerCase().includes(searchTerm) ||
                    (o.equipType || '').toLowerCase().includes(searchTerm) ||
                    (o.defect || '').toLowerCase().includes(searchTerm) ||
                    (o.brand || '').toLowerCase().includes(searchTerm) ||
                    (o.model || '').toLowerCase().includes(searchTerm)
                );
            }

            // Aplica filtro de status
            if (statusFilter) {
                orders = orders.filter(o => o.status === statusFilter);
            }

            renderOrdersTable(orders);
        } catch (error) {
            showToast('Erro ao filtrar ordens: ' + error.message, 'error');
        }
    }

    /**
     * Carrega o formulario de ordem (nova ou edicao)
     * @param {number|null} id - ID da OS para editar (null = nova)
     */
    async function loadOrderForm(id = null) {
        orderFormMode = id ? 'edit' : 'create';
        currentOrderId = id || null;
        const form = document.getElementById('orderForm');
        if (form) form.reset();
        document.getElementById('orderId').value = '';
        document.getElementById('orderClientId').value = '';

        // Atualiza o titulo do card conforme o modo
        const cardTitle = document.querySelector('#page-new-order .card-header h3');
        if (cardTitle) {
            if (id) {
                cardTitle.innerHTML = '<i class="fas fa-edit" style="color:var(--warning)"></i> Editar Ordem de Servico';
            } else {
                cardTitle.innerHTML = '<i class="fas fa-plus-circle" style="color:var(--success)"></i> Nova Ordem de Servico';
            }
        }

        // Carrega lista de tecnicos no select
        try {
            const users = await TechFixAPI.getUsers();
            const techs = users.filter(u => u.role === 'tecnico' || u.funcao === 'tecnico');
            const techSelect = document.getElementById('orderTech');
            if (techSelect) {
                techSelect.innerHTML = '<option value="">Atribuir</option>';
                techs.forEach(t => {
                    techSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
            }
        } catch (error) {
            console.warn('Erro ao carregar tecnicos:', error.message);
        }

        // Se for edicao, preenche o formulario com dados da OS
        if (id) {
            try {
                const order = await TechFixAPI.getOrderById(id);
                if (order) {
                    document.getElementById('orderId').value = order.id;
                    document.getElementById('orderClientId').value = order.clientId || '';
                    document.getElementById('orderClientName').value = order.clientName || '';
                    document.getElementById('orderClientPhone').value = order.clientPhone || '';
                    document.getElementById('orderClientEmail').value = order.clientEmail || '';
                    document.getElementById('orderClientDoc').value = order.clientDoc || '';
                    document.getElementById('orderEquipType').value = order.equipType;
                    document.getElementById('orderBrand').value = order.brand || '';
                    document.getElementById('orderModel').value = order.model || '';
                    document.getElementById('orderSerial').value = order.serial || '';
                    document.getElementById('orderDefect').value = order.defect || '';
                    document.getElementById('orderNotes').value = order.notes || '';
                    document.getElementById('orderStatus').value = order.status;
                    document.getElementById('orderTech').value = order.techId || '';
                    document.getElementById('orderParts').value = order.parts || '';
                    document.getElementById('orderValue').value = order.value || '';
                    document.getElementById('orderDeadline').value = order.deadline || '';
                    document.getElementById('orderApproved').checked = order.approved || false;
                }
            } catch (error) {
                showToast('Erro ao carregar OS: ' + error.message, 'error');
            }
        }
    }

    /**
     * Salva uma ordem de servico (cria ou atualiza)
     * @param {Event} e - Evento do formulario
     */
    async function saveOrder(e) {
        e.preventDefault();

        // Coleta os dados do formulario
        const clientName = document.getElementById('orderClientName').value.trim();
        const clientPhone = document.getElementById('orderClientPhone').value.trim();
        const clientEmail = document.getElementById('orderClientEmail').value.trim();
        const clientDoc = document.getElementById('orderClientDoc').value.trim();
        const existingClientId = document.getElementById('orderClientId').value;

        // Validacao basica
        if (!clientName) {
            showToast('Informe o nome do cliente.', 'warning');
            return;
        }
        if (!clientPhone) {
            showToast('Informe o telefone do cliente.', 'warning');
            return;
        }

        // Determinar ou criar o cliente
        let clientId = existingClientId ? parseInt(existingClientId) : null;
        let resolvedClientName = clientName;

        try {
            if (!clientId) {
                // Procurar cliente existente pelo nome
                const clients = await TechFixAPI.getClients();
                const existing = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
                if (existing) {
                    clientId = existing.id;
                    resolvedClientName = existing.name;
                    // Atualizar telefone/email/doc se fornecidos
                    if (clientPhone && existing.phone !== clientPhone) {
                        existing.phone = clientPhone;
                    }
                    if (clientEmail && existing.email !== clientEmail) {
                        existing.email = clientEmail;
                    }
                    if (clientDoc && existing.doc !== clientDoc) {
                        existing.doc = clientDoc;
                    }
                    await TechFixAPI.saveClient(existing);
                } else {
                    // Criar novo cliente
                    const newClient = {
                        name: clientName,
                        phone: clientPhone,
                        email: clientEmail,
                        doc: clientDoc
                    };
                    const saved = await TechFixAPI.saveClient(newClient);
                    clientId = saved.id || saved;
                }
            } else {
                // Atualizar dados do cliente existente se houve mudancas
                try {
                    const clients = await TechFixAPI.getClients();
                    const existing = clients.find(c => c.id === clientId);
                    if (existing) {
                        let updated = false;
                        if (clientName && existing.name !== clientName) { existing.name = clientName; updated = true; }
                        if (clientPhone && existing.phone !== clientPhone) { existing.phone = clientPhone; updated = true; }
                        if (clientEmail && existing.email !== clientEmail) { existing.email = clientEmail; updated = true; }
                        if (clientDoc && existing.doc !== clientDoc) { existing.doc = clientDoc; updated = true; }
                        if (updated) await TechFixAPI.saveClient(existing);
                        resolvedClientName = existing.name;
                    }
                } catch (err) {
                    console.warn('Nao foi possivel atualizar dados do cliente:', err.message);
                }
            }
        } catch (error) {
            showToast('Erro ao salvar cliente: ' + error.message, 'error');
            return;
        }

        const orderData = {
            clientId: clientId,
            clientName: resolvedClientName,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            clientDoc: clientDoc,
            equipType: document.getElementById('orderEquipType').value,
            brand: document.getElementById('orderBrand').value,
            model: document.getElementById('orderModel').value,
            serial: document.getElementById('orderSerial').value,
            defect: document.getElementById('orderDefect').value,
            notes: document.getElementById('orderNotes').value,
            status: document.getElementById('orderStatus').value,
            techId: document.getElementById('orderTech').value,
            techName: '',
            parts: document.getElementById('orderParts').value,
            value: parseFloat(document.getElementById('orderValue').value) || 0,
            deadline: document.getElementById('orderDeadline').value,
            approved: document.getElementById('orderApproved').checked
        };

        if (!orderData.equipType) {
            showToast('Selecione o tipo de equipamento.', 'warning');
            return;
        }
        if (!orderData.defect.trim()) {
            showToast('Descreva o defeito apresentado.', 'warning');
            return;
        }

        // Obtem nome do tecnico se selecionado
        const techSelect = document.getElementById('orderTech');
        if (techSelect.value) {
            orderData.techName = techSelect.selectedOptions[0]?.text || '';
        }

        try {
            const editId = document.getElementById('orderId').value;
            const saved = await TechFixAPI.saveOrder(orderData, editId || null);
            if (!editId && saved && (saved.osNumber || saved.numero_os)) {
                const osNum = saved.osNumber || saved.numero_os;
                showToast(`Ordem criada com sucesso! Numero da OS: #${osNum}`, 'success', 5000);
            } else {
                showToast(editId ? 'Ordem atualizada com sucesso!' : 'Ordem criada com sucesso!', 'success');
            }

            // Reseta o formulario e volta para a lista
            document.getElementById('orderForm').reset();
            document.getElementById('orderClientId').value = '';
            navigateTo('orders');
        } catch (error) {
            showToast('Erro ao salvar ordem: ' + error.message, 'error');
        }
    }

    /**
     * Visualiza os detalhes de uma ordem de servico
     * @param {number} id - ID da ordem
     */
    async function viewOrder(id) {
        currentOrderId = id;

        try {
            const order = await TechFixAPI.getOrderById(id);
            if (!order) {
                showToast('Ordem nao encontrada.', 'error');
                return;
            }

            // Obtem historico de status (se disponivel)
            let history = [];
            try {
                history = await TechFixAPI.getStatusHistory(id);
            } catch { /* Historico opcional */ }

            // Preenche o modal de visualizacao
            document.getElementById('viewOrderTitle').textContent = `Ordem de Servico #${order.osNumber || order.id}`;

            let historyHTML = '';
            if (history.length > 0) {
                historyHTML = `
                    <div style="margin-top:16px">
                        <h4 style="font-size:14px;color:var(--gray-700);margin-bottom:8px">
                            <i class="fas fa-history"></i> Historico de Status
                        </h4>
                        <div class="status-timeline">
                            ${history.map(h => `
                                <div class="timeline-item">
                                    <span class="badge ${getStatusBadgeClass(h.status)}">${getStatusLabel(h.status)}</span>
                                    <small>${formatDate(h.changedAt || h.createdAt)} - ${h.userName || 'Sistema'}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            document.getElementById('viewOrderBody').innerHTML = `
                <div class="order-detail">
                    <!-- Dados do Cliente -->
                    <div class="detail-section">
                        <h4><i class="fas fa-user" style="color:var(--primary)"></i> Cliente</h4>
                        <div class="detail-grid">
                            <div><strong>Nome:</strong> ${order.clientName || '-'}</div>
                            <div><strong>Telefone:</strong> ${formatPhone(order.clientPhone)}</div>
                            <div><strong>Email:</strong> ${order.clientEmail || '-'}</div>
                            <div><strong>CPF/CNPJ:</strong> ${order.clientDoc || '-'}</div>
                        </div>
                    </div>

                    <!-- Dados do Equipamento -->
                    <div class="detail-section">
                        <h4><i class="fas ${getEquipIcon(order.equipType)}" style="color:${getEquipIconColor(order.equipType)}"></i> Equipamento</h4>
                        <div class="detail-grid">
                            <div><strong>Tipo:</strong> ${order.equipType || '-'}</div>
                            <div><strong>Marca:</strong> ${order.brand || '-'}</div>
                            <div><strong>Modelo:</strong> ${order.model || '-'}</div>
                            <div><strong>Serial/IMEI:</strong> ${order.serial || '-'}</div>
                        </div>
                    </div>

                    <!-- Defeito e Servico -->
                    <div class="detail-section">
                        <h4><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> Defeito</h4>
                        <p>${order.defect || '-'}</p>
                        ${order.notes ? `<p><strong>Diagnostico:</strong> ${order.notes}</p>` : ''}
                    </div>

                    <!-- Status e Detalhes -->
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle" style="color:var(--info)"></i> Detalhes do Servico</h4>
                        <div class="detail-grid">
                            <div><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(order.status)}">${getStatusLabel(order.status)}</span></div>
                            <div><strong>Tecnico:</strong> ${order.techName || 'Nao atribuido'}</div>
                            <div><strong>Pecas:</strong> ${order.parts || '-'}</div>
                            <div><strong>Valor:</strong> ${formatCurrency(order.value || 0)}</div>
                            <div><strong>Prazo:</strong> ${formatDate(order.deadline)}</div>
                            <div><strong>Aprovado:</strong> ${order.approved ? 'Sim' : 'Nao'}</div>
                        </div>
                    </div>

                    <!-- Datas -->
                    <div class="detail-section">
                        <div class="detail-grid">
                            <div><strong>Criado em:</strong> ${formatDate(order.createdAt)}</div>
                            <div><strong>Atualizado em:</strong> ${formatDate(order.updatedAt)}</div>
                        </div>
                    </div>

                    ${historyHTML}
                </div>
            `;

            openModal('viewOrderModal');
        } catch (error) {
            showToast('Erro ao visualizar OS: ' + error.message, 'error');
        }
    }

    /**
     * Exclui uma ordem de servico
     * @param {number} id - ID da ordem
     */
    async function deleteOrder(id) {
        if (!confirm('Tem certeza que deseja excluir esta ordem de servico? Esta acao nao pode ser desfeita.')) {
            return;
        }

        try {
            await TechFixAPI.deleteOrder(id);
            showToast('Ordem excluida com sucesso!', 'success');
            await loadOrders();
        } catch (error) {
            showToast('Erro ao excluir ordem: ' + error.message, 'error');
        }
    }


    // ==========================================================
    // 5. CLIENTES - CRUD completo
    // ==========================================================

    /**
     * Carrega a lista de clientes
     */
    async function loadClients() {
        try {
            const clients = await TechFixAPI.getClients();
            renderClientsTable(clients);
        } catch (error) {
            showToast('Erro ao carregar clientes: ' + error.message, 'error');
        }
    }

    /**
     * Renderiza a tabela de clientes
     * @param {Array} clients - Lista de clientes
     */
    function renderClientsTable(clients) {
        const tbody = document.getElementById('clientsBody');
        if (!tbody) return;

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum cliente cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = clients.map(c => `
            <tr>
                <td data-label="ID">${c.id}</td>
                <td data-label="Nome"><strong>${c.name || '-'}</strong></td>
                <td data-label="Telefone"><a href="https://wa.me/55${(c.phone || '').replace(/\D/g, '')}" target="_blank">${formatPhone(c.phone)}</a></td>
                <td data-label="E-mail">${c.email || '-'}</td>
                <td data-label="CPF/CNPJ">${c.doc || '-'}</td>
                <td data-label="Ordens">${c.orderCount || 0}</td>
                <td class="action-buttons" data-label="">
                    <button class="btn-icon" title="Editar" data-action="edit-client" data-id="${c.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${TechFixAuth.canDelete() ? `
                    <button class="btn-icon btn-icon-danger" title="Excluir" data-action="delete-client" data-id="${c.id}">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filtra clientes na tabela
     */
    async function filterClients() {
        const searchTerm = document.getElementById('clientSearch').value.toLowerCase().trim();

        try {
            let clients = await TechFixAPI.getClients();

            if (searchTerm) {
                clients = clients.filter(c =>
                    (c.name || '').toLowerCase().includes(searchTerm) ||
                    (c.phone || '').toLowerCase().includes(searchTerm) ||
                    (c.email || '').toLowerCase().includes(searchTerm) ||
                    (c.doc || '').toLowerCase().includes(searchTerm)
                );
            }

            renderClientsTable(clients);
        } catch (error) {
            showToast('Erro ao filtrar clientes: ' + error.message, 'error');
        }
    }

    /**
     * Abre o modal de cliente (novo ou edicao)
     * @param {number|null} id - ID do cliente para editar (null = novo)
     */
    async function openClientModal(id = null) {
        const form = document.getElementById('clientForm');
        if (form) form.reset();
        document.getElementById('clientId').value = '';

        // Ajusta o titulo do modal
        document.getElementById('clientModalTitle').textContent = id ? 'Editar Cliente' : 'Novo Cliente';

        // Se for edicao, preenche os dados
        if (id) {
            try {
                const client = await TechFixAPI.getClientById(id);
                if (client) {
                    document.getElementById('clientId').value = client.id;
                    document.getElementById('clientName').value = client.name || '';
                    document.getElementById('clientDoc').value = client.doc || '';
                    document.getElementById('clientPhone').value = client.phone || '';
                    document.getElementById('clientEmail').value = client.email || '';
                    document.getElementById('clientAddress').value = client.address || '';
                    document.getElementById('clientNotes').value = client.notes || '';
                }
            } catch (error) {
                showToast('Erro ao carregar cliente: ' + error.message, 'error');
            }
        }

        openModal('clientModal');
    }

    /**
     * Salva os dados do cliente
     * @param {Event} e - Evento do formulario
     */
    async function saveClient(e) {
        e.preventDefault();

        const clientData = {
            name: document.getElementById('clientName').value.trim(),
            doc: document.getElementById('clientDoc').value.trim(),
            phone: document.getElementById('clientPhone').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            address: document.getElementById('clientAddress').value.trim(),
            notes: document.getElementById('clientNotes').value.trim()
        };

        // Validacao
        if (!clientData.name) {
            showToast('Nome do cliente e obrigatorio.', 'warning');
            return;
        }
        if (!clientData.phone) {
            showToast('Telefone do cliente e obrigatorio.', 'warning');
            return;
        }

        try {
            const editId = document.getElementById('clientId').value;
            const savedClient = await TechFixAPI.saveClient(clientData, editId || null);
            showToast(editId ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!', 'success');
            closeModal('clientModal');

            await loadClients();
        } catch (error) {
            showToast('Erro ao salvar cliente: ' + error.message, 'error');
        }
    }

    /**
     * Exclui um cliente
     * @param {number} id - ID do cliente
     */
    async function deleteClient(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) {
            return;
        }

        try {
            await TechFixAPI.deleteClient(id);
            showToast('Cliente excluido com sucesso!', 'success');
            await loadClients();
        } catch (error) {
            showToast('Erro ao excluir cliente: ' + error.message, 'error');
        }
    }


    // ==========================================================
    // 6. USUARIOS - CRUD completo
    // ==========================================================

    /**
     * Carrega a lista de usuarios
     */
    async function loadUsers() {
        // Apenas gerentes e admins podem ver
        if (!TechFixAuth.canManageUsers()) {
            showToast('Voce nao tem permissao para gerenciar usuarios.', 'warning');
            navigateTo('dashboard');
            return;
        }

        try {
            const users = await TechFixAPI.getUsers();
            renderUsersTable(users);
        } catch (error) {
            showToast('Erro ao carregar usuarios: ' + error.message, 'error');
        }
    }

    /**
     * Renderiza a tabela de usuarios
     * @param {Array} users - Lista de usuarios
     */
    function renderUsersTable(users) {
        const tbody = document.getElementById('usersBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum usuario cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const role = u.role || u.funcao;
            const isActive = u.active !== false && u.ativo !== false;
            return `
                <tr>
                    <td data-label="ID">${u.id}</td>
                    <td data-label="Nome"><strong>${u.name || '-'}</strong></td>
                    <td data-label="E-mail">${u.email || '-'}</td>
                    <td data-label="Funcao"><span class="badge ${role === 'administrador' ? 'badge-danger' : role === 'gerente' ? 'badge-warning' : role === 'tecnico' ? 'badge-primary' : 'badge-info'}">${getRoleLabel(role)}</span></td>
                    <td data-label="Status"><span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}">${isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td class="action-buttons" data-label="">
                        <button class="btn-icon" title="Editar" data-action="edit-user" data-id="${u.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${TechFixAuth.canDelete() && u.id !== TechFixAuth.getCurrentUser()?.id ? `
                        <button class="btn-icon btn-icon-danger" title="Excluir" data-action="delete-user" data-id="${u.id}">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Filtra usuarios na tabela
     */
    async function filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase().trim();

        try {
            let users = await TechFixAPI.getUsers();

            if (searchTerm) {
                users = users.filter(u =>
                    (u.name || '').toLowerCase().includes(searchTerm) ||
                    (u.email || '').toLowerCase().includes(searchTerm) ||
                    (u.role || u.funcao || '').toLowerCase().includes(searchTerm)
                );
            }

            renderUsersTable(users);
        } catch (error) {
            showToast('Erro ao filtrar usuarios: ' + error.message, 'error');
        }
    }

    /**
     * Abre o modal de usuario (novo ou edicao)
     * @param {number|null} id - ID do usuario para editar (null = novo)
     */
    async function openUserModal(id = null) {
        const form = document.getElementById('userForm');
        if (form) form.reset();
        document.getElementById('userIdField').value = '';
        document.getElementById('userActive').checked = true;

        // Ajusta o titulo do modal
        document.getElementById('userModalTitle').textContent = id ? 'Editar Usuario' : 'Novo Usuario';

        // Se for edicao, preenche os dados
        if (id) {
            try {
                const user = await TechFixAPI.getUserById(id);
                if (user) {
                    document.getElementById('userIdField').value = user.id;
                    document.getElementById('userName').value = user.name || '';
                    document.getElementById('userRole').value = user.role || user.funcao || 'atendente';
                    document.getElementById('userEmail').value = user.email || '';
                    document.getElementById('userActive').checked = user.active !== false && user.ativo !== false;
                    // Nao preenche a senha na edicao
                    document.getElementById('userPassword').required = false;
                    document.getElementById('userPassword').placeholder = 'Deixe em branco para manter';
                }
            } catch (error) {
                showToast('Erro ao carregar usuario: ' + error.message, 'error');
            }
        } else {
            document.getElementById('userPassword').required = true;
            document.getElementById('userPassword').placeholder = 'Min. 6 caracteres';
        }

        openModal('userModal');
    }

    /**
     * Salva os dados do usuario
     * @param {Event} e - Evento do formulario
     */
    async function saveUser(e) {
        e.preventDefault();

        const userData = {
            name: document.getElementById('userName').value.trim(),
            role: document.getElementById('userRole').value,
            funcao: document.getElementById('userRole').value,
            email: document.getElementById('userEmail').value.trim(),
            active: document.getElementById('userActive').checked
        };

        // Senha: obrigatoria para novo usuario, opcional para edicao
        const password = document.getElementById('userPassword').value;
        const editId = document.getElementById('userIdField').value;

        if (!editId && !password) {
            showToast('Senha e obrigatoria para novos usuarios.', 'warning');
            return;
        }
        if (password && password.length < 6) {
            showToast('A senha deve ter no minimo 6 caracteres.', 'warning');
            return;
        }
        if (password) {
            userData.password = password;
        }

        // Validacao basica
        if (!userData.name) {
            showToast('Nome do usuario e obrigatorio.', 'warning');
            return;
        }
        if (!userData.email) {
            showToast('E-mail do usuario e obrigatorio.', 'warning');
            return;
        }

        try {
            await TechFixAPI.saveUser(userData, editId || null);
            showToast(editId ? 'Usuario atualizado com sucesso!' : 'Usuario criado com sucesso!', 'success');
            closeModal('userModal');
            await loadUsers();
        } catch (error) {
            showToast('Erro ao salvar usuario: ' + error.message, 'error');
        }
    }

    /**
     * Exclui um usuario
     * @param {number} id - ID do usuario
     */
    async function deleteUser(id) {
        if (!confirm('Tem certeza que deseja excluir este usuario?')) {
            return;
        }

        // Nao permite excluir a si mesmo
        if (id === TechFixAuth.getCurrentUser()?.id) {
            showToast('Voce nao pode excluir seu proprio usuario.', 'warning');
            return;
        }

        try {
            await TechFixAPI.deleteUser(id);
            showToast('Usuario excluido com sucesso!', 'success');
            await loadUsers();
        } catch (error) {
            showToast('Erro ao excluir usuario: ' + error.message, 'error');
        }
    }


    // ==========================================================
    // 7. PDF - Geracao de PDF da ordem de servico
    // ==========================================================

    /**
     * Gera um PDF da ordem de servico usando jsPDF
     * @param {number} id - ID da ordem (usa currentOrderId se nao informado)
     */
    async function generateOrderPDF(id) {
        const orderId = id || currentOrderId;
        if (!orderId) {
            showToast('Nenhuma ordem selecionada.', 'warning');
            return;
        }

        try {
            const order = await TechFixAPI.getOrderById(orderId);
            if (!order) {
                showToast('Ordem nao encontrada.', 'error');
                return;
            }

            // Cria o documento PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Cabecalho com logo
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, 210, 35, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('TechFix', 15, 18);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Sistema de Ordem de Servico', 15, 25);

            // Numero da OS
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`OS #${order.osNumber || order.id}`, 150, 18);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Data: ${formatDate(order.createdAt)}`, 150, 25);

            // Reseta cor do texto
            doc.setTextColor(0, 0, 0);

            // Secao: Dados do Cliente
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Dados do Cliente', 15, 48);
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.5);
            doc.line(15, 50, 195, 50);

            doc.autoTable({
                startY: 53,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 },
                head: [['Campo', 'Valor']],
                body: [
                    ['Nome', order.clientName || '-'],
                    ['Telefone', formatPhone(order.clientPhone)],
                    ['E-mail', order.email || '-']
                ],
                margin: { left: 15, right: 15 }
            });

            // Secao: Dados do Equipamento
            let yPos = doc.lastAutoTable.finalY + 12;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Dados do Equipamento', 15, yPos);
            doc.line(15, yPos + 2, 195, yPos + 2);

            doc.autoTable({
                startY: yPos + 5,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 },
                head: [['Campo', 'Valor']],
                body: [
                    ['Tipo', order.equipType || '-'],
                    ['Marca', order.brand || '-'],
                    ['Modelo', order.model || '-'],
                    ['Serial/IMEI', order.serial || '-']
                ],
                margin: { left: 15, right: 15 }
            });

            // Secao: Defeito e Servico
            yPos = doc.lastAutoTable.finalY + 12;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Defeito e Servico', 15, yPos);
            doc.line(15, yPos + 2, 195, yPos + 2);

            doc.autoTable({
                startY: yPos + 5,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 },
                head: [['Campo', 'Valor']],
                body: [
                    ['Defeito', order.defect || '-'],
                    ['Diagnostico', order.notes || '-'],
                    ['Status', getStatusLabel(order.status)],
                    ['Tecnico', order.techName || 'Nao atribuido'],
                    ['Pecas', order.parts || '-'],
                    ['Valor', formatCurrency(order.value || 0)],
                    ['Prazo', formatDate(order.deadline)],
                    ['Aprovado', order.approved ? 'Sim' : 'Nao']
                ],
                margin: { left: 15, right: 15 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 130 }
                }
            });

            // Rodape
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `TechFix - Ordem de Servico #${order.osNumber || order.id} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
                    15, 285
                );
                doc.text(`Pagina ${i} de ${pageCount}`, 170, 285);
            }

            // Salva o PDF
            doc.save(`OS_${order.osNumber || order.id}_TechFix.pdf`);
            showToast('PDF gerado com sucesso!', 'success');

        } catch (error) {
            showToast('Erro ao gerar PDF: ' + error.message, 'error');
        }
    }


    // ==========================================================
    // 8. WHATSAPP - Envio de mensagem via WhatsApp
    // ==========================================================

    /**
     * Abre o WhatsApp com mensagem pre-formatada sobre a OS
     * @param {number} id - ID da ordem (usa currentOrderId se nao informado)
     */
    async function sendWhatsApp(id) {
        const orderId = id || currentOrderId;
        if (!orderId) {
            showToast('Nenhuma ordem selecionada.', 'warning');
            return;
        }

        try {
            const order = await TechFixAPI.getOrderById(orderId);
            if (!order || !order.clientPhone) {
                showToast('Cliente sem telefone cadastrado.', 'warning');
                return;
            }

            // Limpa o telefone (remove nao-digitos)
            const phone = order.clientPhone.replace(/\D/g, '');

            // Monta a mensagem
            const message = encodeURIComponent(
                `Ola ${order.clientName}! Aqui e da TechFix.\n\n` +
                `Sobre sua Ordem de Servico #${order.osNumber || order.id}:\n` +
                `- Equipamento: ${order.equipType} ${order.brand || ''} ${order.model || ''}\n` +
                `- Status: ${getStatusLabel(order.status)}\n` +
                `- Valor: ${formatCurrency(order.value || 0)}\n\n` +
                `Qualquer duvida, entre em contato!`
            );

            // Abre o WhatsApp Web
            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');

            showToast('WhatsApp aberto com mensagem pre-formatada!', 'success');

        } catch (error) {
            showToast('Erro ao enviar WhatsApp: ' + error.message, 'error');
        }
    }


    // ==========================================================
    // 9. EVENTOS - Configuracao de todos os event listeners
    // ==========================================================

    /**
     * Configura os event listeners da tela de LOGIN apenas.
     * Deve ser chamada na inicializacao, ANTES do login.
     * (Separada para funcionar mesmo antes de showApp())
     */
    function setupLoginListeners() {
        if (loginListenersSetup) return;
        loginListenersSetup = true;

        // Mascara de telefone nos campos de WhatsApp
        function phoneMask(input) {
            input.addEventListener('input', function() {
                let v = this.value.replace(/\D/g, '');
                if (v.length > 11) v = v.substring(0, 11);
                if (v.length > 6) {
                    v = '(' + v.substring(0,2) + ') ' + v.substring(2,7) + '-' + v.substring(7);
                } else if (v.length > 2) {
                    v = '(' + v.substring(0,2) + ') ' + v.substring(2);
                } else if (v.length > 0) {
                    v = '(' + v;
                }
                this.value = v;
            });
        }
        phoneMask(document.getElementById('recoveryWhatsapp'));
        phoneMask(document.getElementById('regPhone'));

        // Abas de login/registro
        document.getElementById('tabLogin').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('tabRegister').classList.remove('active');
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('forgotForm').style.display = 'none';
            document.getElementById('loginTabs').style.display = 'flex';
            document.getElementById('loginError').textContent = '';
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('loginSuccess').textContent = '';
            document.getElementById('loginSuccess').style.display = 'none';
        });

        document.getElementById('tabRegister').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('tabLogin').classList.remove('active');
            document.getElementById('registerForm').style.display = 'block';
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('forgotForm').style.display = 'none';
            document.getElementById('loginTabs').style.display = 'flex';
            document.getElementById('loginError').textContent = '';
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('loginSuccess').textContent = '';
            document.getElementById('loginSuccess').style.display = 'none';
        });

        // Formulario de login
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const role = document.getElementById('loginRole').value;
            const errorEl = document.getElementById('loginError');

            try {
                let user = await TechFixAuth.handleLogin(email, password);
                // Se selecionou cargo no login e o modo fallback esta ativo (sem token API), aplica o cargo selecionado
                if (role && !TechFixAPI.getToken()) {
                    user.role = role;
                    user.funcao = role;
                    TechFixAuth.setSession(user);
                }
                // Login bem-sucedido: mostra a app
                showApp(user);
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
            }
        });

        // Formulario de registro
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const userData = {
                name: document.getElementById('regName').value.trim(),
                email: document.getElementById('regEmail').value.trim(),
                password: document.getElementById('regPassword').value,
                phone: document.getElementById('regPhone').value.trim(),
                role: document.getElementById('regRole').value,
                funcao: document.getElementById('regRole').value,
                active: true
            };

            if (userData.password.length < 6) {
                document.getElementById('loginError').textContent = 'A senha deve ter no minimo 6 caracteres.';
                document.getElementById('loginError').style.display = 'block';
                return;
            }

            try {
                await TechFixAuth.handleRegister(userData);
                showToast('Conta criada com sucesso! Faca login.', 'success');
                // Volta para a aba de login
                document.getElementById('tabLogin').click();
                document.getElementById('loginForm').reset();
            } catch (error) {
                document.getElementById('loginError').textContent = error.message;
                document.getElementById('loginError').style.display = 'block';
            }
        });

        // ---- RECUPERACAO DE SENHA ----

        // Link "Esqueceu sua senha?" - mostra formulario de recuperacao
        document.getElementById('forgotLink').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('forgotForm').style.display = 'block';
            document.getElementById('loginTabs').style.display = 'none';
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('loginSuccess').style.display = 'none';
        });

        // Link "Voltar ao login" - volta para o formulario de login
        document.getElementById('backToLoginLink').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('forgotForm').style.display = 'none';
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('loginTabs').style.display = 'flex';
            document.getElementById('loginError').style.display = 'none';
            document.getElementById('loginSuccess').style.display = 'none';
        });

        // Abas de metodo de recuperacao (E-mail / WhatsApp)
        document.getElementById('tabRecoveryEmail').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('tabRecoveryWhatsapp').classList.remove('active');
            document.getElementById('recoveryEmailFields').style.display = 'block';
            document.getElementById('recoveryWhatsappFields').style.display = 'none';
        });

        document.getElementById('tabRecoveryWhatsapp').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('tabRecoveryEmail').classList.remove('active');
            document.getElementById('recoveryEmailFields').style.display = 'none';
            document.getElementById('recoveryWhatsappFields').style.display = 'block';
        });

        // Formulario de recuperacao de senha
        document.getElementById('forgotForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorEl = document.getElementById('loginError');
            const successEl = document.getElementById('loginSuccess');
            const activeTab = document.querySelector('.recovery-tabs button.active');
            const isEmail = activeTab && activeTab.id === 'tabRecoveryEmail';

            try {
                let result;
                if (isEmail) {
                    const email = document.getElementById('recoveryEmail').value.trim();
                    if (!email) {
                        errorEl.textContent = 'Informe o e-mail cadastrado.';
                        errorEl.style.display = 'block';
                        return;
                    }
                    result = await TechFixAuth.handlePasswordRecoveryByEmail(email);

                    // Sucesso por e-mail
                    successEl.innerHTML = '<i class="fas fa-check-circle"></i> ' +
                        (result.message || 'Sua nova senha temporaria foi enviada para o e-mail informado.') +
                        (result.tempPassword ? '<br><small>Senha temporaria (modo offline): <strong>' + result.tempPassword + '</strong></small>' : '');
                    successEl.style.display = 'block';
                    errorEl.style.display = 'none';
                } else {
                    const phone = document.getElementById('recoveryWhatsapp').value.trim();
                    if (!phone) {
                        errorEl.textContent = 'Informe o numero de WhatsApp cadastrado.';
                        errorEl.style.display = 'block';
                        return;
                    }
                    result = await TechFixAuth.handlePasswordRecoveryByWhatsapp(phone);

                    // Abrir WhatsApp com mensagem pre-formatada
                    if (result.whatsappUrl) {
                        window.open(result.whatsappUrl, '_blank');
                    }

                    successEl.innerHTML = '<i class="fab fa-whatsapp" style="color:#25D366"></i> ' +
                        (result.message || 'Sera aberto o WhatsApp para enviar a nova senha.') +
                        (result.tempPassword ? '<br><small>Senha temporaria (modo offline): <strong>' + result.tempPassword + '</strong></small>' : '');
                    successEl.style.display = 'block';
                    errorEl.style.display = 'none';
                }
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
                successEl.style.display = 'none';
            }
        });
    }

    /**
     * Configura todos os event listeners da aplicacao (pos-login).
     * Chamada apenas uma vez dentro de showApp().
     */
    function setupEventListeners() {
        if (appListenersSetup) return;
        appListenersSetup = true;

        // ---- NAVEGACAO (SIDEBAR) ----

        // Links de navegacao
        document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                navigateTo(this.dataset.page);
            });
        });

        // Logout
        document.getElementById('navLogout').addEventListener('click', function(e) {
            e.preventDefault();
            TechFixAuth.handleLogout();
            showToast('Voce saiu do sistema.', 'info');
        });

        // Toggle mobile - abre sidebar e mostra backdrop
        document.getElementById('mobileToggle').addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const backdrop = document.getElementById('sidebarBackdrop');
            sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('show', sidebar.classList.contains('open'));
        });

        // Backdrop para fechar sidebar ao clicar fora
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', function() {
                document.getElementById('sidebar').classList.remove('open');
                this.classList.remove('show');
            });
        }

        // Fechar sidebar ao navegar no mobile
        document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                    const backdrop = document.getElementById('sidebarBackdrop');
                    if (backdrop) backdrop.classList.remove('show');
                }
            });
        });


        // ---- ORDENS DE SERVICO ----

        // Filtro de busca e status
        document.getElementById('orderSearch').addEventListener('input', filterOrders);
        document.getElementById('orderStatusFilter').addEventListener('change', filterOrders);

        // Botao nova OS (a partir da lista)
        document.getElementById('btnNewOrderFromList').addEventListener('click', function() {
            navigateTo('new-order');
        });

        // Formulario de OS
        document.getElementById('orderForm').addEventListener('submit', saveOrder);

        // Botao limpar formulario
        document.getElementById('btnResetOrder').addEventListener('click', function() {
            document.getElementById('orderForm').reset();
            document.getElementById('orderId').value = '';
            document.getElementById('orderClientId').value = '';
            document.getElementById('orderClientName').value = '';
            document.getElementById('orderClientPhone').value = '';
            document.getElementById('orderClientEmail').value = '';
            document.getElementById('orderClientDoc').value = '';
            orderFormMode = 'create';
            currentOrderId = null;
            showToast('Formulario limpo.', 'info');
        });

        // Acoes na tabela de ordens (event delegation)
        document.getElementById('ordersBody').addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            switch (action) {
                case 'view-order': viewOrder(id); break;
                case 'edit-order': navigateTo('new-order', id); break;
                case 'delete-order': deleteOrder(id); break;
                case 'whatsapp-order': sendWhatsApp(id); break;
                case 'email-order': sendEmail(id); break;
            }
        });

        // Botoes do modal de visualizacao de OS
        document.getElementById('btnGeneratePDF').addEventListener('click', function() {
            generateOrderPDF();
        });

        document.getElementById('btnSendWhatsApp').addEventListener('click', function() {
            sendWhatsApp();
        });

        document.getElementById('btnSendEmail').addEventListener('click', function() {
            sendEmail();
        });

        document.getElementById('closeViewOrderModal').addEventListener('click', function() {
            closeModal('viewOrderModal');
        });

        document.getElementById('closeViewOrderBtn').addEventListener('click', function() {
            closeModal('viewOrderModal');
        });

        // ---- RELATORIO ----
        document.getElementById('btnSearchReport').addEventListener('click', searchReport);
        document.getElementById('reportOsSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchReport();
        });
        document.getElementById('btnPrintReport').addEventListener('click', printReport);
        document.getElementById('btnReportWhatsApp').addEventListener('click', function() {
            sendWhatsApp();
        });
        document.getElementById('btnReportEmail').addEventListener('click', function() {
            sendEmail();
        });


        // ---- CLIENTES ----

        // Filtro de busca
        document.getElementById('clientSearch').addEventListener('input', filterClients);

        // Botao novo cliente
        document.getElementById('btnNewClient').addEventListener('click', function() {
            openClientModal();
        });

        // Formulario de cliente
        document.getElementById('clientForm').addEventListener('submit', saveClient);

        // Fechar modal de cliente
        document.getElementById('closeClientModal').addEventListener('click', function() {
            closeModal('clientModal');
        });
        document.getElementById('cancelClientModal').addEventListener('click', function() {
            closeModal('clientModal');
        });

        // Acoes na tabela de clientes (event delegation)
        document.getElementById('clientsBody').addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            switch (action) {
                case 'edit-client': openClientModal(id); break;
                case 'delete-client': deleteClient(id); break;
            }
        });


        // ---- USUARIOS ----

        // Filtro de busca
        document.getElementById('userSearch').addEventListener('input', filterUsers);

        // Botao novo usuario
        document.getElementById('btnNewUser').addEventListener('click', function() {
            openUserModal();
        });

        // Formulario de usuario
        document.getElementById('userForm').addEventListener('submit', saveUser);

        // Fechar modal de usuario
        document.getElementById('closeUserModal').addEventListener('click', function() {
            closeModal('userModal');
        });
        document.getElementById('cancelUserModal').addEventListener('click', function() {
            closeModal('userModal');
        });

        // Acoes na tabela de usuarios (event delegation)
        document.getElementById('usersBody').addEventListener('click', function(e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            switch (action) {
                case 'edit-user': openUserModal(id); break;
                case 'delete-user': deleteUser(id); break;
            }
        });


        // ---- MODAIS (clique no overlay para fechar) ----

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });
    }


    // ==========================================================
    // 9b. RELATORIO - Pagina de relatorio para impressao
    // ==========================================================

    /**
     * Carrega a pagina de relatorio
     */
    async function loadReport() {
        document.getElementById('reportOsSearch').value = '';
        document.getElementById('reportContent').style.display = 'none';
        document.getElementById('reportEmpty').style.display = 'block';
    }

    /**
     * Busca uma OS e preenche o relatorio
     */
    async function searchReport() {
        const searchTerm = document.getElementById('reportOsSearch').value.trim();
        if (!searchTerm) {
            showToast('Digite o numero da OS para buscar.', 'warning');
            return;
        }

        try {
            const orders = await TechFixAPI.getOrders();
            const order = orders.find(o =>
                (o.osNumber && o.osNumber.toString() === searchTerm) ||
                (o.id && o.id.toString() === searchTerm)
            );

            if (!order) {
                showToast('Ordem de servico nao encontrada.', 'error');
                return;
            }

            // Preenche OS info
            document.getElementById('reportOsInfo').innerHTML = `
                <div class="detail-row"><span>Numero da OS:</span> <span><strong>#${order.osNumber || order.id}</strong></span></div>
                <div class="detail-row"><span>Status:</span> <span class="badge ${getStatusBadgeClass(order.status)}">${getStatusLabel(order.status)}</span></div>
                <div class="detail-row"><span>Tecnico:</span> <span>${order.techName || 'Nao atribuido'}</span></div>
                <div class="detail-row"><span>Criado em:</span> <span>${formatDate(order.createdAt)}</span></div>
                <div class="detail-row"><span>Atualizado em:</span> <span>${formatDate(order.updatedAt)}</span></div>
            `;

            // Preenche cliente info
            document.getElementById('reportClientInfo').innerHTML = `
                <div class="detail-row"><span>Nome:</span> <span>${order.clientName || '-'}</span></div>
                <div class="detail-row"><span>Telefone:</span> <span>${formatPhone(order.clientPhone)}</span></div>
                <div class="detail-row"><span>Email:</span> <span>${order.clientEmail || '-'}</span></div>
                <div class="detail-row"><span>CPF/CNPJ:</span> <span>${order.clientDoc || '-'}</span></div>
            `;

            // Preenche equipamento info
            document.getElementById('reportEquipInfo').innerHTML = `
                <div class="detail-row"><span>Tipo:</span> <span>${order.equipType || '-'}</span></div>
                <div class="detail-row"><span>Marca:</span> <span>${order.brand || '-'}</span></div>
                <div class="detail-row"><span>Modelo:</span> <span>${order.model || '-'}</span></div>
                <div class="detail-row"><span>Serial/IMEI:</span> <span>${order.serial || '-'}</span></div>
            `;

            // Preenche defeito/servico info
            document.getElementById('reportServiceInfo').innerHTML = `
                <div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Defeito:</span> <span>${order.defect || '-'}</span></div>
                ${order.notes ? `<div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Diagnostico:</span> <span>${order.notes}</span></div>` : ''}
                <div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Pecas:</span> <span>${order.parts || '-'}</span></div>
                <div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Valor:</span> <span>${formatCurrency(order.value || 0)}</span></div>
                <div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Prazo:</span> <span>${formatDate(order.deadline)}</span></div>
                <div class="detail-row" style="margin-bottom:8px"><span style="font-weight:600;color:var(--gray-600);min-width:100px;display:inline-block">Aprovado:</span> <span>${order.approved ? 'Sim' : 'Nao'}</span></div>
            `;

            // Data de geracao
            document.getElementById('reportGeneratedAt').textContent =
                `Relatorio gerado em: ${new Date().toLocaleString('pt-BR')}`;

            // Mostra conteudo, esconde vazio
            document.getElementById('reportContent').style.display = 'block';
            document.getElementById('reportEmpty').style.display = 'none';

            // Armazena OS atual para WhatsApp/Email
            currentOrderId = order.id;

        } catch (error) {
            showToast('Erro ao buscar OS: ' + error.message, 'error');
        }
    }

    /**
     * Imprime o relatorio
     */
    function printReport() {
        window.print();
    }

    /**
     * Envia OS por e-mail (mailto link)
     * @param {number} id - ID da ordem (usa currentOrderId se nao informado)
     */
    async function sendEmail(id) {
        const orderId = id || currentOrderId;
        if (!orderId) {
            showToast('Nenhuma ordem selecionada.', 'warning');
            return;
        }

        try {
            const order = await TechFixAPI.getOrderById(orderId);
            if (!order) {
                showToast('Ordem nao encontrada.', 'error');
                return;
            }

            const toEmail = order.clientEmail || '';
            const subject = encodeURIComponent(`TechFix - Ordem de Servico #${order.osNumber || order.id}`);
            const body = encodeURIComponent(
                `Ola ${order.clientName || ''},

` +
                `Seguem os dados da sua Ordem de Servico:

` +
                `Numero da OS: #${order.osNumber || order.id}
` +
                `Equipamento: ${order.equipType || ''} ${order.brand || ''} ${order.model || ''}
` +
                `Defeito: ${order.defect || ''}
` +
                `Status: ${getStatusLabel(order.status)}
` +
                `Valor: ${formatCurrency(order.value || 0)}
` +
                `Prazo: ${formatDate(order.deadline)}

` +
                `Atenciosamente,
TechFix - Assistencia Tecnica`
            );

            window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
            showToast('Cliente de e-mail aberto com dados da OS!', 'success');

        } catch (error) {
            showToast('Erro ao enviar e-mail: ' + error.message, 'error');
        }
    }

// ==========================================================
    // 10. INICIALIZACAO DA APP APOS LOGIN
    // ==========================================================

    /**
     * Mostra a aplicacao principal apos o login bem-sucedido
     * @param {object} user - Dados do usuario logado
     */
    function showApp(user) {
        // Esconde a pagina de login e mostra a app
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appPage').style.display = 'flex';

        // Atualiza informacoes do usuario na sidebar
        const role = user.role || user.funcao || 'atendente';
        document.getElementById('sidebarAvatar').textContent = (user.name || 'U').charAt(0).toUpperCase();
        document.getElementById('sidebarUserName').textContent = user.name || 'Usuario';
        document.getElementById('sidebarUserRole').textContent = getRoleLabel(role);

        // Mostra/oculta menu de usuarios conforme a funcao
        const navUsers = document.getElementById('navUsers');
        if (navUsers) {
            navUsers.style.display = TechFixAuth.canManageUsers() ? '' : 'none';
        }

        // Atualiza data no header
        document.getElementById('currentDate').textContent =
            new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Configura os event listeners da app (apenas uma vez)
        setupEventListeners();
        // Configura os listeners de login (se ainda nao foram)
        setupLoginListeners();

        // Carrega o dashboard
        navigateTo('dashboard');
    }


    // ==========================================================
    // EXPORTACAO DO MODULO
    // ==========================================================
    return {
        showApp,
        setupLoginListeners,
        navigateTo,
        showToast,
        formatDate,
        formatCurrency,
        formatPhone,
        getStatusLabel,
        getStatusBadgeClass,
        getRoleLabel,
        getEquipIcon,
        getEquipIconColor,
        openModal,
        closeModal,
        loadDashboard,
        loadOrders,
        loadOrderForm,
        loadClients,
        loadUsers,
        viewOrder,
        saveOrder,
        deleteOrder,
        openClientModal,
        saveClient,
        deleteClient,
        openUserModal,
        saveUser,
        deleteUser,
        generateOrderPDF,
        sendWhatsApp,
        sendEmail
    };

})();

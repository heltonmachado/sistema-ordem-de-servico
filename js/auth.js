/**
 * ============================================================
 * TechFix - Modulo de Autenticacao
 * ============================================================
 * Descricao: Gerencia login, registro, sessao do usuario
 *            e controle de permissoes por funcao (role).
 *            Utiliza TechFixAPI para comunicacao com o backend.
 * ============================================================
 */

const TechFixAuth = (function() {
    'use strict';

    // ==========================================================
    // ESTADO INTERNO
    // Guarda o usuario logado e a sessao atual
    // ==========================================================
    let currentUser = null;

    // Chave para sessao no localStorage (fallback)
    const SESSION_KEY = 'techfix_session';

    // ==========================================================
    // GERENCIAMENTO DE SESSAO
    // Salva/carrega dados do usuario logado
    // ==========================================================

    /**
     * Salva a sessao do usuario no localStorage (fallback)
     * @param {object} user - Dados do usuario logado
     */
    function setSession(user) {
        currentUser = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    /**
     * Recupera a sessao salva no localStorage
     * @returns {object|null} Dados do usuario ou null
     */
    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch {
            return null;
        }
    }

    /**
     * Remove a sessao (logout)
     */
    function clearSession() {
        currentUser = null;
        localStorage.removeItem(SESSION_KEY);
        TechFixAPI.removeToken();
    }

    /**
     * Retorna o usuario atualmente logado
     * @returns {object|null} Usuario logado ou null
     */
    function getCurrentUser() {
        return currentUser;
    }

    // ==========================================================
    // LOGIN
    // Autentica o usuario via API ou localStorage
    // ==========================================================

    /**
     * Realiza o login do usuario
     * @param {string} email - E-mail do usuario
     * @param {string} password - Senha do usuario
     * @returns {Promise<object>} Dados do usuario logado
     * @throws {Error} Se as credenciais forem invalidas
     */
    async function handleLogin(email, password) {
        try {
            const user = await TechFixAPI.login(email, password);
            setSession(user);
            return user;
        } catch (error) {
            throw new Error(error.message || 'E-mail ou senha invalidos, ou conta desativada.');
        }
    }

    // ==========================================================
    // REGISTRO
    // Cria nova conta de usuario
    // ==========================================================

    /**
     * Registra um novo usuario no sistema
     * @param {object} userData - Dados do novo usuario
     * @returns {Promise<object>} Usuario criado
     * @throws {Error} Se e-mail ja existe ou senha e curta
     */
    async function handleRegister(userData) {
        try {
            const user = await TechFixAPI.registerUser(userData);
            return user;
        } catch (error) {
            throw new Error(error.message || 'Erro ao criar conta.');
        }
    }

    // ==========================================================
    // RECUPERACAO DE SENHA
    // Permite recuperar a senha por e-mail ou WhatsApp
    // ==========================================================

    /**
     * Recupera senha por e-mail
     * @param {string} email - E-mail cadastrado do usuario
     * @returns {Promise<object>} Resultado com mensagem e senha temporaria
     */
    async function handlePasswordRecoveryByEmail(email) {
        if (!email || !email.trim()) {
            throw new Error('Informe o e-mail cadastrado.');
        }
        try {
            const result = await TechFixAPI.recoverPasswordByEmail(email.trim());
            return result;
        } catch (error) {
            throw new Error(error.message || 'Erro ao recuperar senha por e-mail.');
        }
    }

    /**
     * Recupera senha por WhatsApp
     * @param {string} phone - Numero de WhatsApp cadastrado
     * @returns {Promise<object>} Resultado com mensagem, senha temporaria e URL do WhatsApp
     */
    async function handlePasswordRecoveryByWhatsapp(phone) {
        if (!phone || !phone.trim()) {
            throw new Error('Informe o numero de WhatsApp cadastrado.');
        }
        try {
            const result = await TechFixAPI.recoverPasswordByWhatsapp(phone.trim());
            return result;
        } catch (error) {
            throw new Error(error.message || 'Erro ao recuperar senha por WhatsApp.');
        }
    }

    // ==========================================================
    // LOGOUT
    // Encerra a sessao do usuario
    // ==========================================================

    /**
     * Realiza o logout do usuario
     */
    function handleLogout() {
        clearSession();
        // Redireciona para a pagina de login
        document.getElementById('appPage').style.display = 'none';
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('loginForm').reset();
    }

    // ==========================================================
    // PERMISSOES
    // Verifica o nivel de acesso do usuario logado
    // ==========================================================

    /**
     * Verifica se o usuario atual e administrador
     * @returns {boolean}
     */
    function isAdmin() {
        return currentUser?.role === 'administrador' || currentUser?.funcao === 'administrador';
    }

    /**
     * Verifica se o usuario atual e gerente ou superior
     * @returns {boolean}
     */
    function isGerenteOrAbove() {
        const role = currentUser?.role || currentUser?.funcao;
        return role === 'gerente' || role === 'administrador';
    }

    /**
     * Verifica se o usuario pode gerenciar usuarios
     * Apenas gerentes e administradores podem
     * @returns {boolean}
     */
    function canManageUsers() {
        return isGerenteOrAbove();
    }

    /**
     * Verifica se o usuario pode excluir registros
     * Apenas administradores podem excluir
     * @returns {boolean}
     */
    function canDelete() {
        return isAdmin();
    }

    // ==========================================================
    // INICIALIZACAO PADRAO
    // Cria o admin padrao se nao existir (fallback)
    // ==========================================================

    /**
     * Inicializa dados padrao se o localStorage estiver vazio
     * (Usado apenas no modo fallback, sem backend)
     */
    function initDefaults() {
        // Verifica se o admin padrao existe
        let users = TechFixAPI.getData(TechFixAPI.DB_KEYS.users);

        // Se nao houver usuarios, cria o admin padrao
        if (!users.some(u => u.email === 'admin@techfix.com')) {
            // Remove usuarios antigos e recria
            users = users.filter(u => u.email !== 'admin@techfix.com');
            users.push({
                id: 1,
                name: 'Admin Sistema',
                email: 'admin@techfix.com',
                password: 'admin123',
                phone: '(11) 99999-0000',
                role: 'administrador',
                funcao: 'administrador',
                active: true,
                createdAt: new Date().toISOString()
            });
            // Usuarios de exemplo para cada cargo
            if (!users.some(u => u.email === 'gerente@techfix.com')) {
                users.push({
                    id: 2, name: 'Gerente Exemplo', email: 'gerente@techfix.com', password: 'gerente123',
                    phone: '(11) 98888-0000', role: 'gerente', funcao: 'gerente', active: true, createdAt: new Date().toISOString()
                });
            }
            if (!users.some(u => u.email === 'atendente@techfix.com')) {
                users.push({
                    id: 3, name: 'Atendente Exemplo', email: 'atendente@techfix.com', password: 'atende123',
                    phone: '(11) 97777-0000', role: 'atendente', funcao: 'atendente', active: true, createdAt: new Date().toISOString()
                });
            }
            if (!users.some(u => u.email === 'tecnico@techfix.com')) {
                users.push({
                    id: 4, name: 'Tecnico Exemplo', email: 'tecnico@techfix.com', password: 'tecnico123',
                    phone: '(11) 96666-0000', role: 'tecnico', funcao: 'tecnico', active: true, createdAt: new Date().toISOString()
                });
            }
            TechFixAPI.setData(TechFixAPI.DB_KEYS.users, users);
        }

        // Dados de exemplo para clientes (se vazio)
        let clients = TechFixAPI.getData(TechFixAPI.DB_KEYS.clients);
        if (clients.length === 0) {
            const sampleClients = [
                { id: 1, name: 'Joao Silva', phone: '(11) 99999-1111', email: 'joao@email.com', doc: '123.456.789-00', address: 'Rua A, 123 - Sao Paulo', notes: '' },
                { id: 2, name: 'Maria Santos', phone: '(11) 98888-2222', email: 'maria@email.com', doc: '987.654.321-00', address: 'Av B, 456 - Sao Paulo', notes: '' },
                { id: 3, name: 'Carlos Oliveira', phone: '(11) 97777-3333', email: 'carlos@email.com', doc: '456.789.123-00', address: 'Rua C, 789 - Sao Paulo', notes: 'Cliente preferencial' }
            ];
            TechFixAPI.setData(TechFixAPI.DB_KEYS.clients, sampleClients);
        }

        // Dados de exemplo para ordens (se vazio)
        let orders = TechFixAPI.getData(TechFixAPI.DB_KEYS.orders);
        if (orders.length === 0) {
            const sampleOrders = [
                {
                    id: 1, osNumber: 1001, clientId: 1, clientName: 'Joao Silva', clientPhone: '(11) 99999-1111',
                    equipType: 'Celular', brand: 'Samsung', model: 'Galaxy S23', serial: 'IMEI3529...',
                    defect: 'Tela trincada apos queda. Touch nao funciona na regiao superior.', notes: 'Necessaria troca de display completo.',
                    status: 'reparo', techId: '', techName: '', parts: 'Display Galaxy S23',
                    value: 450.00, deadline: '2026-09-15', approved: true,
                    createdAt: '2026-09-01', updatedAt: '2026-09-05'
                },
                {
                    id: 2, osNumber: 1002, clientId: 2, clientName: 'Maria Santos', clientPhone: '(11) 98888-2222',
                    equipType: 'Notebook', brand: 'Apple', model: 'MacBook Air M2', serial: 'C02...',
                    defect: 'Nao liga. Sem sinal de video. Carregador OK.', notes: 'Possivel problema na placa logica. Em analise.',
                    status: 'analise', techId: '', techName: '', parts: '',
                    value: 0, deadline: '2026-09-12', approved: false,
                    createdAt: '2026-09-03', updatedAt: '2026-09-03'
                },
                {
                    id: 3, osNumber: 1003, clientId: 3, clientName: 'Carlos Oliveira', clientPhone: '(11) 97777-3333',
                    equipType: 'Bateria JBL/BMS', brand: 'JBL', model: 'Charge 5', serial: '',
                    defect: 'Caixa nao carrega. Bateria de lithium com BMS inoperante.', notes: 'BMS com componente queimado. Peca solicitada ao fornecedor.',
                    status: 'aguardando', techId: '', techName: '', parts: 'BMS JBL Charge 5',
                    value: 280.00, deadline: '2026-09-20', approved: true,
                    createdAt: '2026-09-04', updatedAt: '2026-09-06'
                },
                {
                    id: 4, osNumber: 1004, clientId: 1, clientName: 'Joao Silva', clientPhone: '(11) 99999-1111',
                    equipType: 'Microondas', brand: 'LG', model: 'MS3042', serial: '',
                    defect: 'Nao aquece. Prato gira mas sem micro-ondas.', notes: 'Magnetron queimado. Substituido e testado OK.',
                    status: 'concluido', techId: '', techName: '', parts: 'Magnetron LG',
                    value: 320.00, deadline: '2026-09-08', approved: true,
                    createdAt: '2026-09-02', updatedAt: '2026-09-07'
                },
                {
                    id: 5, osNumber: 1005, clientId: 2, clientName: 'Maria Santos', clientPhone: '(11) 98888-2222',
                    equipType: 'Tablet', brand: 'Apple', model: 'iPad 9th Gen', serial: '',
                    defect: 'Bateria nao segura carga. Descarrega em 30 min.', notes: 'Nao e economico reparar. Pecas indisponiveis.',
                    status: 'nao_consertado', techId: '', techName: '', parts: 'Bateria iPad (indisponivel)',
                    value: 0, deadline: '', approved: false,
                    createdAt: '2026-09-05', updatedAt: '2026-09-07'
                },
                {
                    id: 6, osNumber: 1006, clientId: 3, clientName: 'Carlos Oliveira', clientPhone: '(11) 97777-3333',
                    equipType: 'Equipamento de Som', brand: 'Sony', model: 'SRS-XB33', serial: '',
                    defect: 'Sem audio no canal esquerdo. Bluetooth funciona mas falha no alto-falante.',
                    notes: 'Alto-falante esquerdo com bobina queimada.',
                    status: 'concluido', techId: '', techName: '', parts: 'Speaker Sony XB33',
                    value: 190.00, deadline: '2026-09-09', approved: true,
                    createdAt: '2026-09-04', updatedAt: '2026-09-08'
                }
            ];
            TechFixAPI.setData(TechFixAPI.DB_KEYS.orders, sampleOrders);
        }
    }

    // ==========================================================
    // EXPORTACAO DO MODULO
    // ==========================================================
    return {
        handleLogin,
        handleRegister,
        handlePasswordRecoveryByEmail,
        handlePasswordRecoveryByWhatsapp,
        handleLogout,
        getCurrentUser,
        setSession,
        getSession,
        clearSession,
        initDefaults,
        isAdmin,
        isGerenteOrAbove,
        canManageUsers,
        canDelete
    };

})();

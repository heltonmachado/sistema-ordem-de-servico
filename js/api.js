/**
 * ============================================================
 * TechFix - Camada de Comunicacao com a API (Backend)
 * ============================================================
 * Descricao: Modulo responsavel por toda comunicacao com o
 *            servidor Node.js/Express. Substitui o localStorage
 *            por chamadas HTTP para o PostgreSQL.
 *
 * Modo offline: Se o backend nao estiver disponivel,
 *              funciona com localStorage automaticamente.
 * ============================================================
 */

const TechFixAPI = (function() {
    'use strict';

    // ==========================================================
    // CONFIGURACAO
    // URL base da API do backend (ajustar conforme o servidor)
    // ==========================================================
    const API_BASE_URL = 'http://localhost:3000/api';

    // Chave para salvar o token JWT no localStorage
    const TOKEN_KEY = 'techfix_token';

    // Flag para indicar se esta usando API ou localStorage
    let useAPI = true;

    // ==========================================================
    // HELPERS INTERNOS
    // Funcoes auxiliares para requisicoes HTTP
    // ==========================================================

    /**
     * Obtem o token JWT salvo no localStorage
     * @returns {string|null} Token JWT ou null
     */
    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Salva o token JWT no localStorage
     * @param {string} token - Token JWT recebido do login
     */
    function setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    /**
     * Remove o token JWT (logout)
     */
    function removeToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    /**
     * Realiza uma requisicao HTTP para a API
     * @param {string} endpoint - Caminho apos /api/ (ex: 'ordens')
     * @param {object} options - Opcoes do fetch (method, body, etc.)
     * @returns {Promise<object>} Resposta JSON da API
     * @throws {Error} Se a requisicao falhar
     */
    async function request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        // Headers padrao
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Adiciona o token JWT de autenticacao
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            // Se a resposta nao for OK, lanca erro
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            // Se falhar a conexao com a API, tenta modo localStorage
            console.warn(`API indisponivel (${endpoint}), usando localStorage:`, error.message);
            useAPI = false;
            throw error;
        }
    }

    // ==========================================================
    // FALLBACK: LOCAL STORAGE
    // Funcoes de fallback quando o backend nao esta disponivel
    // ==========================================================

    const DB_KEYS = {
        users: 'techfix_users',
        clients: 'techfix_clients',
        orders: 'techfix_orders',
        session: 'techfix_session',
        counter: 'techfix_counter'
    };

    /**
     * Obtem dados do localStorage
     * @param {string} key - Chave do localStorage
     * @returns {Array} Array de objetos ou array vazio
     */
    function getData(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch { return []; }
    }

    /**
     * Salva dados no localStorage
     * @param {string} key - Chave do localStorage
     * @param {Array} data - Dados a salvar
     */
    function setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    /**
     * Gera proximo ID sequencial (localStorage)
     * @param {string} key - Nome da entidade
     * @returns {number} Proximo ID disponivel
     */
    function getNextId(key) {
        let counters = JSON.parse(localStorage.getItem(DB_KEYS.counter)) || {};
        counters[key] = (counters[key] || 0) + 1;
        localStorage.setItem(DB_KEYS.counter, JSON.stringify(counters));
        return counters[key];
    }

    /**
     * Gera proximo numero de OS (localStorage)
     * @returns {number} Proximo numero de OS
     */
    function getNextOS() {
        let counters = JSON.parse(localStorage.getItem(DB_KEYS.counter)) || {};
        counters.os = (counters.os || 1000) + 1;
        localStorage.setItem(DB_KEYS.counter, JSON.stringify(counters));
        return counters.os;
    }

    // ==========================================================
    // API PUBLICA - USUARIOS
    // CRUD de usuarios (comunicacao com PostgreSQL via API)
    // ==========================================================

    /**
     * Login do usuario
     * Tenta API primeiro, fallback para localStorage
     * @param {string} email - E-mail do usuario
     * @param {string} password - Senha do usuario
     * @returns {Promise<object>} Dados do usuario logado
     */
    async function login(email, password) {
        try {
            // Tenta login via API (backend valida com bcrypt)
            const response = await request('/auth/login', {
                method: 'POST',
                body: { email, password }
            });
            setToken(response.token);
            return response.user;
        } catch {
            // Fallback: login via localStorage
            const users = getData(DB_KEYS.users);
            const user = users.find(u => u.email === email && u.password === password && u.active);
            if (!user) throw new Error('E-mail ou senha invalidos.');
            return user;
        }
    }

    /**
     * Registro de novo usuario
     * @param {object} userData - Dados do novo usuario
     * @returns {Promise<object>} Usuario criado
     */
    async function registerUser(userData) {
        try {
            const response = await request('/auth/register', {
                method: 'POST',
                body: userData
            });
            return response.user;
        } catch {
            // Fallback localStorage
            const users = getData(DB_KEYS.users);
            if (users.find(u => u.email === userData.email)) {
                throw new Error('E-mail ja cadastrado.');
            }
            userData.id = getNextId('users');
            userData.createdAt = new Date().toISOString();
            users.push(userData);
            setData(DB_KEYS.users, users);
            return userData;
        }
    }

    /**
     * Recuperar senha por e-mail
     * Gera nova senha temporaria e envia por e-mail (API) ou retorna ao fallback
     * @param {string} email - E-mail cadastrado do usuario
     * @returns {Promise<object>} Resultado da operacao
     */
    async function recoverPasswordByEmail(email) {
        try {
            const response = await request('/auth/recover-email', {
                method: 'POST',
                body: { email }
            });
            return response;
        } catch {
            // Fallback localStorage
            const users = getData(DB_KEYS.users);
            const user = users.find(u => u.email === email && u.active);
            if (!user) throw new Error('E-mail nao encontrado no sistema.');

            // Gerar senha temporaria
            const tempPassword = 'TF' + Math.random().toString(36).substring(2, 8);
            user.password = tempPassword;
            setData(DB_KEYS.users, users);

            return {
                success: true,
                message: `Sua nova senha foi enviada para o e-mail ${email}.`,
                tempPassword,
                method: 'email'
            };
        }
    }

    /**
     * Recuperar senha por WhatsApp
     * Gera nova senha temporaria e abre WhatsApp com mensagem pre-formatada
     * @param {string} phone - Numero de WhatsApp cadastrado
     * @returns {Promise<object>} Resultado da operacao
     */
    async function recoverPasswordByWhatsapp(phone) {
        try {
            const response = await request('/auth/recover-whatsapp', {
                method: 'POST',
                body: { phone }
            });
            return response;
        } catch {
            // Fallback localStorage
            const cleanPhone = phone.replace(/\D/g, '');
            const users = getData(DB_KEYS.users);
            // Buscar usuario por telefone (remover mascara para comparar)
            const user = users.find(u => {
                const uPhone = (u.phone || u.clientPhone || '').replace(/\D/g, '');
                return uPhone === cleanPhone && u.active;
            });
            if (!user) throw new Error('WhatsApp nao encontrado no sistema.');

            // Gerar senha temporaria
            const tempPassword = 'TF' + Math.random().toString(36).substring(2, 8);
            user.password = tempPassword;
            setData(DB_KEYS.users, users);

            // Montar mensagem WhatsApp
            const whatsappMessage = encodeURIComponent(
                `*TechFix - Recuperacao de Senha*\n\n` +
                `Ola, ${user.name || user.email}!\n\n` +
                `Sua nova senha temporaria e: *${tempPassword}*\n\n` +
                `Recomendamos alterar a senha apos o login.\n` +
                `_Mensagem automatica do TechFix_
`
            );
            const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${whatsappMessage}`;

            return {
                success: true,
                message: `Sera aberto o WhatsApp para enviar a nova senha.`,
                tempPassword,
                whatsappUrl,
                method: 'whatsapp'
            };
        }
    }

    /**
     * Lista todos os usuarios
     * @param {object} filters - Filtros (busca, funcao, etc.)
     * @returns {Promise<Array>} Lista de usuarios
     */
    async function getUsers(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            return await request(`/usuarios?${params}`);
        } catch {
            return getData(DB_KEYS.users);
        }
    }

    /**
     * Obtem um usuario por ID
     * @param {number} id - ID do usuario
     * @returns {Promise<object>} Dados do usuario
     */
    async function getUserById(id) {
        try {
            return await request(`/usuarios/${id}`);
        } catch {
            const users = getData(DB_KEYS.users);
            return users.find(u => u.id === id) || null;
        }
    }

    /**
     * Cria ou atualiza um usuario
     * @param {object} userData - Dados do usuario
     * @param {number|null} id - ID para atualizar (null = criar)
     * @returns {Promise<object>} Usuario salvo
     */
    async function saveUser(userData, id = null) {
        try {
            if (id) {
                return await request(`/usuarios/${id}`, { method: 'PUT', body: userData });
            } else {
                return await request('/usuarios', { method: 'POST', body: userData });
            }
        } catch {
            // Fallback localStorage
            let users = getData(DB_KEYS.users);
            if (id) {
                const idx = users.findIndex(u => u.id === parseInt(id));
                if (idx > -1) users[idx] = { ...users[idx], ...userData };
            } else {
                userData.id = getNextId('users');
                userData.createdAt = new Date().toISOString();
                users.push(userData);
            }
            setData(DB_KEYS.users, users);
            return userData;
        }
    }

    /**
     * Exclui um usuario
     * @param {number} id - ID do usuario
     * @returns {Promise<void>}
     */
    async function deleteUser(id) {
        try {
            return await request(`/usuarios/${id}`, { method: 'DELETE' });
        } catch {
            let users = getData(DB_KEYS.users);
            users = users.filter(u => u.id !== id);
            setData(DB_KEYS.users, users);
        }
    }

    // ==========================================================
    // API PUBLICA - CLIENTES
    // CRUD de clientes
    // ==========================================================

    /**
     * Lista todos os clientes
     * @param {object} filters - Filtros (busca, nome, etc.)
     * @returns {Promise<Array>} Lista de clientes
     */
    async function getClients(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            return await request(`/clientes?${params}`);
        } catch {
            return getData(DB_KEYS.clients);
        }
    }

    /**
     * Obtem um cliente por ID
     * @param {number} id - ID do cliente
     * @returns {Promise<object>} Dados do cliente
     */
    async function getClientById(id) {
        try {
            return await request(`/clientes/${id}`);
        } catch {
            const clients = getData(DB_KEYS.clients);
            return clients.find(c => c.id === id) || null;
        }
    }

    /**
     * Cria ou atualiza um cliente
     * @param {object} clientData - Dados do cliente
     * @param {number|null} id - ID para atualizar (null = criar)
     * @returns {Promise<object>} Cliente salvo
     */
    async function saveClient(clientData, id = null) {
        try {
            if (id) {
                return await request(`/clientes/${id}`, { method: 'PUT', body: clientData });
            } else {
                return await request('/clientes', { method: 'POST', body: clientData });
            }
        } catch {
            // Fallback localStorage
            let clients = getData(DB_KEYS.clients);
            if (id) {
                const idx = clients.findIndex(c => c.id === parseInt(id));
                if (idx > -1) clients[idx] = { ...clients[idx], ...clientData };
            } else {
                clientData.id = getNextId('clients');
                clients.push(clientData);
            }
            setData(DB_KEYS.clients, clients);
            return clientData;
        }
    }

    /**
     * Exclui um cliente
     * @param {number} id - ID do cliente
     * @returns {Promise<void>}
     */
    async function deleteClient(id) {
        try {
            return await request(`/clientes/${id}`, { method: 'DELETE' });
        } catch {
            let clients = getData(DB_KEYS.clients);
            clients = clients.filter(c => c.id !== id);
            setData(DB_KEYS.clients, clients);
        }
    }

    // ==========================================================
    // API PUBLICA - ORDENS DE SERVICO
    // CRUD de ordens de servico
    // ==========================================================

    /**
     * Lista todas as ordens de servico
     * @param {object} filters - Filtros (busca, status, etc.)
     * @returns {Promise<Array>} Lista de ordens
     */
    async function getOrders(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            return await request(`/ordens?${params}`);
        } catch {
            return getData(DB_KEYS.orders);
        }
    }

    /**
     * Obtem uma ordem por ID
     * @param {number} id - ID da ordem
     * @returns {Promise<object>} Dados da ordem
     */
    async function getOrderById(id) {
        try {
            return await request(`/ordens/${id}`);
        } catch {
            const orders = getData(DB_KEYS.orders);
            return orders.find(o => o.id === id) || null;
        }
    }

    /**
     * Cria ou atualiza uma ordem de servico
     * @param {object} orderData - Dados da OS
     * @param {number|null} id - ID para atualizar (null = criar)
     * @returns {Promise<object>} OS salva
     */
    async function saveOrder(orderData, id = null) {
        try {
            if (id) {
                return await request(`/ordens/${id}`, { method: 'PUT', body: orderData });
            } else {
                return await request('/ordens', { method: 'POST', body: orderData });
            }
        } catch {
            // Fallback localStorage
            let orders = getData(DB_KEYS.orders);
            if (id) {
                const idx = orders.findIndex(o => o.id === parseInt(id));
                if (idx > -1) orders[idx] = { ...orders[idx], ...orderData };
            } else {
                orderData.id = getNextId('orders');
                orderData.osNumber = getNextOS();
                orderData.createdAt = new Date().toISOString().split('T')[0];
                orders.push(orderData);
            }
            setData(DB_KEYS.orders, orders);
            return orderData;
        }
    }

    /**
     * Exclui uma ordem de servico
     * @param {number} id - ID da ordem
     * @returns {Promise<void>}
     */
    async function deleteOrder(id) {
        try {
            return await request(`/ordens/${id}`, { method: 'DELETE' });
        } catch {
            let orders = getData(DB_KEYS.orders);
            orders = orders.filter(o => o.id !== id);
            setData(DB_KEYS.orders, orders);
        }
    }

    /**
     * Obtem estatisticas do dashboard
     * @returns {Promise<object>} Dados agregados para o dashboard
     */
    async function getDashboardStats() {
        try {
            return await request('/dashboard/stats');
        } catch {
            // Fallback: calcula localmente
            const orders = getData(DB_KEYS.orders);
            return {
                total: orders.length,
                em_analise: orders.filter(o => o.status === 'analise').length,
                aguardando_peca: orders.filter(o => o.status === 'aguardando').length,
                em_reparo: orders.filter(o => o.status === 'reparo').length,
                concluidos: orders.filter(o => o.status === 'concluido').length,
                nao_consertados: orders.filter(o => o.status === 'nao_consertado').length,
                entregues: orders.filter(o => o.status === 'entregue').length,
                valor_total: orders.reduce((sum, o) => sum + (o.value || 0), 0)
            };
        }
    }

    // ==========================================================
    // API PUBLICA - HISTORICO DE STATUS
    // ==========================================================

    /**
     * Obtem o historico de status de uma OS
     * @param {number} osId - ID da ordem de servico
     * @returns {Promise<Array>} Historico de mudancas de status
     */
    async function getStatusHistory(osId) {
        try {
            return await request(`/ordens/${osId}/historico`);
        } catch {
            return []; // Sem fallback para historico
        }
    }

    // ==========================================================
    // EXPORTACAO DO MODULO
    // Expoe as funcoes publicas para os outros arquivos JS
    // ==========================================================
    return {
        // Autenticacao
        login,
        registerUser,
        recoverPasswordByEmail,
        recoverPasswordByWhatsapp,
        removeToken,
        getToken,

        // Usuarios
        getUsers,
        getUserById,
        saveUser,
        deleteUser,

        // Clientes
        getClients,
        getClientById,
        saveClient,
        deleteClient,

        // Ordens de Servico
        getOrders,
        getOrderById,
        saveOrder,
        deleteOrder,

        // Dashboard
        getDashboardStats,

        // Historico
        getStatusHistory,

        // Fallback (localStorage) - usado quando API esta off
        DB_KEYS,
        getData,
        setData,
        getNextId,
        getNextOS
    };

})();

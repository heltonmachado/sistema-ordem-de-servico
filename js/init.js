/**
 * ============================================================
 * TechFix - Ponto de Entrada (Inicializacao)
 * ============================================================
 * Descricao: Este arquivo e carregado por ultimo e e responsavel
 *            por inicializar o sistema. Verifica se ha sessao
 *            salva, configura dados padrao e define a data
 *            atual no header.
 *
 * Ordem de carregamento dos scripts:
 *   1. api.js    - Camada de comunicacao com o backend
 *   2. auth.js   - Autenticacao e sessao
 *   3. app.js    - Aplicacao principal (CRUD, dashboard, etc.)
 *   4. init.js   - Ponto de entrada (este arquivo)
 * ============================================================
 */

(function() {
    'use strict';

    /**
     * Inicializa o sistema ao carregar a pagina
     * - Verifica sessao existente
     * - Carrega dados padrao (fallback localStorage)
     * - Define a data atual no header
     */
    async function init() {
        console.log('[TechFix] Inicializando sistema...');

        // ----------------------------------------------------------
        // 1. Configura dados padrao (modo fallback localStorage)
        //    Se nao houver backend, garante que o admin padrao,
        //    clientes e ordens de exemplo estejam disponiveis.
        // ----------------------------------------------------------
        TechFixAuth.initDefaults();

        // ----------------------------------------------------------
        // 2. Verifica se ja existe uma sessao salva
        //    Se sim, entra direto na app sem mostrar o login
        // ----------------------------------------------------------
        const savedSession = TechFixAuth.getSession();

        if (savedSession) {
            try {
                // Tenta validar a sessao no backend via token JWT
                const token = TechFixAPI.getToken();
                if (token) {
                    // Sessao valida: mostra a app diretamente
                    TechFixApp.showApp(savedSession);
                    console.log('[TechFix] Sessao restaurada:', savedSession.email);
                    return;
                }
            } catch {
                // Token invalido: continua para a tela de login
            }

            // Modo fallback: aceita a sessao do localStorage
            TechFixApp.showApp(savedSession);
            console.log('[TechFix] Sessao restaurada (fallback):', savedSession.email);
            return;
        }

        // ----------------------------------------------------------
        // 3. Sem sessao: mostra a tela de login
        //    Configura os listeners de login/registro ANTES de
        //    showApp(), para que as abas funcionem imediatamente.
        // ----------------------------------------------------------
        TechFixApp.setupLoginListeners();
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appPage').style.display = 'none';
        console.log('[TechFix] Tela de login exibida.');
    }

    // ----------------------------------------------------------
    // Executa a inicializacao quando o DOM estiver pronto
    // ----------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

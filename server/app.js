/**
 * ============================================================
 * TechFix - Servidor Node.js + Express
 * ============================================================
 * Descricao: Ponto de entrada do backend. Configura o servidor
 *            Express, middlewares (CORS, JSON), rotas da API
 *            e tratamento de erros.
 *
 * Rotas disponiveis:
 *   POST   /api/auth/login        - Login do usuario
 *   POST   /api/auth/register     - Registro de novo usuario
 *   GET    /api/usuarios          - Listar usuarios
 *   GET    /api/usuarios/:id      - Obter usuario por ID
 *   POST   /api/usuarios          - Criar usuario
 *   PUT    /api/usuarios/:id      - Atualizar usuario
 *   DELETE /api/usuarios/:id      - Excluir usuario
 *   GET    /api/clientes          - Listar clientes
 *   GET    /api/clientes/:id      - Obter cliente por ID
 *   POST   /api/clientes          - Criar cliente
 *   PUT    /api/clientes/:id      - Atualizar cliente
 *   DELETE /api/clientes/:id      - Excluir cliente
 *   GET    /api/ordens            - Listar ordens de servico
 *   GET    /api/ordens/:id        - Obter ordem por ID
 *   POST   /api/ordens            - Criar ordem
 *   PUT    /api/ordens/:id        - Atualizar ordem
 *   DELETE /api/ordens/:id        - Excluir ordem
 *   GET    /api/ordens/:id/historico - Historico de status
 *   GET    /api/dashboard/stats   - Estatisticas do dashboard
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importa a conexao com o banco
const { testConnection } = require('./db');

// Importa as rotas
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

// Cria a aplicacao Express
const app = express();

// ==========================================================
// MIDDLEWARES
// ==========================================================

// CORS: permite requisicoes do frontend (ajustar em producao)
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Em producao, restrinja ao dominio do frontend
    credentials: true
}));

// Parse de JSON no body das requisicoes
app.use(express.json({ limit: '10mb' }));

// Parse de URL-encoded
app.use(express.urlencoded({ extended: true }));

// Log de requisicoes (desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Serve arquivos estaticos do frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));


// ==========================================================
// ROTAS DA API
// ==========================================================

// Autenticacao (login, registro)
app.use('/api/auth', authRoutes);

// Usuarios (CRUD)
app.use('/api/usuarios', userRoutes);

// Clientes (CRUD)
app.use('/api/clientes', clientRoutes);

// Ordens de Servico (CRUD + historico)
app.use('/api/ordens', orderRoutes);

// Dashboard (estatisticas)
app.use('/api/dashboard', dashboardRoutes);


// ==========================================================
// ROTA RAIZ - Serve o index.html do frontend
// ==========================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// ==========================================================
// TRATAMENTO DE ERROS
// ==========================================================

// Middleware de erro 404 (rota nao encontrada)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Rota nao encontrada.'
    });
});

// Middleware de erro global (captura erros nao tratados)
app.use((err, req, res, next) => {
    console.error('[TechFix Server] Erro:', err.message);

    // Erro de validacao do PostgreSQL
    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'Registro duplicado. E-mail ou documento ja cadastrado.'
        });
    }

    // Erro de CHECK constraint
    if (err.code === '23514') {
        return res.status(400).json({
            success: false,
            message: 'Valor invalido para um dos campos. Verifique os dados enviados.'
        });
    }

    // Erro de FK (chave estrangeira)
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referencia invalida. O registro relacionado nao existe.'
        });
    }

    // Erro generico
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erro interno do servidor.'
    });
});


// ==========================================================
// INICIALIZACAO DO SERVIDOR
// ==========================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Testa a conexao com o banco antes de iniciar
        const dbOk = await testConnection();
        if (!dbOk) {
            console.warn('[TechFix Server] AVISO: Nao foi possivel conectar ao banco.');
            console.warn('[TechFix Server] O servidor iniciara, mas a API pode falhar.');
        }

        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`[TechFix Server] Servidor rodando na porta ${PORT}`);
            console.log(`[TechFix Server] Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`[TechFix Server] Frontend: http://localhost:${PORT}`);
            console.log(`[TechFix Server] API: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('[TechFix Server] Falha ao iniciar:', error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;

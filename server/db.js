/**
 * ============================================================
 * TechFix - Conexao com o Banco de Dados (PostgreSQL)
 * ============================================================
 * Descricao: Configura o pool de conexoes com o PostgreSQL
 *            usando a biblioteca 'pg'. As configuracoes vem
 *            de variaveis de ambiente (.env).
 *
 * Variaveis necessarias no .env:
 *   DB_HOST     - Host do PostgreSQL (default: localhost)
 *   DB_PORT     - Porta do PostgreSQL (default: 5432)
 *   DB_NAME     - Nome do banco (default: techfix_db)
 *   DB_USER     - Usuario do banco (default: postgres)
 *   DB_PASSWORD - Senha do banco
 *   DB_SSL      - Usar SSL? (default: false)
 * ============================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

// Configuracao do pool de conexoes
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'techfix_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,                     // Maximo de conexoes no pool
    idleTimeoutMillis: 30000,    // Tempo maximo de inatividade (30s)
    connectionTimeoutMillis: 5000 // Timeout de conexao (5s)
};

// Se estiver em producao (Heroku, AWS, etc.), habilita SSL
if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production') {
    poolConfig.ssl = { rejectUnauthorized: false };
}

// Cria o pool de conexoes
const pool = new Pool(poolConfig);

// Log de erros do pool (idle client)
pool.on('error', (err) => {
    console.error('[TechFix DB] Erro inesperado no pool:', err.message);
});

/**
 * Executa uma query SQL no banco de dados
 * @param {string} text - Query SQL com placeholders ($1, $2, ...)
 * @param {Array} params - Parametros da query
 * @returns {Promise<object>} Resultado da query
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`[TechFix DB] Query executada em ${duration}ms:`, text.substring(0, 80));
        return result;
    } catch (error) {
        console.error('[TechFix DB] Erro na query:', error.message);
        throw error;
    }
}

/**
 * Obtem um cliente do pool (para transacoes)
 * @returns {Promise<object>} Cliente PostgreSQL do pool
 */
async function getClient() {
    const client = await pool.connect();
    return client;
}

/**
 * Testa a conexao com o banco de dados
 * @returns {Promise<boolean>} true se conectado
 */
async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW() as now');
        console.log(`[TechFix DB] Conectado em: ${result.rows[0].now}`);
        return true;
    } catch (error) {
        console.error('[TechFix DB] Falha na conexao:', error.message);
        return false;
    }
}

module.exports = { pool, query, getClient, testConnection };

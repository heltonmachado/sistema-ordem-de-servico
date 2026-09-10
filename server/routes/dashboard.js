/**
 * ============================================================
 * TechFix - Rota do Dashboard
 * ============================================================
 * Descricao: Retorna as estatisticas agregadas para o
 *            painel principal do sistema.
 *
 * Endpoints:
 *   GET /api/dashboard/stats - Estatisticas gerais
 * ============================================================
 */

const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Requer autenticacao
router.use(authMiddleware);


// ==========================================================
// GET /api/dashboard/stats
// Retorna todas as estatisticas do dashboard:
//   - Contagem por status
//   - Total de OS
//   - Total de clientes
//   - Total de usuarios ativos
//   - Receita total (servicos concluidos)
//   - Ordens recentes
//   - Ordens por tipo de equipamento
// ==========================================================

router.get('/stats', async (req, res, next) => {
    try {

        // ---- Contagem de ordens por status ----
        const statusResult = await query(`
            SELECT status, COUNT(*)::int as count
            FROM ordens_servico
            GROUP BY status
        `);

        const statusCounts = {};
        statusResult.rows.forEach(row => {
            statusCounts[row.status] = row.count;
        });

        // ---- Total de ordens ----
        const totalResult = await query(
            'SELECT COUNT(*)::int as total FROM ordens_servico'
        );
        const totalOrders = totalResult.rows[0].total;

        // ---- Total de clientes ----
        const clientsResult = await query(
            'SELECT COUNT(*)::int as total FROM clientes'
        );
        const totalClients = clientsResult.rows[0].total;

        // ---- Total de usuarios ativos ----
        const usersResult = await query(
            'SELECT COUNT(*)::int as total FROM usuarios WHERE ativo = true'
        );
        const totalUsers = usersResult.rows[0].total;

        // ---- Receita total (servicos concluidos/entregues) ----
        const revenueResult = await query(`
            SELECT COALESCE(SUM(valor_servico), 0) as total
            FROM ordens_servico
            WHERE status IN ('concluido', 'entregue')
        `);
        const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;

        // ---- Ordens recentes (ultimas 10) ----
        const recentResult = await query(`
            SELECT o.id, o.numero_os, o.equipamento_tipo, o.marca, o.modelo,
                   o.defeito, o.status, o.criado_em,
                   c.nome as client_name, c.telefone as client_phone
            FROM ordens_servico o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            ORDER BY o.atualizado_em DESC NULLS LAST, o.criado_em DESC
            LIMIT 10
        `);

        const recentOrders = recentResult.rows.map(row => ({
            id: row.id,
            osNumber: row.numero_os,
            equipType: row.equipamento_tipo,
            brand: row.marca,
            model: row.modelo,
            defect: row.defeito,
            status: row.status,
            clientName: row.client_name,
            clientPhone: row.client_phone,
            createdAt: row.criado_em
        }));

        // ---- Ordens por tipo de equipamento ----
        const equipResult = await query(`
            SELECT equipamento_tipo as type, COUNT(*)::int as count
            FROM ordens_servico
            GROUP BY equipamento_tipo
            ORDER BY count DESC
        `);

        const equipCounts = {};
        equipResult.rows.forEach(row => {
            equipCounts[row.type] = row.count;
        });

        // ---- Monta a resposta ----
        res.json({
            statusCounts: {
                analise: statusCounts.analise || 0,
                aguardando: statusCounts.aguardando || 0,
                reparo: statusCounts.reparo || 0,
                concluido: statusCounts.concluido || 0,
                nao_consertado: statusCounts.nao_consertado || 0,
                entregue: statusCounts.entregue || 0
            },
            totalOrders,
            totalClients,
            totalUsers,
            totalRevenue,
            recentOrders,
            equipCounts
        });

    } catch (error) {
        next(error);
    }
});


module.exports = router;

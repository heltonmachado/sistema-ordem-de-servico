/**
 * ============================================================
 * TechFix - Rotas de Clientes
 * ============================================================
 * Descricao: CRUD completo de clientes. Todos os endpoints
 *            requerem autenticacao JWT.
 *
 * Endpoints:
 *   GET    /api/clientes         - Listar todos os clientes
 *   GET    /api/clientes/:id     - Obter cliente por ID
 *   POST   /api/clientes         - Criar novo cliente
 *   PUT    /api/clientes/:id     - Atualizar cliente
 *   DELETE /api/clientes/:id     - Excluir cliente (admin)
 * ============================================================
 */

const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Todas as rotas de clientes requerem autenticacao
router.use(authMiddleware);


// ==========================================================
// GET /api/clientes
// Lista todos os clientes com filtros opcionais
// Query params: busca, nome, telefone, email
// ==========================================================

router.get('/', async (req, res, next) => {
    try {
        const { busca, nome, telefone, email } = req.query;

        let sql = `
            SELECT c.*, 
                   COUNT(o.id) as order_count
            FROM clientes c
            LEFT JOIN ordens_servico o ON o.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filtro de busca geral (nome, telefone, email, cpf/cnpj)
        if (busca) {
            sql += ` AND (
                c.nome ILIKE $${paramIndex} OR
                c.telefone ILIKE $${paramIndex} OR
                c.email ILIKE $${paramIndex} OR
                c.cpf_cnpj ILIKE $${paramIndex}
            )`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        // Filtros especificos
        if (nome) {
            sql += ` AND c.nome ILIKE $${paramIndex}`;
            params.push(`%${nome}%`);
            paramIndex++;
        }
        if (telefone) {
            sql += ` AND c.telefone ILIKE $${paramIndex}`;
            params.push(`%${telefone}%`);
            paramIndex++;
        }
        if (email) {
            sql += ` AND c.email ILIKE $${paramIndex}`;
            params.push(`%${email}%`);
            paramIndex++;
        }

        sql += ` GROUP BY c.id ORDER BY c.nome ASC`;

        const result = await query(sql, params);

        // Mapeia para o formato esperado pelo frontend
        const clients = result.rows.map(row => ({
            id: row.id,
            name: row.nome,
            phone: row.telefone,
            email: row.email,
            doc: row.cpf_cnpj,
            address: row.endereco,
            notes: row.observacoes,
            orderCount: parseInt(row.order_count) || 0,
            createdAt: row.criado_em
        }));

        res.json(clients);

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// GET /api/clientes/:id
// Obtem um cliente especifico pelo ID
// ==========================================================

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT c.*, 
                    COUNT(o.id) as order_count
             FROM clientes c
             LEFT JOIN ordens_servico o ON o.cliente_id = c.id
             WHERE c.id = $1
             GROUP BY c.id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente nao encontrado.'
            });
        }

        const row = result.rows[0];

        res.json({
            id: row.id,
            name: row.nome,
            phone: row.telefone,
            email: row.email,
            doc: row.cpf_cnpj,
            address: row.endereco,
            notes: row.observacoes,
            orderCount: parseInt(row.order_count) || 0,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// POST /api/clientes
// Cria um novo cliente
// ==========================================================

router.post('/', async (req, res, next) => {
    try {
        const { name, phone, email, doc, address, notes } = req.body;

        // Validacao
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nome do cliente e obrigatorio.'
            });
        }

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Telefone do cliente e obrigatorio.'
            });
        }

        // Insere o cliente
        const result = await query(
            `INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco, observacoes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, phone, email || null, doc || null, address || null, notes || null]
        );

        const row = result.rows[0];

        res.status(201).json({
            id: row.id,
            name: row.nome,
            phone: row.telefone,
            email: row.email,
            doc: row.cpf_cnpj,
            address: row.endereco,
            notes: row.observacoes,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// PUT /api/clientes/:id
// Atualiza os dados de um cliente
// ==========================================================

router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email, doc, address, notes } = req.body;

        // Verifica se o cliente existe
        const existing = await query('SELECT id FROM clientes WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente nao encontrado.'
            });
        }

        // Atualiza os dados
        const result = await query(
            `UPDATE clientes SET
                nome = COALESCE($2, nome),
                telefone = COALESCE($3, telefone),
                email = COALESCE($4, email),
                cpf_cnpj = COALESCE($5, cpf_cnpj),
                endereco = COALESCE($6, endereco),
                observacoes = COALESCE($7, observacoes)
             WHERE id = $1
             RETURNING *`,
            [id, name || null, phone || null, email || null, doc || null, address || null, notes || null]
        );

        const row = result.rows[0];

        res.json({
            id: row.id,
            name: row.nome,
            phone: row.telefone,
            email: row.email,
            doc: row.cpf_cnpj,
            address: row.endereco,
            notes: row.observacoes,
            updatedAt: row.atualizado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// DELETE /api/clientes/:id
// Exclui um cliente (apenas administradores)
// ==========================================================

router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verifica permissao (apenas admin pode excluir)
        if (req.user.role !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem excluir clientes.'
            });
        }

        // Verifica se o cliente existe
        const existing = await query('SELECT id FROM clientes WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente nao encontrado.'
            });
        }

        // Verifica se ha ordens vinculadas
        const orders = await query(
            'SELECT COUNT(*) as count FROM ordens_servico WHERE cliente_id = $1',
            [id]
        );

        if (parseInt(orders.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cliente possui ordens de servico vinculadas e nao pode ser excluido.'
            });
        }

        // Exclui o cliente
        await query('DELETE FROM clientes WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Cliente excluido com sucesso.'
        });

    } catch (error) {
        next(error);
    }
});


module.exports = router;

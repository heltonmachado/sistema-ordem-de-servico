/**
 * ============================================================
 * TechFix - Rotas de Ordens de Servico
 * ============================================================
 * Descricao: CRUD completo de ordens de servico, incluindo
 *            historico de status. O trigger do PostgreSQL
 *            registra automaticamente as mudancas de status.
 *
 * Endpoints:
 *   GET    /api/ordens              - Listar ordens
 *   GET    /api/ordens/:id          - Obter ordem por ID
 *   POST   /api/ordens              - Criar nova ordem
 *   PUT    /api/ordens/:id          - Atualizar ordem
 *   DELETE /api/ordens/:id          - Excluir ordem (admin)
 *   GET    /api/ordens/:id/historico - Historico de status
 * ============================================================
 */

const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Todas as rotas de ordens requerem autenticacao
router.use(authMiddleware);


// ==========================================================
// GET /api/ordens
// Lista todas as ordens de servico com filtros
// Query params: busca, status, equip_type, client_id
// ==========================================================

router.get('/', async (req, res, next) => {
    try {
        const { busca, status, equip_type, client_id } = req.query;

        let sql = `
            SELECT o.*, c.nome as client_name, c.telefone as client_phone, c.email as client_email, c.cpf_cnpj as client_doc,
                   u.nome as tech_name
            FROM ordens_servico o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            LEFT JOIN usuarios u ON o.tecnico_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Filtro de busca geral
        if (busca) {
            sql += ` AND (
                c.nome ILIKE $${paramIndex} OR
                o.equipamento_tipo ILIKE $${paramIndex} OR
                o.marca ILIKE $${paramIndex} OR
                o.modelo ILIKE $${paramIndex} OR
                o.defeito ILIKE $${paramIndex} OR
                CAST(o.numero_os AS TEXT) ILIKE $${paramIndex}
            )`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        // Filtro de status
        if (status) {
            sql += ` AND o.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filtro de tipo de equipamento
        if (equip_type) {
            sql += ` AND o.equipamento_tipo = $${paramIndex}`;
            params.push(equip_type);
            paramIndex++;
        }

        // Filtro de cliente
        if (client_id) {
            sql += ` AND o.cliente_id = $${paramIndex}`;
            params.push(client_id);
            paramIndex++;
        }

        sql += ` ORDER BY o.atualizado_em DESC NULLS LAST, o.criado_em DESC`;

        const result = await query(sql, params);

        // Mapeia para o formato esperado pelo frontend
        const orders = result.rows.map(row => ({
            id: row.id,
            osNumber: row.numero_os,
            clientId: row.cliente_id,
            clientName: row.client_name,
            clientPhone: row.client_phone,
            clientEmail: row.client_email,
            clientDoc: row.client_doc,
            equipType: row.equipamento_tipo,
            brand: row.marca,
            model: row.modelo,
            serial: row.numero_serie,
            defect: row.defeito,
            notes: row.diagnostico,
            status: row.status,
            techId: row.tecnico_id,
            techName: row.tech_name,
            parts: row.pecas_necessarias,
            value: parseFloat(row.valor_servico) || 0,
            deadline: row.prazo_entrega,
            approved: row.aprovado_cliente,
            createdAt: row.criado_em,
            updatedAt: row.atualizado_em
        }));

        res.json(orders);

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// GET /api/ordens/:id
// Obtem uma ordem de servico pelo ID
// ==========================================================

router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT o.*, c.nome as client_name, c.telefone as client_phone, c.email as client_email, c.cpf_cnpj as client_doc,
                    u.nome as tech_name
             FROM ordens_servico o
             LEFT JOIN clientes c ON o.cliente_id = c.id
             LEFT JOIN usuarios u ON o.tecnico_id = u.id
             WHERE o.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordem de servico nao encontrada.'
            });
        }

        const row = result.rows[0];

        res.json({
            id: row.id,
            osNumber: row.numero_os,
            clientId: row.cliente_id,
            clientName: row.client_name,
            clientPhone: row.client_phone,
            clientEmail: row.client_email,
            clientDoc: row.client_doc,
            equipType: row.equipamento_tipo,
            brand: row.marca,
            model: row.modelo,
            serial: row.numero_serie,
            defect: row.defeito,
            notes: row.diagnostico,
            status: row.status,
            techId: row.tecnico_id,
            techName: row.tech_name,
            parts: row.pecas_necessarias,
            value: parseFloat(row.valor_servico) || 0,
            deadline: row.prazo_entrega,
            approved: row.aprovado_cliente,
            createdAt: row.criado_em,
            updatedAt: row.atualizado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// POST /api/ordens
// Cria uma nova ordem de servico
// O numero da OS e gerado automaticamente pela SEQUENCE
// ==========================================================

router.post('/', async (req, res, next) => {
    try {
        const { clientId, equipType, brand, model, serial, defect, notes,
                status, techId, parts, value, deadline, approved } = req.body;

        // Validacoes
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Cliente e obrigatorio.'
            });
        }
        if (!equipType) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de equipamento e obrigatorio.'
            });
        }
        if (!defect) {
            return res.status(400).json({
                success: false,
                message: 'Defeito e obrigatorio.'
            });
        }

        // Busca dados do cliente para a OS
        const clientResult = await query(
            'SELECT nome, telefone, email, cpf_cnpj FROM clientes WHERE id = $1',
            [clientId]
        );

        if (clientResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cliente nao encontrado.'
            });
        }

        const clientData = clientResult.rows[0];

        // Insere a ordem de servico
        const result = await query(
            `INSERT INTO ordens_servico (
                cliente_id, equipamento_tipo, marca, modelo, numero_serie,
                defeito, diagnostico, status, tecnico_id, pecas_necessarias,
                valor_servico, prazo_entrega, aprovado_cliente
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING *`,
            [
                clientId,
                equipType,
                brand || null,
                model || null,
                serial || null,
                defect,
                notes || null,
                status || 'analise',
                techId || null,
                parts || null,
                value || 0,
                deadline || null,
                approved || false
            ]
        );

        const row = result.rows[0];

        res.status(201).json({
            id: row.id,
            osNumber: row.numero_os,
            clientId: row.cliente_id,
            clientName: clientData.nome,
            clientPhone: clientData.telefone,
            clientEmail: clientData.email,
            clientDoc: clientData.cpf_cnpj,
            equipType: row.equipamento_tipo,
            brand: row.marca,
            model: row.modelo,
            serial: row.numero_serie,
            defect: row.defeito,
            notes: row.diagnostico,
            status: row.status,
            techId: row.tecnico_id,
            parts: row.pecas_necessarias,
            value: parseFloat(row.valor_servico) || 0,
            deadline: row.prazo_entrega,
            approved: row.aprovado_cliente,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// PUT /api/ordens/:id
// Atualiza uma ordem de servico
// O trigger 'registrar_historico_status' registra
// automaticamente mudancas de status no historico
// ==========================================================

router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            clientId, equipType, brand, model, serial, defect, notes,
            status, techId, parts, value, deadline, approved
        } = req.body;

        // Verifica se a ordem existe
        const existing = await query(
            'SELECT id, status, cliente_id FROM ordens_servico WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordem de servico nao encontrada.'
            });
        }

        // Busca dados do cliente se alterado
        let clientName = null;
        let clientPhone = null;
        let clientEmail = null;
        let clientDoc = null;
        if (clientId) {
            const clientResult = await query(
                'SELECT nome, telefone, email, cpf_cnpj FROM clientes WHERE id = $1',
                [clientId]
            );
            if (clientResult.rows.length > 0) {
                clientName = clientResult.rows[0].nome;
                clientPhone = clientResult.rows[0].telefone;
                clientEmail = clientResult.rows[0].email;
                clientDoc = clientResult.rows[0].cpf_cnpj;
            }
        }

        // Atualiza a ordem
        // Nota: o trigger registrar_historico_status detecta mudanca de status
        const result = await query(
            `UPDATE ordens_servico SET
                cliente_id = COALESCE($2, cliente_id),
                equipamento_tipo = COALESCE($3, equipamento_tipo),
                marca = COALESCE($4, marca),
                modelo = COALESCE($5, modelo),
                numero_serie = COALESCE($6, numero_serie),
                defeito = COALESCE($7, defeito),
                diagnostico = COALESCE($8, diagnostico),
                status = COALESCE($9, status),
                tecnico_id = COALESCE($10, tecnico_id),
                pecas_necessarias = COALESCE($11, pecas_necessarias),
                valor_servico = COALESCE($12, valor_servico),
                prazo_entrega = COALESCE($13, prazo_entrega),
                aprovado_cliente = COALESCE($14, aprovado_cliente)
            WHERE id = $1
            RETURNING *`,
            [
                id,
                clientId || null,
                equipType || null,
                brand || null,
                model || null,
                serial || null,
                defect || null,
                notes || null,
                status || null,
                techId || null,
                parts || null,
                value !== undefined ? value : null,
                deadline || null,
                approved !== undefined ? approved : null
            ]
        );

        const row = result.rows[0];

        res.json({
            id: row.id,
            osNumber: row.numero_os,
            clientId: row.cliente_id,
            clientName: clientName,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            clientDoc: clientDoc,
            equipType: row.equipamento_tipo,
            brand: row.marca,
            model: row.modelo,
            serial: row.numero_serie,
            defect: row.defeito,
            notes: row.diagnostico,
            status: row.status,
            techId: row.tecnico_id,
            parts: row.pecas_necessarias,
            value: parseFloat(row.valor_servico) || 0,
            deadline: row.prazo_entrega,
            approved: row.aprovado_cliente,
            updatedAt: row.atualizado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// DELETE /api/ordens/:id
// Exclui uma ordem de servico (apenas administradores)
// ==========================================================

router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verifica permissao
        if (req.user.role !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem excluir ordens de servico.'
            });
        }

        // Verifica se a ordem existe
        const existing = await query(
            'SELECT id FROM ordens_servico WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ordem de servico nao encontrada.'
            });
        }

        // Exclui o historico de status primeiro (FK)
        await query(
            'DELETE FROM historico_status_os WHERE ordem_id = $1',
            [id]
        );

        // Exclui a ordem
        await query(
            'DELETE FROM ordens_servico WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Ordem de servico excluida com sucesso.'
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// GET /api/ordens/:id/historico
// Retorna o historico de mudancas de status de uma OS
// ==========================================================

router.get('/:id/historico', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT h.*, u.nome as user_name
             FROM historico_status_os h
             LEFT JOIN usuarios u ON h.usuario_id = u.id
             WHERE h.ordem_id = $1
             ORDER BY h.criado_em ASC`,
            [id]
        );

        const history = result.rows.map(row => ({
            id: row.id,
            osId: row.ordem_id,
            status: row.status_anterior ? `${row.status_anterior} -> ${row.status_novo}` : row.status_novo,
            oldStatus: row.status_anterior,
            newStatus: row.status_novo,
            userName: row.user_name,
            changedAt: row.criado_em,
            createdAt: row.criado_em
        }));

        res.json(history);

    } catch (error) {
        next(error);
    }
});


module.exports = router;

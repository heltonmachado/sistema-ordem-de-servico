/**
 * ============================================================
 * TechFix - Rotas de Usuarios
 * ============================================================
 * Descricao: CRUD de usuarios do sistema. Apenas gerentes
 *            e administradores podem acessar estas rotas.
 *            Senhas sao hasheadas com bcrypt.
 *
 * Endpoints:
 *   GET    /api/usuarios         - Listar usuarios
 *   GET    /api/usuarios/:id     - Obter usuario por ID
 *   POST   /api/usuarios         - Criar usuario (gerente+)
 *   PUT    /api/usuarios/:id     - Atualizar usuario (gerente+)
 *   DELETE /api/usuarios/:id     - Excluir usuario (admin)
 * ============================================================
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Todas as rotas de usuarios requerem autenticacao
router.use(authMiddleware);

// SALT_ROUNDS para bcrypt
const SALT_ROUNDS = 10;


// ==========================================================
// MIDDLEWARE: Verificar permissao de gerenciamento
// Apenas gerentes e administradores podem acessar
// ==========================================================

function requireManagerOrAbove(req, res, next) {
    const role = req.user.role;
    if (role !== 'gerente' && role !== 'administrador') {
        return res.status(403).json({
            success: false,
            message: 'Voce nao tem permissao para gerenciar usuarios.'
        });
    }
    next();
}


// ==========================================================
// GET /api/usuarios
// Lista todos os usuarios com filtros opcionais
// Query params: busca, funcao
// ==========================================================

router.get('/', requireManagerOrAbove, async (req, res, next) => {
    try {
        const { busca, funcao } = req.query;

        let sql = 'SELECT id, nome, email, funcao, ativo, criado_em FROM usuarios WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Filtro de busca
        if (busca) {
            sql += ` AND (
                nome ILIKE $${paramIndex} OR
                email ILIKE $${paramIndex} OR
                funcao ILIKE $${paramIndex}
            )`;
            params.push(`%${busca}%`);
            paramIndex++;
        }

        // Filtro por funcao
        if (funcao) {
            sql += ` AND funcao = $${paramIndex}`;
            params.push(funcao);
            paramIndex++;
        }

        sql += ' ORDER BY nome ASC';

        const result = await query(sql, params);

        // Mapeia para o formato do frontend
        const users = result.rows.map(row => ({
            id: row.id,
            name: row.nome,
            email: row.email,
            role: row.funcao,
            funcao: row.funcao,
            active: row.ativo,
            createdAt: row.criado_em
        }));

        res.json(users);

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// GET /api/usuarios/:id
// Obtem um usuario especifico pelo ID
// ==========================================================

router.get('/:id', requireManagerOrAbove, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT id, nome, email, funcao, ativo, criado_em FROM usuarios WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario nao encontrado.'
            });
        }

        const row = result.rows[0];

        res.json({
            id: row.id,
            name: row.nome,
            email: row.email,
            role: row.funcao,
            funcao: row.funcao,
            active: row.ativo,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// POST /api/usuarios
// Cria um novo usuario no sistema
// ==========================================================

router.post('/', requireManagerOrAbove, async (req, res, next) => {
    try {
        const { name, email, password, role, active } = req.body;

        // Validacoes
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Nome e e-mail sao obrigatorios.'
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter no minimo 6 caracteres.'
            });
        }

        // Verifica se o e-mail ja existe
        const existing = await query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'E-mail ja cadastrado.'
            });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insere o usuario
        const result = await query(
            `INSERT INTO usuarios (nome, email, senha_hash, funcao, ativo)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, nome, email, funcao, ativo, criado_em`,
            [name.trim(), email.toLowerCase().trim(), senhaHash, role || 'atendente', active !== false]
        );

        const row = result.rows[0];

        res.status(201).json({
            id: row.id,
            name: row.nome,
            email: row.email,
            role: row.funcao,
            funcao: row.funcao,
            active: row.ativo,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// PUT /api/usuarios/:id
// Atualiza os dados de um usuario
// Senha so e atualizada se fornecida
// ==========================================================

router.put('/:id', requireManagerOrAbove, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, password, role, active } = req.body;

        // Verifica se o usuario existe
        const existing = await query(
            'SELECT id, email FROM usuarios WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario nao encontrado.'
            });
        }

        // Se esta alterando o e-mail, verifica se ja existe
        if (email && email.toLowerCase().trim() !== existing.rows[0].email) {
            const emailCheck = await query(
                'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
                [email.toLowerCase().trim(), id]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'E-mail ja cadastrado para outro usuario.'
                });
            }
        }

        // Atualiza os campos (senha apenas se fornecida)
        let sql, params;

        if (password && password.length >= 6) {
            // Com nova senha
            const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);
            sql = `
                UPDATE usuarios SET
                    nome = COALESCE($2, nome),
                    email = COALESCE($3, email),
                    senha_hash = $4,
                    funcao = COALESCE($5, funcao),
                    ativo = COALESCE($6, ativo)
                WHERE id = $1
                RETURNING id, nome, email, funcao, ativo, criado_em
            `;
            params = [id, name || null, email || null, senhaHash, role || null, active !== undefined ? active : null];
        } else {
            // Sem alterar a senha
            sql = `
                UPDATE usuarios SET
                    nome = COALESCE($2, nome),
                    email = COALESCE($3, email),
                    funcao = COALESCE($4, funcao),
                    ativo = COALESCE($5, ativo)
                WHERE id = $1
                RETURNING id, nome, email, funcao, ativo, criado_em
            `;
            params = [id, name || null, email || null, role || null, active !== undefined ? active : null];
        }

        const result = await query(sql, params);
        const row = result.rows[0];

        res.json({
            id: row.id,
            name: row.nome,
            email: row.email,
            role: row.funcao,
            funcao: row.funcao,
            active: row.ativo,
            createdAt: row.criado_em
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// DELETE /api/usuarios/:id
// Exclui um usuario (apenas administradores)
// Nao permite excluir a si mesmo
// ==========================================================

router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Apenas administradores
        if (req.user.role !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem excluir usuarios.'
            });
        }

        // Nao permite excluir a si mesmo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Voce nao pode excluir seu proprio usuario.'
            });
        }

        // Verifica se o usuario existe
        const existing = await query(
            'SELECT id FROM usuarios WHERE id = $1',
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario nao encontrado.'
            });
        }

        // Exclui as sessoes do usuario
        await query(
            'DELETE FROM sessoes WHERE usuario_id = $1',
            [id]
        );

        // Exclui o usuario
        await query(
            'DELETE FROM usuarios WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Usuario excluido com sucesso.'
        });

    } catch (error) {
        next(error);
    }
});


module.exports = router;

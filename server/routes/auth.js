/**
 * ============================================================
 * TechFix - Rotas de Autenticacao
 * ============================================================
 * Descricao: Endpoints para login, registro e verificacao
 *            de sessao. Usa bcrypt para hash de senhas e
 *            jsonwebtoken para geracao de JWT.
 *
 * Endpoints:
 *   POST /api/auth/login     - Autentica usuario e retorna JWT
 *   POST /api/auth/register  - Registra novo usuario
 *   GET  /api/auth/me        - Retorna dados do usuario logado
 *   POST /api/auth/logout    - Invalida sessao (opcional)
 * ============================================================
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

// Configuracoes do JWT
const JWT_SECRET = process.env.JWT_SECRET || 'techfix_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;


// ==========================================================
// MIDDLEWARE: Verificar token JWT
// Adiciona req.user com dados do usuario logado
// ==========================================================

/**
 * Middleware que verifica o token JWT no header Authorization
 * Se valido, adiciona req.user com { id, email, funcao }
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Token de autenticacao nao fornecido.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalido ou expirado.'
        });
    }
}


// ==========================================================
// POST /api/auth/login
// Autentica o usuario com e-mail e senha
// ==========================================================

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validacao basica
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-mail e senha sao obrigatorios.'
            });
        }

        // Busca o usuario pelo e-mail
        const result = await query(
            'SELECT id, nome, email, senha_hash, funcao, ativo FROM usuarios WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha invalidos.'
            });
        }

        const user = result.rows[0];

        // Verifica se o usuario esta ativo
        if (!user.ativo) {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada. Contate o administrador.'
            });
        }

        // Compara a senha com o hash (bcrypt)
        const passwordMatch = await bcrypt.compare(password, user.senha_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'E-mail ou senha invalidos.'
            });
        }

        // Gera o token JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.funcao,
                name: user.nome
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Registra a sessao no banco (tabela sessoes)
        await query(
            `INSERT INTO sessoes (usuario_id, token_hash, expira_em)
             VALUES ($1, $2, NOW() + INTERVAL '${parseInt(JWT_EXPIRES_IN) || 24} hours')
             ON CONFLICT (usuario_id) DO UPDATE SET token_hash = $2, expira_em = NOW() + INTERVAL '${parseInt(JWT_EXPIRES_IN) || 24} hours', criado_em = NOW()`,
            [user.id, token]
        );

        // Retorna o token e os dados do usuario (sem a senha!)
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.nome,
                email: user.email,
                role: user.funcao,
                funcao: user.funcao,
                active: user.ativo
            }
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// POST /api/auth/register
// Registra um novo usuario no sistema
// ==========================================================

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role = 'atendente' } = req.body;

        // Validacao
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nome, e-mail e senha sao obrigatorios.'
            });
        }

        if (password.length < 6) {
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

        // Hash da senha com bcrypt
        const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Insere o novo usuario
        const result = await query(
            `INSERT INTO usuarios (nome, email, senha_hash, funcao, ativo)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id, nome, email, funcao, ativo`,
            [name.trim(), email.toLowerCase().trim(), senhaHash, role]
        );

        const newUser = result.rows[0];

        res.status(201).json({
            success: true,
            user: {
                id: newUser.id,
                name: newUser.nome,
                email: newUser.email,
                role: newUser.funcao,
                funcao: newUser.funcao,
                active: newUser.ativo
            }
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================================
// GET /api/auth/me
// Retorna os dados do usuario logado (requer JWT)
// ==========================================================

router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const result = await query(
            'SELECT id, nome, email, funcao, ativo FROM usuarios WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario nao encontrado.'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.nome,
                email: user.email,
                role: user.funcao,
                funcao: user.funcao,
                active: user.ativo
            }
        });

    } catch (error) {
        next(error);
    }
});


// Exporta o router e o middleware de autenticacao
// (outros arquivos usam authMiddleware para proteger rotas)
module.exports = router;
module.exports.authMiddleware = authMiddleware;

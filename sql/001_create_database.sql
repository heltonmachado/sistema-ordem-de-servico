-- ============================================================
-- TechFix - Sistema de Ordem de Servico
-- Script de criacao do banco de dados PostgreSQL
-- ============================================================
-- Autor: TechFix
-- Data: 2026-09-09
-- Descricao: Cria o banco de dados e as tabelas necessarias
--              para o sistema de ordem de servico eletronico.
-- ============================================================

-- Criacao do banco de dados (executar como superusuario)
CREATE DATABASE techfix_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'pt_BR.UTF-8'
    LC_CTYPE = 'pt_BR.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Comentar a linha acima se o banco ja existir
-- Conectar ao banco: \c techfix_db

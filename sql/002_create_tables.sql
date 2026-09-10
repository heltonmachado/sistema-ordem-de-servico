-- ============================================================
-- TechFix - Sistema de Ordem de Servico
-- Script de criacao das tabelas
-- ============================================================
-- Banco: techfix_db
-- Descricao: Define todas as tabelas do sistema com suas
--             restricoes, indices e relacionamentos.
-- ============================================================

-- ============================================================
-- TABELA: usuarios
-- Descricao: Armazena os usuarios do sistema (atendentes,
--            tecnicos, gerentes e administradores)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL          PRIMARY KEY,
    nome          VARCHAR(150)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    senha_hash    VARCHAR(255)    NOT NULL,           -- Senha com hash bcrypt
    funcao        VARCHAR(30)     NOT NULL DEFAULT 'atendente',
    ativo         BOOLEAN         NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP       NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP       NOT NULL DEFAULT NOW(),

    -- Restricao: funcao deve ser um dos valores permitidos
    CONSTRAINT chk_funcao CHECK (funcao IN ('atendente', 'tecnico', 'gerente', 'administrador'))
);

-- Indice para busca rapida por email (login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Indice para filtro por funcao
CREATE INDEX IF NOT EXISTS idx_usuarios_funcao ON usuarios(funcao);

-- Indice para listar apenas usuarios ativos
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo) WHERE ativo = TRUE;


-- ============================================================
-- TABELA: clientes
-- Descricao: Armazena os clientes que levam equipamentos
--            para conserto
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id            SERIAL          PRIMARY KEY,
    nome          VARCHAR(200)    NOT NULL,
    cpf_cnpj      VARCHAR(20),                         -- CPF ou CNPJ do cliente
    telefone      VARCHAR(20)     NOT NULL,            -- Telefone/WhatsApp principal
    email         VARCHAR(150),                        -- E-mail do cliente
    endereco      TEXT,                                 -- Endereco completo
    observacoes   TEXT,                                 -- Observacoes gerais
    criado_em     TIMESTAMP       NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Indice para busca por nome
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- Indice para busca por telefone (WhatsApp)
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

-- Indice para busca por CPF/CNPJ
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);


-- ============================================================
-- TABELA: ordens_servico
-- Descricao: Armazena as ordens de servico (OS) do sistema.
--            Cada OS esta vinculada a um cliente e,
--            opcionalmente, a um tecnico responsavel.
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
    id                SERIAL          PRIMARY KEY,
    numero_os         INTEGER         NOT NULL UNIQUE,     -- Numero da OS (ex: 1001)
    cliente_id        INTEGER         NOT NULL,             -- FK para clientes
    tecnico_id        INTEGER,                              -- FK para usuarios (tecnico)
    tipo_equipamento  VARCHAR(50)     NOT NULL,             -- Celular, Tablet, Notebook, etc.
    marca             VARCHAR(100),                         -- Samsung, Apple, JBL, etc.
    modelo            VARCHAR(150),                         -- Galaxy S23, MacBook Air, etc.
    numero_serie      VARCHAR(100),                         -- IMEI, Serial Number
    defeito           TEXT            NOT NULL,             -- Descricao do defeito relatado
    diagnostico       TEXT,                                 -- Diagnostico tecnico / observacoes
    status            VARCHAR(30)     NOT NULL DEFAULT 'analise',
    pecas_necessarias TEXT,                                 -- Pecas necessarias para o reparo
    valor_servico     NUMERIC(10,2)   DEFAULT 0.00,        -- Valor cobrado pelo servico
    prazo_entrega     DATE,                                 -- Data prevista de entrega
    aprovado_cliente  BOOLEAN         NOT NULL DEFAULT FALSE, -- Cliente aprovou o servico?
    criado_em         TIMESTAMP       NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMP       NOT NULL DEFAULT NOW(),

    -- Chaves estrangeiras
    CONSTRAINT fk_os_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_os_tecnico FOREIGN KEY (tecnico_id) 
        REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Restricao: status deve ser um dos valores permitidos
    CONSTRAINT chk_status CHECK (status IN (
        'analise',           -- Em analise
        'aguardando',        -- Aguardando peca
        'reparo',            -- Em reparo
        'concluido',         -- Concluido
        'nao_consertado',    -- Nao consertado
        'entregue'           -- Entregue
    )),

    -- Restricao: tipo de equipamento deve ser valido
    CONSTRAINT chk_tipo_equipamento CHECK (tipo_equipamento IN (
        'Celular',
        'Tablet',
        'Notebook',
        'Desktop',
        'Equipamento de Som',
        'Microondas',
        'Bateria JBL/BMS',
        'Outro'
    ))
);

-- Indice para busca por numero da OS
CREATE INDEX IF NOT EXISTS idx_os_numero ON ordens_servico(numero_os);

-- Indice para filtro por status
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_servico(status);

-- Indice para filtro por cliente
CREATE INDEX IF NOT EXISTS idx_os_cliente_id ON ordens_servico(cliente_id);

-- Indice para filtro por tecnico
CREATE INDEX IF NOT EXISTS idx_os_tecnico_id ON ordens_servico(tecnico_id);

-- Indice para busca por tipo de equipamento
CREATE INDEX IF NOT EXISTS idx_os_tipo_equip ON ordens_servico(tipo_equipamento);

-- Indice para ordenacao por data de criacao
CREATE INDEX IF NOT EXISTS idx_os_criado_em ON ordens_servico(criado_em DESC);


-- ============================================================
-- TABELA: historico_status_os
-- Descricao: Registra todas as mudancas de status de cada
--            ordem de servico, permitindo rastrear o
--            historico completo do atendimento.
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_status_os (
    id            SERIAL          PRIMARY KEY,
    os_id         INTEGER         NOT NULL,               -- FK para ordens_servico
    status_anterior VARCHAR(30),                         -- Status anterior (NULL se for a primeira)
    status_novo    VARCHAR(30)     NOT NULL,              -- Novo status
    alterado_por   INTEGER         NOT NULL,              -- FK para usuarios (quem alterou)
    observacao     TEXT,                                 -- Observacao sobre a mudanca
    alterado_em    TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_hist_os FOREIGN KEY (os_id) 
        REFERENCES ordens_servico(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_usuario FOREIGN KEY (alterado_por) 
        REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Indice para buscar historico de uma OS especifica
CREATE INDEX IF NOT EXISTS idx_hist_os_id ON historico_status_os(os_id);

-- Indice para ordenar historico por data
CREATE INDEX IF NOT EXISTS idx_hist_alterado_em ON historico_status_os(alterado_em DESC);


-- ============================================================
-- TABELA: sessoes
-- Descricao: Armazena as sessoes ativas dos usuarios
--            logados no sistema (autenticacao via token)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessoes (
    id            SERIAL          PRIMARY KEY,
    usuario_id    INTEGER         NOT NULL,               -- FK para usuarios
    token         VARCHAR(500)    NOT NULL UNIQUE,        -- Token JWT da sessao
    ip_origem     VARCHAR(45),                           -- IP do cliente
    expira_em     TIMESTAMP       NOT NULL,               -- Data de expiracao do token
    criado_em     TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Indice para buscar sessao por token
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token);

-- Indice para filtrar sessoes expiradas
CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes(expira_em);


-- ============================================================
-- VIEW: vw_resumo_os
-- Descricao: View que junta dados da OS com nome do cliente
--            e nome do tecnico para facilitar consultas
-- ============================================================
CREATE OR REPLACE VIEW vw_resumo_os AS
SELECT 
    os.id,
    os.numero_os,
    os.tipo_equipamento,
    os.marca,
    os.modelo,
    os.defeito,
    os.status,
    os.valor_servico,
    os.prazo_entrega,
    os.aprovado_cliente,
    os.criado_em,
    os.atualizado_em,
    c.nome    AS cliente_nome,
    c.telefone AS cliente_telefone,
    c.email   AS cliente_email,
    u.nome    AS tecnico_nome
FROM ordens_servico os
INNER JOIN clientes c ON c.id = os.cliente_id
LEFT  JOIN usuarios u ON u.id = os.tecnico_id;


-- ============================================================
-- VIEW: vw_dashboard_stats
-- Descricao: View com estatisticas agregadas para o
--            dashboard principal do sistema
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard_stats AS
SELECT
    COUNT(*)                                          AS total_ordens,
    COUNT(*) FILTER (WHERE status = 'analise')         AS em_analise,
    COUNT(*) FILTER (WHERE status = 'aguardando')      AS aguardando_peca,
    COUNT(*) FILTER (WHERE status = 'reparo')          AS em_reparo,
    COUNT(*) FILTER (WHERE status = 'concluido')       AS concluidos,
    COUNT(*) FILTER (WHERE status = 'nao_consertado')  AS nao_consertados,
    COUNT(*) FILTER (WHERE status = 'entregue')        AS entregues,
    COALESCE(SUM(valor_servico), 0)                    AS valor_total
FROM ordens_servico;


-- ============================================================
-- FUNCAO: atualizar_timestamp()
-- Descricao: Trigger que atualiza automaticamente o campo
--            atualizado_em sempre que um registro e modificado
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica a funcao de trigger nas tabelas
CREATE TRIGGER trg_usuarios_atualizado
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_clientes_atualizado
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_os_atualizado
    BEFORE UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();


-- ============================================================
-- FUNCAO: registrar_historico_status()
-- Descricao: Trigger que registra automaticamente no
--            historico toda mudanca de status de uma OS
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_historico_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Registra apenas se o status foi alterado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO historico_status_os (os_id, status_anterior, status_novo, alterado_por, observacao)
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.tecnico_id,  -- Pode ser ajustado para receber o ID do usuario logado via contexto
            CONCAT('Status alterado de "', OLD.status, '" para "', NEW.status, '"')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_historico_status
    AFTER UPDATE ON ordens_servico
    FOR EACH ROW EXECUTE FUNCTION registrar_historico_status();

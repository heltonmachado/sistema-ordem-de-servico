-- ============================================================
-- TechFix - Sistema de Ordem de Servico
-- Script de dados iniciais (seed)
-- ============================================================
-- Descricao: Insere dados de exemplo para teste e
--              desenvolvimento do sistema.
--              Senhas estao com hash bcrypt.
-- ============================================================

-- ============================================================
-- USUARIOS
-- Senha padrao "admin123" com hash bcrypt
-- Hash gerado para: admin123
-- ============================================================
INSERT INTO usuarios (id, nome, email, senha_hash, funcao, ativo) VALUES
(1, 'Admin Sistema',   'admin@techfix.com',    '$2b$10$EixZaYVK1j6y0h1QZ5p3x.2W8QF9XvGh1JkLmN0oPqRsTuVwXyZ', 'administrador', TRUE),
(2, 'Carlos Tecnico',  'carlos.tecnico@techfix.com', '$2b$10$EixZaYVK1j6y0h1QZ5p3x.2W8QF9XvGh1JkLmN0oPqRsTuVwXyZ', 'tecnico', TRUE),
(3, 'Ana Atendente',   'ana.atendente@techfix.com',  '$2b$10$EixZaYVK1j6y0h1QZ5p3x.2W8QF9XvGh1JkLmN0oPqRsTuVwXyZ', 'atendente', TRUE),
(4, 'Pedro Gerente',    'pedro.gerente@techfix.com',   '$2b$10$EixZaYVK1j6y0h1QZ5p3x.2W8QF9XvGh1JkLmN0oPqRsTuVwXyZ', 'gerente', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Resetar a sequencia do ID
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));


-- ============================================================
-- CLIENTES
-- ============================================================
INSERT INTO clientes (id, nome, cpf_cnpj, telefone, email, endereco, observacoes) VALUES
(1, 'Joao Silva',       '123.456.789-00', '(11) 99999-1111', 'joao@email.com',     'Rua A, 123 - Sao Paulo/SP', ''),
(2, 'Maria Santos',     '987.654.321-00', '(11) 98888-2222', 'maria@email.com',    'Av B, 456 - Sao Paulo/SP', ''),
(3, 'Carlos Oliveira',  '456.789.123-00', '(11) 97777-3333', 'carlos@email.com',   'Rua C, 789 - Sao Paulo/SP', 'Cliente preferencial'),
(4, 'Fernanda Lima',    '321.654.987-00', '(11) 96666-4444', 'fernanda@email.com', 'Rua D, 321 - Sao Paulo/SP', ''),
(5, 'Roberto Mendes',   '654.321.987-00', '(11) 95555-5555', 'roberto@email.com',  'Av E, 654 - Sao Paulo/SP', 'Empresa - CNPJ')
ON CONFLICT DO NOTHING;

SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));


-- ============================================================
-- ORDENS DE SERVICO
-- ============================================================
INSERT INTO ordens_servico 
    (id, numero_os, cliente_id, tecnico_id, tipo_equipamento, marca, modelo, numero_serie, 
     defeito, diagnostico, status, pecas_necessarias, valor_servico, prazo_entrega, aprovado_cliente, criado_em) VALUES

(1, 1001, 1, 2, 'Celular', 'Samsung', 'Galaxy S23', 'IMEI3529...',
 'Tela trincada apos queda. Touch nao funciona na regiao superior.',
 'Necessaria troca de display completo.',
 'reparo', 'Display Galaxy S23', 450.00, '2026-09-15', TRUE, '2026-09-01'),

(2, 1002, 2, NULL, 'Notebook', 'Apple', 'MacBook Air M2', 'C02...',
 'Nao liga. Sem sinal de video. Carregador OK.',
 'Possivel problema na placa logica. Em analise.',
 'analise', '', 0.00, '2026-09-12', FALSE, '2026-09-03'),

(3, 1003, 3, 2, 'Bateria JBL/BMS', 'JBL', 'Charge 5', '',
 'Caixa nao carrega. Bateria de lithium com BMS inoperante.',
 'BMS com componente queimado. Peca solicitada ao fornecedor.',
 'aguardando', 'BMS JBL Charge 5', 280.00, '2026-09-20', TRUE, '2026-09-04'),

(4, 1004, 1, 2, 'Microondas', 'LG', 'MS3042', '',
 'Nao aquece. Prato gira mas sem micro-ondas.',
 'Magnetron queimado. Substituido e testado OK.',
 'concluido', 'Magnetron LG', 320.00, '2026-09-08', TRUE, '2026-09-02'),

(5, 1005, 2, NULL, 'Tablet', 'Apple', 'iPad 9th Gen', '',
 'Bateria nao segura carga. Descarrega em 30 min.',
 'Nao e economico reparar. Pecas indisponiveis.',
 'nao_consertado', 'Bateria iPad (indisponivel)', 0.00, NULL, FALSE, '2026-09-05'),

(6, 1006, 3, 2, 'Equipamento de Som', 'Sony', 'SRS-XB33', '',
 'Sem audio no canal esquerdo. Bluetooth funciona mas falha no alto-falante.',
 'Alto-falante esquerdo com bobina queimada.',
 'concluido', 'Speaker Sony XB33', 190.00, '2026-09-09', TRUE, '2026-09-04'),

(7, 1007, 4, 2, 'Desktop', 'Dell', 'OptiPlex 7090', 'SVCTAG123',
 'PC nao da video. Cooler liga mas sem POST.',
 'Memoria RAM com defeito. Trocada e testada.',
 'entregue', 'Modulo DDR4 8GB', 210.00, '2026-09-07', TRUE, '2026-08-28'),

(8, 1008, 5, 2, 'Equipamento de Som', 'JBL', 'PartyBox 310', '',
 'Caixa nao conecta via Bluetooth. Led fica piscando.',
 'Modulo Bluetooth com falha. Aguardando peca.',
 'aguardando', 'Modulo Bluetooth JBL', 350.00, '2026-09-18', TRUE, '2026-09-06')

ON CONFLICT (numero_os) DO NOTHING;

SELECT setval('ordens_servico_id_seq', (SELECT MAX(id) FROM ordens_servico));


-- ============================================================
-- HISTORICO DE STATUS (dados de exemplo)
-- ============================================================
INSERT INTO historico_status_os (os_id, status_anterior, status_novo, alterado_por, observacao) VALUES
(1, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(1, 'analise', 'reparo', 2, 'Tecnico iniciou o reparo do display'),
(2, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(3, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(3, 'analise', 'aguardando', 2, 'Peca solicitada ao fornecedor'),
(4, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(4, 'analise', 'reparo', 2, 'Inicio do reparo - troca de magnetron'),
(4, 'reparo', 'concluido', 2, 'Reparo concluido com sucesso'),
(6, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(6, 'analise', 'reparo', 2, 'Troca do alto-falante'),
(6, 'reparo', 'concluido', 2, 'Reparo concluido com sucesso'),
(7, NULL, 'analise', 3, 'OS criada pela atendente Ana'),
(7, 'analise', 'reparo', 2, 'Diagnostico: memoria RAM com defeito'),
(7, 'reparo', 'concluido', 2, 'RAM trocada e testada'),
(7, 'concluido', 'entregue', 3, 'Equipamento entregue ao cliente');

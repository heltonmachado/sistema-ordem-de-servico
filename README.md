# TechFix - Sistema de Gerenciamento de Ordens de Servico

Sistema completo para gerenciamento de ordens de servico em assistencia tecnica de equipamentos eletronicos.

## Funcionalidades

- **Dashboard**: Painel com estatisticas, graficos e ordens recentes
- **Ordens de Servico**: CRUD completo com historico de status automatico
- **Clientes**: Cadastro e gerenciamento de clientes
- **Usuarios**: Gerenciamento com niveis de permissao (atendente, tecnico, gerente, administrador)
- **Autenticacao**: Login JWT com sessoes
- **Relatorios**: Geracao de PDF e integracao WhatsApp

## Estrutura do Projeto

```
techfix/
├── index.html              # Pagina principal (HTML puro)
├── css/
│   └── styles.css           # Estilos completos separados por secao
├── js/
│   ├── api.js               # Camada de comunicacao com API (fallback localStorage)
│   ├── auth.js              # Autenticacao e gerenciamento de sessao
│   ├── app.js               # Modulo principal da aplicacao
│   └── init.js              # Ponto de entrada
├── server/
│   ├── app.js               # Servidor Express (entry point)
│   ├── db.js                # Pool de conexao PostgreSQL
│   └── routes/
│       ├── auth.js           # Rotas de autenticacao
│       ├── clients.js        # Rotas de clientes
│       ├── orders.js         # Rotas de ordens de servico
│       ├── users.js          # Rotas de usuarios
│       └── dashboard.js      # Rotas do dashboard
├── sql/
│   ├── 001_create_database.sql  # Criacao do banco
│   ├── 002_create_tables.sql    # Schema completo
│   └── 003_seed_data.sql       # Dados de exemplo
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Requisitos

- **Node.js** 18+
- **PostgreSQL** 14+
- Navegador moderno (Chrome, Firefox, Edge)

## Instalacao

### 1. Clonar e instalar dependencias

```bash
cd techfix
npm install
```

### 2. Configurar o banco de dados

```bash
# Copiar o arquivo de configuracao
cp .env.example .env
# Editar .env com suas credenciais do PostgreSQL
```

### 3. Criar o banco e tabelas

```bash
# Conectar ao PostgreSQL e executar os scripts na ordem:
psql -U postgres -f sql/001_create_database.sql
psql -U postgres -d techfix_db -f sql/002_create_tables.sql
psql -U postgres -d techfix_db -f sql/003_seed_data.sql
```

### 4. Iniciar o servidor

```bash
# Modo desenvolvimento (com nodemon)
npm run dev

# Modo producao
npm start
```

O servidor estara disponivel em `http://localhost:3000`.

## Credenciais Padrao

| Email                  | Senha    | Funcao        |
|------------------------|----------|---------------|
| admin@techfix.com      | admin123 | administrador |
| maria@techfix.com      | 123456   | gerente       |
| carlos@techfix.com     | 123456   | tecnico       |
| ana@techfix.com        | 123456   | atendente     |

## Modo Fallback (sem backend)

O sistema funciona mesmo sem o backend Node.js! Se a API nao estiver disponivel, o JavaScript do frontend utiliza **localStorage** como alternativa, permitindo testar toda a interface diretamente abrindo o `index.html` no navegador.

## Tipos de Equipamento

- Celular
- Tablet
- Notebook
- Desktop
- Equipamento de Som
- Microondas
- Bateria JBL/BMS
- Outro

## Status de Ordens de Servico

1. **analise** - Em analise
2. **aguardando** - Aguardando pecas/aprovacao
3. **reparo** - Em reparo
4. **concluido** - Concluido
5. **nao_consertado** - Nao consertado
6. **entregue** - Entregue

## Niveis de Permissao

| Funcao        | Ver Dashboard | Gerenciar OS | Gerenciar Clientes | Gerenciar Usuarios | Excluir |
|---------------|:-------------:|:------------:|:------------------:|:------------------:|:-------:|
| administrador |      ✓        |      ✓       |         ✓          |         ✓         |    ✓    |
| gerente       |      ✓        |      ✓       |         ✓          |         ✓         |    ✓    |
| tecnico       |      ✓        |      ✓       |         ✓          |         ✗         |    ✗    |
| atendente     |      ✓        |      ✓       |         ✓          |         ✗         |    ✗    |

## API Endpoints

### Autenticacao
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro de novo usuario
- `GET  /api/auth/me` - Dados do usuario autenticado

### Clientes
- `GET    /api/clientes` - Listar clientes
- `GET    /api/clientes/:id` - Obter cliente
- `POST   /api/clientes` - Criar cliente
- `PUT    /api/clientes/:id` - Atualizar cliente
- `DELETE /api/clientes/:id` - Excluir cliente (admin)

### Ordens de Servico
- `GET    /api/ordens` - Listar ordens
- `GET    /api/ordens/:id` - Obter ordem
- `POST   /api/ordens` - Criar ordem
- `PUT    /api/ordens/:id` - Atualizar ordem
- `DELETE /api/ordens/:id` - Excluir ordem (admin)
- `GET    /api/ordens/:id/historico` - Historico de status

### Usuarios
- `GET    /api/usuarios` - Listar usuarios (gerente+)
- `GET    /api/usuarios/:id` - Obter usuario (gerente+)
- `POST   /api/usuarios` - Criar usuario (gerente+)
- `PUT    /api/usuarios/:id` - Atualizar usuario (gerente+)
- `DELETE /api/usuarios/:id` - Excluir usuario (admin)

### Dashboard
- `GET /api/dashboard/stats` - Estatisticas gerais

## Licenca

MIT

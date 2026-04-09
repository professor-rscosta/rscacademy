# 🎓 RSC Academy — Plataforma EdTech com IA + TRI + RAG

> Sistema completo de gestão educacional com Inteligência Artificial, Teoria de Resposta ao Item (TRI) e base de conhecimento RAG. Desenvolvido por **Ramon Santos Costa**.

![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-black?logo=openai)
![License](https://img.shields.io/badge/licença-MIT-orange)

---

## 📦 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 + Express |
| Frontend | React 18 + Vite |
| Banco de Dados | JSON puro (sem SQL, sem compilação) |
| IA | OpenAI GPT-4o-mini |
| Extração RAG | pdf-parse v2 (pdfjs) |
| Autenticação | JWT + bcryptjs |
| Estilos | CSS Variables + Mobile-first |

> ✅ **Banco JSON puro** — sem SQLite, sem Python, sem compilação. Funciona direto no Windows, macOS e Linux.

---

## 🚀 Executar em Desenvolvimento

Você precisa de **2 terminais abertos**.

### Terminal 1 — Backend (porta 3001)

```bash
cd rsc-academy/backend
npm install
npm run dev
```

### Terminal 2 — Frontend (porta 5173)

```bash
cd rsc-academy/frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## 🔑 Credenciais de Acesso

| Perfil | E-mail | Senha |
|--------|--------|-------|
| 👑 Admin | admin@rsc.edu | Admin@123 |
| 🏫 Professor | ana@rsc.edu | Prof@123 |
| 🎓 Aluno | lucas@aluno.rsc.edu | Aluno@123 |
| 🎓 Aluno | sofia@aluno.rsc.edu | Aluno@123 |

---

## 🤖 Configuração da IA (obrigatório para funcionalidades de IA)

Crie o arquivo `backend/.env`:

```env
PORT=3001
JWT_SECRET=sua_senha_jwt_secreta_minimo_32_caracteres
NODE_ENV=development
OPENAI_API_KEY=sk-proj-sua_chave_aqui
```

Obtenha sua chave em: **https://platform.openai.com/api-keys**

---

## 📋 Módulos Implementados

### 👑 Administrador
- Dashboard com estatísticas reais (usuários, turmas, disciplinas)
- CRUD completo de usuários com aprovação de cadastros pendentes
- Relatórios globais (usuários, conteúdo, ranking TRI)
- Gerenciamento de turmas e disciplinas

### 🏫 Professor
- **Disciplinas** — CRUD completo
- **Trilhas de Aprendizagem** — CRUD + visualização em árvore
- **Banco de Questões** — 7 tipos de questão + geração por IA + parâmetros TRI
- **Avaliações** — provas formais com peso e nota
- **Atividades** — tarefas com prazo e entrega
- **Turmas** — código de acesso auto-gerado + lista de alunos + mural
- **Mural de Avisos** — comunicados por turma
- **Materiais Didáticos** — links, YouTube, PDF, texto
- **Base RAG (IA)** — upload de PDFs/DOCXs indexados para o chatbot
- **Relatórios TRI** — theta por aluno, taxa de acerto por trilha, boletim

### 🎓 Aluno
- Entrar em turma pelo código de acesso
- **Hub Central** — visão geral com disciplinas, trilhas, avaliações e atividades
- **Trilhas Gamificadas** — HUD com XP, streak, timer e progresso visual
- **Player de Desafio** — todos os 7 tipos de questão com feedback imediato por IA
- **Curva TRI** — visualização por questão e theta atual
- **Assistente IA (RAG)** — chatbot com Claude baseado nos documentos da disciplina
- **Avaliações e Atividades** — com prazo e entrega
- **Relatório de Habilidade** — gauge de theta + histórico
- **Gamificação** — XP, 7 níveis, 7 medalhas, ranking da turma
- **Materiais e Mural** — por disciplina e turma

---

## 🧮 Sistema TRI (Teoria de Resposta ao Item)

| Modelo | Aplicado a |
|--------|-----------|
| 1PL (Rasch) | Verdadeiro/Falso |
| 2PL | Preenchimento, Associação, Ordenação |
| 3PL | Múltipla Escolha |
| GRM (Graded Response) | Dissertativa, Upload |

- **Estimação θ:** EAP (Expected A Posteriori) com prior N(0,1)
- **Calibração:** automática após 30+ respostas por questão
- **Visualização:** curva característica interativa por questão

---

## 🧠 Sistema RAG (Base de Conhecimento IA)

O RAG funciona como o **NotebookLM** do Google — a IA responde baseada nos documentos reais cadastrados pelo professor.

**Fluxo:**
1. Professor faz upload de PDF, DOCX ou TXT
2. O sistema extrai o texto com `pdf-parse v2` (pdfjs — mesma engine do Chrome)
3. O texto é dividido em chunks semânticos e indexado com TF-IDF
4. Quando o aluno pergunta no chatbot, o sistema busca os trechos mais relevantes
5. O GPT-4o-mini responde citando as fontes do documento

**Formatos suportados:** PDF (com texto selecionável), DOCX, TXT, MD, CSV  
**Limite:** até 25MB por arquivo

---

## 🎮 Sistema de Gamificação

| Nível | XP Necessário | Emblema |
|-------|-------------|---------|
| Iniciante | 0 | 🌱 |
| Aprendiz | 200 | 📘 |
| Intermediário | 500 | ⚡ |
| Avançado | 1.000 | 🔥 |
| Expert | 2.000 | 💎 |
| Mestre | 4.000 | 👑 |
| Lenda | 8.000 | 🏆 |

**Medalhas automáticas:** Primeira resposta, Sequência de 7 dias, 50 questões, Trilha completa, 5 disciplinas, Theta > 2.0, Ranking top 3.

---

## 🔌 API Endpoints

```
/api/auth             → login, register, me
/api/users            → CRUD (admin)
/api/disciplinas      → CRUD
/api/trilhas          → CRUD
/api/questoes         → CRUD + gerar com IA + sugerir TRI
/api/respostas        → submeter + stats + progresso trilha
/api/avaliacoes       → CRUD + notas
/api/atividades       → CRUD + entregas
/api/turmas           → CRUD + entrar por código + alunos
/api/materiais        → CRUD
/api/avisos           → CRUD
/api/chatbot          → chat + disciplinas com RAG
/api/rag              → upload + indexar + busca semântica
/api/relatorios       → admin global, professor, por turma, boletim
/api/gamificacao      → XP, nível, medalhas, ranking
```

---

## 🏗️ Estrutura de Pastas

```
rsc-academy/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de negócio
│   │   ├── repositories/    # Acesso ao banco JSON
│   │   ├── services/        # IA, TRI, RAG, gamificação
│   │   ├── routes/          # Endpoints Express
│   │   ├── middleware/       # Auth JWT, validações
│   │   └── database/        # init.js + rsc_academy.json
│   ├── .env                 # Variáveis de ambiente
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── admin/       # Painel administrador
    │   │   ├── professor/   # Painel professor
    │   │   ├── aluno/       # Painel aluno
    │   │   └── login/       # Tela de autenticação
    │   ├── hooks/           # useApi, useAuth
    │   ├── components/      # Sidebar, Header, etc.
    │   └── styles/          # global.css
    └── package.json
```

---

## 🌐 Deploy em Produção (Hostinger VPS)

### 1. Requisitos
- VPS Ubuntu 22.04 (mínimo KVM 1, recomendado KVM 2)
- Domínio apontado para o IP do VPS

### 2. Configurar servidor

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx

# PM2 (gerenciador de processos)
npm install -g pm2
```

### 3. Deploy do backend

```bash
cd /var/www/rsc-academy/backend
npm install
pm2 start src/server.js --name "rsc-backend"
pm2 save && pm2 startup
```

### 4. Build do frontend

```bash
cd /var/www/rsc-academy/frontend
npm install
npm run build   # gera a pasta dist/
```

### 5. Nginx

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    root /var/www/rsc-academy/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_read_timeout 300s;
        client_max_body_size 30m;
    }
}
```

### 6. HTTPS gratuito

```bash
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## 💾 Backup do Banco de Dados

```bash
# Backup completo
cd rsc-academy && ./backup.sh full

# Apenas o banco JSON
./backup.sh db

# Listar backups
./backup.sh list

# Exportar CSVs + schema PostgreSQL (migração futura)
./backup.sh migrate
```

---

## 🗺️ Próximas Etapas

- [ ] Upload real de arquivos com armazenamento em disco (multer)
- [ ] Notificações em tempo real (Socket.io)
- [ ] Multi-tenant (logo/tema por instituição)
- [ ] RAG com embeddings vetoriais (ChromaDB / pgvector)
- [ ] Migração para PostgreSQL (script já disponível via `./backup.sh migrate`)
- [ ] App mobile (React Native)
- [ ] Relatório PDF exportável por turma

---

## 👨‍💻 Autor

**Ramon Santos Costa**  
Professor · Desenvolvedor · Mestre em Computação Aplicada

📧 Contato: [GitHub](https://github.com/ramonvirtual)

---

## 📄 Licença

MIT © 2025 Ramon Santos Costa

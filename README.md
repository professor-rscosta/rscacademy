# 🎓 RSC Academy — Plataforma EdTech com IA + TRI + RAG

**Stack:** Node.js + Express + JSON DB · React 18 + Vite · Claude AI (Anthropic)

> ✅ Banco JSON puro — sem SQLite, sem Python, sem compilação. Funciona direto no Windows.

---

## 🚀 Executar

### Terminal 1 — Backend
```bash
cd rsc-academy\backend
npm install
npm run dev
```
### Terminal 2 — Frontend
```bash
cd rsc-academy\frontend
npm install
npm run dev
```
Acesse: **http://localhost:5173**

---

## 🔑 Credenciais

| Perfil    | E-mail                   | Senha     |
|-----------|--------------------------|-----------|
| Admin     | admin@rsc.edu            | Admin@123 |
| Professor | ana@rsc.edu              | Prof@123  |
| Aluno     | lucas@aluno.rsc.edu      | Aluno@123 |
| Aluno     | sofia@aluno.rsc.edu      | Aluno@123 |

---

## 🤖 IA (opcional)

Adicione sua chave no `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Obtenha em: https://console.anthropic.com

---

## 📋 Módulos Implementados

### 👑 Admin
- Dashboard com stats reais
- CRUD completo de usuários
- Aprovação de cadastros pendentes
- Relatórios globais (usuários, conteúdo, ranking TRI)

### 👨‍🏫 Professor
- Disciplinas (CRUD)
- Trilhas de aprendizagem (CRUD + visualização)
- Questões (7 tipos + TRI + geração por IA com RAG)
- Turmas (código de acesso auto-gerado + lista de alunos)
- Mural de Avisos (por turma)
- Materiais Didáticos (link/YouTube/PDF/texto)
- Relatórios TRI (theta por aluno, taxa por trilha)

### 👨‍🎓 Aluno
- Entrar em turma pelo código de acesso
- Trilhas gamificadas (HUD com XP/streak/timer)
- Player de desafio (todos os 7 tipos de questão)
- Feedback por IA após cada resposta
- Curva TRI por questão
- Relatórios de habilidade (theta gauge)
- Materiais e Mural
- Assistente IA (chatbot com Claude)

---

## 🧮 Arquitetura TRI

| Modelo | Uso |
|--------|-----|
| 1PL Rasch | Verdadeiro/Falso |
| 2PL | Preenchimento, Associação, Ordenação |
| 3PL | Múltipla Escolha |
| GRM | Dissertativa, Upload |

**Estimação θ:** EAP (Expected A Posteriori) com prior N(0,1)
**Calibração:** automática após 30+ respostas por questão

---

## 🔌 API Endpoints

```
/api/auth         → login, register, me
/api/users        → CRUD (admin)
/api/disciplinas  → CRUD
/api/trilhas      → CRUD
/api/questoes     → CRUD + gerar com IA + sugerir TRI
/api/respostas    → submeter + stats + progresso trilha
/api/turmas       → CRUD + entrar por código + alunos
/api/materiais    → CRUD
/api/avisos       → CRUD
/api/relatorios   → admin global, professor, por turma
```

---

## 🗺️ Próximas Etapas

- [ ] Avaliações formais (provas com peso e nota final)
- [ ] Upload real de arquivos (multer)
- [ ] Notificações em tempo real (Socket.io)
- [ ] Multi-tenant (logo/tema por instituição)
- [ ] RAG aprimorado com embeddings reais

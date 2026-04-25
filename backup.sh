#!/bin/bash
# ════════════════════════════════════════════════════════════════
# RSC Academy — Script de Backup e Migração
# Uso: ./backup.sh [full|db|code|restore]
# ════════════════════════════════════════════════════════════════

set -e
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_FILE="./backend/src/database/rsc_academy.json"
ENV_FILE="./backend/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Cores
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

header() { echo -e "\n${BLUE}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════${NC}"; }
ok()     { echo -e "${GREEN}✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()    { echo -e "${RED}❌ $1${NC}"; exit 1; }

mkdir -p "$BACKUP_DIR"

# ── BACKUP COMPLETO ──────────────────────────────────────────
backup_full() {
  header "RSC Academy — Backup Completo"
  ARCHIVE="$BACKUP_DIR/rsc_academy_backup_${TIMESTAMP}.tar.gz"

  echo "📦 Gerando backup completo..."
  tar -czf "$ARCHIVE" \
    --exclude="./backend/node_modules" \
    --exclude="./frontend/node_modules" \
    --exclude="./frontend/dist" \
    --exclude="./backups" \
    --exclude=".git" \
    --exclude="*.log" \
    -C "$SCRIPT_DIR" . 2>/dev/null

  SIZE=$(du -sh "$ARCHIVE" | cut -f1)
  ok "Backup criado: $ARCHIVE ($SIZE)"

  # Também salvar DB separado com timestamp
  backup_db_only
}

# ── BACKUP SÓ DO BANCO ───────────────────────────────────────
backup_db_only() {
  header "Backup do Banco de Dados"
  DB_BACKUP="$BACKUP_DIR/db_${TIMESTAMP}.json"

  if [ ! -f "$DB_FILE" ]; then
    warn "Banco de dados não encontrado em: $DB_FILE"
    warn "Rode o sistema ao menos uma vez para criar o banco."
    return
  fi

  cp "$DB_FILE" "$DB_BACKUP"
  SIZE=$(du -sh "$DB_BACKUP" | cut -f1)
  ok "Banco salvo: $DB_BACKUP ($SIZE)"

  # Estatísticas do banco
  python3 << PYEOF
import json, sys
try:
    with open('$DB_BACKUP') as f:
        db = json.load(f)
    print("\n📊 Estatísticas do banco:")
    for table, rows in db.items():
        if isinstance(rows, list) and rows:
            print(f"   {table}: {len(rows)} registros")
except Exception as e:
    print(f"⚠️  Não foi possível analisar o banco: {e}")
PYEOF
}

# ── LISTAR BACKUPS ───────────────────────────────────────────
list_backups() {
  header "Backups Disponíveis"
  if [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    warn "Nenhum backup encontrado em $BACKUP_DIR"
    return
  fi
  echo -e "\n${CYAN}Backups encontrados:${NC}"
  ls -lht "$BACKUP_DIR" | tail -n +2 | head -20
}

# ── RESTAURAR BACKUP ────────────────────────────────────────
restore_backup() {
  header "Restaurar Backup"
  list_backups

  echo ""
  echo "Digite o caminho do arquivo .tar.gz ou .json a restaurar:"
  read -r RESTORE_FILE

  if [ ! -f "$RESTORE_FILE" ]; then
    err "Arquivo não encontrado: $RESTORE_FILE"
  fi

  if [[ "$RESTORE_FILE" == *.json ]]; then
    echo "⚠️  Isso substituirá o banco de dados atual. Continuar? (s/N)"
    read -r CONFIRM
    [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ] || exit 0
    # Fazer backup do atual antes
    [ -f "$DB_FILE" ] && cp "$DB_FILE" "${DB_FILE}.bak_$(date +%s)"
    cp "$RESTORE_FILE" "$DB_FILE"
    ok "Banco restaurado de: $RESTORE_FILE"
  elif [[ "$RESTORE_FILE" == *.tar.gz ]]; then
    echo "⚠️  Restauração completa SUBSTITUIRÁ todos os arquivos. Continuar? (s/N)"
    read -r CONFIRM
    [ "$CONFIRM" = "s" ] || [ "$CONFIRM" = "S" ] || exit 0
    tar -xzf "$RESTORE_FILE" -C "$SCRIPT_DIR"
    ok "Sistema restaurado de: $RESTORE_FILE"
    echo "🔧 Execute: cd backend && npm install && cd ../frontend && npm install"
  fi
}

# ── EXPORTAR PARA MIGRAÇÃO ───────────────────────────────────
export_migration() {
  header "Exportar para Migração (PostgreSQL)"
  MIGRATION_DIR="$BACKUP_DIR/migration_${TIMESTAMP}"
  mkdir -p "$MIGRATION_DIR"

  python3 << PYEOF
import json, os, csv

db_path = '$DB_FILE'
out_dir = '$MIGRATION_DIR'

try:
    with open(db_path) as f:
        db = json.load(f)
except FileNotFoundError:
    print("⚠️  Banco não encontrado. Rode o sistema primeiro.")
    exit(0)

# Exportar cada tabela como CSV
for table, rows in db.items():
    if not isinstance(rows, list) or not rows:
        continue
    csv_path = os.path.join(out_dir, f'{table}.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"   ✅ {table}.csv ({len(rows)} registros)")

# Gerar schema SQL básico
sql_path = os.path.join(out_dir, 'schema_postgresql.sql')
with open(sql_path, 'w') as f:
    f.write("""-- RSC Academy — Schema PostgreSQL
-- Gerado automaticamente em migração
-- Execute este script no PostgreSQL antes de importar os CSVs

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY, nome VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL, senha_hash VARCHAR(200),
  perfil VARCHAR(20) DEFAULT 'aluno', status VARCHAR(20) DEFAULT 'pendente',
  xp_total INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turmas (
  id SERIAL PRIMARY KEY, nome VARCHAR(200) NOT NULL,
  professor_id INTEGER REFERENCES usuarios(id),
  codigo_acesso VARCHAR(20), descricao TEXT, created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aluno_turma (
  id SERIAL PRIMARY KEY, aluno_id INTEGER REFERENCES usuarios(id),
  turma_id INTEGER REFERENCES turmas(id), joined_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplinas (
  id SERIAL PRIMARY KEY, nome VARCHAR(200) NOT NULL, codigo VARCHAR(50),
  descricao TEXT, carga_horaria INTEGER DEFAULT 60,
  professor_id INTEGER REFERENCES usuarios(id), created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turma_disciplinas (
  id SERIAL PRIMARY KEY, turma_id INTEGER REFERENCES turmas(id),
  disciplina_id INTEGER REFERENCES disciplinas(id)
);

CREATE TABLE IF NOT EXISTS trilhas (
  id SERIAL PRIMARY KEY, nome VARCHAR(200) NOT NULL, descricao TEXT,
  disciplina_id INTEGER REFERENCES disciplinas(id),
  professor_id INTEGER REFERENCES usuarios(id),
  ordem INTEGER DEFAULT 1, xp_total INTEGER DEFAULT 500,
  tempo_limite INTEGER, tentativas_maximas INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questoes (
  id SERIAL PRIMARY KEY, tipo VARCHAR(50) NOT NULL,
  enunciado TEXT NOT NULL, alternativas JSONB,
  gabarito JSONB, xp INTEGER DEFAULT 100,
  trilha_id INTEGER REFERENCES trilhas(id),
  tri JSONB, midias JSONB, rag_tags JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS respostas (
  id SERIAL PRIMARY KEY, aluno_id INTEGER REFERENCES usuarios(id),
  questao_id INTEGER REFERENCES questoes(id),
  resposta JSONB, score DECIMAL(4,3), is_correct BOOLEAN,
  respondida_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL,
  tipo VARCHAR(50), turma_id INTEGER REFERENCES turmas(id),
  disciplina_id INTEGER REFERENCES disciplinas(id),
  professor_id INTEGER REFERENCES usuarios(id),
  questoes JSONB, status VARCHAR(20) DEFAULT 'rascunho',
  nota_minima DECIMAL(4,1) DEFAULT 6.0, peso INTEGER DEFAULT 10,
  tempo_limite INTEGER DEFAULT 60, tentativas_permitidas INTEGER DEFAULT 1,
  encerra_em TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tentativas (
  id SERIAL PRIMARY KEY, avaliacao_id INTEGER REFERENCES avaliacoes(id),
  aluno_id INTEGER REFERENCES usuarios(id),
  respostas JSONB, nota DECIMAL(4,1), aprovado BOOLEAN,
  status VARCHAR(20) DEFAULT 'em_andamento',
  iniciada_em TIMESTAMP DEFAULT NOW(), concluida_em TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atividades (
  id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL, instrucoes TEXT,
  turma_id INTEGER REFERENCES turmas(id),
  disciplina_id INTEGER REFERENCES disciplinas(id),
  professor_id INTEGER REFERENCES usuarios(id),
  materiais JSONB, pontos INTEGER DEFAULT 10,
  data_entrega TIMESTAMP, status VARCHAR(20) DEFAULT 'rascunho',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entregas_atividade (
  id SERIAL PRIMARY KEY, atividade_id INTEGER REFERENCES atividades(id),
  aluno_id INTEGER REFERENCES usuarios(id),
  arquivos JSONB, comentario TEXT,
  nota DECIMAL(4,1), feedback_prof TEXT,
  status VARCHAR(20) DEFAULT 'entregue',
  entregue_em TIMESTAMP DEFAULT NOW(), corrigido_em TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY, titulo VARCHAR(200) NOT NULL, descricao TEXT,
  tipo VARCHAR(50), url TEXT, conteudo TEXT, base64 TEXT,
  file_name VARCHAR(200), file_size INTEGER,
  disciplina_id INTEGER REFERENCES disciplinas(id),
  professor_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avisos (
  id SERIAL PRIMARY KEY, titulo VARCHAR(200), mensagem TEXT,
  professor_id INTEGER REFERENCES usuarios(id),
  turma_id INTEGER REFERENCES turmas(id),
  fixado BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medalhas_config (
  id SERIAL PRIMARY KEY, nome VARCHAR(100), descricao TEXT,
  icone VARCHAR(20), tipo VARCHAR(50), criterio VARCHAR(50),
  valor DECIMAL(10,2), xp_bonus INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS medalhas_aluno (
  id SERIAL PRIMARY KEY, aluno_id INTEGER REFERENCES usuarios(id),
  medalha_id INTEGER REFERENCES medalhas_config(id),
  conquistada_em TIMESTAMP DEFAULT NOW()
);

-- Índices importantes
CREATE INDEX IF NOT EXISTS idx_respostas_aluno ON respostas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_respostas_questao ON respostas(questao_id);
CREATE INDEX IF NOT EXISTS idx_tentativas_aluno ON tentativas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_turma ON aluno_turma(aluno_id, turma_id);
CREATE INDEX IF NOT EXISTS idx_turma_disciplinas ON turma_disciplinas(turma_id, disciplina_id);
""")
    print(f"   ✅ schema_postgresql.sql gerado")

# Gerar README de migração
readme_path = os.path.join(out_dir, 'MIGRATION_README.md')
with open(readme_path, 'w') as f:
    f.write("""# RSC Academy — Guia de Migração para PostgreSQL

## Passos

1. **Instale o PostgreSQL** (v14+)
2. **Crie o banco:**
   ```sql
   CREATE DATABASE rsc_academy;
   ```
3. **Execute o schema:**
   ```bash
   psql -U postgres -d rsc_academy -f schema_postgresql.sql
   ```
4. **Importe os CSVs:**
   ```bash
   # Para cada tabela (na ordem correta):
   psql -U postgres -d rsc_academy -c "\\\\COPY usuarios FROM 'usuarios.csv' CSV HEADER"
   psql -U postgres -d rsc_academy -c "\\\\COPY turmas FROM 'turmas.csv' CSV HEADER"
   # ... repita para cada arquivo .csv
   ```
5. **Ajuste o backend** (substitua as funções JSON por pg/pg-pool)
6. **Variáveis de ambiente:**
   ```env
   DATABASE_URL=postgresql://postgres:senha@localhost:5432/rsc_academy
   ```

## Ordem de importação (respeitar FKs)
1. usuarios
2. disciplinas
3. turmas
4. aluno_turma
5. turma_disciplinas
6. trilhas
7. questoes
8. medalhas_config
9. avaliacoes
10. atividades
11. materiais
12. avisos
13. respostas
14. tentativas
15. entregas_atividade
16. medalhas_aluno
""")
    print(f"   ✅ MIGRATION_README.md gerado")
    print(f"\n📁 Arquivos de migração em: {out_dir}")
PYEOF
  ok "Exportação para migração concluída em: $MIGRATION_DIR"
}

# ── MENU PRINCIPAL ───────────────────────────────────────────
case "${1:-menu}" in
  full)     backup_full ;;
  db)       backup_db_only ;;
  list)     list_backups ;;
  restore)  restore_backup ;;
  migrate)  export_migration ;;
  *)
    header "RSC Academy — Sistema de Backup"
    echo ""
    echo -e "  ${CYAN}Uso:${NC} ./backup.sh [comando]"
    echo ""
    echo "  Comandos:"
    echo -e "    ${GREEN}full${NC}     → Backup completo (código + banco + .env)"
    echo -e "    ${GREEN}db${NC}       → Backup apenas do banco de dados"
    echo -e "    ${GREEN}list${NC}     → Listar backups disponíveis"
    echo -e "    ${GREEN}restore${NC}  → Restaurar um backup"
    echo -e "    ${GREEN}migrate${NC}  → Exportar CSVs + schema SQL para PostgreSQL"
    echo ""
    echo -e "  ${YELLOW}Exemplo de uso rápido (backup diário automático):${NC}"
    echo "  Adicione ao crontab:"
    echo -e "  ${CYAN}0 2 * * * cd /seu/projeto && ./backup.sh db >> ./backups/cron.log 2>&1${NC}"
    echo ""
    ;;
esac

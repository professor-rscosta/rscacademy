-- ============================================================
-- RSC Academy — Schema MySQL v1.0
-- Hostinger: criar este banco no hPanel > Databases
-- Executar este arquivo via phpMyAdmin ou MySQL CLI
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '-03:00';

-- ── 1. Usuarios ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  email         VARCHAR(120)  NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)  NOT NULL,
  perfil        ENUM('admin','professor','aluno') NOT NULL DEFAULT 'aluno',
  status        ENUM('ativo','pendente','inativo')  NOT NULL DEFAULT 'pendente',
  foto          TEXT,
  bio           TEXT,
  theta         FLOAT         NOT NULL DEFAULT 0,
  xp_total      INT           NOT NULL DEFAULT 0,
  nivel         INT           NOT NULL DEFAULT 1,
  streak_dias   INT           NOT NULL DEFAULT 0,
  ultimo_acesso DATETIME,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email   (email),
  INDEX idx_perfil  (perfil),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Disciplinas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disciplinas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  descricao     TEXT,
  professor_id  INT           NOT NULL,
  codigo        VARCHAR(20),
  carga_horaria INT           DEFAULT 60,
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_professor (professor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Turmas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turmas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  descricao     TEXT,
  professor_id  INT           NOT NULL,
  codigo        VARCHAR(20)   UNIQUE,
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_professor (professor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Aluno-Turma (matrícula) ───────────────────────────────
CREATE TABLE IF NOT EXISTS aluno_turma (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT           NOT NULL,
  turma_id      INT           NOT NULL,
  status        ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_aluno_turma (aluno_id, turma_id),
  FOREIGN KEY (aluno_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (turma_id)  REFERENCES turmas(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Turma-Disciplinas ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS turma_disciplinas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  turma_id      INT           NOT NULL,
  disciplina_id INT           NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_turma_disc (turma_id, disciplina_id),
  FOREIGN KEY (turma_id)      REFERENCES turmas(id)      ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. Aluno-Disciplina ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS aluno_disciplina (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT           NOT NULL,
  disciplina_id INT           NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_aluno_disc (aluno_id, disciplina_id),
  FOREIGN KEY (aluno_id)      REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. Trilhas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trilhas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  descricao     TEXT,
  disciplina_id INT,
  professor_id  INT           NOT NULL,
  ordem         INT           NOT NULL DEFAULT 1,
  xp_total      INT           NOT NULL DEFAULT 0,
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id)  REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  INDEX idx_disciplina (disciplina_id),
  INDEX idx_professor  (professor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. Questoes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trilha_id     INT,
  disciplina_id INT,
  professor_id  INT           NOT NULL,
  tipo          ENUM('multipla_escolha','verdadeiro_falso','dissertativa',
                     'preenchimento','associacao','ordenacao','upload_arquivo')
                              NOT NULL DEFAULT 'multipla_escolha',
  enunciado     TEXT          NOT NULL,
  alternativas  JSON,
  gabarito      JSON,
  xp            INT           NOT NULL DEFAULT 100,
  midias        JSON,
  rag_tags      JSON,
  habilidade_bncc VARCHAR(30),
  instrucoes_correcao TEXT,
  -- TRI parameters stored as JSON
  tri           JSON,
  uso           ENUM('trilha','avaliacao','ambos') DEFAULT 'ambos',
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id)  REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (trilha_id)     REFERENCES trilhas(id)     ON DELETE SET NULL,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  INDEX idx_trilha    (trilha_id),
  INDEX idx_professor (professor_id),
  INDEX idx_tipo      (tipo),
  INDEX idx_ativo     (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. Respostas (trilhas) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS respostas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT           NOT NULL,
  questao_id    INT           NOT NULL,
  trilha_id     INT,
  resposta      JSON,
  correto       TINYINT(1)    NOT NULL DEFAULT 0,
  score         FLOAT         NOT NULL DEFAULT 0,
  xp_ganho      INT           NOT NULL DEFAULT 0,
  tempo_gasto   INT,
  feedback_ia   TEXT,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aluno_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
  FOREIGN KEY (questao_id) REFERENCES questoes(id)  ON DELETE CASCADE,
  FOREIGN KEY (trilha_id)  REFERENCES trilhas(id)   ON DELETE SET NULL,
  INDEX idx_aluno    (aluno_id),
  INDEX idx_questao  (questao_id),
  INDEX idx_trilha   (trilha_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. Avaliacoes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avaliacoes (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  titulo                VARCHAR(200) NOT NULL,
  descricao             TEXT,
  tipo                  ENUM('prova','trabalho','simulado','quiz','entrega') NOT NULL DEFAULT 'prova',
  professor_id          INT          NOT NULL,
  disciplina_id         INT,
  turma_id              INT,
  questoes              JSON,
  tempo_limite          INT          NOT NULL DEFAULT 60,
  tentativas_permitidas INT          NOT NULL DEFAULT 1,
  nota_minima           FLOAT        NOT NULL DEFAULT 5.0,
  peso                  FLOAT        NOT NULL DEFAULT 10.0,
  status                ENUM('rascunho','publicada','encerrada') NOT NULL DEFAULT 'rascunho',
  disponivel_em         DATETIME,
  encerra_em            DATETIME,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id)  REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  FOREIGN KEY (turma_id)      REFERENCES turmas(id)      ON DELETE SET NULL,
  INDEX idx_professor (professor_id),
  INDEX idx_status    (status),
  INDEX idx_turma     (turma_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. Turma-Avaliacoes (avaliação disponível p/ turma) ─────
CREATE TABLE IF NOT EXISTS turma_avaliacoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  turma_id      INT           NOT NULL,
  avaliacao_id  INT           NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_turma_av (turma_id, avaliacao_id),
  FOREIGN KEY (turma_id)     REFERENCES turmas(id)     ON DELETE CASCADE,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. Tentativas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tentativas (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  avaliacao_id          INT          NOT NULL,
  aluno_id              INT          NOT NULL,
  status                ENUM('em_andamento','concluida','expirada') NOT NULL DEFAULT 'em_andamento',
  respostas             JSON,
  respostas_corrigidas  JSON,
  nota                  FLOAT,
  aprovado              TINYINT(1),
  feedback_ia           TEXT,
  tempo_gasto           INT,
  iniciada_em           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concluida_em          DATETIME,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (aluno_id)     REFERENCES usuarios(id)   ON DELETE CASCADE,
  INDEX idx_avaliacao (avaliacao_id),
  INDEX idx_aluno     (aluno_id),
  INDEX idx_status    (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. Materiais ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materiais (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200)  NOT NULL,
  descricao     TEXT,
  tipo          ENUM('link','youtube','pdf','imagem','texto') NOT NULL DEFAULT 'link',
  url           TEXT,
  conteudo      LONGTEXT,
  base64        LONGTEXT,
  file_name     VARCHAR(255),
  file_size     INT,
  disciplina_id INT,
  professor_id  INT           NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id)  REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  INDEX idx_disciplina (disciplina_id),
  INDEX idx_tipo       (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 14. Avisos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avisos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200)  NOT NULL,
  corpo         TEXT          NOT NULL,
  professor_id  INT           NOT NULL,
  turma_id      INT,
  fixado        TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (turma_id)     REFERENCES turmas(id)   ON DELETE SET NULL,
  INDEX idx_turma (turma_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. RAG Documentos ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rag_documentos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200)  NOT NULL,
  disciplina_id INT,
  professor_id  INT,
  tipo          VARCHAR(50),
  status        VARCHAR(50)   DEFAULT 'indexado',
  total_chunks  INT           DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 16. RAG Contextos (chunks) ───────────────────────────────
CREATE TABLE IF NOT EXISTS rag_contextos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200),
  conteudo      MEDIUMTEXT    NOT NULL,
  embedding     JSON,
  tags          JSON,
  doc_id        VARCHAR(100),
  disciplina_id INT,
  uso_count     INT           NOT NULL DEFAULT 0,
  tipo_fonte    VARCHAR(50),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  INDEX idx_doc       (doc_id),
  INDEX idx_disciplina(disciplina_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 17. Atividades ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atividades (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  titulo                VARCHAR(200) NOT NULL,
  descricao             TEXT,
  tipo                  VARCHAR(50)  DEFAULT 'entrega',
  professor_id          INT          NOT NULL,
  turma_id              INT,
  disciplina_id         INT,
  data_entrega          DATETIME,
  aceita_apos_prazo     TINYINT(1)   DEFAULT 0,
  nota_maxima           FLOAT        DEFAULT 10,
  status                VARCHAR(50)  DEFAULT 'ativa',
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id)  REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (turma_id)      REFERENCES turmas(id)      ON DELETE SET NULL,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE SET NULL,
  INDEX idx_turma    (turma_id),
  INDEX idx_professor(professor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 18. Entregas de Atividade ────────────────────────────────
CREATE TABLE IF NOT EXISTS entregas_atividade (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  atividade_id  INT           NOT NULL,
  aluno_id      INT           NOT NULL,
  arquivo_base64 LONGTEXT,
  arquivo_nome  VARCHAR(255),
  arquivo_tipo  VARCHAR(100),
  arquivo_tamanho INT,
  comentario    TEXT,
  nota          FLOAT,
  feedback      TEXT,
  status        ENUM('entregue','corrigida','atrasada') NOT NULL DEFAULT 'entregue',
  entregue_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  corrigido_em  DATETIME,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE,
  FOREIGN KEY (aluno_id)     REFERENCES usuarios(id)   ON DELETE CASCADE,
  INDEX idx_atividade (atividade_id),
  INDEX idx_aluno     (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 19. Medalhas Config ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS medalhas_config (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(100)  NOT NULL,
  descricao     TEXT,
  icone         VARCHAR(20),
  tipo          VARCHAR(50),
  criterio      VARCHAR(100),
  valor         FLOAT,
  xp_bonus      INT           NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 20. Medalhas do Aluno ────────────────────────────────────
CREATE TABLE IF NOT EXISTS medalhas_aluno (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT           NOT NULL,
  medalha_id    INT           NOT NULL,
  conquistada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_aluno_medalha (aluno_id, medalha_id),
  FOREIGN KEY (aluno_id)  REFERENCES usuarios(id)        ON DELETE CASCADE,
  FOREIGN KEY (medalha_id) REFERENCES medalhas_config(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 21. Missoes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200)  NOT NULL,
  descricao     TEXT,
  icone         VARCHAR(20),
  tipo          ENUM('diaria','semanal','recorrente') DEFAULT 'diaria',
  meta_tipo     VARCHAR(100),
  meta_valor    INT,
  xp_recompensa INT           NOT NULL DEFAULT 100,
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 22. Missoes do Aluno ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS missoes_aluno (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT           NOT NULL,
  missao_id     INT           NOT NULL,
  progresso     INT           NOT NULL DEFAULT 0,
  status        ENUM('em_progresso','concluida','expirada') DEFAULT 'em_progresso',
  concluida_em  DATETIME,
  data_ref      DATE,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aluno_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (missao_id) REFERENCES missoes(id)  ON DELETE CASCADE,
  INDEX idx_aluno  (aluno_id),
  INDEX idx_missao (missao_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

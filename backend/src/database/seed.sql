-- ============================================================
-- RSC Academy — SEED COMPLETO (phpMyAdmin)
-- Banco: u429575031_rsc_academy
--
-- COMO USAR:
--   phpMyAdmin → selecione o banco → aba SQL → cole tudo → Executar
--
-- SENHAS:
--   admin@rsc.edu         → Admin@123
--   ana@rsc.edu           → Prof@123
--   carlos@rsc.edu        → Prof@123
--   lucas@aluno.rsc.edu   → Aluno@123
--   sofia@aluno.rsc.edu   → Aluno@123
--   mariana@aluno.rsc.edu → Aluno@123
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. USUÁRIOS ──────────────────────────────────────────────
INSERT IGNORE INTO `usuarios`
  (`nome`, `email`, `senha_hash`, `perfil`, `status`, `theta`, `xp_total`, `nivel`, `streak_dias`, `created_at`, `updated_at`)
VALUES
  ('Administrador RSC',
   'admin@rsc.edu',
   '$2a$12$JTz0Z8dXHEY8BZ.sxs4QtesTxQGITV54ATAmuup//BYyNxXazZoEC',
   'admin', 'ativo', 0, 0, 1, 0,
   NOW(), NOW()),

  ('Prof. Ana Beatriz',
   'ana@rsc.edu',
   '$2a$12$NLBToG8bKHnZEIjHU5DKluh4b14y2pOVSYqDVHkzSt3012fKSI4su',
   'professor', 'ativo', 0, 0, 1, 0,
   NOW(), NOW()),

  ('Prof. Carlos Silva',
   'carlos@rsc.edu',
   '$2a$12$ztOyUrkQ.SfLrtvNIA6E5e/eI1dbqlgtY6sdgIf76Tmldo2pP7FPG',
   'professor', 'ativo', 0, 0, 1, 0,
   NOW(), NOW()),

  ('Lucas Andrade',
   'lucas@aluno.rsc.edu',
   '$2a$12$Il7Mc7ObsOrB6/DBf29pc.vMGAYINJUXHlAb2ivvCwh/lmGtujAFS',
   'aluno', 'ativo', 0, 0, 1, 0,
   NOW(), NOW()),

  ('Sofia Mendes',
   'sofia@aluno.rsc.edu',
   '$2a$12$BZurtG1GlP3iYWPNB1F5nufUbrawj0nfIbmFDkyrmYi2J2fdlIf/e',
   'aluno', 'ativo', 0, 0, 1, 0,
   NOW(), NOW()),

  ('Mariana Costa',
   'mariana@aluno.rsc.edu',
   '$2a$12$lSd.WGo3cvjtQqNqcQHBT.tHbLcozL/zH1ilhAsF/hb0AWx4aM8aS',
   'aluno', 'pendente', 0, 0, 1, 0,
   NOW(), NOW());

-- ── 2. DISCIPLINAS ───────────────────────────────────────────
INSERT IGNORE INTO `disciplinas`
  (`nome`, `descricao`, `professor_id`, `codigo`, `carga_horaria`, `ativo`, `created_at`, `updated_at`)
VALUES
  ('Programação I',
   'Fundamentos de lógica e algoritmos em Python',
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   'PROG1', 60, 1, NOW(), NOW()),

  ('Programação II',
   'Orientação a objetos e padrões de projeto',
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   'PROG2', 60, 1, NOW(), NOW());

-- ── 3. TURMAS ────────────────────────────────────────────────
INSERT IGNORE INTO `turmas`
  (`nome`, `descricao`, `professor_id`, `codigo`, `ativo`, `created_at`, `updated_at`)
VALUES
  ('Turma A — 2025', 'Turma principal do semestre',
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   'TURMA-A', 1, NOW(), NOW()),

  ('Turma B — 2025', 'Turma vespertina',
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   'TURMA-B', 1, NOW(), NOW());

-- ── 4. MATRICULAR ALUNOS NA TURMA A ─────────────────────────
INSERT IGNORE INTO `aluno_turma`
  (`aluno_id`, `turma_id`, `status`, `created_at`, `updated_at`)
VALUES
  ((SELECT id FROM usuarios WHERE email = 'lucas@aluno.rsc.edu'),
   (SELECT id FROM turmas WHERE codigo = 'TURMA-A'),
   'ativo', NOW(), NOW()),

  ((SELECT id FROM usuarios WHERE email = 'sofia@aluno.rsc.edu'),
   (SELECT id FROM turmas WHERE codigo = 'TURMA-A'),
   'ativo', NOW(), NOW()),

  ((SELECT id FROM usuarios WHERE email = 'mariana@aluno.rsc.edu'),
   (SELECT id FROM turmas WHERE codigo = 'TURMA-A'),
   'ativo', NOW(), NOW());

-- ── 5. TURMA-DISCIPLINAS ─────────────────────────────────────
INSERT IGNORE INTO `turma_disciplinas`
  (`turma_id`, `disciplina_id`, `created_at`, `updated_at`)
VALUES
  ((SELECT id FROM turmas WHERE codigo = 'TURMA-A'),
   (SELECT id FROM disciplinas WHERE codigo = 'PROG1'),
   NOW(), NOW()),

  ((SELECT id FROM turmas WHERE codigo = 'TURMA-A'),
   (SELECT id FROM disciplinas WHERE codigo = 'PROG2'),
   NOW(), NOW()),

  ((SELECT id FROM turmas WHERE codigo = 'TURMA-B'),
   (SELECT id FROM disciplinas WHERE codigo = 'PROG2'),
   NOW(), NOW());

-- ── 6. TRILHAS ───────────────────────────────────────────────
INSERT IGNORE INTO `trilhas`
  (`nome`, `descricao`, `disciplina_id`, `professor_id`, `ordem`, `xp_total`, `ativo`, `created_at`, `updated_at`)
VALUES
  ('Algoritmos Básicos',
   'Variáveis, laços e funções',
   (SELECT id FROM disciplinas WHERE codigo = 'PROG1'),
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   1, 450, 1, NOW(), NOW()),

  ('Estruturas de Dados',
   'Arrays, listas e árvores',
   (SELECT id FROM disciplinas WHERE codigo = 'PROG1'),
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   2, 600, 1, NOW(), NOW()),

  ('POO Avançada',
   'Herança, polimorfismo e interfaces',
   (SELECT id FROM disciplinas WHERE codigo = 'PROG2'),
   (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
   1, 750, 1, NOW(), NOW());

-- ── 7. QUESTÕES ──────────────────────────────────────────────
INSERT IGNORE INTO `questoes`
  (`trilha_id`, `professor_id`, `tipo`, `enunciado`, `alternativas`, `gabarito`,
   `xp`, `tri`, `rag_tags`, `uso`, `ativo`, `created_at`, `updated_at`)
VALUES
  (
    (SELECT id FROM trilhas WHERE nome = 'Algoritmos Básicos'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'multipla_escolha',
    'Qual das opções abaixo é um tipo de dado primitivo em Python?',
    '["int","lista","dicionário","tupla"]',
    '0',
    80,
    '{"modelo":"3PL","a":1.2,"b":0.0,"c":0.25,"status":"provisorio","total_respostas":0}',
    '["programação"]', 'ambos', 1, NOW(), NOW()
  ),
  (
    (SELECT id FROM trilhas WHERE nome = 'Algoritmos Básicos'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'verdadeiro_falso',
    'Em Python, uma variável deve ser declarada com seu tipo antes de ser usada.',
    NULL,
    'false',
    50,
    '{"modelo":"1PL","a":1.0,"b":-1.0,"c":0,"status":"provisorio","total_respostas":0}',
    '["programação"]', 'ambos', 1, NOW(), NOW()
  ),
  (
    (SELECT id FROM trilhas WHERE nome = 'Algoritmos Básicos'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'preenchimento',
    'Complete: Em Python, para criar um laço que repete 5 vezes, usamos: ___ i in range(5):',
    NULL,
    '"for"',
    70,
    '{"modelo":"2PL","a":1.5,"b":-0.5,"c":0,"status":"provisorio","total_respostas":0}',
    '["programação"]', 'ambos', 1, NOW(), NOW()
  ),
  (
    (SELECT id FROM trilhas WHERE nome = 'Estruturas de Dados'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'multipla_escolha',
    'Qual estrutura de dados segue o princípio LIFO (Last In, First Out)?',
    '["Fila","Pilha","Array","Lista Ligada"]',
    '1',
    100,
    '{"modelo":"2PL","a":1.3,"b":0.5,"c":0,"status":"provisorio","total_respostas":0}',
    '["estruturas"]', 'ambos', 1, NOW(), NOW()
  ),
  (
    (SELECT id FROM trilhas WHERE nome = 'POO Avançada'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'dissertativa',
    'Explique a diferença entre herança e composição em POO. Dê um exemplo de cada.',
    NULL,
    '"herança|composição|exemplo"',
    150,
    '{"modelo":"GRM","a":1.4,"b":1.2,"c":0,"status":"provisorio","total_respostas":0}',
    '["poo"]', 'ambos', 1, NOW(), NOW()
  ),
  (
    (SELECT id FROM trilhas WHERE nome = 'POO Avançada'),
    (SELECT id FROM usuarios WHERE email = 'ana@rsc.edu'),
    'multipla_escolha',
    'Qual princípio SOLID garante que uma classe deve ter apenas uma razão para mudar?',
    '["Open/Closed","Single Responsibility","Liskov Substitution","Interface Segregation"]',
    '1',
    100,
    '{"modelo":"3PL","a":1.8,"b":0.5,"c":0.2,"status":"provisorio","total_respostas":0}',
    '["poo","solid"]', 'ambos', 1, NOW(), NOW()
  );

-- ── 8. MEDALHAS CONFIG ───────────────────────────────────────
INSERT IGNORE INTO `medalhas_config`
  (`nome`, `descricao`, `icone`, `tipo`, `criterio`, `valor`, `xp_bonus`, `created_at`, `updated_at`)
VALUES
  ('Primeira Resposta', 'Respondeu sua primeira questão',  '🎯', 'questao',  'total_respostas', 1,    50,  NOW(), NOW()),
  ('Sequência de 3',    '3 respostas corretas seguidas',   '🔥', 'streak',   'streak',          3,    100, NOW(), NOW()),
  ('Mestre do XP',      'Acumulou 500 XP',                 '⭐', 'xp',       'xp_total',        500,  200, NOW(), NOW()),
  ('Trilha Completa',   'Completou uma trilha inteira',    '🗺', 'trilha',   'trilha_completa', 1,    300, NOW(), NOW()),
  ('Estudioso',         'Respondeu 20 questões',           '📚', 'questao',  'total_respostas', 20,   150, NOW(), NOW()),
  ('Expert',            'Theta acima de 1.0',              '💎', 'theta',    'theta',           1.0,  400, NOW(), NOW()),
  ('Nota 10',           'Tirou 10 em uma avaliação',       '🏆', 'avaliacao','nota_maxima',     10,   500, NOW(), NOW());

-- ── 9. MISSÕES ───────────────────────────────────────────────
INSERT IGNORE INTO `missoes`
  (`titulo`, `descricao`, `icone`, `tipo`, `meta_tipo`, `meta_valor`, `xp_recompensa`, `ativo`, `created_at`, `updated_at`)
VALUES
  ('Missão Diária: 5 Questões',      'Responda 5 questões hoje',          '🎯', 'diaria',    'total_respostas', 5, 100, 1, NOW(), NOW()),
  ('Missão Semanal: Trilha Completa', 'Complete uma trilha esta semana',   '🗺', 'semanal',   'trilha_completa', 1, 500, 1, NOW(), NOW()),
  ('Missão: 3 Corretas Seguidas',     'Acerte 3 questões em sequência',    '🔥', 'recorrente','streak',          3, 150, 1, NOW(), NOW());

-- ── 10. RAG CONTEXTOS (base de conhecimento inicial) ─────────
INSERT IGNORE INTO `rag_contextos`
  (`titulo`, `conteudo`, `tags`, `uso_count`, `created_at`, `updated_at`)
VALUES
  ('Tipos de dados Python',
   'Python possui tipos primitivos: int, float, str, bool. Tipos compostos: list, tuple, dict, set.',
   '["python","tipos"]', 0, NOW(), NOW()),

  ('POO — Conceitos',
   'Classe: template. Objeto: instância. Herança: reutilização. Polimorfismo: mesma interface, comportamentos diferentes.',
   '["poo","herança"]', 0, NOW(), NOW()),

  ('Estruturas de dados',
   'Array: acesso O(1). Lista ligada: inserção O(1). Pilha: LIFO. Fila: FIFO.',
   '["estruturas"]', 0, NOW(), NOW());

-- ── REATIVAR FK ───────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── VERIFICAR RESULTADO ───────────────────────────────────────
SELECT 'usuarios'        AS tabela, COUNT(*) AS total FROM usuarios
UNION ALL
SELECT 'disciplinas',    COUNT(*) FROM disciplinas
UNION ALL
SELECT 'turmas',         COUNT(*) FROM turmas
UNION ALL
SELECT 'aluno_turma',    COUNT(*) FROM aluno_turma
UNION ALL
SELECT 'trilhas',        COUNT(*) FROM trilhas
UNION ALL
SELECT 'questoes',       COUNT(*) FROM questoes
UNION ALL
SELECT 'medalhas_config',COUNT(*) FROM medalhas_config
UNION ALL
SELECT 'missoes',        COUNT(*) FROM missoes
UNION ALL
SELECT 'rag_contextos',  COUNT(*) FROM rag_contextos;

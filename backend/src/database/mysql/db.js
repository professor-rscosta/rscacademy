/**
 * RSC Academy — MySQL Database Layer
 * Substitui o banco JSON (init.js) com compatibilidade total de API
 * Todas as funções dbFind*, dbInsert, dbUpdate, dbDelete mantidas
 */

const mysql = require('mysql2/promise');

// ── Pool de conexões ─────────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'rsc_academy',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '-03:00',
});

// ── Helpers de serialização JSON ─────────────────────────────
// MySQL retorna JSON como string — deserializamos aqui
const JSON_COLS = {
  questoes:         ['alternativas','gabarito','midias','rag_tags','tri'],
  avaliacoes:       ['questoes'],
  tentativas:       ['respostas','respostas_corrigidas'],
  respostas:        ['resposta'],
  materiais:        [],
  rag_contextos:    ['embedding','tags'],
};

function parseRow(table, row) {
  if (!row) return null;
  const cols = JSON_COLS[table] || [];
  const out = { ...row };
  for (const col of cols) {
    if (out[col] !== undefined && out[col] !== null && typeof out[col] === 'string') {
      try { out[col] = JSON.parse(out[col]); } catch { /* leave as-is */ }
    }
  }
  // Convert tinyint to boolean for common fields
  for (const boolCol of ['ativo','correto','aprovado','fixado','aceita_apos_prazo']) {
    if (out[boolCol] !== undefined) out[boolCol] = Boolean(out[boolCol]);
  }
  return out;
}

function parseRows(table, rows) {
  return rows.map(r => parseRow(table, r));
}

function serializeRow(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Buffer.isBuffer(v)) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── now() helper ─────────────────────────────────────────────
function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function gerarCodigo(n = 6) {
  return Math.random().toString(36).slice(2, 2 + n).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// API PÚBLICA — compatível com a API do init.js original
// ─────────────────────────────────────────────────────────────

async function dbFindAll(table) {
  const [rows] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY id DESC`);
  return parseRows(table, rows);
}

async function dbFindById(table, id) {
  const [rows] = await pool.query(
    `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [Number(id)]
  );
  return parseRow(table, rows[0] || null);
}

async function dbFindOne(table, pred) {
  // pred is a JS function — we fetch all and filter in memory
  // For performance-critical paths, use raw SQL in repositories
  const rows = await dbFindAll(table);
  return rows.find(pred) || null;
}

async function dbFindWhere(table, pred) {
  const rows = await dbFindAll(table);
  return rows.filter(pred);
}

async function dbInsert(table, fields) {
  const data = serializeRow({
    ...fields,
    created_at: now(),
    updated_at: now(),
  });
  const [result] = await pool.query(`INSERT INTO \`${table}\` SET ?`, [data]);
  return dbFindById(table, result.insertId);
}

async function dbUpdate(table, id, fields) {
  const data = serializeRow({ ...fields, updated_at: now() });
  await pool.query(
    `UPDATE \`${table}\` SET ? WHERE id = ?`, [data, Number(id)]
  );
  return dbFindById(table, id);
}

async function dbDelete(table, id) {
  const [result] = await pool.query(
    `DELETE FROM \`${table}\` WHERE id = ?`, [Number(id)]
  );
  return result.affectedRows > 0;
}

async function dbDeleteWhere(table, pred) {
  // For safety, fetch then delete by id
  const rows = await dbFindWhere(table, pred);
  if (!rows.length) return 0;
  const ids = rows.map(r => r.id);
  const [result] = await pool.query(
    `DELETE FROM \`${table}\` WHERE id IN (?)`, [ids]
  );
  return result.affectedRows;
}

// ── Raw SQL helper (para repositórios avançados) ─────────────
async function dbQuery(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function dbQueryOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

// ─────────────────────────────────────────────────────────────
// INIT — seed inicial idêntico ao original
// ─────────────────────────────────────────────────────────────
async function initDatabase() {
  const bcrypt = require('bcryptjs');

  // Test connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ MySQL conectado');
  } catch (err) {
    console.error('❌ MySQL erro de conexão:', err.message);
    throw err;
  }

  // Seed: usuarios
  const [usersCheck] = await pool.query('SELECT COUNT(*) as n FROM usuarios');
  if (usersCheck[0].n === 0) {
    const seed = [
      { perfil:'admin',     status:'ativo',    nome:'Administrador RSC',  email:'admin@rsc.edu',         senha:'Admin@123' },
      { perfil:'professor', status:'ativo',    nome:'Prof. Ana Beatriz',  email:'ana@rsc.edu',           senha:'Prof@123'  },
      { perfil:'professor', status:'ativo',    nome:'Prof. Carlos Silva', email:'carlos@rsc.edu',        senha:'Prof@123'  },
      { perfil:'aluno',     status:'ativo',    nome:'Lucas Andrade',      email:'lucas@aluno.rsc.edu',   senha:'Aluno@123' },
      { perfil:'aluno',     status:'ativo',    nome:'Sofia Mendes',       email:'sofia@aluno.rsc.edu',   senha:'Aluno@123' },
      { perfil:'aluno',     status:'pendente', nome:'Mariana Costa',      email:'mariana@aluno.rsc.edu', senha:'Aluno@123' },
    ];
    for (const u of seed) {
      const senha_hash = await bcrypt.hash(u.senha, 12);
      await pool.query(
        'INSERT INTO usuarios (nome,email,senha_hash,perfil,status) VALUES (?,?,?,?,?)',
        [u.nome, u.email, senha_hash, u.perfil, u.status]
      );
    }
    console.log('✅ Usuários seed | admin@rsc.edu/Admin@123 | ana@rsc.edu/Prof@123 | lucas@aluno.rsc.edu/Aluno@123');
  }

  // Seed: disciplinas
  const [discCheck] = await pool.query('SELECT COUNT(*) as n FROM disciplinas');
  if (discCheck[0].n === 0) {
    const [prof] = await pool.query("SELECT id FROM usuarios WHERE email='ana@rsc.edu' LIMIT 1");
    const pid = prof[0]?.id || 2;
    await pool.query(
      'INSERT INTO disciplinas (nome,descricao,professor_id,codigo,carga_horaria) VALUES (?,?,?,?,?),(?,?,?,?,?)',
      ['Programação I','Fundamentos de lógica e algoritmos em Python',pid,'PROG1',60,
       'Programação II','Orientação a objetos e padrões de projeto',pid,'PROG2',60]
    );
    console.log('✅ Disciplinas seed criadas.');
  }

  // Seed: turmas
  const [turmaCheck] = await pool.query('SELECT COUNT(*) as n FROM turmas');
  if (turmaCheck[0].n === 0) {
    const [prof] = await pool.query("SELECT id FROM usuarios WHERE email='ana@rsc.edu' LIMIT 1");
    const pid = prof[0]?.id || 2;
    await pool.query(
      'INSERT INTO turmas (nome,descricao,professor_id,codigo) VALUES (?,?,?,?),(?,?,?,?)',
      ['Turma A - 2025','Turma principal do semestre',pid,'TURMA-A',
       'Turma B - 2025','Turma vespertina',pid,'TURMA-B']
    );
    // Matricular alunos
    const [alunos] = await pool.query("SELECT id FROM usuarios WHERE perfil='aluno'");
    const [turma]  = await pool.query("SELECT id FROM turmas LIMIT 1");
    if (turma[0] && alunos.length) {
      for (const a of alunos) {
        await pool.query(
          'INSERT IGNORE INTO aluno_turma (aluno_id,turma_id) VALUES (?,?)',
          [a.id, turma[0].id]
        );
      }
    }
    console.log('✅ Turmas e matrículas seed criadas.');
  }

  // Seed: trilhas
  const [trilhaCheck] = await pool.query('SELECT COUNT(*) as n FROM trilhas');
  if (trilhaCheck[0].n === 0) {
    const [prof]  = await pool.query("SELECT id FROM usuarios WHERE email='ana@rsc.edu' LIMIT 1");
    const [discs] = await pool.query('SELECT id FROM disciplinas ORDER BY id LIMIT 2');
    const pid = prof[0]?.id || 2;
    const d1  = discs[0]?.id || 1;
    const d2  = discs[1]?.id || 2;
    await pool.query(
      'INSERT INTO trilhas (nome,descricao,disciplina_id,professor_id,ordem,xp_total) VALUES (?,?,?,?,?,?),(?,?,?,?,?,?),(?,?,?,?,?,?)',
      ['Algoritmos Básicos','Variáveis, laços e funções',d1,pid,1,450,
       'Estruturas de Dados','Arrays, listas e árvores',d1,pid,2,600,
       'POO Avançada','Herança, polimorfismo e interfaces',d2,pid,1,750]
    );
    console.log('✅ Trilhas seed criadas.');
  }

  // Seed: questoes
  const [questCheck] = await pool.query('SELECT COUNT(*) as n FROM questoes');
  if (questCheck[0].n === 0) {
    const [prof]   = await pool.query("SELECT id FROM usuarios WHERE email='ana@rsc.edu' LIMIT 1");
    const [trilhas] = await pool.query('SELECT id FROM trilhas ORDER BY id LIMIT 3');
    const pid = prof[0]?.id || 2;
    const t1  = trilhas[0]?.id || 1;
    const t2  = trilhas[1]?.id || 2;
    const t3  = trilhas[2]?.id || 3;

    const questions = [
      [t1, pid, 'multipla_escolha', 'Qual das opções abaixo é um tipo de dado primitivo em Python?',
       JSON.stringify(['int','lista','dicionário','tupla']), JSON.stringify(0), 80,
       JSON.stringify({modelo:'3PL',a:1.2,b:0.0,c:0.25,status:'provisorio',total_respostas:0})],
      [t1, pid, 'verdadeiro_falso', 'Em Python, uma variável deve ser declarada com seu tipo antes de ser usada.',
       null, JSON.stringify(false), 50,
       JSON.stringify({modelo:'1PL',a:1.0,b:-1.0,c:0,status:'provisorio',total_respostas:0})],
      [t1, pid, 'preenchimento', 'Complete: Em Python, para criar um laço que repete 5 vezes, usamos: ___ i in range(5):',
       null, JSON.stringify('for'), 70,
       JSON.stringify({modelo:'2PL',a:1.5,b:-0.5,c:0,status:'provisorio',total_respostas:0})],
      [t2, pid, 'associacao', 'Associe cada estrutura à sua característica:',
       JSON.stringify({esquerda:['Array','Lista Ligada','Pilha','Fila'],direita:['FIFO','LIFO','Acesso indexado','Inserção dinâmica']}),
       JSON.stringify({0:2,1:3,2:1,3:0}), 120,
       JSON.stringify({modelo:'2PL',a:1.3,b:0.8,c:0,status:'provisorio',total_respostas:0})],
      [t2, pid, 'ordenacao', 'Ordene as etapas do Bubble Sort:',
       JSON.stringify(['Comparar adjacentes','Repetir até sem trocas','Trocar se fora de ordem','Percorrer o array']),
       JSON.stringify([3,0,2,1]), 100,
       JSON.stringify({modelo:'2PL',a:1.1,b:1.0,c:0,status:'provisorio',total_respostas:0})],
      [t3, pid, 'dissertativa', 'Explique a diferença entre herança e composição em POO. Dê um exemplo de cada.',
       null, JSON.stringify('herança|composição|exemplo'), 150,
       JSON.stringify({modelo:'GRM',a:1.4,b:1.2,c:0,status:'provisorio',total_respostas:0})],
      [t3, pid, 'multipla_escolha', 'Qual princípio SOLID garante que uma classe deve ter apenas uma razão para mudar?',
       JSON.stringify(['Open/Closed','Single Responsibility','Liskov Substitution','Interface Segregation']),
       JSON.stringify(1), 100,
       JSON.stringify({modelo:'3PL',a:1.8,b:0.5,c:0.2,status:'provisorio',total_respostas:0})],
    ];

    for (const q of questions) {
      await pool.query(
        'INSERT INTO questoes (trilha_id,professor_id,tipo,enunciado,alternativas,gabarito,xp,tri,rag_tags) VALUES (?,?,?,?,?,?,?,?,?)',
        [...q, JSON.stringify(['programação'])]
      );
    }
    console.log('✅ Questões seed criadas (7).');
  }

  // Seed: medalhas_config
  const [medalCheck] = await pool.query('SELECT COUNT(*) as n FROM medalhas_config');
  if (medalCheck[0].n === 0) {
    const medalhas = [
      ['Primeira Resposta','Respondeu sua primeira questão','🎯','questao','total_respostas',1,50],
      ['Sequência de 3','3 respostas corretas seguidas','🔥','streak','streak',3,100],
      ['Mestre do XP','Acumulou 500 XP','⭐','xp','xp_total',500,200],
      ['Trilha Completa','Completou uma trilha inteira','🗺️','trilha','trilha_completa',1,300],
      ['Estudioso','Respondeu 20 questões','📚','questao','total_respostas',20,150],
      ['Expert','Theta acima de 1.0','💎','theta','theta',1.0,400],
      ['Nota 10','Tirou 10 em uma avaliação','🏆','avaliacao','nota_maxima',10,500],
    ];
    for (const m of medalhas) {
      await pool.query(
        'INSERT INTO medalhas_config (nome,descricao,icone,tipo,criterio,valor,xp_bonus) VALUES (?,?,?,?,?,?,?)',
        m
      );
    }
    console.log('✅ Medalhas config criadas (7).');
  }

  // Seed: missoes
  const [missaoCheck] = await pool.query('SELECT COUNT(*) as n FROM missoes');
  if (missaoCheck[0].n === 0) {
    await pool.query(
      'INSERT INTO missoes (titulo,descricao,icone,tipo,meta_tipo,meta_valor,xp_recompensa) VALUES (?,?,?,?,?,?,?),(?,?,?,?,?,?,?),(?,?,?,?,?,?,?)',
      ['Missão Diária: 5 Questões','Responda 5 questões hoje','🎯','diaria','total_respostas',5,100,
       'Missão Semanal: Trilha Completa','Complete uma trilha esta semana','🗺️','semanal','trilha_completa',1,500,
       'Missão: 3 Corretas Seguidas','Acerte 3 questões em sequência','🔥','recorrente','streak',3,150]
    );
    console.log('✅ Missões criadas (3).');
  }

  // Seed: rag_contextos
  const [ragCheck] = await pool.query('SELECT COUNT(*) as n FROM rag_contextos');
  if (ragCheck[0].n === 0) {
    const ctxs = [
      ['Tipos de dados Python','Python possui tipos primitivos: int, float, str, bool. Tipos compostos: list, tuple, dict, set.',JSON.stringify(['python','tipos'])],
      ['POO — Conceitos','Classe: template. Objeto: instância. Herança: reutilização. Polimorfismo: mesma interface, comportamentos diferentes.',JSON.stringify(['poo','herança'])],
      ['Estruturas de dados','Array: acesso O(1). Lista ligada: inserção O(1). Pilha: LIFO. Fila: FIFO.',JSON.stringify(['estruturas'])],
    ];
    for (const c of ctxs) {
      await pool.query('INSERT INTO rag_contextos (titulo,conteudo,tags) VALUES (?,?,?)', c);
    }
  }

  console.log('✅ MySQL iniciado com sucesso!\n');
}

module.exports = {
  pool,
  initDatabase,
  gerarCodigo,
  dbQuery,
  dbQueryOne,
  dbFindAll,
  dbFindById,
  dbFindOne,
  dbFindWhere,
  dbInsert,
  dbUpdate,
  dbDelete,
  dbDeleteWhere,
  // Manter compatibilidade com código que chama readDb/writeDb (rag.service etc.)
  readDb: () => { throw new Error('readDb() não disponível no MySQL. Use dbQuery().'); },
  writeDb: () => { throw new Error('writeDb() não disponível no MySQL. Use dbInsert/dbUpdate().'); },
};

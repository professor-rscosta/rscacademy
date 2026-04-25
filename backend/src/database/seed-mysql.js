/**
 * RSC Academy — Script de Seed MySQL
 * Cria usuários admin, professor e aluno + dados iniciais
 *
 * USO:
 *   No Hostinger (SSH):
 *     cd ~/domains/rscacademy.com.br/nodejs/backend
 *     node src/database/seed-mysql.js
 *
 *   Local (XAMPP):
 *     cd C:\xampp\htdocs\rsc-academy\backend
 *     node src/database/seed-mysql.js
 */

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ── Conexão ──────────────────────────────────────────────────
async function connect() {
  return mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'rsc_academy',
    charset:  'utf8mb4',
  });
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 RSC Academy — Seed MySQL\n');

  let conn;
  try {
    conn = await connect();
    console.log('✅ Conectado ao MySQL:', process.env.DB_NAME || 'rsc_academy');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    console.error('   Verifique o arquivo .env');
    process.exit(1);
  }

  // ── 1. USUÁRIOS ────────────────────────────────────────────
  const usuarios = [
    {
      nome:   'Administrador RSC',
      email:  'admin@rsc.edu',
      senha:  'Admin@123',
      perfil: 'admin',
      status: 'ativo',
    },
    {
      nome:   'Prof. Ana Beatriz',
      email:  'ana@rsc.edu',
      senha:  'Prof@123',
      perfil: 'professor',
      status: 'ativo',
    },
    {
      nome:   'Prof. Carlos Silva',
      email:  'carlos@rsc.edu',
      senha:  'Prof@123',
      perfil: 'professor',
      status: 'ativo',
    },
    {
      nome:   'Lucas Andrade',
      email:  'lucas@aluno.rsc.edu',
      senha:  'Aluno@123',
      perfil: 'aluno',
      status: 'ativo',
    },
    {
      nome:   'Sofia Mendes',
      email:  'sofia@aluno.rsc.edu',
      senha:  'Aluno@123',
      perfil: 'aluno',
      status: 'ativo',
    },
    {
      nome:   'Mariana Costa',
      email:  'mariana@aluno.rsc.edu',
      senha:  'Aluno@123',
      perfil: 'aluno',
      status: 'pendente',
    },
  ];

  console.log('\n👤 Criando usuários...');
  const userIds = {};

  for (const u of usuarios) {
    // Verificar se já existe
    const [exists] = await conn.query(
      'SELECT id FROM usuarios WHERE email = ?', [u.email]
    );
    if (exists.length > 0) {
      console.log(`   ⏭  ${u.email} já existe (id: ${exists[0].id})`);
      userIds[u.email] = exists[0].id;
      continue;
    }

    const senha_hash = await bcrypt.hash(u.senha, 12);
    const [result] = await conn.query(
      `INSERT INTO usuarios
         (nome, email, senha_hash, perfil, status, theta, xp_total, nivel, streak_dias, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 1, 0, ?, ?)`,
      [u.nome, u.email, senha_hash, u.perfil, u.status, now(), now()]
    );
    userIds[u.email] = result.insertId;
    console.log(`   ✅ ${u.perfil.padEnd(10)} ${u.email} → id: ${result.insertId} | senha: ${u.senha}`);
  }

  // ── 2. DISCIPLINAS ─────────────────────────────────────────
  console.log('\n📚 Criando disciplinas...');
  const profId = userIds['ana@rsc.edu'];
  const disciplinas = [
    { nome: 'Programação I',  descricao: 'Fundamentos de lógica e algoritmos em Python', codigo: 'PROG1', carga_horaria: 60 },
    { nome: 'Programação II', descricao: 'Orientação a objetos e padrões de projeto',    codigo: 'PROG2', carga_horaria: 60 },
  ];
  const discIds = [];

  for (const d of disciplinas) {
    const [exists] = await conn.query('SELECT id FROM disciplinas WHERE codigo = ?', [d.codigo]);
    if (exists.length > 0) {
      console.log(`   ⏭  ${d.nome} já existe`);
      discIds.push(exists[0].id);
      continue;
    }
    const [r] = await conn.query(
      'INSERT INTO disciplinas (nome, descricao, professor_id, codigo, carga_horaria, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      [d.nome, d.descricao, profId, d.codigo, d.carga_horaria, now(), now()]
    );
    discIds.push(r.insertId);
    console.log(`   ✅ ${d.nome} → id: ${r.insertId}`);
  }

  // ── 3. TURMAS ──────────────────────────────────────────────
  console.log('\n🏫 Criando turmas...');
  const turmas = [
    { nome: 'Turma A — 2025', codigo: 'TURMA-A', descricao: 'Turma principal do semestre' },
    { nome: 'Turma B — 2025', codigo: 'TURMA-B', descricao: 'Turma vespertina' },
  ];
  const turmaIds = [];

  for (const t of turmas) {
    const [exists] = await conn.query('SELECT id FROM turmas WHERE codigo = ?', [t.codigo]);
    if (exists.length > 0) {
      console.log(`   ⏭  ${t.nome} já existe`);
      turmaIds.push(exists[0].id);
      continue;
    }
    const [r] = await conn.query(
      'INSERT INTO turmas (nome, descricao, professor_id, codigo, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      [t.nome, t.descricao, profId, t.codigo, now(), now()]
    );
    turmaIds.push(r.insertId);
    console.log(`   ✅ ${t.nome} → id: ${r.insertId}`);
  }

  // ── 4. MATRICULAR ALUNOS NA TURMA A ────────────────────────
  console.log('\n🎓 Matriculando alunos...');
  const alunos = ['lucas@aluno.rsc.edu', 'sofia@aluno.rsc.edu', 'mariana@aluno.rsc.edu'];
  for (const email of alunos) {
    const alunoId = userIds[email];
    if (!alunoId || !turmaIds[0]) continue;
    try {
      await conn.query(
        'INSERT IGNORE INTO aluno_turma (aluno_id, turma_id, status, created_at, updated_at) VALUES (?,?,?,?,?)',
        [alunoId, turmaIds[0], 'ativo', now(), now()]
      );
      console.log(`   ✅ ${email} → Turma A`);
    } catch (e) {
      console.log(`   ⏭  ${email} já matriculado`);
    }
  }

  // ── 5. TRILHAS ─────────────────────────────────────────────
  console.log('\n🗺️  Criando trilhas...');
  const trilhas = [
    { nome: 'Algoritmos Básicos',  descricao: 'Variáveis, laços e funções',              disciplina_id: discIds[0], ordem: 1, xp_total: 450 },
    { nome: 'Estruturas de Dados', descricao: 'Arrays, listas e árvores',                disciplina_id: discIds[0], ordem: 2, xp_total: 600 },
    { nome: 'POO Avançada',        descricao: 'Herança, polimorfismo e interfaces',       disciplina_id: discIds[1], ordem: 1, xp_total: 750 },
  ];
  const trilhaIds = [];

  for (const t of trilhas) {
    const [exists] = await conn.query('SELECT id FROM trilhas WHERE nome = ? AND professor_id = ?', [t.nome, profId]);
    if (exists.length > 0) {
      console.log(`   ⏭  ${t.nome} já existe`);
      trilhaIds.push(exists[0].id);
      continue;
    }
    const [r] = await conn.query(
      'INSERT INTO trilhas (nome, descricao, disciplina_id, professor_id, ordem, xp_total, ativo, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)',
      [t.nome, t.descricao, t.disciplina_id, profId, t.ordem, t.xp_total, now(), now()]
    );
    trilhaIds.push(r.insertId);
    console.log(`   ✅ ${t.nome} → id: ${r.insertId}`);
  }

  // ── 6. QUESTÕES ────────────────────────────────────────────
  console.log('\n❓ Criando questões...');
  const questoes = [
    {
      trilha_id: trilhaIds[0], tipo: 'multipla_escolha', xp: 80,
      enunciado: 'Qual das opções abaixo é um tipo de dado primitivo em Python?',
      alternativas: ['int','lista','dicionário','tupla'], gabarito: 0,
      tri: { modelo:'3PL', a:1.2, b:0.0, c:0.25, status:'provisorio', total_respostas:0 },
    },
    {
      trilha_id: trilhaIds[0], tipo: 'verdadeiro_falso', xp: 50,
      enunciado: 'Em Python, uma variável deve ser declarada com seu tipo antes de ser usada.',
      alternativas: null, gabarito: false,
      tri: { modelo:'1PL', a:1.0, b:-1.0, c:0, status:'provisorio', total_respostas:0 },
    },
    {
      trilha_id: trilhaIds[0], tipo: 'preenchimento', xp: 70,
      enunciado: 'Complete: Em Python, para criar um laço que repete 5 vezes, usamos: ___ i in range(5):',
      alternativas: null, gabarito: 'for',
      tri: { modelo:'2PL', a:1.5, b:-0.5, c:0, status:'provisorio', total_respostas:0 },
    },
    {
      trilha_id: trilhaIds[1], tipo: 'multipla_escolha', xp: 100,
      enunciado: 'Qual estrutura de dados segue o princípio LIFO (Last In, First Out)?',
      alternativas: ['Fila','Pilha','Array','Lista Ligada'], gabarito: 1,
      tri: { modelo:'2PL', a:1.3, b:0.5, c:0, status:'provisorio', total_respostas:0 },
    },
    {
      trilha_id: trilhaIds[2], tipo: 'dissertativa', xp: 150,
      enunciado: 'Explique a diferença entre herança e composição em POO. Dê um exemplo de cada.',
      alternativas: null, gabarito: 'herança|composição|exemplo',
      tri: { modelo:'GRM', a:1.4, b:1.2, c:0, status:'provisorio', total_respostas:0 },
    },
    {
      trilha_id: trilhaIds[2], tipo: 'multipla_escolha', xp: 100,
      enunciado: 'Qual princípio SOLID garante que uma classe deve ter apenas uma razão para mudar?',
      alternativas: ['Open/Closed','Single Responsibility','Liskov Substitution','Interface Segregation'],
      gabarito: 1,
      tri: { modelo:'3PL', a:1.8, b:0.5, c:0.2, status:'provisorio', total_respostas:0 },
    },
  ];

  const [qExists] = await conn.query('SELECT COUNT(*) as n FROM questoes');
  if (qExists[0].n > 0) {
    console.log(`   ⏭  ${qExists[0].n} questões já existem`);
  } else {
    for (const q of questoes) {
      await conn.query(
        `INSERT INTO questoes
           (trilha_id, professor_id, tipo, enunciado, alternativas, gabarito,
            xp, tri, rag_tags, uso, ativo, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)`,
        [
          q.trilha_id, profId, q.tipo, q.enunciado,
          JSON.stringify(q.alternativas), JSON.stringify(q.gabarito),
          q.xp, JSON.stringify(q.tri),
          JSON.stringify(['programação']), 'ambos',
          now(), now(),
        ]
      );
    }
    console.log(`   ✅ ${questoes.length} questões criadas`);
  }

  // ── 7. MEDALHAS ────────────────────────────────────────────
  console.log('\n🏅 Criando medalhas...');
  const [mExists] = await conn.query('SELECT COUNT(*) as n FROM medalhas_config');
  if (mExists[0].n > 0) {
    console.log(`   ⏭  Medalhas já existem`);
  } else {
    const medalhas = [
      ['Primeira Resposta', 'Respondeu sua primeira questão', '🎯', 'questao', 'total_respostas', 1,   50],
      ['Sequência de 3',    '3 respostas corretas seguidas',  '🔥', 'streak',  'streak',          3,  100],
      ['Mestre do XP',      'Acumulou 500 XP',               '⭐', 'xp',      'xp_total',       500, 200],
      ['Trilha Completa',   'Completou uma trilha inteira',   '🗺️', 'trilha',  'trilha_completa', 1,  300],
      ['Estudioso',         'Respondeu 20 questões',          '📚', 'questao', 'total_respostas', 20, 150],
      ['Expert',            'Theta acima de 1.0',             '💎', 'theta',   'theta',          1.0, 400],
      ['Nota 10',           'Tirou 10 em uma avaliação',      '🏆', 'avaliacao','nota_maxima',    10, 500],
    ];
    for (const m of medalhas) {
      await conn.query(
        'INSERT INTO medalhas_config (nome, descricao, icone, tipo, criterio, valor, xp_bonus, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [...m, now(), now()]
      );
    }
    console.log(`   ✅ ${medalhas.length} medalhas criadas`);
  }

  // ── 8. MISSÕES ─────────────────────────────────────────────
  console.log('\n🎯 Criando missões...');
  const [miExists] = await conn.query('SELECT COUNT(*) as n FROM missoes');
  if (miExists[0].n > 0) {
    console.log(`   ⏭  Missões já existem`);
  } else {
    const missoes = [
      ['Missão Diária: 5 Questões',      'Responda 5 questões hoje',            '🎯', 'diaria',    'total_respostas', 5, 100],
      ['Missão Semanal: Trilha Completa', 'Complete uma trilha esta semana',     '🗺️', 'semanal',   'trilha_completa', 1, 500],
      ['Missão: 3 Corretas Seguidas',     'Acerte 3 questões em sequência',      '🔥', 'recorrente','streak',          3, 150],
    ];
    for (const m of missoes) {
      await conn.query(
        'INSERT INTO missoes (titulo, descricao, icone, tipo, meta_tipo, meta_valor, xp_recompensa, ativo, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)',
        [...m, now(), now()]
      );
    }
    console.log(`   ✅ ${missoes.length} missões criadas`);
  }

  // ── RESUMO ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('✅ SEED CONCLUÍDO!\n');
  console.log('ACESSOS:');
  console.log('  Admin:     admin@rsc.edu       / Admin@123');
  console.log('  Professor: ana@rsc.edu         / Prof@123');
  console.log('  Professor: carlos@rsc.edu      / Prof@123');
  console.log('  Aluno:     lucas@aluno.rsc.edu / Aluno@123');
  console.log('  Aluno:     sofia@aluno.rsc.edu / Aluno@123');
  console.log('═'.repeat(55) + '\n');

  await conn.end();
}

main().catch(err => {
  console.error('\n❌ Erro no seed:', err.message);
  process.exit(1);
});

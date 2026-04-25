/**
 * RSC Academy — Script de Migração JSON → MySQL
 *
 * USO:
 *   1. Configure o .env com as credenciais do MySQL
 *   2. Crie o banco e execute o schema.sql primeiro
 *   3. Execute: node src/database/migrate-json-to-mysql.js
 *
 * O script verifica se os dados já existem antes de inserir (idempotente).
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const JSON_PATH = path.join(__dirname, '../../database/rsc_academy.json');

// ── Conectar ──────────────────────────────────────────────────
async function connect() {
  return mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset:  'utf8mb4',
    multipleStatements: false,
  });
}

// ── Serializar objetos/arrays para JSON string ────────────────
function s(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// ── Converter ISO string para MySQL DATETIME ──────────────────
function dt(v) {
  if (!v) return null;
  try {
    return new Date(v).toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return null;
  }
}

// ── Migrar tabela com log ─────────────────────────────────────
async function migrate(conn, tableName, rows, mapFn, skipIfCount = true) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭  ${tableName}: nenhum dado no JSON.`);
    return 0;
  }
  if (skipIfCount) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) as n FROM \`${tableName}\``);
    if (n > 0) {
      console.log(`  ⏭  ${tableName}: já possui ${n} registros. Pulando.`);
      return 0;
    }
  }
  let count = 0;
  for (const row of rows) {
    const mapped = mapFn(row);
    if (!mapped) continue;
    try {
      const cols = Object.keys(mapped).map(k => `\`${k}\``).join(', ');
      const vals = Object.values(mapped);
      const ph   = vals.map(() => '?').join(', ');
      await conn.query(`INSERT INTO \`${tableName}\` (${cols}) VALUES (${ph})`, vals);
      count++;
    } catch (err) {
      // Skip duplicate key errors silently
      if (err.code !== 'ER_DUP_ENTRY') {
        console.warn(`    ⚠ ${tableName} row ${row.id}: ${err.message.slice(0, 80)}`);
      }
    }
  }
  console.log(`  ✅ ${tableName}: ${count}/${rows.length} registros inseridos.`);
  return count;
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 RSC Academy — Migração JSON → MySQL\n');

  // 1. Verificar se JSON existe
  if (!fs.existsSync(JSON_PATH)) {
    console.log('⚠  Arquivo JSON não encontrado em:', JSON_PATH);
    console.log('   O banco MySQL será inicializado com dados de seed pelo initDatabase().');
    process.exit(0);
  }

  const db = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  console.log('📂 JSON carregado. Tabelas encontradas:', Object.keys(db).filter(k => k !== '_seq').join(', '));

  // 2. Conectar ao MySQL
  let conn;
  try {
    conn = await connect();
    console.log('✅ Conectado ao MySQL:', process.env.DB_NAME, '\n');
  } catch (err) {
    console.error('❌ Falha na conexão MySQL:', err.message);
    console.error('   Verifique as variáveis DB_HOST, DB_USER, DB_PASS, DB_NAME no .env');
    process.exit(1);
  }

  // Disable FK checks during migration
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  // ── usuarios ─────────────────────────────────────────────
  await migrate(conn, 'usuarios', db.usuarios || [], r => ({
    id:           r.id,
    nome:         r.nome,
    email:        r.email,
    senha_hash:   r.senha_hash,
    perfil:       r.perfil || 'aluno',
    status:       r.status || 'ativo',
    foto:         r.foto || null,
    bio:          r.bio || null,
    theta:        r.theta || 0,
    xp_total:     r.xp_total || 0,
    nivel:        r.nivel || 1,
    streak_dias:  r.streak_dias || 0,
    ultimo_acesso: dt(r.ultimo_acesso),
    created_at:   dt(r.created_at) || dt(new Date()),
    updated_at:   dt(r.updated_at) || dt(new Date()),
  }));

  // ── disciplinas ──────────────────────────────────────────
  await migrate(conn, 'disciplinas', db.disciplinas || [], r => ({
    id:           r.id,
    nome:         r.nome,
    descricao:    r.descricao || null,
    professor_id: r.professor_id,
    codigo:       r.codigo || null,
    carga_horaria: r.carga_horaria || 60,
    ativo:        r.ativo !== false ? 1 : 0,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── turmas ───────────────────────────────────────────────
  await migrate(conn, 'turmas', db.turmas || [], r => ({
    id:           r.id,
    nome:         r.nome,
    descricao:    r.descricao || null,
    professor_id: r.professor_id,
    codigo:       r.codigo || r.codigo_acesso || null,
    ativo:        r.ativo !== false ? 1 : 0,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── aluno_turma ──────────────────────────────────────────
  await migrate(conn, 'aluno_turma', db.aluno_turma || [], r => ({
    id:         r.id,
    aluno_id:   r.aluno_id,
    turma_id:   r.turma_id,
    status:     r.status || 'ativo',
    created_at: dt(r.created_at),
    updated_at: dt(r.updated_at),
  }));

  // ── turma_disciplinas ────────────────────────────────────
  await migrate(conn, 'turma_disciplinas', db.turma_disciplinas || [], r => ({
    id:           r.id,
    turma_id:     r.turma_id,
    disciplina_id: r.disciplina_id,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── aluno_disciplina ─────────────────────────────────────
  await migrate(conn, 'aluno_disciplina', db.aluno_disciplina || [], r => ({
    id:           r.id,
    aluno_id:     r.aluno_id,
    disciplina_id: r.disciplina_id,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── trilhas ──────────────────────────────────────────────
  await migrate(conn, 'trilhas', db.trilhas || [], r => ({
    id:           r.id,
    nome:         r.nome,
    descricao:    r.descricao || null,
    disciplina_id: r.disciplina_id || null,
    professor_id: r.professor_id,
    ordem:        r.ordem || 1,
    xp_total:     r.xp_total || 0,
    ativo:        r.ativo !== false ? 1 : 0,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── questoes ─────────────────────────────────────────────
  await migrate(conn, 'questoes', db.questoes || [], r => ({
    id:              r.id,
    trilha_id:       r.trilha_id || null,
    disciplina_id:   r.disciplina_id || null,
    professor_id:    r.professor_id,
    tipo:            r.tipo || 'multipla_escolha',
    enunciado:       r.enunciado,
    alternativas:    s(r.alternativas),
    gabarito:        s(r.gabarito),
    xp:              r.xp || 100,
    midias:          s(r.midias || []),
    rag_tags:        s(r.rag_tags || []),
    habilidade_bncc: r.habilidade_bncc || null,
    instrucoes_correcao: r.instrucoes_correcao || null,
    tri:             s(r.tri || null),
    uso:             r.uso || 'ambos',
    ativo:           r.ativo !== false ? 1 : 0,
    created_at:      dt(r.created_at),
    updated_at:      dt(r.updated_at),
  }));

  // ── respostas ────────────────────────────────────────────
  await migrate(conn, 'respostas', db.respostas || [], r => ({
    id:          r.id,
    aluno_id:    r.aluno_id,
    questao_id:  r.questao_id,
    trilha_id:   r.trilha_id || null,
    resposta:    s(r.resposta),
    correto:     r.correto ? 1 : 0,
    score:       r.score || 0,
    xp_ganho:    r.xp_ganho || 0,
    tempo_gasto: r.tempo_gasto || null,
    feedback_ia: r.feedback_ia || null,
    created_at:  dt(r.created_at),
    updated_at:  dt(r.updated_at),
  }));

  // ── avaliacoes ───────────────────────────────────────────
  await migrate(conn, 'avaliacoes', db.avaliacoes || [], r => ({
    id:                   r.id,
    titulo:               r.titulo,
    descricao:            r.descricao || null,
    tipo:                 r.tipo || 'prova',
    professor_id:         r.professor_id,
    disciplina_id:        r.disciplina_id || null,
    turma_id:             r.turma_id || null,
    questoes:             s(r.questoes || []),
    tempo_limite:         r.tempo_limite || 60,
    tentativas_permitidas: r.tentativas_permitidas || 1,
    nota_minima:          r.nota_minima || 5.0,
    peso:                 r.peso || 10.0,
    status:               r.status || 'rascunho',
    disponivel_em:        dt(r.disponivel_em),
    encerra_em:           dt(r.encerra_em),
    created_at:           dt(r.created_at),
    updated_at:           dt(r.updated_at),
  }));

  // ── turma_avaliacoes ─────────────────────────────────────
  await migrate(conn, 'turma_avaliacoes', db.turma_avaliacoes || [], r => ({
    id:           r.id,
    turma_id:     r.turma_id,
    avaliacao_id: r.avaliacao_id,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── tentativas ───────────────────────────────────────────
  await migrate(conn, 'tentativas', db.tentativas || [], r => ({
    id:                   r.id,
    avaliacao_id:         r.avaliacao_id,
    aluno_id:             r.aluno_id,
    status:               r.status || 'concluida',
    respostas:            s(r.respostas),
    respostas_corrigidas: s(r.respostas_corrigidas),
    nota:                 r.nota || null,
    aprovado:             r.aprovado ? 1 : 0,
    feedback_ia:          r.feedback_ia || null,
    tempo_gasto:          r.tempo_gasto || null,
    iniciada_em:          dt(r.iniciada_em) || dt(r.created_at),
    concluida_em:         dt(r.concluida_em),
    created_at:           dt(r.created_at),
    updated_at:           dt(r.updated_at),
  }));

  // ── materiais ────────────────────────────────────────────
  await migrate(conn, 'materiais', db.materiais || [], r => ({
    id:           r.id,
    titulo:       r.titulo,
    descricao:    r.descricao || null,
    tipo:         r.tipo || 'link',
    url:          r.url || null,
    conteudo:     r.conteudo || null,
    base64:       r.base64 || null,
    file_name:    r.fileName || r.file_name || null,
    file_size:    r.fileSize || r.file_size || null,
    disciplina_id: r.disciplina_id || null,
    professor_id: r.professor_id,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── avisos ───────────────────────────────────────────────
  await migrate(conn, 'avisos', db.avisos || [], r => ({
    id:           r.id,
    titulo:       r.titulo,
    corpo:        r.corpo,
    professor_id: r.professor_id,
    turma_id:     r.turma_id || null,
    fixado:       r.fixado ? 1 : 0,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── rag_documentos ───────────────────────────────────────
  await migrate(conn, 'rag_documentos', db.rag_documentos || [], r => ({
    id:           r.id,
    titulo:       r.titulo || r.nome || 'Documento',
    disciplina_id: r.disciplina_id || null,
    professor_id: r.professor_id || null,
    tipo:         r.tipo || null,
    status:       r.status || 'indexado',
    total_chunks: r.total_chunks || 0,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── rag_contextos ────────────────────────────────────────
  await migrate(conn, 'rag_contextos', db.rag_contextos || [], r => ({
    id:           r.id,
    titulo:       r.titulo || null,
    conteudo:     r.conteudo,
    embedding:    s(r.embedding || null),
    tags:         s(r.tags || []),
    doc_id:       r.doc_id ? String(r.doc_id) : null,
    disciplina_id: r.disciplina_id || null,
    uso_count:    r.uso_count || r.vezes_usado || 0,
    tipo_fonte:   r.tipo_fonte || null,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // ── atividades ───────────────────────────────────────────
  await migrate(conn, 'atividades', db.atividades || [], r => ({
    id:                r.id,
    titulo:            r.titulo,
    descricao:         r.descricao || null,
    tipo:              r.tipo || 'entrega',
    professor_id:      r.professor_id,
    turma_id:          r.turma_id || null,
    disciplina_id:     r.disciplina_id || null,
    data_entrega:      dt(r.data_entrega),
    aceita_apos_prazo: r.aceita_apos_prazo ? 1 : 0,
    nota_maxima:       r.nota_maxima || 10,
    status:            r.status || 'ativa',
    created_at:        dt(r.created_at),
    updated_at:        dt(r.updated_at),
  }));

  // ── entregas_atividade ───────────────────────────────────
  await migrate(conn, 'entregas_atividade', db.entregas_atividade || [], r => ({
    id:              r.id,
    atividade_id:    r.atividade_id,
    aluno_id:        r.aluno_id,
    arquivo_base64:  r.arquivo_base64 || r.base64 || null,
    arquivo_nome:    r.arquivo_nome || r.fileName || null,
    arquivo_tipo:    r.arquivo_tipo || r.mimeType || null,
    arquivo_tamanho: r.arquivo_tamanho || r.fileSize || null,
    comentario:      r.comentario || null,
    nota:            r.nota || null,
    feedback:        r.feedback || null,
    status:          r.status || 'entregue',
    entregue_em:     dt(r.entregue_em) || dt(r.created_at),
    corrigido_em:    dt(r.corrigido_em),
    created_at:      dt(r.created_at),
    updated_at:      dt(r.updated_at),
  }));

  // ── medalhas_config ──────────────────────────────────────
  await migrate(conn, 'medalhas_config', db.medalhas_config || [], r => ({
    id:        r.id,
    nome:      r.nome,
    descricao: r.descricao || null,
    icone:     r.icone || null,
    tipo:      r.tipo || null,
    criterio:  r.criterio || null,
    valor:     r.valor || 0,
    xp_bonus:  r.xp_bonus || 0,
    created_at: dt(r.created_at),
    updated_at: dt(r.updated_at),
  }));

  // ── medalhas_aluno ───────────────────────────────────────
  await migrate(conn, 'medalhas_aluno', db.medalhas_aluno || [], r => ({
    id:             r.id,
    aluno_id:       r.aluno_id,
    medalha_id:     r.medalha_id,
    conquistada_em: dt(r.conquistada_em) || dt(r.created_at),
    created_at:     dt(r.created_at),
    updated_at:     dt(r.updated_at),
  }));

  // ── missoes ──────────────────────────────────────────────
  await migrate(conn, 'missoes', db.missoes || [], r => ({
    id:            r.id,
    titulo:        r.titulo,
    descricao:     r.descricao || null,
    icone:         r.icone || null,
    tipo:          r.tipo || 'diaria',
    meta_tipo:     r.meta_tipo || null,
    meta_valor:    r.meta_valor || 1,
    xp_recompensa: r.xp_recompensa || 100,
    ativo:         r.ativo !== false ? 1 : 0,
    created_at:    dt(r.created_at),
    updated_at:    dt(r.updated_at),
  }));

  // ── missoes_aluno ────────────────────────────────────────
  await migrate(conn, 'missoes_aluno', db.missoes_aluno || [], r => ({
    id:           r.id,
    aluno_id:     r.aluno_id,
    missao_id:    r.missao_id,
    progresso:    r.progresso || 0,
    status:       r.status || 'em_progresso',
    concluida_em: dt(r.concluida_em),
    data_ref:     r.data_ref || null,
    created_at:   dt(r.created_at),
    updated_at:   dt(r.updated_at),
  }));

  // Re-enable FK checks
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('✅ Migração concluída!');
  console.log('   Próximo passo: reinicie o servidor com npm start');
  console.log('─'.repeat(50) + '\n');

  await conn.end();
}

main().catch(err => {
  console.error('\n❌ Erro na migração:', err.message);
  process.exit(1);
});

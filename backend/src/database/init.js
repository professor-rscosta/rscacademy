const fs=require('fs'),path=require('path');
const DB_PATH=path.join(__dirname,'../../database/rsc_academy.json');

const EMPTY_DB={
  usuarios:[],disciplinas:[],trilhas:[],questoes:[],respostas:[],
  turmas:[],aluno_turma:[],turma_disciplinas:[],materiais:[],avisos:[],rag_contextos:[],atividades:[],entregas_atividade:[],
  avaliacoes:[],tentativas:[],medalhas_config:[],medalhas_aluno:[],missoes:[],missoes_aluno:[],
  _seq:{usuarios:0,disciplinas:0,trilhas:0,questoes:0,respostas:0,turmas:0,
        materiais:0,avisos:0,rag_contextos:0,avaliacoes:0,tentativas:0,
        medalhas_config:0,medalhas_aluno:0,missoes:0,missoes_aluno:0,atividades:0,entregas_atividade:0},
};

function readDb(){try{return JSON.parse(fs.readFileSync(DB_PATH,'utf8'));}catch{return JSON.parse(JSON.stringify(EMPTY_DB));}}
function writeDb(db){fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});fs.writeFileSync(DB_PATH,JSON.stringify(db,null,2),'utf8');}
function nextId(db,t){if(!db._seq[t])db._seq[t]=0;db._seq[t]++;return db._seq[t];}
function now(){return new Date().toISOString();}
function gerarCodigo(n=6){return Math.random().toString(36).slice(2,2+n).toUpperCase();}

function dbFindAll(t)        {return readDb()[t]||[];}
function dbFindById(t,id)    {return dbFindAll(t).find(r=>r.id===Number(id))||null;}
function dbFindOne(t,pred)   {return dbFindAll(t).find(pred)||null;}
function dbFindWhere(t,pred) {return dbFindAll(t).filter(pred);}
function dbInsert(t,fields)  {const db=readDb();if(!db[t])db[t]=[];const rec={id:nextId(db,t),...fields,created_at:now(),updated_at:now()};db[t].push(rec);writeDb(db);return rec;}
function dbUpdate(t,id,f)    {const db=readDb();const idx=db[t].findIndex(r=>r.id===Number(id));if(idx===-1)return null;db[t][idx]={...db[t][idx],...f,updated_at:now()};writeDb(db);return db[t][idx];}
function dbDelete(t,id)      {const db=readDb();const len=(db[t]||[]).length;db[t]=(db[t]||[]).filter(r=>r.id!==Number(id));writeDb(db);return(db[t]||[]).length<len;}
function dbDeleteWhere(t,pred){const db=readDb();const before=db[t]?.length||0;db[t]=(db[t]||[]).filter(r=>!pred(r));writeDb(db);return before-(db[t]?.length||0);}

async function initDatabase(){
  const bcrypt=require('bcryptjs');
  if(!fs.existsSync(DB_PATH))writeDb(JSON.parse(JSON.stringify(EMPTY_DB)));
  const db=readDb();
  Object.keys(EMPTY_DB).forEach(k=>{if(!db[k])db[k]=Array.isArray(EMPTY_DB[k])?[]:EMPTY_DB[k];});
  if(!db._seq)db._seq={};
  Object.keys(EMPTY_DB._seq).forEach(k=>{if(db._seq[k]===undefined)db._seq[k]=0;});

  if(db.usuarios.length===0){
    const seed=[
      {perfil:'admin',    status:'ativo',    nome:'Administrador RSC',  email:'admin@rsc.edu',         senha:'Admin@123'},
      {perfil:'professor',status:'ativo',    nome:'Prof. Ana Beatriz',  email:'ana@rsc.edu',           senha:'Prof@123'},
      {perfil:'professor',status:'ativo',    nome:'Prof. Carlos Silva', email:'carlos@rsc.edu',        senha:'Prof@123'},
      {perfil:'aluno',    status:'ativo',    nome:'Lucas Andrade',      email:'lucas@aluno.rsc.edu',   senha:'Aluno@123'},
      {perfil:'aluno',    status:'ativo',    nome:'Sofia Mendes',       email:'sofia@aluno.rsc.edu',   senha:'Aluno@123'},
      {perfil:'aluno',    status:'pendente', nome:'Mariana Costa',      email:'mariana@aluno.rsc.edu', senha:'Aluno@123'},
    ];
    for(const u of seed){
      const senha_hash=await bcrypt.hash(u.senha,12);
      db.usuarios.push({id:nextId(db,'usuarios'),nome:u.nome,email:u.email,senha_hash,perfil:u.perfil,status:u.status,theta:0,xp_total:0,nivel:1,streak_dias:0,created_at:now(),updated_at:now()});
    }
    console.log('✅ Usuários seed | Admin: admin@rsc.edu/Admin@123 | Prof: ana@rsc.edu/Prof@123 | Aluno: lucas@aluno.rsc.edu/Aluno@123');
  }

  if(db.disciplinas.length===0){
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2;
    db.disciplinas.push({id:nextId(db,'disciplinas'),nome:'Programação I',descricao:'Fundamentos de lógica e algoritmos em Python',professor_id:pid,codigo:'PROG1',carga_horaria:60,created_at:now(),updated_at:now()});
    db.disciplinas.push({id:nextId(db,'disciplinas'),nome:'Programação II',descricao:'Orientação a objetos e padrões de projeto',professor_id:pid,codigo:'PROG2',carga_horaria:60,created_at:now(),updated_at:now()});
  }

  if(db.trilhas.length===0){
    const d1=db.disciplinas[0]?.id||1,d2=db.disciplinas[1]?.id||2,pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2;
    db.trilhas.push({id:nextId(db,'trilhas'),nome:'Algoritmos Básicos',descricao:'Variáveis, laços e funções',disciplina_id:d1,professor_id:pid,ordem:1,xp_total:450,ativo:true,created_at:now(),updated_at:now()});
    db.trilhas.push({id:nextId(db,'trilhas'),nome:'Estruturas de Dados',descricao:'Arrays, listas e árvores',disciplina_id:d1,professor_id:pid,ordem:2,xp_total:600,ativo:true,created_at:now(),updated_at:now()});
    db.trilhas.push({id:nextId(db,'trilhas'),nome:'POO Avançada',descricao:'Herança, polimorfismo e interfaces',disciplina_id:d2,professor_id:pid,ordem:1,xp_total:750,ativo:true,created_at:now(),updated_at:now()});
  }

  if(db.questoes.length===0){
    const t1=db.trilhas[0]?.id||1,t2=db.trilhas[1]?.id||2,t3=db.trilhas[2]?.id||3;
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2;
    const q=(tid,tipo,enunciado,alternativas,gabarito,xp,tm,ta,tb,tc)=>({
      id:nextId(db,'questoes'),trilha_id:tid,professor_id:pid,tipo,enunciado,alternativas,gabarito,
      xp,midias:[],ativo:true,rag_tags:['programação'],
      tri:{modelo:tm,a:ta,b:tb,c:tc||0,status:'provisorio',total_respostas:0},
      created_at:now(),updated_at:now()
    });
    db.questoes.push(q(t1,'multipla_escolha','Qual das opções abaixo é um tipo de dado primitivo em Python?',['int','lista','dicionário','tupla'],0,80,'3PL',1.2,0.0,0.25));
    db.questoes.push(q(t1,'verdadeiro_falso','Em Python, uma variável deve ser declarada com seu tipo antes de ser usada.',null,false,50,'1PL',1.0,-1.0,0));
    db.questoes.push(q(t1,'preenchimento','Complete: Em Python, para criar um laço que repete 5 vezes, usamos: ___ i in range(5):',null,'for',70,'2PL',1.5,-0.5,0));
    db.questoes.push(q(t2,'associacao','Associe cada estrutura à sua característica:',{esquerda:['Array','Lista Ligada','Pilha','Fila'],direita:['FIFO','LIFO','Acesso indexado','Inserção dinâmica']},{0:2,1:3,2:1,3:0},120,'2PL',1.3,0.8,0));
    db.questoes.push(q(t2,'ordenacao','Ordene as etapas do Bubble Sort:',['Comparar adjacentes','Repetir até sem trocas','Trocar se fora de ordem','Percorrer o array'],[3,0,2,1],100,'2PL',1.1,1.0,0));
    db.questoes.push(q(t3,'dissertativa','Explique a diferença entre herança e composição em POO. Dê um exemplo de cada.',null,'herança|composição|exemplo',150,'GRM',1.4,1.2,0));
    db.questoes.push(q(t3,'multipla_escolha','Qual princípio SOLID garante que uma classe deve ter apenas uma razão para mudar?',['Open/Closed','Single Responsibility','Liskov Substitution','Interface Segregation'],1,100,'3PL',1.8,0.5,0.2));
    console.log('✅ Questões seed (7 tipos).');
  }

  if(db.turmas.length===0){
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2;
    const d1=db.disciplinas[0]?.id||1,d2=db.disciplinas[1]?.id||2;
    const t1={id:nextId(db,'turmas'),nome:'Turma A — 2025/1',descricao:'Turma do primeiro semestre',disciplina_id:d1,professor_id:pid,codigo_acesso:'PROG1A',ativo:true,created_at:now(),updated_at:now()};
    const t2={id:nextId(db,'turmas'),nome:'Turma B — 2025/1',descricao:'Turma noturna',disciplina_id:d2,professor_id:pid,codigo_acesso:'PROG2B',ativo:true,created_at:now(),updated_at:now()};
    db.turmas.push(t1);db.turmas.push(t2);
    const lucas=db.usuarios.find(u=>u.email==='lucas@aluno.rsc.edu');
    const sofia=db.usuarios.find(u=>u.email==='sofia@aluno.rsc.edu');
    if(lucas){db.aluno_turma.push({aluno_id:lucas.id,turma_id:t1.id,joined_at:now()});} // 1 turma ativa por aluno
    if(sofia) db.aluno_turma.push({aluno_id:sofia.id,turma_id:t1.id,joined_at:now()});
    console.log('✅ Turmas seed | Códigos: PROG1A | PROG2B');
  }


  // Vincular disciplinas às turmas (turma_disciplinas)
  if(db.turma_disciplinas.length===0){
    const t1id=db.turmas[0]?.id,t2id=db.turmas[1]?.id;
    const d1id=db.disciplinas[0]?.id,d2id=db.disciplinas[1]?.id;
    if(t1id&&d1id) db.turma_disciplinas.push({turma_id:t1id,disciplina_id:d1id,added_at:now()});
    if(t1id&&d2id) db.turma_disciplinas.push({turma_id:t1id,disciplina_id:d2id,added_at:now()});
    if(t2id&&d2id) db.turma_disciplinas.push({turma_id:t2id,disciplina_id:d2id,added_at:now()});
    console.log('✅ turma_disciplinas seed: Turma A → Prog I+II | Turma B → Prog II');
  }
  if(db.materiais.length===0){
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2,d1=db.disciplinas[0]?.id||1;
    const mats=[
      {titulo:'Slides — Recursividade',descricao:'Material da aula 5',tipo:'link',url:'https://slides.google.com',disciplina_id:d1,professor_id:pid},
      {titulo:'Videoaula — POO Básico',descricao:'Introdução a classes e objetos',tipo:'youtube',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',disciplina_id:d1,professor_id:pid},
      {titulo:'Exercícios — Arrays',descricao:'Lista de exercícios cap.4',tipo:'texto',url:'',conteudo:'1. Crie um array de 10 inteiros\n2. Inverta o array\n3. Encontre o maior elemento',disciplina_id:d1,professor_id:pid},
      {titulo:'Documentação Python',descricao:'Referência completa',tipo:'link',url:'https://docs.python.org/3',disciplina_id:d1,professor_id:pid},
    ];
    for(const m of mats)db.materiais.push({id:nextId(db,'materiais'),...m,created_at:now(),updated_at:now()});
  }

  if(db.avisos.length===0){
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2,t1=db.turmas[0]?.id||1;
    db.avisos.push({id:nextId(db,'avisos'),titulo:'Avaliação Final — Programação I',corpo:'A avaliação final será na próxima sexta-feira. Revise os capítulos 5 a 8.',professor_id:pid,turma_id:t1,created_at:now(),updated_at:now()});
    db.avisos.push({id:nextId(db,'avisos'),titulo:'Material complementar disponível',corpo:'Novos slides de recursividade adicionados em Materiais Didáticos.',professor_id:pid,turma_id:t1,created_at:now(),updated_at:now()});
  }

  if(db.avaliacoes.length===0){
    const pid=db.usuarios.find(u=>u.email==='ana@rsc.edu')?.id||2;
    const d1=db.disciplinas[0]?.id||1,t1=db.turmas[0]?.id||1;
    const qs=db.questoes.filter(q=>q.trilha_id===db.trilhas[0]?.id).slice(0,3).map(q=>({questao_id:q.id,peso:1}));
    if(qs.length>0){
      db.avaliacoes.push({
        id:nextId(db,'avaliacoes'),titulo:'Avaliação 1 — Algoritmos Básicos',
        descricao:'Avaliação sobre variáveis, tipos e estruturas de controle.',
        tipo:'prova',professor_id:pid,disciplina_id:d1,turma_id:t1,
        questoes:qs,tempo_limite:60,tentativas_permitidas:2,
        nota_minima:6.0,peso:10,status:'publicada',
        disponivel_em:new Date(Date.now()-86400000).toISOString(),
        encerra_em:new Date(Date.now()+7*86400000).toISOString(),
        created_at:now(),updated_at:now()
      });
      console.log('✅ Avaliação demo criada.');
    }
  }

  if(db.medalhas_config.length===0){
    const medalhas=[
      {id:nextId(db,'medalhas_config'),nome:'Primeira Resposta',descricao:'Respondeu sua primeira questão',icone:'🎯',tipo:'questao',criterio:'total_respostas',valor:1,xp_bonus:50},
      {id:nextId(db,'medalhas_config'),nome:'Sequência de 3',descricao:'3 respostas corretas seguidas',icone:'🔥',tipo:'streak',criterio:'streak',valor:3,xp_bonus:100},
      {id:nextId(db,'medalhas_config'),nome:'Mestre do XP',descricao:'Acumulou 500 XP',icone:'⭐',tipo:'xp',criterio:'xp_total',valor:500,xp_bonus:200},
      {id:nextId(db,'medalhas_config'),nome:'Trilha Completa',descricao:'Completou uma trilha inteira',icone:'🗺️',tipo:'trilha',criterio:'trilha_completa',valor:1,xp_bonus:300},
      {id:nextId(db,'medalhas_config'),nome:'Estudioso',descricao:'Respondeu 20 questões',icone:'📚',tipo:'questao',criterio:'total_respostas',valor:20,xp_bonus:150},
      {id:nextId(db,'medalhas_config'),nome:'Expert',descricao:'Theta acima de 1.0',icone:'💎',tipo:'theta',criterio:'theta',valor:1.0,xp_bonus:400},
      {id:nextId(db,'medalhas_config'),nome:'Nota 10',descricao:'Tirou 10 em uma avaliação',icone:'🏆',tipo:'avaliacao',criterio:'nota_maxima',valor:10,xp_bonus:500},
    ];
    db.medalhas_config=medalhas;
    console.log('✅ Medalhas config criadas (7).');
  }

  if(db.missoes.length===0){
    const missoes=[
      {id:nextId(db,'missoes'),titulo:'Missão Diária: 5 Questões',descricao:'Responda 5 questões hoje',icone:'🎯',tipo:'diaria',meta_tipo:'total_respostas',meta_valor:5,xp_recompensa:100,ativo:true},
      {id:nextId(db,'missoes'),titulo:'Missão Semanal: Trilha Completa',descricao:'Complete uma trilha esta semana',icone:'🗺️',tipo:'semanal',meta_tipo:'trilha_completa',meta_valor:1,xp_recompensa:500,ativo:true},
      {id:nextId(db,'missoes'),titulo:'Missão: 3 Corretas Seguidas',descricao:'Acerte 3 questões em sequência',icone:'🔥',tipo:'recorrente',meta_tipo:'streak',meta_valor:3,xp_recompensa:150,ativo:true},
    ];
    db.missoes=missoes;
    console.log('✅ Missões criadas (3).');
  }

  if(db.rag_contextos.length===0){
    const ctxs=[
      {titulo:'Tipos de dados Python',conteudo:'Python possui tipos primitivos: int, float, str, bool. Tipos compostos: list, tuple, dict, set.',tags:['python','tipos']},
      {titulo:'POO — Conceitos',conteudo:'Classe: template. Objeto: instância. Herança: reutilização. Polimorfismo: mesma interface, comportamentos diferentes.',tags:['poo','herança']},
      {titulo:'Estruturas de dados',conteudo:'Array: acesso O(1). Lista ligada: inserção O(1). Pilha: LIFO. Fila: FIFO.',tags:['estruturas']},
    ];
    for(const c of ctxs)db.rag_contextos.push({id:nextId(db,'rag_contextos'),...c,uso_count:0,created_at:now(),updated_at:now()});
  }

  writeDb(db);
  console.log(`✅ Banco JSON → ${DB_PATH}\n`);
}

module.exports={readDb,writeDb,initDatabase,gerarCodigo,dbFindAll,dbFindById,dbFindOne,dbFindWhere,dbInsert,dbUpdate,dbDelete,dbDeleteWhere};

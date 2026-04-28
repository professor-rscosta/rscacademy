import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';

const S = {
  conteudo:  { color:'#7c3aed', grad:'135deg,#7c3aed,#5b21b6', bg:'rgba(124,58,237,.06)', bd:'rgba(124,58,237,.18)' },
  avaliacao: { color:'#0ea5e9', grad:'135deg,#0ea5e9,#0369a1', bg:'rgba(14,165,233,.06)',  bd:'rgba(14,165,233,.18)' },
  turma:     { color:'#10b981', grad:'135deg,#10b981,#047857', bg:'rgba(16,185,129,.06)',  bd:'rgba(16,185,129,.18)' },
};

const SECTIONS = [
  {
    key: 'conteudo', title: '📚 Conteúdo & Ensino', subtitle: 'Organize e enriqueça o aprendizado',
    ...S.conteudo,
    items: [
      { id:'disciplinas', icon:'📖', title:'Disciplinas',           badge:null, sub:'Criar, editar e gerenciar disciplinas' },
      { id:'materiais',   icon:'📂', title:'Hub de Aprendizagem',   badge:null, sub:'PDFs, vídeos, links e arquivos' },
      { id:'trilhas',     icon:'🗺️', title:'Trilhas Gamificadas',   badge:null, sub:'XP, TRI e questões adaptativas' },
      { id:'questoes',    icon:'❓', title:'Banco de Questões',     badge:null, sub:'Questões com IA e auto-correção' },
    ],
  },
  {
    key: 'avaliacao', title: '📝 Avaliações & Atividades', subtitle: 'Avalie e acompanhe o progresso',
    ...S.avaliacao,
    items: [
      { id:'avaliacoes', icon:'📝', title:'Avaliações',  badge:null, sub:'Provas, quizzes e simulados' },
      { id:'atividades', icon:'📋', title:'Atividades',  badge:null, sub:'Entregas e trabalhos dos alunos' },
      { id:'boletim',    icon:'📊', title:'Boletim',     badge:null, sub:'Notas e situação por aluno' },
      { id:'relatorios', icon:'📈', title:'Relatórios',  badge:null, sub:'Análise TRI e desempenho da turma' },
    ],
  },
  {
    key: 'turma', title: '🏫 Turmas & Comunicação', subtitle: 'Gerencie e se comunique com sua turma',
    ...S.turma,
    items: [
      { id:'turmas',  icon:'🏫', title:'Turmas',          badge:null, sub:'Criar turmas e matricular alunos' },
      { id:'mural',   icon:'📌', title:'Mural de Avisos', badge:null, sub:'Comunicados e avisos para a turma' },
      { id:'chatbot', icon:'🤖', title:'Assistente IA',   badge:null, sub:'Configure o Lumi para os alunos' },
    ],
  },
];

export default function ProfHome({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ turmas:0, alunos:0, disciplinas:0, trilhas:0, questoes:0, avaliacoes:0 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const id = user?.id;
    if (!id) return;
    Promise.all([
      api.get('/turmas?professor_id='+id).catch(() =>({ data:{turmas:[]} })),
      api.get('/disciplinas?professor_id='+id).catch(() =>({ data:{disciplinas:[]} })),
      api.get('/trilhas?professor_id='+id).catch(() =>({ data:{trilhas:[]} })),
      api.get('/questoes?professor_id='+id).catch(() =>({ data:{questoes:[]} })),
      api.get('/avaliações?professor_id='+id).catch(() =>({ data:{avaliacoes:[]} })),
    ]).then(([t,d,tr,q,av]) => {
      const turmas = t.data.turmas||[];
      setStats({
        turmas: turmas.length,
        alunos: turmas.reduce((s,t)=>s+(t.total_alunos||0),0),
        disciplinas:(d.data.disciplinas||[]).length,
        trilhas:(tr.data.trilhas||[]).length,
        questoes:(q.data.questoes||[]).length,
        avaliacoes:(av.data.avaliações||[]).length,
      });
    });
  }, [user?.id]);

  const hora = new Date().getHours();
  const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite';
  // Get first real name word (skip "Prof.", "Dr.", "Me." prefixes)
  // Extract first meaningful name (skip titles like Prof., Dr.)
  const _prefixos = new Set(['prof','dr','dra','me','ms','esp','prof.','dr.','dra.','me.','ms.']);
  const _partes = (user?.nome || '').split(' ').filter(p => p.length > 0);
  const nome = _partes.find(p => !_prefixos.has(p.toLowerCase().replace('.',''))  && p.length > 1) || 'Professor(a)';

  return (
    <div style={{ width:'100%', padding:'0 0 3rem' }}>

      {/* ── HERO BANNER ──────────────────────────────────────── */}
      <div style={{
        background:'linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#0d2818 100%)',
        borderRadius:22, padding:'2.5rem', marginBottom:'2rem',
        boxShadow:'0 12px 40px rgba(0,0,0,.35)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute',top:-40,right:-40,width:200,height:200,background:'rgba(16,185,129,.08)',borderRadius:'50%' }} />
        <div style={{ position:'absolute',bottom:-30,right:120,width:120,height:120,background:'rgba(124,58,237,.07)',borderRadius:'50%' }} />

        {/* Greeting */}
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.4)',letterSpacing:'.12em',textTransform:'uppercase',fontWeight:600,marginBottom:6 }}>
            {saudacao} 👋
          </div>
          <h1 style={{ fontSize:30,fontWeight:800,color:'white',margin:'0 0 6px',letterSpacing:'-.6px' }}>
            Olá, {nome}! <span style={{ fontSize:26 }}>👩‍🏫</span>
          </h1>
          <p style={{ fontSize:13,color:'rgba(255,255,255,.45)',margin:'0 0 2rem' }}>
            Você possui{' '}
            <span style={{ color:'#10b981',fontWeight:700 }}>{stats.turmas} turma{stats.turmas!==1?'s':''} ativa{stats.turmas!==1?'s':''}</span>
            {' '}e{' '}
            <span style={{ color:'#10b981',fontWeight:700 }}>{stats.alunos} aluno{stats.alunos!==1?'s':''} matriculado{stats.alunos!==1?'s':''}</span>.
          </p>
          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            {[
              { icon:'📚', label:'Disciplinas', val:stats.disciplinas, c:'#a78bfa' },
              { icon:'🗺️', label:'Trilhas',     val:stats.trilhas,     c:'#34d399' },
              { icon:'❓', label:'Questões',    val:stats.questoes,    c:'#fbbf24' },
              { icon:'📝', label:'Avaliações',  val:stats.avaliacoes,  c:'#60a5fa' },
            ].map(s => (
              <div key={s.label} style={{
                background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.09)',
                borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,
              }}>
                <div style={{ fontSize:24 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize:24,fontWeight:800,color:s.c,lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,.38)',marginTop:3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTIONS ─────────────────────────────────────────── */}
      <div style={{ display:'flex',flexDirection:'column',gap:'1.5rem' }}>
        {SECTIONS.map(sec => (
          <div key={sec.key} style={{
            background:sec.bg, border:'1.5px solid '+sec.bd,
            borderRadius:18, padding:'1.5rem',
          }}>
            {/* Section header */}
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontSize:15,fontWeight:700,color:sec.color }}>{sec.title}</div>
              <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>{sec.subtitle}</div>
            </div>
            {/* Cards grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))', gap:12 }}>
              {sec.items.map(item => {
                const hKey = sec.key+item.id;
                const isHov = hover === hKey;
                return (
                  <button key={item.id}
                    onClick={() => onNavigate(item.id)}
                    onMouseEnter={() => setHover(hKey)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      background: isHov ? '#fff' : 'rgba(255,255,255,.92)',
                      border: '1.5px solid '+(isHov ? sec.color : '#e8eef4'),
                      borderRadius:14, padding:'1.1rem 1rem', textAlign:'left',
                      cursor:'pointer',
                      transform: isHov ? 'translateY(-3px)' : 'translateY(0)',
                      boxShadow: isHov ? '0 8px 24px rgba(0,0,0,.13)' : '0 1px 4px rgba(0,0,0,.06)',
                      transition:'all .18s cubic-bezier(.34,1.56,.64,1)',
                      position:'relative', overflow:'hidden',
                    }}
                  >
                    {/* Color accent line */}
                    <div style={{
                      position:'absolute',top:0,left:0,right:0,height:3,
                      background:'linear-gradient('+sec.grad+')',
                      opacity: isHov ? 1 : 0.4,
                      transition:'opacity .18s',
                      borderRadius:'14px 14px 0 0',
                    }} />
                    <div style={{ fontSize:30, marginBottom:10 }}>{item.icon}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:'#0f172a',marginBottom:5 }}>{item.title}</div>
                    <div style={{ fontSize:11,color:'#64748b',lineHeight:1.55 }}>{item.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

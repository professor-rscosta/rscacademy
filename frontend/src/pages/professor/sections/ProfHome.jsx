import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';

const CATEGORIES = [
  {
    id: 'conteudo', label: '📚 Conteúdo & Ensino',
    color: '#7c3aed', bg: 'rgba(124,58,237,.07)', border: 'rgba(124,58,237,.2)',
    actions: [
      { id:'disciplinas', icon:'📚', label:'Disciplinas',       desc:'Criar e configurar suas disciplinas' },
      { id:'materiais',   icon:'📂', label:'Hub de Aprendizagem', desc:'PDFs, vídeos e links para alunos' },
      { id:'trilhas',     icon:'🗺️', label:'Trilhas Gamificadas',  desc:'Prática com XP, TRI e questões' },
      { id:'questoes',    icon:'❓', label:'Banco de Questões',  desc:'Questões com IA e correção automática' },
    ],
  },
  {
    id: 'avaliacao', label: '📝 Avaliações & Atividades',
    color: '#0ea5e9', bg: 'rgba(14,165,233,.07)', border: 'rgba(14,165,233,.2)',
    actions: [
      { id:'avaliacoes', icon:'📝', label:'Avaliações', desc:'Provas, quizzes e simulados' },
      { id:'atividades', icon:'📋', label:'Atividades', desc:'Entregas e trabalhos dos alunos' },
      { id:'boletim',    icon:'📊', label:'Boletim',    desc:'Notas e desempenho por aluno' },
      { id:'relatorios', icon:'📈', label:'Relatórios', desc:'Análise TRI e desempenho da turma' },
    ],
  },
  {
    id: 'turma', label: '🏫 Turmas & Comunicação',
    color: '#10b981', bg: 'rgba(16,185,129,.07)', border: 'rgba(16,185,129,.2)',
    actions: [
      { id:'turmas',  icon:'🏫', label:'Turmas',          desc:'Criar turmas e matricular alunos' },
      { id:'mural',   icon:'📌', label:'Mural de Avisos', desc:'Comunicados para a turma' },
      { id:'chatbot', icon:'🤖', label:'Assistente IA',   desc:'Configure o Lumi para seus alunos' },
    ],
  },
];

export default function ProfHome({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ turmas:0, alunos:0, disciplinas:0, trilhas:0, questoes:0, avaliacoes:0 });

  useEffect(() => {
    const id = user?.id;
    if (!id) return;
    Promise.all([
      api.get('/turmas?professor_id=' + id).catch(() => ({ data: { turmas: [] } })),
      api.get('/disciplinas?professor_id=' + id).catch(() => ({ data: { disciplinas: [] } })),
      api.get('/trilhas?professor_id=' + id).catch(() => ({ data: { trilhas: [] } })),
      api.get('/questoes?professor_id=' + id).catch(() => ({ data: { questoes: [] } })),
      api.get('/avaliacoes?professor_id=' + id).catch(() => ({ data: { avaliacoes: [] } })),
    ]).then(([t, d, tr, q, av]) => {
      const turmas = t.data.turmas || [];
      setStats({
        turmas: turmas.length,
        alunos: turmas.reduce((s, t) => s + (t.total_alunos || 0), 0),
        disciplinas: (d.data.disciplinas || []).length,
        trilhas: (tr.data.trilhas || []).length,
        questoes: (q.data.questoes || []).length,
        avaliacoes: (av.data.avaliacoes || []).length,
      });
    });
  }, [user?.id]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = user?.nome?.split(' ')[0] || 'Professor';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 2rem' }}>

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2a1e 100%)',
        borderRadius: 20, padding: '2rem 2.5rem', marginBottom: '2rem',
        boxShadow: '0 8px 32px rgba(15,23,42,.3)',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 4, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            {saudacao} 👋
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-.5px' }}>
            {nome}! <span style={{ fontSize: 24 }}>👩‍🏫</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', margin: 0 }}>
            <strong style={{ color: '#10b981' }}>{stats.turmas} turmas ativas</strong> · <strong style={{ color: '#10b981' }}>{stats.alunos} alunos matriculados</strong>
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { icon:'📚', label:'Disciplinas', val: stats.disciplinas, color:'#a78bfa' },
            { icon:'🗺️', label:'Trilhas',     val: stats.trilhas,     color:'#34d399' },
            { icon:'❓', label:'Questões',    val: stats.questoes,    color:'#fbbf24' },
            { icon:'📝', label:'Avaliações',  val: stats.avaliacoes,  color:'#60a5fa' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,.06)', borderRadius: 12,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid rgba(255,255,255,.08)',
            }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map(cat => (
        <div key={cat.id} style={{
          background: cat.bg, border: '1.5px solid ' + cat.border,
          borderRadius: 16, padding: '1.5rem', marginBottom: '1.25rem',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: cat.color, marginBottom: '1rem' }}>
            {cat.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {cat.actions.map(a => (
              <button key={a.id} onClick={() => onNavigate(a.id)}
                style={{
                  background: 'white', border: '1.5px solid #e2e8f0',
                  borderRadius: 12, padding: '1rem', textAlign: 'left',
                  cursor: 'pointer', transition: 'all .15s',
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                }}
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.12)'; e.currentTarget.style.borderColor=cat.color; }}
                onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.borderColor='#e2e8f0'; }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

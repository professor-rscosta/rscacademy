import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';

const CATEGORIES = [
  {
    id: 'aprendizagem',
    label: '📚 Meu Aprendizado',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,.06)',
    border: 'rgba(124,58,237,.2)',
    actions: [
      { id:'disciplinas', icon:'📖', label:'Minhas Disciplinas', desc:'Acesse o conteúdo das suas disciplinas' },
      { id:'materiais',   icon:'📂', label:'Hub de Aprendizagem', desc:'PDFs, vídeos e materiais do professor' },
      { id:'trilhas',     icon:'🗺️', label:'Trilhas Gamificadas', desc:'Pratique com questões e ganhe XP' },
    ],
  },
  {
    id: 'avaliacao',
    label: '📝 Avaliações & Entregas',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,.06)',
    border: 'rgba(14,165,233,.2)',
    actions: [
      { id:'avaliacoes', icon:'📝', label:'Avaliações', desc:'Provas e quizzes disponíveis' },
      { id:'atividades', icon:'📋', label:'Atividades', desc:'Entregas e trabalhos pendentes' },
      { id:'boletim',    icon:'📊', label:'Meu Boletim', desc:'Notas e desempenho acadêmico' },
    ],
  },
  {
    id: 'progresso',
    label: '🏆 Progresso & Conquistas',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,.06)',
    border: 'rgba(245,158,11,.2)',
    actions: [
      { id:'gamificacao', icon:'🏆', label:'Minhas Conquistas', desc:'XP, medalhas e ranking' },
      { id:'relatorios',  icon:'📈', label:'Meu Desempenho', desc:'Análise do seu progresso' },
      { id:'chatbot',     icon:'🤖', label:'Assistente Lumi', desc:'Tire dúvidas com IA' },
    ],
  },
  {
    id: 'comunicacao',
    label: '📌 Comunicação',
    color: '#10b981',
    bg: 'rgba(16,185,129,.06)',
    border: 'rgba(16,185,129,.2)',
    actions: [
      { id:'mural', icon:'📌', label:'Mural de Avisos', desc:'Avisos e comunicados da turma' },
    ],
  },
];

export default function AlunoHome({ onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ disciplinas:0, atividades_pendentes:0, xp_total:0, streak:0 });

  useEffect(() => {
    Promise.all([
      api.get('/disciplinas').catch(() => ({ data: { disciplinas: [] } })),
      api.get('/atividades').catch(() => ({ data: { atividades: [] } })),
      api.get('/gamificacao/perfil').catch(() => ({ data: null })),
    ]).then(([d, a, g]) => {
      const discs = d.data.disciplinas || [];
      const ativs = a.data.atividades || [];
      const perfil = g.data;
      setStats({
        disciplinas: discs.length,
        atividades_pendentes: ativs.filter(at => {
          const minha = at.minha_entrega;
          return !minha || minha.status === 'pendente';
        }).length,
        xp_total: perfil?.xp_total || 0,
        streak: perfil?.streak_atual || 0,
      });
    });
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = user?.nome?.split(' ')[0] || 'Aluno';

  return (
    <div style={{ width:'100%', padding:'0 0 2rem' }}>

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0a2a1a 100%)',
        borderRadius: 20, padding: '2rem 2.5rem', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1.5rem',
        boxShadow: '0 8px 32px rgba(15,23,42,.3)',
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            {saudacao} 👋
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-.5px' }}>
            {nome}! <span style={{ fontSize: 22 }}>🎓</span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', margin: 0 }}>
            Continue sua jornada de aprendizagem hoje!
          </p>
        </div>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon:'📖', label:'Disciplinas', val: stats.disciplinas, color: '#a78bfa' },
            { icon:'📋', label:'Pendentes',   val: stats.atividades_pendentes, color: '#f87171' },
            { icon:'⭐', label:'XP Total',    val: stats.xp_total, color: '#fbbf24' },
            { icon:'🔥', label:'Streak',      val: stats.streak + 'd', color: '#fb923c' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,.07)', borderRadius: 12,
              padding: '10px 16px', textAlign: 'center', minWidth: 68,
              border: '1px solid rgba(255,255,255,.1)',
            }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.label}</div>
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

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';
import { StatCard, WelcomeBanner, ProgressBar } from '../../../components/ui';

const NIVEL_LABELS = ['Iniciante','Básico','Intermediário','Avançado','Expert','Mestre','Lendário'];
const NIVEL_EMOJIS = ['🌱','📘','⚡','🔥','💎','👑','🏆'];

function thetaToLevel(theta) {
  if (theta <= -2.5) return 0; if (theta <= -1.5) return 1; if (theta <= -0.5) return 2;
  if (theta <= 0.5) return 3;  if (theta <= 1.5) return 4;  if (theta <= 2.5) return 5;
  return 6;
}

export default function AlunoHome() {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [trilhas, setTrilhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/respostas/stats/'),
      api.get('/trilhas'),
      api.get('/respostas/minhas'),
    ]).then(([sRes, tRes, rRes]) => {
      setStats(sRes.data);
      const ts = tRes.data.trilhas || [];
      const resps = rRes.data.respostas || [];
      const byTrilha = {};
      resps.forEach(r => { if (!byTrilha[r.trilha_id]) byTrilha[r.trilha_id] = { corretas:0, total:0 }; byTrilha[r.trilha_id].total++; if(r.is_correct) byTrilha[r.trilha_id].corretas++; });
      setTrilhas(ts.slice(0, 3).map(t => ({ ...t, prog: byTrilha[t.id] ? Math.round(byTrilha[t.id].corretas/Math.max(byTrilha[t.id].total,1)*100) : 0 })));
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const theta  = stats?.theta || 0;
  const nivel  = thetaToLevel(theta);
  const emoji  = NIVEL_EMOJIS[nivel];
  const label  = NIVEL_LABELS[nivel];
  const firstName = user.nome.split(' ')[0];

  return (
    <>
      <WelcomeBanner greeting={`Olá, ${firstName}! ${emoji}`} sub={loading ? 'Carregando seu progresso...' : `Nível: ${label} · θ = ${theta.toFixed(2)}`} emoji="🚀" />
      <div className="stats-grid">
        <StatCard label="XP Total"          value={loading?'..':stats?.xp_total||0}              icon="⭐" accent="accent-amber" />
        <StatCard label="Questões Respondidas" value={loading?'..':stats?.total_respostas||0}     icon="✅" accent="accent-green" />
        <StatCard label="Taxa de Acerto"    value={loading?'..':` ${stats?.taxa_acerto||0}%`}     icon="🎯" accent="accent-sky" />
        <StatCard label="Nível"             value={loading?'..':label}                             icon={emoji} accent="accent-coral" />
      </div>
      {trilhas.length > 0 && (
        <>
          <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>Progresso nas Trilhas</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem' }}>
            {trilhas.map(t => (
              <div key={t.id} className="trail-card">
                <div className="trail-header"><h3>{t.nome}</h3><p>{t.descricao}</p></div>
                <div className="trail-progress">
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'var(--slate-500)' }}>Progresso</span>
                    <span style={{ fontWeight:700, color:'var(--emerald-dark)' }}>{t.prog}%</span>
                  </div>
                  <ProgressBar value={t.prog} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {!loading && trilhas.length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🗺️</div>
          <div>Nenhuma trilha disponível ainda. Aguarde seu professor adicionar conteúdo!</div>
        </div>
      )}
    </>
  );
}

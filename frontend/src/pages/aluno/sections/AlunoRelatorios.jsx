import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { StatCard } from '../../../components/ui';
import CurvaCaracteristica from '../../../components/tri/CurvaCaracteristica';

function ThetaGauge({ theta }) {
  const pct = Math.round(((theta + 4) / 8) * 100);
  const cor = theta<=-2.5?'#94a3b8':theta<=-1.5?'#60a5fa':theta<=-.5?'#34d399':theta<=.5?'#fbbf24':theta<=1.5?'#f97316':theta<=2.5?'#a855f7':'#ef4444';
  const label = theta<=-2.5?'Iniciante':theta<=-1.5?'Básico':theta<=-.5?'Intermediário':theta<=.5?'Avançado':theta<=1.5?'Expert':theta<=2.5?'Mestre':'Lendário';
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ position:'relative', width:120, height:60, margin:'0 auto 8px' }}>
        <svg viewBox="0 0 120 60" style={{ overflow:'visible' }}>
          <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round"/>
          <path d="M10,55 A50,50 0 0,1 110,55" fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${pct * 1.57} 157`}/>
        </svg>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, color:cor }}>{theta.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:cor }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--slate-400)' }}>Habilidade estimada (θ)</div>
    </div>
  );
}

export default function AlunoRelatorios() {
  const [stats, setStats]     = useState(null);
  const [respostas, setResp]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/respostas/stats/'),
      api.get('/respostas/minhas'),
    ]).then(([sRes, rRes]) => {
      setStats(sRes.data);
      setResp(rRes.data.respostas || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;

  const theta = stats?.theta || 0;
  const nivel = stats?.nivel || {};

  // Últimas 10 respostas para histórico
  const recentes = [...(respostas)].reverse().slice(0, 10);

  // Distribuição por tipo
  const porTipo = respostas.reduce((acc, r) => { acc[r.tipo]=(acc[r.tipo]||{total:0,corretas:0}); acc[r.tipo].total++; if(r.is_correct)acc[r.tipo].corretas++; return acc; }, {});

  return (
    <>
      <div className="page-header">
        <div className="page-title">Meu Desempenho</div>
        <div className="page-sub">Análise completa do seu progresso e habilidade estimada via TRI</div>
      </div>

      {/* Stats principais */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Questões Respondidas" value={stats?.total_respostas||0} icon="✅" accent="accent-sky" />
        <StatCard label="Taxa de Acerto"        value={`${stats?.taxa_acerto||0}%`} icon="🎯" accent="accent-green" />
        <StatCard label="XP Total"              value={stats?.xp_total||0} icon="⭐" accent="accent-amber" />
        <StatCard label="Nível"                 value={nivel.emoji||'🌱'} icon={nivel.emoji||'🌱'} accent="accent-coral" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* Theta gauge */}
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>Habilidade TRI Estimada</div>
          <ThetaGauge theta={theta} />
          <div style={{ marginTop:12, fontSize:11, color:'var(--slate-400)', textAlign:'center' }}>
            Calculado via EAP com base em {stats?.total_respostas||0} respostas
          </div>
        </div>

        {/* Histórico recente */}
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Histórico Recente</div>
          {recentes.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div>Nenhuma resposta ainda. Comece uma trilha!</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {recentes.map(r => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--slate-50)', border:'1px solid var(--slate-100)' }}>
                  <span style={{ fontSize:16 }}>{r.is_correct?'✅':r.score>0?'⚡':'❌'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      Questão #{r.questao_id} · {r.tipo?.replace(/_/g,' ')}
                    </div>
                    <div style={{ fontSize:11, color:'var(--slate-400)' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: r.is_correct?'var(--emerald-dark)':'var(--coral)' }}>{Math.round(r.score*100)}%</div>
                    <div style={{ fontSize:11, color:'#f59e0b' }}>+{r.xp_ganho||0}⭐</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desempenho por tipo */}
      {Object.keys(porTipo).length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Desempenho por Tipo de Questão</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tipo</th><th>Total</th><th>Corretas</th><th>Taxa</th><th>Barra</th></tr></thead>
              <tbody>
                {Object.entries(porTipo).map(([tipo, d]) => {
                  const taxa = Math.round(d.corretas/d.total*100);
                  return (
                    <tr key={tipo}>
                      <td style={{ fontWeight:500, textTransform:'capitalize' }}>{tipo.replace(/_/g,' ')}</td>
                      <td>{d.total}</td>
                      <td>{d.corretas}</td>
                      <td><span style={{ fontWeight:700, color:taxa>=70?'var(--emerald-dark)':taxa>=40?'#f59e0b':'var(--coral)' }}>{taxa}%</span></td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ height:6, background:'var(--slate-200)', borderRadius:99 }}>
                          <div style={{ height:6, borderRadius:99, background:taxa>=70?'var(--emerald)':taxa>=40?'#f59e0b':'var(--coral)', width:`${taxa}%` }}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

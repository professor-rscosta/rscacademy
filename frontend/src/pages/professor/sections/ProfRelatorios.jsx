import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { StatCard } from '../../../components/ui';

function ThetaBar({ theta, max = 4 }) {
  const pct = Math.round(((theta + max) / (max * 2)) * 100);
  const cor = theta <= -2 ? '#94a3b8' : theta <= -1 ? '#60a5fa' : theta <= 0 ? '#34d399' : theta <= 1 ? '#fbbf24' : theta <= 2 ? '#f97316' : '#a855f7';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--slate-200)', borderRadius:99 }}>
        <div style={{ height:6, borderRadius:99, background:cor, width:`${pct}%`, transition:'width .4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:cor, minWidth:36 }}>{theta.toFixed(2)}</span>
    </div>
  );
}

export default function ProfRelatorios() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [turmaSel, setTurmaSel] = useState('');
  const [turmaDet, setTurmaDet] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/professor'),
      api.get('/turmas?professor_id=me').catch(() => ({ data:{ turmas:[] } })),
    ]).then(([rRes]) => {
      setData(rRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!turmaSel) { setTurmaDet(null); return; }
    api.get(`/relatorios/turma/${turmaSel}`)
      .then(r => setTurmaDet(r.data))
      .catch(console.error);
  }, [turmaSel]);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;
  if (!data) return null;

  const { resumo, por_trilha=[], top_alunos=[] } = data;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Relatórios</div>
        <div className="page-sub">Análise de desempenho com TRI — habilidades, acertos e evolução dos alunos</div>
      </div>

      {/* Resumo */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Total de Alunos" value={resumo.total_alunos} icon="👨‍🎓" accent="accent-sky" />
        <StatCard label="Questões Respondidas" value={resumo.total_respostas} icon="✅" accent="accent-green" />
        <StatCard label="Taxa de Acerto Geral" value={`${resumo.taxa_acerto_geral}%`} icon="🎯" accent="accent-amber" />
        <StatCard label="Questões Calibradas" value={`${resumo.questoes_calibradas}/${resumo.total_questoes}`} icon="📊" accent="accent-coral" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* Por trilha */}
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Desempenho por Trilha</div>
          {por_trilha.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--slate-400)', padding:'1.5rem', fontSize:13 }}>Nenhuma trilha com respostas ainda</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {por_trilha.map(t => (
                <div key={t.trilha_id} style={{ padding:'10px 12px', borderRadius:8, border:'1px solid var(--slate-100)', background:'var(--slate-50)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{t.nome}</span>
                    <span style={{ fontSize:11, color: t.taxa_acerto >= 70 ? 'var(--emerald-dark)' : t.taxa_acerto >= 40 ? '#92400e' : 'var(--coral)', fontWeight:700 }}>{t.taxa_acerto}% acertos</span>
                  </div>
                  <div style={{ height:4, background:'var(--slate-200)', borderRadius:99 }}>
                    <div style={{ height:4, borderRadius:99, background: t.taxa_acerto >= 70 ? 'var(--emerald)' : t.taxa_acerto >= 40 ? '#f59e0b' : 'var(--coral)', width:`${t.taxa_acerto}%` }} />
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:4, fontSize:11, color:'var(--slate-400)' }}>
                    <span>❓ {t.total_questoes} questões</span>
                    <span>📝 {t.total_respostas} respostas</span>
                    <span style={{ color: t.questoes_calibradas > 0 ? 'var(--emerald-dark)' : 'var(--slate-400)' }}>✅ {t.questoes_calibradas} calibradas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top alunos por theta */}
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Ranking de Habilidade (θ TRI)</div>
          {top_alunos.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--slate-400)', padding:'1.5rem', fontSize:13 }}>Nenhum aluno com respostas ainda</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {top_alunos.slice(0, 8).map((a, i) => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--slate-200)', color: i < 3 ? 'white' : 'var(--slate-500)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--navy)', marginBottom:3 }}>{a.nome}</div>
                    <ThetaBar theta={a.theta} />
                  </div>
                  <span style={{ fontSize:16, flexShrink:0 }}>{a.emoji}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detalhamento por turma */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Detalhamento por Turma</div>
          <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
            style={{ padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}>
            <option value="">Selecione uma turma...</option>
            {(data.turmas_prof || []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>

        {!turmaSel && (
          <div style={{ textAlign:'center', color:'var(--slate-400)', padding:'2rem', fontSize:13 }}>
            Selecione uma turma acima para ver o desempenho individual dos alunos
          </div>
        )}

        {turmaSel && !turmaDet && (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        )}

        {turmaDet && (
          <div className="table-wrap" style={{ marginTop:'1rem' }}>
            <table>
              <thead><tr><th>Aluno</th><th>Habilidade (θ)</th><th>Nível</th><th>Respostas</th><th>Taxa Acerto</th><th>XP</th></tr></thead>
              <tbody>
                {(turmaDet.alunos || []).map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight:500 }}>{a.nome}</td>
                    <td><ThetaBar theta={a.theta || 0} /></td>
                    <td>{a.emoji} {a.nivel}</td>
                    <td>{a.total_respostas}</td>
                    <td><span style={{ fontWeight:700, color: a.taxa_acerto >= 70 ? 'var(--emerald-dark)' : a.taxa_acerto >= 40 ? '#f59e0b' : 'var(--coral)' }}>{a.taxa_acerto}%</span></td>
                    <td style={{ color:'#f59e0b', fontWeight:600 }}>⭐ {a.xp_total}</td>
                  </tr>
                ))}
                {(turmaDet.alunos||[]).length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--slate-400)', padding:'1.5rem' }}>Nenhum aluno matriculado nesta turma</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

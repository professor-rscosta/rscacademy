import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { StatCard } from '../../../components/ui';

function MiniBar({ value, max = 100, color = 'var(--emerald)' }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--slate-200)', borderRadius:99 }}>
        <div style={{ height:6, borderRadius:99, background:color, width:`${pct}%`, transition:'width .4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color, minWidth:28 }}>{value}</span>
    </div>
  );
}

export default function AdminRelatorios() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/relatorios/admin')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;
  if (!data) return null;

  const { usuarios, conteudo, atividade, top_alunos = [] } = data;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Relatórios do Sistema</div>
        <div className="page-sub">Analytics globais da plataforma RSC Academy</div>
      </div>

      {/* Stats principais */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Total de Usuários"     value={usuarios.total}       icon="👥" accent="accent-sky" />
        <StatCard label="Questões Respondidas"  value={atividade.total_respostas} icon="📝" accent="accent-green" />
        <StatCard label="Taxa de Acerto Geral"  value={`${atividade.taxa_acerto}%`} icon="🎯" accent="accent-amber" />
        <StatCard label="θ Médio dos Alunos"    value={atividade.theta_medio_alunos?.toFixed(2)} icon="📊" accent="accent-coral" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* Distribuição de usuários */}
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Usuários por Perfil</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Alunos',     value: usuarios.por_perfil?.aluno     || 0, color:'var(--sky)',    emoji:'👨‍🎓' },
              { label:'Professores',value: usuarios.por_perfil?.professor || 0, color:'var(--emerald)', emoji:'👨‍🏫' },
              { label:'Admins',     value: usuarios.por_perfil?.admin     || 0, color:'#a855f7',       emoji:'👑' },
            ].map(p => (
              <div key={p.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12, fontWeight:500, color:'var(--slate-700)' }}>
                  <span>{p.emoji} {p.label}</span>
                  <span style={{ color:p.color }}>{p.value}</span>
                </div>
                <MiniBar value={p.value} max={usuarios.total} color={p.color} />
              </div>
            ))}
            {usuarios.pendentes > 0 && (
              <div style={{ marginTop:4, padding:'8px 12px', background:'#fffbeb', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
                ⏳ {usuarios.pendentes} cadastro(s) aguardando aprovação
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Conteúdo da Plataforma</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Disciplinas', value:conteudo.disciplinas, icon:'📚', color:'var(--sky)' },
              { label:'Turmas',      value:conteudo.turmas,      icon:'🏫', color:'var(--emerald)' },
              { label:'Questões',    value:conteudo.questoes,    icon:'❓', color:'var(--amber)' },
            ].map(c => (
              <div key={c.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'var(--slate-50)', borderRadius:8 }}>
                <span style={{ fontSize:13, color:'var(--slate-700)' }}>{c.icon} {c.label}</span>
                <span style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700, color:c.color }}>{c.value}</span>
              </div>
            ))}
            <div style={{ padding:'10px 12px', background:'var(--slate-50)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--slate-700)' }}>✅ Questões Calibradas</span>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:'var(--emerald-dark)' }}>{conteudo.questoes_calibradas}</span>
                <span style={{ fontSize:11, color:'var(--slate-400)' }}>/ {conteudo.questoes}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top alunos ranking */}
      {top_alunos.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>Top Alunos — Habilidade TRI (θ)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Aluno</th><th>Theta (θ)</th><th>Respostas</th><th>Barra de habilidade</th></tr>
              </thead>
              <tbody>
                {top_alunos.map((a, i) => {
                  const pct = Math.round(((a.theta + 4) / 8) * 100);
                  const cor = a.theta <= -2 ? '#94a3b8' : a.theta <= 0 ? '#34d399' : a.theta <= 1.5 ? '#f97316' : '#a855f7';
                  return (
                    <tr key={a.id}>
                      <td>
                        <span style={{ fontWeight:700, color: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'var(--slate-400)', fontSize:14 }}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                        </span>
                      </td>
                      <td style={{ fontWeight:500 }}>{a.nome}</td>
                      <td style={{ fontWeight:700, color:cor }}>{a.theta.toFixed(2)}</td>
                      <td style={{ color:'var(--slate-500)' }}>{a.total_respostas}</td>
                      <td style={{ minWidth:140 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, height:6, background:'var(--slate-200)', borderRadius:99 }}>
                            <div style={{ height:6, borderRadius:99, background:cor, width:`${pct}%` }} />
                          </div>
                          <span style={{ fontSize:10, color:'var(--slate-400)', minWidth:28 }}>{pct}%</span>
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

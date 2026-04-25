import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';

function XPBar({ xp, nivel }) {
  const pct = nivel.progress_pct || 0;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'var(--slate-500)' }}>{nivel.label}</span>
        {nivel.xp_next && <span style={{ color:'var(--slate-400)' }}>{xp} / {nivel.xp_next} XP</span>}
      </div>
      <div style={{ height:10, background:'var(--slate-200)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:10, borderRadius:99, background:'linear-gradient(90deg,var(--emerald),var(--emerald-light))', width:''+(pct)+'%', transition:'width .5s' }} />
      </div>
      {nivel.xp_next && <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>Faltam {nivel.xp_next - xp} XP para o próximo nível</div>}
    </div>
  );
}

export default function AlunoGamificacao() {
  const [perfil, setPerfil]   = useState(null);
  const [ranking, setRanking] = useState([]);
  const [medalhas, setMedalhas] = useState([]);
  const [missoes, setMissoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTab]    = useState('perfil');

  useEffect(() => {
    Promise.all([
      api.get('/gamificacao/perfil'),
      api.get('/gamificacao/ranking?limit=10'),
      api.get('/gamificacao/medalhas'),
      api.get('/gamificacao/missoes'),
    ]).then(([pRes, rRes, mRes, msRes]) => {
      setPerfil(pRes.data);
      setRanking(rRes.data.ranking || []);
      setMedalhas(mRes.data.medalhas || []);
      setMissoes(msRes.data.missoes || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;

  return (
    <>
      <div className="page-header"><div className="page-title">Gamificação</div><div className="page-sub">XP, Medalhas, Missões e Ranking</div></div>

      {/* Card de perfil gamificado */}
      {perfil && (
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:16, padding:'1.5rem', marginBottom:'1.5rem', color:'white', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, opacity:.05, backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'24px 24px' }} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:16, position:'relative', zIndex:1 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ fontSize:42 }}>{perfil.nivel?.emoji}</div>
                <div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700 }}>{perfil.nivel?.label}</div>
                  <div style={{ fontSize:12, opacity:.6 }}>Nível {perfil.nivel?.nivel} · #{perfil.posicao_ranking} no ranking</div>
                </div>
              </div>
              <XPBar xp={perfil.xp_total} nivel={perfil.nivel} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
              {[{l:'XP Total',v:'⭐ '+(perfil.xp_total)},{l:'Streak',v:'🔥 '+(perfil.streak_atual)+' dias'},{l:'Medalhas',v:'🏅 '+(perfil.medalhas?.length||0)+'/'+(perfil.total_medalhas_disponiveis||0)},{l:'Taxa Acerto',v:'🎯 '+(perfil.taxa_acerto)+'%'}].map(s=>(
                <div key={s.l} style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10, opacity:.5 }}>{s.l}</div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:'1.5rem' }}>
        {[['perfil','🎯 Missões'],['medalhas','🏅 Medalhas'],['ranking','🏆 Ranking']].map(([id,label]) => (
          <div key={id} className={`tab ${tabAtiva===id?'active':''}`} onClick={() => setTab(id)}>{label}</div>
        ))}
      </div>

      {/* Missões */}
      {tabAtiva === 'perfil' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {missoes.length === 0 ? (
            <div className="card" style={{ textAlign:'center', color:'var(--slate-400)', padding:'2rem' }}>Nenhuma missão ativa no momento.</div>
          ) : missoes.map(m => (
            <div key={m.id} className="card" style={{ borderLeft:'4px solid '+(m.concluida?'var(--emerald)':'var(--sky)') }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{m.icone}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:2 }}>
                    {m.titulo}
                    {m.tipo === 'diaria' && <span style={{ marginLeft:6, padding:'2px 6px', borderRadius:50, background:'#e0f2fe', color:'#0369a1', fontSize:10, fontWeight:600 }}>DIÁRIA</span>}
                    {m.tipo === 'semanal' && <span style={{ marginLeft:6, padding:'2px 6px', borderRadius:50, background:'#ede9fe', color:'#5b21b6', fontSize:10, fontWeight:600 }}>SEMANAL</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8 }}>{m.descricao}</div>
                  <div style={{ height:6, background:'var(--slate-200)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:6, borderRadius:99, background: m.concluida ? 'var(--emerald)' : 'var(--sky)', width:''+(m.pct)+'%', transition:'width .4s' }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:3 }}>{m.progresso}/{m.meta_valor} · {m.pct}%</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>+{m.xp_recompensa} XP</div>
                  {m.concluida && !m.recompensa_coletada && (
                    <div style={{ padding:'4px 10px', borderRadius:6, background:'var(--emerald)', color:'white', fontSize:11, fontWeight:600, marginTop:4 }}>✅ Completa</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Medalhas */}
      {tabAtiva === 'medalhas' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
          {medalhas.map(m => (
            <div key={m.id} style={{ background:'white', border:'2px solid '+(m.conquistada?'#fcd34d':'var(--slate-200)'), borderRadius:12, padding:'1.25rem', textAlign:'center', opacity: m.conquistada ? 1 : 0.5, transition:'all .2s' }}>
              <div style={{ fontSize:36, marginBottom:8, filter: m.conquistada ? 'none' : 'grayscale(100%)' }}>{m.icone}</div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', marginBottom:4 }}>{m.nome}</div>
              <div style={{ fontSize:11, color:'var(--slate-500)', marginBottom:8 }}>{m.descricao}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'#f59e0b' }}>+{m.xp_bonus} XP</div>
              {m.conquistada && m.conquistada_em && (
                <div style={{ fontSize:10, color:'var(--emerald-dark)', marginTop:4 }}>✅ {new Date(m.conquistada_em).toLocaleDateString('pt-BR')}</div>
              )}
              {!m.conquistada && <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:4 }}>🔒 Não conquistada</div>}
            </div>
          ))}
        </div>
      )}

      {/* Ranking */}
      {tabAtiva === 'ranking' && (
        <div className="card">
          <div className="section-title" style={{ marginBottom:'1rem' }}>🏆 Ranking Geral — Top {ranking.length}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {ranking.map((u, i) => {
              const bg = i===0?'linear-gradient(135deg,#fef3c7,#fde68a)':i===1?'linear-gradient(135deg,#f1f5f9,#e2e8f0)':i===2?'linear-gradient(135deg,#fff7ed,#fed7aa)':'white';
              const bd = i===0?'#fcd34d':i===1?'#cbd5e1':i===2?'#fdba74':'var(--slate-200)';
              return (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, background:bg, border:'2px solid '+(bd) }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#b45309':'var(--slate-200)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700, fontSize:i<3?16:12, color:'white' }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'var(--navy)' }}>{u.nome}</div>
                    <div style={{ fontSize:11, color:'var(--slate-500)' }}>{u.nivel?.emoji} {u.nivel?.label}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, color:'#f59e0b' }}>⭐ {u.xp_total}</div>
                    <div style={{ fontSize:10, color:'var(--slate-400)' }}>θ = {(u.theta||0).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

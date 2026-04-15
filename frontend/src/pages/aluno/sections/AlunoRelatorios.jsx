/**
 * AlunoRelatorios — Relatório completo com histórico detalhado
 * Inclui: respostas, feedback, acertos/erros por avaliação/trilha
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { StatCard } from '../../../components/ui';

// ── Helpers ──────────────────────────────────────────────────
const pct = (a, b) => b > 0 ? Math.round(a/b*100) : 0;
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function scoreColor(score) {
  if (score >= 0.8) return { bg:'#dcfce7', cor:'#166534', label:'✅ Correto' };
  if (score >= 0.4) return { bg:'#fef3c7', cor:'#92400e', label:'⚡ Parcial' };
  return { bg:'#fee2e2', cor:'#991b1b', label:'❌ Incorreto' };
}

// ── Theta Bar ────────────────────────────────────────────────
function ThetaBar({ theta, max=4 }) {
  const pctV = Math.round(((theta + max) / (max * 2)) * 100);
  const cor = theta <= -2 ? '#94a3b8' : theta <= -1 ? '#60a5fa' : theta <= 0 ? '#34d399' : theta <= 1 ? '#fbbf24' : theta <= 2 ? '#f97316' : '#a855f7';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--slate-200)', borderRadius:99 }}>
        <div style={{ height:6, borderRadius:99, background:cor, width:pctV+'%', transition:'width .4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:cor, minWidth:40 }}>θ={theta.toFixed(2)}</span>
    </div>
  );
}

// ── Card de resposta individual ───────────────────────────────
function RespostaCard({ r, idx }) {
  const [expandido, setExpandido] = useState(false);
  const sc = scoreColor(r.score || 0);

  const renderResposta = (resp, tipo) => {
    if (resp === null || resp === undefined) return <em style={{ color:'var(--slate-400)' }}>Sem resposta</em>;
    if (typeof resp === 'boolean') return resp ? 'Verdadeiro' : 'Falso';
    if (Array.isArray(resp)) return resp.join(', ');
    if (typeof resp === 'object') return JSON.stringify(resp);
    return String(resp);
  };

  const renderGabarito = (gab, tipo) => {
    if (gab === null || gab === undefined) return null;
    if (typeof gab === 'boolean') return gab ? 'Verdadeiro' : 'Falso';
    if (Array.isArray(gab)) return gab.join(', ');
    if (typeof gab === 'object') return JSON.stringify(gab);
    return String(gab);
  };

  return (
    <div style={{
      border:'1px solid '+(r.is_correct?'#a7f3d0':r.score>=0.4?'#fde68a':'#fca5a5'),
      borderRadius:10, overflow:'hidden', marginBottom:8,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpandido(e => !e)}
        style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
          background: r.is_correct?'#f0fdf4':r.score>=0.4?'#fffbeb':'#fef2f2',
          cursor:'pointer', userSelect:'none',
        }}
      >
        <span style={{ fontSize:16, fontWeight:700, color:sc.cor, minWidth:24 }}>
          {r.is_correct ? '✅' : r.score >= 0.4 ? '⚡' : '❌'}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {r.questao_enunciado ? r.questao_enunciado.slice(0,90)+(r.questao_enunciado.length>90?'...':'') : `Questão #${r.questao_id}`}
          </div>
          <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:1, display:'flex', gap:8, flexWrap:'wrap' }}>
            <span>{r.trilha_nome || '—'}</span>
            <span>•</span>
            <span>{r.questao_tipo || '—'}</span>
            <span>•</span>
            <span>{formatDate(r.created_at)}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:sc.bg, color:sc.cor, fontWeight:700 }}>
            {sc.label} ({Math.round((r.score||0)*100)}%)
          </span>
          <span style={{ fontSize:14, color:'#f59e0b', fontWeight:700 }}>⚡+{r.xp_ganho||0}</span>
          <span style={{ fontSize:12, color:'var(--slate-400)' }}>{expandido ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div style={{ padding:'14px', background:'white', borderTop:'1px solid var(--slate-100)' }}>
          {/* Enunciado completo */}
          {r.questao_enunciado && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>📝 Questão</div>
              <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.6, background:'var(--slate-50)', padding:'10px 12px', borderRadius:8 }}>
                {r.questao_enunciado}
              </div>
            </div>
          )}

          {/* Resposta do aluno vs Gabarito */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div style={{ background: r.is_correct?'#f0fdf4':'#fef2f2', borderRadius:8, padding:'10px 12px', border:'1px solid '+(r.is_correct?'#a7f3d0':'#fca5a5') }}>
              <div style={{ fontSize:11, fontWeight:700, color:r.is_correct?'#166534':'#991b1b', marginBottom:4 }}>
                {r.is_correct ? '✅ Sua resposta (Correta)' : '❌ Sua resposta'}
              </div>
              <div style={{ fontSize:13, color:'var(--navy)', fontWeight:600 }}>
                {renderResposta(r.resposta, r.questao_tipo)}
              </div>
            </div>
            {!r.is_correct && r.questao_gabarito !== null && r.questao_gabarito !== undefined && (
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 12px', border:'1px solid #a7f3d0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#166534', marginBottom:4 }}>✅ Resposta Correta</div>
                <div style={{ fontSize:13, color:'#166534', fontWeight:600 }}>
                  {renderGabarito(r.questao_gabarito, r.questao_tipo)}
                </div>
              </div>
            )}
          </div>

          {/* Explicação */}
          {r.questao_explicacao && (
            <div style={{ background:'#eff6ff', borderRadius:8, padding:'10px 12px', border:'1px solid #bfdbfe', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', marginBottom:4 }}>💡 Explicação</div>
              <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.6 }}>{r.questao_explicacao}</div>
            </div>
          )}

          {/* Feedback IA */}
          {r.feedback_ia && (
            <div style={{ background:'#f5f3ff', borderRadius:8, padding:'10px 12px', border:'1px solid #ddd6fe' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#6d28d9', marginBottom:4 }}>🤖 Feedback da IA</div>
              <div style={{ fontSize:13, color:'#5b21b6', lineHeight:1.6 }}>{r.feedback_ia}</div>
            </div>
          )}

          {/* Meta */}
          <div style={{ display:'flex', gap:12, marginTop:10, paddingTop:10, borderTop:'1px solid var(--slate-100)', fontSize:11, color:'var(--slate-400)' }}>
            <span>Score: {Math.round((r.score||0)*100)}%</span>
            <span>•</span>
            <span>θ antes: {r.theta_antes?.toFixed(2)??'—'} → depois: {r.theta_depois?.toFixed(2)??'—'}</span>
            {r.tempo_gasto_ms && <><span>•</span><span>⏱ {Math.round(r.tempo_gasto_ms/1000)}s</span></>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function AlunoRelatorios() {
  const [stats, setStats]     = useState(null);
  const [respostas, setResp]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba]         = useState('historico');
  const [filtroTrilha, setFT] = useState('');
  const [filtroRes, setFR]    = useState('todas'); // todas | corretas | incorretas
  const [busca, setBusca]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/respostas/stats/'),
      api.get('/respostas/minhas'),
    ]).then(([sRes, rRes]) => {
      setStats(sRes.data);
      setResp(rRes.data.respostas || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'auto' }} /></div>;

  const respostasOrdenadas = [...respostas].reverse();

  // Trilhas disponíveis para filtro
  const trilhas = [...new Set(respostas.map(r => r.trilha_nome).filter(Boolean))];

  // Filtros aplicados
  const respostasFiltradas = respostasOrdenadas.filter(r => {
    if (filtroTrilha && r.trilha_nome !== filtroTrilha) return false;
    if (filtroRes === 'corretas' && !r.is_correct) return false;
    if (filtroRes === 'incorretas' && r.is_correct) return false;
    if (busca && !(r.questao_enunciado||'').toLowerCase().includes(busca.toLowerCase()) &&
        !(r.trilha_nome||'').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Agrupado por trilha para aba de trilhas
  const porTrilha = respostas.reduce((acc, r) => {
    const k = r.trilha_nome || 'Sem trilha';
    if (!acc[k]) acc[k] = { corretas:0, total:0 };
    acc[k].total++;
    if (r.is_correct) acc[k].corretas++;
    return acc;
  }, {});

  // Estatísticas por tipo de questão
  const porTipo = respostas.reduce((acc, r) => {
    const t = r.questao_tipo || 'desconhecido';
    if (!acc[t]) acc[t] = { total:0, corretas:0 };
    acc[t].total++;
    if (r.is_correct) acc[t].corretas++;
    return acc;
  }, {});

  const TABS = [
    { id:'historico',  label:'📋 Histórico', count: respostas.length },
    { id:'trilhas',    label:'🗺️ Por Trilha', count: Object.keys(porTrilha).length },
    { id:'tipos',      label:'🎯 Por Tipo', count: Object.keys(porTipo).length },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-title">📊 Meu Desempenho</div>
        <div className="page-sub">Histórico detalhado de respostas, acertos e feedbacks</div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:'1.5rem' }}>
          <StatCard label="Total Respostas" value={stats.total_respostas||0} icon="📝" accent="accent-sky" />
          <StatCard label="Acertos" value={stats.corretas||0} icon="✅" accent="accent-green" />
          <StatCard label="Taxa de Acerto" value={(stats.taxa_acerto||0)+'%'} icon="🎯" accent="accent-emerald" />
          <StatCard label="XP Total" value={'⚡'+( stats.xp_total||0)} icon="🏆" accent="accent-yellow" />
          <StatCard label="Nível TRI" value={stats.nivel?.label||'—'} icon={stats.nivel?.emoji||'🌱'} accent="accent-purple" />
        </div>
      )}

      {stats && (
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--slate-600)', marginBottom:8 }}>
            Habilidade TRI (θ = {stats.theta?.toFixed(2)})
          </div>
          <ThetaBar theta={stats.theta || 0} />
          <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:6 }}>
            Calculado via EAP com base em {stats.total_respostas||0} respostas
          </div>
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:4, borderBottom:'2px solid var(--slate-200)', marginBottom:'1.25rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)} style={{
            padding:'9px 16px', border:'none', background:'none', cursor:'pointer',
            fontWeight: aba===t.id?800:400, color: aba===t.id?'var(--emerald)':'var(--slate-500)',
            borderBottom: aba===t.id?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{t.label} <span style={{ fontSize:11, opacity:.6 }}>({t.count})</span></button>
        ))}
      </div>

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div>
          {/* Filtros */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1rem', alignItems:'center' }}>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="🔍 Buscar questão..."
              style={{ flex:1, minWidth:180, padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'}
              onBlur={e=>e.target.style.borderColor='var(--slate-200)'}
            />
            <select value={filtroTrilha} onChange={e => setFT(e.target.value)}
              style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }}>
              <option value="">Todas as trilhas</option>
              {trilhas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display:'flex', gap:4 }}>
              {[['todas','Todas'],['corretas','✅ Acertos'],['incorretas','❌ Erros']].map(([v,l]) => (
                <button key={v} onClick={() => setFR(v)} style={{
                  padding:'7px 12px', border:'1px solid var(--slate-200)', borderRadius:8,
                  background: filtroRes===v ? 'var(--navy)' : 'white',
                  color: filtroRes===v ? 'white' : 'var(--slate-600)',
                  fontSize:12, fontWeight:600, cursor:'pointer',
                }}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize:12, color:'var(--slate-500)', whiteSpace:'nowrap' }}>{respostasFiltradas.length} resultado(s)</span>
          </div>

          {respostasFiltradas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--slate-400)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📝</div>
              <div style={{ fontWeight:600 }}>Nenhuma resposta encontrada</div>
            </div>
          ) : (
            respostasFiltradas.map((r, i) => <RespostaCard key={r.id || i} r={r} idx={i} />)
          )}
        </div>
      )}

      {/* ── ABA POR TRILHA ── */}
      {aba === 'trilhas' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {Object.entries(porTrilha).sort((a,b) => b[1].total - a[1].total).map(([nome, d]) => {
            const taxa = pct(d.corretas, d.total);
            const cor  = taxa>=70?'#10b981':taxa>=50?'#3b82f6':taxa>=30?'#f59e0b':'#ef4444';
            return (
              <div key={nome} style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>🗺️ {nome}</div>
                    <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>{d.total} respostas · {d.corretas} acertos · {d.total-d.corretas} erros</div>
                  </div>
                  <span style={{ fontSize:20, fontWeight:800, color:cor }}>{taxa}%</span>
                </div>
                <div style={{ height:8, background:'var(--slate-100)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:taxa+'%', background:cor, borderRadius:99, transition:'width .5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA POR TIPO ── */}
      {aba === 'tipos' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {Object.entries(porTipo).sort((a,b) => b[1].total - a[1].total).map(([tipo, d]) => {
            const taxa = pct(d.corretas, d.total);
            const cor  = taxa>=70?'#10b981':taxa>=50?'#3b82f6':'#ef4444';
            return (
              <div key={tipo} style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, padding:'14px' }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4 }}>{tipo.replace('_',' ')}</div>
                <div style={{ fontSize:24, fontWeight:800, color:cor, marginBottom:4 }}>{taxa}%</div>
                <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8 }}>{d.corretas}/{d.total} acertos</div>
                <div style={{ height:6, background:'var(--slate-100)', borderRadius:99 }}>
                  <div style={{ height:'100%', width:taxa+'%', background:cor, borderRadius:99 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

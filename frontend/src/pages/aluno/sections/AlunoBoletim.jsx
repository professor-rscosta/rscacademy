/**
 * AlunoBoletim — Boletim personalizado do aluno
 * Turma → Disciplinas → Avaliações → Notas + Situação + Trilhas
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';

const TIPO_ICONE = { prova:'📝', trabalho:'📋', simulado:'🎯', quiz:'⚡' };

// ── Barra de nota visual ──────────────────────────────────────
function NotaBar({ nota, minima = 6, peso, grande }) {
  if (nota === null || nota === undefined)
    return <span style={{ fontSize:12, color:'var(--slate-300)', fontStyle:'italic' }}>–</span>;
  const pct = Math.min(100, (nota / 10) * 100);
  const cor = nota >= 7 ? '#10b981' : nota >= minima ? '#f59e0b' : '#ef4444';
  const bg  = nota >= 7 ? '#f0fdf4' : nota >= minima ? '#fffbeb' : '#fef2f2';
  if (grande) return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-head)', fontSize:42, fontWeight:700, color:cor, lineHeight:1 }}>
        {nota.toFixed(1)}
      </div>
      <div style={{ fontSize:11, color:cor, fontWeight:600, marginTop:2 }}>/10</div>
    </div>
  );
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', width:80, height:7, background:'#e2e8f0', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
        <div style={{ position:'absolute', left:0, top:0, height:7, width:pct+'%', background:cor, borderRadius:99, transition:'width .6s' }} />
        <div style={{ position:'absolute', left:(minima*10)+'%', top:0, height:7, width:2, background:'rgba(0,0,0,.15)' }} />
      </div>
      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color:cor, padding:'1px 8px', borderRadius:6, background:bg }}>
        {nota.toFixed(1)}
      </span>
      {peso && <span style={{ fontSize:10, color:'var(--slate-400)' }}>×{peso}</span>}
    </div>
  );
}

// ── Badge de situação ─────────────────────────────────────────
function Badge({ s, mini }) {
  const cfgs = {
    aprovado:      ['#f0fdf4','#15803d','#86efac', mini?'APR':'✅ Aprovado'],
    reprovado:     ['#fef2f2','#b91c1c','#fca5a5', mini?'REP':'❌ Reprovado'],
    em_andamento:  ['#f0f9ff','#0284c7','#bae6fd', mini?'...':'📖 Em andamento'],
    nao_realizada: ['var(--slate-100)','var(--slate-500)','var(--slate-300)', mini?'-':'⏳ Não realizada'],
  };
  const [bg,cor,bd,lbl] = cfgs[s] || cfgs.nao_realizada;
  return (
    <span style={{ padding:mini?'2px 6px':'3px 11px', borderRadius:50, fontSize:mini?10:11, fontWeight:600, background:bg, color:cor, border:'1px solid '+bd, whiteSpace:'nowrap' }}>
      {lbl}
    </span>
  );
}

// ── Gauge de theta (nível de habilidade) ──────────────────────
function ThetaGauge({ theta, nivel, emoji }) {
  const pct = Math.max(0, Math.min(100, Math.round(((theta + 4) / 8) * 100)));
  const cor = theta <= -2.5?'#94a3b8': theta <= -1.5?'#60a5fa': theta <= -.5?'#34d399': theta <= .5?'#fbbf24': theta <= 1.5?'#f97316': theta <= 2.5?'#a855f7':'#ef4444';
  return (
    <div style={{ textAlign:'center', minWidth:120 }}>
      <div style={{ fontSize:36, marginBottom:4 }}>{emoji||'🌱'}</div>
      <div style={{ fontFamily:'var(--font-head)', fontSize:26, fontWeight:700, color:cor }}>{theta.toFixed(2)}</div>
      <div style={{ fontSize:12, fontWeight:600, color:cor, marginBottom:6 }}>{nivel}</div>
      <div style={{ height:6, background:'rgba(255,255,255,.2)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:6, width:pct+'%', background:cor, borderRadius:99, transition:'width .8s' }} />
      </div>
      <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', marginTop:3 }}>θ = {theta.toFixed(2)} · {pct}%</div>
    </div>
  );
}

// ── Detalhes de uma disciplina ────────────────────────────────
function DiscDetalhe({ disc, onBack }) {
  const cor = (n) => n===null?'var(--slate-400)':n>=7?'#10b981':n>=6?'#f59e0b':'#ef4444';
  return (
    <>
      <button onClick={onBack} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, marginBottom:'1.25rem' }}>
        ← Voltar
      </button>

      {/* Header da disciplina */}
      <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:16, overflow:'hidden', marginBottom:'1.25rem', boxShadow:'var(--shadow)' }}>
        <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white', display:'flex', alignItems:'center', gap:'1.5rem' }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>📚</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700 }}>{disc.nome}</div>
            <div style={{ fontSize:12, opacity:.6, marginTop:2 }}>{disc.codigo} · {disc.carga_horaria}h</div>
          </div>
          <div style={{ textAlign:'center' }}>
            {disc.media_disciplina !== null ? (
              <>
                <div style={{ fontFamily:'var(--font-head)', fontSize:42, fontWeight:700, lineHeight:1, color:cor(disc.media_disciplina) === '#10b981' ? '#34d399' : cor(disc.media_disciplina) === '#f59e0b' ? '#fbbf24' : '#f87171' }}>
                  {disc.media_disciplina.toFixed(1)}
                </div>
                <div style={{ fontSize:11, opacity:.6 }}>média</div>
              </>
            ) : (
              <div style={{ fontFamily:'var(--font-head)', fontSize:30, color:'rgba(255,255,255,.3)' }}>–</div>
            )}
          </div>
        </div>

        {/* Resumo rápido */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, borderTop:'1px solid var(--slate-100)' }}>
          {[
            { l:'Situação', v: <Badge s={disc.situacao} /> },
            { l:'Avaliações', v: disc.avaliacoes_realizadas+'/'+disc.total_avaliacoes+' realizadas' },
            { l:'Trilhas', v: (disc.trilhas?.filter(t=>t.progresso>=100).length||0)+'/'+disc.trilhas?.length+' completas' },
          ].map((item, i) => (
            <div key={i} style={{ padding:'12px 16px', borderRight: i<2?'1px solid var(--slate-100)':'none', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:4 }}>{item.l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        {/* Avaliações */}
        <div className="card">
          <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:'0.875rem' }}>📝 Avaliações</div>
          {disc.avaliacoes?.length === 0 ? (
            <div style={{ color:'var(--slate-400)', fontSize:13 }}>Nenhuma avaliação publicada.</div>
          ) : disc.avaliacoes.map(av => (
            <div key={av.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--slate-100)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{TIPO_ICONE[av.tipo]||'📝'}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{av.titulo}</div>
                <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:1 }}>
                  {av.total_tentativas}/{av.tentativas_permitidas} tentativa(s)
                  {av.realizada_em && ' · '+new Date(av.realizada_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <NotaBar nota={av.melhor_nota} minima={av.nota_minima} peso={av.peso} />
                <div style={{ marginTop:4 }}><Badge s={av.status_aluno} mini /></div>
              </div>
            </div>
          ))}
        </div>

        {/* Trilhas */}
        <div className="card">
          <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:'0.875rem' }}>🗺️ Trilhas</div>
          {disc.trilhas?.length === 0 ? (
            <div style={{ color:'var(--slate-400)', fontSize:13 }}>Nenhuma trilha nesta disciplina.</div>
          ) : disc.trilhas.map(t => (
            <div key={t.id} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <span style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)' }}>{t.nome}</span>
                <span style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:700, color:t.progresso>=100?'var(--emerald-dark)':t.progresso>0?'var(--sky)':'var(--slate-400)' }}>
                  {t.progresso}%
                </span>
              </div>
              <div style={{ height:7, background:'var(--slate-100)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:7, width:t.progresso+'%', background:t.progresso>=100?'var(--emerald)':'var(--sky)', borderRadius:99, transition:'width .5s' }} />
              </div>
              <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:3 }}>
                {t.respondidas}/{t.total_questoes} questões {t.progresso>=100&&'· ✅ Completa'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Situação final */}
      {disc.media_disciplina !== null && (
        <div style={{ padding:'1.25rem 1.5rem', borderRadius:12, background:disc.situacao==='aprovado'?'#f0fdf4':'#fef2f2', border:'2px solid '+(disc.situacao==='aprovado'?'#86efac':'#fca5a5'), display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:disc.situacao==='aprovado'?'#15803d':'#b91c1c' }}>
              {disc.situacao==='aprovado'?'✅ Aprovado(a) em':'❌ Reprovado(a) em'} {disc.nome}
            </div>
            <div style={{ fontSize:12, color:disc.situacao==='aprovado'?'#15803d':'#b91c1c', opacity:.7, marginTop:2 }}>
              Nota mínima exigida: 6,0
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:40, fontWeight:700, color:disc.situacao==='aprovado'?'#10b981':'#ef4444' }}>
            {disc.media_disciplina.toFixed(1)}
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function AlunoBoletim() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [turmaIdx, setTurmaIdx] = useState(0);
  const [discAberta, setDiscAberta] = useState(null);

  useEffect(() => {
    api.get('/relatorios/boletim/aluno')
      .then(r => { setData(r.data); setDiscAberta(null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign:'center', padding:'5rem' }}>
      <div className="spinner" style={{ margin:'0 auto 1rem' }} />
      <div style={{ color:'var(--slate-400)', fontSize:14 }}>Gerando seu boletim...</div>
    </div>
  );

  if (!data?.turmas?.length) return (
    <div className="card" style={{ textAlign:'center', padding:'4rem' }}>
      <div style={{ fontSize:56, marginBottom:12 }}>📋</div>
      <div style={{ fontWeight:700, color:'var(--navy)', fontSize:18, marginBottom:6 }}>Boletim indisponível</div>
      <div style={{ fontSize:13, color:'var(--slate-400)' }}>Você ainda não está matriculado em nenhuma turma.</div>
    </div>
  );

  const turma = data.turmas[turmaIdx];
  const disciplinas = turma.disciplinas || [];

  if (discAberta) return (
    <>
      <div className="page-header"><div className="page-title">📋 Meu Boletim</div><div className="page-sub">Detalhe da disciplina</div></div>
      <DiscDetalhe disc={discAberta} onBack={() => setDiscAberta(null)} />
    </>
  );

  const aprovadas = disciplinas.filter(d => d.situacao === 'aprovado').length;
  const reprovadas = disciplinas.filter(d => d.situacao === 'reprovado').length;

  return (
    <>
      <div className="page-header">
        <div className="page-title">📋 Meu Boletim</div>
        <div className="page-sub">Acompanhe seu desempenho acadêmico por disciplina</div>
      </div>

      {/* Seletor de turma */}
      {data.turmas.length > 1 && (
        <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {data.turmas.map((t, i) => (
            <button key={t.id} onClick={() => { setTurmaIdx(i); setDiscAberta(null); }} style={{ padding:'7px 16px', borderRadius:8, border:'2px solid '+(turmaIdx===i?'var(--emerald)':'var(--slate-200)'), background:turmaIdx===i?'rgba(16,185,129,.08)':'white', fontWeight:600, fontSize:13, cursor:'pointer', color:turmaIdx===i?'var(--emerald-dark)':'var(--slate-600)' }}>
              🏫 {t.nome}
            </button>
          ))}
        </div>
      )}

      {/* Header da turma — card grande */}
      <div style={{ background:'linear-gradient(135deg,var(--navy) 0%,#1e3a5f 60%,#0f2544 100%)', borderRadius:20, padding:'2rem', marginBottom:'1.5rem', color:'white', position:'relative', overflow:'hidden' }}>
        {/* Decoração */}
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.03)' }} />
        <div style={{ position:'absolute', bottom:-60, right:80, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.03)' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'2rem', alignItems:'center', position:'relative', zIndex:1 }}>
          <div>
            <div style={{ fontSize:11, opacity:.5, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>🏫 {turma.nome}</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:400, opacity:.7, marginBottom:4 }}>Média Geral</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:52, fontWeight:700, lineHeight:1, marginBottom:12,
              color: turma.media_geral===null?'rgba(255,255,255,.3)':turma.media_geral>=7?'#34d399':turma.media_geral>=6?'#fbbf24':'#f87171' }}>
              {turma.media_geral !== null ? turma.media_geral.toFixed(1) : '–'}
            </div>

            {/* Mini grid de stats */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <div style={{ padding:'5px 14px', borderRadius:8, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)' }}>
                <span style={{ fontSize:11, opacity:.6 }}>Situação </span>
                <span style={{ fontSize:12, fontWeight:700, color:turma.situacao_geral==='aprovado'?'#34d399':turma.situacao_geral==='reprovado'?'#f87171':'#94a3b8' }}>
                  {turma.situacao_geral==='aprovado'?'✅ Aprovado':turma.situacao_geral==='reprovado'?'❌ Reprovado':'📖 Em andamento'}
                </span>
              </div>
              {aprovadas > 0 && (
                <div style={{ padding:'5px 14px', borderRadius:8, background:'rgba(52,211,153,.15)', border:'1px solid rgba(52,211,153,.3)' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#34d399' }}>✅ {aprovadas} aprovada(s)</span>
                </div>
              )}
              {reprovadas > 0 && (
                <div style={{ padding:'5px 14px', borderRadius:8, background:'rgba(248,113,113,.15)', border:'1px solid rgba(248,113,113,.3)' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#f87171' }}>❌ {reprovadas} reprovada(s)</span>
                </div>
              )}
              <div style={{ padding:'5px 14px', borderRadius:8, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)' }}>
                <span style={{ fontSize:11, opacity:.6 }}>📅 Desde </span>
                <span style={{ fontSize:12 }}>{turma.joined_at?.split('T')[0]}</span>
              </div>
            </div>
          </div>

          <ThetaGauge theta={turma.theta} nivel={turma.nivel} emoji={turma.nivel_emoji} />
        </div>
      </div>

      {/* Lista de disciplinas */}
      {disciplinas.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'2.5rem', color:'var(--slate-400)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📚</div>
          Nenhuma disciplina vinculada à sua turma ainda.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
          {disciplinas.map(disc => {
            const notaColor = disc.media_disciplina===null?'var(--slate-300)':disc.media_disciplina>=7?'#10b981':disc.media_disciplina>=6?'#f59e0b':'#ef4444';
            const aprovQ = disc.avaliacoes?.filter(a=>a.status_aluno==='aprovado').length||0;
            const reprovQ= disc.avaliacoes?.filter(a=>a.status_aluno==='reprovado').length||0;
            const pend   = disc.avaliacoes?.filter(a=>a.status_aluno==='nao_realizada').length||0;
            const trilhasOk = disc.trilhas?.filter(t=>t.progresso>=100).length||0;

            return (
              <div key={disc.id}
                onClick={() => setDiscAberta(disc)}
                style={{
                  background:'white', border:'2px solid '+(disc.situacao==='aprovado'?'#86efac':disc.situacao==='reprovado'?'#fca5a5':'var(--slate-200)'),
                  borderRadius:16, overflow:'hidden', cursor:'pointer', transition:'all .15s',
                  boxShadow:'0 2px 10px rgba(0,0,0,.05)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.05)'; }}>

                {/* Linha colorida topo */}
                <div style={{ height:4, background:disc.situacao==='aprovado'?'linear-gradient(90deg,#10b981,#34d399)':disc.situacao==='reprovado'?'linear-gradient(90deg,#ef4444,#f87171)':'linear-gradient(90deg,var(--sky),#38bdf8)' }} />

                <div style={{ padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', gap:16 }}>
                  {/* Ícone */}
                  <div style={{ width:52, height:52, borderRadius:14, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
                    background: disc.situacao==='aprovado'?'#f0fdf4':disc.situacao==='reprovado'?'#fef2f2':'#f0f9ff',
                  }}>📚</div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)', marginBottom:3 }}>{disc.nome}</div>
                    <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:6 }}>{disc.codigo} · {disc.carga_horaria}h carga horária</div>

                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {aprovQ>0  && <span style={{ padding:'2px 7px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:10, fontWeight:600, border:'1px solid #86efac' }}>✅ {aprovQ} apr.</span>}
                      {reprovQ>0 && <span style={{ padding:'2px 7px', borderRadius:50, background:'#fef2f2', color:'#b91c1c', fontSize:10, fontWeight:600, border:'1px solid #fca5a5' }}>❌ {reprovQ} rep.</span>}
                      {pend>0    && <span style={{ padding:'2px 7px', borderRadius:50, background:'var(--slate-100)', color:'var(--slate-500)', fontSize:10, fontWeight:600 }}>⏳ {pend} pendente(s)</span>}
                      {trilhasOk>0 && <span style={{ padding:'2px 7px', borderRadius:50, background:'rgba(14,165,233,.08)', color:'var(--sky)', fontSize:10, fontWeight:600, border:'1px solid rgba(14,165,233,.2)' }}>🗺️ {trilhasOk} trilha(s)</span>}
                    </div>
                  </div>

                  {/* Nota */}
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:36, fontWeight:700, lineHeight:1, color:notaColor }}>
                      {disc.media_disciplina !== null ? disc.media_disciplina.toFixed(1) : '–'}
                    </div>
                    <div style={{ fontSize:10, color:'var(--slate-400)', marginBottom:4 }}>média</div>
                    <Badge s={disc.situacao} mini />
                  </div>

                  <div style={{ fontSize:18, color:'var(--slate-300)', flexShrink:0 }}>›</div>
                </div>

                {/* Mini barras de trilhas */}
                {disc.trilhas?.length > 0 && (
                  <div style={{ padding:'0 1.5rem 0.75rem', display:'flex', gap:3 }}>
                    {disc.trilhas.map(t => (
                      <div key={t.id} style={{ flex:1, height:3, borderRadius:99, overflow:'hidden', background:'var(--slate-100)' }}>
                        <div style={{ height:3, width:t.progresso+'%', background:t.progresso>=100?'var(--emerald)':'var(--sky)', borderRadius:99, transition:'width .5s' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop:'1.5rem', fontSize:11, color:'var(--slate-300)', textAlign:'center' }}>
        📋 Boletim gerado em {data.gerado_em ? new Date(data.gerado_em).toLocaleString('pt-BR') : '–'}
      </div>
    </>
  );
}

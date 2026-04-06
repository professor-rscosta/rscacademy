/**
 * ProfBoletim — Boletim da turma (visão professor)
 * Tabela de notas com colunas por disciplina + boletim individual por aluno
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { EmptyState, StatCard, Avatar } from '../../../components/ui';

// ── Célula de nota na tabela ──────────────────────────────────
function CelulaNota({ nota, minima = 6 }) {
  if (nota === null || nota === undefined)
    return <td style={{ textAlign:'center', color:'var(--slate-300)', fontSize:13, padding:'10px 6px' }}>–</td>;
  const aprovado = nota >= minima;
  const cor = nota >= 7 ? '#10b981' : aprovado ? '#f59e0b' : '#ef4444';
  const bg  = nota >= 7 ? '#f0fdf4' : aprovado ? '#fffbeb' : '#fef2f2';
  return (
    <td style={{ textAlign:'center', padding:'10px 6px' }}>
      <span style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, color:cor, padding:'3px 9px', borderRadius:7, background:bg, display:'inline-block' }}>
        {nota.toFixed(1)}
      </span>
    </td>
  );
}

// ── Badge situação compacto ───────────────────────────────────
function BadgeSit({ s, mini }) {
  const m = {
    aprovado:  ['#f0fdf4','#15803d', mini?'A':'✅ Aprovado'],
    reprovado: ['#fef2f2','#b91c1c', mini?'R':'❌ Reprovado'],
    '-':       ['var(--slate-100)','var(--slate-400)', '–'],
  };
  const [bg, cor, lbl] = m[s] || m['-'];
  return (
    <span style={{ padding:mini?'2px 7px':'3px 10px', borderRadius:50, fontSize:mini?10:11, fontWeight:700, background:bg, color:cor }}>
      {lbl}
    </span>
  );
}

// ── Boletim individual de um aluno (modal overlay) ────────────
function BoletimIndividualModal({ alunoId, turmaId, onClose }) {
  const [data, setData]   = useState(null);
  const [loading, setLd]  = useState(true);

  useEffect(() => {
    api.get('/relatorios/boletim/aluno/' + alunoId)
      .then(r => setData(r.data)).catch(console.error).finally(() => setLd(false));
  }, [alunoId]);

  const cor = (n) => n===null?'var(--slate-300)':n>=7?'#10b981':n>=6?'#f59e0b':'#ef4444';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,27,53,.65)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'1.5rem', overflowY:'auto', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:760, margin:'0 auto', boxShadow:'0 16px 60px rgba(15,27,53,.3)', overflow:'hidden' }}>
        {/* Header modal */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', gap:16, color:'white' }}>
          {data && <Avatar name={data.aluno.nome} size={46} />}
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>
              {loading ? 'Carregando...' : data?.aluno.nome}
            </div>
            {data && <div style={{ fontSize:12, opacity:.6 }}>{data.aluno.email}</div>}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:'1.5rem', maxHeight:'82vh', overflowY:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
          ) : !data ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>Erro ao carregar boletim.</div>
          ) : (() => {
            const turma = data.turmas.find(t => t.id === turmaId) || data.turmas[0];
            if (!turma) return <div>Turma não encontrada.</div>;
            const mgCor = cor(turma.media_geral);
            return (
              <>
                {/* Resumo geral */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1.5rem', alignItems:'center', padding:'1rem 1.25rem', background:'var(--slate-50)', borderRadius:12, marginBottom:'1.25rem', border:'1px solid var(--slate-200)' }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--slate-400)', textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Média Geral — {turma.nome}</div>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:44, fontWeight:700, color:mgCor, lineHeight:1 }}>
                      {turma.media_geral !== null ? turma.media_geral.toFixed(1) : '–'}
                    </div>
                    <div style={{ marginTop:8 }}>
                      <BadgeSit s={turma.media_geral===null?'-':turma.media_geral>=6?'aprovado':'reprovado'} />
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:32, marginBottom:4 }}>{turma.nivel_emoji}</div>
                    <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:'var(--navy)' }}>θ {turma.theta.toFixed(2)}</div>
                    <div style={{ fontSize:11, color:'var(--slate-400)' }}>{turma.nivel}</div>
                  </div>
                </div>

                {/* Disciplinas */}
                {turma.disciplinas.map(disc => {
                  const dCor = cor(disc.media_disciplina);
                  return (
                    <div key={disc.id} style={{ border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden', marginBottom:'1rem', borderLeft:'4px solid '+(disc.situacao==='aprovado'?'#10b981':disc.situacao==='reprovado'?'#ef4444':'var(--slate-300)') }}>
                      {/* Header disciplina */}
                      <div style={{ padding:'10px 14px', background:'var(--slate-50)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>📚 {disc.nome}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)' }}>{disc.avaliacoes_realizadas}/{disc.total_avaliacoes} avaliações realizadas</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {disc.media_disciplina !== null && (
                            <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:700, color:dCor }}>{disc.media_disciplina.toFixed(1)}</div>
                          )}
                          <BadgeSit s={disc.situacao} mini />
                        </div>
                      </div>

                      {/* Avaliações */}
                      {disc.avaliacoes?.length > 0 && (
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ background:'white' }}>
                              <th style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', borderBottom:'1px solid var(--slate-100)' }}>Avaliação</th>
                              <th style={{ padding:'8px 10px', textAlign:'center', fontSize:11, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', borderBottom:'1px solid var(--slate-100)' }}>Tentativas</th>
                              <th style={{ padding:'8px 10px', textAlign:'center', fontSize:11, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', borderBottom:'1px solid var(--slate-100)' }}>Nota</th>
                              <th style={{ padding:'8px 10px', textAlign:'center', fontSize:11, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', borderBottom:'1px solid var(--slate-100)' }}>Sit.</th>
                              <th style={{ padding:'8px 10px', fontSize:11, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', borderBottom:'1px solid var(--slate-100)' }}>Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disc.avaliacoes.map((av, i) => (
                              <tr key={av.id} style={{ background:i%2===0?'white':'var(--slate-50)', borderBottom:'1px solid var(--slate-100)' }}>
                                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:500, color:'var(--slate-700)' }}>{av.titulo}</td>
                                <td style={{ padding:'9px 10px', textAlign:'center', fontSize:12, color:'var(--slate-500)' }}>{av.total_tentativas}/{av.tentativas_permitidas}</td>
                                <CelulaNota nota={av.melhor_nota} minima={av.nota_minima} />
                                <td style={{ padding:'9px 10px', textAlign:'center' }}><BadgeSit s={av.status_aluno} mini /></td>
                                <td style={{ padding:'9px 10px', fontSize:11, color:'var(--slate-400)' }}>{av.realizada_em ? new Date(av.realizada_em).toLocaleDateString('pt-BR') : '–'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Mini trilhas */}
                      {disc.trilhas?.length > 0 && (
                        <div style={{ padding:'8px 14px', display:'flex', gap:6, flexWrap:'wrap', borderTop:'1px solid var(--slate-100)' }}>
                          {disc.trilhas.map(t => (
                            <div key={t.id} style={{ flex:'1 1 130px', padding:'6px 10px', background:'white', borderRadius:7, border:'1px solid var(--slate-200)' }}>
                              <div style={{ fontSize:10, fontWeight:600, color:'var(--slate-600)', marginBottom:3 }}>🗺️ {t.nome}</div>
                              <div style={{ height:4, background:'var(--slate-100)', borderRadius:99, overflow:'hidden', marginBottom:2 }}>
                                <div style={{ height:4, width:t.progresso+'%', background:t.progresso>=100?'var(--emerald)':'var(--sky)', borderRadius:99 }} />
                              </div>
                              <div style={{ fontSize:9, color:'var(--slate-400)' }}>{t.progresso}% · {t.respondidas}/{t.total_questoes}q</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function ProfBoletim() {
  const { user } = useAuth();
  const [turmas, setTurmas]       = useState([]);
  const [turmaId, setTurmaId]     = useState(null);
  const [boletim, setBoletim]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [loadingTurmas, setLT]    = useState(true);
  const [alunoModal, setAlunoModal] = useState(null);
  const [busca, setBusca]         = useState('');
  const [filtroSit, setFiltroSit] = useState('todos');

  useEffect(() => {
    api.get('/turmas?professor_id=' + user.id)
      .then(r => {
        const ts = r.data.turmas || [];
        setTurmas(ts);
        if (ts.length > 0) setTurmaId(ts[0].id);
      }).catch(console.error).finally(() => setLT(false));
  }, []);

  useEffect(() => {
    if (!turmaId) return;
    setLoading(true); setBoletim(null); setBusca(''); setFiltroSit('todos');
    api.get('/relatorios/boletim/turma/' + turmaId)
      .then(r => setBoletim(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [turmaId]);

  const disciplinas = boletim?.turma?.disciplinas || [];
  const stats = boletim?.estatisticas || {};

  const alunosFiltrados = (boletim?.alunos || []).filter(a => {
    const matchBusca = !busca || a.nome.toLowerCase().includes(busca.toLowerCase()) || a.email.toLowerCase().includes(busca.toLowerCase());
    const sit = a.media_geral === null ? '-' : a.media_geral >= 6 ? 'aprovado' : 'reprovado';
    const matchSit = filtroSit === 'todos' || sit === filtroSit;
    return matchBusca && matchSit;
  });

  return (
    <>
      <div className="page-header">
        <div className="page-title">📋 Boletim da Turma</div>
        <div className="page-sub">Visualize o desempenho de todos os alunos por disciplina</div>
      </div>

      {loadingTurmas ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : turmas.length === 0 ? (
        <div className="card"><EmptyState icon="🏫" title="Nenhuma turma" sub="Crie uma turma para visualizar o boletim." /></div>
      ) : (
        <>
          {/* Seletor de turma */}
          <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', flexWrap:'wrap' }}>
            {turmas.map(t => (
              <button key={t.id} onClick={() => setTurmaId(t.id)} style={{ padding:'8px 18px', borderRadius:9, border:'2px solid '+(turmaId===t.id?'var(--emerald)':'var(--slate-200)'), background:turmaId===t.id?'rgba(16,185,129,.08)':'white', fontWeight:600, fontSize:13, cursor:'pointer', color:turmaId===t.id?'var(--emerald-dark)':'var(--slate-600)', transition:'all .15s' }}>
                🏫 {t.nome}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'4rem' }}>
              <div className="spinner" style={{ margin:'0 auto 1rem' }} />
              <div style={{ color:'var(--slate-400)', fontSize:14 }}>Gerando boletim da turma...</div>
            </div>
          ) : boletim && (
            <>
              {/* Stats */}
              <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
                <StatCard label="Alunos"       value={stats.total_alunos}                 icon="👥" accent="accent-sky" />
                <StatCard label="Média Geral"  value={(stats.media_geral||0).toFixed(1)+'/10'} icon="📊" accent="accent-amber" />
                <StatCard label="Aprovados"    value={stats.aprovados||0}                  icon="✅" accent="accent-green" />
                <StatCard label="Taxa Aprovação" value={(stats.taxa_aprovacao||0)+'%'}      icon="🎯" accent="accent-coral" />
              </div>

              {/* Filtros */}
              <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar aluno..."
                  style={{ flex:'1 1 220px', padding:'9px 14px', border:'1.5px solid var(--slate-200)', borderRadius:9, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}
                  onFocus={e => e.target.style.borderColor='var(--emerald)'} onBlur={e => e.target.style.borderColor='var(--slate-200)'} />
                {['todos','aprovado','reprovado'].map(f => (
                  <button key={f} onClick={() => setFiltroSit(f)} style={{ padding:'8px 16px', borderRadius:8, border:'1.5px solid '+(filtroSit===f?'var(--emerald)':'var(--slate-200)'), background:filtroSit===f?'rgba(16,185,129,.08)':'white', fontWeight:600, fontSize:12, cursor:'pointer', color:filtroSit===f?'var(--emerald-dark)':'var(--slate-500)' }}>
                    {f==='todos'?'Todos':f==='aprovado'?'✅ Aprovados':'❌ Reprovados'}
                  </button>
                ))}
                <span style={{ fontSize:12, color:'var(--slate-400)', marginLeft:'auto' }}>
                  {alunosFiltrados.length} aluno(s)
                </span>
              </div>

              {/* Tabela */}
              {alunosFiltrados.length === 0 ? (
                <div className="card"><EmptyState icon="👥" title="Nenhum aluno encontrado" sub="Ajuste o filtro ou a busca." /></div>
              ) : (
                <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:14, overflow:'hidden', boxShadow:'var(--shadow)' }}>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding:'13px 16px', textAlign:'left', background:'var(--navy)', color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, minWidth:200, position:'sticky', left:0 }}>
                            Aluno
                          </th>
                          {disciplinas.map(d => (
                            <th key={d.id} style={{ padding:'13px 12px', textAlign:'center', background:'var(--navy)', color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, minWidth:110 }}>
                              {d.nome}
                            </th>
                          ))}
                          <th style={{ padding:'13px 12px', textAlign:'center', background:'var(--navy)', color:'rgba(255,255,255,.85)', fontSize:11, fontWeight:700, textTransform:'uppercase', minWidth:90 }}>Média</th>
                          <th style={{ padding:'13px 12px', textAlign:'center', background:'var(--navy)', color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:600, minWidth:90 }}>Situação</th>
                          <th style={{ padding:'13px 12px', textAlign:'center', background:'var(--navy)', color:'rgba(255,255,255,.7)', fontSize:11, fontWeight:600, minWidth:80 }}>Nível</th>
                          <th style={{ padding:'13px 10px', background:'var(--navy)', minWidth:60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {alunosFiltrados.map((aluno, i) => {
                          const sit = aluno.media_geral === null ? '-' : aluno.media_geral >= 6 ? 'aprovado' : 'reprovado';
                          const mgCor = aluno.media_geral===null?'var(--slate-300)':aluno.media_geral>=7?'#10b981':aluno.media_geral>=6?'#f59e0b':'#ef4444';
                          return (
                            <tr key={aluno.id}
                              style={{ background:i%2===0?'white':'var(--slate-50)', borderBottom:'1px solid var(--slate-100)', cursor:'pointer', transition:'background .1s' }}
                              onMouseEnter={e => e.currentTarget.style.background='rgba(16,185,129,.04)'}
                              onMouseLeave={e => e.currentTarget.style.background=i%2===0?'white':'var(--slate-50)'}
                              onClick={() => setAlunoModal({ alunoId:aluno.id, turmaId })}>
                              <td style={{ padding:'11px 16px', position:'sticky', left:0, background:'inherit' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                  <span style={{ fontSize:11, fontWeight:700, color:'var(--slate-300)', minWidth:20 }}>{i+1}</span>
                                  <Avatar name={aluno.nome} size={32} />
                                  <div>
                                    <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', whiteSpace:'nowrap' }}>{aluno.nome}</div>
                                    <div style={{ fontSize:10, color:'var(--slate-400)' }}>{aluno.email}</div>
                                  </div>
                                </div>
                              </td>
                              {disciplinas.map(d => {
                                const da = aluno.disciplinas?.find(ad => ad.disc_id === d.id);
                                return <CelulaNota key={d.id} nota={da?.media ?? null} />;
                              })}
                              <td style={{ textAlign:'center', padding:'11px 12px' }}>
                                <span style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:mgCor }}>
                                  {aluno.media_geral !== null ? aluno.media_geral.toFixed(1) : '–'}
                                </span>
                              </td>
                              <td style={{ textAlign:'center', padding:'11px 8px' }}>
                                <BadgeSit s={sit} mini />
                              </td>
                              <td style={{ textAlign:'center', padding:'11px 8px', fontSize:12, color:'var(--slate-500)' }}>
                                <span>{aluno.nivel_emoji}</span>
                                <div style={{ fontSize:10, fontFamily:'var(--font-head)', fontWeight:600, color:'var(--slate-400)' }}>{aluno.theta?.toFixed(1)}</div>
                              </td>
                              <td style={{ textAlign:'center', padding:'11px 10px' }}>
                                <button onClick={e => { e.stopPropagation(); setAlunoModal({ alunoId:aluno.id, turmaId }); }}
                                  style={{ padding:'4px 12px', background:'var(--slate-100)', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, color:'var(--navy)' }}>
                                  Ver →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legenda */}
                  <div style={{ padding:'10px 16px', borderTop:'1px solid var(--slate-100)', display:'flex', gap:20, fontSize:11, color:'var(--slate-400)', background:'var(--slate-50)', flexWrap:'wrap', alignItems:'center' }}>
                    {[['#10b981','7,0–10,0 Excelente'],['#f59e0b','6,0–6,9 Suficiente'],['#ef4444','0,0–5,9 Insuficiente'],['','– = não realizou']].map(([c,l],i)=>(
                      <span key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                        {c && <span style={{ width:10, height:10, borderRadius:3, background:c, display:'inline-block' }} />}
                        {l}
                      </span>
                    ))}
                    <span style={{ marginLeft:'auto' }}>Clique em um aluno para ver o boletim completo</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop:'0.75rem', fontSize:11, color:'var(--slate-300)', textAlign:'right' }}>
                Gerado em {boletim.gerado_em ? new Date(boletim.gerado_em).toLocaleString('pt-BR') : '–'}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal boletim individual */}
      {alunoModal && (
        <BoletimIndividualModal
          alunoId={alunoModal.alunoId}
          turmaId={alunoModal.turmaId}
          onClose={() => setAlunoModal(null)}
        />
      )}
    </>
  );
}

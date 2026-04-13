/**
 * AlunoModuloDisciplina — Módulo Interativo Completo da Disciplina
 * Banner · Professor · Biblioteca · Videoaulas · Atividades · Trilhas
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

// ── Helpers ──────────────────────────────────────────────────
function getYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\n]{11})/);
  return m ? m[1] : null;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function diffDays(from, to) {
  if (!from || !to) return null;
  return Math.ceil((new Date(to) - new Date(from)) / 86400000);
}

// ── Sub-componentes ──────────────────────────────────────────
function SectionTitle({ icon, title, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', paddingBottom:'0.75rem', borderBottom:'2px solid var(--slate-100)' }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700, color:'var(--navy)' }}>{title}</div>
        {count !== undefined && <div style={{ fontSize:12, color:'var(--slate-400)' }}>{count} item(s)</div>}
      </div>
    </div>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:'white', borderRadius:12, border:'1px solid var(--slate-200)', boxShadow:'0 1px 4px rgba(0,0,0,.06)', padding:'1.25rem', ...style }}>
      {children}
    </div>
  );
}

function ProgressRing({ value, size=56, stroke=5 }) {
  const r   = (size - stroke*2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - value/100);
  const cor  = value >= 80 ? '#10b981' : value >= 50 ? '#3b82f6' : value >= 20 ? '#f59e0b' : '#e2e8f0';
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={cor} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset .5s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize:13, fontWeight:700, fill:cor, transform:'rotate(90deg)', transformOrigin:'center' }}>
        {value}%
      </text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    enviado:   { bg:'#dcfce7', cor:'#166534', label:'Enviado ✅' },
    pendente:  { bg:'#fef3c7', cor:'#92400e', label:'Pendente ⏳' },
    atrasado:  { bg:'#fee2e2', cor:'#991b1b', label:'Atrasado ⚠️' },
    avaliado:  { bg:'#eff6ff', cor:'#1d4ed8', label:'Avaliado 📝' },
    nao_realizada: { bg:'#f1f5f9', cor:'#64748b', label:'Não realizada' },
  }[status] || { bg:'#f1f5f9', cor:'#64748b', label: status };
  return <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:cfg.bg, color:cfg.cor, fontWeight:600 }}>{cfg.label}</span>;
}

// ── Componente Principal ──────────────────────────────────────
export default function AlunoModuloDisciplina({ disciplinaId, onVoltar, onNavigate }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba]       = useState('sobre');
  const [videoAtivo, setVideoAtivo] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/disciplinas/${disciplinaId}/modulo`)
      .then(r => { setData(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [disciplinaId]);

  if (loading) return (
    <div style={{ textAlign:'center', padding:'4rem' }}>
      <div className="spinner" style={{ margin:'0 auto', marginBottom:'1rem' }} />
      <div style={{ color:'var(--slate-500)', fontSize:14 }}>Carregando módulo...</div>
    </div>
  );

  if (!data?.disciplina) return (
    <div style={{ textAlign:'center', padding:'3rem' }}>
      <button onClick={onVoltar} style={{ marginBottom:'1rem', padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer' }}>← Voltar</button>
      <EmptyState icon="❌" title="Erro ao carregar disciplina" sub="Tente novamente mais tarde." />
    </div>
  );

  const { disciplina: d, professor, materiais=[], videoaulas=[], trilhas=[], avaliacoes=[], atividades=[], turmas=[] } = data;

  const totalProgresso = trilhas.length > 0
    ? Math.round(trilhas.reduce((s, t) => s + t.progresso, 0) / trilhas.length)
    : 0;

  const duracaoDias = diffDays(d.data_inicio, d.data_fim);

  const abas = [
    { id:'sobre',    icon:'📋', label:'Sobre' },
    { id:'materiais',icon:'📂', label:`Biblioteca (${materiais.length})` },
    { id:'videos',   icon:'🎥', label:`Videoaulas (${videoaulas.length})` },
    { id:'trilhas',  icon:'🗺️', label:`Trilhas (${trilhas.length})` },
    { id:'atividades',icon:'📝',label:`Atividades (${atividades.length + avaliacoes.length})` },
  ];

  return (
    <div>
      {/* ── Banner ─────────────────────────────────────────── */}
      <div style={{
        borderRadius:14, overflow:'hidden', marginBottom:'1.25rem', position:'relative',
        height:180, background: d.banner ? `url(${d.banner}) center/cover` : 'linear-gradient(135deg,#1e3a5f 0%,#2d5a9e 60%,#1e3a5f 100%)',
        boxShadow:'0 4px 20px rgba(0,0,0,.15)',
      }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.1) 60%)' }} />
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'1rem 1.25rem', display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800, color:'white', lineHeight:1.2 }}>{d.nome}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
              {d.codigo && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:'rgba(255,255,255,.2)', color:'white', fontWeight:600 }}>{d.codigo}</span>}
              {d.turno  && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:'rgba(255,255,255,.2)', color:'white' }}>🕐 {d.turno}</span>}
              <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:'rgba(16,185,129,.3)', color:'#6ee7b7', fontWeight:600 }}>⏱ {d.carga_horaria}h</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <ProgressRing value={totalProgresso} />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:3 }}>Progresso</div>
          </div>
        </div>
        <button onClick={onVoltar} style={{
          position:'absolute', top:12, left:12,
          padding:'5px 12px', background:'rgba(0,0,0,.35)', backdropFilter:'blur(4px)',
          border:'1px solid rgba(255,255,255,.2)', borderRadius:8, color:'white', fontSize:12, cursor:'pointer', fontWeight:600,
        }}>← Turmas</button>
      </div>

      {/* ── Info rápida ──────────────────────────────────────── */}
      {(d.data_inicio || d.data_fim || turmas.length > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:'1.25rem' }}>
          {d.data_inicio && <Card style={{ padding:'0.75rem', textAlign:'center' }}>
            <div style={{ fontSize:20 }}>📅</div>
            <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:2 }}>Início</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{formatDate(d.data_inicio)}</div>
          </Card>}
          {d.data_fim && <Card style={{ padding:'0.75rem', textAlign:'center' }}>
            <div style={{ fontSize:20 }}>🏁</div>
            <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:2 }}>Término</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{formatDate(d.data_fim)}</div>
          </Card>}
          {duracaoDias && <Card style={{ padding:'0.75rem', textAlign:'center' }}>
            <div style={{ fontSize:20 }}>📆</div>
            <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:2 }}>Duração</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{duracaoDias} dias</div>
          </Card>}
          {turmas.length > 0 && <Card style={{ padding:'0.75rem', textAlign:'center' }}>
            <div style={{ fontSize:20 }}>🏫</div>
            <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:2 }}>Turmas</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>{turmas.map(t=>t.nome).join(', ')}</div>
          </Card>}
        </div>
      )}

      {/* ── Abas ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:2, borderBottom:'2px solid var(--slate-200)', marginBottom:'1.25rem', overflowX:'auto' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding:'9px 14px', border:'none', background:'none', cursor:'pointer', whiteSpace:'nowrap',
            fontWeight: aba===a.id ? 700 : 400, color: aba===a.id ? 'var(--emerald)' : 'var(--slate-500)',
            borderBottom: aba===a.id ? '2px solid var(--emerald)' : '2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{a.icon} {a.label}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          ABA: SOBRE
      ════════════════════════════════════════════════════════ */}
      {aba === 'sobre' && (
        <div style={{ display:'grid', gridTemplateColumns: professor ? '1fr 340px' : '1fr', gap:'1.25rem' }}>
          <div>
            {/* Descrição */}
            {d.descricao && (
              <Card style={{ marginBottom:'1rem' }}>
                <SectionTitle icon="📋" title="Sobre a Disciplina" />
                <p style={{ fontSize:14, color:'var(--slate-600)', lineHeight:1.7, margin:0 }}>{d.descricao}</p>
              </Card>
            )}
            {/* Resumo rápido */}
            <Card>
              <SectionTitle icon="📊" title="Resumo do Módulo" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                {[
                  ['🗺️', trilhas.length, 'Trilhas'],
                  ['📂', materiais.length, 'Materiais'],
                  ['🎥', videoaulas.length, 'Videoaulas'],
                  ['📝', atividades.length, 'Atividades'],
                  ['📋', avaliacoes.length, 'Avaliações'],
                ].map(([icon, val, label]) => (
                  <div key={label} style={{ textAlign:'center', padding:'12px 8px', background:'var(--slate-50)', borderRadius:10, border:'1px solid var(--slate-200)' }}>
                    <div style={{ fontSize:22 }}>{icon}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:'var(--navy)', lineHeight:1 }}>{val}</div>
                    <div style={{ fontSize:11, color:'var(--slate-500)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Professor */}
          {professor && (
            <Card style={{ height:'fit-content' }}>
              <SectionTitle icon="👨‍🏫" title="Professor(a)" />
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:12 }}>
                <div style={{
                  width:80, height:80, borderRadius:'50%',
                  background: professor.foto ? `url(${professor.foto}) center/cover` : 'linear-gradient(135deg,var(--navy),var(--navy-mid))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:32, color:'white', flexShrink:0,
                  border:'3px solid var(--slate-200)',
                }}>
                  {!professor.foto && professor.nome?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16, color:'var(--navy)' }}>{professor.nome}</div>
                  <div style={{ fontSize:12, color:'var(--slate-500)' }}>{d.nome}</div>
                </div>
                {professor.bio && (
                  <div style={{ fontSize:13, color:'var(--slate-600)', lineHeight:1.6, textAlign:'left', background:'var(--slate-50)', borderRadius:8, padding:'10px 12px', width:'100%' }}>
                    {professor.bio}
                  </div>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#ecfdf5', color:'#059669' }}>⏱ {d.carga_horaria}h</span>
                  {d.turno && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#eff6ff', color:'#3b82f6' }}>{d.turno}</span>}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ABA: BIBLIOTECA / MATERIAIS
      ════════════════════════════════════════════════════════ */}
      {aba === 'materiais' && (
        <Card>
          <SectionTitle icon="📂" title="Biblioteca de Materiais" count={materiais.length} />
          {materiais.length === 0 ? (
            <EmptyState icon="📂" title="Nenhum material disponível" sub="O professor ainda não adicionou materiais nesta disciplina." />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {materiais.map(m => {
                const isLink = m.tipo === 'link';
                const isText = m.tipo === 'texto';
                const isPDF  = m.url?.toLowerCase().includes('.pdf') || m.tipo === 'pdf';
                const iconMap = { pdf:'📄', doc:'📝', ppt:'📊', link:'🔗', texto:'📄', outro:'📁' };
                const icon = iconMap[m.tipo] || '📁';

                return (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:'1px solid var(--slate-200)', borderRadius:10, background:'var(--slate-50)', transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='white'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--slate-50)'; e.currentTarget.style.boxShadow='none'; }}>
                    <div style={{ width:44, height:44, borderRadius:10, background: isPDF?'#fee2e2':isLink?'#eff6ff':'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                      {icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:'var(--navy)' }}>{m.titulo}</div>
                      {m.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>}
                      <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>
                        {m.tipo?.toUpperCase()} · {m.created_at?.split('T')[0]}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {m.url && !isText && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          style={{ padding:'6px 14px', background:'var(--navy)', color:'white', borderRadius:7, fontSize:12, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
                          {isLink ? '🔗 Acessar' : '👁️ Ver'}
                        </a>
                      )}
                      {m.url && !isText && !isLink && (
                        <a href={m.url} download
                          style={{ padding:'6px 12px', border:'1px solid var(--slate-200)', background:'white', color:'var(--slate-600)', borderRadius:7, fontSize:12, fontWeight:600, textDecoration:'none' }}>
                          ⬇️ Baixar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          ABA: VIDEOAULAS
      ════════════════════════════════════════════════════════ */}
      {aba === 'videos' && (
        <div>
          {videoaulas.length === 0 ? (
            <Card><EmptyState icon="🎥" title="Nenhuma videoaula disponível" sub="O professor ainda não adicionou videoaulas." /></Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {videoaulas.map(v => {
                const ytId = getYouTubeId(v.url||'');
                const isAtivo = videoAtivo === v.id;
                return (
                  <Card key={v.id}>
                    {isAtivo && ytId ? (
                      <div>
                        <div style={{ position:'relative', paddingBottom:'56.25%', borderRadius:10, overflow:'hidden', marginBottom:'1rem' }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                            style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen title={v.titulo}
                          />
                        </div>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{v.titulo}</div>
                        {v.descricao && <div style={{ fontSize:13, color:'var(--slate-500)' }}>{v.descricao}</div>}
                        <button onClick={() => setVideoAtivo(null)} style={{ marginTop:8, padding:'5px 12px', border:'1px solid var(--slate-200)', borderRadius:7, background:'white', fontSize:12, cursor:'pointer' }}>Fechar player</button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                        {/* Thumbnail */}
                        <div onClick={() => setVideoAtivo(v.id)} style={{
                          width:140, height:80, borderRadius:8, overflow:'hidden', flexShrink:0, cursor:'pointer', position:'relative',
                          background: ytId ? `url(https://img.youtube.com/vi/${ytId}/mqdefault.jpg) center/cover` : '#1e3a5f',
                        }}>
                          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,0,0,.85)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <span style={{ color:'white', fontSize:14, marginLeft:3 }}>▶</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4 }}>{v.titulo}</div>
                          {v.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', lineHeight:1.5 }}>{v.descricao}</div>}
                          <button onClick={() => setVideoAtivo(v.id)} style={{ marginTop:8, padding:'6px 14px', background:'#ef4444', color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
                            ▶ Assistir
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ABA: TRILHAS
      ════════════════════════════════════════════════════════ */}
      {aba === 'trilhas' && (
        <div>
          {trilhas.length === 0 ? (
            <Card><EmptyState icon="🗺️" title="Nenhuma trilha disponível" sub="O professor ainda não criou trilhas para esta disciplina." /></Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {trilhas.map(t => {
                const cor = t.progresso >= 80 ? '#10b981' : t.progresso >= 40 ? '#3b82f6' : t.progresso > 0 ? '#f59e0b' : '#94a3b8';
                return (
                  <Card key={t.id}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <ProgressRing value={t.progresso} size={60} stroke={6} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)', marginBottom:2 }}>{t.nome}</div>
                        {t.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:6 }}>{t.descricao}</div>}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:cor+'15', color:cor, fontWeight:600 }}>
                            {t.progresso === 100 ? '✅ Concluída' : t.progresso > 0 ? '▶ Em andamento' : '⏳ Não iniciada'}
                          </span>
                          <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-600)' }}>
                            {t.total_questoes} questões
                          </span>
                          {t.nivel && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:99, background:'#fef3c7', color:'#92400e' }}>{t.nivel}</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ABA: ATIVIDADES & AVALIAÇÕES
      ════════════════════════════════════════════════════════ */}
      {aba === 'atividades' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* Avaliações */}
          {avaliacoes.length > 0 && (
            <Card>
              <SectionTitle icon="📋" title="Avaliações" count={avaliacoes.length} />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {avaliacoes.map(av => {
                  const vencido = av.data_fim && new Date(av.data_fim) < new Date();
                  return (
                    <div key={av.id} style={{ padding:'12px 14px', border:'1px solid var(--slate-200)', borderRadius:10, background:vencido?'#fffbeb':'white' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{av.titulo}</div>
                          {av.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>{av.descricao}</div>}
                          <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4, display:'flex', gap:10, flexWrap:'wrap' }}>
                            {av.data_inicio && <span>📅 Abre: {formatDate(av.data_inicio)}</span>}
                            {av.data_fim && <span>🏁 Entrega: {formatDate(av.data_fim)}</span>}
                            {av.peso && <span>⚖️ Peso: {av.peso}</span>}
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                          {vencido
                            ? <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#fef3c7', color:'#92400e', fontWeight:600 }}>⚠️ Prazo encerrado</span>
                            : <>
                                <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600 }}>✅ Disponível</span>
                                <button
                                  onClick={() => onNavigate?.('avaliacoes', { avaliacaoId: av.id })}
                                  style={{ padding:'8px 16px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', marginTop:4, whiteSpace:'nowrap' }}>
                                  📝 Iniciar Avaliação
                                </button>
                              </>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Atividades */}
          {atividades.length > 0 && (
            <Card>
              <SectionTitle icon="📝" title="Atividades" count={atividades.length} />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {atividades.map(at => {
                  const agora = new Date();
                  const prazo = at.data_entrega ? new Date(at.data_entrega) : null;
                  const vencido = prazo && prazo < agora;
                  const urgente = prazo && !vencido && (prazo - agora) < 3 * 86400000;

                  return (
                    <div key={at.id} style={{ padding:'12px 14px', border:'1px solid '+(urgente?'#fcd34d':vencido?'#fca5a5':'var(--slate-200)'), borderRadius:10, background:urgente?'#fffbeb':vencido?'#fef2f2':'white' }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:4 }}>{at.titulo}</div>
                      {at.descricao && <div style={{ fontSize:13, color:'var(--slate-600)', lineHeight:1.5, marginBottom:8 }}>{at.descricao}</div>}

                      {/* Materiais da atividade */}
                      {(at.arquivos_professor || []).length > 0 && (
                        <div style={{ marginBottom:8 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:4 }}>📎 Materiais da atividade:</div>
                          {(at.arquivos_professor||[]).map((arq, i) => (
                            <a key={i} href={arq.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize:12, color:'var(--navy)', display:'block', marginBottom:2, textDecoration:'none' }}>
                              📄 {arq.nome || `Arquivo ${i+1}`}
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                        <div style={{ fontSize:11, color:'var(--slate-400)', display:'flex', gap:10, flexWrap:'wrap' }}>
                          {at.data_abertura && <span>📅 Abertura: {formatDate(at.data_abertura)}</span>}
                          {at.data_entrega && <span>🏁 Entrega: {formatDate(at.data_entrega)}</span>}
                        </div>
                        <StatusBadge status={vencido ? 'atrasado' : 'pendente'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {avaliacoes.length === 0 && atividades.length === 0 && (
            <Card><EmptyState icon="📝" title="Nenhuma atividade disponível" sub="O professor ainda não criou atividades para esta disciplina." /></Card>
          )}
        </div>
      )}
    </div>
  );
}

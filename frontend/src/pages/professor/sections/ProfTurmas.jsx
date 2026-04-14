/**
 * ProfTurmas — Gestão completa: Turma → Disciplinas → Alunos
 * Professor gerencia:
 *   1. CRUD de turmas
 *   2. Vincular/desvincular disciplinas da turma
 *   3. Matricular/desmatricular alunos
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState, Avatar } from '../../../components/ui';

const TABS = ['disciplinas', 'alunos'];


// ════════════════════════════════════════════════════════════
// ALUNOS TAB — Matrícula por disciplina individual
// ════════════════════════════════════════════════════════════
function AlunosTab({ turma, alunos, disciplinas, onRefresh, onAlert }) {
  const [modo, setModo]             = useState('matriculados');
  const [busca, setBusca]           = useState('');
  const [buscaMatric, setBuscaMatric] = useState('');
  const [todosAlunos, setTodos]     = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSel]      = useState(new Set());
  const [discsSelecionadas, setDiscs] = useState(new Set()); // disciplinas para matricular
  const [matriculando, setMatric]   = useState(false);
  const [confirmando, setConf]      = useState(false);
  const [paginaAtual, setPagina]    = useState(1);
  const [alunoDiscMap, setAlunoDiscMap] = useState({}); // aluno_id -> [disc_ids]
  const POR_PAGINA = 10;

  // Carregar disciplinas de cada aluno matriculado
  useEffect(() => {
    if (alunos.length === 0) return;
    Promise.all(alunos.map(a =>
      api.get('/turmas/'+turma.id+'/alunos/'+(a.aluno_id||a.id)+'/disciplinas')
        .then(r => ({ id: a.aluno_id||a.id, disciplinas: r.data.disciplinas || [] }))
        .catch(() => ({ id: a.aluno_id||a.id, disciplinas: [] }))
    )).then(results => {
      const map = {};
      results.forEach(r => { map[r.id] = r.disciplinas; });
      setAlunoDiscMap(map);
    });
  }, [alunos]);

  // Busca em tempo real
  useEffect(() => {
    if (modo !== 'adicionar') return;
    const timer = setTimeout(() => carregarAlunos(busca), 300);
    return () => clearTimeout(timer);
  }, [busca, modo]);

  const carregarAlunos = async (q = '') => {
    setCarregando(true);
    try {
      const r = await api.get('/turmas/lista/alunos?turma_id='+turma.id+(q?'&busca='+encodeURIComponent(q):''));
      setTodos(r.data.alunos || []);
      setPagina(1);
    } catch(e) { console.error(e); }
    setCarregando(false);
  };

  const toggleSel = (id) => {
    const next = new Set(selecionados);
    next.has(id) ? next.delete(id) : next.add(id);
    setSel(next);
  };

  const toggleDisc = (id) => {
    const next = new Set(discsSelecionadas);
    next.has(id) ? next.delete(id) : next.add(id);
    setDiscs(next);
  };

  const disponiveis = todosAlunos.filter(a => !a.ja_nesta_turma);

  const toggleTodosAlunos = () => {
    setSel(selecionados.size === disponiveis.length && disponiveis.length > 0
      ? new Set()
      : new Set(disponiveis.map(a => a.id))
    );
  };

  const toggleTodasDiscs = () => {
    setDiscs(discsSelecionadas.size === disciplinas.length
      ? new Set()
      : new Set(disciplinas.map(d => d.id))
    );
  };

  const matricularSelecionados = async () => {
    if (selecionados.size === 0 || discsSelecionadas.size === 0) return;
    setMatric(true); setConf(false);
    try {
      const r = await api.post('/turmas/'+turma.id+'/alunos/disciplinas', {
        aluno_ids:     [...selecionados],
        disciplina_ids: [...discsSelecionadas],
      });
      onAlert({ type:'success', msg: '✅ '+r.data.message });
      setSel(new Set()); setDiscs(new Set()); setBusca('');
      onRefresh();
      setModo('matriculados');
    } catch(e) {
      onAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao matricular.' });
    }
    setMatric(false);
  };

  const removerAluno = async (alunoId, nome) => {
    if (!window.confirm('Remover "'+nome+'" desta turma e de todas as suas disciplinas?')) return;
    try {
      await api.delete('/turmas/'+turma.id+'/alunos/'+alunoId);
      onAlert({ type:'success', msg: '✅ Aluno removido.' });
      onRefresh();
    } catch(e) { onAlert({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
  };

  const alunosFiltrados = alunos.filter(a =>
    !buscaMatric || a.nome.toLowerCase().includes(buscaMatric.toLowerCase()) ||
    a.email.toLowerCase().includes(buscaMatric.toLowerCase())
  );

  const totalPaginas = Math.ceil(todosAlunos.length / POR_PAGINA);
  const alunosPagina = todosAlunos.slice((paginaAtual-1)*POR_PAGINA, paginaAtual*POR_PAGINA);

  const canMatriculate = selecionados.size > 0 && discsSelecionadas.size > 0;

  const inputStyle = {
    flex:1, padding:'9px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8,
    fontSize:13, outline:'none', fontFamily:'var(--font-body)',
  };

  return (
    <div>
      {/* Abas */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', borderBottom:'2px solid var(--slate-200)' }}>
        {[
          ['matriculados', '👨‍🎓 Matriculados ('+alunos.length+')'],
          ['adicionar',    '➕ Adicionar Alunos'],
        ].map(([v,l]) => (
          <button key={v} onClick={() => { setModo(v); if(v==='adicionar') carregarAlunos(''); }} style={{
            padding:'9px 18px', border:'none', background:'none', cursor:'pointer',
            fontWeight: modo===v?800:400, color: modo===v?'var(--emerald)':'var(--slate-500)',
            borderBottom: modo===v?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{l}</button>
        ))}
      </div>

      {/* ════ MATRICULADOS ════ */}
      {modo === 'matriculados' && (
        <div className="card">
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', alignItems:'center' }}>
            <input value={buscaMatric} onChange={e => setBuscaMatric(e.target.value)}
              placeholder="🔍 Filtrar por nome ou e-mail..."
              style={inputStyle}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'}
              onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />
            {buscaMatric && <button onClick={()=>setBuscaMatric('')} style={{ padding:'9px 12px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:12 }}>✕</button>}
            <span style={{ fontSize:12, color:'var(--slate-500)', whiteSpace:'nowrap' }}>{alunosFiltrados.length} aluno(s)</span>
          </div>

          {alunos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--slate-400)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>👨‍🎓</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>Nenhum aluno matriculado</div>
              <div style={{ fontSize:13 }}>Vá em "Adicionar Alunos" para matricular.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {alunosFiltrados.map((a, i) => {
                const alunoId = a.aluno_id || a.id;
                const discsAluno = alunoDiscMap[alunoId] || [];
                return (
                  <div key={alunoId} style={{
                    padding:'12px 14px', border:'1px solid var(--slate-200)', borderRadius:10,
                    background: i%2===0?'white':'var(--slate-50)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <Avatar name={a.nome} size={38} foto={a.foto} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)' }}>{a.nome}</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>{a.email}</div>
                        {/* Disciplinas em que está matriculado */}
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:5 }}>
                          {discsAluno.length > 0 ? discsAluno.map(d => (
                            <span key={d.id} style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0', display:'inline-flex', alignItems:'center', gap:4 }}>
                              📚 {d.nome}
                            </span>
                          )) : (
                            <span style={{ fontSize:11, color:'var(--slate-400)', fontStyle:'italic' }}>
                              Sem disciplinas vinculadas
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600 }}>✅ Ativo</span>
                        <div style={{ fontSize:10, color:'var(--slate-400)' }}>📅 {(a.joined_at||'').split('T')[0]}</div>
                        <button onClick={() => removerAluno(alunoId, a.nome)} style={{
                          padding:'4px 12px', border:'1px solid #fecaca', borderRadius:7,
                          background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:11, fontWeight:600,
                        }}>🗑️ Remover</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ ADICIONAR ════ */}
      {modo === 'adicionar' && (
        <div>
          {/* Painel flutuante de confirmação */}
          {canMatriculate && (
            <div style={{
              position:'sticky', top:8, zIndex:100, marginBottom:'1rem',
              background:'white', border:'2px solid var(--emerald)', borderRadius:12,
              padding:'14px 18px', boxShadow:'0 4px 20px rgba(16,185,129,.25)',
              display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:'var(--emerald)' }}>
                  ✅ {selecionados.size} aluno(s) · {discsSelecionadas.size} disciplina(s) selecionada(s)
                </div>
                <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>
                  Disciplinas: <strong>{disciplinas.filter(d=>discsSelecionadas.has(d.id)).map(d=>d.nome).join(', ')}</strong>
                </div>
              </div>
              <button onClick={()=>setSel(new Set())} style={{ padding:'6px 12px', border:'1px solid #fecaca', borderRadius:8, background:'#fef2f2', color:'#dc2626', fontSize:12, cursor:'pointer', fontWeight:600 }}>❌ Limpar</button>
              <button onClick={() => setConf(true)} disabled={matriculando} style={{
                padding:'10px 22px', background:'var(--emerald)', color:'white', border:'none',
                borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 2px 10px #10b98140',
              }}>
                {matriculando ? '⏳ Matriculando...' : '🎓 Confirmar Matrícula'}
              </button>
            </div>
          )}

          {/* PASSO 1: Selecionar Disciplinas */}
          <div className="card" style={{ marginBottom:'1rem' }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color:'var(--navy)', marginBottom:'0.25rem' }}>
              📚 Passo 1 — Selecionar Disciplina(s)
            </div>
            <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:'0.875rem' }}>
              Escolha em qual(is) disciplina(s) os alunos serão matriculados. O aluno terá acesso apenas às disciplinas selecionadas.
            </div>
            {disciplinas.length === 0 ? (
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e' }}>
                ⚠️ Esta turma não tem disciplinas vinculadas ainda. Vá na aba "Disciplinas" para vincular.
              </div>
            ) : (
              <>
                <div style={{ display:'flex', gap:6, marginBottom:'0.75rem' }}>
                  <button onClick={toggleTodasDiscs} style={{ padding:'5px 14px', border:'1px solid var(--emerald)', borderRadius:8, background:'#ecfdf5', color:'var(--emerald)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {discsSelecionadas.size === disciplinas.length ? '❌ Desmarcar todas' : '✅ Selecionar todas'}
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
                  {disciplinas.map(d => {
                    const sel = discsSelecionadas.has(d.id);
                    return (
                      <div key={d.id} onClick={() => toggleDisc(d.id)} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'10px 13px',
                        border:'2px solid '+(sel?'var(--emerald)':'var(--slate-200)'),
                        borderRadius:10, cursor:'pointer',
                        background: sel?'#ecfdf5':'white',
                        transition:'all .12s',
                      }}>
                        <div style={{
                          width:20, height:20, borderRadius:5, flexShrink:0,
                          border:'2px solid '+(sel?'var(--emerald)':'var(--slate-300)'),
                          background: sel?'var(--emerald)':'white',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          {sel && <span style={{ color:'white', fontSize:12 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)' }}>{d.nome}</div>
                          {d.codigo && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{d.codigo} · {d.carga_horaria}h</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* PASSO 2: Selecionar Alunos */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.875rem', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color:'var(--navy)' }}>
                  👥 Passo 2 — Selecionar Aluno(s)
                </div>
                <div style={{ fontSize:12, color:'var(--slate-500)' }}>
                  {carregando ? '🔄 Buscando...' : todosAlunos.length+' aluno(s) encontrado(s)'}
                </div>
              </div>
              <button onClick={toggleTodosAlunos} style={{
                padding:'6px 14px', border:'1px solid var(--emerald)', borderRadius:8,
                background:'#ecfdf5', color:'var(--emerald)', fontSize:12, fontWeight:700, cursor:'pointer',
              }}>
                {selecionados.size === disponiveis.length && disponiveis.length > 0 ? '❌ Desmarcar todos' : '✅ Selecionar todos disponíveis ('+disponiveis.length+')'}
              </button>
            </div>

            {/* Busca em tempo real */}
            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="🔍 Buscar por nome ou e-mail... (busca em tempo real)"
                style={{ ...inputStyle, width:'100%', paddingRight:busca?40:12, boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--emerald)'}
                onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />
              {busca && <button onClick={()=>setBusca('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', fontSize:16, color:'var(--slate-400)' }}>✕</button>}
            </div>

            {/* Aviso de disciplinas não selecionadas */}
            {discsSelecionadas.size === 0 && (
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e', marginBottom:'1rem' }}>
                ⚠️ Selecione ao menos uma disciplina no Passo 1 antes de escolher os alunos.
              </div>
            )}

            {carregando ? (
              <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
            ) : todosAlunos.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--slate-400)', padding:'2rem', fontSize:13 }}>
                {busca ? 'Nenhum aluno encontrado para "'+busca+'"' : 'Nenhum aluno cadastrado.'}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {alunosPagina.map(a => {
                    const bloqueado = a.ja_nesta_turma && discsSelecionadas.size > 0 &&
                      [...discsSelecionadas].every(did =>
                        (alunoDiscMap[a.id]||[]).some(d => d.id === did)
                      );
                    const sel = selecionados.has(a.id);
                    return (
                      <div key={a.id} onClick={() => { if (!a.ja_nesta_turma || !bloqueado) toggleSel(a.id); }} style={{
                        display:'flex', alignItems:'center', gap:12, padding:'11px 13px',
                        border:'1.5px solid '+(sel?'var(--emerald)':a.turma_atual&&!a.ja_nesta_turma?'var(--slate-100)':'var(--slate-200)'),
                        borderRadius:10, cursor:a.turma_atual&&!a.ja_nesta_turma?'default':'pointer',
                        background: sel?'#ecfdf5':a.turma_atual&&!a.ja_nesta_turma?'var(--slate-50)':'white',
                        opacity: a.turma_atual&&!a.ja_nesta_turma?0.5:1, transition:'all .12s',
                      }}>
                        <div style={{ width:20, height:20, borderRadius:5, flexShrink:0,
                          border:'2px solid '+(sel?'var(--emerald)':'var(--slate-300)'),
                          background: sel?'var(--emerald)':'white',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {sel && <span style={{ color:'white', fontSize:12 }}>✓</span>}
                        </div>
                        <Avatar name={a.nome} size={36} foto={a.foto} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nome}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)' }}>{a.email}</div>
                        </div>
                        {a.ja_nesta_turma
                          ? <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600, whiteSpace:'nowrap' }}>✅ Já nesta turma</span>
                          : a.turma_atual
                            ? <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#fef3c7', color:'#92400e', fontWeight:600, whiteSpace:'nowrap' }}>⚠️ Em: {a.turma_atual}</span>
                            : <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-500)', fontWeight:600, whiteSpace:'nowrap' }}>Disponível</span>
                        }
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                {totalPaginas > 1 && (
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--slate-100)' }}>
                    <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaAtual===1} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:paginaAtual===1?'default':'pointer', fontSize:13, opacity:paginaAtual===1?.5:1 }}>← Anterior</button>
                    <span style={{ fontSize:13, color:'var(--slate-500)' }}>Página {paginaAtual} de {totalPaginas} · {todosAlunos.length} alunos</span>
                    <button onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaAtual===totalPaginas} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:paginaAtual===totalPaginas?'default':'pointer', fontSize:13, opacity:paginaAtual===totalPaginas?.5:1 }}>Próxima →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e=>e.target===e.currentTarget&&setConf(false)}>
          <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700 }}>🎓 Confirmar Matrícula</div>
            </div>
            <div style={{ padding:'1.5rem' }}>
              <p style={{ fontSize:14, color:'var(--slate-600)', marginBottom:'1rem', lineHeight:1.6 }}>
                Matricular <strong>{selecionados.size} aluno(s)</strong> nas seguintes disciplinas da turma <strong>{turma.nome}</strong>:
              </p>
              <div style={{ marginBottom:'1rem' }}>
                {disciplinas.filter(d=>discsSelecionadas.has(d.id)).map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#ecfdf5', borderRadius:8, marginBottom:6, border:'1px solid #a7f3d0' }}>
                    <span style={{ fontSize:16 }}>📚</span>
                    <span style={{ fontWeight:700, fontSize:13, color:'#065f46' }}>{d.nome}</span>
                    {d.carga_horaria && <span style={{ fontSize:11, color:'#047857' }}>{d.carga_horaria}h</span>}
                  </div>
                ))}
              </div>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#1d4ed8', marginBottom:'1.25rem' }}>
                ℹ️ Cada aluno poderá cursar apenas as disciplinas selecionadas. O professor pode adicionar mais disciplinas depois.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setConf(false)} style={{ flex:1, padding:'10px 0', border:'1px solid var(--slate-200)', borderRadius:9, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
                <button onClick={matricularSelecionados} disabled={matriculando} style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9, background:'var(--emerald)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {matriculando ? '⏳ Matriculando...' : '✅ Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ── Detalhe da turmaia:
 *   1. CRUD de turmas
 *   2. Vincular/desvincular disciplinas da turma
 *   3. Matricular/desmatricular alunos
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState, Avatar } from '../../../components/ui';

const TABS = ['disciplinas', 'alunos'];


// ════════════════════════════════════════════════════════════
// ALUNOS TAB — componente completo com busca avançada,
// seleção múltipla e vinculação à disciplina
// ════════════════════════════════════════════════════════════
function AlunosTab({ turma, alunos, disciplinas, onRefresh, onAlert }) {
  const [modo, setModo]             = useState('matriculados');  // 'matriculados' | 'adicionar'
  const [busca, setBusca]           = useState('');
  const [todosAlunos, setTodos]     = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSel]      = useState(new Set());
  const [discVincular, setDiscVinc] = useState('');
  const [matriculando, setMatric]   = useState(false);
  const [confirmando, setConf]      = useState(false);
  const [paginaAtual, setPagina]    = useState(1);
  const POR_PAGINA = 10;

  // ── busca em tempo real ──────────────────────────────────
  useEffect(() => {
    if (modo !== 'adicionar') return;
    const timer = setTimeout(() => carregarAlunos(busca), 300);
    return () => clearTimeout(timer);
  }, [busca, modo]);

  const carregarAlunos = async (q = '') => {
    setCarregando(true);
    try {
      const r = await api.get('/turmas/lista/alunos?turma_id='+turma.id+(q?'&busca='+encodeURIComponent(q):''));
      setTodos(r.data.alunos || []);
      setPagina(1);
    } catch(e) { console.error(e); }
    setCarregando(false);
  };

  const toggleSel = (id) => {
    if (selecionados.has(id)) {
      const next = new Set(selecionados); next.delete(id); setSel(next);
    } else {
      const next = new Set(selecionados); next.add(id); setSel(next);
    }
  };

  const disponiveis = todosAlunos.filter(a => !a.ja_nesta_turma);
  const selecionadosCount = selecionados.size;

  // Selecionar/Desmarcar todos disponíveis
  const toggleTodos = () => {
    if (selecionadosCount === disponiveis.length && disponiveis.length > 0) {
      setSel(new Set());
    } else {
      setSel(new Set(disponiveis.map(a => a.id)));
    }
  };

  const matricularSelecionados = async () => {
    if (selecionados.size === 0) return;
    setMatric(true); setConf(false);
    try {
      const r = await api.post('/turmas/'+turma.id+'/alunos/lote', { aluno_ids: [...selecionados] });
      onAlert({ type:'success', msg: '✅ '+r.data.message });
      setSel(new Set()); setBusca('');
      onRefresh();
      setModo('matriculados');
    } catch(e) {
      onAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao matricular.' });
    }
    setMatric(false);
  };

  const removerAluno = async (alunoId, nome) => {
    if (!window.confirm('Remover "'+nome+'" desta turma?')) return;
    try {
      await api.delete('/turmas/'+turma.id+'/alunos/'+alunoId);
      onAlert({ type:'success', msg: '✅ Aluno removido da turma.' });
      onRefresh();
    } catch(e) {
      onAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao remover.' });
    }
  };

  // ── Filtro local dos matriculados ─────────────────────────
  const [buscaMatric, setBuscaMatric] = useState('');
  const alunosFiltrados = alunos.filter(a =>
    !buscaMatric || a.nome.toLowerCase().includes(buscaMatric.toLowerCase()) ||
    a.email.toLowerCase().includes(buscaMatric.toLowerCase())
  );

  // Paginação dos alunos disponíveis
  const totalPaginas = Math.ceil(todosAlunos.length / POR_PAGINA);
  const alunosPagina = todosAlunos.slice((paginaAtual-1)*POR_PAGINA, paginaAtual*POR_PAGINA);

  const inputStyle = {
    flex:1, padding:'9px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8,
    fontSize:13, outline:'none', fontFamily:'var(--font-body)',
  };

  return (
    <div>
      {/* ── Abas modo ───────────────────────────────────────── */}
      <div style={{ display:'flex', gap:6, marginBottom:'1.25rem', borderBottom:'2px solid var(--slate-200)', paddingBottom:0 }}>
        {[
          ['matriculados', '👨‍🎓 Matriculados ('+alunos.length+')'],
          ['adicionar',    '➕ Adicionar Alunos'],
        ].map(([v,l]) => (
          <button key={v} onClick={() => { setModo(v); if(v==='adicionar') carregarAlunos(''); }} style={{
            padding:'9px 18px', border:'none', background:'none', cursor:'pointer',
            fontWeight: modo===v?800:400, color: modo===v?'var(--emerald)':'var(--slate-500)',
            borderBottom: modo===v?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{l}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          MODO: ALUNOS MATRICULADOS
      ════════════════════════════════════════════════════ */}
      {modo === 'matriculados' && (
        <div className="card">
          {/* Busca local */}
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', alignItems:'center' }}>
            <input
              value={buscaMatric}
              onChange={e => setBuscaMatric(e.target.value)}
              placeholder="🔍 Filtrar por nome ou e-mail..."
              style={inputStyle}
              onFocus={e => e.target.style.borderColor='var(--emerald)'}
              onBlur={e => e.target.style.borderColor='var(--slate-200)'}
            />
            {buscaMatric && (
              <button onClick={() => setBuscaMatric('')} style={{ padding:'9px 12px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', fontSize:12, cursor:'pointer' }}>✕</button>
            )}
            <span style={{ fontSize:12, color:'var(--slate-500)', whiteSpace:'nowrap' }}>
              {alunosFiltrados.length} aluno(s){buscaMatric ? ' encontrado(s)' : ''}
            </span>
          </div>

          {alunos.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--slate-400)' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>👨‍🎓</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>Nenhum aluno matriculado</div>
              <div style={{ fontSize:13 }}>Vá em "Adicionar Alunos" para matricular.</div>
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)', fontSize:13 }}>
              Nenhum aluno encontrado para "{buscaMatric}"
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {alunosFiltrados.map((a, i) => (
                <div key={a.aluno_id || a.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  border:'1px solid var(--slate-200)', borderRadius:10,
                  background: i%2===0 ? 'white' : 'var(--slate-50)',
                  transition:'background .1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background=i%2===0?'white':'var(--slate-50)'}
                >
                  <Avatar name={a.nome} size={38} foto={a.foto} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)' }}>{a.nome}</div>
                    <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:1 }}>{a.email}</div>
                    {/* Disciplinas que o aluno acessa via esta turma */}
                    {disciplinas.length > 0 && (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                        {disciplinas.map(d => (
                          <span key={d.id} style={{ fontSize:10, padding:'1px 7px', borderRadius:99, background:'#ecfdf5', color:'#059669', border:'1px solid #a7f3d0' }}>
                            📚 {d.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600 }}>
                      ✅ Ativo
                    </span>
                    <div style={{ fontSize:10, color:'var(--slate-400)' }}>
                      📅 {(a.joined_at||a.created_at||'').split('T')[0]}
                    </div>
                    <button onClick={() => removerAluno(a.aluno_id||a.id, a.nome)} style={{
                      padding:'4px 12px', border:'1px solid #fecaca', borderRadius:7,
                      background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:11, fontWeight:600,
                    }}>🗑️ Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODO: ADICIONAR ALUNOS
      ════════════════════════════════════════════════════ */}
      {modo === 'adicionar' && (
        <div>
          {/* Painel flutuante de seleção */}
          {selecionadosCount > 0 && (
            <div style={{
              position:'sticky', top:8, zIndex:100, marginBottom:'1rem',
              background:'white', border:'2px solid var(--emerald)', borderRadius:12,
              padding:'14px 18px', boxShadow:'0 4px 20px rgba(16,185,129,.25)',
              display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:'var(--emerald)' }}>
                  ✅ {selecionadosCount} aluno(s) selecionado(s)
                </div>
                {disciplinas.length > 0 && (
                  <div style={{ fontSize:12, color:'var(--slate-500)', marginTop:2 }}>
                    Serão matriculados e terão acesso a: {disciplinas.map(d=>d.nome).join(', ')}
                  </div>
                )}
              </div>
              <button onClick={() => setSel(new Set())} style={{ padding:'6px 12px', border:'1px solid #fecaca', borderRadius:8, background:'#fef2f2', color:'#dc2626', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                ❌ Limpar
              </button>
              <button onClick={() => setConf(true)} disabled={matriculando} style={{
                padding:'10px 22px', background:'var(--emerald)', color:'white', border:'none',
                borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer',
                boxShadow:'0 2px 10px #10b98140',
              }}>
                {matriculando ? '⏳ Matriculando...' : '🎓 Matricular Selecionados'}
              </button>
            </div>
          )}

          {/* Card de busca */}
          <div className="card" style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.875rem', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color:'var(--navy)' }}>🔍 Busca Avançada de Alunos</div>
                <div style={{ fontSize:12, color:'var(--slate-500)' }}>
                  {carregando ? '🔄 Buscando...' : todosAlunos.length+' aluno(s) encontrado(s)'}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={toggleTodos} style={{
                  padding:'6px 14px', border:'1px solid var(--emerald)', borderRadius:8,
                  background:'#ecfdf5', color:'var(--emerald)', fontSize:12, fontWeight:700, cursor:'pointer',
                }}>
                  {selecionadosCount === disponiveis.length && disponiveis.length > 0 ? '❌ Desmarcar todos' : '✅ Selecionar todos disponíveis ('+disponiveis.length+')'}
                </button>
              </div>
            </div>

            {/* Campo de busca em tempo real */}
            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="🔍 Buscar por nome ou e-mail... (busca em tempo real)"
                style={{ ...inputStyle, width:'100%', paddingRight: busca?40:12, boxSizing:'border-box' }}
                onFocus={e => e.target.style.borderColor='var(--emerald)'}
                onBlur={e => e.target.style.borderColor='var(--slate-200)'}
              />
              {busca && (
                <button onClick={() => setBusca('')} style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  border:'none', background:'none', cursor:'pointer', fontSize:16, color:'var(--slate-400)',
                }}>✕</button>
              )}
            </div>

            {/* Aviso sobre disciplinas que serão acessíveis */}
            {disciplinas.length > 0 && (
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#1d4ed8', marginBottom:'1rem', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>📚</span>
                <span>Ao matricular, o aluno terá acesso automático às disciplinas: <strong>{disciplinas.map(d=>d.nome).join(', ')}</strong></span>
              </div>
            )}

            {/* Lista com checkboxes */}
            {carregando ? (
              <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
            ) : todosAlunos.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--slate-400)', padding:'2rem', fontSize:13 }}>
                {busca ? 'Nenhum aluno encontrado para "'+busca+'"' : 'Nenhum aluno cadastrado.'}
              </div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {alunosPagina.map(a => {
                    const bloqueado = a.ja_nesta_turma || !!a.turma_atual;
                    const sel = selecionados.has(a.id);
                    return (
                      <div key={a.id} onClick={() => { if (!bloqueado) toggleSel(a.id); }} style={{
                        display:'flex', alignItems:'center', gap:12, padding:'11px 13px',
                        border:'1.5px solid '+(sel?'var(--emerald)':bloqueado?'var(--slate-100)':'var(--slate-200)'),
                        borderRadius:10, cursor:bloqueado?'default':'pointer',
                        background: sel?'#ecfdf5':bloqueado?'var(--slate-50)':'white',
                        opacity: bloqueado ? 0.55 : 1, transition:'all .12s',
                      }}
                        onMouseEnter={e => { if (!bloqueado) e.currentTarget.style.borderColor='var(--emerald)'; }}
                        onMouseLeave={e => { if (!sel && !bloqueado) e.currentTarget.style.borderColor='var(--slate-200)'; }}
                      >
                        {/* Checkbox visual */}
                        <div style={{
                          width:20, height:20, borderRadius:5, flexShrink:0,
                          border:'2px solid '+(sel?'var(--emerald)':bloqueado?'var(--slate-200)':'var(--slate-300)'),
                          background: sel ? 'var(--emerald)' : 'white',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'all .1s',
                        }}>
                          {sel && <span style={{ color:'white', fontSize:12, lineHeight:1 }}>✓</span>}
                        </div>
                        <Avatar name={a.nome} size={36} foto={a.foto} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nome}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)' }}>{a.email}</div>
                        </div>
                        {a.ja_nesta_turma
                          ? <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#dcfce7', color:'#166534', fontWeight:600, whiteSpace:'nowrap' }}>✅ Já nesta turma</span>
                          : a.turma_atual
                            ? <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'#fef3c7', color:'#92400e', fontWeight:600, whiteSpace:'nowrap' }}>⚠️ Em: {a.turma_atual}</span>
                            : <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-500)', fontWeight:600, whiteSpace:'nowrap' }}>Disponível</span>
                        }
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                {totalPaginas > 1 && (
                  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--slate-100)' }}>
                    <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={paginaAtual===1} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:paginaAtual===1?'default':'pointer', fontSize:13, opacity:paginaAtual===1?.5:1 }}>
                      ← Anterior
                    </button>
                    <span style={{ fontSize:13, color:'var(--slate-500)' }}>
                      Página {paginaAtual} de {totalPaginas} · {todosAlunos.length} alunos
                    </span>
                    <button onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={paginaAtual===totalPaginas} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:paginaAtual===totalPaginas?'default':'pointer', fontSize:13, opacity:paginaAtual===totalPaginas?.5:1 }}>
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de confirmação ────────────────────────────── */}
      {confirmando && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e => e.target===e.currentTarget && setConf(false)}>
          <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
            <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700 }}>🎓 Confirmar Matrícula</div>
            </div>
            <div style={{ padding:'1.5rem' }}>
              <p style={{ fontSize:14, color:'var(--slate-600)', marginBottom:'1rem', lineHeight:1.6 }}>
                Você está prestes a matricular <strong>{selecionadosCount} aluno(s)</strong> na turma <strong>{turma.nome}</strong>.
              </p>
              {disciplinas.length > 0 && (
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#1d4ed8', marginBottom:'1rem' }}>
                  📚 Eles terão acesso às disciplinas: <strong>{disciplinas.map(d=>d.nome).join(', ')}</strong>
                </div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setConf(false)} style={{ flex:1, padding:'10px 0', border:'1px solid var(--slate-200)', borderRadius:9, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
                <button onClick={matricularSelecionados} disabled={matriculando} style={{ flex:2, padding:'10px 0', border:'none', borderRadius:9, background:'var(--emerald)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {matriculando ? '⏳ Matriculando...' : '✅ Confirmar Matrícula'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function ProfTurmas({ autoCreate } = {}) {
  const { user } = useAuth();
  const [turmas, setTurmas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState(null);
  const [tabAtiva, setTab]    = useState('disciplinas');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]   = useState({ nome:'', descricao:'' });
  const [saving, setSaving]   = useState(false);
  const [alert, setAlert]     = useState(null);

  const [matriculando, setMatriculando] = useState(false);

  const load = async () => {
    try {
      const r = await api.get('/turmas?professor_id='+user.id);
      setTurmas(r.data.turmas || []);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { if (autoCreate) setShowModal(true); }, [autoCreate]);

  const abrirDetalhe = async (t) => {
    try {
      const r = await api.get('/turmas/'+t.id);
      setDetalhe(r.data.turma);
      setTab('disciplinas');
      setAlert(null);
    } catch(e){ console.error(e); }
  };

  const refreshDetalhe = async () => {
    if (!detalhe) return;
    const r = await api.get('/turmas/'+detalhe.id);
    setDetalhe(r.data.turma);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditItem(null); setForm({ nome:'', descricao:'' }); setShowModal(true); };
  const openEdit   = (t) => { setEditItem(t); setForm({ nome:t.nome, descricao:t.descricao||'' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nome.trim()) { setAlert({ type:'error', msg:'Nome é obrigatório.' }); return; }
    setSaving(true);
    try {
      if (editItem) {
        const r = await api.put('/turmas/'+editItem.id, form);
        setTurmas(p => p.map(t => t.id===editItem.id ? r.data.turma : t));
      } else {
        const r = await api.post('/turmas', form);
        setTurmas(p => [r.data.turma, ...p]);
      }
      setShowModal(false); setAlert(null);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro.' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir turma? Isso remove todos os vínculos de disciplinas e alunos.')) return;
    await api.delete('/turmas/'+id);
    setTurmas(p => p.filter(t => t.id !== id));
  };

  // ── Disciplinas ──────────────────────────────────────────────
  const vincularDisc = async (discId) => {
    try {
      const r = await api.post('/turmas/'+detalhe.id+'/disciplinas', { disciplina_id: discId });
      setAlert({ type:'success', msg: r.data.message });
      refreshDetalhe();
      setTimeout(() => setAlert(null), 3000);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro.' }); }
  };

  const desvincularDisc = async (discId) => {
    if (!window.confirm('Desvincular disciplina? Alunos perderão acesso às trilhas desta disciplina nesta turma.')) return;
    try {
      await api.delete('/turmas/'+detalhe.id+'/disciplinas/'+discId);
      refreshDetalhe();
    } catch(e){ alert(e.response?.data?.error||'Erro.'); }
  };

  // ── Alunos ───────────────────────────────────────────────────


  // ════════════════════════════════════════════════════════════
  // DETALHE DA TURMA
  // ════════════════════════════════════════════════════════════
  if (detalhe) {
    const disciplinas = detalhe.disciplinas || [];
    const disponiveisParaVincular = detalhe.disponiveisParaVincular || [];
    const alunos = detalhe.alunos || [];

    return (
      <>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
          <button onClick={() => { setDetalhe(null); setAlert(null); }} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
          <div>
            <div className="page-title" style={{ marginBottom:0 }}>{detalhe.nome}</div>
            <div className="page-sub">{disciplinas.length} disciplina(s) · {alunos.length} aluno(s)</div>
          </div>
        </div>

        {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

        {/* Código da turma */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:12, padding:'1rem 1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', color:'white' }}>
          <div>
            <div style={{ fontSize:11, opacity:.5, marginBottom:2 }}>Código da turma</div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:700, letterSpacing:4 }}>{detalhe.codigo_acesso}</div>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(detalhe.codigo_acesso)} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.15)', border:'none', borderRadius:7, color:'white', cursor:'pointer', fontSize:12 }}>📋 Copiar</button>
        </div>

        {/* Abas */}
        <div style={{ display:'flex', gap:4, marginBottom:'1rem', background:'var(--slate-100)', padding:4, borderRadius:10, width:'fit-content' }}>
          {[['disciplinas','📚 Disciplinas'],['alunos','👨‍🎓 Alunos']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:'7px 16px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              background: tabAtiva===k ? 'white' : 'transparent',
              color: tabAtiva===k ? 'var(--navy)' : 'var(--slate-500)',
              boxShadow: tabAtiva===k ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>{l}</button>
          ))}
        </div>

        {/* ── ABA DISCIPLINAS ── */}
        {tabAtiva === 'disciplinas' && (
          <>
            {/* Disciplinas já vinculadas */}
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>
                📚 Disciplinas desta Turma ({disciplinas.length})
              </div>
              {disciplinas.length === 0 ? (
                <EmptyState icon="📚" title="Nenhuma disciplina vinculada" sub="Vincule disciplinas abaixo para liberar trilhas e conteúdos para os alunos." />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {disciplinas.map(d => (
                    <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'var(--slate-50)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{d.nome}</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>
                          {d.descricao && d.descricao+' · '}{(d.total_trilhas||0)} trilha(s) · {d.carga_horaria}h
                        </div>
                      </div>
                      <span style={{ padding:'2px 8px', borderRadius:50, background:'rgba(16,185,129,0.1)', color:'var(--emerald-dark)', fontSize:11, fontWeight:600 }}>
                        ✅ Vinculada
                      </span>
                      <button onClick={() => desvincularDisc(d.id)} style={{ padding:'4px 10px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                        🔗 Desvincular
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vincular nova disciplina */}
            {disponiveisParaVincular.length > 0 && (
              <div className="card">
                <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>
                  ➕ Vincular Disciplina
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
                  {disponiveisParaVincular.map(d => (
                    <div key={d.id} style={{ padding:'10px 12px', border:'1.5px dashed var(--slate-300)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-700)' }}>{d.nome}</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>{d.carga_horaria}h</div>
                      </div>
                      <button onClick={() => vincularDisc(d.id)} style={{ padding:'5px 12px', background:'var(--emerald)', color:'white', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 }}>
                        + Vincular
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {disponiveisParaVincular.length === 0 && disciplinas.length > 0 && (
              <div style={{ fontSize:13, color:'var(--slate-400)', textAlign:'center', padding:'1rem' }}>
                Todas as suas disciplinas já estão vinculadas a esta turma.
              </div>
            )}
          </>
        )}

        {/* ── ABA ALUNOS ── */}
        {tabAtiva === 'alunos' && (
          <AlunosTab
            turma={detalhe}
            alunos={alunos}
            disciplinas={disciplinas}
            onRefresh={() => { abrirDetalhe(detalhe); }}
            onAlert={(a) => { setAlert(a); setTimeout(()=>setAlert(null),5000); }}
          />
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  // LISTA DE TURMAS
  // ════════════════════════════════════════════════════════════
  return (
    <>
      <div className="page-header">
        <div className="page-title">Minhas Turmas</div>
        <div className="page-sub">Gerencie turmas, disciplinas vinculadas e alunos matriculados</div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ marginBottom:'1rem', display:'flex', justifyContent:'flex-end' }}>
        <button className="btn-create" onClick={openCreate}>+ Nova Turma</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : turmas.length === 0 ? (
        <div className="card"><EmptyState icon="🏫" title="Nenhuma turma criada" sub="Crie sua primeira turma acima" /></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {turmas.map(t => {
            const disc = t.disciplinas || [];
            return (
              <div key={t.id} style={{ border:'1px solid var(--slate-200)', borderRadius:14, overflow:'hidden', background:'white', boxShadow:'var(--shadow)' }}>
                <div style={{ padding:'1rem 1.25rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600 }}>{t.nome}</div>
                      {t.descricao && <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>{t.descricao}</div>}
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => openEdit(t)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:26, height:26, borderRadius:6, cursor:'pointer', fontSize:11 }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} style={{ background:'rgba(244,63,94,0.25)', border:'none', color:'white', width:26, height:26, borderRadius:6, cursor:'pointer', fontSize:11 }}>🗑</button>
                    </div>
                  </div>
                </div>
                <div style={{ padding:'1rem' }}>
                  <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--slate-500)', marginBottom:10 }}>
                    <span>📚 {disc.length} disciplina(s)</span>
                    <span>👨‍🎓 {t.total_alunos||0} aluno(s)</span>
                  </div>
                  {disc.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
                      {disc.slice(0,3).map(d => (
                        <span key={d.id} style={{ padding:'2px 8px', borderRadius:50, background:'rgba(16,185,129,0.08)', color:'var(--emerald-dark)', fontSize:11, border:'1px solid rgba(16,185,129,0.2)' }}>
                          {d.nome}
                        </span>
                      ))}
                      {disc.length > 3 && <span style={{ fontSize:11, color:'var(--slate-400)' }}>+{disc.length-3} mais</span>}
                    </div>
                  )}
                  <button onClick={() => abrirDetalhe(t)} style={{ width:'100%', padding:'8px', background:'var(--slate-50)', border:'1.5px solid var(--slate-200)', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, color:'var(--navy)' }}>
                    Gerenciar →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editItem?'Editar Turma':'Nova Turma'} onClose={() => setShowModal(false)}>
          {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}
          <div className="field"><label>Nome da Turma</label><input value={form.nome} onChange={set('nome')} placeholder="ex: Turma A — 2025/1" /></div>
          <div className="field"><label>Descrição (opcional)</label><input value={form.descricao} onChange={set('descricao')} placeholder="Turma do período noturno..." /></div>
          {!editItem && <div style={{ fontSize:12, color:'var(--slate-400)', marginBottom:'1rem' }}>ℹ️ O código de acesso é gerado automaticamente. Após criar, vincule disciplinas e matricule alunos.</div>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
        </Modal>
      )}
    </>
  );
}

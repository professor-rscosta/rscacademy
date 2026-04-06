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

  // Estados de matrícula
  const [buscarEmail, setBuscarEmail] = useState('');
  const [buscando, setBuscando]       = useState(false);
  const [alunoEnc, setAlunoEnc]       = useState(null);
  const [buscaErro, setBuscaErro]     = useState('');
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
      setBuscarEmail(''); setBuscaErro(''); setAlunoEnc(null); setAlert(null);
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
  const buscarAluno = async () => {
    if (!buscarEmail.trim()) return;
    setBuscando(true); setBuscaErro(''); setAlunoEnc(null);
    try {
      const r = await api.get('/turmas/buscar/aluno?email='+encodeURIComponent(buscarEmail.trim()));
      setAlunoEnc(r.data);
    } catch(e){ setBuscaErro(e.response?.data?.error||'Aluno não encontrado.'); }
    setBuscando(false);
  };

  const matricular = async (alunoId) => {
    setMatriculando(true);
    try {
      const r = await api.post('/turmas/'+detalhe.id+'/alunos', { aluno_id: alunoId });
      setAlert({ type:'success', msg: r.data.message });
      setBuscarEmail(''); setAlunoEnc(null); setBuscaErro('');
      refreshDetalhe();
      setTurmas(p => p.map(t => t.id===detalhe.id ? { ...t, total_alunos:(t.total_alunos||0)+1 } : t));
      setTimeout(() => setAlert(null), 3000);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro.' }); }
    setMatriculando(false);
  };

  const removerAluno = async (alunoId) => {
    if (!window.confirm('Remover aluno da turma?')) return;
    try {
      await api.delete('/turmas/'+detalhe.id+'/alunos/'+alunoId);
      refreshDetalhe();
      setTurmas(p => p.map(t => t.id===detalhe.id ? { ...t, total_alunos:Math.max(0,(t.total_alunos||1)-1) } : t));
    } catch(e){ alert(e.response?.data?.error||'Erro.'); }
  };

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
          <>
            {/* Matricular aluno */}
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>
                ➕ Matricular Aluno por E-mail
              </div>
              <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#075985', marginBottom:12 }}>
                🔒 Apenas professores e administradores podem matricular alunos. Um aluno pode estar em apenas <strong>uma turma ativa</strong>.
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input
                  value={buscarEmail}
                  onChange={e => setBuscarEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarAluno()}
                  placeholder="E-mail do aluno (ex: lucas@aluno.rsc.edu)"
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}
                  onFocus={e => e.target.style.borderColor='var(--emerald)'}
                  onBlur={e => e.target.style.borderColor='var(--slate-200)'}
                />
                <button onClick={buscarAluno} disabled={!buscarEmail.trim()||buscando} style={{ padding:'9px 16px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', opacity:!buscarEmail.trim()||buscando?0.5:1 }}>
                  {buscando ? '🔍...' : '🔍 Buscar'}
                </button>
              </div>

              {buscaErro && <div className="alert alert-error" style={{ marginBottom:8 }}>{buscaErro}</div>}

              {alunoEnc && (
                <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                  <Avatar name={alunoEnc.aluno.nome} size={40} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{alunoEnc.aluno.nome}</div>
                    <div style={{ fontSize:11, color:'var(--slate-400)' }}>{alunoEnc.aluno.email}</div>
                    {alunoEnc.turmas?.length > 0 && (
                      <div style={{ fontSize:11, color:'#92400e', background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:4, padding:'2px 6px', marginTop:4, display:'inline-block' }}>
                        ⚠️ Já em: {alunoEnc.turmas.map(t => t.nome).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => matricular(alunoEnc.aluno.id)}
                    disabled={matriculando || alunoEnc.turmas?.length > 0}
                    style={{ padding:'9px 18px', background:'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', opacity: matriculando||alunoEnc.turmas?.length>0 ? 0.5 : 1 }}>
                    {matriculando ? '...' : alunoEnc.turmas?.length > 0 ? 'Já em outra turma' : '✅ Matricular'}
                  </button>
                </div>
              )}
            </div>

            {/* Lista de alunos */}
            <div className="card">
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>
                👨‍🎓 Alunos Matriculados ({alunos.length})
              </div>
              {alunos.length === 0 ? (
                <EmptyState icon="👨‍🎓" title="Nenhum aluno matriculado" sub="Use o campo acima para matricular alunos pelo e-mail." />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Aluno</th><th>E-mail</th><th>Status</th><th>Matriculado em</th><th></th></tr></thead>
                    <tbody>
                      {alunos.map(a => (
                        <tr key={a.id}>
                          <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><Avatar name={a.nome} size={28} /><span style={{ fontWeight:500 }}>{a.nome}</span></div></td>
                          <td style={{ fontSize:12, color:'var(--slate-500)' }}>{a.email}</td>
                          <td><span style={{ padding:'2px 8px', borderRadius:50, background:'rgba(16,185,129,0.1)', color:'var(--emerald-dark)', fontSize:11 }}>✅ Ativo</span></td>
                          <td style={{ fontSize:11, color:'var(--slate-400)' }}>{a.joined_at?.split('T')[0]}</td>
                          <td><button className="btn-sm btn-danger" onClick={() => removerAluno(a.id)}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
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

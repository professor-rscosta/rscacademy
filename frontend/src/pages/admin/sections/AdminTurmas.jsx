/**
 * AdminTurmas — CRUD completo de turmas + disciplinas + alunos (admin)
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { Modal, EmptyState, Avatar } from '../../../components/ui';

function Alert({ data, onClose }) {
  if (!data) return null;
  const cor = data.type === 'success' ? '#10b981' : data.type === 'warning' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, background:cor+'15', border:'1px solid '+cor+'40',
      color:cor, fontSize:13, fontWeight:600, marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      {data.msg}
      <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:16, color:cor }}>×</button>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13,
      fontWeight: active ? 700 : 400, color: active ? 'var(--emerald)' : 'var(--slate-500)',
      borderBottom: active ? '2px solid var(--emerald)' : '2px solid transparent', marginBottom:-2,
    }}>{label}</button>
  );
}

// ── Detalhe da turma ────────────────────────────────────────
function TurmaDetalhe({ turma, onVoltar, onUpdate }) {
  const [tab, setTab]         = useState('disciplinas');
  const [disciplinas, setDiscs] = useState([]);
  const [alunos, setAlunos]   = useState([]);
  const [todasDiscs, setTodas] = useState([]);
  const [busca, setBusca]     = useState('');
  const [resultado, setResultado] = useState([]);
  const [alert, setAlert]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/turmas/${turma.id}/disciplinas`),
      api.get(`/turmas/${turma.id}`),
      api.get('/disciplinas'),
    ]).then(([dRes, tRes, allDRes]) => {
      setDiscs(dRes.data.disciplinas || []);
      setAlunos(tRes.data.alunos || []);
      setTodas(allDRes.data.disciplinas || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [turma.id]);

  const vincularDisc = async (discId) => {
    try {
      await api.post(`/turmas/${turma.id}/disciplinas`, { disciplina_id: discId });
      setAlert({ type:'success', msg:'✅ Disciplina vinculada!' });
      load();
    } catch(e) { setAlert({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
    setTimeout(() => setAlert(null), 3000);
  };

  const desvincularDisc = async (discId) => {
    if (!window.confirm('Remover esta disciplina da turma?')) return;
    try {
      await api.delete(`/turmas/${turma.id}/disciplinas/${discId}`);
      setAlert({ type:'success', msg:'✅ Disciplina removida.' });
      load();
    } catch(e) { setAlert({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
    setTimeout(() => setAlert(null), 3000);
  };

  const buscarAluno = async () => {
    if (!busca.trim()) return;
    const r = await api.get(`/turmas/buscar/aluno?q=${encodeURIComponent(busca)}`).catch(() => ({ data:{ alunos:[] } }));
    setResultado(r.data.alunos || []);
  };

  const matricular = async (alunoId) => {
    try {
      await api.post(`/turmas/${turma.id}/alunos`, { aluno_id: alunoId });
      setAlert({ type:'success', msg:'✅ Aluno matriculado!' });
      setResultado([]); setBusca('');
      load();
    } catch(e) { setAlert({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
    setTimeout(() => setAlert(null), 3000);
  };

  const removerAluno = async (alunoId, nome) => {
    if (!window.confirm(`Remover ${nome} da turma?`)) return;
    try {
      await api.delete(`/turmas/${turma.id}/alunos/${alunoId}`);
      setAlert({ type:'success', msg:'✅ Aluno removido.' });
      load();
    } catch(e) { setAlert({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
    setTimeout(() => setAlert(null), 3000);
  };

  const discsNaoVinculadas = todasDiscs.filter(d => !disciplinas.find(v => v.id === d.id));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
        <button onClick={onVoltar} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>🏫 {turma.nome}</h2>
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>Código: <b>{turma.codigo}</b> · {alunos.length} aluno(s) · {disciplinas.length} disciplina(s)</span>
        </div>
      </div>

      <Alert data={alert} onClose={() => setAlert(null)} />

      <div style={{ display:'flex', gap:4, marginBottom:'1rem', borderBottom:'2px solid var(--slate-200)' }}>
        <TabBtn label="📚 Disciplinas" active={tab==='disciplinas'} onClick={() => setTab('disciplinas')} />
        <TabBtn label="👥 Alunos" active={tab==='alunos'} onClick={() => setTab('alunos')} />
      </div>

      {loading ? <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'auto' }} /></div> : (

        tab === 'disciplinas' ? (
          <div className="card">
            {/* Vincular nova disciplina */}
            {discsNaoVinculadas.length > 0 && (
              <div style={{ marginBottom:'1.5rem', padding:'1rem', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>+ Vincular disciplina</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {discsNaoVinculadas.map(d => (
                    <button key={d.id} onClick={() => vincularDisc(d.id)} style={{
                      padding:'5px 12px', border:'1px solid var(--slate-300)', borderRadius:99, background:'white',
                      cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--navy)' }}>
                      + {d.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {disciplinas.length === 0 ? (
              <EmptyState icon="📚" title="Nenhuma disciplina vinculada" sub="Use o painel acima para adicionar disciplinas" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Disciplina</th><th>Código</th><th>Carga</th><th>Ação</th></tr></thead>
                  <tbody>
                    {disciplinas.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight:600 }}>{d.nome}</td>
                        <td><span style={{ fontFamily:'monospace', fontSize:12, background:'var(--slate-100)', padding:'2px 7px', borderRadius:4 }}>{d.codigo||'—'}</span></td>
                        <td>{d.carga_horaria}h</td>
                        <td><button onClick={() => desvincularDisc(d.id)} style={{ padding:'4px 10px', border:'1px solid #fecaca', borderRadius:6, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:600 }}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            {/* Matricular aluno */}
            <div style={{ marginBottom:'1.5rem', padding:'1rem', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>+ Matricular aluno</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key==='Enter'&&buscarAluno()}
                  placeholder="Buscar aluno por nome ou e-mail..."
                  style={{ flex:1, padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }} />
                <button onClick={buscarAluno} className="btn-primary" style={{ whiteSpace:'nowrap' }}>Buscar</button>
              </div>
              {resultado.length > 0 && (
                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                  {resultado.map(a => (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'white', border:'1px solid var(--slate-200)', borderRadius:8 }}>
                      <Avatar name={a.nome} size={28} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{a.nome}</div>
                        <div style={{ fontSize:11, color:'var(--slate-500)' }}>{a.email}</div>
                      </div>
                      <button onClick={() => matricular(a.id)} style={{ padding:'5px 12px', background:'var(--emerald)', color:'white', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>Matricular</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {alunos.length === 0 ? (
              <EmptyState icon="👥" title="Nenhum aluno matriculado" sub="Use o campo acima para buscar e matricular alunos" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Aluno</th><th>E-mail</th><th>Matriculado em</th><th>Ação</th></tr></thead>
                  <tbody>
                    {alunos.map((a, i) => (
                      <tr key={a.id}>
                        <td style={{ color:'var(--slate-400)', fontSize:12 }}>{i+1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Avatar name={a.nome} size={28} />
                            <span style={{ fontWeight:600, fontSize:13 }}>{a.nome}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:'var(--slate-500)' }}>{a.email}</td>
                        <td style={{ fontSize:12, color:'var(--slate-500)' }}>{a.joined_at ? a.joined_at.split('T')[0] : '—'}</td>
                        <td><button onClick={() => removerAluno(a.id, a.nome)} style={{ padding:'4px 10px', border:'1px solid #fecaca', borderRadius:6, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:600 }}>Remover</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Lista principal de turmas ─────────────────────────────────
export default function AdminTurmas() {
  const [turmas, setTurmas]     = useState([]);
  const [professores, setProfs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [detalhe, setDetalhe]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [form, setForm] = useState({ nome:'', descricao:'', professor_id:'' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/turmas'),
      api.get('/users?perfil=professor'),
    ]).then(([tRes, uRes]) => {
      setTurmas(tRes.data.turmas || []);
      setProfs((uRes.data.users || []).filter(u => u.perfil === 'professor' || u.perfil === 'admin'));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (detalhe) return <TurmaDetalhe turma={detalhe} onVoltar={() => { setDetalhe(null); load(); }} onUpdate={load} />;

  const openCreate = () => {
    setEditItem(null);
    setForm({ nome:'', descricao:'', professor_id: professores[0]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditItem(t);
    setForm({ nome:t.nome, descricao:t.descricao||'', professor_id:t.professor_id||'' });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return setAlert({ type:'error', msg:'Nome é obrigatório.' });
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/turmas/${editItem.id}`, form);
        setAlert({ type:'success', msg:'✅ Turma atualizada!' });
      } else {
        await api.post('/turmas', form);
        setAlert({ type:'success', msg:'✅ Turma criada!' });
      }
      setShowModal(false);
      load();
    } catch(e) {
      setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao salvar.' });
    } finally { setSaving(false); }
    setTimeout(() => setAlert(null), 4000);
  };

  const remover = async (t) => {
    if (!window.confirm(`Remover a turma "${t.nome}"? Todos os vínculos serão perdidos.`)) return;
    try {
      await api.delete(`/turmas/${t.id}`);
      setAlert({ type:'success', msg:'✅ Turma removida.' });
      load();
    } catch(e) {
      setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao remover.' });
    }
    setTimeout(() => setAlert(null), 4000);
  };

  const filtered = turmas.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    (t.codigo||'').toLowerCase().includes(search.toLowerCase())
  );

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">🏫 Turmas</div>
          <div className="page-sub">Gerenciar todas as turmas, disciplinas e alunos</div>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Nova Turma</button>
      </div>

      <Alert data={alert} onClose={() => setAlert(null)} />

      <div className="card">
        <div className="section-header">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nome ou código..."
            style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, width:260, outline:'none' }} />
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{filtered.length} turma(s)</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🏫" title="Nenhuma turma" sub="Clique em + Nova Turma para começar" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Turma</th><th>Código</th><th>Alunos</th><th>Disciplinas</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--navy)', cursor:'pointer' }} onClick={() => setDetalhe(t)}>{t.nome}</div>
                      {t.descricao && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{t.descricao.slice(0,50)}</div>}
                    </td>
                    <td><span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, letterSpacing:1, background:'var(--slate-100)', padding:'3px 8px', borderRadius:6 }}>{t.codigo}</span></td>
                    <td>
                      <span style={{ padding:'3px 8px', borderRadius:50, background:'rgba(59,130,246,0.1)', color:'#1d4ed8', fontSize:12, fontWeight:600 }}>
                        👥 {t.total_alunos || 0}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding:'3px 8px', borderRadius:50, background:'rgba(16,185,129,0.1)', color:'var(--emerald-dark)', fontSize:12, fontWeight:600 }}>
                        📚 {t.total_disciplinas || 0}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => setDetalhe(t)} style={{ padding:'4px 10px', border:'1px solid var(--slate-200)', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}>👁️ Detalhes</button>
                        <button onClick={() => openEdit(t)} style={{ padding:'4px 10px', border:'1px solid var(--slate-200)', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}>✏️</button>
                        <button onClick={() => remover(t)} style={{ padding:'4px 10px', border:'1px solid #fecaca', borderRadius:6, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:600 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editItem ? '✏️ Editar Turma' : '🏫 Nova Turma'} onClose={() => setShowModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Nome da turma *</label>
              <input value={form.nome} onChange={set('nome')} placeholder="Ex: Turma A — 2025.1" className="input-field" style={{ width:'100%' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Professor responsável</label>
              <select value={form.professor_id} onChange={set('professor_id')} className="input-field" style={{ width:'100%' }}>
                <option value="">Selecionar professor</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Descrição</label>
              <textarea value={form.descricao} onChange={set('descricao')} placeholder="Descrição opcional..." rows={3}
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, resize:'vertical', outline:'none', fontFamily:'var(--font-body)' }} />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding:'9px 20px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editItem ? 'Salvar alterações' : 'Criar Turma'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

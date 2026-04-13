/**
 * AdminDisciplinas — CRUD completo de disciplinas (admin)
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

export default function AdminDisciplinas() {
  const [disciplinas, setDiscs] = useState([]);
  const [professores, setProfs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [form, setForm] = useState({ nome:'', descricao:'', codigo:'', carga_horaria:60, professor_id:'', data_inicio:'', data_fim:'', turno:'', banner:'', professor_bio:'', professor_foto:'' });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/disciplinas'),
      api.get('/users?perfil=professor'),
    ]).then(([dRes, uRes]) => {
      setDiscs(dRes.data.disciplinas || []);
      setProfs((uRes.data.users || []).filter(u => u.perfil === 'professor' || u.perfil === 'admin'));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ nome:'', descricao:'', codigo:'', carga_horaria:60, professor_id: professores[0]?.id || '', data_inicio:'', data_fim:'', turno:'', banner:'', professor_bio:'', professor_foto:'' });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditItem(d);
    setForm({ nome:d.nome, descricao:d.descricao||'', codigo:d.codigo||'', carga_horaria:d.carga_horaria||60, professor_id:d.professor_id||'', data_inicio:d.data_inicio||'', data_fim:d.data_fim||'', turno:d.turno||'', banner:d.banner||'', professor_bio:d.professor_bio||'', professor_foto:d.professor_foto||'' });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return setAlert({ type:'error', msg:'Nome é obrigatório.' });
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/disciplinas/${editItem.id}`, form);
        setAlert({ type:'success', msg:'✅ Disciplina atualizada!' });
      } else {
        await api.post('/disciplinas', form);
        setAlert({ type:'success', msg:'✅ Disciplina criada!' });
      }
      setShowModal(false);
      load();
    } catch(e) {
      setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao salvar.' });
    } finally { setSaving(false); }
    setTimeout(() => setAlert(null), 4000);
  };

  const remover = async (d) => {
    if (!window.confirm(`Remover a disciplina "${d.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/disciplinas/${d.id}`);
      setAlert({ type:'success', msg:'✅ Disciplina removida.' });
      load();
    } catch(e) {
      setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao remover.' });
    }
    setTimeout(() => setAlert(null), 4000);
  };

  const filtered = disciplinas.filter(d =>
    d.nome.toLowerCase().includes(search.toLowerCase()) ||
    (d.codigo||'').toLowerCase().includes(search.toLowerCase()) ||
    (d.professor_nome||'').toLowerCase().includes(search.toLowerCase())
  );

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📚 Disciplinas</div>
          <div className="page-sub">Gerenciar todas as disciplinas da plataforma</div>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }}>
          + Nova Disciplina
        </button>
      </div>

      <Alert data={alert} onClose={() => setAlert(null)} />

      <div className="card">
        <div className="section-header">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nome, código ou professor..."
            style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, width:280, outline:'none' }} />
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{filtered.length} disciplina(s)</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📚" title="Nenhuma disciplina" sub="Clique em + Nova Disciplina para começar" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Disciplina</th><th>Código</th><th>Professor</th><th>Carga</th><th>Trilhas</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight:600, color:'var(--navy)' }}>{d.nome}</div>
                      {d.descricao && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{d.descricao.slice(0,60)}{d.descricao.length>60?'...':''}</div>}
                    </td>
                    <td><span style={{ padding:'2px 8px', borderRadius:4, background:'var(--slate-100)', fontSize:12, fontFamily:'monospace', fontWeight:600 }}>{d.codigo||'—'}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Avatar name={d.professor_nome||'?'} size={24} />
                        <span style={{ fontSize:13 }}>{d.professor_nome||'Sem professor'}</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--slate-500)' }}>{d.carga_horaria}h</td>
                    <td>
                      <span style={{ padding:'3px 8px', borderRadius:50, background:'rgba(16,185,129,0.1)', color:'var(--emerald-dark)', fontSize:12, fontWeight:600 }}>
                        {d.total_trilhas || 0} trilha(s)
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => openEdit(d)} style={{ padding:'4px 10px', border:'1px solid var(--slate-200)', borderRadius:6, background:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}>✏️ Editar</button>
                        <button onClick={() => remover(d)} style={{ padding:'4px 10px', border:'1px solid #fecaca', borderRadius:6, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:600 }}>🗑️</button>
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
        <Modal title={editItem ? '✏️ Editar Disciplina' : '📚 Nova Disciplina'} onClose={() => setShowModal(false)}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Nome *</label>
              <input value={form.nome} onChange={set('nome')} placeholder="Ex: Desenvolvimento Web" className="input-field" style={{ width:'100%' }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Código</label>
              <input value={form.codigo} onChange={set('codigo')} placeholder="Ex: DEV-WEB-01" className="input-field" style={{ width:'100%' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Carga horária (h)</label>
                <input type="number" value={form.carga_horaria} onChange={set('carga_horaria')} className="input-field" style={{ width:'100%' }} />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Professor responsável</label>
                <select value={form.professor_id} onChange={set('professor_id')} className="input-field" style={{ width:'100%' }}>
                  <option value="">Selecionar professor</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>Descrição</label>
              <textarea value={form.descricao} onChange={set('descricao')} placeholder="Descrição da disciplina..." rows={3}
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, resize:'vertical', outline:'none', fontFamily:'var(--font-body)' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>📅 Data de Início</label>
                <input type="date" value={form.data_inicio} onChange={e => setForm(f=>({...f,data_inicio:e.target.value}))} className="input-field" style={{ width:'100%' }} /></div>
              <div><label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>🏁 Data de Término</label>
                <input type="date" value={form.data_fim} onChange={e => setForm(f=>({...f,data_fim:e.target.value}))} className="input-field" style={{ width:'100%' }} /></div>
            </div>
            <div><label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>🕐 Turno</label>
              <select value={form.turno} onChange={e => setForm(f=>({...f,turno:e.target.value}))} className="input-field" style={{ width:'100%' }}>
                <option value="">Selecionar...</option>
                {['Manhã','Tarde','Noite','Integral','EaD','Misto'].map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label style={{ fontSize:13, fontWeight:600, marginBottom:4, display:'block' }}>👨‍🏫 Bio do Professor</label>
              <textarea rows={2} value={form.professor_bio} onChange={e => setForm(f=>({...f,professor_bio:e.target.value}))} placeholder="Mini currículo do professor..."
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit' }} /></div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding:'9px 20px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editItem ? 'Salvar alterações' : 'Criar Disciplina'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

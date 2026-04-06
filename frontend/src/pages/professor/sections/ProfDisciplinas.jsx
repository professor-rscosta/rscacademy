import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

export default function ProfDisciplinas({ autoCreate } = {}) {
  const { user } = useAuth();
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm]               = useState({ nome:'', descricao:'', codigo:'', carga_horaria:60 });
  const [saving, setSaving]           = useState(false);
  const [alert, setAlert]             = useState(null);

  useEffect(() => {
    api.get(`/disciplinas?professor_id=${user.id}`)
      .then(r => setDisciplinas(r.data.disciplinas||[]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (autoCreate) openCreate(); }, [autoCreate]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditItem(null); setForm({ nome:'', descricao:'', codigo:'', carga_horaria:60 }); setShowModal(true); };
  const openEdit   = (d) => { setEditItem(d); setForm({ nome:d.nome, descricao:d.descricao||'', codigo:d.codigo||'', carga_horaria:d.carga_horaria||60 }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        const r = await api.put(`/disciplinas/${editItem.id}`, form);
        setDisciplinas(prev => prev.map(d => d.id===editItem.id?r.data.disciplina:d));
      } else {
        const r = await api.post('/disciplinas', form);
        setDisciplinas(prev => [r.data.disciplina, ...prev]);
      }
      setShowModal(false);
    } catch (err) { setAlert({ type:'error', msg: err.response?.data?.error||'Erro ao salvar.' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir disciplina?')) return;
    await api.delete(`/disciplinas/${id}`);
    setDisciplinas(prev => prev.filter(d => d.id !== id));
  };

  return (
    <>
      <div className="page-header"><div className="page-title">Minhas Disciplinas</div><div className="page-sub">Crie e gerencie suas disciplinas</div></div>
      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}
      <div className="card">
        <div className="section-header">
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{disciplinas.length} disciplina(s)</span>
          <button className="btn-create" onClick={openCreate}>+ Nova Disciplina</button>
        </div>
        {loading ? <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        : disciplinas.length===0 ? <EmptyState icon="📚" title="Nenhuma disciplina" sub="Crie sua primeira disciplina acima" />
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
            {disciplinas.map(d => (
              <div key={d.id} style={{ border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'1rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600 }}>{d.nome}</div>
                  {d.codigo && <div style={{ fontSize:11, opacity:.6, marginTop:2 }}>{d.codigo}</div>}
                </div>
                <div style={{ padding:'0.875rem' }}>
                  {d.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8, lineHeight:1.5 }}>{d.descricao}</div>}
                  <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:10 }}>⏱ {d.carga_horaria}h</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn-sm btn-edit" onClick={()=>openEdit(d)} style={{ flex:1 }}>Editar</button>
                    <button className="btn-sm btn-danger" onClick={()=>handleDelete(d.id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editItem?'Editar Disciplina':'Nova Disciplina'} onClose={()=>setShowModal(false)}>
          <div className="field"><label>Nome</label><input value={form.nome} onChange={set('nome')} placeholder="ex: Programação I" /></div>
          <div className="field"><label>Descrição</label><textarea rows={3} value={form.descricao} onChange={set('descricao')} placeholder="Ementa da disciplina..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, resize:'vertical', outline:'none' }} /></div>
          <div className="form-row">
            <div className="field"><label>Código</label><input value={form.codigo} onChange={set('codigo')} placeholder="PROG1" /></div>
            <div className="field"><label>Carga horária (h)</label><input type="number" value={form.carga_horaria} onChange={set('carga_horaria')} min={1} /></div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar'}</button>
        </Modal>
      )}
    </>
  );
}

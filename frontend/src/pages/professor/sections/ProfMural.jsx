import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

export default function ProfMural({ autoCreate } = {}) {
  const { user } = useAuth();
  const [avisos, setAvisos]     = useState([]);
  const [turmas, setTurmas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { if (autoCreate) setShowModal(true); }, [autoCreate]);
  const [form, setForm]           = useState({ titulo:'', corpo:'', turma_id:'' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/avisos?professor_id=${user.id}`),
      api.get(`/turmas?professor_id=${user.id}`),
    ]).then(([aRes, tRes]) => {
      setAvisos(aRes.data.avisos || []);
      setTurmas(tRes.data.turmas || []);
    }).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePost = async () => {
    if (!form.titulo || !form.corpo) return;
    setSaving(true);
    try {
      const r = await api.post('/avisos', form);
      setAvisos(p => [r.data.aviso, ...p]);
      setShowModal(false); setForm({ titulo:'', corpo:'', turma_id:'' });
    } catch(e){ console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir aviso?')) return;
    await api.delete(`/avisos/${id}`);
    setAvisos(p => p.filter(a => a.id !== id));
  };

  const turmaNome = tid => turmas.find(t => t.id === Number(tid))?.nome || 'Todas as turmas';

  return (
    <>
      <div className="page-header"><div className="page-title">Mural de Avisos</div><div className="page-sub">Comunicados para suas turmas</div></div>
      <div style={{ marginBottom:'1rem', display:'flex', justifyContent:'flex-end' }}>
        <button className="btn-create" onClick={() => setShowModal(true)}>+ Novo Aviso</button>
      </div>
      {loading ? <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      : avisos.length === 0 ? <div className="card"><EmptyState icon="📌" title="Nenhum aviso publicado" sub="Clique em '+ Novo Aviso' para comunicar suas turmas" /></div>
      : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {avisos.map(a => (
            <div key={a.id} className="card notice-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div className="notice-date">📅 {new Date(a.created_at).toLocaleDateString('pt-BR')} · {a.turma_id ? turmaNome(a.turma_id) : 'Todas as turmas'}</div>
                  <div className="notice-title">{a.titulo}</div>
                  <div className="notice-body">{a.corpo}</div>
                </div>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(a.id)} style={{ marginLeft:8, flexShrink:0 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <Modal title="Novo Aviso" onClose={() => setShowModal(false)}>
          <div className="field"><label>Título</label><input placeholder="ex: Avaliação na próxima semana" value={form.titulo} onChange={set('titulo')} /></div>
          <div className="field"><label>Mensagem</label><textarea rows={5} placeholder="Escreva o aviso aqui..." value={form.corpo} onChange={set('corpo')} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, resize:'vertical', outline:'none' }} /></div>
          <div className="field">
            <label>Turma (opcional)</label>
            <select value={form.turma_id} onChange={set('turma_id')}>
              <option value="">Todas as turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handlePost} disabled={saving}>{saving ? 'Publicando...' : 'Publicar Aviso'}</button>
        </Modal>
      )}
    </>
  );
}

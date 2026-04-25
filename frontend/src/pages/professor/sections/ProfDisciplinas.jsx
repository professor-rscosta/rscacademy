/**
 * ProfDisciplinas — CRUD com campos completos do Módulo Interativo
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

const TURNOS = ['Manhã','Tarde','Noite','Integral','EaD','Misto'];

function Alert({ data, onClose }) {
  if (!data) return null;
  const cor = data.type === 'success' ? '#10b981' : '#ef4444';
  return (
    <div style={{ padding:'10px 14px', borderRadius:8, background:cor+'15', border:'1px solid '+cor+'40',
      color:cor, fontSize:13, fontWeight:600, marginBottom:'1rem', display:'flex', justifyContent:'space-between' }}>
      {data.msg}
      <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:cor }}>×</button>
    </div>
  );
}

function ImageUpload({ value, onChange, label, size=120 }) {
  const ref = useRef();
  return (
    <div>
      <label style={{ fontSize:13, fontWeight:600, marginBottom:6, display:'block' }}>{label}</label>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div onClick={() => ref.current.click()} style={{
          width:size, height: label.includes('Banner') ? size/2 : size,
          borderRadius: label.includes('Banner') ? 8 : '50%',
          background: value ? 'transparent' : 'var(--slate-100)',
          border:'2px dashed var(--slate-300)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', overflow:'hidden', flexShrink:0,
        }}>
          {value
            ? <img src={value} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:24, opacity:.4 }}>{label.includes('Banner') ? '🖼️' : '📷'}</span>
          }
        </div>
        <div>
          <button type="button" onClick={() => ref.current.click()} style={{
            padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:7,
            background:'white', fontSize:12, cursor:'pointer', display:'block', marginBottom:6 }}>
            {value ? 'Trocar imagem' : 'Selecionar imagem'}
          </button>
          {value && <button type="button" onClick={() => onChange('')} style={{
            padding:'4px 10px', border:'1px solid #fecaca', borderRadius:7,
            background:'#fef2f2', color:'#dc2626', fontSize:11, cursor:'pointer' }}>Remover</button>}
          <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>JPG, PNG — máx 2MB</div>
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={e => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 500*1024) { alert('Imagem muito grande. Máximo 500KB.'); return; }
          const reader = new FileReader();
          reader.onload = ev => onChange(ev.target.result);
          reader.readAsDataURL(file);
        }} />
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  nome:'', descricao:'', codigo:'', carga_horaria:60,
  data_inicio:'', data_fim:'', turno:'',
  banner:'', professor_bio:'', professor_foto:'',
};

export default function ProfDisciplinas({ autoCreate } = {}) {
  const { user } = useAuth();
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [alert, setAlert]             = useState(null);
  const [tab, setTab]                 = useState('basico');

  useEffect(() => {
    api.get(`/disciplinas?professor_id=${user.id}`)
      .then(r => setDisciplinas(r.data.disciplinas||[]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (autoCreate) openCreate(); }, [autoCreate]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditItem(null); setForm(EMPTY_FORM); setTab('basico'); setShowModal(true);
  };
  const openEdit = (d) => {
    setEditItem(d);
    setForm({
      nome: d.nome||'', descricao: d.descricao||'', codigo: d.codigo||'',
      carga_horaria: d.carga_horaria||60, data_inicio: d.data_inicio||'',
      data_fim: d.data_fim||'', turno: d.turno||'',
      banner: d.banner||'', professor_bio: d.professor_bio||'', professor_foto: d.professor_foto||'',
    });
    setTab('basico'); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return setAlert({ type:'error', msg:'Nome é obrigatório.' });
    setSaving(true);
    try {
      if (editItem) {
        const r = await api.put(`/disciplinas/${editItem.id}`, form);
        setDisciplinas(prev => prev.map(d => d.id===editItem.id ? { ...d, ...r.data.disciplina } : d));
      } else {
        const r = await api.post('/disciplinas', form);
        setDisciplinas(prev => [r.data.disciplina, ...prev]);
      }
      setShowModal(false);
      setAlert({ type:'success', msg: editItem ? '✅ Disciplina atualizada!' : '✅ Disciplina criada!' });
    } catch(err) {
      setAlert({ type:'error', msg: err.response?.data?.error||'Erro ao salvar.' });
    } finally { setSaving(false); setTimeout(() => setAlert(null), 4000); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir disciplina? Esta ação não pode ser desfeita.')) return;
    await api.delete(`/disciplinas/${id}`);
    setDisciplinas(prev => prev.filter(d => d.id !== id));
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding:'7px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13,
      fontWeight: tab===id?700:400, color: tab===id?'var(--emerald)':'var(--slate-500)',
      borderBottom: tab===id?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2,
    }}>{label}</button>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">📚 Minhas Disciplinas</div>
          <div className="page-sub">Crie e configure o módulo interativo de cada disciplina</div>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Nova Disciplina</button>
      </div>

      <Alert data={alert} onClose={() => setAlert(null)} />

      <div className="card">
        <div className="section-header">
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{disciplinas.length} disciplina(s)</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : disciplinas.length === 0 ? (
          <EmptyState icon="📚" title="Nenhuma disciplina" sub="Crie sua primeira disciplina acima" />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {disciplinas.map(d => (
              <div key={d.id} style={{ border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                {/* Banner */}
                <div style={{
                  height:80, background: d.banner && d.banner.length > 10
                    ? `url(${d.banner}) center/cover`
                    : 'linear-gradient(135deg,var(--navy),var(--navy-mid))',
                  position:'relative',
                }}>
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.25)', display:'flex', alignItems:'flex-end', padding:'8px 12px' }}>
                    <div style={{ color:'white', fontFamily:'var(--font-head)', fontSize:14, fontWeight:700 }}>{d.nome}</div>
                  </div>
                </div>

                <div style={{ padding:'0.875rem' }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                    {d.codigo && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--slate-100)', fontFamily:'monospace', fontWeight:600 }}>{d.codigo}</span>}
                    {d.turno && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#eff6ff', color:'#3b82f6' }}>{d.turno}</span>}
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#ecfdf5', color:'#059669' }}>⏱ {d.carga_horaria}h</span>
                  </div>
                  {d.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{d.descricao}</div>}
                  {(d.data_inicio || d.data_fim) && (
                    <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:8 }}>
                      📅 {d.data_inicio||'?'} → {d.data_fim||'?'}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(d)} style={{ flex:1, padding:'6px 10px', border:'1px solid var(--slate-200)', borderRadius:7, background:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}>✏️ Editar</button>
                    <button onClick={() => handleDelete(d.id)} style={{ padding:'6px 10px', border:'1px solid #fecaca', borderRadius:7, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12 }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editItem ? '✏️ Editar Disciplina' : '📚 Nova Disciplina'} onClose={() => setShowModal(false)}>
          {/* Abas do modal */}
          <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--slate-200)', marginBottom:'1.25rem', marginTop:'-0.5rem' }}>
            <TabBtn id="basico" label="📋 Básico" />
            <TabBtn id="datas" label="📅 Datas & Turno" />
            <TabBtn id="professor" label="👨‍🏫 Professor" />
          </div>

          {tab === 'basico' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <ImageUpload label="Banner da Disciplina" value={form.banner} onChange={v => setVal('banner', v)} size={200} />
              <div className="field"><label>Nome da Disciplina *</label>
                <input value={form.nome} onChange={set('nome')} placeholder="Ex: Desenvolvimento Web" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field"><label>Código</label><input value={form.codigo} onChange={set('codigo')} placeholder="DEV-WEB-01" /></div>
                <div className="field"><label>Carga Horária (h)</label><input type="number" min={1} value={form.carga_horaria} onChange={set('carga_horaria')} /></div>
              </div>
              <div className="field"><label>Descrição / Ementa</label>
                <textarea rows={4} value={form.descricao} onChange={set('descricao')} placeholder="Ementa da disciplina..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, resize:'vertical', outline:'none' }} /></div>
            </div>
          )}

          {tab === 'datas' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field"><label>📅 Data de Início</label><input type="date" value={form.data_inicio} onChange={set('data_inicio')} /></div>
                <div className="field"><label>🏁 Data de Término</label><input type="date" value={form.data_fim} onChange={set('data_fim')} /></div>
              </div>
              <div className="field">
                <label>🕐 Turno</label>
                <select value={form.turno} onChange={set('turno')} style={{ width:'100%', padding:'10px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }}>
                  <option value="">Selecionar turno...</option>
                  {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#1d4ed8' }}>
                💡 Estas informações são exibidas no módulo da disciplina para os alunos.
              </div>
            </div>
          )}

          {tab === 'professor' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <ImageUpload label="Foto do Professor" value={form.professor_foto} onChange={v => setVal('professor_foto', v)} size={100} />
              <div className="field">
                <label>Mini Currículo / Apresentação</label>
                <textarea rows={5} value={form.professor_bio} onChange={set('professor_bio')}
                  placeholder="Breve descrição sobre o professor, experiências, formação..."
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, resize:'vertical', outline:'none' }} />
              </div>
              <div style={{ background:'#f0fdf4', border:'1px solid #a7f3d0', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#065f46' }}>
                💡 A foto e bio aparecem no módulo da disciplina como cartão de apresentação do professor.
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid var(--slate-100)' }}>
            <button onClick={() => setShowModal(false)} style={{ padding:'9px 20px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editItem ? 'Salvar Alterações' : 'Criar Disciplina'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

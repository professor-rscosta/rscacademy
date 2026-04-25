import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

const TIPO_ICONS = {
  multipla_escolha:'🔘', verdadeiro_falso:'✅', dissertativa:'📝',
  preenchimento:'✏️', associacao:'🔗', ordenacao:'🔢', upload_arquivo:'📎',
};

export default function ProfTrilhas({ autoCreate } = {}) {
  const { user } = useAuth();
  const [disciplinas, setDisciplinas] = useState([]);
  const [trilhas, setTrilhas]         = useState([]);
  const [questoesMap, setQMap]        = useState({});
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [form, setForm]               = useState({
    nome:'', descricao:'', disciplina_id:'', ordem:1, xp_total:500,
    tempo_limite:'', tentativas_maximas:'',
  });
  const [saving, setSaving]   = useState(false);
  const [alert, setAlert]     = useState(null);

  const load = async () => {
    try {
      const [dRes, tRes] = await Promise.all([
        api.get('/disciplinas?professor_id='+user.id),
        api.get('/trilhas?professor_id='+user.id),
      ]);
      const ts = tRes.data.trilhas || [];
      setDisciplinas(dRes.data.disciplinas || []);
      setTrilhas(ts);
      const qMap = {};
      await Promise.all(ts.map(async t => {
        const r = await api.get('/questoes?trilha_id='+t.id).catch(()=>({data:{questoes:[]}}));
        qMap[t.id] = r.data.questoes || [];
      }));
      setQMap(qMap);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { if (autoCreate) setShowModal(true); }, [autoCreate]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => {
    setEditItem(null);
    setForm({ nome:'', descricao:'', disciplina_id: disciplinas[0]?.id||'', ordem:1, xp_total:500, tempo_limite:'', tentativas_maximas:'' });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditItem(t);
    setForm({
      nome:t.nome, descricao:t.descricao||'', disciplina_id:t.disciplina_id,
      ordem:t.ordem||1, xp_total:t.xp_total||500,
      tempo_limite: t.tempo_limite || '',
      tentativas_maximas: t.tentativas_maximas || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.disciplina_id) {
      setAlert({ type:'error', msg:'Nome e disciplina são obrigatórios.' }); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        disciplina_id: Number(form.disciplina_id),
        ordem: Number(form.ordem) || 1,
        xp_total: Number(form.xp_total) || 500,
        tempo_limite: form.tempo_limite ? Number(form.tempo_limite) : null,
        tentativas_maximas: form.tentativas_maximas ? Number(form.tentativas_maximas) : null,
      };
      if (editItem) {
        const r = await api.put('/trilhas/'+editItem.id, payload);
        setTrilhas(prev => prev.map(t => t.id===editItem.id ? r.data.trilha : t));
      } else {
        const r = await api.post('/trilhas', payload);
        setTrilhas(prev => [...prev, r.data.trilha]);
        setQMap(q => ({ ...q, [r.data.trilha.id]:[] }));
      }
      setShowModal(false); setAlert(null);
    } catch(err){ setAlert({ type:'error', msg:err.response?.data?.error||'Erro ao salvar.' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir trilha e todas as suas questões?')) return;
    await api.delete('/trilhas/'+id);
    setTrilhas(prev => prev.filter(t => t.id !== id));
  };

  const discNome = (id) => disciplinas.find(d => d.id === Number(id))?.nome || 'Disciplina #'+id;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Trilhas de Aprendizagem</div>
        <div className="page-sub">Configure questões, tempo por questão e tentativas por trilha</div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button className="btn-create" onClick={openCreate}>+ Nova Trilha</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : trilhas.length === 0 ? (
        <div className="card"><EmptyState icon="🗺️" title="Nenhuma trilha criada" sub="Crie sua primeira trilha acima" /></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1rem' }}>
          {trilhas.map(t => {
            const questoes = questoesMap[t.id] || [];
            const xpTotal  = questoes.reduce((s,q) => s+(q.xp||0), 0);
            const tipos    = questoes.reduce((acc,q) => { acc[q.tipo]=(acc[q.tipo]||0)+1; return acc; }, {});
            const temTempo = t.tempo_limite && t.tempo_limite > 0;
            const temTentativas = t.tentativas_maximas && t.tentativas_maximas > 0;

            return (
              <div key={t.id} className="trail-card">
                <div className="trail-header">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <h3>{t.nome}</h3>
                      <p>{discNome(t.disciplina_id)}</p>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => openEdit(t)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:26, height:26, borderRadius:6, cursor:'pointer', fontSize:12 }}>✏️</button>
                      <button onClick={() => handleDelete(t.id)} style={{ background:'rgba(244,63,94,0.25)', border:'none', color:'white', width:26, height:26, borderRadius:6, cursor:'pointer', fontSize:12 }}>🗑</button>
                    </div>
                  </div>

                  {/* Configurações de tempo/tentativas */}
                  {(temTempo || temTentativas) && (
                    <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                      {temTempo && (
                        <span style={{ padding:'3px 9px', borderRadius:50, background:'rgba(255,255,255,0.15)', fontSize:11, color:'white', fontWeight:500 }}>
                          ⏱ {t.tempo_limite}min/questão
                        </span>
                      )}
                      {temTentativas && (
                        <span style={{ padding:'3px 9px', borderRadius:50, background:'rgba(255,255,255,0.15)', fontSize:11, color:'white', fontWeight:500 }}>
                          🔄 {t.tentativas_maximas}x tentativas
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="trail-progress">
                  <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--slate-500)', flexWrap:'wrap' }}>
                    <span>❓ {questoes.length} questões</span>
                    <span>⭐ {xpTotal} XP</span>
                    <span style={{ padding:'1px 8px', borderRadius:50, background:'var(--slate-100)', fontSize:11 }}>Ordem #{t.ordem}</span>
                    {!temTempo && <span style={{ fontSize:11, color:'var(--slate-300)' }}>Sem limite de tempo</span>}
                    {!temTentativas && <span style={{ fontSize:11, color:'var(--slate-300)' }}>Tentativas ilimitadas</span>}
                  </div>
                </div>

                {/* Tipos de questão */}
                {Object.keys(tipos).length > 0 && (
                  <div style={{ padding:'0 1.25rem 0.75rem', display:'flex', gap:4, flexWrap:'wrap' }}>
                    {Object.entries(tipos).map(([tipo,cnt]) => (
                      <span key={tipo} style={{ padding:'2px 8px', background:'var(--slate-50)', borderRadius:50, fontSize:11, color:'var(--slate-600)', border:'1px solid var(--slate-200)' }}>
                        {TIPO_ICONS[tipo]} {cnt}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status TRI */}
                {questoes.length > 0 && (
                  <div style={{ padding:'0 1.25rem 1.25rem' }}>
                    <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:4 }}>Status TRI:</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={{ padding:'2px 8px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:11, border:'1px solid #86efac' }}>
                        ✅ {questoes.filter(q => q.tri?.status==='calibrado').length} calibradas
                      </span>
                      <span style={{ padding:'2px 8px', borderRadius:50, background:'#fffbeb', color:'#92400e', fontSize:11, border:'1px solid #fcd34d' }}>
                        ⏳ {questoes.filter(q => q.tri?.status!=='calibrado').length} provisórias
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal title={editItem ? 'Editar Trilha' : 'Nova Trilha'} onClose={() => setShowModal(false)}>
          {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

          <div className="field"><label>Nome da Trilha</label><input value={form.nome} onChange={set('nome')} placeholder="ex: Algoritmos Básicos" /></div>
          <div className="field"><label>Descrição</label><input value={form.descricao} onChange={set('descricao')} placeholder="Descrição breve da trilha" /></div>
          <div className="field">
            <label>Disciplina</label>
            <select value={form.disciplina_id} onChange={set('disciplina_id')}>
              <option value="">Selecione...</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="field"><label>Ordem</label><input type="number" value={form.ordem} onChange={set('ordem')} min={1} /></div>
            <div className="field"><label>XP Total</label><input type="number" value={form.xp_total} onChange={set('xp_total')} min={100} /></div>
          </div>

          {/* Configurações de desafio */}
          <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:8, padding:'12px 14px', marginBottom:'1rem' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--slate-600)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              ⚙️ Configurações do Desafio
              <span style={{ fontSize:11, fontWeight:400, color:'var(--slate-400)' }}>(deixe vazio para sem limite)</span>
            </div>
            <div className="form-row">
              <div className="field">
                <label>⏱ Tempo por questão (minutos)</label>
                <input type="number" value={form.tempo_limite} onChange={set('tempo_limite')} min={1} max={120} placeholder="ex: 2 (sem limite = vazio)" />
                <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:3 }}>Cada questão terá esse tempo máximo</div>
              </div>
              <div className="field">
                <label>🔄 Tentativas máximas</label>
                <input type="number" value={form.tentativas_maximas} onChange={set('tentativas_maximas')} min={1} max={10} placeholder="ex: 3 (ilimitado = vazio)" />
                <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:3 }}>Número de vezes que o aluno pode fazer</div>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Trilha'}
          </button>
        </Modal>
      )}
    </>
  );
}

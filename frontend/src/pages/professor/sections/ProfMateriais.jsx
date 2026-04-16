/**
 * ProfMateriais — com upload de arquivo do computador (base64)
 * Tipos: Link | YouTube | PDF/Arquivo (upload) | Texto | Imagem
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

const TIPOS = [
  { id:'link',    icon:'🔗', label:'Link',         desc:'URL externa' },
  { id:'youtube', icon:'▶️', label:'YouTube',      desc:'Vídeo embed' },
  { id:'pdf',     icon:'📄', label:'PDF/Arquivo',  desc:'Upload do PC' },
  { id:'imagem',  icon:'🖼️', label:'Imagem',       desc:'Upload do PC ou URL' },
  { id:'texto',   icon:'📝', label:'Texto',        desc:'Bloco de texto' },
];

const fmtSize = (b) => !b ? '' : b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';

// ── Renderizador para visualizar o material no card ───────────
function MaterialPreview({ m }) {
  if (m.tipo === 'youtube' && m.url) {
    const ytId = extractYouTubeId(m.url);
    if (ytId) return (
      <div style={{ borderRadius:8, overflow:'hidden', aspectRatio:'16/9', marginBottom:8 }}>
        <iframe src={'https://www.youtube.com/embed/' + ytId + '?rel=0&origin=' + window.location.origin} title={m.titulo} frameBorder="0" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          style={{ width:'100%', height:'100%' }} />
      </div>
    );
  }
  if (m.tipo === 'imagem') {
    const src = m.base64 || m.url;
    if (src) return <img src={src} alt={m.titulo} style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:8, marginBottom:8, display:'block' }} />;
  }
  if (m.tipo === 'pdf' && m.base64) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#fef2f2', borderRadius:7, border:'1px solid #fca5a5', marginBottom:8 }}>
        <span style={{ fontSize:20 }}>📄</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#b91c1c', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.fileName||m.titulo}</div>
          {m.fileSize && <div style={{ fontSize:10, color:'#b91c1c', opacity:.7 }}>{fmtSize(m.fileSize)}</div>}
        </div>
        <a href={m.base64} download={m.fileName||m.titulo+'.pdf'}
          style={{ padding:'4px 10px', background:'#b91c1c', color:'white', borderRadius:5, fontSize:10, fontWeight:600, textDecoration:'none', flexShrink:0 }}>
          ⬇️
        </a>
      </div>
    );
  }
  return null;
}

// ── Modal criar/editar ────────────────────────────────────────
function ModalMaterial({ editItem, discs, onClose, onSalvar }) {
  const fileRef  = useRef(null);
  const imgRef   = useRef(null);
  const [form, setForm] = useState({
    titulo:       editItem?.titulo       || '',
    descricao:    editItem?.descricao    || '',
    tipo:         editItem?.tipo         || 'link',
    url:          editItem?.url          || '',
    conteudo:     editItem?.conteudo     || '',
    disciplina_id: editItem?.disciplina_id || discs[0]?.id || '',
    base64:       editItem?.base64       || null,
    fileName:     editItem?.fileName     || null,
    fileSize:     editItem?.fileSize     || null,
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert]   = useState('');
  const [dragging, setDragging] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const processFile = (file, tipo) => {
    if (!file) return;
    const maxMB = tipo === 'imagem' ? 8 : 20;
    if (file.size > maxMB * 1024 * 1024) { setAlert('Arquivo muito grande. Máx: '+maxMB+'MB.'); return; }
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, base64: e.target.result, fileName: file.name, fileSize: file.size, url: '' }));
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => processFile(e.target.files[0], form.tipo);

  const handleDrop = (e, tipo) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0], tipo);
  };

  const salvar = async () => {
    if (!form.titulo.trim()) return setAlert('Título obrigatório.');
    if (!form.disciplina_id)  return setAlert('Disciplina obrigatória.');
    if ((form.tipo === 'link' || form.tipo === 'youtube') && !form.url.trim())
      return setAlert('URL obrigatória para este tipo.');
    if ((form.tipo === 'pdf' || form.tipo === 'imagem') && !form.base64 && !form.url.trim())
      return setAlert('Faça upload de um arquivo ou informe uma URL.');
    if (form.tipo === 'texto' && !form.conteudo.trim())
      return setAlert('Conteúdo obrigatório para texto.');

    setSaving(true); setAlert('');
    try {
      const payload = {
        titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
        url: form.url, conteudo: form.conteudo,
        disciplina_id: Number(form.disciplina_id),
        base64: form.base64 || null,
        fileName: form.fileName || null,
        fileSize: form.fileSize || null,
      };
      let material;
      if (editItem) {
        const r = await api.put('/materiais/'+editItem.id, payload);
        material = r.data.material;
      } else {
        const r = await api.post('/materiais', payload);
        material = r.data.material;
      }
      onSalvar(material);
      onClose();
    } catch(e){ setAlert(e.response?.data?.error||'Erro ao salvar.'); }
    setSaving(false);
  };

  const tipoAtual = form.tipo;

  return (
    <Modal title={editItem ? 'Editar Material' : 'Novo Material'} onClose={onClose}>
      {alert && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{alert}</div>}

      <div className="field"><label>Título <span style={{color:'var(--coral)'}}>*</span></label>
        <input value={form.titulo} onChange={set('titulo')} placeholder="ex: Slides — Aula 5" />
      </div>
      <div className="field"><label>Descrição</label>
        <input value={form.descricao} onChange={set('descricao')} placeholder="Breve descrição" />
      </div>

      <div className="form-row">
        <div className="field">
          <label>Tipo</label>
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value, url:'', base64:null, fileName:null, fileSize:null, conteudo:'' }))}>
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Disciplina <span style={{color:'var(--coral)'}}>*</span></label>
          <select value={form.disciplina_id} onChange={set('disciplina_id')}>
            <option value="">Selecione...</option>
            {discs.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
      </div>

      {/* ── LINK ── */}
      {tipoAtual === 'link' && (
        <div className="field"><label>🔗 URL <span style={{color:'var(--coral)'}}>*</span></label>
          <input value={form.url} onChange={set('url')} placeholder="https://site.com/recurso" />
        </div>
      )}

      {/* ── YOUTUBE ── */}
      {tipoAtual === 'youtube' && (
        <div className="field"><label>▶️ URL do YouTube <span style={{color:'var(--coral)'}}>*</span></label>
          <input value={form.url} onChange={set('url')} placeholder="https://youtube.com/watch?v=..." />
          {form.url && (() => {
            const id = extractYouTubeId(form.url);
            return id ? (
              <div style={{ marginTop:8, borderRadius:8, overflow:'hidden', aspectRatio:'16/9' }}>
                <iframe src={'https://www.youtube.com/embed/' + id + '?rel=0&origin=' + window.location.origin} title="preview" frameBorder="0" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" style={{ width:'100%', height:'100%' }} />
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* ── PDF/ARQUIVO ── */}
      {tipoAtual === 'pdf' && (
        <div className="field">
          <label>📄 Arquivo <span style={{color:'var(--coral)'}}>*</span></label>
          {form.base64 ? (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(16,185,129,.05)', border:'2px solid var(--emerald)', borderRadius:8 }}>
              <span style={{ fontSize:24 }}>📄</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{form.fileName}</div>
                <div style={{ fontSize:11, color:'var(--slate-400)' }}>{fmtSize(form.fileSize)}</div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, base64:null, fileName:null, fileSize:null }))}
                style={{ padding:'4px 10px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', cursor:'pointer', fontSize:11 }}>
                ✕ Remover
              </button>
            </div>
          ) : (
            <>
              <div
                onDrop={e => handleDrop(e, 'pdf')}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileRef.current?.click()}
                style={{ border:'2px dashed '+(dragging?'var(--emerald)':'var(--slate-200)'), borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', background:dragging?'rgba(16,185,129,.04)':'var(--slate-50)', transition:'all .15s' }}>
                <div style={{ fontSize:32, marginBottom:6 }}>📄</div>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:2 }}>Clique ou arraste um arquivo</div>
                <div style={{ fontSize:11, color:'var(--slate-400)' }}>PDF, DOC, ZIP, PPT, XLS, MP4 · Máx 20MB</div>
              </div>
              <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFileInput}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.txt,.mp4,.mp3" />
              <div style={{ marginTop:6, fontSize:12, color:'var(--slate-500)' }}>
                ou informe uma URL:
              </div>
              <input value={form.url} onChange={set('url')} placeholder="https://drive.google.com/..." style={{ width:'100%', padding:'9px 14px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontFamily:'var(--font-body)', fontSize:13, marginTop:4 }} />
            </>
          )}
        </div>
      )}

      {/* ── IMAGEM ── */}
      {tipoAtual === 'imagem' && (
        <div className="field">
          <label>🖼️ Imagem <span style={{color:'var(--coral)'}}>*</span></label>
          {form.base64 ? (
            <div>
              <img src={form.base64} alt="preview" style={{ maxWidth:'100%', maxHeight:200, objectFit:'contain', borderRadius:8, display:'block', marginBottom:8, border:'1px solid var(--slate-200)' }} />
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'var(--slate-500)', flex:1 }}>{form.fileName} ({fmtSize(form.fileSize)})</span>
                <button onClick={() => setForm(f => ({ ...f, base64:null, fileName:null, fileSize:null }))}
                  style={{ padding:'4px 10px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', cursor:'pointer', fontSize:11 }}>
                  ✕ Trocar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                onDrop={e => handleDrop(e, 'imagem')}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => imgRef.current?.click()}
                style={{ border:'2px dashed '+(dragging?'var(--emerald)':'var(--slate-200)'), borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', background:dragging?'rgba(16,185,129,.04)':'var(--slate-50)', transition:'all .15s' }}>
                <div style={{ fontSize:32, marginBottom:6 }}>🖼️</div>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:2 }}>Clique ou arraste uma imagem</div>
                <div style={{ fontSize:11, color:'var(--slate-400)' }}>JPG, PNG, GIF, WebP · Máx 8MB</div>
              </div>
              <input ref={imgRef} type="file" style={{ display:'none' }} onChange={handleFileInput}
                accept="image/*" />
              <div style={{ marginTop:6, fontSize:12, color:'var(--slate-500)' }}>ou cole uma URL:</div>
              <input value={form.url} onChange={set('url')} placeholder="https://exemplo.com/imagem.jpg"
                style={{ width:'100%', padding:'9px 14px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontFamily:'var(--font-body)', fontSize:13, marginTop:4 }} />
              {form.url && <img src={form.url} alt="preview" onError={e=>e.target.style.display='none'} style={{ maxWidth:'100%', maxHeight:120, objectFit:'contain', borderRadius:6, marginTop:6, display:'block' }} />}
            </>
          )}
        </div>
      )}

      {/* ── TEXTO ── */}
      {tipoAtual === 'texto' && (
        <div className="field"><label>📝 Conteúdo <span style={{color:'var(--coral)'}}>*</span></label>
          <textarea rows={6} value={form.conteudo} onChange={set('conteudo')} placeholder="Digite o texto do material..."
            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, resize:'vertical', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--emerald)'}
            onBlur={e => e.target.style.borderColor='var(--slate-200)'} />
        </div>
      )}

      <button className="btn-primary" onClick={salvar} disabled={saving}>
        {saving ? 'Salvando...' : (editItem ? '💾 Atualizar Material' : '💾 Salvar Material')}
      </button>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function ProfMateriais({ autoCreate } = {}) {
  const { user } = useAuth();
  const [materiais, setMats] = useState([]);
  const [discs, setDiscs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroDisc, setFiltro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [alert, setAlert]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/materiais?professor_id='+user.id),
      api.get('/disciplinas?professor_id='+user.id),
    ]).then(([mRes, dRes]) => {
      setMats(mRes.data.materiais || []);
      setDiscs(dRes.data.disciplinas || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (autoCreate) { setEditItem(null); setShowModal(true); } }, [autoCreate]);

  const filtered = materiais.filter(m => !filtroDisc || String(m.disciplina_id) === filtroDisc);

  const tipoIcon  = t => TIPOS.find(x => x.id===t)?.icon  || '📁';
  const tipoLabel = t => TIPOS.find(x => x.id===t)?.label || t;
  const discNome  = d => discs.find(x => x.id===Number(d))?.nome || '';

  const handleDelete = async (id) => {
    if (!window.confirm('Remover material?')) return;
    await api.delete('/materiais/'+id);
    setMats(p => p.filter(m => m.id !== id));
  };

  const onSalvar = (mat) => {
    setMats(prev => {
      const idx = prev.findIndex(m => m.id === mat.id);
      if (idx >= 0) { const n=[...prev]; n[idx]=mat; return n; }
      return [mat, ...prev];
    });
  };

  const openCreate = () => { setEditItem(null); setShowModal(true); };
  const openEdit   = (m) => { setEditItem(m); setShowModal(true); };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Materiais Didáticos</div>
        <div className="page-sub">Links, vídeos, PDFs e textos por disciplina</div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div className="card">
        <div className="section-header">
          <select value={filtroDisc} onChange={e=>setFiltro(e.target.value)}
            style={{ padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}>
            <option value="">📚 Todas as disciplinas</option>
            {discs.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <button className="btn-create" onClick={openCreate}>+ Adicionar Material</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📁" title="Nenhum material" sub="Clique em '+ Adicionar Material'" />
        ) : (
          <div className="material-grid">
            {filtered.map(m => (
              <div key={m.id} style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, padding:'1rem', display:'flex', flexDirection:'column', gap:4 }}>
                {/* Preview visual */}
                <MaterialPreview m={m} />

                {/* Ícone + título */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:22 }}>{tipoIcon(m.tipo)}</span>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titulo}</div>
                </div>

                {m.descricao && (
                  <div style={{ fontSize:11, color:'var(--slate-500)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>
                )}

                {/* Tags + actions */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    <span style={{ padding:'2px 6px', borderRadius:50, background:'var(--slate-100)', fontSize:10, color:'var(--slate-600)' }}>
                      {tipoLabel(m.tipo)}
                      {m.fileName && ' · '+fmtSize(m.fileSize)}
                    </span>
                    {discNome(m.disciplina_id) && (
                      <span style={{ padding:'2px 6px', borderRadius:50, background:'rgba(16,185,129,0.1)', fontSize:10, color:'var(--emerald-dark)' }}>
                        {discNome(m.disciplina_id)}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {(m.url || m.base64) && (
                      <a href={m.base64||m.url} download={m.fileName} target={m.base64?'_self':'_blank'} rel="noreferrer"
                        style={{ padding:'3px 8px', background:'rgba(14,165,233,.1)', border:'1px solid rgba(14,165,233,.3)', borderRadius:5, fontSize:11, color:'var(--sky)', textDecoration:'none' }}>
                        ⬇️
                      </a>
                    )}
                    <button className="btn-sm btn-edit" onClick={() => openEdit(m)} style={{ padding:'3px 8px' }}>✏️</button>
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(m.id)} style={{ padding:'3px 8px' }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ModalMaterial
          editItem={editItem}
          discs={discs}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSalvar={onSalvar}
        />
      )}
    </>
  );
}

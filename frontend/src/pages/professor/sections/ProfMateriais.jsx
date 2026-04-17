/**
 * ProfMateriais - com upload de arquivo do computador (base64)
 * Tipos: Link | YouTube | PDF/Arquivo (upload) | Texto | Imagem
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { Modal, EmptyState } from '../../../components/ui';

// Inline YouTube ID extractor
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  var clean = url.trim();
  var m = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
          clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
          clean.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}


const TIPOS = [
  { id:'link',    icon:'🔗', label:'Link',         desc:'URL externa' },
  { id:'youtube', icon:'▶️', label:'YouTube',      desc:'Vídeo embed' },
  { id:'pdf',     icon:'📄', label:'PDF/Arquivo',  desc:'Upload do PC' },
  { id:'imagem',  icon:'🖼️', label:'Imagem',       desc:'Upload do PC ou URL' },
  { id:'texto',   icon:'📝', label:'Texto',        desc:'Bloco de texto' },
];

const fmtSize = (b) => !b ? '' : b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';

// -- Renderizador para visualizar o material no card -----------
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

// -- Modal criar/editar ----------------------------------------
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
        <input value={form.titulo} onChange={set('titulo')} placeholder="ex: Slides - Aula 5" />
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

      {/* -- LINK -- */}
      {tipoAtual === 'link' && (
        <div className="field"><label>🔗 URL <span style={{color:'var(--coral)'}}>*</span></label>
          <input value={form.url} onChange={set('url')} placeholder="https://site.com/recurso" />
        </div>
      )}

      {/* -- YOUTUBE -- */}
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

      {/* -- PDF/ARQUIVO -- */}
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

      {/* -- IMAGEM -- */}
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

      {/* -- TEXTO -- */}
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

// ----------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------
// SVG Icons (inline, 100% ASCII)
var IcoBook = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
); };
var IcoVideoIco = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
); };
var IcoLinkIco = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
); };
var IcoDocIco = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
); };
var IcoTextIco = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
); };
var IcoImageIco = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
); };
var IcoEdit = function() { return (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
); };
var IcoTrash = function() { return (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
); };
var IcoDownloadIco = function() { return (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
); };
var IcoGrid = function() { return (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
); };
var IcoListIco = function() { return (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
    <line x1="4" y1="6" x2="4.01" y2="6"/><line x1="4" y1="12" x2="4.01" y2="12"/><line x1="4" y1="18" x2="4.01" y2="18"/>
  </svg>
); };
var IcoChevronIco = function(p) { return (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: p.open ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s', display:'block' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
); };
var IcoPlus = function() { return (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
); };

var PROF_CATS = [
  { key:'conteudos', label:'Conteúdos da Disciplina', Icon:IcoBook,      cor:'#7c3aed', bg:'#faf5ff', tipos:['pdf','imagem'],   desc:'Conteúdo formal da disciplina' },
  { key:'videos',    label:'Videoaulas',       Icon:IcoVideoIco, cor:'#dc2626', bg:'#fef2f2', tipos:['youtube'],         desc:'Videoaulas e conteúdos audiovisuais' },
  { key:'links',     label:'Referências Complementares de Estudo',  Icon:IcoLinkIco,  cor:'#0284c7', bg:'#f0f9ff', tipos:['link'],            desc:'Artigos, sites e leituras recomendadas' },
  { key:'textos',    label:'Resumo e Anotações da Aula',        Icon:IcoTextIco,  cor:'#0f766e', bg:'#f0fdfa', tipos:['texto'],           desc:'Resumos e anotações de apoio ao estudo' },
];
var TIPO_CFG_PROF = {
  pdf:     { Icon:IcoDocIco,   cor:'#7c3aed', bg:'#faf5ff', label:'PDF' },
  youtube: { Icon:IcoVideoIco, cor:'#dc2626', bg:'#fef2f2', label:'Video' },
  link:    { Icon:IcoLinkIco,  cor:'#0284c7', bg:'#f0f9ff', label:'Link' },
  texto:   { Icon:IcoTextIco,  cor:'#0f766e', bg:'#f0fdfa', label:'Texto' },
  imagem:  { Icon:IcoImageIco, cor:'#d97706', bg:'#fffbeb', label:'Imagem' },
};

function getCatProf(tipo) {
  for (var i = 0; i < PROF_CATS.length; i++) {
    if (PROF_CATS[i].tipos.includes(tipo)) return PROF_CATS[i].key;
  }
  return 'conteudos';
}

function CardProf(props) {
  var m = props.m;
  var onEdit = props.onEdit;
  var onDel  = props.onDel;
  var discNome = props.discNome;
  if (!m || !m.tipo) return null;
  var cfg = TIPO_CFG_PROF[m.tipo] || TIPO_CFG_PROF['pdf'];
  var ytId = m.tipo === 'youtube' ? extractYouTubeId(m.url) : null;

  return (
    <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12,
      overflow:'hidden', transition:'box-shadow .15s, transform .15s',
      boxShadow:'0 1px 4px rgba(0,0,0,.05)', display:'flex', flexDirection:'column' }}
      onMouseEnter={function(e){ e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={function(e){ e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.transform=''; }}>

      <div style={{ height:3, background:cfg.cor }} />

      {ytId && (
        <div style={{ aspectRatio:'16/9', overflow:'hidden', background:'#000' }}>
          <iframe src={'https://www.youtube.com/embed/'+ytId+'?rel=0&origin='+window.location.origin}
            title={m.titulo} frameBorder="0" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ width:'100%', height:'100%' }} />
        </div>
      )}
      {m.tipo === 'imagem' && (m.base64||m.url) && (
        <img src={m.base64||m.url} alt={m.titulo} style={{ width:'100%', maxHeight:140, objectFit:'cover', display:'block' }} />
      )}

      <div style={{ padding:'12px', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <div style={{ width:36, height:36, borderRadius:9, background:cfg.bg, color:cfg.cor,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <cfg.Icon />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', lineHeight:1.3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titulo}</div>
            {m.descricao && (
              <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:1,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>
            )}
            <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
              <span style={{ padding:'2px 7px', borderRadius:99, background:cfg.bg, color:cfg.cor,
                fontSize:10, fontWeight:700, border:'1px solid '+cfg.cor+'30' }}>{cfg.label}</span>
              {discNome && (
                <span style={{ padding:'2px 7px', borderRadius:99, background:'rgba(16,185,129,.1)',
                  color:'var(--emerald-dark)', fontSize:10, fontWeight:600 }}>{discNome}</span>
              )}
              {m.fileSize && (
                <span style={{ padding:'2px 7px', borderRadius:99, background:'var(--slate-100)',
                  color:'var(--slate-500)', fontSize:10 }}>{fmtSize(m.fileSize)}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:5, marginTop:'auto', justifyContent:'flex-end' }}>
          {(m.url||m.base64) && (
            <a href={m.base64||m.url} download={m.fileName} target={m.base64?'_self':'_blank'} rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px',
                background:'var(--slate-100)', border:'1px solid var(--slate-200)', borderRadius:6,
                color:'var(--slate-600)', textDecoration:'none', fontSize:11, fontWeight:600 }}>
              <IcoDownloadIco />
            </a>
          )}
          <button onClick={function(){ onEdit(m); }}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
              background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6,
              color:'#1d4ed8', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            <IcoEdit /> Editar
          </button>
          <button onClick={function(){ onDel(m.id); }}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px',
              background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6,
              color:'#b91c1c', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            <IcoTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

function RowProf(props) {
  var m = props.m;
  var onEdit = props.onEdit;
  var onDel  = props.onDel;
  var discNome = props.discNome;
  if (!m || !m.tipo) return null;
  var cfg = TIPO_CFG_PROF[m.tipo] || TIPO_CFG_PROF['pdf'];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
      borderRadius:10, background:'white', border:'1px solid var(--slate-200)', marginBottom:4,
      transition:'background .1s' }}
      onMouseEnter={function(e){ e.currentTarget.style.background='var(--slate-50)'; }}
      onMouseLeave={function(e){ e.currentTarget.style.background='white'; }}>
      <div style={{ width:32, height:32, borderRadius:8, background:cfg.bg, color:cfg.cor,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <cfg.Icon />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titulo}</div>
        {m.descricao && (
          <div style={{ fontSize:11, color:'var(--slate-400)',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>
        )}
      </div>
      <span style={{ padding:'2px 7px', borderRadius:99, background:cfg.bg, color:cfg.cor,
        fontSize:10, fontWeight:700, flexShrink:0 }}>{cfg.label}</span>
      {discNome && (
        <span style={{ padding:'2px 7px', borderRadius:99, background:'rgba(16,185,129,.1)',
          color:'var(--emerald-dark)', fontSize:10, fontWeight:600, flexShrink:0 }}>{discNome}</span>
      )}
      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
        {(m.url||m.base64) && (
          <a href={m.base64||m.url} download={m.fileName} target={m.base64?'_self':'_blank'} rel="noreferrer"
            style={{ display:'flex', alignItems:'center', padding:'5px 8px', background:'var(--slate-100)',
              border:'1px solid var(--slate-200)', borderRadius:6, color:'var(--slate-600)', textDecoration:'none' }}>
            <IcoDownloadIco />
          </a>
        )}
        <button onClick={function(){ onEdit(m); }}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px',
            background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6,
            color:'#1d4ed8', cursor:'pointer', fontSize:11, fontWeight:600 }}>
          <IcoEdit /> Editar
        </button>
        <button onClick={function(){ onDel(m.id); }}
          style={{ display:'flex', alignItems:'center', padding:'5px 8px',
            background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6,
            color:'#b91c1c', cursor:'pointer' }}>
          <IcoTrash />
        </button>
      </div>
    </div>
  );
}

function AccordionProf(props) {
  var cat     = props.cat;
  var itens   = props.itens;
  var modo    = props.modo;
  var discs   = props.discs;
  var onEdit  = props.onEdit;
  var onDel   = props.onDel;
  var [aberta, setAberta] = useState(true);
  // Always show "conteudos" (PDFs/slides) even when empty so professor can add content
  var isEmpty = !itens || itens.length === 0;
  if (isEmpty && cat.key !== 'conteudos') return null;

  var discNomeFor = function(id) {
    var d = discs.find(function(x){ return x.id===Number(id); });
    return d ? d.nome : '';
  };

  // Group by disciplina
  var byDisc = {};
  itens.forEach(function(m) {
    var k = m.disciplina_id ? String(m.disciplina_id) : '__';
    if (!byDisc[k]) byDisc[k] = [];
    byDisc[k].push(m);
  });

  return (
    <div style={{ marginBottom:'1rem', borderRadius:14, overflow:'hidden',
      border:'1px solid var(--slate-200)', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>

      <button onClick={function(){ setAberta(function(a){ return !a; }); }}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
          background: aberta ? cat.cor : 'white', border:'none', cursor:'pointer',
          transition:'background .15s', textAlign:'left' }}>
        <div style={{ width:40, height:40, borderRadius:11,
          background: aberta ? 'rgba(255,255,255,.18)' : cat.bg,
          color: aberta ? 'white' : cat.cor,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <cat.Icon />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:14, color: aberta?'white':'var(--navy)' }}>{cat.label}</div>
          <div style={{ fontSize:11, color: aberta?'rgba(255,255,255,.65)':'var(--slate-400)', marginTop:2 }}>
            {itens.length} {itens.length===1?'material':'materiais'} &bull; {cat.desc}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:800,
            background: aberta?'rgba(255,255,255,.2)':cat.bg, color: aberta?'white':cat.cor }}>
            {itens.length}
          </span>
          <div style={{ color: aberta?'rgba(255,255,255,.8)':'var(--slate-400)' }}>
            <IcoChevronIco open={aberta} />
          </div>
        </div>
      </button>

      {aberta && (
        <div style={{ padding:'16px', background:'var(--slate-50)' }}>
      {isEmpty && (
        <div style={{ padding:'20px', textAlign:'center', background:'white', borderRadius:10,
          border:'2px dashed var(--slate-200)' }}>
          <div style={{ color:cat.cor, marginBottom:6, display:'flex', justifyContent:'center' }}>
            <cat.Icon />
          </div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', marginBottom:4 }}>
            Nenhum PDF ou arquivo ainda
          </div>
          <div style={{ fontSize:12, color:'var(--slate-400)', marginBottom:12 }}>
            Clique em "Adicionar Material" e escolha o tipo PDF/Arquivo ou Imagem para adicionar slides, documentos e apresentacoes.
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
            {['PDF', 'DOC', 'PPT', 'XLS', 'ZIP', 'Imagem'].map(function(ext){
              return (
                <span key={ext} style={{ padding:'3px 10px', borderRadius:99, background:cat.bg,
                  color:cat.cor, fontSize:11, fontWeight:700, border:'1px solid '+cat.cor+'30' }}>
                  .{ext.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {!isEmpty && (
        <div>
          {Object.entries(byDisc).map(function(e2) {
            var did = e2[0];
            var its = e2[1];
            var dn  = did === '__' ? null : discNomeFor(did);
            return (
              <div key={did} style={{ marginBottom:'1rem' }}>
                {dn && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:3, height:18, background:cat.cor, borderRadius:2 }} />
                    <span style={{ fontSize:12, fontWeight:800, color:cat.cor }}>{dn}</span>
                    <span style={{ fontSize:11, color:'var(--slate-400)' }}>({its.length})</span>
                  </div>
                )}
                {modo === 'grade' ? (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                    {its.map(function(m){
                      return <CardProf key={m.id} m={m} onEdit={onEdit} onDel={onDel} discNome={dn} />;
                    })}
                  </div>
                ) : (
                  <div>
                    {its.map(function(m){
                      return <RowProf key={m.id} m={m} onEdit={onEdit} onDel={onDel} discNome={dn} />;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default function ProfMateriais({ autoCreate } = {}) {
  const { user } = useAuth();
  const [materiais, setMats] = useState([]);
  const [discs, setDiscs]    = useState([]);
  const [loading, setLoading]= useState(true);
  const [modo, setModo]      = useState('grade');
  const [busca, setBusca]    = useState('');
  const [catFiltro, setCF]   = useState('todas');
  const [showModal, setSM]   = useState(false);
  const [editItem, setEdit]  = useState(null);
  const [alert, setAlert]    = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/materiais?professor_id='+user.id),
      api.get('/disciplinas?professor_id='+user.id),
    ]).then(([mRes, dRes]) => {
      setMats(mRes.data.materiais || []);
      setDiscs(dRes.data.disciplinas || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (autoCreate) { setEdit(null); setSM(true); } }, [autoCreate]);

  const safe = Array.isArray(materiais) ? materiais.filter(function(m){ return m&&m.tipo; }) : [];

  const filtrados = safe.filter(function(m) {
    if (!busca) return true;
    var q = busca.toLowerCase();
    return (m.titulo||'').toLowerCase().includes(q) || (m.descricao||'').toLowerCase().includes(q);
  });

  var exibidos = catFiltro === 'todas' ? filtrados : filtrados.filter(function(m){ return getCatProf(m.tipo)===catFiltro; });

  var porCat = {};
  PROF_CATS.forEach(function(c){ porCat[c.key]=[]; });
  exibidos.forEach(function(m){ porCat[getCatProf(m.tipo)].push(m); });

  var cntCat = {};
  PROF_CATS.forEach(function(c){ cntCat[c.key]=0; });
  filtrados.forEach(function(m){ cntCat[getCatProf(m.tipo)]=(cntCat[getCatProf(m.tipo)]||0)+1; });

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este material?')) return;
    try {
      await api.delete('/materiais/'+id);
      setMats(p => p.filter(m => m.id !== id));
      setAlert({ type:'success', msg:'Material removido.' });
      setTimeout(function(){ setAlert(null); }, 3000);
    } catch(e) {
      setAlert({ type:'error', msg:'Erro ao remover.' });
    }
  };

  const onSalvar = (mat) => {
    setMats(prev => {
      var idx = prev.findIndex(function(m){ return m.id===mat.id; });
      if (idx >= 0) { var n=[...prev]; n[idx]=mat; return n; }
      return [mat, ...prev];
    });
    setAlert({ type:'success', msg: editItem ? 'Material atualizado!' : 'Material adicionado!' });
    setTimeout(function(){ setAlert(null); }, 3000);
  };

  const openCreate = () => { setEdit(null); setSM(true); };
  const openEdit   = (m) => { setEdit(m);   setSM(true); };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Hub de Aprendizagem</div>
        <div className="page-sub">Organize os conteudos do Hub de Aprendizagem da sua disciplina</div>
      </div>

      {alert && (
        <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 200px', position:'relative', display:'flex', alignItems:'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position:'absolute', left:12, color:'var(--slate-400)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={busca} onChange={function(e){ setBusca(e.target.value); }}
            placeholder="Buscar material..."
            style={{ width:'100%', padding:'9px 36px', border:'1.5px solid var(--slate-200)',
              borderRadius:9, fontFamily:'var(--font-body)', fontSize:13, outline:'none', boxSizing:'border-box' }}
            onFocus={function(e){ e.target.style.borderColor='var(--emerald)'; }}
            onBlur={function(e){ e.target.style.borderColor='var(--slate-200)'; }} />
          {busca && (
            <button onClick={function(){ setBusca(''); }}
              style={{ position:'absolute', right:12, background:'none', border:'none',
                cursor:'pointer', color:'var(--slate-400)', fontSize:18, lineHeight:1, padding:0 }}>
              &#215;
            </button>
          )}
        </div>
        <div style={{ display:'flex', background:'var(--slate-100)', borderRadius:9, padding:3, gap:2 }}>
          {[{k:'grade',I:IcoGrid,l:'Grade'},{k:'lista',I:IcoListIco,l:'Lista'}].map(function(opt){
            var active = modo===opt.k;
            return (
              <button key={opt.k} onClick={function(){ setModo(opt.k); }} title={opt.l}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:7,
                  border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: active?'white':'transparent', color: active?'var(--navy)':'var(--slate-500)',
                  boxShadow: active?'0 1px 6px rgba(0,0,0,.1)':'none', transition:'all .15s' }}>
                <opt.I /> {opt.l}
              </button>
            );
          })}
        </div>
        <button onClick={openCreate}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
            background:'var(--navy)', color:'white', border:'none', borderRadius:9,
            fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0,
            boxShadow:'0 3px 10px rgba(30,58,95,.3)' }}>
          <IcoPlus /> Adicionar Material
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={function(){ setCF('todas'); }}
          style={{ padding:'7px 14px', borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600,
            border:'1.5px solid '+(catFiltro==='todas'?'var(--navy)':'var(--slate-200)'),
            background: catFiltro==='todas'?'var(--navy)':'white',
            color: catFiltro==='todas'?'white':'var(--slate-600)', transition:'all .15s' }}>
          Todos ({filtrados.length})
        </button>
        {PROF_CATS.map(function(cat){
          var cnt = cntCat[cat.key]||0;
          if (!cnt) return null;
          var active = catFiltro===cat.key;
          return (
            <button key={cat.key} onClick={function(){ setCF(active?'todas':cat.key); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600,
                border:'1.5px solid '+(active?cat.cor:'var(--slate-200)'),
                background: active?cat.cor:'white', color: active?'white':'var(--slate-600)', transition:'all .15s' }}>
              <div style={{ color: active?'white':cat.cor }}><cat.Icon /></div>
              {cat.label}
              <span style={{ padding:'1px 7px', borderRadius:99, fontSize:10, fontWeight:800,
                background: active?'rgba(255,255,255,.25)':cat.bg, color: active?'white':cat.cor }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <EmptyState icon="[DOC]"
            title={safe.length===0?'Nenhum material cadastrado':'Nenhum resultado'}
            sub={safe.length===0?"Clique em 'Adicionar Material' para comecar":'Tente outra busca ou filtro'} />
        </div>
      ) : (
        <div>
          {PROF_CATS.map(function(cat){
            return (
              <AccordionProf key={cat.key} cat={cat} itens={porCat[cat.key]||[]}
                modo={modo} discs={discs} onEdit={openEdit} onDel={handleDelete} />
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalMaterial
          editItem={editItem}
          discs={discs}
          onClose={function(){ setSM(false); setEdit(null); }}
          onSalvar={onSalvar}
        />
      )}
    </>
  );
}

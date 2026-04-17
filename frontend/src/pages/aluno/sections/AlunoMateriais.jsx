/**
 * AlunoMateriais — exibe materiais com preview/download de arquivos
 */
import { useState, useEffect } from 'react';
import { extractYouTubeId } from '../../../utils/youtube.js';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

const TIPO_ICON  = { link:'🔗', youtube:'▶️', pdf:'📄', texto:'📝', imagem:'🖼️' };
const TIPO_LABEL = { link:'Link', youtube:'YouTube', pdf:'PDF/Arquivo', texto:'Texto', imagem:'Imagem' };
const TIPO_COR   = { link:'#0284c7', youtube:'#dc2626', pdf:'#7c3aed', texto:'#0f766e', imagem:'#d97706' };
const TIPO_BG    = { link:'#f0f9ff', youtube:'#fef2f2', pdf:'#faf5ff', texto:'#f0fdfa', imagem:'#fffbeb' };

const fmtSize = (b) => !b ? '' : b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';

// ── Renderizador de preview por tipo ─────────────────────────
function MaterialCard({ m }) {
  const [expandido, setExpandido] = useState(false);
  // Safety guard - if m is undefined/null, render nothing
  if (!m || !m.tipo) return null;

  const ytId = (url) => extractYouTubeId(url);
  const cor = TIPO_COR[m.tipo] || 'var(--navy)';
  const bg  = TIPO_BG[m.tipo]  || 'var(--slate-50)';

  return (
    <div style={{
      background:'white', border:'1px solid var(--slate-200)', borderRadius:14,
      overflow:'hidden', transition:'box-shadow .15s, transform .15s',
      boxShadow:'0 1px 4px rgba(0,0,0,.05)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.transform='translateY(0)'; }}>

      {/* Barra de cor superior */}
      <div style={{ height:4, background:cor }} />

      {/* Preview de conteúdo */}
      {m.tipo === 'youtube' && ytId(m.url) && (
        <div style={{ aspectRatio:'16/9', position:'relative', overflow:'hidden', background:'#000' }}>
          <iframe src={'https://www.youtube.com/embed/' + ytId(m.url) + '?rel=0&origin=' + window.location.origin} title={m.titulo} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            frameBorder="0" allowFullScreen
            style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
        </div>
      )}

      {m.tipo === 'imagem' && (m.base64 || m.url) && (
        <div style={{ overflow:'hidden', maxHeight:180, background:'var(--slate-50)' }}>
          <img src={m.base64 || m.url} alt={m.titulo}
            style={{ width:'100%', maxHeight:180, objectFit:'cover', display:'block' }} />
        </div>
      )}

      {/* Corpo do card */}
      <div style={{ padding:'1rem' }}>
        {/* Ícone + tipo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
            {TIPO_ICON[m.tipo] || '📁'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {m.titulo}
            </div>
            {m.descricao && (
              <div style={{ fontSize:11, color:'var(--slate-400)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {m.descricao}
              </div>
            )}
          </div>
          <span style={{ padding:'2px 8px', borderRadius:50, background:bg, color:cor, fontSize:10, fontWeight:600, flexShrink:0 }}>
            {TIPO_LABEL[m.tipo] || m.tipo}
            {m.fileSize ? ' · '+fmtSize(m.fileSize) : ''}
          </span>
        </div>

        {/* PDF — botão de download */}
        {m.tipo === 'pdf' && (m.base64 || m.url) && (
          <a href={m.base64 || m.url} download={m.fileName} target={m.base64 ? '_self' : '_blank'} rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'#faf5ff', border:'1px solid #d8b4fe', borderRadius:8, textDecoration:'none', color:'#7c3aed', fontWeight:600, fontSize:13 }}>
            <span style={{ fontSize:18 }}>📄</span>
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {m.fileName || m.titulo}
            </span>
            <span style={{ fontSize:11, background:'#7c3aed', color:'white', padding:'3px 10px', borderRadius:5, flexShrink:0 }}>
              ⬇️ Baixar
            </span>
          </a>
        )}

        {/* Link — botão de abrir */}
        {m.tipo === 'link' && m.url && (
          <a href={m.url} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, textDecoration:'none', color:'#0284c7', fontWeight:600, fontSize:13 }}>
            <span style={{ fontSize:14 }}>🔗</span>
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>
              {m.url.replace(/^https?:\/\/(www\.)?/, '').slice(0,50)}
            </span>
            <span style={{ fontSize:10, background:'#0284c7', color:'white', padding:'3px 10px', borderRadius:5, flexShrink:0 }}>
              ↗ Abrir
            </span>
          </a>
        )}

        {/* Texto — expandir/colapsar */}
        {m.tipo === 'texto' && m.conteudo && (
          <div>
            <div style={{
              fontSize:12, color:'var(--slate-700)', background:'var(--slate-50)', padding:'10px 12px',
              borderRadius:8, lineHeight:1.7, whiteSpace:'pre-wrap',
              maxHeight: expandido ? 'none' : 80, overflow:'hidden', position:'relative',
            }}>
              {m.conteudo}
              {!expandido && (m.conteudo||"").length > 120 && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:28, background:'linear-gradient(transparent, var(--slate-50))' }} />
              )}
            </div>
            {(m.conteudo||"").length > 120 && (
              <button onClick={() => setExpandido(e => !e)}
                style={{ marginTop:4, fontSize:11, color:'var(--sky)', background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:600 }}>
                {expandido ? '▲ Ver menos' : '▼ Ver mais'}
              </button>
            )}
          </div>
        )}

        {/* YouTube — link direto */}
        {m.tipo === 'youtube' && m.url && (
          <a href={m.url} target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:6, fontSize:11, color:'#dc2626', textDecoration:'none', fontWeight:600 }}>
            ▶️ Abrir no YouTube ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function AlunoMateriais() {
  const [materiais, setMats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState('');
  const [busca, setBusca]     = useState('');

  useEffect(() => {
    api.get('/materiais').then(r => setMats(r.data.materiais || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Defensive: ensure materiais is always an array
  const safeMateriais = Array.isArray(materiais) ? materiais : [];
  const tipos    = [...new Set(safeMateriais.map(function(m) { return m && m.tipo; }).filter(Boolean))];
  const filtered = safeMateriais.filter(function(m) { return m && m.tipo; }).filter(m =>
    (!filtro || m.tipo === filtro) &&
    (!busca  || (m.titulo||'').toLowerCase().includes(busca.toLowerCase()) || (m.descricao||'').toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <>
      <div className="page-header">
        <div className="page-title">Materiais Didáticos</div>
        <div className="page-sub">Acesse materiais das suas disciplinas</div>
      </div>

      {/* Filtros + busca */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar material..."
          style={{ flex:'1 1 200px', padding:'8px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}
          onFocus={e => e.target.style.borderColor='var(--emerald)'}
          onBlur={e => e.target.style.borderColor='var(--slate-200)'} />

        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          <button onClick={() => setFiltro('')}
            style={{ padding:'7px 14px', borderRadius:50, border:'1.5px solid '+(!filtro?'var(--emerald)':'var(--slate-200)'), background:!filtro?'rgba(16,185,129,.08)':'white', fontSize:12, cursor:'pointer', color:!filtro?'var(--emerald-dark)':'var(--slate-600)', fontWeight:!filtro?600:400 }}>
            Todos ({safeMateriais.length})
          </button>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltro(filtro===t?'':t)}
              style={{ padding:'7px 14px', borderRadius:50, border:'1.5px solid '+(filtro===t?TIPO_COR[t]||'var(--emerald)':'var(--slate-200)'), background:filtro===t?(TIPO_BG[t]||'rgba(16,185,129,.08)'):'white', fontSize:12, cursor:'pointer', color:filtro===t?(TIPO_COR[t]||'var(--emerald-dark)'):'var(--slate-600)', fontWeight:filtro===t?600:400 }}>
              {TIPO_ICON[t]||'📁'} {TIPO_LABEL[t]||t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="📁" title={safeMateriais.length===0?"Nenhum material disponível":"Nenhum resultado"} sub={safeMateriais.length===0?"Seus professores adicionarão materiais em breve":"Tente outra busca ou filtro"} />
        </div>
      ) : (
        <div className="material-grid">
          {filtered.map(m => <MaterialCard key={m.id} m={m} />)}
        </div>
      )}
    </>
  );
}

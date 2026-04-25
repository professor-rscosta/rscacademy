/**
 * AlunoMateriais - Modulo de Hub de Aprendizagem
 * Accordion por categoria + modo grade/lista + grupos por disciplina
 * SVG icons inline (100% ASCII, sem emoji no source)
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  var clean = url.trim();
  var m = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
          clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
          clean.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

var fmtSize = function(b) {
  if (!b) return '';
  return b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';
};

/* SVG Icons */
var IcoBook = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
); };
var IcoVideo = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
); };
var IcoLink = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
); };
var IcoDoc = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
); };
var IcoText = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
); };
var IcoImage = function() { return (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
); };
var IcoDownload = function() { return (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
); };
var IcoExternal = function() { return (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
); };
var IcoGrid = function() { return (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
); };
var IcoList = function() { return (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
    <line x1="4" y1="6" x2="4.01" y2="6"/><line x1="4" y1="12" x2="4.01" y2="12"/><line x1="4" y1="18" x2="4.01" y2="18"/>
  </svg>
); };
var IcoChevron = function(props) { return (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: props.open ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s', display:'block' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
); };
var IcoSearch = function() { return (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
); };

/* Category definitions */
var CATS = [
  { key:'conteudos', label:'Conteúdos da Disciplina', Icon:IcoBook,  cor:'#7c3aed', bg:'#faf5ff', tipos:['pdf','imagem'],   desc:'Conteúdo formal da disciplina' },
  { key:'videos',    label:'Videoaulas',       Icon:IcoVideo, cor:'#dc2626', bg:'#fef2f2', tipos:['youtube'],         desc:'Videoaulas e conteúdos audiovisuais' },
  { key:'links',     label:'Referências Complementares de Estudo',  Icon:IcoLink,  cor:'#0284c7', bg:'#f0f9ff', tipos:['link'],            desc:'Sites, artigos e materiais complementares' },
  { key:'textos',    label:'Resumos e Anotações da Aula',        Icon:IcoText,  cor:'#0f766e', bg:'#f0fdfa', tipos:['texto'],           desc:'Resumos e anotações de apoio ao estudo' },
];

var TIPO_CFG = {
  pdf:     { Icon:IcoDoc,   cor:'#7c3aed', bg:'#faf5ff', label:'PDF' },
  youtube: { Icon:IcoVideo, cor:'#dc2626', bg:'#fef2f2', label:'Video' },
  link:    { Icon:IcoLink,  cor:'#0284c7', bg:'#f0f9ff', label:'Link' },
  texto:   { Icon:IcoText,  cor:'#0f766e', bg:'#f0fdfa', label:'Texto' },
  imagem:  { Icon:IcoImage, cor:'#d97706', bg:'#fffbeb', label:'Imagem' },
};

function getCat(tipo) {
  for (var i = 0; i < CATS.length; i++) {
    if (CATS[i].tipos.includes(tipo)) return CATS[i].key;
  }
  return 'conteudos';
}

/* Card (grade mode) */
function CardGrade(props) {
  var m = props.m;
  var [exp, setExp] = useState(false);
  if (!m || !m.tipo) return null;
  var cfg = TIPO_CFG[m.tipo] || TIPO_CFG['pdf'];
  var ytId = m.tipo === 'youtube' ? extractYouTubeId(m.url) : null;
  return (
    <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:14,
      overflow:'hidden', transition:'box-shadow .15s, transform .15s',
      boxShadow:'0 1px 4px rgba(0,0,0,.05)', display:'flex', flexDirection:'column' }}
      onMouseEnter={function(e){ e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={function(e){ e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.transform=''; }}>

      <div style={{ height:3, background:cfg.cor }} />

      {ytId && (
        <div style={{ aspectRatio:'16/9', position:'relative', overflow:'hidden', background:'#000' }}>
          <iframe src={'https://www.youtube.com/embed/'+ytId+'?rel=0&origin='+window.location.origin}
            title={m.titulo} frameBorder="0" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
        </div>
      )}

      {m.tipo === 'imagem' && (m.base64 || m.url) && (
        <img src={m.base64 || m.url} alt={m.titulo}
          style={{ width:'100%', maxHeight:160, objectFit:'cover', display:'block' }} />
      )}

      <div style={{ padding:'14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg, color:cfg.cor,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <cfg.Icon />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', lineHeight:1.3,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.titulo}</div>
            {m.descricao && (
              <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>
            )}
            <div style={{ display:'flex', gap:5, marginTop:5, flexWrap:'wrap' }}>
              <span style={{ padding:'2px 8px', borderRadius:99, background:cfg.bg, color:cfg.cor,
                fontSize:10, fontWeight:700, border:'1px solid '+cfg.cor+'30' }}>{cfg.label}</span>
              {m.fileSize && (
                <span style={{ padding:'2px 8px', borderRadius:99, background:'var(--slate-100)',
                  color:'var(--slate-500)', fontSize:10, fontWeight:600 }}>{fmtSize(m.fileSize)}</span>
              )}
            </div>
          </div>
        </div>

        {m.tipo === 'pdf' && (m.base64 || m.url) && (
          <a href={m.base64 || m.url} download={m.fileName} target={m.base64 ? '_self' : '_blank'} rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:cfg.bg,
              border:'1px solid '+cfg.cor+'40', borderRadius:9, textDecoration:'none', color:cfg.cor,
              fontWeight:700, fontSize:12, marginTop:'auto' }}>
            <IcoDownload />
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {m.fileName || m.titulo}
            </span>
            <span style={{ fontSize:10, background:cfg.cor, color:'white', padding:'3px 9px', borderRadius:5 }}>Baixar</span>
          </a>
        )}
        {m.tipo === 'link' && m.url && (
          <a href={m.url} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', background:cfg.bg,
              border:'1px solid '+cfg.cor+'40', borderRadius:9, textDecoration:'none', color:cfg.cor,
              fontWeight:700, fontSize:12, marginTop:'auto' }}>
            <IcoExternal />
            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>
              {(m.url||'').replace(/^https?:\/\/(www\.)?/,'').slice(0,45)}
            </span>
            <span style={{ fontSize:10, background:cfg.cor, color:'white', padding:'3px 9px', borderRadius:5 }}>Abrir</span>
          </a>
        )}
        {m.tipo === 'youtube' && m.url && (
          <a href={m.url} target="_blank" rel="noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, color:cfg.cor,
              textDecoration:'none', fontWeight:700, padding:'4px 0' }}>
            <IcoExternal /> Ver no YouTube
          </a>
        )}
        {m.tipo === 'texto' && (m.conteudo||'').length > 0 && (
          <div>
            <div style={{ fontSize:11.5, color:'var(--slate-700)', background:'var(--slate-50)',
              padding:'10px 12px', borderRadius:8, lineHeight:1.7, whiteSpace:'pre-wrap',
              maxHeight: exp ? 9999 : 72, overflow:'hidden', position:'relative' }}>
              {m.conteudo}
              {!exp && (m.conteudo||'').length > 120 && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:28,
                  background:'linear-gradient(transparent,var(--slate-50))' }} />
              )}
            </div>
            {(m.conteudo||'').length > 120 && (
              <button onClick={function(){ setExp(function(v){ return !v; }); }}
                style={{ marginTop:4, fontSize:11, color:'var(--sky)', background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:700 }}>
                {exp ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Row (list mode) */
function RowLista(props) {
  var m = props.m;
  if (!m || !m.tipo) return null;
  var cfg = TIPO_CFG[m.tipo] || TIPO_CFG['pdf'];
  var href = m.tipo === 'pdf' ? (m.base64 || m.url) : m.url;
  var isDl = m.tipo === 'pdf';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
      borderRadius:10, background:'white', border:'1px solid var(--slate-200)', marginBottom:4,
      transition:'background .1s' }}
      onMouseEnter={function(e){ e.currentTarget.style.background='var(--slate-50)'; }}
      onMouseLeave={function(e){ e.currentTarget.style.background='white'; }}>
      <div style={{ width:34, height:34, borderRadius:8, background:cfg.bg, color:cfg.cor,
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
      <span style={{ padding:'2px 8px', borderRadius:99, background:cfg.bg, color:cfg.cor,
        fontSize:10, fontWeight:700, flexShrink:0, border:'1px solid '+cfg.cor+'20' }}>
        {cfg.label}{m.fileSize ? ' '+fmtSize(m.fileSize) : ''}
      </span>
      {href && (
        <a href={href} download={isDl ? m.fileName : undefined}
          target={isDl && m.base64 ? '_self' : '_blank'} rel="noreferrer"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px',
            background:cfg.cor, color:'white', borderRadius:7, textDecoration:'none',
            fontSize:11, fontWeight:700, flexShrink:0 }}>
          {isDl ? <IcoDownload /> : <IcoExternal />}
          {isDl ? 'Baixar' : 'Abrir'}
        </a>
      )}
    </div>
  );
}

/* Accordion de categoria */
function Accordion(props) {
  var cat = props.cat;
  var itens = props.itens;
  var modo = props.modo;
  var discMap = props.discMap;
  var [aberta, setAberta] = useState(true);
  var isEmpty = !itens || itens.length === 0;
  if (isEmpty && cat.key !== 'conteudos') return null;

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
          <div style={{ fontWeight:800, fontSize:14, color: aberta?'white':'var(--navy)', lineHeight:1.2 }}>
            {cat.label}
          </div>
          <div style={{ fontSize:11, color: aberta?'rgba(255,255,255,.65)':'var(--slate-400)', marginTop:2 }}>
            {itens.length} {itens.length===1?'material':'materiais'} &bull; {cat.desc}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:800,
            background: aberta?'rgba(255,255,255,.2)':cat.bg,
            color: aberta?'white':cat.cor }}>{itens.length}</span>
          <div style={{ color: aberta?'rgba(255,255,255,.8)':'var(--slate-400)' }}>
            <IcoChevron open={aberta} />
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
            Nenhum conteudo disponivel ainda
          </div>
          <div style={{ fontSize:12, color:'var(--slate-400)' }}>
            Seu professor adicionara PDFs, slides e documentos em breve.
          </div>
        </div>
      )}
      {!isEmpty && (
        <div>
          {Object.entries(byDisc).map(function(e2) {
            var did = e2[0];
            var its = e2[1];
            var dn  = did === '__' ? null : (discMap[Number(did)] || 'Disciplina');
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
                    {its.map(function(m){ return <CardGrade key={m.id} m={m} />; })}
                  </div>
                ) : (
                  <div>{its.map(function(m){ return <RowLista key={m.id} m={m} />; })}</div>
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

/* Main */
export default function AlunoMateriais() {
  var [mats, setMats]   = useState([]);
  var [discMap, setDM]  = useState({});
  var [loading, setLd]  = useState(true);
  var [busca, setBusca] = useState('');
  var [modo, setModo]   = useState('grade');
  var [catFiltro, setCF]= useState('todas');

  useEffect(function() {
    Promise.all([
      api.get('/materiais'),
      api.get('/disciplinas').catch(function(){ return { data:{ disciplinas:[] } }; }),
    ]).then(function(r) {
      setMats(r[0].data.materiais || []);
      var dm = {};
      (r[1].data.disciplinas||[]).forEach(function(d){ dm[d.id]=d.nome; });
      setDM(dm);
    }).catch(function(e){ console.error(e); }).finally(function(){ setLd(false); });
  }, []);

  var safe = Array.isArray(mats) ? mats.filter(function(m){ return m&&m.tipo; }) : [];

  var filtrados = safe.filter(function(m) {
    if (!busca) return true;
    var q = busca.toLowerCase();
    return (m.titulo||'').toLowerCase().includes(q) || (m.descricao||'').toLowerCase().includes(q);
  });

  var exibidos = catFiltro === 'todas' ? filtrados : filtrados.filter(function(m){ return getCat(m.tipo)===catFiltro; });

  var porCat = {};
  CATS.forEach(function(c){ porCat[c.key]=[]; });
  exibidos.forEach(function(m){ porCat[getCat(m.tipo)].push(m); });

  var cntCat = {};
  CATS.forEach(function(c){ cntCat[c.key]=0; });
  filtrados.forEach(function(m){ cntCat[getCat(m.tipo)]=(cntCat[getCat(m.tipo)]||0)+1; });

  return (
    <>
      <div className="page-header">
        <div className="page-title">Hub de Aprendizagem</div>
        <div className="page-sub">Conteudos da sua disciplina organizados por contexto de aprendizagem</div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 200px', position:'relative', display:'flex', alignItems:'center' }}>
          <div style={{ position:'absolute', left:12, color:'var(--slate-400)', pointerEvents:'none', display:'flex' }}>
            <IcoSearch />
          </div>
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
          {[{k:'grade',I:IcoGrid,l:'Grade'},{k:'lista',I:IcoList,l:'Lista'}].map(function(opt){
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
        {CATS.map(function(cat){
          var cnt = cntCat[cat.key]||0;
          if (!cnt) return null;
          var active = catFiltro===cat.key;
          return (
            <button key={cat.key} onClick={function(){ setCF(active?'todas':cat.key); }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                borderRadius:50, fontSize:12, cursor:'pointer', fontWeight:600,
                border:'1.5px solid '+(active?cat.cor:'var(--slate-200)'),
                background: active?cat.cor:'white', color: active?'white':'var(--slate-600)',
                transition:'all .15s' }}>
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
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
      ) : filtrados.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="[DOC]"
            title={safe.length===0?'Nenhum material disponivel':'Nenhum resultado'}
            sub={safe.length===0?'Seus professores adicionarao materiais em breve':'Tente outra busca ou filtro'}
          />
        </div>
      ) : (
        <div>
          {CATS.map(function(cat){
            return (
              <Accordion key={cat.key} cat={cat} itens={porCat[cat.key]||[]} modo={modo} discMap={discMap} />
            );
          })}
        </div>
      )}
    </>
  );
}

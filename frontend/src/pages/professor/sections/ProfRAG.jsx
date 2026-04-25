/**
 * ProfRAG — Gerenciador de Documentos RAG
 * Professor faz upload de documentos oficiais → IA usa como base para respostas e questões
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { EmptyState } from '../../../components/ui';

const TIPOS_DOC = [
  { id:'lei',         icon:'⚖️',  label:'Lei / Decreto',        cor:'#dc2626', bg:'#fef2f2' },
  { id:'diretriz',    icon:'📋',  label:'Diretriz / Normativa',  cor:'#7c3aed', bg:'#faf5ff' },
  { id:'bncc',        icon:'🏫',  label:'BNCC / Currículo',      cor:'#0284c7', bg:'#f0f9ff' },
  { id:'artigo',      icon:'📄',  label:'Artigo Científico',     cor:'#059669', bg:'#f0fdf4' },
  { id:'livro',       icon:'📚',  label:'Livro / Apostila',      cor:'#d97706', bg:'#fffbeb' },
  { id:'manual',      icon:'📖',  label:'Manual / Guia',         cor:'#0891b2', bg:'#ecfeff' },
  { id:'outro',       icon:'📎',  label:'Outro Documento',       cor:'#64748b', bg:'#f1f5f9' },
];

const CATEGORIAS = ['Educação', 'Tecnologia', 'Saúde', 'Direito', 'Administração', 'Engenharia', 'Pedagogia', 'Outro'];

const fmtSize = b => !b ? '' : b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';
const fmtChars = n => !n ? '–' : n >= 1000 ? (n/1000).toFixed(1)+'K chars' : n+' chars';

function TipoBadge({ tipo }) {
  const t = TIPOS_DOC.find(x => x.id === tipo) || TIPOS_DOC.at(-1);
  return (
    <span style={{ padding:'2px 8px', borderRadius:50, fontSize:11, fontWeight:600, background:t.bg, color:t.cor, border:'1px solid '+t.cor+'40', whiteSpace:'nowrap' }}>
      {t.icon} {t.label}
    </span>
  );
}

// ── Modal Upload ──────────────────────────────────────────────
function ModalUpload({ disciplinas, onClose, onSalvo }) {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    titulo:'', descricao:'', disciplina_id: disciplinas[0]?.id||'',
    tipo_documento:'artigo', categoria:'Educação', tags:''
  });
  const [arquivo, setArquivo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const ACCEPT = '.pdf,.doc,.docx,.txt,.md,.json,.csv';
  const MAX_MB = 25;

  const processFile = (file) => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Arquivo excede ${MAX_MB}MB.`); return; }
    const reader = new FileReader();
    reader.onload = e => setArquivo({ base64: e.target.result, nome: file.name, tipo: file.type, tamanho: file.size });
    reader.readAsDataURL(file);
  };

  const salvar = async () => {
    if (!form.titulo.trim()) return setError('Título obrigatório.');
    if (!form.disciplina_id) return setError('Selecione uma disciplina.');
    if (!arquivo) return setError('Selecione um arquivo.');
    setUploading(true); setError('');
    setProgress('Extraindo texto do documento...');
    try {
      const r = await api.post('/rag/upload', {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t=>t.trim()) : [],
        base64: arquivo.base64, fileName: arquivo.nome, mimeType: arquivo.tipo, tamanho: arquivo.tamanho,
      }, { timeout: 180000 }); // 3 min para PDFs grandes
      const q = r.data.qualidade_extracao || 0;
      const qIcon = q >= 70 ? '✅' : q >= 40 ? '⚠️' : '🔴';
      setProgress(qIcon+' Indexado! '+r.data.total_chunks+' trechos · qualidade '+q+'%');
      onSalvo(r.data);
      setTimeout(() => { onClose(); }, 1800);
    } catch(e) {
      const err = e.response?.data;
      if (err?.dicas) {
        setError(err.error + ' — ' + err.dicas[0]);
      } else {
        setError(err?.error || 'Erro ao processar documento.');
      }
    }
    setUploading(false); setProgress('');
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,27,53,.65)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'1.5rem',overflowY:'auto',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white',borderRadius:18,width:'100%',maxWidth:680,margin:'0 auto',boxShadow:'0 16px 60px rgba(15,27,53,.3)',overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',padding:'1.25rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',color:'white' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)',fontSize:18,fontWeight:700 }}>📤 Adicionar Documento à Base RAG</div>
            <div style={{ fontSize:12,opacity:.6,marginTop:3 }}>O documento será processado e indexado para uso pela IA</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.12)',border:'none',color:'white',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:'1.5rem',maxHeight:'80vh',overflowY:'auto' }}>
          {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}
          {progress && (
            <div style={{ background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'10px 14px',marginBottom:'1rem',fontSize:13,color:'#15803d',display:'flex',gap:8,alignItems:'center' }}>
              <div className="spinner" style={{ width:16,height:16,borderWidth:2,margin:0 }} />{progress}
            </div>
          )}

          {/* Zona de upload */}
          <div
            onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !arquivo && fileRef.current?.click()}
            style={{ border:'2px dashed '+(dragging?'var(--emerald)':arquivo?'var(--emerald)':'var(--slate-200)'), borderRadius:12, padding:'1.5rem', textAlign:'center', cursor:arquivo?'default':'pointer', background:dragging?'rgba(16,185,129,.04)':arquivo?'rgba(16,185,129,.02)':'var(--slate-50)', marginBottom:'1.25rem', transition:'all .15s' }}>
            {arquivo ? (
              <div style={{ display:'flex',alignItems:'center',gap:12,textAlign:'left' }}>
                <span style={{ fontSize:32 }}>{arquivo.tipo?.includes('pdf')?'📄':arquivo.tipo?.includes('word')?'📝':'📎'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600,color:'var(--navy)',fontSize:13 }}>{arquivo.nome}</div>
                  <div style={{ fontSize:11,color:'var(--slate-400)',marginTop:2 }}>{fmtSize(arquivo.tamanho)} · {arquivo.tipo}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();setArquivo(null);}} style={{ padding:'4px 10px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:6,color:'#b91c1c',cursor:'pointer',fontSize:11 }}>✕ Trocar</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize:40,marginBottom:8 }}>📄</div>
                <div style={{ fontWeight:600,fontSize:13,color:'var(--slate-600)',marginBottom:4 }}>Arraste um arquivo ou clique para selecionar</div>
                <div style={{ fontSize:12,color:'var(--slate-400)' }}>PDF, DOC, DOCX, TXT, MD — Máx {MAX_MB}MB</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} style={{ display:'none' }} onChange={e=>processFile(e.target.files[0])} />

          <div className="field">
            <label>Título do Documento <span style={{color:'var(--coral)'}}>*</span></label>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="ex: Lei de Diretrizes e Bases da Educação Nacional — LDB 9394/96" />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="field">
              <label>Disciplina <span style={{color:'var(--coral)'}}>*</span></label>
              <select value={form.disciplina_id} onChange={e=>setForm(f=>({...f,disciplina_id:e.target.value}))} style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,outline:'none' }}>
                {disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tipo de Documento</label>
              <select value={form.tipo_documento} onChange={e=>setForm(f=>({...f,tipo_documento:e.target.value}))} style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,outline:'none' }}>
                {TIPOS_DOC.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,outline:'none' }}>
                {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tags (separadas por vírgula)</label>
              <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="lei, bncc, pedagogia, 2024..." />
            </div>
          </div>

          <div className="field">
            <label>Descrição (opcional)</label>
            <textarea rows={2} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Breve descrição do conteúdo e aplicabilidade do documento..."
              style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:13,resize:'vertical',outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />
          </div>

          <button onClick={salvar} disabled={uploading||!arquivo||!form.titulo.trim()}
            style={{ width:'100%',padding:'13px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:10,fontWeight:700,fontSize:15,cursor:'pointer',opacity:uploading||!arquivo||!form.titulo.trim()?0.5:1,boxShadow:'0 4px 16px rgba(16,185,129,.35)' }}>
            {uploading ? '⏳ Processando...' : '🚀 Indexar Documento na Base RAG'}
          </button>

          <div style={{ marginTop:10,fontSize:11,color:'var(--slate-400)',textAlign:'center' }}>
            O texto será extraído, dividido em trechos e indexado. A IA usará esses trechos automaticamente ao responder perguntas da disciplina selecionada.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview de contextos ───────────────────────────────────────
function PreviewModal({ doc, onClose }) {
  const [contextos, setCtxs] = useState([]);
  const [busca, setBusca]    = useState('');
  const [result, setResult]  = useState(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    // Carregar TODOS os contextos do documento via endpoint dedicado
    api.get('/rag/'+doc.id+'/contextos')
      .then(r => setCtxs(r.data.contextos||[]))
      .catch(console.error);
  }, [doc.id]);

  const testarBusca = async () => {
    if (!busca.trim()) return;
    setBuscando(true);
    const r = await api.get(`/rag/search?query=${encodeURIComponent(busca)}&disciplina_id=${doc.disciplina_id}&topK=3`);
    setResult(r.data.contextos||[]);
    setBuscando(false);
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,27,53,.65)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'1.5rem',overflowY:'auto',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white',borderRadius:18,width:'100%',maxWidth:720,margin:'0 auto',boxShadow:'0 16px 60px rgba(15,27,53,.3)',overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',padding:'1.25rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',color:'white' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)',fontSize:16,fontWeight:700 }}>🔍 Preview RAG — {doc.titulo}</div>
            <div style={{ fontSize:12,opacity:.6,marginTop:2 }}>Visualize os trechos indexados e teste a busca semântica</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.12)',border:'none',color:'white',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:'1.25rem',maxHeight:'80vh',overflowY:'auto' }}>
          {/* Teste de busca */}
          <div style={{ background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'12px 14px',marginBottom:'1rem' }}>
            <div style={{ fontWeight:600,fontSize:12,color:'#15803d',marginBottom:8 }}>🧪 Testar Busca Semântica</div>
            <div style={{ display:'flex',gap:8 }}>
              <input value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==='Enter'&&testarBusca()} placeholder="Digite uma pergunta para ver quais trechos a IA usaria..."
                style={{ flex:1,padding:'8px 12px',border:'1.5px solid #86efac',borderRadius:7,fontSize:13,outline:'none' }} />
              <button onClick={testarBusca} disabled={buscando||!busca.trim()} style={{ padding:'8px 16px',background:'var(--emerald)',color:'white',border:'none',borderRadius:7,cursor:'pointer',fontWeight:600,fontSize:12 }}>
                {buscando?'...':'Buscar'}
              </button>
            </div>
          </div>

          {result && (
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontWeight:600,fontSize:12,color:'var(--navy)',marginBottom:8 }}>Trechos retornados ({result.length}):</div>
              {result.map((c,i) => (
                <div key={i} style={{ background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 12px',marginBottom:6 }}>
                  <div style={{ fontSize:11,fontWeight:600,color:'#92400e',marginBottom:4 }}>📍 {c.titulo}</div>
                  <div style={{ fontSize:12,color:'#1e293b',lineHeight:1.6 }}>{c.conteudo?.slice(0,300)}{c.conteudo?.length>300?'...':''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Todos os chunks */}
          <div style={{ fontWeight:600,fontSize:13,color:'var(--navy)',marginBottom:8 }}>
            📋 Todos os trechos indexados ({contextos.length})
          </div>
          {contextos.map((c,i) => (
            <div key={i} style={{ background:'var(--slate-50)',border:'1px solid var(--slate-200)',borderRadius:8,padding:'10px 12px',marginBottom:6 }}>
              <div style={{ fontSize:11,fontWeight:600,color:'var(--slate-500)',marginBottom:4 }}>📍 {c.titulo}</div>
              <div style={{ fontSize:12,color:'var(--slate-700)',lineHeight:1.6 }}>{c.conteudo?.slice(0,250)}{c.conteudo?.length>250?'...':''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function ProfRAG() {
  const { user }             = useAuth();
  const [docs, setDocs]      = useState([]);
  const [stats, setStats]    = useState(null);
  const [discs, setDiscs]    = useState([]);
  const [loading, setLd]     = useState(true);
  const [showUpload, setUpload] = useState(false);
  const [preview, setPreview]  = useState(null);
  const [filtroDisc, setFiltro] = useState('');
  const [alert, setAlert]    = useState(null);

  const load = async () => {
    try {
      const [dRes, sRes, discRes] = await Promise.all([
        api.get('/rag'),
        api.get('/rag/stats'),
        api.get('/disciplinas?professor_id='+user.id),
      ]);
      setDocs(dRes.data.documentos||[]);
      setStats(sRes.data);
      setDiscs(discRes.data.disciplinas||[]);
    } catch(e){ console.error(e); }
    setLd(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover documento e todos os seus trechos indexados?')) return;
    await api.delete('/rag/'+id);
    setDocs(prev => prev.filter(d => d.id !== id));
    setAlert({ type:'success', msg:'Documento removido.' });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleReindexar = async (id) => {
    const r = await api.post('/rag/'+id+'/reindexar');
    setAlert({ type:'success', msg:'✅ '+r.data.message });
    load();
    setTimeout(() => setAlert(null), 4000);
  };

  const onSalvo = (data) => {
    const palavras = data.total_palavras ? ` · ${data.total_palavras} palavras` : '';
    const msg = `✅ ${data.message} (${data.total_chunks} trechos${palavras})`;
    setAlert({ type: data.aviso ? 'error' : 'success', msg: data.aviso ? '⚠️ '+data.aviso : msg });
    load();
    setTimeout(() => setAlert(null), 8000);
  };

  const filtered = docs.filter(d => !filtroDisc || String(d.disciplina_id) === filtroDisc);

  return (
    <>
      <div className="page-header">
        <div className="page-title">🧠 Base de Conhecimento RAG</div>
        <div className="page-sub">Documentos oficiais que a IA usa como referência para responder alunos e gerar questões</div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'0.875rem',marginBottom:'1.5rem' }}>
          {[
            { l:'Documentos', v:stats.total_documentos, icon:'📄', cor:'var(--sky)' },
            { l:'Trechos Indexados', v:stats.total_chunks, icon:'🔍', cor:'var(--emerald)' },
            { l:'Total de Texto', v:fmtChars(stats.total_caracteres), icon:'📊', cor:TIPOS_DOC[0].cor },
          ].map(s => (
            <div key={s.l} style={{ background:'white',border:'1px solid var(--slate-200)',borderRadius:12,padding:'1rem',boxShadow:'var(--shadow)' }}>
              <div style={{ fontSize:22,marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-head)',fontSize:24,fontWeight:700,color:s.cor }}>{s.v}</div>
              <div style={{ fontSize:11,color:'var(--slate-400)',textTransform:'uppercase',letterSpacing:.5 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Como funciona */}
      <div style={{ background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)',border:'1px solid #bae6fd',borderRadius:12,padding:'1rem 1.25rem',marginBottom:'1.5rem' }}>
        <div style={{ fontWeight:700,color:'#0284c7',marginBottom:6,fontSize:13 }}>💡 Como funciona o RAG (Retrieval-Augmented Generation)</div>
        <div style={{ fontSize:12,color:'#1e293b',lineHeight:1.8 }}>
          <strong>1. Upload</strong> → Faça upload de PDFs, artigos, leis, BNCC, livros, manuais.<br/>
          <strong>2. Indexação</strong> → O sistema extrai o texto (usando pdf-parse + IA para limpeza) e divide em trechos.<br/>
          <strong>3. Busca Semântica</strong> → Quando o aluno pergunta, o sistema recupera os trechos mais relevantes por TF-IDF.<br/>
          <strong>4. Resposta contextualizada</strong> → O GPT-4o-mini responde <em>baseado nos seus documentos</em>, citando a fonte.<br/>
          <strong>5. Questões</strong> → Ao gerar questões com IA, os documentos são usados como base de referência.<br/>
          <span style={{color:'#0284c7'}}>💡 <strong>Dica:</strong> Use <strong>.txt</strong> ou <strong>.docx</strong> para qualidade máxima. PDFs com texto selecionável também funcionam bem.</span>
        </div>
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center' }}>
        <select value={filtroDisc} onChange={e=>setFiltro(e.target.value)} style={{ padding:'8px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:13,outline:'none',flex:'1 1 200px' }}>
          <option value="">📚 Todas as disciplinas ({docs.length})</option>
          {discs.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <button onClick={()=>setUpload(true)} style={{ padding:'10px 20px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 3px 10px rgba(16,185,129,.3)',whiteSpace:'nowrap' }}>
          📤 Adicionar Documento
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center',padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center',padding:'3rem' }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🧠</div>
          <div style={{ fontWeight:600,color:'var(--navy)',fontSize:16,marginBottom:8 }}>Base de Conhecimento vazia</div>
          <div style={{ color:'var(--slate-400)',fontSize:14,marginBottom:16 }}>Adicione documentos oficiais para que a IA possa responder com precisão</div>
          <button onClick={()=>setUpload(true)} style={{ padding:'10px 24px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:600,cursor:'pointer' }}>
            📤 Adicionar Primeiro Documento
          </button>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'0.875rem' }}>
          {filtered.map(doc => {
            const discNome = discs.find(d=>d.id===doc.disciplina_id)?.nome;
            return (
              <div key={doc.id} style={{ background:'white',border:'1px solid var(--slate-200)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow)' }}>
                <div style={{ height:3,background:'linear-gradient(90deg,var(--emerald),#34d399)' }} />
                <div style={{ padding:'1rem 1.25rem' }}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:14 }}>
                    <div style={{ width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>
                      {TIPOS_DOC.find(t=>t.id===doc.tipo_documento)?.icon||'📎'}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-head)',fontSize:14,fontWeight:600,color:'var(--navy)' }}>{doc.titulo}</span>
                        <TipoBadge tipo={doc.tipo_documento} />
                      </div>
                      {doc.descricao && <div style={{ fontSize:12,color:'var(--slate-500)',marginBottom:6 }}>{doc.descricao}</div>}
                      <div style={{ display:'flex',gap:10,fontSize:11,color:'var(--slate-400)',flexWrap:'wrap' }}>
                        {discNome && <span>📚 {discNome}</span>}
                        <span>📄 {doc.fileName}</span>
                        {doc.tamanho && <span>💾 {fmtSize(doc.tamanho)}</span>}
                        {doc.total_chunks > 0 && <span style={{ fontWeight:600,color:'var(--emerald-dark)' }}>🔍 {doc.total_chunks} trechos</span>}
                        {doc.qualidade_extracao != null && <span style={{ fontWeight:600,color:doc.qualidade_extracao>=70?'#059669':doc.qualidade_extracao>=40?'#d97706':'#dc2626' }}>{'·'} {doc.qualidade_extracao}% qualidade</span>}
                        {doc.total_caracteres && <span>{fmtChars(doc.total_caracteres)}</span>}
                        {(doc.tags||[]).length > 0 && <span>🏷️ {doc.tags.slice(0,3).join(', ')}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,flexShrink:0,flexWrap:'wrap' }}>
                      <button onClick={()=>setPreview(doc)} style={{ padding:'6px 12px',background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:7,color:'#0284c7',cursor:'pointer',fontSize:11,fontWeight:600 }}>🔍 Preview</button>
                      <button onClick={()=>handleReindexar(doc.id)} style={{ padding:'6px 12px',background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.3)',borderRadius:7,color:'var(--emerald-dark)',cursor:'pointer',fontSize:11,fontWeight:600 }}>🔄 Reindexar</button>
                      <button onClick={()=>handleDelete(doc.id)} style={{ padding:'6px 12px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:7,color:'#b91c1c',cursor:'pointer',fontSize:11,fontWeight:600 }}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && <ModalUpload disciplinas={discs} onClose={()=>setUpload(false)} onSalvo={onSalvo} />}
      {preview && <PreviewModal doc={preview} onClose={()=>setPreview(null)} />}
    </>
  );
}

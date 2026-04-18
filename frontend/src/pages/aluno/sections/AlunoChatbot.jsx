/**
 * AlunoChatbot - Lumi, Assistente Virtual RSC Academy
 * Modo RAG (padrao) + Modo Web (toggle manual) + ChatPDF upload
 * 100% ASCII - no emojis in source (SVG icons only)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { renderMd } from './chatMarkdown.js';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';

// ?? SVG Icons (100% ASCII, no emoji) ?????????????????????????
const IconBook = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);
const IconGlobe = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <path d="M2 12h20"/>
  </svg>
);
const IconPaperclip = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const IconSend = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>
  </svg>
);
const IconBot = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
  </svg>
);
const IconUser = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
);
const IconRefresh = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);
const IconMix = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
  </svg>
);
const IconSpinner = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" style={{ animation: 'spin 0.8s linear infinite', transformOrigin: '50% 50%' }}/>
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </svg>
);

// ?? Source badge ??????????????????????????????????????????????
function SourceBadge({ modoFonte, chunksUsados, usouEmbeddings, modoArquivo }) {
  const badges = {
    rag:     { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: <IconBook size={11} color="#059669"/>, label: 'Fonte: Base interna (RAG)' },
    web:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: <IconGlobe size={11} color="#1d4ed8"/>, label: 'Fonte: Busca na web' },
    hibrido: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', icon: <IconMix size={11} color="#6d28d9"/>, label: 'Fonte: RAG + Web' },
  };
  const cfg = modoArquivo
    ? { bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: <IconPaperclip size={11} color="#92400e"/>, label: 'Fonte: Arquivo' }
    : badges[modoFonte] || badges.rag;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 700, background: cfg.bg, color: cfg.color, border: '1px solid ' + cfg.border }}>
        {cfg.icon} {cfg.label}
      </span>
      {chunksUsados > 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>{chunksUsados} trecho{chunksUsados > 1 ? 's' : ''}</span>}
      {usouEmbeddings && <span style={{ fontSize: 10, color: '#94a3b8' }}>busca semantica</span>}
    </div>
  );
}

// ?? Message bubble ????????????????????????????????????????????
function MsgBubble({ msg, userFoto }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '4px 0', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>

      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'linear-gradient(135deg,#1e3a5f,#2d5a9e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,.15)', overflow: 'hidden',
      }}>
        {isUser && userFoto
          ? <img src={userFoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : isUser ? <IconUser size={16} color="white"/> : <IconBot size={16} color="white"/>
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%', padding: '11px 15px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background: isUser ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'white',
        color: isUser ? 'white' : '#1e293b',
        boxShadow: '0 2px 10px rgba(0,0,0,.07)',
        border: isUser ? 'none' : '1px solid #e2e8f0',
        fontSize: 14, lineHeight: 1.65,
      }}>
        {/* Content */}
        {msg.loading ? (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1.4s ease infinite', animationDelay: i * 0.2 + 's' }}/>
            ))}
          </div>
        ) : msg.isFile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconPaperclip size={20} color="white"/>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{msg.fileName}</div>
              <div style={{ fontSize: 11, opacity: .7 }}>{msg.info}</div>
            </div>
          </div>
        ) : isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }}/>
        )}

        {/* Fontes RAG */}
        {!isUser && !msg.loading && (msg.fontes?.length > 0) && (msg.modo_fonte === 'rag' || msg.modo_fonte === 'hibrido') && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 2 }}>Documentos:</span>
            {msg.fontes.map((f,i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{f}</span>
            ))}
          </div>
        )}

        {/* Fontes Web */}
        {!isUser && !msg.loading && msg.modo_fonte === 'web' && msg.fontes_web?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 2 }}>Sites:</span>
            {msg.fontes_web.slice(0,4).map((f,i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>{f}</span>
            ))}
          </div>
        )}

        {/* Source badge */}
        {!isUser && !msg.loading && (msg.modo_fonte || msg.modoArquivo) && (
          <SourceBadge modoFonte={msg.modo_fonte} chunksUsados={msg.chunks_usados} usouEmbeddings={msg.usou_embeddings} modoArquivo={msg.modoArquivo}/>
        )}
      </div>
    </div>
  );
}

// ?? Web toggle button ?????????????????????????????????????????
function WebToggle({ active, onClick }) {
  return (
    <button onClick={onClick} title={active ? 'Modo Web ativo - clique para voltar ao RAG' : 'Clique para buscar na web'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 99, border: '1.5px solid',
        cursor: 'pointer', fontSize: 12, fontWeight: 700,
        transition: 'all .2s',
        background:   active ? '#1d4ed8' : 'white',
        color:        active ? 'white'   : '#475569',
        borderColor:  active ? '#1d4ed8' : '#e2e8f0',
        boxShadow:    active ? '0 2px 10px rgba(29,78,216,.3)' : 'none',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.color='#1d4ed8'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#475569'; }}}
    >
      <IconGlobe size={13} color={active ? 'white' : '#475569'}/>
      {active ? 'Web ativo' : 'Buscar na Web'}
    </button>
  );
}

// ?? Main component ????????????????????????????????????????????
export default function AlunoChatbot() {
  const { user } = useAuth();
  const [msgs, setMsgs]               = useState([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [disciplinas, setDiscs]       = useState([]);
  const [discId, setDiscId]           = useState('');
  const [discNome, setDiscNome]       = useState('');
  const [loadingDiscs, setLdDiscs]    = useState(true);
  const [indexando, setIndexando]     = useState(false);
  const [modoWeb, setModoWeb]         = useState(false);   // manual web toggle
  const [modoArquivo, setModoArquivo] = useState(false);
  const [arquivoKey, setArquivoKey]   = useState(null);
  const [arquivoNome, setArqNome]     = useState('');
  const [uploadingFile, setUpFile]    = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Load disciplinas
  useEffect(() => {
    api.get('/assistente/disciplinas')
      .then(r => {
        const d = r.data.disciplinas || [];
        setDiscs(d);
        if (d.length > 0) { setDiscId(String(d[0].id)); setDiscNome(d[0].nome); }
      })
      .catch(() => setDiscs([]))
      .finally(() => setLdDiscs(false));
  }, []);

  // Welcome message
  useEffect(() => {
    if (!loadingDiscs) {
      setMsgs([{ id: 1, role: 'assistant',
        content: disciplinas.length > 0
          ? '\u2728\uD83E\uDD16 Ol\u00e1, **' + (user?.nome?.split(' ')[0] || 'aluno') + '**! Eu sou a **Lumi**, sua assistente virtual.\n\n\uD83D\uDCCE **Envie arquivos facilmente:**\nUse o clipe para anexar documentos, imagens ou atividades e conversar sobre eles.\n\n\uD83C\uDF10 **Pesquise na internet:**\nAtive o modo **Buscar na Web** para encontrar informa\u00e7\u00f5es atualizadas rapidamente.\n\n\uD83D\uDCAC Estou pronta para ajudar voc\u00ea! \uD83D\uDE0A'
          : '\u2728\uD83E\uDD16 Ol\u00e1! Eu sou a **Lumi**, sua assistente virtual.\n\n\uD83D\uDCCE **Envie arquivos facilmente:**\nUse o clipe para anexar documentos, imagens ou atividades e conversar sobre eles.\n\n\uD83C\uDF10 **Pesquise na internet:**\nAtive o modo **Buscar na Web** para encontrar informa\u00e7\u00f5es atualizadas rapidamente.\n\n\uD83D\uDCAC Estou pronta para ajudar voc\u00ea! \uD83D\uDE0A',
      }]);
    }
  }, [loadingDiscs]);

  // ?? File upload ????????????????????????????????????????????
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) {
      setMsgs(p => [...p, { id: Date.now(), role: 'assistant', content: 'Arquivo muito grande. Maximo 10MB.' }]);
      return;
    }
    setUpFile(true);
    const uploadMsg = { id: Date.now(), role: 'user', isFile: true, fileName: file.name, info: 'Processando...' };
    setMsgs(p => [...p, uploadMsg, { id: Date.now()+1, role: 'assistant', loading: true }]);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = ev => res(ev.target.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await api.post('/assistente/upload', {
        base64, mimeType: file.type, fileName: file.name,
        disciplina_id: discId ? Number(discId) : undefined,
      });
      setArquivoKey('temp_chat_' + user.id);
      setArqNome(file.name);
      setModoArquivo(true);
      setMsgs(p => {
        const arr = p.filter(m => !m.loading);
        return [...arr, { id: Date.now()+2, role: 'assistant',
          content: 'Arquivo **' + file.name + '** processado! ' + r.data.message + '\n\nAgora me pergunte qualquer coisa sobre o conteudo deste arquivo.',
          fontes: [file.name], chunks_usados: r.data.chunks, modoArquivo: true,
        }];
      });
    } catch(e) {
      const err = e.response?.data?.error || 'Erro ao processar arquivo.';
      setMsgs(p => p.slice(0,-1).concat([{ id: Date.now()+2, role: 'assistant', content: 'Erro: ' + err }]));
    } finally { setUpFile(false); }
  };

  // ?? Send message ???????????????????????????????????????????
  const enviar = useCallback(async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    setInput('');
    setMsgs(p => [...p,
      { id: Date.now(), role: 'user', content: texto },
      { id: Date.now()+1, role: 'assistant', loading: true },
    ]);
    setLoading(true);

    try {
      let res;
      if (modoArquivo && arquivoKey) {
        res = await api.post('/assistente/chat-arquivo', {
          mensagem: texto, sessionKey: arquivoKey,
          disciplina_id: discId ? Number(discId) : undefined,
        });
      } else {
        // Send mode: 'web' forces web search, 'rag' forces RAG only
        res = await api.post('/assistente/chat', {
          mensagem: texto,
          disciplina_id: discId ? Number(discId) : undefined,
          modo: modoWeb ? 'web' : 'rag',
        });
      }
      // Reset web toggle after each send (one-shot)
      setModoWeb(false);

      setMsgs(p => p.slice(0,-1).concat([{
        id: Date.now()+2, role: 'assistant',
        content:         res.data.resposta,
        fontes:          res.data.fontes || [],
        fontes_web:      res.data.fontes_web || [],
        chunks_usados:   res.data.chunks_usados || 0,
        usou_embeddings: res.data.usou_embeddings,
        modo_fonte:      res.data.modo_fonte || (modoArquivo ? 'arquivo' : 'rag'),
        modoArquivo,
      }]));
    } catch(e) {
      const status = e.response?.status;
      const err = e.response?.data?.error || e.message || 'Erro ao conectar.';
      let msg;
      if (status === 401)        msg = 'Chave de API invalida. Contate o administrador.';
      else if (status === 402)   msg = 'Creditos da IA esgotados.';
      else if (status === 429)   msg = 'Limite de requisicoes atingido. Aguarde alguns instantes.';
      else if (status === 503)   msg = 'IA nao configurada. Verifique OPENAI_API_KEY ou GEMINI_API_KEY.';
      else if (status === 504)   msg = 'A IA demorou demais. Tente novamente.';
      else                       msg = 'Erro: ' + err;
      setMsgs(p => p.slice(0,-1).concat([{ id: Date.now()+2, role: 'assistant', content: msg }]));
    } finally { setLoading(false); inputRef.current?.focus(); }
  }, [input, loading, discId, modoWeb, modoArquivo, arquivoKey]);

  const limpar = async () => {
    await api.delete('/assistente/sessao').catch(() => {});
    setModoArquivo(false); setArquivoKey(null); setArqNome(''); setModoWeb(false);
    setMsgs([{ id: Date.now(), role: 'assistant', content: 'Sessao reiniciada! Como posso ajudar?' }]);
  };

  const indexar = async () => {
    setIndexando(true);
    try {
      const r = await api.post('/assistente/indexar?disciplina_id=' + discId);
      setMsgs(p => [...p, { id: Date.now(), role: 'assistant', content: 'OK: ' + r.data.message + '\n\nBusca semantica ativada!' }]);
    } catch(e) { alert(e.response?.data?.error || 'Erro.'); }
    setIndexando(false);
  };

  const discAtual = disciplinas.find(d => String(d.id) === discId);

  // Mode indicator for status bar
  const modeStatus = modoArquivo ? 'Modo ChatPDF - ' + arquivoNome
    : modoWeb ? 'Proximo envio: busca na web'
    : discAtual?.embeddings_prontos ? 'Busca semantica ativa (RAG)'
    : 'Busca por palavras-chave (RAG)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 500 }}>

      {/* ?? Header ?? */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', color: 'white', padding: '12px 16px', borderRadius: '12px 12px 0 0' }}>

        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconBot size={18} color="white"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:16 }}>&#10024;</span> Lumi</div>
            <div style={{ fontSize: 11, opacity: .6, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Assistente Virtual</span><span>|</span><span>RSC Academy</span>
              {modoArquivo && <><span>|</span><span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}><IconPaperclip size={10} color="#fbbf24"/>{arquivoNome}</span></>}
              {modoWeb && <><span>|</span><span style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 3 }}><IconGlobe size={10} color="#93c5fd"/> Web</span></>}
            </div>
          </div>
          <button onClick={limpar} style={{ padding: '5px 10px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconRefresh size={11} color="white"/> Nova
          </button>
        </div>

        {/* Row 2: Disciplina selector */}
        {disciplinas.length > 0 && !modoArquivo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={discId} onChange={e => {
              const d = disciplinas.find(x => String(x.id) === e.target.value);
              setDiscId(e.target.value); setDiscNome(d?.nome || '');
            }} style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: 'white', fontSize: 12, cursor: 'pointer' }}>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id} style={{ color: '#1e293b', background: 'white' }}>
                  {d.nome} ({d.total_chunks || 0} trechos{d.embeddings_prontos ? ' *' : ''})
                </option>
              ))}
            </select>
            {discAtual && !discAtual.embeddings_prontos && (discAtual.total_chunks || 0) > 0 && (
              <button onClick={indexar} disabled={indexando} style={{ padding: '6px 12px', background: '#f59e0b', color: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {indexando ? 'Indexando...' : 'Ativar Semantica'}
              </button>
            )}
          </div>
        )}

        {/* ChatPDF mode active banner */}
        {modoArquivo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,.15)', borderRadius: 8, padding: '6px 12px', border: '1px solid rgba(245,158,11,.3)' }}>
            <IconPaperclip size={13} color="#fbbf24"/>
            <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Modo ChatPDF: {arquivoNome}</span>
            <button onClick={() => { setModoArquivo(false); setArquivoKey(null); setArqNome(''); }} style={{ marginLeft: 'auto', padding: '2px 8px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 6, color: 'white', fontSize: 11, cursor: 'pointer' }}>
              Sair
            </button>
          </div>
        )}
      </div>

      {/* ?? Messages ?? */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map(msg => <MsgBubble key={msg.id} msg={msg} userFoto={user?.foto}/>)}
        <div ref={bottomRef}/>
      </div>

      {/* ?? Input area ?? */}
      <div style={{ padding: '12px 14px', background: 'white', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px' }}>

        {/* Quick suggestions */}
        {msgs.length <= 2 && disciplinas.length > 0 && !modoArquivo && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {['Qual o tema principal?', 'Resuma o conteudo', 'Quais os conceitos-chave?'].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 99, background: 'white', fontSize: 11, color: '#475569', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >{q}</button>
            ))}
          </div>
        )}

        {/* Web toggle + input row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 6, flexWrap: 'nowrap', width: '100%' }}>
          {/* Web toggle button */}
          {!modoArquivo && <WebToggle active={modoWeb} onClick={() => setModoWeb(v => !v)}/>}

          {/* Text input */}
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder={
              modoArquivo ? ('Pergunte sobre "' + arquivoNome + '"...')
              : modoWeb    ? 'Pesquisar na web...'
              : discId     ? ('Pergunte sobre ' + discNome + ' (documentos)...')
              : 'Selecione uma disciplina ou ative busca web...'
            }
            disabled={loading}
            rows={1}
            style={{ flex: '1 1 0', minWidth: 0, padding: '10px 12px', border: '1.5px solid ' + (modoWeb ? '#3b82f6' : '#e2e8f0'), borderRadius: 10, fontSize: 14, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto', background: modoWeb ? '#eff6ff' : 'white', width: '100%' }}
            onFocus={e => e.target.style.borderColor = modoWeb ? '#1d4ed8' : '#3b82f6'}
            onBlur={e => e.target.style.borderColor = modoWeb ? '#3b82f6' : '#e2e8f0'}
          />

          {/* Attach button */}
          <button onClick={() => fileRef.current?.click()} disabled={uploadingFile}
            title="Enviar arquivo para analise (ChatPDF)"
            style={{ width: 38, height: 38, border: '1px solid ' + (modoArquivo ? '#f59e0b' : '#e2e8f0'), borderRadius: 10, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: modoArquivo ? '#f59e0b' : '#475569', transition: 'all .15s', boxSizing: 'border-box' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = modoArquivo ? '#f59e0b' : '#e2e8f0'; e.currentTarget.style.color = modoArquivo ? '#f59e0b' : '#475569'; }}
          >
            {uploadingFile ? <IconSpinner size={16}/> : <IconPaperclip size={16}/>}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.html" style={{ display: 'none' }} onChange={handleFileUpload}/>

          {/* Send button */}
          <button onClick={enviar} disabled={!input.trim() || loading} style={{
            width: 38, height: 38, border: 'none', borderRadius: 10, flexShrink: 0, boxSizing: 'border-box',
            background: !input.trim() || loading ? '#e2e8f0' : modoWeb ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'linear-gradient(135deg,#059669,#047857)',
            color: !input.trim() || loading ? '#94a3b8' : 'white',
            cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: !input.trim() || loading ? 'none' : '0 2px 10px rgba(0,0,0,.2)',
          }}>
            {loading ? <IconSpinner size={16}/> : <IconSend size={14}/>}
          </button>
        </div>

        {/* Status bar */}
        <div style={{ fontSize: 11, color: modoWeb ? '#1d4ed8' : '#94a3b8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {modoWeb ? <IconGlobe size={11} color="#1d4ed8"/> : <IconBook size={11} color="#94a3b8"/>}
          {modeStatus}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity:.3; transform:scale(.8); }
          50% { opacity:1; transform:scale(1.2); }
        }
      `}</style>
    </div>
  );
}

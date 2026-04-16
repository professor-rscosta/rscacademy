/**
 * AlunoChatbot - Assistente Virtual + ChatPDF
 * RAG por disciplina + upload de arquivo no chat
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { renderMd } from './chatMarkdown.js';


// -- Avatar ----------------------------------------------------
function ChatAvatar({ isUser, foto }) {
  return (
    <div style={{
      width:36, height:36, borderRadius:'50%', flexShrink:0,
      background: isUser ? (foto ? `url(${foto}) center/cover` : 'linear-gradient(135deg,#3b82f6,#1d4ed8)')
                         : 'linear-gradient(135deg,#1e3a5f,#2d5a9e)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: foto ? 0 : 18, color:'white', fontWeight:700,
      boxShadow:'0 2px 8px rgba(0,0,0,.15)',
    }}>
      {!foto && (isUser ? 'U' : 'AI')}
    </div>
  );
}

// -- Bolha de mensagem -----------------------------------------
function MsgBubble({ msg, userFoto }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display:'flex', gap:10, padding:'4px 0',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems:'flex-start',
    }}>
      <ChatAvatar isUser={isUser} foto={isUser ? userFoto : null} />
      <div style={{
        maxWidth:'78%', padding:'11px 15px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background: isUser ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'white',
        color: isUser ? 'white' : '#1e293b',
        boxShadow:'0 2px 10px rgba(0,0,0,.07)',
        border: isUser ? 'none' : '1px solid #e2e8f0',
        fontSize:14, lineHeight:1.65,
      }}>
        {msg.loading ? (
          <div style={{ display:'flex', gap:5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:8, height:8, borderRadius:'50%', background:'#94a3b8',
                animation:'pulse 1.4s ease infinite', animationDelay:i*.2+'s',
              }} />
            ))}
          </div>
        ) : msg.isFile ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:22 }}>[ ]</span>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{msg.fileName}</div>
              <div style={{ fontSize:11, opacity:.7 }}>{msg.info}</div>
            </div>
          </div>
        ) : isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
        )}

        {/* Rodape da mensagem: fonte + documentos */}
        {!isUser && !msg.loading && (msg.modo_fonte || msg.chunks_usados > 0 || msg.modoArquivo || msg.fontes?.length > 0) && (
          <div style={{ marginTop:10, paddingTop:8, borderTop:'1px solid #f1f5f9' }}>

            {/* Badge de origem - correto por modo_fonte */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom: msg.fontes?.length > 0 ? 6 : 0 }}>
              {msg.modo_fonte === 'rag' && (
                <span style={{ fontSize:10, padding:'3px 10px', borderRadius:99, background:'#ecfdf5', color:'#059669', fontWeight:700, border:'1px solid #a7f3d0', display:'flex', alignItems:'center', gap:4 }}>
                  [RAG] Fonte: Base interna
                </span>
              )}
              {msg.modo_fonte === 'web' && (
                <span style={{ fontSize:10, padding:'3px 10px', borderRadius:99, background:'#eff6ff', color:'#1d4ed8', fontWeight:700, border:'1px solid #bfdbfe', display:'flex', alignItems:'center', gap:4 }}>
                  [Web] Fonte: Busca na web
                </span>
              )}
              {msg.modo_fonte === 'hibrido' && (
                <span style={{ fontSize:10, padding:'3px 10px', borderRadius:99, background:'#f5f3ff', color:'#6d28d9', fontWeight:700, border:'1px solid #ddd6fe', display:'flex', alignItems:'center', gap:4 }}>
                  [Hibrido] Fonte: RAG + Web
                </span>
              )}
              {msg.modoArquivo && (
                <span style={{ fontSize:10, padding:'3px 10px', borderRadius:99, background:'#fffbeb', color:'#92400e', fontWeight:700, border:'1px solid #fde68a' }}>
                  [PDF] Fonte: Arquivo
                </span>
              )}
              {msg.chunks_usados > 0 && (
                <span style={{ fontSize:10, color:'#94a3b8' }}>{msg.chunks_usados} trecho{msg.chunks_usados>1?'s':''}</span>
              )}
              {msg.usou_embeddings && (
                <span style={{ fontSize:10, color:'#94a3b8' }}> semantico</span>
              )}
            </div>

            {/* Documentos usados (apenas RAG) */}
            {(msg.modo_fonte === 'rag' || msg.modo_fonte === 'hibrido') && msg.fontes?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>Documentos:</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {msg.fontes.map((f,i) => (
                    <span key={i} style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe' }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Fontes web */}
            {msg.modo_fonte === 'web' && msg.fontes_web?.length > 0 && (
              <div>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>Sites consultados:</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {msg.fontes_web.slice(0,4).map((f,i) => (
                    <span key={i} style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'#f0f9ff', color:'#0369a1', border:'1px solid #bae6fd' }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Componente principal --------------------------------------
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
  const [modoArquivo, setModoArquivo] = useState(false);
  const [arquivoKey, setArquivoKey]   = useState(null);
  const [arquivoNome, setArqNome]     = useState('');
  const [uploadingFile, setUpFile]    = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  // Carregar disciplinas
  useEffect(() => {
    api.get('/assistente/disciplinas')
      .then(r => {
        const d = r.data.disciplinas || [];
        setDiscs(d);
        if (d.length > 0) { setDiscId(String(d[0].id)); setDiscNome(d[0].nome); }
      })
      .catch(e => {
        console.error('disciplinas error:', e);
        setDiscs([]);
      })
      .finally(() => setLdDiscs(false));
  }, []);

  // Boas-vindas
  useEffect(() => {
    if (!loadingDiscs) {
      setMsgs([{ id:1, role:'assistant',
        content: disciplinas.length > 0
          ? `Ola, **${user?.nome?.split(' ')[0]}**!\n\nSou o Assistente Virtual da RSC Academy.\n\nSelecione uma disciplina para perguntas sobre o material, ou use o botao **[F]** para enviar um arquivo e conversarmos sobre ele (modo ChatPDF).`
          : `Ola! Sou o Assistente Virtual da RSC Academy.\n\nUse o botao **[F]** abaixo para enviar um PDF, DOCX ou TXT e eu responderei perguntas sobre o conteudo!`,
      }]);
    }
  }, [loadingDiscs]);

  // -- Upload de arquivo no chat -----------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      setMsgs(p => [...p, { id:Date.now(), role:'assistant', content:'Erro: Arquivo muito grande. Maximo 10MB.' }]);
      return;
    }

    setUpFile(true);
    const uploadMsg = { id:Date.now(), role:'user', isFile:true, fileName:file.name, info:'Processando...' };
    const loadMsg   = { id:Date.now()+1, role:'assistant', loading:true };
    setMsgs(p => [...p, uploadMsg, loadMsg]);

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

      setArquivoKey(`temp_chat_${user.id}`);
      setArqNome(file.name);
      setModoArquivo(true);

      setMsgs(p => {
        const arr = p.filter(m => !m.loading);
        arr[arr.length - arr.filter(m=>m.isFile).length] = { ...uploadMsg, info:`${r.data.chunks} trechos ? ${r.data.qualidade}% qualidade` };
        return [...arr, {
          id:Date.now()+2, role:'assistant',
          content:`OK: **${file.name}** processado!\n\n${r.data.message}\n\nAgora me pergunte qualquer coisa sobre o conteudo deste arquivo!`,
          fontes:[file.name], chunks_usados: r.data.chunks, modoArquivo:true,
        }];
      });
    } catch(e) {
      const status = e.response?.status;
      const err = e.response?.data?.error || e.message || 'Erro ao processar arquivo.';
      let msg = 'Erro: ' + err;
      if (status === 413 || err.includes('large')) msg = 'Arquivo muito grande. Tente um arquivo menor (max 5MB).';
      if (status === 422) msg = '[X] Nao foi possivel ler o arquivo. Use PDF com texto selecionavel, DOCX ou TXT.';
      if (status === 503 || err.includes('API') || err.includes('chave')) msg = '[X] Assistente de IA nao configurado. Verifique as variaveis de ambiente.';
      setMsgs(p => p.slice(0,-1).concat([{ id:Date.now()+2, role:'assistant', content:msg }]));
    } finally { setUpFile(false); }
  };

  // -- Enviar pergunta ---------------------------------------
  const enviar = useCallback(async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    setInput('');

    const userMsg = { id:Date.now(), role:'user', content:texto };
    const loadMsg = { id:Date.now()+1, role:'assistant', loading:true };
    setMsgs(p => [...p, userMsg, loadMsg]);
    setLoading(true);

    try {
      let res;
      if (modoArquivo && arquivoKey) {
        res = await api.post('/assistente/chat-arquivo', {
          mensagem: texto, sessionKey: arquivoKey,
          disciplina_id: discId ? Number(discId) : undefined,
        });
      } else {
        res = await api.post('/assistente/chat', {
          mensagem: texto,
          disciplina_id: discId ? Number(discId) : undefined,
        });
      }
      setMsgs(p => p.slice(0,-1).concat([{
        id:Date.now()+2, role:'assistant',
        content:         res.data.resposta,
        fontes:          res.data.fontes || [],
        fontes_web:      res.data.fontes_web || [],
        chunks_usados:   res.data.chunks_usados || 0,
        usou_embeddings: res.data.usou_embeddings,
        modo_fonte:      res.data.modo_fonte || (modoArquivo ? 'arquivo' : (res.data.chunks_usados > 0 ? 'rag' : (res.data.fontes_web?.length > 0 ? 'web' : 'rag'))),
        modoArquivo,
      }]));
    } catch(e) {
      const status = e.response?.status;
      const err = e.response?.data?.error || e.message || 'Erro ao conectar com o assistente.';
      let msg;
      if (status === 401)  msg = '[401] Chave de API invalida. Contate o administrador.';
      else if (status === 402)  msg = '[402] Creditos da IA esgotados. Contate o administrador.';
      else if (status === 429)  msg = '[429] Limite de requisicoes atingido. Aguarde alguns segundos e tente novamente.';
      else if (status === 503)  msg = '[503] IA nao configurada. Verifique as variaveis de ambiente (OPENAI_API_KEY ou GEMINI_API_KEY).';
      else if (status === 504)  msg = '[504] A IA demorou demais para responder. Tente novamente.';
      else if (status >= 500)   msg = 'Erro no servidor: ' + err;
      else                      msg = 'Erro: ' + err;
      setMsgs(p => p.slice(0,-1).concat([{ id:Date.now()+2, role:'assistant', content:msg }]));
    } finally { setLoading(false); inputRef.current?.focus(); }
  }, [input, loading, discId, modoArquivo, arquivoKey]);

  const limpar = async () => {
    await api.delete('/assistente/sessao').catch(() => {});
    setModoArquivo(false); setArquivoKey(null); setArqNome('');
    setMsgs([{ id:Date.now(), role:'assistant', content:'Sessao reiniciada! Como posso ajudar?' }]);
  };

  const indexar = async () => {
    setIndexando(true);
    try {
      const r = await api.post(`/assistente/indexar?disciplina_id=${discId}`);
      setMsgs(p => [...p, { id:Date.now(), role:'assistant', content:`[OK] ${r.data.message}\n\nAgora uso **busca semantica avancada**! [*]` }]);
    } catch(e) { alert(e.response?.data?.error || 'Erro.'); }
    finally { setIndexando(false); }
  };

  const discAtual = disciplinas.find(d => String(d.id) === discId);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', minHeight:500 }}>

      {/* -- Cabecalho -- */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2d5a9e)', color:'white', padding:'12px 16px', borderRadius:'12px 12px 0 0' }}>

        {/* Linha 1: titulo + ac?es */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: (disciplinas.length > 0 || modoArquivo) ? 10 : 0 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>[AI]</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:15 }}>Assistente Virtual RSC Academy</div>
            <div style={{ fontSize:11, opacity:.6, display:'flex', gap:8 }}>
              <span>RAG Avancado</span><span>-</span><span>Memoria</span>
              {modoArquivo && <><span>-</span><span style={{ color:'#fbbf24' }}>[F] {arquivoNome}</span></>}
            </div>
          </div>
          <button onClick={limpar} style={{ padding:'5px 10px', background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', borderRadius:8, color:'white', fontSize:11, cursor:'pointer' }}>
            Nova
          </button>
        </div>

        {/* Linha 2: seletor de disciplina */}
        {disciplinas.length > 0 && !modoArquivo && (
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <select value={discId} onChange={e => {
              const d = disciplinas.find(x => String(x.id) === e.target.value);
              setDiscId(e.target.value); setDiscNome(d?.nome||'');
            }} style={{ flex:1, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.1)', color:'white', fontSize:12, cursor:'pointer' }}>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id} style={{ color:'#1e293b', background:'white' }}>
                  [L] {d.nome} ({d.total_chunks||0} trechos{d.embeddings_prontos?' [*]':''})
                </option>
              ))}
            </select>
            {discAtual && !discAtual.embeddings_prontos && (discAtual.total_chunks||0) > 0 && (
              <button onClick={indexar} disabled={indexando} style={{ padding:'6px 12px', background:'#f59e0b', color:'#1e293b', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {indexando ? '...' : 'Semantica'}
              </button>
            )}
          </div>
        )}

        {/* Modo arquivo ativo */}
        {modoArquivo && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(245,158,11,.15)', borderRadius:8, padding:'6px 12px', border:'1px solid rgba(245,158,11,.3)' }}>
            <span>[Arq]</span>
            <span style={{ fontSize:12, color:'#fbbf24', fontWeight:600 }}>Modo ChatPDF: {arquivoNome}</span>
            <button onClick={() => { setModoArquivo(false); setArquivoKey(null); setArqNome(''); }} style={{ marginLeft:'auto', padding:'2px 8px', background:'rgba(255,255,255,.15)', border:'none', borderRadius:6, color:'white', fontSize:11, cursor:'pointer' }}>? Sair</button>
          </div>
        )}
      </div>

      {/* -- Mensagens -- */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 12px', background:'#f8fafc', display:'flex', flexDirection:'column', gap:8 }}>
        {msgs.map(msg => <MsgBubble key={msg.id} msg={msg} userFoto={user?.foto} />)}
        <div ref={bottomRef} />
      </div>

      {/* -- Input area -- */}
      <div style={{ padding:'12px 14px', background:'white', borderTop:'1px solid #e2e8f0', borderRadius:'0 0 12px 12px' }}>
        {/* Sugest?es */}
        {msgs.length <= 2 && !modoArquivo && disciplinas.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {['Qual o tema principal?','Resuma o conteudo','Quais os conceitos-chave?'].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                style={{ padding:'4px 12px', border:'1px solid #e2e8f0', borderRadius:99, background:'white', fontSize:11, color:'#475569', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#3b82f6'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}
              >{q}</button>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          {/* Botao upload arquivo */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingFile}
            title="Enviar arquivo (PDF, DOCX, TXT) para analise"
            style={{
              width:40, height:40, border:'1px solid #e2e8f0', borderRadius:10, background:'white',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, flexShrink:0, color: modoArquivo ? '#f59e0b' : '#475569',
              borderColor: modoArquivo ? '#f59e0b' : '#e2e8f0',
              transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.color='#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=modoArquivo?'#f59e0b':'#e2e8f0'; e.currentTarget.style.color=modoArquivo?'#f59e0b':'#475569'; }}
          >
            {uploadingFile ? '...' : '[+]'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.html" style={{ display:'none' }} onChange={handleFileUpload} />

          {/* Campo de texto */}
          <textarea
            ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder={modoArquivo ? `Pergunte sobre "${arquivoNome}"...` : discId ? `Pergunte sobre ${discNome}...` : 'Envie um arquivo [F] ou selecione uma disciplina...'}
            disabled={loading}
            rows={1}
            style={{
              flex:1, padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
              fontSize:14, fontFamily:'var(--font-body)', resize:'none', outline:'none',
              lineHeight:1.5, maxHeight:120, overflow:'auto',
            }}
            onFocus={e=>e.target.style.borderColor='#3b82f6'}
            onBlur={e=>e.target.style.borderColor='#e2e8f0'}
          />

          {/* Botao enviar */}
          <button onClick={enviar} disabled={!input.trim()||loading} style={{
            width:40, height:40, border:'none', borderRadius:10, flexShrink:0,
            background: !input.trim()||loading ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            color: !input.trim()||loading ? '#94a3b8' : 'white',
            cursor: !input.trim()||loading ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            boxShadow: !input.trim()||loading ? 'none' : '0 2px 10px rgba(59,130,246,.4)',
          }}>
            {loading ? '...' : '>'}
          </button>
        </div>

        <div style={{ fontSize:11, color:'#94a3b8', marginTop:5, textAlign:'center' }}>
          {modoArquivo ? '[PDF] Modo ChatPDF ativo - perguntas sobre o arquivo' :
           discAtual?.embeddings_prontos ? 'Busca semantica ativa' : 'Busca por palavras-chave'}
          {' - Envie um arquivo para analise individual'}
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

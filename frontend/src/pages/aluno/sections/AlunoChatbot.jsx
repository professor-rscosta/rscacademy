/**
 * AlunoChatbot — Assistente Virtual Avançado com RAG + Embeddings
 * Interface estilo ChatGPT integrada ao RSC Academy
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';

// ── Markdown simples ──────────────────────────────────────────
function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:0.9em">$1</code>')
    .replace(/^#{1,3}\s+(.+)/gm, '<strong style="display:block;margin:8px 0 4px">$1</strong>')
    .replace(/^[-•]\s+(.+)/gm, '<li style="margin:2px 0;list-style:disc;margin-left:16px">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Componente de mensagem ────────────────────────────────────
function MensagemBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isLoading = msg.loading;

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '4px 0',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
          : 'linear-gradient(135deg,#1e3a5f,#2d5a9e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, color: 'white', fontWeight: 700,
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Balão */}
      <div style={{
        maxWidth: '80%', padding: '12px 16px', borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background: isUser ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)' : 'white',
        color: isUser ? 'white' : '#1e293b',
        boxShadow: '0 2px 12px rgba(0,0,0,.08)',
        border: isUser ? 'none' : '1px solid #e2e8f0',
        fontSize: 14, lineHeight: 1.65,
        wordBreak: 'break-word',
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: '#94a3b8',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: i * 0.2 + 's',
              }} />
            ))}
          </div>
        ) : isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
        )}

        {/* Fontes */}
        {!isUser && !isLoading && msg.fontes?.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>
              📚 Fontes consultadas:
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {msg.fontes.map((f, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta info */}
        {!isUser && !isLoading && msg.chunks_usados > 0 && (
          <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', display: 'flex', gap: 8 }}>
            <span>🔍 {msg.chunks_usados} trechos analisados</span>
            {msg.usou_embeddings && <span>✨ Busca semântica</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function AlunoChatbot() {
  const { user } = useAuth();
  const [msgs, setMsgs]             = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [disciplinas, setDiscs]     = useState([]);
  const [discId, setDiscId]         = useState('');
  const [discNome, setDiscNome]     = useState('');
  const [loadingDiscs, setLdDiscs]  = useState(true);
  const [indexando, setIndexando]   = useState(false);
  const [sessaoInfo, setSessaoInfo] = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll automático
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Carregar disciplinas
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

  // Mensagem de boas-vindas
  useEffect(() => {
    if (!loadingDiscs) {
      setMsgs([{
        id: 1, role: 'assistant',
        content: disciplinas.length > 0
          ? `Olá, **${user?.nome?.split(' ')[0]}**! 👋\n\nSou o Assistente Virtual da RSC Academy com busca semântica avançada.\n\nSelecione uma disciplina acima e faça sua pergunta. Vou buscar nos documentos do professor para dar a melhor resposta possível!`
          : `Olá! 👋 Sou o Assistente Virtual da RSC Academy.\n\nAinda não há documentos indexados para suas disciplinas. Peça ao seu professor para adicionar materiais na **Base RAG (IA)**.`,
      }]);
    }
  }, [loadingDiscs]);

  const enviar = useCallback(async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: texto };
    const loadMsg = { id: Date.now() + 1, role: 'assistant', loading: true };
    setMsgs(prev => [...prev, userMsg, loadMsg]);
    setLoading(true);

    try {
      const res = await api.post('/assistente/chat', {
        mensagem: texto,
        disciplina_id: discId ? Number(discId) : undefined,
      });
      setMsgs(prev => prev.slice(0, -1).concat([{
        id: Date.now() + 2,
        role: 'assistant',
        content: res.data.resposta,
        fontes: res.data.fontes || [],
        chunks_usados: res.data.chunks_usados || 0,
        usou_embeddings: res.data.usou_embeddings,
      }]));
      setSessaoInfo({ msgs: res.data.historico_tamanho });
    } catch(e) {
      const err = e.response?.data?.error || 'Erro ao conectar com o assistente.';
      setMsgs(prev => prev.slice(0, -1).concat([{
        id: Date.now() + 2, role: 'assistant',
        content: `❌ ${err}`,
      }]));
    } finally { setLoading(false); inputRef.current?.focus(); }
  }, [input, loading, discId]);

  const limparChat = async () => {
    await api.delete('/assistente/sessao').catch(() => {});
    setMsgs([{
      id: Date.now(), role: 'assistant',
      content: '🔄 Sessão reiniciada! Como posso ajudar?',
    }]);
    setSessaoInfo(null);
  };

  const indexarEmbeddings = async () => {
    setIndexando(true);
    try {
      const r = await api.post(`/assistente/indexar?disciplina_id=${discId}`);
      setMsgs(prev => [...prev, {
        id: Date.now(), role: 'assistant',
        content: `✅ ${r.data.message}\n\nAgora posso usar **busca semântica avançada** para suas perguntas!`,
      }]);
    } catch(e) {
      alert(e.response?.data?.error || 'Erro ao indexar.');
    } finally { setIndexando(false); }
  };

  const discAtual = disciplinas.find(d => String(d.id) === discId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 500 }}>

      {/* ── Cabeçalho ── */}
      <div style={{
        background: 'linear-gradient(135deg,#1e3a5f,#2d5a9e)', color: 'white',
        padding: '12px 16px', borderRadius: '12px 12px 0 0',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Assistente Virtual RSC Academy</div>
          <div style={{ fontSize: 11, opacity: .7, display: 'flex', gap: 8 }}>
            <span>✨ RAG Avançado</span>
            <span>•</span>
            <span>🧠 Memória de sessão</span>
            {sessaoInfo && <><span>•</span><span>💬 {sessaoInfo.msgs} msgs</span></>}
          </div>
        </div>

        {/* Seletor de disciplina */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {loadingDiscs ? (
            <span style={{ fontSize: 12, opacity: .7 }}>Carregando...</span>
          ) : disciplinas.length > 0 ? (
            <select
              value={discId}
              onChange={e => {
                const d = disciplinas.find(x => String(x.id) === e.target.value);
                setDiscId(e.target.value);
                setDiscNome(d?.nome || '');
              }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: 'white', fontSize: 13, cursor: 'pointer' }}
            >
              {disciplinas.map(d => (
                <option key={d.id} value={d.id} style={{ color: '#1e293b', background: 'white' }}>
                  📚 {d.nome} ({d.total_chunks} trechos{d.embeddings_prontos ? ' ✨' : ''})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 12, opacity: .7 }}>Sem documentos indexados</span>
          )}

          {/* Botão indexar embeddings */}
          {discAtual && !discAtual.embeddings_prontos && discAtual.total_chunks > 0 && (
            <button onClick={indexarEmbeddings} disabled={indexando}
              title="Ativar busca semântica para esta disciplina"
              style={{ padding: '6px 12px', background: '#f59e0b', color: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {indexando ? '⏳' : '✨ Ativar Busca Semântica'}
            </button>
          )}

          <button onClick={limparChat} title="Nova conversa"
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: 'white', fontSize: 12, cursor: 'pointer' }}>
            🔄 Nova
          </button>
        </div>
      </div>

      {/* ── Área de mensagens ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 12px',
        background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {msgs.map(msg => <MensagemBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '12px 16px', background: 'white',
        borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px',
      }}>
        {/* Sugestões rápidas */}
        {msgs.length <= 2 && disciplinas.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {['Qual o resumo do documento?', 'Explique o conceito principal', 'Quais são os tópicos abordados?'].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }} style={{
                padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 99,
                background: 'white', fontSize: 12, color: '#475569', cursor: 'pointer',
                transition: 'all .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >{q}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
            }}
            placeholder={discId ? `Pergunte sobre ${discNome}... (Enter para enviar, Shift+Enter para nova linha)` : 'Selecione uma disciplina e faça sua pergunta...'}
            disabled={loading}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, fontFamily: 'var(--font-body)', resize: 'none', outline: 'none',
              lineHeight: 1.5, maxHeight: 120, overflow: 'auto',
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, border: 'none', borderRadius: 10,
              background: !input.trim() || loading ? '#e2e8f0' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color: !input.trim() || loading ? '#94a3b8' : 'white',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'all .2s', flexShrink: 0,
              boxShadow: !input.trim() || loading ? 'none' : '0 2px 10px rgba(59,130,246,.4)',
            }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
          {discAtual?.embeddings_prontos
            ? '✨ Busca semântica ativa — respostas baseadas nos documentos oficiais'
            : '🔍 Busca por palavras-chave ativa'}
        </div>
      </div>

      {/* CSS para animação de loading */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

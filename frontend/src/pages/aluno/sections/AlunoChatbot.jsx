import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';

const initials = (name) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const SUGESTOES = [
  'O que é recursão em Python?',
  'Explique o conceito de herança em POO',
  'Como funciona um laço for em JavaScript?',
  'Qual a diferença entre array e lista ligada?',
  'O que são Design Patterns?',
  'Me dê um exemplo de função recursiva',
];

export default function AlunoChatbot() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([
    {
      role: 'bot',
      text: 'Olá, ' + user.nome.split(' ')[0] + '! 👋 Sou o Assistente de IA da RSC Academy.\n\nPosso te ajudar com:\n• Dúvidas sobre algoritmos e programação\n• Exercícios e exemplos de código\n• Conceitos de POO, estruturas de dados\n• Preparação para avaliações\n\nComo posso te ajudar hoje?',
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const historico = msgs
    .filter(m => m.role !== 'system')
    .slice(-10) // últimas 10 mensagens
    .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));

  async function send(texto) {
    const msg = (texto || input).trim();
    if (!msg || loading) return;
    setInput('');
    setErro(null);
    setMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/chatbot/mensagem', {
        mensagem: msg,
        historico: historico.slice(-6),
      });
      setMsgs(prev => [...prev, { role: 'bot', text: res.data.resposta }]);
    } catch(e) {
      const errMsg = e.response?.data?.error || 'Erro ao conectar com o Assistente de IA.';
      setErro(errMsg);
      setMsgs(prev => [...prev, { role: 'bot', text: '⚠️ ' + errMsg, isError: true }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 7rem)' }}>
      <div className="page-header" style={{ paddingBottom:'0.75rem' }}>
        <div className="page-title">Assistente IA</div>
        <div className="page-sub">Tire dúvidas sobre programação e computação com IA</div>
      </div>

      <div className="chatbot-wrap" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>

        {/* Mensagens */}
        <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex', flexDirection:'column', gap:12 }}>

          {msgs.map((m, i) => {
            const isBot = m.role === 'bot';
            return (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', flexDirection: isBot ? 'row' : 'row-reverse' }}>
                {/* Avatar */}
                <div style={{
                  width:34, height:34, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:13,
                  background: isBot ? 'var(--navy)' : 'var(--emerald)',
                  color:'white',
                }}>
                  {isBot ? '🤖' : initials(user.nome)}
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth:'75%', padding:'10px 14px', borderRadius:12,
                  borderTopLeftRadius: isBot ? 2 : 12,
                  borderTopRightRadius: isBot ? 12 : 2,
                  background: isBot ? (m.isError ? '#fef2f2' : 'var(--slate-50)') : 'var(--emerald)',
                  border: isBot ? '1px solid '+(m.isError ? '#fca5a5' : 'var(--slate-200)') : 'none',
                  color: isBot ? 'var(--slate-800)' : 'white',
                  fontSize:13.5, lineHeight:1.65,
                  whiteSpace:'pre-wrap', wordBreak:'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🤖</div>
              <div style={{ padding:'12px 16px', borderRadius:12, borderTopLeftRadius:2, background:'var(--slate-50)', border:'1px solid var(--slate-200)' }}>
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width:7, height:7, borderRadius:'50%', background:'var(--slate-400)',
                      animation: 'bounce 1.2s infinite',
                      animationDelay: (i*0.2)+'s',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sugestões (só no início) */}
        {msgs.length === 1 && (
          <div style={{ padding:'0 1rem 0.5rem', display:'flex', gap:6, flexWrap:'wrap' }}>
            {SUGESTOES.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                padding:'5px 12px', borderRadius:50, border:'1.5px solid var(--slate-200)',
                background:'white', fontSize:12, cursor:'pointer', color:'var(--slate-600)',
                transition:'all .15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor='var(--emerald)'; e.target.style.color='var(--emerald-dark)'; }}
              onMouseLeave={e => { e.target.style.borderColor='var(--slate-200)'; e.target.style.color='var(--slate-600)'; }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'0.75rem 1rem', borderTop:'1px solid var(--slate-200)', display:'flex', gap:8, background:'white' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Digite sua dúvida... (Enter para enviar)"
            disabled={loading}
            style={{
              flex:1, padding:'10px 14px', border:'1.5px solid var(--slate-200)',
              borderRadius:10, fontFamily:'var(--font-body)', fontSize:14, outline:'none',
              background: loading ? 'var(--slate-50)' : 'white',
            }}
            onFocus={e => e.target.style.borderColor='var(--emerald)'}
            onBlur={e => e.target.style.borderColor='var(--slate-200)'}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{
              padding:'10px 18px', background:'var(--navy)', color:'white',
              border:'none', borderRadius:10, cursor:'pointer', fontWeight:600, fontSize:14,
              opacity: !input.trim() || loading ? 0.5 : 1, transition:'opacity .15s',
            }}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

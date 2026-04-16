import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';
import {
  MultiplaEscolha, VerdadeiroFalso, Dissertativa,
  Preenchimento, Associacao, Ordenacao, UploadArquivo
} from '../../../components/questoes/tipos';
import MidiaRenderer from '../../../components/questoes/MidiaRenderer';

const TIPO_COMP = {
  multipla_escolha: MultiplaEscolha, verdadeiro_falso: VerdadeiroFalso,
  dissertativa: Dissertativa, preenchimento: Preenchimento,
  associacao: Associacao, ordenacao: Ordenacao, upload_arquivo: UploadArquivo,
};

// ── Fase de Upload dedicada (tipo: entrega) ───────────────────
function UploadEntregaFase({ av, tentativa, onConcluir, onVoltar }) {
  const [arquivos, setArquivos] = useState([]);
  const [comentario, setCom]    = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alert, setAlert]       = useState(null);
  const fileRef = useRef(null);

  const prazoVencido = av.encerra_em && new Date(av.encerra_em) < new Date();

  const addArquivo = (e) => {
    Array.from(e.target.files).forEach(file => {
      if (file.size > 10*1024*1024) { setAlert({ type:'error', msg:file.name+' excede 10MB.' }); return; }
      const reader = new FileReader();
      reader.onload = ev => setArquivos(prev => [...prev, { nome:file.name, tipo:file.type, mimeType:file.type, base64:ev.target.result, tamanho:file.size }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removerArq = (i) => setArquivos(prev => prev.filter((_,j) => j!==i));

  const enviar = async () => {
    if (arquivos.length === 0 && !comentario.trim()) {
      setAlert({ type:'error', msg:'Adicione pelo menos um arquivo ou comentário.' }); return;
    }
    if (!window.confirm('Confirmar envio? Você poderá cancelar antes do professor corrigir.')) return;
    setEnviando(true);
    try {
      // Salvar arquivos e comentário na resposta da avaliação (questão de upload_arquivo se houver)
      const questoesUpload = av.questoes_completas?.filter(q => q.tipo === 'upload_arquivo') || [];
      const respostaPayload = JSON.stringify({ arquivos, comentario });

      for (const q of questoesUpload) {
        await api.post('/avaliacoes/responder', {
          tentativa_id: tentativa.id,
          questao_id: q.id,
          resposta: respostaPayload,
        });
      }

      // Se não tem questão de upload, salvar como comentário geral
      if (questoesUpload.length === 0) {
        // Criar uma resposta virtual para o relatório
        await api.post('/avaliacoes/responder', { tentativa_id: tentativa.id, questao_id: 0, resposta: respostaPayload }).catch(() => {});
      }

      const r = await api.post('/avaliacoes/tentativa/'+tentativa.id+'/concluir');
      setAlert({ type:'success', msg:'✅ Enviado com sucesso!' });
      setTimeout(() => onConcluir(r.data), 1500);
    } catch(e) { setAlert({ type:'error', msg:e.response?.data?.error||'Erro ao enviar.' }); }
    setEnviando(false);
  };

  const fmtSize = (b) => b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      {/* Header da avaliação */}
      <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:16, padding:'1.5rem', color:'white', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:11, opacity:.5, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>📤 Envio de Arquivo</div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>{av.titulo}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {av.nota_minima && <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(255,255,255,.12)', fontSize:12 }}>✅ Mín: {av.nota_minima}/10</span>}
          {av.encerra_em && (
            <span style={{ padding:'4px 12px', borderRadius:50, background:prazoVencido?'rgba(239,68,68,.3)':'rgba(16,185,129,.2)', color:prazoVencido?'#fca5a5':'#34d399', fontSize:12, fontWeight:600 }}>
              📅 Prazo: {new Date(av.encerra_em).toLocaleString('pt-BR')} {prazoVencido&&'(ENCERRADO)'}
            </span>
          )}
        </div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'1.25rem', alignItems:'start' }}>

        {/* Esquerda: descrição da avaliação */}
        <div>
          {av.descricao && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>📄 Instruções</div>
              <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{av.descricao}</div>
            </div>
          )}

          {/* Questões de upload com enunciado */}
          {(av.questoes_completas||[]).filter(q=>q.tipo==='upload_arquivo').map((q,i) => (
            <div key={q.id} className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:6 }}>
                ❓ Questão {i+1} {q.peso&&q.peso!==1?'· Peso '+q.peso:''}
              </div>
              <div style={{ fontSize:14, color:'var(--slate-700)', lineHeight:1.7 }}>{q.enunciado}</div>
              {q.gabarito && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', borderRadius:6, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
                  💡 Critérios: {q.gabarito}
                </div>
              )}
            </div>
          ))}

          {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length > 0 && (
            <div style={{ padding:'10px 14px', background:'#fffbeb', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
              ⚠️ Esta avaliação também contém {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length} questão(ões) de outros tipos. Volte para responder todas.
            </div>
          )}
        </div>

        {/* Direita: painel de entrega */}
        <div style={{ background:'white', border:'2px solid var(--slate-200)', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.08)', position:'sticky', top:16 }}>
          <div style={{ padding:'12px 16px', background:'var(--slate-50)', borderBottom:'1px solid var(--slate-100)', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, color:'var(--navy)' }}>📤 Sua Entrega</div>
          </div>

          <div style={{ padding:'1rem' }}>
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); addArquivo({ target:{ files:e.dataTransfer.files }, value:'' }); }}
              onDragOver={e => e.preventDefault()}
              style={{ border:'2px dashed var(--slate-200)', borderRadius:10, padding:'1.25rem', textAlign:'center', cursor:'pointer', marginBottom:10, background:'var(--slate-50)', transition:'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--emerald)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--slate-200)'}>
              <div style={{ fontSize:30, marginBottom:6 }}>📎</div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:2 }}>Adicionar arquivos</div>
              <div style={{ fontSize:11, color:'var(--slate-400)' }}>PDF, imagens, ZIP, código · Máx 10MB</div>
              <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={addArquivo} />
            </div>

            {/* Arquivos selecionados */}
            {arquivos.map((arq,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(16,185,129,.05)', borderRadius:7, border:'1px solid rgba(16,185,129,.2)', marginBottom:4 }}>
                <span style={{ fontSize:14 }}>{arq.tipo?.startsWith('image/')?'🖼️':'📎'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--navy)' }}>{arq.nome}</div>
                  <div style={{ fontSize:10, color:'var(--slate-400)' }}>{fmtSize(arq.tamanho)}</div>
                </div>
                <button onClick={()=>removerArq(i)} style={{ background:'#fef2f2', border:'none', color:'#b91c1c', borderRadius:5, cursor:'pointer', padding:'2px 7px', fontSize:11 }}>✕</button>
              </div>
            ))}

            {/* Comentário */}
            <textarea rows={3} value={comentario} onChange={e=>setCom(e.target.value)}
              placeholder="Observações para o professor (opcional)..."
              style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:12, resize:'none', outline:'none', marginBottom:10, boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />

            <button onClick={enviar} disabled={enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())?0.5:1, boxShadow:'0 4px 14px rgba(16,185,129,.35)', marginBottom:8 }}>
              {enviando ? '⏳ Enviando...' : '🚀 Enviar para o Professor'}
            </button>

            <button onClick={onVoltar}
              style={{ width:'100%', padding:'9px', background:'white', border:'1.5px solid var(--slate-200)', borderRadius:8, color:'var(--slate-600)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
              ← Voltar às Avaliações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cronômetro regressivo ─────────────────────────────────────
function Cronometro({ segundos, onExpire }) {
  const [restante, setRestante] = useState(segundos || 0);
  const ref = useRef(null);

  useEffect(() => {
    if (!segundos || segundos <= 0) return;
    setRestante(segundos);
    ref.current = setInterval(() => {
      setRestante(s => {
        if (s <= 1) { clearInterval(ref.current); onExpire?.(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [segundos]);

  const m = Math.floor(restante / 60);
  const s = restante % 60;
  const urgente = restante > 0 && restante < 300;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:50,
      background: urgente ? '#fef2f2' : 'rgba(255,255,255,0.1)',
      border: urgente ? '2px solid #fca5a5' : '2px solid rgba(255,255,255,0.2)',
    }}>
      <span style={{ fontSize:14 }}>{urgente ? '⚠️' : '⏱'}</span>
      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color: urgente ? '#b91c1c' : 'white' }}>
        {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  );
}


// ── SweetAlert-style Confirm Modal ───────────────────────────
function ConfirmModal({ onConfirm, onCancel, titulo, mensagem, confirmLabel='✅ Confirmar', cancelLabel='❌ Cancelar', tipo='warning' }) {
  const cores = {
    warning: { bg:'#fffbeb', borda:'#f59e0b', icone:'⚠️', btn:'#f59e0b', btnText:'#1e293b' },
    success: { bg:'#f0fdf4', borda:'#10b981', icone:'✅', btn:'#10b981', btnText:'white' },
    danger:  { bg:'#fef2f2', borda:'#ef4444', icone:'🚨', btn:'#ef4444', btnText:'white' },
  }[tipo] || cores?.warning;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:420, boxShadow:'0 25px 60px rgba(0,0,0,.3)', overflow:'hidden', animation:'slideUp .2s ease' }}>
        <div style={{ padding:'2rem', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:12 }}>⚠️</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:800, color:'var(--navy)', marginBottom:8 }}>{titulo}</div>
          <div style={{ fontSize:14, color:'var(--slate-600)', lineHeight:1.6, marginBottom:'1.5rem' }}>{mensagem}</div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel} style={{ flex:1, padding:'12px 0', border:'2px solid var(--slate-200)', borderRadius:10, background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'var(--slate-600)', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='var(--slate-50)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='white'}}
            >
              ↩️ Cancelar
            </button>
            <button onClick={onConfirm} style={{ flex:2, padding:'12px 0', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(245,158,11,.4)', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.opacity='.9'}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}
            >
              ✅ Confirmar Envio
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:none; opacity:1; } }`}</style>
    </div>
  );
}


// ── Markdown simples para feedback IA ────────────────────────
function renderFeedback(text) {
  if (!text) return '';
  return text
    .replace(/## (.+)/g, '<div style="font-weight:800;font-size:14px;color:#1e3a5f;margin:12px 0 4px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.+)/gm, '<li style="margin:2px 0;margin-left:14px;list-style:disc">$1</li>');
}

export default function AlunoAvaliacoes({ initialAvaliacaoId, onReady }) {
  const { user }                = useAuth();
  const [avs, setAvs]           = useState([]);
  const [disciplinasMap, setDiscMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [fase, setFase]         = useState('lista');
  const [avAtual, setAvAtual]   = useState(null);
  const [tentativaAtual, setTentativa] = useState(null);
  const [questoes, setQuestoes] = useState([]);
  const [idx, setIdx]           = useState(0);
  const [respostas, setRespostas] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tempoSeg, setTempoSeg] = useState(null);

  useEffect(() => { load(); }, []);

  // Auto-open avaliacao if navigated from discipline module
  useEffect(() => {
    if (!initialAvaliacaoId || loading || avs.length === 0) return;
    const av = avs.find(a => a.id === Number(initialAvaliacaoId));
    if (av) {
      iniciar(av);
      onReady?.();
    }
  }, [initialAvaliacaoId, loading, avs]);

  const load = async () => {
    try {
      const [r, dRes] = await Promise.all([
        api.get('/avaliacoes'),
        api.get('/disciplinas').catch(() => ({ data: { disciplinas: [] } })),
      ]);
      setAvs(r.data.avaliacoes || []);
      const dm = {};
      (dRes.data.disciplinas || []).forEach(d => { dm[d.id] = d.nome; });
      setDiscMap(dm);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const iniciar = async (av) => {
    try {
      const r = await api.post('/avaliacoes/'+av.id+'/iniciar');
      const qs = r.data.avaliacao?.questoes_completas || [];
      setAvAtual(r.data.avaliacao);
      setTentativa(r.data.tentativa);
      setQuestoes(qs);
      setTempoSeg(r.data.tempo_restante_segundos || null);
      setIdx(0);
      setRespostas({});
      // tipo entrega → tela de upload dedicada (estilo Atividades)
      const tipoFinal = av.tipo || r.data.avaliacao?.tipo;
      setFase(tipoFinal === 'entrega' ? 'upload' : 'fazendo');
    } catch(e){ alert(e.response?.data?.error || 'Erro ao iniciar avaliação.'); }
  };

  // Salvar resposta LOCALMENTE (sem API por questão - evita bloqueio Kaspersky)
  const salvarResposta = (qid, resp) => {
    setRespostas(prev => ({ ...prev, [qid]: resp }));
    // Persiste no localStorage como backup
    try {
      const key = 'av_respostas_' + (tentativaAtual?.id || 'rascunho');
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      current[qid] = resp;
      localStorage.setItem(key, JSON.stringify(current));
    } catch(e) {}
  };

  const pedirConfirmar = () => {
    const respondidas = Object.keys(respostas).length;
    if (respondidas < questoes.length) {
      const faltam = questoes.length - respondidas;
      if (!window.confirm(`Atenção: ${faltam} questão(ões) sem resposta. Deseja enviar mesmo assim?`)) return;
    }
    setShowConfirm(true);
  };
  const concluir = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      // Enviar TODAS as respostas em um único request (evita múltiplas chamadas que Kaspersky bloqueia)
      const respostasArray = Object.entries(respostas).map(([qid, resp]) => ({
        questao_id: Number(qid),
        resposta: typeof resp === 'object' && resp !== null ? JSON.stringify(resp) : resp,
      }));

      // Salvar todas as respostas em um batch primeiro
      if (respostasArray.length > 0) {
        await api.post('/avaliacoes/responder-batch', {
          tentativa_id: tentativaAtual.id,
          respostas: respostasArray,
        }).catch(() => {
          // Fallback: salvar uma por uma se batch não existir
          return Promise.allSettled(respostasArray.map(r =>
            api.post('/avaliacoes/responder', { tentativa_id: tentativaAtual.id, ...r })
          ));
        });
      }

      // Concluir a tentativa
      const r = await api.post('/avaliacoes/tentativa/'+tentativaAtual.id+'/concluir');

      // Limpar localStorage backup
      try { localStorage.removeItem('av_respostas_' + tentativaAtual.id); } catch(e) {}

      setResultado(r.data);
      setFase('resultado');
      load();
    } catch(e) {
      const msg = e.response?.data?.error || e.message || 'Erro ao concluir avaliação.';
      if (msg.includes('network') || msg.includes('Network') || e.code === 'ERR_NETWORK_IO_SUSPENDED') {
        alert('Erro de conexão detectado. Verifique seu antivírus/firewall (ex: Kaspersky pode bloquear requisições). Tente novamente.');
      } else {
        alert(msg);
      }
    }
    setSubmitting(false);
  };

  // ── RESULTADO ─────────────────────────────────────────────────
  if (fase === 'resultado' && resultado) {
    const { nota, aprovado, xp_ganho, nota_minima, estatisticas, feedback_geral, novas_medalhas, respostas: resCorr, avaliacao_titulo, concluida_em } = resultado;
    const corretas  = estatisticas?.corretas || 0;
    const totalQ    = estatisticas?.total_questoes || (resCorr||[]).length;
    const erros     = estatisticas?.erros ?? (totalQ - corretas);
    const taxa      = estatisticas?.taxa_acerto || 0;
    const dataHora  = concluida_em ? new Date(concluida_em) : new Date();
    const dataStr   = dataHora.toLocaleDateString('pt-BR');
    const horaStr   = dataHora.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const feedbackEmoji = taxa >= 80 ? '🎉' : taxa >= 50 ? '👍' : '📚';
    const feedbackMsg   = taxa >= 80 ? 'Excelente desempenho!' : taxa >= 50 ? 'Bom desempenho!' : 'Precisa revisar o conteúdo.';

    const renderResposta = (val, tipo, alternativas) => {
      if (val === null || val === undefined) return <em style={{ opacity:.5 }}>Sem resposta</em>;
      if (typeof val === 'boolean') return val ? 'Verdadeiro ✓' : 'Falso ✗';
      if (typeof val === 'number' && alternativas) {
        const letra = String.fromCharCode(65 + val);
        return letra + ') ' + alternativas[val];
      }
      if (Array.isArray(val) && alternativas) return val.map(i => String.fromCharCode(65+i)+') '+alternativas[i]).join(', ');
      return String(val);
    };

    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>

        {/* ── HERO ── */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', borderRadius:16, padding:'1.75rem 2rem', color:'white', marginBottom:'1rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, opacity:.04, backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'20px 20px' }} />
          <div style={{ fontSize:48, marginBottom:6 }}>{feedbackEmoji}</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:800, marginBottom:4 }}>
            {aprovado ? 'Avaliação Concluída! 🎉' : 'Avaliação Concluída'}
          </div>
          <div style={{ fontSize:13, opacity:.7, marginBottom:'1.25rem' }}>{avaliacao_titulo || avAtual?.titulo}</div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:'1rem' }}>
            {[
              { l:'Nota',        v: (nota||0).toFixed(1)+'/10' },
              { l:'Acertos',     v: corretas+'/'+totalQ },
              { l:'Taxa',        v: taxa+'%' },
              { l:'XP Ganho',    v: '+'+(xp_ganho||0)+'⭐' },
            ].map(s => (
              <div key={s.l} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'10px 18px', minWidth:70, textAlign:'center' }}>
                <div style={{ fontSize:10, opacity:.6, marginBottom:2, textTransform:'uppercase', letterSpacing:.5 }}>{s.l}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:'8px 20px', borderRadius:99, display:'inline-block', fontWeight:700, fontSize:14,
            background: aprovado ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)',
            border: '1px solid '+(aprovado ? '#34d399' : '#f87171'),
          }}>
            {aprovado ? '✅ Aprovado' : '❌ Reprovado'} · Mínimo: {nota_minima||6}
          </div>
        </div>

        {/* ── INFORMAÇÕES GERAIS ── */}
        <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, padding:'14px 18px', marginBottom:'1rem', display:'flex', flexWrap:'wrap', gap:'0.75rem', fontSize:13 }}>
          <span>👤 <strong>{user?.nome || 'Aluno'}</strong></span>
          <span style={{ color:'var(--slate-300)' }}>|</span>
          <span>📅 {dataStr}</span>
          <span style={{ color:'var(--slate-300)' }}>|</span>
          <span>🕐 {horaStr}</span>
          <span style={{ marginLeft:'auto', fontWeight:700, color: taxa>=80?'#10b981':taxa>=50?'#f59e0b':'#ef4444' }}>
            {feedbackMsg}
          </span>
        </div>

        {/* ── FEEDBACK IA ── */}
        {feedback_geral && (
          <div style={{ background:'white', border:'1px solid #ddd6fe', borderRadius:12, padding:'16px 18px', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:20 }}>🤖</span>
              <div style={{ fontWeight:700, color:'#6d28d9', fontSize:14 }}>Feedback Pedagógico (IA)</div>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe' }}>BNCC · TRI</span>
            </div>
            <div style={{ fontSize:13.5, color:'var(--slate-700)', lineHeight:1.8 }}
              dangerouslySetInnerHTML={{ __html: renderFeedback(feedback_geral) }}
            />
          </div>
        )}

        {/* ── MEDALHAS ── */}
        {novas_medalhas?.length > 0 && (
          <div style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'2px solid #fcd34d', borderRadius:12, padding:'14px 18px', marginBottom:'1rem' }}>
            <div style={{ fontWeight:700, color:'#92400e', marginBottom:8 }}>🏆 Nova(s) Medalha(s) Desbloqueada(s)!</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {novas_medalhas.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'white', borderRadius:9, border:'1px solid #fcd34d' }}>
                  <span style={{ fontSize:22 }}>{m.icone}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13 }}>{m.nome}</div>
                    <div style={{ fontSize:11, color:'var(--slate-500)' }}>+{m.xp_bonus} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DETALHAMENTO POR QUESTÃO ── */}
        {(resCorr||[]).length > 0 && (
          <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden', marginBottom:'1rem' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--slate-100)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>📝 Detalhamento por Questão</div>
              <div style={{ display:'flex', gap:12, fontSize:12 }}>
                <span style={{ color:'#10b981', fontWeight:700 }}>✅ {corretas} acertos</span>
                <span style={{ color:'#ef4444', fontWeight:700 }}>❌ {erros} erros</span>
              </div>
            </div>

            {resCorr.map((r, i) => {
              const qMeta  = questoes.find(q => q.id === r.questao_id);
              const enunc  = r.questao_enunciado || qMeta?.enunciado || 'Questão ' + (i+1);
              const tipo   = r.questao_tipo     || qMeta?.tipo;
              const gab    = r.questao_gabarito ?? qMeta?.gabarito;
              const alts   = r.questao_alternativas || qMeta?.alternativas;
              const explic = r.questao_explicacao   || qMeta?.explicacao;
              const score  = r.score || 0;
              const acertou = r.is_correct || score >= 0.8;
              const isUpload = tipo === 'upload_arquivo';
              const pendente = isUpload && !r.corrigido_manualmente;

              return (
                <div key={r.questao_id || i} style={{
                  padding:'16px 18px',
                  borderBottom: i < resCorr.length-1 ? '1px solid var(--slate-100)' : 'none',
                  background: pendente ? '#fffbeb' : acertou ? '#fafff8' : '#fffafa',
                }}>
                  {/* Número + resultado */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background: pendente ? '#f59e0b' : acertou ? '#10b981' : '#ef4444',
                      color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700,
                        color: pendente ? '#92400e' : acertou ? '#166534' : '#991b1b' }}>
                        {pendente ? '⏳ Aguardando correção' : acertou ? '✅ Correto' : '❌ Incorreto'}
                        {!pendente && <span style={{ fontWeight:400, opacity:.7, marginLeft:8 }}>({Math.round(score*100)}%)</span>}
                      </span>
                      {tipo && <span style={{ fontSize:10, marginLeft:10, padding:'1px 7px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-500)' }}>{tipo}</span>}
                    </div>
                    {r.xp_ganho > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>⚡+{r.xp_ganho}</span>}
                  </div>

                  {/* Enunciado */}
                  <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.6, background:'var(--slate-50)', padding:'8px 12px', borderRadius:8, marginBottom:8 }}>
                    <strong>Questão:</strong> {enunc}
                  </div>

                  {/* Resposta aluno vs gabarito */}
                  {!pendente && r.resposta_aluno !== null && r.resposta_aluno !== undefined && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                      <div style={{ padding:'8px 12px', borderRadius:8,
                        background: acertou ? '#dcfce7' : '#fee2e2',
                        border: '1px solid '+(acertou ? '#a7f3d0' : '#fca5a5') }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3,
                          color: acertou ? '#166534' : '#991b1b' }}>
                          {acertou ? '✅ Sua resposta (Correta)' : '❌ Sua resposta'}
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color: acertou ? '#166534' : '#991b1b' }}>
                          {renderResposta(r.resposta_aluno, tipo, alts)}
                        </div>
                      </div>
                      {!acertou && gab !== null && gab !== undefined && (
                        <div style={{ padding:'8px 12px', borderRadius:8, background:'#dcfce7', border:'1px solid #a7f3d0' }}>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3, color:'#166534' }}>✅ Resposta Correta</div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#166534' }}>
                            {renderResposta(gab, tipo, alts)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explicação */}
                  {explic && (
                    <div style={{ padding:'7px 12px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', fontSize:12, color:'#1d4ed8', marginBottom:6 }}>
                      <strong>💡 Explicação:</strong> {explic}
                    </div>
                  )}

                  {/* Feedback IA por questão */}
                  {r.feedback_ia && (
                    <div style={{ padding:'7px 12px', borderRadius:8, background:'#f5f3ff', border:'1px solid #ddd6fe', fontSize:12, color:'#5b21b6' }}>
                      <strong>🤖 Feedback:</strong> {r.feedback_ia}
                    </div>
                  )}

                  {/* Feedback do professor */}
                  {r.feedback_prof && (
                    <div style={{ padding:'7px 12px', borderRadius:8, background:'#f0fdf4', border:'1px solid #a7f3d0', fontSize:12, color:'#166534', marginTop:4 }}>
                      <strong>💬 Professor:</strong> {r.feedback_prof}
                    </div>
                  )}

                  {pendente && (
                    <div style={{ fontSize:11, color:'#92400e', fontStyle:'italic' }}>O professor irá corrigir sua entrega em breve.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { setFase('lista'); setResultado(null); }}
          style={{ width:'100%', padding:14, background:'var(--emerald)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,.35)' }}>
          Voltar às Avaliações
        </button>
      </div>
    );
  }

  // ── UPLOAD (tipo entrega — estilo Google Sala de Aula) ────────
  if (fase === 'upload' && avAtual) {
    return <UploadEntregaFase av={avAtual} tentativa={tentativaAtual} onConcluir={(res) => { setResultado(res); setFase('resultado'); load(); }} onVoltar={() => setFase('lista')} />;
  }

  // ── FAZENDO ───────────────────────────────────────────────────
  if (fase === 'fazendo' && avAtual) {
    const questaoAtual = questoes[idx];
    const Comp = questaoAtual ? TIPO_COMP[questaoAtual.tipo] : null;
    const respAtual    = respostas[questaoAtual?.id];
    const respondidas  = Object.keys(respostas).length;

    if (questoes.length === 0) return (
      <div style={{ textAlign:'center', padding:'4rem' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:600, color:'var(--navy)', marginBottom:8 }}>Esta avaliação não tem questões</div>
        <div style={{ fontSize:13, color:'var(--slate-500)', marginBottom:20 }}>O professor ainda não adicionou questões a esta avaliação.</div>
        <button onClick={() => setFase('lista')} style={{ padding:'10px 20px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>← Voltar</button>
      </div>
    );

    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        {/* HUD */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'1rem', color:'white' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600 }}>{avAtual.titulo}</div>
              <div style={{ fontSize:11, opacity:.6 }}>
                Questão {idx+1} de {questoes.length} · {respondidas} respondida(s)
              </div>
            </div>
            <Cronometro segundos={tempoSeg} onExpire={concluir} />
          </div>
          {/* Barra de progresso */}
          <div style={{ display:'flex', gap:3 }}>
            {questoes.map((q, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ flex:1, height:5, borderRadius:99, cursor:'pointer', transition:'background .2s',
                background: respostas[q.id] !== undefined ? 'var(--emerald)' : i===idx ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              }} />
            ))}
          </div>
        </div>

        {/* Card da questão */}
        <div className="card">
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'rgba(245,158,11,0.1)', color:'#92400e', fontSize:11, fontWeight:600 }}>
              Peso: {questaoAtual.peso||1}
            </span>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'var(--slate-100)', color:'var(--slate-600)', fontSize:11 }}>
              {questaoAtual.tipo?.replace(/_/g,' ')}
            </span>
            {respostas[questaoAtual.id] !== undefined && (
              <span style={{ padding:'3px 10px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:11, fontWeight:600 }}>✅ Respondida</span>
            )}
          </div>

          {questaoAtual.tipo !== 'preenchimento' && (
            <div style={{ fontSize:15, fontWeight:500, color:'var(--slate-800)', lineHeight:1.7, marginBottom:16 }}>
              {questaoAtual.enunciado}
            </div>
          )}

          {questaoAtual.midias?.length > 0 && <MidiaRenderer midias={questaoAtual.midias} />}

          {Comp && (
            <Comp
              key={questaoAtual.id}
              questao={questaoAtual}
              onAnswer={resp => salvarResposta(questaoAtual.id, resp)}
              disabled={false}
              respostaDada={respostas[questaoAtual.id]}
            />
          )}
        </div>

        {/* Navegação */}
        <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
          <button onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx===0}
            style={{ padding:'10px 18px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, opacity:idx===0?0.45:1 }}>
            ← Anterior
          </button>
          {idx < questoes.length - 1 ? (
            <button onClick={() => setIdx(i => i+1)}
              style={{ flex:1, padding:'10px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Próxima →
            </button>
          ) : (
            <button onClick={pedirConfirmar} disabled={submitting}
              style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:submitting?0.7:1 }}>
              {submitting ? '⏳ Enviando...' : '🚀 Finalizar ('+respondidas+'/'+questoes.length+')'}
            </button>
          )}
        </div>

        {/* Navegação rápida */}
        <div style={{ marginTop:'1rem', padding:12, background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:8 }}>NAVEGAÇÃO RÁPIDA</div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {questoes.map((q, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{
                width:32, height:32, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                border: '2px solid '+(i===idx?'var(--emerald)':respostas[q.id]!==undefined?'var(--sky)':'var(--slate-200)'),
                background: i===idx?'var(--emerald)':respostas[q.id]!==undefined?'rgba(14,165,233,0.1)':'white',
                color: i===idx?'white':'var(--slate-600)',
              }}>
                {i+1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA ─────────────────────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <div className="page-title">Avaliações</div>
        <div className="page-sub">Provas e atividades das suas turmas</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : avs.length === 0 ? (
        <div className="card"><EmptyState icon="📝" title="Nenhuma avaliação disponível" sub="Seu professor publicará avaliações em breve" /></div>
      ) : (() => {
        // Agrupar por disciplina
        const porDisc = {};
        avs.forEach(av => {
          const did = av.disciplina_id ? String(av.disciplina_id) : '__sem__';
          if (!porDisc[did]) porDisc[did] = [];
          porDisc[did].push(av);
        });
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
            {Object.entries(porDisc).map(([did, discAvs]) => {
              const discNome = did === '__sem__' ? null : (disciplinasMap[Number(did)] || 'Disciplina ' + did);
              return (
                <div key={did}>
                  {discNome && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ width:4, height:20, background:'var(--navy)', borderRadius:2 }}/>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, color:'var(--navy)' }}>
                        📚 {discNome}
                      </span>
                      <span style={{ fontSize:11, color:'var(--slate-400)' }}>({discAvs.length})</span>
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {discAvs.map(av => {
            const encerrada = av.encerra_em && new Date(av.encerra_em) < new Date();
            const esgotada  = (av.tentativas_feitas||0) >= (av.tentativas_permitidas||1);
            const numQ      = av.total_questoes ?? (Array.isArray(av.questoes) ? av.questoes.length : 0);
            const isEntrega = av.tipo === 'entrega';
            return (
              <div key={av.id} className="card" style={{ borderLeft:'4px solid '+(av.minha_nota!=null?(av.minha_nota>=av.nota_minima?'var(--emerald)':'#f59e0b'):isEntrega?'var(--sky)':'var(--sky)'), margin:0 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ fontSize:26, paddingTop:2 }}>{isEntrega?'📤':'📝'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{av.titulo}</span>
                      {isEntrega && <span style={{ padding:'2px 9px', borderRadius:50, background:'#f0f9ff', color:'#0284c7', fontSize:11, fontWeight:600, border:'1px solid #bae6fd' }}>📤 Envio de Arquivo</span>}
                    </div>
                    {av.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:6 }}>{av.descricao}</div>}
                    <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap' }}>
                      {isEntrega ? <span>📎 Upload de arquivo para correção manual</span> : <span>❓ {numQ} questão(ões)</span>}
                      {!isEntrega && <span>⏱ {av.tempo_limite} min</span>}
                      <span>🔁 {av.tentativas_feitas||0}/{av.tentativas_permitidas} tentativa(s)</span>
                      {av.encerra_em && <span>📅 Encerra: {new Date(av.encerra_em).toLocaleDateString('pt-BR')}</span>}
                      {av.minha_nota != null && <span style={{ fontWeight:700, color:av.minha_nota>=av.nota_minima?'var(--emerald-dark)':'var(--coral)' }}>Nota: {av.minha_nota.toFixed(1)}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {encerrada ? (
                      <span style={{ padding:'6px 14px', borderRadius:8, background:'#fef2f2', color:'#b91c1c', fontSize:12, fontWeight:600 }}>Encerrada</span>
                    ) : esgotada ? (
                      <span style={{ padding:'6px 14px', borderRadius:8, background:'var(--slate-100)', color:'var(--slate-500)', fontSize:12, fontWeight:600 }}>Esgotada</span>
                    ) : (
                      <button onClick={() => iniciar(av)} style={{ padding:'9px 18px', background:isEntrega?'var(--sky)':'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.3)' }}>
                        {isEntrega ? ((av.tentativas_feitas||0)>0?'🔁 Reenviar':'📤 Enviar Arquivo') : ((av.tentativas_feitas||0)>0?'🔁 Nova Tentativa':'🚀 Iniciar')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Modal de confirmação de envio (SweetAlert-style) ── */}
      {showConfirm && (
        <ConfirmModal
          titulo="Enviar Avaliação?"
          mensagem="Tem certeza que deseja enviar sua avaliação? Após o envio, não será possível alterar suas respostas."
          onConfirm={concluir}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

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

// - Fase de Upload dedicada (tipo: entrega) -
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
      setAlert({ type:'error', msg:'Adicione pelo menos um arquivo ou comentario.' }); return;
    }
    // Confirma--o inline via confirmAlert helper
    const confirmado = await new Promise(res => {
      var o = document.createElement('div');
      o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(2px)';
      o.innerHTML='<div style="background:white;border-radius:20px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)"><div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:1.5rem;text-align:center"><div style="font-size:46px;margin-bottom:6px">&#128228;</div><div style="font-weight:800;font-size:18px;color:white">Confirmar Envio</div></div><div style="padding:1.5rem;text-align:center"><p style="color:#475569;font-size:14px;margin:0 0 1.25rem;line-height:1.7">Tem certeza que deseja enviar seu trabalho?<br><span style="font-size:12px;color:#64748b">Voce podera cancelar antes do professor corrigir.</span></p><div style="display:flex;gap:10px"><button id="cc" style="flex:1;padding:11px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:#64748b">Cancelar</button><button id="co" style="flex:2;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;cursor:pointer;font-size:14px;font-weight:700">Sim, enviar</button></div></div></div>';
      document.body.appendChild(o);
      o.querySelector('#cc').onclick=function(){ o.remove(); res(false); };
      o.querySelector('#co').onclick=function(){ o.remove(); res(true); };
      o.onclick=function(e){ if(e.target===o){ o.remove(); res(false); } };
    });
    if (!confirmado) return;
    setEnviando(true);
    try {
      // Salvar arquivos e coment-rio na resposta da avalia--o (quest-o de upload_arquivo se houver)
      const questoesUpload = av.questoes_completas?.filter(q => q.tipo === 'upload_arquivo') || [];
      const respostaPayload = JSON.stringify({ arquivos, comentario });

      for (const q of questoesUpload) {
        await api.post('/avaliacoes/responder', {
          tentativa_id: tentativa.id,
          questao_id: q.id,
          resposta: respostaPayload,
        });
      }

      // Se n-o tem quest-o de upload, salvar como coment-rio geral
      if (questoesUpload.length === 0) {
        // Criar uma resposta virtual para o relat-rio
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
      {/* Header da avaliacao */}
      <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:16, padding:'1.5rem', color:'white', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:11, opacity:.5, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>📤 Envio de Arquivo</div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>{av.titulo}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {av.nota_minima && <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(255,255,255,.12)', fontSize:12 }}>✅ Min: {av.nota_minima}/10</span>}
          {av.encerra_em && (
            <span style={{ padding:'4px 12px', borderRadius:50, background:prazoVencido?'rgba(239,68,68,.3)':'rgba(16,185,129,.2)', color:prazoVencido?'#fca5a5':'#34d399', fontSize:12, fontWeight:600 }}>
              📅 Prazo: {new Date(av.encerra_em).toLocaleString('pt-BR')} {prazoVencido&&'(ENCERRADO)'}
            </span>
          )}
        </div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'1.25rem', alignItems:'start' }}>

        {/* Esquerda: descricao da avaliacao */}
        <div>
          {av.descricao && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>📄 Instrucaes</div>
              <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{av.descricao}</div>
            </div>
          )}

          {/* Questaes de upload com enunciado */}
          {(av.questoes_completas||[]).filter(q=>q.tipo==='upload_arquivo').map((q,i) => (
            <div key={q.id} className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:6 }}>
                ❓ Questao {i+1} {q.peso&&q.peso!==1?'· Peso '+q.peso:''}
              </div>
              <div style={{ fontSize:14, color:'var(--slate-700)', lineHeight:1.7 }}>{q.enunciado}</div>
              {q.gabarito && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', borderRadius:6, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
                  💡 Criterios: {q.gabarito}
                </div>
              )}
            </div>
          ))}

          {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length > 0 && (
            <div style={{ padding:'10px 14px', background:'#fffbeb', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
              ⚠️ Esta avaliacao tambem contem {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length} questao(aes) de outros tipos. Volte para responder todas.
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
              <div style={{ fontSize:11, color:'var(--slate-400)' }}>PDF, imagens, ZIP, codigo · Max 10MB</div>
              <input ref={fileRef} type="file" multiple id="av-file-upload" name="av-file-upload" style={{ display:'none' }} onChange={addArquivo} />
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

            {/* Comentario */}
            <textarea rows={3} value={comentario} onChange={e=>setCom(e.target.value)}
              placeholder="Observacaes para o professor (opcional)..."
              style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:12, resize:'none', outline:'none', marginBottom:10, boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />

            <button onClick={enviar} disabled={enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())?0.5:1, boxShadow:'0 4px 14px rgba(16,185,129,.35)', marginBottom:8 }}>
              {enviando ? '⏳ Enviando...' : '🚀 Enviar para o Professor'}
            </button>

            <button onClick={onVoltar}
              style={{ width:'100%', padding:'9px', background:'white', border:'1.5px solid var(--slate-200)', borderRadius:8, color:'var(--slate-600)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
              <- Voltar às Avaliacaes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// - Cron-metro regressivo -
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



// - Modal Quest-es Pendentes -
function PendentesModal({ faltam, total, onContinuar, onEnviarMesmo }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(3px)' }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,.35)', overflow:'hidden', animation:'swAlert .25s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', padding:'1.5rem', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:6 }}>⚠️</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:800, color:'white' }}>Questaes sem resposta</div>
        </div>
        <div style={{ padding:'1.5rem', textAlign:'center' }}>
          <div style={{ fontSize:15, color:'var(--slate-700)', marginBottom:8 }}>
            Voce deixou <strong style={{ color:'#d97706' }}>{faltam} questao{faltam > 1 ? 'aes' : ''}</strong> sem resposta
            de um total de <strong>{total}</strong>.
          </div>
          <div style={{ fontSize:13, color:'var(--slate-500)', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 14px', marginBottom:'1.5rem', lineHeight:1.6 }}>
            Questaes sem resposta serao marcadas como <strong>incorretas</strong> automaticamente.
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onContinuar} style={{ flex:1, padding:'12px 0', border:'2px solid var(--emerald)', borderRadius:10, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--emerald-dark)', transition:'all .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#f0fdf4'}
              onMouseLeave={e=>e.currentTarget.style.background='white'}
            >
              Responder agora
            </button>
            <button onClick={onEnviarMesmo} style={{ flex:1, padding:'12px 0', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(245,158,11,.4)' }}>
              Enviar mesmo assim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// - SweetAlert-style Modal -
function ConfirmModal({ onConfirm, onCancel, titulo, mensagem, submensagem, confirmLabel, cancelLabel, respondidas, total }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(4px)', background:'rgba(15,23,42,.7)' }}>
      <div style={{ background:'white', borderRadius:24, width:'100%', maxWidth:460, boxShadow:'0 32px 80px rgba(0,0,0,.45)', overflow:'hidden', animation:'swAlert .3s cubic-bezier(.34,1.56,.64,1)' }}>

        {/* - Banner superior com gradiente institucional - */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#1d4ed8 100%)', padding:'2rem 1.5rem 1.5rem', textAlign:'center', position:'relative' }}>
          {/* Ícone medallion */}
          <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'3px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', backdropFilter:'blur(4px)', fontSize:34 }}>
            🎓
          </div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:21, fontWeight:800, color:'white', letterSpacing:'-.3px', marginBottom:4 }}>
            {titulo}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', letterSpacing:'.5px', textTransform:'uppercase', fontWeight:600 }}>
            RSC Academy
          </div>
          {/* Onda decorativa */}
          <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:24, background:'white', clipPath:'ellipse(55% 100% at 50% 100%)' }} />
        </div>

        {/* - Corpo - */}
        <div style={{ padding:'1.75rem 1.75rem 1.5rem', textAlign:'center' }}>

          {/* Progresso respondido */}
          {respondidas !== undefined && total > 0 && (
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                <span>Questaes respondidas</span>
                <span style={{ color: respondidas===total ? '#059669' : '#f59e0b', fontWeight:700 }}>
                  {respondidas}/{total}
                </span>
              </div>
              <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:(respondidas/total*100)+'%', background: respondidas===total ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)', transition:'width .4s ease' }} />
              </div>
            </div>
          )}

          <div style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:'1rem', fontWeight:500 }}>
            {mensagem}
          </div>

          {/* Aviso de irrevogabilidade */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'10px 14px', marginBottom:'1.5rem', textAlign:'left' }}>
            <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>⚠️</span>
            <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>
              {submensagem || 'Apos o envio, nao sera possivel alterar suas respostas.'}
            </div>
          </div>

          {/* Botaes */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onCancel}
              style={{ flex:1, padding:'13px 0', border:'2px solid #e2e8f0', borderRadius:12, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'#64748b', letterSpacing:'.2px', transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#94a3b8'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e2e8f0'; }}
            >
              {cancelLabel || 'Voltar e revisar'}
            </button>
            <button onClick={onConfirm}
              style={{ flex:2, padding:'13px 0', border:'none', borderRadius:12, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'white', cursor:'pointer', fontSize:14, fontWeight:800, letterSpacing:'.2px', boxShadow:'0 6px 20px rgba(37,99,235,.45)', transition:'all .15s', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(37,99,235,.55)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 6px 20px rgba(37,99,235,.45)'; }}
            >
              {confirmLabel || 'Entregar Avaliacao'}
            </button>
          </div>

          <div style={{ marginTop:12, fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Envio seguro e registrado automaticamente
          </div>
        </div>
      </div>
      <style>{'@keyframes swAlert { from { transform:scale(.88) translateY(24px); opacity:0; } to { transform:none; opacity:1; } }'}</style>
    </div>
  );
}


// - Markdown simples para feedback IA -
function renderFeedback(text) {
  if (!text) return '';
  return text
    .replace(/## (.+)/g, '<div style="font-weight:800;font-size:14px;color:#1e3a5f;margin:12px 0 4px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.+)/gm, '<li style="margin:2px 0;margin-left:14px;list-style:disc">$1</li>');
}


// - Chamada direta - API (bypassa proxies de antiv-rus) -
async function postDireto(path, payload) {
  const token = localStorage.getItem('rsc_token') || '';
  const url   = window.location.origin + '/api' + path;
  const resp  = await fetch(url, {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body:        JSON.stringify(payload),
    cache:       'no-store',
    credentials: 'same-origin',
    mode:        'same-origin',
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const e = new Error(data.error || 'Erro ' + resp.status);
    e.status  = resp.status;
    e.payload = data;
    throw e;
  }
  return data;
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
  const [showPendentes, setShowPend] = useState({ show:false, faltam:0 });
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
      // tipo entrega - tela de upload dedicada (estilo Atividades)
      const tipoFinal = av.tipo || r.data.avaliacao?.tipo;
      setFase(tipoFinal === 'entrega' ? 'upload' : 'fazendo');
    } catch(e) {
      const data = e.response?.data || {};
      const msg  = data.error || 'Erro ao iniciar avaliacao.';
      if (data.codigo === 'ANTES_ABERTURA') {
        const dt = data.abertura ? new Date(data.abertura).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
        alert('\u23F3 Esta avaliacao ainda nao foi liberada.\n\nDisponivel a partir de: ' + dt);
      } else if (data.codigo === 'APOS_ENCERRAMENTO') {
        alert('\uD83D\uDEAB O prazo desta avaliacao foi encerrado.');
      } else {
        alert(msg);
      }
    }
  };

  // Salvar resposta LOCALMENTE (sem API por quest-o - evita bloqueio Kaspersky)
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
      setShowPend({ show: true, faltam });
      return;
    }
    setShowConfirm(true);
  };
  const concluir = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      // Montar array de todas as respostas
      const respostasArray = Object.entries(respostas).map(([qid, resp]) => ({
        questao_id: Number(qid),
        resposta: typeof resp === 'object' && resp !== null ? JSON.stringify(resp) : resp,
      }));

      // UM -NICO request com respostas + concluir
      // Backend aceita respostas inline e calcula tudo de uma vez
      const data = await postDireto(
        '/avaliacoes/tentativa/' + tentativaAtual.id + '/concluir',
        { respostas: respostasArray }
      );

      try { localStorage.removeItem('av_respostas_' + tentativaAtual.id); } catch(_e) {}

      setResultado(data);
      setFase('resultado');
      load();

    } catch(e) {
      const msg = e.payload?.error || e.message || '';
      const rede = msg.includes('fetch') || msg.includes('network') || msg.includes('Failed') || e.status === undefined;
      if (rede) {
        alert('Erro de conexao. Verifique:\n1. Desative antivirus temporariamente (ex: Kaspersky)\n2. Tente em modo anonimo\n3. Tente outro navegador\n\nSe o problema persistir, seus dados foram salvos localmente.');
      } else {
        alert(msg || 'Erro ao finalizar avaliacao. Tente novamente.');
      }
    }
    setSubmitting(false);
  };

    // - RESULTADO -
  if (fase === 'resultado' && resultado) {
    const { nota, aprovado, xp_ganho, nota_minima, estatisticas, feedback_geral, novas_medalhas, respostas: resCorr, avaliacao_titulo, concluida_em } = resultado;
    const corretas  = estatisticas?.corretas || 0;
    const totalQ    = estatisticas?.total_questoes || (resCorr||[]).length;
    const erros     = estatisticas?.erros ?? (totalQ - corretas);
    const taxa      = estatisticas?.taxa_acerto || 0;
    const dataHora  = concluida_em ? new Date(concluida_em) : new Date();
    const dataStr   = dataHora.toLocaleDateString('pt-BR');
    const horaStr   = dataHora.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const feedbackEmoji = taxa >= 80 ? 'otimo' : taxa >= 50 ? 'bom' : 'revisar';
    const feedbackMsg   = taxa >= 80 ? 'Excelente desempenho!' : taxa >= 50 ? 'Bom desempenho!' : 'Precisa revisar o conteudo.';

    const renderResposta = (val, tipo, alternativas) => {
      if (val === null || val === undefined) return <em style={{ opacity:.5 }}>Sem resposta</em>;
      if (typeof val === 'boolean') return val ? 'Verdadeiro V' : 'Falso X';
      if (typeof val === 'number' && alternativas) {
        const letra = String.fromCharCode(65 + val);
        return letra + ') ' + alternativas[val];
      }
      if (Array.isArray(val) && alternativas) return val.map(i => String.fromCharCode(65+i)+') '+alternativas[i]).join(', ');
      return String(val);
    };

    return (
      <>
      <div style={{ maxWidth:680, margin:'0 auto' }}>

        {/* - HERO - */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', borderRadius:16, padding:'1.75rem 2rem', color:'white', marginBottom:'1rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, opacity:.04, backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'20px 20px' }} />
          <div style={{ fontSize:48, marginBottom:6 }}>{feedbackEmoji}</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:800, marginBottom:4 }}>
            {aprovado ? 'Avaliacao Concluida! 🎉' : 'Avaliacao Concluida'}
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
            {aprovado ? '✅ Aprovado' : '❌ Reprovado'} · Minimo: {nota_minima||6}
          </div>
        </div>

        {/* - INFORMAÇÕES GERAIS - */}
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

        {/* - FEEDBACK IA - */}
        {feedback_geral && (
          <div style={{ background:'white', border:'1px solid #ddd6fe', borderRadius:12, padding:'16px 18px', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:20 }}>🤖</span>
              <div style={{ fontWeight:700, color:'#6d28d9', fontSize:14 }}>Feedback Pedagogico (IA)</div>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe' }}>BNCC · TRI</span>
            </div>
            <div style={{ fontSize:13.5, color:'var(--slate-700)', lineHeight:1.8 }}
              dangerouslySetInnerHTML={{ __html: renderFeedback(feedback_geral) }}
            />
          </div>
        )}

        {/* - MEDALHAS - */}
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

        {/* - DETALHAMENTO POR QUESTÃO - */}
        {(resCorr||[]).length > 0 && (
          <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden', marginBottom:'1rem' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--slate-100)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>📝 Detalhamento por Questao</div>
              <div style={{ display:'flex', gap:12, fontSize:12 }}>
                <span style={{ color:'#10b981', fontWeight:700 }}>✅ {corretas} acertos</span>
                <span style={{ color:'#ef4444', fontWeight:700 }}>❌ {erros} erros</span>
              </div>
            </div>

            {resCorr.map((r, i) => {
              const qMeta  = questoes.find(q => q.id === r.questao_id);
              const enunc  = r.questao_enunciado || qMeta?.enunciado || 'Questao ' + (i+1);
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
                  {/* Numero + resultado */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background: pendente ? '#f59e0b' : acertou ? '#10b981' : '#ef4444',
                      color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700,
                        color: pendente ? '#92400e' : acertou ? '#166534' : '#991b1b' }}>
                        {pendente ? '⏳ Aguardando correcao' : acertou ? '✅ Correto' : '❌ Incorreto'}
                        {!pendente && <span style={{ fontWeight:400, opacity:.7, marginLeft:8 }}>({Math.round(score*100)}%)</span>}
                      </span>
                      {tipo && <span style={{ fontSize:10, marginLeft:10, padding:'1px 7px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-500)' }}>{tipo}</span>}
                    </div>
                    {r.xp_ganho > 0 && <span style={{ fontSize:12, fontWeight:700, color:'#f59e0b' }}>⚡+{r.xp_ganho}</span>}
                  </div>

                  {/* Enunciado */}
                  <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.6, background:'var(--slate-50)', padding:'8px 12px', borderRadius:8, marginBottom:8 }}>
                    <strong>Questao:</strong> {enunc}
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

                  {/* Explicacao */}
                  {explic && (
                    <div style={{ padding:'7px 12px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', fontSize:12, color:'#1d4ed8', marginBottom:6 }}>
                      <strong>💡 Explicacao:</strong> {explic}
                    </div>
                  )}

                  {/* Feedback IA por questao */}
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
                    <div style={{ fontSize:11, color:'#92400e', fontStyle:'italic' }}>O professor ira corrigir sua entrega em breve.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { setFase('lista'); setResultado(null); }}
          style={{ width:'100%', padding:14, background:'var(--emerald)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,.35)' }}>
          Voltar às Avaliacaes
        </button>
      </div>
    );
  }

  // - UPLOAD (tipo entrega - estilo Google Sala de Aula) -
  if (fase === 'upload' && avAtual) {
    return <UploadEntregaFase av={avAtual} tentativa={tentativaAtual} onConcluir={(res) => { setResultado(res); setFase('resultado'); load(); }} onVoltar={() => setFase('lista')} />;
  }

  // - FAZENDO -
  if (fase === 'fazendo' && avAtual) {
    const questaoAtual = questoes[idx];
    const Comp = questaoAtual ? TIPO_COMP[questaoAtual.tipo] : null;
    const respAtual    = respostas[questaoAtual?.id];
    const respondidas  = Object.keys(respostas).length;

    if (questoes.length === 0) return (
      <div style={{ textAlign:'center', padding:'4rem' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
        <div style={{ fontWeight:600, color:'var(--navy)', marginBottom:8 }}>Esta avaliacao nao tem questaes</div>
        <div style={{ fontSize:13, color:'var(--slate-500)', marginBottom:20 }}>O professor ainda nao adicionou questaes a esta avaliacao.</div>
        <button onClick={() => setFase('lista')} style={{ padding:'10px 20px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}><- Voltar</button>
      </div>
    );

    return (
      <>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        {/* HUD */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'1rem', color:'white' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600 }}>{avAtual.titulo}</div>
              <div style={{ fontSize:11, opacity:.6 }}>
                Questao {idx+1} de {questoes.length} · {respondidas} respondida(s)
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

        {/* Card da questao */}
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

        {/* Navegacao */}
        <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
          <button onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx===0}
            style={{ padding:'10px 18px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, opacity:idx===0?0.45:1 }}>
            <- Anterior
          </button>
          {idx < questoes.length - 1 ? (
            <button onClick={() => setIdx(i => i+1)}
              style={{ flex:1, padding:'10px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Proxima ->
            </button>
          ) : (
            <button onClick={pedirConfirmar} disabled={submitting}
              style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:submitting?0.7:1 }}>
              {submitting ? '⏳ Enviando...' : '🚀 Finalizar ('+respondidas+'/'+questoes.length+')'}
            </button>
          )}
        </div>

        {/* Navegacao rapida */}
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

      {/* modais dentro do fazendo */}
      {showPendentes.show && (
        <PendentesModal
          faltam={showPendentes.faltam}
          total={questoes.length}
          onContinuar={() => setShowPend({ show:false, faltam:0 })}
          onEnviarMesmo={() => { setShowPend({ show:false, faltam:0 }); setShowConfirm(true); }}
        />
      )}
      {showConfirm && (
        <ConfirmModal
          titulo="Entregar Avaliacao"
          mensagem="Voce esta prestes a entregar sua avaliacao. Confirme para registrar suas respostas."
          submensagem="Apos o envio nao e possivel alterar as respostas. Certifique-se de ter respondido todas as questaes."
          confirmLabel="Entregar Avaliacao"
          cancelLabel="Voltar e revisar"
          respondidas={Object.keys(respostas).length}
          total={questoes.length}
          onConfirm={concluir}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
    );
  }

  // - LISTA -
  return (
    <>
      <div className="page-header">
        <div className="page-title">Avaliacaes</div>
        <div className="page-sub">Provas e atividades das suas turmas</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : avs.length === 0 ? (
        <div className="card"><EmptyState icon="📝" title="Nenhuma avaliacao disponivel" sub="Seu professor publicara avaliacaes em breve" /></div>
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
            const agora      = new Date();
            const abertura   = av.disponivel_em ? new Date(av.disponivel_em) : null;
            const encerramento = av.encerra_em  ? new Date(av.encerra_em)   : null;
            const bloqueada  = abertura && agora < abertura;
            const encerrada  = encerramento && agora > encerramento;
            const disponivel = !bloqueada && !encerrada;
            const esgotada   = (av.tentativas_feitas||0) >= (av.tentativas_permitidas||1);
            const numQ       = av.total_questoes ?? (Array.isArray(av.questoes) ? av.questoes.length : 0);
            const isEntrega  = av.tipo === 'entrega';

            // Status visual
            const statusCfg = bloqueada
              ? { cor:'#94a3b8', bg:'#f1f5f9', borda:'#cbd5e1', icon:'🔒', label:'Bloqueada', detalhe:'Disponivel em: '+abertura.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) }
              : encerrada
              ? { cor:'#dc2626', bg:'#fef2f2', borda:'#fca5a5', icon:'🔴', label:'Encerrada',  detalhe:'Encerrou em: '+encerramento.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) }
              : { cor:'#059669', bg:'#ecfdf5', borda:'#6ee7b7', icon:'🟢', label:'Disponivel', detalhe:encerramento?('Encerra: '+encerramento.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})):null };

            const notaBorder = av.minha_nota!=null ? (av.minha_nota>=av.nota_minima?'var(--emerald)':'#f59e0b') : statusCfg.borda;

            return (
              <div key={av.id} className="card" style={{ borderLeft:'4px solid '+notaBorder, margin:0, opacity: bloqueada ? .75 : 1 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ fontSize:26, paddingTop:2 }}>{isEntrega?'📤':'📝'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Titulo + status badge */}
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{av.titulo}</span>
                      <span style={{ padding:'2px 9px', borderRadius:50, background:statusCfg.bg, color:statusCfg.cor, fontSize:11, fontWeight:700, border:'1px solid '+statusCfg.borda, whiteSpace:'nowrap' }}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                      {isEntrega && <span style={{ padding:'2px 9px', borderRadius:50, background:'#f0f9ff', color:'#0284c7', fontSize:11, fontWeight:600, border:'1px solid #bae6fd' }}>📤 Arquivo</span>}
                    </div>

                    {av.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:5 }}>{av.descricao}</div>}

                    {/* Info row */}
                    <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap', marginBottom: (bloqueada||encerrada) ? 6 : 0 }}>
                      {isEntrega ? <span>📎 Upload para correcao</span> : <span>❓ {numQ} questao(oes)</span>}
                      {!isEntrega && <span>⏱ {av.tempo_limite}min</span>}
                      <span>🔁 {av.tentativas_feitas||0}/{av.tentativas_permitidas} tentativa(s)</span>
                      {av.minha_nota != null && <span style={{ fontWeight:700, color:av.minha_nota>=av.nota_minima?'var(--emerald-dark)':'var(--coral)' }}>Nota: {av.minha_nota.toFixed(1)}</span>}
                    </div>

                    {/* Data detalhe */}
                    {statusCfg.detalhe && (
                      <div style={{ fontSize:11, fontWeight:600, color:statusCfg.cor, marginTop:3 }}>
                        {bloqueada ? '⏳' : encerrada ? '🚫' : '📅'} {statusCfg.detalhe}
                      </div>
                    )}
                    {abertura && disponivel && (
                      <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:2 }}>
                        📅 Aberta desde: {abertura.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div style={{ flexShrink:0 }}>
                    {bloqueada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#f1f5f9', color:'#94a3b8', fontSize:12, fontWeight:600, border:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>
                        🔒 Bloqueada
                      </span>
                    ) : encerrada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#fef2f2', color:'#b91c1c', fontSize:12, fontWeight:600, border:'1px solid #fca5a5', whiteSpace:'nowrap' }}>
                        🔴 Encerrada
                      </span>
                    ) : esgotada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'var(--slate-100)', color:'var(--slate-500)', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
                        Esgotada
                      </span>
                    ) : (
                      <button onClick={() => iniciar(av)} style={{ padding:'9px 18px', background:isEntrega?'var(--sky)':'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.3)', whiteSpace:'nowrap' }}>
                        {isEntrega ? ((av.tentativas_feitas||0)>0?'Reenviar':'Enviar Arquivo') : ((av.tentativas_feitas||0)>0?'Nova Tentativa':'Iniciar')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        );
      })()}

    </>
  );
}

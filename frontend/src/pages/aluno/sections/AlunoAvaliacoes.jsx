import { useState, useEffect, useRef } from 'react';
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

// ?? Fase de Upload dedicada (tipo: entrega) ???????????????????
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
      setAlert({ type:'error', msg:'Adicione pelo menos um arquivo ou coment?rio.' }); return;
    }
    // SweetAlert-style DOM confirm
    var confirmado = await new Promise(function(res) {
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem';
      o.innerHTML = '<div style="background:white;border-radius:20px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)"><div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:1.5rem;text-align:center"><div style="font-weight:800;font-size:18px;color:white">Confirmar Envio</div></div><div style="padding:1.5rem;text-align:center"><p style="color:#475569;font-size:14px;margin:0 0 1.25rem;line-height:1.7">Tem certeza que deseja enviar seu trabalho?</p><div style="display:flex;gap:10px"><button id="cc" style="flex:1;padding:11px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:#64748b">Cancelar</button><button id="co" style="flex:2;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;cursor:pointer;font-size:14px;font-weight:700">Sim, enviar</button></div></div></div>';
      document.body.appendChild(o);
      o.querySelector('#cc').onclick = function(){ o.remove(); res(false); };
      o.querySelector('#co').onclick = function(){ o.remove(); res(true); };
      o.onclick = function(e){ if(e.target===o){ o.remove(); res(false); } };
    });
    if (!confirmado) return;
    setEnviando(true);
    try {
      // Salvar arquivos e coment?rio na resposta da avalia??o (quest?o de upload_arquivo se houver)
      const questoesUpload = av.questoes_completas?.filter(q => q.tipo === 'upload_arquivo') || [];
      const respostaPayload = JSON.stringify({ arquivos, comentario });

      for (const q of questoesUpload) {
        await api.post('/avaliacoes/responder', {
          tentativa_id: tentativa.id,
          questao_id: q.id,
          resposta: respostaPayload,
        });
      }

      // Se n?o tem quest?o de upload, salvar como coment?rio geral
      if (questoesUpload.length === 0) {
        // Criar uma resposta virtual para o relat?rio
        await api.post('/avaliacoes/responder', { tentativa_id: tentativa.id, questao_id: 0, resposta: respostaPayload }).catch(() => {});
      }

      const r = await api.post('/avaliacoes/tentativa/'+tentativa.id+'/concluir');
      setAlert({ type:'success', msg:'? Enviado com sucesso!' });
      setTimeout(() => onConcluir(r.data), 1500);
    } catch(e) { setAlert({ type:'error', msg:e.response?.data?.error||'Erro ao enviar.' }); }
    setEnviando(false);
  };

  const fmtSize = (b) => b < 1048576 ? Math.round(b/1024)+'KB' : (b/1048576).toFixed(1)+'MB';

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      {/* Header da avalia??o */}
      <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:16, padding:'1.5rem', color:'white', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:11, opacity:.5, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>? Envio de Arquivo</div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>{av.titulo}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {av.nota_minima && <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(255,255,255,.12)', fontSize:12 }}>? M?n: {av.nota_minima}/10</span>}
          {av.encerra_em && (
            <span style={{ padding:'4px 12px', borderRadius:50, background:prazoVencido?'rgba(239,68,68,.3)':'rgba(16,185,129,.2)', color:prazoVencido?'#fca5a5':'#34d399', fontSize:12, fontWeight:600 }}>
              ? Prazo: {new Date(av.encerra_em).toLocaleString('pt-BR')} {prazoVencido&&'(ENCERRADO)'}
            </span>
          )}
        </div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'1.25rem', alignItems:'start' }}>

        {/* Esquerda: descri??o da avalia??o */}
        <div>
          {av.descricao && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:8 }}>? Instru??es</div>
              <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{av.descricao}</div>
            </div>
          )}

          {/* Quest?es de upload com enunciado */}
          {(av.questoes_completas||[]).filter(q=>q.tipo==='upload_arquivo').map((q,i) => (
            <div key={q.id} className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)', marginBottom:6 }}>
                ? Quest?o {i+1} {q.peso&&q.peso!==1?'? Peso '+q.peso:''}
              </div>
              <div style={{ fontSize:14, color:'var(--slate-700)', lineHeight:1.7 }}>{q.enunciado}</div>
              {q.gabarito && (
                <div style={{ marginTop:8, padding:'8px 12px', background:'#fffbeb', borderRadius:6, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
                  ? Crit?rios: {q.gabarito}
                </div>
              )}
            </div>
          ))}

          {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length > 0 && (
            <div style={{ padding:'10px 14px', background:'#fffbeb', borderRadius:8, border:'1px solid #fcd34d', fontSize:12, color:'#92400e' }}>
              ?? Esta avalia??o tamb?m cont?m {(av.questoes_completas||[]).filter(q=>q.tipo!=='upload_arquivo').length} quest?o(?es) de outros tipos. Volte para responder todas.
            </div>
          )}
        </div>

        {/* Direita: painel de entrega */}
        <div style={{ background:'white', border:'2px solid var(--slate-200)', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.08)', position:'sticky', top:16 }}>
          <div style={{ padding:'12px 16px', background:'var(--slate-50)', borderBottom:'1px solid var(--slate-100)', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, color:'var(--navy)' }}>? Sua Entrega</div>
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
              <div style={{ fontSize:30, marginBottom:6 }}>?</div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:2 }}>Adicionar arquivos</div>
              <div style={{ fontSize:11, color:'var(--slate-400)' }}>PDF, imagens, ZIP, c?digo ? M?x 10MB</div>
              <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={addArquivo} />
            </div>

            {/* Arquivos selecionados */}
            {arquivos.map((arq,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(16,185,129,.05)', borderRadius:7, border:'1px solid rgba(16,185,129,.2)', marginBottom:4 }}>
                <span style={{ fontSize:14 }}>{arq.tipo?.startsWith('image/')?'??':'?'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--navy)' }}>{arq.nome}</div>
                  <div style={{ fontSize:10, color:'var(--slate-400)' }}>{fmtSize(arq.tamanho)}</div>
                </div>
                <button onClick={()=>removerArq(i)} style={{ background:'#fef2f2', border:'none', color:'#b91c1c', borderRadius:5, cursor:'pointer', padding:'2px 7px', fontSize:11 }}>?</button>
              </div>
            ))}

            {/* Coment?rio */}
            <textarea rows={3} value={comentario} onChange={e=>setCom(e.target.value)}
              placeholder="Observa??es para o professor (opcional)..."
              style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:12, resize:'none', outline:'none', marginBottom:10, boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />

            <button onClick={enviar} disabled={enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:enviando||prazoVencido||(arquivos.length===0&&!comentario.trim())?0.5:1, boxShadow:'0 4px 14px rgba(16,185,129,.35)', marginBottom:8 }}>
              {enviando ? '? Enviando...' : '? Enviar para o Professor'}
            </button>

            <button onClick={onVoltar}
              style={{ width:'100%', padding:'9px', background:'white', border:'1.5px solid var(--slate-200)', borderRadius:8, color:'var(--slate-600)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
              ? Voltar ?s Avalia??es
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ?? Cron?metro regressivo ?????????????????????????????????????
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
      <span style={{ fontSize:14 }}>{urgente ? '??' : '?'}</span>
      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color: urgente ? '#b91c1c' : 'white' }}>
        {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  );
}

export default function AlunoAvaliacoes() {
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPendentes, setShowPend] = useState({ show:false, faltam:0 });
  const [resultado, setResultado] = useState(null);
  const [tempoSeg, setTempoSeg] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [r, dRes] = await Promise.all([
        api.get('/avaliacoes'),
        api.get('/disciplinas').catch(() => ({ data: { disciplinas: [] } })),
      ]);
      setAvs(r.data.avaliacoes || []);
      const dm = {};
      (dRes.data.disciplinas || []).forEach(function(d){ dm[d.id] = d.nome; });
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
      // tipo entrega ? tela de upload dedicada (estilo Atividades)
      const tipoFinal = av.tipo || r.data.avaliacao?.tipo;
      setFase(tipoFinal === 'entrega' ? 'upload' : 'fazendo');
    } catch(e){ alert(e.response?.data?.error || 'Erro ao iniciar avalia??o.'); }
  };

  // Save locally - batch send on submit (avoids Kaspersky blocking per-answer requests)
  const salvarResposta = function(qid, resp) {
    setRespostas(function(prev){ return Object.assign({}, prev, { [qid]: resp }); });
    try {
      var key = 'av_resp_' + (tentativaAtual ? tentativaAtual.id : 'tmp');
      var cur = JSON.parse(localStorage.getItem(key) || '{}');
      cur[qid] = resp;
      localStorage.setItem(key, JSON.stringify(cur));
    } catch(e) {}
  };

  const pedirConfirmar = function() {
    var respondidas = Object.keys(respostas).length;
    if (respondidas < questoes.length) {
      setShowPend({ show: true, faltam: questoes.length - respondidas });
      return;
    }
    setShowConfirm(true);
  };

  const concluir = async function() {
    setShowConfirm(false);
    setSubmitting(true);
    var token = localStorage.getItem('rsc_token') || '';
    var url = window.location.origin + '/api/avaliacoes/tentativa/' + tentativaAtual.id + '/concluir';
    var respostasArray = Object.entries(respostas).map(function([qid, resp]) {
      return { questao_id: Number(qid), resposta: typeof resp === 'object' && resp !== null ? JSON.stringify(resp) : resp };
    });
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ respostas: respostasArray }),
        cache: 'no-store', credentials: 'same-origin', mode: 'same-origin',
      });
      var data = await resp.json().catch(function(){ return {}; });
      if (!resp.ok) throw new Error(data.error || 'Erro ' + resp.status);
      try { localStorage.removeItem('av_resp_' + tentativaAtual.id); } catch(e) {}
      setResultado(data);
      setFase('resultado');
      load();
    } catch(e) {
      var msg = e.message || '';
      if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')) {
        alert('Erro de conexao. Desative o antivirus (ex: Kaspersky) e tente novamente.');
      } else {
        alert(msg || 'Erro ao finalizar. Tente novamente.');
      }
    }
    setSubmitting(false);
  };

  // ?? RESULTADO ?????????????????????????????????????????????????
  if (fase === 'resultado' && resultado) {
    const { nota, aprovado, xp_ganho, nota_minima, estatisticas, feedback_geral, novas_medalhas, respostas: resCorr } = resultado;
    const corretas = estatisticas?.corretas || 0;
    const totalQ   = estatisticas?.total_questoes || questoes.length;
    const taxa     = estatisticas?.taxa_acerto || 0;
    return (
      <div style={{ maxWidth:600, margin:'0 auto' }}>
        <div className="page-header">
          <div className="page-title">Resultado da Avalia??o</div>
          <div className="page-sub">{avAtual?.titulo}</div>
        </div>

        {/* Nota */}
        <div className="card" style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', padding:'16px 24px', borderRadius:14,
            background: aprovado ? '#f0fdf4' : '#fef2f2',
            border: '2px solid '+(aprovado ? '#86efac' : '#fca5a5'),
            marginBottom:16,
          }}>
            <span style={{ fontFamily:'var(--font-head)', fontSize:48, fontWeight:700, color: aprovado ? 'var(--emerald-dark)' : 'var(--coral)' }}>
              {(nota||0).toFixed(1)}
            </span>
            <span style={{ fontSize:13, fontWeight:600, color: aprovado ? 'var(--emerald-dark)' : 'var(--coral)' }}>
              {aprovado ? '? Aprovado' : '? Reprovado'} ? M?nimo: {nota_minima||6}
            </span>
          </div>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            {[
              { l:'Quest?es',   v: corretas+'/'+totalQ },
              { l:'Taxa Acerto', v: taxa+'%' },
              { l:'XP Ganho',   v: '+'+(xp_ganho||0)+'?' },
            ].map(s => (
              <div key={s.l} style={{ background:'var(--slate-50)', borderRadius:8, padding:'8px 16px', textAlign:'center', border:'1px solid var(--slate-200)' }}>
                <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:2 }}>{s.l}</div>
                <div style={{ fontWeight:700, color:'var(--navy)', fontSize:16 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Medalhas */}
        {novas_medalhas?.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem', background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'2px solid #fcd34d' }}>
            <div style={{ fontWeight:700, color:'#92400e', marginBottom:8 }}>? Nova(s) Medalha(s)!</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {novas_medalhas.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'white', borderRadius:8, border:'1px solid #fcd34d' }}>
                  <span style={{ fontSize:22 }}>{m.icone}</span>
                  <div><div style={{ fontWeight:600, fontSize:13 }}>{m.nome}</div><div style={{ fontSize:11, color:'var(--slate-500)' }}>+{m.xp_bonus} XP</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback IA */}
        {feedback_geral && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>? Feedback da IA</div>
            <div style={{ fontSize:13.5, color:'var(--slate-700)', lineHeight:1.7 }}>{feedback_geral}</div>
          </div>
        )}

        {/* Revis?o */}
        {(resCorr||[]).length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div className="section-title" style={{ marginBottom:'1rem' }}>Revis?o das Respostas</div>
            {resCorr.map((r, i) => {
              const q = questoes.find(q => q.id === r.questao_id);
              const score = r.score || 0;
              const isUpload = q?.tipo === 'upload_arquivo';
              const pendente = isUpload && !r.corrigido_manualmente;
              return (
                <div key={r.questao_id} style={{ padding:'12px', borderRadius:8, marginBottom:8,
                  background: pendente ? '#fffbeb' : score>=0.8 ? '#f0fdf4' : score>0 ? '#fffbeb' : '#fef2f2',
                  border: '1px solid '+(pendente ? '#fcd34d' : score>=0.8 ? '#86efac' : score>0 ? '#fcd34d' : '#fca5a5'),
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--slate-600)' }}>
                      {isUpload ? '? ' : ''}Quest?o {i+1}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color: pendente?'#92400e':score>=0.8?'#15803d':score>0?'#92400e':'#b91c1c' }}>
                      {pendente ? '? Aguardando corre??o' : Math.round(score*100)+'%'}
                    </span>
                  </div>
                  {q && <div style={{ fontSize:13, color:'var(--slate-700)', marginBottom:4 }}>{q.enunciado?.slice(0,120)}{q.enunciado?.length>120?'...':''}</div>}
                  {pendente && (
                    <div style={{ fontSize:11, color:'#92400e' }}>O professor ir? corrigir sua entrega em breve.</div>
                  )}
                  {r.feedback_prof && (
                    <div style={{ fontSize:12, color:'#15803d', background:'#f0fdf4', padding:'6px 10px', borderRadius:6, marginTop:4, border:'1px solid #86efac' }}>
                      ? Professor: {r.feedback_prof}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => { setFase('lista'); setResultado(null); }}
          style={{ width:'100%', padding:12, background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>
          Voltar ?s Avalia??es
        </button>
      </div>
    );
  }

  // ?? UPLOAD (tipo entrega ? estilo Google Sala de Aula) ????????
  if (fase === 'upload' && avAtual) {
    return <UploadEntregaFase av={avAtual} tentativa={tentativaAtual} onConcluir={(res) => { setResultado(res); setFase('resultado'); load(); }} onVoltar={() => setFase('lista')} />;
  }

  // ?? FAZENDO ???????????????????????????????????????????????????
  if (fase === 'fazendo' && avAtual) {
    const questaoAtual = questoes[idx];
    const Comp = questaoAtual ? TIPO_COMP[questaoAtual.tipo] : null;
    const respAtual    = respostas[questaoAtual?.id];
    const respondidas  = Object.keys(respostas).length;

    if (questoes.length === 0) return (
      <div style={{ textAlign:'center', padding:'4rem' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>??</div>
        <div style={{ fontWeight:600, color:'var(--navy)', marginBottom:8 }}>Esta avalia??o n?o tem quest?es</div>
        <div style={{ fontSize:13, color:'var(--slate-500)', marginBottom:20 }}>O professor ainda n?o adicionou quest?es a esta avalia??o.</div>
        <button onClick={() => setFase('lista')} style={{ padding:'10px 20px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>? Voltar</button>
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
                Quest?o {idx+1} de {questoes.length} ? {respondidas} respondida(s)
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

        {/* Card da quest?o */}
        <div className="card">
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'rgba(245,158,11,0.1)', color:'#92400e', fontSize:11, fontWeight:600 }}>
              Peso: {questaoAtual.peso||1}
            </span>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'var(--slate-100)', color:'var(--slate-600)', fontSize:11 }}>
              {questaoAtual.tipo?.replace(/_/g,' ')}
            </span>
            {respostas[questaoAtual.id] !== undefined && (
              <span style={{ padding:'3px 10px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:11, fontWeight:600 }}>? Respondida</span>
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
              questao={questaoAtual}
              onAnswer={resp => salvarResposta(questaoAtual.id, resp)}
              disabled={false}
              respostaDada={respAtual}
            />
          )}
        </div>

        {/* Navega??o */}
        <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
          <button onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx===0}
            style={{ padding:'10px 18px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, opacity:idx===0?0.45:1 }}>
            ? Anterior
          </button>
          {idx < questoes.length - 1 ? (
            <button onClick={() => setIdx(i => i+1)}
              style={{ flex:1, padding:'10px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Pr?xima ?
            </button>
          ) : (
            <button onClick={pedirConfirmar} disabled={submitting}
              style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:submitting?0.7:1 }}>
              {submitting ? '? Enviando...' : '? Finalizar ('+respondidas+'/'+questoes.length+')'}
            </button>
          )}
        </div>

        {/* Navega??o r?pida */}
        <div style={{ marginTop:'1rem', padding:12, background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:8 }}>NAVEGA??O R?PIDA</div>
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
      </div>

      {showPendentes.show && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
          <div style={{ background:'white', borderRadius:20, maxWidth:420, width:'100%', overflow:'hidden', boxShadow:'0 25px 60px rgba(0,0,0,.3)' }}>
            <div style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', padding:'1.5rem', textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:6 }}>!</div>
              <div style={{ fontWeight:800, fontSize:18, color:'white' }}>Questoes sem resposta</div>
            </div>
            <div style={{ padding:'1.5rem', textAlign:'center' }}>
              <p style={{ fontSize:15, color:'#334155', marginBottom:'1rem' }}>
                Voce deixou <strong style={{ color:'#d97706' }}>{showPendentes.faltam}</strong> questao(oes) sem resposta de {questoes.length}.
              </p>
              <div style={{ fontSize:13, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 14px', marginBottom:'1.25rem', color:'#92400e' }}>
                Questoes sem resposta serao marcadas como incorretas.
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={function(){ setShowPend({ show:false, faltam:0 }); }} style={{ flex:1, padding:'12px', border:'2px solid var(--emerald)', borderRadius:10, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--emerald-dark)' }}>
                  Responder agora
                </button>
                <button onClick={function(){ setShowPend({ show:false, faltam:0 }); setShowConfirm(true); }} style={{ flex:1, padding:'12px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  Enviar mesmo assim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(4px)', background:'rgba(15,23,42,.7)' }}>
          <div style={{ background:'white', borderRadius:24, maxWidth:460, width:'100%', boxShadow:'0 32px 80px rgba(0,0,0,.45)', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', padding:'2rem 1.5rem 1.5rem', textAlign:'center', position:'relative' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'3px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:32 }}>
                [G]
              </div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:21, fontWeight:800, color:'white', marginBottom:4 }}>Entregar Avaliacao</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', letterSpacing:'.5px', textTransform:'uppercase', fontWeight:600 }}>RSC Academy</div>
              <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:24, background:'white', clipPath:'ellipse(55% 100% at 50% 100%)' }} />
            </div>
            <div style={{ padding:'1.75rem', textAlign:'center' }}>
              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                  <span>Questoes respondidas</span>
                  <span style={{ color: Object.keys(respostas).length === questoes.length ? '#059669' : '#f59e0b', fontWeight:700 }}>
                    {Object.keys(respostas).length}/{questoes.length}
                  </span>
                </div>
                <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, width:(Object.keys(respostas).length/questoes.length*100)+'%', background: Object.keys(respostas).length===questoes.length ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
                </div>
              </div>
              <div style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:'1rem', fontWeight:500 }}>
                Voce esta prestes a entregar sua avaliacao.
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'10px 14px', marginBottom:'1.5rem', textAlign:'left' }}>
                <span style={{ fontSize:18, flexShrink:0 }}>[!]</span>
                <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>
                  Apos o envio, nao sera possivel alterar suas respostas.
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={function(){ setShowConfirm(false); }} style={{ flex:1, padding:'13px', border:'2px solid #e2e8f0', borderRadius:12, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'#64748b' }}>
                  Voltar e revisar
                </button>
                <button onClick={concluir} style={{ flex:2, padding:'13px', border:'none', borderRadius:12, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'white', cursor:'pointer', fontSize:14, fontWeight:800, boxShadow:'0 6px 20px rgba(37,99,235,.45)' }}>
                  Entregar Avaliacao
                </button>
              </div>
              <div style={{ marginTop:12, fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                Envio seguro e registrado automaticamente
              </div>
            </div>
          </div>
        </div>
      )}
    );
  }

  // ?? LISTA ?????????????????????????????????????????????????????
  // Lista de avaliacoes
  return (
    <>
      <div className="page-header">
        <div className="page-title">Avaliacoes</div>
        <div className="page-sub">Provas e atividades das suas turmas</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}>
          <div className="spinner" style={{ margin:'0 auto' }} />
        </div>
      ) : avs.length === 0 ? (
        <div className="card">
          <EmptyState icon="[PROVA]" title="Nenhuma avaliacao disponivel" sub="Seu professor publicara avaliacoes em breve" />
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {avs.map(function(av) {
            var agora        = new Date();
            var abertura     = av.disponivel_em ? new Date(av.disponivel_em) : null;
            var encerramento = av.encerra_em    ? new Date(av.encerra_em)    : null;
            var bloqueada    = !!(abertura && agora < abertura);
            var encerrada    = !!(encerramento && agora > encerramento);
            var esgotada     = (av.tentativas_feitas||0) >= (av.tentativas_permitidas||1);
            var numQ         = av.total_questoes ?? (Array.isArray(av.questoes) ? av.questoes.length : 0);
            var isEntrega    = av.tipo === 'entrega';
            var discNome     = av.disciplina_id ? (disciplinasMap[av.disciplina_id] || null) : null;
            var statusLabel  = bloqueada ? 'Bloqueada' : encerrada ? 'Encerrada' : 'Disponivel';
            var statusBg     = bloqueada ? '#f1f5f9' : encerrada ? '#fef2f2' : '#ecfdf5';
            var statusCor    = bloqueada ? '#64748b' : encerrada ? '#dc2626' : '#059669';
            var statusBd     = bloqueada ? '#cbd5e1' : encerrada ? '#fca5a5' : '#6ee7b7';
            var borderCor    = av.minha_nota != null ? (av.minha_nota >= av.nota_minima ? 'var(--emerald)' : '#f59e0b') : statusBd;
            return (
              <div key={av.id} className="card" style={{ borderLeft:'4px solid '+borderCor, opacity: bloqueada ? .8 : 1 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ fontSize:26, paddingTop:2 }}>{isEntrega ? '[UP]' : '[PROVA]'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{av.titulo}</span>
                      <span style={{ padding:'2px 9px', borderRadius:50, background:statusBg, color:statusCor, fontSize:11, fontWeight:700, border:'1px solid '+statusBd }}>{statusLabel}</span>
                    </div>
                    {discNome && <div style={{ fontSize:12, color:'var(--sky)', fontWeight:600, marginBottom:4 }}>[DOC] {discNome}</div>}
                    {av.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:5 }}>{av.descricao}</div>}
                    <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap' }}>
                      {isEntrega ? <span>[ARQ] Upload</span> : <span>[?] {numQ} questao(oes)</span>}
                      {!isEntrega && <span>[T] {av.tempo_limite}min</span>}
                      <span>[REP] {av.tentativas_feitas||0}/{av.tentativas_permitidas}x</span>
                      {av.minha_nota != null && <span style={{ fontWeight:700, color:av.minha_nota>=av.nota_minima?'var(--emerald-dark)':'var(--coral)' }}>Nota: {av.minha_nota.toFixed(1)}</span>}
                    </div>
                    {bloqueada && abertura && <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginTop:4 }}>[T] Disponivel: {abertura.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
                    {encerrada && encerramento && <div style={{ fontSize:11, fontWeight:600, color:'#dc2626', marginTop:4 }}>[!] Encerrou: {encerramento.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                    {!bloqueada && !encerrada && encerramento && <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>[CAL] Encerra: {encerramento.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {bloqueada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#f1f5f9', color:'#94a3b8', fontSize:12, fontWeight:600, border:'1px solid #e2e8f0' }}>Bloqueada</span>
                    ) : encerrada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#fef2f2', color:'#b91c1c', fontSize:12, fontWeight:600, border:'1px solid #fca5a5' }}>Encerrada</span>
                    ) : esgotada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'var(--slate-100)', color:'var(--slate-500)', fontSize:12, fontWeight:600 }}>Esgotada</span>
                    ) : (
                      <button onClick={function(){ iniciar(av); }} style={{ padding:'9px 18px', background:isEntrega?'var(--sky)':'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.3)' }}>
                        {isEntrega ? ((av.tentativas_feitas||0)>0?'Reenviar':'Enviar') : ((av.tentativas_feitas||0)>0?'Nova Tentativa':'Iniciar')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

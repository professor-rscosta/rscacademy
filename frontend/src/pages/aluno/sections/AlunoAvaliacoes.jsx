import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import MidiaRenderer from '../../../components/questoes/MidiaRenderer';
import { MultiplaEscolha, VerdadeiroFalso, Dissertativa, Preenchimento, Associacao, Ordenacao, UploadArquivo } from '../../../components/questoes/tipos';

var TIPO_COMP = {
  multipla_escolha: MultiplaEscolha,
  verdadeiro_falso: VerdadeiroFalso,
  dissertativa: Dissertativa,
  preenchimento: Preenchimento,
  associacao: Associacao,
  ordenacao: Ordenacao,
  upload_arquivo: UploadArquivo,
};

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'3rem' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <div style={{ fontWeight:600, color:'var(--slate-600)', marginBottom:4 }}>{title}</div>
      {sub && <div style={{ fontSize:13, color:'var(--slate-400)' }}>{sub}</div>}
    </div>
  );
}

function Cronometro({ segundos, onExpire }) {
  var [restante, setRestante] = useState(segundos);
  var ref = useRef(null);
  useEffect(function() {
    if (!segundos) return;
    ref.current = setInterval(function() {
      setRestante(function(s) {
        if (s <= 1) { clearInterval(ref.current); onExpire && onExpire(); return 0; }
        return s - 1;
      });
    }, 1000);
    return function() { clearInterval(ref.current); };
  }, [segundos]);
  if (!segundos) return null;
  var m = Math.floor(restante / 60);
  var s = restante % 60;
  var cor = restante < 60 ? '#dc2626' : restante < 180 ? '#f59e0b' : 'white';
  return (
    <div style={{ fontSize:13, fontWeight:700, color:cor, background:'rgba(0,0,0,.2)', padding:'4px 12px', borderRadius:20 }}>
      {m}:{s < 10 ? '0' : ''}{s}
    </div>
  );
}

function renderResposta(val, tipo, alternativas) {
  if (val === null || val === undefined) return 'Sem resposta';
  if (typeof val === 'boolean') return val ? 'Verdadeiro' : 'Falso';
  if (typeof val === 'number' && alternativas) {
    return String.fromCharCode(65 + val) + ') ' + alternativas[val];
  }
  if (Array.isArray(val) && alternativas) {
    return val.map(function(i) { return String.fromCharCode(65+i)+') '+alternativas[i]; }).join(', ');
  }
  return String(val);
}

export default function AlunoAvaliacoes({ initialAvaliacaoId, onReady }) {
  var auth = useAuth();
  var user = auth.user;
  var [avs, setAvs]           = useState([]);
  var [disciplinasMap, setDM] = useState({});
  var [loading, setLoading]   = useState(true);
  var [fase, setFase]         = useState('lista');
  var [avAtual, setAvAtual]   = useState(null);
  var [tentativaAtual, setTentativa] = useState(null);
  var [questoes, setQuestoes] = useState([]);
  var [idx, setIdx]           = useState(0);
  var [respostas, setRespostas] = useState({});
  var [submitting, setSub]    = useState(false);
  var [resultado, setResultado] = useState(null);
  var [tempoSeg, setTempo]    = useState(null);
  var [showConfirm, setShowConfirm] = useState(false);
  var [pendFaltam, setPendFaltam] = useState(0);
  var [showPend, setShowPend] = useState(false);

  var load = useCallback(function() {
    setLoading(true);
    Promise.all([
      api.get('/avaliacoes'),
      api.get('/disciplinas').catch(function() { return { data: { disciplinas: [] } }; }),
    ]).then(function(results) {
      setAvs(results[0].data.avaliacoes || []);
      var dm = {};
      (results[1].data.disciplinas || []).forEach(function(d) { dm[d.id] = d.nome; });
      setDM(dm);
    }).catch(function(e) { console.error(e); }).finally(function() { setLoading(false); });
  }, []);

  useEffect(function() { load(); }, [load]);

  useEffect(function() {
    if (onReady) onReady();
    if (initialAvaliacaoId && avs.length > 0) {
      var av = avs.find(function(a) { return a.id === initialAvaliacaoId; });
      if (av) iniciar(av);
    }
  }, [avs]);

  var salvarResposta = function(qid, resp) {
    setRespostas(function(prev) {
      var next = Object.assign({}, prev);
      next[qid] = resp;
      return next;
    });
    try {
      var key = 'av_resp_' + (tentativaAtual ? tentativaAtual.id : 'tmp');
      var cur = JSON.parse(localStorage.getItem(key) || '{}');
      cur[qid] = resp;
      localStorage.setItem(key, JSON.stringify(cur));
    } catch(e) {}
  };

  var iniciar = function(av) {
    api.post('/avaliacoes/' + av.id + '/iniciar').then(function(r) {
      var qs = r.data.avaliacao.questoes_completas || [];
      setAvAtual(r.data.avaliacao);
      setTentativa(r.data.tentativa);
      setQuestoes(qs);
      setTempo(r.data.tempo_restante_segundos || null);
      setIdx(0);
      setRespostas({});
      setFase(av.tipo === 'entrega' ? 'upload' : 'fazendo');
    }).catch(function(e) {
      var data = e.response ? e.response.data : {};
      var msg  = data.error || 'Erro ao iniciar avaliacao.';
      if (data.codigo === 'ANTES_ABERTURA') {
        var dt = data.abertura ? new Date(data.abertura).toLocaleString('pt-BR') : '';
        alert('Esta avaliacao ainda nao foi liberada.\nDisponivel a partir de: ' + dt);
      } else if (data.codigo === 'APOS_ENCERRAMENTO') {
        alert('O prazo desta avaliacao foi encerrado.');
      } else {
        alert(msg);
      }
    });
  };

  var pedirConfirmar = function() {
    var respondidas = Object.keys(respostas).length;
    if (respondidas < questoes.length) {
      setPendFaltam(questoes.length - respondidas);
      setShowPend(true);
      return;
    }
    setShowConfirm(true);
  };

  var concluir = function() {
    setShowConfirm(false);
    setSub(true);
    var token = localStorage.getItem('rsc_token') || '';
    var url   = window.location.origin + '/api/avaliacoes/tentativa/' + tentativaAtual.id + '/concluir';
    var respostasArray = Object.entries(respostas).map(function(entry) {
      var qid  = entry[0];
      var resp = entry[1];
      return { questao_id: Number(qid), resposta: typeof resp === 'object' && resp !== null ? JSON.stringify(resp) : resp };
    });
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ respostas: respostasArray }),
      cache: 'no-store', credentials: 'same-origin', mode: 'same-origin',
    }).then(function(resp) {
      return resp.json().then(function(data) { return { ok: resp.ok, data: data }; });
    }).then(function(result) {
      if (!result.ok) throw new Error(result.data.error || 'Erro');
      try { localStorage.removeItem('av_resp_' + tentativaAtual.id); } catch(e) {}
      setResultado(result.data);
      setFase('resultado');
      load();
    }).catch(function(e) {
      var msg = e.message || '';
      if (!msg || msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')) {
        alert('Erro de conexao. Desative o antivirus (ex: Kaspersky) e tente novamente, ou use outro navegador.');
      } else {
        alert(msg);
      }
    }).finally(function() { setSub(false); });
  };

  if (fase === 'resultado' && resultado) {
    var nota        = resultado.nota;
    var aprovado    = resultado.aprovado;
    var xpGanho     = resultado.xp_ganho;
    var notaMin     = resultado.nota_minima;
    var stats       = resultado.estatisticas || {};
    var feedbackIA  = resultado.feedback_geral;
    var resCorr     = resultado.respostas || [];
    var corretas    = stats.corretas || 0;
    var totalQ      = stats.total_questoes || resCorr.length;
    var erros       = stats.erros != null ? stats.erros : totalQ - corretas;
    var taxa        = stats.taxa_acerto || 0;
    var dataHora    = resultado.concluida_em ? new Date(resultado.concluida_em) : new Date();
    return (
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', borderRadius:16, padding:'2rem', color:'white', marginBottom:'1.5rem', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:8 }}>{aprovado ? '[OK]' : '[X]'}</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:800, marginBottom:4 }}>
            {resultado.avaliacao_titulo || avAtual && avAtual.titulo || 'Avaliacao'}
          </div>
          <div style={{ fontSize:48, fontWeight:900, marginBottom:8 }}>
            {nota != null ? nota.toFixed(1) : '--'}
            <span style={{ fontSize:18, opacity:.7 }}>/10</span>
          </div>
          <div style={{ display:'inline-block', padding:'6px 20px', borderRadius:99, background:aprovado?'rgba(16,185,129,.25)':'rgba(239,68,68,.25)', border:'1px solid '+(aprovado?'rgba(16,185,129,.5)':'rgba(239,68,68,.5)'), fontSize:14, fontWeight:700 }}>
            {aprovado ? 'Aprovado' : 'Reprovado'} - Minimo: {notaMin||6}
          </div>
        </div>

        <div className="card" style={{ marginBottom:'1rem' }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:'1rem' }}>
            <div style={{ flex:1, textAlign:'center', padding:'1rem', background:'#f0fdf4', borderRadius:10 }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#15803d' }}>{corretas}</div>
              <div style={{ fontSize:12, color:'#15803d', fontWeight:600 }}>Acertos</div>
            </div>
            <div style={{ flex:1, textAlign:'center', padding:'1rem', background:'#fef2f2', borderRadius:10 }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#b91c1c' }}>{erros}</div>
              <div style={{ fontSize:12, color:'#b91c1c', fontWeight:600 }}>Erros</div>
            </div>
            <div style={{ flex:1, textAlign:'center', padding:'1rem', background:'#eff6ff', borderRadius:10 }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#1d4ed8' }}>{Math.round(taxa)}%</div>
              <div style={{ fontSize:12, color:'#1d4ed8', fontWeight:600 }}>Acerto</div>
            </div>
            <div style={{ flex:1, textAlign:'center', padding:'1rem', background:'#fffbeb', borderRadius:10 }}>
              <div style={{ fontSize:28, fontWeight:900, color:'#92400e' }}>+{xpGanho||0}</div>
              <div style={{ fontSize:12, color:'#92400e', fontWeight:600 }}>XP</div>
            </div>
          </div>
          <div style={{ fontSize:12, color:'var(--slate-400)', display:'flex', gap:12, flexWrap:'wrap' }}>
            <span>Aluno: {user && user.nome || 'Aluno'}</span>
            <span>Data: {dataHora.toLocaleDateString('pt-BR')}</span>
            <span>Hora: {dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>

        {feedbackIA && (
          <div className="card" style={{ marginBottom:'1rem', borderLeft:'4px solid var(--sky)' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:8 }}>[AI] Feedback Pedagogico</div>
            <div style={{ fontSize:13, color:'var(--slate-700)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{feedbackIA}</div>
          </div>
        )}

        {resCorr.length > 0 && (
          <div className="card" style={{ marginBottom:'1rem' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:12 }}>Detalhamento por Questao</div>
            {resCorr.map(function(r, i) {
              var q       = questoes.find(function(x) { return x.id === r.questao_id; });
              var tipo    = q ? q.tipo : 'multipla_escolha';
              var alts    = q ? q.alternativas : null;
              var acertou = r.score >= 0.8;
              return (
                <div key={r.questao_id} style={{ padding:'12px', borderRadius:8, marginBottom:8, background:acertou?'#f0fdf4':'#fef2f2', border:'1px solid '+(acertou?'#86efac':'#fca5a5') }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--slate-600)' }}>Questao {i+1}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:acertou?'#15803d':'#b91c1c' }}>{acertou ? '[OK] Correto' : '[X] Incorreto'}</span>
                  </div>
                  {q && <div style={{ fontSize:13, color:'var(--slate-700)', marginBottom:6 }}>{q.enunciado}</div>}
                  <div style={{ fontSize:12 }}>
                    <strong>Sua resposta:</strong> {renderResposta(r.resposta_aluno, tipo, alts)}
                  </div>
                  {!acertou && q && q.gabarito != null && (
                    <div style={{ fontSize:12, color:'#15803d', marginTop:4 }}>
                      <strong>Correta:</strong> {renderResposta(q.gabarito, tipo, alts)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={function() { setFase('lista'); setResultado(null); }}
          style={{ width:'100%', padding:14, background:'var(--emerald)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 3px 10px rgba(16,185,129,.3)' }}>
          Voltar as Avaliacoes
        </button>
      </div>
    );
  }

  if (fase === 'upload' && avAtual) {
    return (
      <div style={{ textAlign:'center', padding:'2rem' }}>
        <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Modo Entrega - {avAtual.titulo}</div>
        <div style={{ fontSize:13, color:'var(--slate-500)', marginBottom:16 }}>Envie seu arquivo para o professor corrigir.</div>
        <button onClick={function() { setFase('lista'); }}
          style={{ padding:'10px 20px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
          Voltar
        </button>
      </div>
    );
  }

  if (fase === 'fazendo' && avAtual) {
    var questaoAtual = questoes[idx];
    var Comp = questaoAtual ? TIPO_COMP[questaoAtual.tipo] : null;
    var respondidas = Object.keys(respostas).length;

    if (questoes.length === 0) {
      return (
        <div style={{ textAlign:'center', padding:'4rem' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>[!]</div>
          <div style={{ fontWeight:600, color:'var(--navy)', marginBottom:20 }}>Esta avaliacao nao tem questoes</div>
          <button onClick={function() { setFase('lista'); }}
            style={{ padding:'10px 20px', background:'var(--navy)', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
            Voltar
          </button>
        </div>
      );
    }

    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>

        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:12, padding:'14px 18px', marginBottom:'1rem', color:'white' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600 }}>{avAtual.titulo}</div>
              <div style={{ fontSize:11, opacity:.6 }}>Questao {idx+1} de {questoes.length} - {respondidas} respondida(s)</div>
            </div>
            <Cronometro segundos={tempoSeg} onExpire={concluir} />
          </div>
          <div style={{ display:'flex', gap:3 }}>
            {questoes.map(function(q, i) {
              return (
                <div key={i} onClick={function() { setIdx(i); }}
                  style={{ flex:1, height:5, borderRadius:99, cursor:'pointer',
                    background: respostas[q.id] !== undefined ? 'var(--emerald)' : i===idx ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)' }} />
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'rgba(245,158,11,0.1)', color:'#92400e', fontSize:12, fontWeight:600 }}>
              Peso: {questaoAtual.peso||1}
            </span>
            <span style={{ padding:'3px 10px', borderRadius:50, background:'var(--slate-100)', color:'var(--slate-600)', fontSize:12 }}>
              {questaoAtual.tipo && questaoAtual.tipo.replace(/_/g,' ')}
            </span>
            {respostas[questaoAtual.id] !== undefined && (
              <span style={{ padding:'3px 10px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:11, fontWeight:600 }}>[OK] Respondida</span>
            )}
          </div>

          {questaoAtual.tipo !== 'preenchimento' && (
            <div style={{ fontSize:15, fontWeight:500, color:'var(--slate-800)', lineHeight:1.7, marginBottom:16 }}>
              {questaoAtual.enunciado}
            </div>
          )}

          {questaoAtual.midias && questaoAtual.midias.length > 0 && (
            <MidiaRenderer midias={questaoAtual.midias} />
          )}

          {Comp && (
            <Comp
              key={questaoAtual.id}
              questao={questaoAtual}
              onAnswer={function(resp) { salvarResposta(questaoAtual.id, resp); }}
              disabled={false}
              respostaDada={respostas[questaoAtual.id]}
            />
          )}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
          <button onClick={function() { setIdx(function(i) { return Math.max(0,i-1); }); }} disabled={idx===0}
            style={{ padding:'10px 18px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:idx===0?'not-allowed':'pointer', color:'var(--slate-600)', fontSize:13, fontWeight:600, opacity:idx===0?.5:1 }}>
            Anterior
          </button>
          <button onClick={function() { setIdx(function(i) { return Math.min(questoes.length-1,i+1); }); }} disabled={idx===questoes.length-1}
            style={{ flex:1, padding:'10px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:idx===questoes.length-1?'not-allowed':'pointer', color:'var(--slate-600)', fontSize:13, fontWeight:600, opacity:idx===questoes.length-1?.5:1 }}>
            Proxima
          </button>
          <button onClick={pedirConfirmar} disabled={submitting}
            style={{ padding:'10px 22px', background:submitting?'var(--slate-200)':'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:submitting?'var(--slate-400)':'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:submitting?'not-allowed':'pointer', boxShadow:submitting?'none':'0 3px 12px rgba(16,185,129,.4)' }}>
            {submitting ? 'Enviando...' : 'Finalizar (' + respondidas + '/' + questoes.length + ')'}
          </button>
        </div>

        <div style={{ marginTop:'1rem', padding:12, background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:8 }}>NAVEGACAO RAPIDA</div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {questoes.map(function(q, i) {
              return (
                <button key={i} onClick={function() { setIdx(i); }}
                  style={{ width:32, height:32, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                    border:'2px solid '+(i===idx?'var(--emerald)':respostas[q.id]!==undefined?'var(--sky)':'var(--slate-200)'),
                    background:i===idx?'var(--emerald)':respostas[q.id]!==undefined?'rgba(14,165,233,0.1)':'white',
                    color:i===idx?'white':'var(--slate-600)' }}>
                  {i+1}
                </button>
              );
            })}
          </div>
        </div>

        {showPend && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
            <div style={{ background:'white', borderRadius:20, maxWidth:420, width:'100%', overflow:'hidden', boxShadow:'0 25px 60px rgba(0,0,0,.3)' }}>
              <div style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', padding:'1.5rem', textAlign:'center' }}>
                <div style={{ fontSize:44, marginBottom:6 }}>[!]</div>
                <div style={{ fontWeight:800, fontSize:18, color:'white' }}>Questoes sem resposta</div>
              </div>
              <div style={{ padding:'1.5rem', textAlign:'center' }}>
                <p style={{ fontSize:15, color:'#334155', marginBottom:'1rem' }}>
                  Voce deixou <strong style={{ color:'#d97706' }}>{pendFaltam}</strong> questao(oes) sem resposta de {questoes.length}.
                </p>
                <div style={{ fontSize:13, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 14px', marginBottom:'1.25rem', color:'#92400e' }}>
                  Questoes sem resposta serao marcadas como incorretas.
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={function() { setShowPend(false); }}
                    style={{ flex:1, padding:'12px', border:'2px solid var(--emerald)', borderRadius:10, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--emerald-dark)' }}>
                    Responder agora
                  </button>
                  <button onClick={function() { setShowPend(false); setShowConfirm(true); }}
                    style={{ flex:1, padding:'12px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', cursor:'pointer', fontSize:13, fontWeight:700 }}>
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
                <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'3px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:28 }}>
                  [G]
                </div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:21, fontWeight:800, color:'white', marginBottom:4 }}>Entregar Avaliacao</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', textTransform:'uppercase', fontWeight:600 }}>RSC Academy</div>
                <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:24, background:'white', clipPath:'ellipse(55% 100% at 50% 100%)' }} />
              </div>
              <div style={{ padding:'1.75rem', textAlign:'center' }}>
                <div style={{ marginBottom:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                    <span>Questoes respondidas</span>
                    <span style={{ color: Object.keys(respostas).length===questoes.length?'#059669':'#f59e0b', fontWeight:700 }}>
                      {Object.keys(respostas).length}/{questoes.length}
                    </span>
                  </div>
                  <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:Object.keys(respostas).length===questoes.length?'linear-gradient(90deg,#10b981,#059669)':'linear-gradient(90deg,#f59e0b,#d97706)', width:(Math.round(Object.keys(respostas).length/Math.max(questoes.length,1)*100))+'%' }} />
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
                  <button onClick={function() { setShowConfirm(false); }}
                    style={{ flex:1, padding:'13px', border:'2px solid #e2e8f0', borderRadius:12, background:'white', cursor:'pointer', fontSize:13, fontWeight:700, color:'#64748b' }}>
                    Voltar e revisar
                  </button>
                  <button onClick={concluir}
                    style={{ flex:2, padding:'13px', border:'none', borderRadius:12, background:'linear-gradient(135deg,#1e3a5f,#2563eb)', color:'white', cursor:'pointer', fontSize:14, fontWeight:800, boxShadow:'0 6px 20px rgba(37,99,235,.45)' }}>
                    Entregar Avaliacao
                  </button>
                </div>
                <div style={{ marginTop:12, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
                  Envio seguro e registrado automaticamente
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

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
            var numQ         = av.total_questoes != null ? av.total_questoes : (Array.isArray(av.questoes) ? av.questoes.length : 0);
            var isEntrega    = av.tipo === 'entrega';
            var discNome     = av.disciplina_id ? (disciplinasMap[av.disciplina_id] || null) : null;
            var statusBg     = bloqueada ? '#f1f5f9' : encerrada ? '#fef2f2' : '#ecfdf5';
            var statusCor    = bloqueada ? '#64748b' : encerrada ? '#dc2626' : '#059669';
            var statusBd     = bloqueada ? '#cbd5e1' : encerrada ? '#fca5a5' : '#6ee7b7';
            var statusLabel  = bloqueada ? 'Bloqueada' : encerrada ? 'Encerrada' : 'Disponivel';
            var borderCor    = av.minha_nota != null ? (av.minha_nota >= av.nota_minima ? 'var(--emerald)' : '#f59e0b') : statusBd;
            return (
              <div key={av.id} className="card" style={{ borderLeft:'4px solid '+borderCor, opacity:bloqueada?.8:1 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ fontSize:26, paddingTop:2 }}>{isEntrega ? '[UP]' : '[PROVA]'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{av.titulo}</span>
                      <span style={{ padding:'2px 9px', borderRadius:50, background:statusBg, color:statusCor, fontSize:11, fontWeight:700, border:'1px solid '+statusBd }}>{statusLabel}</span>
                    </div>
                    {discNome && <div style={{ fontSize:12, color:'var(--sky)', fontWeight:600, marginBottom:4 }}>{discNome}</div>}
                    {av.descricao && <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:5 }}>{av.descricao}</div>}
                    <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap' }}>
                      {isEntrega ? <span>Upload arquivo</span> : <span>{numQ} questao(oes)</span>}
                      {!isEntrega && <span>{av.tempo_limite}min</span>}
                      <span>{av.tentativas_feitas||0}/{av.tentativas_permitidas} tentativa(s)</span>
                      {av.minha_nota != null && <span style={{ fontWeight:700, color:av.minha_nota>=av.nota_minima?'var(--emerald-dark)':'var(--coral)' }}>Nota: {av.minha_nota.toFixed(1)}</span>}
                    </div>
                    {bloqueada && abertura && <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginTop:4 }}>Disponivel: {abertura.toLocaleString('pt-BR')}</div>}
                    {encerrada && encerramento && <div style={{ fontSize:11, fontWeight:600, color:'#dc2626', marginTop:4 }}>Encerrou: {encerramento.toLocaleString('pt-BR')}</div>}
                    {!bloqueada && !encerrada && encerramento && <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>Encerra: {encerramento.toLocaleString('pt-BR')}</div>}
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {bloqueada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#f1f5f9', color:'#94a3b8', fontSize:12, fontWeight:600, border:'1px solid #e2e8f0' }}>Bloqueada</span>
                    ) : encerrada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'#fef2f2', color:'#b91c1c', fontSize:12, fontWeight:600, border:'1px solid #fca5a5' }}>Encerrada</span>
                    ) : esgotada ? (
                      <span style={{ padding:'7px 14px', borderRadius:8, background:'var(--slate-100)', color:'var(--slate-500)', fontSize:12, fontWeight:600 }}>Esgotada</span>
                    ) : (
                      <button onClick={function() { iniciar(av); }} style={{ padding:'9px 18px', background:isEntrega?'var(--sky)':'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', boxShadow:'0 2px 8px rgba(16,185,129,.3)' }}>
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

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../hooks/useApi';
import {
  MultiplaEscolha, VerdadeiroFalso, Dissertativa,
  Preenchimento, Associacao, Ordenacao, UploadArquivo
} from '../../../components/questoes/tipos';
import MidiaRenderer from '../../../components/questoes/MidiaRenderer';
import CurvaCaracteristica from '../../../components/tri/CurvaCaracteristica';

const TIPO_COMP = {
  multipla_escolha: MultiplaEscolha, verdadeiro_falso: VerdadeiroFalso,
  dissertativa: Dissertativa,        preenchimento: Preenchimento,
  associacao: Associacao,            ordenacao: Ordenacao,
  upload_arquivo: UploadArquivo,
};

// ── Barra de habilidade (theta) ───────────────────────────────
function ThetaBar({ theta }) {
  const pct = Math.round(((theta + 4) / 8) * 100);
  const cor = theta <= -2.5 ? '#94a3b8' : theta <= -1.5 ? '#60a5fa' : theta <= -.5 ? '#34d399'
            : theta <= .5 ? '#fbbf24' : theta <= 1.5 ? '#f97316' : theta <= 2.5 ? '#a855f7' : '#ef4444';
  return (
    <div>
      <div style={{ height:6, background:'rgba(255,255,255,0.15)', borderRadius:99, overflow:'hidden', marginBottom:4 }}>
        <div style={{ height:6, width:pct+'%', background:cor, borderRadius:99, transition:'width .6s ease' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.6)' }}>
        <span>θ = {theta}</span>
        <span style={{ color:cor, fontWeight:600 }}>Nível: {pct}%</span>
      </div>
    </div>
  );
}

// ── Cronômetro countdown ──────────────────────────────────────
function CronometroBar({ segundosTotais, segundosRestantes }) {
  if (!segundosTotais) return null;
  const pct = Math.round((segundosRestantes / segundosTotais) * 100);
  const cor = pct > 50 ? '#34d399' : pct > 25 ? '#fbbf24' : '#f43f5e';
  const m = Math.floor(segundosRestantes / 60);
  const s = segundosRestantes % 60;
  const urgente = pct <= 25;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>⏱ Tempo</span>
        <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:15, color:cor,
          animation: urgente ? 'pulse 1s infinite' : 'none' }}>
          {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
        </span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,0.15)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:4, width:pct+'%', background:cor, borderRadius:99, transition:'width 1s linear' }} />
      </div>
    </div>
  );
}

export default function AlunoDesafio({ trilha_id, onConcluir }) {
  const { user }              = useAuth();
  const [trilha, setTrilha]   = useState(null);
  const [questoes, setQ]      = useState([]);
  const [idx, setIdx]         = useState(0);
  const [fase, setFase]       = useState('loading');
  const [bloqueado, setBloq]  = useState(false); // tentativas esgotadas
  const [resposta, setResp]   = useState(undefined);
  const [resultado, setRes]   = useState(null);
  const [submitting, setSub]  = useState(false);
  const [streak, setStreak]   = useState(0);
  const [xpTotal, setXP]      = useState(0);
  const [theta, setTheta]     = useState(0);
  const [nivel, setNivel]     = useState({ emoji:'🌱', label:'Iniciante' });
  const [historico, setHist]  = useState([]);

  // Timers
  const [timerGlobal, setTimerG]   = useState(0);  // tempo total do desafio
  const [timerQuestao, setTimerQ]  = useState(null); // countdown por questão (null = sem limite)
  const timerRef    = useRef(null);
  const countdownRef = useRef(null);

  // Tentativas
  const [tentativaAtual, setTentativa] = useState(1);

  useEffect(() => {
    if (!trilha_id) return;
    Promise.all([
      api.get('/trilhas/'+trilha_id),
      api.get('/questoes?trilha_id='+trilha_id),
    ]).then(([tRes, qRes]) => {
      const t = tRes.data.trilha;
      const qs = qRes.data.questoes || [];
      setTrilha(t);
      setQ(qs);

      // Checar tentativas feitas
      if (t.tentativas_maximas) {
        api.get('/respostas/tentativas-trilha/'+trilha_id).then(r => {
          const feitas = r.data.tentativas || 0;
          if (feitas >= t.tentativas_maximas) {
            setBloq(true);
            setFase('bloqueado');
            return;
          }
          setTentativa(feitas + 1);
          setFase(qs.length > 0 ? 'jogando' : 'concluido');
        }).catch(() => {
          setFase(qs.length > 0 ? 'jogando' : 'concluido');
        });
      } else {
        setFase(qs.length > 0 ? 'jogando' : 'concluido');
      }
    }).catch(() => setFase('concluido'));
  }, [trilha_id]);

  // Timer global (cronômetro crescente)
  useEffect(() => {
    if (fase === 'jogando') {
      timerRef.current = setInterval(() => setTimerG(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [fase, idx]);

  // Timer por questão (countdown regressivo)
  useEffect(() => {
    if (fase !== 'jogando' || !trilha?.tempo_limite) return;
    const segundos = trilha.tempo_limite * 60;
    setTimerQ(segundos);
    countdownRef.current = setInterval(() => {
      setTimerQ(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          // Tempo esgotado → submete automaticamente (sem resposta = errou)
          if (resposta !== undefined && resposta !== null) confirmar();
          else submeterSemResposta();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [fase, idx, trilha]);

  const questaoAtual = questoes[idx];
  const Comp = questaoAtual ? TIPO_COMP[questaoAtual.tipo] : null;

  const handleAnswer = (resp) => setResp(resp);

  const podeConfirmar = () => {
    if (resposta === undefined || resposta === null) return false;
    if (typeof resposta === 'string' && resposta.trim() === '') return false;
    return true;
  };

  const submeterSemResposta = async () => {
    clearInterval(countdownRef.current);
    setSub(true);
    try {
      const res = await api.post('/respostas', {
        questao_id: questaoAtual.id,
        resposta: null,
        tempo_gasto_ms: (trilha?.tempo_limite || 0) * 60 * 1000,
      });
      processarResultado(res.data);
    } catch(e) { console.error(e); }
    setSub(false);
  };

  const confirmar = async () => {
    if (!podeConfirmar() || submitting) return;
    clearInterval(countdownRef.current);
    setSub(true);
    try {
      const res = await api.post('/respostas', {
        questao_id: questaoAtual.id,
        resposta,
        tempo_gasto_ms: timerGlobal * 1000,
      });
      processarResultado(res.data);
    } catch(e) { console.error(e); }
    setSub(false);
  };

  const processarResultado = (r) => {
    setRes(r);
    setXP(x => x + (r.xp_ganho || 0));
    setTheta(r.theta?.depois || 0);
    setNivel(r.nivel || nivel);
    if (r.is_correct) setStreak(s => s + 1); else setStreak(0);
    setHist(h => [...h, { questao_id: questaoAtual.id, is_correct: r.is_correct, score: r.score, xp: r.xp_ganho }]);
    setFase('resultado');
  };

  const proxima = () => {
    setResp(undefined);
    setRes(null);
    setTimerQ(null);
    clearInterval(countdownRef.current);
    if (idx + 1 >= questoes.length) setFase('concluido');
    else { setIdx(i => i + 1); setFase('jogando'); }
  };

  // ── HUD ──────────────────────────────────────────────────────
  const HUD = questaoAtual && (
    <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'1rem', color:'white' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600 }}>{trilha?.nome}</div>
          <div style={{ fontSize:11, opacity:.6 }}>
            {questaoAtual.tipo?.replace(/_/g,' ')} · Questão {idx+1}/{questoes.length}
            {trilha?.tentativas_maximas && <span style={{ marginLeft:6 }}>· Tentativa {tentativaAtual}/{trilha.tentativas_maximas}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {streak > 1 && <div style={{ background:'rgba(245,158,11,0.2)', padding:'3px 9px', borderRadius:50, fontSize:12, color:'#fbbf24', fontWeight:600 }}>🔥 x{streak}</div>}
          <div style={{ background:'rgba(16,185,129,0.2)', padding:'3px 9px', borderRadius:50, fontSize:12, color:'#34d399', fontWeight:600 }}>⭐ {xpTotal}</div>
          {/* Cronômetro global se não há countdown por questão */}
          {!trilha?.tempo_limite && (
            <div style={{ background:'rgba(255,255,255,0.1)', padding:'3px 9px', borderRadius:50, fontSize:12, color:'white', fontWeight:600, fontFamily:'monospace' }}>
              {String(Math.floor(timerGlobal/60)).padStart(2,'0')}:{String(timerGlobal%60).padStart(2,'0')}
            </div>
          )}
        </div>
      </div>

      {/* Countdown por questão */}
      {trilha?.tempo_limite && timerQuestao !== null && (
        <CronometroBar segundosTotais={trilha.tempo_limite*60} segundosRestantes={timerQuestao} />
      )}

      {/* Barra de progresso */}
      <div style={{ display:'flex', gap:3, marginBottom:6 }}>
        {questoes.map((_, i) => {
          const h = historico[i];
          return <div key={i} style={{ flex:1, height:4, borderRadius:99,
            background: h?.is_correct?'#34d399':h?'#f43f5e':i===idx?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.15)' }} />;
        })}
      </div>
      <ThetaBar theta={theta} />
    </div>
  );

  // ── LOADING ───────────────────────────────────────────────────
  if (fase === 'loading') return (
    <div style={{ textAlign:'center', padding:'3rem' }}>
      <div className="spinner" style={{ margin:'0 auto 1rem' }} />
      <div style={{ color:'var(--slate-400)', fontSize:14 }}>Carregando trilha...</div>
    </div>
  );

  // ── BLOQUEADO (tentativas esgotadas) ─────────────────────────
  if (fase === 'bloqueado') return (
    <div style={{ maxWidth:500, margin:'0 auto', textAlign:'center' }}>
      <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:18, padding:'2.5rem 2rem', color:'white', marginBottom:'1.5rem' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>🔒</div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:24, fontWeight:700, marginBottom:8 }}>Tentativas Esgotadas</div>
        <div style={{ fontSize:14, opacity:.7, marginBottom:'1rem' }}>{trilha?.nome}</div>
        <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'12px', fontSize:13, opacity:.9 }}>
          Você usou todas as {trilha?.tentativas_maximas} tentativa(s) permitidas pelo professor nesta trilha.
        </div>
      </div>
      <button onClick={onConcluir} style={{ width:'100%', padding:12, background:'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:15, cursor:'pointer' }}>
        Voltar às Trilhas
      </button>
    </div>
  );

  // ── TELA FINAL ────────────────────────────────────────────────
  if (fase === 'concluido') {
    const corretas = historico.filter(h => h.is_correct).length;
    const total = historico.length;
    const taxa = total > 0 ? Math.round(corretas / total * 100) : 0;
    return (
      <div style={{ maxWidth:520, margin:'0 auto', textAlign:'center' }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:18, padding:'2.5rem 2rem', color:'white', marginBottom:'1.5rem', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, opacity:.05, backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize:'24px 24px' }} />
          <div style={{ fontSize:56, marginBottom:12, position:'relative', zIndex:1 }}>{nivel.emoji}</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:28, fontWeight:700, marginBottom:4, position:'relative', zIndex:1 }}>Trilha Concluída! 🎉</div>
          <div style={{ fontSize:14, opacity:.7, marginBottom:'1.5rem', position:'relative', zIndex:1 }}>{trilha?.nome}</div>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', position:'relative', zIndex:1, marginBottom:'1rem' }}>
            {[
              { l:'XP Ganho',  v:'+'+xpTotal+'⭐' },
              { l:'Acertos',   v:corretas+'/'+total },
              { l:'Taxa',      v:taxa+'%' },
              { l:'Nível',     v:nivel.label },
            ].map(s => (
              <div key={s.l} style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 16px' }}>
                <div style={{ fontSize:11, opacity:.6, marginBottom:4 }}>{s.l}</div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700 }}>{s.v}</div>
              </div>
            ))}
          </div>
          <ThetaBar theta={theta} />
        </div>
        <button onClick={onConcluir} style={{ width:'100%', padding:12, background:'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:15, cursor:'pointer' }}>
          Voltar às Trilhas
        </button>
      </div>
    );
  }

  // ── QUESTÃO ───────────────────────────────────────────────────
  if (fase === 'jogando' && questaoAtual) return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      {HUD}
      <div className="card">
        {/* Badges */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
          <span style={{ padding:'3px 10px', borderRadius:50, background:'rgba(245,158,11,0.1)', color:'#92400e', fontSize:11, fontWeight:600 }}>⭐ +{questaoAtual.xp} XP</span>
          {(questaoAtual.tri?.b||0) >  1 && <span style={{ padding:'3px 10px', borderRadius:50, background:'#fef2f2', color:'#b91c1c', fontSize:11, fontWeight:600 }}>🔥 Difícil</span>}
          {(questaoAtual.tri?.b||0) < -1 && <span style={{ padding:'3px 10px', borderRadius:50, background:'#f0fdf4', color:'#15803d', fontSize:11, fontWeight:600 }}>🌱 Fácil</span>}
          <span style={{ fontSize:11, color:'var(--slate-400)', textTransform:'capitalize' }}>{questaoAtual.tipo?.replace(/_/g,' ')}</span>
        </div>

        {/* Enunciado */}
        {questaoAtual.tipo !== 'preenchimento' && (
          <div style={{ fontSize:15, fontWeight:500, color:'var(--slate-800)', lineHeight:1.7, marginBottom:14 }}>
            {questaoAtual.enunciado}
          </div>
        )}

        {/* Mídia */}
        {(questaoAtual.midias||[]).length > 0 && <MidiaRenderer midias={questaoAtual.midias} />}
        {questaoAtual.midia?.tipo && questaoAtual.midia.tipo !== 'nenhum' && <MidiaRenderer midia={questaoAtual.midia} />}

        {/* Componente de resposta */}
        {Comp && <Comp questao={questaoAtual} onAnswer={handleAnswer} disabled={false} respostaDada={undefined} />}

        {/* Botão confirmar */}
        <div style={{ marginTop:16 }}>
          <button onClick={confirmar} disabled={!podeConfirmar() || submitting} style={{
            width:'100%', padding:'13px', fontSize:15, fontWeight:700,
            background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',
            color:'white', border:'none', borderRadius:10, cursor:'pointer',
            opacity: !podeConfirmar() || submitting ? 0.45 : 1,
            transition:'opacity .2s',
            boxShadow: podeConfirmar() ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
          }}>
            {submitting ? '⏳ Verificando...' : '✅ Confirmar Resposta'}
          </button>
          {!podeConfirmar() && (
            <div style={{ fontSize:11, color:'var(--slate-400)', textAlign:'center', marginTop:6 }}>
              {questaoAtual.tipo === 'multipla_escolha' ? 'Clique em uma das alternativas'
               : questaoAtual.tipo === 'verdadeiro_falso' ? 'Selecione Verdadeiro ou Falso'
               : questaoAtual.tipo === 'preenchimento' ? 'Digite a resposta no campo'
               : questaoAtual.tipo === 'dissertativa' ? 'Escreva sua resposta acima'
               : questaoAtual.tipo === 'associacao' ? 'Faça todas as associações'
               : questaoAtual.tipo === 'ordenacao' ? 'Use ▲▼ para ordenar'
               : 'Preencha sua resposta'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── RESULTADO DA QUESTÃO ──────────────────────────────────────
  if (fase === 'resultado' && resultado) {
    const r = resultado;
    const cor = r.is_correct ? '#15803d' : r.score_percentual >= 50 ? '#92400e' : '#b91c1c';
    const bg  = r.is_correct ? '#f0fdf4' : r.score_percentual >= 50 ? '#fffbeb' : '#fef2f2';
    const bd  = r.is_correct ? '#86efac' : r.score_percentual >= 50 ? '#fcd34d' : '#fca5a5';
    return (
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        {HUD}
        <div className="card">
          {/* Status */}
          <div style={{ textAlign:'center', padding:'1.5rem 1rem', borderRadius:10, marginBottom:'1rem', background:bg, border:'2px solid '+bd }}>
            <div style={{ fontSize:42, marginBottom:8 }}>
              {r.is_correct ? '🎉' : r.score_percentual >= 50 ? '⚡' : '😅'}
            </div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:cor, marginBottom:6 }}>
              {r.is_correct ? 'Correto!' : r.score_percentual >= 50 ? 'Parcial — '+r.score_percentual+'%' : 'Incorreto'}
            </div>
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#f59e0b' }}>+{r.xp_ganho} XP ⭐</span>
              {(r.theta?.evolucao||0) !== 0 && (
                <span style={{ fontSize:14, fontWeight:600, color:(r.theta?.evolucao||0)>=0?'#10b981':'#f43f5e' }}>
                  θ {(r.theta?.evolucao||0)>=0?'↑':'↓'}{Math.abs(r.theta?.evolucao||0).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Feedback IA */}
          {r.feedback_ia && (
            <div style={{ background:'var(--slate-50)', borderRadius:10, padding:'1rem', marginBottom:'1rem', border:'1px solid var(--slate-200)' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>🤖 Feedback da IA</div>
              <div style={{ fontSize:13.5, color:'var(--slate-700)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{r.feedback_ia}</div>
            </div>
          )}

          {/* Gabarito revelado */}
          {!r.is_correct && r.gabarito_revelado !== undefined && (
            <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 14px', marginBottom:'1rem', border:'1px solid #86efac', fontSize:13 }}>
              <span style={{ fontWeight:600, color:'#15803d' }}>Resposta correta: </span>
              <span style={{ color:'#15803d' }}>
                {typeof r.gabarito_revelado === 'boolean' ? (r.gabarito_revelado ? 'Verdadeiro' : 'Falso')
                 : typeof r.gabarito_revelado === 'number' ? 'Alternativa '+'ABCD'[r.gabarito_revelado]
                 : String(r.gabarito_revelado)}
              </span>
            </div>
          )}

          {/* Curva TRI */}
          {questaoAtual?.tri && (
            <details style={{ marginBottom:'1rem' }}>
              <summary style={{ fontSize:12, fontWeight:600, color:'var(--slate-500)', cursor:'pointer', padding:'6px 0', userSelect:'none' }}>
                📈 Ver Curva TRI desta questão
              </summary>
              <div style={{ marginTop:8 }}>
                <CurvaCaracteristica tri={questaoAtual.tri} thetaAluno={r.theta?.antes} compact />
              </div>
            </details>
          )}

          <button onClick={proxima} style={{ width:'100%', padding:12, background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>
            {idx + 1 >= questoes.length ? '🏆 Ver Resultado Final' : 'Próxima Questão →'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

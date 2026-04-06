/**
 * CriarQuestaoModal
 * Modo CRIAR: questaoEdit = null
 * Modo EDITAR: questaoEdit = { id, tipo, enunciado, alternativas, gabarito, xp, tri, rag_tags, midias, trilha_id }
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import ParametrosTRI from '../../../components/tri/ParametrosTRI';
import MidiaEditor from '../../../components/questoes/MidiaEditor';

// ── Tipos disponíveis ─────────────────────────────────────────
const TIPOS = [
  { id:'multipla_escolha', icon:'🔘', label:'Múltipla Escolha',  tri:'3PL', desc:'4 alternativas, 1 correta' },
  { id:'verdadeiro_falso', icon:'✅', label:'Verdadeiro/Falso',  tri:'1PL', desc:'Afirmação V ou F' },
  { id:'dissertativa',     icon:'📝', label:'Dissertativa',      tri:'GRM', desc:'Resposta aberta avaliada por IA' },
  { id:'preenchimento',    icon:'✏️', label:'Preenchimento',     tri:'2PL', desc:'Lacuna com ___ a preencher' },
  { id:'associacao',       icon:'🔗', label:'Associação',        tri:'2PL', desc:'Coluna A ↔ Coluna B' },
  { id:'ordenacao',        icon:'🔢', label:'Ordenação',         tri:'2PL', desc:'Reorganize os itens' },
  { id:'upload_arquivo',   icon:'📎', label:'Upload/Entrega',    tri:'GRM', desc:'Arquivo avaliado por IA' },
];

const TRI_POR_TIPO = {
  multipla_escolha:'3PL', verdadeiro_falso:'1PL', dissertativa:'GRM',
  preenchimento:'2PL', associacao:'2PL', ordenacao:'2PL', upload_arquivo:'GRM',
};

const triDefault = (modelo) => ({
  modelo, a:1.0, b:0.0, c: modelo==='3PL' ? 0.25 : 0,
  status:'provisorio', total_respostas:0,
});

// ── Validação de gabarito ─────────────────────────────────────
function gabaritoValido(tipo, gabarito) {
  if (tipo === 'multipla_escolha')  return gabarito !== null && gabarito !== undefined && gabarito !== '';
  if (tipo === 'verdadeiro_falso')  return gabarito === true || gabarito === false;
  if (tipo === 'preenchimento')     return typeof gabarito === 'string' && gabarito.trim().length > 0;
  if (tipo === 'dissertativa')      return typeof gabarito === 'string' && gabarito.trim().length > 0;
  if (tipo === 'upload_arquivo')    return typeof gabarito === 'string' && gabarito.trim().length > 0;
  if (tipo === 'associacao')        return gabarito && typeof gabarito === 'object' && Object.keys(gabarito).length >= 2;
  if (tipo === 'ordenacao')         return Array.isArray(gabarito) && gabarito.length >= 2;
  return false;
}

// ── Alternativas padrão por tipo ─────────────────────────────
function altsDefault(tipoId) {
  if (tipoId === 'multipla_escolha') return ['','','',''];
  if (tipoId === 'associacao')       return { esquerda:['','','',''], direita:['','','',''] };
  if (tipoId === 'ordenacao')        return ['','','',''];
  return null;
}

export default function CriarQuestaoModal({ trilhas = [], trilha_id_inicial, questaoEdit, onClose, onSalvar }) {
  const modoEditar = !!questaoEdit;

  // ── Inicializar estado ────────────────────────────────────────
  const initTrilhaId = () => {
    if (modoEditar && questaoEdit.trilha_id) return Number(questaoEdit.trilha_id);
    return Number(trilha_id_inicial) || Number(trilhas[0]?.id) || 0;
  };

  const initTipo = () => {
    if (modoEditar && questaoEdit.tipo) return TIPOS.find(t => t.id === questaoEdit.tipo) || null;
    return null;
  };

  const initForm = () => {
    if (modoEditar) {
      return {
        enunciado:    questaoEdit.enunciado   || '',
        alternativas: questaoEdit.alternativas || altsDefault(questaoEdit.tipo),
        gabarito:     questaoEdit.gabarito     ?? null,
        xp:           questaoEdit.xp           || 100,
        rag_tags:     (questaoEdit.rag_tags || []).join(', '),
        midias:       questaoEdit.midias       || [],
      };
    }
    return { enunciado:'', alternativas:null, gabarito:null, xp:100, rag_tags:'', midias:[] };
  };

  const initTri = () => {
    if (modoEditar && questaoEdit.tri) return { ...questaoEdit.tri };
    return triDefault('2PL');
  };

  const [step, setStep]           = useState(modoEditar ? 2 : 1);
  const [trilhaId, setTrilhaId]   = useState(initTrilhaId);
  const [tipo, setTipo]           = useState(initTipo);
  const [form, setForm]           = useState(initForm);
  const [tri, setTri]             = useState(initTri);
  const [modoConteudo, setMC]     = useState('manual');
  const [modoTri, setMT]          = useState('manual');
  const [iaTopico, setIaTopico]   = useState('');
  const [iaNivel, setIaNivel]     = useState('intermediário');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaGerado, setIaGerado]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const setV = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Selecionar tipo (só no modo criação) ─────────────────────
  const selecionarTipo = (t) => {
    if (!trilhaId) { setError('Selecione uma trilha antes.'); return; }
    setTipo(t);
    setTri(triDefault(TRI_POR_TIPO[t.id]));
    setForm({ enunciado:'', alternativas:altsDefault(t.id), gabarito:null, xp:100, rag_tags:'', midias:[] });
    setIaGerado(false); setError('');
    setStep(2);
  };

  // ── Gerar questão com IA ─────────────────────────────────────
  const gerarComIA = async () => {
    if (!iaTopico.trim()) return setError('Informe o tópico da questão.');
    setIaLoading(true); setError('');
    try {
      const tags = form.rag_tags ? form.rag_tags.split(',').map(t=>t.trim()) : [];
      const res = await api.post('/questoes/gerar', { tipo:tipo.id, topico:iaTopico, nivel:iaNivel, trilha_id:trilhaId, tags });
      const q = res.data.questao_sugerida;
      setForm(f => ({ ...f, enunciado:q.enunciado||'', alternativas:q.alternativas||f.alternativas, gabarito:q.gabarito??null }));
      if (q.tri) setTri({ ...q.tri, status:'provisorio', total_respostas:0 });
      setIaGerado(true);
    } catch(e) { setError(e.response?.data?.error || 'Erro ao gerar. Configure ANTHROPIC_API_KEY no .env'); }
    setIaLoading(false);
  };

  // ── Sugerir TRI com IA ───────────────────────────────────────
  const sugerirTRI = async () => {
    if (!form.enunciado.trim()) return setError('Preencha o enunciado antes.');
    setIaLoading(true); setError('');
    try {
      const res = await api.post('/questoes/sugerir-tri', { tipo:tipo.id, enunciado:form.enunciado, alternativas:form.alternativas, gabarito:form.gabarito });
      setTri(prev => ({ ...prev, ...res.data.sugestao, status:'provisorio', total_respostas:0 }));
    } catch(e) { setError(e.response?.data?.error || 'Erro ao sugerir TRI.'); }
    setIaLoading(false);
  };

  // ── Validar Step 2 e avançar ─────────────────────────────────
  const avancarParaTRI = () => {
    if (!form.enunciado.trim()) { setError('O enunciado não pode estar vazio.'); return; }
    if (!gabaritoValido(tipo.id, form.gabarito)) { setError('Defina o gabarito correto antes de continuar.'); return; }
    setError(''); setStep(3);
  };

  // ── Salvar (criar ou editar) ─────────────────────────────────
  const salvar = async () => {
    const tidNum = Number(trilhaId);
    if (!tidNum || tidNum <= 0) { setError('Selecione uma trilha válida.'); return; }
    if (!tipo?.id)               { setError('Selecione o tipo da questão.'); return; }
    if (!form.enunciado.trim())  { setError('Enunciado é obrigatório.'); return; }
    if (!gabaritoValido(tipo.id, form.gabarito)) { setError('Defina o gabarito correto.'); return; }

    setSaving(true); setError('');
    try {
      const tags   = form.rag_tags ? form.rag_tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
      const midias = (form.midias || []).filter(m => m.tipo && m.tipo !== 'nenhum');
      const payload = {
        trilha_id:    tidNum,
        tipo:         tipo.id,
        enunciado:    form.enunciado,
        alternativas: form.alternativas || null,
        gabarito:     form.gabarito,
        xp:           Number(form.xp) || 100,
        tri,
        rag_tags:     tags,
        midias,
      };

      let questao;
      if (modoEditar) {
        const r = await api.put(`/questoes/${questaoEdit.id}`, payload);
        questao = r.data.questao;
      } else {
        const r = await api.post('/questoes', payload);
        questao = r.data.questao;
      }

      onSalvar?.(questao);
      onClose?.();
    } catch(e) {
      setError(e.response?.data?.error || 'Erro ao salvar questão.');
    }
    setSaving(false);
  };

  // ── Editor de gabarito por tipo ──────────────────────────────
  const renderEditor = () => {
    switch (tipo?.id) {

      case 'multipla_escolha': {
        const alts = Array.isArray(form.alternativas) ? form.alternativas : ['','','',''];
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {alts.map((alt, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div
                  onClick={() => setForm(f=>({...f,gabarito:i}))}
                  style={{
                    width:28, height:28, borderRadius:'50%', flexShrink:0, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize:12, transition:'all .15s',
                    background: form.gabarito===i ? 'var(--emerald)' : 'var(--slate-100)',
                    color:      form.gabarito===i ? 'white' : 'var(--slate-500)',
                    border:     '2px solid '+(form.gabarito===i ? 'var(--emerald-dark)' : 'transparent'),
                  }}
                  title="Clique para marcar como gabarito"
                >{'ABCD'[i]}</div>
                <input
                  value={alt}
                  onChange={e => { const a=[...alts]; a[i]=e.target.value; setForm(f=>({...f,alternativas:a})); }}
                  placeholder={'Alternativa '+('ABCD'[i])}
                  style={{ flex:1, padding:'8px 12px', border:'1.5px solid '+(form.gabarito===i?'var(--emerald)':'var(--slate-200)'), borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}
                />
                {form.gabarito===i && <span style={{ fontSize:11, color:'var(--emerald-dark)', fontWeight:600 }}>✓</span>}
              </div>
            ))}
            <div style={{ fontSize:11, color: form.gabarito===null?'var(--coral)':'var(--slate-400)', marginTop:2 }}>
              {form.gabarito===null ? '⚠️ Clique na letra para marcar o gabarito — obrigatório' : '✓ Gabarito: alternativa '+'ABCD'[form.gabarito]}
            </div>
          </div>
        );
      }

      case 'verdadeiro_falso':
        return (
          <div>
            <div style={{ display:'flex', gap:12 }}>
              {[{v:true,l:'✅ Verdadeiro',c:'#10b981'},{v:false,l:'❌ Falso',c:'#f43f5e'}].map(opt=>(
                <div key={String(opt.v)} onClick={()=>setForm(f=>({...f,gabarito:opt.v}))} style={{
                  flex:1, padding:'18px 12px', textAlign:'center', borderRadius:12, cursor:'pointer',
                  border:'2.5px solid '+(form.gabarito===opt.v?opt.c:'var(--slate-200)'),
                  background: form.gabarito===opt.v ? opt.c+'18' : 'white',
                  fontWeight:600, fontSize:15, color:form.gabarito===opt.v?opt.c:'var(--slate-600)',
                  transition:'all .15s', userSelect:'none',
                }}>{opt.l}</div>
              ))}
            </div>
            {form.gabarito===null && <div style={{ fontSize:11, color:'var(--coral)', marginTop:6 }}>⚠️ Selecione Verdadeiro ou Falso</div>}
          </div>
        );

      case 'preenchimento':
        return (
          <>
            <div style={{ background:'var(--slate-50)', padding:10, borderRadius:8, border:'1px solid var(--slate-200)', fontSize:12, color:'var(--slate-500)', marginBottom:8 }}>
              💡 No enunciado, use <strong>___</strong> (três underscores) para a lacuna.
            </div>
            <div className="field">
              <label>Resposta correta <span style={{color:'var(--coral)'}}>*</span></label>
              <input value={typeof form.gabarito==='string'?form.gabarito:''} onChange={e=>setForm(f=>({...f,gabarito:e.target.value}))} placeholder="ex: def" />
            </div>
          </>
        );

      case 'dissertativa':
      case 'upload_arquivo':
        return (
          <div className="field">
            <label>Palavras-chave esperadas (separe com |) <span style={{color:'var(--coral)'}}>*</span></label>
            <input value={typeof form.gabarito==='string'?form.gabarito:''} onChange={e=>setForm(f=>({...f,gabarito:e.target.value}))} placeholder="herança | polimorfismo | exemplo" />
            <div style={{fontSize:11,color:'var(--slate-400)',marginTop:4}}>A IA usará essas palavras para avaliar a resposta do aluno</div>
          </div>
        );

      case 'associacao': {
        const alts = (form.alternativas && !Array.isArray(form.alternativas)) ? form.alternativas : {esquerda:['','','',''],direita:['','','','']};
        const gab  = (form.gabarito && typeof form.gabarito==='object') ? form.gabarito : {};
        return (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {['esquerda','direita'].map(col=>(
                <div key={col}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--slate-600)',display:'block',marginBottom:6}}>{col==='esquerda'?'Coluna A':'Coluna B'}</label>
                  {(alts[col]||['','','','']).map((item,i)=>(
                    <input key={i} value={item}
                      onChange={e=>{const a={...alts};a[col]=[...(a[col]||[])];a[col][i]=e.target.value;setForm(f=>({...f,alternativas:a}));}}
                      placeholder={'Item '+(i+1)}
                      style={{width:'100%',padding:'7px 10px',border:'1.5px solid var(--slate-200)',borderRadius:8,marginBottom:5,fontFamily:'var(--font-body)',fontSize:13,outline:'none'}}
                    />
                  ))}
                </div>
              ))}
            </div>
            <label style={{fontSize:12,fontWeight:600,color:'var(--slate-600)',display:'block',marginBottom:6}}>Associações corretas <span style={{color:'var(--coral)'}}>*</span></label>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:13}}>
                  <span style={{fontWeight:700,color:'var(--navy)'}}>A{i+1}→</span>
                  <select value={gab[i]!==undefined?gab[i]:''} onChange={e=>{const g={...gab};g[i]=Number(e.target.value);setForm(f=>({...f,gabarito:g}));}} style={{padding:'5px 8px',border:'1.5px solid var(--slate-200)',borderRadius:6,outline:'none'}}>
                    <option value="">--</option>
                    {[0,1,2,3].map(j=><option key={j} value={j}>B{j+1}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'ordenacao': {
        const alts = Array.isArray(form.alternativas) ? form.alternativas : ['','','',''];
        const gabStr = Array.isArray(form.gabarito) ? form.gabarito.join(',') : (form.gabarito||'');
        return (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
              {alts.map((item,i)=>(
                <input key={i} value={item}
                  onChange={e=>{const a=[...alts];a[i]=e.target.value;setForm(f=>({...f,alternativas:a}));}}
                  placeholder={'Item '+(i+1)+' (apresentado embaralhado)'}
                  style={{padding:'8px 12px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:13,outline:'none'}}
                />
              ))}
            </div>
            <div className="field">
              <label>Ordem correta — índices por vírgula <span style={{color:'var(--coral)'}}>*</span></label>
              <input value={gabStr}
                onChange={e=>{const arr=e.target.value.split(',').map(n=>parseInt(n.trim(),10)).filter(n=>!isNaN(n));setForm(f=>({...f,gabarito:arr.length>0?arr:null}));}}
                placeholder="ex: 2,0,3,1"
              />
              <div style={{fontSize:11,color:'var(--slate-400)',marginTop:4}}>Índice 0 = Item 1. Ex: se ordem correta é I3,I1,I4,I2 → escreva 2,0,3,1</div>
            </div>
          </>
        );
      }
      default: return null;
    }
  };

  // ── Resumo gabarito para step 4 ──────────────────────────────
  const resumoGabarito = () => {
    const g = form.gabarito;
    if (g===null||g===undefined) return '(não definido)';
    if (tipo?.id==='multipla_escolha' && typeof g==='number') return 'Alternativa '+'ABCD'[g]+': "'+((form.alternativas||[])[g]||'')+'"';
    if (tipo?.id==='verdadeiro_falso') return g===true ? 'Verdadeiro' : 'Falso';
    if (tipo?.id==='associacao') return Object.keys(g).length+' associações';
    if (tipo?.id==='ordenacao') return '['+(Array.isArray(g)?g.join(', '):g)+']';
    return typeof g==='string' ? '"'+g.slice(0,60)+(g.length>60?'...':'')+'"' : String(g);
  };

  const TOTAL_STEPS = 4;

  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,27,53,0.65)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'1rem', overflowY:'auto', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white', borderRadius:18, width:'100%', maxWidth:700, margin:'1rem auto', boxShadow:'0 8px 40px rgba(15,27,53,0.25)', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background:'var(--navy)', padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:18, fontWeight:700, color:'white' }}>
              {modoEditar
                ? ('✏️ Editar Questão — '+(tipo?.icon||'')+' '+(tipo?.label||''))
                : step===1 ? '📚 Nova Questão — Tipo'
                : step===2 ? ((tipo?.icon||'')+' '+(tipo?.label||'')+' — Conteúdo')
                : step===3 ? '⚙️ Parâmetros TRI'
                : '📋 Revisar e Salvar'}
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 }}>
              {modoEditar ? 'Editando questão #'+questaoEdit.id : 'Passo '+step+' de '+TOTAL_STEPS}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'white', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:15 }}>✕</button>
        </div>

        {/* Progress bar */}
        {!modoEditar && (
          <div style={{ height:3, background:'rgba(0,0,0,0.08)' }}>
            <div style={{ height:3, background:'var(--emerald)', width:(step/TOTAL_STEPS*100)+'%', transition:'width .3s' }} />
          </div>
        )}

        <div style={{ padding:'1.5rem' }}>
          {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

          {/* ════ STEP 1: Trilha + Tipo (só criação) ════ */}
          {step===1 && !modoEditar && (
            <>
              <div className="field" style={{ marginBottom:'1.25rem' }}>
                <label style={{ fontWeight:600 }}>Trilha de destino <span style={{color:'var(--coral)'}}>*</span></label>
                <select value={trilhaId||''} onChange={e=>setTrilhaId(Number(e.target.value))}
                  style={{ width:'100%', padding:'10px 14px', border:'2px solid '+(trilhaId?'var(--emerald)':'var(--coral)'), borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, outline:'none', background:'rgba(16,185,129,0.04)', color:'var(--navy)', fontWeight:500 }}>
                  <option value="">-- Selecione uma trilha --</option>
                  {trilhas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {!trilhaId && <div style={{fontSize:11,color:'var(--coral)',marginTop:4}}>⚠️ Selecione uma trilha para habilitar os tipos</div>}
              </div>

              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:'0.75rem' }}>Tipo de questão:</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:8 }}>
                {TIPOS.map(t=>(
                  <div key={t.id} onClick={()=>selecionarTipo(t)}
                    style={{ padding:'14px 12px', border:'1.5px solid var(--slate-200)', borderRadius:12, cursor:trilhaId?'pointer':'not-allowed', opacity:trilhaId?1:0.5, transition:'all .15s', background:'white' }}
                    onMouseEnter={e=>{if(trilhaId){e.currentTarget.style.borderColor='var(--emerald)';e.currentTarget.style.background='rgba(16,185,129,0.04)';}}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--slate-200)';e.currentTarget.style.background='white';}}>
                    <div style={{fontSize:22,marginBottom:6}}>{t.icon}</div>
                    <div style={{fontWeight:600,fontSize:13,color:'var(--navy)',marginBottom:2}}>{t.label}</div>
                    <div style={{fontSize:11,color:'var(--slate-400)',marginBottom:6}}>{t.desc}</div>
                    <div style={{fontSize:10,color:'var(--emerald-dark)',fontWeight:600}}>TRI: {t.tri}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ════ STEP 2: Conteúdo ════ */}
          {step===2 && tipo && (
            <>
              {/* Trilha (editável no modo edição) */}
              {modoEditar && (
                <div className="field" style={{ marginBottom:'1rem' }}>
                  <label>Trilha</label>
                  <select value={trilhaId||''} onChange={e=>setTrilhaId(Number(e.target.value))}
                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, outline:'none' }}>
                    {trilhas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Toggle Manual / IA */}
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {[['manual','✍️ Manual'],['ia','🤖 Gerar com IA']].map(([m,label])=>(
                  <button key={m} type="button" onClick={()=>setMC(m)} style={{
                    flex:1, padding:'9px', borderRadius:8,
                    border:'2px solid '+(modoConteudo===m?'var(--emerald)':'var(--slate-200)'),
                    background: modoConteudo===m?'rgba(16,185,129,0.07)':'white',
                    fontWeight:600, fontSize:13, cursor:'pointer',
                    color: modoConteudo===m?'var(--emerald-dark)':'var(--slate-600)',
                  }}>{label}</button>
                ))}
              </div>

              {/* Painel IA */}
              {modoConteudo==='ia' && (
                <div style={{background:'var(--slate-50)',borderRadius:10,padding:14,marginBottom:14,border:'1px solid var(--slate-200)'}}>
                  <div className="field"><label>Tópico</label><input value={iaTopico} onChange={e=>setIaTopico(e.target.value)} placeholder="ex: funções recursivas em Python" onKeyDown={e=>e.key==='Enter'&&gerarComIA()} /></div>
                  <div className="form-row">
                    <div className="field"><label>Dificuldade</label>
                      <select value={iaNivel} onChange={e=>setIaNivel(e.target.value)}>
                        <option>fácil</option><option>intermediário</option><option>difícil</option><option>muito difícil</option>
                      </select>
                    </div>
                    <div className="field"><label>Tags RAG</label><input value={form.rag_tags} onChange={setV('rag_tags')} placeholder="python, algoritmos" /></div>
                  </div>
                  <button type="button" onClick={gerarComIA} disabled={iaLoading} style={{padding:'9px 18px',background:'var(--navy)',color:'white',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',opacity:iaLoading?0.7:1}}>
                    {iaLoading?'🤖 Gerando...':'🤖 Gerar Questão'}
                  </button>
                  {iaGerado && <span style={{marginLeft:10,fontSize:12,color:'var(--emerald-dark)',fontWeight:600}}>✅ Questão gerada! Revise abaixo.</span>}
                </div>
              )}

              {/* Enunciado */}
              <div className="field">
                <label>
                  Enunciado <span style={{color:'var(--coral)'}}>*</span>
                  {tipo.id==='preenchimento'&&<span style={{fontSize:11,color:'var(--slate-400)',fontWeight:400,marginLeft:8}}>— use ___ para a lacuna</span>}
                </label>
                <textarea rows={tipo.id==='dissertativa'||tipo.id==='upload_arquivo'?4:3}
                  value={form.enunciado} onChange={setV('enunciado')}
                  placeholder={
                    tipo.id==='multipla_escolha'?'Qual das alternativas representa...':
                    tipo.id==='verdadeiro_falso'?'Afirmação sobre o tema...':
                    tipo.id==='preenchimento'?'Em Python, usamos ___ para criar uma função.':
                    'Descreva o que o aluno deve responder...'
                  }
                  style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,resize:'vertical',outline:'none',lineHeight:1.6}}
                  onFocus={e=>e.target.style.borderColor='var(--emerald)'}
                  onBlur={e=>e.target.style.borderColor='var(--slate-200)'}
                />
              </div>

              {/* Editor de gabarito/alternativas */}
              {renderEditor()}

              {/* ── Mídia Enriquecida ── */}
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--slate-600)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  🎨 Mídia Enriquecida
                  <span style={{ fontSize:11, fontWeight:400, color:'var(--slate-400)' }}>(opcional) — imagem do PC ou link, vídeo YouTube, texto</span>
                </div>
                <MidiaEditor value={form.midias||[]} onChange={v=>setForm(f=>({...f,midias:v}))} />
              </div>

              {/* XP + Tags */}
              <div className="form-row" style={{ marginTop:12 }}>
                <div className="field" style={{maxWidth:130}}>
                  <label>XP</label>
                  <input type="number" value={form.xp} onChange={setV('xp')} min={10} max={500} />
                </div>
                <div className="field">
                  <label>Tags RAG (vírgula)</label>
                  <input value={form.rag_tags} onChange={setV('rag_tags')} placeholder="python, algoritmos, loop" />
                </div>
              </div>

              {/* Navegação */}
              <div style={{display:'flex',gap:8,marginTop:16}}>
                {!modoEditar && (
                  <button type="button" onClick={()=>{setStep(1);setError('');}} style={{padding:'9px 18px',background:'white',border:'1.5px solid var(--slate-200)',borderRadius:8,cursor:'pointer',fontSize:13,color:'var(--slate-600)'}}>← Voltar</button>
                )}
                <button type="button" onClick={modoEditar ? ()=>setStep(3) : avancarParaTRI} style={{flex:1,padding:'10px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>
                  {modoEditar ? 'Ajustar TRI →' : 'Configurar TRI →'}
                </button>
                {modoEditar && (
                  <button type="button" onClick={salvar} disabled={saving} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',opacity:saving?0.7:1}}>
                    {saving?'Salvando...':'💾 Salvar Alterações'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ════ STEP 3: TRI ════ */}
          {step===3 && tipo && (
            <>
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {[['manual','⚙️ Definir manualmente'],['ia','🤖 Sugerir com IA']].map(([m,label])=>(
                  <button key={m} type="button" onClick={()=>setMT(m)} style={{flex:1,padding:'9px',borderRadius:8,border:'2px solid '+(modoTri===m?'var(--emerald)':'var(--slate-200)'),background:modoTri===m?'rgba(16,185,129,0.07)':'white',fontWeight:600,fontSize:13,cursor:'pointer',color:modoTri===m?'var(--emerald-dark)':'var(--slate-600)'}}>{label}</button>
                ))}
              </div>

              {modoTri==='ia' && (
                <div style={{marginBottom:14}}>
                  <button type="button" onClick={sugerirTRI} disabled={iaLoading} style={{padding:'9px 18px',background:'var(--navy)',color:'white',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer',opacity:iaLoading?0.7:1}}>
                    {iaLoading?'🤖 Analisando...':'🤖 Sugerir Parâmetros TRI'}
                  </button>
                  <div style={{fontSize:11,color:'var(--slate-400)',marginTop:5}}>A IA analisa o enunciado e sugere a, b, c com justificativa</div>
                </div>
              )}

              <ParametrosTRI value={tri} onChange={setTri} modeloFixo={TRI_POR_TIPO[tipo?.id]} />

              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button type="button" onClick={()=>{setStep(2);setError('');}} style={{padding:'9px 18px',background:'white',border:'1.5px solid var(--slate-200)',borderRadius:8,cursor:'pointer',fontSize:13,color:'var(--slate-600)'}}>← Voltar</button>
                {modoEditar ? (
                  <button type="button" onClick={salvar} disabled={saving} style={{flex:1,padding:'10px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',opacity:saving?0.7:1}}>
                    {saving?'Salvando...':'💾 Salvar Alterações'}
                  </button>
                ) : (
                  <button type="button" onClick={()=>{setError('');setStep(4);}} style={{flex:1,padding:'10px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>Revisar →</button>
                )}
              </div>
            </>
          )}

          {/* ════ STEP 4: Revisão (só criação) ════ */}
          {step===4 && tipo && !modoEditar && (
            <>
              <div style={{background:'var(--slate-50)',borderRadius:12,padding:'1rem',marginBottom:'1rem',border:'1px solid var(--slate-200)'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                  <span style={{padding:'3px 10px',borderRadius:50,background:'var(--navy)',color:'white',fontSize:11,fontWeight:600}}>{tipo.icon} {tipo.label}</span>
                  <span style={{padding:'3px 10px',borderRadius:50,background:'rgba(16,185,129,0.1)',color:'var(--emerald-dark)',fontSize:11,fontWeight:600}}>⭐ {form.xp} XP</span>
                  <span style={{padding:'3px 10px',borderRadius:50,background:'#fffbeb',color:'#92400e',fontSize:11,fontWeight:600}}>TRI {tri.modelo} b={tri.b}</span>
                  <span style={{padding:'3px 10px',borderRadius:50,background:'var(--slate-100)',color:'var(--slate-600)',fontSize:11}}>📚 {trilhas.find(t=>t.id===Number(trilhaId))?.nome||'Trilha #'+trilhaId}</span>
                  {(form.midias||[]).length>0 && <span style={{padding:'3px 10px',borderRadius:50,background:'rgba(14,165,233,0.1)',color:'var(--sky)',fontSize:11,fontWeight:600}}>🖼️ {form.midias.length} mídia(s)</span>}
                </div>
                <div style={{fontSize:14,color:'var(--slate-800)',lineHeight:1.6,fontWeight:500,marginBottom:8}}>{form.enunciado}</div>
                {tipo.id==='multipla_escolha'&&Array.isArray(form.alternativas)&&(
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    {form.alternativas.map((alt,i)=>(
                      <div key={i} style={{fontSize:13,display:'flex',gap:8,color:form.gabarito===i?'var(--emerald-dark)':'var(--slate-600)',fontWeight:form.gabarito===i?600:400}}>
                        <span>{form.gabarito===i?'✓':'○'}</span><span>{'ABCD'[i]}) {alt}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{marginTop:10,padding:'8px 10px',background:'white',borderRadius:8,border:'1px solid var(--slate-200)',fontSize:12}}>
                  <span style={{fontWeight:600,color:'var(--slate-500)'}}>Gabarito: </span>
                  <span style={{color:'var(--emerald-dark)',fontWeight:500}}>{resumoGabarito()}</span>
                </div>
              </div>

              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={()=>{setStep(3);setError('');}} style={{padding:'10px 18px',background:'white',border:'1.5px solid var(--slate-200)',borderRadius:8,cursor:'pointer',fontSize:13,color:'var(--slate-600)'}}>← Voltar</button>
                <button type="button" onClick={salvar} disabled={saving} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:15,cursor:'pointer',opacity:saving?0.7:1,boxShadow:'0 4px 14px rgba(16,185,129,0.35)'}}>
                  {saving?'Salvando...':'✅ Salvar Questão'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

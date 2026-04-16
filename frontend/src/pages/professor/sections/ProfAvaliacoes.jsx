/**
 * ProfAvaliacoes — Criar, Editar, CRUD de questões da avaliação
 * Wizard 3 passos para criar | Edição completa de questões na avaliação
 */
import { useState, useEffect } from 'react';
import CriarQuestaoModal from './CriarQuestaoModal';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { EmptyState, StatCard, Modal } from '../../../components/ui';

const TIPOS_AV = [
  { id:'prova',    icon:'📝', label:'Prova',         desc:'Avaliação formal com nota' },
  { id:'trabalho', icon:'📋', label:'Trabalho',      desc:'Entrega avaliada por IA' },
  { id:'simulado', icon:'🎯', label:'Simulado',      desc:'Prática sem nota formal' },
  { id:'quiz',     icon:'⚡', label:'Quiz Rápido',   desc:'Questões rápidas' },
  { id:'entrega',  icon:'📤', label:'Envio de Arquivo', desc:'Aluno envia arquivo para correção' },
];

const TIPO_Q_ICONS = { multipla_escolha:'🔘', verdadeiro_falso:'✅', dissertativa:'📝', preenchimento:'✏️', associacao:'🔗', ordenacao:'🔢', upload_arquivo:'📎' };

const STATUS_CFG = {
  rascunho:  { bg:'var(--slate-100)', cor:'var(--slate-600)', label:'Rascunho' },
  publicada: { bg:'#f0fdf4', cor:'#15803d', label:'✅ Publicada' },
  encerrada: { bg:'#fef2f2', cor:'#b91c1c', label:'Encerrada' },
};

// ════════════════════════════════════════════════════════════════
// MODAL CRIAR — wizard 3 passos
// ════════════════════════════════════════════════════════════════
function ModalCriar({ turmas, questoesDisp, onClose, onSalvar }) {
  const [step, setStep]   = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState({
    titulo:'', descricao:'', tipo:'prova',
    turma_ids: turmas[0]?.id ? [turmas[0].id] : [], // multi-turma
    disciplina_id: '',
    questoes_sel:[], tempo_limite:60, tentativas_permitidas:1,
    nota_minima:6, peso:10, randomizar_questoes:false, randomizar_alternativas:false,
    disponivel_em: new Date().toISOString().slice(0,16),
    encerra_em: new Date(Date.now()+7*86400000).toISOString().slice(0,16),
  });

  // Disciplinas das turmas selecionadas
  const [discsDisponiveis, setDiscsDisp] = useState([]);
  useEffect(() => {
    if (!form.turma_ids?.length) { setDiscsDisp([]); return; }
    Promise.all(form.turma_ids.map(tid =>
      api.get('/turmas/' + tid + '/disciplinas').then(r => r.data.disciplinas || []).catch(() => [])
    )).then(results => {
      const todas = results.flat();
      const unicas = todas.filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i);
      setDiscsDisp(unicas);
      if (unicas.length === 1 && !form.disciplina_id) {
        setForm(f => ({ ...f, disciplina_id: String(unicas[0].id) }));
      }
    });
  }, [JSON.stringify(form.turma_ids)]);

  const toggleTurma = (tid) => {
    setForm(f => {
      const arr = f.turma_ids || [];
      const ids = arr.includes(tid) ? arr.filter(x => x !== tid) : [...arr, tid];
      return { ...f, turma_ids: ids, disciplina_id: '' };
    });
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleQ = (qid) => setForm(f => {
    const exists = f.questoes_sel.find(q => q.questao_id === qid);
    return { ...f, questoes_sel: exists ? f.questoes_sel.filter(q => q.questao_id!==qid) : [...f.questoes_sel,{questao_id:qid,peso:1}] };
  });

  const setPeso = (qid, peso) => setForm(f => ({ ...f, questoes_sel: f.questoes_sel.map(q => q.questao_id===qid?{...q,peso:Number(peso)}:q) }));

  const avancar = () => {
    setError('');
    if (step===1 && !form.titulo.trim()) return setError('Título obrigatório.');
    if (step===1 && (!form.turma_ids || form.turma_ids.length === 0)) return setError('Selecione ao menos uma turma.');
    if (step===2 && form.tipo!=='entrega' && form.questoes_sel.length===0) return setError('Selecione ao menos 1 questão.');
    // Para tipo 'entrega', pular passo 2 (sem questões) e ir direto para configurações
    if (step===1 && form.tipo==='entrega') { setStep(3); return; }
    if (step===3 && form.tipo==='entrega') {} // allow back to step 1
    setStep(s => s+1);
  };

  const salvar = async (publicar=false) => {
    if (form.tipo!=='entrega' && form.questoes_sel.length===0) return setError('Selecione ao menos 1 questão.');
    setSaving(true); setError('');
    try {
      const tids = form.turma_ids || [];
      const payload = {
        titulo: form.titulo, descricao: form.descricao, tipo: form.tipo,
        turma_id: tids[0] ? Number(tids[0]) : null, // principal
        disciplina_id: form.disciplina_id ? Number(form.disciplina_id) : null,
        questoes: form.questoes_sel,
        tempo_limite: Number(form.tempo_limite)||60,
        tentativas_permitidas: Number(form.tentativas_permitidas)||1,
        nota_minima: Number(form.nota_minima)||6,
        peso: Number(form.peso)||10,
        randomizar_questoes: form.randomizar_questoes,
        randomizar_alternativas: form.randomizar_alternativas,
        disponivel_em: new Date(form.disponivel_em).toISOString(),
        encerra_em: form.encerra_em ? new Date(form.encerra_em).toISOString() : null,
      };
      const r = await api.post('/avaliacoes', payload);
      const avId = r.data.avaliacao.id;
      // Vincular turmas adicionais (N:N)
      if (tids.length > 0) {
        await api.post('/avaliacoes/'+avId+'/turmas', { turma_ids: tids.map(Number) }).catch(() => {});
      }
      if (publicar) await api.patch('/avaliacoes/'+avId+'/publicar');
      onSalvar({ ...r.data.avaliacao, status:publicar?'publicada':'rascunho', total_questoes:form.questoes_sel.length });
      onClose();
    } catch(e){ setError(e.response?.data?.error||'Erro ao salvar.'); }
    setSaving(false);
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,27,53,.65)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'1rem',overflowY:'auto',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white',borderRadius:18,width:'100%',maxWidth:680,margin:'1rem auto',boxShadow:'0 8px 40px rgba(15,27,53,.25)',overflow:'hidden' }}>
        <div style={{ background:'var(--navy)',padding:'1.25rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-head)',fontSize:17,fontWeight:700,color:'white' }}>
              {step===1?'📝 Tipo & Turma':step===2&&form.tipo!=='entrega'?'❓ Selecionar Questões':'⚙️ Configurações'}
            </div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.5)',marginTop:2 }}>Passo {form.tipo==='entrega'?(step===1?'1':'2'):(step)} de {form.tipo==='entrega'?'2':'3'}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.12)',border:'none',color:'white',width:30,height:30,borderRadius:'50%',cursor:'pointer',fontSize:14 }}>✕</button>
        </div>
        <div style={{ height:3,background:'rgba(0,0,0,.08)' }}><div style={{ height:3,background:'var(--emerald)',width:(form.tipo==='entrega'?(step===1?50:100):(step/3*100))+'%',transition:'width .3s' }} /></div>

        <div style={{ padding:'1.5rem',maxHeight:'78vh',overflowY:'auto' }}>
          {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

          {step===1 && (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:16 }}>
                {TIPOS_AV.map(t => (
                  <div key={t.id} onClick={() => setForm(f=>({...f,tipo:t.id}))} style={{ padding:'12px',border:'2px solid '+(form.tipo===t.id?'var(--emerald)':'var(--slate-200)'),borderRadius:10,cursor:'pointer',background:form.tipo===t.id?'rgba(16,185,129,.06)':'white' }}>
                    <div style={{ fontSize:22,marginBottom:3 }}>{t.icon}</div>
                    <div style={{ fontWeight:600,fontSize:13,color:'var(--navy)' }}>{t.label}</div>
                    <div style={{ fontSize:11,color:'var(--slate-400)' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
              {/* Multi-turma checkboxes */}
              <div className="field">
                <label>Turmas <span style={{color:'var(--coral)'}}>*</span>
                  <span style={{ fontSize:11, color:'var(--slate-400)', fontWeight:400, marginLeft:8 }}>(selecione uma ou mais)</span>
                </label>
                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:150, overflowY:'auto', padding:'4px 0' }}>
                  {turmas.map(t => {
                    const sel = (form.turma_ids||[]).includes(t.id);
                    return (
                      <div key={t.id} onClick={() => toggleTurma(t.id)} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                        border:'1.5px solid '+(sel?'var(--emerald)':'var(--slate-200)'),
                        borderRadius:8, cursor:'pointer', background:sel?'#ecfdf5':'white',
                        transition:'all .12s',
                      }}>
                        <div style={{ width:18, height:18, borderRadius:4, flexShrink:0,
                          border:'2px solid '+(sel?'var(--emerald)':'var(--slate-300)'),
                          background:sel?'var(--emerald)':'white',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {sel && <span style={{ color:'white', fontSize:11 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:13, fontWeight:sel?700:400, color:'var(--navy)' }}>🏫 {t.nome}</span>
                      </div>
                    );
                  })}
                </div>
                {(form.turma_ids||[]).length === 0 && (
                  <div style={{ fontSize:11, color:'var(--coral)', marginTop:4 }}>Selecione ao menos uma turma.</div>
                )}
              </div>

              {/* Disciplina auto-carregada */}
              {discsDisponiveis.length > 0 && (
                <div className="field">
                  <label>Disciplina
                    <span style={{ fontSize:11, color:'var(--slate-400)', fontWeight:400, marginLeft:8 }}>
                      (carregada automaticamente da turma)
                    </span>
                  </label>
                  <select value={form.disciplina_id} onChange={set('disciplina_id')}
                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:14, outline:'none' }}>
                    <option value="">-- Selecione a disciplina --</option>
                    {discsDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="field"><label>Título <span style={{color:'var(--coral)'}}>*</span></label><input value={form.titulo} onChange={set('titulo')} placeholder="ex: Prova 1 — Algoritmos" /></div>
              <div className="field">
                <label>Descrição (opcional)</label>
                <textarea rows={2} value={form.descricao} onChange={set('descricao')} placeholder="Instruções para os alunos..." style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,resize:'vertical',outline:'none' }} />
              </div>
              <button onClick={avancar} style={{ width:'100%',padding:'12px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer' }}>
                Selecionar Questões →
              </button>
            </>
          )}

          {step===2 && (
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                <span style={{ fontSize:13,color:'var(--slate-500)' }}>{form.questoes_sel.length} selecionada(s) · clique para selecionar</span>
                {form.questoes_sel.length>0 && <span style={{ fontSize:12,fontWeight:600,color:'var(--emerald-dark)' }}>Peso total: {form.questoes_sel.reduce((s,q)=>s+q.peso,0)}</span>}
              </div>
              {questoesDisp.length===0 ? (
                <div style={{ textAlign:'center',padding:'2.5rem',color:'var(--slate-400)' }}>
                  <div style={{ fontSize:36,marginBottom:8 }}>❓</div>
                  <div style={{ fontWeight:500 }}>Nenhuma questão no banco</div>
                  <div style={{ fontSize:12,marginTop:4 }}>Crie questões em "Banco de Questões" primeiro.</div>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:6,maxHeight:370,overflowY:'auto',paddingRight:2 }}>
                  {questoesDisp.map(q => {
                    const sel = form.questoes_sel.find(s=>s.questao_id===q.id);
                    return (
                      <div key={q.id} onClick={()=>toggleQ(q.id)} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'2px solid '+(sel?'var(--emerald)':'var(--slate-200)'),borderRadius:8,cursor:'pointer',background:sel?'rgba(16,185,129,.04)':'white',transition:'all .1s' }}>
                        <div style={{ width:20,height:20,borderRadius:5,flexShrink:0,border:'2px solid '+(sel?'var(--emerald)':'var(--slate-300)'),background:sel?'var(--emerald)':'white',display:'flex',alignItems:'center',justifyContent:'center' }}>
                          {sel&&<span style={{ color:'white',fontSize:11,fontWeight:700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:16,flexShrink:0 }}>{TIPO_Q_ICONS[q.tipo]||'❓'}</span>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:500,color:'var(--slate-800)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{q.enunciado}</div>
                          <div style={{ display:'flex',gap:8,fontSize:10,color:'var(--slate-400)',marginTop:2 }}>
                            <span>{q.tipo?.replace(/_/g,' ')}</span>
                            <span>⭐ {q.xp} XP</span>
                            {q.trilha_nome&&<span>📚 {q.trilha_nome}</span>}
                          </div>
                        </div>
                        {sel&&<div onClick={e=>e.stopPropagation()} style={{ flexShrink:0,display:'flex',alignItems:'center',gap:4 }}>
                          <span style={{ fontSize:11,color:'var(--slate-500)' }}>Peso:</span>
                          <input type="number" min={0.5} max={10} step={0.5} value={sel.peso} onChange={e=>setPeso(q.id,e.target.value)} style={{ width:46,padding:'3px 6px',border:'1.5px solid var(--emerald)',borderRadius:6,fontSize:12,textAlign:'center',outline:'none' }} />
                        </div>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display:'flex',gap:8,marginTop:16 }}>
                <button onClick={()=>{setStep(1);setError('');}} style={{ padding:'10px 16px',background:'white',border:'1.5px solid var(--slate-200)',borderRadius:8,cursor:'pointer',fontSize:13 }}>← Voltar</button>
                <button onClick={avancar} disabled={form.questoes_sel.length===0} style={{ flex:1,padding:'12px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer',opacity:form.questoes_sel.length===0?0.45:1 }}>
                  Configurações → ({form.questoes_sel.length}q)
                </button>
              </div>
            </>
          )}

          {step===3 && (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                {[['tempo_limite','⏱ Tempo limite (min)','number',5,300,1],['tentativas_permitidas','🔁 Tentativas','number',1,10,1],['nota_minima','✅ Nota mínima (0-10)','number',0,10,0.5],['peso','⚖️ Peso da avaliação','number',1,100,1]].map(([k,l,t,mn,mx,st])=>(
                  <div className="field" key={k}><label>{l}</label><input type={t} min={mn} max={mx} step={st} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
                ))}
                <div className="field"><label>📅 Disponível em</label><input type="datetime-local" value={form.disponivel_em} onChange={set('disponivel_em')} /></div>
                <div className="field"><label>🔒 Encerra em</label><input type="datetime-local" value={form.encerra_em} onChange={set('encerra_em')} /></div>
              </div>
              {/* Resumo */}
              <div style={{ background:'var(--slate-50)',borderRadius:10,padding:'1rem',marginTop:8,border:'1px solid var(--slate-200)' }}>
                <div style={{ fontSize:12,fontWeight:600,color:'var(--slate-500)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5 }}>Resumo</div>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {[
                    {v:TIPOS_AV.find(t=>t.id===form.tipo)?.icon+' '+TIPOS_AV.find(t=>t.id===form.tipo)?.label, bg:'var(--navy)', cor:'white'},
                    {v:'❓ '+form.questoes_sel.length+' questão(ões)', bg:'rgba(16,185,129,.1)', cor:'var(--emerald-dark)'},
                    {v:'⏱ '+form.tempo_limite+'min', bg:'rgba(245,158,11,.1)', cor:'#92400e'},
                    {v:'✅ Mín: '+form.nota_minima, bg:'var(--slate-100)', cor:'var(--slate-600)'},
                    {v:'🏫 '+(turmas.find(t=>t.id===Number(form.turma_id))?.nome||'Turma'), bg:'var(--slate-100)', cor:'var(--slate-600)'},
                  ].map((s,i)=><span key={i} style={{ padding:'3px 10px',borderRadius:50,background:s.bg,color:s.cor,fontSize:11,fontWeight:600 }}>{s.v}</span>)}
                </div>
              </div>
              {/* Randomização */}
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'14px', marginBottom:'1rem' }}>
                <div style={{ fontWeight:700, color:'#1d4ed8', marginBottom:10, fontSize:13 }}>🔀 Randomização</div>
                {[
                  { key:'randomizar_questoes', label:'🔀 Randomizar ordem das questões', desc:'Cada aluno recebe as questões em ordem diferente' },
                  { key:'randomizar_alternativas', label:'🎲 Embaralhar alternativas', desc:'Alternativas de múltipla escolha em ordem diferente (gabarito mantido)' },
                ].map(opt => (
                  <div key={opt.key} onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, cursor:'pointer', marginBottom:6,
                      background: form[opt.key] ? '#dbeafe' : 'white', border:'1px solid '+(form[opt.key]?'#93c5fd':'var(--slate-200)') }}>
                    <div style={{ width:20, height:20, borderRadius:4, flexShrink:0, border:'2px solid '+(form[opt.key]?'#2563eb':'var(--slate-300)'),
                      background:form[opt.key]?'#2563eb':'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {form[opt.key] && <span style={{ color:'white', fontSize:12 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--navy)' }}>{opt.label}</div>
                      <div style={{ fontSize:11, color:'var(--slate-500)' }}>{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex',gap:8,marginTop:16 }}>
                <button onClick={()=>{setStep(form.tipo==='entrega'?1:2);setError('');}} style={{ padding:'10px 16px',background:'white',border:'1.5px solid var(--slate-200)',borderRadius:8,cursor:'pointer',fontSize:13 }}>← Voltar</button>
                <button onClick={()=>salvar(false)} disabled={saving} style={{ flex:1,padding:'12px',background:'var(--slate-100)',color:'var(--slate-700)',border:'1.5px solid var(--slate-300)',borderRadius:8,fontWeight:600,fontSize:14,cursor:'pointer' }}>💾 Rascunho</button>
                <button onClick={()=>salvar(true)} disabled={saving} style={{ flex:1,padding:'12px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:'0 4px 14px rgba(16,185,129,.35)' }}>
                  {saving?'Salvando...':'🚀 Publicar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// GERENCIAR QUESTÕES DA AVALIAÇÃO — usa CriarQuestaoModal completo
// Criar nova questão (com IA + mídia), editar, remover, importar banco
// ════════════════════════════════════════════════════════════════

function GerenciarQuestoes({ av, questoesDisp, trilhas, disciplinas = [], onBack, onUpdate }) {
  const [questoes, setQuestoes] = useState(() => av.questoes || []);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState(null);
  const [abaAtiva, setAba]      = useState('banco');
  const [busca, setBusca]       = useState('');
  const [filtroTipo, setFTipo]  = useState('');
  const [filtroNivel, setFNivel]= useState('');
  const [filtroDisc, setFDisc]  = useState('');

  // Modal CriarQuestaoModal state
  const [showModal, setShowModal]   = useState(false);
  const [editandoQ, setEditandoQ]   = useState(null);

  const pesoTotal = questoes.reduce((s, q) => s + (q.peso || 1), 0);

  // Banco: questões disponíveis com filtros avançados
  const banco = questoesDisp.filter(q => {
    if (questoes.find(qc => qc.questao_id === q.id)) return false;
    if (busca && !q.enunciado?.toLowerCase().includes(busca.toLowerCase()) &&
        !(q.tags||[]).some(t => t.toLowerCase().includes(busca.toLowerCase()))) return false;
    if (filtroTipo  && q.tipo !== filtroTipo)   return false;
    if (filtroNivel && q.nivel !== filtroNivel) return false;
    if (filtroDisc  && String(q.disciplina_id) !== String(filtroDisc)) return false;
    return true;
  });

  // Opções únicas para os filtros
  const tiposDisp  = [...new Set(questoesDisp.map(q => q.tipo).filter(Boolean))];
  const niveisDisp = [...new Set(questoesDisp.map(q => q.nivel).filter(Boolean))];
  const discsDisp  = [...new Set(questoesDisp.map(q => q.disciplina_id).filter(Boolean))];

  const addFromBanco = (q) => {
    setQuestoes(qs => [...qs, { questao_id: q.id, peso: 1, _meta: q }]);
    setAlert({ type:'success', msg:'"'+q.enunciado.slice(0,40)+'..." adicionada. Salve para confirmar.' });
    setTimeout(() => setAlert(null), 3000);
  };

  const renderBancoCard = (q) => (
    <div key={q.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', marginBottom:4 }}>
      <span style={{ fontSize:13, flexShrink:0 }}>{TIPO_Q_ICONS[q.tipo] || '❓'}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.enunciado}</div>
        <div style={{ display:'flex', gap:6, marginTop:2, flexWrap:'wrap' }}>
          {q.nivel && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-500)' }}>{q.nivel}</span>}
          {q.tipo_uso === 'avaliacao' && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'#eff6ff', color:'#1d4ed8' }}>📊 Avaliação</span>}
          {q.tipo_uso === 'ambos' && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'#f5f3ff', color:'#6d28d9' }}>🔀 Ambos</span>}
        </div>
      </div>
      <button onClick={() => addFromBanco(q)} style={{ padding:'4px 10px', background:'var(--emerald)', color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>+ Adicionar</button>
    </div>
  );

  const remover = (qid) => setQuestoes(qs => qs.filter(q => q.questao_id !== qid));

  const setPeso = (qid, peso) =>
    setQuestoes(qs => qs.map(q => q.questao_id === qid ? { ...q, peso: Number(peso) } : q));

  // Nova questão criada via CriarQuestaoModal
  const handleNovaCriada = (novaQ) => {
    setQuestoes(qs => [...qs, { questao_id: novaQ.id, peso: 1, _meta: novaQ }]);
    setShowModal(false);
    setEditandoQ(null);
    setAba('avaliacao');
    setAlert({ type:'success', msg:'✅ Questão criada e adicionada! Clique em "Salvar" para confirmar.' });
    setTimeout(() => setAlert(null), 5000);
  };

  // Questão editada via CriarQuestaoModal
  const handleEditSalva = (qAtualizada) => {
    setQuestoes(qs => qs.map(q => q.questao_id === qAtualizada.id ? { ...q, _meta: qAtualizada } : q));
    setShowModal(false);
    setEditandoQ(null);
    setAlert({ type:'success', msg:'✅ Questão atualizada!' });
    setTimeout(() => setAlert(null), 3000);
  };

  const abrirEditar = (qc) => {
    const meta = qc._meta || questoesDisp.find(q => q.id === qc.questao_id);
    setEditandoQ(meta || { id: qc.questao_id });
    setShowModal(true);
  };

  const abrirCriar = () => {
    setEditandoQ(null);
    setShowModal(true);
  };

  const salvar = async () => {
    if (questoes.length === 0) return setAlert({ type:'error', msg:'Adicione ao menos 1 questão.' });
    setSaving(true);
    try {
      const payload = questoes.map(q => ({ questao_id: q.questao_id, peso: q.peso || 1 }));
      await api.put('/avaliacoes/' + av.id, { questoes: payload });
      setAlert({ type:'success', msg: '✅ Salvo! ' + payload.length + ' questão(ões) na avaliação.' });
      onUpdate({ ...av, questoes: payload, total_questoes: payload.length });
      setTimeout(() => setAlert(null), 3000);
    } catch(e) { setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao salvar.' }); }
    setSaving(false);
  };

  // Enriquecer questões com dados do banco
  const qEnriquecidas = questoes.map(qc => ({
    ...qc,
    _meta: qc._meta || questoesDisp.find(q => q.id === qc.questao_id),
  }));

  return (
    <>
      {/* ── Cabeçalho ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
        <div>
          <div className="page-title" style={{ marginBottom:0 }}>Questões — {av.titulo}</div>
          <div className="page-sub">{questoes.length} questão(ões) · {av.status}</div>
        </div>
        <button onClick={salvar} disabled={saving} style={{ marginLeft:'auto', padding:'10px 22px', background:'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 3px 10px rgba(16,185,129,.3)' }}>
          {saving ? 'Salvando...' : '💾 Salvar Alterações'}
        </button>
      </div>

      {alert && <div className={'alert alert-' + alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', alignItems:'start' }}>

        {/* ── ESQUERDA: questões na avaliação ── */}
        <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'0.875rem 1rem', borderBottom:'1px solid var(--slate-100)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)' }}>
              📋 Na Avaliação ({questoes.length})
            </span>
            <span style={{ fontSize:11, color:'var(--slate-400)' }}>Peso total: {pesoTotal}</span>
          </div>
          <div style={{ padding:'0.75rem', maxHeight:540, overflowY:'auto' }}>
            {qEnriquecidas.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--slate-400)' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📝</div>
                <div style={{ fontSize:13 }}>Nenhuma questão.<br/>Crie ou importe pelo painel ao lado →</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {qEnriquecidas.map((qc, i) => {
                  const m = qc._meta;
                  return (
                    <div key={qc.questao_id} style={{ padding:'9px 10px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:7 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--slate-400)', minWidth:16, paddingTop:3 }}>{i + 1}</span>
                        <span style={{ fontSize:14, flexShrink:0 }}>{m ? (TIPO_Q_ICONS[m.tipo] || '❓') : '❓'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {m?.enunciado || 'Questão #' + qc.questao_id}
                          </div>
                          <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:2, display:'flex', gap:6, flexWrap:'wrap' }}>
                            <span>{m?.tipo?.replace(/_/g,' ')}</span>
                            <span>⭐ {m?.xp} XP</span>
                            {m?.trilha_nome && <span>📚 {m.trilha_nome}</span>}
                            {(m?.midias||[]).filter(md=>md.tipo!=='nenhum').length > 0 && (
                              <span style={{ color:'var(--sky)', fontWeight:600 }}>🖼️ Mídia</span>
                            )}
                          </div>
                        </div>
                        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
                          <input type="number" min={0.5} max={10} step={0.5} value={qc.peso || 1}
                            onChange={e => setPeso(qc.questao_id, e.target.value)}
                            title="Peso"
                            style={{ width:40, padding:'2px 4px', border:'1px solid var(--slate-200)', borderRadius:5, fontSize:11, textAlign:'center', outline:'none' }} />
                          <button onClick={() => abrirEditar(qc)} title="Editar questão completa"
                            style={{ width:26, height:26, borderRadius:6, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                          <button onClick={() => remover(qc.questao_id)} title="Remover da avaliação"
                            style={{ width:26, height:26, borderRadius:6, background:'#fef2f2', border:'1px solid #fca5a5', color:'#b91c1c', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── DIREITA: Banco + Criar ── */}
        <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden' }}>
          {/* Abas */}
          <div style={{ padding:'0.5rem 0.75rem', borderBottom:'1px solid var(--slate-100)', display:'flex', gap:4, alignItems:'center' }}>
            {[['banco', '📚 Banco (' + banco.length + ')'], ['avaliacao', '📋 Na Avaliação']].map(([k, l]) => (
              <button key={k} onClick={() => setAba(k)} style={{ padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background: abaAtiva===k ? 'var(--navy)' : 'transparent', color: abaAtiva===k ? 'white' : 'var(--slate-500)', transition:'all .15s' }}>{l}</button>
            ))}
            <button onClick={abrirCriar} style={{ marginLeft:'auto', padding:'6px 14px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:700, boxShadow:'0 2px 8px rgba(16,185,129,.3)', whiteSpace:'nowrap' }}>
              ✨ Nova Questão
            </button>
          </div>

          <div style={{ padding:'0.75rem', maxHeight:540, overflowY:'auto' }}>
            {abaAtiva === 'banco' && (
              <>
                {/* ── Filtros avançados ── */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar..."
                    style={{ flex:1, minWidth:120, padding:'6px 10px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:12, outline:'none' }}
                    onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />
                  <select value={filtroTipo} onChange={e => setFTipo(e.target.value)}
                    style={{ padding:'6px 8px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:11, outline:'none', maxWidth:120 }}>
                    <option value="">Todos os tipos</option>
                    {tiposDisp.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                  <select value={filtroNivel} onChange={e => setFNivel(e.target.value)}
                    style={{ padding:'6px 8px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:11, outline:'none', maxWidth:100 }}>
                    <option value="">Todos níveis</option>
                    {niveisDisp.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {(busca || filtroTipo || filtroNivel) && (
                    <button onClick={() => { setBusca(''); setFTipo(''); setFNivel(''); }}
                      style={{ padding:'6px 10px', border:'1px solid #fecaca', borderRadius:7, background:'#fef2f2', color:'#dc2626', fontSize:11, cursor:'pointer' }}>✕ Limpar</button>
                  )}
                </div>
                <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:6 }}>
                  {banco.length} questão(ões) disponível(is)
                  {(busca||filtroTipo||filtroNivel) && ' (filtradas)'}
                </div>
                {banco.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--slate-400)', fontSize:13 }}>
                    {questoesDisp.length === 0
                      ? 'Banco vazio. Clique em "✨ Nova Questão" para criar.'
                      : (busca||filtroTipo||filtroNivel) ? 'Nenhuma questão corresponde aos filtros.' : 'Todas as questões já foram adicionadas.'}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {(() => {
                      if (!agruparDisc) {
                        return banco.map(q => renderBancoCard(q));
                      }
                      // Agrupar por disciplina
                      const sem = banco.filter(q => !q.disciplina_id);
                      const porDisc = {};
                      banco.filter(q => q.disciplina_id).forEach(q => {
                        const key = String(q.disciplina_id);
                        if (!porDisc[key]) porDisc[key] = [];
                        porDisc[key].push(q);
                      });
                      return (
                        <>
                          {Object.entries(porDisc).map(([did, qs]) => {
                            const disc = disciplinas.find(d => String(d.id) === did);
                            return (
                              <div key={did} style={{ marginBottom:10 }}>
                                <div style={{ padding:'5px 10px', background:'var(--navy)', color:'white', borderRadius:'6px 6px 0 0', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                                  📚 {disc ? disc.nome : 'Disciplina '+did}
                                  <span style={{ opacity:.6, fontWeight:400 }}>({qs.length})</span>
                                </div>
                                {qs.map(q => renderBancoCard(q))}
                              </div>
                            );
                          })}
                          {sem.length > 0 && (
                            <div style={{ marginBottom:10 }}>
                              <div style={{ padding:'5px 10px', background:'var(--slate-400)', color:'white', borderRadius:'6px 6px 0 0', fontSize:11, fontWeight:700 }}>
                                📋 Sem disciplina ({sem.length})
                              </div>
                              {sem.map(q => renderBancoCard(q))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {abaAtiva === 'avaliacao' && (
              <div style={{ color:'var(--slate-500)', fontSize:13, textAlign:'center', padding:'2rem' }}>
                Veja e gerencie as questões no painel ao lado ←
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CriarQuestaoModal — create or edit ── */}
      {showModal && (
        <CriarQuestaoModal
          trilhas={trilhas}
          disciplinas={disciplinas}
          trilha_id_inicial={trilhas[0]?.id}
          questaoEdit={editandoQ}
          onClose={() => { setShowModal(false); setEditandoQ(null); }}
          onSalvar={editandoQ ? handleEditSalva : handleNovaCriada}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// RESULTADOS
// ════════════════════════════════════════════════════════════════
function ResultadosView({ av, onBack }) {
  const [data, setData]         = useState(null);
  const [entregas, setEntregas] = useState(null);
  const [abaAtiva, setAba]      = useState('notas');
  const [corrigindo, setCor]    = useState(null); // { tentativa_id, questao_id, nota, feedback }
  const [salvando, setSalvando] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    api.get('/avaliacoes/'+av.id+'/resultados').then(r => setData(r.data)).catch(console.error);
    // Verificar se tem questões de upload
    api.get('/avaliacoes/'+av.id+'/entregas').then(r => {
      if (r.data.entregas?.length > 0 || r.data.questoes_upload?.length > 0) setEntregas(r.data);
    }).catch(() => {});
  }, [av.id]);

  const salvarCorrecao = async () => {
    if (!corrigindo) return;
    if (corrigindo.nota === '' || corrigindo.nota === undefined) return;
    setSalvando(true);
    try {
      await api.patch('/avaliacoes/tentativa/'+corrigindo.tentativa_id+'/corrigir', {
        questao_id: corrigindo.questao_id,
        nota: Number(corrigindo.nota),
        feedback: corrigindo.feedback,
      });
      setAlertMsg({ type:'success', msg:'✅ Nota salva!' });
      setCor(null);
      // Refresh entregas
      const r = await api.get('/avaliacoes/'+av.id+'/entregas');
      setEntregas(r.data);
      setTimeout(() => setAlertMsg(null), 3000);
    } catch(e) { setAlertMsg({ type:'error', msg: e.response?.data?.error || 'Erro.' }); }
    setSalvando(false);
  };

  if (!data) return <div style={{ textAlign:'center',padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;
  const { estatisticas, resultados } = data;
  const temEntregas = entregas?.entregas?.length > 0 || entregas?.questoes_upload?.length > 0;
  const pendentes   = entregas?.entregas?.filter(e => e.pendente_correcao).length || 0;

  return (
    <>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:'1.5rem' }}>
        <button onClick={onBack} style={{ padding:'6px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,background:'white',cursor:'pointer',fontSize:13 }}>← Voltar</button>
        <div>
          <div className="page-title" style={{ marginBottom:0 }}>Resultados — {av.titulo}</div>
          <div className="page-sub">Nota mínima: {av.nota_minima} · {TIPOS_AV.find(t=>t.id===av.tipo)?.icon} {av.tipo}</div>
        </div>
      </div>

      {alertMsg && <div className={'alert alert-'+alertMsg.type} style={{ marginBottom:'1rem' }}>{alertMsg.msg}</div>}

      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Participantes"  value={estatisticas.total_alunos}       icon="👥" accent="accent-sky" />
        <StatCard label="Média"          value={(estatisticas.media_geral||0).toFixed(1)+'/10'} icon="📊" accent="accent-amber" />
        <StatCard label="Aprovados"      value={estatisticas.aprovados||0}        icon="✅" accent="accent-green" />
        <StatCard label="Aprovação"      value={(estatisticas.taxa_aprovacao||0)+'%'} icon="🎯" accent="accent-coral" />
      </div>

      {/* Abas */}
      {temEntregas && (
        <div style={{ display:'flex', gap:4, marginBottom:'1rem', background:'var(--slate-100)', padding:4, borderRadius:10, width:'fit-content' }}>
          {[['notas','📊 Notas'], ['entregas','📤 Entregas'+(pendentes>0?' ('+pendentes+' pendentes)':'')]].map(([k,l])=>(
            <button key={k} onClick={()=>setAba(k)} style={{ padding:'7px 18px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:abaAtiva===k?'white':'transparent', color:abaAtiva===k?'var(--navy)':'var(--slate-500)', boxShadow:abaAtiva===k?'0 1px 4px rgba(0,0,0,.1)':'none', transition:'all .15s' }}>
              {l}{pendentes>0&&k==='entregas'&&<span style={{ marginLeft:4, padding:'1px 6px', borderRadius:50, background:'#ef4444', color:'white', fontSize:10 }}>{pendentes}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ABA NOTAS */}
      {abaAtiva==='notas' && (
        <div className="card">
          {resultados.length===0 ? (
            <EmptyState icon="📊" title="Nenhum aluno respondeu ainda" sub="Aguarde os alunos realizarem a avaliação" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Aluno</th><th>Nota</th><th>Status</th><th>Tentativas</th><th>Data</th></tr></thead>
                <tbody>
                  {resultados.map((a,i)=>(
                    <tr key={a.aluno_id}>
                      <td style={{ fontWeight:700,color:'var(--slate-400)',fontSize:12 }}>{i+1}</td>
                      <td style={{ fontWeight:500 }}>{a.nome}</td>
                      <td><span style={{ fontFamily:'var(--font-head)',fontSize:20,fontWeight:700,color:a.aprovado?'var(--emerald-dark)':a.melhor_nota>=5?'#f59e0b':'var(--coral)' }}>{(a.melhor_nota||0).toFixed(1)}</span></td>
                      <td><span style={{ padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600,background:a.aprovado?'#f0fdf4':'#fef2f2',color:a.aprovado?'#15803d':'#b91c1c' }}>{a.aprovado?'✅ Aprovado':'❌ Reprovado'}</span></td>
                      <td style={{ color:'var(--slate-500)',textAlign:'center' }}>{a.total_tentativas}</td>
                      <td style={{ fontSize:11,color:'var(--slate-400)' }}>{a.ultima_tentativa?new Date(a.ultima_tentativa).toLocaleDateString('pt-BR'):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA ENTREGAS — correção manual */}
      {abaAtiva==='entregas' && entregas && (
        <>
          {pendentes > 0 && (
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', marginBottom:'1rem', fontSize:13, color:'#92400e' }}>
              ⏳ <strong>{pendentes} entrega(s)</strong> aguardando sua correção manual.
            </div>
          )}

          {entregas.entregas.length === 0 ? (
            <div className="card"><EmptyState icon="📤" title="Nenhuma entrega ainda" sub="Os alunos ainda não enviaram arquivos." /></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {entregas.entregas.map(e => (
                <div key={e.tentativa_id} style={{ background:'white', border:'1px solid '+(e.pendente_correcao?'#fcd34d':'var(--slate-200)'), borderRadius:14, overflow:'hidden', boxShadow:'var(--shadow)' }}>
                  {/* Header aluno */}
                  <div style={{ padding:'12px 16px', background:e.pendente_correcao?'#fffbeb':'var(--slate-50)', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--slate-100)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13 }}>
                        {e.aluno.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{e.aluno.nome}</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>{e.aluno.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {e.nota !== null && e.nota !== undefined ? (
                        <span style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, color:e.aprovado?'var(--emerald-dark)':'var(--coral)' }}>
                          {e.nota.toFixed(1)}
                        </span>
                      ) : (
                        <span style={{ fontSize:12, color:'var(--slate-400)', fontStyle:'italic' }}>Pendente</span>
                      )}
                      {e.pendente_correcao && (
                        <div style={{ fontSize:10, color:'#92400e', fontWeight:600 }}>⏳ Aguardando correção</div>
                      )}
                    </div>
                  </div>

                  {/* Respostas de upload */}
                  {e.respostas_upload.map(r => {
                    const resp = r.resposta;
                    const arq  = typeof resp === 'object' ? resp?.arquivo : null;
                    const txt  = typeof resp === 'object' ? resp?.texto : (typeof resp === 'string' ? resp : null);
                    const isImg = arq?.tipo?.startsWith('image/');

                    return (
                      <div key={r.questao_id} style={{ padding:'14px 16px', borderBottom:'1px solid var(--slate-100)' }}>
                        <div style={{ fontWeight:600, fontSize:12, color:'var(--slate-600)', marginBottom:8 }}>
                          📎 {r.enunciado?.slice(0,80)}{r.enunciado?.length>80?'...':''}
                        </div>

                        {/* Arquivo enviado */}
                        {arq ? (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ padding:'10px 14px', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)', display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:22 }}>{arq.tipo?.startsWith('image/')?'🖼️':arq.tipo?.includes('pdf')?'📄':'📎'}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:600, fontSize:12, color:'var(--navy)' }}>{arq.nome}</div>
                                <div style={{ fontSize:10, color:'var(--slate-400)' }}>{arq.tamanho ? Math.round(arq.tamanho/1024)+'KB' : ''} · {arq.tipo}</div>
                              </div>
                              {arq.base64 && (
                                <a href={arq.base64} download={arq.nome}
                                  style={{ padding:'5px 12px', background:'var(--navy)', color:'white', borderRadius:6, fontSize:11, fontWeight:600, textDecoration:'none' }}>
                                  ⬇️ Baixar
                                </a>
                              )}
                            </div>
                            {isImg && arq.base64 && (
                              <div style={{ marginTop:8, borderRadius:8, overflow:'hidden', border:'1px solid var(--slate-200)', maxHeight:300 }}>
                                <img src={arq.base64} alt="entrega" style={{ maxWidth:'100%', maxHeight:300, display:'block', objectFit:'contain', background:'white' }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize:12, color:'var(--slate-400)', marginBottom:8, fontStyle:'italic' }}>Sem arquivo anexado</div>
                        )}

                        {/* Texto/código */}
                        {txt && txt.trim() && (
                          <pre style={{ background:'var(--slate-900)', color:'#e2e8f0', padding:'12px', borderRadius:8, fontSize:11, overflow:'auto', maxHeight:160, fontFamily:'monospace', marginBottom:10, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                            {txt}
                          </pre>
                        )}

                        {/* Painel de correção */}
                        {corrigindo?.tentativa_id===e.tentativa_id && corrigindo?.questao_id===r.questao_id ? (
                          <div style={{ background:'#f0fdf4', border:'2px solid #86efac', borderRadius:10, padding:'12px 14px' }}>
                            <div style={{ fontWeight:600, fontSize:12, color:'var(--navy)', marginBottom:10 }}>✏️ Corrigir entrega</div>
                            <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                              <div>
                                <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:4 }}>Nota (0–10)</div>
                                <input type="number" min={0} max={10} step={0.5}
                                  value={corrigindo.nota}
                                  onChange={e => setCor(c => ({ ...c, nota: e.target.value }))}
                                  style={{ width:70, padding:'6px 10px', border:'2px solid var(--emerald)', borderRadius:7, fontSize:14, fontWeight:700, textAlign:'center', outline:'none' }} />
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:4 }}>Feedback para o aluno</div>
                                <textarea rows={2} value={corrigindo.feedback}
                                  onChange={e => setCor(c => ({ ...c, feedback: e.target.value }))}
                                  placeholder="Comentário sobre a entrega..."
                                  style={{ width:'100%', padding:'6px 10px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:12, resize:'none', outline:'none', fontFamily:'var(--font-body)' }} />
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                              <button onClick={salvarCorrecao} disabled={salvando} style={{ padding:'8px 18px', background:'var(--emerald)', color:'white', border:'none', borderRadius:7, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                                {salvando ? '...' : '💾 Salvar Nota'}
                              </button>
                              <button onClick={() => setCor(null)} style={{ padding:'8px 14px', background:'white', border:'1px solid var(--slate-200)', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {r.score_atual !== null ? (
                              <span style={{ padding:'4px 12px', borderRadius:6, background:'#f0fdf4', color:'#15803d', fontSize:12, fontWeight:700, border:'1px solid #86efac' }}>
                                ✅ Nota: {(r.score_atual*10).toFixed(1)} {r.corrigido_manualmente ? '(manual)' : '(IA)'}
                              </span>
                            ) : (
                              <span style={{ fontSize:11, color:'#92400e', background:'#fffbeb', padding:'4px 10px', borderRadius:6, border:'1px solid #fcd34d' }}>
                                ⏳ Não corrigido
                              </span>
                            )}
                            {r.feedback_prof && (
                              <span style={{ fontSize:11, color:'var(--slate-500)', fontStyle:'italic' }}>"{r.feedback_prof.slice(0,60)}"</span>
                            )}
                            <button onClick={() => setCor({ tentativa_id:e.tentativa_id, questao_id:r.questao_id, nota: r.score_atual!==null ? (r.score_atual*10).toFixed(1) : '', feedback: r.feedback_prof||'' })}
                              style={{ marginLeft:'auto', padding:'5px 12px', background:'var(--sky)', color:'white', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                              ✏️ Corrigir
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function ProfAvaliacoes({ autoCreate } = {}) {
  const { user } = useAuth();
  const [avs, setAvs]           = useState([]);
  const [turmas, setTurmas]     = useState([]);
  const [questoesDisp, setQs]   = useState([]);
  const [trilhas, setTrilhas]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [viewResultados, setViewRes] = useState(null);
  const [editQuestoes, setEditQ]    = useState(null);
  const [disciplinasProf, setDiscProf] = useState([]);

  const load = async () => {
    try {
      const [avRes, tRes, qRes, trRes, dRes] = await Promise.all([
        api.get('/avaliacoes?professor_id='+user.id),
        api.get('/turmas?professor_id='+user.id),
        api.get('/questoes?professor_id='+user.id),
        api.get('/trilhas?professor_id='+user.id),
        api.get('/disciplinas'),
      ]);
      setAvs(avRes.data.avaliacoes || []);
      setTurmas(tRes.data.turmas || []);
      const trilhasMap = {};
      const trList = trRes.data.trilhas || [];
      trList.forEach(t=>{ trilhasMap[t.id]=t.nome; });
      setTrilhas(trList);
      // disciplinas available in scope as dRes.data.disciplinas
      setDiscProf(dRes?.data?.disciplinas || []);
      setQs((qRes.data.questoes||[]).map(q=>({ ...q, trilha_nome: q.trilha_id?(trilhasMap[q.trilha_id]||'Trilha'):'' })));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  useEffect(() => { if (autoCreate) setShowCriar(true); }, [autoCreate]);

  const handlePublicar = async (id) => {
    try { await api.patch('/avaliacoes/'+id+'/publicar'); setAvs(p=>p.map(a=>a.id===id?{...a,status:'publicada'}:a)); }
    catch(e){ alert(e.response?.data?.error||'Erro.'); }
  };

  const handleClonar = async (av) => {
    const titulo = prompt('Nome da cópia:', av.titulo + ' (cópia)');
    if (!titulo) return;
    try {
      const r = await api.post('/avaliacoes/'+av.id+'/clonar', { titulo });
      setAvs(p => [...p, r.data.avaliacao]);
      alert('✅ ' + r.data.message);
    } catch(e) { alert(e.response?.data?.error || 'Erro ao clonar.'); }
  };

  const handleVincularTurmas = async (av, turmaIds) => {
    try {
      await api.post('/avaliacoes/'+av.id+'/turmas', { turma_ids: turmaIds });
      alert('✅ Avaliação vinculada a ' + turmaIds.length + ' turma(s)!');
    } catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir avaliação?')) return;
    await api.delete('/avaliacoes/'+id);
    setAvs(p=>p.filter(a=>a.id!==id));
  };

  const handleUpdateAv = (updated) => {
    setAvs(p => p.map(a => a.id===updated.id ? updated : a));
  };

  if (viewResultados) return <ResultadosView av={viewResultados} onBack={()=>setViewRes(null)} />;
  if (editQuestoes)   return <GerenciarQuestoes av={editQuestoes} questoesDisp={questoesDisp} trilhas={trilhas} disciplinas={disciplinasProf} onBack={()=>setEditQ(null)} onUpdate={up=>{ handleUpdateAv(up); setEditQ(up); }} />;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Avaliações</div>
        <div className="page-sub">Crie provas, trabalhos e quizzes com correção automática por IA</div>
      </div>

      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        <StatCard label="Total"      value={avs.length}                            icon="📝" accent="accent-sky" />
        <StatCard label="Publicadas" value={avs.filter(a=>a.status==='publicada').length} icon="🚀" accent="accent-green" />
        <StatCard label="Rascunhos"  value={avs.filter(a=>a.status==='rascunho').length}  icon="💾" accent="accent-amber" />
        <StatCard label="Questões"   value={questoesDisp.length}                   icon="❓" accent="accent-coral" />
      </div>

      <div className="card">
        <div className="section-header">
          <span style={{ fontSize:13,color:'var(--slate-500)' }}>{avs.length} avaliação(ões)</span>
          <button className="btn-create" onClick={()=>setShowCriar(true)}>+ Nova Avaliação</button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : avs.length===0 ? (
          <EmptyState icon="📝" title="Nenhuma avaliação criada" sub="Clique em '+ Nova Avaliação' para começar" />
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {avs.map(av => {
              const cfg = STATUS_CFG[av.status] || STATUS_CFG.rascunho;
              const numQ = av.total_questoes ?? (Array.isArray(av.questoes)?av.questoes.length:0);
              return (
                <div key={av.id} style={{ border:'1px solid var(--slate-200)',borderRadius:10,overflow:'hidden' }}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px' }}>
                    <div style={{ width:44,height:44,borderRadius:10,background:'var(--slate-100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>
                      {TIPOS_AV.find(t=>t.id===av.tipo)?.icon||'📝'}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap' }}>
                        <span style={{ fontWeight:600,fontSize:14,color:'var(--navy)' }}>{av.titulo}</span>
                        <span style={{ padding:'2px 9px',borderRadius:50,fontSize:11,fontWeight:600,background:cfg.bg,color:cfg.cor }}>{cfg.label}</span>
                        {numQ===0 && <span style={{ padding:'2px 9px',borderRadius:50,fontSize:11,background:'#fffbeb',color:'#92400e',border:'1px solid #fcd34d' }}>⚠️ Sem questões</span>}
                      </div>
                      {av.descricao&&<div style={{ fontSize:12,color:'var(--slate-500)',marginBottom:4 }}>{av.descricao}</div>}
                      <div style={{ display:'flex',gap:10,fontSize:11,color:'var(--slate-400)',flexWrap:'wrap' }}>
                        <span>❓ {numQ} questão(ões)</span>
                        <span>⏱ {av.tempo_limite}min</span>
                        <span>🔁 {av.tentativas_permitidas}x</span>
                        <span>✅ Mín:{av.nota_minima}</span>
                        {turmas.find(t=>t.id===av.turma_id)&&<span>🏫 {turmas.find(t=>t.id===av.turma_id)?.nome}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,flexShrink:0,flexWrap:'wrap' }}>
                      <button className="btn-sm" style={{ background:'rgba(99,102,241,.1)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.3)' }} onClick={()=>setEditQ(av)}>✏️ Questões</button>
                      <button className="btn-sm btn-view" onClick={()=>setViewRes(av)}>📊</button>
                      {av.status==='rascunho'&&<button className="btn-sm btn-approve" onClick={()=>handlePublicar(av.id)}>🚀</button>}
                      <button className="btn-sm btn-danger" onClick={()=>handleDelete(av.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCriar && <ModalCriar turmas={turmas} questoesDisp={questoesDisp} onClose={()=>setShowCriar(false)} onSalvar={nova=>setAvs(p=>[nova,...p])} />}
    </>
  );
}

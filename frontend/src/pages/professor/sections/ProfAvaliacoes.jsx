/**
 * ProfAvaliacoes - Criar, Editar, CRUD de quest-es da avalia--o
 * Wizard 3 passos para criar | Edi--o completa de quest-es na avalia--o
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

// ----------------------------------------------------------------
// MODAL CRIAR - wizard 3 passos
// ----------------------------------------------------------------

function showToast(msg, tipo) {
  var div = document.createElement('div');
  var isOk = tipo !== 'error';
  div.style.cssText = 'position:fixed;top:22px;right:22px;z-index:99999;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;color:white;background:'+(isOk?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#ef4444,#dc2626)')+';box-shadow:0 4px 20px rgba(0,0,0,.25);animation:toastIn .3s ease;max-width:320px;display:flex;align-items:center;gap:8px;';
  div.innerHTML = (isOk?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>')+'<span>'+msg+'</span>';
  var s = document.createElement('style'); s.textContent='@keyframes toastIn{from{transform:translateX(120%);opacity:0}to{transform:none;opacity:1}}'; document.head.appendChild(s);
  document.body.appendChild(div);
  setTimeout(function(){ div.style.transition='opacity .3s'; div.style.opacity='0'; setTimeout(function(){ div.remove(); s.remove(); },350); }, 2800);
}
function confirmAlert(titulo, msg, onOk) {
  var o = document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(2px)';
  o.innerHTML='<div style="background:white;border-radius:20px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3);animation:swAlert .25s cubic-bezier(.34,1.56,.64,1)"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:1.25rem;text-align:center"><div style="font-size:42px;margin-bottom:6px">⚠️</div><div style="font-weight:800;font-size:17px;color:white">'+titulo+'</div></div><div style="padding:1.25rem;text-align:center"><p style="color:#475569;font-size:14px;margin:0 0 1.25rem;line-height:1.6">'+msg+'</p><div style="display:flex;gap:10px"><button id="cc" style="flex:1;padding:11px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:#64748b">❌ Cancelar</button><button id="co" style="flex:2;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(239,68,68,.4)">🗑️ Sim, excluir</button></div></div></div><style>@keyframes swAlert{from{transform:scale(.85) translateY(20px);opacity:0}to{transform:none;opacity:1}}</style>';
  document.body.appendChild(o);
  o.querySelector('#cc').onclick=function(){ o.remove(); };
  o.querySelector('#co').onclick=function(){ o.remove(); onOk(); };
  o.onclick=function(e){ if(e.target===o) o.remove(); };
}
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
    // Para tipo 'entrega', pular passo 2 (sem quest-es) e ir direto para configura--es
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

// ----------------------------------------------------------------
// GERENCIAR QUEST-ES DA AVALIA--O - usa CriarQuestaoModal completo
// Criar nova quest-o (com IA + m-dia), editar, remover, importar banco
// ----------------------------------------------------------------

function GerenciarQuestoes({ av, questoesDisp, trilhas, disciplinas = [], onBack, onUpdate }) {
  const [questoes, setQuestoes] = useState(() => av.questoes || []);
  const [saving, setSaving]     = useState(false);
  const [alert, setAlert]       = useState(null);
  const [abaAtiva, setAba]      = useState('banco');
  const [busca, setBusca]       = useState('');
  const [filtroTipo, setFTipo]  = useState('');
  const [filtroNivel, setFNivel]= useState('');
  const [filtroDisc, setFDisc]  = useState('');
  const [agruparDisc, setAgrupar] = useState(true);

  // Modal CriarQuestaoModal state
  const [showModal, setShowModal]   = useState(false);
  const [editandoQ, setEditandoQ]   = useState(null);

  const pesoTotal = questoes.reduce((s, q) => s + (q.peso || 1), 0);

  // Banco mostra TODAS as questoes disponíveis (tipo_uso é apenas informativo)
  // Questões antigas sem tipo_uso também aparecem
  const bancoBase = questoesDisp; // todas as questões do professor
  const banco = bancoBase.filter(q => {
    if (questoes.find(qc => qc.questao_id === q.id)) return false;
    if (busca && !q.enunciado?.toLowerCase().includes(busca.toLowerCase()) &&
        !(q.tags||[]).some(t => t.toLowerCase().includes(busca.toLowerCase()))) return false;
    if (filtroTipo  && q.tipo !== filtroTipo)   return false;
    if (filtroNivel && q.nivel !== filtroNivel) return false;
    if (filtroDisc  && String(q.disciplina_id) !== String(filtroDisc)) return false;
    return true;
  });

  // Op--es -nicas para os filtros
  const tiposDisp  = [...new Set(bancoBase.map(q => q.tipo).filter(Boolean))];
  const niveisDisp = [...new Set(bancoBase.map(q => q.nivel).filter(Boolean))];
  const discsDisp  = [...new Set(bancoBase.map(q => q.disciplina_id).filter(Boolean))];

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

  // Nova quest-o criada via CriarQuestaoModal
  const handleNovaCriada = (novaQ) => {
    setQuestoes(qs => [...qs, { questao_id: novaQ.id, peso: 1, _meta: novaQ }]);
    setShowModal(false);
    setEditandoQ(null);
    setAba('avaliacao');
    setAlert({ type:'success', msg:'✅ Questão criada e adicionada! Clique em "Salvar" para confirmar.' });
    setTimeout(() => setAlert(null), 5000);
  };

  // Quest-o editada via CriarQuestaoModal
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

  // Enriquecer quest-es com dados do banco
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

      {/* ── Questões selecionadas (compacto) ── */}
      {qEnriquecidas.length > 0 && (
        <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, marginBottom:'1rem', overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--slate-100)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>
              Questões na Avaliação ({questoes.length})
            </span>
            <span style={{ fontSize:11, color:'var(--slate-400)' }}>Peso total: {pesoTotal}</span>
          </div>
          <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:5, maxHeight:280, overflowY:'auto' }}>
            {qEnriquecidas.map((qc, i) => {
              const m = qc._meta;
              return (
                <div key={qc.questao_id} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', border:'1px solid var(--slate-100)', borderRadius:8, background:'white' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--slate-300)', minWidth:18, textAlign:'right' }}>{i+1}</span>
                  <span style={{ fontSize:13, flexShrink:0 }}>{m ? (TIPO_Q_ICONS[m.tipo] || '❓') : '❓'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--slate-700)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {m?.enunciado || 'Questão #' + qc.questao_id}
                    </div>
                    <div style={{ fontSize:10, color:'var(--slate-400)', display:'flex', gap:5 }}>
                      <span>{m?.tipo?.replace(/_/g,' ')}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <input type="number" min={0.5} max={10} step={0.5} value={qc.peso || 1}
                      onChange={e => setPeso(qc.questao_id, e.target.value)} title="Peso"
                      style={{ width:36, padding:'2px 4px', border:'1px solid var(--slate-200)', borderRadius:5, fontSize:11, textAlign:'center', outline:'none' }} />
                    <button onClick={() => abrirEditar(qc)} title="Editar"
                      style={{ width:24, height:24, borderRadius:5, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                    <button onClick={() => remover(qc.questao_id)} title="Remover"
                      style={{ width:24, height:24, borderRadius:5, background:'#fef2f2', border:'1px solid #fca5a5', color:'#b91c1c', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BANCO DE QUESTÕES ── */}
      <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden' }}>
          {/* Cabeçalho do banco */}
          <div style={{ padding:'0.5rem 0.75rem', borderBottom:'1px solid var(--slate-100)', display:'flex', gap:4, alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>
              Banco de Questões ({banco.length})
            </span>
            <button onClick={abrirCriar} style={{ marginLeft:'auto', padding:'6px 14px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:700, boxShadow:'0 2px 8px rgba(16,185,129,.3)', whiteSpace:'nowrap' }}>
              ✨ Nova Questão
            </button>
          </div>

          <div style={{ padding:'0.75rem', maxHeight:540, overflowY:'auto' }}>
            {true && (
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
                      // Separar por categoria: Avalia--o (por disciplina) | Trilha | Ambos
                      const qAvaliacao = banco.filter(q => q.tipo_uso === 'avaliacao' || q.tipo_uso === 'ambos');
                      const qTrilha    = banco.filter(q => q.tipo_uso === 'trilha' || (!q.tipo_uso));

                      // Agrupar qAvaliacao por disciplina
                      const porDisc = {};
                      qAvaliacao.forEach(q => {
                        const key = q.disciplina_id ? String(q.disciplina_id) : '__sem__';
                        if (!porDisc[key]) porDisc[key] = [];
                        porDisc[key].push(q);
                      });

                      const Section = ({ cor, hdr, qs }) => qs.length > 0 && (
                        <div style={{ marginBottom:10 }}>
                          <div style={{ padding:'5px 10px', background:cor, color:'white', borderRadius:'7px 7px 0 0', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                            {hdr} <span style={{ opacity:.6, fontWeight:400 }}>({qs.length})</span>
                          </div>
                          <div style={{ border:'1px solid var(--slate-200)', borderRadius:'0 0 7px 7px', overflow:'hidden' }}>
                            {qs.map(q => renderBancoCard(q))}
                          </div>
                        </div>
                      );

                      return (
                        <>
                          {/* Questões de Avaliação agrupadas por disciplina */}
                          {Object.entries(porDisc).map(([did, qs]) => {
                            const disc = disciplinas.find(d => String(d.id) === did);
                            const nome = disc ? disc.nome : (did === '__sem__' ? 'Sem disciplina' : 'Disciplina '+did);
                            return <Section key={did} cor="var(--navy)" hdr={'📚 '+nome} qs={qs} />;
                          })}
                          {/* Questões de Trilha */}
                          <Section cor="#059669" hdr="🎮 Trilhas & Desafios" qs={qTrilha} />
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* -- CriarQuestaoModal -- create or edit -- */}
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


// ── Modal Editar Avaliação ────────────────────────────────────
// ── ResultadosView ─────────────────────────────────────────────
function ResultadosView({ av, onBack }) {
  const [tentativas, setTentativas] = useState([]);
  const [loading, setLoading]       = useState(true);

  const [stats, setStats]   = useState(null);

  useEffect(function() {
    api.get('/avaliacoes/' + av.id + '/resultados')
      .then(function(r) {
        setTentativas(r.data.resultados || []);
        setStats(r.data.estatisticas || {});
      })
      .catch(function(e) { console.error(e); })
      .finally(function() { setLoading(false); });
  }, [av.id]);

  var concluidas = tentativas; // API already returns only concluded, one per aluno (best)
  var media      = stats ? (stats.media_geral || 0).toFixed(1) : '--';
  var aprovados  = stats ? (stats.aprovados || 0) : 0;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onBack}
          style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>
          &#8592; Voltar
        </button>
        <div>
          <div className="page-title" style={{ marginBottom:0 }}>Resultados — {av.titulo}</div>
          <div className="page-sub">{tentativas.length} aluno(s) avaliado(s) · Taxa de aprovação: {stats?(stats.taxa_aprovacao||0):0}%</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { l:'Alunos',      v:tentativas.length,      i:'👥' },
          { l:'Aprovados',   v:aprovados,              i:'✅' },
          { l:'Reprovados',  v:stats?(stats.reprovados||0):0, i:'📋' },
          { l:'Média geral', v:media,                   i:'📊' },
        ].map(function(s) {
          return (
            <div key={s.l} className="stat-card">
              <div className="stat-accent">{s.i}</div>
              <div className="stat-label">{s.l}</div>
              <div className="stat-value">{s.v}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:'1rem' }}>
          Detalhamento por Aluno
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}>
            <div className="spinner" style={{ margin:'0 auto' }} />
          </div>
        ) : concluidas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
            <div>Nenhuma tentativa concluída ainda.</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--slate-50)', borderBottom:'2px solid var(--slate-200)' }}>
                  {['Aluno','Nota','Status','Tentativa','Data'].map(function(h) {
                    return (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--slate-600)', fontSize:12 }}>
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {concluidas.map(function(t, i) {
                  var aprovado  = t.aprovado || (t.melhor_nota != null && t.melhor_nota >= (av.nota_minima||6));
                  var dataStr   = t.ultima_tentativa ? new Date(t.ultima_tentativa).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '--';
                  return (
                    <tr key={t.id} style={{ borderBottom:'1px solid var(--slate-100)', background: i%2===0?'white':'var(--slate-50)' }}>
                      <td style={{ padding:'10px 12px', color:'var(--navy)', fontWeight:500 }}>
                        <div>{t.nome || 'Aluno #' + t.aluno_id}</div>
                        {t.email && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{t.email}</div>}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontWeight:800, fontSize:15, color: aprovado?'#15803d':'#b91c1c' }}>
                          {t.melhor_nota != null ? t.melhor_nota.toFixed(1) : '--'}
                        </span>
                        <span style={{ fontSize:11, color:'var(--slate-400)' }}>/10</span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700,
                          background: aprovado?'#f0fdf4':'#fef2f2',
                          color: aprovado?'#15803d':'#b91c1c',
                          border: '1px solid '+(aprovado?'#86efac':'#fca5a5')
                        }}>
                          {aprovado ? 'Aprovado' : 'Reprovado'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', color:'var(--slate-500)', fontSize:12 }}>
                        {t.total_tentativas || 1}x
                      </td>
                      <td style={{ padding:'10px 12px', color:'var(--slate-400)', fontSize:12 }}>
                        {dataStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


function EditAvaliacaoModal({ av, turmas, onClose, onSalvar }) {
  const [form, setForm] = useState({
    titulo:                av.titulo || '',
    descricao:             av.descricao || '',
    tempo_limite:          av.tempo_limite || 60,
    tentativas_permitidas: av.tentativas_permitidas || 1,
    nota_minima:           av.nota_minima || 6,
    disponivel_em:         av.disponivel_em ? av.disponivel_em.slice(0,16) : '',
    encerra_em:            av.encerra_em    ? av.encerra_em.slice(0,16)    : '',
    turma_id:              av.turma_id || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const salvar = async () => {
    if (!form.titulo.trim()) { alert('Titulo obrigatorio.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tempo_limite:          Number(form.tempo_limite),
        tentativas_permitidas: Number(form.tentativas_permitidas),
        nota_minima:           Number(form.nota_minima),
        disponivel_em:         form.disponivel_em ? new Date(form.disponivel_em).toISOString() : null,
        encerra_em:            form.encerra_em    ? new Date(form.encerra_em).toISOString()    : null,
        turma_id:              form.turma_id ? Number(form.turma_id) : null,
      };
      const r = await api.put('/avaliacoes/' + av.id, payload);
      onSalvar(r.data.avaliacao || { ...av, ...payload });
      showToast('Avaliacao atualizada!', 'success');
    } catch(e) {
      showToast('Erro: ' + (e.response?.data?.error || e.message), 'error');
    }
    setSaving(false);
  };

  const inp = (label, k, type, extra) => (
    <div className="field">
      <label>{label}</label>
      <input type={type||'text'} value={form[k]} onChange={set(k)} {...(extra||{})}
        style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor='var(--emerald)'}
        onBlur={e=>e.target.style.borderColor='var(--slate-200)'}
      />
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 25px 60px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
          <span style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, color:'white' }}>Editar Avaliacao</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', opacity:.7 }}>&#x2715;</button>
        </div>

        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {/* Titulo */}
          <div className="field">
            <label>Titulo *</label>
            <input value={form.titulo} onChange={set('titulo')} placeholder="Nome da avaliacao"
              style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
          </div>

          {/* Descricao */}
          <div className="field">
            <label>Descricao</label>
            <textarea value={form.descricao} onChange={set('descricao')} rows={3}
              style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'var(--font-body)' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
          </div>

          {/* Grid de numericos */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {inp('Tempo (min)', 'tempo_limite', 'number', { min:1, max:300 })}
            {inp('Tentativas', 'tentativas_permitidas', 'number', { min:1, max:10 })}
            {inp('Nota minima', 'nota_minima', 'number', { min:0, max:10, step:0.5 })}
          </div>

          {/* Datas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field">
              <label>Abertura</label>
              <input type="datetime-local" value={form.disponivel_em} onChange={set('disponivel_em')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
            </div>
            <div className="field">
              <label>Encerramento</label>
              <input type="datetime-local" value={form.encerra_em} onChange={set('encerra_em')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
            </div>
          </div>

          {/* Turma */}
          {turmas.length > 0 && (
            <div className="field">
              <label>Turma</label>
              <select value={form.turma_id} onChange={set('turma_id')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}>
                <option value="">Sem turma especifica</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}

          {/* Botoes */}
          <div style={{ display:'flex', gap:10, marginTop:'0.5rem' }}>
            <button onClick={onClose} style={{ flex:1, padding:'11px 0', border:'2px solid var(--slate-200)', borderRadius:10, background:'white', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--slate-600)' }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={saving} style={{ flex:2, padding:'11px 0', border:'none', borderRadius:10, background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(16,185,129,.3)' }}>
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ProfAvaliacoes({ autoCreate } = {}) {
  const { user } = useAuth();
  const [avs, setAvs]           = useState([]);
  const [turmas, setTurmas]     = useState([]);
  const [questoesDisp, setQs]   = useState([]);
  const [disciplinas, setDiscs]  = useState([]);
  const [trilhas, setTrilhas]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [viewResultados, setViewRes] = useState(null);
  const [editAv, setEditAv] = useState(null);
  const [editQuestoes, setEditQ]    = useState(null);

  const load = async () => {
    try {
      const [avRes, tRes, qRes, trRes, dRes] = await Promise.all([
        api.get('/avaliacoes?professor_id='+user.id),
        api.get('/turmas?professor_id='+user.id),
        api.get('/questoes?professor_id='+user.id),
        api.get('/trilhas?professor_id='+user.id),
        api.get('/disciplinas'),
      ]);
      setDiscs(dRes.data.disciplinas || []);
      setAvs(avRes.data.avaliacoes || []);
      setTurmas(tRes.data.turmas || []);
      const trilhasMap = {};
      const trList = trRes.data.trilhas || [];
      trList.forEach(t=>{ trilhasMap[t.id]=t.nome; });
      setTrilhas(trList);
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

  const handleDelete = (id) => {
    confirmAlert('Excluir Avaliacao', 'Esta acao nao pode ser desfeita. Deseja excluir esta avaliacao?', async () => {
      try {
        await api.delete('/avaliacoes/'+id);
        setAvs(p=>p.filter(a=>a.id!==id));
        showToast('Avaliacao excluida com sucesso!', 'success');
      } catch(e) { showToast('Erro ao excluir avaliacao.', 'error'); }
    });
  };

  const handleUpdateAv = (updated) => {
    setAvs(p => p.map(a => a.id===updated.id ? updated : a));
  };
  const handleEditAv = (updated) => {
    handleUpdateAv(updated);
    setEditAv(null);
  };

  if (viewResultados) return <ResultadosView av={viewResultados} onBack={()=>setViewRes(null)} />;
  if (editQuestoes)   return <GerenciarQuestoes av={editQuestoes} questoesDisp={questoesDisp} trilhas={trilhas} disciplinas={disciplinas} onBack={()=>setEditQ(null)} onUpdate={up=>{ handleUpdateAv(up); setEditQ(up); }} />;

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
                        {av.disponivel_em&&<span>Abertura: {new Date(av.disponivel_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
                        {av.encerra_em&&<span>Encerra: {new Date(av.encerra_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,flexShrink:0,flexWrap:'wrap' }}>
                      <button className="btn-sm" style={{ background:'rgba(99,102,241,.1)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.3)' }} onClick={()=>setEditQ(av)}>Questoes</button>
                      <button className="btn-sm" style={{ background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe' }} onClick={()=>setEditAv(av)}>Editar</button>
                      <button className="btn-sm btn-view" onClick={()=>setViewRes(av)}>Resultados</button>
                      {av.status==='rascunho'&&<button className="btn-sm btn-approve" onClick={()=>handlePublicar(av.id)}>Publicar</button>}
                      <button className="btn-sm btn-danger" onClick={()=>handleDelete(av.id)}>Excluir</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCriar && <ModalCriar turmas={turmas} questoesDisp={questoesDisp} onClose={()=>setShowCriar(false)} onSalvar={nova=>setAvs(p=>[nova,...p])} />}
      {editAv && <EditAvaliacaoModal av={editAv} turmas={turmas} onClose={()=>setEditAv(null)} onSalvar={handleEditAv} />}
    </>
  );
}
// -- ResultadosView - Relatorio completo para professor --
function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:800;color:#1e3a5f;margin:16px 0 8px;padding-bottom:5px;border-bottom:2px solid #3b82f6">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:12px 0 6px">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin:4px 0 4px 16px;list-style:disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
}

function AlunoDetalhe({ av, alunoId, alunoNome, onBack }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    api.get('/avaliacoes/' + av.id + '/detalhe-aluno/' + alunoId)
      .then(function(r) { setData(r.data); })
      .catch(function() {})
      .finally(function() { setLoading(false); });
  }, [av.id, alunoId]);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>;
  if (!data) return <div className="card"><div style={{ color:'var(--coral)' }}>Dados nao encontrados.</div></div>;

  var t   = data.tentativa;
  var stats = t.estatisticas || {};
  var resps = t.respostas_corrigidas || t.respostas || [];
  var questoesComp = av.questoes_completas || [];
  var corretas = stats.corretas || 0;
  var total    = stats.total_questoes || resps.length;
  var taxa     = stats.taxa_acerto || 0;
  var dataHora = t.concluida_em ? new Date(t.concluida_em).toLocaleString('pt-BR') : '--';

  return (
    <div>
      <button onClick={onBack} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, marginBottom:'1.5rem' }}>
        &#8592; Voltar aos Resultados
      </button>

      {/* Header aluno */}
      <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', borderRadius:14, padding:'1.5rem', color:'white', marginBottom:'1.5rem' }}>
        <div style={{ fontSize:13, opacity:.6, marginBottom:4 }}>Relatorio Individual</div>
        <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:800, marginBottom:8 }}>{data.aluno && data.aluno.nome || alunoNome}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, fontSize:13 }}>
          <span>Avaliacao: {av.titulo}</span>
          <span>Data: {dataHora}</span>
          <span>Nota: <strong style={{ fontSize:18 }}>{t.nota != null ? t.nota.toFixed(1) : '--'}/10</strong></span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {[
          { l:'Questoes',  v:total,             i:'[?]' },
          { l:'Acertos',   v:corretas,           i:'[OK]', c:'#059669' },
          { l:'Erros',     v:total - corretas,   i:'[X]',  c:'#dc2626' },
          { l:'Taxa',      v:Math.round(taxa)+'%', i:'[%]' },
        ].map(function(s) {
          return (
            <div key={s.l} className="stat-card">
              <div className="stat-accent">{s.i}</div>
              <div className="stat-label">{s.l}</div>
              <div className="stat-value" style={{ color:s.c||'var(--navy)' }}>{s.v}</div>
            </div>
          );
        })}
      </div>

      {/* Detalhamento */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:'1rem' }}>Detalhamento por Questao</div>
        {resps.map(function(r, i) {
          var qc   = questoesComp.find(function(x) { return x.id === r.questao_id || x.questao_id === r.questao_id; });
          var q    = qc || {};
          var acertou = (r.score || 0) >= 0.8 || r.is_correct;
          return (
            <div key={r.questao_id || i} style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, background:acertou?'#f0fdf4':'#fef2f2', border:'1px solid '+(acertou?'#86efac':'#fca5a5') }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--slate-600)' }}>Questao {i+1}</span>
                <span style={{ fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:99, background:acertou?'#dcfce7':'#fee2e2', color:acertou?'#15803d':'#b91c1c' }}>
                  {acertou ? '&#10003; Correto' : '&#10007; Incorreto'}
                </span>
              </div>
              {q.enunciado && <div style={{ fontSize:13, color:'var(--slate-700)', marginBottom:6 }}>{q.enunciado}</div>}
              <div style={{ fontSize:12, color:'var(--slate-600)' }}>
                <strong>Resposta do aluno:</strong> {r.resposta_aluno !== undefined ? String(r.resposta_aluno) : '--'}
              </div>
              {!acertou && q.gabarito !== undefined && (
                <div style={{ fontSize:12, color:'#15803d', marginTop:3 }}>
                  <strong>Resposta correta:</strong> {String(q.gabarito)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feedback IA */}
      {t.feedback_geral && (
        <div className="card" style={{ borderLeft:'4px solid var(--sky)' }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:10 }}>Feedback Pedagogico (IA)</div>
          <div style={{ fontSize:13, lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: renderMd(t.feedback_geral) }} />
        </div>
      )}
    </div>
  );
}

function ResultadosView({ av, onBack }) {
  const [resultados, setResultados]   = useState([]);
  const [questStats, setQuestStats]   = useState([]);
  const [analiseIA, setAnaliseIA]     = useState(null);
  const [metricas, setMetricas]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadingIA, setLoadingIA]     = useState(false);
  const [aba, setAba]                 = useState('turma');
  const [alunoSel, setAlunoSel]       = useState(null);

  useEffect(function() {
    api.get('/avaliacoes/' + av.id + '/resultados')
      .then(function(r) {
        setResultados(r.data.resultados || []);
        setMetricas(r.data.estatisticas || {});
      })
      .catch(function(e) { console.error(e); })
      .finally(function() { setLoading(false); });
  }, [av.id]);

  var carregarAnalise = function() {
    if (analiseIA || loadingIA) return;
    setLoadingIA(true);
    api.get('/avaliacoes/' + av.id + '/analise-turma')
      .then(function(r) {
        setQuestStats(r.data.questoes_stats || []);
        setAnaliseIA(r.data.analise_ia || null);
      })
      .catch(function(e) { console.error(e); })
      .finally(function() { setLoadingIA(false); });
  };

  var handleAba = function(a) {
    setAba(a);
    if (a === 'ia' || a === 'questoes') carregarAnalise();
  };

  if (alunoSel) {
    return <AlunoDetalhe av={av} alunoId={alunoSel.aluno_id} alunoNome={alunoSel.nome} onBack={function(){ setAlunoSel(null); }} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>
          &#8592; Voltar
        </button>
        <div>
          <div className="page-title" style={{ marginBottom:0 }}>Resultados — {av.titulo}</div>
          <div className="page-sub">Modulo de analise pedagogica completo</div>
        </div>
      </div>

      {/* Stats cards */}
      {metricas && (
        <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
          {[
            { l:'Alunos',       v:metricas.total_alunos||0,      i:'[U]' },
            { l:'Media geral',  v:(metricas.media_geral||0).toFixed(1), i:'[M]' },
            { l:'Aprovados',    v:metricas.aprovados||0,          i:'[OK]' },
            { l:'Reprovados',   v:metricas.reprovados||0,         i:'[X]' },
          ].map(function(s) {
            return (
              <div key={s.l} className="stat-card">
                <div className="stat-accent">{s.i}</div>
                <div className="stat-label">{s.l}</div>
                <div className="stat-value">{s.v}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', background:'var(--slate-100)', borderRadius:10, padding:4 }}>
        {[
          { k:'turma',   l:'Turma',      sub:'Notas dos alunos' },
          { k:'questoes',l:'Por Questao', sub:'Analise por item' },
          { k:'ia',      l:'Analise IA',  sub:'BNCC + TRI + IA' },
        ].map(function(tab) {
          var active = aba === tab.k;
          return (
            <button key={tab.k} onClick={function(){ handleAba(tab.k); }}
              style={{ flex:1, padding:'10px 8px', border:'none', borderRadius:8, cursor:'pointer', textAlign:'center', transition:'all .15s',
                background: active ? 'white' : 'transparent',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,.1)' : 'none',
                color: active ? 'var(--navy)' : 'var(--slate-500)',
              }}>
              <div style={{ fontSize:13, fontWeight:active?700:500 }}>{tab.l}</div>
              <div style={{ fontSize:10, opacity:.7 }}>{tab.sub}</div>
            </button>
          );
        })}
      </div>

      {/* ABA: Turma */}
      {aba === 'turma' && (
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:'1rem' }}>
            Desempenho Individual — Clique para ver detalhes
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : resultados.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>Nenhuma tentativa concluida ainda.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'var(--slate-50)', borderBottom:'2px solid var(--slate-200)' }}>
                    {['#','Aluno','Melhor Nota','Status','Tentativas','Data'].map(function(h) {
                      return <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'var(--slate-600)', fontSize:12 }}>{h}</th>;
                    })}
                    <th style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'var(--slate-600)' }}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map(function(r, i) {
                    var aprovado = r.aprovado || r.melhor_nota >= (av.nota_minima||6);
                    var dataStr  = r.ultima_tentativa ? new Date(r.ultima_tentativa).toLocaleDateString('pt-BR') : '--';
                    var barW     = Math.round((r.melhor_nota||0) / 10 * 100);
                    return (
                      <tr key={r.aluno_id} style={{ borderBottom:'1px solid var(--slate-100)', background: i%2===0?'white':'var(--slate-50)' }}>
                        <td style={{ padding:'10px 12px', color:'var(--slate-400)', fontSize:12 }}>{i+1}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ fontWeight:600, color:'var(--navy)' }}>{r.nome}</div>
                          {r.email && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{r.email}</div>}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontWeight:800, fontSize:15, color:aprovado?'#15803d':'#b91c1c', minWidth:32 }}>
                              {(r.melhor_nota||0).toFixed(1)}
                            </span>
                            <div style={{ flex:1, height:6, background:'var(--slate-100)', borderRadius:99, overflow:'hidden', minWidth:60 }}>
                              <div style={{ height:'100%', width:barW+'%', background:aprovado?'linear-gradient(90deg,#10b981,#059669)':'linear-gradient(90deg,#f87171,#dc2626)', borderRadius:99, transition:'width .4s' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:aprovado?'#f0fdf4':'#fef2f2', color:aprovado?'#15803d':'#b91c1c', border:'1px solid '+(aprovado?'#86efac':'#fca5a5') }}>
                            {aprovado ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px', color:'var(--slate-500)', fontSize:12 }}>{r.total_tentativas||1}x</td>
                        <td style={{ padding:'10px 12px', color:'var(--slate-400)', fontSize:12 }}>{dataStr}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <button onClick={function(){ setAlunoSel(r); }}
                            style={{ padding:'5px 12px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:7, color:'#1d4ed8', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                            Ver detalhe
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: Por Questao */}
      {aba === 'questoes' && (
        <div className="card">
          <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)', marginBottom:'1rem' }}>
            Analise por Questao
          </div>
          {loadingIA ? (
            <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }}/></div>
          ) : questStats.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>Sem dados suficientes para analise.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {questStats.map(function(q, i) {
                var acertou = q.taxa_acerto >= 70;
                var critica = q.taxa_acerto < 50;
                var barColor = critica ? 'linear-gradient(90deg,#f87171,#dc2626)' : acertou ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#fbbf24,#f59e0b)';
                return (
                  <div key={q.id} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid '+(critica?'#fca5a5':acertou?'#86efac':'#fde68a'), background:critica?'#fef2f2':acertou?'#f0fdf4':'#fffbeb' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, alignItems:'flex-start', gap:8 }}>
                      <span style={{ fontSize:12, color:'var(--slate-700)', flex:1 }}>
                        <strong>Q{i+1}:</strong> {(q.enunciado||'').slice(0,100)}{q.enunciado && q.enunciado.length > 100 ? '...' : ''}
                      </span>
                      <span style={{ fontSize:13, fontWeight:800, color:critica?'#dc2626':acertou?'#059669':'#d97706', flexShrink:0 }}>
                        {q.taxa_acerto}%
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:8, background:'var(--slate-100)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:q.taxa_acerto+'%', background:barColor, borderRadius:99, transition:'width .4s' }} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--slate-500)', flexShrink:0 }}>
                        {q.corretas}/{q.total} acertos
                      </span>
                    </div>
                    {critica && (
                      <div style={{ fontSize:11, color:'#b91c1c', marginTop:4, fontWeight:600 }}>
                        [!] Questao critica — requer revisao do conteudo
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA: Analise IA */}
      {aba === 'ia' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>Analise Pedagogica com IA</div>
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe', fontWeight:600 }}>
              BNCC + TRI
            </span>
          </div>
          {loadingIA ? (
            <div style={{ textAlign:'center', padding:'3rem' }}>
              <div className="spinner" style={{ margin:'0 auto 12px' }} />
              <div style={{ fontSize:13, color:'var(--slate-500)' }}>Gerando analise pedagogica com IA...</div>
            </div>
          ) : !analiseIA ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>[AI]</div>
              <div style={{ marginBottom:12 }}>Clique para gerar a analise da turma.</div>
              <button onClick={carregarAnalise} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6d28d9,#7c3aed)', color:'white', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 12px rgba(109,40,217,.35)' }}>
                Gerar Analise com IA
              </button>
            </div>
          ) : (
            <div>
              <div style={{ padding:'12px 16px', background:'#f5f3ff', borderRadius:10, border:'1px solid #ddd6fe', marginBottom:'1rem', fontSize:12, color:'#6d28d9' }}>
                Analise gerada automaticamente com base nos dados da avaliacao, BNCC e principios de TRI.
              </div>
              <div style={{ fontSize:13, lineHeight:1.9 }} dangerouslySetInnerHTML={{ __html: renderMd(analiseIA) }} />
              <button onClick={function(){ setAnaliseIA(null); setQuestStats([]); carregarAnalise(); }}
                style={{ marginTop:'1rem', padding:'7px 16px', background:'var(--slate-100)', border:'1px solid var(--slate-200)', borderRadius:8, cursor:'pointer', fontSize:12, color:'var(--slate-600)' }}>
                Regenerar analise
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function EditAvaliacaoModal({ av, turmas, onClose, onSalvar }) {
  const [form, setForm] = useState({
    titulo:                av.titulo || '',
    descricao:             av.descricao || '',
    tempo_limite:          av.tempo_limite || 60,
    tentativas_permitidas: av.tentativas_permitidas || 1,
    nota_minima:           av.nota_minima || 6,
    disponivel_em:         av.disponivel_em ? av.disponivel_em.slice(0,16) : '',
    encerra_em:            av.encerra_em    ? av.encerra_em.slice(0,16)    : '',
    turma_id:              av.turma_id || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const salvar = async () => {
    if (!form.titulo.trim()) { alert('Titulo obrigatorio.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tempo_limite:          Number(form.tempo_limite),
        tentativas_permitidas: Number(form.tentativas_permitidas),
        nota_minima:           Number(form.nota_minima),
        disponivel_em:         form.disponivel_em ? new Date(form.disponivel_em).toISOString() : null,
        encerra_em:            form.encerra_em    ? new Date(form.encerra_em).toISOString()    : null,
        turma_id:              form.turma_id ? Number(form.turma_id) : null,
      };
      const r = await api.put('/avaliacoes/' + av.id, payload);
      onSalvar(r.data.avaliacao || { ...av, ...payload });
      showToast('Avaliacao atualizada!', 'success');
    } catch(e) {
      showToast('Erro: ' + (e.response?.data?.error || e.message), 'error');
    }
    setSaving(false);
  };

  const inp = (label, k, type, extra) => (
    <div className="field">
      <label>{label}</label>
      <input type={type||'text'} value={form[k]} onChange={set(k)} {...(extra||{})}
        style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor='var(--emerald)'}
        onBlur={e=>e.target.style.borderColor='var(--slate-200)'}
      />
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(2px)' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'auto', boxShadow:'0 25px 60px rgba(0,0,0,.3)' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', padding:'1rem 1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
          <span style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700, color:'white' }}>Editar Avaliacao</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'white', fontSize:20, cursor:'pointer', opacity:.7 }}>&#x2715;</button>
        </div>

        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {/* Titulo */}
          <div className="field">
            <label>Titulo *</label>
            <input value={form.titulo} onChange={set('titulo')} placeholder="Nome da avaliacao"
              style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
          </div>

          {/* Descricao */}
          <div className="field">
            <label>Descricao</label>
            <textarea value={form.descricao} onChange={set('descricao')} rows={3}
              style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'var(--font-body)' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
          </div>

          {/* Grid de numericos */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {inp('Tempo (min)', 'tempo_limite', 'number', { min:1, max:300 })}
            {inp('Tentativas', 'tentativas_permitidas', 'number', { min:1, max:10 })}
            {inp('Nota minima', 'nota_minima', 'number', { min:0, max:10, step:0.5 })}
          </div>

          {/* Datas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field">
              <label>Abertura</label>
              <input type="datetime-local" value={form.disponivel_em} onChange={set('disponivel_em')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
            </div>
            <div className="field">
              <label>Encerramento</label>
              <input type="datetime-local" value={form.encerra_em} onChange={set('encerra_em')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'}/>
            </div>
          </div>

          {/* Turma */}
          {turmas.length > 0 && (
            <div className="field">
              <label>Turma</label>
              <select value={form.turma_id} onChange={set('turma_id')}
                style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', width:'100%', boxSizing:'border-box' }}>
                <option value="">Sem turma especifica</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          )}

          {/* Botoes */}
          <div style={{ display:'flex', gap:10, marginTop:'0.5rem' }}>
            <button onClick={onClose} style={{ flex:1, padding:'11px 0', border:'2px solid var(--slate-200)', borderRadius:10, background:'white', cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--slate-600)' }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={saving} style={{ flex:2, padding:'11px 0', border:'none', borderRadius:10, background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(16,185,129,.3)' }}>
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ProfAvaliacoes({ autoCreate } = {}) {
  const { user } = useAuth();
  const [avs, setAvs]           = useState([]);
  const [turmas, setTurmas]     = useState([]);
  const [questoesDisp, setQs]   = useState([]);
  const [disciplinas, setDiscs]  = useState([]);
  const [trilhas, setTrilhas]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [viewResultados, setViewRes] = useState(null);
  const [editAv, setEditAv] = useState(null);
  const [editQuestoes, setEditQ]    = useState(null);

  const load = async () => {
    try {
      const [avRes, tRes, qRes, trRes, dRes] = await Promise.all([
        api.get('/avaliacoes?professor_id='+user.id),
        api.get('/turmas?professor_id='+user.id),
        api.get('/questoes?professor_id='+user.id),
        api.get('/trilhas?professor_id='+user.id),
        api.get('/disciplinas'),
      ]);
      setDiscs(dRes.data.disciplinas || []);
      setAvs(avRes.data.avaliacoes || []);
      setTurmas(tRes.data.turmas || []);
      const trilhasMap = {};
      const trList = trRes.data.trilhas || [];
      trList.forEach(t=>{ trilhasMap[t.id]=t.nome; });
      setTrilhas(trList);
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

  const handleDelete = (id) => {
    confirmAlert('Excluir Avaliacao', 'Esta acao nao pode ser desfeita. Deseja excluir esta avaliacao?', async () => {
      try {
        await api.delete('/avaliacoes/'+id);
        setAvs(p=>p.filter(a=>a.id!==id));
        showToast('Avaliacao excluida com sucesso!', 'success');
      } catch(e) { showToast('Erro ao excluir avaliacao.', 'error'); }
    });
  };

  const handleUpdateAv = (updated) => {
    setAvs(p => p.map(a => a.id===updated.id ? updated : a));
  };
  const handleEditAv = (updated) => {
    handleUpdateAv(updated);
    setEditAv(null);
  };

  if (viewResultados) return <ResultadosView av={viewResultados} onBack={()=>setViewRes(null)} />;
  if (editQuestoes)   return <GerenciarQuestoes av={editQuestoes} questoesDisp={questoesDisp} trilhas={trilhas} disciplinas={disciplinas} onBack={()=>setEditQ(null)} onUpdate={up=>{ handleUpdateAv(up); setEditQ(up); }} />;

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
                        {av.disponivel_em&&<span>Abertura: {new Date(av.disponivel_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
                        {av.encerra_em&&<span>Encerra: {new Date(av.encerra_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,flexShrink:0,flexWrap:'wrap' }}>
                      <button className="btn-sm" style={{ background:'rgba(99,102,241,.1)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.3)' }} onClick={()=>setEditQ(av)}>Questoes</button>
                      <button className="btn-sm" style={{ background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe' }} onClick={()=>setEditAv(av)}>Editar</button>
                      <button className="btn-sm btn-view" onClick={()=>setViewRes(av)}>Resultados</button>
                      {av.status==='rascunho'&&<button className="btn-sm btn-approve" onClick={()=>handlePublicar(av.id)}>Publicar</button>}
                      <button className="btn-sm btn-danger" onClick={()=>handleDelete(av.id)}>Excluir</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCriar && <ModalCriar turmas={turmas} questoesDisp={questoesDisp} onClose={()=>setShowCriar(false)} onSalvar={nova=>setAvs(p=>[nova,...p])} />}
      {editAv && <EditAvaliacaoModal av={editAv} turmas={turmas} onClose={()=>setEditAv(null)} onSalvar={handleEditAv} />}
    </>
  );
}

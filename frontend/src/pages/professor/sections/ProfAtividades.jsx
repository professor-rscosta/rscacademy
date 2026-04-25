/**
 * ProfAtividades — Criar e gerenciar atividades com entrega de arquivo
 * Estilo Google Sala de Aula: instruções ricas + correção manual
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import { EmptyState, Avatar } from '../../../components/ui';

const STATUS_CFG = {
  rascunho:  { bg:'var(--slate-100)', cor:'var(--slate-600)', label:'Rascunho' },
  publicada: { bg:'#f0fdf4', cor:'#15803d', label:'✅ Publicada' },
};

// ── Editor de materiais ───────────────────────────────────────
function EditorMateriais({ materiais, onChange, disabled }) {
  const fileRef = useRef(null);
  const add = (item) => onChange([...materiais, item]);
  const remove = (i) => onChange(materiais.filter((_,j) => j!==i));

  const addArquivo = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10*1024*1024) { alert('Máx. 10MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => add({ tipo:'arquivo', nome:file.name, mimeType:file.type, base64:ev.target.result, tamanho:file.size });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addImagem = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Selecione uma imagem.'); return; }
    if (file.size > 8*1024*1024) { alert('Máx. 8MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => add({ tipo:'imagem', nome:file.name, base64:ev.target.result });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [linkUrl, setLinkUrl]   = useState('');
  const [linkTit, setLinkTit]   = useState('');
  const [ytUrl, setYtUrl]       = useState('');
  const [showLink, setShowLink] = useState(false);
  const [showYT, setShowYT]     = useState(false);
  const [showText, setShowText] = useState(false);
  const [txtVal, setTxtVal]     = useState('');

  const youtubeId = (url) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return m ? m[1] : null;
  };

  return (
    <div>
      {/* Lista de materiais */}
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
        {materiais.map((m, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--slate-50)', borderRadius:10, border:'1px solid var(--slate-200)' }}>
            <span style={{ fontSize:20, flexShrink:0 }}>
              {m.tipo==='imagem'?'🖼️': m.tipo==='youtube'?'▶️': m.tipo==='link'?'🔗': m.tipo==='arquivo'?'📎': '📝'}
            </span>
            <div style={{ flex:1, minWidth:0 }}>
              {m.tipo==='imagem' && <img src={m.base64} alt="" style={{ maxHeight:80, maxWidth:200, borderRadius:6, display:'block', objectFit:'cover' }} />}
              {m.tipo==='youtube' && (
                <iframe width="280" height="157" src={'https://www.youtube.com/embed/'+youtubeId(m.url)}
                  frameBorder="0" allowFullScreen style={{ borderRadius:8 }} />
              )}
              {m.tipo==='link' && <a href={m.url} target="_blank" rel="noreferrer" style={{ color:'var(--sky)', fontSize:13, fontWeight:500 }}>{m.titulo||m.url}</a>}
              {m.tipo==='arquivo' && <div style={{ fontSize:13, fontWeight:500, color:'var(--navy)' }}>📎 {m.nome} <span style={{ fontSize:11, color:'var(--slate-400)' }}>({m.tamanho ? Math.round(m.tamanho/1024)+'KB' : ''})</span></div>}
              {m.tipo==='texto' && <div style={{ fontSize:13, color:'var(--slate-700)', fontStyle:'italic' }}>"{m.conteudo?.slice(0,80)}{m.conteudo?.length>80?'...':''}"</div>}
            </div>
            {!disabled && (
              <button onClick={() => remove(i)} style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', cursor:'pointer', padding:'3px 9px', fontSize:12, flexShrink:0 }}>✕</button>
            )}
          </div>
        ))}
        {materiais.length === 0 && (
          <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--slate-300)', fontSize:13, border:'2px dashed var(--slate-200)', borderRadius:10 }}>
            Nenhum material adicionado. Use os botões abaixo.
          </div>
        )}
      </div>

      {!disabled && (
        <>
          {/* Botões de adicionar */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {[
              ['🖼️ Imagem', () => { document.getElementById('img-input-mat').click(); }],
              ['📎 Arquivo', () => { document.getElementById('arq-input-mat').click(); }],
              ['▶️ YouTube', () => { setShowYT(s=>!s); setShowLink(false); setShowText(false); }],
              ['🔗 Link', () => { setShowLink(s=>!s); setShowYT(false); setShowText(false); }],
              ['📝 Texto', () => { setShowText(s=>!s); setShowYT(false); setShowLink(false); }],
            ].map(([l, fn]) => (
              <button key={l} onClick={fn} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:7, background:'white', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--slate-600)', transition:'all .15s' }}
                onMouseEnter={e => { e.target.style.borderColor='var(--emerald)'; e.target.style.color='var(--emerald-dark)'; }}
                onMouseLeave={e => { e.target.style.borderColor='var(--slate-200)'; e.target.style.color='var(--slate-600)'; }}>
                {l}
              </button>
            ))}
          </div>

          <input id="img-input-mat" type="file" accept="image/*" style={{ display:'none' }} onChange={addImagem} />
          <input id="arq-input-mat" type="file" style={{ display:'none' }} onChange={addArquivo} />

          {showYT && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fff7ed', borderRadius:8, border:'1px solid #fed7aa', marginBottom:6 }}>
              <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                style={{ flex:1, padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:13, outline:'none' }} />
              <button onClick={() => { if(youtubeId(ytUrl)){ add({tipo:'youtube',url:ytUrl}); setYtUrl(''); setShowYT(false); } else alert('URL inválida.'); }}
                style={{ padding:'7px 14px', background:'#f97316', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}>Adicionar</button>
              <button onClick={() => setShowYT(false)} style={{ padding:'7px 10px', border:'none', background:'transparent', cursor:'pointer', color:'var(--slate-400)' }}>✕</button>
            </div>
          )}
          {showLink && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'10px 14px', background:'#f0f9ff', borderRadius:8, border:'1px solid #bae6fd', marginBottom:6 }}>
              <input value={linkTit} onChange={e=>setLinkTit(e.target.value)} placeholder="Título do link (opcional)"
                style={{ flex:'1 1 150px', padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:13, outline:'none' }} />
              <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..."
                style={{ flex:'2 1 200px', padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontSize:13, outline:'none' }} />
              <button onClick={() => { if(linkUrl){ add({tipo:'link',url:linkUrl,titulo:linkTit||linkUrl}); setLinkUrl(''); setLinkTit(''); setShowLink(false); } else alert('URL obrigatória.'); }}
                style={{ padding:'7px 14px', background:'var(--sky)', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}>Adicionar</button>
              <button onClick={() => setShowLink(false)} style={{ padding:'7px 10px', border:'none', background:'transparent', cursor:'pointer', color:'var(--slate-400)' }}>✕</button>
            </div>
          )}
          {showText && (
            <div style={{ padding:'10px 14px', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)', marginBottom:6 }}>
              <textarea rows={3} value={txtVal} onChange={e=>setTxtVal(e.target.value)} placeholder="Digite um bloco de texto complementar..."
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:7, fontFamily:'var(--font-body)', fontSize:13, resize:'vertical', outline:'none', boxSizing:'border-box' }} />
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <button onClick={() => { if(txtVal.trim()){ add({tipo:'texto',conteudo:txtVal}); setTxtVal(''); setShowText(false); } }}
                  style={{ padding:'6px 14px', background:'var(--navy)', color:'white', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}>Adicionar</button>
                <button onClick={() => setShowText(false)} style={{ padding:'6px 10px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, color:'var(--slate-400)' }}>Cancelar</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Modal criar/editar atividade ──────────────────────────────
function ModalAtividade({ turmas, disciplinas, ativEdit, onClose, onSalvar }) {
  const [form, setForm] = useState({
    titulo:      ativEdit?.titulo      || '',
    instrucoes:  ativEdit?.instrucoes  || '',
    turma_id:    ativEdit?.turma_id    || turmas[0]?.id || '',
    disciplina_id: ativEdit?.disciplina_id || '',
    pontos:      ativEdit?.pontos      || 10,
    data_entrega:  ativEdit?.data_entrega?.slice(0,16) || '',
    materiais:   ativEdit?.materiais   || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const salvar = async (publicar=false) => {
    if (!form.titulo.trim()) return setError('Título obrigatório.');
    if (!form.turma_id)      return setError('Selecione uma turma.');
    setSaving(true); setError('');
    try {
      const payload = { ...form, turma_id:Number(form.turma_id), disciplina_id:form.disciplina_id?Number(form.disciplina_id):null, pontos:Number(form.pontos)||10, data_entrega:form.data_entrega?new Date(form.data_entrega).toISOString():null };
      let atividade;
      if (ativEdit) {
        const r = await api.put('/atividades/'+ativEdit.id, payload);
        atividade = r.data.atividade;
      } else {
        const r = await api.post('/atividades', payload);
        atividade = r.data.atividade;
      }
      if (publicar) { const r2 = await api.patch('/atividades/'+atividade.id+'/publicar'); atividade = r2.data.atividade; }
      onSalvar(atividade);
      onClose();
    } catch(e){ setError(e.response?.data?.error||'Erro ao salvar.'); }
    setSaving(false);
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,27,53,.65)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'1rem',overflowY:'auto',backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white',borderRadius:18,width:'100%',maxWidth:740,margin:'1rem auto',boxShadow:'0 12px 48px rgba(15,27,53,.3)',overflow:'hidden' }}>
        <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',padding:'1.25rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--font-head)',fontSize:18,fontWeight:700,color:'white' }}>
            {ativEdit ? '✏️ Editar Atividade' : '📋 Nova Atividade'}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.12)',border:'none',color:'white',width:32,height:32,borderRadius:'50%',cursor:'pointer',fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:'1.5rem',maxHeight:'82vh',overflowY:'auto' }}>
          {error && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>{error}</div>}

          <div className="field"><label>Título da Atividade <span style={{color:'var(--coral)'}}>*</span></label>
            <input value={form.titulo} onChange={set('titulo')} placeholder="ex: Trabalho sobre Recursão — Entrega Final" />
          </div>

          <div className="field">
            <label>Instruções / Enunciado</label>
            <textarea rows={4} value={form.instrucoes} onChange={set('instrucoes')} placeholder="Descreva o que o aluno deve fazer, critérios de avaliação, referências..."
              style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:13,resize:'vertical',outline:'none' }}
              onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div className="field">
              <label>Turma <span style={{color:'var(--coral)'}}>*</span></label>
              <select value={form.turma_id} onChange={set('turma_id')} style={{ width:'100%',padding:'10px 14px',border:'2px solid '+(form.turma_id?'var(--emerald)':'var(--coral)'),borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,outline:'none' }}>
                <option value="">-- Selecione a turma --</option>
                {turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Disciplina (opcional)</label>
              <select value={form.disciplina_id} onChange={set('disciplina_id')} style={{ width:'100%',padding:'10px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontFamily:'var(--font-body)',fontSize:14,outline:'none' }}>
                <option value="">Sem disciplina</option>
                {disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pontuação máxima</label>
              <input type="number" min={1} max={100} value={form.pontos} onChange={set('pontos')} />
            </div>
            <div className="field">
              <label>📅 Prazo de entrega</label>
              <input type="datetime-local" value={form.data_entrega} onChange={set('data_entrega')} />
            </div>
          </div>

          {/* Editor de materiais */}
          <div style={{ background:'var(--slate-50)',borderRadius:10,padding:'1rem',border:'1px solid var(--slate-200)',marginBottom:'1rem' }}>
            <div style={{ fontFamily:'var(--font-head)',fontSize:13,fontWeight:600,color:'var(--navy)',marginBottom:'0.75rem' }}>
              📎 Materiais de Apoio
              <span style={{ fontSize:11,fontWeight:400,color:'var(--slate-400)',marginLeft:6 }}>imagens, vídeos, links, arquivos</span>
            </div>
            <EditorMateriais materiais={form.materiais} onChange={mats => setForm(f=>({...f,materiais:mats}))} />
          </div>

          <div style={{ display:'flex',gap:8 }}>
            <button onClick={()=>salvar(false)} disabled={saving} style={{ flex:1,padding:'12px',background:'var(--slate-100)',color:'var(--slate-700)',border:'1.5px solid var(--slate-300)',borderRadius:8,fontWeight:600,fontSize:14,cursor:'pointer' }}>
              💾 Salvar Rascunho
            </button>
            <button onClick={()=>salvar(true)} disabled={saving} style={{ flex:1,padding:'12px',background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer',boxShadow:'0 4px 14px rgba(16,185,129,.35)' }}>
              {saving?'Salvando...':'🚀 Publicar para Alunos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View de entregas de uma atividade ─────────────────────────
function EntregasView({ ativ, onBack }) {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLd]        = useState(true);
  const [corrigindo, setCor]    = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [alert, setAlert]       = useState(null);

  useEffect(() => {
    api.get('/atividades/'+ativ.id+'/entregas')
      .then(r => setEntregas(r.data.entregas||[]))
      .catch(console.error).finally(()=>setLd(false));
  }, [ativ.id]);

  const salvarNota = async () => {
    if (!corrigindo || corrigindo.nota==='' ) return;
    setSalvando(true);
    try {
      await api.patch('/atividades/entrega/'+corrigindo.entrega_id+'/corrigir', { nota:Number(corrigindo.nota), feedback:corrigindo.feedback });
      setEntregas(prev => prev.map(e => e.id===corrigindo.entrega_id ? { ...e, nota:Number(corrigindo.nota), feedback_prof:corrigindo.feedback, status:'devolvida' } : e));
      setCor(null);
      setAlert({ type:'success', msg:'✅ Nota salva com sucesso!' });
      setTimeout(()=>setAlert(null), 3000);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro.' }); }
    setSalvando(false);
  };

  const pendentes = entregas.filter(e => e.status==='entregue' && !e.nota).length;

  return (
    <>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:'1.5rem' }}>
        <button onClick={onBack} style={{ padding:'6px 14px',border:'1.5px solid var(--slate-200)',borderRadius:8,background:'white',cursor:'pointer',fontSize:13 }}>← Voltar</button>
        <div>
          <div className="page-title" style={{ marginBottom:0 }}>Entregas — {ativ.titulo}</div>
          <div className="page-sub">{entregas.length} entrega(s) · {pendentes} pendente(s) de correção · {ativ.pontos} pts</div>
        </div>
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}
      {pendentes>0 && <div style={{ background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:8,padding:'10px 14px',marginBottom:'1rem',fontSize:13,color:'#92400e' }}>⏳ <strong>{pendentes} entrega(s)</strong> aguardando sua correção.</div>}

      {loading ? (
        <div style={{ textAlign:'center',padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : entregas.length===0 ? (
        <div className="card"><EmptyState icon="📤" title="Nenhuma entrega ainda" sub="Os alunos ainda não enviaram arquivos para esta atividade." /></div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
          {(entregas||[]).filter(Boolean).map(e => (
            <div key={e.id} style={{ background:'white',border:'1px solid '+(e.status==='entregue'&&!e.nota?'#fcd34d':'var(--slate-200)'),borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow)' }}>
              {/* Header */}
              <div style={{ padding:'12px 16px',background:e.nota?'#f0fdf4':e.status==='entregue'?'#fffbeb':'var(--slate-50)',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--slate-100)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <Avatar name={e.aluno?.nome} size={36} />
                  <div>
                    <div style={{ fontWeight:600,fontSize:13,color:'var(--navy)' }}>{e.aluno?.nome}</div>
                    <div style={{ fontSize:11,color:'var(--slate-400)' }}>{e.aluno?.email} · {e.entregue_em?new Date(e.entregue_em).toLocaleString('pt-BR'):'—'}</div>
                  </div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:600,background:e.nota?'#f0fdf4':e.status==='entregue'?'#fffbeb':'var(--slate-100)',color:e.nota?'#15803d':e.status==='entregue'?'#92400e':'var(--slate-500)' }}>
                    {e.nota?'✅ Corrigida':e.status==='entregue'?'⏳ Pendente':'📝 Rascunho'}
                  </span>
                  {e.nota!==null && e.nota!==undefined && (
                    <span style={{ fontFamily:'var(--font-head)',fontSize:22,fontWeight:700,color:'var(--emerald-dark)' }}>{e.nota}/{ativ.pontos}</span>
                  )}
                </div>
              </div>

              {/* Comentário do aluno */}
              {e.comentario && (
                <div style={{ padding:'10px 16px',borderBottom:'1px solid var(--slate-100)',background:'var(--slate-50)' }}>
                  <span style={{ fontSize:11,fontWeight:600,color:'var(--slate-500)' }}>💬 Comentário do aluno: </span>
                  <span style={{ fontSize:13,color:'var(--slate-700)',fontStyle:'italic' }}>"{e.comentario}"</span>
                </div>
              )}

              {/* Arquivos enviados */}
              <div style={{ padding:'12px 16px',borderBottom:'1px solid var(--slate-100)' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--slate-500)',marginBottom:8 }}>📎 ARQUIVOS ENVIADOS ({(e.arquivos||[]).length})</div>
                {(e.arquivos||[]).length===0 ? (
                  <div style={{ fontSize:12,color:'var(--slate-400)',fontStyle:'italic' }}>Sem arquivos anexados.</div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {(e.arquivos||[]).map((arq,i) => {
                      const isImg = arq.tipo?.startsWith('image/') || arq.mimeType?.startsWith('image/');
                      const nome  = arq.nome || 'arquivo';
                      const b64   = arq.base64;
                      return (
                        <div key={i}>
                          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--slate-50)',borderRadius:8,border:'1px solid var(--slate-200)' }}>
                            <span style={{ fontSize:20 }}>{isImg?'🖼️':arq.mimeType?.includes('pdf')?'📄':'📎'}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12,fontWeight:600,color:'var(--navy)' }}>{nome}</div>
                              {arq.tamanho && <div style={{ fontSize:10,color:'var(--slate-400)' }}>{Math.round(arq.tamanho/1024)}KB</div>}
                            </div>
                            {b64 && <a href={b64} download={nome} style={{ padding:'4px 12px',background:'var(--navy)',color:'white',borderRadius:6,fontSize:11,fontWeight:600,textDecoration:'none' }}>⬇️ Baixar</a>}
                          </div>
                          {isImg && b64 && <img src={b64} alt={nome} style={{ maxWidth:'100%',maxHeight:250,objectFit:'contain',borderRadius:8,marginTop:6,background:'var(--slate-50)',display:'block' }} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Feedback do prof */}
              {e.feedback_prof && (
                <div style={{ padding:'10px 16px',borderBottom:'1px solid var(--slate-100)',background:'#f0fdf4' }}>
                  <span style={{ fontSize:11,fontWeight:600,color:'#15803d' }}>💬 Seu feedback: </span>
                  <span style={{ fontSize:12,color:'#15803d' }}>{e.feedback_prof}</span>
                </div>
              )}

              {/* Corrigir */}
              <div style={{ padding:'12px 16px' }}>
                {corrigindo?.entrega_id===e.id ? (
                  <div style={{ background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'12px 14px' }}>
                    <div style={{ fontWeight:600,fontSize:12,color:'var(--navy)',marginBottom:10 }}>✏️ Atribuir Nota</div>
                    <div style={{ display:'flex',gap:12,alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:11,color:'var(--slate-500)',marginBottom:4 }}>Nota (0–{ativ.pontos})</div>
                        <input type="number" min={0} max={ativ.pontos} step={0.5} value={corrigindo.nota}
                          onChange={e2=>setCor(c=>({...c,nota:e2.target.value}))}
                          style={{ width:80,padding:'8px 12px',border:'2px solid var(--emerald)',borderRadius:8,fontSize:16,fontWeight:700,textAlign:'center',outline:'none' }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11,color:'var(--slate-500)',marginBottom:4 }}>Feedback para o aluno</div>
                        <textarea rows={2} value={corrigindo.feedback} onChange={e2=>setCor(c=>({...c,feedback:e2.target.value}))}
                          placeholder="Ótimo trabalho! Atenção para..."
                          style={{ width:'100%',padding:'8px 12px',border:'1.5px solid var(--slate-200)',borderRadius:8,fontSize:12,resize:'none',outline:'none',fontFamily:'var(--font-body)' }} />
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:8,marginTop:10 }}>
                      <button onClick={salvarNota} disabled={salvando||corrigindo.nota===''} style={{ padding:'8px 20px',background:'var(--emerald)',color:'white',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer' }}>
                        {salvando?'...':'💾 Salvar Nota'}
                      </button>
                      <button onClick={()=>setCor(null)} style={{ padding:'8px 14px',border:'1px solid var(--slate-200)',borderRadius:8,background:'white',cursor:'pointer',fontSize:12 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setCor({ entrega_id:e.id, nota:e.nota!==null?e.nota:'', feedback:e.feedback_prof||'' })}
                    style={{ padding:'7px 18px',background:e.nota!==null?'var(--slate-100)':'var(--sky)',color:e.nota!==null?'var(--slate-700)':'white',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer' }}>
                    {e.nota!==null?'✏️ Rever Nota':'✏️ Corrigir Entrega'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function ProfAtividades({ autoCreate } = {}) {
  const { user }           = useAuth();
  const [atividades, setAt] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [discs, setDiscs]   = useState([]);
  const [loading, setLd]    = useState(true);
  const [showModal, setModal] = useState(false);
  const [editItem, setEdit]   = useState(null);
  const [viewEntregas, setVE] = useState(null);

  const load = async () => {
    try {
      const [aRes, tRes, dRes] = await Promise.all([
        api.get('/atividades?professor_id='+user.id),
        api.get('/turmas?professor_id='+user.id),
        api.get('/disciplinas?professor_id='+user.id),
      ]);
      setAt(aRes.data.atividades||[]);
      setTurmas(tRes.data.turmas||[]);
      setDiscs(dRes.data.disciplinas||[]);
    } catch(e){ console.error(e); }
    setLd(false);
  };

  useEffect(()=>{ load(); },[]);

  useEffect(() => { if (autoCreate) setModal(true); }, [autoCreate]);

  const handlePublicar = async (id) => {
    try { await api.patch('/atividades/'+id+'/publicar'); setAt(p=>p.map(a=>a.id===id?{...a,status:'publicada'}:a)); }
    catch(e){ alert(e.response?.data?.error||'Erro.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir atividade?')) return;
    await api.delete('/atividades/'+id);
    setAt(p=>p.filter(a=>a.id!==id));
  };

  const onSalvar = (nova) => {
    setAt(prev => {
      const idx = prev.findIndex(a=>a.id===nova.id);
      if (idx>=0) { const n=[...prev]; n[idx]=nova; return n; }
      return [nova,...prev];
    });
  };

  if (viewEntregas) return <EntregasView ativ={viewEntregas} onBack={()=>setVE(null)} />;

  const totalPend = atividades.reduce((s,a)=>s+(a.entregas_pendentes||0),0);

  return (
    <>
      <div className="page-header">
        <div className="page-title">📋 Atividades</div>
        <div className="page-sub">Crie tarefas com materiais ricos e corrija as entregas dos alunos</div>
      </div>

      {totalPend>0 && (
        <div style={{ background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:10,padding:'10px 16px',marginBottom:'1rem',fontSize:13,color:'#92400e',display:'flex',alignItems:'center',gap:8 }}>
          ⏳ <strong>{totalPend} entrega(s)</strong> aguardando sua correção em {atividades.filter(a=>a.entregas_pendentes>0).length} atividade(s).
        </div>
      )}

      <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'1rem' }}>
        <button className="btn-create" onClick={()=>{setEdit(null);setModal(true);}}>+ Nova Atividade</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center',padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : atividades.length===0 ? (
        <div className="card"><EmptyState icon="📋" title="Nenhuma atividade criada" sub="Crie sua primeira atividade acima" /></div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'0.875rem' }}>
          {(atividades||[]).filter(Boolean).map(a => {
            const cfg = STATUS_CFG[a.status]||STATUS_CFG.rascunho;
            const vencida = a.data_entrega && new Date(a.data_entrega)<new Date() && a.status==='publicada';
            return (
              <div key={a.id} style={{ background:'white',border:'1.5px solid var(--slate-200)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow)' }}>
                <div style={{ height:4, background: a.status==='publicada'?'linear-gradient(90deg,var(--emerald),#34d399)':'var(--slate-200)' }} />
                <div style={{ padding:'1rem 1.25rem' }}>
                  <div style={{ display:'flex',alignItems:'flex-start',gap:14 }}>
                    <div style={{ width:46,height:46,borderRadius:12,background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }}>📋</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-head)',fontSize:15,fontWeight:600,color:'var(--navy)' }}>{a.titulo}</span>
                        <span style={{ padding:'2px 9px',borderRadius:50,fontSize:11,fontWeight:600,background:cfg.bg,color:cfg.cor }}>{cfg.label}</span>
                        {vencida && <span style={{ padding:'2px 9px',borderRadius:50,fontSize:11,fontWeight:600,background:'#fef2f2',color:'#b91c1c' }}>⏰ Prazo encerrado</span>}
                        {a.entregas_pendentes>0 && <span style={{ padding:'2px 9px',borderRadius:50,fontSize:11,fontWeight:700,background:'#fffbeb',color:'#92400e',border:'1px solid #fcd34d' }}>⏳ {a.entregas_pendentes} pendente(s)</span>}
                      </div>
                      {a.instrucoes && <div style={{ fontSize:12,color:'var(--slate-500)',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.instrucoes.slice(0,100)}{a.instrucoes.length>100?'...':''}</div>}
                      <div style={{ display:'flex',gap:10,fontSize:11,color:'var(--slate-400)',flexWrap:'wrap' }}>
                        {a.turma_nome && <span>🏫 {a.turma_nome}</span>}
                        {a.disciplina_nome && <span>📚 {a.disciplina_nome}</span>}
                        <span>⭐ {a.pontos} pts</span>
                        <span>📤 {a.total_entregas||0} entrega(s)</span>
                        {(a.materiais||[]).length>0 && <span>📎 {a.materiais.length} material(is)</span>}
                        {a.data_entrega && <span>📅 Prazo: {new Date(a.data_entrega).toLocaleString('pt-BR')}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:6,flexShrink:0,flexWrap:'wrap' }}>
                      <button onClick={()=>setVE(a)} style={{ padding:'6px 12px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)',borderRadius:7,color:'#4f46e5',cursor:'pointer',fontSize:11,fontWeight:600 }}>📤 Entregas</button>
                      <button className="btn-sm btn-edit" onClick={()=>{setEdit(a);setModal(true);}}>✏️</button>
                      {a.status==='rascunho' && <button className="btn-sm btn-approve" onClick={()=>handlePublicar(a.id)}>🚀</button>}
                      <button className="btn-sm btn-danger" onClick={()=>handleDelete(a.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalAtividade
          turmas={turmas} disciplinas={discs} ativEdit={editItem}
          onClose={()=>{setModal(false);setEdit(null);}}
          onSalvar={onSalvar}
        />
      )}
    </>
  );
}

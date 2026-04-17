/**
 * AlunoAtividades — Visualizar e entregar atividades
 * Estilo Google Sala de Aula: ver instruções + materiais + enviar arquivo
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

const STATUS_ENTREGA = {
  nao_entregue: { bg:'var(--slate-100)', cor:'var(--slate-500)', label:'Não Entregue' },
  entregue:     { bg:'#f0f9ff', cor:'#0284c7', label:'✅ Entregue' },
  devolvida:    { bg:'#f0fdf4', cor:'#15803d', label:'📝 Devolvida c/ Nota' },
};

// ── Renderizador de material ──────────────────────────────────
function MaterialItem({ m }) {
  const ytId = (url) => {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  if (m.tipo === 'texto') return (
    <div style={{ padding:'12px 14px', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)', fontSize:13, color:'var(--slate-700)', lineHeight:1.7 }}>
      {m.conteudo}
    </div>
  );

  if (m.tipo === 'imagem') return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--slate-200)' }}>
      <img src={m.base64 || m.url} alt={m.nome||'imagem'} style={{ maxWidth:'100%', display:'block', objectFit:'contain', background:'var(--slate-50)' }} />
    </div>
  );

  if (m.tipo === 'youtube') {
    const id = ytId(m.url);
    return id ? (
      <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--slate-200)', aspectRatio:'16/9', position:'relative' }}>
        <iframe src={'https://www.youtube.com/embed/'+id} title="video" frameBorder="0" allowFullScreen
          style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      </div>
    ) : null;
  }

  if (m.tipo === 'link') return (
    <a href={m.url} target="_blank" rel="noreferrer"
      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f0f9ff', borderRadius:8, border:'1px solid #bae6fd', textDecoration:'none', transition:'all .15s' }}>
      <span style={{ fontSize:20 }}>🔗</span>
      <div>
        <div style={{ fontWeight:600, fontSize:13, color:'#0284c7' }}>{m.titulo || m.url}</div>
        <div style={{ fontSize:11, color:'#0284c7', opacity:.7 }}>{m.url}</div>
      </div>
      <span style={{ marginLeft:'auto', fontSize:12, color:'#0284c7' }}>↗</span>
    </a>
  );

  if (m.tipo === 'arquivo') return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
      <span style={{ fontSize:22 }}>{m.mimeType?.startsWith('image/')?'🖼️':m.mimeType?.includes('pdf')?'📄':'📎'}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)' }}>{m.nome}</div>
        {m.tamanho && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{Math.round(m.tamanho/1024)}KB</div>}
      </div>
      {m.base64 && (
        <a href={m.base64} download={m.nome}
          style={{ padding:'5px 14px', background:'var(--navy)', color:'white', borderRadius:7, fontSize:11, fontWeight:600, textDecoration:'none' }}>
          ⬇️ Baixar
        </a>
      )}
    </div>
  );

  return null;
}

// ── Detalhe + entrega de atividade ────────────────────────────
function AtividadeDetalhe({ ativ: atividadeInicial, onBack }) {
  const [ativ, setAtiv]       = useState(atividadeInicial);
  const [arquivos, setArqs]   = useState([]);
  const [comentario, setCom]  = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alert, setAlert]     = useState(null);
  const [cancelando, setCanc] = useState(false);
  const fileRef = useRef(null);

  const entrega = ativ.minha_entrega;
  const jaEntregou = entrega?.status === 'entregue' || entrega?.status === 'devolvida';
  const foiDevolvida = entrega?.status === 'devolvida';
  const prazoVencido = ativ.data_entrega && new Date(ativ.data_entrega) < new Date();

  const addArquivo = (e) => {
    const files = Array.from(e.target.files);
    const MAX = 10*1024*1024;
    files.forEach(file => {
      if (file.size > MAX) { setAlert({ type:'error', msg:'Arquivo '+file.name+' excede 10MB. Reduza o tamanho.' }); return; }
      const reader = new FileReader();
      reader.onload = ev => setArqs(prev => [...prev, { nome:file.name, tipo:file.type, mimeType:file.type, base64:ev.target.result, tamanho:file.size }]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeArq = (i) => setArqs(prev => prev.filter((_,j)=>j!==i));

  const enviar = async () => {
    if (arquivos.length === 0 && !comentario.trim())
      return setAlert({ type:'error', msg:'Adicione pelo menos um arquivo ou comentário.' });
    setEnviando(true);
    try {
      const r = await api.post('/atividades/'+ativ.id+'/entregar', { arquivos, comentario });
      setAtiv(prev => ({ ...prev, minha_entrega: r.data.entrega }));
      setArqs([]);
      setAlert({ type:'success', msg:r.data.message });
      setTimeout(()=>setAlert(null), 4000);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro ao enviar.' }); }
    setEnviando(false);
  };

  const cancelarEntrega = async () => {
    if (!window.confirm('Cancelar a entrega? Você poderá reenviar.')) return;
    setCanc(true);
    try {
      await api.delete('/atividades/'+ativ.id+'/entregar');
      setAtiv(prev => ({ ...prev, minha_entrega: null }));
      setAlert({ type:'success', msg:'Entrega cancelada. Você pode reenviar.' });
      setTimeout(()=>setAlert(null), 3000);
    } catch(e){ setAlert({ type:'error', msg:e.response?.data?.error||'Erro.' }); }
    setCanc(false);
  };

  const prazoCor = prazoVencido ? '#b91c1c' : '#15803d';
  const prazoBg  = prazoVencido ? '#fef2f2' : '#f0fdf4';

  return (
    <>
      <button onClick={onBack} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, marginBottom:'1.25rem' }}>
        ← Voltar
      </button>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'1.5rem', alignItems:'start' }}>

        {/* COLUNA ESQUERDA: Conteúdo da atividade */}
        <div>
          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', borderRadius:16, padding:'1.5rem', color:'white', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:11, opacity:.5, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              📋 {ativ.turma_nome} {ativ.disciplina_nome && '· '+ativ.disciplina_nome}
            </div>
            <div style={{ fontFamily:'var(--font-head)', fontSize:22, fontWeight:700, marginBottom:8 }}>{ativ.titulo}</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(255,255,255,.12)', fontSize:12 }}>
                ⭐ {ativ.pontos} pontos
              </span>
              {ativ.data_entrega && (
                <span style={{ padding:'4px 12px', borderRadius:50, background:prazoVencido?'rgba(239,68,68,.25)':'rgba(16,185,129,.2)', color:prazoVencido?'#fca5a5':'#34d399', fontSize:12, fontWeight:600 }}>
                  📅 Prazo: {new Date(ativ.data_entrega).toLocaleString('pt-BR')} {prazoVencido && '(ENCERRADO)'}
                </span>
              )}
            </div>
          </div>

          {/* Instruções */}
          {ativ.instrucoes && (
            <div className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:10 }}>📄 Instruções</div>
              <div style={{ fontSize:14, color:'var(--slate-700)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{ativ.instrucoes}</div>
            </div>
          )}

          {/* Materiais */}
          {(ativ.materiais||[]).length > 0 && (
            <div className="card">
              <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)', marginBottom:12 }}>
                📎 Materiais do Professor
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {ativ.materiais.map((m, i) => <MaterialItem key={i} m={m} />)}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Painel de entrega */}
        <div>
          <div style={{ background:'white', border:'2px solid '+(foiDevolvida?'var(--emerald)':jaEntregou?'var(--sky)':'var(--slate-200)'), borderRadius:16, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,.08)', position:'sticky', top:16 }}>
            {/* Status atual */}
            <div style={{ padding:'14px 16px', background:foiDevolvida?'#f0fdf4':jaEntregou?'#f0f9ff':'var(--slate-50)', borderBottom:'1px solid var(--slate-100)', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:700, color:foiDevolvida?'#15803d':jaEntregou?'#0284c7':'var(--slate-700)' }}>
                {foiDevolvida ? '✅ Entrega Devolvida' : jaEntregou ? '📤 Entregue' : '📝 Sua Entrega'}
              </div>
              {foiDevolvida && entrega.nota !== null && (
                <div style={{ fontFamily:'var(--font-head)', fontSize:36, fontWeight:700, color:'var(--emerald-dark)', marginTop:4 }}>
                  {entrega.nota}<span style={{ fontSize:18, opacity:.6 }}>/{ativ.pontos}</span>
                </div>
              )}
              {jaEntregou && entrega.entregue_em && (
                <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                  Enviado em {new Date(entrega.entregue_em).toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            <div style={{ padding:'1rem' }}>
              {/* Feedback do professor */}
              {foiDevolvida && entrega.feedback_prof && (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 12px', marginBottom:'1rem' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#15803d', marginBottom:4 }}>💬 Feedback do Professor</div>
                  <div style={{ fontSize:13, color:'#15803d', lineHeight:1.6 }}>{entrega.feedback_prof}</div>
                </div>
              )}

              {/* Arquivos já enviados */}
              {jaEntregou && (entrega.arquivos||[]).length > 0 && (
                <div style={{ marginBottom:'1rem' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:6 }}>ARQUIVOS ENVIADOS</div>
                  {(entrega.arquivos||[]).map((arq,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--slate-50)', borderRadius:7, border:'1px solid var(--slate-200)', marginBottom:4 }}>
                      <span style={{ fontSize:16 }}>{arq.tipo?.startsWith('image/')||arq.mimeType?.startsWith('image/')?'🖼️':'📎'}</span>
                      <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--navy)', fontWeight:500 }}>{arq.nome}</span>
                      {arq.base64 && <a href={arq.base64} download={arq.nome} style={{ fontSize:11, color:'var(--sky)', textDecoration:'none', fontWeight:600 }}>↓</a>}
                    </div>
                  ))}
                  {entrega.comentario && (
                    <div style={{ fontSize:12, color:'var(--slate-500)', fontStyle:'italic', marginTop:6, padding:'6px 10px', background:'var(--slate-50)', borderRadius:6 }}>
                      "{entrega.comentario}"
                    </div>
                  )}
                </div>
              )}

              {/* Formulário de envio (se não devolvida e não vencida) */}
              {!foiDevolvida && !prazoVencido && (
                <>
                  {!jaEntregou ? (
                    <>
                      {/* Drop zone - using label for maximum compatibility */}
                      <label htmlFor="upload-ativ"
                        style={{ display:'block', border:'2px dashed var(--slate-200)', borderRadius:10, padding:'1.25rem', textAlign:'center', cursor:'pointer', marginBottom:10, transition:'all .15s', background:'var(--slate-50)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor='var(--emerald)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor='var(--slate-200)'}>
                        <div style={{ fontSize:32, marginBottom:6 }}>📤</div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:2 }}>Adicionar arquivos</div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>PDF, Word, imagens, ZIP · Max 10MB</div>
                        <input id="upload-ativ" ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.zip,.rar" style={{ display:'none' }} onChange={addArquivo} />
                      </label>

                      {/* Arquivos selecionados */}
                      {arquivos.length > 0 && (
                        <div style={{ marginBottom:10 }}>
                          {arquivos.map((arq,i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(16,185,129,.05)', borderRadius:7, border:'1px solid rgba(16,185,129,.2)', marginBottom:4 }}>
                              <span style={{ fontSize:14 }}>📎</span>
                              <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--navy)', fontWeight:500 }}>{arq.nome}</span>
                              <span style={{ fontSize:10, color:'var(--slate-400)' }}>{Math.round(arq.tamanho/1024)}KB</span>
                              <button onClick={()=>removeArq(i)} style={{ background:'#fef2f2', border:'none', color:'#b91c1c', borderRadius:5, cursor:'pointer', padding:'2px 7px', fontSize:11 }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comentário */}
                      <textarea rows={2} value={comentario} onChange={e=>setCom(e.target.value)}
                        placeholder="Comentário para o professor (opcional)..."
                        style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:12, resize:'none', outline:'none', marginBottom:10, boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />

                      <button onClick={enviar} disabled={enviando||(arquivos.length===0&&!comentario.trim())}
                        style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', opacity:arquivos.length===0&&!comentario.trim()?0.5:1, boxShadow:'0 4px 14px rgba(16,185,129,.35)' }}>
                        {enviando ? '⏳ Enviando...' : '🚀 Entregar Atividade'}
                      </button>
                    </>
                  ) : (
                    <button onClick={cancelarEntrega} disabled={cancelando}
                      style={{ width:'100%', padding:'10px', background:'white', border:'1.5px solid var(--coral)', borderRadius:8, color:'var(--coral)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                      {cancelando ? '...' : '↩ Cancelar Entrega'}
                    </button>
                  )}
                </>
              )}

              {prazoVencido && !jaEntregou && (
                <div style={{ textAlign:'center', padding:'1rem', color:'#b91c1c', fontSize:13 }}>
                  ⏰ O prazo de entrega encerrou em {new Date(ativ.data_entrega).toLocaleDateString('pt-BR')}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function AlunoAtividades() {
  const [atividades, setAt]    = useState([]);
  const [loading, setLd]       = useState(true);
  const [detalhe, setDetalhe]  = useState(null);
  const [filtro, setFiltro]    = useState('todas');

  useEffect(() => {
    api.get('/atividades').then(r => setAt(r.data.atividades||[])).catch(console.error).finally(()=>setLd(false));
  }, []);

  if (detalhe) return (
    <>
      <div className="page-header">
        <div className="page-title">📋 Atividades</div>
        <div className="page-sub">Detalhes da atividade</div>
      </div>
      <AtividadeDetalhe ativ={detalhe} onBack={() => setDetalhe(null)} />
    </>
  );

  const filtradas = atividades.filter(a => {
    if (filtro === 'entregue')    return a.minha_entrega?.status === 'entregue' || a.minha_entrega?.status === 'devolvida';
    if (filtro === 'pendente')    return !a.minha_entrega || a.minha_entrega.status === 'rascunho';
    if (filtro === 'devolvida')   return a.minha_entrega?.status === 'devolvida';
    return true;
  });

  const stats = {
    total:    atividades.length,
    entregues: atividades.filter(a=>a.minha_entrega?.status==='entregue'||a.minha_entrega?.status==='devolvida').length,
    pendentes: atividades.filter(a=>!a.minha_entrega||a.minha_entrega.status==='rascunho').length,
    comNota:   atividades.filter(a=>a.minha_entrega?.status==='devolvida').length,
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">📋 Atividades</div>
        <div className="page-sub">Tarefas e trabalhos das suas turmas</div>
      </div>

      {/* Mini stats */}
      {atividades.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {[
            { l:'Total', v:stats.total, bg:'var(--slate-50)', bd:'var(--slate-200)' },
            { l:'Entregues', v:stats.entregues, bg:'#f0f9ff', bd:'#bae6fd', cor:'#0284c7' },
            { l:'Pendentes', v:stats.pendentes, bg:'#fffbeb', bd:'#fcd34d', cor:'#92400e' },
            { l:'Com nota', v:stats.comNota, bg:'#f0fdf4', bd:'#86efac', cor:'#15803d' },
          ].map(s => (
            <div key={s.l} style={{ padding:'8px 16px', borderRadius:10, background:s.bg, border:'1px solid '+s.bd, textAlign:'center', minWidth:80 }}>
              <div style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700, color:s.cor||'var(--navy)' }}>{s.v}</div>
              <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {atividades.length > 0 && (
        <div style={{ display:'flex', gap:4, marginBottom:'1rem', background:'var(--slate-100)', padding:4, borderRadius:10, width:'fit-content' }}>
          {[['todas','Todas'],['pendente','⏳ Pendentes'],['entregue','📤 Entregues'],['devolvida','📝 Com nota']].map(([k,l])=>(
            <button key={k} onClick={()=>setFiltro(k)} style={{ padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filtro===k?'white':'transparent', color:filtro===k?'var(--navy)':'var(--slate-500)', boxShadow:filtro===k?'0 1px 4px rgba(0,0,0,.1)':'none' }}>{l}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'4rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : filtradas.length === 0 ? (
        <div className="card"><EmptyState icon="📋" title={atividades.length===0?"Nenhuma atividade disponível":"Nenhuma atividade neste filtro"} sub={atividades.length===0?"Seu professor publicará atividades em breve.":"Tente outro filtro."} /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
          {filtradas.map(a => {
            const entrega     = a.minha_entrega;
            const jaEntregou  = entrega?.status==='entregue'||entrega?.status==='devolvida';
            const foiDevolvida= entrega?.status==='devolvida';
            const prazoVencido= a.data_entrega && new Date(a.data_entrega)<new Date();
            const prazoHoje   = a.data_entrega && !prazoVencido && (new Date(a.data_entrega)-new Date()) < 86400000;

            return (
              <div key={a.id}
                onClick={() => setDetalhe(a)}
                style={{ background:'white', borderRadius:14, border:'2px solid '+(foiDevolvida?'var(--emerald)':jaEntregou?'var(--sky)':prazoVencido&&!jaEntregou?'#fca5a5':'var(--slate-200)'), overflow:'hidden', cursor:'pointer', transition:'all .15s', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'; }}>

                {/* Barra de status colorida */}
                <div style={{ height:4, background:foiDevolvida?'linear-gradient(90deg,#10b981,#34d399)':jaEntregou?'linear-gradient(90deg,var(--sky),#38bdf8)':prazoVencido?'#ef4444':'linear-gradient(90deg,var(--slate-200),var(--slate-300))' }} />

                <div style={{ padding:'1rem 1.25rem', display:'flex', alignItems:'flex-start', gap:14 }}>
                  {/* Ícone */}
                  <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                    background:foiDevolvida?'#f0fdf4':jaEntregou?'#f0f9ff':'var(--slate-100)' }}>
                    📋
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:600, color:'var(--navy)' }}>{a.titulo}</span>
                      <span style={{ padding:'2px 8px', borderRadius:50, fontSize:10, fontWeight:600,
                        background:foiDevolvida?'#f0fdf4':jaEntregou?'#f0f9ff':'var(--slate-100)',
                        color:foiDevolvida?'#15803d':jaEntregou?'#0284c7':'var(--slate-500)' }}>
                        {foiDevolvida?'📝 Devolvida':jaEntregou?'✅ Entregue':'⏳ Pendente'}
                      </span>
                      {foiDevolvida && entrega.nota !== null && (
                        <span style={{ fontFamily:'var(--font-head)', fontSize:13, fontWeight:700, color:'var(--emerald-dark)', padding:'2px 8px', borderRadius:50, background:'#f0fdf4', border:'1px solid #86efac' }}>
                          {entrega.nota}/{a.pontos} pts
                        </span>
                      )}
                    </div>
                    {a.instrucoes && (
                      <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {a.instrucoes.slice(0,90)}{a.instrucoes.length>90?'...':''}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap' }}>
                      {a.turma_nome && <span>🏫 {a.turma_nome}</span>}
                      {a.disciplina_nome && <span>📚 {a.disciplina_nome}</span>}
                      <span>⭐ {a.pontos} pts</span>
                      {(a.materiais||[]).length>0 && <span>📎 {a.materiais.length} material(is)</span>}
                      {a.data_entrega && (
                        <span style={{ fontWeight:600, color:prazoVencido?'#b91c1c':prazoHoje?'#f59e0b':'var(--slate-400)' }}>
                          📅 {prazoVencido?'Encerrou:':'Prazo:'} {new Date(a.data_entrega).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize:18, color:'var(--slate-300)', flexShrink:0 }}>›</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

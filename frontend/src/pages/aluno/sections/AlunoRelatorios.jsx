/**
 * AlunoRelatorios — Relatório individual completo
 * Avaliações + Trilhas com questão por questão
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmt = (d) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return '—'; } };

function Bar({ v, cor }) {
  const c = cor || (v >= 70 ? '#10b981' : v >= 50 ? '#3b82f6' : v >= 30 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:99 }}>
        <div style={{ height:6, width:`${Math.min(100,v)}%`, background:c, borderRadius:99, transition:'width .4s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:c, minWidth:32 }}>{v}%</span>
    </div>
  );
}

function QCard({ r, idx }) {
  const [open, setOpen] = useState(false);
  const ok = r.is_correct || r.correto === 1 || (r.score||0) >= 0.8;
  const parcial = !ok && (r.score||0) >= 0.4;
  const border = ok ? '#a7f3d0' : parcial ? '#fde68a' : '#fca5a5';
  const bg = ok ? '#f0fdf4' : parcial ? '#fffbeb' : '#fef2f2';
  const rv = (v) => { if (v == null) return <em style={{color:'#94a3b8'}}>—</em>; if (typeof v==='object') return JSON.stringify(v); return String(v); };
  return (
    <div style={{ border:`1px solid ${border}`, borderRadius:10, overflow:'hidden', marginBottom:6 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
        background:bg, cursor:'pointer', userSelect:'none' }}>
        <span style={{fontSize:16}}>{ok?'✅':parcial?'⚡':'❌'}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:600, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            Q{idx+1}. {r.questao_enunciado ? r.questao_enunciado.slice(0,80)+(r.questao_enunciado.length>80?'…':'') : `Questão #${idx+1}`}
          </div>
          <div style={{fontSize:11, color:'#64748b', marginTop:2}}>{r.questao_tipo||'questão'} · {Math.round((r.score||0)*100)}%</div>
        </div>
        <span style={{fontSize:11, color:'#94a3b8'}}>{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div style={{padding:'12px 14px', borderTop:`1px solid ${border}`, background:'#fff'}}>
          {r.questao_enunciado && <div style={{fontSize:13,color:'#334155',background:'#f8fafc',padding:'8px 10px',borderRadius:6,marginBottom:10,lineHeight:1.6}}>{r.questao_enunciado}</div>}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8}}>
            <div style={{background:'#f1f5f9', padding:'8px 10px', borderRadius:6}}>
              <div style={{fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:3}}>SUA RESPOSTA</div>
              <div style={{fontSize:13, color:'#334155'}}>{rv(r.resposta_aluno)}</div>
            </div>
            {r.questao_gabarito != null && (
              <div style={{background:'#f0fdf4', padding:'8px 10px', borderRadius:6}}>
                <div style={{fontSize:10, fontWeight:700, color:'#86efac', marginBottom:3}}>GABARITO</div>
                <div style={{fontSize:13, color:'#166534'}}>{rv(r.questao_gabarito)}</div>
              </div>
            )}
          </div>
          {r.questao_explicacao && (
            <div style={{background:'#eff6ff', padding:'8px 10px', borderRadius:6, marginBottom:8}}>
              <div style={{fontSize:10, fontWeight:700, color:'#93c5fd', marginBottom:3}}>💡 EXPLICAÇÃO</div>
              <div style={{fontSize:12, color:'#1e40af', lineHeight:1.6}}>{r.questao_explicacao}</div>
            </div>
          )}
          {r.feedback_ia && (
            <div style={{background:'#faf5ff', padding:'8px 10px', borderRadius:6}}>
              <div style={{fontSize:10, fontWeight:700, color:'#c4b5fd', marginBottom:3}}>🤖 FEEDBACK IA</div>
              <div style={{fontSize:12, color:'#6d28d9', lineHeight:1.6}}>{typeof r.feedback_ia==='string'?r.feedback_ia:JSON.stringify(r.feedback_ia)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlunoRelatorios() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('avaliacoes');
  const [sel, setSel] = useState(null);

  useEffect(() => {
    api.get('/relatorios/aluno').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign:'center', padding:'3rem', color:'#94a3b8'}}>📊 Carregando...</div>;
  if (!data) return <div style={{textAlign:'center', padding:'3rem', color:'#ef4444'}}>Erro ao carregar relatório.</div>;

  const { theta=0, nivel='iniciante', nivel_emoji='🌱', total_respostas=0, total_acertos=0, taxa_acerto_geral=0, xp_total=0, por_trilha=[], por_avaliacao=[] } = data;
  const tCor = theta<=-1?'#64748b':theta<=0?'#3b82f6':theta<=1?'#10b981':'#f59e0b';

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <h2 style={{fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:'1.25rem'}}>📈 Meu Desempenho</h2>

      {/* Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:'1.25rem'}}>
        {[
          {l:'Respostas', v:total_respostas, c:'#7c3aed', i:'📝'},
          {l:'Acertos', v:total_acertos, c:'#10b981', i:'✅'},
          {l:'Taxa', v:taxa_acerto_geral+'%', c:'#0ea5e9', i:'🎯'},
          {l:'XP Total', v:xp_total, c:'#f59e0b', i:'⭐'},
        ].map(s=>(
          <div key={s.l} style={{background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px', textAlign:'center'}}>
            <div style={{fontSize:20}}>{s.i}</div>
            <div style={{fontSize:20, fontWeight:800, color:s.c, lineHeight:1.2}}>{s.v}</div>
            <div style={{fontSize:10, color:'#94a3b8', fontWeight:600, marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* TRI */}
      <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:12}}>
        <span style={{fontSize:24}}>{nivel_emoji}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:4}}>Nível TRI: <span style={{color:tCor}}>{nivel}</span></div>
          <Bar v={Math.round(((Number(theta)+4)/8)*100)} cor={tCor} />
        </div>
        <span style={{fontSize:13, fontWeight:700, color:tCor}}>θ={Number(theta).toFixed(2)}</span>
      </div>

      {/* Abas */}
      <div style={{display:'flex', gap:8, marginBottom:'1.25rem'}}>
        {[{id:'avaliacoes',label:`📝 Avaliações (${por_avaliacao.length})`},{id:'trilhas',label:`🗺️ Trilhas (${por_trilha.length})`}].map(t=>(
          <button key={t.id} onClick={()=>{setAba(t.id);setSel(null);}}
            style={{padding:'8px 18px', borderRadius:20, fontWeight:700, fontSize:13, cursor:'pointer',
              border:'2px solid '+(aba===t.id?'#7c3aed':'#e2e8f0'),
              background:aba===t.id?'#7c3aed':'#fff', color:aba===t.id?'#fff':'#334155', transition:'all .15s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Avaliações list */}
      {aba==='avaliacoes' && !sel && (
        <div>
          {por_avaliacao.length===0
            ? <div style={{textAlign:'center', padding:'3rem', color:'#94a3b8'}}>Nenhuma avaliação realizada.</div>
            : por_avaliacao.map(av=>(
              <div key={av.id} onClick={()=>setSel(av)}
                style={{background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10, cursor:'pointer', transition:'all .15s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#7c3aed'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <span style={{fontSize:26}}>📝</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700, color:'#0f172a', marginBottom:4}}>{av.titulo}</div>
                    <Bar v={av.taxa_acerto||0} />
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:22, fontWeight:800, color:av.aprovado?'#10b981':'#ef4444'}}>{Number(av.nota||0).toFixed(1)}/10</div>
                    <div style={{fontSize:11, color:'#94a3b8'}}>{fmt(av.concluida_em)}</div>
                  </div>
                </div>
                <div style={{display:'flex', gap:14, marginTop:8, fontSize:12, color:'#64748b'}}>
                  <span>✅ {av.corretas} acertos</span>
                  <span>❌ {av.erros} erros</span>
                  <span>🔁 {av.total_tentativas}/{av.total_tentativas_permitidas||'?'}</span>
                  <span style={{marginLeft:'auto', color:'#7c3aed', fontWeight:700}}>Ver detalhes →</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Avaliação detalhe */}
      {aba==='avaliacoes' && sel && (
        <div>
          <button onClick={()=>setSel(null)} style={{padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', marginBottom:'1rem', fontSize:13, fontWeight:600}}>← Voltar</button>
          <div style={{background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'1.25rem', marginBottom:'1rem'}}>
            <h3 style={{margin:'0 0 12px', fontSize:16, fontWeight:800, color:'#0f172a'}}>{sel.titulo}</h3>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:12}}>
              {[
                {l:'Nota', v:Number(sel.nota||0).toFixed(1)+'/10', c:sel.aprovado?'#10b981':'#ef4444'},
                {l:'Situação', v:sel.aprovado?'✅ Aprovado':'❌ Reprovado', c:sel.aprovado?'#10b981':'#ef4444'},
                {l:'Acertos', v:`${sel.corretas}/${sel.total_questoes}`, c:'#10b981'},
                {l:'Taxa', v:(sel.taxa_acerto||0)+'%', c:'#3b82f6'},
              ].map(s=>(
                <div key={s.l} style={{textAlign:'center', background:s.c+'10', border:'1px solid '+s.c+'30', borderRadius:10, padding:'10px'}}>
                  <div style={{fontSize:15, fontWeight:800, color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10, color:'#94a3b8', marginTop:2, fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
            <Bar v={sel.taxa_acerto||0} />
          </div>
          <h4 style={{fontSize:14, fontWeight:700, color:'#334155', margin:'0 0 8px'}}>Questão por questão ({(sel.respostas||[]).length}):</h4>
          {(sel.respostas||[]).length===0
            ? <div style={{textAlign:'center', padding:'2rem', color:'#94a3b8'}}>Sem detalhes disponíveis.</div>
            : (sel.respostas||[]).map((r,i)=><QCard key={i} r={r} idx={i} />)}
        </div>
      )}

      {/* Trilhas list */}
      {aba==='trilhas' && !sel && (
        <div>
          {por_trilha.length===0
            ? <div style={{textAlign:'center', padding:'3rem', color:'#94a3b8'}}>Nenhuma trilha iniciada.</div>
            : por_trilha.map(t=>(
              <div key={t.id} onClick={()=>setSel(t)}
                style={{background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'1rem 1.25rem', marginBottom:10, cursor:'pointer', transition:'all .15s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#7c3aed'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <span style={{fontSize:26}}>🗺️</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700, color:'#0f172a', marginBottom:2}}>{t.nome}</div>
                    <div style={{fontSize:11, color:'#94a3b8', marginBottom:4}}>{t.disciplina}</div>
                    <Bar v={t.progresso||0} />
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:20, fontWeight:800, color:'#7c3aed'}}>{t.taxa_acerto}%</div>
                    <div style={{fontSize:11, color:'#94a3b8'}}>{t.total_respondidas}/{t.total_questoes}q</div>
                  </div>
                </div>
                <div style={{display:'flex', gap:14, marginTop:8, fontSize:12, color:'#64748b'}}>
                  <span>✅ {t.acertos} acertos</span>
                  <span>❌ {(t.total_respondidas||0)-(t.acertos||0)} erros</span>
                  <span>⭐ +{t.xp_ganho} XP</span>
                  <span style={{marginLeft:'auto', color:'#7c3aed', fontWeight:700}}>Ver detalhes →</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Trilha detalhe */}
      {aba==='trilhas' && sel && (
        <div>
          <button onClick={()=>setSel(null)} style={{padding:'6px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', marginBottom:'1rem', fontSize:13, fontWeight:600}}>← Voltar</button>
          <div style={{background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'1.25rem', marginBottom:'1rem'}}>
            <h3 style={{margin:'0 0 4px', fontSize:16, fontWeight:800}}>{sel.nome}</h3>
            <div style={{fontSize:12, color:'#94a3b8', marginBottom:12}}>{sel.disciplina}</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:12}}>
              {[
                {l:'Progresso', v:(sel.progresso||0)+'%', c:'#7c3aed'},
                {l:'Acertos', v:`${sel.acertos}/${sel.total_respondidas}`, c:'#10b981'},
                {l:'Taxa', v:sel.taxa_acerto+'%', c:'#3b82f6'},
                {l:'XP', v:'+'+sel.xp_ganho, c:'#f59e0b'},
              ].map(s=>(
                <div key={s.l} style={{textAlign:'center', background:s.c+'10', border:'1px solid '+s.c+'30', borderRadius:10, padding:'10px'}}>
                  <div style={{fontSize:15, fontWeight:800, color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10, color:'#94a3b8', marginTop:2, fontWeight:600}}>{s.l}</div>
                </div>
              ))}
            </div>
            <Bar v={sel.progresso||0} />
          </div>
          <h4 style={{fontSize:14, fontWeight:700, color:'#334155', margin:'0 0 8px'}}>Questão por questão ({(sel.respostas||[]).length}):</h4>
          {(sel.respostas||[]).length===0
            ? <div style={{textAlign:'center', padding:'2rem', color:'#94a3b8'}}>Sem respostas registradas.</div>
            : (sel.respostas||[]).map((r,i)=><QCard key={i} r={r} idx={i} />)}
        </div>
      )}
    </div>
  );
}

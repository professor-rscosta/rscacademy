/**
 * ProfRelatorios — Sistema completo de relatórios
 * Trilha · Aluno · Turma · Exportação Excel
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';

// ── Utilitários ──────────────────────────────────────────────
const pct = (a, b) => b > 0 ? Math.round(a/b*100) : 0;

function Badge({ valor, max=100 }) {
  const cor = valor >= 70 ? '#10b981' : valor >= 50 ? '#3b82f6' : valor >= 30 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 10px',
      borderRadius:99, fontSize:12, fontWeight:700, background: cor+'20', color: cor }}>
      {valor}%
    </span>
  );
}

function BarraProgresso({ valor, max=100, cor, label }) {
  const pctVal = Math.min(100, Math.round(valor/max*100));
  const c = cor || (pctVal>=70?'#10b981':pctVal>=50?'#3b82f6':pctVal>=30?'#f59e0b':'#ef4444');
  return (
    <div>
      {label && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span>{label}</span><span style={{ fontWeight:700, color:c }}>{pctVal}%</span>
      </div>}
      <div style={{ height:8, background:'var(--slate-100)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pctVal}%`, background:c, borderRadius:99, transition:'width .5s ease' }} />
      </div>
    </div>
  );
}

function ThetaChip({ theta, nivel, emoji }) {
  const cor = theta <= -1 ? '#64748b' : theta <= 0 ? '#3b82f6' : theta <= 1 ? '#10b981' : theta <= 2 ? '#f59e0b' : '#a855f7';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:99, fontSize:12, fontWeight:700, background:cor+'15', color:cor, border:'1px solid '+cor+'30' }}>
      {emoji} {nivel} <span style={{ opacity:.6 }}>θ={theta}</span>
    </span>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:'white', borderRadius:12, border:'1px solid var(--slate-200)',
    boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:'1.25rem', ...style }}>{children}</div>;
}

function StatBox({ label, value, sub, cor='var(--navy)' }) {
  return (
    <div style={{ textAlign:'center', padding:'1rem', background:cor+'08', borderRadius:10, border:'1px solid '+cor+'20' }}>
      <div style={{ fontSize:28, fontWeight:800, color:cor, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:'var(--slate-600)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function ExportBtn({ tipo, id, label='Exportar Excel' }) {
  const [loading, setLoading] = useState(false);

  async function exportar() {
    setLoading(true);
    try {
      const resp = await api.get(`/relatorios/exportar/${tipo}/${id}`, { responseType:'blob' });
      const url  = window.URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `RSCacademy_${tipo}_${id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch(e) {
      alert('Erro ao exportar. Tente novamente.');
    } finally { setLoading(false); }
  }

  return (
    <button onClick={exportar} disabled={loading} style={{
      display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px',
      background: loading ? 'var(--slate-100)' : 'linear-gradient(135deg,#10b981,#059669)',
      color: loading ? 'var(--slate-500)' : 'white', border:'none', borderRadius:8,
      fontWeight:700, fontSize:13, cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 2px 8px #10b98140',
    }}>
      {loading ? '⏳ Gerando...' : `📥 ${label}`}
    </button>
  );
}

// ── Vista: Relatório por Trilha ───────────────────────────────
function RelatorioTrilha({ trilhaId, onVoltar }) {
  const [data, setData] = useState(null);
  const [aba, setAba]   = useState('questoes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/relatorios/trilha/${trilhaId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [trilhaId]);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'auto' }} /></div>;
  if (!data)   return null;

  const { trilha={}, estatisticas: e={}, questoes=[], alunos=[], questoes_criticas=[] } = data || {};

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onVoltar} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>📊 {trilha?.nome || '—'}</h2>
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{trilha?.disciplina} · Relatório por Trilha</span>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <ExportBtn tipo="trilha" id={trilhaId} label="Exportar Excel" />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:'1.5rem' }}>
        <StatBox label="Questões" value={(e?.total_questoes || 0)} cor="#3b82f6" />
        <StatBox label="Alunos" value={(e?.total_alunos_participaram || 0)} cor="#10b981" />
        <StatBox label="Respostas" value={(e?.total_respostas || 0)} cor="#8b5cf6" />
        <StatBox label="Taxa Acerto" value={(e?.taxa_acerto_geral || 0)+'%'} cor={(e?.taxa_acerto_geral||0)>=70?'#10b981':(e?.taxa_acerto_geral||0)>=50?'#f59e0b':'#ef4444'} />
        <StatBox label="Críticas" value={(e?.questoes_criticas || 0)} sub="< 40%" cor="#ef4444" />
        <StatBox label="Calibradas TRI" value={(e?.questoes_calibradas || 0)} cor="#6366f1" />
      </div>

      {/* Alertas */}
      {questoes_criticas.length > 0 && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'1rem', marginBottom:'1.5rem' }}>
          <div style={{ fontWeight:700, color:'#dc2626', marginBottom:8 }}>⚠️ Pontos Críticos — Questões com menor desempenho</div>
          {questoes_criticas.map(q => (
            <div key={q.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, fontSize:13 }}>
              <Badge valor={q.taxa_acerto} />
              <span style={{ color:'var(--slate-600)' }}>{q.enunciado.slice(0,80)}...</span>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:'flex', gap:4, marginBottom:'1rem', borderBottom:'2px solid var(--slate-200)', paddingBottom:0 }}>
        {[['questoes','📝 Questões'],['alunos','👥 Alunos']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)} style={{
            padding:'8px 16px', border:'none', background:'none', cursor:'pointer',
            fontWeight: aba===v ? 800 : 400, color: aba===v ? 'var(--emerald)' : 'var(--slate-500)',
            borderBottom: aba===v ? '2px solid var(--emerald)' : '2px solid transparent',
            marginBottom:-2, fontSize:13,
          }}>{l}</button>
        ))}
      </div>

      {aba === 'questoes' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {questoes.map((q, i) => (
            <Card key={q.id}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <span style={{ background:'var(--slate-100)', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:700, minWidth:28, textAlign:'center' }}>{i+1}</span>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{q.enunciado}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                    <span style={{ fontSize:11, padding:'1px 8px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-600)' }}>{q.tipo}</span>
                    {q.tags?.map(t => <span key={t} style={{ fontSize:11, padding:'1px 8px', borderRadius:99, background:'#eff6ff', color:'#3b82f6' }}>{t}</span>)}
                    <span style={{ fontSize:11, padding:'1px 8px', borderRadius:99, background:'#f5f3ff', color:'#7c3aed' }}>TRI: {q.tri_status}</span>
                  </div>
                  <BarraProgresso valor={q.taxa_acerto} />
                </div>
                <div style={{ textAlign:'right', minWidth:80 }}>
                  <Badge valor={q.taxa_acerto} />
                  <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                    {q.acertos}/{q.total_respostas} acertos
                    {q.tempo_medio_seg && <> · {q.tempo_medio_seg}s</>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {aba === 'alunos' && (
        <Card>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--slate-50)', borderBottom:'2px solid var(--slate-200)' }}>
                  {['#','Nome','Respondidas','Acertos','Taxa','XP','Tempo (min)','Última Atividade'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, fontSize:12, color:'var(--slate-600)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alunos.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom:'1px solid var(--slate-100)', background: i%2===0?'white':'var(--slate-50)' }}>
                    <td style={{ padding:'10px 12px', fontWeight:700 }}>{i+1}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{a.nome}</td>
                    <td style={{ padding:'10px 12px' }}>{a.questoes_respondidas}</td>
                    <td style={{ padding:'10px 12px' }}>{a.acertos}</td>
                    <td style={{ padding:'10px 12px' }}><Badge valor={a.taxa_acerto} /></td>
                    <td style={{ padding:'10px 12px' }}>⚡ {a.xp_ganho}</td>
                    <td style={{ padding:'10px 12px' }}>{a.tempo_total_min ? a.tempo_total_min+'min' : '—'}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, color:'var(--slate-500)' }}>{a.ultima_atividade ? a.ultima_atividade.split('T')[0] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Vista: Relatório Individual do Aluno ─────────────────────
function RelatorioAluno({ alunoId, onVoltar }) {
  const [data, setData] = useState(null);
  const [aba, setAba]   = useState('resumo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/relatorios/aluno/${alunoId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [alunoId]);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'auto' }} /></div>;
  if (!data)   return null;

  const { aluno, resumo, pontos_fortes=[], dificuldades=[], por_trilha=[], historico_xp=[] } = data || {};
  if (!aluno) return (
    <div style={{ textAlign:'center', padding:'3rem', color:'var(--slate-500)' }}>
      <button onClick={onVoltar} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, marginBottom:'1rem', display:'block', margin:'0 auto 1rem' }}>← Voltar</button>
      <p>Erro ao carregar dados do aluno. Tente novamente.</p>
    </div>
  );
  const resumoSafe = resumo || {};

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onVoltar} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>👤 {aluno?.nome || '—'}</h2>
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{aluno?.email} · Relatório Individual</span>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <ExportBtn tipo="aluno" id={alunoId} label="Exportar Excel" />
        </div>
      </div>

      {/* Perfil TRI */}
      <Card style={{ marginBottom:'1.25rem', background:'linear-gradient(135deg,#1e3a5f,#2d5a9e)', color:'white' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>{aluno?.nivel_emoji || '🌱'}</div>
          <div>
            <div style={{ fontWeight:800, fontSize:20 }}>{aluno?.nivel||'—'}</div>
            <div style={{ opacity:.7, fontSize:13 }}>θ = {aluno?.theta||0} · Habilidade TRI</div>
          </div>
          <div style={{ marginLeft:'auto', display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:24, fontWeight:800 }}>{(resumo?.total_respostas || 0)}</div><div style={{ fontSize:11, opacity:.7 }}>Respostas</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:24, fontWeight:800 }}>{(resumo?.taxa_acerto_geral || 0)}%</div><div style={{ fontSize:11, opacity:.7 }}>Acerto</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:24, fontWeight:800 }}>⚡{(resumo?.xp_total || 0)}</div><div style={{ fontSize:11, opacity:.7 }}>XP Total</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:24, fontWeight:800 }}>{(resumo?.trilhas_completas || 0)}</div><div style={{ fontSize:11, opacity:.7 }}>Trilhas OK</div></div>
          </div>
        </div>
      </Card>

      {/* Pontos fortes e dificuldades */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1.25rem' }}>
        <Card style={{ borderLeft:'4px solid #10b981' }}>
          <div style={{ fontWeight:700, color:'#10b981', marginBottom:8, fontSize:13 }}>✅ Pontos Fortes</div>
          {pontos_fortes.length > 0 ? pontos_fortes.map(p => <div key={p} style={{ fontSize:13, color:'var(--slate-700)', marginBottom:4 }}>• {p}</div>)
            : <div style={{ fontSize:12, color:'var(--slate-400)' }}>Continue respondendo para identificar pontos fortes!</div>}
        </Card>
        <Card style={{ borderLeft:'4px solid #ef4444' }}>
          <div style={{ fontWeight:700, color:'#ef4444', marginBottom:8, fontSize:13 }}>⚠️ Precisa Melhorar</div>
          {dificuldades.length > 0 ? dificuldades.map(p => <div key={p} style={{ fontSize:13, color:'var(--slate-700)', marginBottom:4 }}>• {p}</div>)
            : <div style={{ fontSize:12, color:'var(--slate-400)' }}>Nenhuma dificuldade crítica identificada!</div>}
        </Card>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:4, marginBottom:'1rem', borderBottom:'2px solid var(--slate-200)' }}>
        {[['resumo','📋 Por Trilha'],['detalhado','📝 Relatório Detalhado'],['evolucao','📈 Evolução']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)} style={{
            padding:'8px 16px', border:'none', background:'none', cursor:'pointer',
            fontWeight: aba===v?800:400, color: aba===v?'var(--emerald)':'var(--slate-500)',
            borderBottom: aba===v?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{l}</button>
        ))}
      </div>

      {aba === 'resumo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {por_trilha.map(t => (
            <Card key={t.trilha_id}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, marginBottom:2 }}>{t.nome}</div>
                  <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8 }}>{t.disciplina} · {t.respondidas}/{t.total_questoes} questões · {t.status}</div>
                  <BarraProgresso valor={t.taxa_acerto} label={`Taxa de acerto: ${t.taxa_acerto}%`} />
                  <div style={{ marginTop:6 }}>
                    <BarraProgresso valor={t.progresso} cor="#6366f1" label={`Progresso: ${t.progresso}%`} />
                  </div>
                </div>
                <div style={{ textAlign:'right', minWidth:100 }}>
                  <Badge valor={t.taxa_acerto} />
                  <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                    {t.acertos} acertos · {t.erros} erros<br/>⚡{t.xp_ganho} XP
                    {t.tempo_total_min > 0 && <> · {t.tempo_total_min}min</>}
                  </div>
                </div>
              </div>
              {/* Análise por tipo */}
              {t.analise_por_tipo?.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10, paddingTop:10, borderTop:'1px solid var(--slate-100)' }}>
                  {t.analise_por_tipo.map(tp => (
                    <span key={tp.tipo} style={{ fontSize:11, padding:'3px 10px', borderRadius:99,
                      background: tp.taxa>=70?'#dcfce7':tp.taxa>=40?'#fef3c7':'#fee2e2',
                      color: tp.taxa>=70?'#166534':tp.taxa>=40?'#92400e':'#991b1b' }}>
                      {tp.tipo}: {tp.taxa}%
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── ABA RELATÓRIO DETALHADO ── */}
      {aba === 'detalhado' && (
        <div>
          {por_trilha.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--slate-400)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📝</div>
              <div>Nenhuma atividade registrada</div>
            </div>
          ) : por_trilha.map(t => (
            <div key={t.trilha_id} style={{ marginBottom:'1.5rem' }}>
              {/* Header da trilha */}
              <div style={{ background:'linear-gradient(135deg,var(--navy),#2d5a9e)', borderRadius:'10px 10px 0 0', padding:'12px 18px', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15 }}>🗺️ {t.nome}</div>
                  <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>{t.disciplina} · {t.status}</div>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:13, fontWeight:700 }}>
                  <span style={{ color:'#34d399' }}>✅ {t.acertos} acertos</span>
                  <span style={{ color:'#f87171' }}>❌ {t.erros} erros</span>
                  <span style={{ color:'#fbbf24' }}>⚡ {t.xp_ganho} XP</span>
                  <span style={{ background:'rgba(255,255,255,.15)', padding:'2px 10px', borderRadius:99 }}>{t.taxa_acerto}%</span>
                </div>
              </div>

              {/* Meta */}
              <div style={{ background:'white', border:'1px solid var(--slate-200)', borderTop:'none', padding:'10px 18px', display:'flex', flexWrap:'wrap', gap:'1rem', fontSize:12, color:'var(--slate-600)' }}>
                <span>👤 {aluno.nome}</span>
                <span>📅 {t.ultima_atividade ? t.ultima_atividade.split('T')[0] : '—'}</span>
                <span>📊 {t.respondidas}/{t.total_questoes} questões</span>
                {t.tentativas?.length > 0 && (
                  <span>🔁 {t.tentativas.length} tentativa(s)</span>
                )}
                <span style={{ marginLeft:'auto', fontWeight:700, color: t.taxa_acerto>=80?'#10b981':t.taxa_acerto>=50?'#f59e0b':'#ef4444' }}>
                  {t.taxa_acerto >= 80 ? '🎉 Excelente!' : t.taxa_acerto >= 50 ? '👍 Bom desempenho' : '📚 Precisa revisar'}
                </span>
              </div>

              {/* Questões detalhadas */}
              <div style={{ border:'1px solid var(--slate-200)', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
                {(t.questoes_detalhes || []).map((q, qi) => (
                  <div key={qi} style={{
                    padding:'14px 18px',
                    borderBottom: qi < (t.questoes_detalhes.length-1) ? '1px solid var(--slate-100)' : 'none',
                    background: q.is_correct ? '#f0fdf4' : q.is_correct === false ? '#fff8f8' : 'white',
                  }}>
                    {/* Número + resultado */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background: q.is_correct ? '#10b981' : q.is_correct === false ? '#ef4444' : '#94a3b8',
                        color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13
                      }}>
                        {qi+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color: q.is_correct ? '#166534' : q.is_correct === false ? '#991b1b' : 'var(--slate-500)' }}>
                          {q.is_correct ? '✅ Correto' : q.is_correct === false ? '❌ Incorreto' : '⏳ Não respondido'}
                          {q.score !== null && <span style={{ fontWeight:400, marginLeft:8, opacity:.7 }}>({Math.round(q.score*100)}%)</span>}
                        </div>
                        <div style={{ fontSize:11, color:'var(--slate-400)' }}>
                          {q.tipo} {q.data && <> · {q.data}</>} {q.hora && <>às {q.hora}</>}
                          {q.xp_ganho > 0 && <> · ⚡+{q.xp_ganho} XP</>}
                        </div>
                      </div>
                    </div>

                    {/* Enunciado */}
                    <div style={{ fontSize:13, background:'var(--slate-50)', padding:'8px 12px', borderRadius:8, marginBottom:8, lineHeight:1.6, color:'var(--slate-700)' }}>
                      <strong>Questão:</strong> {q.enunciado}
                    </div>

                    {/* Respostas */}
                    {q.resposta_aluno !== null && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                        <div style={{ padding:'8px 12px', borderRadius:8, background: q.is_correct?'#dcfce7':'#fee2e2', border:'1px solid '+(q.is_correct?'#a7f3d0':'#fca5a5') }}>
                          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3, color: q.is_correct?'#166534':'#991b1b' }}>
                            {q.is_correct ? '✅ Resposta do aluno (Correta)' : '❌ Resposta do aluno'}
                          </div>
                          <div style={{ fontSize:12, fontWeight:600, color: q.is_correct?'#166534':'#991b1b' }}>
                            {(() => {
                              const v = q.resposta_aluno;
                              if (v === null || v === undefined) return '—';
                              if (typeof v === 'boolean') return v ? 'Verdadeiro' : 'Falso';
                              if (typeof v === 'number' && q.alternativas) return String.fromCharCode(65+v)+') '+q.alternativas[v];
                              if (Array.isArray(v) && q.alternativas) return v.map(i => String.fromCharCode(65+i)+') '+q.alternativas[i]).join(', ');
                              return String(v);
                            })()}
                          </div>
                        </div>
                        {!q.is_correct && q.gabarito !== null && q.gabarito !== undefined && (
                          <div style={{ padding:'8px 12px', borderRadius:8, background:'#dcfce7', border:'1px solid #a7f3d0' }}>
                            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3, color:'#166534' }}>✅ Resposta Correta</div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#166534' }}>
                              {(() => {
                                const v = q.gabarito;
                                if (v === null || v === undefined) return '—';
                                if (typeof v === 'boolean') return v ? 'Verdadeiro' : 'Falso';
                                if (typeof v === 'number' && q.alternativas) return String.fromCharCode(65+v)+') '+q.alternativas[v];
                                if (Array.isArray(v) && q.alternativas) return v.map(i => String.fromCharCode(65+i)+') '+q.alternativas[i]).join(', ');
                                return String(v);
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Explicação */}
                    {q.explicacao && (
                      <div style={{ padding:'7px 12px', borderRadius:8, background:'#eff6ff', border:'1px solid #bfdbfe', fontSize:12, color:'#1d4ed8', marginBottom:6 }}>
                        <strong>💡 Explicação:</strong> {q.explicacao}
                      </div>
                    )}
                    {q.feedback_ia && (
                      <div style={{ padding:'7px 12px', borderRadius:8, background:'#f5f3ff', border:'1px solid #ddd6fe', fontSize:12, color:'#5b21b6' }}>
                        <strong>🤖 Feedback IA:</strong> {q.feedback_ia}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Histórico de tentativas */}
              {t.tentativas?.length > 1 && (
                <div style={{ marginTop:8, padding:'10px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid var(--slate-200)', fontSize:12 }}>
                  <div style={{ fontWeight:700, color:'var(--navy)', marginBottom:6 }}>🔁 Histórico de tentativas:</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {t.tentativas.map(tent => (
                      <span key={tent.numero} style={{ padding:'4px 10px', borderRadius:99, background:tent.taxa>=70?'#dcfce7':tent.taxa>=50?'#fef3c7':'#fee2e2', color:tent.taxa>=70?'#166534':tent.taxa>=50?'#92400e':'#991b1b', fontWeight:600 }}>
                        Tent. {tent.numero} ({tent.data}): {tent.taxa}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === 'evolucao' && (
        <Card>
          <div style={{ fontWeight:700, marginBottom:'1rem' }}>📈 Evolução do XP ao longo do tempo</div>
          {historico_xp.length > 0 ? (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'var(--slate-50)' }}>
                  <th style={{ padding:'8px 12px', textAlign:'left' }}>Data</th>
                  <th style={{ padding:'8px 12px', textAlign:'left' }}>XP Acumulado</th>
                  <th style={{ padding:'8px 12px', textAlign:'left' }}>Progresso</th>
                </tr></thead>
                <tbody>
                  {historico_xp.slice(-30).map((h,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--slate-100)' }}>
                      <td style={{ padding:'8px 12px' }}>{h.data}</td>
                      <td style={{ padding:'8px 12px', fontWeight:700 }}>⚡ {h.xp_acumulado}</td>
                      <td style={{ padding:'8px 12px', width:200 }}>
                        <BarraProgresso valor={h.xp_acumulado} max={Math.max(...historico_xp.map(x=>x.xp_acumulado))||1} cor="#f59e0b" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ color:'var(--slate-400)', textAlign:'center', padding:'2rem' }}>Ainda sem histórico de atividades.</div>}
        </Card>
      )}
    </div>
  );
}

// ── Vista: Relatório da Turma ─────────────────────────────────
function RelatorioTurma({ turmaId, onVoltar }) {
  const [data, setData] = useState(null);
  const [aba, setAba]   = useState('ranking');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/relatorios/turma/${turmaId}/completo`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [turmaId]);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'auto' }} /></div>;
  if (!data)   return null;

  const { turma, estatisticas: e={}, ranking=[], disciplinas=[] } = data || {};
  const dist = e?.distribuicao || { excelente:0, bom:0, regular:0, critico:0 };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <button onClick={onVoltar} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>🏫 {turma?.nome || 'Turma'}</h2>
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>Análise Coletiva da Turma</span>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <ExportBtn tipo="turma" id={turmaId} label="Exportar Excel" />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:'1.5rem' }}>
        <StatBox label="Alunos" value={(e?.total_alunos || 0)} cor="#3b82f6" />
        <StatBox label="Taxa Média" value={(e?.taxa_acerto_media || 0)+'%'} cor="#10b981" />
        <StatBox label="θ Médio" value={(e?.theta_medio || 0)} cor="#8b5cf6" />
        <StatBox label="Excelente" value={dist.excelente||0} sub="≥ 80%" cor="#10b981" />
        <StatBox label="Bom" value={dist.bom||0} sub="60-79%" cor="#3b82f6" />
        <StatBox label="Regular" value={dist.regular||0} sub="40-59%" cor="#f59e0b" />
        <StatBox label="Crítico" value={dist.critico||0} sub="< 40%" cor="#ef4444" />
      </div>

      {/* Distribuição visual */}
      <Card style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontWeight:700, marginBottom:'1rem', fontSize:14 }}>📊 Distribuição de Desempenho</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[['Excelente (≥80%)', dist.excelente||0, '#10b981'],
            ['Bom (60-79%)', dist.bom||0, '#3b82f6'],
            ['Regular (40-59%)', dist.regular||0, '#f59e0b'],
            ['Crítico (<40%)', dist.critico||0, '#ef4444']].map(([label, val, cor]) => (
            <BarraProgresso key={label} label={`${label}: ${val} alunos`}
              valor={val} max={(e?.total_alunos || 0)||1} cor={cor} />
          ))}
        </div>
      </Card>

      {/* Abas */}
      <div style={{ display:'flex', gap:4, marginBottom:'1rem', borderBottom:'2px solid var(--slate-200)' }}>
        {[['ranking','🏆 Ranking'],['trilhas','📚 Por Trilha']].map(([v,l]) => (
          <button key={v} onClick={() => setAba(v)} style={{
            padding:'8px 16px', border:'none', background:'none', cursor:'pointer',
            fontWeight: aba===v?800:400, color: aba===v?'var(--emerald)':'var(--slate-500)',
            borderBottom: aba===v?'2px solid var(--emerald)':'2px solid transparent', marginBottom:-2, fontSize:13,
          }}>{l}</button>
        ))}
      </div>

      {aba === 'ranking' && (
        <Card>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--slate-50)', borderBottom:'2px solid var(--slate-200)' }}>
                  {['#','Nome','Taxa Acerto','Nível TRI','Respostas','XP','Desempenho'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, fontSize:12, color:'var(--slate-600)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((a, i) => (
                  <tr key={a.id} style={{ borderBottom:'1px solid var(--slate-100)', background:i<3?'#fefce8':'white' }}>
                    <td style={{ padding:'10px 12px', fontWeight:700, color: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#92400e':'var(--slate-600)' }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </td>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{a.nome}</td>
                    <td style={{ padding:'10px 12px' }}><Badge valor={a.taxa_acerto} /></td>
                    <td style={{ padding:'10px 12px' }}><ThetaChip theta={a.theta} nivel={a.nivel} emoji={a.emoji} /></td>
                    <td style={{ padding:'10px 12px' }}>{a.total_respostas}</td>
                    <td style={{ padding:'10px 12px' }}>⚡{a.xp_total}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ fontSize:12, fontWeight:600, color: a.desempenho?.cor }}>{a.desempenho?.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {aba === 'trilhas' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {disciplinas.map(disc => (
            <div key={disc.id}>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:8, color:'var(--navy)' }}>📚 {disc.nome}</div>
              {disc.trilhas?.map(t => (
                <Card key={t.id} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, marginBottom:4 }}>{t.nome}</div>
                      <div style={{ fontSize:12, color:'var(--slate-500)', marginBottom:8 }}>
                        {t.alunos_participaram} alunos · {t.total_questoes} questões · {t.total_respostas_turma} respostas
                      </div>
                      <BarraProgresso valor={t.taxa_acerto_media} />
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <Badge valor={t.taxa_acerto_media} />
                      <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>{t.desempenho?.label}</div>
                    </div>
                  </div>
                  {/* Questões críticas */}
                  {t.questoes_criticas?.filter(q=>q.total>0).length > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--slate-100)' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:4 }}>⚠️ Questões Críticas desta Trilha:</div>
                      {t.questoes_criticas.filter(q=>q.total>0).map(q => (
                        <div key={q.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:3 }}>
                          <Badge valor={q.taxa} />
                          <span style={{ color:'var(--slate-600)' }}>{q.enunciado}...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────
export default function ProfRelatorios() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [vista, setVista]   = useState({ tipo: null, id: null });
  const [alunoSel, setAlunoSel] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/professor'),
      api.get('/turmas').catch(() => ({ data:{ turmas:[] } })),
    ]).then(([rRes, tRes]) => {
      setData(rRes.data);
      setTurmas(tRes.data.turmas || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;

  // Vistas detalhadas
  if (vista.tipo === 'trilha')  return <RelatorioTrilha trilhaId={vista.id} onVoltar={() => setVista({tipo:null,id:null})} />;
  if (vista.tipo === 'aluno')   return <RelatorioAluno  alunoId={vista.id}  onVoltar={() => setVista({tipo:null,id:null})} />;
  if (vista.tipo === 'turma')   return <RelatorioTurma  turmaId={vista.id}  onVoltar={() => setVista({tipo:null,id:null})} />;

  const { resumo, por_trilha=[], top_alunos=[], turmas_prof=[] } = data || {};

  return (
    <>
      <div className="page-header">
        <div className="page-title">📊 Relatórios</div>
        <div className="page-sub">Análise completa de desempenho · Trilhas · Alunos · Turmas · Exportação Excel</div>
      </div>

      {/* Resumo Geral */}
      {resumo && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:'2rem' }}>
          <StatBox label="Disciplinas" value={resumo.total_disciplinas} cor="#3b82f6" />
          <StatBox label="Trilhas" value={resumo.total_trilhas} cor="#10b981" />
          <StatBox label="Questões" value={resumo.total_questoes} cor="#8b5cf6" />
          <StatBox label="Alunos" value={resumo.total_alunos} cor="#f59e0b" />
          <StatBox label="Respostas" value={(resumo?.total_respostas || 0)} cor="#6366f1" />
          <StatBox label="Taxa Geral" value={(resumo?.taxa_acerto_geral || 0)+'%'} cor={(resumo?.taxa_acerto_geral || 0)>=70?'#10b981':(resumo?.taxa_acerto_geral || 0)>=50?'#f59e0b':'#ef4444'} />
          <StatBox label="TRI Calibradas" value={resumo.questoes_calibradas} cor="#0891b2" />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>

        {/* Relatório por Turma */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:'1rem' }}>🏫 Relatório por Turma</div>
          {turmas_prof.length === 0 ? (
            <div style={{ color:'var(--slate-400)', textAlign:'center', padding:'1rem' }}>Nenhuma turma cadastrada.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {turmas_prof.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px',
                  border:'1px solid var(--slate-200)', borderRadius:8, background:'var(--slate-50)' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{t.nome}</div>
                    <div style={{ fontSize:12, color:'var(--slate-500)' }}>{t.total_alunos} alunos</div>
                  </div>
                  <button onClick={() => setVista({ tipo:'turma', id:t.id })} style={{
                    padding:'6px 14px', background:'var(--navy)', color:'white', border:'none',
                    borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Ver Análise →
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Relatório Individual do Aluno */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:'1rem' }}>👤 Relatório Individual</div>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
            <input
              placeholder="Buscar aluno pelo nome..."
              value={alunoSel}
              onChange={e => setAlunoSel(e.target.value)}
              style={{ flex:1, padding:'8px 12px', border:'1px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }}
            />
          </div>
          {top_alunos.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {top_alunos.filter(a => !alunoSel || a.nome.toLowerCase().includes(alunoSel.toLowerCase())).map(a => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                  border:'1px solid var(--slate-200)', borderRadius:8, background:'var(--slate-50)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{a.nome}</div>
                    <ThetaChip theta={a.theta} nivel={a.nivel} emoji={a.emoji} />
                  </div>
                  <Badge valor={a.taxa_acerto} />
                  <button onClick={() => setVista({ tipo:'aluno', id:a.id })} style={{
                    padding:'5px 12px', background:'var(--emerald)', color:'white', border:'none',
                    borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Ver →
                  </button>
                </div>
              ))}
            </div>
          ) : <div style={{ color:'var(--slate-400)', textAlign:'center', padding:'1rem' }}>Nenhum aluno com atividade ainda.</div>}
        </Card>

      </div>

      {/* Relatório por Trilha */}
      <div style={{ marginTop:'1.5rem' }}>
        <Card>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:'1rem' }}>📝 Relatório por Trilha</div>
          {por_trilha.length === 0 ? (
            <div style={{ color:'var(--slate-400)', textAlign:'center', padding:'1rem' }}>Nenhuma trilha com atividade ainda.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {por_trilha.map(t => (
                <div key={t.trilha_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px',
                  border:'1px solid var(--slate-200)', borderRadius:8, background:'var(--slate-50)', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{t.nome}</div>
                    <BarraProgresso valor={t.taxa_acerto} />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:12, color:'var(--slate-500)', textAlign:'center' }}>
                      <div style={{ fontWeight:700 }}>{t.total_questoes}</div>
                      <div>questões</div>
                    </div>
                    <div style={{ fontSize:12, color:'var(--slate-500)', textAlign:'center' }}>
                      <div style={{ fontWeight:700 }}>{t.total_respostas}</div>
                      <div>respostas</div>
                    </div>
                    <Badge valor={t.taxa_acerto} />
                    <button onClick={() => setVista({ tipo:'trilha', id:t.trilha_id })} style={{
                      padding:'6px 14px', background:'#6366f1', color:'white', border:'none',
                      borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      Detalhar →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

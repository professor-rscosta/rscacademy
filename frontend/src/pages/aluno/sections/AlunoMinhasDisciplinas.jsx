/**
 * Aluno → Minhas Turmas
 * Exibe: Turma → Disciplinas vinculadas → Trilhas de cada disciplina
 * ALUNO só visualiza. Sem auto-matrícula.
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

const NIVEL_COR = { fácil:'#10b981', intermediário:'#f59e0b', difícil:'#f97316', 'muito difícil':'#ef4444' };

export default function AlunoMinhasDisciplinas() {
  const [turmas, setTurmas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [turmaAberta, setAberta] = useState(null);

  useEffect(() => {
    api.get('/turmas/minhas')
      .then(r => setTurmas(r.data.turmas || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Detalhe da turma com disciplinas + trilhas ─────────────
  if (turmaAberta) {
    const disc = turmaAberta.disciplinas || [];
    return (
      <>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
          <button onClick={() => setAberta(null)} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13 }}>← Voltar</button>
          <div>
            <div className="page-title" style={{ marginBottom:0 }}>🏫 {turmaAberta.nome}</div>
            <div className="page-sub">{disc.length} disciplina(s) disponíveis</div>
          </div>
        </div>

        {disc.length === 0 ? (
          <div className="card">
            <EmptyState icon="📚" title="Nenhuma disciplina vinculada" sub="Seu professor ainda não vinculou disciplinas a esta turma." />
          </div>
        ) : (
          disc.map(d => (
            <div key={d.id} className="card" style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📚</div>
                <div>
                  <div style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{d.nome}</div>
                  <div style={{ fontSize:12, color:'var(--slate-500)' }}>{d.descricao} · {d.total_trilhas||0} trilha(s)</div>
                </div>
              </div>
              <div style={{ fontSize:12, color:'var(--slate-400)' }}>
                📋 Código: {d.codigo} · ⏱ {d.carga_horaria}h
              </div>
            </div>
          ))
        )}
      </>
    );
  }

  // ── Lista de turmas ─────────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <div className="page-title">Minhas Turmas</div>
        <div className="page-sub">Turmas em que você está matriculado e suas disciplinas</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : turmas.length === 0 ? (
        <div className="card">
          <EmptyState icon="🏫" title="Você não está em nenhuma turma" sub="Aguarde seu professor ou administrador matriculá-lo em uma turma." />
          <div style={{ padding:'0 1.5rem 1.5rem' }}>
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#92400e' }}>
              <strong>Como funciona?</strong><br/>
              Seu professor irá vincular você a uma turma. Após isso, você terá acesso automático às disciplinas, trilhas e avaliações dessa turma.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {turmas.map(t => {
            const disc = t.disciplinas || [];
            return (
              <div key={t.id} style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:14, overflow:'hidden', boxShadow:'var(--shadow)' }}>
                {/* Header */}
                <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700 }}>🏫 {t.nome}</div>
                      {t.descricao && <div style={{ fontSize:12, opacity:.65, marginTop:2 }}>{t.descricao}</div>}
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(16,185,129,0.25)', fontSize:11, fontWeight:600, color:'#34d399' }}>
                      ✅ Matriculado
                    </span>
                  </div>
                  <div style={{ fontSize:11, opacity:.5, marginTop:6 }}>
                    📅 Desde {t.joined_at?.split('T')[0]}
                  </div>
                </div>

                {/* Disciplinas */}
                <div style={{ padding:'1rem 1.5rem' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--slate-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
                    📚 Disciplinas ({disc.length})
                  </div>
                  {disc.length === 0 ? (
                    <div style={{ fontSize:13, color:'var(--slate-400)', padding:'8px 0' }}>
                      Nenhuma disciplina vinculada ainda.
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginBottom:12 }}>
                      {disc.map(d => (
                        <div key={d.id} style={{ padding:'10px 12px', background:'var(--slate-50)', borderRadius:8, border:'1px solid var(--slate-200)' }}>
                          <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', marginBottom:2 }}>{d.nome}</div>
                          <div style={{ fontSize:11, color:'var(--slate-400)' }}>
                            {d.total_trilhas||0} trilha(s) · {d.carga_horaria}h
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setAberta(t)} style={{ padding:'8px 18px', background:'var(--emerald)', color:'white', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
                    Ver detalhes →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

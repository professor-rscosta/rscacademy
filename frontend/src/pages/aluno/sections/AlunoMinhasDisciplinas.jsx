/**
 * Aluno → Minhas Turmas → Acessar Módulo da Disciplina
 */
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';
import AlunoModuloDisciplina from './AlunoModuloDisciplina';

export default function AlunoMinhasDisciplinas() {
  const [turmas, setTurmas]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [moduloAberto, setModulo] = useState(null); // { discId, discNome }

  useEffect(() => {
    api.get('/turmas/minhas')
      .then(r => setTurmas(r.data.turmas || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Abriu módulo de disciplina
  if (moduloAberto) {
    return (
      <AlunoModuloDisciplina
        disciplinaId={moduloAberto.discId}
        onVoltar={() => setModulo(null)}
      />
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Minhas Turmas</div>
        <div className="page-sub">Acesse o módulo interativo de cada disciplina</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : turmas.length === 0 ? (
        <div className="card">
          <EmptyState icon="🏫" title="Você não está em nenhuma turma" sub="Aguarde seu professor ou administrador matriculá-lo." />
          <div style={{ padding:'0 1.5rem 1.5rem' }}>
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#92400e' }}>
              <strong>Como funciona?</strong><br/>
              Seu professor irá vincular você a uma turma. Após isso, você terá acesso automático às disciplinas e seus módulos.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {turmas.map(t => {
            const disc = t.disciplinas || [];
            return (
              <div key={t.id} style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:14, overflow:'hidden', boxShadow:'var(--shadow)' }}>
                {/* Header turma */}
                <div style={{ padding:'1.25rem 1.5rem', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-head)', fontSize:17, fontWeight:700 }}>🏫 {t.nome}</div>
                      {t.descricao && <div style={{ fontSize:12, opacity:.65, marginTop:2 }}>{t.descricao}</div>}
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:50, background:'rgba(16,185,129,0.25)', fontSize:11, fontWeight:600, color:'#34d399', whiteSpace:'nowrap' }}>
                      ✅ Matriculado
                    </span>
                  </div>
                  <div style={{ fontSize:11, opacity:.5, marginTop:6 }}>
                    📅 Desde {t.joined_at?.split('T')[0]} · {disc.length} disciplina(s)
                  </div>
                </div>

                {/* Disciplinas */}
                <div style={{ padding:'1rem 1.5rem' }}>
                  {disc.length === 0 ? (
                    <div style={{ fontSize:13, color:'var(--slate-400)', padding:'8px 0' }}>
                      Nenhuma disciplina vinculada ainda.
                    </div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                      {disc.map(d => (
                        <div key={d.id} style={{
                          borderRadius:10, overflow:'hidden', border:'1px solid var(--slate-200)',
                          transition:'all .2s', cursor:'pointer',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
                          {/* Mini banner */}
                          <div style={{
                            height:56, background: d.banner
                              ? `url(${d.banner}) center/cover`
                              : 'linear-gradient(135deg,var(--navy) 0%,#2d5a9e 100%)',
                            position:'relative',
                          }}>
                            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.25)' }} />
                            <div style={{ position:'absolute', bottom:6, left:10, right:10, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                              <div style={{ fontSize:13, fontWeight:700, color:'white', lineHeight:1.2 }}>{d.nome}</div>
                              {d.codigo && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'rgba(255,255,255,.2)', color:'white' }}>{d.codigo}</span>}
                            </div>
                          </div>

                          <div style={{ padding:'10px 12px', background:'white' }}>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#ecfdf5', color:'#059669' }}>⏱ {d.carga_horaria}h</span>
                              {d.turno && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'#eff6ff', color:'#3b82f6' }}>{d.turno}</span>}
                              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--slate-100)', color:'var(--slate-600)' }}>🗺️ {d.total_trilhas||0} trilha(s)</span>
                            </div>
                            <button
                              onClick={() => setModulo({ discId: d.id, discNome: d.nome })}
                              style={{ width:'100%', padding:'8px 0', background:'var(--navy)', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                              📖 Acessar Módulo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

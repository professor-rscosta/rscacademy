import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { ProgressBar } from '../../../components/ui';
import AlunoDesafio from './AlunoDesafio';

const TIPO_ICONS = {
  multipla_escolha:'🔘', verdadeiro_falso:'✅', dissertativa:'📝',
  preenchimento:'✏️', associacao:'🔗', ordenacao:'🔢', upload_arquivo:'📎',
};

export default function AlunoTrilhas({ initialTrilhaId, onReady }) {
  const [disciplinas, setDiscs]     = useState([]);
  const [trilhaMap, setTrilhaMap]   = useState({});
  const [questoesMap, setQMap]      = useState({});
  const [progressMap, setProgMap]   = useState({});
  const [loading, setLoading]       = useState(true);
  const [trilhaAberta, setAberta]   = useState(null);
  const [discAberta, setDiscAberta] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, tRes] = await Promise.all([
        api.get('/disciplinas'),
        api.get('/trilhas'),
      ]);
      const discs   = dRes.data.disciplinas || [];
      const trilhas = tRes.data.trilhas || [];

      const tMap = {};
      for (const t of trilhas) {
        if (!tMap[t.disciplina_id]) tMap[t.disciplina_id] = [];
        tMap[t.disciplina_id].push(t);
      }

      const qMap = {}, pMap = {};
      await Promise.all(trilhas.map(async t => {
        try {
          const [qRes, pRes] = await Promise.all([
            api.get('/questoes?trilha_id='+t.id),
            api.get('/respostas/trilha/'+t.id),
          ]);
          qMap[t.id] = qRes.data.questoes || [];
          pMap[t.id] = pRes.data.progresso || 0;
        } catch { qMap[t.id] = []; pMap[t.id] = 0; }
      }));

      setDiscs(discs);
      setTrilhaMap(tMap);
      setQMap(qMap);
      setProgMap(pMap);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  // Auto-open trail if navigated from discipline module
  useEffect(() => {
    if (!initialTrilhaId || loading) return;
    // Find and open the trail
    for (const [discId, tList] of Object.entries(trilhaMap)) {
      const t = tList.find(tr => tr.id === Number(initialTrilhaId));
      if (t) {
        setAberta(t);
        setDiscAberta({ id: Number(discId) });
        onReady?.();
        break;
      }
    }
  }, [initialTrilhaId, loading, trilhaMap]);

  useEffect(() => { load(); }, []);

  const handleConcluir = () => {
    const tid = trilhaAberta?.id;
    setAberta(null);
    setDiscAberta(null);
    if (tid) {
      api.get('/respostas/trilha/'+tid)
        .then(r => setProgMap(p => ({ ...p, [tid]: r.data.progresso||0 })))
        .catch(() => {});
    }
  };

  // ── MODO DESAFIO ──────────────────────────────────────────
  if (trilhaAberta) {
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
          <button onClick={() => setAberta(null)} style={{ padding:'6px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:13, color:'var(--slate-600)' }}>← Voltar</button>
          <div>
            <div className="page-title" style={{ marginBottom:0 }}>{trilhaAberta.nome}</div>
            <div className="page-sub">{discAberta?.nome}</div>
          </div>
        </div>
        <AlunoDesafio trilha_id={trilhaAberta.id} onConcluir={handleConcluir} />
      </div>
    );
  }

  // ── LISTA DE TRILHAS ──────────────────────────────────────
  return (
    <>
      <div className="page-header">
        <div className="page-title">Trilhas & Desafios</div>
        <div className="page-sub">Responda questões gamificadas, ganhe XP e evolua seu nível!</div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : disciplinas.filter(d => (trilhaMap[d.id]||[]).length > 0).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗺️</div>
            <div style={{ fontWeight:500, color:'var(--slate-600)', marginBottom:4 }}>Nenhuma trilha disponível</div>
            <div style={{ fontSize:12 }}>Aguarde seu professor criar trilhas e questões</div>
          </div>
        </div>
      ) : (
        disciplinas.map(disc => {
          const trilhas = (trilhaMap[disc.id] || []).filter(t => t.ativo !== false);
          if (!trilhas.length) return null;
          return (
            <div key={disc.id} style={{ marginBottom:'1.5rem' }}>
              {/* Header da disciplina */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'0.75rem' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--emerald)', flexShrink:0 }} />
                <span style={{ fontFamily:'var(--font-head)', fontSize:15, fontWeight:600, color:'var(--navy)' }}>{disc.nome}</span>
                <span style={{ fontSize:12, color:'var(--slate-400)' }}>{trilhas.length} trilha(s)</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
                {trilhas.sort((a,b) => (a.ordem||0)-(b.ordem||0)).map(t => {
                  const questoes  = questoesMap[t.id] || [];
                  const progresso = progressMap[t.id] || 0;
                  const temTempo  = t.tempo_limite && t.tempo_limite > 0;
                  const temTent   = t.tentativas_maximas && t.tentativas_maximas > 0;
                  const concluida = progresso >= 100;
                  const iniciada  = progresso > 0 && !concluida;

                  return (
                    <div key={t.id} className="trail-card" style={{ opacity: questoes.length === 0 ? 0.65 : 1 }}>
                      <div className="trail-header">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div>
                            <h3>{t.nome}</h3>
                            <p>{t.descricao || (questoes.length+' questões')}</p>
                          </div>
                          {concluida && (
                            <span style={{ background:'rgba(16,185,129,0.2)', color:'#34d399', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:50, flexShrink:0 }}>
                              ✅ Completa
                            </span>
                          )}
                        </div>

                        {/* Badges de config */}
                        {(temTempo || temTent) && (
                          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                            {temTempo && (
                              <span style={{ padding:'2px 8px', borderRadius:50, background:'rgba(255,255,255,0.15)', fontSize:11, color:'rgba(255,255,255,0.9)' }}>
                                ⏱ {t.tempo_limite}min/questão
                              </span>
                            )}
                            {temTent && (
                              <span style={{ padding:'2px 8px', borderRadius:50, background:'rgba(255,255,255,0.15)', fontSize:11, color:'rgba(255,255,255,0.9)' }}>
                                🔄 {t.tentativas_maximas}x tentativas
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Progresso */}
                      <div className="trail-progress">
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ color:'var(--slate-500)' }}>
                            {concluida ? '✅ Concluída!' : iniciada ? 'Em progresso' : 'Não iniciada'}
                          </span>
                          <span style={{ fontWeight:700, color:'var(--emerald-dark)' }}>{progresso}%</span>
                        </div>
                        <ProgressBar value={progresso} />
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                          <span>❓ {questoes.length} questões</span>
                          <span>⭐ {t.xp_total || 0} XP</span>
                        </div>
                      </div>

                      {/* Tipos de questão */}
                      {questoes.length > 0 && (
                        <div style={{ padding:'0 1rem 0.5rem', display:'flex', gap:4, flexWrap:'wrap' }}>
                          {Object.entries(
                            questoes.reduce((acc, q) => { acc[q.tipo]=(acc[q.tipo]||0)+1; return acc; }, {})
                          ).map(([tipo, cnt]) => (
                            <span key={tipo} style={{ padding:'2px 8px', borderRadius:50, background:'var(--slate-100)', fontSize:11, color:'var(--slate-600)' }}>
                              {TIPO_ICONS[tipo]} {cnt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Botão */}
                      <div style={{ padding:'0 1rem 1rem' }}>
                        <button
                          onClick={() => { setAberta(t); setDiscAberta(disc); }}
                          disabled={questoes.length === 0}
                          style={{
                            width:'100%', padding:'10px', border:'none', borderRadius:8,
                            fontWeight:600, fontSize:13, cursor: questoes.length===0 ? 'not-allowed' : 'pointer',
                            opacity: questoes.length===0 ? 0.5 : 1,
                            background: questoes.length===0 ? 'var(--slate-200)' : concluida ? 'var(--sky)' : 'var(--emerald)',
                            color: questoes.length===0 ? 'var(--slate-500)' : 'white',
                            boxShadow: questoes.length > 0 ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
                          }}
                        >
                          {questoes.length === 0 ? '⏳ Sem questões ainda'
                           : concluida ? '🔁 Refazer Desafio'
                           : iniciada  ? '▶ Continuar'
                           : '🚀 Iniciar Desafio'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

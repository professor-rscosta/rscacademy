import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import CriarQuestaoModal from './CriarQuestaoModal';
import CurvaCaracteristica from '../../../components/tri/CurvaCaracteristica';
import MidiaRenderer from '../../../components/questoes/MidiaRenderer';

const TIPO_ICONS  = { multipla_escolha:'🔘', verdadeiro_falso:'✅', dissertativa:'📝', preenchimento:'✏️', associacao:'🔗', ordenacao:'🔢', upload_arquivo:'📎' };
const TIPO_LABELS = { multipla_escolha:'Múltipla Escolha', verdadeiro_falso:'V/F', dissertativa:'Dissertativa', preenchimento:'Preenchimento', associacao:'Associação', ordenacao:'Ordenação', upload_arquivo:'Upload' };

export default function ProfQuestoes({ autoCreate } = {}) {
  const { user } = useAuth();
  const [questoes, setQuestoes]   = useState([]);
  const [trilhas, setTrilhas]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroTrilha, setFiltro] = useState('');
  const [filtroTipo, setFTipo]    = useState('');
  const [busca, setBusca]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editQuestao, setEditQ]   = useState(null); // questão em edição
  const [trilhaSel, setTrilhaSel] = useState(null);
  const [curvaQ, setCurvaQ]       = useState(null);
  const [expandQ, setExpandQ]     = useState(null); // questão expandida
  const [alert, setAlert]         = useState(null);

  const load = async () => {
    try {
      const [qRes, tRes, dRes] = await Promise.all([
        api.get(`/questoes?professor_id=${user.id}`),
        api.get(`/trilhas?professor_id=${user.id}`),
        api.get('/disciplinas'),
      ]);
      const ts = tRes.data.trilhas || [];
      setQuestoes(qRes.data.questoes || []);
      setTrilhas(ts);
      setDiscs(dRes.data.disciplinas || []);
      if (ts.length > 0 && !trilhaSel) setTrilhaSel(ts[0].id);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (autoCreate) { setEditQ(null); setShowModal(true); } }, [autoCreate]);

  // Filtro combinado
  const filtered = questoes.filter(q => {
    if (filtroTrilha && String(q.trilha_id) !== filtroTrilha) return false;
    if (filtroTipo   && q.tipo !== filtroTipo) return false;
    if (busca && !(q.enunciado||'').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // ── Handlers CRUD ────────────────────────────────────────────
  const handleSalvar = (questao) => {
    setQuestoes(prev => {
      const exists = prev.find(q => q.id === questao.id);
      return exists
        ? prev.map(q => q.id === questao.id ? questao : q) // update
        : [questao, ...prev];                               // create
    });
    setShowModal(false);
    setEditQ(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta questão permanentemente?')) return;
    try {
      await api.delete(`/questoes/${id}`);
      setQuestoes(prev => prev.filter(q => q.id !== id));
      setAlert({ type:'success', msg:'Questão excluída com sucesso.' });
      setTimeout(() => setAlert(null), 2500);
    } catch(e) {
      setAlert({ type:'error', msg: 'Erro ao excluir: ' + (e.response?.data?.error || e.message) });
    }
  };

  const abrirCriar = () => {
    if (trilhas.length === 0) {
      alert('Crie uma trilha primeiro em "Trilhas" no menu lateral.');
      return;
    }
    setEditQ(null);
    setShowModal(true);
  };

  const abrirEditar = (q) => {
    setEditQ(q);
    setShowModal(true);
  };

  const trilhaNome = (tid) => trilhas.find(t => t.id === tid)?.nome || `Trilha #${tid}`;

  // Stats
  const stats = [
    { l:'Total', v:questoes.length, i:'❓', a:'accent-sky' },
    { l:'Calibradas', v:questoes.filter(q=>q.tri?.status==='calibrado').length, i:'✅', a:'accent-green' },
    { l:'Com Mídia', v:questoes.filter(q=>(q.midias||[]).length>0).length, i:'🖼️', a:'accent-amber' },
    { l:'XP Total', v:questoes.reduce((s,q)=>s+(q.xp||0),0), i:'⭐', a:'accent-coral' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-title">Banco de Questões</div>
        <div className="page-sub">CRUD completo · 7 tipos · TRI · Mídia enriquecida (imagem/vídeo)</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.5rem' }}>
        {stats.map(s => (
          <div key={s.l} className="stat-card">
            <div className={'stat-accent '+s.a}>{s.i}</div>
            <div className="stat-label">{s.l}</div>
            <div className="stat-value">{s.v}</div>
          </div>
        ))}
      </div>

      {alert && <div className={'alert alert-'+alert.type} style={{ marginBottom:'1rem' }}>{alert.msg}</div>}

      <div className="card">
        {/* Toolbar */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:'1rem' }}>
          {/* Busca por enunciado */}
          <input
            value={busca} onChange={e=>setBusca(e.target.value)}
            placeholder="🔍 Buscar no enunciado..."
            style={{ padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none', flex:'1', minWidth:180 }}
          />
          <select value={filtroTrilha} onChange={e=>setFiltro(e.target.value)}
            style={{ padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}>
            <option value="">📚 Todas as trilhas</option>
            {trilhas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select value={filtroTipo} onChange={e=>setFTipo(e.target.value)}
            style={{ padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none' }}>
            <option value="">🔍 Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-create" onClick={abrirCriar}>+ Nova Questão</button>
        </div>

        {/* Aviso sem trilhas */}
        {!loading && trilhas.length === 0 && (
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 16px', marginBottom:'1rem', fontSize:13, color:'#92400e' }}>
            ⚠️ Crie uma trilha em <strong>Trilhas</strong> antes de adicionar questões.
          </div>
        )}

        {/* Contador filtrado */}
        {!loading && questoes.length > 0 && (
          <div style={{ fontSize:12, color:'var(--slate-400)', marginBottom:8 }}>
            Exibindo {filtered.length} de {questoes.length} questões
            {(busca||filtroTrilha||filtroTipo) && (
              <button onClick={()=>{setBusca('');setFiltro('');setFTipo('');}} style={{ marginLeft:8, background:'none', border:'none', color:'var(--emerald-dark)', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>Limpar filtros</button>
            )}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❓</div>
            <div style={{ fontWeight:500, color:'var(--slate-600)', marginBottom:4 }}>
              {questoes.length === 0 ? 'Nenhuma questão criada ainda.' : 'Nenhum resultado para os filtros.'}
            </div>
            <div style={{ fontSize:12 }}>
              {questoes.length === 0 ? 'Clique em "+ Nova Questão" para começar.' : 'Tente limpar os filtros.'}
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(q => {
              const isExpanded = expandQ === q.id;
              const triStatusBg  = q.tri?.status==='calibrado' ? '#f0fdf4' : '#fffbeb';
              const triStatusCor = q.tri?.status==='calibrado' ? '#15803d' : '#92400e';
              const triStatusBd  = q.tri?.status==='calibrado' ? '#86efac' : '#fcd34d';
              const hasMidia = (q.midias||[]).length > 0;

              return (
                <div key={q.id} style={{ border:'1px solid var(--slate-200)', borderRadius:10, overflow:'hidden', background:'white' }}>
                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{TIPO_ICONS[q.tipo]}</span>

                    <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setExpandQ(isExpanded ? null : q.id)}>
                      <div style={{ fontSize:13.5, fontWeight:500, color:'var(--slate-800)', lineHeight:1.5, marginBottom:6 }}>
                        {(q.enunciado||'').length > 140 && !isExpanded
                          ? q.enunciado.slice(0,140)+'...'
                          : q.enunciado}
                      </div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ padding:'2px 7px', borderRadius:50, background:'var(--slate-100)', fontSize:11, color:'var(--slate-600)' }}>
                          {TIPO_LABELS[q.tipo]}
                        </span>
                        <span style={{ padding:'2px 7px', borderRadius:50, background:'rgba(245,158,11,0.1)', fontSize:11, color:'#92400e' }}>
                          ⭐ {q.xp} XP
                        </span>
                        <span style={{ padding:'2px 7px', borderRadius:50, fontSize:11, background:triStatusBg, color:triStatusCor, border:'1px solid '+triStatusBd }}>
                          TRI {q.tri?.modelo} b={q.tri?.b} {q.tri?.status==='calibrado'?'✅':'⏳'}
                        </span>
                        <span style={{ fontSize:11, color:'var(--slate-400)' }}>📚 {trilhaNome(q.trilha_id)}</span>
                        <span style={{ fontSize:11, color:'var(--slate-400)' }}>👥 {q.tri?.total_respostas||0} resp.</span>
                        {hasMidia && <span style={{ fontSize:11, color:'var(--sky)', fontWeight:500 }}>🖼️ Mídia</span>}
                        {(q.rag_tags||[]).length>0 && q.rag_tags.slice(0,2).map(t=>(
                          <span key={t} style={{ padding:'1px 6px', borderRadius:50, background:'rgba(14,165,233,0.08)', fontSize:10, color:'var(--sky)' }}>{t}</span>
                        ))}
                        <span style={{ fontSize:11, color:'var(--slate-300)', marginLeft:'auto' }}>
                          {isExpanded ? '▲ recolher' : '▼ expandir'}
                        </span>
                      </div>
                    </div>

                    {/* Ações CRUD */}
                    <div style={{ display:'flex', gap:5, flexShrink:0, flexWrap:'wrap' }}>
                      <button className="btn-sm btn-edit" onClick={() => abrirEditar(q)}
                        style={{ padding:'5px 10px', fontSize:12 }}>
                        ✏️ Editar
                      </button>
                      <button className="btn-sm btn-view" onClick={()=>setCurvaQ(curvaQ?.id===q.id?null:q)}
                        style={{ padding:'5px 10px', fontSize:12 }}>
                        📈 ICC
                      </button>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(q.id)}
                        style={{ padding:'5px 10px', fontSize:12 }}>
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Expansão: detalhes completos */}
                  {isExpanded && (
                    <div style={{ borderTop:'1px solid var(--slate-100)', padding:'14px', background:'var(--slate-50)' }}>

                      {/* Mídia da questão */}
                      {hasMidia && (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                            🖼️ Mídia Enriquecida
                          </div>
                          <MidiaRenderer midias={q.midias} />
                        </div>
                      )}

                      {/* Alternativas */}
                      {q.tipo === 'multipla_escolha' && Array.isArray(q.alternativas) && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Alternativas</div>
                          {q.alternativas.map((alt, i) => (
                            <div key={i} style={{ display:'flex', gap:8, padding:'6px 10px', borderRadius:6, marginBottom:4, background: q.gabarito===i?'#f0fdf4':'white', border:'1px solid '+(q.gabarito===i?'#86efac':'var(--slate-100)'), fontSize:13 }}>
                              <span style={{ fontWeight:700, color: q.gabarito===i?'#15803d':'var(--slate-400)', minWidth:18 }}>{'ABCD'[i]})</span>
                              <span style={{ color: q.gabarito===i?'#15803d':'var(--slate-700)', fontWeight: q.gabarito===i?600:400 }}>{alt}</span>
                              {q.gabarito===i && <span style={{ marginLeft:'auto', fontSize:11, color:'#15803d', fontWeight:600 }}>✓ Gabarito</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.tipo === 'verdadeiro_falso' && (
                        <div style={{ marginBottom:12, fontSize:13 }}>
                          <span style={{ fontWeight:600, color:'var(--slate-600)' }}>Gabarito: </span>
                          <span style={{ color: q.gabarito?'#15803d':'#b91c1c', fontWeight:700 }}>{q.gabarito?'✅ Verdadeiro':'❌ Falso'}</span>
                        </div>
                      )}

                      {(q.tipo==='preenchimento'||q.tipo==='dissertativa'||q.tipo==='upload_arquivo') && q.gabarito && (
                        <div style={{ marginBottom:12, fontSize:13 }}>
                          <span style={{ fontWeight:600, color:'var(--slate-600)' }}>
                            {q.tipo==='preenchimento'?'Resposta esperada:':'Palavras-chave: '}
                          </span>
                          <span style={{ color:'var(--emerald-dark)', fontWeight:500 }}>{String(q.gabarito)}</span>
                        </div>
                      )}

                      {q.tipo === 'associacao' && q.alternativas && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                          {['esquerda','direita'].map(col => (
                            <div key={col}>
                              <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:4 }}>{col==='esquerda'?'Coluna A':'Coluna B'}</div>
                              {(q.alternativas[col]||[]).map((item, i) => (
                                <div key={i} style={{ padding:'5px 8px', background:'white', borderRadius:5, border:'1px solid var(--slate-100)', fontSize:12, marginBottom:3 }}>
                                  {col==='esquerda'?'A':'B'}{i+1}) {item}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.tipo === 'ordenacao' && Array.isArray(q.alternativas) && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:4 }}>Itens (ordem embaralhada)</div>
                          {q.alternativas.map((item, i) => (
                            <div key={i} style={{ padding:'5px 8px', background:'white', borderRadius:5, border:'1px solid var(--slate-100)', fontSize:12, marginBottom:3 }}>
                              {i+1}) {item}
                            </div>
                          ))}
                          {Array.isArray(q.gabarito) && (
                            <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>Ordem correta: [{q.gabarito.join(', ')}]</div>
                          )}
                        </div>
                      )}

                      {/* Tags RAG */}
                      {(q.rag_tags||[]).length > 0 && (
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:4 }}>
                          <span style={{ fontSize:11, color:'var(--slate-400)' }}>Tags RAG:</span>
                          {q.rag_tags.map(t => (
                            <span key={t} style={{ padding:'2px 7px', borderRadius:50, background:'rgba(14,165,233,0.08)', fontSize:11, color:'var(--sky)' }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Curva ICC */}
                  {curvaQ?.id === q.id && (
                    <div style={{ borderTop:'1px solid var(--slate-100)', padding:'12px 14px', background:'var(--slate-50)' }}>
                      <CurvaCaracteristica tri={q.tri} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <CriarQuestaoModal
          trilhas={trilhas}
          disciplinas={disciplinas}
          trilha_id_inicial={Number(trilhaSel) || Number(trilhas[0]?.id) || 0}
          questaoEdit={editQuestao}
          onClose={() => { setShowModal(false); setEditQ(null); }}
          onSalvar={handleSalvar}
        />
      )}
    </>
  );
}

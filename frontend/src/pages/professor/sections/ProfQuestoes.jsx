/**
 * ProfQuestoes — Banco de Questões Estruturado
 * Organizado por: Disciplina → Questões de Avaliação | Trilha → Questões de Gamificação
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../../../hooks/useApi';
import { useAuth } from '../../../context/AuthContext';
import CriarQuestaoModal from './CriarQuestaoModal';
import CurvaCaracteristica from '../../../components/tri/CurvaCaracteristica';
import MidiaRenderer from '../../../components/questoes/MidiaRenderer';

const TIPO_ICONS  = { multipla_escolha:'🔘', verdadeiro_falso:'✅', dissertativa:'📝', preenchimento:'✏️', associacao:'🔗', ordenacao:'🔢', upload_arquivo:'📎' };
const TIPO_LABELS = { multipla_escolha:'Múltipla Escolha', verdadeiro_falso:'V/F', dissertativa:'Dissertativa', preenchimento:'Preenchimento', associacao:'Associação', ordenacao:'Ordenação', upload_arquivo:'Upload' };
const NIVEL_COR   = { fácil:'#10b981', intermediário:'#f59e0b', difícil:'#ef4444' };

// ── Badge de uso ───────────────────────────────────────────────
function UsoBadge({ tipo_uso }) {
  const cfg = {
    trilha:    { bg:'#ecfdf5', cor:'#059669', icon:'🎮', label:'Trilha' },
    avaliacao: { bg:'#eff6ff', cor:'#1d4ed8', icon:'📊', label:'Avaliação' },
    ambos:     { bg:'#f5f3ff', cor:'#6d28d9', icon:'🔀', label:'Ambos' },
    banco:     { bg:'#f1f5f9', cor:'#64748b', icon:'🗃️', label:'Banco' },
  }[tipo_uso || 'banco'];
  return (
    <span style={{ padding:'2px 7px', borderRadius:99, background:cfg.bg, color:cfg.cor, fontSize:10, fontWeight:700, border:'1px solid '+cfg.cor+'33' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Card de questão ────────────────────────────────────────────
function QuestaoCard({ q, trilhaNome, discNome, onEditar, onDuplicar, onDeletar, onCurva, curvaAtiva }) {
  const [expandida, setExpand] = useState(false);
  const hasMidia = (q.midias || []).length > 0;
  const nivelCor = NIVEL_COR[q.nivel] || '#64748b';

  return (
    <div style={{ border:'1px solid var(--slate-200)', borderRadius:10, overflow:'hidden', background:'white', transition:'box-shadow .15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.07)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 14px' }}>
        <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{TIPO_ICONS[q.tipo] || '❓'}</span>

        <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setExpand(v => !v)}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--slate-800)', lineHeight:1.5, marginBottom:6 }}>
            {!expandida && q.enunciado?.length > 120 ? q.enunciado.slice(0,120)+'…' : q.enunciado}
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ padding:'2px 7px', borderRadius:99, background:'var(--slate-100)', fontSize:10, color:'var(--slate-600)', fontWeight:600 }}>
              {TIPO_LABELS[q.tipo]}
            </span>
            <UsoBadge tipo_uso={q.tipo_uso} />
            {q.nivel && (
              <span style={{ padding:'2px 7px', borderRadius:99, fontSize:10, fontWeight:600, background:nivelCor+'15', color:nivelCor }}>
                {q.nivel}
              </span>
            )}
            {q.xp > 0 && (
              <span style={{ padding:'2px 7px', borderRadius:99, background:'#fffbeb', fontSize:10, color:'#92400e', fontWeight:600 }}>
                ⭐ {q.xp} XP
              </span>
            )}
            {q.tri?.status === 'calibrado' && (
              <span style={{ padding:'2px 7px', borderRadius:99, background:'#f0fdf4', color:'#15803d', fontSize:10, fontWeight:600, border:'1px solid #86efac' }}>
                ✅ TRI Calibrada
              </span>
            )}
            {hasMidia && <span style={{ fontSize:10, color:'#0ea5e9', fontWeight:600 }}>🖼️ Mídia</span>}
            {(q.rag_tags||[]).slice(0,2).map(t => (
              <span key={t} style={{ padding:'1px 6px', borderRadius:99, background:'#e0f2fe', fontSize:10, color:'#0284c7' }}>{t}</span>
            ))}
            <span style={{ fontSize:10, color:'var(--slate-300)', marginLeft:'auto' }}>{expandida ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          <button onClick={() => onEditar(q)} title="Editar"
            style={{ padding:'5px 9px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, color:'#1d4ed8', cursor:'pointer', fontSize:12 }}>✏️</button>
          <button onClick={() => onDuplicar(q)} title="Duplicar"
            style={{ padding:'5px 9px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:6, color:'#6d28d9', cursor:'pointer', fontSize:12 }}>⧉</button>
          <button onClick={() => onCurva(q)} title="Curva TRI"
            style={{ padding:'5px 9px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:6, color:'#c2410c', cursor:'pointer', fontSize:12 }}>📈</button>
          <button onClick={() => onDeletar(q.id)} title="Excluir"
            style={{ padding:'5px 9px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', cursor:'pointer', fontSize:12 }}>🗑</button>
        </div>
      </div>

      {/* ── Expansão ── */}
      {expandida && (
        <div style={{ borderTop:'1px solid var(--slate-100)', padding:'12px 14px', background:'var(--slate-50)' }}>
          {hasMidia && <div style={{ marginBottom:12 }}><MidiaRenderer midias={q.midias} /></div>}

          {q.tipo === 'multipla_escolha' && Array.isArray(q.alternativas) && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Alternativas</div>
              {q.alternativas.map((alt, i) => (
                <div key={i} style={{ display:'flex', gap:8, padding:'5px 10px', borderRadius:6, marginBottom:3,
                  background: q.gabarito===i ? '#f0fdf4' : 'white',
                  border:'1px solid '+(q.gabarito===i ? '#86efac' : 'var(--slate-100)'), fontSize:12 }}>
                  <span style={{ fontWeight:700, color:q.gabarito===i?'#15803d':'var(--slate-400)', minWidth:18 }}>{'ABCD'[i]})</span>
                  <span style={{ color:q.gabarito===i?'#15803d':'var(--slate-700)', fontWeight:q.gabarito===i?600:400 }}>{alt}</span>
                  {q.gabarito===i && <span style={{ marginLeft:'auto', fontSize:10, color:'#15803d', fontWeight:700 }}>✓ Gabarito</span>}
                </div>
              ))}
            </div>
          )}

          {q.tipo === 'verdadeiro_falso' && (
            <div style={{ fontSize:12, color:'var(--slate-600)', marginBottom:8 }}>
              <strong>Gabarito:</strong> {q.gabarito ? '✅ Verdadeiro' : '❌ Falso'}
            </div>
          )}

          {q.explicacao && (
            <div style={{ padding:'8px 12px', background:'#eff6ff', borderRadius:8, border:'1px solid #bfdbfe', fontSize:12, color:'#1d4ed8', marginBottom:8 }}>
              <strong>💡 Explicação:</strong> {q.explicacao}
            </div>
          )}

          <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--slate-400)', flexWrap:'wrap' }}>
            {q.trilha_id && <span>🎮 {trilhaNome(q.trilha_id)}</span>}
            {discNome    && <span>📚 {discNome}</span>}
            <span>👥 {q.tri?.total_respostas||0} responderam</span>
            {q.tri?.b !== undefined && <span>TRI: b={q.tri.b} a={q.tri.a||1}</span>}
          </div>
        </div>
      )}

      {/* Curva TRI inline */}
      {curvaAtiva && <div style={{ borderTop:'1px solid var(--slate-100)', padding:'1rem' }}><CurvaCaracteristica questao={q} /></div>}
    </div>
  );
}

// ── Seção de categoria ──────────────────────────────────────────
function Secao({ titulo, cor, icone, questoes, total, collapsed, onToggle, children }) {
  return (
    <div style={{ border:'1px solid var(--slate-200)', borderRadius:12, overflow:'hidden', marginBottom:'1rem' }}>
      <div onClick={onToggle} style={{
        display:'flex', alignItems:'center', gap:10, padding:'11px 16px',
        background: collapsed ? 'var(--slate-50)' : cor+'18',
        borderBottom: collapsed ? 'none' : '1px solid '+cor+'33',
        cursor:'pointer', userSelect:'none',
      }}>
        <span style={{ fontSize:18 }}>{icone}</span>
        <div style={{ flex:1 }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{titulo}</span>
          <span style={{ fontSize:11, color:'var(--slate-400)', marginLeft:8 }}>({total} questão{total!==1?'ões':''})</span>
        </div>
        <span style={{ fontSize:12, color:'var(--slate-400)' }}>{collapsed ? '▼ expandir' : '▲ recolher'}</span>
      </div>
      {!collapsed && <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 }}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

// ── Toast notification (sem dependencias externas) ──────────
function showToast(msg, tipo) {
  var div = document.createElement('div');
  var isOk = tipo !== 'error';
  div.style.cssText = 'position:fixed;top:22px;right:22px;z-index:99999;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;color:white;background:'+(isOk?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#ef4444,#dc2626)')+';box-shadow:0 4px 20px rgba(0,0,0,.25);animation:toastIn .3s ease;max-width:320px;display:flex;align-items:center;gap:8px;';
  div.innerHTML = (isOk ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>') + '<span>' + msg + '</span>';
  var style = document.createElement('style');
  style.textContent = '@keyframes toastIn{from{transform:translateX(120%);opacity:0}to{transform:none;opacity:1}}';
  document.head.appendChild(style);
  document.body.appendChild(div);
  setTimeout(function(){ div.style.transition='opacity .3s'; div.style.opacity='0'; setTimeout(function(){ div.remove(); style.remove(); }, 350); }, 2800);
}

// ── SweetAlert confirm ───────────────────────────────────────
function confirmAlert(titulo, msg, onOk) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(2px)';
  overlay.innerHTML = '<div style="background:white;border-radius:20px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3);animation:swAlert .25s cubic-bezier(.34,1.56,.64,1)"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:1.25rem;text-align:center"><div style="font-size:42px;margin-bottom:6px">⚠️</div><div style="font-weight:800;font-size:17px;color:white">'+titulo+'</div></div><div style="padding:1.25rem;text-align:center"><p style="color:#475569;font-size:14px;margin:0 0 1.25rem;line-height:1.6">'+msg+'</p><div style="display:flex;gap:10px"><button id="ca-cancel" style="flex:1;padding:11px;border:2px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:#64748b">❌ Cancelar</button><button id="ca-ok" style="flex:2;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(239,68,68,.4)">🗑️ Sim, excluir</button></div></div></div><style>@keyframes swAlert{from{transform:scale(.85) translateY(20px);opacity:0}to{transform:none;opacity:1}}</style>';
  document.body.appendChild(overlay);
  overlay.querySelector('#ca-cancel').onclick = function(){ overlay.remove(); };
  overlay.querySelector('#ca-ok').onclick = function(){ overlay.remove(); onOk(); };
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
}


export default function ProfQuestoes({ autoCreate } = {}) {
  const { user } = useAuth();
  const [questoes, setQuestoes]   = useState([]);
  const [trilhas, setTrilhas]     = useState([]);
  const [disciplinas, setDiscs]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const [filtroUso, setFUso]      = useState('');      // trilha|avaliacao|ambos|banco
  const [filtroTipo, setFTipo]    = useState('');      // tipo questão
  const [filtroDisc, setFDisc]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editQuestao, setEditQ]   = useState(null);
  const [curvaQ, setCurvaQ]       = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const load = async () => {
    try {
      const [qRes, tRes, dRes] = await Promise.all([
        api.get(`/questoes?professor_id=${user.id}`),
        api.get(`/trilhas?professor_id=${user.id}`),
        api.get('/disciplinas'),
      ]);
      setQuestoes(qRes.data.questoes || []);
      setTrilhas(tRes.data.trilhas || []);
      setDiscs(dRes.data.disciplinas || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (autoCreate) { setEditQ(null); setShowModal(true); } }, [autoCreate]);

  const trilhaNome = (tid) => trilhas.find(t => t.id === Number(tid))?.nome || 'Trilha #'+tid;
  const discNome   = (did) => disciplinas.find(d => d.id === Number(did))?.nome || null;

  // ── Filtro combinado ─────────────────────────────────────────
  const filtered = useMemo(() => questoes.filter(q => {
    if (busca    && !(q.enunciado||'').toLowerCase().includes(busca.toLowerCase()) &&
                   !(q.rag_tags||[]).some(t=>t.toLowerCase().includes(busca.toLowerCase()))) return false;
    if (filtroUso  && q.tipo_uso !== filtroUso && !(filtroUso==='trilha'&&!q.tipo_uso)) return false;
    if (filtroTipo && q.tipo !== filtroTipo) return false;
    if (filtroDisc && String(q.disciplina_id) !== filtroDisc) return false;
    return true;
  }), [questoes, busca, filtroUso, filtroTipo, filtroDisc]);

  // ── Organizar por categoria ──────────────────────────────────
  const { porDisc, porTrilha, banco } = useMemo(() => {
    const porDisc  = {};   // disciplina_id → questões de avaliação
    const porTrilha= {};   // trilha_id → questões de trilha
    const banco    = [];   // sem vínculo definido

    filtered.forEach(q => {
      const uso = q.tipo_uso || 'trilha';
      if (uso === 'avaliacao' || uso === 'ambos') {
        const key = q.disciplina_id ? String(q.disciplina_id) : '__sem__';
        if (!porDisc[key]) porDisc[key] = [];
        porDisc[key].push(q);
      }
      if (uso === 'trilha' || uso === 'ambos' || !q.tipo_uso) {
        const key = q.trilha_id ? String(q.trilha_id) : '__sem__';
        if (!porTrilha[key]) porTrilha[key] = [];
        porTrilha[key].push(q);
      }
      if (uso === 'banco') banco.push(q);
    });
    return { porDisc, porTrilha, banco };
  }, [filtered]);

  const toggleSection = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  // ── CRUD handlers ─────────────────────────────────────────────
  const handleSalvar = (q) => {
    setQuestoes(prev => {
      const exists = prev.find(x => x.id === q.id);
      return exists ? prev.map(x => x.id===q.id ? q : x) : [q, ...prev];
    });
    setShowModal(false); setEditQ(null);
    showToast(q.id ? 'Questao salva com sucesso!' : 'Questao criada com sucesso!', 'success');
  };

  const handleDuplicar = async (q) => {
    try {
      const { id, created_at, updated_at, tri, ...resto } = q;
      const payload = {
        ...resto,
        enunciado: '(Cópia) ' + q.enunciado,
        tri: { ...tri, status:'provisorio', total_respostas:0 },
      };
      const r = await api.post('/questoes', payload);
      setQuestoes(prev => [r.data.questao, ...prev]);
      setAlert({ type:'success', msg:'✅ Questão duplicada!' });
      setTimeout(() => setAlert(null), 2500);
    } catch(e) {
      setAlert({ type:'error', msg: 'Erro ao duplicar: '+(e.response?.data?.error||e.message) });
    }
  };

  const handleDelete = async (id) => {
    confirmAlert('Excluir Questão', 'Esta ação não pode ser desfeita. Deseja realmente excluir esta questão?', async () => {
    try {
      await api.delete(`/questoes/${id}`);
      setQuestoes(prev => prev.filter(q => q.id !== id));
      showToast('Questão excluída com sucesso!', 'success');
    } catch(e) {
      showToast('Erro ao excluir: '+(e.response?.data?.error||e.message), 'error');
    }
    }); // fim confirmAlert
  };

  const cardProps = (q) => ({
    q, trilhaNome, discNome: discNome(q.disciplina_id),
    onEditar:    () => { setEditQ(q); setShowModal(true); },
    onDuplicar:  () => handleDuplicar(q),
    onDeletar:   () => handleDelete(q.id),
    onCurva:     () => setCurvaQ(curvaQ?.id===q.id ? null : q),
    curvaAtiva:  curvaQ?.id === q.id,
  });

  // ── Stats ─────────────────────────────────────────────────────
  const stats = [
    { l:'Total',      v: questoes.length,                                            i:'🗃️' },
    { l:'Avaliação',  v: questoes.filter(q=>['avaliacao','ambos'].includes(q.tipo_uso)).length, i:'📊' },
    { l:'Trilhas',    v: questoes.filter(q=>q.tipo_uso==='trilha'||!q.tipo_uso).length,         i:'🎮' },
    { l:'Calibradas', v: questoes.filter(q=>q.tri?.status==='calibrado').length,     i:'✅' },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-title">Banco de Questões</div>
        <div className="page-sub">Organizado por disciplina e uso · 7 tipos · TRI · Mídia</div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:'1.25rem' }}>
        {stats.map(s => (
          <div key={s.l} className="stat-card">
            <div className="stat-accent">{s.i}</div>
            <div className="stat-label">{s.l}</div>
            <div className="stat-value">{s.v}</div>
          </div>
        ))}
      </div>


      {/* ── Toolbar ── */}
      <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:12, padding:'12px 16px', marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar no enunciado ou tags..."
            style={{ flex:1, minWidth:160, padding:'7px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none' }}
            onFocus={e=>e.target.style.borderColor='var(--emerald)'} onBlur={e=>e.target.style.borderColor='var(--slate-200)'} />

          <select value={filtroUso} onChange={e=>setFUso(e.target.value)}
            style={{ padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:12, outline:'none' }}>
            <option value="">Todos os usos</option>
            <option value="avaliacao">📊 Avaliação</option>
            <option value="trilha">🎮 Trilha</option>
            <option value="ambos">🔀 Ambos</option>
            <option value="banco">🗃️ Banco</option>
          </select>

          <select value={filtroDisc} onChange={e=>setFDisc(e.target.value)}
            style={{ padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:12, outline:'none', maxWidth:150 }}>
            <option value="">📚 Todas as disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>

          <select value={filtroTipo} onChange={e=>setFTipo(e.target.value)}
            style={{ padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:12, outline:'none', maxWidth:140 }}>
            <option value="">🔍 Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>

          {(busca||filtroUso||filtroTipo||filtroDisc) && (
            <button onClick={()=>{setBusca('');setFUso('');setFTipo('');setFDisc('');}}
              style={{ padding:'7px 12px', border:'1px solid #fecaca', borderRadius:8, background:'#fef2f2', color:'#dc2626', fontSize:12, cursor:'pointer' }}>
              ✕ Limpar
            </button>
          )}

          <button onClick={() => { setEditQ(null); setShowModal(true); }}
            style={{ padding:'8px 18px', background:'linear-gradient(135deg,var(--emerald),var(--emerald-dark))', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(16,185,129,.3)', marginLeft:'auto' }}>
            + Nova Questão
          </button>
        </div>

        {!loading && (
          <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:8 }}>
            Exibindo {filtered.length} de {questoes.length} questões
          </div>
        )}
      </div>

      {/* ── Lista organizada ── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗃️</div>
          <div style={{ fontWeight:600, color:'var(--slate-600)', marginBottom:4 }}>
            {questoes.length === 0 ? 'Banco vazio' : 'Nenhuma questão encontrada'}
          </div>
          <div style={{ fontSize:12, color:'var(--slate-400)' }}>
            {questoes.length === 0 ? 'Clique em "+ Nova Questão" para começar.' : 'Tente limpar os filtros.'}
          </div>
        </div>
      ) : (
        <>
          {/* ── SEÇÕES: Avaliação por Disciplina ── */}
          {Object.keys(porDisc).length > 0 && (
            <div style={{ marginBottom:'0.5rem' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase', letterSpacing:.8, marginBottom:8, paddingLeft:4 }}>
                📊 QUESTÕES DE AVALIAÇÃO
              </div>
              {Object.entries(porDisc).map(([did, qs]) => {
                const disc = disciplinas.find(d => String(d.id) === did);
                const nome = disc ? disc.nome : (did==='__sem__' ? 'Sem Disciplina' : 'Disciplina '+did);
                const key  = 'disc_'+did;
                return (
                  <Secao key={key} titulo={nome} icone="📚" cor="#1d4ed8" total={qs.length}
                    collapsed={!!collapsed[key]} onToggle={() => toggleSection(key)}>
                    {qs.map(q => <QuestaoCard key={q.id} {...cardProps(q)} />)}
                  </Secao>
                );
              })}
            </div>
          )}

          {/* ── SEÇÕES: Trilha por trilha ── */}
          {Object.keys(porTrilha).length > 0 && (
            <div style={{ marginBottom:'0.5rem' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase', letterSpacing:.8, marginBottom:8, paddingLeft:4, marginTop: Object.keys(porDisc).length>0 ? '1rem' : 0 }}>
                🎮 QUESTÕES DE TRILHA
              </div>
              {Object.entries(porTrilha).map(([tid, qs]) => {
                const nome = tid==='__sem__' ? 'Sem Trilha' : trilhaNome(tid);
                const key  = 'trilha_'+tid;
                return (
                  <Secao key={key} titulo={nome} icone="🗺️" cor="#059669" total={qs.length}
                    collapsed={!!collapsed[key]} onToggle={() => toggleSection(key)}>
                    {qs.map(q => <QuestaoCard key={q.id} {...cardProps(q)} />)}
                  </Secao>
                );
              })}
            </div>
          )}

          {/* ── Banco geral ── */}
          {banco.length > 0 && (
            <Secao titulo="Banco Geral" icone="🗃️" cor="#64748b" total={banco.length}
              collapsed={!!collapsed['banco']} onToggle={() => toggleSection('banco')}>
              {banco.map(q => <QuestaoCard key={q.id} {...cardProps(q)} />)}
            </Secao>
          )}
        </>
      )}

      {/* ── Modal criar/editar ── */}
      {showModal && (
        <CriarQuestaoModal
          trilhas={trilhas}
          disciplinas={disciplinas}
          trilha_id_inicial={trilhas[0]?.id || 0}
          questaoEdit={editQuestao}
          onClose={() => { setShowModal(false); setEditQ(null); }}
          onSalvar={handleSalvar}
        />
      )}
    </>
  );
}

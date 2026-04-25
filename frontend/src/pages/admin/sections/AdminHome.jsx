/**
 * AdminHome — Dashboard Administrativo completo e redesenhado
 * Stats expandidos + botões de navegação funcionais + turmas overview
 */
import { useEffect, useState } from 'react';
import api from '../../../hooks/useApi';

// ── Componente de stat card grande ───────────────────────────
function BigStat({ icon, value, label, sub, cor, bg, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'white', border:'1.5px solid var(--slate-200)', borderRadius:14,
        padding:'1.25rem', display:'flex', flexDirection:'column', gap:6,
        cursor: onClick ? 'pointer' : 'default', transition:'all .18s',
        boxShadow:'0 2px 8px rgba(0,0,0,.05)',
      }}
      onMouseEnter={e => { if(onClick){ e.currentTarget.style.borderColor=cor; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; }}}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--slate-200)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'; }}>
      <div style={{ width:44, height:44, borderRadius:12, background:bg,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:2 }}>
        {icon}
      </div>
      <div style={{ fontFamily:'var(--font-head)', fontSize:32, fontWeight:700, color:cor, lineHeight:1 }}>{value}</div>
      <div style={{ fontWeight:600, fontSize:12, color:'var(--slate-600)', textTransform:'uppercase', letterSpacing:.5 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:-2 }}>{sub}</div>}
    </div>
  );
}

// ── Botão de ação rápida redesenhado ─────────────────────────
function ActionCard({ icon, title, desc, badge, badgeColor, cor, bg, bd, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'white', border:'2px solid '+(bd||'var(--slate-200)'),
        borderRadius:14, padding:'1.25rem 1.25rem 1.1rem', cursor:'pointer',
        transition:'all .18s', position:'relative', overflow:'hidden',
        boxShadow:'0 2px 8px rgba(0,0,0,.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=cor; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=bd||'var(--slate-200)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'; }}>
      
      {/* Barra de cor superior */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:cor, borderRadius:'14px 14px 0 0' }} />
      
      {badge !== undefined && badge !== null && (
        <div style={{ position:'absolute', top:12, right:12, background:badgeColor||cor,
          color:'white', borderRadius:50, fontSize:10, fontWeight:700, padding:'2px 8px', minWidth:20, textAlign:'center' }}>
          {badge}
        </div>
      )}

      <div style={{ width:46, height:46, borderRadius:12, background:bg,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:10 }}>
        {icon}
      </div>
      <div style={{ fontFamily:'var(--font-head)', fontSize:14, fontWeight:700, color:'var(--navy)', marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--slate-500)', lineHeight:1.4 }}>{desc}</div>
      <div style={{ marginTop:10, fontSize:11, color:cor, fontWeight:600 }}>Acessar →</div>
    </div>
  );
}

// ── Linha de turma no overview ────────────────────────────────
function TurmaRow({ turma, discs }) {
  const discCount = discs.filter(d => turma.disciplina_ids?.includes(d.id)).length;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
      borderBottom:'1px solid var(--slate-50)', transition:'background .1s' }}
      onMouseEnter={e => e.currentTarget.style.background='var(--slate-50)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,var(--navy),var(--navy-mid))',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
        🏫
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {turma.nome}
        </div>
        <div style={{ fontSize:11, color:'var(--slate-400)' }}>
          {turma.total_alunos||0} aluno(s) · {discCount} disciplina(s)
        </div>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <span style={{ padding:'2px 8px', borderRadius:50, background:'rgba(16,185,129,.1)',
          color:'var(--emerald-dark)', fontSize:10, fontWeight:600, border:'1px solid rgba(16,185,129,.2)' }}>
          Ativa
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function AdminHome({ onNavigate }) {
  const [stats, setStats]   = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [discs, setDiscs]   = useState([]);
  const [loading, setLd]    = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/disciplinas'),
      api.get('/turmas'),
    ]).then(([uRes, dRes, tRes]) => {
      const users  = uRes.data.users || [];
      const turmasData = tRes.data.turmas || [];
      const discData   = dRes.data.disciplinas || [];

      setStats({
        total:       users.length,
        ativos:      users.filter(u => u.status === 'ativo').length,
        pendentes:   users.filter(u => u.status === 'pendente').length,
        professores: users.filter(u => u.perfil === 'professor').length,
        alunos:      users.filter(u => u.perfil === 'aluno').length,
        disciplinas: discData.length,
        turmas:      turmasData.length,
        totalAlunos: turmasData.reduce((s, t) => s + (t.total_alunos||0), 0),
      });
      setTurmas(turmasData.slice(0, 6));
      setDiscs(discData);
    }).catch(console.error).finally(() => setLd(false));
  }, []);

  const nav = (section) => onNavigate?.(section);
  const val = (v) => loading ? '...' : (v ?? 0);

  return (
    <>
      {/* ── Cabeçalho ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem', flexWrap:'wrap', gap:10 }}>
        <div>
          <div className="page-title">Dashboard Administrativo</div>
          <div className="page-sub">Gestão total da plataforma RSC Academy</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {stats?.pendentes > 0 && (
            <button onClick={() => nav('aprovacoes')}
              style={{ padding:'8px 16px', background:'#fffbeb', border:'1.5px solid #fcd34d',
                borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, color:'#92400e',
                display:'flex', alignItems:'center', gap:6 }}>
              ⏳ {stats.pendentes} pendente{stats.pendentes>1?'s':''}
            </button>
          )}
          <button onClick={() => nav('usuarios')}
            style={{ padding:'8px 16px', background:'var(--emerald)', border:'none',
              borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, color:'white',
              boxShadow:'0 3px 10px rgba(16,185,129,.3)' }}>
            + Novo Usuário
          </button>
        </div>
      </div>

      {/* ── ALERTA DE PENDENTES ── */}
      {stats?.pendentes > 0 && (
        <div onClick={() => nav('aprovacoes')} style={{ background:'#fffbeb', border:'1.5px solid #fcd34d',
          borderRadius:12, padding:'12px 16px', marginBottom:'1.5rem', cursor:'pointer',
          display:'flex', alignItems:'center', gap:12, transition:'all .15s' }}
          onMouseEnter={e => e.currentTarget.style.background='#fef3c7'}
          onMouseLeave={e => e.currentTarget.style.background='#fffbeb'}>
          <span style={{ fontSize:20 }}>⏳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#92400e', fontSize:13 }}>
              {stats.pendentes} usuário{stats.pendentes>1?'s':''} aguardando aprovação
            </div>
            <div style={{ fontSize:11, color:'#b45309' }}>Clique para revisar as aprovações pendentes</div>
          </div>
          <span style={{ fontSize:14, color:'#92400e' }}>→</span>
        </div>
      )}

      {/* ── STATS: Usuários ── */}
      <div style={{ marginBottom:'0.5rem' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase',
          letterSpacing:1, marginBottom:'0.875rem' }}>👥 Usuários</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.875rem' }}>
          <BigStat icon="👥" value={val(stats?.total)} label="Total de Usuários"
            sub={`${val(stats?.ativos)} ativos`} cor="#0284c7" bg="#f0f9ff"
            onClick={() => nav('usuarios')} />
          <BigStat icon="👨‍🏫" value={val(stats?.professores)} label="Professores"
            sub="perfil professor" cor="#10b981" bg="#f0fdf4"
            onClick={() => nav('usuarios')} />
          <BigStat icon="👨‍🎓" value={val(stats?.alunos)} label="Alunos"
            sub={`${val(stats?.totalAlunos)} matriculados`} cor="#8b5cf6" bg="#faf5ff"
            onClick={() => nav('usuarios')} />
          <BigStat icon="⏳" value={val(stats?.pendentes)} label="Pendentes"
            sub="aguardando aprovação" cor="#f59e0b" bg="#fffbeb"
            onClick={() => nav('aprovacoes')} />
        </div>
      </div>

      {/* ── STATS: Acadêmico ── */}
      <div style={{ marginBottom:'1.5rem', marginTop:'1rem' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase',
          letterSpacing:1, marginBottom:'0.875rem' }}>🎓 Acadêmico</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'0.875rem' }}>
          <BigStat icon="🏫" value={val(stats?.turmas)} label="Turmas Ativas"
            sub="cadastradas" cor="#f97316" bg="#fff7ed"
            onClick={() => nav('turmas')} />
          <BigStat icon="📚" value={val(stats?.disciplinas)} label="Disciplinas"
            sub="cadastradas" cor="#0ea5e9" bg="#f0f9ff"
            onClick={() => nav('disciplinas')} />
          <BigStat icon="✅" value={val(stats?.ativos)} label="Usuários Ativos"
            sub="com acesso liberado" cor="#10b981" bg="#f0fdf4" />
        </div>
      </div>

      {/* ── AÇÕES RÁPIDAS ── */}
      <div style={{ marginBottom:'0.5rem' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase',
          letterSpacing:1, marginBottom:'0.875rem' }}>⚡ Ações Rápidas</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'0.875rem' }}>
          <ActionCard icon="👥" title="Gerenciar Usuários" desc="CRUD de professores e alunos. Editar, bloquear e excluir."
            cor="#0284c7" bg="#f0f9ff" bd="#bfdbfe"
            onClick={() => nav('usuarios')} />
          <ActionCard icon="✅" title="Aprovações Pendentes" desc="Revisar cadastros que aguardam aprovação para acessar a plataforma."
            badge={stats?.pendentes||0} badgeColor="#f59e0b"
            cor="#f59e0b" bg="#fffbeb" bd="#fcd34d"
            onClick={() => nav('aprovacoes')} />
          <ActionCard icon="📚" title="Disciplinas" desc="Visualizar todas as disciplinas cadastradas na plataforma."
            cor="#0ea5e9" bg="#f0f9ff" bd="#bae6fd"
            onClick={() => nav('disciplinas')} />
          <ActionCard icon="📈" title="Relatórios Globais" desc="Analytics do sistema. Desempenho geral, taxa de acerto e progresso."
            cor="#8b5cf6" bg="#faf5ff" bd="#d8b4fe"
            onClick={() => nav('relatorios')} />
        </div>
      </div>

      {/* ── OVERVIEW DE TURMAS ── */}
      {turmas.length > 0 && (
        <div style={{ marginTop:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.875rem' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-400)', textTransform:'uppercase', letterSpacing:1 }}>
              🏫 Turmas Cadastradas
            </div>
            <button onClick={() => nav('turmas')} style={{ fontSize:12, color:'var(--sky)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0 }}>
              Ver todas →
            </button>
          </div>
          <div style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:14,
            overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
              {turmas.map((t, i) => (
                <div key={t.id} style={{ borderBottom: i < turmas.length - 2 ? '1px solid var(--slate-100)':'none',
                  borderRight: i % 2 === 0 ? '1px solid var(--slate-100)':'none' }}>
                  <TurmaRow turma={t} discs={discs} />
                </div>
              ))}
            </div>
            {turmas.length === 0 && (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--slate-400)', fontSize:13 }}>
                Nenhuma turma cadastrada ainda.
              </div>
            )}
          </div>

          {/* Resumo de disciplinas por turma */}
          {discs.length > 0 && (
            <div style={{ marginTop:'1rem', background:'white', border:'1px solid var(--slate-200)',
              borderRadius:14, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--slate-100)',
                background:'var(--slate-50)', fontFamily:'var(--font-head)', fontSize:13, fontWeight:600, color:'var(--navy)' }}>
                📚 Disciplinas por Professor
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--navy)' }}>
                      {['Disciplina','Código','Carga Horária','Professor'].map(h => (
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10,
                          fontWeight:600, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:.5 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {discs.slice(0, 8).map((d, i) => (
                      <tr key={d.id} style={{ background: i%2===0?'white':'var(--slate-50)',
                        borderBottom:'1px solid var(--slate-100)' }}>
                        <td style={{ padding:'9px 14px', fontSize:13, fontWeight:500, color:'var(--navy)' }}>
                          📚 {d.nome}
                        </td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--slate-500)' }}>
                          {d.codigo || '—'}
                        </td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--slate-500)' }}>
                          {d.carga_horaria ? d.carga_horaria+'h' : '—'}
                        </td>
                        <td style={{ padding:'9px 14px', fontSize:12, color:'var(--slate-500)' }}>
                          {d.professor_nome || `Prof. #${d.professor_id}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

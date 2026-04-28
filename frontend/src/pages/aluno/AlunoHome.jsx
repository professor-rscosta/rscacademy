/**
 * AlunoHome — Hub central do aluno
 * UX instrucional: Turma → Módulos (Disciplinas, Trilhas, Avaliações, Atividades, Materiais)
 * Responsivo: mobile-first
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../hooks/useApi';

const NIVEL_LABELS = ['Iniciante','Básico','Intermediário','Avançado','Expert','Mestre','Lendário'];
const NIVEL_EMOJIS = ['🌱','📘','⚡','🔥','💎','👑','🏆'];
const NIVEL_CORS   = ['#64748b','#3b82f6','#10b981','#f59e0b','#8b5cf6','#f97316','#ef4444'];

function thetaToLevel(theta) {
  if (theta<=-2.5) return 0; if (theta<=-1.5) return 1; if (theta<=-0.5) return 2;
  if (theta<=0.5) return 3;  if (theta<=1.5) return 4;  if (theta<=2.5) return 5;
  return 6;
}

// ── Módulos acessíveis via hub ────────────────────────────────
const MODULOS = [
  { id:'disciplinas', icon:'📚', label:'Disciplinas', desc:'Conteúdo por matéria', cor:'#3b82f6', bg:'#eff6ff', bd:'#bfdbfe' },
  { id:'trilhas',     icon:'🗺️', label:'Trilhas',    desc:'Desafios e exercícios', cor:'#10b981', bg:'#f0fdf4', bd:'#86efac' },
  { id:'avaliacoes',  icon:'📝', label:'Avaliações', desc:'Provas e quizzes', cor:'#f59e0b', bg:'#fffbeb', bd:'#fcd34d' },
  { id:'atividades',  icon:'📋', label:'Atividades', desc:'Trabalhos e entregas', cor:'#8b5cf6', bg:'#faf5ff', bd:'#d8b4fe' },
  { id:'materiais',   icon:'📁', label:'Materiais',  desc:'PDFs, vídeos e links', cor:'#f97316', bg:'#fff7ed', bd:'#fed7aa' },
];

export default function AlunoHome({ onNavigate }) {
  const { user } = useAuth();
  const [turmas, setTurmas]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [atividades, setAtivs]  = useState([]);
  const [avaliacoes, setAvs]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [turmaIdx, setTurmaIdx] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/turmas/minhas'),
      api.get('/respostas/stats/'),
      api.get('/atividades'),
      api.get('/avaliacoes'),
    ]).then(([tRes, sRes, aRes, avRes]) => {
      setTurmas(tRes.data.turmas || []);
      setStats(sRes.data);
      setAtivs((aRes.data.atividades || []).filter(a => !a.minha_entrega || a.minha_entrega.status === 'rascunho').slice(0,3));
      const avs = (avRes.data.avaliacoes || []).filter(a => !a.tentativas_feitas || a.tentativas_feitas === 0).slice(0,3);
      setAvs(avs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const theta   = stats?.theta || 0;
  const nivel   = thetaToLevel(theta);
  const xp      = stats?.xp_total || 0;
  const acerto  = stats?.taxa_acerto || 0;
  const turma   = turmas[turmaIdx];
  const TITULOS = ['prof.','dr.','dra.','ms.','me.'];
  const partes  = user.nome.split(' ');
  const firstName = partes.find(p => !TITULOS.includes(p.toLowerCase().replace(',',''))) || partes[0];

  // Calcular progresso XP (simulado)
  const xpParaProximoNivel = [500,1000,2000,4000,7000,12000,20000];
  const xpAtual = xp % (xpParaProximoNivel[nivel] || 1000);
  const xpPct   = Math.min(100, Math.round(xpAtual / (xpParaProximoNivel[nivel] || 1000) * 100));

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:12, color:'var(--slate-400)' }}>
      <div className="spinner" style={{ width:40, height:40 }} />
      <span style={{ fontSize:14 }}>Carregando seu painel...</span>
    </div>
  );

  return (
    <div className="aluno-hub">

      {/* ── HERO: Boas-vindas + Nível ─────────────────────────── */}
      <div className="hub-hero">
        <div className="hub-hero-content">
          <div className="hub-greeting">
            <span className="hub-emoji">{NIVEL_EMOJIS[nivel]}</span>
            <div>
              <h1>Olá, {firstName}!</h1>
              <p>Continue de onde parou. Você está indo bem! 🚀</p>
            </div>
          </div>

          {/* Barra de XP + nível */}
          <div className="hub-xp-bar">
            <div className="hub-xp-info">
              <span className="hub-nivel" style={{ color: NIVEL_CORS[nivel] }}>
                {NIVEL_EMOJIS[nivel]} {NIVEL_LABELS[nivel]}
              </span>
              <span className="hub-xp-num">⭐ {xp.toLocaleString('pt-BR')} XP</span>
            </div>
            <div className="hub-xp-track">
              <div className="hub-xp-fill" style={{ width: xpPct+'%', background: NIVEL_CORS[nivel] }} />
            </div>
            <div className="hub-xp-sub">{xpPct}% para o próximo nível</div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="hub-mini-stats">
          <div className="hub-mini-stat">
            <span className="hub-mini-val">{stats?.total_respostas||0}</span>
            <span className="hub-mini-lbl">Questões</span>
          </div>
          <div className="hub-mini-stat">
            <span className="hub-mini-val">{acerto}%</span>
            <span className="hub-mini-lbl">Acerto</span>
          </div>
          <div className="hub-mini-stat">
            <span className="hub-mini-val">{turmas.length}</span>
            <span className="hub-mini-lbl">Turma(s)</span>
          </div>
        </div>
      </div>

      {/* ── TURMA SELECIONADA ─────────────────────────────────── */}
      {turmas.length === 0 ? (
        <div className="hub-no-turma">
          <div style={{ fontSize:48, marginBottom:12 }}>🏫</div>
          <h3>Você ainda não está em nenhuma turma</h3>
          <p>Aguarde seu professor matriculá-lo ou use um código de acesso.</p>
        </div>
      ) : (
        <>
          {/* Seletor de turma (se mais de uma) */}
          {turmas.length > 1 && (
            <div className="hub-turma-tabs">
              {turmas.map((t, i) => (
                <button key={t.id} onClick={() => setTurmaIdx(i)}
                  className={'hub-turma-tab' + (turmaIdx===i?' active':'')}>
                  🏫 {t.nome}
                </button>
              ))}
            </div>
          )}

          {/* Card da turma ativa */}
          {turma && (
            <div className="hub-turma-card">
              <div className="hub-turma-left">
                <div className="hub-turma-icon">🏫</div>
                <div>
                  <div className="hub-turma-nome">{turma.nome}</div>
                  <div className="hub-turma-meta">
                    {turma.descricao && <span>{turma.descricao}</span>}
                    <span>📚 {(turma.disciplinas||[]).length} disciplina(s)</span>
                  </div>
                </div>
              </div>
              <div className="hub-turma-right">
                <span className="hub-turma-badge">Turma Ativa</span>
              </div>
            </div>
          )}

          {/* ── GRID DE MÓDULOS ─────────────────────────────────── */}
          <div className="hub-section-title">
            <h2>Acesso Rápido</h2>
            <p>Toque em um módulo para começar</p>
          </div>

          <div className="hub-modulos-grid">
            {MODULOS.map(m => (
              <button key={m.id} onClick={() => onNavigate?.(m.id)} className="hub-modulo-card"
                style={{ '--mod-cor':m.cor, '--mod-bg':m.bg, '--mod-bd':m.bd }}>
                <div className="hub-modulo-icon">{m.icon}</div>
                <div className="hub-modulo-label">{m.label}</div>
                <div className="hub-modulo-desc">{m.desc}</div>
                <div className="hub-modulo-arrow">›</div>
              </button>
            ))}
          </div>

          {/* ── PENDÊNCIAS ─────────────────────────────────────── */}
          <div className="hub-pendencias">
            {/* Atividades pendentes */}
            {atividades.length > 0 && (
              <div className="hub-pend-col">
                <div className="hub-pend-header">
                  <span>📋 Atividades Pendentes</span>
                  <button onClick={() => onNavigate?.('atividades')} className="hub-pend-link">Ver todas →</button>
                </div>
                <div className="hub-pend-list">
                  {atividades.map(a => {
                    const vence = a.data_entrega && new Date(a.data_entrega) < new Date(Date.now()+86400000*3);
                    return (
                      <div key={a.id} className="hub-pend-item" onClick={() => onNavigate?.('atividades')}>
                        <div className="hub-pend-dot" style={{ background: vence?'#ef4444':'#8b5cf6' }} />
                        <div className="hub-pend-info">
                          <div className="hub-pend-nome">{a.titulo}</div>
                          <div className="hub-pend-meta">
                            {a.turma_nome && <span>🏫 {a.turma_nome}</span>}
                            {a.data_entrega && (
                              <span style={{ color:vence?'#ef4444':'var(--slate-400)' }}>
                                📅 {new Date(a.data_entrega).toLocaleDateString('pt-BR')}
                                {vence && ' ⚠️'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="hub-pend-pts">⭐ {a.pontos}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Avaliações disponíveis */}
            {avaliacoes.length > 0 && (
              <div className="hub-pend-col">
                <div className="hub-pend-header">
                  <span>📝 Avaliações Disponíveis</span>
                  <button onClick={() => onNavigate?.('avaliacoes')} className="hub-pend-link">Ver todas →</button>
                </div>
                <div className="hub-pend-list">
                  {avaliacoes.map(av => {
                    const vence = av.encerra_em && new Date(av.encerra_em) < new Date(Date.now()+86400000*3);
                    const TIPO_ICONS = { prova:'📝', trabalho:'📋', simulado:'🎯', quiz:'⚡', entrega:'📤' };
                    return (
                      <div key={av.id} className="hub-pend-item" onClick={() => onNavigate?.('avaliacoes')}>
                        <div className="hub-pend-dot" style={{ background: vence?'#ef4444':'#f59e0b' }} />
                        <div className="hub-pend-info">
                          <div className="hub-pend-nome">{TIPO_ICONS[av.tipo]||'📝'} {av.titulo}</div>
                          <div className="hub-pend-meta">
                            <span>⏱ {av.tempo_limite}min</span>
                            {av.encerra_em && <span style={{color:vence?'#ef4444':'var(--slate-400)'}}>📅 {new Date(av.encerra_em).toLocaleDateString('pt-BR')}{vence&&' ⚠️'}</span>}
                          </div>
                        </div>
                        <span className="hub-pend-badge" style={{ background:'#fffbeb', color:'#92400e' }}>Iniciar →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── ATALHOS ADICIONAIS ─────────────────────────────── */}
          <div className="hub-extras">
            {[
              { id:'boletim',    icon:'📊', label:'Boletim',      desc:'Veja suas notas' },
              { id:'gamificacao',icon:'🏆', label:'XP & Conquistas', desc:'Medalhas e ranking' },
              { id:'chatbot',    icon:'✨', label:'Lumi', desc:'Sua assistente virtual' },
              { id:'mural',      icon:'📌', label:'Mural',        desc:'Avisos da turma' },
            ].map(e => (
              <button key={e.id} onClick={() => onNavigate?.(e.id)} className="hub-extra-btn">
                <span className="hub-extra-icon">{e.icon}</span>
                <span className="hub-extra-label">{e.label}</span>
                <span className="hub-extra-desc">{e.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

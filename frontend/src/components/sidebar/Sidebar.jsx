/**
 * Sidebar — self-contained mobile/desktop navigation
 * Mobile behavior controlled 100% via inline styles (no CSS cascade issues)
 * Desktop: position:sticky, rendered inside dash-shell flex
 * Mobile:  position:fixed, slides in/out, managed by isOpen prop
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserProfileModal from '../ui/UserProfileModal';
import Logo from '../ui/Logo';

var NAVY       = '#0f1b35';
var NAVY_LIGHT = '#1a2d52';
var EMERALD    = 'rgba(16,185,129,0.22)';
var EMRLD_TXT  = '#34d399';

var initials = function(name) {
  return name.split(' ').slice(0, 2).map(function(w){ return w[0]; }).join('').toUpperCase();
};

var MENUS = {
  admin: [
    { section:'Painel',    items:[{id:'dashboard',   icon:'\uD83D\uDCCA', label:'Dashboard'}] },
    { section:'Usuarios',  items:[{id:'usuarios',    icon:'\uD83D\uDC65', label:'Gerenciar Usuarios'},{id:'aprovacoes', icon:'\u2705', label:'Aprovacoes Pendentes'}] },
    { section:'Academico', items:[
      {id:'disciplinas', icon:'\uD83D\uDCDA', label:'Disciplinas'},
      {id:'turmas',      icon:'\uD83C\uDFEB', label:'Turmas'},
      {id:'trilhas',     icon:'\uD83D\uDDFA\uFE0F', label:'Trilhas'},
      {id:'questoes',    icon:'\u2753', label:'Banco de Questoes'},
      {id:'avaliacoes',  icon:'\uD83D\uDCDD', label:'Avaliacoes'},
      {id:'atividades',  icon:'\uD83D\uDCCB', label:'Atividades'},
    ]},
    { section:'Conteudo',  items:[
      {id:'materiais',   icon:'\uD83D\uDCD8', label:'Hub de Aprendizagem'},
      {id:'mural',       icon:'\uD83D\uDCCC', label:'Mural de Avisos'},
      {id:'rag',         icon:'\uD83E\uDDE0', label:'Base RAG (IA)'},
      {id:'chatbot',     icon:'\u2728', label:'Lumi'},
    ]},
    { section:'Analise',   items:[
      {id:'relatorios',  icon:'\uD83D\uDCC8', label:'Relatorios Globais'},
      {id:'boletim',     icon:'\uD83D\uDCCB', label:'Boletim de Notas'},
    ]},
  ],
  professor: [
    { section:'Painel',    items:[{id:'dashboard',   icon:'\uD83D\uDCCA', label:'Dashboard'}] },
    { section:'Ensino',    items:[
      {id:'disciplinas',icon:'\uD83D\uDCDA', label:'Disciplinas'},
      {id:'trilhas',    icon:'\uD83D\uDDFA\uFE0F', label:'Trilhas'},
      {id:'questoes',   icon:'\u2753', label:'Banco de Questoes'},
      {id:'avaliacoes', icon:'\uD83D\uDCDD', label:'Avaliacoes'},
      {id:'atividades', icon:'\uD83D\uDCCB', label:'Atividades'},
    ]},
    { section:'Turmas',    items:[
      {id:'turmas',    icon:'\uD83C\uDFEB', label:'Minhas Turmas'},
      {id:'mural',     icon:'\uD83D\uDCCC', label:'Mural de Avisos'},
      {id:'materiais', icon:'\uD83D\uDCD8', label:'Hub de Aprendizagem'},
      {id:'rag',       icon:'\uD83E\uDDE0', label:'Base RAG (IA)'},
      {id:'chatbot',   icon:'\u2728', label:'Lumi'},
    ]},
    { section:'Analise',   items:[
      {id:'relatorios', icon:'\uD83D\uDCC8', label:'Relatorios TRI'},
      {id:'boletim',    icon:'\uD83D\uDCCB', label:'Boletim de Notas'},
    ]},
  ],
  aluno: [
    { section:'Inicio',     items:[{id:'dashboard',   icon:'\uD83C\uDFE0', label:'Inicio'}] },
    { section:'Estudos',    items:[
      {id:'disciplinas', icon:'\uD83D\uDCDA', label:'Minhas Turmas'},
      {id:'trilhas',     icon:'\uD83D\uDDFA\uFE0F', label:'Trilhas & Desafios'},
      {id:'avaliacoes',  icon:'\uD83D\uDCDD', label:'Avaliacoes'},
      {id:'atividades',  icon:'\uD83D\uDCCB', label:'Atividades'},
      {id:'materiais',   icon:'\uD83D\uDCD8', label:'Hub de Aprendizagem'},
    ]},
    { section:'Comunidade', items:[
      {id:'mural',   icon:'\uD83D\uDCCC', label:'Mural de Avisos'},
      {id:'chatbot', icon:'\u2728', label:'Lumi'},
    ]},
    { section:'Progresso',  items:[
      {id:'boletim',     icon:'\uD83D\uDCCB', label:'Meu Boletim'},
      {id:'relatorios',  icon:'\uD83D\uDCC8', label:'Meu Desempenho'},
      {id:'gamificacao', icon:'\uD83C\uDFC6', label:'XP & Conquistas'},
    ]},
  ],
};

export default function Sidebar({ active, setActive, isOpen, onClose }) {
  var auth = useAuth();
  var user = auth.user;
  var logout = auth.logout;
  var [showProfile, setShowProfile] = useState(false);
  var [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and on resize
  useEffect(function() {
    var check = function() {
      setIsMobile(window.innerWidth <= 768);
    };
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);

  var sections = MENUS[user.perfil] || [];

  var handleItemClick = function(id) {
    setActive(id);
    if (onClose) onClose();
  };

  // ── INLINE STYLE: sidebar element ──────────────────────────
  // Desktop: position relative (inside flex), sticky via CSS class
  // Mobile: position fixed, slides in/out via translateX
  var sidebarStyle;
  if (isMobile) {
    sidebarStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '82vw',
      maxWidth: '280px',
      minWidth: '220px',
      height: '100vh',
      zIndex: 9999,
      backgroundColor: NAVY,
      color: '#ffffff',
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transform: isOpen ? 'translateX(0)' : 'translateX(-110%)',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isOpen ? '8px 0 32px rgba(0,0,0,0.55)' : 'none',
      willChange: 'transform',
    };
  } else {
    sidebarStyle = {
      // Desktop: let CSS handle it (.sidebar class)
    };
  }

  return (
    <>
      {/* Overlay (mobile only) */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.52)',
            zIndex: 9998,
          }}
        />
      )}

      <aside className="sidebar" style={sidebarStyle}>
        <div className="sidebar-logo"><Logo small /></div>

        {sections.map(function(s) {
          return (
            <div key={s.section} className="sidebar-section">
              <div className="sidebar-section-label">{s.section}</div>
              {s.items.map(function(item) {
                return (
                  <div
                    key={item.id}
                    className={'sidebar-item' + (active===item.id?' active':'')}
                    onClick={function(){ handleItemClick(item.id); }}
                    style={isMobile ? {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '13px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: active===item.id ? EMRLD_TXT : 'rgba(255,255,255,0.85)',
                      backgroundColor: active===item.id ? EMERALD : 'transparent',
                      fontSize: '14px',
                      marginBottom: '2px',
                      minHeight: '44px',
                    } : undefined}
                  >
                    <span className="icon" style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="sidebar-footer" style={isMobile ? { marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' } : undefined}>
          <div className="user-card" style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }} onClick={function(){ setShowProfile(true); }}>
            <div className="user-avatar" style={{
              background: user && user.foto ? ('url('+user.foto+') center/cover') : undefined,
              backgroundSize: 'cover',
              fontSize: user && user.foto ? 0 : undefined,
              width: '34px', height: '34px', borderRadius: '50%',
              background: user && user.foto ? ('url('+user.foto+') center/cover') : 'linear-gradient(135deg, #10b981, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '13px', color: 'white', flexShrink: 0,
            }}>
              {!(user && user.foto) && initials(user.nome)}
            </div>
            <div className="user-info">
              <div className="name" style={{ fontSize:'13px', fontWeight:600, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.nome.split(' ')[0]}</div>
              <div className="role" style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center', gap:4 }}>
                {user.perfil}
                <span style={{ fontSize:9, opacity:.6 }}>&#9999;</span>
              </div>
            </div>
            <button className="btn-logout" onClick={function(e){ e.stopPropagation(); logout(); }} title="Sair">&#8617;</button>
          </div>
        </div>

        {showProfile && <UserProfileModal onClose={function(){ setShowProfile(false); }} />}
      </aside>
    </>
  );
}

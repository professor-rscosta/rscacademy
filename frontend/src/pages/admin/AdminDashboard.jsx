import { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import AdminHome        from './sections/AdminHome';
import AdminUsuarios    from './sections/AdminUsuarios';
import AdminAprovacoes  from './sections/AdminAprovacoes';
import AdminRelatorios  from './sections/AdminRelatorios';
import AdminDisciplinas from './sections/AdminDisciplinas';
import AdminTurmas      from './sections/AdminTurmas';

// Reutiliza componentes do professor — backend já autoriza admin via profOuAdmin
import ProfTrilhas    from '../professor/sections/ProfTrilhas';
import ProfQuestoes   from '../professor/sections/ProfQuestoes';
import ProfAvaliacoes from '../professor/sections/ProfAvaliacoes';
import ProfAtividades from '../professor/sections/ProfAtividades';
import ProfMateriais  from '../professor/sections/ProfMateriais';
import ProfMural      from '../professor/sections/ProfMural';
import ProfRAG        from '../professor/sections/ProfRAG';
import ProfBoletim    from '../professor/sections/ProfBoletim';

export default function AdminDashboard() {
  const [active, setActive]       = useState('dashboard');
  const [sidebarOpen, setSidebar] = useState(false);

  const navigate = (section) => { setActive(section); setSidebar(false); };

  const renderSection = () => {
    switch (active) {
      case 'dashboard':   return <AdminHome onNavigate={navigate} />;
      case 'usuarios':    return <AdminUsuarios />;
      case 'aprovacoes':  return <AdminAprovacoes />;
      case 'relatorios':  return <AdminRelatorios />;
      case 'disciplinas': return <AdminDisciplinas />;
      case 'turmas':      return <AdminTurmas />;
      case 'trilhas':     return <ProfTrilhas />;
      case 'questoes':    return <ProfQuestoes />;
      case 'avaliacoes':  return <ProfAvaliacoes />;
      case 'atividades':  return <ProfAtividades />;
      case 'materiais':   return <ProfMateriais />;
      case 'mural':       return <ProfMural />;
      case 'rag':         return <ProfRAG />;
      case 'chatbot':     return <AlunoChatbot />;
      case 'boletim':     return <ProfBoletim />;
      default:            return <AdminHome onNavigate={navigate} />;
    }
  };

  return (
    <div className="dash-shell">
      <div className={'sidebar-overlay'+(sidebarOpen?' open':'')} onClick={() => setSidebar(false)} />
      <div className={'sidebar'+(sidebarOpen?' open':'')}><Sidebar active={active} setActive={navigate} /></div>
      <main className="dash-main">
        <div className="mobile-topbar">
          <button className="mobile-hamburger" onClick={() => setSidebar(o=>!o)} aria-label="Menu">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-logo">RSC Academy — Admin</span>
          {active !== 'dashboard' && (
            <button onClick={() => navigate('dashboard')}
              style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer' }}>🏠</button>
          )}
        </div>
        {renderSection()}
      </main>
    </div>
  );
}

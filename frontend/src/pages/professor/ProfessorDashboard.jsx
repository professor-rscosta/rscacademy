import { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import ProfHome from './sections/ProfHome';
import ProfDisciplinas from './sections/ProfDisciplinas';
import ProfTrilhas from './sections/ProfTrilhas';
import ProfQuestoes from './sections/ProfQuestoes';
import ProfTurmas from './sections/ProfTurmas';
import ProfMural from './sections/ProfMural';
import ProfMateriais from './sections/ProfMateriais';
import ProfRelatorios from './sections/ProfRelatorios';
import ProfBoletim from './sections/ProfBoletim';
import AlunoChatbot from '../aluno/sections/AlunoChatbot';
import ProfAvaliacoes from './sections/ProfAvaliacoes';
import ProfAtividades from './sections/ProfAtividades';
import ProfRAG from './sections/ProfRAG';
import GenericSection from '../shared/GenericSection';

export default function ProfessorDashboard() {
  const [active, setActive] = useState('dashboard');
  const [action, setAction] = useState(null);
  const [sidebarOpen, setSidebar] = useState(false);

  // Called by ProfHome quick-action cards
  const handleNavigate = (section, act) => {
    setActive(section);
    if (act) {
      setAction(act);
      // Clear action after a tick so section can consume it once
      setTimeout(() => setAction(null), 300);
    }
  };

  const renderSection = () => {
    switch (active) {
      case 'dashboard':   return <ProfHome onNavigate={handleNavigate} />;
      case 'disciplinas': return <ProfDisciplinas autoCreate={action==='criar'} />;
      case 'trilhas':     return <ProfTrilhas autoCreate={action==='criar'} />;
      case 'questoes':    return <ProfQuestoes autoCreate={action==='criar'} />;
      case 'avaliacoes':  return <ProfAvaliacoes autoCreate={action==='criar'} />;
      case 'atividades':  return <ProfAtividades autoCreate={action==='criar'} />;
      case 'turmas':      return <ProfTurmas autoCreate={action==='criar'} />;
      case 'mural':       return <ProfMural autoCreate={action==='criar'} />;
      case 'materiais':   return <ProfMateriais />;
      case 'rag':         return <ProfRAG />;
      case 'chatbot':     return <AlunoChatbot />;
      case 'relatorios':  return <ProfRelatorios />;
      case 'boletim':     return <ProfBoletim />;
      default:            return <GenericSection title="Em desenvolvimento" sub="Próximas etapas" icon="🔧" />;
    }
  };

  return (
    <div className="dash-shell">
      <div className={'sidebar-overlay'+(sidebarOpen?' open':'')} onClick={() => setSidebar(false)} />
      <div className={'sidebar-shell'+(sidebarOpen?' open':'')}>
        <Sidebar active={active} setActive={(s) => { setAction(null); setActive(s); setSidebar(false); }} />
      </div>
      <main className="dash-main">
        <div className="mobile-topbar">
          <button className="mobile-hamburger" onClick={() => setSidebar(o=>!o)} aria-label="Menu">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-logo">RSC Academy</span>
          {active !== 'dashboard' && (
            <button onClick={() => { setAction(null); setActive('dashboard'); setSidebar(false); }} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer' }}>🏠</button>
          )}
        </div>
        {renderSection()}
      </main>
    </div>
  );
}

import { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import AlunoHome from './AlunoHome';
import AlunoTrilhas from './sections/AlunoTrilhas';
import AlunoAvaliacoes from './sections/AlunoAvaliacoes';
import AlunoAtividades from './sections/AlunoAtividades';
import AlunoMural from './sections/AlunoMural';
import AlunoMateriais from './sections/AlunoMateriais';
import AlunoRelatorios from './sections/AlunoRelatorios';
import AlunoChatbot from './sections/AlunoChatbot';
import AlunoMinhasDisciplinas from './sections/AlunoMinhasDisciplinas';
import AlunoGamificacao from './sections/AlunoGamificacao';
import AlunoBoletim from './sections/AlunoBoletim';
import GenericSection from '../shared/GenericSection';

export default function AlunoDashboard() {
  const [active, setActive]       = useState('dashboard');
  const [sidebarOpen, setSidebar] = useState(false);
  // deepNav: { trilhaId, avaliacaoId } para navegação direta da disciplina
  const [deepNav, setDeepNav]     = useState(null);

  const navigate = (section, params = null) => {
    setActive(section);
    setSidebar(false);
    setDeepNav(params);
  };

  const renderSection = () => {
    switch (active) {
      case 'dashboard':   return <AlunoHome onNavigate={navigate} />;
      case 'disciplinas': return <AlunoMinhasDisciplinas onNavigate={navigate} />;
      case 'trilhas':     return <AlunoTrilhas initialTrilhaId={deepNav?.trilhaId} onReady={() => setDeepNav(null)} />;
      case 'avaliacoes':  return <AlunoAvaliacoes initialAvaliacaoId={deepNav?.avaliacaoId} onReady={() => setDeepNav(null)} />;
      case 'atividades':  return <AlunoAtividades />;
      case 'mural':       return <AlunoMural />;
      case 'materiais':   return <AlunoMateriais />;
      case 'relatorios':  return <AlunoRelatorios />;
      case 'boletim':     return <AlunoBoletim />;
      case 'chatbot':     return <AlunoChatbot />;
      case 'gamificacao': return <AlunoGamificacao />;
      default:            return <GenericSection title="Em desenvolvimento" sub="Disponível em breve" icon="🔧" />;
    }
  };

  return (
    <>
      <div className={'sidebar-overlay'+(sidebarOpen?' open':'')} onClick={() => setSidebar(false)} />
      <div className={'sidebar-shell'+(sidebarOpen?' open':'')}><Sidebar active={active} setActive={(s) => navigate(s)} perfil="aluno" /></div>
      <div className="dash-shell">
      <main className="dash-main">
        <div className="mobile-topbar">
          <button className="mobile-hamburger" onClick={() => setSidebar(o => !o)} aria-label="Menu">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-logo">RSC Academy</span>
          {active !== 'dashboard' && (
            <button onClick={() => navigate('dashboard')} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer' }}>
              🏠
            </button>
          )}
        </div>
        {renderSection()}
      </main>
      </div>
    </>
  );
}

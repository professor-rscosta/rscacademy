import { useState } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import AdminHome from './sections/AdminHome';
import AdminUsuarios from './sections/AdminUsuarios';
import AdminAprovacoes from './sections/AdminAprovacoes';
import AdminRelatorios from './sections/AdminRelatorios';
import AdminDisciplinas from './sections/AdminDisciplinas';
import GenericSection from '../shared/GenericSection';

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
      case 'turmas':      return <GenericSection title="Turmas" sub="Visão global de todas as turmas" icon="🏫" />;
      default:            return <AdminHome onNavigate={navigate} />;
    }
  };

  return (
    <div className="dash-shell">
      {/* Overlay mobile */}
      <div className={'sidebar-overlay'+(sidebarOpen?' open':'')} onClick={() => setSidebar(false)} />

      {/* Sidebar */}
      <div className={'sidebar'+(sidebarOpen?' open':'')}>
        <Sidebar active={active} setActive={(s) => navigate(s)} />
      </div>

      <main className="dash-main">
        {/* Topbar mobile */}
        <div className="mobile-topbar">
          <button className="mobile-hamburger" onClick={() => setSidebar(o=>!o)} aria-label="Menu">
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-logo">RSC Academy — Admin</span>
          {active !== 'dashboard' && (
            <button onClick={() => navigate('dashboard')}
              style={{ background:'rgba(255,255,255,.12)', border:'none', color:'white', padding:'5px 10px', borderRadius:7, fontSize:12, cursor:'pointer' }}>
              🏠
            </button>
          )}
        </div>

        {renderSection()}
      </main>
    </div>
  );
}

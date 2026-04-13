import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';

const initials = (name) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const MENUS = {
  admin: [
    { section:'Painel',    items:[{id:'dashboard',   icon:'📊', label:'Dashboard'}] },
    { section:'Usuários',  items:[{id:'usuarios',    icon:'👥', label:'Gerenciar Usuários'},{id:'aprovacoes', icon:'✅', label:'Aprovações Pendentes'}] },
    { section:'Acadêmico', items:[
      {id:'disciplinas', icon:'📚', label:'Disciplinas'},
      {id:'turmas',      icon:'🏫', label:'Turmas'},
      {id:'trilhas',     icon:'🗺️', label:'Trilhas'},
      {id:'questoes',    icon:'❓', label:'Banco de Questões'},
      {id:'avaliacoes',  icon:'📝', label:'Avaliações'},
      {id:'atividades',  icon:'📋', label:'Atividades'},
    ]},
    { section:'Conteúdo',  items:[
      {id:'materiais',   icon:'📁', label:'Materiais Didáticos'},
      {id:'mural',       icon:'📌', label:'Mural de Avisos'},
      {id:'rag',         icon:'🧠', label:'Base RAG (IA)'},
    ]},
    { section:'Análise',   items:[
      {id:'relatorios',  icon:'📈', label:'Relatórios Globais'},
      {id:'boletim',     icon:'📋', label:'Boletim de Notas'},
    ]},
  ],
  professor: [
    { section:'Painel',    items:[{id:'dashboard',   icon:'📊', label:'Dashboard'}] },
    { section:'Ensino',    items:[
      {id:'disciplinas',icon:'📚', label:'Disciplinas'},
      {id:'trilhas',    icon:'🗺️', label:'Trilhas'},
      {id:'questoes',   icon:'❓', label:'Banco de Questões'},
      {id:'avaliacoes', icon:'📝', label:'Avaliações'},
      {id:'atividades', icon:'📋', label:'Atividades'},
    ]},
    { section:'Turmas',    items:[
      {id:'turmas',    icon:'🏫', label:'Minhas Turmas'},
      {id:'mural',     icon:'📌', label:'Mural de Avisos'},
      {id:'materiais', icon:'📁', label:'Materiais Didáticos'},
      {id:'rag', icon:'🧠', label:'Base RAG (IA)'},
    ]},
    { section:'Análise',   items:[{id:'relatorios', icon:'📈', label:'Relatórios TRI'},{id:'boletim', icon:'📋', label:'Boletim de Notas'}] },
  ],
  aluno: [
    { section:'Início',     items:[{id:'dashboard',   icon:'🏠', label:'Início'}] },
    { section:'Estudos',    items:[
      {id:'disciplinas', icon:'📚', label:'Minhas Turmas'},
      {id:'trilhas',     icon:'🗺️', label:'Trilhas & Desafios'},
      {id:'avaliacoes',  icon:'📝', label:'Avaliações'},
      {id:'atividades',  icon:'📋', label:'Atividades'},
      {id:'materiais',   icon:'📁', label:'Materiais'},
    ]},
    { section:'Comunidade', items:[
      {id:'mural',   icon:'📌', label:'Mural de Avisos'},
      {id:'chatbot', icon:'🤖', label:'Assistente IA'},
    ]},
    { section:'Progresso',  items:[
      {id:'boletim',     icon:'📋', label:'Meu Boletim'},
      {id:'relatorios',  icon:'📈', label:'Meu Desempenho'},
      {id:'gamificacao', icon:'🏆', label:'XP & Conquistas'},
    ]},
  ],
};

export default function Sidebar({ active, setActive }) {
  const { user, logout } = useAuth();
  const sections = MENUS[user.perfil] || [];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo"><Logo small /></div>
      {sections.map(s => (
        <div key={s.section} className="sidebar-section">
          <div className="sidebar-section-label">{s.section}</div>
          {s.items.map(item => (
            <div key={item.id} className={`sidebar-item ${active===item.id?'active':''}`} onClick={() => setActive(item.id)}>
              <span className="icon">{item.icon}</span>{item.label}
            </div>
          ))}
        </div>
      ))}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials(user.nome)}</div>
          <div className="user-info">
            <div className="name">{user.nome.split(' ')[0]}</div>
            <div className="role">{user.perfil}</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Sair">↩</button>
        </div>
      </div>
    </aside>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/login/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import AlunoDashboard from './pages/aluno/AlunoDashboard';

function PrivateRoute({ children, perfil }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /><p style={{color:'var(--slate-400)',fontSize:14}}>Carregando RSC Academy...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (perfil && user.perfil !== perfil) return <Navigate to={`/${user.perfil}/dashboard`} replace />;
  return children;
}

function RedirectByRole() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.perfil}/dashboard`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<PrivateRoute perfil="admin"><AdminDashboard /></PrivateRoute>} />
        <Route path="/professor/*" element={<PrivateRoute perfil="professor"><ProfessorDashboard /></PrivateRoute>} />
        <Route path="/aluno/*" element={<PrivateRoute perfil="aluno"><AlunoDashboard /></PrivateRoute>} />
        <Route path="*" element={<RedirectByRole />} />
      </Routes>
    </AuthProvider>
  );
}

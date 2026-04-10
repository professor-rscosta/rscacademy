import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'aluno' });
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleLogin() {
    if (!form.email || !form.senha) return setAlert({ type: 'error', msg: 'Preencha e-mail e senha.' });
    setLoading(true); setAlert(null);
    try {
      const user = await login(form.email, form.senha);
      navigate(`/${user.perfil}/dashboard`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login.';
      setAlert({ type: err.response?.status === 403 ? 'warning' : 'error', msg });
    } finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!form.nome || !form.email || !form.senha || !form.perfil)
      return setAlert({ type: 'error', msg: 'Preencha todos os campos.' });
    if (form.senha.length < 6)
      return setAlert({ type: 'error', msg: 'Senha deve ter ao menos 6 caracteres.' });
    setLoading(true); setAlert(null);
    try {
      await register(form);
      setAlert({ type: 'success', msg: '✅ Cadastro realizado! Aguarde a aprovação do administrador.' });
      setTimeout(() => { setTab('login'); setAlert(null); setForm(f => ({ ...f, nome: '', senha: '' })); }, 2500);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Erro ao cadastrar.' });
    } finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">

      {/* ── Hero ── */}
      <div className="login-hero">
        <div className="hero-pattern" />
        <div className="hero-orb orb1" /><div className="hero-orb orb2" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo Image */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'2rem' }}>
            <img
              src="/logo-rscacademy.png"
              alt="RSC Academy"
              style={{ width: 220, height: 'auto', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))' }}
            />
          </div>
          <h1 className="hero-heading">Aprendizado <em>inteligente</em> para todos</h1>
          <p className="hero-sub">Plataforma completa com IA integrada para professores, alunos e gestores educacionais.</p>
          <div className="hero-badges">
            {['IA Generativa', 'Gamificação', 'Trilhas Adaptativas', 'Analytics', 'TRI'].map(b => (
              <span key={b} className="hero-badge">{b}</span>
            ))}
          </div>

          {/* Botão Conheça o Desenvolvedor */}
          <div style={{ marginTop: '2.5rem', display:'flex', justifyContent:'center' }}>
            <a
              href="https://rscosta.rscacademy.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)',
                backgroundSize: '200% 200%',
                color: '#1e1b4b',
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 50,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(245,158,11,0.45), 0 0 0 2px rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(245,158,11,0.6), 0 0 0 2px rgba(255,255,255,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.45), 0 0 0 2px rgba(255,255,255,0.15)';
              }}
            >
              <span style={{ fontSize: 18 }}>👨‍💻</span>
              <span>Conheça o Desenvolvedor</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                background: 'rgba(30,27,75,0.15)',
                borderRadius: '50%',
                fontSize: 11,
                fontWeight: 900,
              }}>↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Form Side ── */}
      <div className="login-form-side">
        <div className="form-box">

          {/* Logo no topo do formulário (mobile) */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'1.5rem' }} className="login-logo-mobile">
            <img
              src="/logo-rscacademy.png"
              alt="RSC Academy"
              style={{ width: 140, height: 'auto' }}
            />
          </div>

          {tab === 'login' && (
            <>
              <p className="form-title">Bem-vindo de volta 👋</p>
              <p className="form-subtitle">Acesse sua conta para continuar</p>
              {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
              <div className="field"><label>E-mail</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
              <div className="field"><label>Senha</label><input type="password" placeholder="••••••••" value={form.senha} onChange={set('senha')} onKeyDown={e => e.key === 'Enter' && handleLogin()} /></div>
              <button className="btn-primary" onClick={handleLogin} disabled={loading}>{loading ? 'Entrando...' : 'Entrar na plataforma'}</button>
              <div className="form-links-row">
                <button className="form-link" onClick={() => setAlert({ type: 'success', msg: 'Instruções enviadas para o e-mail cadastrado.' })}>Esqueci minha senha</button>
                <button className="form-link" onClick={() => { setTab('register'); setAlert(null); }}>Criar conta</button>
              </div>

              {/* Botão desenvolvedor versão mobile (abaixo do form) */}
              <div style={{ marginTop:'1.5rem', textAlign:'center' }} className="login-dev-mobile">
                <a
                  href="https://rscosta.rscacademy.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#1e1b4b',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRadius: 50,
                    textDecoration: 'none',
                    boxShadow: '0 3px 12px rgba(245,158,11,0.35)',
                  }}
                >
                  <span>👨‍💻</span> Conheça o Desenvolvedor <span>↗</span>
                </a>
              </div>
            </>
          )}

          {tab === 'register' && (
            <>
              <p className="form-title">Criar conta</p>
              <p className="form-subtitle">Preencha seus dados. Após o cadastro, aguarde a aprovação do administrador.</p>
              {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
              <div className="field"><label>Nome completo</label><input placeholder="Seu nome" value={form.nome} onChange={set('nome')} /></div>
              <div className="field"><label>E-mail</label><input type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} /></div>
              <div className="field"><label>Senha (mín. 6 caracteres)</label><input type="password" placeholder="••••••••" value={form.senha} onChange={set('senha')} /></div>
              <div className="field">
                <label>Perfil</label>
                <div className="radio-group">
                  {['professor', 'aluno'].map(p => (
                    <div key={p} className={`radio-opt ${form.perfil === p ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, perfil: p }))}>
                      <div className="radio-dot" />{p === 'professor' ? '👨‍🏫 Professor' : '👨‍🎓 Aluno'}
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-primary" onClick={handleRegister} disabled={loading}>{loading ? 'Cadastrando...' : 'Criar conta'}</button>
              <button className="btn-ghost" onClick={() => { setTab('login'); setAlert(null); }}>← Voltar ao login</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

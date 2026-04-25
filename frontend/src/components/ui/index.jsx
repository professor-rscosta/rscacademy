// ── Badge helpers ────────────────────────────────────────────
export function StatusBadge({ status }) {
  return status === 'ativo'
    ? <span className="badge badge-active">● Ativo</span>
    : <span className="badge badge-pending">● Pendente</span>;
}

export function PerfilBadge({ perfil }) {
  const map = { admin: 'badge-admin', professor: 'badge-professor', aluno: 'badge-aluno' };
  return <span className={`badge ${map[perfil]}`}>{perfil.charAt(0).toUpperCase() + perfil.slice(1)}</span>;
}

// ── Stat Card ────────────────────────────────────────────────
export function StatCard({ label, value, icon, accent = 'accent-sky' }) {
  return (
    <div className="stat-card">
      <div className={`stat-accent ${accent}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

// ── Quick Action Card ─────────────────────────────────────────
export function QACard({ icon, title, desc, onClick }) {
  return (
    <div className="qa-card" onClick={onClick}>
      <div className="qa-icon">{icon}</div>
      <div className="qa-title">{title}</div>
      <div className="qa-desc">{desc}</div>
    </div>
  );
}

// ── Welcome Banner ───────────────────────────────────────────
export function WelcomeBanner({ greeting, sub, emoji }) {
  return (
    <div className="welcome-banner">
      <div className="wb-pattern" />
      <div className="wb-text"><h2>{greeting}</h2><p>{sub}</p></div>
      <div className="wb-emoji">{emoji}</div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div style={{ fontWeight: 500, color: 'var(--slate-600)', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Avatar initials ──────────────────────────────────────────
export function Avatar({ name='?', size = 28, bg = 'linear-gradient(135deg,#0ea5e9,#10b981)', foto = null }) {
  const initials = (name||'?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%',
      background: foto ? `url(${foto}) center/cover` : bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: foto ? 0 : size * 0.38, color: 'white', flexShrink: 0 }}>
      {!foto && initials}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────
export function ProgressBar({ value }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export { default as UserProfileModal } from './UserProfileModal';

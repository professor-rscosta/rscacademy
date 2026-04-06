export default function Logo({ small = false }) {
  return (
    <div className="logo-wrap" style={{ marginBottom: small ? 0 : '3rem' }}>
      <div className={`logo-icon ${small ? 'sm' : ''}`}>RSC</div>
      <div className="logo-text">
        <span className={small ? 'sm' : 'lg'}>RSC Academy</span>
        <small>Plataforma Educacional</small>
      </div>
    </div>
  );
}

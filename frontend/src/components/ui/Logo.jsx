export default function Logo({ small = false }) {
  // Check if custom logo exists
  const logoSrc = '/logo-rscacademy.png';

  return (
    <div className="logo-wrap" style={{ marginBottom: small ? 0 : '3rem', display:'flex', alignItems:'center', gap: small ? 8 : 12 }}>
      <img
        src={logoSrc}
        alt="RSC Academy"
        style={{
          width: small ? 36 : 56,
          height: small ? 36 : 56,
          objectFit: 'contain',
          borderRadius: 8,
          flexShrink: 0,
        }}
        onError={e => {
          // Fallback to text logo if image fails
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      {/* Fallback text logo */}
      <div className={`logo-icon ${small ? 'sm' : ''}`} style={{ display:'none' }}>RSC</div>
      {!small && (
        <div className="logo-text">
          <span className="lg">RSC Academy</span>
          <small>Plataforma Educacional</small>
        </div>
      )}
    </div>
  );
}

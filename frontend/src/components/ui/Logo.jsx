export default function Logo({ small = false }) {
  return (
    <div style={{
      display:'flex', alignItems:'center',
      gap: small ? 10 : 14,
      marginBottom: small ? 0 : '3rem',
    }}>
      {/* Logo image */}
      <img
        src="/logo-rscacademy.png"
        alt="RSC Academy"
        style={{
          width: small ? 38 : 52,
          height: small ? 38 : 52,
          objectFit:'contain',
          borderRadius: 10,
          flexShrink: 0,
          background:'rgba(255,255,255,.06)',
        }}
        onError={e => { e.target.style.display='none'; }}
      />
      {/* Name — always visible */}
      <div>
        <div style={{
          fontFamily:'var(--font-head)',
          fontWeight: 800,
          fontSize: small ? 15 : 20,
          color:'white',
          letterSpacing: small ? 0 : -.5,
          lineHeight: 1.1,
        }}>
          RSC Academy
        </div>
        {!small && (
          <div style={{ fontSize:10, fontWeight:300, color:'rgba(255,255,255,.5)', letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>
            Plataforma Educacional
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';

const W = 400, H = 220, PAD = { top:12, right:16, bottom:36, left:44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top  - PAD.bottom;

// TRI math (mirror de tri.service.js para o frontend)
function p1PL(t,b)     { return 1/(1+Math.exp(-(t-b))); }
function p2PL(t,a,b)   { return 1/(1+Math.exp(-a*(t-b))); }
function p3PL(t,a,b,c) { return c+(1-c)*(1/(1+Math.exp(-a*(t-b)))); }

function calcP(theta, tri) {
  const { modelo='2PL', a=1, b=0, c=0 } = tri;
  if (modelo==='1PL') return p1PL(theta,b);
  if (modelo==='3PL') return p3PL(theta,a,b,c);
  return p2PL(theta,a,b);
}

function thetaToX(t) { return PAD.left + ((t+4)/8)*PLOT_W; }
function probToY(p)  { return PAD.top  + (1-p)*PLOT_H; }

export default function CurvaCaracteristica({ tri, thetaAluno = null, compact = false }) {
  const { a=1, b=0, c=0, modelo='2PL' } = tri || {};

  const curva = useMemo(() => {
    const pts = [];
    for (let t = -4; t <= 4; t += 0.08) {
      pts.push({ x: thetaToX(t), y: probToY(calcP(t, tri)) });
    }
    return pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [a, b, c, modelo]);

  const pB = calcP(b, tri);
  const labels = [-3,-2,-1,0,1,2,3];
  const vLines = [0.25,0.50,0.75];

  const svgW = compact ? 320 : W;
  const scale = compact ? 320/W : 1;

  return (
    <div style={{ fontFamily:'var(--font-body)' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={svgW}
        style={{ display:'block', maxWidth:'100%' }}
      >
        {/* Grid horizontal */}
        {vLines.map(p => (
          <g key={p}>
            <line x1={PAD.left} y1={probToY(p)} x2={W-PAD.right} y2={probToY(p)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3"/>
            <text x={PAD.left-4} y={probToY(p)+4} textAnchor="end" fontSize="9" fill="#94a3b8">{p}</text>
          </g>
        ))}

        {/* Grid vertical (theta labels) */}
        {labels.map(t => (
          <g key={t}>
            <line x1={thetaToX(t)} y1={PAD.top} x2={thetaToX(t)} y2={H-PAD.bottom} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={thetaToX(t)} y={H-PAD.bottom+12} textAnchor="middle" fontSize="9" fill="#94a3b8">{t}</text>
          </g>
        ))}

        {/* Eixos */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H-PAD.bottom} stroke="#cbd5e1" strokeWidth="1.5"/>
        <line x1={PAD.left} y1={H-PAD.bottom} x2={W-PAD.right} y2={H-PAD.bottom} stroke="#cbd5e1" strokeWidth="1.5"/>

        {/* Linha do parâmetro b (dificuldade) */}
        <line x1={thetaToX(b)} y1={PAD.top} x2={thetaToX(b)} y2={H-PAD.bottom} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.8"/>
        <text x={thetaToX(b)+3} y={PAD.top+12} fontSize="9" fill="#f59e0b">b={b}</text>

        {/* Linha c (acerto casual para 3PL) */}
        {modelo==='3PL' && c>0 && (
          <line x1={PAD.left} y1={probToY(c)} x2={W-PAD.right} y2={probToY(c)} stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" opacity="0.7"/>
        )}

        {/* Curva ICC */}
        <path d={curva} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>

        {/* Theta do aluno */}
        {thetaAluno !== null && (
          <g>
            <line x1={thetaToX(thetaAluno)} y1={PAD.top} x2={thetaToX(thetaAluno)} y2={H-PAD.bottom} stroke="#0ea5e9" strokeWidth="2" strokeDasharray="5,3"/>
            <circle cx={thetaToX(thetaAluno)} cy={probToY(calcP(thetaAluno, tri))} r="5" fill="#0ea5e9" opacity="0.9"/>
            <text x={thetaToX(thetaAluno)+5} y={probToY(calcP(thetaAluno, tri))-5} fontSize="9" fill="#0ea5e9">θ={thetaAluno}</text>
          </g>
        )}

        {/* Ponto b (P=0.5) */}
        <circle cx={thetaToX(b)} cy={probToY(pB)} r="4" fill="#f59e0b" opacity="0.9"/>

        {/* Labels eixos */}
        <text x={W/2} y={H-2} textAnchor="middle" fontSize="10" fill="#64748b">Habilidade (θ)</text>
        <text x={8} y={H/2} textAnchor="middle" fontSize="10" fill="#64748b" transform={`rotate(-90,8,${H/2})`}>P(acerto)</text>
      </svg>

      {/* Legenda parâmetros */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:6, fontSize:11 }}>
        <span style={{ color:'#f59e0b' }}>━ b={b} (dificuldade)</span>
        {(modelo==='2PL'||modelo==='3PL') && <span style={{ color:'#64748b' }}>a={a} (discriminação)</span>}
        {modelo==='3PL' && <span style={{ color:'#f43f5e' }}>c={c} (acerto casual)</span>}
        {thetaAluno!==null && <span style={{ color:'#0ea5e9' }}>● θ aluno={thetaAluno}</span>}
        <span style={{ color:'#94a3b8', marginLeft:'auto' }}>{modelo}</span>
      </div>
    </div>
  );
}

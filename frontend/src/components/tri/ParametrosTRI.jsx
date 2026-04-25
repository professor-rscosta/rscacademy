import { useState } from 'react';
import CurvaCaracteristica from './CurvaCaracteristica';

const MODELOS = {
  '1PL': { params:['b'],       label:'1PL — Rasch (simples)' },
  '2PL': { params:['a','b'],   label:'2PL — Discriminação' },
  '3PL': { params:['a','b','c'],label:'3PL — Múltipla Escolha' },
  'GRM': { params:['a','b'],   label:'GRM — Resposta Gradual' },
};

const PARAM_CONFIG = {
  a: { label:'Discriminação (a)', min:0.5, max:3.0, step:0.05, default:1.0, color:'#64748b', tip:'Quão bem a questão diferencia alunos. Alto = maior discriminação.' },
  b: { label:'Dificuldade (b)',   min:-3,  max:3,   step:0.1,  default:0.0, color:'#f59e0b', tip:'Ponto de habilidade onde P=0.5. Negativo=fácil, positivo=difícil.' },
  c: { label:'Acerto casual (c)', min:0,   max:0.35, step:0.01, default:0.25,color:'#f43f5e', tip:'Probabilidade de acerto por chute. Use 1/nAlternativas (4 opções→0.25).' },
};

export default function ParametrosTRI({ value, onChange, modeloFixo }) {
  const [tri, setTri] = useState(value || { modelo:'2PL', a:1.0, b:0.0, c:0, status:'provisorio' });

  const update = (key, val) => {
    const novo = { ...tri, [key]: Number(val) };
    setTri(novo);
    onChange?.(novo);
  };

  const setModelo = (modelo) => {
    const novo = { ...tri, modelo };
    if (modelo==='1PL') { novo.a=1; novo.c=0; }
    if (modelo==='GRM')  novo.c=0;
    setTri(novo);
    onChange?.(novo);
  };

  const modelo = modeloFixo || tri.modelo;
  const paramsList = MODELOS[modelo]?.params || ['a','b'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Seletor de modelo */}
      {!modeloFixo && (
        <div>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--slate-600)', display:'block', marginBottom:6 }}>Modelo TRI</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Object.entries(MODELOS).map(([m, cfg]) => (
              <button key={m} onClick={()=>setModelo(m)} style={{
                padding:'5px 12px', borderRadius:6, border:'1.5px solid',
                borderColor: tri.modelo===m ? 'var(--emerald)' : 'var(--slate-200)',
                background:  tri.modelo===m ? 'rgba(16,185,129,0.08)' : 'white',
                color:       tri.modelo===m ? 'var(--emerald-dark)' : 'var(--slate-600)',
                fontSize:12, fontWeight: tri.modelo===m?600:400, cursor:'pointer',
              }}>{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* Sliders dos parâmetros */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {paramsList.map(param => {
          const cfg = PARAM_CONFIG[param];
          return (
            <div key={param}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label style={{ fontSize:12, fontWeight:500, color:'var(--slate-600)' }}>{cfg.label}</label>
                <span style={{ fontSize:13, fontWeight:700, color:cfg.color, minWidth:36, textAlign:'right' }}>
                  {(tri[param]||cfg.default).toFixed(param==='b'?1:2)}
                </span>
              </div>
              <input type="range"
                min={cfg.min} max={cfg.max} step={cfg.step}
                value={tri[param]??cfg.default}
                onChange={e=>update(param,e.target.value)}
                style={{ width:'100%', accentColor:cfg.color }}
              />
              <div style={{ fontSize:10, color:'var(--slate-400)', marginTop:2 }}>{cfg.tip}</div>
            </div>
          );
        })}
      </div>

      {/* Curva ICC em tempo real */}
      <div style={{ background:'var(--slate-50)', borderRadius:8, padding:12, border:'1px solid var(--slate-200)' }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
          Curva Característica do Item (ICC)
        </div>
        <CurvaCaracteristica tri={{ ...tri, modelo }} compact />
      </div>

      {/* Status TRI */}
      <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
        <span style={{ padding:'3px 10px', borderRadius:50, fontSize:11, fontWeight:600,
          background: tri.status==='calibrado'?'#f0fdf4':'#fffbeb',
          color:      tri.status==='calibrado'?'#15803d':'#92400e',
          border:'1px solid '+(tri.status==='calibrado'?'#86efac':'#fcd34d') }}>
          {tri.status==='calibrado'?'✅ Calibrado':'⏳ Provisório'}
        </span>
        {tri.total_respostas>0 && (
          <span style={{ color:'var(--slate-400)' }}>{tri.total_respostas} respostas · Calibração automática aos 30</span>
        )}
      </div>
    </div>
  );
}

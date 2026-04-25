/**
 * MidiaEditor — professor adiciona mídias a uma questão
 * Suporta: imagem (upload do computador OU link externo), YouTube, texto extra
 */
import { useRef } from 'react';
import MidiaRenderer from './MidiaRenderer';

const TIPOS_MIDIA = [
  { id: 'imagem',      icon: '🖼️', label: 'Imagem' },
  { id: 'youtube',     icon: '▶️',  label: 'YouTube' },
  { id: 'texto_extra', icon: '📄', label: 'Texto' },
];

const novaItem = () => ({ tipo: 'imagem', url: '', legenda: '', texto: '', base64: null, nomeArquivo: '', _id: Date.now() });

// Converte File → base64 string
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MidiaEditor({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const fileRefs = useRef({});

  const add  = () => onChange([...items, novaItem()]);
  const remove = idx => onChange(items.filter((_, i) => i !== idx));

  const update = (idx, field, val) =>
    onChange(items.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  // Upload de arquivo do computador
  const handleFileUpload = async (idx, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são suportadas (JPG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB.');
      return;
    }
    const base64 = await fileToBase64(file);
    onChange(items.map((item, i) => i === idx ? { ...item, base64, nomeArquivo: file.name, url: '' } : item));
  };

  const limparImagem = idx => onChange(items.map((item, i) => i === idx ? { ...item, base64: null, nomeArquivo: '', url: '' } : item));

  return (
    <div>
      {items.length === 0 && (
        <div style={{ padding:'12px 14px', border:'1.5px dashed var(--slate-200)', borderRadius:8, fontSize:12, color:'var(--slate-400)', textAlign:'center', marginBottom:8 }}>
          Nenhuma mídia — clique em "+ Adicionar Mídia" para inserir imagem, vídeo ou texto
        </div>
      )}

      {items.map((item, idx) => (
        <div key={item._id || idx} style={{ border:'1.5px solid var(--slate-200)', borderRadius:10, padding:'12px', marginBottom:8, background:'var(--slate-50)' }}>

          {/* Seletor de tipo */}
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:10 }}>
            {TIPOS_MIDIA.map(t => (
              <button key={t.id} type="button" onClick={() => {
                onChange(items.map((it, i) => i === idx ? { ...it, tipo: t.id, base64: null, nomeArquivo: '', url: '', texto: '' } : it));
              }} style={{
                padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer',
                border:'1.5px solid '+(item.tipo===t.id?'var(--emerald)':'var(--slate-200)'),
                background: item.tipo===t.id?'rgba(16,185,129,0.08)':'white',
                color: item.tipo===t.id?'var(--emerald-dark)':'var(--slate-500)',
                fontWeight: item.tipo===t.id?600:400,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
            <button type="button" onClick={() => remove(idx)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--coral)', cursor:'pointer', fontSize:14, padding:'2px 6px' }}>✕</button>
          </div>

          {/* ── IMAGEM ── */}
          {item.tipo === 'imagem' && (
            <div>
              {/* Toggle: upload vs link */}
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                {[['upload','💾 Do computador'],['link','🔗 Link externo']].map(([m,l]) => {
                  const ativo = m === 'upload' ? !!item.base64 : (!item.base64 || !item.nomeArquivo);
                  return (
                    <button key={m} type="button"
                      onClick={() => { if(m==='upload') { fileRefs.current[idx]?.click(); } else { limparImagem(idx); } }}
                      style={{ padding:'5px 12px', borderRadius:6, border:'1.5px solid var(--slate-200)', background:'white', fontSize:12, cursor:'pointer', color:'var(--slate-600)' }}>
                      {l}
                    </button>
                  );
                })}
              </div>

              {/* Input de arquivo oculto */}
              <input
                ref={el => fileRefs.current[idx] = el}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={e => handleFileUpload(idx, e.target.files[0])}
              />

              {/* Preview do arquivo carregado */}
              {item.base64 ? (
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>✅</span>
                    <span style={{ fontSize:12, color:'#15803d', fontWeight:500 }}>{item.nomeArquivo}</span>
                    <button type="button" onClick={() => limparImagem(idx)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--slate-400)', cursor:'pointer', fontSize:12 }}>Trocar</button>
                  </div>
                  <img src={item.base64} alt="preview" style={{ width:'100%', maxHeight:180, objectFit:'contain', borderRadius:6, border:'1px solid var(--slate-200)' }} />
                </div>
              ) : (
                /* Campo de URL alternativo */
                <div>
                  <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:4 }}>Ou cole a URL de uma imagem:</div>
                  <input
                    value={item.url || ''}
                    onChange={e => update(idx, 'url', e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    style={{ width:'100%', padding:'7px 10px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none', marginBottom:4 }}
                  />
                </div>
              )}

              {/* Legenda */}
              <input
                value={item.legenda || ''}
                onChange={e => update(idx, 'legenda', e.target.value)}
                placeholder="Legenda (opcional): ex. Figura 1"
                style={{ width:'100%', padding:'6px 10px', border:'1.5px solid var(--slate-100)', borderRadius:6, fontFamily:'var(--font-body)', fontSize:12, outline:'none', color:'var(--slate-500)' }}
              />
            </div>
          )}

          {/* ── YOUTUBE ── */}
          {item.tipo === 'youtube' && (
            <div>
              <input
                value={item.url || ''}
                onChange={e => update(idx, 'url', e.target.value)}
                placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, outline:'none', marginBottom:6 }}
              />
              <input
                value={item.legenda || ''}
                onChange={e => update(idx, 'legenda', e.target.value)}
                placeholder="Legenda (opcional)"
                style={{ width:'100%', padding:'6px 10px', border:'1.5px solid var(--slate-100)', borderRadius:6, fontFamily:'var(--font-body)', fontSize:12, outline:'none', color:'var(--slate-500)' }}
              />
            </div>
          )}

          {/* ── TEXTO EXTRA ── */}
          {item.tipo === 'texto_extra' && (
            <textarea
              rows={3}
              value={item.texto || ''}
              onChange={e => update(idx, 'texto', e.target.value)}
              placeholder="Contexto, enunciado complementar, trecho de texto..."
              style={{ width:'100%', padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, resize:'vertical', outline:'none' }}
            />
          )}

          {/* Preview */}
          {((item.tipo==='imagem' && (item.base64||item.url)) ||
            (item.tipo==='youtube' && item.url) ||
            (item.tipo==='texto_extra' && item.texto)) && !item.base64 && (
            <div style={{ marginTop:10, padding:10, background:'white', borderRadius:8, border:'1px solid var(--slate-100)' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--slate-400)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Preview</div>
              <MidiaRenderer midias={[item]} />
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={add} style={{
        width:'100%', padding:'8px', border:'1.5px dashed var(--emerald)',
        borderRadius:8, background:'rgba(16,185,129,0.04)', color:'var(--emerald-dark)',
        fontSize:13, fontWeight:600, cursor:'pointer',
      }}>
        + Adicionar Mídia (imagem, vídeo ou texto)
      </button>
    </div>
  );
}

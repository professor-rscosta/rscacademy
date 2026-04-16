/**
 * MidiaRenderer - renders rich media for questions/materials
 * Supports: image, YouTube embed (all URL formats), extra text
 */
import { extractYouTubeId } from '../../utils/youtube.js';


function ImageItem({ url, legenda, base64 }) {
  const src = base64 || url;
  if (!src) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <img
        src={src}
        alt={legenda || 'Imagem da questão'}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
        style={{
          width: '100%', maxHeight: 320, objectFit: 'contain',
          borderRadius: 8, border: '1px solid var(--slate-200)',
          background: 'var(--slate-50)',
        }}
      />
      <div style={{ display: 'none', padding: '12px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c' }}>
        ⚠️ Imagem não pôde ser carregada
      </div>
      {legenda && (
        <div style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
          {legenda}
        </div>
      )}
    </div>
  );
}

function YouTubeItem({ url, legenda }) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return (
      <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
        ⚠️ Link do YouTube inválido: {url}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--slate-200)' }}>
        <iframe
          src={'https://www.youtube.com/embed/' + videoId + '?rel=0&modestbranding=1&origin=' + window.location.origin}
          title={legenda || 'Video da questao'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
      {legenda && (
        <div style={{ fontSize: 11, color: 'var(--slate-400)', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
          {legenda}
        </div>
      )}
    </div>
  );
}

function TextoExtra({ texto }) {
  if (!texto?.trim()) return null;
  return (
    <div style={{
      background: 'var(--slate-50)', border: '1px solid var(--slate-200)',
      borderLeft: '3px solid var(--emerald)', borderRadius: 8,
      padding: '12px 14px', fontSize: 13.5, color: 'var(--slate-700)',
      lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap',
    }}>
      {texto}
    </div>
  );
}

/**
 * Componente principal — aceita array de mídias ou objeto único (retrocompatível)
 *
 * Formato moderno (array):
 *   midias = [{ tipo: 'imagem'|'youtube'|'texto_extra', url, legenda, texto }]
 *
 * Formato legado (objeto único):
 *   midia = { tipo, url, legenda, texto }
 */
export default function MidiaRenderer({ midias, midia }) {
  // Normalizar para array
  const lista = midias
    ? (Array.isArray(midias) ? midias : [midias])
    : midia
    ? [midia]
    : [];

  const visiveis = lista.filter(m => m && m.tipo && m.tipo !== 'nenhum');
  if (visiveis.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      {visiveis.map((m, i) => {
        if (m.tipo === 'imagem')      return <ImageItem key={i} url={m.url} legenda={m.legenda} base64={m.base64} />;
        if (m.tipo === 'youtube')     return <YouTubeItem key={i} url={m.url} legenda={m.legenda} />;
        if (m.tipo === 'texto_extra') return <TextoExtra key={i} texto={m.texto || m.url} />;
        return null;
      })}
    </div>
  );
}

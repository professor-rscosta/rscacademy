/**
 * RSC Academy — 7 Tipos de Questão Interativa
 * Todos os tipos são controlados: o componente pai (AlunoDesafio)
 * gerencia o estado e a submissão via onAnswer + confirmar externo.
 */
import { useState, useRef, useEffect } from 'react';

const styles = {
  opt: (sel) => ({
    display:'flex', alignItems:'flex-start', gap:12, padding:'11px 14px',
    border:'2px solid '+(sel?'var(--emerald)':'var(--slate-200)'),
    borderRadius:8, cursor:'pointer', transition:'all .15s',
    background: sel?'rgba(16,185,129,0.06)':'white', userSelect:'none',
  }),
  letter: (sel) => ({
    width:26, height:26, borderRadius:'50%', flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center',
    background: sel?'var(--emerald)':'var(--slate-100)',
    color: sel?'white':'var(--slate-500)', fontWeight:700, fontSize:13,
  }),
};

// ── 1. Múltipla Escolha ───────────────────────────────────────
export function MultiplaEscolha({ questao, onAnswer, disabled, respostaDada }) {
  const [sel, setSel] = useState(respostaDada ?? null);
  const alts = questao.alternativas || [];

  const escolher = (i) => {
    if (disabled || sel !== null) return;
    setSel(i); onAnswer?.(i);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {alts.map((alt, i) => (
        <div key={i} style={styles.opt(sel===i)} onClick={() => escolher(i)}>
          <div style={styles.letter(sel===i)}>{'ABCD'[i]}</div>
          <div style={{ fontSize:14, color:'var(--slate-700)', lineHeight:1.5, paddingTop:2 }}>{alt}</div>
        </div>
      ))}
    </div>
  );
}

// ── 2. Verdadeiro / Falso ─────────────────────────────────────
export function VerdadeiroFalso({ questao, onAnswer, disabled, respostaDada }) {
  const [sel, setSel] = useState(respostaDada ?? null);

  const escolher = (val) => {
    if (disabled || sel !== null) return;
    setSel(val); onAnswer?.(val);
  };

  return (
    <div style={{ display:'flex', gap:14 }}>
      {[{v:true,l:'✅ Verdadeiro',c:'#10b981'},{v:false,l:'❌ Falso',c:'#f43f5e'}].map(opt => (
        <div key={String(opt.v)} onClick={() => escolher(opt.v)} style={{
          flex:1, padding:'18px 10px', textAlign:'center', borderRadius:12, cursor:'pointer',
          border:'2.5px solid '+(sel===opt.v?opt.c:'var(--slate-200)'),
          background: sel===opt.v?`${opt.c}18`:'white',
          fontWeight:600, fontSize:15, color: sel===opt.v?opt.c:'var(--slate-600)',
          transition:'all .2s', userSelect:'none',
        }}>{opt.l}</div>
      ))}
    </div>
  );
}

// ── 3. Dissertativa ───────────────────────────────────────────
export function Dissertativa({ questao, onAnswer, disabled, respostaDada }) {
  const [texto, setTexto] = useState(respostaDada || '');

  // Apenas notifica o pai ao digitar — confirmação é externa
  const handleChange = (e) => {
    setTexto(e.target.value);
    onAnswer?.(e.target.value); // atualiza em tempo real
  };

  return (
    <div>
      <textarea
        value={texto}
        onChange={handleChange}
        disabled={disabled}
        rows={6}
        placeholder="Escreva sua resposta aqui..."
        style={{
          width:'100%', padding:'12px 14px', border:'1.5px solid var(--slate-200)',
          borderRadius:8, fontFamily:'var(--font-body)', fontSize:14, lineHeight:1.6,
          resize:'vertical', outline:'none', color:'var(--slate-800)',
          background: disabled?'var(--slate-50)':'white',
        }}
        onFocus={e => e.target.style.borderColor='var(--emerald)'}
        onBlur={e => e.target.style.borderColor='var(--slate-200)'}
      />
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--slate-400)' }}>
        <span>Avaliação por IA após envio</span>
        <span>{texto.length} caracteres</span>
      </div>
    </div>
  );
}

// ── 4. Preenchimento (fill in the blank) ──────────────────────
export function Preenchimento({ questao, onAnswer, disabled, respostaDada }) {
  const [valor, setValor] = useState(respostaDada || '');
  const partes = (questao.enunciado || '').split('___');

  // Notifica o pai ao digitar — confirmação é externa
  const handleChange = (e) => {
    setValor(e.target.value);
    onAnswer?.(e.target.value);
  };

  return (
    <div style={{
      padding:'16px', background:'var(--slate-50)', borderRadius:8,
      border:'1px solid var(--slate-200)', fontSize:15, lineHeight:2.2,
    }}>
      {partes.map((parte, i) => (
        <span key={i}>
          <span>{parte}</span>
          {i < partes.length - 1 && (
            <input
              value={valor}
              onChange={handleChange}
              disabled={disabled}
              placeholder="______"
              style={{
                borderBottom: `2.5px solid ${disabled?'var(--slate-300)':'var(--emerald)'}`,
                borderTop:'none', borderLeft:'none', borderRight:'none',
                outline:'none', background:'transparent',
                fontFamily:'var(--font-body)', fontSize:15,
                fontWeight:600, color:'var(--emerald-dark)',
                width:140, textAlign:'center', padding:'0 6px',
              }}
            />
          )}
        </span>
      ))}
      {!disabled && (
        <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:8 }}>
          💡 Digite a resposta no campo em destaque e clique em "Confirmar" abaixo
        </div>
      )}
    </div>
  );
}

// ── 5. Associação (matching) ──────────────────────────────────
export function Associacao({ questao, onAnswer, disabled, respostaDada }) {
  const alts = questao.alternativas || { esquerda:[], direita:[] };
  const { esquerda=[], direita=[] } = alts;
  const [assoc, setAssoc] = useState(respostaDada || {});
  const [selEsq, setSelEsq] = useState(null);

  const clickEsq = (i) => {
    if (disabled) return;
    setSelEsq(selEsq === i ? null : i);
  };

  const clickDir = (j) => {
    if (disabled || selEsq === null) return;
    const novo = { ...assoc, [selEsq]: j };
    setAssoc(novo);
    setSelEsq(null);
    onAnswer?.(novo);
  };

  const usedDir = Object.values(assoc);
  const completo = Object.keys(assoc).length === esquerda.length;

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* Coluna A */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Coluna A</div>
          {esquerda.map((item, i) => (
            <div key={i} onClick={() => clickEsq(i)} style={{
              padding:'10px 12px', borderRadius:8, marginBottom:6, cursor:'pointer',
              border:'2px solid '+(selEsq===i?'var(--emerald)':assoc[i]!==undefined?'var(--sky)':'var(--slate-200)'),
              background: selEsq===i?'rgba(16,185,129,0.08)':assoc[i]!==undefined?'rgba(14,165,233,0.06)':'white',
              fontSize:13, fontWeight:500, userSelect:'none',
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <span>{item}</span>
              {assoc[i] !== undefined && <span style={{ fontSize:11, color:'var(--sky)', fontWeight:700 }}>→ {String.fromCharCode(65+assoc[i])}</span>}
            </div>
          ))}
        </div>
        {/* Coluna B */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--slate-500)', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Coluna B</div>
          {direita.map((item, j) => (
            <div key={j} onClick={() => clickDir(j)} style={{
              padding:'10px 12px', borderRadius:8, marginBottom:6, cursor:'pointer',
              border:'2px solid '+(usedDir.includes(j)?'var(--amber)':'var(--slate-200)'),
              background: usedDir.includes(j)?'rgba(245,158,11,0.08)':'white',
              fontSize:13, fontWeight:500, userSelect:'none',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ fontWeight:700, color:'var(--amber)', fontSize:12 }}>{String.fromCharCode(65+j)}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop:6, fontSize:11, color: completo?'var(--emerald-dark)':'var(--slate-400)' }}>
        {selEsq !== null ? '✋ Agora clique no item correspondente da Coluna B'
         : completo ? `✅ Todas as ${esquerda.length} associações feitas — confirme abaixo`
         : `${Object.keys(assoc).length}/${esquerda.length} associações feitas`}
      </div>
    </div>
  );
}

// ── 6. Ordenação ─────────────────────────────────────────────
export function Ordenacao({ questao, onAnswer, disabled, respostaDada }) {
  const original = questao.alternativas || [];
  const [itens, setItens] = useState(() =>
    respostaDada
      ? respostaDada.map(idx => ({ item: original[idx], originalIdx: idx }))
      : original.map((item, i) => ({ item, originalIdx: i }))
  );

  const mover = (idx, dir) => {
    if (disabled) return;
    const novo = [...itens];
    const target = idx + dir;
    if (target < 0 || target >= novo.length) return;
    [novo[idx], novo[target]] = [novo[target], novo[idx]];
    setItens(novo);
    onAnswer?.(novo.map(i => i.originalIdx));
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:11, color:'var(--slate-400)', marginBottom:2 }}>Use ▲▼ para ordenar, depois confirme abaixo</div>
      {itens.map((it, idx) => (
        <div key={it.originalIdx} style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
          border:'1.5px solid var(--slate-200)', borderRadius:8, background:'white',
        }}>
          <span style={{
            width:24, height:24, borderRadius:'50%', background:'var(--navy)',
            color:'white', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, flexShrink:0,
          }}>{idx+1}</span>
          <span style={{ flex:1, fontSize:14, color:'var(--slate-700)' }}>{it.item}</span>
          {!disabled && (
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <button onClick={() => mover(idx,-1)} disabled={idx===0} style={{ width:22, height:22, border:'1px solid var(--slate-200)', borderRadius:4, cursor:'pointer', background:'white', fontSize:10, color:'var(--slate-500)' }}>▲</button>
              <button onClick={() => mover(idx,+1)} disabled={idx===itens.length-1} style={{ width:22, height:22, border:'1px solid var(--slate-200)', borderRadius:4, cursor:'pointer', background:'white', fontSize:10, color:'var(--slate-500)' }}>▼</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 7. Upload / Entrega ───────────────────────────────────────
export function UploadArquivo({ questao, onAnswer, disabled, respostaDada }) {
  const [texto, setTexto]         = useState('');
  const [arquivo, setArquivo]     = useState(null); // { nome, tipo, base64, tamanho }
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef(null);

  // Se já tem resposta salva, parsear
  useEffect(() => {
    if (!respostaDada) return;
    if (typeof respostaDada === 'object' && respostaDada.texto !== undefined) {
      setTexto(respostaDada.texto || '');
      if (respostaDada.arquivo) setArquivo(respostaDada.arquivo);
    } else if (typeof respostaDada === 'string') {
      setTexto(respostaDada);
    }
  }, []);

  const processarArquivo = (file) => {
    if (!file) return;
    const MAX = 8 * 1024 * 1024; // 8MB
    if (file.size > MAX) { alert('Arquivo muito grande. Máximo: 8MB.'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result; // data:tipo/subtipo;base64,xxx
      const arq = { nome: file.name, tipo: file.type, base64, tamanho: file.size };
      setArquivo(arq);
      const resposta = { arquivo: arq, texto };
      onAnswer?.(resposta);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e) => processarArquivo(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    processarArquivo(e.dataTransfer.files[0]);
  };

  const handleTexto = (e) => {
    setTexto(e.target.value);
    onAnswer?.({ arquivo, texto: e.target.value });
  };

  const removerArquivo = () => {
    setArquivo(null);
    onAnswer?.({ arquivo: null, texto });
    if (inputRef.current) inputRef.current.value = '';
  };

  const fmtSize = (bytes) => bytes < 1024 ? bytes+'B' : bytes < 1048576 ? Math.round(bytes/1024)+'KB' : (bytes/1048576).toFixed(1)+'MB';
  const isImagem = arquivo?.tipo?.startsWith('image/');
  const isPdf    = arquivo?.tipo === 'application/pdf';
  const exts     = { 'application/pdf':'📄', 'application/zip':'🗜️', 'text/plain':'📃', 'application/x-python':'🐍' };
  const iconeArq = isImagem ? '🖼️' : exts[arquivo?.tipo] || '📎';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Drop zone */}
      {!arquivo ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !disabled && inputRef.current?.click()}
          style={{
            padding:24, border:'2px dashed '+(dragOver?'var(--emerald)':'var(--slate-200)'),
            borderRadius:12, textAlign:'center', cursor:disabled?'not-allowed':'pointer',
            background: dragOver ? 'rgba(16,185,129,.04)' : 'var(--slate-50)',
            transition:'all .15s',
          }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📤</div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--slate-600)', marginBottom:4 }}>
            {dragOver ? 'Solte o arquivo aqui' : 'Clique ou arraste um arquivo'}
          </div>
          <div style={{ fontSize:11, color:'var(--slate-400)' }}>
            PDF, imagens, ZIP, código-fonte · Máx. 8MB
          </div>
          <input ref={inputRef} type="file" style={{ display:'none' }} onChange={handleFile} disabled={disabled}
            accept=".pdf,.doc,.docx,.zip,.rar,.py,.js,.java,.cpp,.c,.txt,.png,.jpg,.jpeg,.gif,.mp4" />
        </div>
      ) : (
        /* Preview do arquivo */
        <div style={{ padding:'12px 14px', border:'2px solid var(--emerald)', borderRadius:12, background:'rgba(16,185,129,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28, flexShrink:0 }}>{iconeArq}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--navy)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {arquivo.nome}
              </div>
              <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:1 }}>
                {fmtSize(arquivo.tamanho)} · {arquivo.tipo}
              </div>
            </div>
            {!disabled && (
              <button onClick={removerArquivo} style={{ padding:'4px 10px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#b91c1c', cursor:'pointer', fontSize:11, fontWeight:600, flexShrink:0 }}>
                ✕ Remover
              </button>
            )}
          </div>

          {/* Preview de imagem */}
          {isImagem && arquivo.base64 && (
            <div style={{ marginTop:10, borderRadius:8, overflow:'hidden', border:'1px solid var(--slate-200)' }}>
              <img src={arquivo.base64} alt="preview" style={{ maxWidth:'100%', maxHeight:200, display:'block', objectFit:'contain', background:'white' }} />
            </div>
          )}

          {!disabled && (
            <button onClick={() => inputRef.current?.click()}
              style={{ marginTop:8, padding:'5px 12px', background:'white', border:'1.5px solid var(--emerald)', borderRadius:6, color:'var(--emerald-dark)', cursor:'pointer', fontSize:11, fontWeight:600 }}>
              🔄 Trocar arquivo
            </button>
          )}
          <input ref={inputRef} type="file" style={{ display:'none' }} onChange={handleFile} disabled={disabled}
            accept=".pdf,.doc,.docx,.zip,.rar,.py,.js,.java,.cpp,.c,.txt,.png,.jpg,.jpeg,.gif,.mp4" />
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--slate-400)', display:'flex', alignItems:'center', gap:6 }}>
        <span>──────</span><span>ou adicione observações/código abaixo</span><span>──────</span>
      </div>

      <textarea
        value={texto} onChange={handleTexto} disabled={disabled}
        rows={4} placeholder="Descreva sua solução, cole código, ou deixe comentários..."
        style={{ width:'100%', padding:'12px 14px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'monospace', fontSize:12, resize:'vertical', outline:'none', boxSizing:'border-box' }}
        onFocus={e => e.target.style.borderColor='var(--emerald)'}
        onBlur={e => e.target.style.borderColor='var(--slate-200)'} />

      {!disabled && (
        <div style={{ fontSize:11, color:'var(--slate-400)', padding:'8px 10px', background:'#fffbeb', borderRadius:6, border:'1px solid #fcd34d' }}>
          💡 Após anexar o arquivo e preencher as informações, clique em <strong>"Confirmar Resposta"</strong> para enviar ao professor.
        </div>
      )}
    </div>
  );
}

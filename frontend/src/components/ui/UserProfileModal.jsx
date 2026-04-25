/**
 * UserProfileModal — Gerenciamento de foto e perfil para todos os usuários
 */
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

function Avatar({ user, size=80 }) {
  const initials = (user?.nome||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: user?.foto ? `url(${user.foto}) center/cover` : 'linear-gradient(135deg,var(--navy),var(--navy-mid))',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size/3, fontWeight:700, color:'white', flexShrink:0,
      border:'3px solid rgba(255,255,255,.2)',
    }}>
      {!user?.foto && initials}
    </div>
  );
}

export default function UserProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [nome, setNome]     = useState(user?.nome || '');
  const [foto, setFoto]     = useState(user?.foto || null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert]   = useState(null);
  const fileRef             = useRef();

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAlert({ type:'error', msg:'Imagem muito grande. Máximo 2MB.' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAlert({ type:'error', msg:'Selecione uma imagem válida (JPG, PNG, GIF).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setFoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!nome.trim()) return setAlert({ type:'error', msg:'Nome não pode estar vazio.' });
    setSaving(true);
    setAlert(null);
    try {
      await updateProfile({ nome: nome.trim(), foto });
      setAlert({ type:'success', msg:'✅ Perfil atualizado com sucesso!' });
      setTimeout(() => { onClose(); }, 1200);
    } catch(e) {
      setAlert({ type:'error', msg: e.response?.data?.error || 'Erro ao salvar.' });
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'white', borderRadius:16, width:'100%', maxWidth:420,
        boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--slate-100)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,var(--navy),var(--navy-mid))', color:'white' }}>
          <div style={{ fontFamily:'var(--font-head)', fontSize:16, fontWeight:700 }}>⚙️ Editar Perfil</div>
          <button onClick={onClose} style={{ border:'none', background:'rgba(255,255,255,.15)', color:'white', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'1.5rem' }}>
          {/* Foto */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
            <div style={{ position:'relative' }}>
              <Avatar user={{ ...user, foto, nome }} size={100} />
              <button
                onClick={() => fileRef.current.click()}
                style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:'50%', background:'var(--emerald)', border:'2px solid white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                📷
              </button>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--navy)' }}>{user?.nome}</div>
              <div style={{ fontSize:12, color:'var(--slate-500)' }}>{user?.email} · {user?.perfil}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => fileRef.current.click()} style={{ padding:'6px 14px', border:'1px solid var(--slate-200)', borderRadius:8, background:'white', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                {foto ? '🔄 Trocar foto' : '📷 Adicionar foto'}
              </button>
              {foto && (
                <button onClick={() => setFoto(null)} style={{ padding:'6px 14px', border:'1px solid #fecaca', borderRadius:8, background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  ❌ Remover
                </button>
              )}
            </div>
            <div style={{ fontSize:11, color:'var(--slate-400)' }}>JPG, PNG — máx 2MB</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFotoChange} />
          </div>

          {/* Nome */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:13, fontWeight:600, marginBottom:6, display:'block' }}>Nome completo</label>
            <input
              value={nome} onChange={e => setNome(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }}
            />
          </div>

          {/* Email (read-only) */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ fontSize:13, fontWeight:600, marginBottom:6, display:'block', color:'var(--slate-400)' }}>E-mail (não editável)</label>
            <input
              value={user?.email} readOnly
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid var(--slate-100)', borderRadius:8, fontSize:13, background:'var(--slate-50)', color:'var(--slate-400)', boxSizing:'border-box' }}
            />
          </div>

          {/* Alert */}
          {alert && (
            <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:'1rem', fontSize:13, fontWeight:600,
              background: alert.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: alert.type === 'success' ? '#166534' : '#991b1b',
              border: '1px solid ' + (alert.type === 'success' ? '#a7f3d0' : '#fca5a5'),
            }}>
              {alert.msg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:'10px 0', border:'1px solid var(--slate-200)', borderRadius:9, background:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{
              flex:2, padding:'10px 0', border:'none', borderRadius:9,
              background: saving ? 'var(--slate-300)' : 'var(--emerald)',
              color:'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700,
            }}>
              {saving ? '⏳ Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

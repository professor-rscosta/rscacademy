/**
 * RSC Academy — Sistema de alertas estilizados
 * Substitui window.alert() e window.confirm() por modais bonitos
 */

function injectStyle() {
  if (document.getElementById('rsc-alert-style')) return;
  const s = document.createElement('style');
  s.id = 'rsc-alert-style';
  s.textContent = `
    @keyframes rscAlertIn { from { opacity:0; transform:scale(.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes rscToastIn  { from { opacity:0; transform:translateX(120%); } to { opacity:1; transform:translateX(0); } }
    @keyframes rscToastOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(120%); } }
    #rsc-toast-container { position:fixed; top:1rem; right:1rem; z-index:99999; display:flex; flex-direction:column; gap:.5rem; pointer-events:none; }
    .rsc-toast { pointer-events:all; min-width:260px; max-width:380px; padding:.75rem 1rem; border-radius:12px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:.5rem; box-shadow:0 8px 24px rgba(0,0,0,.18); animation:rscToastIn .3s cubic-bezier(.34,1.56,.64,1); }
    .rsc-toast.out { animation:rscToastOut .25s ease forwards; }
  `;
  document.head.appendChild(s);
}

function getToastContainer() {
  let c = document.getElementById('rsc-toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'rsc-toast-container'; document.body.appendChild(c); }
  return c;
}

const TOAST_COLORS = {
  success: { bg:'#f0fdf4', border:'#86efac', color:'#166534', icon:'✅' },
  error:   { bg:'#fef2f2', border:'#fca5a5', color:'#991b1b', icon:'❌' },
  warning: { bg:'#fffbeb', border:'#fcd34d', color:'#92400e', icon:'⚠️' },
  info:    { bg:'#eff6ff', border:'#93c5fd', color:'#1e40af', icon:'ℹ️'  },
};

export function showToast(msg, type = 'info', duration = 3500) {
  injectStyle();
  const cfg = TOAST_COLORS[type] || TOAST_COLORS.info;
  const el = document.createElement('div');
  el.className = 'rsc-toast';
  el.style.cssText = `background:${cfg.bg};border:1.5px solid ${cfg.border};color:${cfg.color}`;
  el.innerHTML = `<span style="font-size:18px">${cfg.icon}</span><span style="flex:1">${msg}</span>`;
  getToastContainer().appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, duration);
}

export function showConfirm({ title, text, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) {
  injectStyle();
  return new Promise(resolve => {
    const ICONS = { warning:'⚠️', danger:'🗑️', info:'ℹ️', success:'✅' };
    const GRADS = { warning:'linear-gradient(135deg,#f59e0b,#d97706)', danger:'linear-gradient(135deg,#ef4444,#dc2626)', info:'linear-gradient(135deg,#3b82f6,#1d4ed8)', success:'linear-gradient(135deg,#10b981,#059669)' };
    const BTN_COLORS = { warning:'#d97706', danger:'#dc2626', info:'#1d4ed8', success:'#059669' };
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,27,53,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(5px)';
    overlay.innerHTML = `<div style="background:white;border-radius:24px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.4);animation:rscAlertIn .22s cubic-bezier(.34,1.56,.64,1)">
      <div style="background:${GRADS[type]||GRADS.warning};padding:1.5rem;text-align:center">
        <div style="width:60px;height:60px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:28px">${ICONS[type]||ICONS.warning}</div>
        <div style="font-size:18px;font-weight:800;color:white">${title}</div>
      </div>
      <div style="padding:1.5rem">
        <p style="text-align:center;color:#475569;margin:0 0 1.5rem;font-size:14px;line-height:1.65">${text}</p>
        <div style="display:flex;gap:10px">
          <button id="rsc-cancel" style="flex:1;padding:12px;border:2px solid #e2e8f0;background:white;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;color:#64748b;font-family:inherit">${cancelText}</button>
          <button id="rsc-confirm" style="flex:1;padding:12px;border:none;background:${BTN_COLORS[type]||BTN_COLORS.warning};color:white;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(0,0,0,.2)">${confirmText}</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const close = (val) => { overlay.style.opacity='0'; overlay.style.transition='opacity .2s'; setTimeout(() => { overlay.remove(); resolve(val); }, 210); };
    overlay.querySelector('#rsc-cancel').onclick  = () => close(false);
    overlay.querySelector('#rsc-confirm').onclick = () => close(true);
    overlay.addEventListener('click', e => { if(e.target===overlay) close(false); });
  });
}

export function showAlert({ title, text, type = 'info', btnText = 'OK' }) {
  injectStyle();
  return new Promise(resolve => {
    const ICONS = { warning:'⚠️', danger:'❌', info:'ℹ️', success:'✅', error:'❌' };
    const GRADS = { warning:'linear-gradient(135deg,#f59e0b,#d97706)', danger:'linear-gradient(135deg,#ef4444,#dc2626)', info:'linear-gradient(135deg,#3b82f6,#1d4ed8)', success:'linear-gradient(135deg,#10b981,#059669)', error:'linear-gradient(135deg,#ef4444,#dc2626)' };
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,27,53,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(5px)';
    overlay.innerHTML = `<div style="background:white;border-radius:24px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.4);animation:rscAlertIn .22s cubic-bezier(.34,1.56,.64,1)">
      <div style="background:${GRADS[type]||GRADS.info};padding:1.5rem;text-align:center">
        <div style="font-size:48px;margin-bottom:8px">${ICONS[type]||ICONS.info}</div>
        <div style="font-size:17px;font-weight:800;color:white">${title}</div>
      </div>
      <div style="padding:1.5rem">
        <p style="text-align:center;color:#475569;margin:0 0 1.5rem;font-size:14px;line-height:1.65">${text}</p>
        <button id="rsc-ok" style="width:100%;padding:13px;border:none;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(124,58,237,.4)">${btnText}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => { overlay.style.opacity='0'; overlay.style.transition='opacity .2s'; setTimeout(() => { overlay.remove(); resolve(); }, 210); };
    overlay.querySelector('#rsc-ok').onclick = close;
    overlay.addEventListener('click', e => { if(e.target===overlay) close(); });
  });
}

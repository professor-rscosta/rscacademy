import { fmtDate, fmtDateTime, fmtRelative } from '../../../utils/date.js';
import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState } from '../../../components/ui';

export default function AlunoMural() {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/avisos').then(r => setAvisos(r.data.avisos || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header"><div className="page-title">Mural de Avisos</div><div className="page-sub">Comunicados das suas turmas</div></div>
      {loading ? <div style={{ textAlign:'center', padding:'3rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
      : avisos.length === 0 ? <div className="card"><EmptyState icon="📌" title="Nenhum aviso no momento" sub="Fique atento — seu professor publicará avisos aqui" /></div>
      : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {avisos.map(a => (
            <div key={a.id} className="card notice-card">
              <div className="notice-date">📅 {fmtDate(a.created_at)}</div>
              <div className="notice-title">{a.titulo}</div>
              <div className="notice-body">{a.corpo}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

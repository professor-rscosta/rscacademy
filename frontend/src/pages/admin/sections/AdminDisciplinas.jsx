import { useState, useEffect } from 'react';
import api from '../../../hooks/useApi';
import { EmptyState, Avatar } from '../../../components/ui';

export default function AdminDisciplinas() {
  const [disciplinas, setDiscs] = useState([]);
  const [trilhasMap, setTrilhas] = useState({});
  const [usuarios, setUsers]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/disciplinas'),
      api.get('/trilhas'),
      api.get('/users'),
    ]).then(([dRes, tRes, uRes]) => {
      setDiscs(dRes.data.disciplinas || []);
      const tm = {};
      (tRes.data.trilhas || []).forEach(t => {
        if (!tm[t.disciplina_id]) tm[t.disciplina_id] = [];
        tm[t.disciplina_id].push(t);
      });
      setTrilhas(tm);
      setUsers(uRes.data.users || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = disciplinas.filter(d =>
    d.nome.toLowerCase().includes(search.toLowerCase()) ||
    (d.codigo||'').toLowerCase().includes(search.toLowerCase())
  );

  const profNome = (pid) => {
    const u = usuarios.find(u => u.id === Number(pid));
    return u ? u.nome : `Prof. #${pid}`;
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Disciplinas</div>
        <div className="page-sub">Visão global de todas as disciplinas da plataforma</div>
      </div>

      <div className="card">
        <div className="section-header">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar disciplina..."
            style={{ padding:'8px 12px', border:'1.5px solid var(--slate-200)', borderRadius:8, fontFamily:'var(--font-body)', fontSize:13, width:240, outline:'none' }}
          />
          <span style={{ fontSize:13, color:'var(--slate-500)' }}>{filtered.length} disciplina(s)</span>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📚" title="Nenhuma disciplina encontrada" sub="Professores criam disciplinas em seus dashboards" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Disciplina</th><th>Código</th><th>Professor</th><th>Carga</th><th>Trilhas</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight:600, color:'var(--navy)' }}>{d.nome}</div>
                        {d.descricao && <div style={{ fontSize:11, color:'var(--slate-400)' }}>{d.descricao.slice(0,60)}{d.descricao.length>60?'...':''}</div>}
                      </div>
                    </td>
                    <td><span style={{ padding:'2px 8px', borderRadius:4, background:'var(--slate-100)', fontSize:12, fontFamily:'monospace', fontWeight:600 }}>{d.codigo||'—'}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Avatar name={profNome(d.professor_id)} size={24} />
                        <span style={{ fontSize:13 }}>{profNome(d.professor_id)}</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--slate-500)' }}>{d.carga_horaria}h</td>
                    <td>
                      <span style={{ padding:'3px 8px', borderRadius:50, background:'rgba(16,185,129,0.1)', color:'var(--emerald-dark)', fontSize:12, fontWeight:600 }}>
                        {(trilhasMap[d.id]||[]).length} trilha(s)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

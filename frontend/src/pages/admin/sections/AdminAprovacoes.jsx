import { useEffect, useState } from 'react';
import api from '../../../hooks/useApi';
import { PerfilBadge, Avatar, EmptyState } from '../../../components/ui';

export default function AdminAprovacoes() {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/users/pending');
      setPendentes(res.data.users);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showAlert = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 3000); };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`);
      setPendentes(prev => prev.filter(u => u.id !== id));
      showAlert('success', 'Usuário aprovado com sucesso!');
    } catch { showAlert('error', 'Erro ao aprovar usuário.'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Rejeitar e excluir este cadastro?')) return;
    try {
      await api.delete(`/users/${id}`);
      setPendentes(prev => prev.filter(u => u.id !== id));
      showAlert('success', 'Cadastro rejeitado.');
    } catch { showAlert('error', 'Erro ao rejeitar.'); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Aprovações Pendentes</div>
        <div className="page-sub">{pendentes.length} usuário(s) aguardando aprovação do administrador</div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : pendentes.length === 0 ? (
          <EmptyState icon="✅" title="Nenhuma aprovação pendente!" sub="Todos os cadastros foram processados." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Cadastrado em</th><th>Ações</th></tr></thead>
              <tbody>
                {pendentes.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.nome} size={28} bg="linear-gradient(135deg,#f59e0b,#f43f5e)" />
                        <span style={{ fontWeight: 500 }}>{u.nome}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--slate-500)', fontSize: 12 }}>{u.email}</td>
                    <td><PerfilBadge perfil={u.perfil} /></td>
                    <td style={{ color: 'var(--slate-400)', fontSize: 12 }}>{u.created_at?.split('T')[0]}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-sm btn-approve" onClick={() => handleApprove(u.id)}>✅ Aprovar</button>
                        <button className="btn-sm btn-danger" onClick={() => handleReject(u.id)}>✕ Rejeitar</button>
                      </div>
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

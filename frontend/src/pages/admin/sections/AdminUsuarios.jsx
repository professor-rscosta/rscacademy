import { useEffect, useState } from 'react';
import api from '../../../hooks/useApi';
import { StatusBadge, PerfilBadge, Modal, Avatar } from '../../../components/ui';

const EMPTY_FORM = { nome: '', email: '', senha: '', perfil: 'aluno', status: 'ativo' };

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch { showAlert('error', 'Erro ao carregar usuários.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showAlert = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 3000); };

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil, status: u.status }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.nome || !form.email) return showAlert('error', 'Nome e e-mail são obrigatórios.');
    if (!editUser && !form.senha) return showAlert('error', 'Senha é obrigatória para novo usuário.');
    setSaving(true);
    try {
      if (editUser) {
        const res = await api.put(`/users/${editUser.id}`, { nome: form.nome, email: form.email, perfil: form.perfil, status: form.status });
        setUsers(prev => prev.map(u => u.id === editUser.id ? res.data.user : u));
      } else {
        const res = await api.post('/users', form);
        setUsers(prev => [res.data.user, ...prev]);
      }
      setShowModal(false);
      showAlert('success', editUser ? 'Usuário atualizado!' : 'Usuário criado!');
    } catch (err) { showAlert('error', err.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este usuário definitivamente?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      showAlert('success', 'Usuário excluído.');
    } catch (err) { showAlert('error', err.response?.data?.error || 'Erro ao excluir.'); }
  };

  const handleApprove = async (id) => {
    try {
      const res = await api.patch(`/users/${id}/approve`);
      setUsers(prev => prev.map(u => u.id === id ? res.data.user : u));
      showAlert('success', 'Usuário aprovado!');
    } catch { showAlert('error', 'Erro ao aprovar.'); }
  };

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="page-header">
        <div className="page-title">Gerenciar Usuários</div>
        <div className="page-sub">CRUD completo de usuários da plataforma</div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      <div className="card">
        <div className="section-header">
          <input
            style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, width: 240, outline: 'none' }}
            placeholder="🔍 Buscar usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-create" onClick={openCreate}>+ Novo Usuário</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.nome} size={28} />
                        <span style={{ fontWeight: 500 }}>{u.nome}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--slate-500)', fontSize: 12 }}>{u.email}</td>
                    <td><PerfilBadge perfil={u.perfil} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ color: 'var(--slate-400)', fontSize: 12 }}>{u.created_at?.split('T')[0]}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.status === 'pendente' && <button className="btn-sm btn-approve" onClick={() => handleApprove(u.id)}>Aprovar</button>}
                        {u.perfil !== 'admin' && <button className="btn-sm btn-edit" onClick={() => openEdit(u)}>Editar</button>}
                        {u.perfil !== 'admin' && <button className="btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--slate-400)', padding: '2rem' }}>Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editUser ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => setShowModal(false)}>
          <div className="field"><label>Nome completo</label><input value={form.nome} onChange={set('nome')} placeholder="Nome do usuário" /></div>
          <div className="field"><label>E-mail</label><input type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" /></div>
          {!editUser && <div className="field"><label>Senha</label><input type="password" value={form.senha} onChange={set('senha')} placeholder="Mínimo 6 caracteres" /></div>}
          <div className="form-row">
            <div className="field">
              <label>Perfil</label>
              <select value={form.perfil} onChange={set('perfil')}>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="ativo">Ativo</option>
                <option value="pendente">Pendente</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </Modal>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  UserPlus,
} from 'lucide-react';

export const UserManagementPage = () => {
  const { success, error } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Add Admin modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      error(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = !user.isActive;
      const res = await api.toggleUserStatus(user._id, newStatus);
      success(res.message);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const handleOpenResetModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      error('Password must be at least 4 characters long.');
      return;
    }

    try {
      setResetting(true);
      const res = await api.resetUserPassword(selectedUser._id, newPassword);
      success(res.message);
      setResetModalOpen(false);
    } catch (err) {
      error(err.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirm = window.confirm(`Are you sure you want to delete user "${user.username}"?`);
    if (!confirm) return;

    try {
      const res = await api.deleteUser(user._id);
      success(res.message);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to delete user.');
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminForm.username.trim() || !adminForm.password || !adminForm.name.trim()) {
      error('Full Name, Username, and Password are required.');
      return;
    }

    try {
      setCreatingAdmin(true);
      const res = await api.createAdmin(adminForm);
      success(res.message || 'Admin created successfully!');
      setAdminModalOpen(false);
      setAdminForm({ username: '', password: '', name: '', email: '' });
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to create admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.refId && u.refId.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">User Account Management</h1>
          <p className="page-subtitle">
            View registered user accounts, manage statuses, and perform password resets.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setAdminModalOpen(true)}
        >
          <UserPlus size={18} />
          <span>Add New Admin</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by username, name, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="select-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="faculty">Faculty</option>
          <option value="student">Student</option>
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Total Accounts: <strong>{filteredUsers.length}</strong>
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading user accounts...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          <Users size={40} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>No Users Found</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            No user accounts match your search criteria.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Linked Ref ID</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u._id}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong style={{ color: 'var(--primary-dark)' }}>{u.username}</strong>
                    </td>
                    <td>{u.name}</td>
                    <td>
                      <span
                        className={`badge ${
                          u.role === 'admin'
                            ? 'badge-primary'
                            : u.role === 'faculty'
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{u.refId || '-'}</td>
                    <td>
                      <span
                        className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-danger'}`}
                      >
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`btn btn-sm ${
                              u.isActive !== false ? 'btn-secondary' : 'btn-primary'
                            }`}
                            title={u.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          className="btn btn-secondary btn-sm"
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)' }}
                            title="Delete Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password for ${selectedUser?.username}`}
      >
        <form onSubmit={handleResetPasswordSubmit}>
          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password (min. 4 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={resetting}>
              {resetting ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Add New Admin Account"
      >
        <form onSubmit={handleCreateAdminSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Prof. S. Ramanathan"
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="admin@college.edu"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. admin2"
              value={adminForm.username}
              onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Min. 4 characters"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAdminModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingAdmin}>
              {creatingAdmin ? 'Creating Admin...' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

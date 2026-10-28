import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { UserCheck, Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const FacultyPage = () => {
  const { success, error } = useToast();

  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [availFilter, setAvailFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    facultyId: '',
    department: 'CSE',
    availability: true,
    email: '',
    phone: '',
  });

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const data = await api.getFaculty({
        search: searchTerm,
        department: deptFilter,
        availability: availFilter,
      });
      if (data.success) {
        setFacultyList(data.faculty || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch faculty list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, [searchTerm, deptFilter, availFilter]);

  const handleOpenAddModal = () => {
    setEditingFaculty(null);
    setFormData({
      name: '',
      facultyId: '',
      department: 'CSE',
      availability: true,
      email: '',
      phone: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (fac) => {
    setEditingFaculty(fac);
    setFormData({
      name: fac.name,
      facultyId: fac.facultyId,
      department: fac.department,
      availability: fac.availability,
      email: fac.email || '',
      phone: fac.phone || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.facultyId.trim()) {
      error('Please provide faculty name and faculty ID.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingFaculty) {
        const res = await api.updateFaculty(editingFaculty._id, formData);
        success(res.message || 'Faculty updated successfully.');
      } else {
        const res = await api.createFaculty(formData);
        success(res.message || 'Faculty added successfully.');
      }
      setIsModalOpen(false);
      fetchFaculty();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (fac) => {
    try {
      const res = await api.updateFaculty(fac._id, {
        availability: !fac.availability,
      });
      success(`Faculty status set to ${!fac.availability ? 'Available' : 'Unavailable'}.`);
      fetchFaculty();
    } catch (err) {
      error(err.message || 'Failed to update availability.');
    }
  };

  const handleDeleteFaculty = async (fac) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete faculty "${fac.name}" (${fac.facultyId})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.deleteFaculty(fac._id);
      success(res.message || 'Faculty deleted successfully.');
      fetchFaculty();
    } catch (err) {
      error(err.message || 'Faculty could not be deleted.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Management</h1>
          <p className="page-subtitle">Manage invigilation staff members and duty availability status.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Faculty</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by faculty name or faculty ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="select-filter"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="ECE">ECE</option>
          <option value="IT">IT</option>
          <option value="MECH">MECH</option>
          <option value="EEE">EEE</option>
          <option value="AIDS">AIDS</option>
        </select>

        <select
          className="select-filter"
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
        >
          <option value="">All Availability</option>
          <option value="true">Available for Duty</option>
          <option value="false">Unavailable</option>
        </select>

        {(searchTerm || deptFilter || availFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDeptFilter('');
              setAvailFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Faculty Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading faculty directory...
          </div>
        ) : facultyList.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={36} />
            <p>No faculty members found matching your search filters.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Faculty ID</th>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>Contact Info</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facultyList.map((fac) => (
                <tr key={fac._id}>
                  <td>
                    <strong>{fac.facultyId}</strong>
                  </td>
                  <td>{fac.name}</td>
                  <td>
                    <span className="badge badge-primary">{fac.department}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleAvailability(fac)}
                      className={`badge ${fac.availability ? 'badge-success' : 'badge-danger'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      title="Click to toggle availability status"
                    >
                      {fac.availability ? (
                        <>
                          <CheckCircle size={12} /> Available
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> Unavailable
                        </>
                      )}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div>{fac.email || '—'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{fac.phone || ''}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditModal(fac)}
                        className="btn btn-secondary btn-sm"
                        title="Edit faculty"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteFaculty(fac)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete faculty"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add / Edit Faculty */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Details' : 'Add New Faculty Member'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Faculty Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Dr. Rajesh Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Faculty ID * (Unique)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. FAC101"
              value={formData.facultyId}
              onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              >
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="IT">IT</option>
                <option value="MECH">MECH</option>
                <option value="EEE">EEE</option>
                <option value="AIDS">AIDS</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Invigilation Availability *</label>
              <select
                className="form-control"
                value={formData.availability}
                onChange={(e) =>
                  setFormData({ ...formData, availability: e.target.value === 'true' })
                }
              >
                <option value="true">Available for Duty</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="faculty@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-control"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingFaculty ? 'Update Faculty' : 'Add Faculty'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

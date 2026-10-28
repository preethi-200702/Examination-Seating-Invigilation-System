import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { Users, Plus, Search, Edit2, Trash2, Filter } from 'lucide-react';

export const StudentsPage = () => {
  const { success, error } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [secFilter, setSecFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    department: 'CSE',
    year: 3,
    section: 'A',
    email: '',
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents({
        search: searchTerm,
        department: deptFilter,
        year: yearFilter,
        section: secFilter,
      });
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, deptFilter, yearFilter, secFilter]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      registerNumber: '',
      department: 'CSE',
      year: 3,
      section: 'A',
      email: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      registerNumber: student.registerNumber,
      department: student.department,
      year: student.year,
      section: student.section,
      email: student.email || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.registerNumber.trim()) {
      error('Please provide student name and register number.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingStudent) {
        const res = await api.updateStudent(editingStudent._id, formData);
        success(res.message || 'Student updated successfully.');
      } else {
        const res = await api.createStudent(formData);
        success(res.message || 'Student added successfully.');
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete student "${student.name}" (${student.registerNumber})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.deleteStudent(student._id);
      success(res.message || 'Student deleted successfully.');
      fetchStudents();
    } catch (err) {
      error(err.message || 'Student could not be deleted.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">View, add, edit, and organize enrolled student records.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or register number..."
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
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>

        <select
          className="select-filter"
          value={secFilter}
          onChange={(e) => setSecFilter(e.target.value)}
        >
          <option value="">All Sections</option>
          <option value="A">Section A</option>
          <option value="B">Section B</option>
          <option value="C">Section C</option>
          <option value="D">Section D</option>
          <option value="E">Section E</option>
          <option value="F">Section F</option>
        </select>

        {(searchTerm || deptFilter || yearFilter || secFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDeptFilter('');
              setYearFilter('');
              setSecFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Students Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading students list...
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <Users size={36} />
            <p>No student records found matching your filters.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Register No.</th>
                <th>Student Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Section</th>
                <th>Email Address</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>
                    <strong>{student.registerNumber}</strong>
                  </td>
                  <td>{student.name}</td>
                  <td>
                    <span className="badge badge-primary">{student.department}</span>
                  </td>
                  <td>Year {student.year}</td>
                  <td>Section {student.section}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {student.email || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditModal(student)}
                        className="btn btn-secondary btn-sm"
                        title="Edit student"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete student"
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

      {/* Modal for Add / Edit Student */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Add New Student'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Aarav Patel"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Register Number * (Unique)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 7376221CS101"
              value={formData.registerNumber}
              onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
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
              <label className="form-label">Year of Study *</label>
              <select
                className="form-control"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                required
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section *</label>
              <select
                className="form-control"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                <option value="E">Section E</option>
                <option value="F">Section F</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              className="form-control"
              placeholder="student@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
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
              {submitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

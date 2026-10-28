import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { Calendar, Plus, Search, Edit2, Trash2, Grid, ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const ExamsPage = () => {
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    subjectCode: '',
    examDate: new Date().toISOString().split('T')[0],
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    department: 'CSE',
    year: 3,
    section: 'A',
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await api.getExams({
        search: searchTerm,
        department: deptFilter,
        year: yearFilter,
      });
      if (data.success) {
        setExams(data.exams || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch examinations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [searchTerm, deptFilter, yearFilter]);

  const handleOpenAddModal = () => {
    setEditingExam(null);
    setFormData({
      subject: '',
      subjectCode: '',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '09:30 AM',
      endTime: '12:30 PM',
      department: 'CSE',
      year: 3,
      section: 'A',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exam) => {
    setEditingExam(exam);
    const dateFormatted = new Date(exam.examDate).toISOString().split('T')[0];
    setFormData({
      subject: exam.subject,
      subjectCode: exam.subjectCode || '',
      examDate: dateFormatted,
      startTime: exam.startTime,
      endTime: exam.endTime,
      department: exam.department,
      year: exam.year,
      section: exam.section,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.examDate || !formData.startTime || !formData.endTime) {
      error('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingExam) {
        const res = await api.updateExam(editingExam._id, formData);
        success(res.message || 'Exam updated successfully.');
      } else {
        const res = await api.createExam(formData);
        success(res.message || 'Exam schedule created successfully.');
      }
      setIsModalOpen(false);
      fetchExams();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (exam) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete exam "${exam.subject}"? This will also remove any seating and invigilation records generated for this exam.`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.deleteExam(exam._id);
      success(res.message || 'Exam deleted successfully.');
      fetchExams();
    } catch (err) {
      error(err.message || 'Exam could not be deleted.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Examination Timetable Management</h1>
          <p className="page-subtitle">Schedule examinations, define timings, and allocate student cohorts.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Schedule New Exam</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by subject name or subject code..."
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

        {(searchTerm || deptFilter || yearFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDeptFilter('');
              setYearFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Examinations Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading examinations timetable...
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <Calendar size={36} />
            <p>No examinations found matching your filter criteria.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject & Code</th>
                <th>Exam Date</th>
                <th>Time Slot</th>
                <th>Target Class</th>
                <th>Status</th>
                <th>Allocations</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam._id}>
                  <td>
                    <strong>{exam.subject}</strong>
                    {exam.subjectCode && (
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {exam.subjectCode}
                      </span>
                    )}
                  </td>
                  <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                  <td>
                    {exam.startTime} – {exam.endTime}
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {exam.department} Yr {exam.year} ({exam.section})
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        exam.status === 'Invigilation Assigned'
                          ? 'badge-success'
                          : exam.status === 'Seating Generated'
                          ? 'badge-primary'
                          : 'badge-warning'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>
                      <span>Seats: <strong>{exam.seatingCount || 0}</strong></span>
                      <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>•</span>
                      <span>Faculty: <strong>{exam.invigilationCount || 0}</strong></span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => navigate('/seating')}
                        className="btn btn-outline-primary btn-sm"
                        title="Manage seating for this exam"
                      >
                        <Grid size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(exam)}
                        className="btn btn-secondary btn-sm"
                        title="Edit exam schedule"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete exam"
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

      {/* Modal for Add / Edit Examination */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Examination Schedule' : 'Schedule New Examination'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Compiler Design"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Subject Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CS3501"
                value={formData.subjectCode}
                onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Exam Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 09:30 AM"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time * (Must be after Start)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 12:30 PM"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
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
              <label className="form-label">Year *</label>
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

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingExam ? 'Update Exam' : 'Save Exam Schedule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

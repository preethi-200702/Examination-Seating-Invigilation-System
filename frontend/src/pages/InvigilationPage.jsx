import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import {
  ClipboardList,
  Play,
  RotateCcw,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Edit2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const InvigilationPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [invigilationData, setInvigilationData] = useState(null);
  const [allFaculty, setAllFaculty] = useState([]);

  const [loadingExams, setLoadingExams] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingDuties, setLoadingDuties] = useState(false);

  // Manual Reassignment Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedDuty, setSelectedDuty] = useState(null);
  const [targetFacultyId, setTargetFacultyId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // Fetch exams list
  const fetchExamsList = async () => {
    try {
      setLoadingExams(true);
      const data = await api.getExams();
      if (data.success && data.exams.length > 0) {
        setExams(data.exams);
        setSelectedExamId(data.exams[0]._id);
      }
    } catch (err) {
      error(err.message || 'Failed to load examinations.');
    } finally {
      setLoadingExams(false);
    }
  };

  // Fetch faculty list for manual reassignment dropdown
  const fetchFacultyList = async () => {
    try {
      const data = await api.getFaculty({ availability: 'true' });
      if (data.success) {
        setAllFaculty(data.faculty || []);
      }
    } catch (err) {
      console.error('Error loading faculty list:', err);
    }
  };

  // Fetch invigilation duties for selected exam
  const fetchDutiesForExam = async (examId) => {
    if (!examId) return;
    try {
      setLoadingDuties(true);
      const data = await api.getInvigilationByExam(examId);
      if (data.success) {
        setInvigilationData(data);
      }
    } catch (err) {
      setInvigilationData(null);
    } finally {
      setLoadingDuties(false);
    }
  };

  useEffect(() => {
    fetchExamsList();
    fetchFacultyList();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchDutiesForExam(selectedExamId);
    }
  }, [selectedExamId]);

  // Generate Invigilation Duties
  const handleGenerateInvigilation = async () => {
    if (!selectedExamId) {
      error('Please select an examination.');
      return;
    }

    try {
      setGenerating(true);
      const res = await api.generateInvigilation(selectedExamId);
      success(res.message || 'Invigilation duties generated successfully!');
      fetchDutiesForExam(selectedExamId);
      fetchExamsList();
    } catch (err) {
      error(err.message || 'Could not generate invigilation duties.');
    } finally {
      setGenerating(false);
    }
  };

  // Clear Invigilation Duties
  const handleClearInvigilation = async () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all invigilation assignments for this examination?'
    );
    if (!confirmClear) return;

    try {
      const res = await api.clearInvigilation(selectedExamId);
      success(res.message || 'Invigilation duties cleared.');
      fetchDutiesForExam(selectedExamId);
      fetchExamsList();
    } catch (err) {
      error(err.message || 'Failed to clear invigilation duties.');
    }
  };

  // Open Reassignment Modal
  const handleOpenReassignModal = (duty) => {
    setSelectedDuty(duty);
    setTargetFacultyId(duty.facultyId?._id || duty.facultyId || '');
    setIsReassignModalOpen(true);
  };

  // Submit Reassignment
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!targetFacultyId) {
      error('Please select a replacement faculty member.');
      return;
    }

    try {
      setReassigning(true);
      const res = await api.reassignDuty(selectedDuty._id, targetFacultyId);
      success(res.message || 'Invigilator reassigned successfully.');
      setIsReassignModalOpen(false);
      fetchDutiesForExam(selectedExamId);
    } catch (err) {
      error(err.message || 'Failed to reassign invigilator.');
    } finally {
      setReassigning(false);
    }
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invigilation Duty Assignment</h1>
          <p className="page-subtitle">
            Assign available faculty to examination halls and resolve timetable duties.
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="header-actions">
            <button
              onClick={handleGenerateInvigilation}
              className="btn btn-primary"
              disabled={generating || !selectedExamId}
            >
              <Play size={16} />
              <span>{generating ? 'Assigning Faculty...' : 'Generate Invigilation'}</span>
            </button>
            {selectedExamId && (
              <a
                href={api.getPdfUrl(`/invigilation/${selectedExamId}`)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                title="Download complete faculty duty PDF"
              >
                <ClipboardList size={16} />
                <span>Download Faculty Duty PDF</span>
              </a>
            )}
            {invigilationData?.assignments?.length > 0 && (
              <button
                onClick={handleClearInvigilation}
                className="btn btn-secondary"
                title="Clear assignments"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Select Examination & Faculty Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
            Select Examination:
          </label>
          <select
            className="select-filter"
            style={{ minWidth: '240px' }}
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            {exams.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.subject} ({exam.department} - Yr {exam.year} Sec {exam.section})
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: 'auto', fontSize: '0.88rem' }}>
            <span>
              Date: <strong>{new Date(selectedExam.examDate).toLocaleDateString()}</strong>
            </span>
            <span>
              Time: <strong>{selectedExam.startTime} – {selectedExam.endTime}</strong>
            </span>
            <span
              className={`badge ${
                selectedExam.status === 'Invigilation Assigned'
                  ? 'badge-success'
                  : selectedExam.status === 'Seating Generated'
                  ? 'badge-primary'
                  : 'badge-warning'
              }`}
            >
              {selectedExam.status}
            </span>
          </div>
        )}
      </div>

      {loadingDuties ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading invigilation assignments...
        </div>
      ) : !invigilationData || invigilationData.assignments?.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={40} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Invigilators Assigned Yet
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 18px', fontSize: '0.9rem' }}>
            Make sure seating is generated first. Then click "Generate Invigilation" to automatically match available faculty.
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={handleGenerateInvigilation}
              className="btn btn-primary"
              disabled={generating}
            >
              <Play size={16} />
              <span>Generate Invigilation Now</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active Status Banner */}
          <div
            className="card"
            style={{
              backgroundColor: '#f0fdf4',
              borderColor: 'var(--success-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
            }}
          >
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <strong style={{ color: '#065f46', fontSize: '1rem' }}>
                All Examination Halls Fully Staffed
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#166534' }}>
                {invigilationData.count} invigilator(s) allocated for {invigilationData.count} examination hall(s).
              </p>
            </div>
          </div>

          {/* Duty Assignments Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px',
            }}
          >
            {invigilationData.assignments.map((duty) => (
              <div key={duty._id} className="card" style={{ marginBottom: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      Hall: {duty.roomNumber}
                    </h3>
                  </div>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleOpenReassignModal(duty)}
                      className="btn btn-secondary btn-sm"
                      title="Reassign invigilator"
                    >
                      <Edit2 size={13} />
                      <span>Reassign</span>
                    </button>
                  )}
                </div>

                <div style={{ backgroundColor: 'var(--primary-bg)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <UserCheck size={18} color="var(--primary-dark)" />
                    <strong style={{ fontSize: '0.98rem', color: 'var(--primary-dark)' }}>
                      {duty.facultyName}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Faculty ID: <strong>{duty.facultyCode}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="var(--text-muted)" />
                    <span>Date: {new Date(duty.examDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--text-muted)" />
                    <span>Time: {duty.startTime} – {duty.endTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for Manual Invigilator Reassignment */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title={`Reassign Invigilator for Room ${selectedDuty?.roomNumber}`}
      >
        <form onSubmit={handleReassignSubmit}>
          <div className="form-group">
            <label className="form-label">Select Available Faculty Member *</label>
            <select
              className="form-control"
              value={targetFacultyId}
              onChange={(e) => setTargetFacultyId(e.target.value)}
              required
            >
              <option value="">-- Choose Faculty Member --</option>
              {allFaculty.map((fac) => (
                <option key={fac._id} value={fac._id}>
                  {fac.name} ({fac.facultyId} - {fac.department})
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--primary-bg)',
              borderRadius: 'var(--radius)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}
          >
            The system will check for timetable conflicts before completing the reassignment.
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReassignModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={reassigning}>
              {reassigning ? 'Reassigning...' : 'Save Reassignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Grid,
  Play,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Printer,
  Users,
} from 'lucide-react';

export const SeatingPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [seatingData, setSeatingData] = useState(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingSeating, setLoadingSeating] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Fetch all exams on load
  const fetchExamsList = async () => {
    try {
      setLoadingExams(true);
      const data = await api.getExams();
      if (data.success && data.exams.length > 0) {
        setExams(data.exams);
        setSelectedExamId(data.exams[0]._id);
      }
    } catch (err) {
      error(err.message || 'Failed to load examinations list.');
    } finally {
      setLoadingExams(false);
    }
  };

  // Fetch seating arrangement for currently selected exam
  const fetchSeatingForExam = async (examId) => {
    if (!examId) return;
    try {
      setLoadingSeating(true);
      const data = await api.getSeatingByExam(examId);
      if (data.success) {
        setSeatingData(data);
      }
    } catch (err) {
      setSeatingData(null);
      // Not an error if no seating generated yet
    } finally {
      setLoadingSeating(false);
    }
  };

  useEffect(() => {
    fetchExamsList();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchSeatingForExam(selectedExamId);
    }
  }, [selectedExamId]);

  // Generate Seating
  const handleGenerateSeating = async () => {
    if (!selectedExamId) {
      error('Please select an examination first.');
      return;
    }

    try {
      setGenerating(true);
      const res = await api.generateSeating(selectedExamId);
      success(res.message || 'Seating arrangement generated successfully!');
      fetchSeatingForExam(selectedExamId);
      fetchExamsList();
    } catch (err) {
      error(err.message || 'Could not generate seating arrangement.');
    } finally {
      setGenerating(false);
    }
  };

  // Clear Seating
  const handleClearSeating = async () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all seating allocations for this examination?'
    );
    if (!confirmClear) return;

    try {
      const res = await api.clearSeating(selectedExamId);
      success(res.message || 'Seating records cleared.');
      fetchSeatingForExam(selectedExamId);
      fetchExamsList();
    } catch (err) {
      error(err.message || 'Failed to clear seating records.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Automated Seating Allocation</h1>
          <p className="page-subtitle">
            Generate and visualize student seat distributions across available examination halls.
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="header-actions" style={{ flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateSeating}
              className="btn btn-primary"
              disabled={generating || !selectedExamId}
            >
              <Play size={16} />
              <span>{generating ? 'Generating Seats...' : 'Generate Seating'}</span>
            </button>
            {seatingData?.seatings?.length > 0 && (
              <>
                <a
                  href={api.getPdfUrl(`/seating/${selectedExamId}/all`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  title="Download All Students PDF"
                >
                  <Printer size={16} />
                  <span>Download All Students PDF</span>
                </a>

                <a
                  href={api.getPdfUrl(`/seating/${selectedExamId}/venues-summary`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  title="Download Venue-wise Seating PDF"
                >
                  <Building2 size={16} />
                  <span>Download Venue-wise PDF</span>
                </a>

                <button onClick={handleClearSeating} className="btn btn-secondary" title="Clear seating">
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Select Examination Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
            Select Examination:
          </label>
          <select
            className="select-filter"
            style={{ minWidth: '280px' }}
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

      {loadingSeating ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading seating allocations...
        </div>
      ) : !seatingData || seatingData.seatings?.length === 0 ? (
        <div className="empty-state">
          <Grid size={40} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Seating Generated for this Exam
          </h3>
          <p style={{ maxWidth: '460px', margin: '0 auto 18px', fontSize: '0.9rem' }}>
            Click the "Generate Seating" button above to automatically assign enrolled students to available halls.
          </p>
          {user?.role === 'admin' && (
            <button
              onClick={handleGenerateSeating}
              className="btn btn-primary"
              disabled={generating}
            >
              <Play size={16} />
              <span>Generate Seating Now</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary Banner */}
          <div
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#faf5ff',
              borderColor: 'var(--primary-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={24} color="#059669" />
              <div>
                <strong style={{ color: 'var(--primary-dark)', fontSize: '1rem' }}>
                  Seating Plan Active: {seatingData.totalStudents} Students Allocated
                </strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Distributed sequentially across {seatingData.totalVenues} examination hall(s).
                </p>
              </div>
            </div>

            <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
              <Search size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Filter student or seat..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Room-wise Seating Visual Grid & List */}
          {seatingData.venueGroups?.map((group) => {
            const filteredStudents = group.students.filter(
              (s) =>
                s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.registerNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.seatNumber.toLowerCase().includes(studentSearch.toLowerCase())
            );

            if (filteredStudents.length === 0 && studentSearch) return null;

            return (
              <div key={group.roomNumber} className="room-card">
                <div className="room-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={22} color="var(--primary)" />
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        Room {group.roomNumber}
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {group.venueName}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a
                      href={api.getPdfUrl(`/seating/${selectedExamId}/venue/${group.venueId?._id || group.venueId}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      title={`Download Room ${group.roomNumber} PDF`}
                    >
                      <Printer size={13} />
                      <span>Download Room PDF</span>
                    </a>
                    <span className="badge badge-primary">
                      {filteredStudents.length} Students Allocated
                    </span>
                  </div>
                </div>

                {/* Grid of Seat Blocks */}
                <div className="seat-grid">
                  {filteredStudents.map((seat) => (
                    <div key={seat._id} className="seat-box">
                      <div className="seat-num">{seat.seatNumber}</div>
                      <div className="seat-reg">{seat.registerNumber}</div>
                      <div className="seat-name" title={seat.studentName}>
                        {seat.studentName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

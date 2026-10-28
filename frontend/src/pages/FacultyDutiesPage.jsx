import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ClipboardList, Calendar, Clock, Building2, UserCheck, ShieldCheck } from 'lucide-react';

export const FacultyDutiesPage = () => {
  const { user } = useAuth();
  const { error } = useToast();

  const [duties, setDuties] = useState([]);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyDuties = async () => {
    try {
      setLoading(true);
      const data = await api.getMyDuties();
      if (data.success) {
        setDuties(data.duties || []);
        setFacultyInfo(data.faculty);
      }
    } catch (err) {
      error(err.message || 'Failed to load assigned invigilation duties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDuties();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Invigilation Duties</h1>
          <p className="page-subtitle">
            View your scheduled examination supervisory duties, examination halls, and timings.
          </p>
        </div>
      </div>

      {/* Faculty Profile Summary Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderColor: 'var(--primary-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'white',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <UserCheck size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
              {facultyInfo?.name || user?.name}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Faculty ID: <strong>{facultyInfo?.facultyId || user?.refId}</strong> • Department:{' '}
              <strong>{facultyInfo?.department || 'CSE'}</strong>
            </p>
          </div>
        </div>

        <div>
          <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            <ShieldCheck size={14} /> Available for Invigilation
          </span>
        </div>
      </div>

      {/* Duties List */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          Assigned Examination Supervisory Schedule ({duties.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading your invigilation assignments...
          </div>
        ) : duties.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={36} />
            <p>You have no invigilation duties currently scheduled.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Examination Subject</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Assigned Hall</th>
                  <th>Venue Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {duties.map((duty) => (
                  <tr key={duty._id}>
                    <td>
                      <strong>{duty.examId?.subject || 'Examination'}</strong>
                      {duty.examId?.subjectCode && (
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {duty.examId.subjectCode}
                        </span>
                      )}
                    </td>
                    <td>{new Date(duty.examDate).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} color="var(--primary)" />
                        <span>
                          {duty.startTime} – {duty.endTime}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">Room {duty.roomNumber}</span>
                    </td>
                    <td>{duty.venueId?.venueName || 'Main Examination Block'}</td>
                    <td>
                      <span className="badge badge-success">Assigned & Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

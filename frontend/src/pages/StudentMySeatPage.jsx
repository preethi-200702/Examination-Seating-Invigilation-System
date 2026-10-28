import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  GraduationCap,
  Calendar,
  Clock,
  Building2,
  Grid,
  CheckCircle2,
  Printer,
  User,
} from 'lucide-react';

export const StudentMySeatPage = () => {
  const { user } = useAuth();
  const { error } = useToast();

  const [studentInfo, setStudentInfo] = useState(null);
  const [seatings, setSeatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMySeatDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getMySeat();
      if (data.success) {
        setStudentInfo(data.student);
        setSeatings(data.seatings || []);
      }
    } catch (err) {
      error(err.message || 'Failed to load your seating details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySeatDetails();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Examination Seating Details</h1>
          <p className="page-subtitle">
            View your allocated examination hall, seat numbers, and scheduled timings.
          </p>
        </div>
        <button onClick={handlePrint} className="btn btn-secondary">
          <Printer size={16} />
          <span>Print Hall Ticket Slip</span>
        </button>
      </div>

      {/* Student Profile Card */}
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
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'white',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
              {studentInfo?.name || user?.name}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Register Number: <strong>{studentInfo?.registerNumber || user?.refId}</strong> •{' '}
              {studentInfo?.department || 'CSE'} Year {studentInfo?.year || 3} (Sec{' '}
              {studentInfo?.section || 'A'})
            </p>
          </div>
        </div>

        <div>
          <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            <CheckCircle2 size={15} /> Verified Student Profile
          </span>
        </div>
      </div>

      {/* Seating Allocations List */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
          Your Allocated Examination Seats ({seatings.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading your examination seating allocations...
          </div>
        ) : seatings.length === 0 ? (
          <div className="empty-state">
            <Grid size={36} />
            <p>No examination seating records generated for you yet. Please check back soon.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px',
            }}
          >
            {seatings.map((seat) => (
              <div
                key={seat._id}
                style={{
                  border: '1px solid var(--primary-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                      {seat.examId?.subject || 'Examination'}
                    </h4>
                    {seat.examId?.subjectCode && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {seat.examId.subjectCode}
                      </span>
                    )}
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                    Seat {seat.seatNumber}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--primary-bg)',
                    padding: '12px',
                    borderRadius: 'var(--radius)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Building2 size={18} color="var(--primary)" />
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      Room {seat.roomNumber}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Venue: {seat.venueId?.venueName || 'Main Hall'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    <span>
                      Date: {seat.examId?.examDate ? new Date(seat.examId.examDate).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--text-muted)" />
                    <span>
                      Time: {seat.examId?.startTime} – {seat.examId?.endTime}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <User size={14} color="var(--text-muted)" />
                    <span>
                      Invigilator: <strong>{seat.invigilatorName || 'Assigned on exam day'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

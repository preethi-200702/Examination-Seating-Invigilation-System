import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/StatCard';
import {
  Users,
  UserCheck,
  Building2,
  Calendar,
  Grid,
  ClipboardList,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const { error, info } = useToast();

  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      if (data.success) {
        setStats(data.stats);
        setRecentExams(data.recentExams || []);
      }
    } catch (err) {
      error(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Examination Dashboard</h1>
          <p className="page-subtitle">
            Welcome, <strong>{user?.name}</strong>! System metrics and examination operations overview.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm" title="Refresh metrics">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading dashboard statistics...
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="stat-grid">
            <StatCard
              title="Total Students"
              value={stats?.totalStudents}
              icon={<Users size={24} />}
              color="#7c3aed"
              subtitle="Registered students"
            />
            <StatCard
              title="Total Faculty"
              value={stats?.totalFaculty}
              icon={<UserCheck size={24} />}
              color="#0284c7"
              subtitle={`${stats?.activeFaculty ?? 0} available for duty`}
            />
            <StatCard
              title="Total Venues"
              value={stats?.totalVenues}
              icon={<Building2 size={24} />}
              color="#059669"
              subtitle={`${stats?.totalCapacity ?? 0} total seat capacity`}
            />
            <StatCard
              title="Examinations"
              value={stats?.totalExams}
              icon={<Calendar size={24} />}
              color="#d97706"
              subtitle="Scheduled timetable"
            />
            <StatCard
              title="Seating Allocations"
              value={stats?.totalSeatings}
              icon={<Grid size={24} />}
              color="#8b5cf6"
              subtitle="Assigned student seats"
            />
            <StatCard
              title="Invigilation Duties"
              value={stats?.totalInvigilations}
              icon={<ClipboardList size={24} />}
              color="#0d9488"
              subtitle="Hall invigilator duties"
            />
            <StatCard
              title="System Conflicts"
              value={stats?.totalConflicts}
              icon={<ShieldAlert size={24} />}
              color={stats?.totalConflicts > 0 ? '#dc2626' : '#059669'}
              subtitle={stats?.totalConflicts > 0 ? 'Requires attention' : 'All clear'}
            />
          </div>

          {/* Quick Operations Banner for Admin */}
          {user?.role === 'admin' && (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderColor: 'var(--primary-border)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ color: 'var(--primary-dark)', fontSize: '1.15rem', marginBottom: '4px' }}>
                    Automated Exam Workflow
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Generate conflict-free seatings, assign invigilator duties, and scan timetable clashes in real-time.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link to="/seating" className="btn btn-primary btn-sm">
                    <Grid size={16} />
                    <span>Generate Seating</span>
                  </Link>
                  <Link to="/invigilation" className="btn btn-secondary btn-sm">
                    <ClipboardList size={16} />
                    <span>Assign Invigilation</span>
                  </Link>
                  <Link to="/conflicts" className="btn btn-secondary btn-sm">
                    <ShieldAlert size={16} />
                    <span>Run Conflict Check</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Examinations Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Scheduled Examinations</h3>
              {user?.role === 'admin' && (
                <Link to="/exams" style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Manage All Exams</span>
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>

            {recentExams.length === 0 ? (
              <div className="empty-state">
                <Calendar size={36} />
                <p>No examinations scheduled yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Subject / Code</th>
                      <th>Date</th>
                      <th>Time Slot</th>
                      <th>Class Target</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExams.map((exam) => (
                      <tr key={exam._id}>
                        <td>
                          <strong>{exam.subject}</strong>
                          {exam.subjectCode && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {exam.subjectCode}
                            </span>
                          )}
                        </td>
                        <td>{new Date(exam.examDate).toLocaleDateString()}</td>
                        <td>
                          {exam.startTime} – {exam.endTime}
                        </td>
                        <td>
                          {exam.department} • Year {exam.year} ({exam.section})
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
                          <Link to="/seating" className="btn btn-outline-primary btn-sm">
                            View Plan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

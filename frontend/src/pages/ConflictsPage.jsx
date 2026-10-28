import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

export const ConflictsPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const data = await api.getConflicts({
        conflictType: typeFilter,
        status: statusFilter,
      });
      if (data.success) {
        setConflicts(data.conflicts || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch conflict records.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      const res = await api.scanConflicts();
      success(res.message || 'Conflict scan completed.');
      fetchConflicts();
    } catch (err) {
      error(err.message || 'Failed to execute conflict scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolveConflict = async (id) => {
    try {
      const res = await api.resolveConflict(id, 'Resolved');
      success(res.message || 'Conflict marked as Resolved.');
      fetchConflicts();
    } catch (err) {
      error(err.message || 'Failed to update conflict.');
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [typeFilter, statusFilter]);

  const unresolvedCount = conflicts.filter((c) => c.status === 'Unresolved').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Conflict Detection & Management</h1>
          <p className="page-subtitle">
            Automated intelligence detecting timetable, capacity, venue, and faculty clashes.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={handleRunScan} className="btn btn-primary" disabled={scanning}>
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Scanning System...' : 'Run Full Conflict Scan'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <select
          className="select-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Conflict Types</option>
          <option value="FACULTY_TIMETABLE">Faculty Timetable Conflict</option>
          <option value="VENUE_TIMETABLE">Venue Timetable Conflict</option>
          <option value="EXAM_TIMETABLE">Exam Clashing Conflict</option>
          <option value="MISSING_INVIGILATION">Missing Invigilators</option>
          <option value="INSUFFICIENT_FACULTY">Insufficient Faculty</option>
          <option value="INSUFFICIENT_CAPACITY">Insufficient Capacity</option>
          <option value="UNAVAILABLE_FACULTY">Unavailable Faculty Assigned</option>
          <option value="UNAVAILABLE_VENUE">Unavailable Venue In Use</option>
          <option value="MISSING_STUDENTS">No Students Registered</option>
          <option value="INVALID_EXAM_TIMING">Invalid Exam Timings</option>
        </select>

        <select
          className="select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Unresolved">Unresolved</option>
          <option value="Resolved">Resolved</option>
        </select>

        {(typeFilter || statusFilter) && (
          <button
            onClick={() => {
              setTypeFilter('');
              setStatusFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '0.88rem' }}>
          <strong>{unresolvedCount}</strong> active conflict(s) detected
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Scanning system for conflicts...
        </div>
      ) : conflicts.length === 0 ? (
        <div className="empty-state" style={{ borderColor: 'var(--success-border)', backgroundColor: '#f0fdf4' }}>
          <ShieldCheck size={48} color="#059669" />
          <h3 style={{ fontSize: '1.25rem', color: '#065f46', margin: '8px 0' }}>
            No Conflicts Detected!
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem', color: '#166534' }}>
            All examination schedules, venue capacities, and faculty duty allocations are free of overlaps and constraint violations.
          </p>
        </div>
      ) : (
        <div>
          {conflicts.map((c) => (
            <div key={c._id} className={`conflict-card ${c.severity}`}>
              <div className="conflict-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle
                    size={20}
                    color={c.severity === 'High' ? 'var(--danger)' : 'var(--warning)'}
                  />
                  <span className={`conflict-title ${c.severity}`}>{c.title}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`badge ${
                      c.status === 'Resolved' ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {c.status}
                  </span>
                  {user?.role === 'admin' && c.status === 'Unresolved' && (
                    <button
                      onClick={() => handleResolveConflict(c._id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="conflict-body">{c.description}</div>

              {/* Conflict Structured Details */}
              {c.details && Object.keys(c.details).length > 0 && (
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {Object.entries(c.details).map(([key, value]) => (
                    <div key={key}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {key.replace(/([A-Z])/g, ' $1')}:{' '}
                      </span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Solution Box */}
              {c.suggestedSolution && (
                <div className="conflict-solution">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '2px' }}>
                    <Lightbulb size={16} />
                    <span>Recommended Resolution:</span>
                  </div>
                  <div>{c.suggestedSolution}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

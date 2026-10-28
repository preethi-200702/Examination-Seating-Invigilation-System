import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  GraduationCap,
  Lock,
  User,
  UserPlus,
  ChevronDown,
  ArrowLeft,
  Mail,
  Hash,
  BookOpen,
} from 'lucide-react';

export const RegisterPage = () => {
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Student fields
  const [studentForm, setStudentForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    registerNumber: '',
    department: '',
    year: '3',
    section: '',
    email: '',
  });

  // Faculty fields
  const [facultyForm, setFacultyForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    facultyId: '',
    department: '',
    email: '',
  });

  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleStudentChange = (e) => {
    setStudentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFacultyChange = (e) => {
    setFacultyForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      setLoading(true);

      let res;
      if (role === 'student') {
        if (studentForm.password !== studentForm.confirmPassword) {
          setErrorMessage('Passwords do not match.');
          return;
        }
        res = await api.registerStudent(studentForm);
      } else {
        if (facultyForm.password !== facultyForm.confirmPassword) {
          setErrorMessage('Passwords do not match.');
          return;
        }
        res = await api.registerFaculty(facultyForm);
      }

      // Auto login after registration
      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        success(res.message || 'Account created successfully! Welcome!');
        if (res.user.role === 'student') {
          navigate('/my-seat');
        } else {
          navigate('/faculty-duties');
        }
      } else {
        success(res.message || 'Account created successfully. Please login.');
        navigate('/login');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
      error(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div className="login-header">
          <div className="login-logo">
            <GraduationCap size={32} />
          </div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Register for Exam Seating System</p>
        </div>

        {errorMessage && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '0.88rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Role Selection */}
        <div className="form-group">
          <label className="form-label">Register as</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['student', 'faculty'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: `2px solid ${role === r ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius)',
                  backgroundColor: role === r ? 'var(--primary-bg)' : 'white',
                  color: role === r ? 'var(--primary-dark)' : 'var(--text-secondary)',
                  fontWeight: role === r ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {r === 'student' ? '🎓 Student' : '👨‍🏫 Faculty'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Admin accounts can only be created by an existing Admin.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {role === 'student' ? (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Aarav Kumar"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Register Number *</label>
                <input
                  type="text"
                  name="registerNumber"
                  className="form-control"
                  placeholder="e.g. 310624104201"
                  value={studentForm.registerNumber}
                  onChange={handleStudentChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    name="department"
                    className="form-control"
                    placeholder="e.g. CSE"
                    value={studentForm.department}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Year *</label>
                  <select
                    name="year"
                    className="form-control"
                    value={studentForm.year}
                    onChange={handleStudentChange}
                    required
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <input
                    type="text"
                    name="section"
                    className="form-control"
                    placeholder="e.g. A"
                    value={studentForm.section}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (optional)</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="your@email.com"
                    value={studentForm.email}
                    onChange={handleStudentChange}
                  />
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '14px',
                  marginTop: '4px',
                  marginBottom: '10px',
                }}
              >
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Login Credentials
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="Choose a username (lowercase)"
                  value={studentForm.username}
                  onChange={handleStudentChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Min. 4 characters"
                    value={studentForm.password}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control"
                    placeholder="Repeat password"
                    value={studentForm.confirmPassword}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={facultyForm.name}
                  onChange={handleFacultyChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Faculty ID *</label>
                  <input
                    type="text"
                    name="facultyId"
                    className="form-control"
                    placeholder="e.g. FAC101"
                    value={facultyForm.facultyId}
                    onChange={handleFacultyChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    name="department"
                    className="form-control"
                    placeholder="e.g. CSE"
                    value={facultyForm.department}
                    onChange={handleFacultyChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="faculty@college.edu"
                  value={facultyForm.email}
                  onChange={handleFacultyChange}
                />
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '14px',
                  marginTop: '4px',
                  marginBottom: '10px',
                }}
              >
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Login Credentials
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="Choose a username"
                  value={facultyForm.username}
                  onChange={handleFacultyChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Min. 4 characters"
                    value={facultyForm.password}
                    onChange={handleFacultyChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control"
                    placeholder="Repeat password"
                    value={facultyForm.confirmPassword}
                    onChange={handleFacultyChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '10px' }}
            disabled={loading}
          >
            <UserPlus size={18} />
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign In
          </Link>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'var(--primary-bg)',
            borderRadius: 'var(--radius)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          📧 Need help?{' '}
          <a
            href="mailto:preethielumalai200706@gmail.com"
            style={{ color: 'var(--primary)', fontWeight: 600 }}
          >
            preethielumalai200706@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

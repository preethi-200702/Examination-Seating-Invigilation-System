import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Calendar,
  Grid,
  ShieldAlert,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <GraduationCap size={24} />
        <span>Exam Management</span>
      </div>

      <nav className="sidebar-nav">
        {/* Common Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* ADMIN EXCLUSIVE NAVIGATION */}
        {role === 'admin' && (
          <>
            <NavLink
              to="/students"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Students</span>
            </NavLink>

            <NavLink
              to="/faculty"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <UserCheck size={18} />
              <span>Faculty</span>
            </NavLink>

            <NavLink
              to="/venues"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Building2 size={18} />
              <span>Venues</span>
            </NavLink>

            <NavLink
              to="/exams"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Calendar size={18} />
              <span>Examinations</span>
            </NavLink>

            <NavLink
              to="/seating"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Grid size={18} />
              <span>Seating Arrangement</span>
            </NavLink>

            <NavLink
              to="/invigilation"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardList size={18} />
              <span>Invigilation Duties</span>
            </NavLink>

            <NavLink
              to="/conflicts"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
              <span>Conflict Manager</span>
            </NavLink>

            <NavLink
              to="/import"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardList size={18} />
              <span>Import Data</span>
            </NavLink>

            <NavLink
              to="/users"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>User Management</span>
            </NavLink>
          </>
        )}

        {/* FACULTY NAVIGATION */}
        {role === 'faculty' && (
          <>
            <NavLink
              to="/faculty-duties"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ClipboardList size={18} />
              <span>My Invigilation Duties</span>
            </NavLink>

            <NavLink
              to="/seating"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Grid size={18} />
              <span>View Seating Plan</span>
            </NavLink>

            <NavLink
              to="/conflicts"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
              <span>System Conflicts</span>
            </NavLink>
          </>
        )}

        {/* STUDENT NAVIGATION */}
        {role === 'student' && (
          <NavLink
            to="/my-seat"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Grid size={18} />
            <span>My Seat & Hall</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span>Helpline Support:</span>
          <br />
          <a
            href="mailto:preethielumalai200706@gmail.com"
            style={{ color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}
          >
            preethielumalai200706@gmail.com
          </a>
        </div>
        <p>B.E. CSE 3rd Year Project</p>
        <p style={{ color: 'var(--primary)', fontWeight: 600 }}>MERN Stack v1.0</p>
      </div>
    </aside>
  );
};

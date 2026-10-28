import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <GraduationCap size={28} />
        <span>ExamSeat AI</span>
      </div>

      <div className="navbar-user">
        {user && (
          <div className="user-badge">
            <UserIcon size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user.name}</span>
            <span className={`role-pill ${user.role}`}>{user.role}</span>
          </div>
        )}

        <a
          href="mailto:preethielumalai200706@gmail.com"
          className="btn btn-secondary btn-sm"
          style={{ textDecoration: 'none', gap: '4px', fontSize: '0.8rem' }}
          title="For any issues or assistance, contact support"
        >
          <span>📧 Help</span>
        </a>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Logout from system"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

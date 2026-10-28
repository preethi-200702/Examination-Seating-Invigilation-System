import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '40px auto' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            You do not have permission ({user.role}) to access this page.
          </p>
          <a href="/dashboard" className="btn btn-primary">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

import React from 'react';

export const StatCard = ({ title, value, icon, color = 'var(--primary)', subtitle }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color: color, backgroundColor: `${color}15` }}>
        {icon}
      </div>
      <div className="stat-info">
        <span className="stat-value">{value ?? 0}</span>
        <span className="stat-label">{title}</span>
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
    </div>
  );
};

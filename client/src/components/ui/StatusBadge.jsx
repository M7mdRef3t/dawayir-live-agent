import React from 'react';

function StatusBadge({ className = '', text }) {
  return (
    <div className={`status-badge ${className}`.trim()} role="status" aria-live="polite">
      <span className="dot"></span>
      {text}
    </div>
  );
}

export default StatusBadge;

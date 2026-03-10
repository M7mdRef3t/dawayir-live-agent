import React from 'react';

function StatusBadge({ className = '', text }) {
  return (
    <div className={`ds-badge ${className}`.trim()} role="status" aria-live="polite">
      <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
      {text}
    </div>
  );
}

export default StatusBadge;

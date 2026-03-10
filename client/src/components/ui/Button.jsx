import React from 'react';

function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
  disabled = false,
  icon = null,
  ...props
}) {
  return (
    <button
      type={type}
      className={`ds-btn ds-btn--${variant} ds-btn--${size} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="ds-spinner ds-spinner--sm" aria-hidden="true" />}
      {icon && !loading && <span className="ds-icon ds-icon--md" aria-hidden="true">{icon}</span>}
      <span className="ds-btn__label">{children}</span>
    </button>
  );
}

export default Button;

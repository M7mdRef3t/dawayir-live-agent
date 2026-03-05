import React from 'react';

function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const base = variant === 'primary' ? 'primary-btn' : 'secondary';
  return (
    <button type={type} className={`${base} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export default Button;

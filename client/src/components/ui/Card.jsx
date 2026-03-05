import React from 'react';

function Card({ className = '', children, ...props }) {
  return (
    <div className={`glass-panel ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default Card;

import React from 'react';

function Modal({ onClose, className = '', children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default Modal;

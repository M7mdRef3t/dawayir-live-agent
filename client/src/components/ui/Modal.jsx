import React, { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function Modal({ onClose, className = '', children, titleId }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Remember the element that opened the modal so we can restore focus on close
  useEffect(() => {
    triggerRef.current = document.activeElement;
    // Auto-focus the first focusable element inside the modal
    const timer = setTimeout(() => {
      const first = modalRef.current?.querySelector(FOCUSABLE);
      if (first) first.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      // Restore focus to trigger on unmount
      triggerRef.current?.focus?.();
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = modalRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  return (
    <>
      <div className="ds-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        className={`ds-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </>
  );
}

export default Modal;

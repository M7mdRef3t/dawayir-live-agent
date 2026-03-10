import React from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

function EndSessionConfirmModal({ lang, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} titleId="end-session-title">
      <div className="ds-modal__header">
        <h2 className="ds-modal__title" id="end-session-title">
          {lang === 'ar' ? 'إنهاء الجلسة؟' : 'End session?'}
        </h2>
      </div>
      <div className="ds-modal__body">
        <p className="ds-text-body" style={{ margin: 0 }}>
          {lang === 'ar'
            ? 'لو خرجت دلوقتي، هنقفل الجلسة الحالية وننقلك للملخص.'
            : 'If you exit now, the current session will close and move to the summary.'}
        </p>
      </div>
      <div className="ds-modal__footer">
        <Button variant="ghost" onClick={onCancel}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {lang === 'ar' ? 'إنهاء' : 'End Session'}
        </Button>
      </div>
    </Modal>
  );
}

export default EndSessionConfirmModal;

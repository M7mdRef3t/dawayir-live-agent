import React from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

function EndSessionConfirmModal({ lang, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel}>
      <div className="modal-header">
        <h3>{lang === 'ar' ? 'إنهاء الجلسة؟' : 'End session?'}</h3>
      </div>
      <p>
        {lang === 'ar'
          ? 'لو خرجت دلوقتي، هنقفل الجلسة الحالية وننقلك للملخص.'
          : 'If you exit now, the current session will close and move to the summary.'}
      </p>
      <div className="settings-row">
        <Button variant="secondary" onClick={onCancel}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button variant="secondary" className="disconnect-btn" onClick={onConfirm}>
          {lang === 'ar' ? 'إنهاء' : 'End Session'}
        </Button>
      </div>
    </Modal>
  );
}

export default EndSessionConfirmModal;

import React from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

function OnboardingModal({ lang, step, steps, logoSrc, onSkip, onNext }) {
  const isLast = step >= steps.length - 1;

  return (
    <Modal onClose={onSkip} titleId="onboarding-title">
      <div className="ds-modal__body" style={{ textAlign: 'center', padding: 'var(--ds-space-8) var(--ds-space-6)' }}>
        <div style={{ marginBottom: 'var(--ds-space-6)' }}>
          <img src={logoSrc} alt="Dawayir" style={{ width: '80px', height: '80px' }} />
        </div>

        <span className="ds-badge ds-badge--cyan" style={{ marginBottom: 'var(--ds-space-4)' }}>
          {step + 1}/{steps.length}
        </span>

        <h2 className="ds-text-heading" id="onboarding-title" style={{ margin: '0 0 var(--ds-space-3) 0', color: 'var(--ds-text-primary)' }}>
          {steps[step].title}
        </h2>

        <p className="ds-text-body" style={{ color: 'var(--ds-text-secondary)', margin: '0 0 var(--ds-space-8) 0', minHeight: '60px' }}>
          {steps[step].body}
        </p>
      </div>
      <div className="ds-modal__footer">
        <Button variant="ghost" onClick={onSkip}>
          {lang === 'ar' ? 'تخطي' : 'Skip'}
        </Button>
        <Button variant="primary" onClick={onNext}>
          {isLast ? (lang === 'ar' ? 'يلا نبدأ' : 'Start') : (lang === 'ar' ? 'التالي' : 'Next')}
        </Button>
      </div>
    </Modal>
  );
}

export default OnboardingModal;

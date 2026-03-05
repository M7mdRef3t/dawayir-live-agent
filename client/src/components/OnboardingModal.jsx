import React from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

function OnboardingModal({ lang, step, steps, logoSrc, onSkip, onNext }) {
  const isLast = step >= steps.length - 1;

  return (
    <Modal className="onboarding-card" onClose={onSkip}>
      <div className="onboarding-media">
        <img src={logoSrc} alt="Dawayir" className="onboarding-logo" />
      </div>
      <span className="onboarding-step">
        {step + 1}/{steps.length}
      </span>
      <h3>{steps[step].title}</h3>
      <p>{steps[step].body}</p>
      <div className="settings-row">
        <Button variant="secondary" onClick={onSkip}>
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

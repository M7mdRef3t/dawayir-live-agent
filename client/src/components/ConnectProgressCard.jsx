import React from 'react';

function ConnectProgressCard({ steps, stage }) {
  const safeStage = Math.max(0, Math.min(stage, steps.length - 1));
  const progress = ((safeStage + 1) / steps.length) * 100;

  return (
    <div className="connect-progress-card" aria-live="polite">
      <div className="connect-progress-header">
        <strong>{steps[safeStage].label}</strong>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="connect-progress-bar">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="connect-progress-steps">
        {steps.map((step, index) => (
          <span key={step.key} className={index <= safeStage ? 'done' : ''}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ConnectProgressCard;

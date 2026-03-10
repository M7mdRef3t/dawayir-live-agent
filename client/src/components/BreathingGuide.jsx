/**
 * FEATURE 1 - BREATHING REGULATOR
 *
 * Appears automatically when stress/tense tone is detected for a few seconds.
 * Guides the user through one 4-4-6 breath cycle, then disappears.
 * Client-side only.
 */
import React, { useEffect, useRef, useState } from 'react';

const PHASES = [
  { key: 'inhale', dur: 4, ar: 'خد نفس', en: 'Inhale' },
  { key: 'hold', dur: 4, ar: 'ثبّت النفس', en: 'Hold' },
  { key: 'exhale', dur: 6, ar: 'طلّع النفس', en: 'Exhale' },
];

function BreathingGuide({ active, lang = 'ar', onComplete, reducedMotion = false }) {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const phaseTimerRef = useRef(null);
  const startRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (active && !visible) {
      setVisible(true);
      setPhase(0);
      setProgress(0);
      phaseRef.current = 0;
      startRef.current = performance.now();
    }
  }, [active, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    if (reducedMotion) {
      const currentPhase = PHASES[phaseRef.current];
      setProgress(1);
      phaseTimerRef.current = setTimeout(() => {
        if (phaseRef.current < PHASES.length - 1) {
          phaseRef.current += 1;
          setPhase(phaseRef.current);
        } else {
          setVisible(false);
          onComplete?.();
        }
      }, currentPhase.dur * 1000);

      return () => clearTimeout(phaseTimerRef.current);
    }

    const animate = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const currentPhase = PHASES[phaseRef.current];
      const nextProgress = Math.min(elapsed / currentPhase.dur, 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        if (phaseRef.current < PHASES.length - 1) {
          phaseRef.current += 1;
          setPhase(phaseRef.current);
          startRef.current = now;
        } else {
          setVisible(false);
          onComplete?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion, visible, onComplete]);

  if (!visible) return null;

  const currentPhase = PHASES[phase];
  const circumference = 2 * Math.PI * 44;
  const strokeDash = circumference * progress;
  const colors = { inhale: '#00F5FF', hold: '#FFC800', exhale: '#00FF41' }; // DS: awareness, joyful, knowledge
  const color = colors[currentPhase.key];

  const dismiss = () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(phaseTimerRef.current);
    setVisible(false);
    onComplete?.();
  };

  return (
    <div className="breathing-guide-overlay" aria-live="assertive" role="alert">
      <div className="breathing-guide-card">
        <button className="overlay-dismiss-btn" onClick={dismiss} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>✕</button>
        <p className="breathing-guide-hint">
          {lang === 'ar' ? '🌿 لحظة نهدى سوا' : '🌿 One moment...'}
        </p>

        <div className="breathing-circle-wrap">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke 0.5s ease' }}
            />
            <circle
              cx="50"
              cy="50"
              r="8"
              fill={color}
              opacity="0.7"
              style={{
                transform: `scale(${reducedMotion ? 1 : 0.8 + progress * 0.5})`,
                transformOrigin: '50px 50px',
                transition: reducedMotion ? 'none' : 'transform 0.1s ease',
              }}
            />
          </svg>
        </div>

        <p className="breathing-phase-label" style={{ color }}>
          {lang === 'ar' ? currentPhase.ar : currentPhase.en}
        </p>
        <p className="breathing-phase-seconds">
          {currentPhase.dur}
          {lang === 'ar' ? ' ث' : 's'}
        </p>
      </div>
    </div>
  );
}

export default BreathingGuide;

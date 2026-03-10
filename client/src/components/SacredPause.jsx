import React, { useEffect, useRef, useState } from 'react';

function SacredPause({
  tone,
  isConnected,
  lang = 'ar',
  isAgentSpeaking = false,
  onPauseTriggered,
  reducedMotion = false,
}) {
  const [visible, setVisible] = useState(false);
  const silenceStartRef = useRef(null);
  const timerRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const SILENCE_THRESHOLD_MS = 5000;

  useEffect(() => {
    if (!isConnected) {
      setVisible(false);
      silenceStartRef.current = null;
      return undefined;
    }

    if (tone === 'silent' && !isAgentSpeaking) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
        hasTriggeredRef.current = false;
      }

      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (silenceStartRef.current && !isAgentSpeaking) {
          setVisible(true);
          if (onPauseTriggered && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onPauseTriggered();
          }
        }
      }, SILENCE_THRESHOLD_MS);
    } else {
      silenceStartRef.current = null;
      hasTriggeredRef.current = false;
      window.clearTimeout(timerRef.current);
      if (visible) setVisible(false);
    }

    return () => window.clearTimeout(timerRef.current);
  }, [tone, isConnected, isAgentSpeaking, visible, onPauseTriggered]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    silenceStartRef.current = null;
    window.clearTimeout(timerRef.current);
  };

  return (
    <div className="sacred-pause-overlay" aria-live="polite">
      <div className={`sacred-pause-card ${reducedMotion ? 'reduced-motion' : ''}`}>
        <button
          className="overlay-dismiss-btn"
          onClick={dismiss}
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          ✕
        </button>
        <div className="sacred-orbs" aria-hidden="true">
          <div className="sacred-orb sacred-orb-awareness" />
          <div className="sacred-orb sacred-orb-knowledge" />
          <div className="sacred-orb sacred-orb-truth" />
        </div>
        <p className="sacred-pause-main">{lang === 'ar' ? '...' : '...'}</p>
        <p className="sacred-pause-sub">
          {lang === 'ar' ? 'السكوت جزء من الرحلة، خد وقتك' : 'Silence is part of the journey, take your time'}
        </p>
      </div>
    </div>
  );
}

export default SacredPause;

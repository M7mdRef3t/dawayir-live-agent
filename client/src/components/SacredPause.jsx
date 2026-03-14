import React, { useEffect, useRef, useState } from 'react';

// ══════════════════════════════════════════════════
// SACRED PAUSE — Subconscious Silence Gateway
// When both user and agent are silent for 5+ seconds,
// this component gently appears — not as a "notification"
// but as a deepening of the space. The silence IS the message.
//
// Subconscious design principles:
// 1. No sudden transitions — everything fades in imperceptibly
// 2. The text "..." is deliberately ambiguous (the subconscious fills the gap)
// 3. The subtitle uses Ericksonian pacing ("this is natural")
// 4. Haptic cosmicPresence pattern mimics heartbeat
// 5. The orbs breathe at 1.2Hz — same as the Divine Voice Orb
// ══════════════════════════════════════════════════

function SacredPause({
  tone,
  isConnected,
  lang = 'ar',
  isAgentSpeaking = false,
  onPauseTriggered,
  reducedMotion = false,
}) {
  const [visible, setVisible] = useState(false);
  const [depth, setDepth] = useState(0); // 0-1: how deep the pause has become
  const silenceStartRef = useRef(null);
  const timerRef = useRef(null);
  const deepenTimerRef = useRef(null);
  const hasTriggeredRef = useRef(false);
  const SILENCE_THRESHOLD_MS = 5000;

  useEffect(() => {
    if (!isConnected) {
      setVisible(false);
      setDepth(0);
      silenceStartRef.current = null;
      if (deepenTimerRef.current) clearInterval(deepenTimerRef.current);
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
          // Trigger cosmicPresence haptic — heartbeat-like ghost taps
          try { if (navigator.vibrate) navigator.vibrate([3, 800, 3]); } catch {}
          if (onPauseTriggered && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onPauseTriggered();
          }
          // Gradually deepen the pause (subconscious deepening)
          deepenTimerRef.current = setInterval(() => {
            setDepth(prev => Math.min(1, prev + 0.05));
          }, 500);
        }
      }, SILENCE_THRESHOLD_MS);
    } else {
      silenceStartRef.current = null;
      hasTriggeredRef.current = false;
      window.clearTimeout(timerRef.current);
      if (deepenTimerRef.current) clearInterval(deepenTimerRef.current);
      if (visible) {
        setVisible(false);
        setDepth(0);
      }
    }

    return () => {
      window.clearTimeout(timerRef.current);
      if (deepenTimerRef.current) clearInterval(deepenTimerRef.current);
    };
  }, [tone, isConnected, isAgentSpeaking, visible, onPauseTriggered]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    setDepth(0);
    silenceStartRef.current = null;
    window.clearTimeout(timerRef.current);
    if (deepenTimerRef.current) clearInterval(deepenTimerRef.current);
  };

  // Ericksonian messages — all use truisms + embedded commands + ambiguity
  // These are NOT "instructions." They are statements the subconscious can't reject.
  const subliminalMessages = lang === 'ar'
    ? [
        'السكوت جزء من الرحلة',
        'مش لازم تقول حاجة دلوقتي',
        'الحاجة اللي جوّاك... بتاخد وقتها',
        'كل واحد بيحتاج لحظة زي دي',
        'مش لازم تعرف... عشان تحس',
      ]
    : [
        'Silence is part of the journey',
        'You don\'t need to say anything right now',
        'What\'s inside... is taking its time',
        'Everyone needs a moment like this',
        'You don\'t need to know... to feel',
      ];

  // Pick message based on depth — deeper silence = deeper message
  const msgIndex = Math.min(Math.floor(depth * subliminalMessages.length), subliminalMessages.length - 1);

  return (
    <div
      className="sacred-pause-overlay"
      aria-live="polite"
      style={{
        // Opacity increases with depth — starts at 70%, deepens to 100%
        opacity: 0.7 + depth * 0.3,
      }}
    >
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
        {/* "..." — Strategic Ambiguity. The subconscious fills this with meaning. */}
        <p className="sacred-pause-main">{lang === 'ar' ? '...' : '...'}</p>
        <p className="sacred-pause-sub">
          {subliminalMessages[msgIndex]}
        </p>
      </div>
    </div>
  );
}

export default SacredPause;

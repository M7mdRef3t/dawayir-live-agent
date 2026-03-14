// ═══════════════════════════════════════════════════════
// Haptic Feedback
// Uses the Vibration API for tactile feedback
// when circles change significantly.
// ═══════════════════════════════════════════════════════

export const triggerHaptic = (pattern = [30]) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
};

export const HAPTIC_PATTERNS = {
  circleShift: [12],                  // whisper tap — subliminal
  insightMoment: [150, 100, 200],     // heartbeat thump for insight
  clarityBloom: [60, 40, 60, 40, 80], // crescendo for clarity
  otherSpawn: [20, 20, 20],           // triple light tap for person
  cosmicPresence: [8, 833, 8],        // heartbeat ghost-tap — 1.2Hz matches visual pulse
  somaticAnchor: [5, 200, 5],         // "going inward" — barely there hold
};

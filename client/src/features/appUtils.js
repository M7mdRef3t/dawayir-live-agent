// ══════════════════════════════════════════════════
// App Utilities — haptic feedback, session progress, ambient audio
// ══════════════════════════════════════════════════

// ── HAPTIC FEEDBACK ──────────────────────────────
export const triggerHaptic = (pattern = [30]) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
};

export const HAPTIC_PATTERNS = {
  circleShift: [30],
  bigShift: [50, 30, 50],
  insight: [20, 40, 20, 40, 20],
  bloom: [100, 50, 100],
  connect: [15, 15, 15],
  error: [100, 30, 100, 30, 200],
  achievement: [20, 20, 20, 20, 60],
  sacredPause: [60, 120, 60],
  breatheIn: [30, 60, 30],
  breatheOut: [15, 30, 15],
};

// ── CROSS-SESSION PROGRESS ──────────────────────
export const saveSessionProgress = (nodes) => {
  try {
    const history = JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
    const entry = {
      timestamp: Date.now(),
      nodes: nodes.map(n => ({ id: n.id, radius: n.radius, label: n.label })),
    };
    const trimmed = history.slice(-20);
    trimmed.push(entry);
    localStorage.setItem('dawayir_progress', JSON.stringify(trimmed));
  } catch {}
};

export const getSessionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
  } catch {
    return [];
  }
};

// ── AMBIENT DRONE ─────────────────────────────────
export const createAmbientDrone = () => {
  let ctx = null;
  let oscillators = [];
  let masterGain = null;
  let isPlaying = false;

  const start = () => {
    if (isPlaying) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);

      const freqs = [174, 261, 396]; // healing frequencies (Solfeggio)
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.03;

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = freq * 0.002;

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.12;
        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start();
        lfo.start();
        oscillators.push({ osc, lfo, oscGain });
      });

      // Fade in over 3s
      masterGain.gain.setTargetAtTime(0.06, ctx.currentTime, 1.0);
      isPlaying = true;
    } catch {}
  };

  const stop = () => {
    if (!isPlaying || !ctx) return;
    try {
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => {
        oscillators.forEach(({ osc, lfo }) => {
          try { osc.stop(); lfo.stop(); } catch {}
        });
        oscillators = [];
        ctx.close().catch(() => {});
        ctx = null;
        isPlaying = false;
      }, 2000);
    } catch {}
  };

  return { start, stop, isPlaying: () => isPlaying };
};

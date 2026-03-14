// ═══════════════════════════════════════════════════════
// Ambient Sound — Singing Bowl Drone
// Creates a subtle harmonic drone using Web Audio API
// that plays when the agent is speaking.
//
// Accepts an existing AudioContext to share with the
// main audio pipeline (avoids suspension issues).
// ═══════════════════════════════════════════════════════

export const createAmbientDrone = (sharedCtx) => {
  let ctx = sharedCtx || null;
  let gainNode = null;
  let oscs = [];
  let isPlaying = false;

  const start = () => {
    if (isPlaying) return;
    try {
      // Re-use the shared AudioContext if available, else create one
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[Ambient] Created new AudioContext (no shared ctx available)');
      }
      // Resume suspended context (critical for user-gesture requirement)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
        console.log('[Ambient] Resumed suspended context');
      }

      gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      // Ramp up over 3 seconds — audible volume for laptop speakers
      gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 3);
      gainNode.connect(ctx.destination);

      // FEATURE ⑯: Sonic Breathing — 8s LFO (0.125 Hz)
      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.7, ctx.currentTime);
      
      const breathLfo = ctx.createOscillator();
      breathLfo.type = 'sine';
      breathLfo.frequency.setValueAtTime(0.125, ctx.currentTime); // 8-second cycle
      
      const breathLfoDepth = ctx.createGain();
      breathLfoDepth.gain.setValueAtTime(0.3, ctx.currentTime); // Modulate volume ±0.3
      
      breathLfo.connect(breathLfoDepth);
      breathLfoDepth.connect(breathGain.gain);
      breathLfo.start();
      oscs.push({ osc: breathLfo, lfo: { stop: () => {} } });

      breathGain.connect(gainNode);

      // Singing bowl harmonics: fundamental + overtones
      // Using frequencies audible on laptop speakers (200+ Hz range)
      const freqs = [220, 330, 440]; // A3, E4, A4 — musical singing bowl harmonics
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Subtle vibrato
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.3 + i * 0.1, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        const oscGain = ctx.createGain();
        // Much louder per-oscillator gains — audible on laptop speakers
        oscGain.gain.setValueAtTime(0.08 / (i + 1), ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(breathGain);
        osc.start();
        oscs.push({ osc, lfo, oscGain });
      });
      isPlaying = true;
      console.log('[Ambient] 🎵 Drone started — Sonic Breathing active (ctx.state=' + ctx.state + ')');
    } catch (e) { console.warn('[Ambient] ❌ Failed to start:', e); }
  };

  const stop = () => {
    if (!isPlaying || !ctx) return;
    try {
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        oscs.forEach(o => { try { o.osc.stop(); o.lfo.stop(); } catch {} });
        oscs = [];
        // Do NOT close the shared context — it's owned by the main pipeline
        isPlaying = false;
        console.log('[Ambient] Drone stopped');
      }, 2000);
    } catch {}
  };

  return { start, stop, isPlaying: () => isPlaying };
};

// ═══════════════════════════════════════════════════════
// Procedural Sound Effects — Web Audio API
// Pure synthesis, no audio files needed.
// ═══════════════════════════════════════════════════════

/**
 * Pink-noise wind sweep for Sand Mandala dissolution.
 * Duration: ~2 seconds. Sounds like sand sweeping away.
 */
export const playSandShatterSound = (sharedCtx) => {
  try {
    const ctx = sharedCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx.state === 'closed') return;

    // Pink noise via buffer
    const duration = 2.2;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate pink noise using Paul Kellet's algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter for "sand" texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);
    // Sweep frequency down for "wind away" effect
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration);

    console.log('[Sound] 🏜️ Sand shatter sound played');
  } catch (e) {
    console.warn('[Sound] Sand shatter failed:', e);
  }
};

/**
 * Harmonic glassy ping for Neural Topic Graph node spawn.
 * Duration: ~0.6 seconds. Sounds like a crystal chime.
 */
export const playNeuralNodeSound = (sharedCtx) => {
  try {
    const ctx = sharedCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx.state === 'closed') return;

    const now = ctx.currentTime;

    // Master gain
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    master.connect(ctx.destination);

    // Two harmonics for a "crystal chime" feel
    const freqs = [880 + Math.random() * 200, 1320 + Math.random() * 300];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Slight pitch drift for shimmer
      osc.frequency.exponentialRampToValueAtTime(freq * 0.97, now + 0.5);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.5 / (i + 1), now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(now);
      osc.stop(now + 0.6);
    });

    console.log('[Sound] ✨ Neural node ping played');
  } catch (e) {
    console.warn('[Sound] Neural node ping failed:', e);
  }
};

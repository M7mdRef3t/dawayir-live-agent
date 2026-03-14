/**
 * AudioWorklet processor for streaming PCM playback.
 * Runs on the audio thread — completely independent of the main thread.
 * Receives Float32 PCM chunks via port.postMessage and plays them gaplessly.
 */
class PcmPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Ring buffer: 10 seconds at 24kHz
    this.bufferSize = 24000 * 10;
    this.buffer = new Float32Array(this.bufferSize);
    this.writePos = 0;
    this.readPos = 0;
    this.samplesAvailable = 0;
    this.active = true;
    this.wasPlaying = false;
    this.emptyFrameCount = 0;
    this.totalSamplesPlayed = 0;
    // Pre-buffer: accumulate ~250ms (6000 samples at 24kHz) before
    // starting playback. Smooths the initial burst without noticeable delay.
    this.prebufferThreshold = 6000;
    this.prebuffering = true;
    // Amplitude reporting for Divine Voice Orb sync
    this.ampFrameCount = 0;
    this.AMP_REPORT_EVERY = 4; // report every 4 frames (~21ms)

    this.port.onmessage = (e) => {
      if (e.data.type === 'audio') {
        const samples = e.data.samples;
        for (let i = 0; i < samples.length; i++) {
          this.buffer[this.writePos] = samples[i];
          this.writePos = (this.writePos + 1) % this.bufferSize;
        }
        this.samplesAvailable += samples.length;
        if (this.samplesAvailable > this.bufferSize) {
          this.samplesAvailable = this.bufferSize;
        }
        this.emptyFrameCount = 0;
      } else if (e.data.type === 'clear') {
        this.writePos = 0;
        this.readPos = 0;
        this.samplesAvailable = 0;
        this.wasPlaying = false;
        this.emptyFrameCount = 0;
        this.totalSamplesPlayed = 0;
        this.prebuffering = true;
      } else if (e.data.type === 'stop') {
        this.active = false;
      }
    };
  }

  process(inputs, outputs) {
    if (!this.active) return false;

    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const channel = output[0];
    const len = channel.length; // typically 128 samples

    // Pre-buffer phase: wait until enough audio has accumulated before playing.
    if (this.prebuffering) {
      if (this.samplesAvailable >= this.prebufferThreshold) {
        this.prebuffering = false;
      } else {
        for (let i = 0; i < len; i++) {
          channel[i] = 0;
        }
        // Report zero amplitude when pre-buffering
        this.ampFrameCount++;
        if (this.ampFrameCount >= this.AMP_REPORT_EVERY) {
          this.ampFrameCount = 0;
          this.port.postMessage({ type: 'amplitude', rms: 0 });
        }
        return true;
      }
    }

    if (this.samplesAvailable > 0) {
      const toRead = Math.min(len, this.samplesAvailable);

      // ── Calculate RMS amplitude for Divine Voice Orb ─────────────────
      // RMS = root mean square of the samples being played right now.
      // This is the actual "energy" of the audio at this moment.
      let sumSq = 0;
      for (let i = 0; i < toRead; i++) {
        const s = this.buffer[(this.readPos + i) % this.bufferSize];
        sumSq += s * s;
      }
      const rms = toRead > 0 ? Math.sqrt(sumSq / toRead) : 0;

      for (let i = 0; i < toRead; i++) {
        channel[i] = this.buffer[this.readPos];
        this.readPos = (this.readPos + 1) % this.bufferSize;
      }
      for (let i = toRead; i < len; i++) {
        channel[i] = 0;
      }
      this.samplesAvailable -= toRead;
      this.totalSamplesPlayed += toRead;
      this.wasPlaying = true;
      this.emptyFrameCount = 0;

      // Post amplitude to main thread every AMP_REPORT_EVERY frames
      this.ampFrameCount++;
      if (this.ampFrameCount >= this.AMP_REPORT_EVERY) {
        this.ampFrameCount = 0;
        // Clamp rms to [0,1] — typical speech PCM RMS is 0.01-0.3
        const clampedRms = Math.min(1, rms * 3.5); // scale up for visual impact
        this.port.postMessage({ type: 'amplitude', rms: clampedRms });
      }
    } else {
      // No data — output silence
      for (let i = 0; i < len; i++) {
        channel[i] = 0;
      }
      this.emptyFrameCount++;

      // Report decaying amplitude when silent
      this.ampFrameCount++;
      if (this.ampFrameCount >= this.AMP_REPORT_EVERY) {
        this.ampFrameCount = 0;
        this.port.postMessage({ type: 'amplitude', rms: 0 });
      }

      // Only notify ONCE when transitioning from playing to empty.
      // Use a larger threshold to handle network jitter and slow chunk streaming.
      // Wait ~800ms (150 frames) before declaring drained to prevent mid-sentence stuttering.
      // At 24kHz with 128 samples/frame: 1 frame ≈ 5.3ms
      const threshold = 150;
      if (this.wasPlaying && this.emptyFrameCount === threshold) {
        this.wasPlaying = false;
        // Re-enter prebuffer mode so next response also gets smoothing
        this.prebuffering = true;
        this.totalSamplesPlayed = 0;
        this.port.postMessage({ type: 'drained' });
      }
    }

    return true;
  }
}

registerProcessor('pcm-player-processor', PcmPlayerProcessor);

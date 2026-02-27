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
    // Pre-buffer: accumulate ~120ms (2880 samples at 24kHz) before
    // starting playback. Smooths the initial burst without noticeable delay.
    this.prebufferThreshold = 2880;
    this.prebuffering = true;

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
        return true;
      }
    }

    if (this.samplesAvailable > 0) {
      const toRead = Math.min(len, this.samplesAvailable);
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
    } else {
      // No data — output silence
      for (let i = 0; i < len; i++) {
        channel[i] = 0;
      }
      this.emptyFrameCount++;

      // Only notify ONCE when transitioning from playing to empty.
      // Use adaptive threshold based on how much audio has played:
      // - Less than 2 seconds played: wait ~500ms (94 frames) before declaring drained.
      //   This handles slow streaming at start and after tool calls.
      // - After 2+ seconds: wait ~200ms (38 frames) — normal speech gap detection.
      // At 24kHz with 128 samples/frame: 1 frame ≈ 5.3ms
      const threshold = this.totalSamplesPlayed < 48000 ? 94 : 38;
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

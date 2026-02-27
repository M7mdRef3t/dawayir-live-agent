class DawayirMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.writeIndex = 0;
    this.targetSampleRate = 16000;
    this.resampleCursor = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0];
    if (!channel) {
      return true;
    }

    const inputSampleRate = Number.isFinite(globalThis.sampleRate)
      ? globalThis.sampleRate
      : this.targetSampleRate;

    if (inputSampleRate === this.targetSampleRate) {
      for (let i = 0; i < channel.length; i += 1) {
        this.pushSample(channel[i]);
      }
      return true;
    }

    const ratio = inputSampleRate / this.targetSampleRate;
    let position = this.resampleCursor;
    while (position + 1 < channel.length) {
      const index = Math.floor(position);
      const nextIndex = Math.min(index + 1, channel.length - 1);
      const fraction = position - index;
      const sample = channel[index] + (channel[nextIndex] - channel[index]) * fraction;
      this.pushSample(sample);
      position += ratio;
    }
    this.resampleCursor = position - channel.length;

    return true;
  }

  pushSample(sample) {
    const clamped = Math.max(-1, Math.min(1, sample));
    this.buffer[this.writeIndex] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    this.writeIndex += 1;

    if (this.writeIndex >= this.buffer.length) {
      this.flush();
    }
  }

  flush() {
    if (this.writeIndex === 0) {
      return;
    }

    const chunk = this.buffer.slice(0, this.writeIndex);
    this.port.postMessage({
      int16arrayBuffer: chunk.buffer,
      sampleRate: this.targetSampleRate,
    });
    this.writeIndex = 0;
  }
}

registerProcessor('dawayir-mic-processor', DawayirMicProcessor);

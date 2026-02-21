class DawayirMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.writeIndex = 0;
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

    for (let i = 0; i < channel.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.writeIndex] = clamped < 0 ? clamped * 32768 : clamped * 32767;
      this.writeIndex += 1;

      if (this.writeIndex >= this.buffer.length) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    if (this.writeIndex === 0) {
      return;
    }

    const chunk = this.buffer.slice(0, this.writeIndex);
    this.port.postMessage({ int16arrayBuffer: chunk.buffer });
    this.writeIndex = 0;
  }
}

registerProcessor('dawayir-mic-processor', DawayirMicProcessor);

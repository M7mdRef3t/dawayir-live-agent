import test from 'node:test';
import assert from 'node:assert/strict';

// Mock Web Audio API globals
class MockAudioWorkletProcessor {
  constructor() {
    this.port = {
      postMessage: (msg) => {
        this.lastMessage = msg;
      }
    };
    this.lastMessage = null;
  }
}
globalThis.AudioWorkletProcessor = MockAudioWorkletProcessor;

let registeredProcessorClass = null;
globalThis.registerProcessor = (name, constructor) => {
  if (name === 'dawayir-mic-processor') {
    registeredProcessorClass = constructor;
  }
};

// Import the module (this will execute registerProcessor)
await import('./mic-processor.js');

test('DawayirMicProcessor registers correctly', () => {
  assert.ok(registeredProcessorClass);
  assert.equal(registeredProcessorClass.name, 'DawayirMicProcessor');
});

test('DawayirMicProcessor initializes correctly', () => {
  const processor = new registeredProcessorClass();
  assert.ok(processor.buffer instanceof Int16Array);
  assert.equal(processor.buffer.length, 2048);
  assert.equal(processor.writeIndex, 0);
  assert.equal(processor.targetSampleRate, 16000);
  assert.equal(processor.resampleCursor, 0);
});

test('process method handles empty inputs safely', () => {
  const processor = new registeredProcessorClass();

  // No input
  let result = processor.process([]);
  assert.equal(result, true);

  // Empty array as input
  result = processor.process([[]]);
  assert.equal(result, true);
});

test('process method handles inputs without resampling (16000Hz)', () => {
  globalThis.sampleRate = 16000;
  const processor = new registeredProcessorClass();

  const inputChannel = new Float32Array([0.5, -0.5, 1.0, -1.0, 0.0]);
  const inputs = [[inputChannel]];

  const result = processor.process(inputs);

  assert.equal(result, true);
  assert.equal(processor.writeIndex, 5);

  // Check conversion logic
  // 0.5 * 32767 = 16383.5 -> Math.trunc or implicit to Int16 -> 16383
  // -0.5 * 32768 = -16384
  // 1.0 * 32767 = 32767
  // -1.0 * 32768 = -32768
  // 0.0 = 0
  assert.equal(processor.buffer[0], 16383);
  assert.equal(processor.buffer[1], -16384);
  assert.equal(processor.buffer[2], 32767);
  assert.equal(processor.buffer[3], -32768);
  assert.equal(processor.buffer[4], 0);
});

test('process method handles clamping', () => {
  globalThis.sampleRate = 16000;
  const processor = new registeredProcessorClass();

  const inputChannel = new Float32Array([2.0, -2.0]);
  const inputs = [[inputChannel]];

  processor.process(inputs);

  assert.equal(processor.writeIndex, 2);
  assert.equal(processor.buffer[0], 32767);
  assert.equal(processor.buffer[1], -32768);
});

test('process method handles resampling (48000Hz to 16000Hz)', () => {
  globalThis.sampleRate = 48000;
  const processor = new registeredProcessorClass();

  // With ratio 3 (48000/16000), it takes every 3rd sample
  // 48000 / 16000 = 3
  // Resampling uses linear interpolation:
  // position = 0; index = 0, fraction = 0 -> sample = channel[0]
  // position = 3; index = 3, fraction = 0 -> sample = channel[3]
  // position = 6; index = 6, fraction = 0 -> sample = channel[6]

  const inputChannel = new Float32Array(10);
  for(let i=0; i<10; i++) inputChannel[i] = i * 0.1;
  // [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

  const inputs = [[inputChannel]];
  processor.process(inputs);

  assert.equal(processor.writeIndex, 3);

  // Value at 0: 0.0 -> 0
  assert.equal(processor.buffer[0], 0);

  // Value at 3: 0.3 -> 0.3 * 32767 = 9830.1 -> 9830
  assert.equal(processor.buffer[1], 9830);

  // Value at 6: 0.6 -> 0.6 * 32767 = 19660.2 -> 19660
  assert.equal(processor.buffer[2], 19660);

  // New resample cursor position should be 9 - 10 = -1
  assert.equal(processor.resampleCursor, -1);
});

test('flush is called when buffer is full', () => {
  globalThis.sampleRate = 16000;
  const processor = new registeredProcessorClass();

  // Fill 2048 samples
  const inputChannel = new Float32Array(2048);
  for(let i=0; i<2048; i++) {
    inputChannel[i] = 0.5;
  }
  const inputs = [[inputChannel]];

  processor.process(inputs);

  assert.equal(processor.writeIndex, 0); // Reset to 0 after flush
  assert.ok(processor.lastMessage);
  assert.ok(processor.lastMessage.int16arrayBuffer instanceof ArrayBuffer);
  // Int16Array of length 2048 is 4096 bytes
  assert.equal(processor.lastMessage.int16arrayBuffer.byteLength, 4096);
  assert.equal(processor.lastMessage.sampleRate, 16000);
});

test('flush can be called manually', () => {
  const processor = new registeredProcessorClass();
  processor.pushSample(0.5);
  processor.pushSample(-0.5);

  assert.equal(processor.writeIndex, 2);

  processor.flush();

  assert.equal(processor.writeIndex, 0);
  assert.ok(processor.lastMessage);
  assert.equal(processor.lastMessage.int16arrayBuffer.byteLength, 4); // 2 samples * 2 bytes
});

test('flush does nothing if writeIndex is 0', () => {
  const processor = new registeredProcessorClass();
  processor.flush();
  assert.equal(processor.lastMessage, null);
});

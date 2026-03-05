import { INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from './constants';

export const arrayBufferToBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return window.btoa(binary);
};

export const base64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

export const pcm16ToFloat32 = (arrayBuffer) => {
  const dataView = new DataView(arrayBuffer);
  const float32 = new Float32Array(arrayBuffer.byteLength / 2);

  for (let i = 0; i < float32.length; i += 1) {
    const int16 = dataView.getInt16(i * 2, true);
    float32[i] = int16 / 32768;
  }

  return float32;
};

export const float32ToPcm16Buffer = (float32Samples) => {
  const int16 = new Int16Array(float32Samples.length);
  for (let i = 0; i < float32Samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Samples[i]));
    int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return int16.buffer;
};

export const downsampleFloat32 = (input, inputRate, outputRate = INPUT_SAMPLE_RATE) => {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!Number.isFinite(inputRate) || inputRate <= 0) return input;
  if (inputRate === outputRate) return input;
  if (inputRate < outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  let outputIndex = 0;
  let inputIndex = 0;
  while (outputIndex < outputLength) {
    const nextInputIndex = Math.round((outputIndex + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (let i = inputIndex; i < nextInputIndex && i < input.length; i += 1) {
      sum += input[i];
      count += 1;
    }

    output[outputIndex] = count > 0 ? sum / count : 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }

  return output;
};

export const tryParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const parsePcmSampleRate = (mimeType = '') => {
  if (!mimeType) return OUTPUT_SAMPLE_RATE;
  const match = /rate=(\d+)/i.exec(mimeType);
  if (!match) return OUTPUT_SAMPLE_RATE;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : OUTPUT_SAMPLE_RATE;
};

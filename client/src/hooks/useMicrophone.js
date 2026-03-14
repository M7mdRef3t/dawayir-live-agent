import { useCallback, useRef, useState } from 'react';
import {
  arrayBufferToBase64,
  downsampleFloat32,
  float32ToPcm16Buffer,
} from '../features/session/audioUtils';
import { INPUT_SAMPLE_RATE, MIC_WORKLET_NAME } from '../features/session/constants';

/**
 * useMicrophone — manages microphone capture, local VAD, barge-in detection,
 * and forwarding audio to Gemini via WebSocket.
 *
 * @param {Object} opts
 * @param {Function} opts.formatError        - (key, detail?) => localized error string
 * @param {Function} opts.stopPlayback       - stops agent audio playback (for barge-in)
 * @param {Function} opts.startTurnLatency   - marks turn latency start
 * @param {Object}   opts.wsRef              - ref to WebSocket
 * @param {Object}   opts.setupCompleteRef   - ref indicating WS setup is done
 * @param {Object}   opts.isAgentSpeakingRef - ref tracking agent speaking state
 * @param {string}   opts.selectedMicId      - preferred mic device ID
 * @param {Function} opts.setLastEvent       - setState for last event
 * @returns hook API
 */
export function useMicrophone({
  formatError,
  stopPlayback,
  startTurnLatency,
  wsRef,
  setupCompleteRef,
  isAgentSpeakingRef,
  selectedMicId,
  setLastEvent,
}) {
  const [isMicActive, setIsMicActive] = useState(false);

  // ── Refs ──────────────────────────────────────────────────
  const micContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const micSourceRef = useRef(null);
  const micWorkletRef = useRef(null);
  const micProcessorRef = useRef(null);
  const micSilentGainRef = useRef(null);
  const lastBargeInAtRef = useRef(0);
  const bargeInStrongFramesRef = useRef(0);
  const vadStateRef = useRef({ speaking: false, speechMs: 0, silenceMs: 0, noiseFloor: 90 });
  const micTurnRef = useRef({ speaking: false, lastVoiceAt: 0, audioEndSent: true });

  const getAudioContextCtor = () => window.AudioContext || window.webkitAudioContext;

  // ── Stop microphone ──────────────────────────────────────
  const stopMicrophone = useCallback(async () => {
    vadStateRef.current = { speaking: false, speechMs: 0, silenceMs: 0, noiseFloor: 90 };

    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect(); } catch { /* ignore */ }
      micSourceRef.current = null;
    }
    if (micWorkletRef.current) {
      try { micWorkletRef.current.disconnect(); } catch { /* ignore */ }
      micWorkletRef.current = null;
    }
    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.onaudioprocess = null;
        micProcessorRef.current.disconnect();
      } catch { /* ignore */ }
      micProcessorRef.current = null;
    }
    if (micSilentGainRef.current) {
      try { micSilentGainRef.current.disconnect(); } catch { /* ignore */ }
      micSilentGainRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current) {
      try { await micContextRef.current.close(); } catch { /* ignore */ }
      micContextRef.current = null;
    }
    micTurnRef.current = { speaking: false, lastVoiceAt: 0, audioEndSent: true };
    setIsMicActive(false);
  }, []);

  // ── Send audio chunk to Gemini ───────────────────────────
  const sendRealtimeAudioChunk = useCallback((arrayBuffer, sampleRate) => {
    if (!arrayBuffer || !setupCompleteRef.current) return;

    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Local VAD analysis
    const samples = new Int16Array(arrayBuffer);
    if (samples.length === 0) return;
    let sumAbs = 0;
    for (let i = 0; i < samples.length; i += 1) sumAbs += Math.abs(samples[i]);
    const avgAbs = sumAbs / samples.length;
    const speechDetected = avgAbs > 100;
    const now = Date.now();

    // Barge-in detection
    if (isAgentSpeakingRef.current) {
      const BARGE_IN_IMMEDIATE_RMS = 900;
      const BARGE_IN_STRONG_RMS = 560;
      const BARGE_IN_REQUIRED_FRAMES = 2;
      const BARGE_IN_COOLDOWN_MS = 700;

      const sinceLastBargeIn = now - lastBargeInAtRef.current;
      const canBargeIn = sinceLastBargeIn > BARGE_IN_COOLDOWN_MS;

      if (canBargeIn && avgAbs >= BARGE_IN_IMMEDIATE_RMS) {
        stopPlayback();
        setLastEvent('barge_in_rms_immediate');
        lastBargeInAtRef.current = now;
        bargeInStrongFramesRef.current = 0;
      } else if (avgAbs >= BARGE_IN_STRONG_RMS) {
        bargeInStrongFramesRef.current += 1;
      } else {
        bargeInStrongFramesRef.current = Math.max(0, bargeInStrongFramesRef.current - 1);
      }

      if (canBargeIn && bargeInStrongFramesRef.current >= BARGE_IN_REQUIRED_FRAMES) {
        stopPlayback();
        setLastEvent('barge_in_rms');
        lastBargeInAtRef.current = now;
        bargeInStrongFramesRef.current = 0;
      }
    } else {
      bargeInStrongFramesRef.current = 0;
    }

    // Forward audio to Gemini
    socket.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: `audio/pcm;rate=${sampleRate}`,
            data: arrayBufferToBase64(arrayBuffer),
          }],
        },
      })
    );

    // Update turn state
    if (speechDetected) {
      micTurnRef.current.speaking = true;
      micTurnRef.current.lastVoiceAt = now;
      micTurnRef.current.audioEndSent = false;
    }

    // Explicit turn end after silence
    if (
      micTurnRef.current.speaking
      && !micTurnRef.current.audioEndSent
      && (now - micTurnRef.current.lastVoiceAt) > 1000
    ) {
      startTurnLatency();
      socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      micTurnRef.current.speaking = false;
      micTurnRef.current.audioEndSent = true;
      setLastEvent('audio_stream_end_vad');
    }
  }, [stopPlayback, startTurnLatency, wsRef, setupCompleteRef, isAgentSpeakingRef, setLastEvent]);

  // ── Start microphone ─────────────────────────────────────
  const startMicrophone = useCallback(async () => {
    await stopMicrophone();
    vadStateRef.current = { speaking: false, speechMs: 0, silenceMs: 0, noiseFloor: 90 };
    micTurnRef.current = { speaking: false, lastVoiceAt: 0, audioEndSent: true };

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(formatError('microphoneUnsupported'));
    }
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      throw new Error(formatError('webAudioUnsupported'));
    }

    // Log available devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      console.log('[Mic] Available audio input devices:', audioInputs.map((d) => ({ label: d.label, id: d.deviceId })));
    } catch { /* ignore */ }

    const audioConstraints = {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (selectedMicId) {
      audioConstraints.deviceId = { exact: selectedMicId };
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings();
      console.log('[Mic] Selected device:', { label: audioTrack.label, deviceId: settings.deviceId, sampleRate: settings.sampleRate, channelCount: settings.channelCount });
    }

    const micContext = new AudioContextCtor();
    if (micContext.state === 'suspended') await micContext.resume();

    const source = micContext.createMediaStreamSource(stream);
    const silentGain = micContext.createGain();
    silentGain.gain.value = 0;
    let workletReady = false;

    if (micContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        await micContext.audioWorklet.addModule(new URL('../audio/mic-processor.js', import.meta.url));
        const worklet = new AudioWorkletNode(micContext, MIC_WORKLET_NAME);
        worklet.port.onmessage = (event) => {
          const int16arrayBuffer = event.data?.int16arrayBuffer;
          const sampleRate = Number(event.data?.sampleRate) || INPUT_SAMPLE_RATE;
          if (!int16arrayBuffer) return;
          sendRealtimeAudioChunk(int16arrayBuffer, sampleRate);
        };
        source.connect(worklet);
        worklet.connect(silentGain);
        micWorkletRef.current = worklet;
        workletReady = true;
      } catch { /* Fall back to ScriptProcessor */ }
    }

    if (!workletReady) {
      const processor = micContext.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer?.getChannelData(0);
        if (!input || input.length === 0) return;
        const downsampled = downsampleFloat32(input, micContext.sampleRate, INPUT_SAMPLE_RATE);
        sendRealtimeAudioChunk(float32ToPcm16Buffer(downsampled), INPUT_SAMPLE_RATE);
      };
      source.connect(processor);
      processor.connect(silentGain);
      micProcessorRef.current = processor;
    }

    silentGain.connect(micContext.destination);
    micStreamRef.current = stream;
    micContextRef.current = micContext;
    micSourceRef.current = source;
    micSilentGainRef.current = silentGain;
    setIsMicActive(true);
    console.log('[Mic] Microphone started successfully', { workletReady, sampleRate: micContext.sampleRate });
  }, [formatError, sendRealtimeAudioChunk, stopMicrophone, selectedMicId]);

  return {
    isMicActive,
    micTurnRef,
    stopMicrophone,
    sendRealtimeAudioChunk,
    startMicrophone,
  };
}

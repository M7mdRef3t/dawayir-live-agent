import { useCallback, useRef } from 'react';
import { pcm16ToFloat32 } from '../features/session/audioUtils';
import { OUTPUT_SAMPLE_RATE } from '../features/session/constants';

/**
 * useAudioPipeline — manages the speaker AudioContext, PCM AudioWorklet player,
 * browser TTS fallback, and playback lifecycle.
 *
 * @param {Object} opts
 * @param {Function} opts.formatError        - (key, detail?) => localized error string
 * @param {Function} opts.setIsAgentSpeaking - setState for agent speaking flag
 * @param {Object}   opts.isAgentSpeakingRef - ref tracking agent speaking state
 * @param {Object}   opts.canvasRef          - ref to DawayirCanvas (for setAgentSpeaking / amplitude)
 * @param {Object}   opts.ambientDroneRef    - ref to ambient drone (for stop on reset)
 * @returns hook API
 */
export function useAudioPipeline({ formatError, setIsAgentSpeaking, isAgentSpeakingRef, canvasRef, ambientDroneRef }) {
  // ── Refs ──────────────────────────────────────────────────
  const speakerContextRef = useRef(null);
  const activeSourcesRef = useRef(new Set());
  const nextPlaybackTimeRef = useRef(0);
  const speakingDebounceRef = useRef(null);
  const pcmWorkletRef = useRef(null);
  const workletReadyRef = useRef(false);
  const lastPcmPushAtRef = useRef(0);
  const pendingPcmChunksRef = useRef([]);
  const pcmFlushScheduledRef = useRef(false);
  const ttsFallbackEnabledRef = useRef(false);
  const lastModelAudioAtRef = useRef(Date.now());
  const lastSpokenTextRef = useRef('');
  const lastSpokenAtRef = useRef(0);
  const pendingTtsTimeoutRef = useRef(null);
  const ttsDecisionTimeoutRef = useRef(null);
  const currentTurnModeRef = useRef('none'); // none | model | tts
  const bufferedTurnTextRef = useRef('');
  const bufferedUserAgentTurnTextRef = useRef('');
  const lastAgentContentAtRef = useRef(0);
  const lastUserAgentContentAtRef = useRef(0);

  const getAudioContextCtor = () => window.AudioContext || window.webkitAudioContext;

  // ── Close speaker context ────────────────────────────────
  const closeSpeakerContext = useCallback(async () => {
    if (!speakerContextRef.current) return;
    if (pcmWorkletRef.current) {
      pcmWorkletRef.current.port.postMessage({ type: 'stop' });
      try { pcmWorkletRef.current.disconnect(); } catch { /* ignore */ }
      pcmWorkletRef.current = null;
      workletReadyRef.current = false;
    }
    try { await speakerContextRef.current.close(); } catch { /* ignore */ }
    speakerContextRef.current = null;
    nextPlaybackTimeRef.current = 0;
    activeSourcesRef.current.clear();
  }, []);

  // ── Clear pending TTS timeouts ───────────────────────────
  const clearPendingTts = useCallback(() => {
    if (ttsDecisionTimeoutRef.current) {
      window.clearTimeout(ttsDecisionTimeoutRef.current);
      ttsDecisionTimeoutRef.current = null;
    }
    if (pendingTtsTimeoutRef.current) {
      window.clearTimeout(pendingTtsTimeoutRef.current);
      pendingTtsTimeoutRef.current = null;
    }
  }, []);

  // ── Reset agent turn state ───────────────────────────────
  const resetAgentTurnState = useCallback(() => {
    clearPendingTts();
    currentTurnModeRef.current = 'none';
    bufferedTurnTextRef.current = '';
    bufferedUserAgentTurnTextRef.current = '';
    lastAgentContentAtRef.current = 0;
    lastUserAgentContentAtRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    canvasRef.current?.setAgentSpeaking?.(false);
    ambientDroneRef.current?.stop();
  }, [clearPendingTts, setIsAgentSpeaking, isAgentSpeakingRef, canvasRef, ambientDroneRef]);

  // ── Stop browser TTS ─────────────────────────────────────
  const stopTextToSpeechFallback = useCallback(() => {
    clearPendingTts();
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }, [clearPendingTts]);

  // ── Speak via browser TTS ────────────────────────────────
  const speakTextFallback = useCallback((text) => {
    if (!ttsFallbackEnabledRef.current || typeof text !== 'string' || text.trim().length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const cleanedText = text.replace(/[*_`#]/g, '').trim();
    if (!cleanedText) return;

    const now = Date.now();
    if (cleanedText === lastSpokenTextRef.current && now - lastSpokenAtRef.current < 5000) return;

    stopTextToSpeechFallback();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = /[\u0600-\u06FF]/.test(cleanedText) ? 'ar-EG' : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (currentTurnModeRef.current === 'tts') {
        setIsAgentSpeaking(false);
        isAgentSpeakingRef.current = false;
        canvasRef.current?.setAgentSpeaking?.(false);
        currentTurnModeRef.current = 'none';
        bufferedTurnTextRef.current = '';
      }
    };
    utterance.onerror = () => {
      setIsAgentSpeaking(false);
      isAgentSpeakingRef.current = false;
      currentTurnModeRef.current = 'none';
      bufferedTurnTextRef.current = '';
    };
    window.speechSynthesis.speak(utterance);
    lastSpokenTextRef.current = cleanedText;
    lastSpokenAtRef.current = now;
  }, [stopTextToSpeechFallback, setIsAgentSpeaking, isAgentSpeakingRef, canvasRef]);

  // ── Stop all playback ────────────────────────────────────
  const stopPlayback = useCallback(() => {
    stopTextToSpeechFallback();
    if (speakingDebounceRef.current) {
      clearTimeout(speakingDebounceRef.current);
      speakingDebounceRef.current = null;
    }
    pendingPcmChunksRef.current = [];
    pcmFlushScheduledRef.current = false;
    if (pcmWorkletRef.current) {
      pcmWorkletRef.current.port.postMessage({ type: 'clear' });
    }
    for (const source of activeSourcesRef.current) {
      try { source.stop(); } catch { /* ignore */ }
      try { source.disconnect(); } catch { /* ignore */ }
    }
    activeSourcesRef.current.clear();
    nextPlaybackTimeRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    canvasRef.current?.setAgentSpeaking?.(false);
  }, [stopTextToSpeechFallback, setIsAgentSpeaking, isAgentSpeakingRef, canvasRef]);

  // ── Ensure AudioContext ──────────────────────────────────
  const ensureSpeakerContext = useCallback(async () => {
    if (speakerContextRef.current) {
      if (speakerContextRef.current.state === 'suspended') {
        await speakerContextRef.current.resume();
      }
      return speakerContextRef.current;
    }
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) throw new Error(formatError('webAudioUnsupported'));

    const ctx = new AudioContextCtor({ sampleRate: OUTPUT_SAMPLE_RATE });
    if (ctx.state === 'suspended') await ctx.resume();
    speakerContextRef.current = ctx;
    nextPlaybackTimeRef.current = ctx.currentTime;
    return ctx;
  }, [formatError]);

  // ── Ensure PCM AudioWorklet ──────────────────────────────
  const ensurePcmWorklet = useCallback(async () => {
    if (pcmWorkletRef.current && workletReadyRef.current) return pcmWorkletRef.current;
    const audioContext = await ensureSpeakerContext();
    try { await audioContext.audioWorklet.addModule('/pcm-player-processor.js'); } catch { /* already registered */ }
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-player-processor', {
      outputChannelCount: [1],
    });
    workletNode.connect(audioContext.destination);
    workletNode.port.onmessage = (e) => {
      if (e.data.type === 'drained') {
        if (speakingDebounceRef.current) clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = setTimeout(() => {
          const elapsed = Date.now() - lastPcmPushAtRef.current;
          if (elapsed > 500) {
            console.log('[Audio] Agent finished speaking (worklet drained)');
            setIsAgentSpeaking(false);
            isAgentSpeakingRef.current = false;
            canvasRef.current?.setAgentSpeaking?.(false);
          }
          speakingDebounceRef.current = null;
        }, 500);
      } else if (e.data.type === 'amplitude') {
        canvasRef.current?.setAgentAudioAmplitude?.(e.data.rms);
      }
    };
    pcmWorkletRef.current = workletNode;
    workletReadyRef.current = true;
    return workletNode;
  }, [ensureSpeakerContext, setIsAgentSpeaking, isAgentSpeakingRef, canvasRef]);

  // ── Flush batched PCM chunks ─────────────────────────────
  const flushPcmChunks = useCallback(async () => {
    pcmFlushScheduledRef.current = false;
    const chunks = pendingPcmChunksRef.current;
    if (chunks.length === 0) return;
    pendingPcmChunksRef.current = [];

    const worklet = await ensurePcmWorklet();
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    worklet.port.postMessage({ type: 'audio', samples: merged });
    lastPcmPushAtRef.current = Date.now();
    lastModelAudioAtRef.current = Date.now();
  }, [ensurePcmWorklet]);

  // ── Play a single PCM16 chunk ────────────────────────────
  const playPcmChunk = useCallback(
    async (arrayBuffer) => {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;
      stopTextToSpeechFallback();
      const float32 = pcm16ToFloat32(arrayBuffer);
      if (float32.length === 0) return;

      pendingPcmChunksRef.current.push(float32);
      if (!pcmFlushScheduledRef.current) {
        pcmFlushScheduledRef.current = true;
        queueMicrotask(flushPcmChunks);
      }

      if (speakingDebounceRef.current) {
        clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = null;
      }
    },
    [flushPcmChunks, stopTextToSpeechFallback]
  );

  return {
    // Refs exposed for direct access
    speakerContextRef,
    currentTurnModeRef,
    bufferedTurnTextRef,
    bufferedUserAgentTurnTextRef,
    lastAgentContentAtRef,
    lastUserAgentContentAtRef,
    lastModelAudioAtRef,
    ttsDecisionTimeoutRef,
    pendingTtsTimeoutRef,
    ttsFallbackEnabledRef,
    // Functions
    closeSpeakerContext,
    clearPendingTts,
    resetAgentTurnState,
    stopTextToSpeechFallback,
    speakTextFallback,
    stopPlayback,
    ensureSpeakerContext,
    ensurePcmWorklet,
    flushPcmChunks,
    playPcmChunk,
  };
}

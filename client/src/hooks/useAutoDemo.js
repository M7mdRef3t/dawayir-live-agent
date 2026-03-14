import { useCallback, useRef } from 'react';

/**
 * useAutoDemo — manages the automated demo playback system.
 * Handles synthetic user speech, demo timing, and the full auto-demo lifecycle.
 *
 * @param {Object} opts - Dependencies from App
 */
export function useAutoDemo({
  wsRef,
  setupCompleteRef,
  isAgentSpeakingRef,
  isMicActiveRef,
  transcriptRef,
  canvasRef: _canvasRef,
  autoDemoRunIdRef,
  autoDemoPendingStartRef,
  autoDemoShouldRestoreMicRef,
  isAutoDemoRunning,
  setIsAutoDemoRunning,
  setAutoDemoStatus,
  setLastEvent,
  setTranscript,
  lang: _lang,
  upsertTranscriptBubble,
  startTurnLatency,
  stopPlayback: _stopPlayback,
  stopMicrophone,
  startMicrophone,
  speakTextFallback: _speakTextFallback,
  ensureSpeakerContext,
}) {
  const autoDemoTimerRef = useRef(null);
  const syntheticUtteranceRef = useRef(null);

  const clearAutoDemoTimer = useCallback(() => {
    if (autoDemoTimerRef.current) {
      window.clearTimeout(autoDemoTimerRef.current);
      autoDemoTimerRef.current = null;
    }
  }, []);

  const sleepForAutoDemo = useCallback((ms, runId) => (
    new Promise((resolve) => {
      if (autoDemoRunIdRef.current !== runId) {
        resolve(false);
        return;
      }
      clearAutoDemoTimer();
      autoDemoTimerRef.current = window.setTimeout(() => {
        autoDemoTimerRef.current = null;
        resolve(autoDemoRunIdRef.current === runId);
      }, ms);
    })
  ), [autoDemoRunIdRef, clearAutoDemoTimer]);

  const appendSyntheticUserTranscript = useCallback((text) => {
    setTranscript((prev) => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last && last.role === 'user' && !last.finished) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: last.text + text };
        return updated;
      }
      return [...prev, { role: 'user', text, finished: false, cogColor: null }];
    });
  }, [setTranscript]);

  const sendSyntheticUserTextTurn = useCallback((text) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !setupCompleteRef.current) return;
    upsertTranscriptBubble('user', text, true);
    startTurnLatency();
    socket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
    setLastEvent('synthetic_user_text');
  }, [wsRef, setupCompleteRef, upsertTranscriptBubble, startTurnLatency, setLastEvent]);

  const stopSyntheticUserSpeech = useCallback(() => {
    if (syntheticUtteranceRef.current) {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch { /* ignore */ }
      syntheticUtteranceRef.current = null;
    }
  }, []);

  const speakSyntheticUserLine = useCallback(async (text, runId) => {
    if (autoDemoRunIdRef.current !== runId) return false;
    stopSyntheticUserSpeech();

    const hasArabic = /[\u0600-\u06FF]/.test(text);
    appendSyntheticUserTranscript(text);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      await new Promise(r => setTimeout(r, Math.min(text.length * 60, 4000)));
      setTranscript(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], finished: true };
        return updated;
      });
      return autoDemoRunIdRef.current === runId;
    }

    try { await ensureSpeakerContext(); } catch { /* ignore */ }

    return new Promise((resolve) => {
      if (autoDemoRunIdRef.current !== runId) { resolve(false); return; }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = hasArabic ? 'ar-EG' : 'en-US';
      utterance.rate = hasArabic ? 0.95 : 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (hasArabic) {
        const arVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arVoice) utterance.voice = arVoice;
      }

      syntheticUtteranceRef.current = utterance;

      utterance.onend = () => {
        syntheticUtteranceRef.current = null;
        setTranscript(prev => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], finished: true };
          return updated;
        });
        resolve(autoDemoRunIdRef.current === runId);
      };
      utterance.onerror = () => {
        syntheticUtteranceRef.current = null;
        setTranscript(prev => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], finished: true };
          return updated;
        });
        resolve(autoDemoRunIdRef.current === runId);
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [autoDemoRunIdRef, appendSyntheticUserTranscript, ensureSpeakerContext, stopSyntheticUserSpeech, setTranscript]);

  const waitForAutoDemoReady = useCallback(async (runId, { maxWaitMs = 20000 } = {}) => {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      if (autoDemoRunIdRef.current !== runId) return false;
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && setupCompleteRef.current) return true;
      await new Promise(r => setTimeout(r, 300));
    }
    return false;
  }, [autoDemoRunIdRef, wsRef, setupCompleteRef]);

  const waitForAgentToSettle = useCallback(async (runId, { silenceMs = 2500, maxMs = 30000 } = {}) => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (autoDemoRunIdRef.current !== runId) return false;
      if (isAgentSpeakingRef.current) {
        await new Promise(r => setTimeout(r, 400));
        continue;
      }
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      let silentSince = Date.now();
      while (Date.now() - silentSince < silenceMs && Date.now() < deadline) {
        if (autoDemoRunIdRef.current !== runId) return false;
        if (isAgentSpeakingRef.current) { silentSince = Date.now() + 9e9; break; }
        await new Promise(r => setTimeout(r, 200));
      }
      if (Date.now() - silentSince >= silenceMs) return true;
    }
    return false;
  }, [autoDemoRunIdRef, isAgentSpeakingRef, wsRef]);

  const waitForManualUserTurn = useCallback(async (runId, { timeoutMs = 15000 } = {}) => {
    const deadline = Date.now() + timeoutMs;
    const initialCount = transcriptRef.current?.length || 0;
    while (Date.now() < deadline) {
      if (autoDemoRunIdRef.current !== runId) return false;
      const currentCount = transcriptRef.current?.length || 0;
      if (currentCount > initialCount) {
        const last = transcriptRef.current[currentCount - 1];
        if (last?.role === 'user') return true;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    return true;
  }, [autoDemoRunIdRef, transcriptRef]);

  const pauseMicForSyntheticDemo = useCallback(async () => {
    if (isMicActiveRef.current) {
      autoDemoShouldRestoreMicRef.current = true;
      await stopMicrophone();
    } else {
      autoDemoShouldRestoreMicRef.current = false;
    }
  }, [isMicActiveRef, autoDemoShouldRestoreMicRef, stopMicrophone]);

  const restoreMicAfterSyntheticDemo = useCallback(async () => {
    if (autoDemoShouldRestoreMicRef.current) {
      autoDemoShouldRestoreMicRef.current = false;
      try { await startMicrophone(); } catch (e) { console.warn('[AutoDemo] Mic restore failed:', e); }
    }
  }, [autoDemoShouldRestoreMicRef, startMicrophone]);

  const stopAutoDemo = useCallback((reason = 'auto_demo_stopped', statusText = '', { restoreMic = true } = {}) => {
    const hadActiveDemo = isAutoDemoRunning;
    clearAutoDemoTimer();
    autoDemoRunIdRef.current = null;
    autoDemoPendingStartRef.current = false;
    setIsAutoDemoRunning(false);
    stopSyntheticUserSpeech();
    if (statusText) {
      setAutoDemoStatus(statusText);
    }
    if (restoreMic) {
      restoreMicAfterSyntheticDemo();
    } else {
      autoDemoShouldRestoreMicRef.current = false;
    }
    if (hadActiveDemo) {
      setLastEvent(reason);
    }
  }, [clearAutoDemoTimer, isAutoDemoRunning, restoreMicAfterSyntheticDemo, stopSyntheticUserSpeech,
      autoDemoRunIdRef, autoDemoPendingStartRef, setIsAutoDemoRunning, setAutoDemoStatus, setLastEvent,
      autoDemoShouldRestoreMicRef]);

  return {
    autoDemoTimerRef,
    clearAutoDemoTimer,
    sleepForAutoDemo,
    appendSyntheticUserTranscript,
    sendSyntheticUserTextTurn,
    stopSyntheticUserSpeech,
    speakSyntheticUserLine,
    waitForAutoDemoReady,
    waitForAgentToSettle,
    waitForManualUserTurn,
    pauseMicForSyntheticDemo,
    restoreMicAfterSyntheticDemo,
    stopAutoDemo,
  };
}

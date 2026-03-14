import { useCallback, useRef } from 'react';
import {
  tryParseJson,
  base64ToArrayBuffer,
  parsePcmSampleRate,
} from '../features/session/audioUtils';
import {
  isSetupCompleteMessage,
  getServerErrorMessage,
  getToolCall,
  isInterruptedMessage,
  getServerContent,
  getParts,
  getInlineData,
  isAudioMimeType,
  getTurnDataAudioBlobs,
} from '../features/session/protocol';
import {
  OUTPUT_SAMPLE_RATE,
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  MIC_DEFER_TIMEOUT_MS,
} from '../features/session/constants';
import { AUTO_DEMO_SCRIPT } from '../features/demo/demoScripts';

const WS_LOG_VERBOSE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_VERBOSE_WS_LOG === '1';

/**
 * useConnection — manages WebSocket lifecycle, message dispatch, and reconnection.
 *
 * Extracts the monster `connect()` and `disconnect()` from App.jsx.
 */
export function useConnection(opts) {
  const {
    wsRef, canvasRef, ambientDroneRef, isAgentSpeakingRef,
    setupCompleteRef, bootstrapPromptSentRef,
    restoreAfterGeminiReconnectRef, deferMicStartUntilFirstAgentReplyRef,
    lastModelAudioAtRef, connectLockRef, manualCloseRef,
    reconnectTimeoutRef, reconnectAttemptRef,
    micStartTimeoutRef, isMicActiveRef, autoDemoRunIdRef: _autoDemoRunIdRef,
    autoDemoPendingStartRef, isAutoDemoRunningRef,
    oneClickDemoPendingRef, autoDemoShouldRestoreMicRef: _autoDemoShouldRestoreMicRef,
    lastRestorePromptAtRef, sessionContextRef,
    transcriptThrottleRef, bufferedUserTextRef,
    userSpeechActiveRef, lastSpeechAtRef, speechResetTimerRef,
    dominantNodeRef, journeyPathRef, prevInsightRadiusRef,
    transcriptRef, appViewRef,
    // Audio pipeline
    bufferedTurnTextRef, bufferedUserAgentTurnTextRef,
    lastAgentContentAtRef, lastUserAgentContentAtRef,
    currentTurnModeRef, ttsDecisionTimeoutRef, ttsFallbackEnabledRef,
    // State values (used in closure)
    isStarting, isConnected, appView, hasSessionStarted,
    capturedImage, lang, isAutoDemoRunning, backendUrl, userKey,
    // State setters
    setIsStarting, setIsConnected, setIsAgentSpeaking,
    setStatus, setErrorMessage, setLastEvent, setConnectStage,
    setHasSessionStarted, setReconnectAttempt,
    setSessionStartTime, setTransitionCount,
    setJourneyPath, setIsBreathingRoom,
    setIsUserSpeaking, setTranscript,
    setCognitiveMetrics, setAutoDemoStatus, setLatestTruthContract,
    // Callbacks
    formatAppError, ensureSpeakerContext, ensurePcmWorklet,
    resetAgentTurnState, stopPlayback, stopMicrophone, startMicrophone,
    playPcmChunk, clearPendingTts, speakTextFallback,
    handleToolCall, getOutputSpeaker,
    upsertTranscriptBubble, goToView,
    preCue, resetUserSpeaking, resetSessionReplay,
    resolveTurnLatency, unlockAchievement,
    sendHybridControl, stopAutoDemo,
    closeSpeakerContext, saveSessionProgress,
  } = opts;

  // ── autoDemoCopy ────────────────────────────────────
  
  const wsContractTelemetryRef = useRef({
    totalTracked: 0,
    event: { server_status: 0, hybrid_status: 0, debug_transcription: 0 },
    legacyOnly: { server_status: 0, hybrid_status: 0, debug_transcription: 0 },
    lastLoggedAt: 0,
  });

  const logWsContractTelemetry = useCallback((force = false) => {
    const t = wsContractTelemetryRef.current;
    const now = Date.now();
    if (!force && now - t.lastLoggedAt < 60000) return;
    t.lastLoggedAt = now;

    const eventCount = t.event.server_status + t.event.hybrid_status + t.event.debug_transcription;
    const legacyOnlyCount = t.legacyOnly.server_status + t.legacyOnly.hybrid_status + t.legacyOnly.debug_transcription;
    const tracked = Math.max(1, t.totalTracked);

    console.info('[WS Contract Telemetry]', {
      tracked: t.totalTracked,
      eventCount,
      legacyOnlyCount,
      eventRatioPercent: Math.round((eventCount / tracked) * 100),
      legacyOnlyRatioPercent: Math.round((legacyOnlyCount / tracked) * 100),
      eventByType: t.event,
      legacyOnlyByType: t.legacyOnly,
    });
  }, []);

  const trackWsContractMessage = useCallback((message) => {
    const t = wsContractTelemetryRef.current;
    const eventType = message?.event?.type;

    const hasLegacyServerStatus = Boolean(message?.serverStatus ?? message?.server_status);
    const hasLegacyHybridStatus = Boolean(message?.hybridStatus ?? message?.hybrid_status);
    const hasLegacyDebugTx = Boolean(message?.debugTranscription ?? message?.debug_transcription);

    let tracked = false;

    if (eventType === 'server_status') {
      t.event.server_status += 1;
      tracked = true;
    } else if (hasLegacyServerStatus) {
      t.legacyOnly.server_status += 1;
      tracked = true;
    }

    if (eventType === 'hybrid_status') {
      t.event.hybrid_status += 1;
      tracked = true;
    } else if (hasLegacyHybridStatus) {
      t.legacyOnly.hybrid_status += 1;
      tracked = true;
    }

    if (eventType === 'debug_transcription') {
      t.event.debug_transcription += 1;
      tracked = true;
    } else if (hasLegacyDebugTx) {
      t.legacyOnly.debug_transcription += 1;
      tracked = true;
    }

    if (tracked) {
      t.totalTracked += 1;
      logWsContractTelemetry(false);
    }
  }, [logWsContractTelemetry]);

  // ── disconnect ──────────────────────────────────────
  const disconnect = useCallback(async () => {
    stopAutoDemo('auto_demo_stopped_disconnect', '', { restoreMic: false });
    manualCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (micStartTimeoutRef.current) {
      window.clearTimeout(micStartTimeoutRef.current);
      micStartTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    const socket = wsRef.current;
    wsRef.current = null;

    setupCompleteRef.current = false;
    bootstrapPromptSentRef.current = false;
    restoreAfterGeminiReconnectRef.current = false;
    deferMicStartUntilFirstAgentReplyRef.current = false;
    lastModelAudioAtRef.current = Date.now();
    resetAgentTurnState();
    setIsStarting(false);
    setIsConnected(false);
    setConnectStage(0);

    await stopMicrophone();
    stopPlayback();
    await closeSpeakerContext();

    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      } catch { /* ignore */ }
      socket.close();
    }

    const finalNodes = canvasRef.current?.getNodes?.() || [];
    if (finalNodes.length > 0) saveSessionProgress(finalNodes);
    logWsContractTelemetry(true);

    setStatus('Disconnected');
    setLastEvent('manual_disconnect');
  }, [closeSpeakerContext, logWsContractTelemetry, resetAgentTurnState, stopAutoDemo, stopMicrophone, stopPlayback]);

  // ── handleWsMessage ─────────────────────────────────
  const handleWsMessage = useCallback(async (event, socket) => {
    if (wsRef.current !== socket) return;
    let message = null;

    if (typeof event.data === 'string') {
      message = tryParseJson(event.data);
    }

    if (message?.cognitiveMetrics) {
      setCognitiveMetrics(message.cognitiveMetrics);
    }
    if (message?.truthContractUpdate) {
      const incoming = message.truthContractUpdate;
      setLatestTruthContract?.({
        ...incoming,
        status: incoming?.completedAt ? 'completed' : 'pending',
      });
    }

    if (event.data instanceof ArrayBuffer) {
      const decoded = new TextDecoder('utf-8').decode(event.data);
      message = tryParseJson(decoded);
      if (!message) {
        await playPcmChunk(event.data);
        return;
      }
    }

    if (event.data instanceof Blob) {
      const arrayBuffer = await event.data.arrayBuffer();
      const decoded = new TextDecoder('utf-8').decode(arrayBuffer);
      message = tryParseJson(decoded);
      if (!message) {
        await playPcmChunk(arrayBuffer);
        return;
      }
    }

    if (!message) return;
    trackWsContractMessage(message);

    // ── Debug transcription ─────────────────────
    const eventType = message?.event?.type;
    const eventPayload = message?.event?.payload;

    const debugTranscription = eventType === 'debug_transcription'
      ? eventPayload
      : (message?.debugTranscription ?? message?.debug_transcription);
    if (debugTranscription) {
      const dt = debugTranscription;
      if (dt.metrics) setCognitiveMetrics(dt.metrics);
      if (WS_LOG_VERBOSE || dt.finished) {
        console.log(`%c[Transcription:${dt.type}] "${dt.text}" (finished=${dt.finished})`, 'color: #00ff00; font-weight: bold');
      }

      if (dt.type === 'input') {
        const now = Date.now();
        lastSpeechAtRef.current = now;

        if (!dt.finished && !userSpeechActiveRef.current) {
          if (isAgentSpeakingRef.current) {
            stopPlayback();
            setLastEvent('barge_in_interrupt');
            unlockAchievement('bargeIn');
          }
          userSpeechActiveRef.current = true;
          setIsUserSpeaking(true);
          bufferedUserTextRef.current = '';
          preCue(dt.text);
          unlockAchievement('firstWord');
        }

        bufferedUserTextRef.current = `${bufferedUserTextRef.current} ${dt.text}`.trim();

        if (speechResetTimerRef.current) clearTimeout(speechResetTimerRef.current);
        speechResetTimerRef.current = setTimeout(() => {
          if (Date.now() - lastSpeechAtRef.current > 850) resetUserSpeaking();
        }, 900);

        const shouldUpdate = Boolean(dt.finished) || (now - transcriptThrottleRef.current.user) > 120;
        if (shouldUpdate) {
          transcriptThrottleRef.current.user = now;
          setTranscript((prev) => {
            const next = [...prev];
            let found = false;
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'user' && !next[i].finished) {
                next[i] = { ...next[i], text: bufferedUserTextRef.current, finished: !!dt.finished };
                found = true;
                break;
              }
            }
            if (!found) {
              const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              next.push({ role: 'user', text: bufferedUserTextRef.current, time: timeStr, finished: !!dt.finished, cogColor: dominantNodeRef.current === 2 ? '#2ECC71' : dominantNodeRef.current === 3 ? '#9B59B6' : '#38B2D8' });
            }
            if (next.length >= 5) unlockAchievement('deepConvo');
            return next.slice(-6);
          });
        }

        if (dt.finished) resetUserSpeaking();
      } else if (dt.type === 'output') {
        const speaker = getOutputSpeaker(dt.speaker ?? message?.speaker);
        const role = speaker === 'user_agent' ? 'user_agent' : 'agent';
        const outputBufferRef = speaker === 'user_agent' ? bufferedUserAgentTurnTextRef : bufferedTurnTextRef;
        const outputLastAtRef = speaker === 'user_agent' ? lastUserAgentContentAtRef : lastAgentContentAtRef;
        const throttleKey = role === 'user_agent' ? 'user_agent' : 'agent';

        if (speaker === 'dawayir') resolveTurnLatency();

        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;

        const isNewTurn = outputBufferRef.current.trim() === '';
        outputBufferRef.current = `${outputBufferRef.current} ${dt.text}`.trim();
        if (isNewTurn && speaker === 'dawayir') unlockAchievement('firstReply');

        const now = Date.now();
        outputLastAtRef.current = now;
        const shouldUpdateAgent = Boolean(dt.finished) || (now - (transcriptThrottleRef.current[throttleKey] ?? 0)) > 90;
        if (shouldUpdateAgent) {
          transcriptThrottleRef.current[throttleKey] = now;
          upsertTranscriptBubble(role, outputBufferRef.current, !!dt.finished, {
            cogColor: dominantNodeRef.current === 2 ? '#2ECC71' : dominantNodeRef.current === 3 ? '#9B59B6' : '#38B2D8',
          });
        }
        if (dt.finished) outputBufferRef.current = '';
      }
      return;
    }

    // ── Server status ───────────────────────────
    const serverStatus = eventType === 'server_status'
      ? eventPayload
      : (message?.serverStatus ?? message?.server_status);
    if (serverStatus?.state === 'gemini_reconnecting') {
      if (bootstrapPromptSentRef.current) restoreAfterGeminiReconnectRef.current = true;
      lastModelAudioAtRef.current = Date.now();
      const attempt = Number(serverStatus.attempt || 0);
      const maxAttempts = Number(serverStatus.maxAttempts || MAX_RECONNECT_ATTEMPTS);
      const delaySeconds = Math.max(1, Math.ceil(Number(serverStatus.delayMs || RECONNECT_DELAY_MS) / 1000));
      setStatus(`Gemini reconnecting (${attempt}/${maxAttempts}) in ${delaySeconds}s...`);
      setLastEvent('gemini_reconnecting');
      return;
    }
    if (serverStatus?.state === 'gemini_recovered') {
      setStatus('Gemini reconnected. Restoring session...');
      setLastEvent('gemini_recovered');
      return;
    }
    if (serverStatus?.state === 'gemini_unavailable') {
      const cooldownSeconds = Math.max(1, Math.ceil(Number(serverStatus.cooldownMs || RECONNECT_DELAY_MS) / 1000));
      setStatus(lang === 'ar'
        ? `Gemini \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0645\u0624\u0642\u062a\u064b\u0627. \u0628\u0646\u062d\u0627\u0648\u0644 \u062a\u0627\u0646\u064a \u0628\u0639\u062f ${cooldownSeconds} \u062b\u0648\u0627\u0646\u064a...`
        : `Gemini is temporarily unavailable. Retrying in ${cooldownSeconds}s...`);
      setErrorMessage(lang === 'ar'
        ? '\u0627\u0644\u062c\u0644\u0633\u0629 \u0645\u0627 \u0627\u0646\u062a\u0647\u062a\u0634\u060c \u0644\u0643\u0646 \u0627\u0644\u062e\u0627\u062f\u0645 \u0628\u064a\u062d\u0627\u0648\u0644 \u064a\u0631\u062c\u0651\u0639 \u0627\u062a\u0635\u0627\u0644 Gemini.'
        : 'The session has not ended, but the server is recovering the Gemini connection.');
      setLastEvent('gemini_unavailable');
      if (isAutoDemoRunning || autoDemoPendingStartRef.current) {
        sendHybridControl('stop');
        stopAutoDemo('auto_demo_gemini_unavailable',
          lang === 'ar' ? '\u0627\u062a\u0635\u0627\u0644 Gemini \u0648\u0642\u0639 \u0645\u0624\u0642\u062a\u064b\u0627\u060c \u0641\u0648\u0642\u0641\u0646\u0627 \u0627\u0644\u062f\u064a\u0645\u0648 \u0644\u062d\u062f \u0645\u0627 \u064a\u0631\u062c\u0639.'
          : 'Gemini dropped temporarily, so the demo was paused until it recovers.');
      }
      return;
    }

    // ── Hybrid status ───────────────────────────
    const hybridStatus = eventType === 'hybrid_status'
      ? eventPayload
      : (message?.hybridStatus ?? message?.hybrid_status);
    if (hybridStatus?.state) {
      const maxTurns = Math.max(1, Number(hybridStatus.maxTurns || (AUTO_DEMO_SCRIPT[lang] ?? AUTO_DEMO_SCRIPT.en).length || 1));
      const currentTurn = Math.max(1, Number(hybridStatus.turn || 1));
      if (hybridStatus.state === 'starting') {
        setAutoDemoStatus(lang === 'ar' ? '\u062c\u0627\u0631\u064a \u0641\u062a\u062d \u0648\u0643\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062d\u064a...' : 'Opening the live user agent...');
        setLastEvent('hybrid_starting');
        return;
      }
      if (hybridStatus.state === 'ready') {
        setAutoDemoStatus(lang === 'ar' ? '\u0648\u0643\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062d\u064a \u062c\u0627\u0647\u0632.' : 'The live user agent is ready.');
        setLastEvent('hybrid_ready');
        return;
      }
      if (hybridStatus.state === 'waiting_opening') {
        setAutoDemoStatus(autoDemoCopy.opening);
        setLastEvent('hybrid_waiting_opening');
        return;
      }
      if (hybridStatus.state === 'running') {
        const activeSpeaker = hybridStatus.speaker === 'user_agent'
          ? (lang === 'ar' ? '\u0648\u0643\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u064a\u0631\u062f' : 'User agent responding')
          : (lang === 'ar' ? '\u062f\u0648\u0627\u064a\u0631 \u0628\u064a\u0631\u062f' : 'Dawayir responding');
        setAutoDemoStatus(`${activeSpeaker} ${currentTurn}/${maxTurns}`);
        setLastEvent(`hybrid_running:${hybridStatus.speaker || 'dawayir'}`);
        return;
      }
      if (hybridStatus.state === 'repairing') {
        setAutoDemoStatus(
          typeof hybridStatus.message === 'string' && hybridStatus.message.trim()
            ? hybridStatus.message
            : (hybridStatus.speaker === 'user_agent'
              ? (lang === 'ar' ? '\u0648\u0643\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u064a\u0638\u0628\u0637 \u0631\u062f\u0647...' : 'The user agent is refining the turn...')
              : (lang === 'ar' ? '\u062f\u0648\u0627\u064a\u0631 \u0628\u064a\u0638\u0628\u0637 \u0631\u062f\u0647...' : 'Dawayir is refining the reply...'))
        );
        setLastEvent(`hybrid_repairing:${hybridStatus.speaker || 'dawayir'}`);
        return;
      }
      if (hybridStatus.state === 'recovering') {
        setAutoDemoStatus(
          typeof hybridStatus.message === 'string' && hybridStatus.message.trim()
            ? hybridStatus.message
            : (lang === 'ar' ? '\u062c\u0644\u0633\u0629 \u062f\u0648\u0627\u064a\u0631 \u0628\u062a\u0631\u062c\u0639 \u062f\u0644\u0648\u0642\u062a\u064a...' : 'Dawayir is recovering now...')
        );
        setLastEvent('hybrid_recovering');
        return;
      }
      if (hybridStatus.state === 'completed') { stopAutoDemo('auto_demo_completed', autoDemoCopy.completed); return; }
      if (hybridStatus.state === 'stopped') { stopAutoDemo('auto_demo_server_stopped', autoDemoCopy.canceled); return; }
      if (hybridStatus.state === 'failed') {
        stopAutoDemo('auto_demo_server_failed',
          typeof hybridStatus.message === 'string' && hybridStatus.message.trim() ? hybridStatus.message : autoDemoCopy.failed);
        return;
      }
    }

    // ── Server error ────────────────────────────
    const serverError = getServerErrorMessage(message);
    if (serverError) {
      setStatus('Error');
      setErrorMessage(serverError);
      setLastEvent('server_error');
      return;
    }

    // ── Setup complete ──────────────────────────
    if (isSetupCompleteMessage(message)) {
      setupCompleteRef.current = true;
      setHasSessionStarted(true);
      const currentView = appViewRef.current;
      console.log('[Connect] setupComplete received, currentView =', currentView);
      if (currentView === 'setup' || currentView === 'welcome') {
        goToView('live');
        setIsBreathingRoom(true);
      }
      setStatus('Connected to Gemini Live');
      setConnectStage(2);
      setLastEvent('setup_complete');
      lastModelAudioAtRef.current = Date.now();
      const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;
      if (!isGeminiReconnect) {
        resetAgentTurnState();
        stopPlayback();
      }
      ensurePcmWorklet().catch(() => {});
      deferMicStartUntilFirstAgentReplyRef.current = !isMicActiveRef.current;
      if (micStartTimeoutRef.current) {
        window.clearTimeout(micStartTimeoutRef.current);
        micStartTimeoutRef.current = null;
      }

      try {
        if (wsRef.current?.readyState === WebSocket.OPEN && wsRef.current === socket) {
          const isReconnect = reconnectAttemptRef.current > 0;
          const isGeminiReconnect2 = restoreAfterGeminiReconnectRef.current;

          if (!bootstrapPromptSentRef.current) {
            bootstrapPromptSentRef.current = true;
            console.log('[App] Sending bootstrap prompt...');

            const parts = [];
            if (capturedImage) {
              const base64Data = capturedImage.split(',')[1];
              if (base64Data) {
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
              }
            }

            const bootstrapText = autoDemoPendingStartRef.current
              ? (lang === 'ar'
                ? (capturedImage
                  ? '\u062f\u064a \u0635\u0648\u0631\u062a\u064a \u062f\u0644\u0648\u0642\u062a\u064a \u0643\u0645\u0631\u062c\u0639 \u0628\u0635\u0631\u064a. \u0627\u0641\u062a\u062d \u0627\u0644\u062c\u0644\u0633\u0629 \u0628\u062a\u0631\u062d\u064a\u0628 \u0645\u0635\u0631\u064a \u062d\u0642\u064a\u0642\u064a \u0645\u0646 6 \u0625\u0644\u0649 10 \u0643\u0644\u0645\u0627\u062a \u0641\u064a\u0647 \u0637\u0645\u0623\u0646\u0629 \u062e\u0641\u064a\u0641\u0629 \u0648\u0625\u062d\u0633\u0627\u0633 \u0625\u0646\u0643 \u0645\u0639\u0627\u064a\u0627\u060c \u0645\u0646 \u063a\u064a\u0631 \u0633\u0624\u0627\u0644 \u0623\u0648 \u0639\u0644\u0627\u0645\u0629 \u0627\u0633\u062a\u0641\u0647\u0627\u0645.'
                  : '\u0627\u0628\u062f\u0623 \u0627\u0644\u062c\u0644\u0633\u0629 \u0628\u062a\u0631\u062d\u064a\u0628 \u0645\u0635\u0631\u064a \u062d\u0642\u064a\u0642\u064a \u0645\u0646 6 \u0625\u0644\u0649 10 \u0643\u0644\u0645\u0627\u062a \u0641\u064a\u0647 \u0637\u0645\u0623\u0646\u0629 \u062e\u0641\u064a\u0641\u0629 \u0648\u0625\u062d\u0633\u0627\u0633 \u0625\u0646\u0643 \u0645\u0639\u0627\u064a\u0627\u060c \u0645\u0646 \u063a\u064a\u0631 \u0633\u0624\u0627\u0644 \u0623\u0648 \u0639\u0644\u0627\u0645\u0629 \u0627\u0633\u062a\u0641\u0647\u0627\u0645.')
                : (capturedImage
                  ? 'This is my photo as visual context. Open the session with a real warm welcome of about 6 to 10 words, calm and human, with no question mark.'
                  : 'Open the session with a real warm welcome of about 6 to 10 words, calm and human, with no question mark.'))
              : (lang === 'ar'
                ? (capturedImage
                  ? '\u062f\u064a \u0635\u0648\u0631\u062a\u064a \u062f\u0644\u0648\u0642\u062a\u064a. \u0627\u0642\u0631\u0623 \u062d\u0627\u0644\u062a\u064a \u0627\u0644\u0646\u0641\u0633\u064a\u0629 \u0645\u0646 \u0627\u0644\u0635\u0648\u0631\u0629 \u0648\u0646\u0627\u062f\u064a update_node \u0639\u0634\u0627\u0646 \u062a\u063a\u064a\u0651\u0631 radius \u0648color \u0644\u0643\u0644 \u062f\u0627\u064a\u0631\u0629 \u0639\u0644\u0649 \u062d\u0633\u0628 \u0642\u0631\u0627\u064a\u062a\u0643. \u0627\u0633\u062a\u062e\u062f\u0645 id \u0648radius \u0648color \u0628\u0633.'
                  : '\u0627\u0628\u062f\u0623 \u0645\u0639\u0627\u064a\u0627 \u0628\u062a\u0631\u062d\u064a\u0628 \u0645\u0635\u0631\u064a \u0642\u0635\u064a\u0631 \u0648\u0628\u0639\u062f\u064a\u0646 \u062e\u064a\u0637 \u0648\u0627\u0636\u062d.')
                : (capturedImage
                  ? 'This is my photo. Read my emotional state from the image and call update_node to change radius and color for each circle based on your reading. Use only id, radius, and color.'
                  : 'Start with a warm welcome, then a grounded first line.'));
            parts.push({ text: bootstrapText });
            wsRef.current.send(JSON.stringify({
              clientContent: { turns: [{ role: 'user', parts }], turnComplete: true }
            }));
          } else if (isReconnect || isGeminiReconnect2) {
            unlockAchievement('reconnected');
            const now = Date.now();
            if (now - lastRestorePromptAtRef.current < 6000) {
              restoreAfterGeminiReconnectRef.current = false;
              return;
            }
            lastRestorePromptAtRef.current = now;
            const isHybridReconnect = isAutoDemoRunningRef.current || autoDemoPendingStartRef.current;
            const lastHybridUserEntry = [...transcriptRef.current]
              .reverse()
              .find((entry) => entry?.role === 'user_agent' || entry?.role === 'user');
            const lastConv = sessionContextRef.current.length > 0
              ? sessionContextRef.current.slice(-3).join(' ... ')
              : '';
            const promptText = isHybridReconnect
              ? (() => {
                const lastUserLine = String(lastHybridUserEntry?.text ?? '').trim();
                if (lastUserLine) {
                  return lang === 'ar'
                    ? `(\u0643\u0645\u0651\u0644 \u0627\u0644\u062d\u0648\u0627\u0631 \u0645\u0646 \u063a\u064a\u0631 \u0645\u0627 \u062a\u0630\u0643\u0631 \u0627\u0646\u0642\u0637\u0627\u0639. \u0622\u062e\u0631 \u0643\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0643\u0627\u0646: "${lastUserLine}". \u0631\u062f \u0628\u062c\u0645\u0644\u0629 \u0645\u0635\u0631\u064a\u0629 \u0648\u0627\u062d\u062f\u0629 \u062a\u0643\u0645\u0644 \u0627\u0644\u062e\u064a\u0637.)`
                    : `(Continue naturally with no mention of interruption. The user's last line was: "${lastUserLine}". Reply with one short line that continues the thread.)`;
                }
                return lang === 'ar'
                  ? '(\u0643\u0645\u0651\u0644 \u0627\u0644\u062d\u0648\u0627\u0631 \u0627\u0644\u0637\u0628\u064a\u0639\u064a \u0645\u0639 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0646 \u063a\u064a\u0631 \u0645\u0627 \u062a\u0630\u0643\u0631 \u0627\u0646\u0642\u0637\u0627\u0639.)'
                  : '(Continue the natural conversation with the user without mentioning any interruption.)';
              })()
              : (lastConv
                ? `(\u0643\u0645\u0651\u0644 \u0645\u0646 \u0647\u0646\u0627 \u0628\u0627\u0644\u0638\u0628\u0637: "${lastConv}")`
                : '(\u0643\u0645\u0651\u0644 \u0627\u0644\u062d\u0648\u0627\u0631.)');
            if (isHybridReconnect) {
              setAutoDemoStatus(lang === 'ar'
                ? '\u0631\u062c\u0639 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0648\u0628\u0646\u0643\u0645\u0644 \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u062e\u064a\u0637...'
                : 'The connection is back and the demo is resuming...');
              restoreAfterGeminiReconnectRef.current = false;
              return;
            }
            wsRef.current.send(JSON.stringify({
              clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true }
            }));
            restoreAfterGeminiReconnectRef.current = false;
          }
        }

        micStartTimeoutRef.current = window.setTimeout(async () => {
          if (wsRef.current !== socket || wsRef.current?.readyState !== WebSocket.OPEN) {
            micStartTimeoutRef.current = null;
            return;
          }
          if (!setupCompleteRef.current || isMicActiveRef.current || !deferMicStartUntilFirstAgentReplyRef.current
            || isAutoDemoRunningRef.current || autoDemoPendingStartRef.current) {
            micStartTimeoutRef.current = null;
            return;
          }
          deferMicStartUntilFirstAgentReplyRef.current = false;
          try {
            await startMicrophone();
            setConnectStage(3);
            setLastEvent('mic_autostart_timeout');
          } catch (error) {
            console.error('[Mic] Failed to start microphone:', error);
            setStatus('Error');
            setErrorMessage(error.message);
            setLastEvent('mic_start_error');
          } finally {
            micStartTimeoutRef.current = null;
          }
        }, MIC_DEFER_TIMEOUT_MS);
      } catch (error) {
        setStatus('Error');
        setErrorMessage(error.message);
        setLastEvent('mic_start_error');
      }
      return;
    }

    // ── Tool calls ──────────────────────────────
    const toolCall = getToolCall(message);
    if (toolCall) handleToolCall(toolCall);

    if (isInterruptedMessage(message)) {
      resetAgentTurnState();
      stopPlayback();
      setLastEvent('server_interrupted');
    }

    // ── Audio & text parts ──────────────────────
    const speaker = getOutputSpeaker(message?.speaker);
    const outputRole = speaker === 'user_agent' ? 'user_agent' : 'agent';
    const outputBufferRef = speaker === 'user_agent' ? bufferedUserAgentTurnTextRef : bufferedTurnTextRef;
    const outputLastAtRef = speaker === 'user_agent' ? lastUserAgentContentAtRef : lastAgentContentAtRef;
    const serverContent = getServerContent(message);
    const liveOutputTranscription = serverContent?.outputTranscription ?? serverContent?.output_transcription;
    const hasLiveOutputTranscription = Boolean(liveOutputTranscription?.text);
    const shouldSkipLocalTranscriptFallback = (
      (speaker === 'dawayir' || speaker === 'user_agent')
      && (isAutoDemoRunningRef.current || autoDemoPendingStartRef.current)
      && !hasLiveOutputTranscription
    );
    const outputTurnComplete = Boolean(
      serverContent?.turnComplete || serverContent?.turn_complete
      || serverContent?.generationComplete || serverContent?.generation_complete
    );
    if (!shouldSkipLocalTranscriptFallback && outputTurnComplete && outputBufferRef.current.trim().length > 0) {
      upsertTranscriptBubble(outputRole, outputBufferRef.current, true);
      outputBufferRef.current = '';
    }
    const parts = getParts(message);
    if (parts.length > 0) {
      const now = Date.now();
      if (now - outputLastAtRef.current > 1800) outputBufferRef.current = '';
      outputLastAtRef.current = now;
    }

    const audioParts = Array.isArray(parts)
      ? parts.filter((part) => isAudioMimeType(getInlineData(part)?.mimeType) || isAudioMimeType(getInlineData(part)?.mime_type))
      : [];

    const directAudioBlobs = audioParts
      .map((part) => {
        const inline = getInlineData(part);
        if (!inline?.data) return null;
        return { data: inline.data, mimeType: inline?.mimeType ?? inline?.mime_type ?? `audio/pcm;rate=${OUTPUT_SAMPLE_RATE}` };
      })
      .filter(Boolean);

    const textParts = Array.isArray(parts) ? parts.filter(p => p.text).map(p => p.text) : [];
    if (textParts.length > 0) {
      const contextualText = textParts.join(' ');
      sessionContextRef.current = [
        ...sessionContextRef.current,
        speaker === 'user_agent' ? `${lang === 'ar' ? '\u0648\u0643\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'User agent'}: ${contextualText}` : contextualText,
      ].slice(-6);
      setIsAgentSpeaking(true);
      isAgentSpeakingRef.current = true;
      canvasRef.current?.setAgentSpeaking?.(true);
      ambientDroneRef.current?.start();

      if (!hasLiveOutputTranscription && !shouldSkipLocalTranscriptFallback) {
        outputBufferRef.current = `${outputBufferRef.current} ${textParts.join(' ')}`.trim();
        upsertTranscriptBubble(outputRole, outputBufferRef.current, false);
      }

      if (speaker === 'dawayir' && currentTurnModeRef.current === 'none' && ttsFallbackEnabledRef.current) {
        if (ttsDecisionTimeoutRef.current) window.clearTimeout(ttsDecisionTimeoutRef.current);
        ttsDecisionTimeoutRef.current = window.setTimeout(() => {
          if (currentTurnModeRef.current === 'none' && bufferedTurnTextRef.current.trim().length > 0) {
            currentTurnModeRef.current = 'tts';
            speakTextFallback(bufferedTurnTextRef.current.trim());
          }
          ttsDecisionTimeoutRef.current = null;
        }, 900);
      } else if (speaker === 'dawayir' && currentTurnModeRef.current === 'none' && !ttsFallbackEnabledRef.current) {
        if (ttsDecisionTimeoutRef.current) window.clearTimeout(ttsDecisionTimeoutRef.current);
        ttsDecisionTimeoutRef.current = window.setTimeout(() => {
          if (currentTurnModeRef.current === 'none' && isAgentSpeakingRef.current) {
            setIsAgentSpeaking(false);
            isAgentSpeakingRef.current = false;
          }
          ttsDecisionTimeoutRef.current = null;
        }, 1200);
      }
    }

    const turnAudioBlobs = getTurnDataAudioBlobs(message);
    const selectedAudioBlobs = directAudioBlobs.length > 0 ? directAudioBlobs : turnAudioBlobs;
    if (selectedAudioBlobs.length > 0) {
      if (speaker === 'dawayir') resolveTurnLatency();
      setIsAgentSpeaking(true);
      isAgentSpeakingRef.current = true;
      canvasRef.current?.setAgentSpeaking?.(true);
      if (currentTurnModeRef.current !== 'tts') {
        currentTurnModeRef.current = 'model';
        clearPendingTts();
        for (const blob of selectedAudioBlobs) {
          if (blob?.data) {
            await playPcmChunk(base64ToArrayBuffer(blob.data), parsePcmSampleRate(blob.mimeType));
            setLastEvent(speaker === 'user_agent' ? 'audio_chunk_user_agent' : 'audio_chunk');
          }
        }
      }
    }
  }, [lang, playPcmChunk, stopPlayback, handleToolCall, getOutputSpeaker,
      upsertTranscriptBubble, resetAgentTurnState, clearPendingTts,
      speakTextFallback, ensurePcmWorklet, startMicrophone, goToView,
      preCue, resetUserSpeaking, resolveTurnLatency, unlockAchievement,
      sendHybridControl, stopAutoDemo, formatAppError, ensureSpeakerContext,
      trackWsContractMessage]);

  // ── connect ─────────────────────────────────────────
  const connect = useCallback(async () => {
    if (connectLockRef.current) { console.warn('[Connect] Ignored: connect already in-flight'); return; }
    connectLockRef.current = true;
    if (isStarting) { connectLockRef.current = false; return; }
    if (isConnected) {
      const currentSocket = wsRef.current;
      const hasLiveSocket = !!currentSocket && (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING);
      if (hasLiveSocket) { connectLockRef.current = false; return; }
      setIsConnected(false);
    }
    const existingSocket = wsRef.current;
    if (existingSocket && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)) {
      connectLockRef.current = false;
      return;
    }
    manualCloseRef.current = false;
    const isSessionReconnect = appView === 'live' && hasSessionStarted;

    setErrorMessage('');
    setIsStarting(true);
    if (!isSessionReconnect) setHasSessionStarted(false);
    setStatus('Connecting...');
    setConnectStage(0);
    setLastEvent('connecting');

    try { await ensureSpeakerContext(); } catch (error) {
      setStatus('Error'); setErrorMessage(error.message);
      setIsStarting(false); setLastEvent('speaker_context_error');
      connectLockRef.current = false;
      return;
    }

    const token = import.meta.env.VITE_DAWAYIR_API_TOKEN || import.meta.env.VITE_DAWAYIR_AUTH_TOKEN || '';
    const wsUrl = new URL(backendUrl);
    if (token) wsUrl.searchParams.set('token', token);
    wsUrl.searchParams.set('userKey', userKey || 'anonymous');
    const shouldPreferHybridSocket = autoDemoPendingStartRef.current || isAutoDemoRunningRef.current || oneClickDemoPendingRef.current;
    if (shouldPreferHybridSocket) {
      wsUrl.searchParams.set('mode', 'hybrid');
      wsUrl.searchParams.set('demoToken', 'dawayir-demo-2026');
    }

    const socket = new WebSocket(wsUrl.toString());
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;
    connectLockRef.current = false;

    socket.onopen = () => {
      if (wsRef.current !== socket) return;
      console.log('[Connect] WebSocket opened');
      if (reconnectTimeoutRef.current) { window.clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);
      setIsConnected(true);
      setConnectStage(1);
      setIsStarting(false);
      setStatus('Connected (waiting setupComplete)');
      setLastEvent('ws_open');
      if (!isSessionReconnect) {
        setSessionStartTime(Date.now());
        resetSessionReplay();
        setTransitionCount(0);
        journeyPathRef.current = [1];
        setJourneyPath([1]);
        dominantNodeRef.current = 1;
        prevInsightRadiusRef.current = null;
      }
    };

    socket.onmessage = (event) => handleWsMessage(event, socket, isSessionReconnect);

    socket.onerror = () => {
      if (wsRef.current !== socket) return;
      console.error('[Connect] WebSocket error');
      setStatus('Error');
      setErrorMessage(formatAppError('websocketRetrying'));
      setIsStarting(false);
      setLastEvent('ws_error');
    };

    socket.onclose = async (event) => {
      if (wsRef.current !== socket) return;
      console.warn('[Connect] WebSocket closed', { code: event?.code, reason: event?.reason });
      if (micStartTimeoutRef.current) { window.clearTimeout(micStartTimeoutRef.current); micStartTimeoutRef.current = null; }
      deferMicStartUntilFirstAgentReplyRef.current = false;
      resetAgentTurnState();
      wsRef.current = null;
      setupCompleteRef.current = false;
      setIsConnected(false);
      setIsStarting(false);
      await stopMicrophone();
      stopPlayback();

      if (manualCloseRef.current) {
        setStatus((prev) => (prev === 'Error' ? prev : 'Disconnected'));
        goToView('complete');
        setLastEvent('ws_closed_manual');
        return;
      }

      const nextAttempt = reconnectAttemptRef.current + 1;
      if (nextAttempt <= MAX_RECONNECT_ATTEMPTS) {
        const delayMs = Math.min(RECONNECT_DELAY_MS * (2 ** (nextAttempt - 1)), MAX_RECONNECT_DELAY_MS);
        if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
        reconnectAttemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);
        setStatus(`Reconnecting (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS}) in ${Math.ceil(delayMs / 1000)}s...`);
        setLastEvent('ws_closed_retrying');
        reconnectTimeoutRef.current = window.setTimeout(() => { connect(); }, delayMs);
        return;
      }
      setStatus((prev) => (prev === 'Error' ? prev : 'Disconnected'));
      setErrorMessage(formatAppError('connectionClosed'));
      if (appViewRef.current === 'live') goToView('setup');
      setLastEvent('ws_closed_giveup');
    };
  }, [
    appView, backendUrl, capturedImage, clearPendingTts,
    formatAppError, ensureSpeakerContext, ensurePcmWorklet,
    getOutputSpeaker, goToView, hasSessionStarted,
    handleToolCall, handleWsMessage, isConnected, isStarting,
    lang, resetAgentTurnState, playPcmChunk, speakTextFallback,
    startMicrophone, stopMicrophone, stopPlayback,
    preCue, resetUserSpeaking, resetSessionReplay,
    resolveTurnLatency, sendHybridControl, stopAutoDemo,
    upsertTranscriptBubble,
  ]);

  return { connect, disconnect };
}


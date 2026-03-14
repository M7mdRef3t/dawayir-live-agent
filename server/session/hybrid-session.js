// ═══════════════════════════════════════════════════════
// Hybrid Demo Session Manager
// Manages the fully-automated dawayir ↔ user_agent
// conversation flow (no human involvement).
// ═══════════════════════════════════════════════════════

import {
    HYBRID_MAX_USER_TURNS,
    HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS,
    LIVE_USER_AGENT_VOICE,
} from '../config/index.js';

import {
    HYBRID_MAX_REPAIR_ATTEMPTS,
    HYBRID_HANDOFF_DELAY_MS,
    buildHybridUserAgentInstruction,
    getHybridStageForSpeaker,
    cleanHybridTurnText,
    deduplicateHybridText,
    assessHybridTurnQuality,
    buildHybridRepairPrompt,
    buildHybridDawayirTurnPrompt,
    buildHybridUserAgentTurnPrompt,
} from '../prompts/index.js';
import { buildWsEventEnvelope } from '../domains/realtime/ws-events.js';

const logInfo = (...args) => console.log('[dawayir-server]', ...args);
const logError = (...args) => console.error('[dawayir-server:error]', ...args);

// ── Initial State ────────────────────────────────────────
export const buildInitialHybridState = () => ({
    active: false,
    lang: 'ar',
    maxUserTurns: HYBRID_MAX_USER_TURNS,
    userTurnCount: 0,
    pendingDawayirOpening: '',
    pendingDawayirPrompt: '',
    pendingUserAgentPrompt: '',
    pendingUserAgentTurn: 0,
    awaitingFinalDawayirTurn: false,
    expectedSpeaker: null,
    history: {
        dawayir: [],
        user_agent: [],
    },
    repairAttempts: {
        dawayir: 0,
        user_agent: 0,
    },
    sessionTopic: '',
});

// ── Factory: creates all hybrid session logic bound to one WebSocket connection ──
export const createHybridSession = ({ ai, pickLiveModel, sendToClient, getDawayirSession, activeLiveModel, connectionRequestId, includeLegacy = true }) => {
    // ── State ────────────────────────────────────────────
    let hybridState = buildInitialHybridState();
    let userAgentSession = null;
    let userAgentReady = false;
    let userAgentConnecting = false;
    let userAgentReadyPromise = null;
    let resolveUserAgentReady = null;
    let userAgentLang = 'ar';
    let dawayirHybridTurnBuffer = '';
    let userAgentHybridTurnBuffer = '';
    let userAgentSilenceTimer = null;
    let dawayirSilenceTimer = null;
    let dawayirGraceTimer = null;
    let userAgentGraceTimer = null;
    let lastHybridTurnBySpeaker = { dawayir: '', user_agent: '' };
    let pendingHybridPayloadsBySpeaker = { dawayir: [], user_agent: [] };
    // Suppress duplicate audio after first generationComplete in a dawayir turn.
    // Gemini re-streams audio after tool call responses — this flag blocks the duplicate.
    let dawayirAudioDone = false;
    const deriveHybridTopic = (text) => {
        const cleaned = String(text || '')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return '';
        const stop = new Set(['انا', 'أنا', 'في', 'من', 'على', 'عن', 'الى', 'إلى', 'the', 'and', 'that', 'this', 'with']);
        const words = cleaned.split(' ').filter((w) => w && !stop.has(w.toLowerCase()));
        if (words.length === 0) return '';
        return words.slice(0, 2).join(' ').slice(0, 18);
    };

    // ── Helpers ──────────────────────────────────────────
    const sendEvent = (type, payload, legacyKey = null) => {
        sendToClient(buildWsEventEnvelope({
            type,
            payload,
            requestId: connectionRequestId,
            legacyKey,
            includeLegacy,
        }));
    };

    const sendHybridStatus = (state, extra = {}) => {
        sendEvent('hybrid_status', { state, ...extra }, 'hybridStatus');
    };
    const sendDebugTranscription = (payload) => sendEvent('debug_transcription', payload, 'debugTranscription');

    const tagSpeaker = (payload, speaker) => ({ ...payload, speaker });

    const resetHybridBuffers = () => {
        dawayirHybridTurnBuffer = '';
        userAgentHybridTurnBuffer = '';
        lastHybridTurnBySpeaker = { dawayir: '', user_agent: '' };
        pendingHybridPayloadsBySpeaker = { dawayir: [], user_agent: [] };
    };

    const rememberHybridTurn = (speaker, text) => {
        if (!hybridState.history) return;
        const arr = hybridState.history[speaker];
        if (!Array.isArray(arr)) return;
        arr.push({ text, timestamp: Date.now() });
        if (arr.length > 12) arr.splice(0, arr.length - 12);
    };

    const getHybridStatusTurn = (speaker) => {
        if (speaker === 'user_agent') {
            return Math.min(hybridState.userTurnCount + 1, hybridState.maxUserTurns);
        }
        return Math.max(1, Math.min(hybridState.userTurnCount || 1, hybridState.maxUserTurns));
    };

    // ── Audio Routing ────────────────────────────────────
    // Audio is always streamed directly to the client in real-time.
    // (No buffering — quality checks run on transcripts independently.)
    // Exception: after first generationComplete for a dawayir turn, we block
    // further audio payloads to prevent duplicate playback caused by Gemini
    // re-streaming audio after tool call responses.
    const payloadHasAudio = (payload) => {
        const sc = payload?.serverContent || payload?.server_content;
        const modelTurn = sc?.modelTurn || sc?.model_turn;
        return modelTurn?.parts?.some((p) => p.inlineData || p.inline_data);
    };

    const sendOrBufferHybridSpeakerPayload = (speaker, payload) => {
        if (speaker === 'dawayir' && hybridState.active && dawayirAudioDone && payloadHasAudio(payload)) {
            logInfo('[Hybrid] Suppressed duplicate dawayir audio after generationComplete');
            return;
        }
        sendToClient(payload);
    };

    // Buffer helpers kept for legacy compatibility (buffer stays empty now)
    const bufferHybridSpeakerPayload = () => {};
    const discardBufferedHybridSpeakerPayloads = (speaker) => {
        if (pendingHybridPayloadsBySpeaker[speaker]) {
            pendingHybridPayloadsBySpeaker[speaker] = [];
        }
    };
    const flushBufferedHybridSpeakerPayloads = (speaker, approvedText = '') => {
        if (approvedText) {
            sendDebugTranscription({
                type: 'output',
                text: approvedText,
                finished: true,
                speaker,
            });
        }
        const pending = pendingHybridPayloadsBySpeaker[speaker] || [];
        pendingHybridPayloadsBySpeaker[speaker] = [];
        for (const payload of pending) sendToClient(payload);
    };

    // ── Dispatch: send prompt to dawayir ─────────────────
    const dispatchPendingHybridDawayirPrompt = () => {
        const session = getDawayirSession();
        const promptText = String(hybridState.pendingDawayirPrompt || '').trim();
        if (!promptText || !hybridState.active || hybridState.expectedSpeaker !== 'dawayir' || !session) {
            logInfo(`[Hybrid:dispatch:dawayir] SKIP: prompt=${!!promptText} active=${hybridState.active} expected=${hybridState.expectedSpeaker} session=${!!session}`);
            return;
        }
        logInfo(`[Hybrid:dispatch:dawayir] Scheduling prompt dispatch in ${HYBRID_HANDOFF_DELAY_MS}ms`);
        const activeSession = session;
        setTimeout(() => {
            const currentSession = getDawayirSession();
            if (
                !hybridState.active
                || hybridState.expectedSpeaker !== 'dawayir'
                || !currentSession
                || currentSession !== activeSession
                || String(hybridState.pendingDawayirPrompt || '').trim() !== promptText
            ) {
                logInfo(`[Hybrid:dispatch:dawayir] ABORTED: active=${hybridState.active} expected=${hybridState.expectedSpeaker} sameSession=${currentSession === activeSession}`);
                return;
            }
            logInfo(`[Hybrid:dispatch:dawayir] SENT prompt to dawayir (${promptText.length} chars)`);
            // Reset so this new turn's audio is not suppressed
            dawayirAudioDone = false;
            currentSession.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: promptText }] }],
                turnComplete: true,
            });
        }, HYBRID_HANDOFF_DELAY_MS);
    };

    // ── Dispatch: send prompt to user_agent ──────────────
    const dispatchPendingHybridUserAgentPrompt = () => {
        const promptText = String(hybridState.pendingUserAgentPrompt || '').trim();
        const nextTurn = Math.max(1, Number(hybridState.pendingUserAgentTurn || (hybridState.userTurnCount + 1)));
        if (!promptText || !hybridState.active || hybridState.expectedSpeaker !== 'user_agent' || !userAgentSession || !userAgentReady) {
            logInfo(`[Hybrid:dispatch:ua] SKIP: prompt=${!!promptText} active=${hybridState.active} expected=${hybridState.expectedSpeaker} uaSession=${!!userAgentSession} uaReady=${userAgentReady}`);
            return;
        }
        logInfo(`[Hybrid:dispatch:ua] Scheduling prompt dispatch in ${HYBRID_HANDOFF_DELAY_MS}ms (turn ${nextTurn})`);
        const activeSession = userAgentSession;
        setTimeout(() => {
            if (
                !hybridState.active
                || hybridState.expectedSpeaker !== 'user_agent'
                || !userAgentSession
                || !userAgentReady
                || userAgentSession !== activeSession
                || String(hybridState.pendingUserAgentPrompt || '').trim() !== promptText
            ) {
                logInfo(`[Hybrid:dispatch:ua] ABORTED: active=${hybridState.active} expected=${hybridState.expectedSpeaker} sameSession=${userAgentSession === activeSession} ready=${userAgentReady}`);
                return;
            }
            logInfo(`[Hybrid:dispatch:ua] SENT prompt to user-agent (${promptText.length} chars, turn ${nextTurn})`);
            userAgentSession.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: promptText }] }],
                turnComplete: true,
            });
            sendHybridStatus('running', {
                speaker: 'user_agent',
                turn: nextTurn,
                maxTurns: hybridState.maxUserTurns,
            });

            // ── Two-stage watchdog ──────────────────────
            // Stage 1 (12s): retry prompt on current session
            // Stage 2 (25s): full reconnect of user_agent session
            const watchdogTurn = nextTurn;
            const watchdogSession = userAgentSession;
            const isStillWaiting = () => (
                hybridState.active
                && hybridState.expectedSpeaker === 'user_agent'
                && hybridState.userTurnCount < watchdogTurn
            );

            // Stage 1: retry on same session
            setTimeout(() => {
                if (!isStillWaiting() || userAgentSession !== watchdogSession) return;
                logInfo(`[Hybrid:dispatch:ua] WATCHDOG-1: no response after 12s — retrying prompt (turn ${watchdogTurn})`);
                try {
                    userAgentSession.sendClientContent({
                        turns: [{ role: 'user', parts: [{ text: promptText }] }],
                        turnComplete: true,
                    });
                } catch (err) {
                    logError('[Hybrid:dispatch:ua] WATCHDOG-1 retry failed:', err);
                }
            }, 12000);

            // Stage 2: full reconnect
            setTimeout(async () => {
                if (!isStillWaiting()) return;
                logInfo(`[Hybrid:dispatch:ua] WATCHDOG-2: no response after 25s — reconnecting user_agent session (turn ${watchdogTurn})`);
                sendHybridStatus('recovering', {
                    message: hybridState.lang === 'ar'
                        ? 'وكيل المستخدم مردش — بنعمل جلسة جديدة.'
                        : 'User agent did not respond — opening fresh session.',
                });
                await closeUserAgentSession();
                const ready = await ensureUserAgentSession(hybridState.lang);
                if (!ready) {
                    logError('[Hybrid:dispatch:ua] WATCHDOG-2 reconnect failed');
                    return;
                }
                if (!isStillWaiting()) return;
                // Re-dispatch the same prompt on the new session
                logInfo(`[Hybrid:dispatch:ua] WATCHDOG-2 re-dispatching prompt (${promptText.length} chars, turn ${watchdogTurn})`);
                hybridState.pendingUserAgentPrompt = promptText;
                hybridState.pendingUserAgentTurn = watchdogTurn;
                dispatchPendingHybridUserAgentPrompt();
            }, 25000);
        }, HYBRID_HANDOFF_DELAY_MS);
    };

    // ── Repair ───────────────────────────────────────────
    const requestHybridTurnRepair = (speaker, badText, reasons) => {
        if (!hybridState.active) return false;
        const currentAttempts = hybridState.repairAttempts?.[speaker] || 0;
        if (currentAttempts >= HYBRID_MAX_REPAIR_ATTEMPTS) return false;

        const targetSession = speaker === 'dawayir' ? getDawayirSession() : userAgentSession;
        if (!targetSession) return false;

        hybridState.repairAttempts[speaker] = currentAttempts + 1;
        lastHybridTurnBySpeaker[speaker] = '';
        discardBufferedHybridSpeakerPayloads(speaker);

        targetSession.sendClientContent({
            turns: [{
                role: 'user',
                parts: [{ text: buildHybridRepairPrompt({ speaker, badText, reasons, hybridState }) }],
            }],
            turnComplete: true,
        });

        sendHybridStatus('repairing', {
            speaker,
            turn: getHybridStatusTurn(speaker),
            maxTurns: hybridState.maxUserTurns,
            attempt: hybridState.repairAttempts[speaker],
            message: hybridState.lang === 'ar'
                ? (speaker === 'dawayir' ? 'دواير بيعيد صياغة رده.' : 'وكيل المستخدم بيعيد صياغة دوره.')
                : (speaker === 'dawayir' ? 'Dawayir is tightening the reply.' : 'The user agent is tightening the turn.'),
        });
        return true;
    };

    // ── Forwarding ───────────────────────────────────────
    const forwardUserAgentLineToDawayir = (text) => {
        if (!hybridState.active) return;
        hybridState.expectedSpeaker = 'dawayir';
        hybridState.pendingDawayirPrompt = buildHybridDawayirTurnPrompt(text, hybridState);
        dispatchPendingHybridDawayirPrompt();
    };

    const forwardDawayirLineToUserAgent = (text) => {
        if (!hybridState.active) return;
        hybridState.expectedSpeaker = 'user_agent';
        const nextTurn = hybridState.userTurnCount + 1;
        hybridState.pendingDawayirOpening = text;
        hybridState.pendingUserAgentTurn = nextTurn;
        hybridState.pendingUserAgentPrompt = buildHybridUserAgentTurnPrompt(
            text,
            hybridState.lang,
            nextTurn,
            hybridState.maxUserTurns,
            hybridState,
        );
        dispatchPendingHybridUserAgentPrompt();
    };

    // ── Completed Turn Handler ───────────────────────────
    const handleHybridCompletedTurn = async (speaker, rawText) => {
        logInfo(`[Hybrid:turn] === ${speaker} turn received (${rawText?.length || 0} chars) ===`);
        if (!hybridState.active) {
            logInfo('[Hybrid:turn] SKIP: hybrid not active'); return;
        }

        let text = cleanHybridTurnText(rawText);
        if (!text) { logInfo('[Hybrid:turn] SKIP: empty text after cleaning'); return; }

        const deduped = deduplicateHybridText(text);
        if (deduped !== text) {
            logInfo(`[Hybrid:turn] Deduped "${text}" → "${deduped}"`);
            text = deduped;
        }
        if (lastHybridTurnBySpeaker[speaker] === text) {
            logInfo(`[Hybrid:turn] SKIP: duplicate text for ${speaker}`); return;
        }
        if (hybridState.expectedSpeaker && hybridState.expectedSpeaker !== speaker) {
            logInfo(`[Hybrid:turn] SKIP: expected=${hybridState.expectedSpeaker} got=${speaker}`); return;
        }

        const quality = assessHybridTurnQuality({ speaker, text, hybridState });
        if (!quality.ok) {
            logInfo(`[Hybrid:quality] ${speaker} FAILED: ${quality.reasons.join(' | ')}`);
            // Strict mode: always try one repair pass for failed turns.
            const didRepair = requestHybridTurnRepair(speaker, text, quality.reasons);
            if (didRepair) {
                logInfo(`[Hybrid:quality] Repair requested for ${speaker} (attempt ${hybridState.repairAttempts[speaker]})`);
                return;
            }

            // If repair is unavailable/exhausted, do not pass the broken text through.
            // Use stage fallback instead (especially critical on final dawayir turn).
            const fallbackText = speaker === 'dawayir'
                ? cleanHybridTurnText(quality.stage?.dawayirFallbackAr || '')
                : cleanHybridTurnText(quality.stage?.userFallbackAr || '');
            if (fallbackText) {
                logInfo(`[Hybrid:quality] ${speaker} using fallback after failed quality: "${fallbackText}"`);
                text = fallbackText;
            } else {
                logInfo(`[Hybrid:turn] SKIP: no repair/fallback available for ${speaker}`);
                return;
            }
        } else {
            logInfo(`[Hybrid:quality] ${speaker} PASSED`);
        }

        lastHybridTurnBySpeaker[speaker] = text;
        hybridState.repairAttempts[speaker] = 0;
        rememberHybridTurn(speaker, text);
        flushBufferedHybridSpeakerPayloads(speaker, text);
        logInfo(`[Hybrid:turn] ${speaker} turn ACCEPTED: "${text.substring(0, 80)}"`);

        if (speaker === 'dawayir') {
            hybridState.pendingDawayirPrompt = '';
            if (hybridState.awaitingFinalDawayirTurn) {
                logInfo('[Hybrid:turn] Final dawayir turn — scheduling conversation stop');
                const readDelayMs = Math.max(3000, Math.min(text.length * 80, 10000));
                setTimeout(() => {
                    stopHybridConversation('completed', {
                        turn: hybridState.userTurnCount,
                        maxTurns: hybridState.maxUserTurns,
                    }).catch((err) => logError('Failed to stop hybrid conversation:', err));
                }, readDelayMs);
                return;
            }
            logInfo('[Hybrid:turn] Forwarding dawayir → user_agent');
            forwardDawayirLineToUserAgent(text);
            return;
        }

        if (speaker !== 'user_agent') return;

        hybridState.userTurnCount += 1;
        hybridState.pendingUserAgentPrompt = '';
        hybridState.pendingUserAgentTurn = 0;
        logInfo(`[Hybrid:turn] user_agent turnCount now ${hybridState.userTurnCount}/${hybridState.maxUserTurns}`);

        if (!hybridState.sessionTopic) {
            const topic = deriveHybridTopic(text);
            if (topic) hybridState.sessionTopic = topic;
        }

        // Emit topic circle using the fixed session topic (fallback to stage label only if missing)
        const currentStage = getHybridStageForSpeaker('user_agent', hybridState);
        const topicLabel = hybridState.sessionTopic || currentStage?.labelAr || '';
        if (currentStage?.labelAr) {
            sendToClient({
                toolCall: {
                    functionCalls: [{
                        name: 'spawn_topic',
                        id: `hybrid_topic_${hybridState.userTurnCount}`,
                        args: { topic: topicLabel, weight: 0.8 },
                    }],
                },
            });
            logInfo(`[Hybrid:topic] Spawned topic circle: "${topicLabel}" (${currentStage.key})`);
        }

        if (hybridState.userTurnCount >= hybridState.maxUserTurns) {
            hybridState.awaitingFinalDawayirTurn = true;
            logInfo('[Hybrid:turn] Awaiting final dawayir turn');
        }
        sendHybridStatus('running', {
            speaker: 'dawayir',
            turn: hybridState.userTurnCount,
            maxTurns: hybridState.maxUserTurns,
        });
        logInfo('[Hybrid:turn] Forwarding user_agent → dawayir');
        forwardUserAgentLineToDawayir(text);
    };

    // ── User-Agent Session ───────────────────────────────
    const closeUserAgentSession = async () => {
        userAgentReady = false;
        if (!userAgentSession) {
            if (resolveUserAgentReady) { resolveUserAgentReady(false); resolveUserAgentReady = null; }
            userAgentReadyPromise = null;
            return;
        }
        const sessionToClose = userAgentSession;
        userAgentSession = null;
        try {
            await sessionToClose.close();
        } catch (error) {
            logError('Error closing hybrid user-agent live session:', error);
        } finally {
            if (resolveUserAgentReady) { resolveUserAgentReady(false); resolveUserAgentReady = null; }
            userAgentReadyPromise = null;
        }
    };

    const ensureUserAgentSession = async (lang = 'ar') => {
        if (userAgentSession && userAgentReady && userAgentLang === lang) return true;
        if (userAgentReadyPromise) return userAgentReadyPromise;
        if (userAgentSession && userAgentLang !== lang) await closeUserAgentSession();

        userAgentConnecting = true;
        userAgentReady = false;
        userAgentLang = lang === 'en' ? 'en' : 'ar';
        userAgentReadyPromise = new Promise((resolve) => { resolveUserAgentReady = resolve; });

        try {
            const liveSession = await ai.live.connect({
                model: pickLiveModel(),
                config: {
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: LIVE_USER_AGENT_VOICE },
                        },
                    },
                    responseModalities: ['AUDIO'],
                    maxOutputTokens: HYBRID_USER_AGENT_MAX_OUTPUT_TOKENS,
                    thinkingConfig: { thinkingBudget: 0 },
                    systemInstruction: buildHybridUserAgentInstruction(userAgentLang),
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => logInfo(`Hybrid user-agent session connected (${activeLiveModel})`),
                    onmessage: (message) => {
                        const payload = JSON.parse(JSON.stringify(message ?? {}));

                        if (payload.setupComplete || payload.setup_complete) {
                            userAgentReady = true;
                            if (resolveUserAgentReady) { resolveUserAgentReady(true); resolveUserAgentReady = null; }
                            sendHybridStatus('ready', { maxTurns: hybridState.maxUserTurns });
                            dispatchPendingHybridUserAgentPrompt();
                            return;
                        }

                        const serverContent = payload.serverContent || payload.server_content;
                        const outTx = serverContent?.outputTranscription || serverContent?.output_transcription;
                        if (outTx?.text) {
                            if (!hybridState.active) {
                                sendDebugTranscription({ type: 'output', text: outTx.text, finished: outTx.finished, speaker: 'user_agent' });
                            }
                            userAgentHybridTurnBuffer = `${userAgentHybridTurnBuffer} ${outTx.text}`.trim();
                            if (userAgentSilenceTimer) { clearTimeout(userAgentSilenceTimer); userAgentSilenceTimer = null; }
                            if (userAgentGraceTimer) { clearTimeout(userAgentGraceTimer); userAgentGraceTimer = null; }
                            if (outTx.finished) {
                                const completedText = userAgentHybridTurnBuffer;
                                userAgentHybridTurnBuffer = '';
                                void handleHybridCompletedTurn('user_agent', completedText);
                            } else {
                                userAgentSilenceTimer = setTimeout(() => {
                                    userAgentSilenceTimer = null;
                                    const buffered = userAgentHybridTurnBuffer.trim();
                                    if (buffered) {
                                        userAgentHybridTurnBuffer = '';
                                        void handleHybridCompletedTurn('user_agent', buffered);
                                    }
                                }, 1200);
                            }
                        }

                        const uaGenerationComplete = Boolean(serverContent?.generationComplete || serverContent?.generation_complete);
                        const uaTurnComplete = Boolean(serverContent?.turnComplete || serverContent?.turn_complete);

                        if (uaGenerationComplete && userAgentHybridTurnBuffer.trim()) {
                            if (userAgentSilenceTimer) { clearTimeout(userAgentSilenceTimer); userAgentSilenceTimer = null; }
                            if (userAgentGraceTimer) clearTimeout(userAgentGraceTimer);
                            userAgentGraceTimer = setTimeout(() => {
                                userAgentGraceTimer = null;
                                const buffered = userAgentHybridTurnBuffer.trim();
                                if (buffered) { userAgentHybridTurnBuffer = ''; void handleHybridCompletedTurn('user_agent', buffered); }
                            }, 350);
                        }

                        if (uaTurnComplete && userAgentHybridTurnBuffer.trim()) {
                            if (userAgentSilenceTimer) { clearTimeout(userAgentSilenceTimer); userAgentSilenceTimer = null; }
                            if (userAgentGraceTimer) { clearTimeout(userAgentGraceTimer); userAgentGraceTimer = null; }
                            const completedText = userAgentHybridTurnBuffer;
                            userAgentHybridTurnBuffer = '';
                            void handleHybridCompletedTurn('user_agent', completedText);
                        }

                        sendOrBufferHybridSpeakerPayload('user_agent', { ...payload, speaker: 'user_agent' });
                    },
                    onerror: (error) => logError('Hybrid user-agent live session error:', error),
                    onclose: () => {
                        userAgentSession = null;
                        userAgentReady = false;
                        if (resolveUserAgentReady) { resolveUserAgentReady(false); resolveUserAgentReady = null; }
                        userAgentReadyPromise = null;
                        if (hybridState.active) {
                            sendHybridStatus('recovering', {
                                message: hybridState.lang === 'ar'
                                    ? 'وكيل المستخدم وقع لحظة، وبنرجّعه دلوقتي.'
                                    : 'The live user agent dropped for a moment and is recovering now.',
                            });
                            void ensureUserAgentSession(hybridState.lang).then((ready) => {
                                if (!ready && hybridState.active) {
                                    void stopHybridConversation('failed', {
                                        message: hybridState.lang === 'ar'
                                            ? 'جلسة وكيل المستخدم الحي وقفت قبل ما الديمو يكمّل.'
                                            : 'The live user-agent session dropped before the demo could finish.',
                                    });
                                }
                            });
                        }
                    },
                },
            });

            userAgentSession = liveSession;
            return userAgentReadyPromise;
        } catch (error) {
            logError('Failed to initialize hybrid user-agent session:', error);
            if (resolveUserAgentReady) { resolveUserAgentReady(false); resolveUserAgentReady = null; }
            userAgentReadyPromise = null;
            return false;
        } finally {
            userAgentConnecting = false;
        }
    };

    // ── Stop ─────────────────────────────────────────────
    const stopHybridConversation = async (state = 'stopped', extra = {}) => {
        const wasActive = hybridState.active || userAgentSession || userAgentConnecting;
        const completionData = {
            ...extra,
            turns: hybridState.userTurnCount,
            maxTurns: hybridState.maxUserTurns,
            history: hybridState.history,
        };
        hybridState = buildInitialHybridState();
        resetHybridBuffers();
        await closeUserAgentSession();
        if (wasActive) {
            logInfo(`[Hybrid] Session ${state}: turns=${completionData.turns}/${completionData.maxTurns}`);
            sendHybridStatus(state, completionData);
        }
    };

    // ── processHybridControl ─────────────────────────────
    const processHybridControl = async (hybridControl) => {
        const action = String(hybridControl?.action || '').toLowerCase();
        if (action === 'stop') { await stopHybridConversation('stopped'); return; }
        if (action !== 'start') return;

        const session = getDawayirSession();
        if (!session) {
            sendHybridStatus('failed', { message: 'Primary Dawayir session is not ready yet.' });
            return;
        }

        if (hybridState.active) await stopHybridConversation('stopped');

        const lang = hybridControl?.lang === 'en' ? 'en' : 'ar';
        const requestedTurns = Number(hybridControl?.maxTurns);
        const maxUserTurns = Number.isFinite(requestedTurns)
            ? Math.max(2, Math.min(8, Math.round(requestedTurns)))
            : HYBRID_MAX_USER_TURNS;

        hybridState = {
            ...buildInitialHybridState(),
            active: true,
            lang,
            maxUserTurns,
            expectedSpeaker: 'dawayir',
        };
        resetHybridBuffers();
        sendHybridStatus('starting', { maxTurns: maxUserTurns });

        const ready = await ensureUserAgentSession(lang);
        if (!ready && hybridState.active) {
            await stopHybridConversation('failed', {
                message: lang === 'ar' ? 'تعذر فتح جلسة وكيل المستخدم الحي.' : 'Failed to open the live user-agent session.',
            });
            return;
        }

        if (hybridState.active) {
            sendHybridStatus('waiting_opening', { maxTurns: hybridState.maxUserTurns });
        }
    };

    // ── Dawayir audio → hybrid turn buffer ───────────────
    const onDawayirTranscript = (text, finished) => {
        if (!hybridState.active) return false; // not in hybrid mode

        dawayirHybridTurnBuffer = `${dawayirHybridTurnBuffer} ${text}`.trim();
        if (dawayirSilenceTimer) { clearTimeout(dawayirSilenceTimer); dawayirSilenceTimer = null; }
        if (dawayirGraceTimer) { clearTimeout(dawayirGraceTimer); dawayirGraceTimer = null; }

        if (finished) {
            const completedText = dawayirHybridTurnBuffer;
            dawayirHybridTurnBuffer = '';
            void handleHybridCompletedTurn('dawayir', completedText);
        } else {
            dawayirSilenceTimer = setTimeout(() => {
                dawayirSilenceTimer = null;
                const buffered = dawayirHybridTurnBuffer.trim();
                if (buffered) {
                    dawayirHybridTurnBuffer = '';
                    void handleHybridCompletedTurn('dawayir', buffered);
                }
            }, 1200);
        }
        return true;
    };

    const onDawayirGenerationComplete = () => {
        // Block any further audio after first generationComplete to prevent
        // duplicates caused by Gemini re-streaming after tool call responses.
        dawayirAudioDone = true;
        logInfo('[Hybrid] dawayirAudioDone=true (generationComplete received)');
        if (!hybridState.active || !dawayirHybridTurnBuffer.trim()) return;
        if (dawayirSilenceTimer) { clearTimeout(dawayirSilenceTimer); dawayirSilenceTimer = null; }
        if (dawayirGraceTimer) clearTimeout(dawayirGraceTimer);
        dawayirGraceTimer = setTimeout(() => {
            dawayirGraceTimer = null;
            const buffered = dawayirHybridTurnBuffer.trim();
            if (buffered) { dawayirHybridTurnBuffer = ''; void handleHybridCompletedTurn('dawayir', buffered); }
        }, 350);
    };

    const onDawayirTurnComplete = () => {
        // Reset audio-done flag for next turn
        dawayirAudioDone = false;
        if (!hybridState.active || !dawayirHybridTurnBuffer.trim()) return;
        if (dawayirSilenceTimer) { clearTimeout(dawayirSilenceTimer); dawayirSilenceTimer = null; }
        if (dawayirGraceTimer) { clearTimeout(dawayirGraceTimer); dawayirGraceTimer = null; }
        const completedText = dawayirHybridTurnBuffer;
        dawayirHybridTurnBuffer = '';
        void handleHybridCompletedTurn('dawayir', completedText);
    };

    // ── Recovery: dispatch pending dawayir prompt ─────────
    const onDawayirSessionRecovered = () => {
        if (hybridState.active) dispatchPendingHybridDawayirPrompt();
    };

    // ── Tool call: suppress duplicate audio ──────────────
    // After Gemini makes a tool call and we respond, Gemini re-streams the same
    // audio it already sent before the tool call. Setting dawayirAudioDone here
    // blocks that duplicate audio before it reaches the client.
    const onDawayirToolCall = () => {
        if (!hybridState.active) return;
        dawayirAudioDone = true;
        logInfo('[Hybrid] dawayirAudioDone=true (tool call received — blocking post-tool-response audio)');
    };

    // ── Public API ───────────────────────────────────────
    return {
        getHybridState: () => hybridState,
        isHybridActive: () => hybridState.active,
        getUserAgentSession: () => userAgentSession,
        getUserAgentReady: () => userAgentReady,
        processHybridControl,
        closeUserAgentSession,
        stopHybridConversation,
        sendOrBufferHybridSpeakerPayload,
        tagSpeaker,
        onDawayirTranscript,
        onDawayirGenerationComplete,
        onDawayirTurnComplete,
        onDawayirSessionRecovered,
        onDawayirToolCall,
    };
};

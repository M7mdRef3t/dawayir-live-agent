/**
 * ⚠️  REFERENCE ARCHIVE — NOT THE LIVE HANDLER  ⚠️
 *
 * This file is an early extraction of the tool-call logic from App.jsx.
 * The refactoring was never completed. The LIVE, authoritative handler is the
 * `handleToolCall` useCallback defined inside App.jsx (~line 1668).
 *
 * App.jsx's version has:
 *   - More Arabic name mappings (e.g. 'أنت', 'الواقع', etc.)
 *   - Better legacy weight/radius backward-compat
 *   - Full useCallback dependency tracking
 *
 * DO NOT import `processToolCalls` from this file. Use the inline handler or
 * refactor App.jsx to import from here if you want to finish the extraction.
 */
import { triggerHaptic, HAPTIC_PATTERNS } from '../../utils/haptics';
import { playTransitionSound, playInsightSound } from './soundDesign';
import CircleFirstShiftTooltip from '../../components/CircleFirstShiftTooltip';

/**
 * processToolCalls — processes Gemini tool calls and dispatches to canvas/state.
 *
 * This is the core tool-call dispatch logic, extracted from App.jsx for readability.
 * It's a plain function (not a hook) that receives all needed refs/setters as `ctx`.
 *
 * @param {Object} toolCall - The tool call message from Gemini
 * @param {Object} ctx      - All needed references and callbacks
 */
export function processToolCalls(toolCall, ctx) {
  const {
    canvasRef, wsRef, lang, transcript,
    cognitiveMetrics, sessionReplayRef,
    dominantNodeRef, journeyPathRef,
    circleIntroShownRef, prevInsightRadiusRef,
    userSpeechActiveRef, transitionToastTimer,
    NODE_LABELS, TRANSITION_MESSAGES,
    // State setters
    setDominantColor, setJourneyPath, setTransitionCount,
    setTransitionToast, setShowCircleIntro, setJourneyStage,
    setToolCallsCount, setLastEvent,
    // Callbacks
    announce, buildWhyNowPayload, captureReplayStep,
    pushWhyNowLine, unlockAchievement, getCircleAnnouncement,
  } = ctx;

  const functionCalls = Array.isArray(toolCall?.functionCalls)
    ? toolCall.functionCalls
    : Array.isArray(toolCall?.function_calls)
      ? toolCall.function_calls
      : [];
  if (functionCalls.length === 0) return;

  const responses = [];

  for (const call of functionCalls) {
    let args = call?.args ?? {};
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch { args = {}; }
    }

    try {
      if (call.name === 'update_node') {
        const NAME_TO_ID = {
          awareness: 1, science: 2, truth: 3, knowledge: 2, circle: 1,
          '\u0648\u0639\u064a': 1, '\u0639\u0644\u0645': 2, '\u062d\u0642\u064a\u0642\u0629': 3,
          '\u0627\u0644\u0648\u0639\u064a': 1, '\u0627\u0644\u0639\u0644\u0645': 2, '\u0627\u0644\u062d\u0642\u064a\u0642\u0629': 3,
          '1': 1, '2': 2, '3': 3,
        };
        const rawId = args.id ?? args.node_id ?? args.nodeId ?? 1;
        const resolvedId = NAME_TO_ID[String(rawId).toLowerCase()] ?? Number(rawId);
        const id = Number.isFinite(resolvedId) ? resolvedId : 1;
        const currentNodes = canvasRef.current?.getNodes() || [];
        const safeId = currentNodes.some(n => n.id === id) ? id : 1;

        const updates = { ...args };
        delete updates.id; delete updates.node_id; delete updates.nodeId;

        if (updates.radius !== undefined) {
          const raw = updates.radius;
          const numericDelta = parseFloat(String(raw));
          if (String(raw).startsWith('+') || String(raw).startsWith('-')) {
            const currentRadius = Number(currentNodes.find(n => n.id === safeId)?.radius ?? 60);
            const nextRadius = Math.max(30, Math.min(100, Math.round(currentRadius + (numericDelta * 5))));
            updates.radius = String(nextRadius);
          }
        }
        if (updates.color === undefined && typeof updates.colour === 'string') {
          updates.color = updates.colour;
        }
        delete updates.weight; delete updates.size; delete updates.expansion; delete updates.colour;

        console.log(`[App] Updating node ${safeId} (raw: ${rawId}):`, updates);
        canvasRef.current?.updateNode(safeId, updates);
        canvasRef.current?.pulseNode(safeId);
        announce(getCircleAnnouncement(lang, NODE_LABELS[lang]?.[safeId]));

        const whyNowPayload = buildWhyNowPayload({ callId: call.id, callName: call.name, args, nodeId: safeId });
        pushWhyNowLine(whyNowPayload);

        if (!circleIntroShownRef.current && !CircleFirstShiftTooltip.hasSeen()) {
          circleIntroShownRef.current = true;
          setShowCircleIntro(true);
        }

        captureReplayStep('update', {
          focusId: safeId,
          reason: whyNowPayload.text,
          source: args?.source || (String(call.id || '').startsWith('sentiment_') ? 'bio_signal' : 'agent'),
          policy: args?.policy || 'IDLE',
          metric: args?.metric || 'turn',
        });

        // Satellite node spawn
        const topicRaw = args.topic ?? args.reason ?? args.label ?? args.note ?? '';
        if (topicRaw && typeof topicRaw === 'string' && topicRaw.trim().length > 1) {
          const topic = topicRaw.trim().split(/\s+/)[0].slice(0, 8);
          canvasRef.current?.addSatellite?.(safeId, topic);
        } else {
          let lastUserMsg = '';
          for (let index = transcript.length - 1; index >= 0; index -= 1) {
            if (transcript[index]?.role === 'user') {
              lastUserMsg = transcript[index]?.text || '';
              break;
            }
          }
          if (lastUserMsg.length > 3) {
            const words = lastUserMsg.split(/\s+/).filter(w => w.length > 3);
            if (words.length > 0) {
              const word = words[Math.floor(Math.random() * Math.min(3, words.length))];
              canvasRef.current?.addSatellite?.(safeId, word.slice(0, 7));
            }
          }
        }

        // Cognitive transition detection
        const allNodes = canvasRef.current?.getNodes?.() || [];
        if (allNodes.length > 0) {
          const dom = allNodes.reduce((a, b) => (a.radius > b.radius ? a : b));
          if (dom.color) setDominantColor(dom.color);
          if (dom.id !== dominantNodeRef.current) {
            const prevId = dominantNodeRef.current;
            dominantNodeRef.current = dom.id;
            if (journeyPathRef.current[journeyPathRef.current.length - 1] !== dom.id) {
              journeyPathRef.current = [...journeyPathRef.current, dom.id];
              setJourneyPath([...journeyPathRef.current]);
              setTransitionCount(c => c + 1);
              playTransitionSound(prevId, dom.id);
            }
            const msgKey = `${prevId}\u2192${dom.id}`;
            const msgs = TRANSITION_MESSAGES[lang] || TRANSITION_MESSAGES.en;
            const msg = msgs[msgKey];
            if (msg) {
              setTransitionToast(msg);
              clearTimeout(transitionToastTimer.current);
              transitionToastTimer.current = setTimeout(() => setTransitionToast(null), 4000);
              canvasRef.current?.triggerBloom?.();
            }
          }
        }

        // Insight detector
        if (safeId === 3 && updates.radius !== undefined) {
          const prevR = prevInsightRadiusRef.current ?? 80;
          const newR = Number(updates.radius);
          if (newR - prevR > 15 && userSpeechActiveRef.current) {
            const insightMsg = lang === 'ar'
              ? '\u2728 \u0644\u062d\u0638\u0629 \u0648\u0636\u0648\u062d \u0631\u064f\u0635\u062f\u062a! \u0639\u0642\u0644\u0643 \u062a\u0648\u0635\u0651\u0644 \u0644\u0634\u064a\u0621 \u0645\u0647\u0645'
              : '\u2728 Insight moment detected! Your mind reached clarity';
            setTransitionToast(insightMsg);
            clearTimeout(transitionToastTimer.current);
            transitionToastTimer.current = setTimeout(() => setTransitionToast(null), 5000);
            canvasRef.current?.triggerBloom?.();
            playInsightSound();
            unlockAchievement('truthShift');
          }
          prevInsightRadiusRef.current = newR;
        }

        triggerHaptic(HAPTIC_PATTERNS.circleShift);
        if (safeId === 1) unlockAchievement('awarenessShift');
        else if (safeId === 2) unlockAchievement('knowledgeShift');
        else if (safeId === 3) unlockAchievement('truthShift');
        if (updates.color) unlockAchievement('sentimentShift');
        const callId = String(call.id || '');
        if (callId.startsWith('server_cmd_')) unlockAchievement('voiceCommand');

        // Circle state analyzer
        {
          const stateNodes = canvasRef.current?.getNodes?.() || [];
          const n1 = stateNodes.find(n => n.id === 1)?.radius ?? 50;
          const n2 = stateNodes.find(n => n.id === 2)?.radius ?? 50;
          const n3 = stateNodes.find(n => n.id === 3)?.radius ?? 50;
          const socket = wsRef.current;
          const canSend = socket && socket.readyState === WebSocket.OPEN;
          let metaText = null;

          if (n1 > 65 && n3 < 45) {
            metaText = lang === 'ar'
              ? '(\u0625\u0634\u0627\u0631\u0629 \u062f\u0627\u062e\u0644\u064a\u0629: \u0648\u0639\u064a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0631\u062a\u0641\u0639 \u0648\u0627\u0644\u0648\u0627\u0642\u0639 \u0645\u0646\u062e\u0641\u0636 \u2014 \u0641\u064a \u062f\u0648\u0631\u0643 \u0627\u0644\u0642\u0627\u062f\u0645 \u0627\u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0648\u0627\u0642\u0639 \u0627\u0644\u0641\u0639\u0644\u064a \u0628\u062c\u0645\u0644\u0629 \u0648\u0627\u062d\u062f\u0629 \u0644\u0637\u064a\u0641\u0629. \u0644\u0627 \u062a\u0634\u0631\u062d \u0648\u0644\u0627 \u062a\u062d\u0644\u0644.)'
              : '(Internal signal: User awareness is high, reality is low. Next turn: ask one gentle question about what is actually happening.)';
          } else if (n2 > 65 && n1 < 45) {
            metaText = lang === 'ar'
              ? '(\u0625\u0634\u0627\u0631\u0629 \u062f\u0627\u062e\u0644\u064a\u0629: \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0645\u0631\u062a\u0641\u0639\u0629 \u0648\u0627\u0644\u0648\u0639\u064a \u0627\u0644\u062f\u0627\u062e\u0644\u064a \u0645\u0646\u062e\u0641\u0636 \u2014 \u0641\u064a \u062f\u0648\u0631\u0643 \u0627\u0644\u0642\u0627\u062f\u0645 \u0627\u0633\u0623\u0644 \u0639\u0646 \u0627\u0644\u0625\u062d\u0633\u0627\u0633 \u0627\u0644\u062c\u0648\u0627\u0646\u064a \u0628\u062c\u0645\u0644\u0629 \u0648\u0627\u062d\u062f\u0629. \u0644\u0627 \u062a\u0639\u0637\u064a \u0645\u0639\u0644\u0648\u0645\u0627\u062a.)'
              : '(Internal signal: Knowledge is high, awareness is low. Next turn: ask one question about their inner feeling, nothing else.)';
          } else if (n3 > 65 && n1 < 45) {
            metaText = lang === 'ar'
              ? '(\u0625\u0634\u0627\u0631\u0629 \u062f\u0627\u062e\u0644\u064a\u0629: \u0627\u0644\u0648\u0627\u0642\u0639 \u0648\u0627\u0636\u062d \u0648\u0627\u0644\u0648\u0639\u064a \u0627\u0644\u0630\u0627\u062a\u064a \u0645\u0646\u062e\u0641\u0636 \u2014 \u0641\u064a \u062f\u0648\u0631\u0643 \u0627\u0644\u0642\u0627\u062f\u0645 \u0627\u0633\u0623\u0644 \u0639\u0646 \u062f\u0648\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u064a \u062a\u0634\u0643\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0648\u0627\u0642\u0639.)'
              : '(Internal signal: Reality is clear but self-awareness is low. Next turn: ask about their role in shaping this reality.)';
          } else if (n1 > 55 && n2 > 55 && n3 > 55) {
            metaText = lang === 'ar'
              ? '(\u0625\u0634\u0627\u0631\u0629 \u062f\u0627\u062e\u0644\u064a\u0629: \u0627\u0644\u062b\u0644\u0627\u062b\u0629 \u062f\u0648\u0627\u0626\u0631 \u0645\u0631\u062a\u0641\u0639\u0629 \u2014 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0642\u0631\u064a\u0628 \u0645\u0646 \u0627\u0644\u0648\u0636\u0648\u062d. \u0627\u0633\u0623\u0644 \u0633\u0624\u0627\u0644 \u0627\u0644\u0625\u0645\u0643\u0627\u0646: \u0644\u0648 \u062d\u0635\u0644 \u062a\u063a\u064a\u064a\u0631 \u0648\u0627\u062d\u062f \u0635\u063a\u064a\u0631 \u062f\u0644\u0648\u0642\u062a\u064a \u2014 \u0625\u064a\u0647 \u062f\u0647\u061f)'
              : '(Internal signal: All three circles are high \u2014 user is near clarity. Ask the possibility question: if one small thing changed right now, what would it be?)';
          } else if (n1 < 42 && n2 < 42 && n3 < 42) {
            metaText = lang === 'ar'
              ? '(\u0625\u0634\u0627\u0631\u0629 \u062f\u0627\u062e\u0644\u064a\u0629: \u0627\u0644\u062b\u0644\u0627\u062b\u0629 \u062f\u0648\u0627\u0626\u0631 \u0645\u0646\u062e\u0641\u0636\u0629 \u2014 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0631\u0628\u0645\u0627 \u064a\u062a\u062c\u0646\u0628 \u0634\u064a\u0626\u0627\u064b. \u0627\u0641\u062a\u062d \u0628\u0627\u0628 \u0627\u0644\u0627\u0639\u062a\u0631\u0627\u0641 \u0628\u0644\u0637\u0641 \u0634\u062f\u064a\u062f. \u062c\u0645\u0644\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u0642\u0637.)'
              : '(Internal signal: All circles are low \u2014 possible avoidance. Gently open the door to acknowledgment. One sentence only.)';
          }

          if (metaText && canSend) {
            setTimeout(() => {
              const s = wsRef.current;
              if (s && s.readyState === WebSocket.OPEN) {
                s.send(JSON.stringify({
                  clientContent: {
                    turns: [{ role: 'user', parts: [{ text: metaText }] }],
                    turnComplete: false,
                  },
                }));
              }
            }, 800);
          }
        }

      } else if (call.name === 'highlight_node') {
        const id = Number(args.id);
        const currentNodes = canvasRef.current?.getNodes() || [];
        if (!Number.isFinite(id) || !currentNodes.some(n => n.id === id)) {
          throw new Error(`Invalid or non-existent node id: ${args.id}`);
        }
        console.log(`[App] Highlighting node ${id}`);
        canvasRef.current?.pulseNode(id);
        const whyNowPayload = buildWhyNowPayload({ callId: call.id, callName: call.name, args, nodeId: id });
        pushWhyNowLine(whyNowPayload);
        if (!circleIntroShownRef.current && !CircleFirstShiftTooltip.hasSeen()) {
          circleIntroShownRef.current = true;
          setShowCircleIntro(true);
        }
        captureReplayStep('highlight', {
          focusId: id, reason: whyNowPayload.text,
          source: args?.source || 'agent', policy: args?.policy || 'IDLE', metric: args?.metric || 'turn',
        });

      } else if (call.name === 'spawn_other') {
        const otherName = String(args.name || '').slice(0, 8);
        if (!otherName.trim()) {
          console.warn('[spawn_other] Empty name, skipping');
          continue;
        }
        const otherTension = Math.max(0, Math.min(1, Number(args.tension) || 0.5));
        const otherColor = String(args.color || '#FFD700');
        console.log(`[App] Spawning other: ${otherName}, tension=${otherTension}`);
        canvasRef.current?.setOtherNode?.(otherName, otherTension, otherColor);

      } else if (call.name === 'spawn_topic') {
        const topicName = String(args.topic || '').slice(0, 8);
        if (!topicName.trim()) {
          console.warn('[spawn_topic] Empty topic, skipping');
          continue;
        }
        const topicWeight = Math.max(0.3, Math.min(1, Number(args.weight) || 0.5));
        const topicColor = String(args.color || '#7B68EE'); // default: medium slate blue
        console.log(`[App] Spawning topic: ${topicName}, weight=${topicWeight}`);
        // Use addTopicNode for persistent, independent topic circles (not temporary satellites)
        canvasRef.current?.addTopicNode?.(topicName, topicWeight, topicColor);
        triggerHaptic(HAPTIC_PATTERNS.circleShift);
        triggerHaptic(HAPTIC_PATTERNS.otherSpawn);

      } else if (call.name === 'update_journey') {
        const STAGE_MAP = { 'overwhelmed': 'Overwhelmed', 'focus': 'Focus', 'clarity': 'Clarity' };
        const stage = args?.stage?.toLowerCase() || 'overwhelmed';
        const resolvedStage = STAGE_MAP[stage] || 'Overwhelmed';
        console.log(`[App] Updating journey stage to: ${resolvedStage}`);
        setJourneyStage(resolvedStage);

      } else if (call.name === 'save_mental_map') {
        const nodes = canvasRef.current?.getNodes() || [];
        console.log(`[App] Saving mental map with ${nodes.length} nodes`);
        captureReplayStep('save', {
          reason: lang === 'ar' ? '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0630\u0647\u0646\u064a\u0629.' : 'Mental map saved.',
          source: 'system', policy: 'IDLE', metric: 'turn',
        });
        responses.push({
          id: call.id, name: call.name,
          response: { nodes, replayTrace: sessionReplayRef.current, metrics: cognitiveMetrics, ok: true },
        });
        continue;

      } else if (call.name === 'generate_session_report') {
        const { summary, insights, recommendations } = args;
        console.log(`[App] Generating session report:`, { summary, insights });
        responses.push({
          id: call.id, name: call.name,
          response: { ok: true, summary, insights, recommendations, timestamp: new Date().toISOString() },
        });
        continue;

      } else if (call.name === 'get_expert_insight') {
        console.log(`[App] Tool ${call.name} handled server-side, skipping client handler`);
        continue;

      } else {
        throw new Error(`Unsupported tool: ${call.name}`);
      }

      responses.push({ id: call.id, name: call.name, response: { ok: true } });
    } catch (error) {
      console.error(`[App] Tool error (${call.name}):`, error);
      responses.push({ id: call.id, name: call.name, response: { ok: false, error: error.message } });
    }
  }

  // Send toolResponse back for Gemini-originated calls only
  const geminiResponses = responses.filter(r => {
    const id = String(r.id);
    return !id.startsWith('server_cmd_') && !id.startsWith('text_cmd_') &&
           !id.startsWith('client_cmd_') && !id.startsWith('sentiment_') &&
           !id.startsWith('gemini_visual_');
  });
  const socket = wsRef.current;
  if (socket && socket.readyState === WebSocket.OPEN && geminiResponses.length > 0) {
    socket.send(JSON.stringify({ toolResponse: { functionResponses: geminiResponses } }));
  }
  setToolCallsCount((prev) => prev + functionCalls.length);
  setLastEvent(`tool_call:${functionCalls.length}`);
}

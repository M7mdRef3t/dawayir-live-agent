import { useCallback, useRef } from 'react';

/**
 * useSessionReplay — captures circle-state snapshots over time for session replay.
 *
 * @param {Object} opts
 * @param {Object}   opts.canvasRef        - ref to DawayirCanvas (for getNodes)
 * @param {Object}   opts.cognitiveMetrics - current cognitive metrics
 * @param {string}   opts.lang            - current language
 * @param {Object}   opts.NODE_LABELS     - node label lookup
 * @returns hook API
 */
export function useSessionReplay({ canvasRef, cognitiveMetrics, lang, NODE_LABELS }) {
  const sessionReplayRef = useRef([]);
  const sessionReplayStartedAtRef = useRef(0);
  const lastReplaySignatureRef = useRef('');

  const snapshotReplayNodes = useCallback(() => {
    const fallbackLabels = NODE_LABELS[lang] || NODE_LABELS.en;
    const nodes = canvasRef.current?.getNodes?.() || [];
    return nodes
      .map((node) => ({
        id: Number(node.id),
        radius: Math.round(Number(node.radius) || 0),
        color: typeof node.color === 'string' ? node.color : '#38B2D8',
        label: String(node.label || fallbackLabels[String(node.id)] || ''),
      }))
      .filter((node) => Number.isFinite(node.id))
      .sort((a, b) => a.id - b.id);
  }, [lang, canvasRef, NODE_LABELS]);

  const resetSessionReplay = useCallback(() => {
    sessionReplayStartedAtRef.current = Date.now();
    lastReplaySignatureRef.current = '';
    const initialNodes = snapshotReplayNodes();
    sessionReplayRef.current = initialNodes.length > 0 ? [{
      atMs: 0,
      kind: 'start',
      focusId: null,
      reason: lang === 'ar' ? '\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u062c\u0644\u0633\u0629' : 'Session start',
      source: 'system',
      policy: 'IDLE',
      metric: 'turn',
      nodes: initialNodes,
      metrics: { ...cognitiveMetrics },
    }] : [];
  }, [cognitiveMetrics, lang, snapshotReplayNodes]);

  const captureReplayStep = useCallback((kind, payload = {}) => {
    const nodes = snapshotReplayNodes();
    if (nodes.length === 0) return;

    if (!sessionReplayStartedAtRef.current) {
      sessionReplayStartedAtRef.current = Date.now();
    }

    const step = {
      atMs: Math.max(0, Date.now() - sessionReplayStartedAtRef.current),
      kind,
      focusId: Number.isFinite(Number(payload.focusId)) ? Number(payload.focusId) : null,
      reason: typeof payload.reason === 'string' ? payload.reason : '',
      source: typeof payload.source === 'string' ? payload.source : 'agent',
      policy: typeof payload.policy === 'string' ? payload.policy : 'IDLE',
      metric: typeof payload.metric === 'string' ? payload.metric : 'turn',
      nodes,
      metrics: { ...cognitiveMetrics },
    };

    const signature = JSON.stringify({
      kind: step.kind,
      focusId: step.focusId,
      reason: step.reason,
      nodes: step.nodes.map((node) => ({ id: node.id, radius: node.radius, color: node.color })),
    });

    if (lastReplaySignatureRef.current === signature && kind === 'update') {
      return;
    }

    lastReplaySignatureRef.current = signature;
    sessionReplayRef.current = [...sessionReplayRef.current, step].slice(-160);
  }, [cognitiveMetrics, snapshotReplayNodes]);

  return {
    sessionReplayRef,
    sessionReplayStartedAtRef,
    snapshotReplayNodes,
    resetSessionReplay,
    captureReplayStep,
  };
}

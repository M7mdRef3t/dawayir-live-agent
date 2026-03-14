/**
 * FEATURE 8 - COGNITIVE VELOCITY
 *
 * Tracks the rate of cognitive state changes over a rolling window.
 */
import React, { useEffect, useRef, useState } from 'react';

const VELOCITY_STATES = {
  accelerating: { icon: '⚡', ar: 'الوضوح بيزيد بسرعة', en: 'Accelerating to clarity', color: '#FFC800' },
  moving: { icon: '➡️', ar: 'ماشي لقدّام', en: 'Moving forward', color: '#2ECC71' },
  stable: { icon: '🌀', ar: 'بتستوعب بهدوء', en: 'Deep processing', color: '#38B2D8' },
  retreating: { icon: '↩️', ar: 'رجوع بسيط وده طبيعي', en: 'One step back — normal', color: '#9B59B6' },
};

function CognitiveVelocity({ dominantNodeId = 1, dominantRadius = 80, isConnected = false, lang = 'ar' }) {
  const historyRef = useRef([]);
  const [velocityState, setVelocityState] = useState('stable');

  useEffect(() => {
    if (!isConnected) {
      historyRef.current = [];
      setVelocityState('stable');
      return;
    }

    const now = Date.now();
    historyRef.current.push({ time: now, nodeId: dominantNodeId, radius: dominantRadius });
    historyRef.current = historyRef.current.filter((entry) => now - entry.time < 30000);

    if (historyRef.current.length < 3) return;

    const sorted = [...historyRef.current].sort((a, b) => a.time - b.time);
    const oldEntry = sorted[0];
    const newEntry = sorted[sorted.length - 1];

    const nodeChanges = sorted.reduce(
      (count, _, index) => (index > 0 && sorted[index].nodeId !== sorted[index - 1].nodeId ? count + 1 : count),
      0,
    );
    const elapsedMin = (newEntry.time - oldEntry.time) / 60000 || 0.1;
    const changeRate = nodeChanges / elapsedMin;

    const sameNodeEntries = sorted.filter((entry) => entry.nodeId === dominantNodeId);
    let radiusVelocity = 0;
    if (sameNodeEntries.length >= 2) {
      const first = sameNodeEntries[0];
      const last = sameNodeEntries[sameNodeEntries.length - 1];
      const dt = (last.time - first.time) / 1000 || 1;
      radiusVelocity = (last.radius - first.radius) / dt;
    }

    let state;
    if (radiusVelocity > 1.5) state = 'accelerating';
    else if (radiusVelocity < -1.0) state = 'retreating';
    else if (changeRate > 1 || radiusVelocity > 0.3) state = 'moving';
    else state = 'stable';

    if (state !== velocityState) {
      setVelocityState(state);
    }
  }, [dominantNodeId, dominantRadius, isConnected, velocityState]);

  if (!isConnected) return null;

  const state = VELOCITY_STATES[velocityState] || VELOCITY_STATES.stable;

  return (
    <div className="cognitive-velocity-badge" style={{ '--vel-color': state.color }}>
      <span className="vel-icon">{state.icon}</span>
      <span className="vel-label">{lang === 'ar' ? state.ar : state.en}</span>
    </div>
  );
}

export default CognitiveVelocity;

/**
 * FEATURE ⑮ — COGNITIVE VELOCITY
 * "أول تطبيق يقيس سرعة تطور تفكيرك"
 *
 * Tracks the RATE of cognitive state changes, not just the state itself.
 * Uses a rolling 30-second window of node radius changes.
 *
 * ⚡ Accelerating = rapid growth toward clarity
 * ➡️ Moving      = steady progression 
 * 🐢 Stable      = deep processing at this level
 * ↩️ Retreating  = returning to previous state (normal & healthy)
 */
import React, { useEffect, useRef, useState } from 'react';

const VELOCITY_STATES = {
    accelerating: { icon: '⚡', ar: 'تسارع نحو الوضوح', en: 'Accelerating to clarity', color: '#FFC800' },
    moving: { icon: '➡️', ar: 'تقدم مستمر', en: 'Moving forward', color: '#00FF41' },
    stable: { icon: '🌀', ar: 'معالجة عميقة', en: 'Deep processing', color: '#00F5FF' },
    retreating: { icon: '↩️', ar: 'خطوة للوراء — طبيعي', en: 'One step back — normal', color: '#FF00E5' },
};

function CognitiveVelocity({ dominantNodeId = 1, dominantRadius = 80, isConnected = false, lang = 'ar' }) {
    const historyRef = useRef([]); // [{time, nodeId, radius}]
    const [velocityState, setVelocityState] = useState('stable');
    const animRef = useRef(null);

    useEffect(() => {
        if (!isConnected) {
            historyRef.current = [];
            setVelocityState('stable');
            return;
        }

        const now = Date.now();
        historyRef.current.push({ time: now, nodeId: dominantNodeId, radius: dominantRadius });
        // Keep only last 30 seconds
        historyRef.current = historyRef.current.filter(e => now - e.time < 30000);

        if (historyRef.current.length < 3) return; // Not enough data

        const sorted = [...historyRef.current].sort((a, b) => a.time - b.time);
        const oldEntry = sorted[0];
        const newEntry = sorted[sorted.length - 1];

        // Node change velocity (transitions per minute)
        const nodeChanges = sorted.reduce((count, _, i) =>
            i > 0 && sorted[i].nodeId !== sorted[i - 1].nodeId ? count + 1 : count
            , 0);
        const elapsedMin = (newEntry.time - oldEntry.time) / 60000 || 0.1;
        const changeRate = nodeChanges / elapsedMin;

        // Radius velocity (growth rate of dominant circle)
        const sameNodeEntries = sorted.filter(e => e.nodeId === dominantNodeId);
        let radiusVelocity = 0;
        if (sameNodeEntries.length >= 2) {
            const first = sameNodeEntries[0];
            const last = sameNodeEntries[sameNodeEntries.length - 1];
            const dt = (last.time - first.time) / 1000 || 1;
            radiusVelocity = (last.radius - first.radius) / dt; // px/s
        }

        // Classify velocity
        let state;
        if (radiusVelocity > 1.5) {
            state = 'accelerating';
        } else if (radiusVelocity < -1.0) {
            state = 'retreating';
        } else if (changeRate > 1 || radiusVelocity > 0.3) {
            state = 'moving';
        } else {
            state = 'stable';
        }

        if (state !== velocityState) {
            setVelocityState(state);
        }
    }, [dominantNodeId, dominantRadius, isConnected]);

    if (!isConnected) return null;

    const vs = VELOCITY_STATES[velocityState] || VELOCITY_STATES.stable;

    return (
        <div className="cognitive-velocity-badge" style={{ '--vel-color': vs.color }}>
            <span className="vel-icon">{vs.icon}</span>
            <span className="vel-label">{lang === 'ar' ? vs.ar : vs.en}</span>
        </div>
    );
}

export default CognitiveVelocity;

import React, { useMemo } from 'react';

/**
 * A beautiful, animated "Cognitive DNA" or "Mind Map" placeholder
 * for the session report. It creates a dynamic geometric pattern
 * based on the session's metrics or just for visual flair.
 */
const CognitiveMap = ({ color = 'var(--ds-cyan-500)' }) => {
    const points = useMemo(() => {
        const p = [];
        const count = 12;
        const radius = 60;
        const center = 100;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const r = radius * (0.8 + Math.random() * 0.4);
            p.push({
                x: center + Math.cos(angle) * r,
                y: center + Math.sin(angle) * r,
                id: i
            });
        }
        return p;
    }, []);

    return (
        <div className="cognitive-map-container">
            <svg viewBox="0 0 200 200" className="cognitive-map-svg">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Connections */}
                {points.map((p, i) => (
                    points.slice(i + 1, i + 4).map((target, j) => (
                        <line
                            key={`l-${i}-${j}`}
                            x1={p.x} y1={p.y}
                            x2={target.x} y2={target.y}
                            stroke={color}
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                            opacity="0.2"
                        />
                    ))
                ))}

                {/* Outer Orbit */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                {/* Points */}
                {points.map((p) => (
                    <g key={p.id} className="map-node">
                        <circle
                            cx={p.x} cy={p.y}
                            r="3"
                            fill={color}
                            filter="url(#glow)"
                        />
                        <circle
                            cx={p.x} cy={p.y}
                            r="8"
                            fill="transparent"
                            stroke={color}
                            strokeWidth="0.5"
                            opacity="0.3"
                        >
                            <animate attributeName="r" values="8;12;8" dur="3s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                        </circle>
                    </g>
                ))}

                {/* Center Star */}
                <circle cx="100" cy="100" r="15" fill="rgba(255,255,255,0.02)" stroke={color} strokeWidth="1" />
                <path
                    d="M100 80 L105 100 L120 105 L105 110 L100 130 L95 110 L80 105 L95 100 Z"
                    fill={color}
                    opacity="0.8"
                    filter="url(#glow)"
                >
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
                </path>
            </svg>
        </div>
    );
};

export default CognitiveMap;

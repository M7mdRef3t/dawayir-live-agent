/**
 * FEATURE ① — BREATHING REGULATOR
 * "أول تطبيق يتدخل علاجياً حياً أثناء الحوار"
 *
 * Appears automatically when stress/tense tone detected for 3+ seconds.
 * Guides user through one 4-4-6 breath cycle then disappears.
 * Client-side only — no APIs needed.
 */
import React, { useEffect, useRef, useState } from 'react';

const PHASES = [
    { key: 'inhale', dur: 4, ar: 'شهيق', en: 'Inhale' },
    { key: 'hold', dur: 4, ar: 'احتبس', en: 'Hold' },
    { key: 'exhale', dur: 6, ar: 'زفير', en: 'Exhale' },
];

function BreathingGuide({ active, lang = 'ar', onComplete }) {
    const [visible, setVisible] = useState(false);
    const [phase, setPhase] = useState(0);
    const [progress, setProgress] = useState(0); // 0-1
    const rafRef = useRef(null);
    const startRef = useRef(null);
    const phaseRef = useRef(0);
    const cycleCompleteRef = useRef(false);

    useEffect(() => {
        if (active && !visible) {
            setVisible(true);
            setPhase(0);
            setProgress(0);
            phaseRef.current = 0;
            cycleCompleteRef.current = false;
            startRef.current = performance.now();
        }
    }, [active]);

    useEffect(() => {
        if (!visible) return;

        const animate = (now) => {
            if (!startRef.current) startRef.current = now;
            const elapsed = (now - startRef.current) / 1000; // seconds
            const currentPhase = PHASES[phaseRef.current];
            const prog = Math.min(elapsed / currentPhase.dur, 1);
            setProgress(prog);

            if (prog >= 1) {
                if (phaseRef.current < PHASES.length - 1) {
                    phaseRef.current += 1;
                    setPhase(phaseRef.current);
                    startRef.current = now;
                } else {
                    // One full cycle complete — fade out
                    setVisible(false);
                    onComplete?.();
                    return;
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [visible]);

    if (!visible) return null;

    const currentPhase = PHASES[phase];
    const circumference = 2 * Math.PI * 44;
    const strokeDash = circumference * progress;

    // Color per phase
    const colors = { inhale: '#00F5FF', hold: '#FFC800', exhale: '#00FF41' };
    const color = colors[currentPhase.key];

    return (
        <div className="breathing-guide-overlay">
            <div className="breathing-guide-card">
                <p className="breathing-guide-hint">
                    {lang === 'ar' ? '🌿 لحظة...' : '🌿 One moment...'}
                </p>

                {/* Animated circle */}
                <div className="breathing-circle-wrap">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        {/* Track */}
                        <circle cx="50" cy="50" r="44" fill="none"
                            stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        {/* Progress arc */}
                        <circle cx="50" cy="50" r="44" fill="none"
                            stroke={color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset="0"
                            transform="rotate(-90 50 50)"
                            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke 0.5s ease' }}
                        />
                        {/* Center dot */}
                        <circle cx="50" cy="50" r="8" fill={color} opacity="0.7"
                            style={{
                                transform: `scale(${0.8 + progress * 0.5})`,
                                transformOrigin: '50px 50px',
                                transition: 'transform 0.1s ease',
                            }}
                        />
                    </svg>
                </div>

                <p className="breathing-phase-label" style={{ color }}>
                    {lang === 'ar' ? currentPhase.ar : currentPhase.en}
                </p>
                <p className="breathing-phase-seconds">
                    {currentPhase.dur}{lang === 'ar' ? ' ث' : 's'}
                </p>
            </div>
        </div>
    );
}

export default BreathingGuide;

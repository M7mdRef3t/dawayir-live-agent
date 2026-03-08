/**
 * FEATURE ② — SACRED PAUSE
 * "الأول في العالم يعطي معنى للصمت"
 *
 * When user is silent for 5+ seconds during a live session,
 * a gentle overlay appears that says "الصمت جزء من الرحلة"
 * and shows the circles breathing slowly.
 */
import React, { useEffect, useRef, useState } from 'react';

function SacredPause({ tone, isConnected, lang = 'ar', isAgentSpeaking = false, onPauseTriggered }) {
    const [visible, setVisible] = useState(false);
    const silenceStartRef = useRef(null);
    const timerRef = useRef(null);
    const hasTriggeredRef = useRef(false);
    const SILENCE_THRESHOLD_MS = 5000; // 5 seconds

    useEffect(() => {
        if (!isConnected) {
            setVisible(false);
            silenceStartRef.current = null;
            return;
        }

        if (tone === 'silent' && !isAgentSpeaking) {
            if (!silenceStartRef.current) {
                silenceStartRef.current = Date.now();
                hasTriggeredRef.current = false;
            }
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                if (silenceStartRef.current && !isAgentSpeaking) {
                    setVisible(true);
                    if (onPauseTriggered && !hasTriggeredRef.current) {
                        hasTriggeredRef.current = true;
                        onPauseTriggered();
                    }
                }
            }, SILENCE_THRESHOLD_MS);
        } else {
            // User spoke or agent is speaking — dismiss
            silenceStartRef.current = null;
            hasTriggeredRef.current = false;
            clearTimeout(timerRef.current);
            if (visible) {
                setVisible(false);
            }
        }

        return () => clearTimeout(timerRef.current);
    }, [tone, isConnected, isAgentSpeaking]); // intentionally omitted visible/onPauseTriggered to prevent loop

    if (!visible) return null;

    return (
        <div className="sacred-pause-overlay">
            <div className="sacred-pause-card">
                {/* Three gently pulsing orbs */}
                <div className="sacred-orbs">
                    <div className="sacred-orb sacred-orb-awareness" />
                    <div className="sacred-orb sacred-orb-knowledge" />
                    <div className="sacred-orb sacred-orb-truth" />
                </div>
                <p className="sacred-pause-main">
                    {lang === 'ar' ? '...' : '...'}
                </p>
                <p className="sacred-pause-sub">
                    {lang === 'ar'
                        ? 'الصمت جزء من الرحلة — خذ وقتك'
                        : 'Silence is part of the journey — take your time'}
                </p>
            </div>
        </div>
    );
}

export default SacredPause;

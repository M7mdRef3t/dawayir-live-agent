/**
 * FEATURE ① — VOICE ACOUSTICS MIRROR
 * "لا أحد يسمع كيف تتكلم — نحن نسمع"
 *
 * Analyzes: pitch variation, energy, speaking rate
 * Displays: real-time voice tone badge (calm / focused / tense / excited)
 * Completely client-side — no extra API needed.
 */
import React, { useEffect, useRef, useState } from 'react';

const TONE_LABELS = {
    ar: {
        calm: 'هادئ 😌',
        focused: 'مركّز 🎯',
        tense: 'متوتر 😰',
        excited: 'متحمس ⚡',
        silent: '...',
    },
    en: {
        calm: 'Calm 😌',
        focused: 'Focused 🎯',
        tense: 'Tense 😰',
        excited: 'Excited ⚡',
        silent: '...',
    },
};

const TONE_COLORS = {
    calm: { bg: 'rgba(0,245,255,0.12)', border: 'rgba(0,245,255,0.4)', glow: '#00F5FF' },
    focused: { bg: 'rgba(0,255,65,0.12)', border: 'rgba(0,255,65,0.4)', glow: '#00FF41' },
    tense: { bg: 'rgba(255,80,50,0.15)', border: 'rgba(255,100,50,0.5)', glow: '#FF5032' },
    excited: { bg: 'rgba(255,200,0,0.12)', border: 'rgba(255,200,0,0.4)', glow: '#FFC800' },
    silent: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', glow: '#ffffff' },
};

// Zero-crossing rate → rough pitch estimation
function estimatePitch(buffer) {
    let crossings = 0;
    for (let i = 1; i < buffer.length; i++) {
        if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) crossings++;
    }
    return crossings / (buffer.length / 44100); // Hz
}

function VoiceToneBadge({ stream, isConnected, lang = 'ar', onToneChange, canvasRef }) {
    const [tone, setTone] = useState('silent');
    const [visible, setVisible] = useState(false);
    const analyserRef = useRef(null);
    const rafRef = useRef(null);
    const audioCtxRef = useRef(null);
    const toneRef = useRef('silent');
    const historyRef = useRef([]);           // Rolling RMS history
    const prevDominantRef = useRef(null);    // For ④ Transition Detection

    useEffect(() => {
        if (!stream || !isConnected) {
            setVisible(false);
            return;
        }

        setVisible(true);
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtxRef.current.createMediaStreamSource(stream);
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;

        const floatBuf = new Float32Array(analyser.fftSize);

        const analyze = () => {
            analyser.getFloatTimeDomainData(floatBuf);

            // RMS Energy
            let sumSq = 0;
            for (let i = 0; i < floatBuf.length; i++) sumSq += floatBuf[i] ** 2;
            const rms = Math.sqrt(sumSq / floatBuf.length);

            // Rolling energy history (last 30 frames)
            historyRef.current.push(rms);
            if (historyRef.current.length > 30) historyRef.current.shift();
            const avgRms = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;

            // Zero-crossing rate (pitch proxy)
            const zcr = estimatePitch(floatBuf);

            // Classify tone
            let newTone = 'silent';
            if (rms < 0.005) {
                newTone = 'silent';
            } else if (rms > 0.15 && zcr > 2000) {
                newTone = 'excited';
            } else if (rms > 0.08 && avgRms > 0.06) {
                newTone = 'tense';
            } else if (rms > 0.02 && zcr < 1000) {
                newTone = 'focused';
            } else if (rms > 0.01) {
                newTone = 'calm';
            }

            if (newTone !== toneRef.current) {
                toneRef.current = newTone;
                setTone(newTone);
                onToneChange?.(newTone);

                // ⑥ Acoustic Mirror — color Visualizer based on tone→node mapping
                // tense/excited → Awareness (cyan), focused → Knowledge (green), calm → Truth (magenta)
                if (canvasRef?.current) {
                    const amp = Math.min(1, rms * 6);
                    canvasRef.current.setVoiceAmplitude?.(amp);
                }
            }

            rafRef.current = requestAnimationFrame(analyze);
        };

        rafRef.current = requestAnimationFrame(analyze);

        return () => {
            cancelAnimationFrame(rafRef.current);
            analyser.disconnect();
            src.disconnect();
            audioCtxRef.current?.close();
            setVisible(false);
        };
    }, [stream, isConnected]);

    if (!visible) return null;

    const labels = TONE_LABELS[lang] || TONE_LABELS.en;
    const colors = TONE_COLORS[tone] || TONE_COLORS.silent;

    return (
        <div
            className="voice-tone-badge"
            style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                boxShadow: `0 0 16px ${colors.glow}33`,
            }}
            title={lang === 'ar' ? 'نبرة صوتك الحالية' : 'Your current voice tone'}
        >
            <span
                className="voice-tone-dot"
                style={{ background: colors.glow, boxShadow: `0 0 8px ${colors.glow}` }}
            />
            <span className="voice-tone-label">{labels[tone]}</span>
        </div>
    );
}

export default VoiceToneBadge;

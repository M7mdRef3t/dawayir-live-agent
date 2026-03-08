/**
 * FEATURE ② — COGNITIVE FINGERPRINT + ⑤ EXPORT AS ART
 * "بصمة عقلك — شكل فريد لهذه اللحظة بالذات"
 * "احفظها كفن — شاركها مع العالم"
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';

function seededRandom(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h ^= h << 13; h ^= h >> 17; h ^= h << 5;
        return (h >>> 0) / 4294967296;
    };
}

function CognitiveFingerprint({ reportContent = '', sessionId = '', lang = 'ar', size = 200, liveState = 'static', voiceTone = 'calm' }) {
    const svgRef = useRef(null);
    const [isShattering, setIsShattering] = useState(false);
    const lastLenRef = useRef(0);

    // ── FEATURE ③: Aha-Moment Shatter Detection ──
    useEffect(() => {
        if (!reportContent) return;

        // Only check new text
        const newText = reportContent.slice(lastLenRef.current).toLowerCase();
        lastLenRef.current = reportContent.length;

        // "Aha" triggers in Arabic and English
        const ahaTriggers = ['فهمت', 'صح', 'بالضبط', 'تصدق', 'أخيرا', 'آها', 'aha', 'eureka', 'exactly', 'makes sense', 'i see', 'now i get it'];
        const triggered = ahaTriggers.some(w => newText.includes(w));

        if (triggered && !isShattering) {
            setIsShattering(true);
            setTimeout(() => {
                setIsShattering(false);
            }, 2200); // Shatter animation duration
        }
    }, [reportContent, isShattering]);

    const seed = sessionId || reportContent.slice(0, 80) || 'default';
    const rand = useMemo(() => seededRandom(seed), [seed]);

    const awarenessWords = ['مشاعر', 'توتر', 'قلق', 'خوف', 'feelings', 'stress', 'anxiety', 'fear', 'emotion', 'feel'];
    const knowledgeWords = ['تفكير', 'تحليل', 'فهم', 'معرفة', 'think', 'analysis', 'understand', 'know', 'reason', 'plan'];
    const truthWords = ['قرار', 'حل', 'وضوح', 'حقيقة', 'decision', 'solution', 'clarity', 'truth', 'resolve', 'choose'];

    const lowerContent = reportContent.toLowerCase();
    const awScore = Math.max(1, awarenessWords.filter(w => lowerContent.includes(w)).length);
    const knScore = Math.max(1, knowledgeWords.filter(w => lowerContent.includes(w)).length);
    const trScore = Math.max(1, truthWords.filter(w => lowerContent.includes(w)).length);
    const total = awScore + knScore + trScore;
    const awRatio = awScore / total;
    const knRatio = knScore / total;
    const trRatio = trScore / total;

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.42;
    const awPetals = Math.round(3 + awRatio * 8);
    const knSpokes = Math.round(4 + knRatio * 10);

    const awarenessPath = useMemo(() => {
        const r = rand;
        let d = '';
        const isTense = voiceTone === 'tense';
        const isExcited = voiceTone === 'excited';
        for (let i = 0; i < awPetals; i++) {
            const baseAngle = (i / awPetals) * Math.PI * 2;
            const spread = (r() * 0.4 + 0.2) * Math.PI / awPetals;
            const len = maxR * (0.3 + awRatio * 0.5 + r() * 0.2);

            if (isTense || isExcited) {
                // FEATURE ④: State of Matter - Sharp/Broken (Tense)
                const spikeLen = len * (isTense ? 1.4 : 1.2);
                const cp1x = cx + Math.cos(baseAngle - spread * 0.8) * len * 0.8;
                const cp1y = cy + Math.sin(baseAngle - spread * 0.8) * len * 0.8;
                const ex = cx + Math.cos(baseAngle) * spikeLen;
                const ey = cy + Math.sin(baseAngle) * spikeLen;
                const cp2x = cx + Math.cos(baseAngle + spread * 0.8) * len * 0.8;
                const cp2y = cy + Math.sin(baseAngle + spread * 0.8) * len * 0.8;
                d += `M ${cx} ${cy} L ${cp1x} ${cp1y} L ${ex} ${ey} L ${cp2x} ${cp2y} Z `;
            } else {
                // FEATURE ④: State of Matter - Soft Liquid (Calm/Focused)
                const cp1x = cx + Math.cos(baseAngle - spread) * len * 0.7;
                const cp1y = cy + Math.sin(baseAngle - spread) * len * 0.7;
                const cp2x = cx + Math.cos(baseAngle + spread) * len * 0.7;
                const cp2y = cy + Math.sin(baseAngle + spread) * len * 0.7;
                const ex = cx + Math.cos(baseAngle) * len;
                const ey = cy + Math.sin(baseAngle) * len;
                d += `M ${cx} ${cy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey} `;
            }
        }
        return d;
    }, [seed, voiceTone, awPetals, awRatio, cx, cy, maxR]);

    const knowledgePath = useMemo(() => {
        const r = rand;
        let d = '';
        for (let i = 0; i < knSpokes; i++) {
            const angle = (i / knSpokes) * Math.PI * 2 + r() * 0.3;
            const r1 = maxR * (0.15 + knRatio * 0.3);
            const r2 = maxR * (0.25 + knRatio * 0.5 + r() * 0.15);
            const x1 = cx + Math.cos(angle) * r1;
            const y1 = cy + Math.sin(angle) * r1;
            const x2 = cx + Math.cos(angle) * r2;
            const y2 = cy + Math.sin(angle) * r2;
            d += `M ${x1} ${y1} L ${x2} ${y2} `;
        }
        return d;
    }, [seed]);

    // ── FEATURE ⑤: EXPORT AS ART (SVG → PNG download) ──────────────────────
    const downloadAsArt = () => {
        const svgEl = svgRef.current;
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 3; // 3× for high-res art
            canvas.width = size * scale;
            canvas.height = size * scale;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#080818';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Subtle radial glow
            const grd = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width / 2
            );
            grd.addColorStop(0, 'rgba(255,0,229,0.08)');
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, size, size);
            canvas.toBlob(pngBlob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(pngBlob);
                a.download = `dawayir-cognitive-art-${seed.slice(0, 8)}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = url;
    };

    const gradId = `cfp-grd-${seed.slice(0, 6).replace(/[^a-zA-Z0-9]/g, 'x')}`;
    const styleId = `cfp-${seed.slice(0, 6).replace(/[^a-zA-Z0-9]/g, 'x')}`;

    const getDynamicStyles = () => {
        let svgAnim = '';
        let knowAnim = '';
        let truthAnim = '';

        if (isShattering) {
            // Aha-Moment: Paradigm Shift Collapse
            svgAnim = 'animation: cfp-shatter 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;';
            knowAnim = '';
            truthAnim = '';
        } else if (liveState === 'thinking') { // The silent state when user naturally stops but agent hasn't started
            // Breathing when thinking/silent
            svgAnim = 'animation: cfp-breathe 8s ease-in-out infinite;'; // 4s in + 4s out
            knowAnim = 'animation: cfp-rotate 16s linear infinite;';
            truthAnim = 'animation: cfp-rotate-reverse 24s linear infinite;';
        } else if (liveState === 'listening') {
            // Fast processing mode
            svgAnim = 'animation: cfp-breathe 4s ease-in-out infinite;';
            knowAnim = 'animation: cfp-rotate 8s linear infinite;';
            truthAnim = 'animation: cfp-rotate-reverse 12s linear infinite;';
        } else if (liveState === 'speaking') {
            // Energetic pulsing
            svgAnim = 'animation: cfp-pulse 1.2s ease-in-out infinite;';
            knowAnim = 'animation: cfp-rotate 10s linear infinite;';
            truthAnim = 'animation: cfp-rotate-reverse 15s linear infinite;';
        }

        return `
            .cfp-wrapper-${styleId} .cfp-svg {
                ${svgAnim}
                transform-origin: center;
                transition: filter 0.5s ease, transform 0.5s ease;
            }
            .cfp-wrapper-${styleId} .cfp-knowledge {
                ${knowAnim}
                transform-origin: center;
            }
            .cfp-wrapper-${styleId} .cfp-truth {
                ${truthAnim}
                transform-origin: center;
            }
            @keyframes cfp-breathe {
                0%, 100% { transform: scale(0.92); filter: drop-shadow(0 0 10px rgba(0,245,255,0.2)); }
                50% { transform: scale(1.08); filter: drop-shadow(0 0 35px rgba(0,245,255,0.9)); }
            }
            @keyframes cfp-pulse {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(255,0,229,0.3)); }
                50% { transform: scale(1.02); filter: drop-shadow(0 0 18px rgba(255,0,229,0.5)); }
            }
            @keyframes cfp-rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes cfp-rotate-reverse {
                0% { transform: rotate(360deg); }
                100% { transform: rotate(0deg); }
            }
            @keyframes cfp-shatter {
                0% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 12px rgba(255,255,255,0.8)) blur(0px); }
                15% { transform: scale(1.3) rotate(15deg); opacity: 0.9; filter: drop-shadow(0 0 40px rgba(0,245,255,1)) blur(2px); }
                30% { transform: scale(0.1) rotate(-45deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(0,0,0,0)) blur(10px); }
                55% { transform: scale(0.1) rotate(0deg); opacity: 0; }
                75% { transform: scale(1.15) rotate(5deg); opacity: 1; filter: drop-shadow(0 0 30px rgba(255,0,229,0.9)) blur(1px); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 12px rgba(255,0,229,0.3)) blur(0px); }
            }
        `;
    };

    return (
        <div
            className={`cognitive-fingerprint-wrapper cfp-wrapper-${styleId}`}
            title={lang === 'ar' ? 'بصمتك الإدراكية الفريدة' : 'Your unique cognitive fingerprint'}
        >
            <style>{getDynamicStyles()}</style>
            <svg
                ref={svgRef}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="cognitive-fingerprint-svg cfp-svg"
                style={{ filter: 'drop-shadow(0 0 12px rgba(255,0,229,0.3))' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#FF00E5" stopOpacity="0.05" />
                    </radialGradient>
                </defs>

                <circle cx={cx} cy={cy} r={maxR + 10} fill={`url(#${gradId})`} />

                {/* Truth rings */}
                <g className="cfp-truth">
                    <circle cx={cx} cy={cy} r={maxR * (0.6 + trRatio * 0.35)}
                        fill="none" stroke="#FF00E5" strokeWidth="1.5" strokeOpacity="0.5"
                        strokeDasharray={`${4 + trRatio * 6} ${3 + (1 - trRatio) * 5}`} />
                    <circle cx={cx} cy={cy} r={maxR * (0.4 + trRatio * 0.25)}
                        fill="none" stroke="#FF00E5" strokeWidth="0.8" strokeOpacity="0.3"
                        strokeDasharray="2 4" />
                </g>

                {/* Awareness petals/spikes */}
                <path d={awarenessPath} fill="none"
                    stroke={voiceTone === 'tense' ? '#FF5032' : voiceTone === 'excited' ? '#FFC800' : '#00F5FF'}
                    strokeWidth={voiceTone === 'tense' ? "1.8" : "1.5"}
                    strokeOpacity="0.7"
                    strokeLinecap={voiceTone === 'tense' ? "miter" : "round"}
                    strokeLinejoin={voiceTone === 'tense' ? "miter" : "round"}
                    style={{ transition: 'stroke 1s ease, stroke-width 1s ease, d 1s ease' }} />

                {/* Knowledge spokes */}
                <path className="cfp-knowledge" d={knowledgePath} fill="none" stroke="#00FF41"
                    strokeWidth="1.2" strokeOpacity="0.65" strokeLinecap="round" />

                {/* Center core */}
                <circle cx={cx} cy={cy} r={6} fill="#FF00E5" opacity="0.8" />
                <circle cx={cx} cy={cy} r={3} fill="#00F5FF" opacity="0.9" />
                <circle cx={cx} cy={cy} r={1.5} fill="#ffffff" opacity="1" />
            </svg>

            <p className="fingerprint-label">
                {lang === 'ar' ? 'بصمتك الإدراكية' : 'Cognitive Fingerprint'}
            </p>

            {/* ── Feature ⑤ EXPORT AS ART ── */}
            <button
                className="fingerprint-export-btn"
                onClick={downloadAsArt}
                title={lang === 'ar' ? 'احفظ بصمتك كصورة فنية' : 'Save as high-res art'}
            >
                ⬇ {lang === 'ar' ? 'احفظ كفن' : 'Save as Art'}
            </button>
        </div>
    );
}

export default CognitiveFingerprint;

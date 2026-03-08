/**
 * FEATURE ⑱ — COGNITIVE DNA CARD
 * "بطاقتك الذهنية — فن قابل للمشاركة"
 * First app that generates a shareable "mind card" combining:
 * - Cognitive fingerprint (SVG)
 * - Emotional weather journey
 * - Cognitive velocity label  
 * - Mirror sentence
 * - Session stats
 *
 * Exports as a high-res PNG — designed to be shared on social media.
 */
import React, { useRef } from 'react';

const NODE_COLORS = { 1: '#00F5FF', 2: '#00FF41', 3: '#FF00E5' };
const WEATHER_ICONS = { storm: '🌪️', rain: '🌧️', cloudy: '☁️', partly: '⛅', sunny: '☀️' };

function CognitiveDNACard({
    lang = 'ar',
    mirrorSentence = '',
    weatherId = 'partly',
    velocityState = 'stable',
    dominantNodeId = 3,
    transitionCount = 0,
    sessionDurationMs = 0,
    journeyPath = [1, 2, 3],
    onClose,
}) {
    const cardRef = useRef(null);

    const dominantColor = NODE_COLORS[dominantNodeId] || '#FF00E5';

    const exportCard = () => {
        const card = cardRef.current;
        if (!card) return;

        // Use html2canvas-style approach with a canvas draw
        const width = 480;
        const height = 640;
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // 2× for retina
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        // Background
        const bg = ctx.createLinearGradient(0, 0, width, height);
        bg.addColorStop(0, '#060618');
        bg.addColorStop(0.5, '#0a0a2a');
        bg.addColorStop(1, '#060618');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Radial glow backdrop
        const grd = ctx.createRadialGradient(width / 2, height / 3, 0, width / 2, height / 3, 200);
        grd.addColorStop(0, `${dominantColor}22`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        // Frame border
        ctx.strokeStyle = `${dominantColor}44`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(16, 16, width - 32, height - 32);

        // App name
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(lang === 'ar' ? 'دواير' : 'Dawayir', width / 2, 52);

        // Subtitle
        ctx.font = '12px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(lang === 'ar' ? 'بصمتك الإدراكية' : 'Your Cognitive DNA', width / 2, 72);

        // Weather icon (large center)
        ctx.font = '72px serif';
        ctx.textAlign = 'center';
        ctx.fillText(WEATHER_ICONS[weatherId] || '⛅', width / 2, 190);

        // Mirror sentence
        if (mirrorSentence) {
            ctx.font = '14px Outfit, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.textAlign = 'center';
            // Word wrap
            const words = mirrorSentence.split(' ');
            let line = '';
            let y = 240;
            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > 380 && line) {
                    ctx.fillText(line.trim(), width / 2, y);
                    line = word + ' ';
                    y += 22;
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) ctx.fillText(line.trim(), width / 2, y);
        }

        // Journey path nodes
        const nodeColors = journeyPath.map(id => NODE_COLORS[id] || '#fff');
        const totalNodes = journeyPath.length;
        const startX = width / 2 - (totalNodes - 1) * 30;
        const ny = 330;
        journeyPath.forEach((nodeId, i) => {
            const nx = startX + i * 60;
            // Circle
            ctx.beginPath();
            ctx.arc(nx, ny, 10, 0, Math.PI * 2);
            ctx.fillStyle = nodeColors[i];
            ctx.fill();
            // Connector
            if (i < totalNodes - 1) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(nx + 10, ny);
                ctx.lineTo(nx + 50, ny);
                ctx.stroke();
            }
        });

        // Stats row
        const stats = [
            { label: lang === 'ar' ? 'انتقالات' : 'Transitions', val: String(transitionCount) },
            { label: lang === 'ar' ? 'مدة الجلسة' : 'Duration', val: `${Math.round(sessionDurationMs / 60000)}m` },
        ];
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        stats.forEach((s, i) => {
            const sx = width / 4 * (i + 1);
            ctx.fillStyle = dominantColor;
            ctx.font = 'bold 18px Outfit, sans-serif';
            ctx.fillText(s.val, sx, 400);
            ctx.font = '10px Outfit, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(s.label, sx, 418);
        });

        // Footer
        ctx.font = '10px Outfit, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText('dawayir.app', width / 2, height - 24);

        canvas.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `dawayir-dna-${Date.now()}.png`;
            a.click();
        }, 'image/png');
    };

    const nodeLabel = (id) => {
        const map = { ar: { 1: 'وعي', 2: 'علم', 3: 'حقيقة' }, en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' } };
        return (map[lang] || map.en)[id] || '';
    };

    return (
        <div className="dna-card-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
            <div className="dna-card-container" ref={cardRef} style={{ '--dominant-color': dominantColor }}>
                <button className="dna-card-close" onClick={onClose}>✕</button>

                <div className="dna-card-header">
                    <span className="dna-card-brand">{lang === 'ar' ? 'دواير' : 'Dawayir'}</span>
                    <span className="dna-card-subtitle">{lang === 'ar' ? 'بصمتك الإدراكية' : 'Your Cognitive DNA'}</span>
                </div>

                {/* Large weather orb */}
                <div className="dna-weather-orb">
                    <span className="dna-weather-emoji">{WEATHER_ICONS[weatherId] || '⛅'}</span>
                    <div className="dna-weather-glow" style={{ background: dominantColor }} />
                </div>

                {/* Mirror sentence */}
                {mirrorSentence && (
                    <blockquote className="dna-mirror-sentence">
                        "{mirrorSentence}"
                    </blockquote>
                )}

                {/* Journey nodes strip */}
                <div className="dna-journey-strip">
                    {journeyPath.map((nodeId, i) => (
                        <React.Fragment key={i}>
                            <div className="dna-journey-dot" style={{ background: NODE_COLORS[nodeId] }}>
                                <span className="dna-journey-dot-label">{nodeLabel(nodeId)}</span>
                            </div>
                            {i < journeyPath.length - 1 && <div className="dna-journey-line" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Stats */}
                <div className="dna-stats-row">
                    <div className="dna-stat">
                        <span className="dna-stat-val" style={{ color: dominantColor }}>{transitionCount}</span>
                        <span className="dna-stat-label">{lang === 'ar' ? 'انتقالات' : 'Transitions'}</span>
                    </div>
                    <div className="dna-stat-divider" />
                    <div className="dna-stat">
                        <span className="dna-stat-val" style={{ color: dominantColor }}>{Math.round(sessionDurationMs / 60000) || 0}m</span>
                        <span className="dna-stat-label">{lang === 'ar' ? 'مدة الجلسة' : 'Duration'}</span>
                    </div>
                </div>

                <div className="dna-card-footer">dawayir.app</div>

                <button className="dna-export-btn" onClick={exportCard}>
                    ⬇ {lang === 'ar' ? 'احفظ البطاقة كصورة' : 'Save as Image'}
                </button>
            </div>
        </div>
    );
}

export default CognitiveDNACard;

import React, { useRef } from 'react';
import Modal from './ui/Modal';

const NODE_COLORS = { 1: '#38B2D8', 2: '#2ECC71', 3: '#9B59B6' };
const WEATHER_ICONS = { storm: '🌪️', rain: '🌧️', cloudy: '☁️', partly: '⛅', sunny: '☀️' };

function CognitiveDNACard({
  lang = 'ar',
  mirrorSentence = '',
  weatherId = 'partly',
  dominantNodeId = 3,
  transitionCount = 0,
  sessionDurationMs = 0,
  journeyPath = [1, 2, 3],
  onClose,
}) {
  const cardRef = useRef(null);
  const dominantColor = NODE_COLORS[dominantNodeId] || '#9B59B6';

  const exportCard = () => {
    const card = cardRef.current;
    if (!card) return;

    const width = 480;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#060618');
    background.addColorStop(0.5, '#0a0a2a');
    background.addColorStop(1, '#060618');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, height / 3, 0, width / 2, height / 3, 200);
    glow.addColorStop(0, `${dominantColor}22`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = `${dominantColor}44`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(lang === 'ar' ? 'دواير' : 'Dawayir', width / 2, 52);

    ctx.font = '12px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(lang === 'ar' ? 'بصمتك الإدراكية' : 'Your Cognitive DNA', width / 2, 72);

    ctx.font = '72px serif';
    ctx.fillText(WEATHER_ICONS[weatherId] || '⛅', width / 2, 190);

    if (mirrorSentence) {
      ctx.font = '14px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const words = mirrorSentence.split(' ');
      let line = '';
      let y = 240;

      for (const word of words) {
        const testLine = `${line}${word} `;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 380 && line) {
          ctx.fillText(line.trim(), width / 2, y);
          line = `${word} `;
          y += 22;
        } else {
          line = testLine;
        }
      }

      if (line.trim()) {
        ctx.fillText(line.trim(), width / 2, y);
      }
    }

    const nodeColors = journeyPath.map((id) => NODE_COLORS[id] || '#fff');
    const totalNodes = journeyPath.length;
    const startX = width / 2 - (totalNodes - 1) * 30;
    const nodeY = 330;
    journeyPath.forEach((nodeId, index) => {
      const nodeX = startX + index * 60;
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, 10, 0, Math.PI * 2);
      ctx.fillStyle = nodeColors[index];
      ctx.fill();

      if (index < totalNodes - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodeX + 10, nodeY);
        ctx.lineTo(nodeX + 50, nodeY);
        ctx.stroke();
      }
    });

    const stats = [
      { label: lang === 'ar' ? 'انتقالات' : 'Transitions', value: String(transitionCount) },
      { label: lang === 'ar' ? 'مدة الجلسة' : 'Duration', value: `${Math.round(sessionDurationMs / 60000)}m` },
    ];

    ctx.textAlign = 'center';
    stats.forEach((stat, index) => {
      const x = (width / 4) * (index + 1);
      ctx.fillStyle = dominantColor;
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.fillText(stat.value, x, 400);
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(stat.label, x, 418);
    });

    ctx.font = '10px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('dawayir.app', width / 2, height - 24);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dawayir-dna-${Date.now()}.png`;
      link.click();
    }, 'image/png');
  };

  const nodeLabel = (id) => {
    const labels = {
      ar: { 1: 'وعي', 2: 'علم', 3: 'حقيقة' },
      en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
    };
    return (labels[lang] || labels.en)[id] || '';
  };

  return (
    <Modal titleId="dna-card-title" onClose={onClose} className="dna-card-modal">
      <div className="dna-card-container" ref={cardRef} style={{ '--dominant-color': dominantColor }}>
        <h2 id="dna-card-title" className="visually-hidden">
          {lang === 'ar' ? 'بطاقتك الإدراكية القابلة للمشاركة' : 'Your shareable cognitive DNA card'}
        </h2>

        <button
          className="dna-card-close"
          onClick={onClose}
          aria-label={lang === 'ar' ? 'إغلاق البطاقة' : 'Close card'}
        >
          ✕
        </button>

        <div className="dna-card-header">
          <span className="dna-card-brand">{lang === 'ar' ? 'دواير' : 'Dawayir'}</span>
          <span className="dna-card-subtitle">{lang === 'ar' ? 'بصمتك الإدراكية' : 'Your Cognitive DNA'}</span>
        </div>

        <div className="dna-weather-orb" aria-hidden="true">
          <span className="dna-weather-emoji">{WEATHER_ICONS[weatherId] || '⛅'}</span>
          <div className="dna-weather-glow" style={{ background: dominantColor }} />
        </div>

        {mirrorSentence && (
          <blockquote className="dna-mirror-sentence">
            "{mirrorSentence}"
          </blockquote>
        )}

        <div className="dna-journey-strip">
          {journeyPath.map((nodeId, index) => (
            <React.Fragment key={`${nodeId}-${index}`}>
              <div className="dna-journey-dot" style={{ background: NODE_COLORS[nodeId] }}>
                <span className="dna-journey-dot-label">{nodeLabel(nodeId)}</span>
              </div>
              {index < journeyPath.length - 1 && <div className="dna-journey-line" />}
            </React.Fragment>
          ))}
        </div>

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
    </Modal>
  );
}

export default CognitiveDNACard;

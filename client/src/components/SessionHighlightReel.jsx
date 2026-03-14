import React, { useMemo } from 'react';

const NODE_NAMES = {
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' },
  en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
};

const NODE_COLORS = {
  1: '#38B2D8',
  2: '#2ECC71',
  3: '#9B59B6',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const metricPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const formatDuration = (ms, lang) => {
  const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (lang === 'ar') {
    return minutes > 0 ? `${minutes}د ${seconds}ث` : `${seconds}ث`;
  }
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const scoreStep = (step) => {
  const metrics = step?.metrics || {};
  const clarity = Number(metrics.clarityDelta) || 0;
  const equilibrium = Number(metrics.equilibriumScore) || 0;
  const overload = Number(metrics.overloadIndex) || 0;
  const focusTruthBonus = Number(step?.focusId) === 3 ? 0.22 : 0;
  const reasonBonus = typeof step?.reason === 'string' && step.reason.trim().length > 18 ? 0.14 : 0;
  return (clarity * 2.8) + (equilibrium * 1.15) + focusTruthBonus + reasonBonus - (overload * 0.4);
};

const pickHighlightSteps = (replayData) => {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];
  if (steps.length === 0) return [];

  const scored = steps.map((step, index) => ({ ...step, highlightIndex: index, highlightScore: scoreStep(step) }));
  const sorted = [...scored].sort((a, b) => b.highlightScore - a.highlightScore);
  const selected = [];
  const minGap = Math.max(1, Math.floor(steps.length / 4));

  for (const candidate of sorted) {
    if (selected.every((item) => Math.abs(item.highlightIndex - candidate.highlightIndex) >= minGap)) {
      selected.push(candidate);
    }
    if (selected.length === 3) break;
  }

  const fallbackIndexes = [0, Math.floor((steps.length - 1) / 2), steps.length - 1];
  for (const index of fallbackIndexes) {
    const fallback = scored[index];
    if (fallback && selected.every((item) => item.highlightIndex !== fallback.highlightIndex)) {
      selected.push(fallback);
    }
    if (selected.length === 3) break;
  }

  return selected
    .sort((a, b) => a.highlightIndex - b.highlightIndex)
    .slice(0, 3);
};

const buildMomentTitle = ({ lang, order, focusId }) => {
  const names = NODE_NAMES[lang] || NODE_NAMES.en;
  const circle = names[focusId] || names[3];

  if (lang === 'ar') {
    if (order === 0) return `بداية التحول ناحية ${circle}`;
    if (order === 1) return `نقطة التحول جوه ${circle}`;
    return `أوضح لحظة في ${circle}`;
  }

  if (order === 0) return `Opening shift toward ${circle}`;
  if (order === 1) return `Turning point in ${circle}`;
  return `Peak clarity around ${circle}`;
};

const drawHighlightSheet = ({ width, height, lang, reportName, highlights }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#040912');
  bg.addColorStop(0.55, '#07131f');
  bg.addColorStop(1, '#14061c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '700 40px Arial';
  ctx.fillText(lang === 'ar' ? 'Dawayir Highlight Reel' : 'Dawayir Highlight Reel', 64, 52);
  ctx.fillStyle = 'rgba(214,229,255,0.72)';
  ctx.font = '500 20px Arial';
  ctx.fillText(reportName || 'Session', 64, 108);

  highlights.forEach((step, index) => {
    const focusId = Number(step.focusId) || 3;
    const color = NODE_COLORS[focusId] || NODE_COLORS[3];
    const top = 172 + (index * 500);

    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.beginPath();
    ctx.roundRect(52, top, width - 104, 420, 28);
    ctx.fill();
    ctx.strokeStyle = `${color}44`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = `${color}`;
    ctx.font = '700 18px Arial';
    ctx.fillText(`#0${index + 1}`, 84, top + 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Arial';
    ctx.fillText(buildMomentTitle({ lang, order: index, focusId }), 84, top + 68);

    ctx.fillStyle = 'rgba(219,230,255,0.68)';
    ctx.font = '500 17px Arial';
    ctx.fillText(formatDuration(step.atMs, lang), 84, top + 114);

    ctx.fillStyle = 'rgba(239,244,255,0.92)';
    ctx.font = '500 22px Arial';
    const words = String(step.reason || '').split(/\s+/);
    let line = '';
    let y = top + 156;
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width - 180) {
        ctx.fillText(line, 84, y);
        line = word;
        y += 28;
      } else {
        line = next;
      }
    });
    if (line) ctx.fillText(line, 84, y);

    const metrics = [
      { label: lang === 'ar' ? 'الوضوح' : 'Clarity', value: metricPercent(step?.metrics?.clarityDelta) },
      { label: lang === 'ar' ? 'التوازن' : 'Equilibrium', value: metricPercent(step?.metrics?.equilibriumScore) },
      { label: lang === 'ar' ? 'الضغط' : 'Overload', value: metricPercent(step?.metrics?.overloadIndex) },
    ];

    metrics.forEach((metric, metricIndex) => {
      const boxX = 84 + (metricIndex * 260);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(boxX, top + 300, 220, 76, 18);
      ctx.fill();
      ctx.fillStyle = 'rgba(214,227,255,0.58)';
      ctx.font = '500 15px Arial';
      ctx.fillText(metric.label, boxX + 18, top + 320);
      ctx.fillStyle = metricIndex === 0 ? '#9B59B6' : metricIndex === 1 ? '#38B2D8' : '#FF7D96';
      ctx.font = '700 24px Arial';
      ctx.fillText(metric.value, boxX + 18, top + 344);
    });

    const orbitX = width - 200;
    const orbitY = top + 106;
    const orbitRadius = 62 + ((clamp(Number((step?.nodes || []).find((node) => Number(node.id) === focusId)?.radius) || 60, 30, 100) - 30) / 70) * 24;
    const orbitGlow = ctx.createRadialGradient(orbitX, orbitY, 0, orbitX, orbitY, orbitRadius * 1.7);
    orbitGlow.addColorStop(0, `${color}44`);
    orbitGlow.addColorStop(1, `${color}00`);
    ctx.fillStyle = orbitGlow;
    ctx.beginPath();
    ctx.arc(orbitX, orbitY, orbitRadius * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `${color}bb`;
    ctx.beginPath();
    ctx.arc(orbitX, orbitY, orbitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orbitX, orbitY, orbitRadius + 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((NODE_NAMES[lang] || NODE_NAMES.en)[focusId], orbitX, orbitY);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  });

  return canvas;
};

function SessionHighlightReel({ lang = 'ar', reportName = '', replayData = null }) {
  const highlights = useMemo(() => pickHighlightSteps(replayData), [replayData]);

  const handleExportSheet = () => {
    if (highlights.length === 0) return;
    const canvas = drawHighlightSheet({
      width: 1080,
      height: 1820,
      lang,
      reportName,
      highlights,
    });
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dawayir-highlight-reel-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png');
  };

  if (highlights.length === 0) return null;

  return (
    <section className="highlight-reel-section">
      <div className="highlight-reel-header">
        <div>
          <span className="highlight-reel-kicker">{lang === 'ar' ? 'أهم اللقطات' : 'Auto Highlight Reel'}</span>
          <h3>{lang === 'ar' ? 'أهم 3 لحظات في الجلسة' : 'The 3 strongest moments in the session'}</h3>
          <p>{lang === 'ar' ? 'اختيار تلقائي لأهم اللحظات اللي بتوضح التغير بسرعة وبشكل مقنع.' : 'Automatically selected moments that prove live cognitive change fastest to a judge or investor.'}</p>
        </div>
        <button className="highlight-reel-btn" onClick={handleExportSheet}>
          {lang === 'ar' ? 'احفظ اللقطات كلوحة' : 'Save Highlight Sheet'}
        </button>
      </div>

      <div className="highlight-reel-grid">
        {highlights.map((step, index) => {
          const focusId = Number(step.focusId) || 3;
          const color = NODE_COLORS[focusId] || NODE_COLORS[3];
          return (
            <article key={`${step.atMs}-${index}`} className="highlight-reel-card" style={{ '--highlight-color': color }}>
              <div className="highlight-card-topline">
                <span>{lang === 'ar' ? `لقطة ${index + 1}` : `Clip ${index + 1}`}</span>
                <strong>{formatDuration(step.atMs, lang)}</strong>
              </div>
              <h4>{buildMomentTitle({ lang, order: index, focusId })}</h4>
              <p>{step.reason || (lang === 'ar' ? 'مفيش وصف محفوظ للحظة دي.' : 'No reason was recorded for this moment.')}</p>
              <div className="highlight-card-metrics">
                <span>{lang === 'ar' ? 'الوضوح' : 'Clarity'} {metricPercent(step?.metrics?.clarityDelta)}</span>
                <span>{lang === 'ar' ? 'التوازن' : 'Equilibrium'} {metricPercent(step?.metrics?.equilibriumScore)}</span>
                <span>{lang === 'ar' ? 'الضغط' : 'Overload'} {metricPercent(step?.metrics?.overloadIndex)}</span>
              </div>
              <div className="highlight-card-focus">
                <span className="focus-dot" />
                {lang === 'ar' ? `التركيز: ${(NODE_NAMES[lang] || NODE_NAMES.en)[focusId]}` : `Focus: ${(NODE_NAMES[lang] || NODE_NAMES.en)[focusId]}`}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SessionHighlightReel;

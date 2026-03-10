import React, { useEffect, useMemo, useRef, useState } from 'react';

const NODE_COLORS = {
  1: '#00F5FF',
  2: '#00FF41',
  3: '#FF00E5',
};

const NODE_NAMES = {
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' },
  en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const metricPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const metricDeltaLabel = (value) => {
  const normalized = Number(value) || 0;
  return `${normalized >= 0 ? '+' : ''}${normalized}%`;
};

const downloadCanvas = (canvas, filename) => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }, 'image/png');
};

const pickSignatureStep = (replayData) => {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];
  if (steps.length === 0) return null;

  let bestStep = steps[steps.length - 1];
  let bestScore = -Infinity;

  for (const step of steps) {
    const metrics = step?.metrics || {};
    const clarity = Number(metrics.clarityDelta) || 0;
    const equilibrium = Number(metrics.equilibriumScore) || 0;
    const overload = Number(metrics.overloadIndex) || 0;
    const focusTruthBonus = Number(step?.focusId) === 3 ? 0.25 : 0;
    const reasonBonus = typeof step?.reason === 'string' && step.reason.trim().length > 18 ? 0.12 : 0;
    const score = (clarity * 2.4) + equilibrium + focusTruthBonus + reasonBonus - (overload * 0.45);
    if (score > bestScore) {
      bestScore = score;
      bestStep = step;
    }
  }

  return bestStep;
};

const buildHeadline = ({ lang, focusId, clarityDelta }) => {
  const names = NODE_NAMES[lang] || NODE_NAMES.en;
  const circle = names[focusId] || names[3];

  if (lang === 'ar') {
    if (focusId === 3 && clarityDelta > 0) {
      return `هنا ${circle} بدأت توضح أكتر.`;
    }
    if (focusId === 1) {
      return `هنا ${circle} هدِيت وبقت مفهومة.`;
    }
    if (focusId === 2) {
      return `هنا ${circle} بدأت ترتب الفوضى.`;
    }
    return 'دي كانت أوضح نقطة تحول في الجلسة.';
  }

  if (focusId === 3 && clarityDelta > 0) {
    return `This is where ${circle} began to win.`;
  }
  if (focusId === 1) {
    return `This is where ${circle} became understandable.`;
  }
  if (focusId === 2) {
    return `This is where chaos turned into usable ${circle}.`;
  }
  return 'This was the clearest turning point in the session.';
};

const buildSupportLine = ({ lang, reason, compareDeltas, currentSnapshot }) => {
  const clarityDiff = Number(compareDeltas?.clarity || 0);
  const equilibrium = metricPercent(currentSnapshot?.equilibrium);

  if (lang === 'ar') {
    if (clarityDiff > 0) {
      return `ارتفع الوضوح ${metricDeltaLabel(clarityDiff)} مقارنةً بالجلسة السابقة، بينما وصل التوازن إلى ${equilibrium}.`;
    }
    return reason || 'اللحظة دي كانت أكتر لحظة متماسكة في الجلسة.';
  }

  if (clarityDiff > 0) {
    return `Clarity rose ${metricDeltaLabel(clarityDiff)} versus the previous session while equilibrium reached ${equilibrium}.`;
  }
  return reason || 'This moment marks the most coherent state reached in the current session.';
};

const buildVoiceQuote = ({ lang, headline, reason, compareDeltas, currentSnapshot }) => {
  const clarityDiff = Number(compareDeltas?.clarity || 0);
  const equilibrium = metricPercent(currentSnapshot?.equilibrium);

  if (lang === 'ar') {
    if (clarityDiff > 0) {
      return `${headline} ${reason} ارتفع الوضوح ${metricDeltaLabel(clarityDiff)} مقارنةً بالجلسة السابقة، ووصل التوازن إلى ${equilibrium}.`;
    }
    return `${headline} ${reason}`;
  }

  if (clarityDiff > 0) {
    return `${headline} ${reason} Clarity improved ${metricDeltaLabel(clarityDiff)} versus the previous session, and equilibrium reached ${equilibrium}.`;
  }
  return `${headline} ${reason}`;
};

const wrapPosterText = ({ ctx, text, x, y, maxWidth, lineHeight }) => {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
};

const drawOrbitPanel = ({ ctx, x, y, width, height, title, subtitle, nodes, lang, panelColor, focusId = null }) => {
  const positions = {
    1: { x: x + (width * 0.25), y: y + (height * 0.54) },
    2: { x: x + (width * 0.5), y: y + (height * 0.68) },
    3: { x: x + (width * 0.76), y: y + (height * 0.3) },
  };

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 28);
  ctx.fill();
  ctx.strokeStyle = `${panelColor}44`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px Arial';
  ctx.fillText(title, x + 24, y + 24);
  ctx.fillStyle = 'rgba(220,233,255,0.68)';
  ctx.font = '500 14px Arial';
  ctx.fillText(subtitle, x + 24, y + 58);

  const resolvedNodes = [1, 2, 3].map((id) => {
    const raw = (nodes || []).find((node) => Number(node.id) === id) || {};
    return {
      id,
      label: raw.label || (NODE_NAMES[lang] || NODE_NAMES.en)[id],
      radius: clamp(Number(raw.radius) || 60, 30, 100),
      color: typeof raw.color === 'string' ? raw.color : NODE_COLORS[id],
    };
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 10]);
  ctx.beginPath();
  ctx.moveTo(positions[1].x, positions[1].y);
  ctx.lineTo(positions[2].x, positions[2].y);
  ctx.lineTo(positions[3].x, positions[3].y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(positions[1].x, positions[1].y);
  ctx.lineTo(positions[3].x, positions[3].y);
  ctx.stroke();
  ctx.setLineDash([]);

  resolvedNodes.forEach((node) => {
    const radius = 30 + ((node.radius - 30) / 70) * 34;
    const pos = positions[node.id];
    const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 1.8);
    glow.addColorStop(0, `${node.color}50`);
    glow.addColorStop(1, `${node.color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `${node.color}bb`;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = Number(node.id) === Number(focusId) ? '#ffffff' : `${node.color}88`;
    ctx.lineWidth = Number(node.id) === Number(focusId) ? 3 : 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(16, radius * 0.28)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, pos.x, pos.y);
  });
};

const drawSignaturePoster = ({ width, height, lang, signature, reportName, compareDeltas, currentSnapshot }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const names = NODE_NAMES[lang] || NODE_NAMES.en;
  const focusId = Number(signature?.focusId) || 3;
  const focusColor = NODE_COLORS[focusId] || NODE_COLORS[3];
  const headline = buildHeadline({ lang, focusId, clarityDelta: Number(signature?.metrics?.clarityDelta) || 0 });
  const support = buildSupportLine({ lang, reason: signature?.reason, compareDeltas, currentSnapshot });

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#050915');
  bg.addColorStop(0.5, '#091224');
  bg.addColorStop(1, '#15061b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.72, height * 0.28, 0, width * 0.72, height * 0.28, width * 0.38);
  glow.addColorStop(0, `${focusColor}33`);
  glow.addColorStop(1, `${focusColor}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = `${focusColor}40`;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px Arial';
  ctx.fillText('Dawayir Signature Moment', 56, 48);

  ctx.fillStyle = 'rgba(214,229,255,0.72)';
  ctx.font = '500 18px Arial';
  ctx.fillText(reportName || 'Session', 56, 96);

  drawOrbitPanel({
    ctx,
    x: 70,
    y: 162,
    width: width - 140,
    height: 790,
    title: lang === 'ar' ? 'الخريطة في لحظة التحول' : 'The Map at the Turning Point',
    subtitle: names[focusId],
    nodes: signature?.nodes || [],
    lang,
    panelColor: focusColor,
    focusId,
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px Arial';
  ctx.fillText(headline, 56, height - 300);

  ctx.fillStyle = 'rgba(236,243,255,0.9)';
  ctx.font = '500 24px Arial';
  wrapPosterText({
    ctx,
    text: support,
    x: 56,
    y: height - 244,
    maxWidth: width - 112,
    lineHeight: 32,
  });

  const chips = [
    { label: lang === 'ar' ? 'الوضوح' : 'Clarity', value: metricPercent(signature?.metrics?.clarityDelta), color: '#FF00E5' },
    { label: lang === 'ar' ? 'التوازن' : 'Equilibrium', value: metricPercent(signature?.metrics?.equilibriumScore), color: '#00F5FF' },
    { label: lang === 'ar' ? 'التركيز' : 'Focus', value: names[focusId], color: focusColor },
  ];

  chips.forEach((chip, index) => {
    const x = 56 + (index * 206);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(x, height - 92, 178, 56, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 14px Arial';
    ctx.fillText(chip.label, x + 16, height - 78);
    ctx.fillStyle = chip.color;
    ctx.font = '700 22px Arial';
    ctx.fillText(chip.value, x + 16, height - 56);
  });

  return canvas;
};

const drawBeforeAfterPoster = ({
  width,
  height,
  lang,
  reportName,
  compareReportName,
  currentSnapshot,
  compareSnapshot,
  compareDeltas,
  focusId,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx || !currentSnapshot || !compareSnapshot) return null;

  const names = NODE_NAMES[lang] || NODE_NAMES.en;
  const focusColor = NODE_COLORS[focusId] || NODE_COLORS[3];
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#040814');
  bg.addColorStop(0.52, '#0a1326');
  bg.addColorStop(1, '#16071d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath();
  ctx.roundRect(36, 36, width - 72, height - 72, 30);
  ctx.fill();
  ctx.strokeStyle = `${focusColor}30`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '700 34px Arial';
  ctx.fillText(lang === 'ar' ? 'Before / After Dawayir' : 'Before / After Dawayir', 68, 58);

  ctx.fillStyle = 'rgba(219,230,255,0.68)';
  ctx.font = '500 18px Arial';
  ctx.fillText(
    lang === 'ar'
      ? `من ${compareReportName || 'Previous Session'} إلى ${reportName || 'Current Session'}`
      : `${compareReportName || 'Previous Session'} to ${reportName || 'Current Session'}`,
    68,
    106,
  );

  drawOrbitPanel({
    ctx,
    x: 68,
    y: 176,
    width: (width / 2) - 92,
    height: 610,
    title: lang === 'ar' ? 'قبل' : 'Before',
    subtitle: compareReportName || (lang === 'ar' ? 'جلسة سابقة' : 'Previous Session'),
    nodes: compareSnapshot.nodes,
    lang,
    panelColor: '#334d70',
  });

  drawOrbitPanel({
    ctx,
    x: (width / 2) + 24,
    y: 176,
    width: (width / 2) - 92,
    height: 610,
    title: lang === 'ar' ? 'بعد' : 'After',
    subtitle: reportName || (lang === 'ar' ? 'الجلسة الحالية' : 'Current Session'),
    nodes: currentSnapshot.nodes,
    lang,
    panelColor: focusColor,
    focusId,
  });

  const metrics = [
    {
      label: lang === 'ar' ? 'الوضوح' : 'Clarity',
      before: compareSnapshot.clarity,
      after: currentSnapshot.clarity,
      delta: compareDeltas?.clarity || 0,
      color: '#FF00E5',
    },
    {
      label: lang === 'ar' ? 'التوازن' : 'Equilibrium',
      before: compareSnapshot.equilibrium,
      after: currentSnapshot.equilibrium,
      delta: compareDeltas?.equilibrium || 0,
      color: '#00F5FF',
    },
    {
      label: lang === 'ar' ? 'الضغط' : 'Overload',
      before: compareSnapshot.overload,
      after: currentSnapshot.overload,
      delta: compareDeltas?.overload || 0,
      color: '#FF7D96',
    },
  ];

  metrics.forEach((metric, index) => {
    const x = 68 + (index * 362);
    const y = height - 230;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(x, y, 328, 132, 24);
    ctx.fill();
    ctx.fillStyle = 'rgba(216,228,255,0.58)';
    ctx.font = '500 15px Arial';
    ctx.fillText(metric.label, x + 20, y + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Arial';
    ctx.fillText(`${metric.before}%`, x + 20, y + 54);
    ctx.fillText(`${metric.after}%`, x + 166, y + 54);

    ctx.fillStyle = 'rgba(216,228,255,0.5)';
    ctx.font = '500 14px Arial';
    ctx.fillText(lang === 'ar' ? 'قبل' : 'Before', x + 20, y + 84);
    ctx.fillText(lang === 'ar' ? 'بعد' : 'After', x + 166, y + 84);

    ctx.fillStyle = metric.color;
    ctx.font = '700 22px Arial';
    ctx.fillText(metricDeltaLabel(metric.delta), x + 20, y + 108);
  });

  ctx.fillStyle = `${focusColor}`;
  ctx.font = '700 18px Arial';
  ctx.fillText(
    lang === 'ar'
      ? `الدائرة الأبرز الآن: ${names[focusId]}`
      : `Dominant circle now: ${names[focusId]}`,
    68,
    height - 58,
  );

  return canvas;
};

function SessionSignatureCard({
  lang = 'ar',
  reportName = '',
  compareReportName = '',
  replayData = null,
  compareDeltas = null,
  currentSnapshot = null,
  compareSnapshot = null,
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);
  const signatureStep = useMemo(() => pickSignatureStep(replayData), [replayData]);

  const narrative = useMemo(() => {
    if (!signatureStep) return null;
    const focusId = Number(signatureStep.focusId) || 3;
    return {
      headline: buildHeadline({
        lang,
        focusId,
        clarityDelta: Number(signatureStep?.metrics?.clarityDelta) || 0,
      }),
      support: buildSupportLine({
        lang,
        reason: signatureStep?.reason,
        compareDeltas,
        currentSnapshot,
      }),
      focusId,
    };
  }, [compareDeltas, currentSnapshot, lang, signatureStep]);

  const voiceQuote = useMemo(() => {
    if (!signatureStep || !narrative) return '';
    return buildVoiceQuote({
      lang,
      headline: narrative.headline,
      reason: signatureStep.reason,
      compareDeltas,
      currentSnapshot,
    });
  }, [compareDeltas, currentSnapshot, lang, narrative, signatureStep]);

  useEffect(() => () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleExportPoster = () => {
    if (!signatureStep || !narrative) return;
    const canvas = drawSignaturePoster({
      width: 1200,
      height: 1600,
      lang,
      signature: signatureStep,
      reportName,
      compareDeltas,
      currentSnapshot,
    });
    if (!canvas) return;
    downloadCanvas(canvas, `dawayir-signature-${Date.now()}.png`);
  };

  const handleExportBeforeAfterPoster = () => {
    if (!signatureStep || !currentSnapshot || !compareSnapshot) return;
    const canvas = drawBeforeAfterPoster({
      width: 1200,
      height: 1400,
      lang,
      reportName,
      compareReportName,
      currentSnapshot,
      compareSnapshot,
      compareDeltas,
      focusId: narrative?.focusId || signatureStep.focusId,
    });
    if (!canvas) return;
    downloadCanvas(canvas, `dawayir-before-after-${Date.now()}.png`);
  };

  const handleTrustedShare = async () => {
    if (!signatureStep || !narrative) return;
    const text = `${narrative.headline}\n${narrative.support}\n\n${reportName}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dawayir Signature Moment',
          text,
        });
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      window.alert(lang === 'ar' ? 'تم نسخ اللحظة الفاصلة للمشاركة.' : 'Signature moment copied for sharing.');
    }
  };

  const handleVoiceQuote = () => {
    if (!voiceQuote || !('speechSynthesis' in window)) {
      window.alert(lang === 'ar' ? 'المتصفح الحالي مش بيدعم تشغيل الصوت المحلي.' : 'This browser does not support local speech playback.');
      return;
    }

    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceQuote);
    utterance.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
    utterance.rate = lang === 'ar' ? 0.92 : 0.96;
    utterance.pitch = 0.98;

    const voices = synth.getVoices();
    const matchingVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith(lang === 'ar' ? 'ar' : 'en'));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    synth.speak(utterance);
  };

  if (!signatureStep || !narrative) {
    return null;
  }

  const names = NODE_NAMES[lang] || NODE_NAMES.en;
  const focusColor = NODE_COLORS[narrative.focusId] || NODE_COLORS[3];
  const circles = [1, 2, 3].map((id) => {
    const raw = (signatureStep.nodes || []).find((node) => Number(node.id) === id) || {};
    return {
      id,
      label: raw.label || names[id],
      radius: clamp(Number(raw.radius) || 60, 30, 100),
      color: typeof raw.color === 'string' ? raw.color : NODE_COLORS[id],
    };
  });

  return (
    <section className="signature-moment-card" style={{ '--signature-color': focusColor }}>
      <div className="signature-moment-head">
        <div>
          <span className="signature-kicker">{lang === 'ar' ? 'اللحظة الفاصلة' : 'Signature Moment'}</span>
          <h3>{narrative.headline}</h3>
          <p>{narrative.support}</p>
        </div>
        <div className="signature-actions">
          <button className="signature-action-btn voice" onClick={handleVoiceQuote}>
            {isSpeaking ? (lang === 'ar' ? 'أوقف الصوت' : 'Stop Voice Quote') : (lang === 'ar' ? 'اسمع اللحظة' : 'Hear the Moment')}
          </button>
          <button className="signature-action-btn" onClick={handleTrustedShare}>
            {lang === 'ar' ? 'شاركها مع حد تثق فيه' : 'Share with someone you trust'}
          </button>
          <button className="signature-action-btn export" onClick={handleExportPoster}>
            {lang === 'ar' ? 'احفظها كصورة' : 'Save as Poster'}
          </button>
        </div>
      </div>

      <div className="signature-moment-body">
        <div className="signature-reason-block">
          <span>{lang === 'ar' ? 'ليه اللحظة دي؟' : 'Why this moment?'}</span>
          <strong>{signatureStep.reason}</strong>
          <div className="signature-metrics-row">
            <div>
              <small>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</small>
              <strong>{metricPercent(signatureStep?.metrics?.clarityDelta)}</strong>
            </div>
            <div>
              <small>{lang === 'ar' ? 'التوازن' : 'Equilibrium'}</small>
              <strong>{metricPercent(signatureStep?.metrics?.equilibriumScore)}</strong>
            </div>
            <div>
              <small>{lang === 'ar' ? 'التركيز' : 'Focus'}</small>
              <strong>{names[narrative.focusId]}</strong>
            </div>
          </div>

          <div className="signature-voice-quote">
            <small>{lang === 'ar' ? 'الاقتباس الصوتي' : 'Voice Quote'}</small>
            <p>{voiceQuote}</p>
          </div>
        </div>

        <div className="signature-orbit-strip">
          {circles.map((circle) => (
            <div key={circle.id} className={`signature-orbit-node ${circle.id === narrative.focusId ? 'is-focus' : ''}`}>
              <div
                className="signature-orbit-core"
                style={{
                  '--node-color': circle.color,
                  width: `${48 + ((circle.radius - 30) / 70) * 34}px`,
                  height: `${48 + ((circle.radius - 30) / 70) * 34}px`,
                }}
              >
                <span>{circle.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {compareSnapshot && currentSnapshot && compareDeltas ? (
        <div className="signature-compare-strip">
          <div className="signature-compare-header">
            <div>
              <span>{lang === 'ar' ? 'قبل / بعد' : 'Before / After'}</span>
              <strong>{lang === 'ar' ? 'مقارنة جاهزة للمشاركة بين جلستين' : 'Share-ready comparison between two sessions'}</strong>
            </div>
            <button className="signature-action-btn compare" onClick={handleExportBeforeAfterPoster}>
              {lang === 'ar' ? 'احفظ قبل / بعد' : 'Save Before / After'}
            </button>
          </div>
          <div className="signature-compare-grid">
            <div className="signature-compare-card">
              <small>{lang === 'ar' ? 'قبل' : 'Before'}</small>
              <strong>{compareReportName || (lang === 'ar' ? 'جلسة سابقة' : 'Previous Session')}</strong>
              <span>{metricPercent(compareSnapshot.clarity / 100)} {lang === 'ar' ? 'وضوح' : 'clarity'}</span>
            </div>
            <div className="signature-compare-deltas">
              <span className={`signature-delta-chip ${(compareDeltas.clarity || 0) >= 0 ? 'is-positive' : 'is-negative'}`}>
                {lang === 'ar' ? 'الوضوح' : 'Clarity'} {metricDeltaLabel(compareDeltas.clarity)}
              </span>
              <span className={`signature-delta-chip ${(compareDeltas.equilibrium || 0) >= 0 ? 'is-positive' : 'is-negative'}`}>
                {lang === 'ar' ? 'التوازن' : 'Equilibrium'} {metricDeltaLabel(compareDeltas.equilibrium)}
              </span>
              <span className={`signature-delta-chip ${(compareDeltas.overload || 0) <= 0 ? 'is-positive' : 'is-negative'}`}>
                {lang === 'ar' ? 'الضغط' : 'Overload'} {metricDeltaLabel(compareDeltas.overload)}
              </span>
            </div>
            <div className="signature-compare-card current">
              <small>{lang === 'ar' ? 'بعد' : 'After'}</small>
              <strong>{reportName || (lang === 'ar' ? 'الجلسة الحالية' : 'Current Session')}</strong>
              <span>{metricPercent(currentSnapshot.clarity / 100)} {lang === 'ar' ? 'وضوح' : 'clarity'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default SessionSignatureCard;

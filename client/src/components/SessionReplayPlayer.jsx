import React, { useEffect, useMemo, useState } from 'react';

const NODE_POSITIONS = {
  1: { x: 24, y: 66 },
  2: { x: 50, y: 70 },
  3: { x: 76, y: 34 },
};

const DEFAULT_LABELS = {
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' },
  en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatDuration = (ms, lang) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (lang === 'ar') {
    return minutes > 0 ? `${minutes}د ${seconds}ث` : `${seconds}ث`;
  }
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const metricPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const chooseReplayMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return '';
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
};

const drawExportFrame = ({ ctx, width, height, step, stepIndex, totalSteps, lang }) => {
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#04111c');
  bg.addColorStop(0.55, '#050913');
  bg.addColorStop(1, '#150418');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const cyanAura = ctx.createRadialGradient(width * 0.18, height * 0.22, 0, width * 0.18, height * 0.22, width * 0.38);
  cyanAura.addColorStop(0, 'rgba(0,245,255,0.14)');
  cyanAura.addColorStop(1, 'rgba(0,245,255,0)');
  ctx.fillStyle = cyanAura;
  ctx.fillRect(0, 0, width, height);

  const pinkAura = ctx.createRadialGradient(width * 0.82, height * 0.2, 0, width * 0.82, height * 0.2, width * 0.32);
  pinkAura.addColorStop(0, 'rgba(255,0,229,0.12)');
  pinkAura.addColorStop(1, 'rgba(255,0,229,0)');
  ctx.fillStyle = pinkAura;
  ctx.fillRect(0, 0, width, height);

  const labels = DEFAULT_LABELS[lang] || DEFAULT_LABELS.en;
  const positions = {
    1: { x: width * 0.28, y: height * 0.68 },
    2: { x: width * 0.5, y: height * 0.72 },
    3: { x: width * 0.75, y: height * 0.38 },
  };

  const nodes = [1, 2, 3].map((id) => {
    const raw = (step?.nodes || []).find((node) => Number(node.id) === id) || {};
    return {
      id,
      x: positions[id].x,
      y: positions[id].y,
      label: raw.label || labels[id],
      color: typeof raw.color === 'string' ? raw.color : (id === 1 ? '#00F5FF' : id === 2 ? '#00FF41' : '#FF00E5'),
      radius: clamp(Number(raw.radius) || 60, 30, 100),
    };
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  ctx.lineTo(nodes[1].x, nodes[1].y);
  ctx.lineTo(nodes[2].x, nodes[2].y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  ctx.lineTo(nodes[2].x, nodes[2].y);
  ctx.stroke();
  ctx.setLineDash([]);

  nodes.forEach((node) => {
    const radius = 50 + ((node.radius - 30) / 70) * 56;
    const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 1.6);
    glow.addColorStop(0, `${node.color}55`);
    glow.addColorStop(1, `${node.color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `${node.color}bb`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = Number(step?.focusId) === node.id ? '#ffffff' : `${node.color}88`;
    ctx.lineWidth = Number(step?.focusId) === node.id ? 4 : 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(node.x - (radius * 0.28), node.y - (radius * 0.28), Math.max(8, radius * 0.15), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.max(24, radius * 0.36)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px Arial';
  ctx.fillText('Dawayir Session Replay', 56, 42);

  ctx.fillStyle = 'rgba(219,232,255,0.8)';
  ctx.font = '500 20px Arial';
  ctx.fillText(
    lang === 'ar'
      ? `الخطوة ${stepIndex + 1} من ${totalSteps}  •  ${formatDuration(step?.atMs || 0, lang)}`
      : `Step ${stepIndex + 1} of ${totalSteps}  •  ${formatDuration(step?.atMs || 0, lang)}`,
    56,
    88,
  );

  const metrics = step?.metrics || {};
  const metricCards = [
    { label: lang === 'ar' ? 'التوازن' : 'Equilibrium', value: metricPercent(metrics.equilibriumScore), color: '#00F5FF' },
    { label: lang === 'ar' ? 'الضغط' : 'Overload', value: metricPercent(metrics.overloadIndex), color: '#FF8C7C' },
    { label: lang === 'ar' ? 'الوضوح' : 'Clarity', value: metricPercent(metrics.clarityDelta), color: '#FF00E5' },
  ];

  metricCards.forEach((item, index) => {
    const x = 56 + (index * 194);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(x, 126, 166, 82, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.font = '500 16px Arial';
    ctx.fillText(item.label, x + 18, 144);
    ctx.fillStyle = item.color;
    ctx.font = '700 28px Arial';
    ctx.fillText(item.value, x + 18, 170);
  });

  const boxY = height - 188;
  ctx.fillStyle = 'rgba(8,18,31,0.82)';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(44, boxY, width - 88, 120, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 18px Arial';
  ctx.fillText(lang === 'ar' ? 'ليه اللحظة دي؟' : 'Why Now', 68, boxY + 20);
  ctx.fillStyle = 'rgba(235,242,255,0.92)';
  ctx.font = '500 23px Arial';

  const reason = step?.reason || (lang === 'ar' ? 'لا يوجد وصف مسجل لهذه اللحظة.' : 'No reason captured for this moment.');
  const words = reason.split(/\s+/);
  let line = '';
  let y = boxY + 54;
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width - 136) {
      ctx.fillText(line, 68, y);
      line = word;
      y += 30;
    } else {
      line = next;
    }
  });
  if (line) ctx.fillText(line, 68, y);

  const progress = totalSteps > 1 ? stepIndex / (totalSteps - 1) : 1;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(56, height - 36, width - 112, 8, 999);
  ctx.fill();
  const progressGradient = ctx.createLinearGradient(56, 0, width - 56, 0);
  progressGradient.addColorStop(0, '#00F5FF');
  progressGradient.addColorStop(0.5, '#00FF41');
  progressGradient.addColorStop(1, '#FF00E5');
  ctx.fillStyle = progressGradient;
  ctx.beginPath();
  ctx.roundRect(56, height - 36, (width - 112) * progress, 8, 999);
  ctx.fill();
};

const exportReplayVideo = async ({ steps, lang }) => {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error(lang === 'ar' ? 'تصدير الفيديو غير مدعوم في هذا المتصفح.' : 'Video export is not supported in this browser.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') {
    throw new Error(lang === 'ar' ? 'التسجيل غير مدعوم في هذا المتصفح.' : 'Recording is not supported in this browser.');
  }

  const mimeType = chooseReplayMimeType();
  if (!mimeType) {
    throw new Error(lang === 'ar' ? 'صيغة الفيديو غير مدعومة هنا.' : 'No supported export format was found.');
  }

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onerror = () => reject(new Error(lang === 'ar' ? 'فشل تسجيل الفيديو.' : 'Video recording failed.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start(200);

  for (let index = 0; index < steps.length; index += 1) {
    drawExportFrame({ ctx, width: canvas.width, height: canvas.height, step: steps[index], stepIndex: index, totalSteps: steps.length, lang });
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    const rawDelay = nextStep ? Math.max(900, (Number(nextStep?.atMs) || 0) - (Number(currentStep?.atMs) || 0)) : 1300;
    const delayMs = clamp(Math.round(rawDelay * 0.4), 800, 1800);
    await sleep(delayMs);
  }

  recorder.stop();
  const blob = await stopped;
  stream.getTracks().forEach((track) => track.stop());
  return blob;
};

function SessionReplayPlayer({ replayData, lang = 'ar' }) {
  const steps = useMemo(() => Array.isArray(replayData?.steps) ? replayData.steps : [], [replayData]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(steps.length > 1);
  }, [steps]);

  useEffect(() => {
    if (!isPlaying || steps.length <= 1 || currentIndex >= steps.length - 1) return undefined;
    const currentStep = steps[currentIndex];
    const nextStep = steps[currentIndex + 1];
    const rawDelay = Math.max(800, (Number(nextStep?.atMs) || 0) - (Number(currentStep?.atMs) || 0));
    const delayMs = clamp(Math.round(rawDelay * 0.55), 700, 1800);
    const timer = window.setTimeout(() => {
      setCurrentIndex((index) => Math.min(index + 1, steps.length - 1));
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [currentIndex, isPlaying, steps]);

  useEffect(() => {
    if (currentIndex >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, steps.length]);

  const currentStep = steps[currentIndex] || null;
  const totalDurationMs = steps[steps.length - 1]?.atMs || 0;
  const labels = DEFAULT_LABELS[lang] || DEFAULT_LABELS.en;

  const nodes = useMemo(() => {
    const byId = new Map((currentStep?.nodes || []).map((node) => [Number(node.id), node]));
    return [1, 2, 3].map((id) => {
      const node = byId.get(id) || {};
      return {
        id,
        label: node.label || labels[id],
        radius: clamp(Number(node.radius) || 60, 30, 100),
        color: typeof node.color === 'string' ? node.color : (id === 1 ? '#00F5FF' : id === 2 ? '#00FF41' : '#FF00E5'),
        ...NODE_POSITIONS[id],
      };
    });
  }, [currentStep, labels]);

  const progress = steps.length > 1 ? currentIndex / (steps.length - 1) : 1;

  const togglePlayback = () => {
    if (steps.length <= 1) return;
    if (currentIndex >= steps.length - 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((value) => !value);
  };

  const handleExportVideo = async () => {
    if (steps.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportReplayVideo({ steps, lang });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `dawayir-replay-${Date.now()}.webm`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (steps.length === 0) {
    return (
      <section className="session-replay-section empty">
        <div className="session-replay-empty">
          <strong>{lang === 'ar' ? 'إعادة الجلسة غير متاحة' : 'Replay unavailable'}</strong>
          <p>{lang === 'ar' ? 'افتح تقرير أحدث أو احفظ الجلسة بعد التفاعل عشان إعادة الجلسة تظهر كاملة.' : 'Open a newer report or save the session after interaction to unlock replay.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="session-replay-section">
      <div className="session-replay-header">
        <div>
          <h3>{lang === 'ar' ? 'إعادة الجلسة' : 'Session Replay'}</h3>
          <p>
            {lang === 'ar'
              ? `اتسجل ${steps.length} لحظة خلال ${formatDuration(totalDurationMs, lang)}`
              : `${steps.length} captured moments across ${formatDuration(totalDurationMs, lang)}`}
          </p>
        </div>
        <button className="replay-control-btn export" onClick={handleExportVideo} disabled={isExporting}>
          {isExporting ? (lang === 'ar' ? 'بنجهز الفيديو...' : 'Exporting...') : (lang === 'ar' ? 'نزّل فيديو' : 'Export Video')}
        </button>
        <button className="replay-control-btn" onClick={togglePlayback} disabled={isExporting}>
          {isPlaying ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (currentIndex >= steps.length - 1 ? (lang === 'ar' ? 'شغّل من الأول' : 'Replay') : (lang === 'ar' ? 'تشغيل' : 'Play'))}
        </button>
      </div>

      <div className="session-replay-shell">
        <div className="session-replay-canvas">
          <svg viewBox="0 0 100 100" className="session-replay-svg" aria-label={lang === 'ar' ? 'إعادة تمثيل الدوائر' : 'Circle replay canvas'}>
            <defs>
              <filter id="replayGlow">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[1].x} y2={nodes[1].y} className="replay-link" />
            <line x1={nodes[1].x} y1={nodes[1].y} x2={nodes[2].x} y2={nodes[2].y} className="replay-link" />
            <line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[2].x} y2={nodes[2].y} className="replay-link replay-link-faint" />

            {nodes.map((node) => {
              const svgRadius = 6 + ((node.radius - 30) / 70) * 11;
              const isFocused = Number(currentStep?.focusId) === node.id;
              return (
                <g key={node.id} className={`replay-node ${isFocused ? 'focused' : ''}`} style={{ '--replay-color': node.color }}>
                  <circle cx={node.x} cy={node.y} r={svgRadius + 2.2} className="replay-node-glow" />
                  <circle cx={node.x} cy={node.y} r={svgRadius} className="replay-node-core" filter="url(#replayGlow)" />
                  <circle cx={node.x - (svgRadius * 0.32)} cy={node.y - (svgRadius * 0.32)} r={Math.max(1.4, svgRadius * 0.18)} className="replay-node-shine" />
                  <text x={node.x} y={node.y + 0.8} className="replay-node-label">{node.label}</text>
                </g>
              );
            })}
          </svg>

          <div className="session-replay-progress">
            <div className="session-replay-progress-bar" style={{ transform: `scaleX(${progress || 0})` }} />
          </div>
        </div>

        <div className="session-replay-inspector">
          <div className="session-replay-meta">
            <span>{lang === 'ar' ? `الخطوة ${currentIndex + 1}/${steps.length}` : `Step ${currentIndex + 1}/${steps.length}`}</span>
            <strong>{formatDuration(currentStep?.atMs || 0, lang)}</strong>
          </div>

          <p className="session-replay-reason">
            {currentStep?.reason || (lang === 'ar' ? 'مفيش وصف للحظة دي.' : 'No reason captured for this moment.')}
          </p>

          <div className="session-replay-tags">
            <span>{currentStep?.source || 'agent'}</span>
            <span>{currentStep?.policy || 'IDLE'}</span>
            <span>{currentStep?.metric || 'turn'}</span>
          </div>

          <div className="session-replay-metrics">
            <div>
              <small>{lang === 'ar' ? 'التوازن' : 'Equilibrium'}</small>
              <strong>{metricPercent(currentStep?.metrics?.equilibriumScore)}</strong>
            </div>
            <div>
              <small>{lang === 'ar' ? 'الضغط' : 'Overload'}</small>
              <strong>{metricPercent(currentStep?.metrics?.overloadIndex)}</strong>
            </div>
            <div>
              <small>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</small>
              <strong>{metricPercent(currentStep?.metrics?.clarityDelta)}</strong>
            </div>
          </div>

          <div className="session-replay-timeline">
            {steps.map((step, index) => (
              <button
                key={`${step.atMs}-${index}`}
                type="button"
                className={`session-replay-dot ${index === currentIndex ? 'is-active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(false);
                }}
                title={`${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SessionReplayPlayer;

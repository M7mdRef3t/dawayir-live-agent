import React, { useMemo } from 'react';

const STORAGE_KEY = 'dawayir_growth_arc';

export function recordSessionSnapshot(snapshot) {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const entry = {
      ...snapshot,
      ts: Date.now(),
    };
    history.push(entry);
    if (history.length > 20) history.splice(0, history.length - 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors so the session flow keeps working.
  }
}

export function getGrowthHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function GrowthArc({ lang = 'ar' }) {
  const history = useMemo(() => getGrowthHistory(), []);

  if (history.length < 2) {
    return (
      <div className="growth-arc-empty">
        <span aria-hidden="true">🌱</span>
        <p>{lang === 'ar' ? 'ابدأ جلستين لترى مسيرة تطورك' : 'Complete 2 sessions to see your growth arc'}</p>
      </div>
    );
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const clarityDelta = Math.round((latest.clarityScore || 70) - (previous.clarityScore || 65));
  const truthDelta = Math.round(((latest.truthRatio || 0.33) - (previous.truthRatio || 0.25)) * 100);
  const awarenessDelta = Math.round(((latest.awarenessRatio || 0.33) - (previous.awarenessRatio || 0.4)) * 100);

  const sparkPoints = history.slice(-8).map((entry, index) => ({
    i: index,
    v: entry.clarityScore || (60 + Math.random() * 30),
  }));
  const maxValue = Math.max(...sparkPoints.map((point) => point.v));
  const minValue = Math.min(...sparkPoints.map((point) => point.v));
  const range = maxValue - minValue || 1;
  const width = 180;
  const height = 36;
  const points = sparkPoints.map((point, index) => {
    const x = (index / Math.max(1, sparkPoints.length - 1)) * width;
    const y = height - ((point.v - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const deltaColor = (delta) => (delta > 0 ? '#2ECC71' : delta < 0 ? '#FF5032' : '#888');
  const deltaSign = (delta) => (delta > 0 ? '↑' : delta < 0 ? '↓' : '→');

  return (
    <div className="growth-arc-panel">
      <div className="growth-arc-header">
        <span className="growth-arc-icon" aria-hidden="true">📈</span>
        <div>
          <h4 className="growth-arc-title">
            {lang === 'ar' ? 'مسيرة التطور الإدراكي' : 'Cognitive Growth Arc'}
          </h4>
          <p className="growth-arc-sub">
            {lang === 'ar' ? `${history.length} جلسة مسجلة` : `${history.length} sessions recorded`}
          </p>
        </div>
      </div>

      <div className="growth-sparkline-wrap">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="growth-sparkline"
          role="img"
          aria-label={lang === 'ar'
            ? 'مخطط يوضح تغير الوضوح عبر آخر الجلسات'
            : 'Sparkline showing clarity changes across recent sessions'}
        >
          <polyline
            points={points}
            fill="none"
            stroke="url(#spark-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38B2D8" />
              <stop offset="50%" stopColor="#2ECC71" />
              <stop offset="100%" stopColor="#9B59B6" />
            </linearGradient>
          </defs>
          {sparkPoints.length > 0 && (
            <circle
              cx={width}
              cy={height - ((sparkPoints[sparkPoints.length - 1].v - minValue) / range) * height}
              r="4"
              fill="#9B59B6"
            />
          )}
        </svg>
        <span className="sparkline-label">
          {lang === 'ar' ? 'الوضوح عبر الجلسات' : 'Clarity over sessions'}
        </span>
      </div>

      <div className="growth-deltas">
        <div className="growth-delta-card">
          <span className="gdelta-label">{lang === 'ar' ? 'الوضوح' : 'Clarity'}</span>
          <strong className="gdelta-val" style={{ color: deltaColor(clarityDelta) }}>
            {deltaSign(clarityDelta)}{Math.abs(clarityDelta)}%
          </strong>
        </div>
        <div className="growth-delta-card">
          <span className="gdelta-label">{lang === 'ar' ? 'الحقيقة' : 'Truth'}</span>
          <strong className="gdelta-val" style={{ color: deltaColor(truthDelta) }}>
            {deltaSign(truthDelta)}{Math.abs(truthDelta)}pt
          </strong>
        </div>
        <div className="growth-delta-card">
          <span className="gdelta-label">{lang === 'ar' ? 'الوعي' : 'Awareness'}</span>
          <strong className="gdelta-val" style={{ color: deltaColor(-awarenessDelta) }}>
            {deltaSign(-awarenessDelta)}{Math.abs(awarenessDelta)}pt
          </strong>
        </div>
      </div>

      <p className="growth-insight">
        {lang === 'ar'
          ? clarityDelta > 0
            ? `🌟 وضوحك ارتفع ${clarityDelta}٪، وعقلك ينضج جلسة بعد جلسة`
            : '💡 كل جلسة تبني وعيك، والوضوح قادم'
          : clarityDelta > 0
            ? `🌟 Clarity is up ${clarityDelta}% and your mind keeps maturing`
            : '💡 Each session builds awareness, and clarity is on the way'}
      </p>
    </div>
  );
}

export default GrowthArc;

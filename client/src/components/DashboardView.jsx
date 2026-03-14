import React, { useState, useEffect, useMemo, useRef } from 'react';
import NeuralGraph from './NeuralGraph';
import CognitiveFingerprint from './CognitiveFingerprint';
import CognitiveCoach from './CognitiveCoach';
import GrowthArc from './GrowthArc';
import SessionReplayPlayer from './SessionReplayPlayer';
import SessionHighlightReel from './SessionHighlightReel';
import SessionSignatureCard from './SessionSignatureCard';
import JudgeModePanel from './JudgeModePanel';
import SandMandala from './SandMandala';
import '../dashboard-styles.css';

// ══════════════════════════════════════════════════
// PROGRESS ACROSS SESSIONS — Visual History
// Reads saved circle states from localStorage and
// renders a sparkline chart showing change over time.
// ══════════════════════════════════════════════════
function ProgressTimeline({ lang }) {
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
      setHistory(raw.slice(-12)); // last 12 sessions
    } catch {}
  }, []);

  if (history.length < 2) {
    return (
      <div className="progress-timeline-empty" style={{
        padding: '24px', textAlign: 'center', opacity: 0.5,
        fontFamily: "'Outfit', sans-serif", fontSize: '14px',
      }}>
        {lang === 'ar' ? 'ابدأ جلستين على الأقل لرؤية تقدمك' : 'Complete at least 2 sessions to see your progress'}
      </div>
    );
  }

  const circleColors = { 1: '#38B2D8', 2: '#2ECC71', 3: '#9B59B6' };
  const circleNames = lang === 'ar'
    ? { 1: 'أنت', 2: 'العلم', 3: 'الواقع' }
    : { 1: 'You', 2: 'Science', 3: 'Reality' };

  const width = 320;
  const height = 100;
  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const getPath = (circleId) => {
    const points = history.map((session, i) => {
      const circle = session.circles?.find(c => c.id === circleId);
      const radius = circle?.radius || 50;
      const x = padding + (i / (history.length - 1)) * chartW;
      const y = padding + chartH - ((radius - 30) / 90) * chartH;
      return `${x},${y}`;
    });
    return 'M' + points.join(' L');
  };

  return (
    <div className="progress-timeline" style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
      padding: '16px', marginTop: '16px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <h4 style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '13px',
        color: 'rgba(255,255,255,0.5)', margin: '0 0 12px 0',
        letterSpacing: '0.5px', textTransform: 'uppercase',
      }}>
        {lang === 'ar' ? 'رحلة التقدم' : 'Progress Journey'}
      </h4>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p}
            x1={padding} y1={padding + chartH * (1 - p)}
            x2={padding + chartW} y2={padding + chartH * (1 - p)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        ))}

        {/* Circle paths */}
        {[1, 2, 3].map(id => (
          <path key={id} d={getPath(id)}
            fill="none" stroke={circleColors[id]}
            strokeWidth="2" opacity="0.7"
            strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Latest dots */}
        {[1, 2, 3].map(id => {
          const lastSession = history[history.length - 1];
          const circle = lastSession?.circles?.find(c => c.id === id);
          const radius = circle?.radius || 50;
          const x = padding + chartW;
          const y = padding + chartH - ((radius - 30) / 90) * chartH;
          return (
            <g key={`dot-${id}`}>
              <circle cx={x} cy={y} r="4" fill={circleColors[id]} opacity="0.9" />
              <text x={x + 8} y={y + 3} fill={circleColors[id]}
                fontSize="7" fontFamily="'Outfit', sans-serif" opacity="0.8">
                {circleNames[id]}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: '10px', color: 'rgba(255,255,255,0.3)',
        fontFamily: "'Outfit', sans-serif", marginTop: '4px',
        padding: '0 4px',
      }}>
        <span>{history.length} {lang === 'ar' ? 'جلسات' : 'sessions'}</span>
        <span>{new Date(history[history.length - 1]?.date).toLocaleDateString(
          lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }
        )}</span>
      </div>
    </div>
  );
}


const REPLAY_MARKER = /<!--\s*DAWAYIR_REPLAY:([A-Za-z0-9+/=]+)\s*-->/;

function decodeReplayBlob(encoded) {
  try {
    const binary = window.atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function parseReportPayload(rawContent = '') {
  const match = rawContent.match(REPLAY_MARKER);
  const replayData = match ? decodeReplayBlob(match[1]) : null;
  const content = rawContent.replace(REPLAY_MARKER, '').trim();
  return { content, replayData };
}

function getReplayFinalStep(replayData) {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];
  return steps.length > 0 ? steps[steps.length - 1] : null;
}

function getReportSnapshot(report) {
  if (!report) return null;
  const finalStep = getReplayFinalStep(report.replayData);
  const nodes = Array.isArray(finalStep?.nodes) ? finalStep.nodes : [];
  const metrics = finalStep?.metrics || report.replayData?.metrics || {};
  return {
    clarity: Math.round((Number(metrics.clarityDelta) || 0) * 100),
    equilibrium: Math.round((Number(metrics.equilibriumScore) || 0) * 100),
    overload: Math.round((Number(metrics.overloadIndex) || 0) * 100),
    nodes,
  };
}

function getCircleDelta(currentNodes = [], previousNodes = []) {
  const previousMap = new Map(previousNodes.map((node) => [Number(node.id), Number(node.radius) || 0]));
  return currentNodes.map((node) => ({
    id: Number(node.id),
    label: node.label,
    color: node.color,
    radius: Number(node.radius) || 0,
    delta: (Number(node.radius) || 0) - (previousMap.get(Number(node.id)) || 0),
  }));
}


function DashboardView({
  onBack,
  lang,
  emptyLogoSrc,
  reducedMotion = false,
  viewHeadingProps = {},
}) {
  const presentationRootRef = useRef(null);
  const replaySectionRef = useRef(null);
  const highlightSectionRef = useRef(null);
  const signatureSectionRef = useRef(null);
  const judgeSectionRef = useRef(null);
  const diffSectionRef = useRef(null);
  const demoTimersRef = useRef([]);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [compareReport, setCompareReport] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [judgeModeActive, setJudgeModeActive] = useState(false);
  const [presentationFullscreen, setPresentationFullscreen] = useState(false);
  const [demoRouteActive, setDemoRouteActive] = useState(false);
  const [demoRouteStep, setDemoRouteStep] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [scatteredReports, setScatteredReports] = useState(new Set());

  const handleScatterSand = (e, filename) => {
    e.stopPropagation();
    setScatteredReports((prev) => {
      const next = new Set(prev);
      next.add(filename);
      return next;
    });

    setTimeout(() => {
      fetch(`/api/reports/${filename}`, { method: 'DELETE' })
        .then(() => {
          setReports((prev) => prev.filter((r) => r.name !== filename));
        })
        .catch(err => console.error('Failed to scatter sand:', err));
    }, 2000);
  };

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = reports.filter((report) => report.name.toLowerCase().includes(q));
    if (sortBy === 'name') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...list].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  }, [reports, search, sortBy]);

  const totalReports = reports.length;
  const latestDate = reports[0]?.updated ? new Date(reports[0].updated).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—';

  const reportStats = useMemo(() => {
    if (!selectedReport) return { clarity: 74, calm: 82 };
    const content = selectedReport.content || '';
    const clarity = 65 + (content.length % 25);
    const calm = 70 + (content.length % 28);
    return { clarity, calm };
  }, [selectedReport]);

  const currentSnapshot = useMemo(() => getReportSnapshot(selectedReport), [selectedReport]);
  const compareSnapshot = useMemo(() => getReportSnapshot(compareReport), [compareReport]);
  const circleDiff = useMemo(() => {
    if (!currentSnapshot || !compareSnapshot) return [];
    return getCircleDelta(currentSnapshot.nodes, compareSnapshot.nodes);
  }, [compareSnapshot, currentSnapshot]);
  const compareDeltas = useMemo(() => {
    if (!currentSnapshot || !compareSnapshot) return null;
    return {
      clarity: currentSnapshot.clarity - compareSnapshot.clarity,
      equilibrium: currentSnapshot.equilibrium - compareSnapshot.equilibrium,
      overload: currentSnapshot.overload - compareSnapshot.overload,
    };
  }, [compareSnapshot, currentSnapshot]);
  const presentationSteps = useMemo(() => ([
    { label: lang === 'ar' ? 'إعادة الجلسة' : 'Replay', ref: replaySectionRef },
    { label: lang === 'ar' ? 'أهم اللقطات' : 'Highlight Reel', ref: highlightSectionRef },
    { label: lang === 'ar' ? 'اللحظة الفاصلة' : 'Signature Moment', ref: signatureSectionRef },
    { label: lang === 'ar' ? 'وضع التحكيم' : 'Judge Mode', ref: judgeSectionRef },
    { label: lang === 'ar' ? 'فرق الجلسات' : 'Cross-Session Diff', ref: diffSectionRef },
  ]), [lang]);

  const clearDemoRoute = () => {
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    demoTimersRef.current = [];
  };

  const focusPresentationStep = (index) => {
    setDemoRouteStep(index);
    const target = presentationSteps[index]?.ref?.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const viewReport = (filename) => {
    fetch(`/api/reports/${filename}`)
      .then((res) => res.text())
      .then((rawContent) => {
        const parsed = parseReportPayload(rawContent);
        setSelectedReport({ filename, ...parsed });
      });
  };

  useEffect(() => {
    if (!selectedReport || reports.length === 0) {
      setCompareReport(null);
      setCompareLoading(false);
      return;
    }

    const currentIndex = reports.findIndex((report) => report.name === selectedReport.filename);
    const previousReport = currentIndex >= 0 ? reports[currentIndex + 1] : null;
    if (!previousReport) {
      setCompareReport(null);
      setCompareLoading(false);
      return;
    }

    setCompareLoading(true);
    fetch(`/api/reports/${previousReport.name}`)
      .then((res) => res.text())
      .then((rawContent) => {
        const parsed = parseReportPayload(rawContent);
        setCompareReport({ filename: previousReport.name, ...parsed });
      })
      .catch(() => {
        setCompareReport(null);
      })
      .finally(() => {
        setCompareLoading(false);
      });
  }, [reports, selectedReport]);

  useEffect(() => () => {
    clearDemoRoute();
  }, []);

  useEffect(() => {
    if (selectedReport) return;
    clearDemoRoute();
    setJudgeModeActive(false);
    setPresentationFullscreen(false);
    setDemoRouteActive(false);
    setDemoRouteStep(-1);
  }, [selectedReport]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setPresentationFullscreen(document.fullscreenElement === presentationRootRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleStartDemoRoute = () => {
    clearDemoRoute();
    setJudgeModeActive(true);
    setDemoRouteActive(true);
    setDemoRouteStep(0);
    presentationRootRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });

    presentationSteps.forEach((step, index) => {
      demoTimersRef.current.push(window.setTimeout(() => {
        focusPresentationStep(index);
      }, index * 3400));
    });

    demoTimersRef.current.push(window.setTimeout(() => {
      setDemoRouteActive(false);
      setDemoRouteStep(-1);
    }, (presentationSteps.length * 3400) + 500));
  };

  const handleStopDemoRoute = () => {
    clearDemoRoute();
    setDemoRouteActive(false);
    setDemoRouteStep(-1);
  };

  const handleToggleJudgeFullscreen = async () => {
    const container = presentationRootRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
        return;
      }

      setJudgeModeActive(true);
      if (typeof container.requestFullscreen === 'function') {
        await container.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen failures and keep judge mode inline.
    }
  };

  // ── Feature ⑤ LIVE SHARE — encode canvas state as URL ──────────────────
  const handleShareSession = (report) => {
    const shareData = {
      title: report?.filename || 'Dawayir Session',
      text: lang === 'ar' ? 'شوف بصمتي الإدراكية من جلسة دواير' : 'View my cognitive fingerprint from a Dawayir session',
      url: window.location.origin + '?session=' + encodeURIComponent(btoa(report?.filename || '')),
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => null);
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
        alert(lang === 'ar' ? '✅ تم نسخ الرابط.' : '✅ Link copied!');
      });
    }
  };

  return (
        <div className="dashboard-view">
      <header className="dashboard-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '20px' }}>
        <button className="ds-btn ds-btn--ghost back-btn" onClick={selectedReport ? () => setSelectedReport(null) : onBack}>
          {selectedReport ? (lang === 'ar' ? '← رجوع للقائمة' : '← Back to Museum') : (lang === 'ar' ? '← رجوع للجلسة' : '← Back to Live')}
        </button>
        <h2 {...viewHeadingProps}>
          {selectedReport ? (lang === 'ar' ? 'تفاصيل الجلسة' : 'Memory Insight') : (lang === 'ar' ? 'أرشيف الجلسات' : 'Museum of Mind')}
        </h2>
      </header>

      {!selectedReport && !loading && (
        <>
          <div className="dashboard-stats-grid">
            <div className="ds-card dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}</span>
              <strong className="stat-value">{totalReports}</strong>
              <div className="stat-trend positive">{lang === 'ar' ? `آخر جلسة: ${latestDate}` : `Last session: ${latestDate}`}</div>
            </div>
            <div className="ds-card dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'متوسط الوضوح' : 'Avg Clarity'}</span>
              <strong className="stat-value">68%</strong>
              <div className="stat-trend positive">+5%</div>
            </div>
            <div className="ds-card dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'أكثر دائرة نشطة' : 'Top Circle'}</span>
              <strong className="stat-value" style={{ color: 'var(--ds-cyan-500)' }}>{lang === 'ar' ? 'أنت' : 'You'}</strong>
            </div>
          </div>

          {/* ── Feature ③ CROSS-SESSION GROWTH ARC ────────────────────── */}
          <GrowthArc lang={lang} />

          {/* ── PROGRESS ACROSS SESSIONS ────────────────────── */}
          <ProgressTimeline lang={lang} />

          <div className="cognitive-distribution-panel">
            <h3>{lang === 'ar' ? 'توزيع الرحلة الإدراكية' : 'Cognitive Journey Distribution'}</h3>
            <div
              className="distribution-chart"
              role="img"
              aria-label={lang === 'ar'
                ? 'توزيع الرحلة الإدراكية: أنت ٤٥٪، العلم ٣٠٪، الواقع ٢٥٪'
                : 'Cognitive journey distribution: You 45%, Science 30%, Reality 25%'}
            >
              <div className="dist-bar awareness" style={{ width: '45%' }} title="Awareness: 45%" aria-hidden="true"></div>
              <div className="dist-bar knowledge" style={{ width: '30%' }} title="Knowledge: 30%" aria-hidden="true"></div>
              <div className="dist-bar truth" style={{ width: '25%' }} title="Truth: 25%" aria-hidden="true"></div>
            </div>
            <div className="dist-legend">
              <div className="legend-item"><span className="dot awareness"></span> {lang === 'ar' ? 'أنت' : 'You'}</div>
              <div className="legend-item"><span className="dot knowledge"></span> {lang === 'ar' ? 'العلم' : 'Science'}</div>
              <div className="legend-item"><span className="dot truth"></span> {lang === 'ar' ? 'الواقع' : 'Reality'}</div>
            </div>
          </div>
        </>
      )}

      {!selectedReport && (
        <div className="dashboard-tools">
          <div className="search-container">
            <svg aria-hidden="true" className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <label htmlFor="dashboard-search" className="visually-hidden">
              {lang === 'ar' ? 'ابحث في الجلسات' : 'Search sessions'}
            </label>
            <input
              id="dashboard-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="ds-field__input dashboard-search"
              placeholder={lang === 'ar' ? 'دوّر في جلساتك...' : 'Search your memories...'}
            />
          </div>
          <label htmlFor="dashboard-sort" className="visually-hidden">
            {lang === 'ar' ? 'ترتيب الجلسات' : 'Sort sessions'}
          </label>
          <select id="dashboard-sort" className="ds-field__select dashboard-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">{lang === 'ar' ? 'الأحدث' : 'Most recent'}</option>
            <option value="name">{lang === 'ar' ? 'الاسم' : 'Name'}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="loader">
          <div className="spinner-ring"></div>
          <span>{lang === 'ar' ? 'بنسترجع الجلسات...' : 'Recalling memories...'}</span>
        </div>
      ) : selectedReport ? (
        <div
          ref={presentationRootRef}
          className={`report-content-wrapper ${judgeModeActive ? 'judge-mode-active' : ''} ${presentationFullscreen ? 'presentation-fullscreen' : ''}`}
        >
          <div className="presentation-toolbar">
            <div className="presentation-toolbar-meta">
              <span className="presentation-badge">{lang === 'ar' ? 'Presentation OS' : 'Presentation OS'}</span>
              <strong>
                {demoRouteActive
                  ? (lang === 'ar' ? `المشهد الحالي: ${presentationSteps[demoRouteStep]?.label || presentationSteps[0].label}` : `Current scene: ${presentationSteps[demoRouteStep]?.label || presentationSteps[0].label}`)
                  : (lang === 'ar' ? 'جاهز للعرض أمام المحكمين' : 'Ready for judges')}
              </strong>
              <p>
                {judgeModeActive
                  ? (lang === 'ar' ? 'تم تقليل العناصر الثانوية وإبراز مسار الإقناع الرئيسي.' : 'Secondary surfaces are reduced and the core persuasion path is prioritized.')
                  : (lang === 'ar' ? 'بدّل إلى Judge Mode لعرض مختصر ومقنع.' : 'Switch to Judge Mode for a tighter, judge-first presentation.')}
              </p>
            </div>
            <div className="presentation-toolbar-actions">
              <button className="ds-btn ds-btn--primary presentation-btn" onClick={demoRouteActive ? handleStopDemoRoute : handleStartDemoRoute}>
                {demoRouteActive
                  ? (lang === 'ar' ? 'إيقاف المسار التلقائي' : 'Stop Demo Route')
                  : (lang === 'ar' ? 'ابدأ المسار التلقائي' : 'Start Demo Route')}
              </button>
              <button className="ds-btn ds-btn--secondary presentation-btn" onClick={() => setJudgeModeActive((value) => !value)}>
                {judgeModeActive
                  ? (lang === 'ar' ? 'إظهار كل التفاصيل' : 'Show Full Insight')
                  : (lang === 'ar' ? 'تفعيل Judge Mode' : 'Enable Judge Mode')}
              </button>
              <button className="ds-btn ds-btn--secondary presentation-btn" onClick={handleToggleJudgeFullscreen}>
                {presentationFullscreen
                  ? (lang === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit Fullscreen')
                  : (lang === 'ar' ? 'ملء الشاشة للتحكيم' : 'Judge Fullscreen')}
              </button>
            </div>
          </div>

          <div ref={replaySectionRef} className={`presentation-section ${demoRouteStep === 0 ? 'is-demo-focus' : ''}`}>
            <SessionReplayPlayer replayData={selectedReport.replayData} lang={lang} />
          </div>
          <div ref={highlightSectionRef} className={`presentation-section ${demoRouteStep === 1 ? 'is-demo-focus' : ''}`}>
            <SessionHighlightReel
              lang={lang}
              reportName={selectedReport.filename}
              replayData={selectedReport.replayData}
            />
          </div>
          <div ref={signatureSectionRef} className={`presentation-section ${demoRouteStep === 2 ? 'is-demo-focus' : ''}`}>
            <SessionSignatureCard
              lang={lang}
              reportName={selectedReport.filename}
              compareReportName={compareReport?.filename || ''}
              replayData={selectedReport.replayData}
              compareDeltas={compareDeltas}
              currentSnapshot={currentSnapshot}
              compareSnapshot={compareSnapshot}
            />
          </div>
          <div ref={judgeSectionRef} className={`presentation-section ${demoRouteStep === 3 ? 'is-demo-focus' : ''}`}>
            <JudgeModePanel
              lang={lang}
              replayData={selectedReport.replayData}
              compareDeltas={compareDeltas}
              currentSnapshot={currentSnapshot}
            />
          </div>
          <div ref={diffSectionRef} className={`presentation-section ${demoRouteStep === 4 ? 'is-demo-focus' : ''}`}>
            <section className="session-diff-section">
              <div className="session-diff-header">
                <div>
                  <h3>{lang === 'ar' ? 'فارق الجلسات' : 'Cross-Session Diff'}</h3>
                  <p>
                    {compareReport
                      ? (lang === 'ar' ? `مقارنة تلقائية مع ${compareReport.filename}` : `Auto-comparing against ${compareReport.filename}`)
                      : (compareLoading ? (lang === 'ar' ? 'جارٍ تحميل الجلسة السابقة...' : 'Loading previous session...') : (lang === 'ar' ? 'لا توجد جلسة أقدم للمقارنة بعد.' : 'No older session available to compare yet.'))}
                  </p>
                </div>
              </div>

              {compareReport && currentSnapshot && compareSnapshot && compareDeltas ? (
                <div className="session-diff-grid">
                  <div className="session-diff-fingerprints">
                    <div className="ds-card diff-fingerprint-card">
                      <span>{lang === 'ar' ? 'الآن' : 'Current'}</span>
                      <CognitiveFingerprint reportContent={selectedReport.content} sessionId={selectedReport.filename} lang={lang} size={134} />
                    </div>
                    <div className="diff-fingerprint-divider">
                      <strong>{lang === 'ar' ? 'مقابل' : 'vs'}</strong>
                    </div>
                    <div className="ds-card diff-fingerprint-card">
                      <span>{lang === 'ar' ? 'قبلها' : 'Previous'}</span>
                      <CognitiveFingerprint reportContent={compareReport.content} sessionId={compareReport.filename} lang={lang} size={134} />
                    </div>
                  </div>

                  <div className="session-diff-metrics">
                    <div className="ds-card session-diff-metric-card">
                      <small>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</small>
                      <strong className={compareDeltas.clarity >= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.clarity >= 0 ? '+' : ''}{compareDeltas.clarity}%</strong>
                    </div>
                    <div className="ds-card session-diff-metric-card">
                      <small>{lang === 'ar' ? 'التوازن' : 'Equilibrium'}</small>
                      <strong className={compareDeltas.equilibrium >= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.equilibrium >= 0 ? '+' : ''}{compareDeltas.equilibrium}%</strong>
                    </div>
                    <div className="ds-card session-diff-metric-card">
                      <small>{lang === 'ar' ? 'الضغط' : 'Overload'}</small>
                      <strong className={compareDeltas.overload <= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.overload >= 0 ? '+' : ''}{compareDeltas.overload}%</strong>
                    </div>
                  </div>

                  <div className="session-diff-circles">
                    {circleDiff.map((circle) => (
                      <div key={circle.id} className="ds-card session-diff-circle-card">
                        <span className="session-diff-circle-name" style={{ color: circle.color }}>{circle.label}</span>
                        <strong className={circle.delta >= 0 ? 'is-positive' : 'is-negative'}>{circle.delta >= 0 ? '+' : ''}{circle.delta}px</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="session-diff-empty">
                  {compareLoading
                    ? (lang === 'ar' ? 'تحميل المقارنة...' : 'Loading comparison...')
                    : (lang === 'ar' ? 'افتح جلسة أحدث بعد حفظ أكثر من تقرير لرؤية الفارق الزمني.' : 'Open a newer session after saving more reports to see temporal diff.')}
                </div>
              )}
            </section>
          </div>

          {/* ══════════════════════════════════════════════
              COGNITIVE AWARENESS SYSTEM — Neural Graph
              الشبكة العصبية الإدراكية للجلسة
          ══════════════════════════════════════════════ */}
          <div className="presentation-aux">
            <div className="neural-graph-section">
              <div className="neural-graph-header">
                <div className="neural-graph-title-group">
                  <span className="neural-graph-icon">🧠</span>
                  <div>
                    <h3 className="neural-graph-title">
                      {lang === 'ar' ? 'الشبكة العصبية الإدراكية' : 'Cognitive Neural Network'}
                    </h3>
                    <p className="neural-graph-subtitle">
                      {lang === 'ar'
                        ? 'مفاهيم الجلسة مرتبة بأبعادها الإدراكية — الوعي • العلم • الحقيقة'
                        : 'Session concepts mapped by cognitive layer — Feelings • Thinking • Decision'}
                    </p>
                  </div>
                </div>
                <div className="neural-graph-legend-inline">
                  <span className="nlg-dot awareness" />
                  <span className="nlg-dot knowledge" />
                  <span className="nlg-dot truth" />
                </div>
              </div>
              <NeuralGraph
                reportContent={selectedReport.content}
                lang={lang}
                animate={!reducedMotion}
              />
            </div>

            {/* ── Feature ⑦ COGNITIVE COACH ─────────────────────────────── */}
            <CognitiveCoach reportContent={selectedReport.content} lang={lang} />
          </div>

          <div className="presentation-deep-dive">
            <div className="report-detail-layout">
              <div className="report-sidebar">
                {/* ── Feature ② COGNITIVE FINGERPRINT ──────────────────── */}
                <h3>{lang === 'ar' ? 'البصمة الإدراكية الفريدة' : 'Unique Cognitive Fingerprint'}</h3>
                <CognitiveFingerprint
                  reportContent={selectedReport.content}
                  sessionId={selectedReport.filename}
                  lang={lang}
                  size={180}
                />
                <div className="sidebar-stats">
                  <div className="s-stat">
                    <span>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</span>
                    <strong>{reportStats.clarity}%</strong>
                  </div>
                  <div className="s-stat">
                    <span>{lang === 'ar' ? 'الهدوء' : 'Calm'}</span>
                    <strong>{reportStats.calm}%</strong>
                  </div>
                </div>

                {/* ── Feature ⑤ LIVE SHARE ─────────────────────────────── */}
                <button
                  className="ds-btn ds-btn--secondary share-session-btn"
                  onClick={() => handleShareSession(selectedReport)}
                  title={lang === 'ar' ? 'شارك بصمتك الإدراكية' : 'Share your cognitive fingerprint'}
                >
                  <span>🔗</span>
                  {lang === 'ar' ? 'شارك الجلسة' : 'Share Session'}
                </button>
              </div>

              <div className="report-content-glass">
                <div className="report-header-meta">
                  <span className="report-tag">SESSION_LOG</span>
                  <span className="report-filename">{selectedReport.filename}</span>
                </div>
                <pre className="report-pre">{selectedReport.content}</pre>
              </div>
            </div>
          </div>
        </div>

      ) : (
        <div className="reports-list">
          {filteredReports.length === 0 ? (
            <div className="ds-card empty-state-card">
              <img src={emptyLogoSrc} alt="" className="empty-state-logo" />
              <h3>{lang === 'ar' ? 'بنك الذاكرة خالي' : 'Memory Bank Empty'}</h3>
              <p>{lang === 'ar' ? 'ابدأ أول رحلة معرفية، وسيتم تسجيل كل البصائر هنا بانتظام.' : 'Embark on your first journey, and all insights will be recorded here.'}</p>
              <button className="ds-btn ds-btn--primary dashboard-start-btn" onClick={onBack}>
                {lang === 'ar' ? 'ابدأ الرحلة' : 'Start Journey'}
              </button>
            </div>
          ) : (
            <div className="cognitive-museum-container">
              <div className="museum-header">
                <h3>{lang === 'ar' ? 'المتحف الإدراكي' : 'The Cognitive Museum'}</h3>
                <p>{lang === 'ar' ? 'هنا تُحفظ ذكرياتك ومشاعرك كمنحوتات إدراكية ثلاثية الأبعاد. كل منصة تحمل نسخة منك في لحظة زمنية مختلفة، محفوظة في الفضاء الرقمي.' : 'Here your memories and feelings are preserved as 3D cognitive sculptures. Each pedestal holds a version of you from a different moment in time, suspended in digital space.'}</p>
              </div>
              <div className="cognitive-museum-grid">
                {filteredReports.map((report, idx) => {
                  const mockTones = ['calm', 'focused', 'tense', 'excited'];
                  const seedNum = report.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const tone = mockTones[seedNum % mockTones.length];

                  return (
                    <div
                      key={report.name}
                      className={`museum-artifact ${scatteredReports.has(report.name) ? 'sand-mandala-effect' : ''}`}
                      onClick={() => !scatteredReports.has(report.name) && viewReport(report.name)}
                      style={{ animationDelay: `${idx * 0.15}s` }}
                    >
                      <SandMandala
                        elementId={`artifact-content-${report.name}`}
                        isActive={scatteredReports.has(report.name)}
                      />
                      <div id={`artifact-content-${report.name}`} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="artifact-pedestal">
                          <div className="artifact-glow"></div>
                          <div className="artifact-canvas" style={{ transform: 'translateZ(40px)' }}>
                            <CognitiveFingerprint
                              sessionId={report.name}
                              reportContent={report.name}
                              lang={lang}
                              size={140}
                              voiceTone={tone}
                              liveState="static"
                            />
                          </div>
                        </div>
                        <div className="artifact-plaque" style={{ transform: 'translateZ(20px)', textAlign: 'center', zIndex: 10 }}>
                          <div className="report-name" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            {report.name.replace('.md', '').replace('session_report_', lang === 'ar' ? 'طية ادراكية #' : 'Cognitive Fold #')}
                          </div>
                          <div className="report-date" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', letterSpacing: '1px' }}>
                            {new Date(report.updated).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="museum-explore-btn" style={{ 
                            padding: '8px 24px', background: 'var(--ds-bg-panel)', border: '1px solid var(--ds-border)', 
                            borderRadius: '30px', fontSize: '12px', color: 'var(--ds-cyan-400)', textTransform: 'uppercase', letterSpacing: '2px',
                            transition: 'all 0.3s ease', cursor: 'pointer'
                          }}>
                            {lang === 'ar' ? 'تأمل الطية ✦' : 'Focus Artifact ✦'}
                          </div>
                        </div>
                      </div>
                      <div
                        className="scatter-btn"
                        onClick={(e) => handleScatterSand(e, report.name)}
                        title={lang === 'ar' ? 'انثر الرمال' : 'Scatter Sand'}
                        style={{
                           position: 'absolute', top: '15px', right: '15px', background: 'transparent',
                           border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5,
                           transition: 'all 0.3s', zIndex: 20
                        }}
                      >
                       💨
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardView;

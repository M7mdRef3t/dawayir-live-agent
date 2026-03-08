import React, { useState, useEffect, useMemo, useRef } from 'react';
import CognitiveMap from './CognitiveMap';
import NeuralGraph from './NeuralGraph';
import CognitiveFingerprint from './CognitiveFingerprint';
import CognitiveCoach from './CognitiveCoach';
import GrowthArc from './GrowthArc';
import SessionReplayPlayer from './SessionReplayPlayer';
import SessionHighlightReel from './SessionHighlightReel';
import SessionSignatureCard from './SessionSignatureCard';
import JudgeModePanel from './JudgeModePanel';
import '../dashboard-styles.css';

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


function DashboardView({ onBack, lang, emptyLogoSrc }) {
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
    { label: lang === 'ar' ? 'الشريط الأذكى' : 'Highlight Reel', ref: highlightSectionRef },
    { label: lang === 'ar' ? 'اللحظة الفاصلة' : 'Signature Moment', ref: signatureSectionRef },
    { label: lang === 'ar' ? 'وضع التحكيم' : 'Judge Mode', ref: judgeSectionRef },
    { label: lang === 'ar' ? 'فارق الجلسات' : 'Cross-Session Diff', ref: diffSectionRef },
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
      text: lang === 'ar'
        ? 'شاهد بصمتي الإدراكية من جلسة دواير'
        : 'View my cognitive fingerprint from a Dawayir session',
      url: window.location.origin + '?session=' + encodeURIComponent(btoa(report?.filename || '')),
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => null);
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
        alert(lang === 'ar' ? '✅ تم نسخ الرابط!' : '✅ Link copied!');
      });
    }
  };

  return (
    <div className="dashboard-view">
      <header className="dashboard-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '20px' }}>
        <button className="back-btn" onClick={selectedReport ? () => setSelectedReport(null) : onBack}>
          {selectedReport ? (lang === 'ar' ? '← رجوع للقائمة' : '← Back to Museum') : (lang === 'ar' ? '← رجوع للتجربة' : '← Back to Live')}
        </button>
        <h2>{selectedReport ? (lang === 'ar' ? 'تفاصيل الذكرى' : 'Memory Insight') : (lang === 'ar' ? 'المتحف الإدراكي' : 'Museum of Mind')}</h2>
      </header>

      {!selectedReport && !loading && (
        <>
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}</span>
              <strong className="stat-value">{totalReports}</strong>
              <div className="stat-trend positive">{lang === 'ar' ? `آخر جلسة: ${latestDate}` : `Last session: ${latestDate}`}</div>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'متوسط الوضوح' : 'Avg Clarity'}</span>
              <strong className="stat-value">68%</strong>
              <div className="stat-trend positive">+5%</div>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'أكثر دائرة نشطة' : 'Top Circle'}</span>
              <strong className="stat-value" style={{ color: 'var(--ds-cyan-500)' }}>{lang === 'ar' ? 'الوعي' : 'Awareness'}</strong>
            </div>
          </div>

          {/* ── Feature ③ CROSS-SESSION GROWTH ARC ────────────────────── */}
          <GrowthArc lang={lang} />

          <div className="cognitive-distribution-panel">
            <h3>{lang === 'ar' ? 'توزيـع المسـار المعرفـي' : 'Cognitive Journey Distribution'}</h3>
            <div className="distribution-chart">
              <div className="dist-bar awareness" style={{ width: '45%' }} title="Awareness: 45%"></div>
              <div className="dist-bar knowledge" style={{ width: '30%' }} title="Knowledge: 30%"></div>
              <div className="dist-bar truth" style={{ width: '25%' }} title="Truth: 25%"></div>
            </div>
            <div className="dist-legend">
              <div className="legend-item"><span className="dot awareness"></span> {lang === 'ar' ? 'الوعي' : 'Awareness'}</div>
              <div className="legend-item"><span className="dot knowledge"></span> {lang === 'ar' ? 'العلم' : 'Knowledge'}</div>
              <div className="legend-item"><span className="dot truth"></span> {lang === 'ar' ? 'الحقيقة' : 'Truth'}</div>
            </div>
          </div>
        </>
      )}

      {!selectedReport && (
        <div className="dashboard-tools">
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="command-input dashboard-search"
              placeholder={lang === 'ar' ? 'ابحث في ذكرياتك...' : 'Search your memories...'}
            />
          </div>
          <select className="command-send-btn dashboard-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">{lang === 'ar' ? 'الأحدث' : 'Most recent'}</option>
            <option value="name">{lang === 'ar' ? 'الاسم' : 'Name'}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="loader">
          <div className="spinner-ring"></div>
          <span>{lang === 'ar' ? 'جاري استدعاء الذكريات...' : 'Recalling memories...'}</span>
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
              <button className="presentation-btn primary" onClick={demoRouteActive ? handleStopDemoRoute : handleStartDemoRoute}>
                {demoRouteActive
                  ? (lang === 'ar' ? 'إيقاف المسار التلقائي' : 'Stop Demo Route')
                  : (lang === 'ar' ? 'ابدأ المسار التلقائي' : 'Start Demo Route')}
              </button>
              <button className="presentation-btn" onClick={() => setJudgeModeActive((value) => !value)}>
                {judgeModeActive
                  ? (lang === 'ar' ? 'إظهار كل التفاصيل' : 'Show Full Insight')
                  : (lang === 'ar' ? 'تفعيل Judge Mode' : 'Enable Judge Mode')}
              </button>
              <button className="presentation-btn" onClick={handleToggleJudgeFullscreen}>
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
                    <div className="diff-fingerprint-card">
                      <span>{lang === 'ar' ? 'الآن' : 'Current'}</span>
                      <CognitiveFingerprint reportContent={selectedReport.content} sessionId={selectedReport.filename} lang={lang} size={134} />
                    </div>
                    <div className="diff-fingerprint-divider">
                      <strong>{lang === 'ar' ? 'مقابل' : 'vs'}</strong>
                    </div>
                    <div className="diff-fingerprint-card">
                      <span>{lang === 'ar' ? 'قبلها' : 'Previous'}</span>
                      <CognitiveFingerprint reportContent={compareReport.content} sessionId={compareReport.filename} lang={lang} size={134} />
                    </div>
                  </div>

                  <div className="session-diff-metrics">
                    <div className="session-diff-metric-card">
                      <small>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</small>
                      <strong className={compareDeltas.clarity >= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.clarity >= 0 ? '+' : ''}{compareDeltas.clarity}%</strong>
                    </div>
                    <div className="session-diff-metric-card">
                      <small>{lang === 'ar' ? 'التوازن' : 'Equilibrium'}</small>
                      <strong className={compareDeltas.equilibrium >= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.equilibrium >= 0 ? '+' : ''}{compareDeltas.equilibrium}%</strong>
                    </div>
                    <div className="session-diff-metric-card">
                      <small>{lang === 'ar' ? 'الضغط' : 'Overload'}</small>
                      <strong className={compareDeltas.overload <= 0 ? 'is-positive' : 'is-negative'}>{compareDeltas.overload >= 0 ? '+' : ''}{compareDeltas.overload}%</strong>
                    </div>
                  </div>

                  <div className="session-diff-circles">
                    {circleDiff.map((circle) => (
                      <div key={circle.id} className="session-diff-circle-card">
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
                animate={true}
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
                  className="share-session-btn"
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
            <div className="empty-state-card">
              <img src={emptyLogoSrc} alt="" className="empty-state-logo" />
              <h3>{lang === 'ar' ? 'بنك الذاكرة خالي' : 'Memory Bank Empty'}</h3>
              <p>{lang === 'ar' ? 'ابدأ أول رحلة معرفية، وسيتم تسجيل كل البصائر هنا بانتظام.' : 'Embark on your first journey, and all insights will be recorded here.'}</p>
              <button className="primary-btn dashboard-start-btn" onClick={onBack}>
                {lang === 'ar' ? 'ابدأ الرحلة' : 'Start Journey'}
              </button>
            </div>
          ) : (
            <div className="cognitive-museum-container">
              <div className="museum-header">
                <h3>{lang === 'ar' ? 'المعرض الفني لوعيك' : 'The Art Gallery of Your Consciousness'}</h3>
                <p>{lang === 'ar' ? 'هنا تُحفظ ذكرياتك ومشاعرك כمنحوتات إدراكية حية. كل بصمة هي أنت في لحظة زمنية مختلفة.' : 'Here your memories and feelings are preserved as living cognitive sculptures. Each footprint is you at a different moment in time.'}</p>
              </div>
              <div className="reports-grid cognitive-museum-grid">
                {filteredReports.map((report, idx) => {
                  // Use name as seed, but maybe add pseudo-random voiceTone for art variations
                  const mockTones = ['calm', 'focused', 'tense', 'excited'];
                  const seedNum = report.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const tone = mockTones[seedNum % mockTones.length];

                  return (
                    <div
                      key={report.name}
                      className={`report-card-premium museum-artifact ${scatteredReports.has(report.name) ? 'sand-mandala-effect' : ''}`}
                      onClick={() => !scatteredReports.has(report.name) && viewReport(report.name)}
                      style={{ animationDelay: `${idx * 0.15}s` }}
                    >
                      <div className="artifact-pedestal">
                        <div className="artifact-glow"></div>
                        <div className="artifact-canvas">
                          <CognitiveFingerprint
                            sessionId={report.name}
                            reportContent={report.name}
                            lang={lang}
                            size={120}
                            voiceTone={tone}
                            liveState="static"
                          />
                        </div>
                      </div>
                      <div className="artifact-plaque">
                        <div className="report-name">
                          {report.name.replace('.md', '').replace('session_report_', lang === 'ar' ? 'طية ادراكية #' : 'Cognitive Fold #')}
                        </div>
                        <div className="report-date">
                          {new Date(report.updated).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="museum-explore-btn">
                          {lang === 'ar' ? 'تأمل الطية ✦' : 'Contemplate Fold ✦'}
                        </div>
                        <div
                          className="scatter-btn"
                          onClick={(e) => handleScatterSand(e, report.name)}
                          title={lang === 'ar' ? 'تدمير الطية ونثر الرمال' : 'Scatter the fold like sand'}
                        >
                          {lang === 'ar' ? 'انثر الرمال 💨' : 'Scatter Sand 💨'}
                        </div>
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

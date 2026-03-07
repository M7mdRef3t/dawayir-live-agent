import React, { useState, useEffect, useMemo } from 'react';
import CognitiveMap from './CognitiveMap';
import '../dashboard-styles.css';

function DashboardView({ onBack, lang, emptyLogoSrc }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

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

  const viewReport = (filename) => {
    fetch(`/api/reports/${filename}`)
      .then((res) => res.text())
      .then((content) => {
        setSelectedReport({ filename, content });
      });
  };

  return (
    <div className="dashboard-view">
      <header className="dashboard-header">
        <button className="back-btn" onClick={selectedReport ? () => setSelectedReport(null) : onBack}>
          {selectedReport ? (lang === 'ar' ? '← رجوع للقائمة' : '← Back to List') : (lang === 'ar' ? '← رجوع للتجربة' : '← Back to Live')}
        </button>
        <h2>{selectedReport ? (lang === 'ar' ? 'تفاصيل الجلسة' : 'Session Insight') : (lang === 'ar' ? 'بنك الذاكرة' : 'Memory Bank')}</h2>
      </header>

      {!selectedReport && !loading && (
        <>
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <span className="stat-label">{lang === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}</span>
              <strong className="stat-value">{totalReports}</strong>
              <div className="stat-trend positive">+12%</div>
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
        <div className="report-content-wrapper">
          <div className="report-detail-layout">
            <div className="report-sidebar">
              <h3>{lang === 'ar' ? 'البصمة الإدراكية' : 'Cognitive DNA'}</h3>
              <CognitiveMap color="var(--ds-cyan-500)" />
              <div className="sidebar-stats">
                <div className="s-stat">
                  <span>{lang === 'ar' ? 'الوضوح' : 'Clarity'}</span>
                  <strong>74%</strong>
                </div>
                <div className="s-stat">
                  <span>{lang === 'ar' ? 'الهدوء' : 'Calm'}</span>
                  <strong>82%</strong>
                </div>
              </div>
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
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <div key={report.name} className="report-card-premium" onClick={() => viewReport(report.name)}>
                  <div className="report-status-line"></div>
                  <div className="report-card-body">
                    <div className="report-main-info">
                      <span className="report-name">{report.name.replace('.md', '').replace('session_report_', 'Insight #')}</span>
                      <span className="report-date">{new Date(report.updated).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="report-arrow">→</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardView;

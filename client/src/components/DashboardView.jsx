import React, { useEffect, useMemo, useState } from 'react';

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
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span>{lang === 'ar' ? 'عدد الجلسات' : 'Sessions'}</span>
            <strong>{totalReports}</strong>
          </div>
          <div className="dashboard-stat">
            <span>{lang === 'ar' ? 'آخر تحديث' : 'Last update'}</span>
            <strong>{latestDate}</strong>
          </div>
        </div>
      )}

      {!selectedReport && (
        <div className="dashboard-tools">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="command-input"
            placeholder={lang === 'ar' ? 'ابحث عن جلسة...' : 'Search sessions...'}
          />
          <select className="command-send-btn dashboard-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="recent">{lang === 'ar' ? 'الأحدث' : 'Most recent'}</option>
            <option value="name">{lang === 'ar' ? 'الاسم' : 'Name'}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="loader">{lang === 'ar' ? 'جاري تحليل الذكريات...' : 'Analyzing memories...'}</div>
      ) : selectedReport ? (
        <div className="report-content">
          <pre>{selectedReport.content}</pre>
        </div>
      ) : (
        <div className="reports-list">
          {filteredReports.length === 0 ? (
            <div className="empty-state-card">
              <img src={emptyLogoSrc} alt="" className="empty-state-logo" />
              <h3>{lang === 'ar' ? 'لسه مفيش جلسات محفوظة' : 'No sessions saved yet'}</h3>
              <p>{lang === 'ar' ? 'ابدأ أول جلسة، وبعدها هتلاقي الملخصات والتقارير هنا.' : 'Start a first session and your reports will appear here.'}</p>
              <button className="primary-btn" onClick={onBack}>
                {lang === 'ar' ? 'ابدأ جلسة' : 'Start Session'}
              </button>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.name} className="report-card" onClick={() => viewReport(report.name)}>
                <div className="report-icon">📄</div>
                <div className="report-info">
                  <span className="report-name">{report.name.replace('.md', '')}</span>
                  <span className="report-date">{new Date(report.updated).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardView;

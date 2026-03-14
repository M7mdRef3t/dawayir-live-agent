import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import MirrorSentence from './MirrorSentence';
import JourneyTimeline from './JourneyTimeline';
import CognitiveWeatherSummary from './CognitiveWeatherSummary';
import SandMandala from './SandMandala';

/**
 * SessionCompleteScreen — Shown after a session ends.
 * Displays stats, action card, and session summary.
 * Extracted from App.jsx for maintainability.
 */
const SessionCompleteScreen = ({
  lang,
  isSandMandalaActive,
  cognitiveMetrics,
  journeyPath,
  transitionCount,
  sessionStartTime,
  dominantNodeId,
  showDNACard: _showDNACard,
  onSetShowDNACard,
  onGoToView,
  onSandMandala,
}) => {
  const printRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    // Add a temporary class to force "Print Mode" styles
    printRef.current.classList.add('exporting-pdf');
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#060618', 
        windowWidth: 1000,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`dawayir-insight-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      printRef.current.classList.remove('exporting-pdf');
      setIsExporting(false);
    }
  };

  return (
    <div className="complete-screen complete-overlay">
      <SandMandala 
        targetRef={printRef}
        isActive={isSandMandalaActive}
        onComplete={() => onGoToView('setup')}
      />
      {isSandMandalaActive && (
        <style>{`
          @keyframes sand-shatter {
            0% { transform: scale(1); filter: blur(0) grayscale(0); opacity: 1; }
            20% { transform: scale(1.05) translateY(-5px); filter: blur(2px) grayscale(0.5); opacity: 0.8; }
            50% { transform: scale(1.1) translateY(-20px); filter: blur(15px) sepia(1) hue-rotate(-50deg); opacity: 0.5; letter-spacing: 12px; }
            100% { transform: scale(1.5) translateY(-80px); filter: blur(40px) opacity(0); opacity: 0; letter-spacing: 30px; }
          }
          .sand-mandala-active {
            animation: sand-shatter 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            pointer-events: none;
          }

          /* Luxury Print Mode Adjustments */
          .exporting-pdf {
            width: 800px !important;
            padding: 60px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: none !important;
          }
          .exporting-pdf .complete-actions-row {
            display: none !important;
          }
          .exporting-pdf .success-icon-container {
            margin-bottom: 30px !important;
          }
          .exporting-pdf .complete-title {
            font-family: var(--ds-font-arabic) !important;
            font-size: 3rem !important;
            margin-bottom: 20px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 20px;
          }
          .exporting-pdf .mirror-sentence-container {
             font-style: italic;
             opacity: 0.9;
             border-left: 2px solid var(--ds-brand-accent);
             padding-left: 20px;
             margin: 30px 0;
          }
        `}</style>
      )}
      <div className={`complete-card ${isSandMandalaActive ? 'sand-mandala-active' : ''}`} ref={printRef} style={{ padding: '40px', background: 'var(--ds-bg-panel)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="success-icon-container">
           {/* Dawayir Floating Logo Mark */}
           <div className="pdf-logo-mark" style={{ marginBottom: '20px', opacity: 0.8 }}>
              <svg width="40" height="40" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--ds-gold-400)" strokeWidth="1" strokeDasharray="5,5" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="var(--ds-cyan-500)" strokeWidth="2" />
                <circle cx="50" cy="50" r="5" fill="var(--ds-magenta-500)" />
              </svg>
           </div>
          <svg aria-hidden="true" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 65, 0.4))' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="complete-title" data-view-heading="complete" tabIndex={-1}>
          {lang === 'ar' ? 'رحلة اكتملت' : 'Journey Complete'}
        </h2>

        {/* Feature: MIRROR SENTENCE */}
        <MirrorSentence
          journeyPath={journeyPath}
          transitionCount={transitionCount}
          lang={lang}
          visible={true}
        />
        <p className="complete-subtitle">
          {lang === 'ar' ? 'لقد انتهت جلستك وتم حفظ مسارك المعرفي في بنك الذاكرة.' : 'Your session has ended, and your cognitive path is saved in the Memory Bank.'}
        </p>

        {/* Journey Timeline */}
        <JourneyTimeline
          journeyPath={journeyPath}
          transitionCount={transitionCount}
          sessionDurationMs={sessionStartTime ? Date.now() - sessionStartTime : 0}
          lang={lang}
        />
        <div className="complete-stats-table">
          <div className="complete-stat-row complete-stat-row-divider">
            <span className="complete-stat-label">{lang === 'ar' ? 'التوازن النهائي' : 'Equilibrium'}</span>
            <span className="complete-stat-value complete-stat-success">{(cognitiveMetrics.equilibriumScore * 100).toFixed(0)}%</span>
          </div>
          <div className="complete-stat-row complete-stat-row-divider">
            <span className="complete-stat-label">{lang === 'ar' ? 'مستوى الضغط' : 'Overload'}</span>
            <span className="complete-stat-value complete-stat-info">{(cognitiveMetrics.overloadIndex * 100).toFixed(0)}%</span>
          </div>
          <div className="complete-stat-row">
            <span className="complete-stat-label">{lang === 'ar' ? 'نسبة الوضوح' : 'Clarity Δ'}</span>
            <span className={`complete-stat-value ${cognitiveMetrics.clarityDelta >= 0 ? 'complete-stat-success' : 'complete-stat-magenta'}`}>
              {cognitiveMetrics.clarityDelta >= 0 ? '+' : ''}{(cognitiveMetrics.clarityDelta * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Cognitive Weather Forecaster */}
        <CognitiveWeatherSummary
            dominantNodeId={dominantNodeId}
            clarityDelta={cognitiveMetrics.clarityDelta}
            overloadIndex={cognitiveMetrics.overloadIndex}
            lang={lang}
        />

        <div className="complete-actions-row">
          <button className="primary-btn complete-action-btn" onClick={() => onGoToView('setup')}>
            {lang === 'ar' ? 'جلسة جديدة' : 'New Session'}
          </button>
          <button className="primary-btn complete-action-btn complete-action-secondary" onClick={() => onGoToView('dashboard')}>
            {lang === 'ar' ? 'بنك الذاكرة' : 'Memory Bank'}
          </button>

          {/* Feature: Private Premium Export */}
          <button 
            className="primary-btn outline-btn complete-action-btn export-btn" 
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isExporting ? (lang === 'ar' ? 'جاري الاستخراج...' : 'Exporting...') : (lang === 'ar' ? 'وثيقة البصيرة (PDF)' : 'Save Insight (PDF)')}
          </button>

          {/* Feature 10: Sand Mandala (Let Go) */}
          <button
            className="primary-btn outline-btn complete-action-btn"
            onClick={onSandMandala}
            style={{ width: '100%', marginTop: '8px', opacity: 0.8, color: '#ffb347', borderColor: 'rgba(255, 179, 71, 0.3)' }}
            title={lang === 'ar' ? 'انسف الماندالا وامسح البيانات' : 'Blow away the Mandala (Erase Data)'}
          >
            {lang === 'ar' ? '💨 التخلي (مسح)' : '💨 Detach & Erase'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompleteScreen;

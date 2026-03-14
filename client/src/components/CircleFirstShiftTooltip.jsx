import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'dawayir-circle-intro-seen';

const CIRCLE_INTRO = {
  ar: {
    headline: 'هاتلات الدواير بتمثل تلت عوالم',
    subline: 'المسافة بينهم هي مصدر كتير من التوتر.',
    circles: [
      { color: '#FFD700', name: 'وعيك', desc: 'كيف بتدرك اللي بيحصل معاك', emoji: '🟡' },
      { color: '#00CED1', name: 'ما وصل له العلم', desc: 'ما ثبت بالبحث والخبرة الإنسانية', emoji: '🔵' },
      { color: '#00FF7F', name: 'الواقع', desc: 'ما موجود فعلاً في حياتك', emoji: '🟢' },
    ],
    dismiss: 'فهمت، كمّل',
  },
  en: {
    headline: 'These circles represent three worlds',
    subline: 'The gap between them is where most tension lives.',
    circles: [
      { color: '#FFD700', name: 'Your Awareness', desc: 'How you perceive what happens to you', emoji: '🟡' },
      { color: '#00CED1', name: 'What Science knows', desc: 'What research & human experience has proven', emoji: '🔵' },
      { color: '#00FF7F', name: 'Reality', desc: 'What actually exists in your life', emoji: '🟢' },
    ],
    dismiss: 'Got it',
  },
};


function CircleFirstShiftTooltip({ lang = 'ar', show = false, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const autoTimerRef = useRef(null);
  const strings = CIRCLE_INTRO[lang] || CIRCLE_INTRO.ar;

  useEffect(() => {
    if (!show) return;
    // Already seen? Skip.
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
      onDismiss?.();
      return;
    }
    setVisible(true);
    setExiting(false);

    // Auto-dismiss after 8 seconds
    autoTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, 8000);

    return () => clearTimeout(autoTimerRef.current);
  }, [show]);

  const handleDismiss = () => {
    clearTimeout(autoTimerRef.current);
    setExiting(true);
    window.localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 400);
  };

  if (!visible) return null;

  return (
    <div
      className={`cfsf-backdrop ${exiting ? 'cfsf-exiting' : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ar' ? 'شرح الدوائر' : 'Circle explanation'}
    >
      <div
        className="cfsf-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated rings decoration */}
        <div className="cfsf-rings" aria-hidden="true">
          <div className="cfsf-ring cfsf-ring-1" />
          <div className="cfsf-ring cfsf-ring-2" />
          <div className="cfsf-ring cfsf-ring-3" />
        </div>

        <div className="cfsf-content">
          <h3 className="cfsf-headline">{strings.headline}</h3>
          <p className="cfsf-subline">{strings.subline}</p>

          <ul className="cfsf-circles-list" role="list">
            {strings.circles.map((circle) => (
              <li key={circle.name} className="cfsf-circle-item">
                <div
                  className="cfsf-circle-dot"
                  style={{
                    background: circle.color,
                    boxShadow: `0 0 12px ${circle.color}66`,
                  }}
                  aria-hidden="true"
                />
                <div className="cfsf-circle-text">
                  <strong className="cfsf-circle-name" style={{ color: circle.color }}>
                    {circle.name}
                  </strong>
                  <span className="cfsf-circle-desc">{circle.desc}</span>
                </div>
              </li>
            ))}
          </ul>

          <button
            className="cfsf-dismiss-btn"
            onClick={handleDismiss}
            autoFocus
          >
            {strings.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

// Static helper: check if intro has been seen
CircleFirstShiftTooltip.hasSeen = () =>
  window.localStorage.getItem(STORAGE_KEY) === 'true';

export default CircleFirstShiftTooltip;

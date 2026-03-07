import React, { useEffect, useRef, useState } from 'react';

const ACHIEVEMENTS = [
  { key: 'firstWord', icon: '\uD83C\uDFA4', ar: 'أول كلمة — بدأت المحادثة', en: 'First Word — Conversation started' },
  { key: 'firstReply', icon: '\uD83D\uDDE3\uFE0F', ar: 'أول رد — الوكيل استجاب', en: 'First Reply — Agent responded' },
  { key: 'awarenessShift', icon: '\uD83D\uDD35', ar: 'الوعي تحرك — دايرة الوعي اتغيرت', en: 'Awareness Shifted — Circle updated' },
  { key: 'knowledgeShift', icon: '\uD83D\uDFE2', ar: 'العلم تحرك — دايرة العلم اتغيرت', en: 'Knowledge Shifted — Circle updated' },
  { key: 'truthShift', icon: '\uD83D\uDFE3', ar: 'الحقيقة تحركت — دايرة الحقيقة اتغيرت', en: 'Truth Shifted — Circle updated' },
  { key: 'deepConvo', icon: '\uD83D\uDCAC', ar: 'محادثة عميقة — ٥+ رسائل متبادلة', en: 'Deep Conversation — 5+ messages exchanged' },
  { key: 'sentimentShift', icon: '\uD83D\uDCA1', ar: 'تحليل مشاعر — الألوان تغيرت حسب حالتك', en: 'Sentiment Shift — Colors changed with mood' },
  { key: 'bargeIn', icon: '\u270B', ar: 'مقاطعة ناجحة — قاطعت الوكيل وسكت فوراً', en: 'Barge-in — Interrupted agent successfully' },
  { key: 'visionUsed', icon: '\uD83D\uDC41\uFE0F', ar: 'الرؤية — الوكيل شاف صورتك وحللها', en: 'Vision Used — Agent analyzed your photo' },
  { key: 'voiceCommand', icon: '\uD83C\uDFAF', ar: 'أمر صوتي — تحكمت في الدواير بصوتك', en: 'Voice Command — Controlled circles by voice' },
  { key: 'reconnected', icon: '\uD83D\uDD04', ar: 'إعادة اتصال — النظام استعاد الجلسة تلقائياً', en: 'Reconnected — Session restored automatically' },
];

function AchievementBar({ achievements, lang }) {
  const prevRef = useRef({});
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (a) => achievements[a.key] && !prevRef.current[a.key]
    );
    prevRef.current = { ...achievements };

    if (newlyUnlocked.length === 0) return;

    const newToasts = newlyUnlocked.map((a) => ({
      id: ++toastIdRef.current,
      icon: a.icon,
      text: lang === 'ar' ? a.ar : a.en,
    }));

    setToasts((prev) => [...prev, ...newToasts]);

    const ids = newToasts.map((t) => t.id);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => !ids.includes(t.id)));
    }, 3000);

    return () => clearTimeout(timer);
  }, [achievements, lang]);

  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.key]).length;

  return (
    <>
      {/* Toast notifications */}
      <div className="achievement-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="achievement-toast">
            <span className="achievement-toast-icon">{toast.icon}</span>
            <span className="achievement-toast-text">{toast.text}</span>
            <span className="achievement-toast-check">{'\u2713'}</span>
          </div>
        ))}
      </div>

      {/* Bottom dot bar */}
      {unlockedCount > 0 && (
        <div className="achievement-bar" role="status" aria-label={lang === 'ar' ? '\u0627\u0644\u0625\u0646\u062C\u0627\u0632\u0627\u062A' : 'Achievements'}>
          <span className="achievement-counter">{unlockedCount}/{ACHIEVEMENTS.length}</span>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements[a.key];
            return (
              <div
                key={a.key}
                className={`achievement-dot ${unlocked ? 'unlocked' : ''}`}
                title={lang === 'ar' ? a.ar : a.en}
              >
                <span className="achievement-icon">{a.icon}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default AchievementBar;

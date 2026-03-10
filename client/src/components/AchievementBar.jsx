import React, { useEffect, useRef, useState } from 'react';

const ACHIEVEMENTS = [
  { key: 'firstWord', icon: '\uD83C\uDFA4', ar: 'أول كلمة — بدأت الجلسة', en: 'First Word — Conversation started' },
  { key: 'firstReply', icon: '\uD83D\uDDE3\uFE0F', ar: 'أول رد — دواير جاوبت', en: 'First Reply — Agent responded' },
  { key: 'awarenessShift', icon: '\uD83D\uDD35', ar: 'الوعي اتحرك — دايرة الوعي اتبدلت', en: 'Awareness Shifted — Circle updated' },
  { key: 'knowledgeShift', icon: '\uD83D\uDFE2', ar: 'العلم اتحرك — دايرة العلم اتبدلت', en: 'Knowledge Shifted — Circle updated' },
  { key: 'truthShift', icon: '\uD83D\uDFE3', ar: 'الحقيقة اتحركت — دايرة الحقيقة اتبدلت', en: 'Truth Shifted — Circle updated' },
  { key: 'deepConvo', icon: '\uD83D\uDCAC', ar: 'محادثة عميقة — أكتر من ٥ ردود', en: 'Deep Conversation — 5+ messages exchanged' },
  { key: 'sentimentShift', icon: '\uD83D\uDCA1', ar: 'تحول في الإحساس — الألوان اتغيرت مع حالتك', en: 'Sentiment Shift — Colors changed with mood' },
  { key: 'bargeIn', icon: '\u270B', ar: 'مقاطعة ناجحة — وقفت دواير في وقتها', en: 'Barge-in — Interrupted agent successfully' },
  { key: 'visionUsed', icon: '\uD83D\uDC41\uFE0F', ar: 'قراءة بالصورة — دواير قرأت حالتك من الصورة', en: 'Vision Used — Agent analyzed your photo' },
  { key: 'voiceCommand', icon: '\uD83C\uDFAF', ar: 'أمر صوتي — حرّكت الدواير بصوتك', en: 'Voice Command — Controlled circles by voice' },
  { key: 'reconnected', icon: '\uD83D\uDD04', ar: 'رجع الاتصال — الجلسة كملت تلقائي', en: 'Reconnected — Session restored automatically' },
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
          <ul className="achievement-dots-list">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = achievements[a.key];
              const label = lang === 'ar' ? a.ar : a.en;
              return (
                <li
                  key={a.key}
                  className={`achievement-dot ${unlocked ? 'unlocked' : ''}`}
                  aria-label={label}
                  title={label}
                >
                  <span className="achievement-icon" aria-hidden="true">{a.icon}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default AchievementBar;

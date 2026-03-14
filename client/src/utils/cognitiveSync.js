// ═══════════════════════════════════════════════════════
// Cognitive Sync Utilities
// Session progress, truth contracts, user keys,
// and backend synchronisation.
// ═══════════════════════════════════════════════════════

export const TRUTH_REMINDER_KEY = 'dawayir_truth_contract_reminder';
export const DWR_USER_KEY = 'dawayir_user_key';
export const DWR_MIGRATION_KEY = 'dawayir_backend_migrated_v1';

export const saveSessionProgress = (nodes) => {
  // Kept as a no-op for backward compatibility.
  // Source of truth moved to backend /api/cognitive-artifacts.
  void nodes;
};

export const getSessionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
  } catch { return []; }
};

export const extractLastUserLine = (transcript = []) => {
  for (let i = transcript.length - 1; i >= 0; i -= 1) {
    const entry = transcript[i];
    if (entry?.role === 'user' && typeof entry?.text === 'string' && entry.text.trim()) {
      return entry.text.trim();
    }
  }
  return '';
};

export const buildTruthContract = ({ transcript = [], lang = 'ar' }) => {
  const lastUserLine = extractLastUserLine(transcript);
  if (lang === 'ar') {
    if (/حدود|هقول|هعمل|مش ه|قرار|لازم/.test(lastUserLine)) {
      return {
        title: 'عقد الحقيقة',
        action: 'هكتب جملة حدود واضحة وأستخدمها مرة واحدة اليوم.',
        anchor: lastUserLine,
      };
    }
    return {
      title: 'عقد الحقيقة',
      action: 'قبل أي رد، هاخد نفسين وأختار رد واحد يحميني.',
      anchor: lastUserLine || 'الخطوة الصغيرة الواضحة أهم من المثالية.',
    };
  }

  if (/i will|i won't|i need to|boundary|decide|decision/i.test(lastUserLine)) {
    return {
      title: 'Truth Contract',
      action: 'I will write one boundary sentence and use it once today.',
      anchor: lastUserLine,
    };
  }
  return {
    title: 'Truth Contract',
    action: 'Before I reply, I will take two breaths and choose one protective response.',
    anchor: lastUserLine || 'A small clear step beats a perfect plan.',
  };
};

export const readTruthReminder = () => {
  try {
    const raw = window.localStorage.getItem(TRUTH_REMINDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.dueAt || !parsed?.action) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveTruthReminder = (reminder) => {
  try {
    if (!reminder) {
      window.localStorage.removeItem(TRUTH_REMINDER_KEY);
      return;
    }
    window.localStorage.setItem(TRUTH_REMINDER_KEY, JSON.stringify(reminder));
  } catch {}
};

export const getOrCreateUserKey = () => {
  try {
    const existing = window.localStorage.getItem(DWR_USER_KEY);
    if (existing && existing.trim()) return existing.trim();
    const created = `usr_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    window.localStorage.setItem(DWR_USER_KEY, created);
    return created;
  } catch {
    return 'anonymous';
  }
};

export const syncCognitiveArtifacts = async (payload, userKey) => {
  try {
    await fetch(`/api/cognitive-artifacts?userKey=${encodeURIComponent(userKey || 'anonymous')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
};

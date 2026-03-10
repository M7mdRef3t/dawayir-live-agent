export const SETTINGS_KEY = 'dawayir-settings-v1';
export const LANGUAGE_KEY = 'dawayir-language';
export const MIC_DEVICE_KEY = 'dawayir-mic-device';

export const DEFAULT_APP_SETTINGS = Object.freeze({
  language: 'ar',
  reducedMotion: false,
  highContrast: false,
  rememberOnboarding: true,
});

const getStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);
const getRootElement = () => (typeof document !== 'undefined' ? document.documentElement : null);

export function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'ar';
}

export function normalizeAppSettings(settings = {}) {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    language: normalizeLanguage(settings.language),
    reducedMotion: Boolean(settings.reducedMotion),
    highContrast: Boolean(settings.highContrast),
    rememberOnboarding: settings.rememberOnboarding ?? DEFAULT_APP_SETTINGS.rememberOnboarding,
  };
}

export function readStoredAppSettings(storage = getStorage()) {
  if (!storage) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  let parsed = {};
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  const storedLanguage = storage.getItem(LANGUAGE_KEY);
  return normalizeAppSettings({
    ...parsed,
    language: storedLanguage ?? parsed.language,
  });
}

export function applyAppSettingsToDocument(settings, root = getRootElement()) {
  if (!root) return;

  root.classList.toggle('prefers-reduced-motion', Boolean(settings.reducedMotion));
  root.classList.toggle('prefers-high-contrast', Boolean(settings.highContrast));
}

export function persistAppSettings(settings, storage = getStorage(), root = getRootElement()) {
  const normalized = normalizeAppSettings(settings);

  applyAppSettingsToDocument(normalized, root);

  if (!storage) {
    return normalized;
  }

  storage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  storage.setItem(LANGUAGE_KEY, normalized.language);

  if (!normalized.rememberOnboarding) {
    storage.removeItem('dawayir-onboarding-seen');
  }

  return normalized;
}

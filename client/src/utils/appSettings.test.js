import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  LANGUAGE_KEY,
  SETTINGS_KEY,
  persistAppSettings,
  readStoredAppSettings,
} from './appSettings';

describe('appSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
  });

  it('returns defaults when no saved settings exist', () => {
    expect(readStoredAppSettings()).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('persists settings and reapplies them on the next load', () => {
    persistAppSettings({
      language: 'en',
      highContrast: true,
      reducedMotion: true,
      rememberOnboarding: false,
    });

    expect(window.localStorage.getItem(LANGUAGE_KEY)).toBe('en');
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY))).toEqual({
      language: 'en',
      highContrast: true,
      reducedMotion: true,
      rememberOnboarding: false,
    });
    expect(document.documentElement).toHaveClass('prefers-high-contrast');
    expect(document.documentElement).toHaveClass('prefers-reduced-motion');
    expect(readStoredAppSettings()).toEqual({
      language: 'en',
      highContrast: true,
      reducedMotion: true,
      rememberOnboarding: false,
    });
  });

  it('falls back to Arabic when the stored language is invalid', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      language: 'fr',
      highContrast: true,
      reducedMotion: false,
      rememberOnboarding: true,
    }));

    expect(readStoredAppSettings()).toEqual({
      language: 'ar',
      highContrast: true,
      reducedMotion: false,
      rememberOnboarding: true,
    });
  });
});

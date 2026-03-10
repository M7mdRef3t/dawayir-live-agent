import { describe, expect, it } from 'vitest';
import {
  getCircleAnnouncement,
  getLocalizedErrorMessage,
  getMetricsAnnouncement,
  getTranscriptAnnouncement,
  getViewAnnouncement,
} from './accessibility';

describe('accessibility helpers', () => {
  it('returns localized error strings and function templates', () => {
    const errors = {
      cameraPermissionDenied: 'تم رفض إذن الكاميرا',
      cameraGeneric: (detail) => `تعذر تشغيل الكاميرا: ${detail}`,
    };

    expect(getLocalizedErrorMessage(errors, 'cameraPermissionDenied')).toBe('تم رفض إذن الكاميرا');
    expect(getLocalizedErrorMessage(errors, 'cameraGeneric', 'Device busy')).toBe('تعذر تشغيل الكاميرا: Device busy');
    expect(getLocalizedErrorMessage(errors, 'missingKey', 'fallback')).toBe('fallback');
  });

  it('builds readable live announcements', () => {
    expect(getViewAnnouncement('ar', 'لوحة التحكم')).toBe('تم الانتقال إلى لوحة التحكم');
    expect(getCircleAnnouncement('en', 'Truth')).toBe('Truth circle updated');
    expect(getTranscriptAnnouncement('en', { role: 'agent', text: 'Take a breath.' })).toBe('Dawayir: Take a breath.');
  });

  it('formats metrics announcements with percentages', () => {
    expect(getMetricsAnnouncement('en', {
      equilibriumScore: 0.74,
      overloadIndex: 0.18,
      clarityDelta: 0.12,
    })).toBe('Equilibrium 74%, overload 18%, clarity +12%');
  });
});

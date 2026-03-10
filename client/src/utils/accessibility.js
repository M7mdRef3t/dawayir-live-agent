export function getLocalizedErrorMessage(errors, key, detail = '') {
  const template = errors?.[key];

  if (typeof template === 'function') {
    return template(detail);
  }

  if (typeof template === 'string' && template.trim()) {
    return template;
  }

  return detail || '';
}

export function getViewAnnouncement(lang, headingLabel) {
  if (!headingLabel) return '';

  return lang === 'ar'
    ? `تم الانتقال إلى ${headingLabel}`
    : `Moved to ${headingLabel}`;
}

export function getCircleAnnouncement(lang, circleLabel) {
  if (!circleLabel) return '';

  return lang === 'ar'
    ? `تم تحديث دائرة ${circleLabel}`
    : `${circleLabel} circle updated`;
}

export function getMetricsAnnouncement(lang, metrics) {
  const equilibrium = Math.round((Number(metrics?.equilibriumScore) || 0) * 100);
  const overload = Math.round((Number(metrics?.overloadIndex) || 0) * 100);
  const clarity = Math.round((Number(metrics?.clarityDelta) || 0) * 100);
  const clarityPrefix = clarity > 0 ? '+' : '';

  return lang === 'ar'
    ? `التوازن ${equilibrium}٪، الضغط ${overload}٪، الوضوح ${clarityPrefix}${clarity}٪`
    : `Equilibrium ${equilibrium}%, overload ${overload}%, clarity ${clarityPrefix}${clarity}%`;
}

export function getTranscriptAnnouncement(lang, entry) {
  if (!entry?.text) return '';

  const speaker = entry.role === 'agent'
    ? (lang === 'ar' ? 'دواير' : 'Dawayir')
    : (lang === 'ar' ? 'أنت' : 'You');

  return `${speaker}: ${entry.text}`;
}

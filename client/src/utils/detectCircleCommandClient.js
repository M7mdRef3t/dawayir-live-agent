const CIRCLE_IDS_CLIENT = {
  'وعي': 1, 'الوعي': 1, awareness: 1,
  'علم': 2, 'العلم': 2, knowledge: 2,
  'حقيقة': 3, 'الحقيقة': 3, 'حقيه': 3, 'الحقيه': 3, truth: 3,
};

const CIRCLE_ORDINALS_CLIENT = {
  'اولى': 1, 'الاولى': 1, 'أولى': 1, 'الأولى': 1, 'اول': 1, 'أول': 1,
  'تانية': 2, 'التانية': 2, 'تاني': 2, 'ثانية': 2, 'الثانية': 2,
  'تالتة': 3, 'التالتة': 3, 'تالت': 3, 'ثالثة': 3, 'الثالثة': 3,
};

export function detectCircleCommandClient(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  let action = null;

  if (/صغ/i.test(t)) action = 'shrink';
  else if (/كب/i.test(t)) action = 'grow';
  else if (/غي/i.test(t) || /change/i.test(t) || /لون/i.test(t)) action = 'change';
  if (!action) return null;

  let circleId = null;
  for (const [name, id] of Object.entries(CIRCLE_IDS_CLIENT)) {
    if (t.includes(name)) {
      circleId = id;
      break;
    }
  }

  if (!circleId) {
    for (const [ord, id] of Object.entries(CIRCLE_ORDINALS_CLIENT)) {
      if (t.includes(ord)) {
        circleId = id;
        break;
      }
    }
  }

  if (!circleId && (/دا[يئ]ر/i.test(t) || /circle/i.test(t))) {
    circleId = 1;
  }
  if (!circleId) return null;

  const radius = action === 'shrink' ? 35 : action === 'grow' ? 90 : 60;
  const colors = { 1: '#FFD700', 2: '#00CED1', 3: '#4169E1' };
  return { id: circleId, radius, color: colors[circleId] || '#FFD700', action };
}

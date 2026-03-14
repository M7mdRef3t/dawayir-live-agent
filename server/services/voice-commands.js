// ═══════════════════════════════════════════════════════
// Server-side circle command detection
// Fallback if the model skips tool calls.
// ═══════════════════════════════════════════════════════

export const CIRCLE_IDS = {
    'وعي': '1',
    'الوعي': '1',
    'awareness': '1',
    'علم': '2',
    'العلم': '2',
    'العلب': '2', // common Gemini transcription error for العلم
    'knowledge': '2',
    'science': '2',
    'حقيقة': '3',
    'الحقيقة': '3',
    'حقيقه': '3', // with ه instead of ة (common in transcription)
    'الحقيقه': '3',
    'الحياه': '3', // common Gemini transcription error for الحقيقة
    'الحياة': '3', // common Gemini transcription error for الحقيقة
    'truth': '3',
    'دايرة': null,
    'دايره': null, // with ه
    'دائرة': null,
    'دائره': null, // with ه
    'الدائرة': null,
    'الدائره': null, // with ه
    'الدايرة': null,
    'الدايره': null, // with ه
    'circle': null,
};

export const CIRCLE_ORDINALS = {
    'اولى': '1',
    'أولى': '1',
    'الأولى': '1',
    'الاولى': '1',
    'اول': '1',
    'أول': '1',
    'تانية': '2',
    'الثانية': '2',
    'ثانية': '2',
    'تاني': '2',
    'تالتة': '3',
    'الثالثة': '3',
    'ثالثة': '3',
    'تالت': '3',
};

export function detectCircleCommand(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim().toLowerCase();

    let action = null;
    if (/صغ/.test(t) || /shrink/.test(t) || /smaller/.test(t)) action = 'shrink';
    else if (/كبر/.test(t) || /grow/.test(t) || /bigger/.test(t)) action = 'grow';
    else if (/غي/.test(t) || /change/.test(t) || /adjust/.test(t)) action = 'change';
    if (!action) return null;

    // Find the LAST mentioned circle name (handles corrections like "الوعي مش الحقيقه")
    let circleId = null;
    let lastPos = -1;
    for (const [name, id] of Object.entries(CIRCLE_IDS)) {
        if (id) {
            const pos = t.lastIndexOf(name);
            if (pos > lastPos) {
                lastPos = pos;
                circleId = id;
            }
        }
    }

    if (!circleId) {
        lastPos = -1;
        for (const [ord, id] of Object.entries(CIRCLE_ORDINALS)) {
            const pos = t.lastIndexOf(ord);
            if (pos > lastPos) {
                lastPos = pos;
                circleId = id;
            }
        }
    }

    if (!circleId && (/(دا[يئ]ر|دائ)/.test(t) || /circle/.test(t))) {
        circleId = '1';
    }
    if (!circleId) return null;

    const weight = action === 'shrink' ? 0.35 : action === 'grow' ? 0.90 : 0.60;
    const colors = { '1': '#FFD700', '2': '#00CED1', '3': '#4169E1' };
    return {
        id: circleId,
        weight,
        color: colors[circleId] || '#FFD700',
    };
}

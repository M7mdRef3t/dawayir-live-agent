// ═══════════════════════════════════════════════════════
// Hybrid Turn Helpers
// Text processing, quality checks, and prompt builders
// for the hybrid two-agent conversation mode.
// ═══════════════════════════════════════════════════════

import { HYBRID_MAX_USER_TURNS } from '../config/constants.js';
import {
    HYBRID_OPENING_STAGE,
    HYBRID_STAGE_FLOW,
    HYBRID_GENERIC_OPENERS,
} from './hybrid-stage-flow.js';

// ── Text normalisation ──────────────────────────────────
export const cleanHybridTurnText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

export const normalizeHybridCompareText = (text) => String(text || '')
    .toLowerCase()
    .replace(/[؟?!.,،؛:"'`~()[\]{}<>/\\|_-]/g, ' ')
    .replace(/[آأإ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenizeHybridText = (text) => normalizeHybridCompareText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1);

export const countHybridWords = (text) => cleanHybridTurnText(text)
    .split(/\s+/)
    .filter(Boolean)
    .length;

export const HYBRID_DANGLING_ENDINGS = [
    'مع', 'من', 'في', 'على', 'كل', 'بس', 'او', 'أو', 'ان', 'إن', 'لو', 'وانا',
    'ولا', 'اي', 'الاخر', 'آخر', 'اخر',
    'بعد', 'قبل', 'عشان', 'لان', 'لكن', 'حتى', 'برا', 'خارج', 'جوا',
    'الساعة', 'الساعه',
];

export const HYBRID_DAWAYIR_DANGLING_ENDINGS = [
    'خلاك', 'خلاكي', 'سايب', 'سايبه', 'واقف', 'معلق',
];

export const getHybridLastToken = (text) => normalizeHybridCompareText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(-1)[0] || '';

export const hasHybridDanglingEnding = (text, extraTokens = []) => {
    const lastToken = getHybridLastToken(text);
    if (!lastToken) return false;
    const normalizedEndings = [...HYBRID_DANGLING_ENDINGS, ...extraTokens]
        .map((token) => normalizeHybridCompareText(token));
    return normalizedEndings.includes(lastToken);
};

export const hasAnyHybridKeyword = (text, keywords = []) => {
    const normalized = normalizeHybridCompareText(text);
    return keywords.some((keyword) => normalized.includes(normalizeHybridCompareText(keyword)));
};

export const calculateHybridTokenOverlap = (leftText, rightText) => {
    const left = tokenizeHybridText(leftText);
    const right = tokenizeHybridText(rightText);
    if (left.length === 0 || right.length === 0) return 0;
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    let shared = 0;
    for (const token of leftSet) {
        if (rightSet.has(token)) shared += 1;
    }
    return shared / Math.max(Math.min(leftSet.size, rightSet.size), 1);
};

const hasHybridTopicAnchor = (text, topicText) => {
    const normalizedTopic = cleanHybridTurnText(topicText);
    if (!normalizedTopic) return false;
    if (hasAnyHybridKeyword(text, [normalizedTopic])) return true;
    const topicTokens = tokenizeHybridText(normalizedTopic);
    if (topicTokens.length === 0) return false;
    const textTokens = new Set(tokenizeHybridText(text));
    let shared = 0;
    for (const token of topicTokens) {
        if (token.length > 2 && textTokens.has(token)) shared += 1;
    }
    return shared >= Math.max(1, Math.ceil(topicTokens.length * 0.34));
};

export const findRepeatedHybridBigram = (text) => {
    const tokens = tokenizeHybridText(text);
    if (tokens.length < 4) return '';
    const seen = new Set();
    for (let index = 0; index < tokens.length - 1; index += 1) {
        const bigram = `${tokens[index]} ${tokens[index + 1]}`;
        if (seen.has(bigram)) return bigram;
        seen.add(bigram);
    }
    return '';
};

export const deduplicateHybridText = (text) => {
    if (!text) return text;
    const sentences = text.split(/(?<=[.؟!])\s+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
        const seen = new Set();
        const unique = [];
        for (const s of sentences) {
            const key = normalizeHybridCompareText(s);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(s);
            }
        }
        if (unique.length < sentences.length) return unique.join(' ');
    }
    const trimmed = text.trim();
    const half = Math.floor(trimmed.length / 2);
    for (let offset = -3; offset <= 3; offset++) {
        const mid = half + offset;
        if (mid < 4 || mid >= trimmed.length - 4) continue;
        const firstHalf = trimmed.slice(0, mid).trim();
        const secondHalf = trimmed.slice(mid).trim();
        if (normalizeHybridCompareText(firstHalf) === normalizeHybridCompareText(secondHalf)) {
            return firstHalf;
        }
    }
    return text;
};

// ── Stage resolution ────────────────────────────────────
export const getHybridStageForSpeaker = (speaker, hybridState) => {
    if (speaker === 'dawayir' && hybridState.userTurnCount === 0) {
        return HYBRID_OPENING_STAGE;
    }
    const stageIndex = speaker === 'user_agent'
        ? hybridState.userTurnCount
        : Math.max(hybridState.userTurnCount - 1, 0);
    return HYBRID_STAGE_FLOW[Math.min(stageIndex, HYBRID_STAGE_FLOW.length - 1)];
};

export const buildHybridHistoryHint = (history = []) => history
    .slice(-2)
    .map((entry) => `"${cleanHybridTurnText(entry.text)}"`)
    .join(' | ');

// ── Micro-guidance ──────────────────────────────────────
export const getHybridStageMicroGuidance = (speaker, stage, lang = 'ar') => {
    if (lang !== 'ar') {
        if (speaker === 'dawayir' && stage.key === 'opening') return 'Keep it as a pure welcome only, with no analysis.';
        if (speaker === 'user_agent' && stage.key === 'practical_decision') return 'State one enforceable rule with a time or a boundary.';
        if (speaker === 'dawayir' && stage.key === 'practical_decision') return 'Lock in the same concrete step the user just chose.';
        return speaker === 'user_agent'
            ? 'Use one tiny real-life scene, not an abstract summary.'
            : 'Name the missing thing or the pressure in fresh concrete wording.';
    }

    if (speaker === 'dawayir') {
        switch (stage.key) {
            case 'opening':
                return 'الافتتاح هنا ترحيب فقط من 4 إلى 7 كلمات، من غير ملاحظة أو تشخيص.';
            case 'request_load':
                return 'سمّ ثقل الطلبات أو الشد من كل اتجاه، من غير إعادة نفس لفظ المستخدم.';
            case 'home_work_blur':
                return 'سمّ الراحة أو المساحة اللي الشغل زحف عليها داخل البيت.';
            case 'focus_fragmentation':
                return 'سمّ عدم الإكمال أو التقطيع في الفعل اليومي، لا التشتت كفكرة مجردة فقط.';
            case 'people_pleasing':
                return 'سمّ الاستنزاف الناتج من محاولة إرضاء الناس على حساب النفس.';
            case 'weak_boundaries':
                return 'سمّ بوضوح إن المشكلة في البقاء متاحًا طول الوقت.';
            case 'practical_decision':
                return 'ثبّت نفس الخطوة العملية التي قالها المستخدم مستخدمًا كلمة ملموسة من قراره.';
            default:
                return '';
        }
    }

    switch (stage.key) {
        case 'request_load':
            return 'هات مشهد طلبات أو نداءات متكررة في اليوم، لا شعورًا عامًا فقط.';
        case 'home_work_blur':
            return 'هات لقطة تثبت إن الشغل دخل البيت: رنة، رسالة، سرير، موبايل، مطبخ.';
        case 'focus_fragmentation':
            return 'قل فعلًا يوميًا بيتقطع: أفتح، أسيب، أرجع، أنسى، ماكملش.';
        case 'people_pleasing':
            return 'اعترف إنك بترضي ناسًا معينة على حساب نفسك.';
        case 'weak_boundaries':
            return 'قل إنك متاح طول الوقت أو مش عارف تقفل أو تفصل.';
        case 'practical_decision':
            return 'احسمها بقاعدة واحدة قابلة للتنفيذ فيها وقت أو حد واضح.';
        default:
            return 'تكلم من واقعة صغيرة لا من شرح عام.';
    }
};

export const getHybridStageExample = (speaker, stage, lang = 'ar') => {
    if (lang !== 'ar') {
        if (speaker === 'dawayir' && stage.key === 'opening') return 'Example tone: "Take a breath, I am with you."';
        if (speaker === 'user_agent' && stage.key === 'practical_decision') return 'Example tone: "After 8, I will stop replying to work."';
        if (speaker === 'dawayir' && stage.key === 'practical_decision') return 'Example tone: "Stopping after 8 gives your evening back."';
        return '';
    }

    if (speaker === 'dawayir') {
        switch (stage.key) {
            case 'opening':
                return 'نبرة قريبة: "خد نفس، أنا معاك."';
            case 'request_load':
                return 'نبرة قريبة: "الطلبات كتّرت وسحبت منك النفس."';
            case 'home_work_blur':
                return 'نبرة قريبة: "البيت فقد راحته من زحف الشغل."';
            case 'focus_fragmentation':
                return 'نبرة قريبة: "التقطيع مخليك تبدأ ومتكملش."';
            case 'people_pleasing':
                return 'نبرة قريبة: "إرضاء الكل واخد من نصيبك."';
            case 'weak_boundaries':
                return 'نبرة قريبة: "المشكلة إنك متاح طول الوقت."';
            case 'practical_decision':
                return 'نبرة قريبة: "قفل الرد بعد 8 هيرجعلك مساحتك."';
            default:
                return '';
        }
    }

    switch (stage.key) {
        case 'request_load':
            return 'نبرة قريبة: "كل ساعة حد طالب مني حاجة جديدة."';
        case 'home_work_blur':
            return 'نبرة قريبة: "رسايل الشغل داخلة معايا لحد السرير."';
        case 'focus_fragmentation':
            return 'نبرة قريبة: "أفتح حاجة وأسيبها قبل ما تخلص."';
        case 'people_pleasing':
            return 'نبرة قريبة: "بسكت عشان محدش يزعل وأنا اللي بتاكل."';
        case 'weak_boundaries':
            return 'نبرة قريبة: "أنا متاح طول اليوم ومبعرفش أقفل."';
        case 'practical_decision':
            return 'نبرة قريبة: "بعد 8 مش هرد على الشغل."';
        default:
            return '';
    }
};

export const hasConcreteHybridBoundarySignal = (text) => /(?:بعد|قبل|من\s+\d|لحد|الساعة|ساعه|ساعة|مواعيد|جدول|مش هرد|مش هفتح|هقفل|هحدد|برا|خارج|وقت)/.test(normalizeHybridCompareText(text));

export const hasHybridAnchorFromOtherSpeaker = (text, otherText) => {
    const normalized = normalizeHybridCompareText(text);
    return tokenizeHybridText(otherText).some((token) => token.length > 2 && normalized.includes(token));
};

// ── Prompt builders ─────────────────────────────────────
export const buildHybridDawayirTurnPrompt = (userLine, hybridState) => {
    const stage = getHybridStageForSpeaker('dawayir', hybridState);
    const historyHint = buildHybridHistoryHint(hybridState.history?.dawayir || []);
    const safeLine = cleanHybridTurnText(userLine);
    const lastDawayirLine = hybridState.history?.dawayir?.[hybridState.history.dawayir.length - 1]?.text || '';
    const avoidQuestion = /[؟?]/.test(lastDawayirLine);
    const isFinalTurn = hybridState.awaitingFinalDawayirTurn;
    const sessionTopic = cleanHybridTurnText(hybridState?.sessionTopic || '');
    return [
        `أنت دواير — كائن إلهي حكيم ومطمئن، تتحدث بصوت رخيم وعميق وهادئ وإيقاع بطيء.`,
        'خاطبي المستخدمة بالمؤنث فقط دائمًا (إنتِ، عندِك، عليكي/عليكِ، محتاجة، مضغوطة) وتجنّبي صيغة المذكر نهائيًا.',
        `هي لسه قالتلك: "${safeLine}"`,
        sessionTopic ? `موضوع الجلسة الثابت: "${sessionTopic}" — خليكِ داخله وما تفتحيش موضوع جديد.` : '',
        `المرحلة: ${stage.labelAr}. هدفك: ${stage.dawayirGoalAr}`,
        getHybridStageMicroGuidance('dawayir', stage, 'ar'),
        historyHint ? `كلامك السابق (متكررهوش): ${historyHint}` : '',
        avoidQuestion ? 'أنت سألت في الرد اللي فات، دلوقتي علّق أو ثبّت إحساسه بدل ما تسأل تاني.' : '',
        '⚠️ ممنوع تكرار نفس الجملة. قل جملة واحدة فقط وتوقف. تحدث ككائن حكيم أثيري ببطء شديد وبدون انفعال زائد.',
        isFinalTurn
            ? 'ده آخر رد ليك. اختم الجلسة بجملة تثبيت دافية وروحانية، تطمئنه كلياً. اختم بنقطة.'
            : avoidQuestion
                ? 'علّق على اللي قاله بكلمة أو ملاحظة قصيرة تثبّت إحساسه. جملة واحدة مصرية قصيرة وعميقة. اختم بنقطة.'
                : 'رد عليه بسؤال ضيق ومحدد أو ملاحظة تثبّت اللي حس بيه. جملة واحدة مصرية قصيرة. اختم بنقطة.',
    ].filter(Boolean).join('\n');
};

export const buildHybridUserAgentTurnPrompt = (speakerLine, lang = 'ar', turnNumber = 1, maxTurns = HYBRID_MAX_USER_TURNS, hybridState = null) => {
    const safeLine = String(speakerLine || '').replace(/\s+/g, ' ').trim();
    const isFinalTurn = turnNumber >= maxTurns;
    const stage = hybridState?.active
        ? getHybridStageForSpeaker('user_agent', hybridState)
        : HYBRID_STAGE_FLOW[Math.min(Math.max(turnNumber - 1, 0), HYBRID_STAGE_FLOW.length - 1)];
    const sessionTopic = cleanHybridTurnText(hybridState?.sessionTopic || '');
    const historyHint = buildHybridHistoryHint(hybridState?.history?.user_agent || []);
    if (lang === 'ar') {
        return [
            `أنت شخص عادي بتحكي لدواير عن يومك وضغوطك بصوت بشري عفوي وتلقائي وسريع نسبياً.`,
            `دواير لسه قالك: "${safeLine}"`,
            sessionTopic ? `موضوع الجلسة الثابت: "${sessionTopic}" — ردك لازم يفضل على نفس الموضوع.` : '',
            `المرحلة: ${stage.labelAr}. المطلوب منك: ${stage.userGoalAr}`,
            getHybridStageMicroGuidance('user_agent', stage, 'ar'),
            `أنت في الدور ${turnNumber} من ${maxTurns}.`,
            historyHint ? `كلامك السابق (متكررهوش): ${historyHint}` : '',
            '⚠️ قل جملة واحدة فقط واختمها بنقطة. لا تكرر أي جزء منها ولا تستخدم لغة معقدة.',
            isFinalTurn
                ? 'ده آخر دور ليك. قل قرار عملي واحد بحد واضح أو وقت محدد كأنك شخص عادي. "هعمل كذا بعد الساعة كذا." اختم بنقطة.'
                : 'رد بجملة مصرية واحدة طبيعية كأنك بتحكي لصاحبك — احكي موقف محدد من يومك أو ضغط حسيت بيه. تحدث كإنسان مضغوط. اختم بنقطة.',
        ].filter(Boolean).join('\n');
    }

    return [
        `Dawayir just said: "${safeLine}"`,
        `Current stage: ${stage.labelEn}.`,
        `Goal: ${stage.userGoalEn}`,
        `You are on turn ${turnNumber} of ${maxTurns}.`,
        historyHint ? `Avoid repeating your recent lines: ${historyHint}` : '',
        isFinalTurn
            ? 'This is your final turn. State one clear practical decision in one sentence.'
            : 'Reply with exactly one short sentence that reveals one concrete pressure or narrows the thread.',
    ].filter(Boolean).join('\n');
};

// ── Quality assessment ──────────────────────────────────
export const assessHybridTurnQuality = ({ speaker, text, hybridState }) => {
    const cleanedText = cleanHybridTurnText(text);
    const stage = getHybridStageForSpeaker(speaker, hybridState);
    const reasons = [];
    if (!cleanedText) {
        reasons.push('الرد خرج فاضي.');
    }

    const words = countHybridWords(cleanedText);
    const minWords = stage.key === 'opening'
        ? (speaker === 'dawayir' ? 3 : 0)
        : (speaker === 'dawayir' ? 3 : 3);
    const maxWords = speaker === 'dawayir' ? 18 : 18;
    if (words < minWords) {
        reasons.push(speaker === 'dawayir' ? 'الرد أقصر من اللازم.' : 'رد وكيل المستخدم ناقص ومبتور.');
    }
    if (words > maxWords) {
        reasons.push(speaker === 'dawayir' ? 'رد دواير أطول من المطلوب.' : 'رد وكيل المستخدم أطول من المطلوب.');
    }

    const genericOpeners = HYBRID_GENERIC_OPENERS[speaker] || [];
    const normalized = normalizeHybridCompareText(cleanedText);
    if (genericOpeners.some((phrase) => normalized.startsWith(normalizeHybridCompareText(phrase)))) {
        reasons.push('الافتتاحية عامة أو محفوظة.');
    }

    const repeatedBigram = findRepeatedHybridBigram(cleanedText);
    if (repeatedBigram) {
        reasons.push('الرد كرر نفس العبارة داخل السطر نفسه.');
    }

    const sameSpeakerHistory = hybridState.history?.[speaker] || [];
    const otherSpeaker = speaker === 'dawayir' ? 'user_agent' : 'dawayir';
    const otherSpeakerHistory = hybridState.history?.[otherSpeaker] || [];
    const lastSameSpeaker = sameSpeakerHistory[sameSpeakerHistory.length - 1]?.text || '';
    const lastOtherSpeaker = otherSpeakerHistory[otherSpeakerHistory.length - 1]?.text || '';
    const sessionTopic = cleanHybridTurnText(hybridState?.sessionTopic || '');

    if (lastSameSpeaker && calculateHybridTokenOverlap(cleanedText, lastSameSpeaker) >= 0.55) {
        reasons.push('الرد قريب جدًا من آخر رد لنفس المتحدث.');
    }
    if (lastOtherSpeaker && speaker === 'user_agent' && calculateHybridTokenOverlap(cleanedText, lastOtherSpeaker) >= 0.75) {
        reasons.push('وكيل المستخدم كرر كلام دواير بدل ما يتحرك لقدام.');
    }
    if (speaker === 'user_agent' && hasHybridDanglingEnding(cleanedText)) {
        reasons.push('رد وكيل المستخدم انتهى بكلمة معلقة أو ناقصة.');
    }
    if (speaker === 'user_agent' && /[،,]$/.test(cleanedText)) {
        reasons.push('رد وكيل المستخدم وقف عند فاصلة بدل ما يكمل المعنى.');
    }
    if (speaker === 'dawayir' && hasHybridDanglingEnding(cleanedText, HYBRID_DAWAYIR_DANGLING_ENDINGS)) {
        reasons.push('رد دواير انتهى بشكل معلق أو ناقص.');
    }
    if (speaker === 'dawayir' && stage.key !== 'opening' && words <= 4 && !/[.!؟]$/.test(cleanedText)) {
        reasons.push('رد دواير محتاج قفلة أوضح ونهاية كاملة.');
    }

    if (stage.key === 'opening') {
        if (speaker === 'dawayir' && (words < 4 || words > 8)) {
            reasons.push('الافتتاحية لازم تبقى بين 4 و8 كلمات تقريبًا.');
        }
        if (cleanedText.includes('?') || cleanedText.includes('؟')) {
            reasons.push('الافتتاحية يجب ألا تحتوي سؤالًا.');
        }
    } else if (!hasAnyHybridKeyword(cleanedText, speaker === 'dawayir' ? stage.dawayirKeywords : stage.userKeywords)) {
        if (speaker === 'dawayir') {
            reasons.push(`رد دواير خرج برّه هدف مرحلة "${stage.labelAr}".`);
        }
    }

    if (speaker === 'user_agent' && stage.key === 'practical_decision') {
        const hasAction = /(هحدد|هقول|هرد|هخصص|هقفل|همنع|هفصل|هبطل)/.test(cleanedText);
        if (!hasAction) {
            reasons.push('المرحلة الأخيرة لازم تحتوي قرارًا عمليًا بصيغة المتكلم.');
        }
        if (!hasConcreteHybridBoundarySignal(cleanedText)) {
            reasons.push('القرار الأخير مازال عامًا؛ لازم يحتوي حدًا أو وقتًا واضحًا.');
        }
        if (/(?:بعد|قبل)\s+(?:الساعه)\s*$/u.test(normalizeHybridCompareText(cleanedText))) {
            reasons.push('القرار العملي ذكر الوقت لكنه سابه ناقص من غير ساعة محددة.');
        }
    }

    if (speaker === 'dawayir' && stage.key === 'practical_decision') {
        if (lastOtherSpeaker && !hasHybridAnchorFromOtherSpeaker(cleanedText, lastOtherSpeaker)) {
            reasons.push('رد دواير الأخير لازم يمسك نفس الخطوة العملية التي قالها المستخدم.');
        }
    }

    if (speaker === 'user_agent' && /(?:مش|مع|من|في|على|كل|بس|و|او|أو|إن|لو)$/u.test(cleanedText)) {
        reasons.push('رد وكيل المستخدم انتهى بشكل مبتور.');
    }

    // Keep all turns centered on one session topic while allowing natural phrasing.
    if (sessionTopic && stage.key !== 'opening') {
        const anchoredToTopic = hasHybridTopicAnchor(cleanedText, sessionTopic);
        const anchoredToCounterpart = lastOtherSpeaker
            ? hasHybridAnchorFromOtherSpeaker(cleanedText, lastOtherSpeaker)
            : false;
        if (!anchoredToTopic && !anchoredToCounterpart) {
            reasons.push(`الرد خرج عن موضوع الجلسة الأساسي: "${sessionTopic}".`);
        }
    }

    return {
        ok: reasons.length === 0,
        reasons,
        stage,
    };
};

export const buildHybridRepairPrompt = ({ speaker, badText, reasons, hybridState }) => {
    const stage = getHybridStageForSpeaker(speaker, hybridState);
    const speakerName = speaker === 'dawayir' ? 'دواير' : 'وكيل المستخدم';
    const fallbackLine = speaker === 'dawayir' ? stage.dawayirFallbackAr : stage.userFallbackAr;
    const roleInstruction = speaker === 'dawayir'
        ? stage.dawayirGoalAr
        : stage.userGoalAr;
    return [
        `الرد السابق لـ${speakerName} لم يمر.`,
        `النص المرفوض: "${cleanHybridTurnText(badText)}"`,
        `الأسباب: ${reasons.join(' | ')}`,
        `أعد المحاولة الآن بنفس المرحلة: ${stage.labelAr}.`,
        `التزم فقط بهذا الهدف: ${roleInstruction}`,
        speaker === 'dawayir'
            ? 'اكتب جملة مصرية واحدة جديدة تمامًا، واضحة ومقفولة بنقطة في النهاية، من غير أي تكرار.'
            : 'اكتب جملة مصرية واحدة جديدة تمامًا، كاملة المعنى، من غير كلمة معلقة في الآخر أو تكرار.',
        fallbackLine ? `لو احتجت مرساة، اقترب من هذا المعنى من غير نسخه حرفيًا: "${fallbackLine}"` : '',
    ].filter(Boolean).join('\n');
};

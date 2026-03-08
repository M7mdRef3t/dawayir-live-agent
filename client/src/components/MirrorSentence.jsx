/**
 * FEATURE ⑭ — THE MIRROR SENTENCE
 * "الجملة التي تحكي رحلتك كلها في كلمات"
 *
 * At session end, generates ONE poetic sentence summarizing the journey.
 * Based on: which circles dominated, how many transitions happened,
 * and whether the session ended at Clarity.
 *
 * Examples:
 * AR: "بدأت من الخوف... وبعد رحلة صادقة، وصلت للقرار."
 * EN: "You started from fear... and after an honest journey, reached your decision."
 */
import React, { useMemo } from 'react';

// Journey arc templates keyed by: start_node → end_node → transitions_bucket
const MIRROR_TEMPLATES = {
    ar: {
        // Awareness → Truth (rare directup)
        '1→3_few': ['بدأت من المشاعر... قفزت مباشرةً للوضوح — ثقتك بنفسك حاضرة.', 'من القلب مباشرةً للحقيقة — هذا الوعي الحقيقي.'],
        '1→3_many': ['رحلة طويلة من الإحساس... وصلت في النهاية لما كنت تعرفه دائماً.'],
        // Awareness → Knowledge → Truth (full arc)
        '1→2→3_few': ['من الفوضى... للتفكير... للوضوح. هذا هو المسار الأجمل.', 'شعرت، فكّرت، وقررت. المسار الكامل في جلسة واحدة.'],
        '1→2→3_many': ['رحلة ثرية — بدأت بمشاعر متشابكة وانتهت بقرار واضح. أنت تنمو.'],
        // Stayed mostly in Awareness
        '1→1_few': ['كانت جلسة مشاعر عميقة — الوعي العاطفي هو البداية دائماً.'],
        '1→1_many': ['جلسة للتجهيز العاطفي — أحياناً نحتاج أن نشعر قبل أن نفكر.'],
        // Knowledge dominant
        '2→2_few': ['جلسة تحليلية — عقلك كان يعمل بعمق.', 'رأيت المشكلة من كل الزوايا — الفهم خطوة للوضوح.'],
        '2→3_few': ['من التحليل... لليقين. قرارك مبني على أساس متين.'],
        // Truth reached
        '3→3_few': ['وصلت للوضوح بسرعة — هذا نادر وجميل.'],
        // Default
        'default': ['رحلة صادقة نحو الوضوح — كل خطوة كان لها معنى.'],
    },
    en: {
        '1→3_few': ["You moved from feelings directly to clarity — rare and powerful.", "From the heart straight to truth — this is true awareness."],
        '1→3_many': ["A long journey from emotion... you arrived at what you always knew."],
        '1→2→3_few': ["From chaos... to thinking... to clarity. The most beautiful arc.", "You felt, thought, and decided. The full journey in one session."],
        '1→2→3_many': ["A rich journey — you started with tangled feelings and ended with a clear decision."],
        '1→1_few': ["A session of deep feeling — emotional awareness is always the beginning."],
        '1→1_many': ["An emotional processing session — sometimes we need to feel before we think."],
        '2→2_few': ["An analytical session — your mind was working deeply."],
        '2→3_few': ["From analysis... to certainty. Your decision stands on solid ground."],
        '3→3_few': ["You reached clarity quickly — that's rare and beautiful."],
        'default': ["An honest journey toward clarity — every step had meaning."],
    },
};

function getMirrorKey(journeyPath, transitionCount) {
    const bucket = transitionCount <= 2 ? 'few' : 'many';
    const simplePath = journeyPath.join('→');
    const key = `${simplePath}_${bucket}`;
    return key;
}

function MirrorSentence({ journeyPath = [1], transitionCount = 0, lang = 'ar', visible = false }) {
    const sentence = useMemo(() => {
        if (!visible || journeyPath.length === 0) return '';
        const templates = MIRROR_TEMPLATES[lang] || MIRROR_TEMPLATES.ar;
        const key = getMirrorKey(journeyPath, transitionCount);
        const choices = templates[key] || templates['default'];
        // Pick deterministically based on transitionCount
        return choices[transitionCount % choices.length];
    }, [journeyPath, transitionCount, lang, visible]);

    if (!visible || !sentence) return null;

    return (
        <div className="mirror-sentence-wrap">
            <div className="mirror-sentence-ornament">✦</div>
            <blockquote className="mirror-sentence-text">
                "{sentence}"
            </blockquote>
            <div className="mirror-sentence-label">
                {lang === 'ar' ? '— مرايا رحلتك' : '— Your journey mirror'}
            </div>
        </div>
    );
}

export default MirrorSentence;

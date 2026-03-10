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
        '1→3_few': ['بدأت من الإحساس... ووصلت للوضوح بسرعة نادرة.', 'من القلب للحقيقة على طول — وده معناه إنك كنت شايفها من جوه.'],
        '1→3_many': ['رحلة طويلة من الإحساس... وفي الآخر وصلت للحقيقة اللي كانت مستخبية من الأول.'],
        // Awareness → Knowledge → Truth (full arc)
        '1→2→3_few': ['من اللخبطة... للتفكير... للوضوح. ده كان مسار كامل فعلًا.', 'حسّيت، فكّرت، وقررت. الجلسة أخدت رحلتها كاملة.'],
        '1→2→3_many': ['رحلة غنية بدأت بمشاعر متشابكة وانتهت بقرار أوضح من الأول.'],
        // Stayed mostly in Awareness
        '1→1_few': ['كانت جلسة إحساس عميق، وده غالبًا أول باب للفهم.'],
        '1→1_many': ['الجلسة فضلت مع الإحساس، ويمكن ده كان المطلوب قبل أي تحليل.'],
        // Knowledge dominant
        '2→2_few': ['الجلسة كانت تحليلية، ودماغك كان شغال بعمق.', 'لفّيت المشكلة من كل ناحية، وده قرّبك من الوضوح.'],
        '2→3_few': ['من التحليل... لليقين. القرار هنا طالع من أرض ثابتة.'],
        // Truth reached
        '3→3_few': ['وصلت للوضوح بسرعة، ودي لحظة قليلة بس قوية.'],
        // Default
        'default': ['رحلة صادقة ناحية الوضوح، وكل خطوة فيها كان لها معنى.'],
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
            <blockquote className="mirror-sentence-text">{sentence}</blockquote>
            <div className="mirror-sentence-label">
                {lang === 'ar' ? '— مرآة رحلتك' : '— Your journey mirror'}
            </div>
        </div>
    );
}

export default MirrorSentence;

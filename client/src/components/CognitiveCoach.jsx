/**
 * FEATURE ⑦ — COGNITIVE COACH (One Behavioral Insight)
 * "مش تحليل نفسي — فعل محدد واحد تعمله بكرة"
 *
 * Generates ONE specific behavioral suggestion based on session data.
 * Looks at dominant circle + most frequent topics → concrete next action.
 */
import React, { useMemo } from 'react';

const INSIGHTS_AR = {
    awareness_stress: [
        'خلي بالك: لما تحس بتوتر زي اللي اتكلمنا عنه، اعمل 4 نفسات بطيئة قبل ما ترد على أي حاجة.',
        'حاول الأسبوع الجاية تكتب جملة واحدة كل صبح: "أنا حاسس بـ ..." ده بيفتح دائرة الوعي.',
        'لاحظنا توتر متكرر — جرب تحدد وقت محدد في اليوم "وقت القلق" وماعداه ارفض أي أفكار سلبية.',
    ],
    awareness_general: [
        'مشاعرك قوية — استخدمها. اكتب 3 مشاعر حسيت بيها النهارده بدون حكم على نفسك.',
        'جسمك بيسجل مشاعرك قبل عقلك. جرب تلاحظ أين تحس بالتوتر في جسمك غداً.',
    ],
    knowledge_analytical: [
        'أنت في مرحلة تحليل قوية — خلي دماغك يرتاح ساعة من الأسئلة الكبيرة قبل ما تنام.',
        'فكرك شغال بجد. العبقرية بتيجي بعد الراحة — خلي الفكرة "تترقد" قبل ما تقرر.',
        'لما تلاقي نفسك بتحلل كتير، اسأل سؤال واحد: "إيه أبسط خطوة أقدر أعملها دلوقتي؟"',
    ],
    truth_decision: [
        'وصلت لوضوح في جزء مهم — دوّنه جملة واحدة قبل ما تنام عشان ما تنساش.',
        'القرار اللي اتكلمنا عنه: حدد موعد محدد للتنفيذ. "هعمله" من غير موعد = مش هيتعمل.',
        'وضوحك النهارده قيمته — شاركه مع شخص واحد قريب منك. التعهد العلني بيضاعف الالتزام.',
    ],
    general: [
        'خد دقيقتين دلوقتي تكتب إيه أكبر شيء اتضح لك النهارده.',
        'الجلسة دي ليها قيمة — ارجعلها بعد أسبوع وشوف إيه اللي اتغير.',
        'الوعي الإدراكي بيبدأ بملاحظة — اسأل نفسك كل يوم: "أنا دلوقتي في أيه؟"',
    ],
};

const INSIGHTS_EN = {
    awareness_stress: [
        'Notice: When you feel the tension we discussed, take 4 slow breaths before responding to anything.',
        'Try writing one sentence each morning: "Today I feel..." — this activates your Awareness circle.',
        'We noticed recurring stress — try designating a "worry window" and refuse anxious thoughts outside it.',
    ],
    awareness_general: [
        'Your emotions are strong — use them. Write 3 feelings from today without judging yourself.',
        'Your body records feelings before your mind does. Notice tomorrow where you feel tension physically.',
    ],
    knowledge_analytical: [
        'You\'re in deep analytical mode — give your mind 1 hour off from big questions before sleep.',
        'Your thinking is working hard. Brilliance comes after rest — let the idea "settle" before deciding.',
        'When you catch yourself over-analyzing, ask: "What\'s the simplest step I can take right now?"',
    ],
    truth_decision: [
        'You reached clarity on something important — write it in one sentence before sleep so you don\'t lose it.',
        'The decision we discussed: set a specific date to act. "I\'ll do it" without a date = it won\'t happen.',
        'Your clarity today is valuable — share it with one trusted person. Public commitment doubles follow-through.',
    ],
    general: [
        'Take 2 minutes now to write the biggest thing that became clear to you today.',
        'This session has value — revisit it in a week and see what changed.',
        'Cognitive awareness starts with noticing — ask yourself daily: "Where am I right now?"',
    ],
};

function generateInsight(reportContent, lang) {
    const content = reportContent.toLowerCase();
    const INSIGHTS = lang === 'ar' ? INSIGHTS_AR : INSIGHTS_EN;

    // Simple keyword scoring
    const stressWords = ['توتر', 'قلق', 'ضغط', 'خوف', 'stress', 'anxiety', 'fear', 'pressure', 'overwhelm'];
    const thinkWords = ['تحليل', 'تفكير', 'أسئلة', 'analyse', 'think', 'question', 'wonder', 'understand'];
    const decideWords = ['قرار', 'وضوح', 'حل', 'decision', 'clear', 'resolve', 'choose', 'certain'];

    const stressScore = stressWords.filter(w => content.includes(w)).length;
    const thinkScore = thinkWords.filter(w => content.includes(w)).length;
    const decideScore = decideWords.filter(w => content.includes(w)).length;

    let pool;
    if (stressScore >= 2) pool = INSIGHTS.awareness_stress;
    else if (decideScore >= 2) pool = INSIGHTS.truth_decision;
    else if (thinkScore >= 2) pool = INSIGHTS.knowledge_analytical;
    else if (stressScore >= 1) pool = INSIGHTS.awareness_general;
    else pool = INSIGHTS.general;

    // Pick deterministically from content hash
    const idx = (content.length + stressScore * 3 + decideScore * 7) % pool.length;
    return pool[idx];
}

function CognitiveCoach({ reportContent = '', lang = 'ar' }) {
    const insight = useMemo(() => generateInsight(reportContent, lang), [reportContent, lang]);

    if (!reportContent) return null;

    return (
        <div className="cognitive-coach-card">
            <div className="coach-header">
                <span className="coach-icon">🎯</span>
                <div>
                    <h4 className="coach-title">
                        {lang === 'ar' ? 'فعل واحد — لأسبوع كامل' : 'One Action — For a Full Week'}
                    </h4>
                    <p className="coach-sub">
                        {lang === 'ar'
                            ? 'مبني على ما كشفته هذه الجلسة'
                            : 'Based on what this session revealed'}
                    </p>
                </div>
            </div>
            <blockquote className="coach-insight">
                {insight}
            </blockquote>
            <div className="coach-footer">
                <span className="coach-tag">
                    {lang === 'ar' ? '⏱ أسبوع واحد' : '⏱ One week'}
                </span>
                <span className="coach-tag">
                    {lang === 'ar' ? '🎯 فعل محدد' : '🎯 Specific action'}
                </span>
            </div>
        </div>
    );
}

export default CognitiveCoach;

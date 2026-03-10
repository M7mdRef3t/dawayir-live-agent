/**
 * FEATURE 6 - COGNITIVE COACH
 *
 * Generates one specific behavioral suggestion based on session data.
 */
import React, { useMemo } from 'react';

const INSIGHTS_AR = {
  awareness_stress: [
    'لما تحس إن التوتر بيعلى، خد 4 أنفاس بطيئة قبل ما ترد أو تقرر أي حاجة.',
    'الأسبوع ده اكتب كل صباح جملة واحدة: "أنا حاسس بـ..." عشان تلتقط إحساسك بدري.',
    'لو القلق بيتكرر، خصص له 10 دقايق في اليوم وباقي الوقت ارجّع نفسك للحظة الحالية.',
  ],
  awareness_general: [
    'اكتب 3 مشاعر حسيت بيهم النهارده من غير ما تحكم على نفسك.',
    'بكرة لاحظ التوتر بيظهر فين في جسمك قبل ما تشرح لنفسك سببه.',
  ],
  knowledge_analytical: [
    'قبل ما تنام، ادّي دماغك ساعة من غير أسئلة كبيرة ولا تحليلات زيادة.',
    'الفكرة محتاجة تهدى شوية. سيبها تترتب قبل ما تاخد قرار.',
    'لما تلاقي نفسك بتفكر كتير، اسأل: "إيه أبسط خطوة أقدر أعملها دلوقتي؟"',
  ],
  truth_decision: [
    'اكتب أوضح فكرة وصلت لها النهارده في سطر واحد عشان ما تضيعش منك.',
    'القرار اللي طلع من الجلسة محتاج ميعاد واضح. من غير ميعاد غالبًا هيتأجل.',
    'شارك الوضوح اللي وصلت له مع شخص واحد قريب منك عشان يثبت أكتر.',
  ],
  general: [
    'خد دقيقتين واكتب إيه أكتر حاجة وضحت لك من الجلسة.',
    'ارجع للجلسة دي بعد أسبوع وشوف إيه اللي فعلاً اتغيّر.',
    'مرة كل يوم اسأل نفسك: "أنا محتاج إيه دلوقتي؟"',
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
    "You're in deep analytical mode — give your mind 1 hour off from big questions before sleep.",
    'Your thinking is working hard. Brilliance comes after rest — let the idea "settle" before deciding.',
    'When you catch yourself over-analyzing, ask: "What\'s the simplest step I can take right now?"',
  ],
  truth_decision: [
    "You reached clarity on something important — write it in one sentence before sleep so you don't lose it.",
    `The decision we discussed: set a specific date to act. "I'll do it" without a date = it won't happen.`,
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
  const insights = lang === 'ar' ? INSIGHTS_AR : INSIGHTS_EN;

  const stressWords = ['توتر', 'قلق', 'ضغط', 'خوف', 'stress', 'anxiety', 'fear', 'pressure', 'overwhelm'];
  const thinkWords = ['تحليل', 'تفكير', 'أسئلة', 'analyse', 'think', 'question', 'wonder', 'understand'];
  const decideWords = ['قرار', 'وضوح', 'حل', 'decision', 'clear', 'resolve', 'choose', 'certain'];

  const stressScore = stressWords.filter((word) => content.includes(word)).length;
  const thinkScore = thinkWords.filter((word) => content.includes(word)).length;
  const decideScore = decideWords.filter((word) => content.includes(word)).length;

  let pool;
  if (stressScore >= 2) pool = insights.awareness_stress;
  else if (decideScore >= 2) pool = insights.truth_decision;
  else if (thinkScore >= 2) pool = insights.knowledge_analytical;
  else if (stressScore >= 1) pool = insights.awareness_general;
  else pool = insights.general;

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
            {lang === 'ar' ? 'خطوة واحدة للأسبوع ده' : 'One Action — For a Full Week'}
          </h4>
          <p className="coach-sub">
            {lang === 'ar' ? 'مبنية على اللي ظهر في الجلسة' : 'Based on what this session revealed'}
          </p>
        </div>
      </div>
      <blockquote className="coach-insight">{insight}</blockquote>
      <div className="coach-footer">
        <span className="coach-tag">
          {lang === 'ar' ? '⏱ لمدة أسبوع' : '⏱ One week'}
        </span>
        <span className="coach-tag">
          {lang === 'ar' ? '🎯 خطوة واضحة' : '🎯 Specific action'}
        </span>
      </div>
    </div>
  );
}

export default CognitiveCoach;

import React, { useMemo } from 'react';

const metricDeltaLabel = (value) => {
  const normalized = Number(value) || 0;
  return `${normalized >= 0 ? '+' : ''}${normalized}%`;
};

const pickPeakReason = (replayData, lang) => {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];
  if (steps.length === 0) {
    return lang === 'ar' ? 'لا توجد لحظة محفوظة بعد.' : 'No peak moment captured yet.';
  }

  let bestStep = steps[0];
  let bestScore = -Infinity;
  for (const step of steps) {
    const metrics = step?.metrics || {};
    const score = ((Number(metrics.clarityDelta) || 0) * 2.8) + (Number(metrics.equilibriumScore) || 0) - ((Number(metrics.overloadIndex) || 0) * 0.45);
    if (score > bestScore) {
      bestScore = score;
      bestStep = step;
    }
  }

  return bestStep?.reason || (lang === 'ar' ? 'لا توجد لحظة محفوظة بعد.' : 'No peak moment captured yet.');
};

const buildJudgeScript = ({ lang, replayData, compareDeltas, currentSnapshot }) => {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];
  const totalMoments = steps.length;
  const peakReason = pickPeakReason(replayData, lang);
  const clarityDelta = metricDeltaLabel(compareDeltas?.clarity || 0);
  const equilibriumDelta = metricDeltaLabel(compareDeltas?.equilibrium || 0);
  const overloadDelta = metricDeltaLabel(compareDeltas?.overload || 0);
  const equilibrium = currentSnapshot ? `${currentSnapshot.equilibrium}%` : '0%';

  if (lang === 'ar') {
    return `في أقل من دقيقة، دواير التقط ${totalMoments} لحظة حية وغيّر البيئة الإدراكية مباشرة بدل الرد النصي فقط. أقوى لحظة كانت: ${peakReason}. لدينا Why Now يشرح السبب، Replay يعيد الرحلة، وBefore/After يثبت التحسن: الوضوح ${clarityDelta}، التوازن ${equilibriumDelta}، والضغط ${overloadDelta}. هذا ليس chatbot، بل Cognitive OS حي وصل توازنه الحالي إلى ${equilibrium}.`;
  }

  return `In under a minute, Dawayir captured ${totalMoments} live moments and changed the cognitive environment instead of replying with text only. The strongest moment was: ${peakReason}. We have Why Now for explanation, Replay for evidence, and Before/After for proof: clarity ${clarityDelta}, equilibrium ${equilibriumDelta}, overload ${overloadDelta}. This is not a chatbot. It is a live cognitive OS currently sitting at ${equilibrium} equilibrium.`;
};

function JudgeModePanel({
  lang = 'ar',
  replayData = null,
  compareDeltas = null,
  currentSnapshot = null,
}) {
  const steps = Array.isArray(replayData?.steps) ? replayData.steps : [];

  const proofCards = useMemo(() => {
    const peakReason = pickPeakReason(replayData, lang);
    return [
      {
        title: lang === 'ar' ? 'الفعل قبل الرد' : 'Action Before Reply',
        value: lang === 'ar' ? `${steps.length} لحظة حية` : `${steps.length} live moments`,
        note: lang === 'ar' ? 'الوكيل يغيّر الدوائر قبل أن يصبح مجرد صوت.' : 'The agent changes circles before becoming just another voice.',
      },
      {
        title: lang === 'ar' ? 'Why Now' : 'Why Now',
        value: lang === 'ar' ? 'سبب مرئي' : 'Visible reasoning',
        note: peakReason,
      },
      {
        title: lang === 'ar' ? 'Replay + Diff' : 'Replay + Diff',
        value: lang === 'ar' ? 'أثر قابل للتدقيق' : 'Auditable evidence',
        note: lang === 'ar'
          ? `الوضوح ${metricDeltaLabel(compareDeltas?.clarity || 0)} • التوازن ${metricDeltaLabel(compareDeltas?.equilibrium || 0)}`
          : `Clarity ${metricDeltaLabel(compareDeltas?.clarity || 0)} • Equilibrium ${metricDeltaLabel(compareDeltas?.equilibrium || 0)}`,
      },
      {
        title: lang === 'ar' ? 'جاهز للمشاركة' : 'Share Ready',
        value: lang === 'ar' ? 'Poster + Reel' : 'Poster + Reel',
        note: lang === 'ar' ? 'يمكن تصدير لحظة فاصلة أو مقارنة قبل/بعد فورًا.' : 'A signature moment or before/after comparison can be exported immediately.',
      },
    ];
  }, [compareDeltas, lang, replayData, steps.length]);

  const judgeRoute = useMemo(() => ([
    lang === 'ar' ? 'ابدأ بالـ Signature Moment لإظهار أن النظام يفهم التحول.' : 'Start with the Signature Moment to show the system understands the turning point.',
    lang === 'ar' ? 'افتح Auto Highlight Reel لتثبت أن الجلسة قابلة للتكثيف في 3 لقطات فقط.' : 'Open the Auto Highlight Reel to prove the session compresses into 3 decisive clips.',
    lang === 'ar' ? 'اعرض Before / After لتثبت التحسن عبر الزمن لا داخل لحظة واحدة فقط.' : 'Show Before / After to prove improvement across time, not just inside one moment.',
    lang === 'ar' ? 'اختم بجملة: هذا ليس chatbot، بل Cognitive OS حي يمكن إعادة تشغيله ومقارنته.' : 'Close with: this is not a chatbot, but a live cognitive OS that can be replayed and compared.',
  ]), [lang]);

  const judgeScript = useMemo(() => buildJudgeScript({
    lang,
    replayData,
    compareDeltas,
    currentSnapshot,
  }), [compareDeltas, currentSnapshot, lang, replayData]);

  const handleCopyJudgeScript = async () => {
    if (!navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(judgeScript);
    window.alert(lang === 'ar' ? 'تم نسخ Judge Script.' : 'Judge script copied.');
  };

  if (steps.length === 0) return null;

  return (
    <section className="judge-mode-panel">
      <div className="judge-mode-header">
        <div>
          <span className="judge-mode-kicker">{lang === 'ar' ? 'Judge Mode' : 'Judge Mode'}</span>
          <h3>{lang === 'ar' ? 'ملخص التحكيم في 60 ثانية' : '60-second judging summary'}</h3>
          <p>{lang === 'ar' ? 'هذه الشاشة تضغط المنتج إلى إثباتات واضحة وسريعة للمحكم.' : 'This panel compresses the product into fast, defensible proof points for a judge.'}</p>
        </div>
        <button className="judge-mode-btn" onClick={handleCopyJudgeScript}>
          {lang === 'ar' ? 'انسخ Judge Script' : 'Copy Judge Script'}
        </button>
      </div>

      <div className="judge-proof-grid">
        {proofCards.map((card) => (
          <article key={card.title} className="judge-proof-card">
            <small>{card.title}</small>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </div>

      <div className="judge-mode-body">
        <div className="judge-route-panel">
          <span>{lang === 'ar' ? 'المسار المقترح' : 'Suggested Route'}</span>
          <ol>
            {judgeRoute.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="judge-script-panel">
          <span>{lang === 'ar' ? 'النص الجاهز' : 'Ready Script'}</span>
          <p>{judgeScript}</p>
        </div>
      </div>
    </section>
  );
}

export default JudgeModePanel;

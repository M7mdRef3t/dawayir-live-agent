import React, { useMemo } from 'react';

// Maps the dominant node to a human-readable personal insight based on the new framework:
// Circle 1 = وعي المستخدم (User Awareness — how they perceive their situation)
// Circle 2 = ما وصل له العلم (What Science knows — evidence-based knowledge)
// Circle 3 = الواقع (Reality — what actually IS in their life)
const CIRCLE_PERSONAL_INSIGHTS = {
  ar: {
    // Circle 1: وعي المستخدم
    1: {
      high: [
        'وعيك بنفسك مرتفع دلوقتي — كيف بتدرك اللي بيحصل معاك.',
        'إدراكك لحالتك قوي — ده أول خطوة في أي تغيير حقيقي.',
        'أنت واعي بإحساسك — سواء اتفق مع الواقع أو لأ، ده أساسي.',
        'وعيك الداخلي نشط — بتحس بفجوة بين اللي تحسه واللي موجود فعلاً؟',
      ],
      low: [
        'وعيك ساكت دلوقتي — حاجة بتتحجب عنك.',
        'إحساسك بنفسك خافت — ممكن في حاجة صعب تعترف بيها.',
        'وعيك منخفض — ده مش ضعف، ده علامة على ضغط داخلي.',
      ],
    },
    // Circle 2: ما وصل له العلم
    2: {
      high: [
        'العلم والمعرفة مؤثرة في اللحظة دي — في معلومة متعلمة بتلعب دور.',
        'اللي تعرفه عن نفسك وعن الناس بيأثر على طريقة شوفتك للموقف.',
        'المعرفة المتراكمة بتتكلم — العلم بيقول حاجة عن اللي بتحس بيه.',
        'في خبرة أو معرفة بتحرك تفكيرك دلوقتي.',
      ],
      low: [
        'المعرفة مش واضحة دلوقتي — اللي يعرفه العلم مش ظاهر في اللحظة دي.',
        'الخبرة المتراكمة مش متاحة دلوقتي — الإحساس أقوى.',
      ],
    },
    // Circle 3: الواقع
    3: {
      high: [
        'الواقع بيفرض نفسه دلوقتي — اللي موجود فعلاً في حياتك واضح.',
        'الحقائق الموضوعية في حياتك بتطلع للسطح — الواقع مش محتاج تفسير.',
        'دايرة الواقع نشطة — في حاجة موجودة فعلاً محتاج تعترف بيها.',
        'اللي بيحصل فعلاً — مش تفسيرك ليه — بيتكلم دلوقتي.',
      ],
      low: [
        'الواقع مش واضح دلوقتي — اللي موجود فعلاً مغطي بالإحساس.',
        'صعب تفصل بين الواقع وتفسيرك ليه دلوقتي.',
        'دايرة الواقع خافتة — ممكن بتتحاشى مواجهة حاجة.',
      ],
    },
  },
  en: {
    // Circle 1: User Awareness
    1: {
      high: [
        'Your self-awareness is high — you sense how you perceive what\'s happening.',
        'You are aware of your state — whether it matches reality or not, that\'s the first step.',
        'Your inner perception is active — do you feel a gap between what you sense and what is?',
        'Your awareness is watching itself — a rare and powerful state.',
      ],
      low: [
        'Your awareness is quiet — something is being blocked from view.',
        'Your sense of self is dim — there may be something hard to admit.',
        'Low awareness — not weakness, it\'s a sign of internal pressure.',
      ],
    },
    // Circle 2: What Science knows
    2: {
      high: [
        'Knowledge is influencing this moment — something learned is playing a role.',
        'What you know about yourself and people is shaping how you see this.',
        'Accumulated knowledge is speaking — it has something to say about what you feel.',
        'Science and experience are active in how you\'re processing this.',
      ],
      low: [
        'Knowledge isn\'t prominent now — feeling is stronger than knowing.',
        'What science knows isn\'t visible right now.',
      ],
    },
    // Circle 3: Reality
    3: {
      high: [
        'Reality is asserting itself — what actually exists in your life is becoming clear.',
        'Objective facts in your life are surfacing — reality doesn\'t need interpretation.',
        'The Reality circle is active — there\'s something that IS which needs acknowledging.',
        'What is actually happening — not your interpretation of it — is speaking now.',
      ],
      low: [
        'Reality isn\'t clear right now — what actually is is covered by feeling.',
        'Hard to separate reality from your interpretation of it right now.',
        'Reality circle is dim — you may be avoiding facing something.',
      ],
    },
  },
};


// Returns a deterministic-ish insight from the list based on a seed
function pickInsight(list, seed) {
  if (!list || !list.length) return '';
  const index = Math.abs(seed) % list.length;
  return list[index];
}

function CircleMeaningPanel({ nodes = [], dominantNodeId = 1, lang = 'ar', isConnected = false, sessionTurnCount = 0 }) {
  const insights = useMemo(() => {
    const langInsights = CIRCLE_PERSONAL_INSIGHTS[lang] || CIRCLE_PERSONAL_INSIGHTS.ar;
    return nodes.slice(0, 3).map((node) => {
      const id = Number(node.id);
      const radius = Number(node.radius) || 50;
      const isHigh = radius >= 60;
      const nodeInsights = langInsights[id];
      if (!nodeInsights) return null;
      const list = isHigh ? nodeInsights.high : nodeInsights.low;
      // Use sessionTurnCount as seed so insight changes as conversation progresses
      const text = pickInsight(list, sessionTurnCount + id * 7);
      return { id, radius, color: node.color, label: node.label, text, isHigh };
    }).filter(Boolean);
  }, [nodes, lang, sessionTurnCount]);

  const dominantInsight = insights.find(n => n.id === dominantNodeId) || insights[0];

  if (!isConnected || !dominantInsight) return null;

  return (
    <div className="circle-meaning-panel" aria-live="polite" aria-label={lang === 'ar' ? 'معنى الدوائر الحالية' : 'Current circle meanings'}>
      <div className="cmp-header">
        <span className="cmp-icon">🔮</span>
        <span className="cmp-title">
          {lang === 'ar' ? 'دواير اللحظة دي' : 'Your three lenses'}
        </span>
      </div>

      {/* Dominant circle insight — big and personal */}
      <div className="cmp-dominant-insight" style={{ '--cmp-color': dominantInsight.color }}>
        <div className="cmp-dominant-dot" style={{ background: dominantInsight.color }} />
        <div className="cmp-dominant-text">
          <span className="cmp-dominant-label">{dominantInsight.label}</span>
          <p className="cmp-dominant-sentence">{dominantInsight.text}</p>
        </div>
      </div>

      {/* All 3 circles mini-bar */}
      <div className="cmp-circles-bar">
        {insights.map(node => (
          <div
            key={node.id}
            className={`cmp-bar-item ${node.id === dominantNodeId ? 'cmp-bar-item--active' : ''}`}
          >
            <div
              className="cmp-bar-fill"
              style={{
                width: `${Math.round(node.radius)}%`,
                background: node.color,
                opacity: node.id === dominantNodeId ? 1 : 0.45,
              }}
              role="meter"
              aria-valuenow={Math.round(node.radius)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={node.label}
            />
            <span className="cmp-bar-label" style={{ color: node.id === dominantNodeId ? node.color : 'rgba(255,255,255,0.4)' }}>
              {node.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CircleMeaningPanel;

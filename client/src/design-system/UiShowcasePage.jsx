import React from 'react';

const DS = {
  cyan:    '#38B2D8', // Ocean Blue — Awareness
  green:   '#2ECC71', // Forest Green — Knowledge
  magenta: '#9B59B6', // Amethyst — Truth
  gold:    '#FFD166', // Joyful Gold — Insight moments
  bg:      '#020508',
  bg2:     '#080820',
  text:    '#f0f4ff',
};

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 48 }}>
    <h2 style={{
      fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color: DS.cyan, margin: '0 0 20px 0', opacity: 0.85,
    }}>
      {title}
    </h2>
    {children}
  </section>
);

const Swatch = ({ name, hex, role }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: hex, flexShrink: 0,
      boxShadow: `0 0 16px ${hex}55`,
    }} />
    <div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
      <div style={{ fontSize: 12, opacity: 0.55, fontFamily: 'JetBrains Mono, monospace' }}>{hex}</div>
      <div style={{ fontSize: 11, opacity: 0.4 }}>{role}</div>
    </div>
  </div>
);

const TypoRow = ({ label, size, weight, sample, arabic }) => (
  <div style={{
    padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 24,
    flexWrap: 'wrap',
  }}>
    <span style={{ fontSize: 11, opacity: 0.4, fontFamily: 'monospace', minWidth: 120 }}>
      {label} · {size} · w{weight}
    </span>
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: size, fontWeight: weight }}>{sample}</span>
      {arabic && (
        <span dir="rtl" style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: size, fontWeight: weight }}>
          {arabic}
        </span>
      )}
    </div>
  </div>
);

const ComponentCard = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <span style={{ fontSize: 11, opacity: 0.4, display: 'block', marginBottom: 6, fontFamily: 'monospace' }}>{label}</span>
    {children}
  </div>
);

const MetricCard = ({ label, labelAr, value, color }) => (
  <div style={{
    background: DS.bg2, borderRadius: 12, padding: '12px 16px',
    border: `1px solid ${color}22`, flex: 1, minWidth: 120,
  }}>
    <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>
      {label} · <span dir="rtl">{labelAr}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'Outfit', sans-serif" }}>
      {value}
    </div>
  </div>
);

const VOICE_EXAMPLES = [
  { ok: true,  en: "Take a breath — what's weighing on you most right now?",  ar: 'خد نفس — إيه أكتر حاجة مهمّاكش دلوقتي؟' },
  { ok: false, en: 'You need to work on your mental health.',                  ar: 'أنت محتاج تشتغل على صحتك النفسية.' },
  { ok: true,  en: "That's real — your mind is trying to organize itself.",    ar: 'ده حقيقي — عقلك بيرتب نفسه.' },
  { ok: false, en: 'Studies show that cognitive restructuring helps anxiety.',  ar: 'الدراسات بتقول إن CBT بيساعد في القلق.' },
];

export default function UiShowcasePage({ onBack }) {
  const pillarStyle = (color) => ({
    background: DS.bg2, borderRadius: 14, padding: '16px 20px',
    border: `1px solid ${color}33`, flex: 1,
    borderTop: `3px solid ${color}`,
  });

  return (
    <main style={{
      minHeight: '100vh', background: DS.bg,
      color: DS.text, padding: '32px 24px',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: DS.text, borderRadius: 8, padding: '6px 14px',
          cursor: 'pointer', fontSize: 13, marginBottom: 40,
          fontFamily: 'inherit',
        }}
      >
        ← Back
      </button>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <header style={{ marginBottom: 56 }}>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 700,
            margin: '0 0 6px 0',
            background: `linear-gradient(135deg, ${DS.cyan}, ${DS.magenta})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Dawayir Design System
          </h1>
          <p style={{ margin: 0, opacity: 0.45, fontSize: 14 }}>
            دواير · Cognitive OS · Brand Identity Showcase
          </p>
        </header>

        {/* Pillars */}
        <Section title="Brand Pillars · أركان الهوية">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Awareness · وعي', ar: 'صوتك أهم من رأيك في نفسك', en: 'Your voice matters more than your opinion of yourself', color: DS.cyan },
              { label: 'Knowledge · علم', ar: 'العقل بيرتب لما يتكلم', en: 'The mind organizes itself when it speaks', color: DS.green },
              { label: 'Reality · حقيقة', ar: 'مرآة، مش طبيب', en: 'A mirror, not a doctor', color: DS.magenta },
            ].map((p) => (
              <div key={p.label} style={pillarStyle(p.color)}>
                <div style={{ fontSize: 12, fontWeight: 600, color: p.color, marginBottom: 8 }}>{p.label}</div>
                <div dir="rtl" style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontSize: 13, marginBottom: 4, opacity: 0.9 }}>{p.ar}</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>{p.en}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Colors */}
        <Section title="Color System · نظام الألوان">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 32px' }}>
            <Swatch name="Ocean Blue — وعي"    hex={DS.cyan}    role="Awareness circle · primary brand" />
            <Swatch name="Forest Green — علم"  hex={DS.green}   role="Knowledge circle · active/live" />
            <Swatch name="Amethyst — حقيقة"    hex={DS.magenta} role="Truth circle · transformation" />
            <Swatch name="Joyful Gold — لحظة" hex={DS.gold}    role="Insight moments · truth contract" />
            <Swatch name="Deep Space" hex={DS.bg}      role="Primary background" />
            <Swatch name="Nebula"     hex={DS.bg2}     role="Card / panel backgrounds" />
          </div>
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(155,89,182,0.07)', border: '1px solid rgba(155,89,182,0.2)',
            fontSize: 12, opacity: 0.7,
          }}>
            ⚠ Forbidden pairs: Cyan + Green on same element · Neon on white backgrounds · Amethyst + Red
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography · الطباعة">
          <div style={{ background: DS.bg2, borderRadius: 12, padding: '4px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <TypoRow label="Display"  size={28} weight={700} sample="Clarity begins here" arabic="الوضوح يبدأ هنا" />
            <TypoRow label="Heading"  size={20} weight={600} sample="How do you feel right now?" arabic="إيه آخر حاجة قالتها في دماغك؟" />
            <TypoRow label="Body"     size={15} weight={400} sample="Your mind is organizing itself." arabic="عقلك بيرتب نفسه دلوقتي." />
            <TypoRow label="Caption"  size={12} weight={400} sample="Session · 14 march 2026" arabic="جلسة · ١٤ مارس ٢٠٢٦" />
            <TypoRow label="Mono"     size={12} weight={400} sample="equilibrium: 72%  overload: 18%" />
          </div>
        </Section>

        {/* Cognitive Metrics */}
        <Section title="Cognitive OS Metrics · مقاييس المعرفة">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <MetricCard label="Equilibrium" labelAr="التوازن"    value="72%"  color={DS.cyan} />
            <MetricCard label="Overload"    labelAr="الضغط"      value="18%"  color={DS.magenta} />
            <MetricCard label="Clarity Δ"  labelAr="الوضوح ▲"   value="+31%" color={DS.green} />
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Components · المكوّنات">
          <ComponentCard label=".primary-btn">
            <button className="primary-btn" style={{ marginRight: 12 }}>ادخل في السكون</button>
            <button className="primary-btn" disabled style={{ marginRight: 12 }}>جاري الاتصال...</button>
          </ComponentCard>
          <ComponentCard label=".secondary">
            <button className="secondary" style={{ marginRight: 12 }}>شاهد التجربة</button>
            <button className="secondary disconnect-btn">إنهاء الجلسة</button>
          </ComponentCard>
          <ComponentCard label=".icon-btn">
            <button className="icon-btn" style={{ marginRight: 8 }}>AR</button>
            <button className="icon-btn active" style={{ marginRight: 8 }}>EN</button>
            <button className="icon-btn" style={{ marginRight: 8 }}>🧠</button>
          </ComponentCard>
          <ComponentCard label=".ai-state-bar">
            <div className="ai-state-bar speaking" style={{ maxWidth: 260 }}>
              <div className="wave">
                <span /><span /><span /><span /><span />
              </div>
              دواير يتكلم...
            </div>
          </ComponentCard>
          <ComponentCard label="Status badges">
            <span className="status-badge connected" style={{ marginRight: 8 }}>Connected</span>
            <span className="status-badge connecting" style={{ marginRight: 8 }}>Connecting...</span>
            <span className="status-badge disconnected">Disconnected</span>
          </ComponentCard>
        </Section>

        {/* Journey */}
        <Section title="Journey Timeline · رحلة الجلسة">
          <div className="timeline-overlay" style={{ position: 'relative', display: 'flex', gap: 4 }}>
            {[
              { key: 'Overwhelmed', label_ar: 'مشتّت', nodeClass: 'completed' },
              { key: 'Focus',       label_ar: 'تركيز',  nodeClass: 'active' },
              { key: 'Clarity',     label_ar: 'وضوح',   nodeClass: '' },
            ].map((s) => (
              <div key={s.key} className={`timeline-node ${s.nodeClass}`}>
                <div className="node-dot" />
                <span className="node-label">{s.key} · {s.label_ar}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Voice */}
        <Section title="Brand Voice · نبرة دواير (Do / Don't)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VOICE_EXAMPLES.map((ex, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: ex.ok ? 'rgba(46,204,113,0.05)' : 'rgba(255,80,50,0.05)',
                borderRadius: 10, padding: '10px 14px',
                border: `1px solid ${ex.ok ? 'rgba(46,204,113,0.15)' : 'rgba(255,80,50,0.15)'}`,
              }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>{ex.ok ? '✅' : '❌'}</span>
                <div>
                  <div style={{ fontSize: 13 }}>{ex.en}</div>
                  <div dir="rtl" style={{ fontSize: 13, opacity: 0.7, marginTop: 3, fontFamily: "'Noto Kufi Arabic', sans-serif" }}>{ex.ar}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing Scale · مقياس المسافات">
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {[4, 8, 12, 16, 24, 32, 48, 64].map(px => (
              <div key={px} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: px, height: px,
                  background: `${DS.cyan}55`,
                  border: `1px solid ${DS.cyan}88`,
                  borderRadius: 3,
                }} />
                <span style={{ fontSize: 10, opacity: 0.4, fontFamily: 'monospace' }}>{px}</span>
              </div>
            ))}
          </div>
        </Section>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: 16, fontSize: 12, opacity: 0.3, textAlign: 'center' }}>
          Dawayir Design System · Cognitive OS · دواير ٢٠٢٦
        </footer>

      </div>
    </main>
  );
}


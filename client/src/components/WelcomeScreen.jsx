import React from 'react';

/**
 * WelcomeScreen — Landing page with branding, CTA buttons, and language toggle.
 * Extracted from App.jsx for maintainability.
 */
const WelcomeScreen = ({
  lang,
  t,
  isTransitioningToSetup,
  isWelcomeDemoLaunching,
  oneClickDemoCopy,
  logoSrc,
  onLaunchOneClickDemo,
  onEnterSetup,
  onOpenUiShowcase,
  onSetLang,
}) => (
  <div className={`welcome-screen ${isTransitioningToSetup ? 'exiting' : ''}`}>
    <h2 className="visually-hidden" data-view-heading="welcome" tabIndex={-1}>
      {t.viewHeadings.welcome}
    </h2>
    {/* Animated background orbs */}
    <div className="welcome-orbs" aria-hidden="true">
      <div className="welcome-orb welcome-orb-1" />
      <div className="welcome-orb welcome-orb-2" />
      <div className="welcome-orb welcome-orb-3" />
    </div>
    {/* Constellation particles */}
    <div className="welcome-particles" aria-hidden="true">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="welcome-particle" style={{
          left: `${4 + (i * 4.8) % 90}%`,
          top: `${6 + (i * 7.1) % 82}%`,
          animationDelay: `${(i * 0.4).toFixed(1)}s`,
          width: `${2 + i % 3}px`,
          height: `${2 + i % 3}px`,
        }} />
      ))}
    </div>

    <img src={logoSrc} alt="Dawayir" className="welcome-logo ds-slide-up-fade" />
    <div className="brand-name-large ds-slide-up-fade">{t.brandName}</div>
    <div className="brand-subtitle ds-slide-up-fade-delay">{t.brandSub}</div>
    <div className="brand-hook ds-slide-up-fade-delay"
      style={{ fontSize: '15px', opacity: 0.55, marginTop: '-8px', marginBottom: '4px', fontWeight: 400 }}
    >{t.brandHook}</div>

    {/* Three micro-circles preview */}
    <div className="welcome-circles-preview ds-slide-up-fade-delay" aria-hidden="true">
      <div className="wcp wcp-awareness" />
      <div className="wcp wcp-knowledge" />
      <div className="wcp wcp-truth" />
    </div>

    {/* CTA with glow ring */}
    <div className="welcome-cta-wrap ds-slide-up-fade-delay-more">
      <div className="welcome-cta-ring" aria-hidden="true" />
      <div className="welcome-cta-stack">
        <button
          className="primary-btn welcome-cta welcome-demo-cta"
          data-testid="start-session-btn"
          onClick={onEnterSetup}
          disabled={isWelcomeDemoLaunching}
        >
          {t.enterSpace}
        </button>
        <button
          className="secondary welcome-secondary-cta"
          onClick={onLaunchOneClickDemo}
          disabled={isWelcomeDemoLaunching}
        >
          {isWelcomeDemoLaunching ? oneClickDemoCopy.launching : oneClickDemoCopy.start}
        </button>
        <div className="welcome-demo-helper">{oneClickDemoCopy.helper}</div>
      </div>
    </div>

    <div className="lang-toggle-container ds-slide-up-fade-delay-more">
      <button
        aria-label={lang === 'ar' ? 'التبديل إلى العربية' : 'Switch to Arabic'}
        title={lang === 'ar' ? 'العربية' : 'Arabic'}
        className={`icon-btn lang-toggle ${lang === 'ar' ? 'active' : ''}`}
        data-testid="lang-ar-btn"
        onClick={() => onSetLang('ar')}
      >
        {lang === 'ar' ? 'عربى' : 'AR'}
      </button>
      <button
        aria-label={lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to English'}
        title={lang === 'ar' ? 'الإنجليزية' : 'English'}
        className={`icon-btn lang-toggle ${lang === 'en' ? 'active' : ''}`}
        data-testid="lang-en-btn"
        onClick={() => onSetLang('en')}
      >
        {lang === 'en' ? 'English' : 'EN'}
      </button>
    </div>
  </div>
);

export default WelcomeScreen;

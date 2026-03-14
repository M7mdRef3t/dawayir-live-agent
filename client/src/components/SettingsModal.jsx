import React, { useEffect, useState } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { DEFAULT_APP_SETTINGS, MIC_DEVICE_KEY } from '../utils/appSettings';

function SettingsModal({ lang, settings = DEFAULT_APP_SETTINGS, onClose, onLanguageChange, onSettingsChange, selectedMicId, onMicChange }) {
  const [audioDevices, setAudioDevices] = useState([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    }).catch(() => { });
  }, []);

  const toggle = (key) => onSettingsChange((current) => ({ ...current, [key]: !current[key] }));

  return (
    <Modal titleId="settings-title" onClose={onClose}>
      <div className="ds-modal__header">
        <h2 className="ds-modal__title" id="settings-title">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h2>
        <Button variant="icon" onClick={onClose} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="18 6 6 18"></polyline>
            <polyline points="6 6 18 18"></polyline>
          </svg>
        </Button>
      </div>

      <div className="ds-modal__body">
        <div style={{ marginBottom: 'var(--ds-space-6)' }}>
          <span className="ds-text-small ds-weight-medium" style={{ display: 'block', color: 'var(--ds-text-secondary)', marginBottom: 'var(--ds-space-2)' }}>
            {lang === 'ar' ? 'اللغة' : 'Language'}
          </span>
          <div style={{ display: 'flex', gap: 'var(--ds-space-2)' }}>
            <Button variant={lang === 'ar' ? 'primary' : 'secondary'} onClick={() => onLanguageChange('ar')}>
              العربية
            </Button>
            <Button variant={lang === 'en' ? 'primary' : 'secondary'} onClick={() => onLanguageChange('en')}>
              English
            </Button>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--ds-space-6)' }}>
          <span className="ds-text-small ds-weight-medium" style={{ display: 'block', color: 'var(--ds-text-secondary)', marginBottom: 'var(--ds-space-2)' }}>
            {lang === 'ar' ? 'العرض' : 'Display'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-3)' }}>
            <label className="ds-toggle">
              <input type="checkbox" className="ds-toggle__input" role="switch" checked={settings.highContrast} onChange={() => toggle('highContrast')} />
              <span className="ds-toggle__track" aria-hidden="true"><span className="ds-toggle__thumb" /></span>
              <span className="ds-toggle__label">{lang === 'ar' ? 'تباين مرتفع' : 'High contrast'}</span>
            </label>
            <label className="ds-toggle">
              <input type="checkbox" className="ds-toggle__input" role="switch" checked={settings.reducedMotion} onChange={() => toggle('reducedMotion')} />
              <span className="ds-toggle__track" aria-hidden="true"><span className="ds-toggle__thumb" /></span>
              <span className="ds-toggle__label">{lang === 'ar' ? 'تقليل الحركة' : 'Reduced motion'}</span>
            </label>
            <label className="ds-toggle">
              <input type="checkbox" className="ds-toggle__input" role="switch"
                checked={!!document.fullscreenElement}
                onChange={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  } else {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
              />
              <span className="ds-toggle__track" aria-hidden="true"><span className="ds-toggle__thumb" /></span>
              <span className="ds-toggle__label">{lang === 'ar' ? 'وضع ملء الشاشة' : 'Immersive Fullscreen'}</span>
            </label>
          </div>
        </div>

        {audioDevices.length > 1 && onMicChange && (
          <div className="ds-field" style={{ marginBottom: 'var(--ds-space-6)' }}>
            <label className="ds-field__label" htmlFor="mic-select">{lang === 'ar' ? 'الميكروفون' : 'Microphone'}</label>
            <div className="ds-field__wrap">
              <select
                id="mic-select"
                className="ds-field__select"
                value={selectedMicId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  window.localStorage.setItem(MIC_DEVICE_KEY, id);
                  onMicChange(id);
                }}
              >
                <option value="">{lang === 'ar' ? 'تلقائي (الافتراضي)' : 'Auto (Default)'}</option>
                {audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || d.deviceId.slice(0, 16)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 'var(--ds-space-4)' }}>
          <span className="ds-text-small ds-weight-medium" style={{ display: 'block', color: 'var(--ds-text-secondary)', marginBottom: 'var(--ds-space-2)' }}>
            {lang === 'ar' ? 'التجربة' : 'Experience'}
          </span>
          <label className="ds-toggle" style={{ marginBottom: 'var(--ds-space-3)' }}>
            <input type="checkbox" className="ds-toggle__input" role="switch" checked={settings.rememberOnboarding} onChange={() => toggle('rememberOnboarding')} />
            <span className="ds-toggle__track" aria-hidden="true"><span className="ds-toggle__thumb" /></span>
            <span className="ds-toggle__label">{lang === 'ar' ? 'تذكر إرشادات البداية' : 'Remember onboarding completion'}</span>
          </label>
          <p className="ds-text-caption" style={{ color: 'var(--ds-text-secondary)', margin: 0 }}>
            {lang === 'ar'
              ? 'اختصارات: Space أو M لإظهار/إخفاء المحادثة، و Escape لإغلاق النوافذ.'
              : 'Shortcuts: Space or M toggles transcript, Escape closes overlays.'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;

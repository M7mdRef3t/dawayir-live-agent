import React, { useEffect, useState } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';

const SETTINGS_KEY = 'dawayir-settings-v1';
const MIC_DEVICE_KEY = 'dawayir-mic-device';

function SettingsModal({ lang, onClose, onLanguageChange, selectedMicId, onMicChange }) {
  const [settings, setSettings] = useState({
    reducedMotion: false,
    highContrast: false,
    rememberOnboarding: true,
  });
  const [audioDevices, setAudioDevices] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSettings((current) => ({ ...current, ...parsed }));
    } catch {
      // Ignore invalid local settings payloads.
    }
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('prefers-reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('prefers-high-contrast', settings.highContrast);
    if (!settings.rememberOnboarding) {
      window.localStorage.removeItem('dawayir-onboarding-seen');
    }
  }, [settings]);

  const toggle = (key) => setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <Modal className="settings-card" onClose={onClose}>
      <div className="modal-header">
        <h3>{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="settings-group">
        <span>{lang === 'ar' ? 'اللغة' : 'Language'}</span>
        <div className="settings-row">
          <Button variant="secondary" className={lang === 'ar' ? 'is-active' : ''} onClick={() => onLanguageChange('ar')}>
            العربية
          </Button>
          <Button variant="secondary" className={lang === 'en' ? 'is-active' : ''} onClick={() => onLanguageChange('en')}>
            English
          </Button>
        </div>
      </div>

      <div className="settings-group">
        <span>{lang === 'ar' ? 'العرض' : 'Display'}</span>
        <label className="toggle-row">
          <input type="checkbox" checked={settings.highContrast} onChange={() => toggle('highContrast')} />
          <span>{lang === 'ar' ? 'تباين مرتفع' : 'High contrast'}</span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={settings.reducedMotion} onChange={() => toggle('reducedMotion')} />
          <span>{lang === 'ar' ? 'تقليل الحركة' : 'Reduced motion'}</span>
        </label>
      </div>

      {audioDevices.length > 1 && onMicChange && (
        <div className="settings-group">
          <span>{lang === 'ar' ? 'الميكروفون' : 'Microphone'}</span>
          <select
            className="command-input"
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
      )}

      <div className="settings-group">
        <span>{lang === 'ar' ? 'التجربة' : 'Experience'}</span>
        <label className="toggle-row">
          <input type="checkbox" checked={settings.rememberOnboarding} onChange={() => toggle('rememberOnboarding')} />
          <span>{lang === 'ar' ? 'تذكر إرشادات البداية' : 'Remember onboarding completion'}</span>
        </label>
        <p>
          {lang === 'ar'
            ? 'اختصارات: Space أو M لإظهار/إخفاء المحادثة، و Escape لإغلاق النوافذ.'
            : 'Shortcuts: Space or M toggles transcript, Escape closes overlays.'}
        </p>
      </div>
    </Modal>
  );
}

export default SettingsModal;

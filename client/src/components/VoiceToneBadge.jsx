/**
 * FEATURE 1 - VOICE ACOUSTICS MIRROR
 *
 * Analyzes pitch variation, energy, and speaking rate to classify voice tone.
 * Client-side only.
 */
import React, { useEffect, useRef, useState } from 'react';

const TONE_LABELS = {
  ar: {
    calm: 'هادي 😌',
    focused: 'مركز 🎯',
    tense: 'متوتر 😰',
    excited: 'متحمس ⚡',
    silent: '...',
  },
  en: {
    calm: 'Calm 😌',
    focused: 'Focused 🎯',
    tense: 'Tense 😰',
    excited: 'Excited ⚡',
    silent: '...',
  },
};

const TONE_COLORS = {
  calm: { bg: 'rgba(0,245,255,0.12)', border: 'rgba(0,245,255,0.4)', glow: '#00F5FF' },
  focused: { bg: 'rgba(0,255,65,0.12)', border: 'rgba(0,255,65,0.4)', glow: '#00FF41' },
  tense: { bg: 'rgba(255,80,50,0.15)', border: 'rgba(255,100,50,0.5)', glow: '#FF5032' },
  excited: { bg: 'rgba(255,200,0,0.12)', border: 'rgba(255,200,0,0.4)', glow: '#FFC800' },
  silent: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', glow: '#ffffff' },
};

function estimatePitch(buffer) {
  let crossings = 0;
  for (let i = 1; i < buffer.length; i += 1) {
    if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) crossings += 1;
  }
  return crossings / (buffer.length / 44100);
}

function VoiceToneBadge({ stream, isConnected, lang = 'ar', onToneChange, canvasRef }) {
  const [tone, setTone] = useState('silent');
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const toneRef = useRef('silent');
  const historyRef = useRef([]);

  useEffect(() => {
    if (!stream || !isConnected) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtxRef.current.createMediaStreamSource(stream);
    const analyser = audioCtxRef.current.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    const floatBuf = new Float32Array(analyser.fftSize);

    const analyze = () => {
      analyser.getFloatTimeDomainData(floatBuf);

      let sumSq = 0;
      for (let i = 0; i < floatBuf.length; i += 1) {
        sumSq += floatBuf[i] ** 2;
      }
      const rms = Math.sqrt(sumSq / floatBuf.length);

      historyRef.current.push(rms);
      if (historyRef.current.length > 30) historyRef.current.shift();
      const avgRms = historyRef.current.reduce((sum, value) => sum + value, 0) / historyRef.current.length;
      const zcr = estimatePitch(floatBuf);

      let newTone = 'silent';
      if (rms < 0.005) newTone = 'silent';
      else if (rms > 0.15 && zcr > 2000) newTone = 'excited';
      else if (rms > 0.08 && avgRms > 0.06) newTone = 'tense';
      else if (rms > 0.02 && zcr < 1000) newTone = 'focused';
      else if (rms > 0.01) newTone = 'calm';

      if (newTone !== toneRef.current) {
        toneRef.current = newTone;
        setTone(newTone);
        onToneChange?.(newTone);

        if (canvasRef?.current) {
          const amp = Math.min(1, rms * 6);
          canvasRef.current.setVoiceAmplitude?.(amp);
        }
      }

      rafRef.current = requestAnimationFrame(analyze);
    };

    rafRef.current = requestAnimationFrame(analyze);

    return () => {
      cancelAnimationFrame(rafRef.current);
      analyser.disconnect();
      src.disconnect();
      audioCtxRef.current?.close();
      setVisible(false);
    };
  }, [stream, isConnected, onToneChange, canvasRef]);

  if (!visible) return null;

  const labels = TONE_LABELS[lang] || TONE_LABELS.en;
  const colors = TONE_COLORS[tone] || TONE_COLORS.silent;

  return (
    <div
      className="ds-badge"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 0 16px ${colors.glow}33`,
        padding: '4px 12px',
        gap: '8px'
      }}
      title={lang === 'ar' ? 'حالة صوتك دلوقتي' : 'Your current voice tone'}
      aria-label={`${lang === 'ar' ? 'نبرة الصوت:' : 'Voice tone:'} ${labels[tone]}`}
    >
      <span
        style={{
          background: colors.glow,
          boxShadow: `0 0 8px ${colors.glow}`,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          display: 'inline-block'
        }}
      />
      <span className="ds-text-caption ds-weight-medium" style={{ color: 'var(--ds-text-primary)' }}>{labels[tone]}</span>
    </div>
  );
}

export default VoiceToneBadge;

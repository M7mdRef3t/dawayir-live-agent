import React, { useEffect, useRef, useState } from 'react';

/**
 * FEATURE 5 - ACOUSTIC MIRROR
 *
 * The waveform bars adopt the color of the dominant cognitive circle.
 */
function Visualizer({ stream, isConnected, lang, onStressLevelChange, dominantColor, onMicLevel, reducedMotion = false }) {
  const canvasRef = useRef(null);
  const [stressLevel, setStressLevel] = useState('calm');
  const stressLevelRef = useRef('calm');
  const lastFrameTimeRef = useRef(0);
  const dominantColorRef = useRef(dominantColor || '#00F5FF');
  const onMicLevelRef = useRef(onMicLevel);

  useEffect(() => {
    dominantColorRef.current = dominantColor || '#00F5FF';
  }, [dominantColor]);

  useEffect(() => {
    onMicLevelRef.current = onMicLevel;
  }, [onMicLevel]);

  useEffect(() => {
    if (!stream || !isConnected) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    const TARGET_FPS = 30;
    analyser.fftSize = 128;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const floatArray = new Float32Array(analyser.fftSize);

    let animationFrameId;
    let stressTimer;

    const hexToRgb = (hex) => {
      try {
        return [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
        ];
      } catch {
        return [0, 245, 255];
      }
    };

    const draw = (timestamp) => {
      const frameInterval = 1000 / TARGET_FPS;
      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      analyser.getByteFrequencyData(dataArray);
      analyser.getFloatTimeDomainData(floatArray);

      let sumSquares = 0;
      for (let i = 0; i < floatArray.length; i += 1) {
        sumSquares += floatArray[i] * floatArray[i];
      }
      const rms = Math.sqrt(sumSquares / floatArray.length);

      onMicLevelRef.current?.(rms);

      if (rms > 0.15) {
        if (stressLevelRef.current !== 'stressed') {
          stressLevelRef.current = 'stressed';
          setStressLevel('stressed');
          onStressLevelChange?.('stressed');
        }
        if (stressTimer) clearTimeout(stressTimer);
        stressTimer = setTimeout(() => {
          stressLevelRef.current = 'calm';
          setStressLevel('calm');
          onStressLevelChange?.('calm');
        }, 2000);
      }

      const [r, g, b] = hexToRgb(dominantColorRef.current);
      if (reducedMotion) {
        const baselineY = canvas.height * 0.72;
        const levelHeight = Math.max(6, rms * canvas.height * 1.2);
        const barWidth = 18;
        const gap = 10;
        const totalWidth = (barWidth * 5) + (gap * 4);
        let x = (canvas.width - totalWidth) / 2;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(16, baselineY);
        ctx.lineTo(canvas.width - 16, baselineY);
        ctx.stroke();

        for (let i = 0; i < 5; i += 1) {
          const weight = 1 - Math.abs(2 - i) * 0.18;
          const barHeight = levelHeight * weight;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.75)`;
          ctx.fillRect(x, baselineY - barHeight, barWidth, barHeight);
          x += barWidth + gap;
        }
      } else {
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i += 1) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const alpha = 0.3 + (dataArray[i] / 255) * 0.7;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stressTimer) clearTimeout(stressTimer);
      analyser.disconnect();
      source.disconnect();
      audioContext.close();
    };
  }, [isConnected, onStressLevelChange, reducedMotion, stream]);

  return (
    <div className="visualizer-container" style={{ position: 'relative' }}>
      <div className={`bio-badge bio-${stressLevel}`}>
        <span className="bio-dot" />
        {stressLevel === 'stressed'
          ? (lang === 'ar' ? 'توتر عالي' : 'Stress Detected')
          : (lang === 'ar' ? 'هادي دلوقتي' : 'Calm State')}
      </div>
      <canvas ref={canvasRef} className="visualizer" width="300" height="80"
        role="img"
        aria-label={lang === 'ar' ? 'شكل موجة الصوت' : 'Voice waveform visualization'} />
    </div>
  );
}

export default Visualizer;

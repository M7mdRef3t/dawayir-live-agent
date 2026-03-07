import React, { useEffect, useRef, useState } from 'react';

function Visualizer({ stream, isConnected, lang, onStressLevelChange }) {
  const canvasRef = useRef(null);
  const [stressLevel, setStressLevel] = useState('calm');
  const stressLevelRef = useRef('calm');
  const lastFrameTimeRef = useRef(0);

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
      let sumSquares = 0.0;
      for (let i = 0; i < floatArray.length; i += 1) {
        sumSquares += floatArray[i] * floatArray[i];
      }
      const rms = Math.sqrt(sumSquares / floatArray.length);

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

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i += 1) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(0, 245, 255, ${dataArray[i] / 255})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
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
  }, [isConnected, onStressLevelChange, stream]);

  return (
    <div className="visualizer-container" style={{ position: 'relative' }}>
      <div className={`bio-badge bio-${stressLevel}`}>
        <span className="bio-dot"></span>
        {stressLevel === 'stressed'
          ? (lang === 'ar' ? 'توتر / ضغط' : 'Stress Detected')
          : (lang === 'ar' ? 'مسترخي' : 'Calm State')}
      </div>
      <canvas ref={canvasRef} className="visualizer" width="300" height="80" />
    </div>
  );
}

export default Visualizer;

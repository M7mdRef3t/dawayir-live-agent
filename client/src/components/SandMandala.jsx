import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { playSandShatterSound } from '../features/session/soundDesign';

/**
 * SandMandala - A deeply poetic visual effect.
 * Takes a reference to an element, screenshots it, hides the original,
 * and then shatters the screenshot into hundreds of sand particles
 * that blow away in the wind.
 */
const SandMandala = ({ targetRef, elementId, onComplete, isActive }) => {
  const canvasRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!isActive || isAnimating) return;

    let animationFrameId;
    let particles = [];

    const initializeFracture = async () => {
      setIsAnimating(true);
      playSandShatterSound();
      
      const element = elementId ? document.getElementById(elementId) : (targetRef && targetRef.current);
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      setDimensions({ w: rect.width, h: rect.height });

      try {
        // 1. Capture the element's exact pixel state
        const canvas = await html2canvas(element, { backgroundColor: null, logging: false });
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Hide the original element to show the shattering canvas instead
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';

        const renderCtx = canvasRef.current?.getContext('2d');
        if (!renderCtx) return;

        // 2. Extract pixel data to create particles
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample every Nth pixel for performance (density)
        const resolution = 4;

        for (let y = 0; y < canvas.height; y += resolution) {
          for (let x = 0; x < canvas.width; x += resolution) {
            const index = (y * canvas.width + x) * 4;
            const a = data[index + 3];
            
            // Only create particles for non-transparent pixels
            if (a > 30) {
              const r = data[index];
              const g = data[index + 1];
              const b = data[index + 2];

              // Add some randomness to starting position to make it feel organic
              particles.push({
                x: x,
                y: y,
                originX: x,
                originY: y,
                color: `rgba(${r},${g},${b},${a / 255})`,
                size: Math.random() * 2.5 + 1.5,
                // Physics velocities
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1,
                gravity: Math.random() * 0.1 + 0.05,
                drag: 0.96, // Air resistance
                wander: Math.random() * 0.1, // lateral sway
                life: 1.0, 
                decay: Math.random() * 0.01 + 0.005, // How fast it fades
              });
            }
          }
        }

        // 3. Start the shatter simulation
        const animate = () => {
          if (!canvasRef.current) return;
          renderCtx.clearRect(0, 0, canvas.width, canvas.height);
          
          let aliveCount = 0;

          // Add a sweeping "wind" force from left to right over time
          const windForce = 0.5;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            if (p.life > 0) {
              // Apply forces
              p.vy -= p.gravity; // Float up like dust
              p.vx += Math.sin(p.y * p.wander) * 0.2 + windForce; // Wind blows right and sways
              
              // Apply drag
              p.vx *= p.drag;
              p.vy *= p.drag;
              
              // Update position
              p.x += p.vx;
              p.y += p.vy;
              
              // Fade out
              p.life -= p.decay;

              // Draw particle
              renderCtx.globalAlpha = Math.max(0, p.life);
              renderCtx.fillStyle = p.color;
              renderCtx.beginPath();
              
              // Make some particles look like tiny strokes rather than perfect circles
              if (Math.random() > 0.5) {
                renderCtx.rect(p.x, p.y, p.size * (1 + p.vx*0.5), p.size);
              } else {
                renderCtx.arc(p.x, p.y, p.size/2, 0, Math.PI * 2);
              }
              renderCtx.fill();
              
              aliveCount++;
            }
          }

          if (aliveCount > 0) {
            animationFrameId = requestAnimationFrame(animate);
          } else {
            if (onComplete) onComplete();
          }
        };

        animate();

      } catch (err) {
        console.error("SandMandala failed to process image data:", err);
        if (onComplete) onComplete(); // fallback
      }
    };

    initializeFracture();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, targetRef, onComplete, isAnimating]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.w * 2} // Scale for high-DPI displays assuming html2canvas scale 2
      height={dimensions.h * 2}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    />
  );
};

export default SandMandala;

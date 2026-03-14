import React, { useState, useEffect, useRef } from 'react';
import '../design-system/dawayir-ds.css';

/**
 * OnboardingFlow - The Sacred FTUE
 * A dramatic, 30-second guided entry into the Dawayir Cognitive OS.
 */
function OnboardingFlow({ lang, onComplete }) {
  const [step, setStep] = useState(0);
  const [micGranted, setMicGranted] = useState(false);
  const [showButton, setShowButton] = useState(false);
  
  // Script and timings
  const scriptAr = [
    { text: "أهلاً بك في مساحتك الخاصة.", delay: 2000, duration: 4000 },
    { text: "هنا.. الأفكار ليست مجرد كلمات، بل طاقة حية تتشكل أمامك.", delay: 6000, duration: 4000 },
    { text: "لسنا هنا للصخب، بل للهدوء.. ولرؤية ما بداخلنا بوضوح.", delay: 11000, duration: 5000 },
    { text: "لنبدأ.. نحتاج فقط لسماع صوتك ليتنفس المكان.", delay: 17000, duration: 4000 },
  ];

  const scriptEn = [
    { text: "Welcome to your private space.", delay: 2000, duration: 4000 },
    { text: "Here, thoughts are not just words—they are living energy forming before you.", delay: 6000, duration: 4000 },
    { text: "We are not here for noise, but for stillness.. to see within clearly.", delay: 11000, duration: 5000 },
    { text: "Let's begin. We only need your voice for this space to breathe.", delay: 17000, duration: 4000 },
  ];

  const script = lang === 'ar' ? scriptAr : scriptEn;
  const [activeText, setActiveText] = useState('');

  useEffect(() => {
    let timers = [];
    
    script.forEach((line, index) => {
      // Show text
      timers.push(setTimeout(() => {
        setActiveText(line.text);
      }, line.delay));
      
      // Hide text (if not the last line inviting mic action)
      if (index < script.length - 1) {
        timers.push(setTimeout(() => {
          setActiveText('');
        }, line.delay + line.duration - 500));
      } else {
        // Show mic button after last text
        timers.push(setTimeout(() => {
          setShowButton(true);
        }, line.delay + line.duration));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [lang]);

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stream) {
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, we just needed permission
        setMicGranted(true);
        setActiveText('');
        setShowButton(false);
        
        // Final transition
        setTimeout(() => {
          setActiveText(lang === 'ar' ? 'المساحة تستمع الآن.. دعنا نكتشف.' : 'The space is listening.. let us explore.');
        }, 1000);
        
        setTimeout(() => {
          onComplete();
        }, 5000);
      }
    } catch (err) {
      console.error("Mic permission denied:", err);
      // Fallback
      setActiveText(lang === 'ar' ? 'يمكنك الكتابة لاحقاً أيضاً.' : 'You can also type later.');
      setTimeout(() => onComplete(), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--ds-bg-deep, #060618)',
      color: 'rgba(255,255,255,0.9)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: lang === 'ar' ? 'var(--ds-font-arabic)' : 'var(--ds-font-title)',
      textAlign: 'center',
      padding: '2rem',
    }}>
      
      {/* Decorative center piece */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(56, 178, 216, 0.05) 0%, transparent 70%)',
        opacity: activeText ? 1 : 0,
        transition: 'opacity 3s ease',
        pointerEvents: 'none'
      }} />

      <h1 style={{
        fontSize: 'clamp(20px, 4vw, 32px)',
        fontWeight: '300',
        lineHeight: '1.6',
        maxWidth: '800px',
        opacity: activeText ? 1 : 0,
        transform: activeText ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 2s ease, transform 2s ease',
        textShadow: '0 0 20px rgba(56,178,216,0.3)'
      }}>
        {activeText}
      </h1>

      {showButton && !micGranted && (
        <button
          onClick={requestMic}
          className="ds-btn ds-btn--primary"
          style={{
            marginTop: '3rem',
            animation: 'fadeSlideUp 1s ease forwards',
            background: 'rgba(56, 178, 216, 0.1)',
            borderColor: 'rgba(56, 178, 216, 0.4)',
            padding: '12px 32px',
          }}
        >
          {lang === 'ar' ? 'السماح بالميكروفون' : 'Allow Microphone'}
        </button>
      )}

      {/* CSS Animation embedded for standalone stability */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default OnboardingFlow;

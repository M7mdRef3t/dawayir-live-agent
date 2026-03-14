import { useEffect, useRef, useState } from 'react';

/**
 * useSonicFingerprint Hook
 * Manages an ambient audio drone using the Web Audio API.
 * The sound dynamically shifts its frequencies based on the dominant cognitive node.
 */
const useSonicFingerprint = (dominantNodeId, isPlaying) => {
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);
    const filterRef = useRef(null);
    const lfoRef = useRef(null);
    const lfoGainRef = useRef(null);
    
    // Set default volume level
    const maxVolume = 0.08;
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        // Initialize AudioContext on first play
        if (isPlaying && !isMuted && !audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            
            oscillatorRef.current = audioCtxRef.current.createOscillator();
            filterRef.current = audioCtxRef.current.createBiquadFilter();
            filterRef.current.type = 'lowpass';
            gainNodeRef.current = audioCtxRef.current.createGain();
            
            oscillatorRef.current.connect(filterRef.current);
            filterRef.current.connect(gainNodeRef.current);
            
            // ── FEATURE: Sonic Breathing (8-second LFO) ──
            lfoRef.current = audioCtxRef.current.createOscillator();
            lfoRef.current.frequency.setValueAtTime(0.125, audioCtxRef.current.currentTime);
            lfoGainRef.current = audioCtxRef.current.createGain();
            lfoGainRef.current.gain.setValueAtTime(maxVolume * 0.4, audioCtxRef.current.currentTime);
            
            lfoRef.current.connect(lfoGainRef.current);
            lfoGainRef.current.connect(gainNodeRef.current.gain);
            
            gainNodeRef.current.connect(audioCtxRef.current.destination);
            
            // Start with 0 volume
            gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
            oscillatorRef.current.start();
            lfoRef.current.start();
        }

        // If context exists, control volume based on isPlaying/isMuted
        if (audioCtxRef.current && gainNodeRef.current) {
            const now = audioCtxRef.current.currentTime;
            
            if (!isPlaying || isMuted) {
                // Fade out smoothly over 1s
                gainNodeRef.current.gain.setTargetAtTime(0, now, 0.5);
                return;
            }

            // Resume context if suspended
            if (audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }

            // Define sonic profiles based on node ID
            const transitionTime = 1.5; // Smooth 1.5-second transition between states

            let targetFreq = 110.0; // Default frequency A2
            let targetFilterFreq = 400; // Default filter cutoff
            let targetType = 'sine'; // Default wave type

            if (dominantNodeId === 1) {
                // Awareness/Emotions: Deep, warm, low rumble
                targetFreq = 82.41; // E2
                targetFilterFreq = 250;
                targetType = 'sine';
            } else if (dominantNodeId === 2) {
                // Knowledge/Analysis: Mildly complex, steady mid-tones
                targetFreq = 146.83; // D3
                targetFilterFreq = 600;
                targetType = 'triangle';
            } else if (dominantNodeId === 3) {
                // Truth/Reality: High clarity, grounding, slightly sharp
                targetFreq = 220.00; // A3
                targetFilterFreq = 1200;
                targetType = 'triangle';
            }

            // Apply parameter changes smoothly
            if (oscillatorRef.current && filterRef.current) {
                // Some browsers reset phase if type is set continuously, so check first
                if (oscillatorRef.current.type !== targetType) {
                    oscillatorRef.current.type = targetType;
                }
                
                oscillatorRef.current.frequency.setTargetAtTime(targetFreq, now, transitionTime);
                filterRef.current.frequency.setTargetAtTime(targetFilterFreq, now, transitionTime);
                
                // Fade in volume to maxVolume
                gainNodeRef.current.gain.setTargetAtTime(maxVolume, now, transitionTime);
            }
        }

    }, [dominantNodeId, isPlaying, isMuted]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                if (oscillatorRef.current) {
                    try { oscillatorRef.current.stop(); } catch (e) { /* ignore */ }
                    oscillatorRef.current.disconnect();
                }
                if (gainNodeRef.current) gainNodeRef.current.disconnect();
                if (filterRef.current) filterRef.current.disconnect();
                if (lfoRef.current) {
                    try { lfoRef.current.stop(); } catch(e) {}
                    lfoRef.current.disconnect();
                }
                if (lfoGainRef.current) lfoGainRef.current.disconnect();
                
                audioCtxRef.current.close().catch(console.error);
                audioCtxRef.current = null;
            }
        };
    }, []);

    const toggleMute = () => setIsMuted(prev => !prev);

    return { isMuted, toggleMute };
};

export default useSonicFingerprint;

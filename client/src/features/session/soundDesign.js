/**
 * FEATURE ⑯ — COGNITIVE SOUND DESIGN
 * "التجربة الحسية الكاملة — صوت + صورة + لمس"
 * First mental health app with live cognitive audio feedback.
 *
 * No external libraries. Pure Web Audio API.
 * Each cognitive circle has its own musical note.
 * Awareness=A4(440Hz) Knowledge=E5(659Hz) Truth=C5(523Hz)
 */

let _audioCtx = null;

function getCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') {
        _audioCtx.resume();
    }
    return _audioCtx;
}

/**
 * Play a soft, breathy tone.
 * @param {number} freq - Hz
 * @param {number} duration - seconds
 * @param {string} type - oscillator type
 * @param {number} volume - 0-1
 */
function playTone(freq, duration = 0.3, type = 'sine', volume = 0.08) {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.02); // fast attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // natural decay

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.05);
    } catch (e) {
        // Silent fail — audio is enhancement only
    }
}

// Node frequencies (pentatonic scale — always harmonic)
const NODE_FREQ = {
    1: 440,   // Awareness: A4 (warm, emotional)
    2: 659,   // Knowledge:  E5 (bright, analytical)
    3: 523,   // Truth:      C5 (clear, resolving)
};

/**
 * ① Play transition chime when dominant circle changes
 * Plays the old note fading and the new note rising
 */
export function playTransitionSound(fromNodeId, toNodeId) {
    const fromFreq = NODE_FREQ[fromNodeId] || 440;
    const toFreq = NODE_FREQ[toNodeId] || 523;

    // Old note fades
    playTone(fromFreq, 0.4, 'sine', 0.05);
    // New note rises slightly after
    setTimeout(() => playTone(toFreq, 0.5, 'sine', 0.1), 150);
    // Harmony note (perfect fifth above new)
    setTimeout(() => playTone(toFreq * 1.5, 0.4, 'sine', 0.04), 200);
}

/**
 * ② Play "insight" sound — rising arpeggio when Ah-ha moment detected
 */
export function playInsightSound() {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 — major arpeggio
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.35, 'sine', 0.09), i * 80);
    });
}

/**
 * ③ Play "breathing" pulse — gentle throb during breathing guide
 * @param {string} phase 'inhale' | 'hold' | 'exhale'
 */
export function playBreathingTone(phase) {
    const freqs = { inhale: 396, hold: 417, exhale: 369 }; // Solfeggio frequencies
    playTone(freqs[phase] || 396, 0.6, 'sine', 0.05);
}

/**
 * ④ Play "session complete" — resolving 3-note chord
 */
export function playSessionCompleteSound() {
    const chord = [523, 659, 784]; // C maj chord
    chord.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 1.2, 'sine', 0.07), i * 60);
    });
}

/**
 * ⑤ Play "weather change" — a short jingle based on weather type
 * @param {'storm'|'rain'|'cloudy'|'partly'|'sunny'} weatherId
 */
export function playWeatherChangeSound(weatherId) {
    const map = {
        storm: [220, 185], // descending — tension
        rain: [440, 466], // minor second — pensive
        cloudy: [523, 587], // rising — thinking
        partly: [659, 784], // bright rising — hope
        sunny: [784, 1047, 784], // ascending + resolve — clarity
    };
    const notes = map[weatherId] || [523];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sine', 0.07), i * 100);
    });
}

export default {
    playTransitionSound,
    playInsightSound,
    playBreathingTone,
    playSessionCompleteSound,
    playWeatherChangeSound,
};

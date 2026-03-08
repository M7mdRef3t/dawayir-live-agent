/**
 * FEATURE ⑬ — EMOTIONAL WEATHER
 * "أول تطبيق يترجم رحلتك العاطفية لطقس مرئي"
 *
 * Maps cognitive state → weather metaphor in real-time.
 * Weather progresses naturally as session evolves.
 *
 * 🌪️ Storm    = Overwhelm / early session (awareness dominant, low transitions)
 * 🌧️ Rain     = Deep emotional processing (awareness + active)
 * ☁️ Cloudy   = Analytical thinking (knowledge dominant)
 * ⛅ Partly   = Transition moment (moving toward truth)
 * ☀️ Sunny    = Clarity / decision (truth dominant)
 */
import React, { useEffect, useState } from 'react';

const WEATHER_STATES = [
    {
        id: 'storm',
        icon: '🌪️',
        ar: 'عاصفة',
        en: 'Storm',
        desc_ar: 'الأفكار متشابكة',
        desc_en: 'Tangled thoughts',
        glow: 'rgba(255,120,50,0.25)',
    },
    {
        id: 'rain',
        icon: '🌧️',
        ar: 'مطر',
        en: 'Rain',
        desc_ar: 'تجهيز عميق للمشاعر',
        desc_en: 'Deep emotional processing',
        glow: 'rgba(0,200,255,0.25)',
    },
    {
        id: 'cloudy',
        icon: '☁️',
        ar: 'غيوم',
        en: 'Cloudy',
        desc_ar: 'التحليل والتفكير',
        desc_en: 'Analysis & thinking',
        glow: 'rgba(180,180,220,0.2)',
    },
    {
        id: 'partly',
        icon: '⛅',
        ar: 'جزئياً مشمس',
        en: 'Partly Sunny',
        desc_ar: 'بداية الوضوح',
        desc_en: 'Clarity emerging',
        glow: 'rgba(255,220,80,0.25)',
    },
    {
        id: 'sunny',
        icon: '☀️',
        ar: 'مشمس',
        en: 'Sunny',
        desc_ar: 'وصلت للحقيقة',
        desc_en: 'Reached clarity',
        glow: 'rgba(255,200,0,0.35)',
    },
];

// Map cognitive state → weather id
function getWeatherId(dominantNodeId, transitionCount, sessionAgeSeconds) {
    // Early session with no transitions → storm
    if (sessionAgeSeconds < 30 && transitionCount === 0) return 'storm';

    if (dominantNodeId === 3) {
        // Truth is dominant
        return transitionCount >= 2 ? 'sunny' : 'partly';
    }
    if (dominantNodeId === 2) {
        // Knowledge is dominant
        return transitionCount >= 1 ? 'partly' : 'cloudy';
    }
    // Awareness is dominant (node 1)
    if (transitionCount === 0 && sessionAgeSeconds < 60) return 'storm';
    return 'rain';
}

function EmotionalWeather({ dominantNodeId = 1, transitionCount = 0, sessionStartTime = null, lang = 'ar', isConnected = false }) {
    const [weather, setWeather] = useState(WEATHER_STATES[0]);
    const [prevWeatherId, setPrevWeatherId] = useState('storm');
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (!isConnected) {
            setWeather(WEATHER_STATES[0]);
            return;
        }
        const ageSeconds = sessionStartTime ? (Date.now() - sessionStartTime) / 1000 : 0;
        const weatherId = getWeatherId(dominantNodeId, transitionCount, ageSeconds);
        const newWeather = WEATHER_STATES.find(w => w.id === weatherId) || WEATHER_STATES[0];

        if (newWeather.id !== prevWeatherId) {
            setIsAnimating(true);
            setTimeout(() => {
                setWeather(newWeather);
                setPrevWeatherId(newWeather.id);
                setIsAnimating(false);
            }, 300);
        }
    }, [dominantNodeId, transitionCount, isConnected]);

    return (
        <div
            className={`emotional-weather-badge ${isAnimating ? 'weather-changing' : ''}`}
            style={{ '--weather-glow': weather.glow }}
            title={lang === 'ar' ? weather.desc_ar : weather.desc_en}
        >
            <span className="weather-icon" role="img" aria-label={lang === 'ar' ? weather.ar : weather.en}>
                {weather.icon}
            </span>
            <span className="weather-label">
                {lang === 'ar' ? weather.ar : weather.en}
            </span>
        </div>
    );
}

export default EmotionalWeather;

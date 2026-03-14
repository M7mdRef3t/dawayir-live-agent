import React from 'react';

const WEATHER_STATES = [
    {
        id: 'storm',
        icon: '🌪️',
        ar: 'عاصفة',
        en: 'Storm',
        desc_ar: 'عقلك كان في حالة عصف. الأفكار متشابكة وتحتاج لبعض الوقت لتهدأ قبل اتخاذ أي قرار.',
        desc_en: 'Your mind was in a storm. Thoughts are tangled, give yourself time to settle before deciding anything.',
        glow: 'rgba(255,120,50,0.4)',
    },
    {
        id: 'rain',
        icon: '🌧️',
        ar: 'مطر',
        en: 'Rain',
        desc_ar: 'المنطقة العاطفية كانت نشطة. المطرة بتغسل، اسمح لمشاعرك تاخد مساحتها بدون استعجال.',
        desc_en: 'Emotional processing was active. Let it rain, allow your feelings space without rushing.',
        glow: 'rgba(0,200,255,0.4)',
    },
    {
        id: 'cloudy',
        icon: '☁️',
        ar: 'غيوم',
        en: 'Cloudy',
        desc_ar: 'التفكير التحليلي كان طاغي. الأمور لسة غايمة شوية بس عقلك بيحاول يربط الخيوط ببعض.',
        desc_en: 'Analytical thinking dominated. Things are a bit cloudy as your mind connects the dots.',
        glow: 'rgba(180,180,220,0.4)',
    },
    {
        id: 'partly',
        icon: '⛅',
        ar: 'جزئياً مشمس',
        en: 'Partly Sunny',
        desc_ar: 'لحظات من البصيرة بدأت تظهر. فيه وضوح بدأ يتشكل وسط الأفكار.',
        desc_en: 'Moments of insight are emerging. Clarity is beginning to form.',
        glow: 'rgba(255,220,80,0.4)',
    },
    {
        id: 'sunny',
        icon: '☀️',
        ar: 'مشمس',
        en: 'Sunny',
        desc_ar: 'رؤية صافية تماماً. الحقيقة والواقع متطابقين مع وعيك، الوقت مناسب لأخذ خطوة أو قرار.',
        desc_en: 'Crystal clear vision. Truth and awareness are aligned, it is a good time to take action.',
        glow: 'rgba(255,200,0,0.6)',
    },
];

function getWeatherId(dominantNodeId, clarityDelta, overloadIndex) {
    if (dominantNodeId === 3 || clarityDelta > 0.05) {
        return 'sunny';
    }
    if (dominantNodeId === 2) {
        return clarityDelta > 0 ? 'partly' : 'cloudy';
    }
    if (overloadIndex > 0.5) {
        return 'storm';
    }
    return 'rain';
}

const CognitiveWeatherSummary = ({ dominantNodeId, clarityDelta, overloadIndex, lang }) => {
    const weatherId = getWeatherId(dominantNodeId, clarityDelta, overloadIndex);
    const weather = WEATHER_STATES.find(w => w.id === weatherId) || WEATHER_STATES[0];

    return (
        <div className="cognitive-weather-summary" style={{ '--weather-glow': weather.glow }}>
            <div className="weather-forecast-icon" role="img" aria-label={lang === 'ar' ? weather.ar : weather.en}>
                {weather.icon}
            </div>
            <div className="weather-forecast-content">
                <div className="weather-forecast-title">
                    {lang === 'ar' ? 'طقسك المعرفي:' : 'Your Cognitive Weather:'} <span className="weather-forecast-name">{lang === 'ar' ? weather.ar : weather.en}</span>
                </div>
                <div className="weather-forecast-desc">
                    {lang === 'ar' ? weather.desc_ar : weather.desc_en}
                </div>
            </div>
        </div>
    );
};

export default CognitiveWeatherSummary;

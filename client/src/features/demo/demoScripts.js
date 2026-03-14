// ═══════════════════════════════════════════════════════
// Demo Scripts & UI Copy
// Auto-demo conversation scripts, status labels,
// and one-click demo button text.
// ═══════════════════════════════════════════════════════

export const AUTO_DEMO_SCRIPT = {
  ar: [
    {
      spoken: 'أنا داخل الجلسة ومشدود من كتر الطلبات اللي فوق دماغي.',
      audioPath: '/demo-audio/ar/demo_0.mp3',
      maxWaitMs: 11000,
      speaker: 'synthetic_user_male',
      tts: { rate: '+2%', pitch: '+0Hz', volume: '+12%' },
    },
    {
      spoken: 'أكتر حاجة مقلقاني إن البيت والشغل داخلين في بعض طول الوقت.',
      audioPath: '/demo-audio/ar/demo_1.mp3',
      maxWaitMs: 10500,
      speaker: 'synthetic_user_male',
      tts: { rate: '+2%', pitch: '+0Hz', volume: '+12%' },
    },
    {
      spoken: 'أنا كل شوية أسيب اللي في إيدي عشان ألحق طلب جديد، فبتوه أكتر.',
      audioPath: '/demo-audio/ar/demo_2.mp3',
      maxWaitMs: 10200,
      speaker: 'synthetic_user_male',
      tts: { rate: '+1%', pitch: '+0Hz', volume: '+11%' },
    },
    {
      spoken: 'ولو أنا صريح، اللي تعبني إني حاسس إني لازم أرضي الكل.',
      audioPath: '/demo-audio/ar/demo_3.mp3',
      maxWaitMs: 9800,
      speaker: 'synthetic_user_male',
      tts: { rate: '+1%', pitch: '+0Hz', volume: '+11%' },
    },
    {
      spoken: 'يعني أصل الضغط مش الطلبات بس، أصل الضغط إني مش حاطط حدود واضحة.',
      audioPath: '/demo-audio/ar/demo_4.mp3',
      maxWaitMs: 9800,
      speaker: 'synthetic_user_male',
      tts: { rate: '+0%', pitch: '+0Hz', volume: '+10%' },
    },
    {
      spoken: 'الخلاصة واضحة: هقول إمتى أقدر أرد، ومش هحاول أرضي الكل دلوقتي.',
      audioPath: '/demo-audio/ar/demo_5.mp3',
      maxWaitMs: 9600,
      speaker: 'synthetic_user_male',
      tts: { rate: '-1%', pitch: '-1Hz', volume: '+10%' },
    },
  ],
  en: [
    {
      spoken: 'I am coming in tense because too many demands are stacked on me.',
      audioPath: '/demo-audio/en/demo_0.mp3',
      maxWaitMs: 11000,
      speaker: 'synthetic_user_male',
      tts: { rate: '+1%', pitch: '+0Hz', volume: '+8%' },
    },
    {
      spoken: 'What is pressing on me most is that home and work keep bleeding into each other.',
      audioPath: '/demo-audio/en/demo_1.mp3',
      maxWaitMs: 10500,
      speaker: 'synthetic_user_male',
      tts: { rate: '+1%', pitch: '+0Hz', volume: '+8%' },
    },
    {
      spoken: 'I keep dropping what is in my hand every time a new request shows up.',
      audioPath: '/demo-audio/en/demo_2.mp3',
      maxWaitMs: 10200,
      speaker: 'synthetic_user_male',
      tts: { rate: '+0%', pitch: '+0Hz', volume: '+8%' },
    },
    {
      spoken: 'If I am honest, what drains me is feeling like I have to satisfy everyone.',
      audioPath: '/demo-audio/en/demo_3.mp3',
      maxWaitMs: 9800,
      speaker: 'synthetic_user_male',
      tts: { rate: '+0%', pitch: '+0Hz', volume: '+7%' },
    },
    {
      spoken: 'So the real pressure is not the requests alone, it is having no clear boundaries.',
      audioPath: '/demo-audio/en/demo_4.mp3',
      maxWaitMs: 9800,
      speaker: 'synthetic_user_male',
      tts: { rate: '+0%', pitch: '+0Hz', volume: '+7%' },
    },
    {
      spoken: 'The summary is clear now: I will set a response window and stop pleasing everyone at once.',
      audioPath: '/demo-audio/en/demo_5.mp3',
      maxWaitMs: 9600,
      speaker: 'synthetic_user_male',
      tts: { rate: '-1%', pitch: '-1Hz', volume: '+7%' },
    },
  ],
};

export const AUTO_DEMO_COPY = {
  ar: {
    start: 'شاهد التجربة (عينة محاكاة)',
    stop: 'ايقاف التجربة',
    booting: 'جاري تجهيز محاكاة الجلسة...',
    waitingSession: 'بانتظار اتصال Gemini Live...',
    opening: 'دواير بيفتتح الجلسة...',
    running: 'وكيل المستخدم شغال',
    completed: 'التجربة اكتملت بنجاح',
    canceled: 'تم ايقاف التجربة',
    failed: 'تعذر بدء التجربة: تأكد من الاتصال',
  },
  en: {
    start: 'Watch the Experience (Simulation)',
    stop: 'Stop Experience',
    booting: 'Preparing session simulation...',
    waitingSession: 'Waiting for Gemini Live connection...',
    opening: 'Dawayir is opening the session...',
    running: 'User agent running',
    completed: 'Simulation completed',
    canceled: 'Experience stopped',
    failed: 'Experience failed: check connection',
  },
};

export const ONE_CLICK_DEMO_COPY = {
  ar: {
    start: 'محاكاة التجربة مسجلة',
    launching: 'بيتفتح...',
    helper: 'يفتح التجربة فورًا ويورّيك كيف يتحوّل الصوت إلى رؤية.',
  },
  en: {
    start: 'Recorded Simulation',
    launching: 'Opening...',
    helper: 'Opens the experience instantly and shows how voice becomes vision.',
  },
};

export const STRINGS = {
  en: {
    brandName: 'Dawayir',
    brandSub: 'Your Living Mental Space',
    statusActive: 'Session Active',
    statusDisconnected: 'Disconnected',
    captureBtn: '📸 Visual Pulse Check',
    capture: '🎯 Capture',
    cancel: '✕ Cancel',
    initialState: 'Your Initial State',
    retake: '🔄 Retake',
    connectedMsg: '✨ Connected to Your Mental Space',
    connecting: 'Connecting',
    enterSpace: 'Enter Mental Space 🧠',
    enterSpaceVision: 'Enter Mental Space (with Vision)',
    agentSpeaking: 'Dawayir is speaking...',
    updateVisual: '📸 Update Visual Context',
    lookAtMe: '👁️ Look at me',
    endSession: 'End Session',
    hint: 'Speak freely and explore your mental space. ✨',
    liveChat: '💬 Live Conversation',
    memoryBank: 'Memory Bank',
    dashboardBtn: '💾',
  },
  ar: {
    brandName: 'دواير',
    brandSub: 'مساحتك الذهنية الحية',
    statusActive: 'متصل',
    statusDisconnected: 'غير متصل',
    captureBtn: 'خليني أشوفك',
    capture: 'التقاط',
    cancel: 'إغلاق',
    initialState: 'حالتك المبدئية',
    retake: 'إعادة الالتقاط',
    connectedMsg: 'متصل بمساحتك الذهنية',
    connecting: 'جاري الاتصال',
    enterSpace: 'يلا نبدأ',
    enterSpaceVision: 'يلا نبدأ (مع الرؤية)',
    agentSpeaking: 'بيتكلم...',
    updateVisual: 'شوفني تاني',
    lookAtMe: 'شوفني',
    endSession: 'إنهاء الجلسة',
    hint: 'اتكلم براحتك',
    liveChat: 'الدردشة',
    memoryBank: 'بنك الذاكرة',
    dashboardBtn: '💾',
  },
};

export const NODE_LABELS = {
  en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' },
};

export const ONBOARDING_STEPS = {
  ar: [
    { title: 'الوعي', body: 'الدائرة دي بتمثل وعيك. هتتحرك وتغيّر شكلها مع الكلام والتنفس والحالة.' },
    { title: 'العلم', body: 'دي مساحة الفهم. كل ما تتكلم أكتر، دواير بتبني صورة أوضح عن اللي جواك.' },
    { title: 'الحقيقة', body: 'دي نقطة الوضوح. الهدف مش إجابة سريعة، الهدف إن الصورة ترتب نفسها.' },
  ],
  en: [
    { title: 'Awareness', body: 'This circle reflects awareness. It shifts with speech, pacing, and state.' },
    { title: 'Knowledge', body: 'This is the layer of understanding. The system builds context as you talk.' },
    { title: 'Truth', body: 'This is the clarity point. The goal is not speed, but a clearer inner map.' },
  ],
};

export const CONNECT_PROGRESS = {
  ar: [
    { key: 'network', label: 'الاتصال بالخادم' },
    { key: 'session', label: 'تأسيس الجلسة' },
    { key: 'voice', label: 'تجهيز الصوت' },
    { key: 'ready', label: 'جاهز' },
  ],
  en: [
    { key: 'network', label: 'Connecting to server' },
    { key: 'session', label: 'Establishing session' },
    { key: 'voice', label: 'Preparing voice' },
    { key: 'ready', label: 'Ready' },
  ],
};

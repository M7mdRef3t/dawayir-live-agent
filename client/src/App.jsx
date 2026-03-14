import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import DawayirCanvas from './components/DawayirCanvas';

// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// HAPTIC FEEDBACK — Vibrate on circle shifts
// Uses the Vibration API to provide tactile feedback
// when circles change significantly.
// ══════════════════════════════════════════════════
const triggerHaptic = (pattern = [30]) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
};
const HAPTIC_PATTERNS = {
  circleShift: [12],                  // whisper tap — subliminal
  insightMoment: [40, 30, 40],        // double tap for insight
  clarityBloom: [60, 40, 60, 40, 80], // crescendo for clarity
  otherSpawn: [20, 20, 20],           // triple light tap for person
  cosmicPresence: [8, 833, 8],        // heartbeat ghost-tap — 1.2Hz matches visual pulse
  somaticAnchor: [5, 200, 5],         // "going inward" — barely there hold
};

// ══════════════════════════════════════════════════
// PROGRESS ACROSS SESSIONS
// Stores final circle states in localStorage so
// users can see how they have changed over time.
// ══════════════════════════════════════════════════
const saveSessionProgress = (nodes) => {
  try {
    const history = JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
    history.push({
      date: new Date().toISOString(),
      circles: nodes.map(n => ({ id: n.id, radius: Math.round(n.radius), label: n.label })),
    });
    // Keep last 20 sessions
    const trimmed = history.slice(-20);
    localStorage.setItem('dawayir_progress', JSON.stringify(trimmed));
  } catch {}
};

const getSessionHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('dawayir_progress') || '[]');
  } catch { return []; }
};
// AMBIENT SOUND — Singing Bowl Drone
// Creates a subtle harmonic drone using Web Audio API
// that plays when the agent is speaking.
// ══════════════════════════════════════════════════
const createAmbientDrone = (existingCtx) => {
  let ctx = null;
  let gainNode = null;
  let oscs = [];
  let isPlaying = false;

  const start = () => {
    if (isPlaying) return;
    try {
      ctx = existingCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2); // very quiet
      gainNode.connect(ctx.destination);

      // Singing bowl harmonics: fundamental + overtones
      const freqs = [174, 261, 396]; // healing frequencies (Solfeggio)
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Subtle vibrato
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.3 + i * 0.1, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.015 / (i + 1), ctx.currentTime); // quieter overtones
        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start();
        oscs.push({ osc, lfo, oscGain });
      });
      isPlaying = true;
    } catch (e) { console.warn('[Ambient] Failed:', e); }
  };

  const stop = () => {
    if (!isPlaying || !ctx) return;
    try {
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        oscs.forEach(o => { try { o.osc.stop(); o.lfo.stop(); } catch {} });
        oscs = [];
        // Only close context if WE created it (not the shared one)
        if (!existingCtx) { try { ctx.close(); } catch {} }
        ctx = null;
        isPlaying = false;
      }, 2000);
    } catch {}
  };

  return { start, stop, isPlaying: () => isPlaying };
};

import ConnectProgressCard from './components/ConnectProgressCard';
import OnboardingModal from './components/OnboardingModal';
import TranscriptPanel from './components/TranscriptPanel';

// Lazy load heavy views for performance (Code Splitting)
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen'));
const SessionCompleteScreen = lazy(() => import('./components/SessionCompleteScreen'));
const SessionOverlayPanel = lazy(() => import('./components/SessionOverlayPanel'));
const EndSessionConfirmModal = lazy(() => import('./components/EndSessionConfirmModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const DashboardView = lazy(() => import('./components/DashboardView'));
import Visualizer from './components/Visualizer';
import VoiceToneBadge from './components/VoiceToneBadge';
import BreathingGuide from './components/BreathingGuide';
import SacredPause from './components/SacredPause';
import EmotionalWeather from './components/EmotionalWeather';
import MirrorSentence from './components/MirrorSentence';
import CognitiveVelocity from './components/CognitiveVelocity';
import StatusBadge from './components/ui/StatusBadge';
import AchievementBar from './components/AchievementBar';
import JourneyTimeline from './components/JourneyTimeline';
import CognitiveDNACard from './components/CognitiveDNACard';
import CognitiveFingerprint from './components/CognitiveFingerprint';
import CircleMeaningPanel from './components/CircleMeaningPanel';
import CircleFirstShiftTooltip from './components/CircleFirstShiftTooltip';
import ErrorBoundary from './components/ErrorBoundary';
import NeuralTopicGraph from './components/NeuralTopicGraph';
const UiShowcasePage = lazy(() => import('./design-system/UiShowcasePage'));
import { playTransitionSound, playInsightSound, playSessionCompleteSound } from './features/session/soundDesign';
import logoCognitiveTrinity from './assets/dawayir-logo-cognitive-trinity.svg';

import { STRINGS, NODE_LABELS, ONBOARDING_STEPS, CONNECT_PROGRESS } from './i18n/strings';
import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  MIC_WORKLET_NAME,
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_DELAY_MS,
  MAX_RECONNECT_DELAY_MS,
  TTS_FALLBACK_GRACE_MS,
  MIC_DEFER_TIMEOUT_MS,
} from './features/session/constants';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  pcm16ToFloat32,
  float32ToPcm16Buffer,
  downsampleFloat32,
  tryParseJson,
  parsePcmSampleRate,
} from './features/session/audioUtils';
import {
  getInlineData,
  getParts,
  getServerContent,
  getToolCall,
  isSetupCompleteMessage,
  getServerErrorMessage,
  isInterruptedMessage,
  isAudioMimeType,
  getTurnDataAudioBlobs,
} from './features/session/protocol';
import { useSessionHotkeys } from './hooks/useSessionHotkeys';
import { applyAppSettingsToDocument, readStoredAppSettings, persistAppSettings } from './utils/appSettings';
import {
  getCircleAnnouncement,
  getLocalizedErrorMessage,
  getMetricsAnnouncement,
  getTranscriptAnnouncement,
  getViewAnnouncement,
} from './utils/accessibility';

// moved to features/session/constants
// Client-side VAD removed -- Gemini's built-in VAD handles turn detection.

const AUTO_DEMO_SCRIPT = {
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

const AUTO_DEMO_COPY = {
  ar: {
    start: 'شاهد التجربة (عينة محاكاة)',
    stop: 'ايقاف التجربة',
    booting: 'جاري تجهيز محاكاة الجلسة...',
    waitingSession: 'بانتظر اتصال Gemini Live...',
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

const ONE_CLICK_DEMO_COPY = {
  ar: {
    start: 'شاهد التجربة',
    launching: 'بيتفتح...',
    helper: 'يفتح التجربة فورًا ويورّيك كيف يتحوّل الصوت إلى رؤية.',
  },
  en: {
    start: 'Watch the Experience',
    launching: 'Opening...',
    helper: 'Opens the experience instantly and shows how voice becomes vision.',
  },
};

function App() {
  const [isCinematicReady, setIsCinematicReady] = useState(false);
  const [isSacredOnboarding, setIsSacredOnboarding] = useState(false);
  const [appSettings, setAppSettings] = useState(() => readStoredAppSettings());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const lang = appSettings.language;
  const t = STRINGS[lang];
  const updateAppSettings = useCallback((nextSettingsOrUpdater) => {
    setAppSettings((current) => {
      const nextSettings = typeof nextSettingsOrUpdater === 'function'
        ? nextSettingsOrUpdater(current)
        : nextSettingsOrUpdater;
      return persistAppSettings(nextSettings);
    });
  }, []);
  const setLang = useCallback((nextLanguageOrUpdater) => {
    updateAppSettings((current) => ({
      ...current,
      language: typeof nextLanguageOrUpdater === 'function'
        ? nextLanguageOrUpdater(current.language)
        : nextLanguageOrUpdater,
    }));
  }, [updateAppSettings]);
  const effectiveReducedMotion = appSettings.reducedMotion || prefersReducedMotion;
  const autoDemoCopy = useMemo(() => AUTO_DEMO_COPY[lang] ?? AUTO_DEMO_COPY.en, [lang]);
  const oneClickDemoCopy = useMemo(() => ONE_CLICK_DEMO_COPY[lang] ?? ONE_CLICK_DEMO_COPY.en, [lang]);
  const [status, setStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [_lastEvent, setLastEvent] = useState('none');
  const [_toolCallsCount, setToolCallsCount] = useState(0);
  const [_reconnectAttempt, setReconnectAttempt] = useState(0);
  const [cognitiveMetrics, setCognitiveMetrics] = useState({
    equilibriumScore: 0.6,
    overloadIndex: 0.0,
    clarityDelta: 0.0,
  });
  const [isMicActive, setIsMicActive] = useState(false);
  const [appView, setAppView] = useState('welcome'); // 'welcome', 'setup', 'live', 'complete', 'dashboard', 'settings'
  const [transcript, setTranscript] = useState([]); // Live transcript entries
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const ambientDroneRef = useRef(null);
  const reverbNodesRef = useRef([]); // Track reverb delay nodes for cleanup
  const [isAutoDemoRunning, setIsAutoDemoRunning] = useState(false);
  const [isWelcomeDemoLaunching, setIsWelcomeDemoLaunching] = useState(false);
  const [autoDemoStatus, setAutoDemoStatus] = useState('');
  const [whyNowLine, setWhyNowLine] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const storedSettings = readStoredAppSettings();
    return !storedSettings.rememberOnboarding || window.localStorage.getItem('dawayir-onboarding-seen') !== 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedMicId, setSelectedMicId] = useState(() => window.localStorage.getItem('dawayir-mic-device') || '');
  const [isBreathingRoom, setIsBreathingRoom] = useState(true);
  const [achievements, setAchievements] = useState({
    firstWord: false,
    firstReply: false,
    awarenessShift: false,
    knowledgeShift: false,
    truthShift: false,
    deepConvo: false,
    sentimentShift: false,
    bargeIn: false,
    visionUsed: false,
    voiceCommand: false,
    reconnected: false,
  });
  const unlockAchievement = useCallback((key) => {
    setAchievements((prev) => prev[key] ? prev : { ...prev, [key]: true });
  }, []);
  const [showCircleIntro, setShowCircleIntro] = useState(false);
  const circleIntroShownRef = useRef(false);
  const [connectStage, setConnectStage] = useState(0);
  const [isTransitioningToSetup, setIsTransitioningToSetup] = useState(false);
  const [isSetupIntro, setIsSetupIntro] = useState(false);
  const [isSandMandalaActive, setIsSandMandalaActive] = useState(false);
  const isAgentSpeakingRef = useRef(false);
  const [commandText, setCommandText] = useState('');
  const [measuredLatencyMs, setMeasuredLatencyMs] = useState(null);
  const turnLatencyStartAtRef = useRef(0);
  const turnLatencyCapturedRef = useRef(false);
  const lastBioSignalAtRef = useRef(0);
  const lastBioLevelRef = useRef('');
  const [voiceTone, setVoiceTone] = useState('silent');
  const [showBreathing, setShowBreathing] = useState(false);
  const tenseStartRef = useRef(null);
  const tenseTimerRef = useRef(null);
  const audioDiag = useMemo(() => {
    if (_lastEvent.includes('gemini_reconnecting') || _lastEvent.includes('ws_closed') || _lastEvent.includes('ws_error')) {
      return {
        className: 'net',
        text: lang === 'ar' ? 'سبب التقطيع: غالبًا شبكة/خادم (إعادة اتصال).' : 'Stutter cause: likely network/server reconnect.',
      };
    }
    if (_lastEvent.includes('barge_in')) {
      return {
        className: 'local',
        text: lang === 'ar' ? 'سبب التقطيع: مقاطعة محلية (صوتك/الميكروفون أوقف الوكيل).' : 'Stutter cause: local interruption (mic/barge-in).',
      };
    }
    if (_lastEvent === 'audio_chunk') {
      return {
        className: 'ok',
        text: lang === 'ar' ? 'الصوت مستقر حاليًا.' : 'Audio is currently stable.',
      };
    }
    return {
      className: '',
      text: lang === 'ar' ? 'جاري مراقبة سبب أي تقطيع...' : 'Monitoring stutter cause...',
    };
  }, [_lastEvent, lang]);

  const debugLineText = useMemo(() => {
    const setupFlag = isConnected ? 1 : 0;
    const micFlag = isMicActive ? 1 : 0;
    const rt = Number.isFinite(measuredLatencyMs) ? `${Math.round(measuredLatencyMs)}ms` : '--';
    return `setup:${setupFlag} mic:${micFlag} retries:${_reconnectAttempt} tools:${_toolCallsCount} last:${_lastEvent} rt:${rt}`;
  }, [_lastEvent, _reconnectAttempt, _toolCallsCount, isConnected, isMicActive, measuredLatencyMs]);

  // --- PRE-CUE SPEECH STATE ---
  const [_isUserSpeaking, setIsUserSpeaking] = useState(false);
  const userSpeechActiveRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const speechResetTimerRef = useRef(null);

  // ── FEATURE ① + ⑥: Dominant Circle Color for Acoustic Mirror + VoiceTone ──
  const [dominantColor, setDominantColor] = useState('#38B2D8');
  const dominantNodeRef = useRef(1); // id of currently dominant node

  // ── FEATURE ①: Breathing Regulator ────────────────────────────────────────
  const TENSE_TRIGGER_MS = 3000; // 3 seconds of tense → show breathing guide
  const prevInsightRadiusRef = useRef(null); // Feature ④: Insight Detector

  // ── FEATURE ┃: Emotional Weather ──────────────────────────────────────────────
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [transitionCount, setTransitionCount] = useState(0);

  // ── FEATURE ┄: Mirror Sentence ──────────────────────────────────────────────
  // journeyPath: ordered list of unique dominant nodes this session [1, 2, 3] etc
  const journeyPathRef = useRef([1]);
  const [journeyPath, setJourneyPath] = useState([1]);

  // FEATURE: Cognitive DNA Card
  const [showDNACard, setShowDNACard] = useState(false);
  const [dnaWeatherId, setDnaWeatherId] = useState('partly');
  const [dnaMirrorSentence, setDnaMirrorSentence] = useState('');

  // ── FEATURE ②: Sacred Pause ───────────────────────────────────────────────
  // (tone passed into SacredPause component directly)

  // ── FEATURE ③: Cognitive Transcript Coloring ─────────────────────────────
  // dominantColor is already tracked above — we stamp each transcript entry with it

  // ── FEATURE ④: Cognitive Transition Detection ──────────────────────────────
  // Fires a toast when the dominant circle changes — this IS cognitive health.
  const [transitionToast, setTransitionToast] = useState(null);
  const transitionToastTimer = useRef(null);
  const whyNowTimerRef = useRef(null);

  const TRANSITION_MESSAGES = {
    ar: {
      '1→2': '🔬 وعيك وصل للعلم — اللي حاسس بيه بيتأكد بالمعرفة',
      '1→3': '🌍 قفزة من وعيك للواقع — لحظة صدق نادرة',
      '2→1': '💭 العلم لمس وعيك — اللي تعلمته بيأثر فعلاً',
      '2→3': '🌟 من المعرفة للواقع — دماغك بيرسم الصورة الحقيقية!',
      '3→1': '🔄 الواقع بيلعب في وعيك — حاسس بأثره',
      '3→2': '🔍 الواقع بيسأل: وإيه اللي يقوله العلم؟',
    },
    en: {
      '1→2': '🔬 Your awareness met knowledge — what you feel is confirmed by what is known',
      '1→3': '🌍 Rare leap — from your inner world directly to reality',
      '2→1': '💭 Knowledge touched your awareness — what you learned is landing inside you',
      '2→3': '🌟 From knowledge to reality — your mind is mapping what is actually true!',
      '3→1': '🔄 Reality is moving through your awareness — you feel its impact',
      '3→2': '🔍 Reality asks: what does knowledge say about this?',
    },
  };


  const getWhyNowCircleName = useCallback((nodeId) => {
    const names = {
      1: lang === 'ar' ? 'وعيك' : 'your Awareness',
      2: lang === 'ar' ? 'دايرة العلم' : 'Knowledge',
      3: lang === 'ar' ? 'دايرة الواقع' : 'Reality',
    };
    return names[Number(nodeId)] ?? names[1];
  }, [lang]);


  const pushWhyNowLine = useCallback((payload) => {
    if (!payload?.text) return;
    setWhyNowLine(payload);
    window.clearTimeout(whyNowTimerRef.current);
    whyNowTimerRef.current = window.setTimeout(() => setWhyNowLine(null), payload.durationMs ?? 4200);
  }, []);


  const buildWhyNowPayload = useCallback(({ callId, callName, args, nodeId }) => {
    const circleName = getWhyNowCircleName(nodeId);
    const circleId = Number(nodeId);
    const source = String(args?.source || '');
    const policy = String(args?.policy || '');
    const metric = String(args?.metric || '');
    const currentOverload = Number(cognitiveMetrics.overloadIndex) || 0;
    const currentEquilibrium = Number(cognitiveMetrics.equilibriumScore) || 0;
    const currentClarity = Number(cognitiveMetrics.clarityDelta) || 0;
    const normalizedCallId = String(callId || '');

    // User-commanded shift
    if (normalizedCallId.startsWith('server_cmd_') || normalizedCallId.startsWith('text_cmd_') || normalizedCallId.startsWith('client_cmd_')) {
      return {
        tone: 'direct',
        text: lang === 'ar'
          ? `انت اللي قررت تحول ${circleName} - ده وعي بنفسك.`
          : `You chose to shift ${circleName} - that's self-awareness in action.`,
      };
    }

    // Bio-signal / stress detection
    if (normalizedCallId.startsWith('sentiment_') || source === 'bio_signal') {
      if (circleId === 1) {
        return { tone: 'bio', text: lang === 'ar' ? 'جسمك بيقول حاجة - مشاعرك اكبر من كلامك دلوقتي.' : "Your body is speaking - your feelings are louder than your words right now." };
      }
      return { tone: 'bio', text: lang === 'ar' ? `${circleName} تحركت - جزء منك بيتفاعل قبل ما تفكر.` : `${circleName} moved - part of you is responding before thinking.` };
    }

    // Vision / camera reading
    if (source === 'vision') {
      return { tone: 'focus', text: lang === 'ar' ? `وشك قال حاجة - ${circleName} اتعدلت على اساس قرايتك البصرية.` : `Your face said something - ${circleName} shifted from what the camera saw.` };
    }

    // Highlight / spotlight
    if (callName === 'highlight_node') {
      const msgs = { ar: { 1: 'دلوقتي مهم تسمع لجسمك ومشاعرك.', 2: 'وقت التفكير والتحليل - عقلك فاعل.', 3: 'قيمك بتتكلم - استمع لنفسك الحقيقية.' }, en: { 1: 'Now is the time to listen to your feelings.', 2: 'Thinking time - your mind is active.', 3: 'Your values are speaking - listen to your true self.' } };
      return { tone: 'focus', text: (msgs[lang] || msgs.ar)[circleId] || (lang === 'ar' ? `${circleName} في البؤرة دلوقتي.` : `${circleName} is in focus now.`) };
    }

    // Overload / grounding
    if (policy === 'PRIORITIZE_GROUNDING' || metric === 'overload' || currentOverload > 0.72) {
      return { tone: 'ground', text: lang === 'ar' ? 'في ضغط جواك - مشاعرك محتاجة مساحة دلوقتي.' : "There's pressure inside - your feelings need space right now." };
    }

    // Low equilibrium
    if (policy === 'PRIORITIZE_STRUCTURE' || metric === 'equilibrium' || currentEquilibrium < 0.42) {
      return { tone: 'balance', text: lang === 'ar' ? 'في اختلال بين عقلك ومشاعرك - ده طبيعي، بنعدل.' : "There's tension between your mind and feelings - that's normal, recalibrating." };
    }

    // Clarity rising (especially Truth circle)
    if (metric === 'clarity' || (circleId === 3 && currentClarity > 0.08)) {
      return { tone: 'clarity', text: lang === 'ar' ? 'وضوح بيجي - قيمك الجوهرية بتظهر.' : 'Clarity is arriving - your core values are surfacing.' };
    }

    // Circle-specific defaults
    const defaults = { ar: { 1: 'مشاعرك بتتحرك - انتبه لما بيحصل جواك.', 2: 'عقلك بيتفاعل - التحليل شغال.', 3: 'قيمك بتاثر على اللحظة.' }, en: { 1: "Your feelings are shifting - notice what's happening inside.", 2: 'Your mind is responding - thinking is active.', 3: 'Your values are influencing this moment.' } };
    return { tone: 'neutral', text: (defaults[lang] || defaults.ar)[circleId] || (lang === 'ar' ? `${circleName} بتتجاوب مع اللحظة.` : `${circleName} is responding to this moment.`) };
  }, [cognitiveMetrics.clarityDelta, cognitiveMetrics.equilibriumScore, cognitiveMetrics.overloadIndex, getWhyNowCircleName, lang]);

  const snapshotReplayNodes = useCallback(() => {
    const fallbackLabels = NODE_LABELS[lang] || NODE_LABELS.en;
    const nodes = canvasRef.current?.getNodes?.() || [];
    return nodes
      .map((node) => ({
        id: Number(node.id),
        radius: Math.round(Number(node.radius) || 0),
        color: typeof node.color === 'string' ? node.color : '#38B2D8',
        label: String(node.label || fallbackLabels[String(node.id)] || ''),
      }))
      .filter((node) => Number.isFinite(node.id))
      .sort((a, b) => a.id - b.id);
  }, [lang]);

  const resetSessionReplay = useCallback(() => {
    sessionReplayStartedAtRef.current = Date.now();
    lastReplaySignatureRef.current = '';
    const initialNodes = snapshotReplayNodes();
    sessionReplayRef.current = initialNodes.length > 0 ? [{
      atMs: 0,
      kind: 'start',
      focusId: null,
      reason: lang === 'ar' ? 'بداية الجلسة' : 'Session start',
      source: 'system',
      policy: 'IDLE',
      metric: 'turn',
      nodes: initialNodes,
      metrics: { ...cognitiveMetrics },
    }] : [];
  }, [cognitiveMetrics, lang, snapshotReplayNodes]);

  const captureReplayStep = useCallback((kind, payload = {}) => {
    const nodes = snapshotReplayNodes();
    if (nodes.length === 0) return;

    if (!sessionReplayStartedAtRef.current) {
      sessionReplayStartedAtRef.current = Date.now();
    }

    const step = {
      atMs: Math.max(0, Date.now() - sessionReplayStartedAtRef.current),
      kind,
      focusId: Number.isFinite(Number(payload.focusId)) ? Number(payload.focusId) : null,
      reason: typeof payload.reason === 'string' ? payload.reason : '',
      source: typeof payload.source === 'string' ? payload.source : 'agent',
      policy: typeof payload.policy === 'string' ? payload.policy : 'IDLE',
      metric: typeof payload.metric === 'string' ? payload.metric : 'turn',
      nodes,
      metrics: { ...cognitiveMetrics },
    };

    const signature = JSON.stringify({
      kind: step.kind,
      focusId: step.focusId,
      reason: step.reason,
      nodes: step.nodes.map((node) => ({ id: node.id, radius: node.radius, color: node.color })),
    });

    if (lastReplaySignatureRef.current === signature && kind === 'update') {
      return;
    }

    lastReplaySignatureRef.current = signature;
    sessionReplayRef.current = [...sessionReplayRef.current, step].slice(-160);
  }, [cognitiveMetrics, snapshotReplayNodes]);


  const resetUserSpeaking = useCallback(() => {
    userSpeechActiveRef.current = false;
    setIsUserSpeaking(false);
    if (speechResetTimerRef.current) {
      clearTimeout(speechResetTimerRef.current);
      speechResetTimerRef.current = null;
    }
  }, []);

  const preCue = useCallback((partialText) => {
    // Pulse all nodes to indicate the system is listening/reacting
    canvasRef.current?.pulseAll?.();
    console.log("%c🟣 PRE-CUE fired:", "color: #ff00ff; font-weight: bold", partialText);
  }, []);

  const startTurnLatency = useCallback(() => {
    turnLatencyStartAtRef.current = Date.now();
    turnLatencyCapturedRef.current = false;
  }, []);

  const resolveTurnLatency = useCallback(() => {
    if (turnLatencyCapturedRef.current) return;
    if (!turnLatencyStartAtRef.current) return;
    const elapsed = Date.now() - turnLatencyStartAtRef.current;
    if (elapsed <= 0 || elapsed > 30000) return;
    turnLatencyCapturedRef.current = true;
    setMeasuredLatencyMs(elapsed);
  }, []);

  useEffect(() => {
    applyAppSettingsToDocument(appSettings);
  }, [appSettings]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setPrefersReducedMotion(event.matches);

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    mediaQuery.addListener?.(handleChange);

    return () => {
      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.removeListener?.(handleChange);
    };
  }, []);

  // Update canvas node labels when language changes
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  }, [lang]);

  useEffect(() => {
    const labels = NODE_LABELS[lang];
    if (canvasRef.current) {
      Object.entries(labels).forEach(([id, label]) => {
        canvasRef.current.updateNode(Number(id), { label });
      });
    }
  }, [lang]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [journeyStage, setJourneyStage] = useState('Overwhelmed');
  const [latestTruthContract, setLatestTruthContract] = useState(null);
  const markTruthContractDone = useCallback(() => {
    setLatestTruthContract((prev) => prev ? { ...prev, status: 'completed' } : prev);
  }, []);
  const onboardingSteps = ONBOARDING_STEPS[lang];
  const connectSteps = CONNECT_PROGRESS[lang];

  useEffect(() => {
    if (isTranscriptVisible && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isTranscriptVisible]);

  useEffect(() => () => {
    window.clearTimeout(metricsAnnounceTimerRef.current);
    window.clearTimeout(srAnnounceTimerRef.current);
    window.clearTimeout(whyNowTimerRef.current);
    window.cancelAnimationFrame(viewFocusFrameRef.current);
  }, []);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const micStreamRef = useRef(null);
  const userKeyRef = useRef(null);
  const micContextRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const micSourceRef = useRef(null);
  const micWorkletRef = useRef(null);
  const micProcessorRef = useRef(null);
  const micSilentGainRef = useRef(null);
  const setupCompleteRef = useRef(false);
  const bootstrapPromptSentRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const micStartTimeoutRef = useRef(null);
  const manualCloseRef = useRef(false);
  const viewFocusFrameRef = useRef(null);
  const srAnnouncerRef = useRef(null);
  const srAnnounceTimerRef = useRef(null);
  const metricsAnnounceTimerRef = useRef(null);
  const previousTranscriptCountRef = useRef(0);
  const previousMetricsRef = useRef({
    equilibriumScore: 0.6,
    overloadIndex: 0,
    clarityDelta: 0,
  });
  const autoDemoRunIdRef = useRef(0);
  const autoDemoTimerRef = useRef(null);
  const autoDemoPendingStartRef = useRef(false);
  const isAutoDemoRunningRef = useRef(isAutoDemoRunning);
  const oneClickDemoPendingRef = useRef(false);
  const autoDemoSpeechUtteranceRef = useRef(null);
  const demoAudioRef = useRef(null);
  const autoDemoShouldRestoreMicRef = useRef(false);
  const appViewRef = useRef(appView);
  const isConnectedRef = useRef(isConnected);
  const transcriptRef = useRef(transcript);
  const sessionContextRef = useRef([]); // Stores last few text segments for context preservation
  const sessionReplayRef = useRef([]);
  const sessionReplayStartedAtRef = useRef(0);
  const lastReplaySignatureRef = useRef('');
  const restoreAfterGeminiReconnectRef = useRef(false);
  const lastRestorePromptAtRef = useRef(0);
  const connectLockRef = useRef(false);
  const transcriptThrottleRef = useRef({ user: 0, agent: 0 });
  const WS_LOG_VERBOSE = import.meta.env.VITE_VERBOSE_WS_LOG === '1';
  const deferMicStartUntilFirstAgentReplyRef = useRef(false);
  const isMicActiveRef = useRef(false);
  const ttsDecisionTimeoutRef = useRef(null);
  const currentTurnModeRef = useRef('none'); // none | model | tts
  const bufferedTurnTextRef = useRef('');
  const bufferedUserAgentTurnTextRef = useRef('');
  const bufferedUserTextRef = useRef('');
  const lastAgentContentAtRef = useRef(0);
  const lastUserAgentContentAtRef = useRef(0);
  const vadStateRef = useRef({
    speaking: false,
    speechMs: 0,
    silenceMs: 0,
    noiseFloor: 90,
  });
  const micTurnRef = useRef({
    speaking: false,
    lastVoiceAt: 0,
    audioEndSent: true,
  });
  const bargeInStrongFramesRef = useRef(0);
  const lastBargeInAtRef = useRef(0);
  const formatAppError = useCallback((key, detail = '') => {
    return getLocalizedErrorMessage(t.errors, key, detail) || detail || t.statusError;
  }, [t]);
  const announce = useCallback((message) => {
    if (!message || !srAnnouncerRef.current) return;

    window.clearTimeout(srAnnounceTimerRef.current);
    srAnnouncerRef.current.textContent = '';
    srAnnounceTimerRef.current = window.setTimeout(() => {
      if (srAnnouncerRef.current) {
        srAnnouncerRef.current.textContent = message;
      }
    }, 30);
  }, []);
  const focusViewHeading = useCallback((viewName) => {
    window.cancelAnimationFrame(viewFocusFrameRef.current);
    viewFocusFrameRef.current = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const heading = document.querySelector(`[data-view-heading="${viewName}"]`);
        if (heading instanceof HTMLElement) {
          heading.focus();
        }
      });
    });
  }, []);
  const goToView = useCallback((nextView) => {
    const headingLabel = t.viewHeadings?.[nextView];

    if (appViewRef.current !== nextView) {
      setAppView(nextView);
    }

    focusViewHeading(nextView);

    if (headingLabel) {
      announce(getViewAnnouncement(lang, headingLabel));
    }
  }, [announce, focusViewHeading, lang, t.viewHeadings]);

  const openUiShowcase = useCallback(() => goToView('ui-showcase'), [goToView]);



  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  useEffect(() => {
    appViewRef.current = appView;
  }, [appView]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isAutoDemoRunningRef.current = isAutoDemoRunning;
  }, [isAutoDemoRunning]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    const previousCount = previousTranscriptCountRef.current;
    previousTranscriptCountRef.current = transcript.length;

    if (appView !== 'live' || isTranscriptVisible || transcript.length <= previousCount) {
      return;
    }

    const newEntries = transcript.slice(previousCount);
    let latestEntry = transcript[transcript.length - 1];
    for (let index = newEntries.length - 1; index >= 0; index -= 1) {
      if (String(newEntries[index]?.text || '').trim()) {
        latestEntry = newEntries[index];
        break;
      }
    }

    announce(getTranscriptAnnouncement(lang, latestEntry));
  }, [announce, appView, isTranscriptVisible, lang, transcript]);

  // FEATURE ⑯: SUBLIMINAL HEARTBEAT (Ghost-Tap + Audio Pulse)
  // When Equilibrium > 85%, pulse gently every 833ms (72 BPM) to entrain parasympathetic calmness.
  // Uses navigator.vibrate on mobile + an audio "thump" on desktop.
  useEffect(() => {
    let intervalId;
    let hasLoggedFirstPulse = false;
    if (appView === 'live' && isConnected && cognitiveMetrics.equilibriumScore > 0.85) {
      console.log('[Heartbeat] 💓 Subliminal heartbeat ACTIVE (Eq > 85%, 72 BPM)');
      intervalId = setInterval(() => {
        // Mobile vibration (Android only)
        try { if (navigator.vibrate) navigator.vibrate(2); } catch {}
        // Desktop audio pulse — low "thump" via shared AudioContext
        try {
          const ctx = speakerContextRef.current;
          if (ctx && ctx.state === 'running') {
            if (!hasLoggedFirstPulse) {
              console.log('[Heartbeat] 🔊 First audio pulse fired (ctx.state=' + ctx.state + ')');
              hasLoggedFirstPulse = true;
            }
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, ctx.currentTime); // 150 Hz — audible on laptop speakers
            gain.gain.setValueAtTime(0.12, ctx.currentTime);     // noticeable but still subtle
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1); // 100ms pulse
          }
        } catch {}
      }, 833); // 72 Beats Per Minute
    }
    return () => clearInterval(intervalId);
  }, [appView, isConnected, cognitiveMetrics.equilibriumScore]);

  useEffect(() => {
    if (appView !== 'live' || !isConnected) {
      previousMetricsRef.current = cognitiveMetrics;
      window.clearTimeout(metricsAnnounceTimerRef.current);
      return undefined;
    }

    const previousMetrics = previousMetricsRef.current;
    const nextMetrics = cognitiveMetrics;
    const changed = Math.abs((nextMetrics.equilibriumScore ?? 0) - (previousMetrics.equilibriumScore ?? 0)) >= 0.03
      || Math.abs((nextMetrics.overloadIndex ?? 0) - (previousMetrics.overloadIndex ?? 0)) >= 0.03
      || Math.abs((nextMetrics.clarityDelta ?? 0) - (previousMetrics.clarityDelta ?? 0)) >= 0.03;

    previousMetricsRef.current = nextMetrics;

    if (!changed) {
      return undefined;
    }

    window.clearTimeout(metricsAnnounceTimerRef.current);
    metricsAnnounceTimerRef.current = window.setTimeout(() => {
      announce(getMetricsAnnouncement(lang, nextMetrics));
    }, 900);

    return () => window.clearTimeout(metricsAnnounceTimerRef.current);
  }, [announce, appView, cognitiveMetrics, isConnected, lang]);

  const getOutputSpeaker = useCallback((speaker) => (
    speaker === 'user_agent' ? 'user_agent' : 'dawayir'
  ), []);

  const getTranscriptSpeakerLabel = useCallback((role) => {
    if (role === 'agent') {
      return lang === 'ar' ? 'دواير' : 'Dawayir';
    }
    if (role === 'user_agent') {
      return lang === 'ar' ? 'وكيل المستخدم' : 'User Agent';
    }
    if (role === 'user') {
      return lang === 'ar' ? 'أنت' : 'You';
    }
    return '';
  }, [lang]);

  const upsertTranscriptBubble = useCallback((role, text, finished, options = {}) => {
    const cleanedText = String(text ?? '').trim();
    if (!cleanedText) return;
    const {
      cogColor,
      limit = 8,
    } = options;
    const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setTranscript((prev) => {
      const next = [...prev];
      let found = false;
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === role && !next[i].finished) {
          next[i] = {
            ...next[i],
            text: cleanedText,
            finished: !!finished,
            cogColor: cogColor ?? next[i].cogColor,
          };
          found = true;
          break;
        }
      }
      if (!found) {
        next.push({
          role,
          text: cleanedText,
          time: timeStr,
          finished: !!finished,
          cogColor,
        });
      }
      return next.slice(-limit);
    });
  }, [lang]);

  const startCamera = useCallback(async () => {
    console.log("[Camera] Starting camera...");
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(formatAppError('cameraBrowserUnsupported'));
      }

      console.log("[Camera] Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log("[Camera] Permission granted. Stream:", stream);
      console.log("[Camera] Video tracks:", stream.getVideoTracks());

      if (videoRef.current) {
        console.log("[Camera] Setting stream to video element");
        videoRef.current.srcObject = stream;

        // Wait for video metadata to load
        videoRef.current.onloadedmetadata = () => {
          console.log("[Camera] Video metadata loaded");
          console.log("[Camera] Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
        };

        // Force play for browsers that need it
        try {
          await videoRef.current.play();
          console.log("[Camera] Video play() succeeded");
        } catch (playErr) {
          console.warn("[Camera] Autoplay prevented", playErr);
          setErrorMessage(formatAppError('cameraAutoplay'));
        }

        setIsCameraActive(true);
        console.log("[Camera] [OK] Camera activated successfully");
      } else {
        console.error("[Camera] videoRef.current is null!");
        setErrorMessage(formatAppError('videoElementNotReady'));
      }
    } catch (err) {
      console.error("[Camera] [ERROR] Error:", err);
      console.error("[Camera] Error name:", err.name);
      console.error("[Camera] Error message:", err.message);

      if (err.message === formatAppError('cameraBrowserUnsupported')) {
        setErrorMessage(err.message);
      } else if (err.name === 'NotAllowedError') {
        setErrorMessage(formatAppError('cameraPermissionDenied'));
      } else if (err.name === 'NotFoundError') {
        setErrorMessage(formatAppError('cameraNotFound'));
      } else if (err.name === 'NotReadableError') {
        setErrorMessage(formatAppError('cameraInUse'));
      } else {
        setErrorMessage(formatAppError('cameraGeneric', err.message));
      }
    }
  }, [formatAppError]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureSnapshot = useCallback(() => {
    if (!videoRef.current) {
      console.error("[Camera] Video ref not available");
      return null;
    }

    const canvas = document.createElement('canvas');

    // Scale down to max 640px height while maintaining aspect ratio
    // (Smaller payload = faster bootstrap)
    const MAX_DIM = 640;
    let width = videoRef.current.videoWidth;
    let height = videoRef.current.videoHeight;

    console.log(`[Camera] Capturing snapshot - Video dimensions: ${width}x${height}`);

    if (width === 0 || height === 0) {
      console.error("[Camera] Video dimensions are 0. Camera may not be ready yet.");
      setErrorMessage(formatAppError('cameraNotReady'));
      return null;
    }

    if (width > height) {
      if (width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, width, height);

    // 0.7 quality is perfect for facial expression analysis
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(dataUrl);
    stopCamera();
    console.log("[Camera] Snapshot captured successfully");
    return dataUrl.split(',')[1]; // Base64
  }, [formatAppError, stopCamera]);

  const speakerContextRef = useRef(null);
  const activeSourcesRef = useRef(new Set());
  const nextPlaybackTimeRef = useRef(0);
  const speakingDebounceRef = useRef(null);
  const pcmWorkletRef = useRef(null);
  const workletReadyRef = useRef(false);
  const lastPcmPushAtRef = useRef(0);
  const pendingPcmChunksRef = useRef([]);
  const pcmFlushScheduledRef = useRef(false);
  const ttsFallbackEnabledRef = useRef(false); // Disabled TTS fallback here
  const lastModelAudioAtRef = useRef(Date.now());
  const lastSpokenTextRef = useRef('');
  const lastSpokenAtRef = useRef(0);
  const pendingTtsTimeoutRef = useRef(null);

  const backendUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_BACKEND_WS_URL;
    if (envUrl) return envUrl;

    if (typeof window === 'undefined') return 'ws://localhost:8080';

    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalHost) return 'ws://localhost:8080';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }, []);

  const statusClass = useMemo(() => {
    const normalized = status.toLowerCase();

    if (normalized.includes('connected')) return 'connected';
    if (normalized.includes('connecting')) return 'connecting';
    if (normalized.includes('error')) return 'error';
    return 'disconnected';
  }, [status]);

  const markOnboardingPreference = useCallback(() => {
    if (appSettings.rememberOnboarding) {
      window.localStorage.setItem('dawayir-onboarding-seen', 'true');
    } else {
      window.localStorage.removeItem('dawayir-onboarding-seen');
    }
  }, [appSettings.rememberOnboarding]);

  const dismissOnboarding = useCallback(() => {
    markOnboardingPreference();
    setShowOnboarding(false);
    setOnboardingStep(0);
  }, [markOnboardingPreference]);

  const advanceOnboarding = useCallback(() => {
    setOnboardingStep((current) => {
      if (current >= onboardingSteps.length - 1) {
        markOnboardingPreference();
        setShowOnboarding(false);
        return current;
      }

      return current + 1;
    });
  }, [markOnboardingPreference, onboardingSteps.length]);

  const getAudioContextCtor = () => window.AudioContext || window.webkitAudioContext;

  const closeSpeakerContext = useCallback(async () => {
    if (!speakerContextRef.current) return;

    // Clean up worklet
    if (pcmWorkletRef.current) {
      pcmWorkletRef.current.port.postMessage({ type: 'stop' });
      try {
        pcmWorkletRef.current.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      pcmWorkletRef.current = null;
      workletReadyRef.current = false;
    }

    try {
      await speakerContextRef.current.close();
    } catch {
      // Ignore close race errors.
    }

    speakerContextRef.current = null;
    nextPlaybackTimeRef.current = 0;
    activeSourcesRef.current.clear();
  }, []);

  const clearPendingTts = useCallback(() => {
    if (ttsDecisionTimeoutRef.current) {
      window.clearTimeout(ttsDecisionTimeoutRef.current);
      ttsDecisionTimeoutRef.current = null;
    }
    if (pendingTtsTimeoutRef.current) {
      window.clearTimeout(pendingTtsTimeoutRef.current);
      pendingTtsTimeoutRef.current = null;
    }
  }, []);

  const resetAgentTurnState = useCallback(() => {
    clearPendingTts();
    currentTurnModeRef.current = 'none';
    bufferedTurnTextRef.current = '';
    bufferedUserAgentTurnTextRef.current = '';
    lastAgentContentAtRef.current = 0;
    lastUserAgentContentAtRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    canvasRef.current?.setAgentSpeaking?.(false);
    ambientDroneRef.current?.stop();

    // We intentionally keep the transcript up to date rather than clearing it on turn end,
    // so that the conversation history stays visible until manually cleared.
  }, [clearPendingTts]);

  const stopTextToSpeechFallback = useCallback(() => {
    clearPendingTts();
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancellation errors.
    }
  }, [clearPendingTts]);

  const speakTextFallback = useCallback((text) => {
    if (!ttsFallbackEnabledRef.current || typeof text !== 'string' || text.trim().length === 0) {
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Avoid reading markdown artifacts literally.
    const cleanedText = text.replace(/[*_`#]/g, '').trim();
    if (!cleanedText) {
      return;
    }

    const now = Date.now();
    if (cleanedText === lastSpokenTextRef.current && now - lastSpokenAtRef.current < 5000) {
      return;
    }

    stopTextToSpeechFallback();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = /[\u0600-\u06FF]/.test(cleanedText) ? 'ar-EG' : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      if (currentTurnModeRef.current === 'tts') {
        setIsAgentSpeaking(false);
        isAgentSpeakingRef.current = false;
        canvasRef.current?.setAgentSpeaking?.(false);
        currentTurnModeRef.current = 'none';
        bufferedTurnTextRef.current = '';
      }
    };
    utterance.onerror = () => {
      setIsAgentSpeaking(false);
      isAgentSpeakingRef.current = false;
      currentTurnModeRef.current = 'none';
      bufferedTurnTextRef.current = '';
    };
    window.speechSynthesis.speak(utterance);
    lastSpokenTextRef.current = cleanedText;
    lastSpokenAtRef.current = now;
  }, [stopTextToSpeechFallback]);

  const stopPlayback = useCallback(() => {
    stopTextToSpeechFallback();
    if (speakingDebounceRef.current) {
      clearTimeout(speakingDebounceRef.current);
      speakingDebounceRef.current = null;
    }
    // Discard any batched but unflushed audio chunks
    pendingPcmChunksRef.current = [];
    pcmFlushScheduledRef.current = false;
    // Clear worklet ring buffer
    if (pcmWorkletRef.current) {
      pcmWorkletRef.current.port.postMessage({ type: 'clear' });
    }

    // Also stop any legacy BufferSourceNodes
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped.
      }
      try {
        source.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }
    activeSourcesRef.current.clear();
    nextPlaybackTimeRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    canvasRef.current?.setAgentSpeaking?.(false);
  }, [stopTextToSpeechFallback]);

  const ensureSpeakerContext = useCallback(async () => {
    if (speakerContextRef.current) {
      if (speakerContextRef.current.state === 'suspended') {
        await speakerContextRef.current.resume();
      }
      return speakerContextRef.current;
    }

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      throw new Error(formatAppError('webAudioUnsupported'));
    }

    const ctx = new AudioContextCtor({ sampleRate: OUTPUT_SAMPLE_RATE });
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    speakerContextRef.current = ctx;
    nextPlaybackTimeRef.current = ctx.currentTime;
    
    // Initialize ambient drone with the shared, resumed AudioContext
    if (!ambientDroneRef.current) {
      ambientDroneRef.current = createAmbientDrone(ctx);
    }
    
    return ctx;
  }, [formatAppError]);

  // AudioWorklet-based streaming PCM player.
  // The worklet runs on the audio thread -- completely immune to main thread jank.
  const ensurePcmWorklet = useCallback(async () => {
    if (pcmWorkletRef.current && workletReadyRef.current) return pcmWorkletRef.current;
    const audioContext = await ensureSpeakerContext();
    try {
      await audioContext.audioWorklet.addModule('/pcm-player-processor.js');
    } catch {
      // Module may already be registered
    }
    const workletNode = new AudioWorkletNode(audioContext, 'pcm-player-processor', {
      outputChannelCount: [1],
    });
    workletNode.connect(audioContext.destination);
    workletNode.port.onmessage = (e) => {
      if (e.data.type === 'drained') {
        // Worklet buffer fully drained after playing audio.
        // Use a debounce to wait for potential new chunks before declaring speech ended.
        if (speakingDebounceRef.current) clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = setTimeout(() => {
          const elapsed = Date.now() - lastPcmPushAtRef.current;
          if (elapsed > 500) {
            console.log('[Audio] Agent finished speaking (worklet drained)');
            setIsAgentSpeaking(false);
            isAgentSpeakingRef.current = false;
            canvasRef.current?.setAgentSpeaking?.(false);
          }
          speakingDebounceRef.current = null;
        }, 500);
      } else if (e.data.type === 'amplitude') {
        // Forward agent voice amplitude to canvas for Divine Voice Orb sync
        canvasRef.current?.setAgentAudioAmplitude?.(e.data.rms);
      }
    };
    pcmWorkletRef.current = workletNode;
    workletReadyRef.current = true;
    return workletNode;
  }, [ensureSpeakerContext]);

  const flushPcmChunks = useCallback(async () => {
    pcmFlushScheduledRef.current = false;
    const chunks = pendingPcmChunksRef.current;
    if (chunks.length === 0) return;
    pendingPcmChunksRef.current = [];

    const worklet = await ensurePcmWorklet();
    // Merge all pending chunks into a single Float32Array for one postMessage
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    worklet.port.postMessage({ type: 'audio', samples: merged });
    lastPcmPushAtRef.current = Date.now();
    lastModelAudioAtRef.current = Date.now();
  }, [ensurePcmWorklet]);

  const playPcmChunk = useCallback(
    async (arrayBuffer) => {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;

      stopTextToSpeechFallback();
      const float32 = pcm16ToFloat32(arrayBuffer);
      if (float32.length === 0) return;

      // Batch: accumulate chunks and flush via microtask so multiple WS messages
      // that arrive in the same event loop tick are merged into one postMessage.
      pendingPcmChunksRef.current.push(float32);
      if (!pcmFlushScheduledRef.current) {
        pcmFlushScheduledRef.current = true;
        queueMicrotask(flushPcmChunks);
      }

      // Cancel any pending "speaking ended" debounce since new audio arrived
      if (speakingDebounceRef.current) {
        clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = null;
      }
    },
    [flushPcmChunks, stopTextToSpeechFallback]
  );

  const stopMicrophone = useCallback(async () => {
    vadStateRef.current = {
      speaking: false,
      speechMs: 0,
      silenceMs: 0,
      noiseFloor: 90,
    };

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      micSourceRef.current = null;
    }

    if (micWorkletRef.current) {
      try {
        micWorkletRef.current.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      micWorkletRef.current = null;
    }

    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.onaudioprocess = null;
        micProcessorRef.current.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      micProcessorRef.current = null;
    }

    if (micSilentGainRef.current) {
      try {
        micSilentGainRef.current.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
      micSilentGainRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (micContextRef.current) {
      try {
        await micContextRef.current.close();
      } catch {
        // Ignore close race errors.
      }
      micContextRef.current = null;
    }

    micTurnRef.current = {
      speaking: false,
      lastVoiceAt: 0,
      audioEndSent: true,
    };
    setIsMicActive(false);
  }, []);

  const sendRealtimeAudioChunk = useCallback((arrayBuffer, sampleRate) => {
    if (!arrayBuffer || !setupCompleteRef.current) {
      return;
    }

    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Analyze volume for local VAD (barge-in and fast turn-end)
    const samples = new Int16Array(arrayBuffer);
    if (samples.length === 0) return;
    let sumAbs = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sumAbs += Math.abs(samples[i]);
    }
    const avgAbs = sumAbs / samples.length;

    // Normal speech threshold (lowered to catch quiet voices)
    const speechDetected = avgAbs > 100;
    const now = Date.now();

    if (isAgentSpeakingRef.current) {
      // Require sustained, strong user speech before interrupting agent playback.
      // This avoids false barge-in from speaker bleed / room echo.
      // Tuned for demo reliability:
      // 1) Fast user interruption (priority)
      // 2) Still avoid random cuts from mild echo
      const BARGE_IN_IMMEDIATE_RMS = 900;
      const BARGE_IN_STRONG_RMS = 560;
      const BARGE_IN_REQUIRED_FRAMES = 2;
      const BARGE_IN_COOLDOWN_MS = 700;

      const sinceLastBargeIn = now - lastBargeInAtRef.current;
      const canBargeIn = sinceLastBargeIn > BARGE_IN_COOLDOWN_MS;

      // Immediate cut for very strong/intentional interruption.
      if (canBargeIn && avgAbs >= BARGE_IN_IMMEDIATE_RMS) {
        stopPlayback();
        setLastEvent('barge_in_rms_immediate');
        lastBargeInAtRef.current = now;
        bargeInStrongFramesRef.current = 0;
      } else if (avgAbs >= BARGE_IN_STRONG_RMS) {
        bargeInStrongFramesRef.current += 1;
      } else {
        bargeInStrongFramesRef.current = Math.max(0, bargeInStrongFramesRef.current - 1);
      }

      if (canBargeIn && bargeInStrongFramesRef.current >= BARGE_IN_REQUIRED_FRAMES) {
        stopPlayback();
        setLastEvent('barge_in_rms');
        lastBargeInAtRef.current = now;
        bargeInStrongFramesRef.current = 0;
      }
    } else {
      bargeInStrongFramesRef.current = 0;
    }
    // Always forward mic audio to Gemini — browser echoCancellation handles echo,
    // and Gemini's built-in VAD needs continuous audio to detect user speech.

    // Forward the chunk to Gemini
    socket.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: `audio/pcm;rate=${sampleRate}`,
              data: arrayBufferToBase64(arrayBuffer),
            },
          ],
        },
      })
    );

    // Update VAD state for explicit turn end
    if (speechDetected) {
      micTurnRef.current.speaking = true;
      micTurnRef.current.lastVoiceAt = now;
      micTurnRef.current.audioEndSent = false;
    }

    // Explicitly close user turn after sustained silence for faster response.
    if (
      micTurnRef.current.speaking
      && !micTurnRef.current.audioEndSent
      && (now - micTurnRef.current.lastVoiceAt) > 1000
    ) {
      startTurnLatency();
      socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      micTurnRef.current.speaking = false;
      micTurnRef.current.audioEndSent = true;
      setLastEvent('audio_stream_end_vad');
    }
  }, [startTurnLatency, stopPlayback]);

  const startMicrophone = useCallback(async () => {
    await stopMicrophone();
    vadStateRef.current = {
      speaking: false,
      speechMs: 0,
      silenceMs: 0,
      noiseFloor: 90,
    };
    micTurnRef.current = {
      speaking: false,
      lastVoiceAt: 0,
      audioEndSent: true,
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(formatAppError('microphoneUnsupported'));
    }

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      throw new Error(formatAppError('webAudioUnsupported'));
    }

    // Log available audio input devices to help diagnose mic issues
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      console.log('[Mic] Available audio input devices:', audioInputs.map((d) => ({ label: d.label, id: d.deviceId })));
    } catch { /* ignore */ }

    const audioConstraints = {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (selectedMicId) {
      audioConstraints.deviceId = { exact: selectedMicId };
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

    // Log which device was actually selected
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings();
      console.log('[Mic] Selected device:', { label: audioTrack.label, deviceId: settings.deviceId, sampleRate: settings.sampleRate, channelCount: settings.channelCount });
    }

    // Use the system's default sample rate (typically 48kHz) — forcing 16kHz
    // causes silent buffers on many Windows systems. The AudioWorklet handles
    // resampling from the native rate down to 16kHz.
    const micContext = new AudioContextCtor();
    if (micContext.state === 'suspended') {
      await micContext.resume();
    }

    const source = micContext.createMediaStreamSource(stream);
    const silentGain = micContext.createGain();
    silentGain.gain.value = 0;
    let workletReady = false;

    if (micContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        await micContext.audioWorklet.addModule(new URL(`./audio/mic-processor.js?v=${Date.now()}`, import.meta.url));
        const worklet = new AudioWorkletNode(micContext, MIC_WORKLET_NAME);
        worklet.port.onmessage = (event) => {
          const int16arrayBuffer = event.data?.int16arrayBuffer;
          const sampleRate = Number(event.data?.sampleRate) || INPUT_SAMPLE_RATE;
          if (!int16arrayBuffer) return;
          sendRealtimeAudioChunk(int16arrayBuffer, sampleRate);
        };

        source.connect(worklet);
        worklet.connect(silentGain);
        micWorkletRef.current = worklet;
        workletReady = true;
      } catch {
        // Fall back to ScriptProcessor when Worklet fails on specific browsers/extensions.
      }
    }

    if (!workletReady) {
      const processor = micContext.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer?.getChannelData(0);
        if (!input || input.length === 0) return;
        const downsampled = downsampleFloat32(input, micContext.sampleRate, INPUT_SAMPLE_RATE);
        sendRealtimeAudioChunk(float32ToPcm16Buffer(downsampled), INPUT_SAMPLE_RATE);
      };

      source.connect(processor);
      processor.connect(silentGain);
      micProcessorRef.current = processor;
    }

    // Keep microphone graph active without audible loopback.
    silentGain.connect(micContext.destination);

    micStreamRef.current = stream;
    micContextRef.current = micContext;
    micSourceRef.current = source;
    micSilentGainRef.current = silentGain;
    setIsMicActive(true);
    console.log('[Mic] Microphone started successfully', { workletReady, sampleRate: micContext.sampleRate });
  }, [formatAppError, sendRealtimeAudioChunk, stopMicrophone, selectedMicId]);

  const handleToolCall = useCallback((toolCall) => {
    const functionCalls = Array.isArray(toolCall?.functionCalls)
      ? toolCall.functionCalls
      : Array.isArray(toolCall?.function_calls)
        ? toolCall.function_calls
        : [];
    if (functionCalls.length === 0) return;

    const responses = [];

    for (const call of functionCalls) {
      let args = call?.args ?? {};
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }

      try {
        if (call.name === 'update_node') {
          // Smart ID resolution -- handle strings like "circle", "awareness", etc.
          const NAME_TO_ID = {
            // English — old names
            awareness: 1, circle: 1,
            science: 2, knowledge: 2,
            truth: 3,
            // English — new names
            you: 1, self: 1, me: 1,
            reality: 3, real: 3,
            // Arabic — old names
            'وعي': 1, 'الوعي': 1,
            'علم': 2, 'العلم': 2,
            'حقيقة': 3, 'الحقيقة': 3,
            // Arabic — new names
            'أنت': 1, 'انت': 1, 'النفس': 1, 'الذات': 1,
            'الواقع': 3, 'واقع': 3,
            // Numeric fallback
            '1': 1, '2': 2, '3': 3,
          };
          const rawId = args.id ?? args.node_id ?? args.nodeId ?? 1;
          const resolvedId = NAME_TO_ID[String(rawId).toLowerCase()] ?? Number(rawId);
          const id = Number.isFinite(resolvedId) ? resolvedId : 1;
          const currentNodes = canvasRef.current?.getNodes() || [];
          const safeId = currentNodes.some(n => n.id === id) ? id : 1;

          const updates = { ...args };
          delete updates.id; delete updates.node_id; delete updates.nodeId;

          // Backward compatibility for legacy tool args.
          if (updates.radius === undefined) {
            const numericWeight = Number(updates.weight);
            const numericDelta = Number(updates.expansion ?? updates.size);
            if (Number.isFinite(numericWeight)) {
              const clampedWeight = Math.max(0.3, Math.min(1.0, numericWeight));
              updates.radius = String(Math.round(clampedWeight * 100));
            } else if (Number.isFinite(numericDelta)) {
              const currentRadius = Number(currentNodes.find(n => n.id === safeId)?.radius ?? 60);
              const nextRadius = Math.max(30, Math.min(100, Math.round(currentRadius + (numericDelta * 5))));
              updates.radius = String(nextRadius);
            }
          }
          if (updates.color === undefined && typeof updates.colour === 'string') {
            updates.color = updates.colour;
          }
          delete updates.weight; delete updates.size; delete updates.expansion; delete updates.colour;

          console.log(`[App] Updating node ${safeId} (raw: ${rawId}):`, updates);
          canvasRef.current?.updateNode(safeId, updates);
          // Auto-pulse so the change is visually obvious
          canvasRef.current?.pulseNode(safeId);
          announce(getCircleAnnouncement(lang, NODE_LABELS[lang]?.[safeId]));
          const whyNowPayload = buildWhyNowPayload({
            callId: call.id,
            callName: call.name,
            args,
            nodeId: safeId,
          });
          pushWhyNowLine(whyNowPayload);
          // Circle intro: show once on first ever circle shift
          if (!circleIntroShownRef.current && !CircleFirstShiftTooltip.hasSeen()) {
            circleIntroShownRef.current = true;
            setShowCircleIntro(true);
          }
          captureReplayStep('update', {
            focusId: safeId,
            reason: whyNowPayload.text,
            source: args?.source || (String(call.id || '').startsWith('sentiment_') ? 'bio_signal' : 'agent'),
            policy: args?.policy || 'IDLE',
            metric: args?.metric || 'turn',
          });

          // ── SATELLITE NODE SPAWN ──────────────────────────────────────
          // Extract the driving topic from tool args and spawn it as a
          // satellite node orbiting the updated circle. This is the
          // "Cognitive Awareness System" — seeing WHAT you're feeling AND WHY.
          const topicRaw = args.topic ?? args.reason ?? args.label ?? args.note ?? '';
          if (topicRaw && typeof topicRaw === 'string' && topicRaw.trim().length > 1) {
            const topic = topicRaw.trim().split(/\s+/)[0].slice(0, 8);
            canvasRef.current?.addSatellite?.(safeId, topic);
          } else {
            // Smart fallback: derive a topic from the last transcript user message
            let lastUserMsg = '';
            for (let index = transcript.length - 1; index >= 0; index -= 1) {
              if (transcript[index]?.role === 'user') {
                lastUserMsg = transcript[index]?.text || '';
                break;
              }
            }
            if (lastUserMsg.length > 3) {
              const words = lastUserMsg.split(/\s+/).filter(w => w.length > 3);
              if (words.length > 0) {
                const word = words[Math.floor(Math.random() * Math.min(3, words.length))];
                canvasRef.current?.addSatellite?.(safeId, word.slice(0, 7));
              }
            }
          }
          // ── END SATELLITE ─────────────────────────────────────────────

          // ── FEATURE ④: COGNITIVE TRANSITION DETECTION ─────────────────
          // Check if the updated node is now dominant — if the dominant node
          // changed, fire a celebratory toast. This moment IS cognitive health.
          const allNodes = canvasRef.current?.getNodes?.() || [];
          if (allNodes.length > 0) {
            const dom = allNodes.reduce((a, b) => (a.radius > b.radius ? a : b));
            // Update dominant color for Acoustic Mirror (Feature ⑥)
            if (dom.color) setDominantColor(dom.color);

            if (dom.id !== dominantNodeRef.current) {
              const prevId = dominantNodeRef.current;
              dominantNodeRef.current = dom.id;
              // ── Update journey path for Mirror Sentence (Feature ┄) ──
              if (journeyPathRef.current[journeyPathRef.current.length - 1] !== dom.id) {
                journeyPathRef.current = [...journeyPathRef.current, dom.id];
                setJourneyPath([...journeyPathRef.current]);
                setTransitionCount(c => c + 1);
                // Feature Sound: play cognitive transition chime
                playTransitionSound(prevId, dom.id);
              }
              const msgKey = `${prevId}→${dom.id}`;
              const msgs = TRANSITION_MESSAGES[lang] || TRANSITION_MESSAGES.en;
              const msg = msgs[msgKey];
              if (msg) {
                setTransitionToast(msg);
                clearTimeout(transitionToastTimer.current);
                transitionToastTimer.current = setTimeout(() => setTransitionToast(null), 4000);
                canvasRef.current?.triggerBloom?.(); // Clarity Bloom on truth transition
              }
            }
          }
          // ── END TRANSITION DETECTION ───────────────────────────────────

          // ── FEATURE ④: INSIGHT DETECTOR (Ah-ha Moment) ────────────────
          // Pattern: Truth circle radius grew by >15px in this update
          // + user was recently speaking = INSIGHT moment
          if (safeId === 3 && updates.radius !== undefined) {
            const prevR = prevInsightRadiusRef.current ?? 80;
            const newR = Number(updates.radius);
            if (newR - prevR > 15 && userSpeechActiveRef.current) {
              // 🌟 Insight moment detected!
              const insightMsg = lang === 'ar'
                ? '✨ لحظة وضوح رُصدت! عقلك توصّل لشيء مهم'
                : '✨ Insight moment detected! Your mind reached clarity';
              setTransitionToast(insightMsg);
              clearTimeout(transitionToastTimer.current);
              transitionToastTimer.current = setTimeout(() => setTransitionToast(null), 5000);
              canvasRef.current?.triggerBloom?.();
              // Feature Sound: play insight arpeggio
              playInsightSound();
              unlockAchievement('truthShift');
            }
            prevInsightRadiusRef.current = newR;
          }
          // ── END INSIGHT DETECTOR ───────────────────────────────────────

          triggerHaptic(HAPTIC_PATTERNS.circleShift);
          if (safeId === 1) unlockAchievement('awarenessShift');
          else if (safeId === 2) unlockAchievement('knowledgeShift');
          else if (safeId === 3) unlockAchievement('truthShift');
          if (updates.color) unlockAchievement('sentimentShift');
          const callId = String(call.id || '');
          if (callId.startsWith('server_cmd_')) unlockAchievement('voiceCommand');

          // ── CIRCLE STATE ANALYZER — Prompting Strategy ─────────────────
          // Detects circle imbalance and silently guides Gemini toward the right question.
          {
            const stateNodes = canvasRef.current?.getNodes?.() || [];
            const n1 = stateNodes.find(n => n.id === 1)?.radius ?? 50;
            const n2 = stateNodes.find(n => n.id === 2)?.radius ?? 50;
            const n3 = stateNodes.find(n => n.id === 3)?.radius ?? 50;
            const socket = wsRef.current;
            const canSend = socket && socket.readyState === WebSocket.OPEN;
            let metaText = null;

            if (n1 > 65 && n3 < 45) {
              metaText = lang === 'ar'
                ? '(إشارة داخلية: وعي المستخدم مرتفع والواقع منخفض — في دورك القادم اسأل عن الواقع الفعلي بجملة واحدة لطيفة. لا تشرح ولا تحلل.)'
                : '(Internal signal: User awareness is high, reality is low. Next turn: ask one gentle question about what is actually happening.)';
            } else if (n2 > 65 && n1 < 45) {
              metaText = lang === 'ar'
                ? '(إشارة داخلية: المعرفة مرتفعة والوعي الداخلي منخفض — في دورك القادم اسأل عن الإحساس الجواني بجملة واحدة. لا تعطي معلومات.)'
                : '(Internal signal: Knowledge is high, awareness is low. Next turn: ask one question about their inner feeling, nothing else.)';
            } else if (n3 > 65 && n1 < 45) {
              metaText = lang === 'ar'
                ? '(إشارة داخلية: الواقع واضح والوعي الذاتي منخفض — في دورك القادم اسأل عن دور المستخدم في تشكيل هذا الواقع.)'
                : '(Internal signal: Reality is clear but self-awareness is low. Next turn: ask about their role in shaping this reality.)';
            } else if (n1 > 55 && n2 > 55 && n3 > 55) {
              metaText = lang === 'ar'
                ? '(إشارة داخلية: الثلاثة دوائر مرتفعة — المستخدم قريب من الوضوح. اسأل سؤال الإمكان: لو حصل تغيير واحد صغير دلوقتي — إيه ده؟)'
                : '(Internal signal: All three circles are high — user is near clarity. Ask the possibility question: if one small thing changed right now, what would it be?)';
            } else if (n1 < 42 && n2 < 42 && n3 < 42) {
              metaText = lang === 'ar'
                ? '(إشارة داخلية: الثلاثة دوائر منخفضة — المستخدم ربما يتجنب شيئاً. افتح باب الاعتراف بلطف شديد. جملة واحدة فقط.)'
                : '(Internal signal: All circles are low — possible avoidance. Gently open the door to acknowledgment. One sentence only.)';
            }

            if (metaText && canSend) {
              setTimeout(() => {
                const s = wsRef.current;
                if (s && s.readyState === WebSocket.OPEN) {
                  s.send(JSON.stringify({
                    clientContent: {
                      turns: [{ role: 'user', parts: [{ text: metaText }] }],
                      turnComplete: false,
                    },
                  }));
                }
              }, 800);
            }
          }
          // ── END CIRCLE STATE ANALYZER ────────────────────────────────────



        } else if (call.name === 'highlight_node') {
          const id = Number(args.id);
          const currentNodes = canvasRef.current?.getNodes() || [];
          if (!Number.isFinite(id) || !currentNodes.some(n => n.id === id)) {
            throw new Error(`Invalid or non-existent node id: ${args.id}`);
          }

          console.log(`[App] Highlighting node ${id}`);
          canvasRef.current?.pulseNode(id);
          const whyNowPayload = buildWhyNowPayload({
            callId: call.id,
            callName: call.name,
            args,
            nodeId: id,
          });
          pushWhyNowLine(whyNowPayload);
          // Circle intro: show once on first ever circle shift
          if (!circleIntroShownRef.current && !CircleFirstShiftTooltip.hasSeen()) {
            circleIntroShownRef.current = true;
            setShowCircleIntro(true);
          }
          captureReplayStep('highlight', {
            focusId: id,
            reason: whyNowPayload.text,
            source: args?.source || 'agent',
            policy: args?.policy || 'IDLE',
            metric: args?.metric || 'turn',
          });
        } else if (call.name === 'spawn_other') {
          // ── THE OTHER PERSON ────────────────────────────────
          const otherName = String(args.name || '').slice(0, 8);
          if (!otherName.trim()) { console.warn('[spawn_other] Empty name, skipping'); continue; }
          const otherTension = Math.max(0, Math.min(1, Number(args.tension) || 0.5));
          const otherColor = String(args.color || '#FFD700');
          console.log(`[App] Spawning other: ${otherName}, tension=${otherTension}`);
          canvasRef.current?.setOtherNode?.(otherName, otherTension, otherColor);

        } else if (call.name === 'spawn_topic') {
          // ── TOPIC CIRCLE ────────────────────────────────────
          const topicName = String(args.topic || '').slice(0, 8);
          if (!topicName.trim()) { console.warn('[spawn_topic] Empty topic, skipping'); continue; }
          const topicWeight = Math.max(0.3, Math.min(1, Number(args.weight) || 0.5));
          const topicColor = String(args.color || '#FF8C00');
          console.log(`[App] Spawning topic: ${topicName}, weight=${topicWeight}`);
          // Use satellite nodes for topics (orbit the dominant circle)
          const dominantId = (() => {
            const nodes = canvasRef.current?.getNodes?.() || [];
            if (nodes.length === 0) return 1;
            return nodes.reduce((a, b) => a.radius > b.radius ? a : b).id;
          })();
          canvasRef.current?.addSatellite?.(dominantId, topicName);
          triggerHaptic(HAPTIC_PATTERNS.circleShift);
          triggerHaptic(HAPTIC_PATTERNS.otherSpawn);

        } else if (call.name === 'update_journey') {
          const STAGE_MAP = {
            'overwhelmed': 'Overwhelmed',
            'focus': 'Focus',
            'clarity': 'Clarity'
          };
          const stage = args?.stage?.toLowerCase() || 'overwhelmed';
          const resolvedStage = STAGE_MAP[stage] || 'Overwhelmed';
          console.log(`[App] Updating journey stage to: ${resolvedStage}`);
          setJourneyStage(resolvedStage);
        } else if (call.name === 'save_mental_map') {
          const nodes = canvasRef.current?.getNodes() || [];
          console.log(`[App] Saving mental map with ${nodes.length} nodes`);
          captureReplayStep('save', {
            reason: lang === 'ar' ? 'تم حفظ الخريطة الذهنية.' : 'Mental map saved.',
            source: 'system',
            policy: 'IDLE',
            metric: 'turn',
          });
          responses.push({
            id: call.id,
            name: call.name,
            response: {
              nodes,
              replayTrace: sessionReplayRef.current,
              metrics: cognitiveMetrics,
              ok: true,
            },
          });
          continue;
        } else if (call.name === 'generate_session_report') {
          const { summary, insights, recommendations } = args;
          console.log(`[App] Generating session report:`, { summary, insights });
          responses.push({
            id: call.id,
            name: call.name,
            response: {
              ok: true,
              summary,
              insights,
              recommendations,
              timestamp: new Date().toISOString()
            },
          });
          continue;
        } else if (call.name === 'get_expert_insight') {
          // Resolved server-side; skip silently on client
          console.log(`[App] Tool ${call.name} handled server-side, skipping client handler`);
          continue;
        } else {
          throw new Error(`Unsupported tool: ${call.name}`);
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: { ok: true },
        });
      } catch (error) {
        console.error(`[App] Tool error (${call.name}):`, error);
        responses.push({
          id: call.id,
          name: call.name,
          response: { ok: false, error: error.message },
        });
      }
    }

    // Only send toolResponse back to server for Gemini-originated tool calls.
    // Synthetic commands (server_cmd_, text_cmd_, client_cmd_) don't need a response.
    const geminiResponses = responses.filter(r => {
      const id = String(r.id);
      return !id.startsWith('server_cmd_') && !id.startsWith('text_cmd_') && !id.startsWith('client_cmd_') && !id.startsWith('sentiment_') && !id.startsWith('gemini_visual_');
    });
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && geminiResponses.length > 0) {
      socket.send(
        JSON.stringify({
          toolResponse: {
            functionResponses: geminiResponses,
          },
        })
      );
    }
    setToolCallsCount((prev) => prev + functionCalls.length);
    setLastEvent(`tool_call:${functionCalls.length}`);
  }, [announce, buildWhyNowPayload, captureReplayStep, cognitiveMetrics, lang, pushWhyNowLine, unlockAchievement]);

  // Handle text command submission - agent-controlled only (no local circle mutation)
  const handleTextCommand = useCallback((text) => {
    if (!text?.trim()) return;
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      startTurnLatency();
      socket.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        },
      }));
      setLastEvent('user_cmd_sent');
    }
  }, [startTurnLatency]);

  const sendHybridControl = useCallback((action, extra = {}) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({
      hybridControl: {
        action,
        ...extra,
      },
    }));
    return true;
  }, []);

  const clearAutoDemoTimer = useCallback(() => {
    if (autoDemoTimerRef.current) {
      window.clearTimeout(autoDemoTimerRef.current);
      autoDemoTimerRef.current = null;
    }
  }, []);

  const sleepForAutoDemo = useCallback((ms, runId) => (
    new Promise((resolve) => {
      if (autoDemoRunIdRef.current !== runId) {
        resolve(false);
        return;
      }
      clearAutoDemoTimer();
      autoDemoTimerRef.current = window.setTimeout(() => {
        autoDemoTimerRef.current = null;
        resolve(autoDemoRunIdRef.current === runId);
      }, ms);
    })
  ), [clearAutoDemoTimer]);

  const appendSyntheticUserTranscript = useCallback((text) => {
    const cleaned = (typeof text === 'string' ? text : '').replace(/[*_`#]/g, '').trim();
    if (!cleaned) return;
    const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    setTranscript((prev) => {
      const next = [...prev, {
        role: 'user',
        text: cleaned,
        time: timeStr,
        finished: true,
        cogColor: dominantNodeRef.current === 2 ? '#2ECC71' : dominantNodeRef.current === 3 ? '#9B59B6' : '#38B2D8',
      }];
      return next.slice(-6);
    });
  }, [lang]);

  const sendSyntheticUserTextTurn = useCallback((line) => {
    const payload = typeof line === 'string' ? { spoken: line } : (line ?? {});
    const text = (
      typeof payload.spoken === 'string'
        ? payload.spoken
        : typeof payload.prompt === 'string'
          ? payload.prompt
          : ''
    ).replace(/[*_`#]/g, '').trim();
    if (!text) return false;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    startTurnLatency();
    socket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
    setLastEvent('auto_demo_text_sent');
    return true;
  }, [startTurnLatency]);

  const stopSyntheticUserSpeech = useCallback(() => {
    const currentAudio = demoAudioRef.current;
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {
        // Ignore media cleanup errors.
      }
      if (currentAudio.dataset?.url) {
        URL.revokeObjectURL(currentAudio.dataset.url);
      }
      demoAudioRef.current = null;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancellation race errors.
    }
    autoDemoSpeechUtteranceRef.current = null;
  }, []);

  const speakSyntheticUserLine = useCallback((line, runId) => (
    new Promise(async (resolve) => {
      if (autoDemoRunIdRef.current !== runId) {
        resolve({ ok: false, delivered: false });
        return;
      }

      const payload = typeof line === 'string' ? { spoken: line } : (line ?? {});
      const cleaned = (typeof payload.spoken === 'string' ? payload.spoken : '').replace(/[*_`#]/g, '').trim();
      if (!cleaned) {
        resolve({ ok: true, delivered: false });
        return;
      }

      stopSyntheticUserSpeech();
      appendSyntheticUserTranscript(cleaned);

      const staticAudioPath = typeof payload.audioPath === 'string' ? payload.audioPath.trim() : '';
      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      const tts = payload.tts && typeof payload.tts === 'object' ? payload.tts : {};
      const langCode = isArabic ? 'ar' : 'en';
      const playbackRate = Number(payload.playbackRate);
      const deliverSyntheticTurn = () => (
        autoDemoRunIdRef.current === runId
          ? sendSyntheticUserTextTurn(payload)
          : false
      );

      const playSyntheticAudio = async (src, { revokeOnFinish = false } = {}) => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 1;
        audio.playbackRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1.02;
        demoAudioRef.current = audio;

        const cleanup = () => {
          if (demoAudioRef.current === audio) {
            demoAudioRef.current = null;
          }
          if (revokeOnFinish) {
            URL.revokeObjectURL(src);
          }
        };

        await new Promise((playResolve, playReject) => {
          audio.onended = () => {
            cleanup();
            playResolve();
          };
          audio.onerror = () => {
            cleanup();
            playReject(new Error('Synthetic demo audio failed to play.'));
          };
          audio.play().catch((error) => {
            cleanup();
            playReject(error);
          });
        });

        const delivered = deliverSyntheticTurn();
        return { ok: autoDemoRunIdRef.current === runId, delivered };
      };

      if (staticAudioPath) {
        try {
          const result = await playSyntheticAudio(staticAudioPath);
          resolve(result);
          return;
        } catch (error) {
          console.warn('Static synthetic demo audio failed:', error);
        }
      }

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleaned,
            lang: langCode,
            speaker: payload.speaker ?? 'synthetic_user_male',
            rate: tts.rate,
            pitch: tts.pitch,
            volume: tts.volume,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const result = await playSyntheticAudio(audioUrl, { revokeOnFinish: true });
        resolve(result);
      } catch (error) {
        console.error('Synthetic user TTS failed:', error);
        const delivered = deliverSyntheticTurn();
        resolve({ ok: autoDemoRunIdRef.current === runId, delivered });
      }
    })
  ), [appendSyntheticUserTranscript, sendSyntheticUserTextTurn, stopSyntheticUserSpeech]);

  const waitForAutoDemoReady = useCallback(async (runId, timeoutMs = 25000) => {
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeoutMs) {
      if (autoDemoRunIdRef.current !== runId) return false;
      if (
        isConnectedRef.current
        && setupCompleteRef.current
        && appViewRef.current === 'live'
      ) {
        return true;
      }
      const keepGoing = await sleepForAutoDemo(180, runId);
      if (!keepGoing) return false;
    }
    return false;
  }, [sleepForAutoDemo]);

  const waitForAgentToSettle = useCallback(async (runId, options = {}) => {
    const {
      timeoutMs = 15000,
      initialAgentEntries = transcriptRef.current.filter(
        (entry) => entry.role === 'agent' && String(entry.text ?? '').trim().length > 0
      ).length,
      requireNewAgentEntry = false,
    } = typeof options === 'number' ? { timeoutMs: options } : options;
    const startedAt = Date.now();
    let quietMs = 0;
    let sawNewAgentText = false;
    while ((Date.now() - startedAt) < timeoutMs) {
      if (autoDemoRunIdRef.current !== runId) return false;
      const committedAgentEntries = transcriptRef.current.filter(
        (entry) => entry.role === 'agent' && String(entry.text ?? '').trim().length > 0
      ).length;
      const hasPendingAgentText = Boolean(String(bufferedTurnTextRef.current ?? '').trim());
      const agentContentAgeMs = lastAgentContentAtRef.current
        ? Date.now() - lastAgentContentAtRef.current
        : Number.POSITIVE_INFINITY;
      const hasFreshAgentText = hasPendingAgentText && agentContentAgeMs < 1200;
      const hasNewAgentEntry = committedAgentEntries > initialAgentEntries;
      if (hasNewAgentEntry || hasPendingAgentText) {
        sawNewAgentText = true;
      }
      if (isAgentSpeakingRef.current || hasFreshAgentText) {
        quietMs = 0;
      } else {
        quietMs += 180;
        if (quietMs >= 540 && (!requireNewAgentEntry || sawNewAgentText)) {
          return true;
        }
      }
      const keepGoing = await sleepForAutoDemo(180, runId);
      if (!keepGoing) return false;
    }
    return false;
  }, [sleepForAutoDemo]);

  const waitForManualUserTurn = useCallback(async (runId, timeoutMs = 9000) => {
    const startedAt = Date.now();
    const initialUserEntries = transcriptRef.current.filter((entry) => entry.role === 'user').length;

    while ((Date.now() - startedAt) < timeoutMs) {
      if (autoDemoRunIdRef.current !== runId) return false;
      const userEntries = transcriptRef.current.filter((entry) => entry.role === 'user').length;
      if (userEntries > initialUserEntries || userSpeechActiveRef.current) {
        return true;
      }
      const keepGoing = await sleepForAutoDemo(180, runId);
      if (!keepGoing) return false;
    }
    return false;
  }, [sleepForAutoDemo]);

  const pauseMicForSyntheticDemo = useCallback(async () => {
    if (!isMicActiveRef.current) return;
    autoDemoShouldRestoreMicRef.current = true;
    try {
      await stopMicrophone();
    } catch {
      // Ignore mic pause errors during demo mode.
    }
  }, [stopMicrophone]);

  const restoreMicAfterSyntheticDemo = useCallback(() => {
    if (!autoDemoShouldRestoreMicRef.current) return;
    autoDemoShouldRestoreMicRef.current = false;
    if (!isConnectedRef.current || !setupCompleteRef.current || isMicActiveRef.current) return;

    startMicrophone().catch(() => {
      // Ignore restore mic failures in auto demo mode.
    });
  }, [startMicrophone]);

  const stopAutoDemo = useCallback((reason = 'auto_demo_stopped', statusText = null, options = {}) => {
    const { restoreMic = true } = options;
    const hadActiveDemo = isAutoDemoRunning || autoDemoPendingStartRef.current;
    autoDemoRunIdRef.current += 1;
    clearAutoDemoTimer();
    autoDemoPendingStartRef.current = false;
    stopSyntheticUserSpeech();
    setIsAutoDemoRunning(false);
    if (statusText !== null) {
      setAutoDemoStatus(statusText);
    }
    if (restoreMic) {
      restoreMicAfterSyntheticDemo();
    } else {
      autoDemoShouldRestoreMicRef.current = false;
    }
    if (hadActiveDemo) {
      setLastEvent(reason);
    }
  }, [clearAutoDemoTimer, isAutoDemoRunning, restoreMicAfterSyntheticDemo, stopSyntheticUserSpeech]);

  const handleBioStateChange = useCallback((level) => {
    if (isAutoDemoRunningRef.current || autoDemoPendingStartRef.current) return;
    if (appView !== 'live' || !isConnected) return;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    const unchanged = level === lastBioLevelRef.current;
    if (unchanged && (now - lastBioSignalAtRef.current) < 12000) return;
    if (!unchanged && (now - lastBioSignalAtRef.current) < 7000) return;

    lastBioLevelRef.current = level;
    lastBioSignalAtRef.current = now;

    // FEATURE ④: Cognitive Resonance/Dissonance Persona Shift
    let hintText = '';
    if (level === 'stressed') {
      hintText = lang === 'ar'
        ? '(إشارة حسية مخفية: عقل المستخدم في حالة جمود وتوتر (Dissonance). تخلّف مؤقتاً عن النبرة الهادئة المتعاطفة، كن أسرع، أكثر حزماً، اطرح سؤالاً يتحدى منطقه لكسر الجمود. استشعر توتره واعكسه.)'
        : '(Hidden Bio signal: User is rigid/stressed (Dissonance). Temporarily drop empathetic tone, speak faster, be firmer. Ask a challenging question to break their mental loop.)';
    } else {
      hintText = lang === 'ar'
        ? '(إشارة حسية مخفية: عقل المستخدم في حالة تقبل وتدفق (Resonance). استعد نبرتك الأدفأ، والأكثر حكمة وهدوءاً. اربط أفكاره ببعضها وساعده على التوسع بصدق والوصول للاستبصار.)'
        : '(Hidden Bio signal: User is flowing/receptive (Resonance). Return to your warmest, wisest, and calmest voice. Synthesize their thoughts and guide gently towards insight.)';
    }

    socket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: hintText }] }],
        turnComplete: false,
      },
    }));
    setLastEvent(`persona_shift:${level}`);
  }, [appView, isConnected, lang]);

  // Quick circle action (from UI buttons)
  const handleLookAtMe = useCallback(async () => {
    console.log("[App] Look at me requested");
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      // 1. Start Camera temporarily
      await startCamera();
      // Wait for camera to warm up
      await new Promise(r => setTimeout(r, 1000));

      // 2. Capture Snapshot
      // Note: captureSnapshot calls stopCamera() internally
      const base64Data = captureSnapshot();
      if (!base64Data) {
        console.error("Failed to capture snapshot");
        stopCamera();
        return;
      }

      // 3. Send to Gemini
      console.log("[App] Sending Look at me snapshot...");
      unlockAchievement('visionUsed');
      startTurnLatency();
      wsRef.current.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "image/jpeg",
            data: base64Data
          }]
        }
      }));

      // 4. Prompt the model to react
      wsRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: "user",
            parts: [{
              text: lang === "ar"
                ? "شوفني كده. اقرأ حالتي النفسية من الصورة وغيّر بهدوء في صمت. لو هتستخدم update_node استخدم id وradius وcolor بس."
                : "Look at me. Read my emotional state from the photo and update the circles silently. If you use update_node, use only id, radius, and color."
            }]
          }],
          turnComplete: true
        }
      }));

    } catch (e) {
      console.error("Look at me failed:", e);
      stopCamera();
    }
  }, [captureSnapshot, lang, startCamera, startTurnLatency, stopCamera]);

  const handleEnterSetup = useCallback(() => {
    if (isTransitioningToSetup) return;
    setIsTransitioningToSetup(true);
    window.setTimeout(() => {
      goToView('setup');
      setIsSetupIntro(true);
      setIsTransitioningToSetup(false);
      window.setTimeout(() => setIsSetupIntro(false), 520);
    }, 280);
  }, [goToView, isTransitioningToSetup]);

  const handleSandMandala = useCallback(() => {
    setIsSandMandalaActive(true);
    // Erase session data:
    setTranscript([]);
    setCognitiveMetrics({ equilibriumScore: 0.6, overloadIndex: 0.0, clarityDelta: 0.0 });
    setCapturedImage(null);
    setJourneyPath([1]);
    journeyPathRef.current = [1];
    setTransitionCount(0);
    setSessionStartTime(null);

    // Play release animation, then go to welcome
    window.setTimeout(() => {
      setIsSandMandalaActive(false);
      goToView('welcome');
      setHasSessionStarted(false);
    }, 3800);
  }, [goToView]);

  const disconnect = useCallback(async () => {
    stopAutoDemo('auto_demo_stopped_disconnect', '', { restoreMic: false });
    manualCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (micStartTimeoutRef.current) {
      window.clearTimeout(micStartTimeoutRef.current);
      micStartTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    const socket = wsRef.current;
    wsRef.current = null;

    setupCompleteRef.current = false;
    bootstrapPromptSentRef.current = false;
    restoreAfterGeminiReconnectRef.current = false;
    deferMicStartUntilFirstAgentReplyRef.current = false;
    lastModelAudioAtRef.current = Date.now();
    resetAgentTurnState();
    setIsStarting(false);
    setIsConnected(false);
    setConnectStage(0);

    await stopMicrophone();
    stopPlayback();
    await closeSpeakerContext();

    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      } catch {
        // Ignore send errors while closing.
      }
      socket.close();
    }

    // Save circle progress for cross-session tracking
    const finalNodes = canvasRef.current?.getNodes?.() || [];
    const timeline = canvasRef.current?.getTimeline?.() || [];
    if (finalNodes.length > 0) saveSessionProgress(finalNodes);

    setStatus('Disconnected');
    setLastEvent('manual_disconnect');
  }, [closeSpeakerContext, resetAgentTurnState, stopAutoDemo, stopMicrophone, stopPlayback]);

  const connect = useCallback(async () => {
    if (connectLockRef.current) {
      console.warn('[Connect] Ignored: connect already in-flight');
      return;
    }
    connectLockRef.current = true;
    console.log('[Connect] Attempting to start session...', { isStarting, isConnected, appView, hasCapturedImage: !!capturedImage });
    if (isStarting) {
      console.warn('[Connect] Ignored: already starting');
      connectLockRef.current = false;
      return;
    }
    if (isConnected) {
      const currentSocket = wsRef.current;
      const hasLiveSocket = !!currentSocket && (
        currentSocket.readyState === WebSocket.OPEN
        || currentSocket.readyState === WebSocket.CONNECTING
      );
      if (hasLiveSocket) {
        console.warn('[Connect] Ignored: already connected with live socket');
        connectLockRef.current = false;
        return;
      }
      // Recover from stale UI state if socket is gone/closed but flag is still true.
      console.warn('[Connect] Recovering stale isConnected state');
      setIsConnected(false);
    }
    const existingSocket = wsRef.current;
    if (
      existingSocket
      && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      console.warn('[Connect] Ignored: socket already open/connecting');
      connectLockRef.current = false;
      return;
    }
    manualCloseRef.current = false;
    const isSessionReconnect = appView === 'live' && hasSessionStarted;

    setErrorMessage('');
    setIsStarting(true);
    if (!isSessionReconnect) {
      setHasSessionStarted(false);
    }
    setStatus('Connecting...');
    setConnectStage(0);
    setLastEvent('connecting');

    try {
      await ensureSpeakerContext();
    } catch (error) {
      console.error('[Connect] ensureSpeakerContext failed', error);
      setStatus('Error');
      setErrorMessage(error.message);
      setIsStarting(false);
      setLastEvent('speaker_context_error');
      connectLockRef.current = false;
      return;
    }

    const token = import.meta.env.VITE_DAWAYIR_AUTH_TOKEN || '';
    const wsUrl = new URL(backendUrl);
    if (token) {
      wsUrl.searchParams.set('token', token);
    }
    const shouldPreferHybridSocket = (
      autoDemoPendingStartRef.current
      || isAutoDemoRunningRef.current
      || oneClickDemoPendingRef.current
    );
    if (shouldPreferHybridSocket) {
      wsUrl.searchParams.set('mode', 'hybrid');
      wsUrl.searchParams.set('demoToken', 'dawayir-demo-2026');
      console.log('[DEBUG] shouldPreferHybridSocket is TRUE due to:', {
        autoDemoPendingStart: autoDemoPendingStartRef.current,
        isAutoDemoRunning: isAutoDemoRunningRef.current,
        oneClickDemoPending: oneClickDemoPendingRef.current
      });
    }
    const wsUrlString = wsUrl.toString();
    console.log('[Connect] Opening WebSocket with mode hybrid?', shouldPreferHybridSocket);
    const socket = new WebSocket(wsUrlString);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;
    // We only lock the critical pre-socket window. After socket creation,
    // duplicate attempts are blocked by wsRef/current readyState guards.
    connectLockRef.current = false;

    socket.onopen = () => {
      if (wsRef.current !== socket) return;
      console.log('[Connect] WebSocket opened');
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);
      setIsConnected(true);
      setConnectStage(1);
      setIsStarting(false);
      setStatus('Connected (waiting setupComplete)');
      setLastEvent('ws_open');
      if (!isSessionReconnect) {
        // ── Feature ⑬⑭⑮: Reset session tracking on brand-new sessions only ──
        setSessionStartTime(Date.now());
        resetSessionReplay();
        setTransitionCount(0);
        journeyPathRef.current = [1];
        setJourneyPath([1]);
        dominantNodeRef.current = 1;
        prevInsightRadiusRef.current = null;
      }

    };

    socket.onmessage = async (event) => {
      if (wsRef.current !== socket) return;
      let message = null;

      if (typeof event.data === 'string') {
        message = tryParseJson(event.data);
      }

      if (message?.cognitiveMetrics) {
        setCognitiveMetrics(message.cognitiveMetrics);
      }

      if (event.data instanceof ArrayBuffer) {
        const decoded = new TextDecoder('utf-8').decode(event.data);
        message = tryParseJson(decoded);
        if (!message) {
          await playPcmChunk(event.data);
          return;
        }
      }

      if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer();
        const decoded = new TextDecoder('utf-8').decode(arrayBuffer);
        message = tryParseJson(decoded);
        if (!message) {
          await playPcmChunk(arrayBuffer);
          return;
        }
      }

      if (!message) return;

      // Debug: log transcription data forwarded from server
      if (message.debugTranscription) {
        const dt = message.debugTranscription;
        if (dt.metrics) {
          setCognitiveMetrics(dt.metrics);
        }
        if (WS_LOG_VERBOSE || dt.finished) {
          console.log(`%c[Transcription:${dt.type}] "${dt.text}" (finished=${dt.finished})`, 'color: #00ff00; font-weight: bold');
        }

        if (dt.type === 'input') {
          const now = Date.now();
          lastSpeechAtRef.current = now;

          // Start of user speaking
          if (!dt.finished && !userSpeechActiveRef.current) {
            // Barge-in: if user starts speaking while agent audio is active,
            // stop local playback so user voice can take priority.
            if (isAgentSpeakingRef.current) {
              stopPlayback();
              setLastEvent('barge_in_interrupt');
              unlockAchievement('bargeIn');
            }
            userSpeechActiveRef.current = true;
            setIsUserSpeaking(true);
            bufferedUserTextRef.current = ''; // Reset on new speech
            preCue(dt.text);
            unlockAchievement('firstWord');
          }

          bufferedUserTextRef.current = `${bufferedUserTextRef.current} ${dt.text}`.trim();

          if (speechResetTimerRef.current) clearTimeout(speechResetTimerRef.current);
          speechResetTimerRef.current = setTimeout(() => {
            if (Date.now() - lastSpeechAtRef.current > 850) resetUserSpeaking();
          }, 900);

          const shouldUpdateUserTranscript = Boolean(dt.finished) || (now - transcriptThrottleRef.current.user) > 120;
          if (shouldUpdateUserTranscript) {
            transcriptThrottleRef.current.user = now;
            setTranscript((prev) => {
              const next = [...prev];
              let found = false;
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === 'user' && !next[i].finished) {
                  next[i] = { ...next[i], text: bufferedUserTextRef.current, finished: !!dt.finished };
                  found = true;
                  break;
                }
              }
              if (!found) {
                const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                // ── Feature ③: Stamp cognitive color at time of speech ──
                next.push({ role: 'user', text: bufferedUserTextRef.current, time: timeStr, finished: !!dt.finished, cogColor: dominantNodeRef.current === 2 ? '#2ECC71' : dominantNodeRef.current === 3 ? '#9B59B6' : '#38B2D8' });
              }
              if (next.length >= 5) unlockAchievement('deepConvo');
              return next.slice(-6);
            });
          }

        if (dt.finished) {
          resetUserSpeaking();
        }
      } else if (dt.type === 'output') {
          const speaker = getOutputSpeaker(dt.speaker ?? message?.speaker);
          const role = speaker === 'user_agent' ? 'user_agent' : 'agent';
          const outputBufferRef = speaker === 'user_agent'
            ? bufferedUserAgentTurnTextRef
            : bufferedTurnTextRef;
          const outputLastAtRef = speaker === 'user_agent'
            ? lastUserAgentContentAtRef
            : lastAgentContentAtRef;
          const throttleKey = role === 'user_agent' ? 'user_agent' : 'agent';

          if (speaker === 'dawayir') {
            resolveTurnLatency();
          }

          // Keep output transcript visible, but throttled to avoid UI jank.
          setIsAgentSpeaking(true);
          isAgentSpeakingRef.current = true;
          // ── DIVINE VOICE ORB + AMBIENT DRONE ─────────────────────────
          // Notify canvas that agent is now speaking so the Orb activates.
          // Also start the ambient singing-bowl drone if not already running.
          if (speaker === 'dawayir') {
            canvasRef.current?.setAgentSpeaking?.(true);
            try { ambientDroneRef.current?.start?.(); } catch { /* ignore */ }
          }

          const isNewTurn = outputBufferRef.current.trim() === '';
          outputBufferRef.current = `${outputBufferRef.current} ${dt.text}`.trim();
          if (isNewTurn && speaker === 'dawayir') unlockAchievement('firstReply');

          const now = Date.now();
          outputLastAtRef.current = now;
          const shouldUpdateAgentTranscript = Boolean(dt.finished) || (now - (transcriptThrottleRef.current[throttleKey] ?? 0)) > 90;
          if (shouldUpdateAgentTranscript) {
            transcriptThrottleRef.current[throttleKey] = now;
            upsertTranscriptBubble(role, outputBufferRef.current, !!dt.finished, {
              cogColor: dominantNodeRef.current === 2 ? '#2ECC71' : dominantNodeRef.current === 3 ? '#9B59B6' : '#38B2D8',
            });
          }
          if (dt.finished) {
            outputBufferRef.current = '';
          }
        }
        return;
      }

      const serverStatus = message?.serverStatus ?? message?.server_status;
      if (serverStatus?.state === 'gemini_reconnecting') {
        if (bootstrapPromptSentRef.current) {
          restoreAfterGeminiReconnectRef.current = true;
        }
        lastModelAudioAtRef.current = Date.now();
        // DON'T stop playback or reset state -- let buffered audio finish naturally.
        // Cutting audio mid-speech causes jarring stuttering.
        const attempt = Number(serverStatus.attempt || 0);
        const maxAttempts = Number(serverStatus.maxAttempts || MAX_RECONNECT_ATTEMPTS);
        const delaySeconds = Math.max(1, Math.ceil(Number(serverStatus.delayMs || RECONNECT_DELAY_MS) / 1000));
        setStatus(`Gemini reconnecting (${attempt}/${maxAttempts}) in ${delaySeconds}s...`);
        setLastEvent('gemini_reconnecting');
        return;
      }
      if (serverStatus?.state === 'gemini_recovered') {
        // Don't reset -- audio may still be playing from before reconnect
        setStatus('Gemini reconnected. Restoring session...');
        setLastEvent('gemini_recovered');
        return;
      }
      if (serverStatus?.state === 'gemini_unavailable') {
        const cooldownSeconds = Math.max(1, Math.ceil(Number(serverStatus.cooldownMs || RECONNECT_DELAY_MS) / 1000));
        setStatus(
          lang === 'ar'
            ? `Gemini غير متاح مؤقتًا. بنحاول تاني بعد ${cooldownSeconds} ثواني...`
            : `Gemini is temporarily unavailable. Retrying in ${cooldownSeconds}s...`
        );
        setErrorMessage(
          lang === 'ar'
            ? 'الجلسة ما انتهتش، لكن الخادم بيحاول يرجّع اتصال Gemini.'
            : 'The session has not ended, but the server is recovering the Gemini connection.'
        );
        setLastEvent('gemini_unavailable');
        if (isAutoDemoRunning || autoDemoPendingStartRef.current) {
          sendHybridControl('stop');
          stopAutoDemo(
            'auto_demo_gemini_unavailable',
            lang === 'ar'
              ? 'اتصال Gemini وقع مؤقتًا، فوقفنا الديمو لحد ما يرجع.'
              : 'Gemini dropped temporarily, so the demo was paused until it recovers.'
          );
        }
        return;
      }

      const hybridStatus = message?.hybridStatus ?? message?.hybrid_status;
      if (hybridStatus?.state) {
        const maxTurns = Math.max(1, Number(hybridStatus.maxTurns || (AUTO_DEMO_SCRIPT[lang] ?? AUTO_DEMO_SCRIPT.en).length || 1));
        const currentTurn = Math.max(1, Number(hybridStatus.turn || 1));
        if (hybridStatus.state === 'starting') {
          setAutoDemoStatus(
            lang === 'ar'
              ? 'جاري فتح وكيل المستخدم الحي...'
              : 'Opening the live user agent...'
          );
          setLastEvent('hybrid_starting');
          return;
        }
        if (hybridStatus.state === 'ready') {
          setAutoDemoStatus(
            lang === 'ar'
              ? 'وكيل المستخدم الحي جاهز.'
              : 'The live user agent is ready.'
          );
          setLastEvent('hybrid_ready');
          return;
        }
        if (hybridStatus.state === 'waiting_opening') {
          setAutoDemoStatus(autoDemoCopy.opening);
          setLastEvent('hybrid_waiting_opening');
          return;
        }
        if (hybridStatus.state === 'running') {
          const activeSpeaker = hybridStatus.speaker === 'user_agent'
            ? (lang === 'ar' ? 'وكيل المستخدم بيرد' : 'User agent responding')
            : (lang === 'ar' ? 'دواير بيرد' : 'Dawayir responding');
          setAutoDemoStatus(`${activeSpeaker} ${currentTurn}/${maxTurns}`);
          setLastEvent(`hybrid_running:${hybridStatus.speaker || 'dawayir'}`);
          return;
        }
        if (hybridStatus.state === 'repairing') {
          setAutoDemoStatus(
            typeof hybridStatus.message === 'string' && hybridStatus.message.trim()
              ? hybridStatus.message
              : (hybridStatus.speaker === 'user_agent'
                ? (lang === 'ar' ? 'وكيل المستخدم بيظبط رده...' : 'The user agent is refining the turn...')
                : (lang === 'ar' ? 'دواير بيظبط رده...' : 'Dawayir is refining the reply...'))
          );
          setLastEvent(`hybrid_repairing:${hybridStatus.speaker || 'dawayir'}`);
          return;
        }
        if (hybridStatus.state === 'recovering') {
          setAutoDemoStatus(
            typeof hybridStatus.message === 'string' && hybridStatus.message.trim()
              ? hybridStatus.message
              : (lang === 'ar'
                ? 'جلسة دواير بترجع دلوقتي...'
                : 'Dawayir is recovering now...')
          );
          setLastEvent('hybrid_recovering');
          return;
        }
        if (hybridStatus.state === 'completed') {
          stopAutoDemo('auto_demo_completed', autoDemoCopy.completed);
          return;
        }
        if (hybridStatus.state === 'stopped') {
          stopAutoDemo('auto_demo_server_stopped', autoDemoCopy.canceled);
          return;
        }
        if (hybridStatus.state === 'failed') {
          stopAutoDemo(
            'auto_demo_server_failed',
            typeof hybridStatus.message === 'string' && hybridStatus.message.trim()
              ? hybridStatus.message
              : autoDemoCopy.failed
          );
          return;
        }
      }

      const serverError = getServerErrorMessage(message);
      if (serverError) {
        setStatus('Error');
        setErrorMessage(serverError);
        setLastEvent('server_error');
        return;
      }

      if (isSetupCompleteMessage(message)) {
        setupCompleteRef.current = true;
        setHasSessionStarted(true);
        if (appView === 'setup') {
          goToView('live');
          setIsBreathingRoom(true);
        }
        setStatus('Connected to Gemini Live');
        setConnectStage(2);
        setLastEvent('setup_complete');
        lastModelAudioAtRef.current = Date.now();
        const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;
        // On first connect: reset everything. On Gemini reconnect: let audio finish.
        if (!isGeminiReconnect) {
          resetAgentTurnState();
          stopPlayback();
        }
        // Pre-initialize AudioWorklet so first audio plays without delay
        ensurePcmWorklet().catch(() => { });
        deferMicStartUntilFirstAgentReplyRef.current = !isMicActiveRef.current;
        if (micStartTimeoutRef.current) {
          window.clearTimeout(micStartTimeoutRef.current);
          micStartTimeoutRef.current = null;
        }

        try {
          if (wsRef.current?.readyState === WebSocket.OPEN && wsRef.current === socket) {
            const isReconnect = reconnectAttemptRef.current > 0;
            const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;

            if (!bootstrapPromptSentRef.current) {
              bootstrapPromptSentRef.current = true;
              console.log('[App] Sending bootstrap prompt...');

              const parts = [];

              // Include camera snapshot if available so agent can greet based on appearance
              if (capturedImage) {
                const base64Data = capturedImage.split(',')[1];
                if (base64Data) {
                  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
                  console.log('[App] Including camera snapshot in bootstrap prompt');
                }
              }

              // FEATURE ⑱: SAGE MEMORY RECALL & SACRED ONBOARDING
              const isRealSession = !autoDemoPendingStartRef.current && !oneClickDemoPendingRef.current;
              const isFirstEverSession = localStorage.getItem('dawayir_ftue_complete') !== 'true' && isRealSession;

              if (isFirstEverSession) {
                localStorage.setItem('dawayir_ftue_complete', 'true');
                setIsSacredOnboarding(true);
              } else if (isRealSession) {
                // If not first session, inject past memories!
                const pastTimelines = JSON.parse(localStorage.getItem('dawayir-saved-timelines') || '[]');
                if (pastTimelines.length > 0) {
                  const recent = pastTimelines.slice(-3); // Last 3 sessions
                  const summary = recent.map(r => `Session on ${new Date(r.timestamp).toLocaleDateString()}: Ended with Equilibrium ${r.metrics?.equilibriumScore?.toFixed(2) || 0}, Main Theme: ${r.nodes?.[0]?.label || 'General'}`).join(' | ');
                  parts.push({ text: `[System Memory Recall: User's recent past sessions: ${summary}. You may casually reference this continuity if relevant to show you remember them.]` });
                }
              }

              let bootstrapText = '';
              if (isFirstEverSession) {
                bootstrapText = lang === 'ar'
                  ? 'System Directive: This is the user\'s very first session (Sacred Onboarding). You must say EXACTLY one welcoming sentence, e.g., "أهلاً بيك. شايف الدواير؟ اتكلم عشان نبدأ رحلتنا." Then you MUST STOP. DO NOT generate the user\'s response. DO NOT simulate a conversation. STOP immediately after the greeting.'
                  : 'System Directive: This is the user\'s very first session. You must say EXACTLY one welcoming sentence: "Welcome. See the circles? Speak to begin our journey." Then you MUST STOP. DO NOT simulate the user\'s response. STOP immediately.';
              } else if (autoDemoPendingStartRef.current) {
                bootstrapText = lang === 'ar'
                  ? (capturedImage
                    ? 'دي صورتي دلوقتي كمرجع بصري. افتح الجلسة بترحيب مصري حقيقي من 6 إلى 10 كلمات فيه طمأنة خفيفة وإحساس إنك معايا، من غير سؤال أو علامة استفهام.'
                    : 'ابدأ الجلسة بترحيب مصري حقيقي من 6 إلى 10 كلمات فيه طمأنة خفيفة وإحساس إنك معايا، من غير سؤال أو علامة استفهام.')
                  : (capturedImage
                    ? 'This is my photo as visual context. Open the session with a real warm welcome of about 6 to 10 words, calm and human, with no question mark.'
                    : 'Open the session with a real warm welcome of about 6 to 10 words, calm and human, with no question mark.');
              } else {
                bootstrapText = lang === 'ar'
                  ? (capturedImage
                    ? 'System Directive: User just joined. This is my photo. Read my emotional state from the image and call update_node to change radius and color for each circle. Use only id, radius, and color. Say a brief, 4-word welcome and STOP. DO NOT simulate the user.'
                    : 'System Directive: User just joined. Start with a warm, 4-word welcome and STOP. DO NOT simulate the user.')
                  : (capturedImage
                    ? 'System Directive: User just joined. This is my photo. Read my emotional state from the image and call update_node to change radius and color. Say a brief, 4-word welcome and STOP. DO NOT simulate the user.'
                    : 'System Directive: User just joined. Start with a warm, 4-word welcome and STOP. DO NOT simulate the user.');
              }
              
              parts.push({ text: bootstrapText });

              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts }], turnComplete: true }
              }));
            } else if (isReconnect || isGeminiReconnect) {
              unlockAchievement('reconnected');
              const now = Date.now();
              if (now - lastRestorePromptAtRef.current < 6000) {
                restoreAfterGeminiReconnectRef.current = false;
                return;
              }
              lastRestorePromptAtRef.current = now;
              // Send a minimal, invisible context restore -- no "reconnection" language.
              // The model should just continue naturally without acknowledging the gap.
              const isHybridReconnect = isAutoDemoRunningRef.current || autoDemoPendingStartRef.current;
              const lastHybridUserEntry = [...transcriptRef.current]
                .reverse()
                .find((entry) => entry?.role === 'user_agent' || entry?.role === 'user');
              const lastConv = sessionContextRef.current.length > 0
                ? sessionContextRef.current.slice(-3).join(' ... ')
                : '';
              const promptText = isHybridReconnect
                ? (() => {
                  const lastUserLine = String(lastHybridUserEntry?.text ?? '').trim();
                  if (lastUserLine) {
                    return lang === 'ar'
                      ? `(كمّل الحوار من غير ما تذكر انقطاع. آخر كلام من المستخدم كان: "${lastUserLine}". رد بجملة مصرية واحدة تكمل الخيط.)`
                      : `(Continue naturally with no mention of interruption. The user's last line was: "${lastUserLine}". Reply with one short line that continues the thread.)`;
                  }
                  return lang === 'ar'
                    ? '(كمّل الحوار الطبيعي مع المستخدم من غير ما تذكر انقطاع.)'
                    : '(Continue the natural conversation with the user without mentioning any interruption.)';
                })()
                : (lastConv
                  ? `(كمّل من هنا بالظبط: "${lastConv}")`
                  : '(كمّل الحوار.)');
              if (isHybridReconnect) {
                setAutoDemoStatus(
                  lang === 'ar'
                    ? 'رجع الاتصال وبنكمل من نفس الخيط...'
                    : 'The connection is back and the demo is resuming...'
                );
                restoreAfterGeminiReconnectRef.current = false;
                return;
              }
              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true }
              }));
              restoreAfterGeminiReconnectRef.current = false;
            }
          }

          micStartTimeoutRef.current = window.setTimeout(async () => {
            if (wsRef.current !== socket || wsRef.current?.readyState !== WebSocket.OPEN) {
              micStartTimeoutRef.current = null;
              return;
            }
            if (
              !setupCompleteRef.current
              || isMicActiveRef.current
              || !deferMicStartUntilFirstAgentReplyRef.current
              || isAutoDemoRunningRef.current
              || autoDemoPendingStartRef.current
            ) {
              micStartTimeoutRef.current = null;
              return;
            }
            deferMicStartUntilFirstAgentReplyRef.current = false;
            try {
              await startMicrophone();
              setConnectStage(3);
              setLastEvent('mic_autostart_timeout');
            } catch (error) {
              console.error('[Mic] Failed to start microphone:', error);
              setStatus('Error');
              setErrorMessage(error.message);
              setLastEvent('mic_start_error');
            } finally {
              micStartTimeoutRef.current = null;
            }
          }, MIC_DEFER_TIMEOUT_MS);
        } catch (error) {
          setStatus('Error');
          setErrorMessage(error.message);
          setLastEvent('mic_start_error');
        }
        return;
      }

      const toolCall = getToolCall(message);
      if (toolCall) {
        handleToolCall(toolCall);
      }

      if (isInterruptedMessage(message)) {
        resetAgentTurnState();
        stopPlayback();
        setLastEvent('server_interrupted');
      }

      const speaker = getOutputSpeaker(message?.speaker);
      const outputRole = speaker === 'user_agent' ? 'user_agent' : 'agent';
      const outputBufferRef = speaker === 'user_agent'
        ? bufferedUserAgentTurnTextRef
        : bufferedTurnTextRef;
      const outputLastAtRef = speaker === 'user_agent'
        ? lastUserAgentContentAtRef
        : lastAgentContentAtRef;
      const serverContent = getServerContent(message);
      const liveOutputTranscription = serverContent?.outputTranscription ?? serverContent?.output_transcription;
      const hasLiveOutputTranscription = Boolean(liveOutputTranscription?.text);
      const shouldSkipLocalTranscriptFallback = (
        (speaker === 'dawayir' || speaker === 'user_agent')
        && (isAutoDemoRunningRef.current || autoDemoPendingStartRef.current)
        && !hasLiveOutputTranscription
      );
      const outputTurnComplete = Boolean(
        serverContent?.turnComplete
        || serverContent?.turn_complete
        || serverContent?.generationComplete
        || serverContent?.generation_complete
      );
      if (!shouldSkipLocalTranscriptFallback && outputTurnComplete && outputBufferRef.current.trim().length > 0) {
        upsertTranscriptBubble(outputRole, outputBufferRef.current, true);
        outputBufferRef.current = '';
      }
      const parts = getParts(message);
      if (parts.length > 0) {
        const now = Date.now();
        if (now - outputLastAtRef.current > 1800) {
          outputBufferRef.current = '';
        }
        outputLastAtRef.current = now;
      }
      // Mic start is handled by the MIC_DEFER_TIMEOUT_MS timeout set in setupComplete.
      // Do NOT start mic here during first response -- getUserMedia blocks the main thread
      // for 100-500ms which causes audio stuttering on the first few words.

      const audioParts = Array.isArray(parts)
        ? parts.filter((part) =>
          isAudioMimeType(getInlineData(part)?.mimeType)
          || isAudioMimeType(getInlineData(part)?.mime_type)
        )
        : [];

      const directAudioBlobs = audioParts
        .map((part) => {
          const inline = getInlineData(part);
          if (!inline?.data) return null;
          return {
            data: inline.data,
            mimeType: inline?.mimeType ?? inline?.mime_type ?? `audio/pcm;rate=${OUTPUT_SAMPLE_RATE}`,
          };
        })
        .filter(Boolean);

      // Capture text for context preservation and live transcript
      const textParts = Array.isArray(parts) ? parts.filter(p => p.text).map(p => p.text) : [];

      // Start ambient drone when agent is actively producing content (audio or text)
      if (directAudioBlobs.length > 0 || textParts.length > 0) {
        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;
        canvasRef.current?.setAgentSpeaking?.(true);
        ambientDroneRef.current?.start();
      }

      if (textParts.length > 0) {
        const contextualText = textParts.join(' ');
        sessionContextRef.current = [
          ...sessionContextRef.current,
          speaker === 'user_agent'
            ? `${lang === 'ar' ? 'وكيل المستخدم' : 'User agent'}: ${contextualText}`
            : contextualText,
        ].slice(-6);

        if (!hasLiveOutputTranscription && !shouldSkipLocalTranscriptFallback) {
          const appendedText = textParts.join(' ');
          outputBufferRef.current = `${outputBufferRef.current} ${appendedText}`.trim();
          upsertTranscriptBubble(outputRole, outputBufferRef.current, false);
        }

        if (speaker === 'dawayir' && currentTurnModeRef.current === 'none' && ttsFallbackEnabledRef.current) {
          if (ttsDecisionTimeoutRef.current) {
            window.clearTimeout(ttsDecisionTimeoutRef.current);
          }
          ttsDecisionTimeoutRef.current = window.setTimeout(() => {
            if (currentTurnModeRef.current === 'none' && bufferedTurnTextRef.current.trim().length > 0) {
              currentTurnModeRef.current = 'tts';
              speakTextFallback(bufferedTurnTextRef.current.trim());
            }
            ttsDecisionTimeoutRef.current = null;
          }, 900);
        } else if (speaker === 'dawayir' && currentTurnModeRef.current === 'none' && !ttsFallbackEnabledRef.current) {
          // TTS disabled and no audio yet -- release mic after a short wait
          // so conversation doesn't get stuck on text-only responses.
          if (ttsDecisionTimeoutRef.current) {
            window.clearTimeout(ttsDecisionTimeoutRef.current);
          }
          ttsDecisionTimeoutRef.current = window.setTimeout(() => {
            if (currentTurnModeRef.current === 'none' && isAgentSpeakingRef.current) {
              setIsAgentSpeaking(false);
              isAgentSpeakingRef.current = false;
            }
            ttsDecisionTimeoutRef.current = null;
          }, 1200);
        }
      }

      const turnAudioBlobs = getTurnDataAudioBlobs(message);
      const selectedAudioBlobs = directAudioBlobs.length > 0 ? directAudioBlobs : turnAudioBlobs;
      if (selectedAudioBlobs.length > 0) {
        if (speaker === 'dawayir') {
          resolveTurnLatency();
        }
        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;
        canvasRef.current?.setAgentSpeaking?.(true);
        // If TTS already started for this turn, ignore late model audio to avoid overlap.
        if (currentTurnModeRef.current !== 'tts') {
          currentTurnModeRef.current = 'model';
          clearPendingTts();
          for (const blob of selectedAudioBlobs) {
            if (blob?.data) {
              await playPcmChunk(base64ToArrayBuffer(blob.data), parsePcmSampleRate(blob.mimeType));
              setLastEvent(speaker === 'user_agent' ? 'audio_chunk_user_agent' : 'audio_chunk');
            }
          }
        }
        return;
      }
    };

    socket.onerror = () => {
      if (wsRef.current !== socket) return;
      console.error('[Connect] WebSocket error');
      triggerHaptic([100, 50, 100]);
      setStatus('Error');
      setErrorMessage(formatAppError('websocketRetrying'));
      setIsStarting(false);
      setLastEvent('ws_error');
    };

    socket.onclose = async (event) => {
      if (wsRef.current !== socket) return;
      console.warn('[Connect] WebSocket closed', { code: event?.code, reason: event?.reason });
      if (micStartTimeoutRef.current) {
        window.clearTimeout(micStartTimeoutRef.current);
        micStartTimeoutRef.current = null;
      }
      deferMicStartUntilFirstAgentReplyRef.current = false;
      resetAgentTurnState();
      wsRef.current = null;
      setupCompleteRef.current = false;
      setIsConnected(false);
      setIsStarting(false);

      await stopMicrophone();
      stopPlayback();

      if (manualCloseRef.current) {
        setStatus((prev) => (prev === 'Error' ? prev : 'Disconnected'));
        goToView('complete');
        setLastEvent('ws_closed_manual');
        return;
      }

      const nextAttempt = reconnectAttemptRef.current + 1;
      if (nextAttempt <= MAX_RECONNECT_ATTEMPTS) {
        const delayMs = Math.min(
          RECONNECT_DELAY_MS * (2 ** (nextAttempt - 1)),
          MAX_RECONNECT_DELAY_MS
        );
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectAttemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);
        setStatus(`Reconnecting (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS}) in ${Math.ceil(delayMs / 1000)}s...`);
        setLastEvent('ws_closed_retrying');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delayMs);
        return;
      }

      setStatus((prev) => (prev === 'Error' ? prev : 'Disconnected'));
      setErrorMessage(formatAppError('connectionClosed'));
      if (appViewRef.current === 'live') {
        goToView('setup');
      }
      setLastEvent('ws_closed_giveup');
    };
  }, [
    appView,
    backendUrl,
    capturedImage,
    clearPendingTts,
    formatAppError,
    ensureSpeakerContext,
    ensurePcmWorklet,
    getOutputSpeaker,
    goToView,
    hasSessionStarted,
    handleToolCall,
    isConnected,
    isStarting,
    lang,
    resetAgentTurnState,
    playPcmChunk,
    speakTextFallback,
    startMicrophone,
    stopMicrophone,
    stopPlayback,
    preCue,
    resetUserSpeaking,
    resetSessionReplay,
    resolveTurnLatency,
    sendHybridControl,
    stopAutoDemo,
    upsertTranscriptBubble,
  ]);

  const handleAutoDemoToggle = useCallback(async () => {
    if (isAutoDemoRunning) {
      sendHybridControl('stop');
      stopAutoDemo('auto_demo_user_stop', autoDemoCopy.canceled);
      return;
    }

    const runId = autoDemoRunIdRef.current + 1;
    autoDemoRunIdRef.current = runId;
    autoDemoPendingStartRef.current = true;
    setIsAutoDemoRunning(true);
    setAutoDemoStatus(autoDemoCopy.booting);
    setLastEvent('auto_demo_booting');

    await pauseMicForSyntheticDemo();
    if (autoDemoRunIdRef.current !== runId) return;

    if (!isConnectedRef.current && !isStarting) {
      connect();
    }

    if (!isConnectedRef.current || !setupCompleteRef.current || appViewRef.current !== 'live') {
      setAutoDemoStatus(autoDemoCopy.waitingSession);
    }

    const isReady = await waitForAutoDemoReady(runId);
    if (!isReady) {
      if (autoDemoRunIdRef.current === runId) {
        autoDemoPendingStartRef.current = false;
        clearAutoDemoTimer();
        restoreMicAfterSyntheticDemo();
        setIsAutoDemoRunning(false);
        setAutoDemoStatus(autoDemoCopy.failed);
        setLastEvent('auto_demo_not_ready');
      }
      return;
    }

    autoDemoPendingStartRef.current = false;
    setAutoDemoStatus(autoDemoCopy.opening);
    setLastEvent('auto_demo_dual_live_starting');
    sendHybridControl('start', {
      mode: 'dual_live',
      lang,
      maxTurns: (AUTO_DEMO_SCRIPT[lang] ?? AUTO_DEMO_SCRIPT.en).length,
    });
  }, [
    autoDemoCopy.booting,
    autoDemoCopy.canceled,
    autoDemoCopy.failed,
    autoDemoCopy.opening,
    autoDemoCopy.waitingSession,
    clearAutoDemoTimer,
    connect,
    isAutoDemoRunning,
    isStarting,
    lang,
    pauseMicForSyntheticDemo,
    sendHybridControl,
    stopAutoDemo,
    waitForAutoDemoReady,
  ]);

  const handleLaunchOneClickDemo = useCallback(() => {
    if (isTransitioningToSetup || isAutoDemoRunning || oneClickDemoPendingRef.current) {
      return;
    }

    setShowOnboarding(false);

    if (appView === 'welcome') {
      oneClickDemoPendingRef.current = true;
      setIsWelcomeDemoLaunching(true);
      handleEnterSetup();
      return;
    }

    handleAutoDemoToggle();
  }, [appView, handleAutoDemoToggle, handleEnterSetup, isAutoDemoRunning, isTransitioningToSetup]);

  useSessionHotkeys({
    appView,
    isConnected,
    showEndSessionConfirm,
    showSettings,
    showOnboarding,
    setShowEndSessionConfirm,
    setShowSettings,
    dismissOnboarding,
    setIsTranscriptVisible,
  });

  useEffect(() => {
    if (!isConnected && !isStarting && appView === 'live') {
      if (hasSessionStarted) {
        goToView('complete');
      } else {
        connect();
      }
    }
  }, [appView, connect, goToView, hasSessionStarted, isConnected, isStarting]);

  useEffect(() => {
    if (!oneClickDemoPendingRef.current) return;
    if (appView !== 'setup' && appView !== 'live') return;

    oneClickDemoPendingRef.current = false;
    setIsWelcomeDemoLaunching(false);
    handleAutoDemoToggle();
  }, [appView, handleAutoDemoToggle]);

  useEffect(() => {
    const introTimer = setTimeout(() => setIsCinematicReady(true), 60);
    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => () => {
    clearAutoDemoTimer();
    stopSyntheticUserSpeech();
    autoDemoShouldRestoreMicRef.current = false;
  }, [clearAutoDemoTimer, stopSyntheticUserSpeech]);

  const userHasSpoken = transcript.some(t => t.role === 'user');
  const isSacredOpaque = isSacredOnboarding && !userHasSpoken && !_isUserSpeaking;

  return (
    <div className={`App ${isCinematicReady ? 'cinematic-in' : 'cinematic-prep'} ${isSacredOpaque ? 'sacred-onboarding-active' : ''}`} role="application" aria-label="Dawayir live session application">
      <a className="skip-link" href="#main-canvas-content">
        {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      {appView === 'welcome' && (
        <Suspense fallback={<div className="loading-glow-overlay" />}>
          <WelcomeScreen
            lang={lang}
            t={t}
            isTransitioningToSetup={isTransitioningToSetup}
            isWelcomeDemoLaunching={isWelcomeDemoLaunching}
            oneClickDemoCopy={oneClickDemoCopy}
            logoSrc={logoCognitiveTrinity}
            onLaunchOneClickDemo={handleLaunchOneClickDemo}
            onEnterSetup={handleEnterSetup}
            onOpenUiShowcase={openUiShowcase}
            onSetLang={setLang}
          />
        </Suspense>
      )}


      <Suspense fallback={null}>
        <SessionOverlayPanel
          appView={appView}
          isSetupIntro={isSetupIntro}
          lang={lang}
          t={t}
          isConnected={isConnected}
          isStarting={isStarting}
          status={status}
          statusClass={statusClass}
        connectSteps={connectSteps}
        connectStage={connectStage}
        logoCognitiveTrinity={logoCognitiveTrinity}
        userKeyRef={userKeyRef}
        dominantNodeRef={dominantNodeRef}
        transitionCount={transitionCount}
        sessionStartTime={sessionStartTime}
        autoDemoStatus={autoDemoStatus}
        isAutoDemoRunning={isAutoDemoRunning}
        autoDemoCopy={autoDemoCopy}
        whyNowLine={whyNowLine}
        latestTruthContract={latestTruthContract}
        debugLineText={debugLineText}
        transitionToast={transitionToast}
        errorMessage={errorMessage}
        isCameraActive={isCameraActive}
        capturedImage={capturedImage}
        videoRef={videoRef}
        journeyStage={journeyStage}
        cognitiveMetrics={cognitiveMetrics}
        voiceTone={voiceTone}
        isAgentSpeaking={isAgentSpeaking}
        _isUserSpeaking={_isUserSpeaking}
        transcript={transcript}
        dominantColor={dominantColor}
        effectiveReducedMotion={effectiveReducedMotion}
        canvasRef={canvasRef}
        micStreamRef={micStreamRef}
        commandText={commandText}
        wsRef={wsRef}
        isAutoDemoRunningRef={isAutoDemoRunningRef}
        autoDemoPendingStartRef={autoDemoPendingStartRef}
        oneClickDemoPendingRef={oneClickDemoPendingRef}
        tenseStartRef={tenseStartRef}
        tenseTimerRef={tenseTimerRef}
        goToView={goToView}
        setLang={setLang}
        setShowSettings={setShowSettings}
        openUiShowcase={openUiShowcase}
        connect={connect}
        startCamera={startCamera}
        stopCamera={stopCamera}
        captureSnapshot={captureSnapshot}
        handleLookAtMe={handleLookAtMe}
        handleAutoDemoToggle={handleAutoDemoToggle}
        setShowEndSessionConfirm={setShowEndSessionConfirm}
        handleTextCommand={handleTextCommand}
        setCommandText={setCommandText}
        markTruthContractDone={markTruthContractDone}
        setLastEvent={setLastEvent}
        setVoiceTone={setVoiceTone}
        setDominantColor={setDominantColor}
        setShowBreathing={setShowBreathing}
        handleBioStateChange={handleBioStateChange}
        setCapturedImage={setCapturedImage}
        appSettings={appSettings}
      />
      </Suspense>

      {/* Session Complete Screen */}
      {appView === 'complete' && (
        <Suspense fallback={null}>
          <SessionCompleteScreen
            lang={lang}
            isSandMandalaActive={isSandMandalaActive}
            cognitiveMetrics={cognitiveMetrics}
            journeyPath={journeyPath}
            transitionCount={transitionCount}
            sessionStartTime={sessionStartTime}
            dominantNodeId={dominantNodeRef.current}
            showDNACard={showDNACard}
            onSetShowDNACard={setShowDNACard}
            onGoToView={goToView}
            onSandMandala={handleSandMandala}
          />
        </Suspense>
      )}

      {/* UI Showcase Page */}
      {appView === 'ui-showcase' && (
        <Suspense fallback={<div className="loading-glow-overlay" />}>
          <UiShowcasePage onBack={() => goToView('welcome')} />
        </Suspense>
      )}

      {showSettings && !isConnected && (
        <Suspense fallback={null}>
          <SettingsModal
            lang={lang}
            settings={appSettings}
            onClose={() => setShowSettings(false)}
            onLanguageChange={setLang}
            onSettingsChange={updateAppSettings}
            selectedMicId={selectedMicId}
            onMicChange={setSelectedMicId}
          />
        </Suspense>
      )}

      {showOnboarding && (appView === 'setup' || appView === 'live') && (
        <OnboardingModal
          lang={lang}
          step={onboardingStep}
          steps={onboardingSteps}
          logoSrc={logoCognitiveTrinity}
          onSkip={dismissOnboarding}
          onNext={advanceOnboarding}
        />
      )}

      {showEndSessionConfirm && (
        <Suspense fallback={null}>
          <EndSessionConfirmModal
            lang={lang}
            onCancel={() => setShowEndSessionConfirm(false)}
            onConfirm={() => {
              setShowEndSessionConfirm(false);
              disconnect();
            }}
          />
        </Suspense>
      )}

      {/* Live Transcript Overlay */}
      {appView === 'live' && isConnected && (
        <NeuralTopicGraph
          transcript={transcript}
          lang={lang}
          reducedMotion={effectiveReducedMotion}
        />
      )}

      {appView === 'live' && isConnected && transcript.length > 0 && (
        <TranscriptPanel
          ref={transcriptEndRef}
          lang={lang}
          t={t}
          transcript={transcript}
          isTranscriptVisible={isTranscriptVisible}
          setIsTranscriptVisible={setIsTranscriptVisible}
          getTranscriptSpeakerLabel={getTranscriptSpeakerLabel}
        />
      )}

      {appView === 'live' && isConnected && (
        <div className={`breathing-hud ${appSettings.fullScreenSession && !appSettings.fsShowControls ? 'session-fullscreen-hidden' : ''}`} role="toolbar" aria-label={lang === 'ar' ? 'أدوات الجلسة' : 'Session tools'}>
          <button className="secondary" onClick={() => setIsBreathingRoom((current) => !current)}>
            {isBreathingRoom ? (lang === 'ar' ? 'إظهار اللوحة' : 'Show Panel') : (lang === 'ar' ? 'إخفاء اللوحة' : 'Hide Panel')}
          </button>
          <button className="secondary" onClick={() => setIsTranscriptVisible((current) => !current)}>
            {lang === 'ar' ? 'المحادثة' : 'Transcript'}
          </button>
          <button className="secondary disconnect-btn" onClick={() => setShowEndSessionConfirm(true)}>
            {t.endSession}
          </button>
        </div>
      )}

      {appView === 'live' && isConnected && (
        <AchievementBar achievements={achievements} lang={lang} />
      )}

      {appView === 'live' && isConnected && audioDiag.className && (
        <div className={`audio-diagnostic-badge ${audioDiag.className}`}>
          {audioDiag.text}
        </div>
      )}

      {/* ── Feature ①: BREATHING GUIDE ── */}
      <BreathingGuide
        active={showBreathing}
        lang={lang}
        reducedMotion={effectiveReducedMotion}
        onComplete={() => setShowBreathing(false)}
      />

      <main id="main-canvas-content" className="app-canvas-main" role="main" aria-label={lang === 'ar' ? 'مساحة الدوائر' : 'Circle canvas'}>
        <h1 className="visually-hidden">{lang === 'ar' ? 'تطبيق دواير للجلسات الصوتية' : 'Dawayir live voice session app'}</h1>
        <ErrorBoundary name="DawayirCanvas" lang={lang} minHeight="100vh">
          <DawayirCanvas ref={canvasRef} lang={lang} reducedMotion={effectiveReducedMotion} />
        </ErrorBoundary>
      </main>

      <div className="visually-hidden" ref={srAnnouncerRef} role="status" aria-live="polite" aria-atomic="true" />

      {/* ── DNA CARD MODAL ── */}
      {showDNACard && (
        <CognitiveDNACard
          lang={lang}
          mirrorSentence={dnaMirrorSentence}
          weatherId={dnaWeatherId}
          dominantNodeId={dominantNodeRef.current}
          transitionCount={transitionCount}
          sessionDurationMs={sessionStartTime ? Date.now() - sessionStartTime : 0}
          journeyPath={journeyPath}
          onClose={() => setShowDNACard(false)}
        />
      )}

      {/* Circle First Shift Tooltip - one-time onboarding on first circle move */}
      <CircleFirstShiftTooltip
        lang={lang}
        show={showCircleIntro}
        onDismiss={() => setShowCircleIntro(false)}
      />
    </div>
  );

}

export default App;

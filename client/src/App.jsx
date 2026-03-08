import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DawayirCanvas from './components/DawayirCanvas';
import ConnectProgressCard from './components/ConnectProgressCard';
import OnboardingModal from './components/OnboardingModal';
import EndSessionConfirmModal from './components/EndSessionConfirmModal';
import SettingsModal from './components/SettingsModal';
import DashboardView from './components/DashboardView';
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
  getToolCall,
  isSetupCompleteMessage,
  getServerErrorMessage,
  isInterruptedMessage,
  isAudioMimeType,
  getTurnDataAudioBlobs,
} from './features/session/protocol';
import { useSessionHotkeys } from './hooks/useSessionHotkeys';

// moved to features/session/constants
// Client-side VAD removed -- Gemini's built-in VAD handles turn detection.

const AUTO_DEMO_SCRIPT = {
  ar: [
    {
      spoken: 'انا متوتر جدا ومش قادر اركز دلوقتي.',
      prompt: 'انا متوتر جدا ومش قادر اركز دلوقتي. لو مناسب عدل الدوائر بهدوء.',
      maxWaitMs: 15000,
    },
    {
      spoken: 'خلينا نركز على الوعي.',
      prompt: 'ركز على دائرة الوعي: صغرها قليلا واجعل اللون اهدى.',
    },
    {
      spoken: 'عايز معرفة اوضح واكثر ثباتا.',
      prompt: 'كبر دائرة العلم قليلا وخليها اوضح.',
    },
    {
      spoken: 'دلوقتي عايز توازن اقوى في الحقيقة.',
      prompt: 'حول التركيز للحقيقة وعدل الالوان لتحقيق توازن افضل.',
    },
    {
      spoken: 'ممكن تلخيص سريع للحالة الحالية؟',
      prompt: 'لو سمحت لخص الحالة الحالية في جملة قصيرة وواضحة.',
    },
    {
      spoken: 'قبل ما ننهي، احفظ الجلسة.',
      prompt: 'قبل النهاية احفظ الخريطة الذهنية وانشئ تقرير جلسة مختصر.',
    },
  ],
  en: [
    {
      spoken: 'I feel overwhelmed and cannot focus right now.',
      prompt: 'I feel overwhelmed and cannot focus right now. If appropriate, adjust circles gently.',
      maxWaitMs: 15000,
    },
    {
      spoken: 'Please focus on Awareness first.',
      prompt: 'Focus on Awareness: shrink it slightly and make the color calmer.',
    },
    {
      spoken: 'I need clearer knowledge and stronger structure.',
      prompt: 'Enlarge Knowledge a bit and make it more vivid.',
    },
    {
      spoken: 'Now shift attention to Truth for better balance.',
      prompt: 'Shift focus to Truth and rebalance the colors for better harmony.',
    },
    {
      spoken: 'Can you summarize my state in one short sentence?',
      prompt: 'Please summarize the current state in one short clear sentence.',
    },
    {
      spoken: 'Before ending, save this session.',
      prompt: 'Before ending, save the mental map and generate a short session report.',
    },
  ],
};

const AUTO_DEMO_COPY = {
  ar: {
    start: 'تشغيل الديمو الهجين',
    stop: 'ايقاف الديمو',
    booting: 'جاري تجهيز الديمو الهجين...',
    waitingSession: 'بانتظر اتصال Gemini Live...',
    manualCue: 'اتكلم بصوتك دلوقتي: انا متوتر جدا الان.',
    manualDetected: 'تمام، تم التقاط صوتك. التحويل لوكيل المستخدم.',
    manualFallback: 'مافيش صوت واضح. هنكمل تلقائيا بوكيل المستخدم.',
    running: 'وكيل المستخدم شغال',
    completed: 'الديمو اكتمل بنجاح',
    canceled: 'تم ايقاف الديمو',
    failed: 'تعذر بدء الديمو: تأكد من الاتصال',
  },
  en: {
    start: 'Start Hybrid Demo',
    stop: 'Stop Demo',
    booting: 'Preparing hybrid demo...',
    waitingSession: 'Waiting for Gemini Live connection...',
    manualCue: 'Speak now: "I feel overwhelmed right now."',
    manualDetected: 'Voice captured. Switching to user agent.',
    manualFallback: 'No clear voice detected. Continuing with user agent.',
    running: 'User agent running',
    completed: 'Hybrid demo completed',
    canceled: 'Demo stopped',
    failed: 'Demo failed: check connection',
  },
};

const ONE_CLICK_DEMO_COPY = {
  ar: {
    start: 'تشغيل العرض المباشر',
    launching: 'جاري تجهيز العرض...',
    helper: 'يفتح الجلسة الحية ويشغل الديمو الهجين تلقائيًا للمحكمين.',
  },
  en: {
    start: 'Run Live Demo',
    launching: 'Preparing live demo...',
    helper: 'Opens the live session and starts the hybrid demo automatically.',
  },
};

function App() {
  const [isCinematicReady, setIsCinematicReady] = useState(false);
  const [lang, setLang] = useState('ar');
  const t = STRINGS[lang];
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
  const [isAutoDemoRunning, setIsAutoDemoRunning] = useState(false);
  const [isWelcomeDemoLaunching, setIsWelcomeDemoLaunching] = useState(false);
  const [autoDemoStatus, setAutoDemoStatus] = useState('');
  const [whyNowLine, setWhyNowLine] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => window.localStorage.getItem('dawayir-onboarding-seen') !== 'true');
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
  const [dominantColor, setDominantColor] = useState('#00F5FF');
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
      '1→2': '🎯 عقلك انتقل من المشاعر للتفكير — هذا هو الوعي الإدراكي!',
      '1→3': '✨ قفزة نادرة! من المشاعر مباشرةً للوضوح',
      '2→1': '💭 رجعت للإحساس بعمق — الوعي العاطفي نشط',
      '2→3': '🌟 عبرت من التفكير للحقيقة — لحظة وضوح!',
      '3→1': '🔄 من الوضوح لاكتشاف مشاعر جديدة',
      '3→2': '🔍 تعمق في تحليل قرارك — دماغك يعمل!',
    },
    en: {
      '1→2': '🎯 Mind shifted from feelings to thinking — cognitive awareness!',
      '1→3': '✨ Rare leap! From emotion directly to clarity',
      '2→1': '💭 Returned to deep feeling — emotional awareness active',
      '2→3': '🌟 Crossed from thinking to truth — moment of clarity!',
      '3→1': '🔄 From clarity to discovering new feelings',
      '3→2': '🔍 Deepening analysis of your decision — brain working!',
    },
  };

  const getWhyNowCircleName = useCallback((nodeId) => {
    const names = {
      1: lang === 'ar' ? 'الوعي' : 'Awareness',
      2: lang === 'ar' ? 'العلم' : 'Knowledge',
      3: lang === 'ar' ? 'الحقيقة' : 'Truth',
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
    const source = String(args?.source || '');
    const policy = String(args?.policy || '');
    const metric = String(args?.metric || '');
    const reason = typeof args?.reason === 'string' ? args.reason.trim() : '';
    const currentOverload = Number(cognitiveMetrics.overloadIndex) || 0;
    const currentEquilibrium = Number(cognitiveMetrics.equilibriumScore) || 0;
    const currentClarity = Number(cognitiveMetrics.clarityDelta) || 0;
    const normalizedCallId = String(callId || '');

    if (normalizedCallId.startsWith('server_cmd_') || normalizedCallId.startsWith('text_cmd_') || normalizedCallId.startsWith('client_cmd_')) {
      return {
        tone: 'direct',
        text: lang === 'ar'
          ? `لماذا الآن: ${circleName} تغيّرت لأنك طلبت ذلك مباشرة.`
          : `Why now: ${circleName} changed because you asked for it directly.`,
      };
    }

    if (normalizedCallId.startsWith('sentiment_') || source === 'bio_signal') {
      return {
        tone: 'bio',
        text: lang === 'ar'
          ? `لماذا الآن: ${circleName} تحرّكت لأن النظام التقط توترًا أو إشارة حسية في اللحظة الحالية.`
          : `Why now: ${circleName} moved because the system detected a live bio-signal or stress cue.`,
      };
    }

    if (source === 'vision') {
      return {
        tone: 'focus',
        text: lang === 'ar'
          ? `لماذا الآن: ${circleName} اتعدّلت بناءً على قراءة بصرية من الكاميرا.`
          : `Why now: ${circleName} changed from a live visual reading.`,
      };
    }

    if (callName === 'highlight_node') {
      return {
        tone: 'focus',
        text: lang === 'ar'
          ? `لماذا الآن: النظام يسلّط الضوء على ${circleName} لأنه محور الدور الحالي.`
          : `Why now: the system is spotlighting ${circleName} as the focus of this turn.`,
      };
    }

    if (policy === 'PRIORITIZE_GROUNDING' || metric === 'overload' || currentOverload > 0.72) {
      return {
        tone: 'ground',
        text: lang === 'ar'
          ? `لماذا الآن: الضغط المعرفي مرتفع، فالنظام يعيد تهدئة ${circleName}.`
          : `Why now: cognitive overload is high, so the system is grounding ${circleName}.`,
      };
    }

    if (policy === 'PRIORITIZE_STRUCTURE' || metric === 'equilibrium' || currentEquilibrium < 0.42) {
      return {
        tone: 'balance',
        text: lang === 'ar'
          ? `لماذا الآن: التوازن منخفض، فالنظام يعيد بناء ${circleName} بشكل أكثر اتساقًا.`
          : `Why now: equilibrium dropped, so the system is restructuring ${circleName}.`,
      };
    }

    if (metric === 'clarity' || (Number(nodeId) === 3 && currentClarity > 0.08)) {
      return {
        tone: 'clarity',
        text: lang === 'ar'
          ? `لماذا الآن: الوضوح يرتفع، لذلك يتم تعزيز ${circleName}.`
          : `Why now: clarity is rising, so ${circleName} is being reinforced.`,
      };
    }

    if (reason) {
      return {
        tone: 'neutral',
        text: lang === 'ar'
          ? `لماذا الآن: ${circleName} تتكيّف مع هذا الدور من الحوار.`
          : `Why now: ${reason}`,
      };
    }

    return {
      tone: 'neutral',
      text: lang === 'ar'
        ? `لماذا الآن: ${circleName} تتكيّف مع آخر دور في الحوار.`
        : `Why now: ${circleName} is adapting to the latest turn.`,
    };
  }, [cognitiveMetrics.clarityDelta, cognitiveMetrics.equilibriumScore, cognitiveMetrics.overloadIndex, getWhyNowCircleName, lang]);

  const snapshotReplayNodes = useCallback(() => {
    const fallbackLabels = NODE_LABELS[lang] || NODE_LABELS.en;
    const nodes = canvasRef.current?.getNodes?.() || [];
    return nodes
      .map((node) => ({
        id: Number(node.id),
        radius: Math.round(Number(node.radius) || 0),
        color: typeof node.color === 'string' ? node.color : '#00F5FF',
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

  // Update canvas node labels when language changes
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const labels = NODE_LABELS[lang];
    if (canvasRef.current) {
      Object.entries(labels).forEach(([id, label]) => {
        canvasRef.current.updateNode(Number(id), { label });
      });
    }
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [journeyStage, setJourneyStage] = useState('Overwhelmed');
  const onboardingSteps = ONBOARDING_STEPS[lang];
  const connectSteps = CONNECT_PROGRESS[lang];

  useEffect(() => {
    if (!isConnected && !isStarting && appView === 'live') {
      // Only show "complete" after a real started session.
      setAppView(hasSessionStarted ? 'complete' : 'setup');
    }
  }, [isConnected, isStarting, appView, hasSessionStarted]);

  useEffect(() => {
    if (isTranscriptVisible && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isTranscriptVisible]);

  useEffect(() => () => window.clearTimeout(whyNowTimerRef.current), []);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const micStreamRef = useRef(null);
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
  const autoDemoRunIdRef = useRef(0);
  const autoDemoTimerRef = useRef(null);
  const autoDemoPendingStartRef = useRef(false);
  const oneClickDemoPendingRef = useRef(false);
  const autoDemoSpeechUtteranceRef = useRef(null);
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
  const bufferedUserTextRef = useRef('');
  const lastAgentContentAtRef = useRef(0);
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
    transcriptRef.current = transcript;
  }, [transcript]);

  const startCamera = useCallback(async () => {
    console.log("[Camera] Starting camera...");
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser");
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
          setErrorMessage("Click anywhere to start camera preview");
        }

        setIsCameraActive(true);
        console.log("[Camera] [OK] Camera activated successfully");
      } else {
        console.error("[Camera] videoRef.current is null!");
        setErrorMessage("Video element not ready. Please try again.");
      }
    } catch (err) {
      console.error("[Camera] [ERROR] Error:", err);
      console.error("[Camera] Error name:", err.name);
      console.error("[Camera] Error message:", err.message);

      if (err.name === 'NotAllowedError') {
        setErrorMessage("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === 'NotFoundError') {
        setErrorMessage("No camera found. Please connect a camera and try again.");
      } else if (err.name === 'NotReadableError') {
        setErrorMessage("Camera is in use by another application.");
      } else {
        setErrorMessage(`Camera error: ${err.message}`);
      }
    }
  }, []);

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
      setErrorMessage("Camera not ready. Please wait a moment and try again.");
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
  }, [stopCamera]);

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

  const dismissOnboarding = useCallback(() => {
    window.localStorage.setItem('dawayir-onboarding-seen', 'true');
    setShowOnboarding(false);
    setOnboardingStep(0);
  }, []);

  const advanceOnboarding = useCallback(() => {
    setOnboardingStep((current) => {
      if (current >= onboardingSteps.length - 1) {
        window.localStorage.setItem('dawayir-onboarding-seen', 'true');
        setShowOnboarding(false);
        return current;
      }

      return current + 1;
    });
  }, [onboardingSteps.length]);

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
    lastAgentContentAtRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;

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
      throw new Error('Web Audio API is not supported in this browser.');
    }

    const ctx = new AudioContextCtor({ sampleRate: OUTPUT_SAMPLE_RATE });
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    speakerContextRef.current = ctx;
    nextPlaybackTimeRef.current = ctx.currentTime;
    return ctx;
  }, []);

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
          }
          speakingDebounceRef.current = null;
        }, 500);
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
      throw new Error('Microphone capture is not supported in this browser.');
    }

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
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
  }, [sendRealtimeAudioChunk, stopMicrophone, selectedMicId]);

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
            awareness: 1, science: 2, truth: 3, knowledge: 2, circle: 1,
            'وعي': 1, 'علم': 2, 'حقيقة': 3, 'الوعي': 1, 'العلم': 2, 'الحقيقة': 3,
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
          const whyNowPayload = buildWhyNowPayload({
            callId: call.id,
            callName: call.name,
            args,
            nodeId: safeId,
          });
          pushWhyNowLine(whyNowPayload);
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
            const lastUserMsg = transcript.findLast?.(t => t.role === 'user')?.text || '';
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

          if (safeId === 1) unlockAchievement('awarenessShift');
          else if (safeId === 2) unlockAchievement('knowledgeShift');
          else if (safeId === 3) unlockAchievement('truthShift');
          if (updates.color) unlockAchievement('sentimentShift');
          const callId = String(call.id || '');
          if (callId.startsWith('server_cmd_')) unlockAchievement('voiceCommand');



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
          captureReplayStep('highlight', {
            focusId: id,
            reason: whyNowPayload.text,
            source: args?.source || 'agent',
            policy: args?.policy || 'IDLE',
            metric: args?.metric || 'turn',
          });
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
        } else if (call.name === 'save_mental_map' || call.name === 'generate_session_report' || call.name === 'get_expert_insight') {
          // These are now resolved server-side; skip silently on client
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
  }, [buildWhyNowPayload, captureReplayStep, cognitiveMetrics, lang, pushWhyNowLine, unlockAchievement]);

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

  const stopSyntheticUserSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancellation race errors.
    }
    autoDemoSpeechUtteranceRef.current = null;
  }, []);

  const speakSyntheticUserLine = useCallback((text, runId) => (
    new Promise((resolve) => {
      if (autoDemoRunIdRef.current !== runId) {
        resolve(false);
        return;
      }

      const cleaned = (typeof text === 'string' ? text : '').replace(/[*_`#]/g, '').trim();
      if (!cleaned) {
        resolve(true);
        return;
      }
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve(true);
        return;
      }

      stopSyntheticUserSpeech();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      utterance.lang = isArabic ? 'ar-EG' : 'en-US';
      utterance.rate = isArabic ? 0.98 : 1.02;
      utterance.pitch = 0.86;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices?.() ?? [];
      const langPrefix = isArabic ? 'ar' : 'en';
      const matchingVoices = voices.filter((voice) =>
        String(voice.lang || '').toLowerCase().startsWith(langPrefix)
      );
      const chosenVoice = matchingVoices.find((voice) => !voice.default) || matchingVoices[0];
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (autoDemoSpeechUtteranceRef.current === utterance) {
          autoDemoSpeechUtteranceRef.current = null;
        }
        resolve(ok && autoDemoRunIdRef.current === runId);
      };

      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      autoDemoSpeechUtteranceRef.current = utterance;

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(false);
      }
    })
  ), [stopSyntheticUserSpeech]);

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

  const waitForAgentToSettle = useCallback(async (runId, timeoutMs = 14000) => {
    const startedAt = Date.now();
    let quietMs = 0;
    while ((Date.now() - startedAt) < timeoutMs) {
      if (autoDemoRunIdRef.current !== runId) return false;
      if (isAgentSpeakingRef.current) {
        quietMs = 0;
      } else {
        quietMs += 180;
        if (quietMs >= 720) {
          return true;
        }
      }
      const keepGoing = await sleepForAutoDemo(180, runId);
      if (!keepGoing) return false;
    }
    return true;
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
      setAppView('setup');
      setIsSetupIntro(true);
      setIsTransitioningToSetup(false);
      window.setTimeout(() => setIsSetupIntro(false), 520);
    }, 280);
  }, [isTransitioningToSetup]);

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
      setAppView('welcome');
      setHasSessionStarted(false);
    }, 3800);
  }, []);

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

    setErrorMessage('');
    setIsStarting(true);
    setHasSessionStarted(false);
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
    let wsUrlString = backendUrl;
    if (token) {
      const wsUrl = new URL(backendUrl);
      wsUrl.searchParams.set('token', token);
      wsUrlString = wsUrl.toString();
    }
    // console.log('[Connect] Opening WebSocket to', wsUrlString);
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
      // ── Feature ⑬⑭⑮: Reset session tracking on new connection ──
      setSessionStartTime(Date.now());
      resetSessionReplay();
      setTransitionCount(0);
      journeyPathRef.current = [1];
      setJourneyPath([1]);
      dominantNodeRef.current = 1;
      prevInsightRadiusRef.current = null;

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
                next.push({ role: 'user', text: bufferedUserTextRef.current, time: timeStr, finished: !!dt.finished, cogColor: dominantNodeRef.current === 2 ? '#00FF41' : dominantNodeRef.current === 3 ? '#FF00E5' : '#00F5FF' });
              }
              if (next.length >= 5) unlockAchievement('deepConvo');
              return next.slice(-6);
            });
          }

          if (dt.finished) {
            resetUserSpeaking();
          }
        } else if (dt.type === 'output') {
          resolveTurnLatency();
          // Keep output transcript visible, but throttled to avoid UI jank.
          setIsAgentSpeaking(true);
          isAgentSpeakingRef.current = true;

          const isNewTurn = bufferedTurnTextRef.current.trim() === '';
          bufferedTurnTextRef.current = `${bufferedTurnTextRef.current} ${dt.text}`.trim();
          if (isNewTurn) unlockAchievement('firstReply');

          const now = Date.now();
          const shouldUpdateAgentTranscript = Boolean(dt.finished) || (now - transcriptThrottleRef.current.agent) > 120;
          if (shouldUpdateAgentTranscript) {
            transcriptThrottleRef.current.agent = now;
            setTranscript((prev) => {
              const next = [...prev];
              if (isNewTurn) {
                const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                // ── Feature ③: Agent responses also get cognitive color ──
                next.push({ role: 'agent', text: bufferedTurnTextRef.current, time: timeStr, finished: false, cogColor: dominantNodeRef.current === 2 ? '#00FF41' : dominantNodeRef.current === 3 ? '#FF00E5' : '#00F5FF' });
              } else {
                let found = false;
                for (let i = next.length - 1; i >= 0; i--) {
                  if (next[i].role === 'agent' && !next[i].finished) {
                    next[i] = { ...next[i], text: bufferedTurnTextRef.current };
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                  next.push({ role: 'agent', text: bufferedTurnTextRef.current, time: timeStr, finished: false });
                }
              }
              return next.slice(-6);
            });
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

      const serverError = getServerErrorMessage(message);
      if (serverError) {
        setStatus('Error');
        setErrorMessage(serverError);
        setLastEvent('server_error');
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        return;
      }

      if (isSetupCompleteMessage(message)) {
        setupCompleteRef.current = true;
        setHasSessionStarted(true);
        if (appView === 'setup') {
          setAppView('live');
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

              const bootstrapText = lang === 'ar'
                ? (capturedImage
                  ? 'دي صورتي دلوقتي. اقرأ حالتي النفسية من الصورة ونادي update_node عشان تغيّر radius وcolor لكل دايرة على حسب قرايتك. استخدم id وradius وcolor بس.'
                  : 'يا صاحبي، ازيك؟')
                : (capturedImage
                  ? 'This is my photo. Read my emotional state from the image and call update_node to change radius and color for each circle based on your reading. Use only id, radius, and color.'
                  : 'Hey, how are you?');
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
              const lastConv = sessionContextRef.current.length > 0
                ? sessionContextRef.current.slice(-3).join(' ... ')
                : '';
              const promptText = lastConv
                ? `(كمّل من هنا بالظبط: "${lastConv}")`
                : '(كمّل الحوار.)';
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
            if (!setupCompleteRef.current || isMicActiveRef.current || !deferMicStartUntilFirstAgentReplyRef.current) {
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

      const parts = getParts(message);
      if (parts.length > 0) {
        const now = Date.now();
        if (now - lastAgentContentAtRef.current > 1800) {
          resetAgentTurnState();
        }
        lastAgentContentAtRef.current = now;
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
      if (textParts.length > 0) {
        sessionContextRef.current = [...sessionContextRef.current, ...textParts].slice(-5);
        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;

        const appendedText = textParts.join(' ');
        const isNewTurn = bufferedTurnTextRef.current.trim() === '';
        bufferedTurnTextRef.current = `${bufferedTurnTextRef.current} ${appendedText}`.trim();

        // Update live transcript with latest agent text accumulation
        setTranscript((prev) => {
          const next = [...prev];
          if (isNewTurn) {
            const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
            next.push({ role: 'agent', text: bufferedTurnTextRef.current, time: timeStr, finished: false });
          } else {
            // Update the last agent bubble
            let found = false;
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === 'agent' && !next[i].finished) {
                next[i] = { ...next[i], text: bufferedTurnTextRef.current };
                found = true;
                break;
              }
            }
            if (!found) {
              const timeStr = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              next.push({ role: 'agent', text: bufferedTurnTextRef.current, time: timeStr, finished: false });
            }
          }
          return next.slice(-6);
        });
        if (currentTurnModeRef.current === 'none' && ttsFallbackEnabledRef.current) {
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
        } else if (currentTurnModeRef.current === 'none' && !ttsFallbackEnabledRef.current) {
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
        resolveTurnLatency();
        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;
        // If TTS already started for this turn, ignore late model audio to avoid overlap.
        if (currentTurnModeRef.current !== 'tts') {
          currentTurnModeRef.current = 'model';
          clearPendingTts();
          for (const blob of selectedAudioBlobs) {
            if (blob?.data) {
              await playPcmChunk(base64ToArrayBuffer(blob.data), parsePcmSampleRate(blob.mimeType));
              setLastEvent('audio_chunk');
            }
          }
        }
        return;
      }
    };

    socket.onerror = () => {
      if (wsRef.current !== socket) return;
      console.error('[Connect] WebSocket error');
      setStatus('Error');
      setErrorMessage('WebSocket error. Retrying if possible.');
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
        setAppView('complete'); // Transition to complete screen when manually closing
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
      setErrorMessage('Connection closed after retry attempts. Please reconnect manually.');
      setLastEvent('ws_closed_giveup');
    };
  }, [
    appView,
    backendUrl,
    capturedImage,
    clearPendingTts,
    ensureSpeakerContext,
    ensurePcmWorklet,
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
  ]);

  const handleAutoDemoToggle = useCallback(async () => {
    if (isAutoDemoRunning) {
      stopAutoDemo('auto_demo_user_stop', autoDemoCopy.canceled);
      return;
    }

    const runId = autoDemoRunIdRef.current + 1;
    autoDemoRunIdRef.current = runId;
    autoDemoPendingStartRef.current = true;
    setIsAutoDemoRunning(true);
    setAutoDemoStatus(autoDemoCopy.booting);
    setLastEvent('auto_demo_booting');

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
    const steps = AUTO_DEMO_SCRIPT[lang] ?? AUTO_DEMO_SCRIPT.en;
    let scriptedStartIndex = 0;

    setAutoDemoStatus(autoDemoCopy.manualCue);
    setLastEvent('auto_demo_manual_stage');
    const manualCaptured = await waitForManualUserTurn(runId, 9000);
    if (autoDemoRunIdRef.current !== runId) return;

    if (manualCaptured) {
      setAutoDemoStatus(autoDemoCopy.manualDetected);
      setLastEvent('auto_demo_manual_detected');
      scriptedStartIndex = 1;

      const settledAfterManual = await waitForAgentToSettle(runId, 16000);
      if (!settledAfterManual) return;
    } else {
      setAutoDemoStatus(autoDemoCopy.manualFallback);
      setLastEvent('auto_demo_manual_timeout');
    }

    await pauseMicForSyntheticDemo();
    if (autoDemoRunIdRef.current !== runId) return;
    const pauseGapOk = await sleepForAutoDemo(300, runId);
    if (!pauseGapOk) return;

    for (let i = scriptedStartIndex; i < steps.length; i += 1) {
      if (autoDemoRunIdRef.current !== runId) return;

      if (!isConnectedRef.current || !setupCompleteRef.current || appViewRef.current !== 'live') {
        setAutoDemoStatus(autoDemoCopy.waitingSession);
        const restored = await waitForAutoDemoReady(runId, 20000);
        if (!restored) {
          if (autoDemoRunIdRef.current === runId) {
            clearAutoDemoTimer();
            restoreMicAfterSyntheticDemo();
            setIsAutoDemoRunning(false);
            setAutoDemoStatus(autoDemoCopy.failed);
            setLastEvent('auto_demo_lost_connection');
          }
          return;
        }
      }

      const currentStep = steps[i];
      setAutoDemoStatus(`${autoDemoCopy.running} ${i + 1}/${steps.length}`);

      const spokenText = currentStep?.spoken || currentStep?.prompt || '';
      const promptText = currentStep?.prompt || spokenText;

      const syntheticSpeechOk = await speakSyntheticUserLine(spokenText, runId);
      if (!syntheticSpeechOk && autoDemoRunIdRef.current !== runId) return;

      if (autoDemoRunIdRef.current !== runId) return;
      handleTextCommand(promptText);

      const keptOpen = await sleepForAutoDemo(750, runId);
      if (!keptOpen) return;

      const settled = await waitForAgentToSettle(runId, currentStep.maxWaitMs || 14000);
      if (!settled) return;

      const keepGap = await sleepForAutoDemo(500, runId);
      if (!keepGap) return;
    }

    if (autoDemoRunIdRef.current !== runId) return;
    clearAutoDemoTimer();
    restoreMicAfterSyntheticDemo();
    setIsAutoDemoRunning(false);
    setAutoDemoStatus(autoDemoCopy.completed);
    setLastEvent('auto_demo_completed');
  }, [
    autoDemoCopy.booting,
    autoDemoCopy.canceled,
    autoDemoCopy.completed,
    autoDemoCopy.failed,
    autoDemoCopy.manualCue,
    autoDemoCopy.manualDetected,
    autoDemoCopy.manualFallback,
    autoDemoCopy.running,
    autoDemoCopy.waitingSession,
    clearAutoDemoTimer,
    connect,
    handleTextCommand,
    isAutoDemoRunning,
    isStarting,
    lang,
    pauseMicForSyntheticDemo,
    restoreMicAfterSyntheticDemo,
    sleepForAutoDemo,
    speakSyntheticUserLine,
    stopAutoDemo,
    waitForManualUserTurn,
    waitForAgentToSettle,
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

  return (
    <div className={`App ${isCinematicReady ? 'cinematic-in' : 'cinematic-prep'}`} role="application" aria-label="Dawayir live session application">
      <a className="skip-link" href="#main-canvas-content">
        {lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content'}
      </a>

      {appView === 'welcome' && (
        <div className={`welcome-screen ${isTransitioningToSetup ? 'exiting' : ''}`}>
          {/* Animated background orbs */}
          <div className="welcome-orbs" aria-hidden="true">
            <div className="welcome-orb welcome-orb-1" />
            <div className="welcome-orb welcome-orb-2" />
            <div className="welcome-orb welcome-orb-3" />
          </div>
          {/* Constellation particles */}
          <div className="welcome-particles" aria-hidden="true">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="welcome-particle" style={{
                left: `${4 + (i * 4.8) % 90}%`,
                top: `${6 + (i * 7.1) % 82}%`,
                animationDelay: `${(i * 0.4).toFixed(1)}s`,
                width: `${2 + i % 3}px`,
                height: `${2 + i % 3}px`,
              }} />
            ))}
          </div>

          <img src={logoCognitiveTrinity} alt="Dawayir" className="welcome-logo ds-slide-up-fade" />
          <div className="brand-name-large ds-slide-up-fade">{t.brandName}</div>
          <div className="brand-subtitle ds-slide-up-fade-delay">{t.brandSub}</div>
          <div className="brand-hook ds-slide-up-fade-delay"
            style={{ fontSize: '15px', opacity: 0.55, marginTop: '-8px', marginBottom: '4px', fontWeight: 400 }}
          >{t.brandHook}</div>

          {/* Three micro-circles preview */}
          <div className="welcome-circles-preview ds-slide-up-fade-delay" aria-hidden="true">
            <div className="wcp wcp-awareness" />
            <div className="wcp wcp-knowledge" />
            <div className="wcp wcp-truth" />
          </div>

          {/* CTA with glow ring */}
          <div className="welcome-cta-wrap ds-slide-up-fade-delay-more">
            <div className="welcome-cta-ring" aria-hidden="true" />
            <div className="welcome-cta-stack">
              <button
                className="primary-btn welcome-cta welcome-demo-cta"
                onClick={handleLaunchOneClickDemo}
                disabled={isWelcomeDemoLaunching}
              >
                {isWelcomeDemoLaunching ? oneClickDemoCopy.launching : oneClickDemoCopy.start}
              </button>
              <button
                className="secondary welcome-secondary-cta"
                onClick={handleEnterSetup}
                disabled={isWelcomeDemoLaunching}
              >
                {t.enterSpace}
              </button>
              <div className="welcome-demo-helper">{oneClickDemoCopy.helper}</div>
            </div>
          </div>

          <div className="lang-toggle-container ds-slide-up-fade-delay-more">
            <button className={`icon-btn lang-toggle ${lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>{lang === 'ar' ? 'عربى' : 'AR'}</button>
            <button className={`icon-btn lang-toggle ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>{lang === 'en' ? 'English' : 'EN'}</button>
          </div>
        </div>
      )}


      {(appView === 'dashboard' || appView === 'setup' || appView === 'live') && (
        <aside
          className={`overlay ${isSetupIntro ? 'overlay-enter' : ''} ${appView === 'dashboard' ? 'overlay-dashboard' : ''} ${appView === 'live' && isBreathingRoom ? 'overlay-collapsed' : ''}`}
          role="complementary"
          aria-label={lang === 'ar' ? 'لوحة التحكم' : 'Control panel'}
        >
          {appView === 'dashboard' ? (
            <DashboardView
              lang={lang}
              emptyLogoSrc={logoCognitiveTrinity}
              onBack={() => setAppView('welcome')}
            />
          ) : (
            <>
              {/* Brand Header */}
              <div className="brand-header">
                <div className="brand-logo-row">
                  <div>
                    <img src={logoCognitiveTrinity} alt="Dawayir" className="brand-mark" />
                    <div className="brand-name">{t.brandName}</div>
                    <div className="brand-arabic">{t.brandSub}</div>
                  </div>
                  <div className="header-actions">
                    {/* ── Feature ┃: EMOTIONAL WEATHER ── */}
                    {isConnected && (
                      <EmotionalWeather
                        dominantNodeId={dominantNodeRef.current}
                        transitionCount={transitionCount}
                        sessionStartTime={sessionStartTime}
                        lang={lang}
                        isConnected={isConnected}
                      />
                    )}
                    <button aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'} className="icon-btn lang-toggle" onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} title="Toggle Language">
                      {lang === 'en' ? 'AR' : 'EN'}
                    </button>
                    {!isConnected && !isStarting && (
                      <>
                        <button aria-label={lang === 'ar' ? 'الإعدادات' : 'Settings'} className="icon-btn" onClick={() => setShowSettings((current) => !current)} title={lang === 'ar' ? 'الإعدادات' : 'Settings'}>
                          {'\u2699'}
                        </button>
                        <button aria-label={t.memoryBank} className="icon-btn" onClick={() => setAppView('dashboard')} title={t.memoryBank}>
                          {t.dashboardBtn}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge
                  className={statusClass}
                  text={isConnected ? t.statusActive : status === 'Disconnected' ? t.statusDisconnected : status}
                />
                {isStarting && (
                  <ConnectProgressCard steps={connectSteps} stage={connectStage} />
                )}
                <div className="debug-status-line" title="setup/mic/retries/tools/last/rt" style={{ display: 'none' }}>
                  {debugLineText}
                </div>
                {autoDemoStatus && (
                  <div className={`auto-demo-status-line ${isAutoDemoRunning ? 'running' : ''}`}>
                    {autoDemoStatus}
                  </div>
                )}
                {whyNowLine && (
                  <div className={`why-now-line ${whyNowLine.tone || 'neutral'}`} role="status" aria-live="polite">
                    {whyNowLine.text}
                  </div>
                )}
              </div>

              {/* Main Controls - SETUP SCREEN ONLY */}
              {(appView === 'setup') && (
                <div className="section">
                  <div className="camera-setup">
                    <div className="setup-hint-card">
                      <img src={logoCognitiveTrinity} alt="" className="inline-logo" />
                      <div>
                        <strong>{lang === 'ar' ? 'مراية لعقلك — في الوقت الحقيقي' : 'A real-time mirror for your mind'}</strong>
                        <p>{lang === 'ar' ? 'اتكلم براحتك عن أي حاجة بتضغط عليك. الدوائر هتتغير أمامك وتعكس رحلتك من الفوضى للوضوح. التقاط الصورة اختياري تماماً.' : 'Speak freely about anything weighing on you. The circles will shift in real-time, mapping your journey from chaos to clarity. Camera is completely optional.'}</p>
                      </div>
                    </div>
                    <video ref={videoRef} autoPlay playsInline muted className="visually-hidden" />

                    {!isCameraActive && !capturedImage ? (
                      <>
                        <div className="setup-actions-row">
                          <button className="primary-btn outline-btn flex-center setup-action-btn" onClick={startCamera}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            {t.captureBtn}
                          </button>
                          <button className="primary-btn flex-center setup-action-btn" onClick={connect} disabled={isConnected || isStarting}>
                            {isStarting ? (
                              <div className="loading-container">
                                <span className="loading-text">{t.connecting}</span>
                                <div className="spinner"><div className="spinner-ring"></div></div>
                              </div>
                            ) : (
                              <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"></path><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"></path></svg>
                                {t.enterSpace}
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          className="secondary setup-skip-btn"
                          style={{ marginTop: '8px', width: '100%', fontSize: '13px', opacity: 0.7 }}
                          onClick={connect}
                          disabled={isConnected || isStarting}
                        >
                          {t.skipCamera}
                        </button>
                      </>
                    ) : isCameraActive ? (
                      <div className="video-capture-flow">
                        <div className="video-container">
                          <video autoPlay playsInline muted
                            ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="camera-actions-row">
                          <button className="capture-btn" onClick={captureSnapshot}>{t.capture}</button>
                          <button className="cancel-btn" onClick={stopCamera}>{t.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="captured-preview-container">
                        <div className="preview-heading">{t.initialState}</div>
                        <img src={capturedImage} className="pulse-preview-large" alt="Captured" />
                        <button className="retake-btn" onClick={() => { setCapturedImage(null); setTimeout(() => setIsCameraActive(true), 50); setTimeout(startCamera, 100); }}>
                          {t.retake}
                        </button>
                      </div>
                    )}
                  </div>

                  {(isCameraActive || capturedImage) && (
                    <button
                      className={`primary-btn flex-center setup-connect-btn ${isConnected ? 'secure-link' : ''}`}
                      onClick={connect}
                      disabled={isConnected || isStarting}
                    >
                      {isStarting ? (
                        <div className="loading-container">
                          <span className="loading-text">{t.connecting}</span>
                          <div className="spinner"><div className="spinner-ring"></div></div>
                        </div>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"></path><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"></path></svg>
                          {capturedImage ? t.enterSpaceVision : t.enterSpace}
                        </>
                      )}
                    </button>
                  )}

                  <div className="setup-auto-demo-row">
                    <button
                      className={`secondary setup-auto-demo-btn ${isAutoDemoRunning ? 'is-active' : ''}`}
                      onClick={handleAutoDemoToggle}
                      disabled={isStarting && !isAutoDemoRunning}
                    >
                      {isAutoDemoRunning ? autoDemoCopy.stop : autoDemoCopy.start}
                    </button>
                  </div>
                </div>
              )}

              {/* ── FEATURE ④: COGNITIVE TRANSITION TOAST ────────────────── */}
              {transitionToast && (
                <div className="cognitive-transition-toast" key={transitionToast}>
                  {transitionToast}
                </div>
              )}

              {/* Connected Activity - LIVE SCREEN ONLY */}
              {appView === 'live' && isConnected && (
                <div className="section">
                  <video ref={videoRef} autoPlay playsInline muted className="visually-hidden" />

                  <div className="timeline-overlay">
                    {[
                      { key: 'Overwhelmed', en: '1. Overwhelmed', ar: '١. التشتت' },
                      { key: 'Focus', en: '2. Focus', ar: '٢. التركيز' },
                      { key: 'Clarity', en: '3. Clarity', ar: '٣. الوضوح' },
                    ].map((stage, idx, arr) => {
                      const stageKey = stage.key;
                      const isCompleted = arr.findIndex(s => s.key === journeyStage) > idx;
                      const isActive = stageKey === journeyStage;
                      const nodeClass = isActive ? 'active' : isCompleted ? 'completed' : '';
                      return (
                        <div key={stageKey} className={`timeline-node ${nodeClass}`}>
                          <div className="node-dot"></div>
                          <span className="node-label">{lang === 'ar' ? stage.ar : stage.en}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`ai-state-bar ${isAgentSpeaking ? 'speaking' : 'idle'}`}>
                    <div className="wave">
                      <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    {isAgentSpeaking ? t.agentSpeaking : t.agentIdle}
                  </div>

                  <div className="visual-feedback">
                    {/* FEATURE ② + ⑤: Cognitive Fingerprint Live Sync */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', position: 'relative', zIndex: 10 }}>
                      <CognitiveFingerprint
                        sessionId="live-session-temp"
                        reportContent={transcript.map(t => t.text).join(' ')}
                        lang={lang}
                        size={160}
                        liveState={isAgentSpeaking ? 'speaking' : _isUserSpeaking ? 'listening' : 'thinking'}
                        voiceTone={voiceTone}
                      />
                    </div>
                    <Visualizer
                      stream={micStreamRef.current}
                      isConnected={isConnected}
                      lang={lang}
                      onStressLevelChange={handleBioStateChange}
                      dominantColor={dominantColor}
                    />

                    {/* ── Feature ┄: COGNITIVE VELOCITY ── */}
                    <CognitiveVelocity
                      dominantNodeId={dominantNodeRef.current}
                      dominantRadius={(() => {
                        const nodes = canvasRef.current?.getNodes?.() || [];
                        return nodes.find(n => n.id === dominantNodeRef.current)?.radius || 80;
                      })()}
                      isConnected={isConnected}
                      lang={lang}
                    />

                    {/* ── Feature ①: VOICE TONE BADGE + Breathing Trigger ── */}
                    <VoiceToneBadge
                      stream={micStreamRef.current}
                      isConnected={isConnected}
                      lang={lang}
                      canvasRef={canvasRef}
                      onToneChange={(tone) => {
                        setVoiceTone(tone);
                        // Map tone to node color for Acoustic Mirror (Feature ⑥)
                        const colorMap = { tense: '#FF5032', excited: '#FFC800', calm: '#FF00E5', focused: '#00FF41' };
                        if (colorMap[tone]) setDominantColor(colorMap[tone]);

                        // Feature ①: Breathing Regulator — trigger after 3s of tense
                        if (tone === 'tense') {
                          if (!tenseStartRef.current) {
                            tenseStartRef.current = Date.now();
                            clearTimeout(tenseTimerRef.current);
                            tenseTimerRef.current = setTimeout(() => {
                              setShowBreathing(true);
                              tenseStartRef.current = null;
                            }, 3000); // TENSE_TRIGGER_MS replaced directly to be safe
                          }
                        } else {
                          tenseStartRef.current = null;
                          clearTimeout(tenseTimerRef.current);
                        }
                      }}
                    />

                    {/* ── Feature ⑦: THE SACRED PAUSE ── */}
                    {/* Joins user in silence and dims interface if quiet for 5+ seconds */}
                    <SacredPause
                      tone={voiceTone}
                      isConnected={isConnected}
                      lang={lang}
                      isAgentSpeaking={isAgentSpeaking}
                      onPauseTriggered={() => {
                        // Secret instruction to Gemini when sacred pause starts
                        const socket = wsRef.current;
                        if (socket && socket.readyState === WebSocket.OPEN) {
                          socket.send(JSON.stringify({
                            clientContent: {
                              turns: [{ role: 'user', parts: [{ text: lang === 'ar' ? '(إشارة صمت: المستخدم يتأمل في صمت الآن وتظهر له تعويذة الصمت المريحة. بادله الصمت ولا تتحدث إلا إذا كان لديك شيء عميق جدا تضيفه للمساحة، أو انتظره.)' : '(Silence detected: User is reflecting. Hold space with them. Do not speak unless necessary or requested, embrace the silence.)' }] }],
                              turnComplete: false,
                            },
                          }));
                          setLastEvent('sacred_pause_triggered');
                        }
                      }}
                    />


                    {/* Cognitive OS Metrics Overlay */}
                    <div className="cognitive-metrics-overlay">
                      <div className="metric-item">
                        <span className="metric-label">{lang === 'ar' ? 'التوازن' : 'Equilibrium'}</span>
                        <span className="metric-value">{(cognitiveMetrics.equilibriumScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">{lang === 'ar' ? 'الضغط' : 'Overload'}</span>
                        <span className="metric-value">{(cognitiveMetrics.overloadIndex * 100).toFixed(0)}%</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">{lang === 'ar' ? 'الوضوح Δ' : 'Clarity Δ'}</span>
                        <span className={`metric-value ${cognitiveMetrics.clarityDelta >= 0 ? 'positive' : 'negative'}`}>
                          {cognitiveMetrics.clarityDelta >= 0 ? '+' : ''}{(cognitiveMetrics.clarityDelta * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {capturedImage && (
                      <div className="snapshot-preview">
                        <img src={capturedImage} alt="Pulse Snapshot" />
                        <span>{t.initialState}</span>
                      </div>
                    )}
                  </div>

                  <div className="connected-actions">
                    {!isCameraActive ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="retake-live-btn flex-center" onClick={handleLookAtMe} style={{ flex: 1, gap: '6px', background: "rgba(255, 209, 102, 0.15)", color: "#FFD700", borderColor: "rgba(255, 209, 102, 0.4)" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          {capturedImage ? t.updateVisual : t.lookAtMe}
                        </button>
                      </div>
                    ) : (
                      <div className="live-camera-mini">
                        <div className="video-container-mini">
                          <video autoPlay playsInline muted
                            ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div className="mini-camera-actions">
                          <button className="mini-capture-btn" onClick={captureSnapshot}>{t.capture}</button>
                          <button className="mini-cancel-btn" onClick={stopCamera}>{t.cancel}</button>
                        </div>
                      </div>
                    )}
                    <button
                      className={`secondary auto-demo-live-btn ${isAutoDemoRunning ? 'is-active' : ''}`}
                      onClick={handleAutoDemoToggle}
                    >
                      {isAutoDemoRunning ? autoDemoCopy.stop : autoDemoCopy.start}
                    </button>
                    <button className="secondary disconnect-btn flex-center" onClick={() => setShowEndSessionConfirm(true)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                      {t.endSession}
                    </button>
                  </div>
                </div>
              )}

              {/* Circle Control Panel */}
              {appView === 'live' && isConnected && (
                <div className="circle-controls">
                  {/* Text command input (hidden for demo) */}
                  <form className="command-input-form command-input-hidden" onSubmit={(e) => {
                    e.preventDefault();
                    handleTextCommand(commandText);
                    setCommandText('');
                  }}>
                    <input
                      type="text"
                      className="command-input"
                      value={commandText}
                      onChange={(e) => setCommandText(e.target.value)}
                      placeholder={lang === 'ar' ? 'اكتب أمر... مثال: صغّر دايرة الوعي' : 'Type command... e.g. shrink awareness circle'}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    />
                    <button type="submit" className="command-send-btn" disabled={!commandText.trim()}>
                      {lang === 'ar' ? 'نفّذ' : 'Send'}
                    </button>
                  </form>
                </div>
              )}

              {errorMessage && <p className="error-message">&#x26A0;&#xFE0F; {errorMessage}</p>}
            </>
          )}
        </aside>
      )}

      {/* Session Complete Screen */}
      {appView === 'complete' && (
        <div className="complete-screen complete-overlay">
          {isSandMandalaActive && (
            <style>{`
              @keyframes sand-shatter {
                0% { transform: scale(1); filter: blur(0) grayscale(0); opacity: 1; }
                20% { transform: scale(1.05) translateY(-5px); filter: blur(2px) grayscale(0.5); opacity: 0.8; }
                50% { transform: scale(1.1) translateY(-20px); filter: blur(15px) sepia(1) hue-rotate(-50deg); opacity: 0.5; letter-spacing: 12px; }
                100% { transform: scale(1.5) translateY(-80px); filter: blur(40px) opacity(0); opacity: 0; letter-spacing: 30px; }
              }
              .sand-mandala-active {
                animation: sand-shatter 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                pointer-events: none;
              }
            `}</style>
          )}
          <div className={`complete-card ${isSandMandalaActive ? 'sand-mandala-active' : ''}`}>
            <div className="success-icon-container">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 65, 0.4))' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="complete-title">
              {lang === 'ar' ? 'رحلة اكتملت' : 'Journey Complete'}
            </h2>

            {/* ── Feature ┄: MIRROR SENTENCE ── */}
            <MirrorSentence
              journeyPath={journeyPath}
              transitionCount={transitionCount}
              lang={lang}
              visible={true}
            />
            <p className="complete-subtitle">
              {lang === 'ar' ? 'لقد انتهت جلستك، وتم حفظ مسارك المعرفي في بنك الذاكرة.' : 'Your session has ended, and your cognitive path is saved in the Memory Bank.'}
            </p>

            {/* Journey Timeline */}
            <JourneyTimeline
              journeyPath={journeyPath}
              transitionCount={transitionCount}
              sessionDurationMs={sessionStartTime ? Date.now() - sessionStartTime : 0}
              lang={lang}
            />
            <div className="complete-stats-table">
              <div className="complete-stat-row complete-stat-row-divider">
                <span className="complete-stat-label">{lang === 'ar' ? 'التوازن النهائي' : 'Equilibrium'}</span>
                <span className="complete-stat-value complete-stat-success">{(cognitiveMetrics.equilibriumScore * 100).toFixed(0)}%</span>
              </div>
              <div className="complete-stat-row complete-stat-row-divider">
                <span className="complete-stat-label">{lang === 'ar' ? 'مستوى الضغط' : 'Overload'}</span>
                <span className="complete-stat-value complete-stat-info">{(cognitiveMetrics.overloadIndex * 100).toFixed(0)}%</span>
              </div>
              <div className="complete-stat-row">
                <span className="complete-stat-label">{lang === 'ar' ? 'نسبة الوضوح' : 'Clarity Δ'}</span>
                <span className={`complete-stat-value ${cognitiveMetrics.clarityDelta >= 0 ? 'complete-stat-success' : 'complete-stat-magenta'}`}>
                  {cognitiveMetrics.clarityDelta >= 0 ? '+' : ''}{(cognitiveMetrics.clarityDelta * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="complete-actions-row">
              <button className="primary-btn complete-action-btn" onClick={() => setAppView('setup')}>
                {lang === 'ar' ? 'جلسة جديدة' : 'New Session'}
              </button>
              <button className="primary-btn complete-action-btn complete-action-secondary" onClick={() => setAppView('dashboard')}>
                {lang === 'ar' ? 'بنك الذاكرة' : 'Memory Bank'}
              </button>
              {/* DNA Card share button */}
              <button
                className="dna-share-trigger-btn"
                onClick={() => setShowDNACard(true)}
                title={lang === 'ar' ? 'شارك رحلتك' : 'Share your journey'}
              >
                {lang === 'ar' ? '✦ شارك رحلتك' : '✦ Share Journey'}
              </button>

              {/* Feature 10: Sand Mandala (Let Go) */}
              <button
                className="primary-btn outline-btn complete-action-btn"
                onClick={handleSandMandala}
                style={{ width: '100%', marginTop: '8px', opacity: 0.8, color: '#ffb347', borderColor: 'rgba(255, 179, 71, 0.3)' }}
                title={lang === 'ar' ? 'انسف الماندالا وامسح البيانات' : 'Blow away the Mandala (Erase Data)'}
              >
                {lang === 'ar' ? '💨 التخلي (مسح)' : '💨 Detach & Erase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && !isConnected && (
        <SettingsModal
          lang={lang}
          onClose={() => setShowSettings(false)}
          onLanguageChange={setLang}
          selectedMicId={selectedMicId}
          onMicChange={setSelectedMicId}
        />
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
        <EndSessionConfirmModal
          lang={lang}
          onCancel={() => setShowEndSessionConfirm(false)}
          onConfirm={() => {
            setShowEndSessionConfirm(false);
            disconnect();
          }}
        />
      )}

      {/* Live Transcript Overlay */}
      {appView === 'live' && isConnected && transcript.length > 0 && (
        <section className={`transcript-container ${isTranscriptVisible ? 'open' : 'closed'}`} aria-label={lang === 'ar' ? 'الدردشة' : 'Live transcript'}>
          <button
            className="transcript-toggle-btn"
            onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
            title={isTranscriptVisible ? 'Hide Transcript' : 'Show Transcript'}
          >
            {isTranscriptVisible ? '▼ ' + t.liveChat : '💬 ' + t.liveChat}
          </button>

          <div className="transcript-overlay" style={{ display: isTranscriptVisible ? 'flex' : 'none' }}>
            <div className="transcript-messages">
              {transcript.map((entry, idx) => (
                <div
                  key={idx}
                  className={`transcript-entry transcript-${entry.role}`}
                  style={entry.cogColor ? {
                    /* ── Feature ③: COGNITIVE TRANSCRIPT COLORING ── */
                    borderLeft: entry.role === 'user' ? `2px solid ${entry.cogColor}` : undefined,
                    borderRight: entry.role === 'model' ? `2px solid ${entry.cogColor}` : undefined,
                    background: `${entry.cogColor}08`,
                  } : undefined}
                >
                  <span className="transcript-time">{entry.time}</span>
                  <span className="transcript-text">{entry.text}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </section>
      )}

      {appView === 'live' && isConnected && (
        <div className="breathing-hud" role="toolbar" aria-label={lang === 'ar' ? 'أدوات الجلسة' : 'Session tools'}>
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

      {appView === 'live' && isConnected && (
        <div className={`audio-diagnostic-badge ${audioDiag.className}`}>
          {audioDiag.text}
        </div>
      )}

      {/* ── Feature ①: BREATHING GUIDE ── */}
      <BreathingGuide
        active={showBreathing}
        lang={lang}
        onComplete={() => setShowBreathing(false)}
      />

      {/* ── Feature ②: SACRED PAUSE ── */}
      {appView === 'live' && isConnected && (
        <SacredPause tone={voiceTone} isConnected={isConnected} lang={lang} />
      )}

      <main id="main-canvas-content" className="app-canvas-main" role="main" aria-label={lang === 'ar' ? 'مساحة الدوائر' : 'Circle canvas'}>
        <h1 className="visually-hidden">{lang === 'ar' ? 'تطبيق دواير للجلسات الصوتية' : 'Dawayir live voice session app'}</h1>
        <DawayirCanvas ref={canvasRef} lang={lang} />
      </main>

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
    </div>
  );

}

export default App;


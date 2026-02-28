import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DawayirCanvas from './components/DawayirCanvas';
import './App.css';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const MIC_WORKLET_NAME = 'dawayir-mic-processor';
const MAX_RECONNECT_ATTEMPTS = 12;
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 20000;
const MIC_DEFER_TIMEOUT_MS = 5000;
// Client-side VAD removed — Gemini's built-in VAD handles turn detection.

const STRINGS = {
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
    brandName: 'دوائر',
    brandSub: 'مساحتك الذهنية الحية',
    statusActive: 'متصل',
    statusDisconnected: 'غير متصل',
    captureBtn: '📸 خليني أشوفك',
    capture: '🎯 التقاط',
    cancel: '✕ إغلاق',
    initialState: 'حالتك المبدئية',
    retake: '🔄 إعادة الالتقاط',
    connectedMsg: '✨ متصل بمساحتك الذهنية',
    connecting: 'جاري الاتصال',
    enterSpace: 'يلا نبدأ 🧠',
    enterSpaceVision: 'يلا نبدأ (مع الرؤية) 🧠',
    agentSpeaking: 'بيتكلم...',
    updateVisual: '📸 شوفني تاني',
    lookAtMe: '👁️ شوفني',
    endSession: 'إنهاء الجلسة',
    hint: 'اتكلم براحتك ✨',
    liveChat: '💬 الدردشة',
    memoryBank: 'بنك الذاكرة',
    dashboardBtn: '💾',
  }
};

const NODE_LABELS = {
  en: { 1: 'Awareness', 2: 'Science', 3: 'Truth' },
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' }
};

const arrayBufferToBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const pcm16ToFloat32 = (arrayBuffer) => {
  const dataView = new DataView(arrayBuffer);
  const float32 = new Float32Array(arrayBuffer.byteLength / 2);

  for (let i = 0; i < float32.length; i += 1) {
    const int16 = dataView.getInt16(i * 2, true);
    float32[i] = int16 / 32768;
  }

  return float32;
};

const float32ToPcm16Buffer = (float32Samples) => {
  const int16 = new Int16Array(float32Samples.length);
  for (let i = 0; i < float32Samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Samples[i]));
    int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return int16.buffer;
};

const downsampleFloat32 = (input, inputRate, outputRate = INPUT_SAMPLE_RATE) => {
  if (!input || input.length === 0) return new Float32Array(0);
  if (!Number.isFinite(inputRate) || inputRate <= 0) return input;
  if (inputRate === outputRate) return input;
  if (inputRate < outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  let outputIndex = 0;
  let inputIndex = 0;
  while (outputIndex < outputLength) {
    const nextInputIndex = Math.round((outputIndex + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (let i = inputIndex; i < nextInputIndex && i < input.length; i += 1) {
      sum += input[i];
      count += 1;
    }

    output[outputIndex] = count > 0 ? sum / count : 0;
    outputIndex += 1;
    inputIndex = nextInputIndex;
  }

  return output;
};

const tryParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// ---- Client-side circle command detection ----
const CIRCLE_IDS_CLIENT = {
  'وعي': 1, 'الوعي': 1, 'awareness': 1,
  'علم': 2, 'العلم': 2, 'knowledge': 2,
  'حقيقة': 3, 'الحقيقة': 3, 'حقيقه': 3, 'الحقيقه': 3, 'truth': 3,
};
const CIRCLE_ORDINALS_CLIENT = {
  'اولى': 1, 'الاولى': 1, 'أولى': 1, 'الأولى': 1, 'اول': 1, 'أول': 1,
  'تانية': 2, 'التانية': 2, 'تاني': 2, 'ثانية': 2, 'الثانية': 2,
  'تالتة': 3, 'التالتة': 3, 'تالت': 3, 'ثالثة': 3, 'الثالثة': 3,
};
function detectCircleCommandClient(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  let action = null;
  if (/صغ/i.test(t)) action = 'shrink';
  else if (/كب/i.test(t)) action = 'grow';
  else if (/غي/i.test(t) || /change/i.test(t) || /لون/i.test(t)) action = 'change';
  if (!action) return null;
  let circleId = null;
  for (const [name, id] of Object.entries(CIRCLE_IDS_CLIENT)) {
    if (t.includes(name)) { circleId = id; break; }
  }
  if (!circleId) {
    for (const [ord, id] of Object.entries(CIRCLE_ORDINALS_CLIENT)) {
      if (t.includes(ord)) { circleId = id; break; }
    }
  }
  if (!circleId && (/دا[يئ]ر/i.test(t) || /circle/i.test(t))) circleId = 1;
  if (!circleId) return null;
  const radius = action === 'shrink' ? 35 : action === 'grow' ? 90 : 60;
  const colors = { 1: '#FFD700', 2: '#00CED1', 3: '#4169E1' };
  return { id: circleId, radius, color: colors[circleId] || '#FFD700', action };
}

const getInlineData = (part) => part?.inlineData ?? part?.inline_data;
const getServerContent = (message) => message?.serverContent ?? message?.server_content;
const getModelTurn = (message) =>
  getServerContent(message)?.modelTurn ?? getServerContent(message)?.model_turn;
const getParts = (message) => getModelTurn(message)?.parts ?? [];
const getToolCall = (message) => message?.toolCall ?? message?.tool_call;
const isSetupCompleteMessage = (message) =>
  Boolean(message?.setupComplete || message?.setup_complete);
const getServerErrorMessage = (message) =>
  message?.serverError?.message ?? message?.server_error?.message;
const isInterruptedMessage = (message) =>
  Boolean(getServerContent(message)?.interrupted ?? getServerContent(message)?.is_interrupted);
const isAudioMimeType = (mimeType = '') => mimeType.startsWith('audio/pcm');
const parsePcmSampleRate = (mimeType = '') => {
  const match = /rate=(\d+)/i.exec(mimeType);
  if (!match) return OUTPUT_SAMPLE_RATE;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : OUTPUT_SAMPLE_RATE;
};
const normalizeBlob = (blob) => {
  const data = blob?.data;
  const mimeType = blob?.mimeType ?? blob?.mime_type;
  if (typeof data !== 'string') return null;
  return {
    data,
    mimeType: typeof mimeType === 'string' ? mimeType : 'audio/pcm',
  };
};
const getTurnDataAudioBlobs = (message) => {
  const turnData = message?.turn?.data;
  if (!turnData) return [];

  const candidates = Array.isArray(turnData) ? turnData : [turnData];
  return candidates
    .map((candidate) => (typeof candidate === 'string'
      ? { data: candidate, mimeType: 'audio/pcm' }
      : normalizeBlob(candidate)))
    .filter((blob) => blob && isAudioMimeType(blob.mimeType));
};

const Visualizer = ({ stream, isConnected }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!stream || !isConnected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(0, 245, 255, ${dataArray[i] / 255})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      analyser.disconnect();
      source.disconnect();
      audioContext.close();
    };
  }, [stream, isConnected]);

  return <canvas ref={canvasRef} className="visualizer" width="300" height="80" />;
}; const Dashboard = ({ onBack }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching reports:', err);
        setLoading(false);
      });
  }, []);

  const viewReport = (filename) => {
    fetch(`/api/reports/${filename}`)
      .then(res => res.text())
      .then(content => {
        setSelectedReport({ filename, content });
      });
  };

  return (
    <div className="dashboard-view">
      <header className="dashboard-header">
        <button className="back-btn" onClick={selectedReport ? () => setSelectedReport(null) : onBack}>
          {selectedReport ? '← Back to List' : '← Back to Live'}
        </button>
        <h2>{selectedReport ? 'Session Insight' : 'Memory Bank'}</h2>
      </header>

      {loading ? (
        <div className="loader">Analyzing memories...</div>
      ) : selectedReport ? (
        <div className="report-content">
          <pre>{selectedReport.content}</pre>
        </div>
      ) : (
        <div className="reports-list">
          {reports.length === 0 ? (
            <p className="no-reports">No sessions recorded yet.</p>
          ) : (
            reports.map(report => (
              <div key={report.name} className="report-card" onClick={() => viewReport(report.name)}>
                <div className="report-icon">📄</div>
                <div className="report-info">
                  <span className="report-name">{report.name.replace('.md', '')}</span>
                  <span className="report-date">{new Date(report.updated).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

function App() {
  const [lang, setLang] = useState('ar');
  const t = STRINGS[lang];
  const [status, setStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastEvent, setLastEvent] = useState('none');
  const [toolCallsCount, setToolCallsCount] = useState(0);
  const [_reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [appView, setAppView] = useState('live'); // 'live' or 'dashboard'
  const [transcript, setTranscript] = useState([]); // Live transcript entries
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const isAgentSpeakingRef = useRef(false);
  const [commandText, setCommandText] = useState('');

  // Update canvas node labels when language changes
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

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const micStreamRef = useRef(null);
  const micContextRef = useRef(null);
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
  const sessionContextRef = useRef([]); // Stores last few text segments for context preservation
  const restoreAfterGeminiReconnectRef = useRef(false);
  const lastRestorePromptAtRef = useRef(0);
  const deferMicStartUntilFirstAgentReplyRef = useRef(false);
  const isMicActiveRef = useRef(false);
  const textReleaseTimeoutRef = useRef(null);
        const lastAgentContentAtRef = useRef(0);
  const vadStateRef = useRef({
    speaking: false,
    speechMs: 0,
    silenceMs: 0,
    noiseFloor: 90,
  });

  useEffect(() => {
    isMicActiveRef.current = isMicActive;
  }, [isMicActive]);

  const startCamera = async () => {
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
        console.log("[Camera] ✅ Camera activated successfully");
      } else {
        console.error("[Camera] videoRef.current is null!");
        setErrorMessage("Video element not ready. Please try again.");
      }
    } catch (err) {
      console.error("[Camera] ❌ Error:", err);
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
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
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
  };

  const speakerContextRef = useRef(null);
  const activeSourcesRef = useRef(new Set());
  const nextPlaybackTimeRef = useRef(0);
  const speakingDebounceRef = useRef(null);
  const pcmWorkletRef = useRef(null);
  const workletReadyRef = useRef(false);
  const lastPcmPushAtRef = useRef(0);
  const pendingPcmChunksRef = useRef([]);
  const pcmFlushScheduledRef = useRef(false);
    const lastModelAudioAtRef = useRef(Date.now());

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

  const resetAgentTurnState = useCallback(() => {
    if (textReleaseTimeoutRef.current) {
      window.clearTimeout(textReleaseTimeoutRef.current);
      textReleaseTimeoutRef.current = null;
    }
    lastAgentContentAtRef.current = 0;
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
  }, []);

  const stopPlayback = useCallback(() => {
    if (textReleaseTimeoutRef.current) {
      window.clearTimeout(textReleaseTimeoutRef.current);
      textReleaseTimeoutRef.current = null;
    }
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
  }, []);

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
  // The worklet runs on the audio thread — completely immune to main thread jank.
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
    [flushPcmChunks]
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

    setIsMicActive(false);
  }, []);

  const sendRealtimeAudioChunk = useCallback((arrayBuffer, sampleRate) => {
    if (!arrayBuffer || !setupCompleteRef.current) {
      return;
    }
    // Block mic while agent is speaking to prevent echo feedback
    // which causes Gemini's VAD to think user is interrupting.
    if (isAgentSpeakingRef.current) {
      return;
    }

    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send all audio continuously to Gemini — let Gemini's built-in VAD
    // handle turn detection. No client-side gating or audioStreamEnd.
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
  }, []);

  const startMicrophone = useCallback(async () => {
    await stopMicrophone();
    vadStateRef.current = {
      speaking: false,
      speechMs: 0,
      silenceMs: 0,
      noiseFloor: 90,
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser.');
    }

    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: INPUT_SAMPLE_RATE,
        sampleSize: 16,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const micContext = new AudioContextCtor({ sampleRate: INPUT_SAMPLE_RATE });
    if (micContext.state === 'suspended') {
      await micContext.resume();
    }

    const source = micContext.createMediaStreamSource(stream);
    const silentGain = micContext.createGain();
    silentGain.gain.value = 0;
    let workletReady = false;

    if (micContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        await micContext.audioWorklet.addModule(new URL('./audio/mic-processor.js', import.meta.url));
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
  }, [sendRealtimeAudioChunk, stopMicrophone]);

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
          // Smart ID resolution — handle strings like "circle", "awareness", etc.
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
          console.log(`[App] Updating node ${safeId} (raw: ${rawId}):`, updates);
          canvasRef.current?.updateNode(safeId, updates);
          // Auto-pulse so the change is visually obvious
          canvasRef.current?.pulseNode(safeId);
        } else if (call.name === 'highlight_node') {
          const id = Number(args.id);
          const currentNodes = canvasRef.current?.getNodes() || [];
          if (!Number.isFinite(id) || !currentNodes.some(n => n.id === id)) {
            throw new Error(`Invalid or non-existent node id: ${args.id}`);
          }

          console.log(`[App] Highlighting node ${id}`);
          canvasRef.current?.pulseNode(id);
        } else if (call.name === 'save_mental_map') {
          const nodes = canvasRef.current?.getNodes() || [];
          console.log(`[App] Saving mental map with ${nodes.length} nodes`);
          responses.push({
            id: call.id,
            name: call.name,
            response: { nodes, ok: true },
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
  }, []);

  // Handle text command submission - detect circles locally + send to Gemini
  const handleTextCommand = useCallback((text) => {
    if (!text?.trim()) return;
    const cmd = detectCircleCommandClient(text);
    if (cmd) {
      console.log(`[App] Local circle command detected: "${text}" =>`, cmd);
      canvasRef.current?.updateNode(cmd.id, { radius: cmd.radius, color: cmd.color });
      canvasRef.current?.pulseNode(cmd.id);
      setToolCallsCount((prev) => prev + 1);
      setLastEvent(`local_cmd:${cmd.action}`);
    }
    // Also send to server/Gemini so the agent can respond conversationally
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        },
      }));
    }
  }, []);

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
  }, [captureSnapshot, lang, startCamera, stopCamera]);

  const handleCircleAction = useCallback((circleId, action) => {
    const radius = action === 'shrink' ? 35 : action === 'grow' ? 90 : 60;
    const colors = { 1: '#FFD700', 2: '#00CED1', 3: '#4169E1' };
    console.log(`[App] Circle button: ${action} circle ${circleId}`);
    canvasRef.current?.updateNode(circleId, { radius, color: colors[circleId] });
    canvasRef.current?.pulseNode(circleId);
    setToolCallsCount((prev) => prev + 1);
    setLastEvent(`btn_cmd:${action}_${circleId}`);
  }, []);

  const disconnect = useCallback(async () => {
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
  }, [closeSpeakerContext, resetAgentTurnState, stopMicrophone, stopPlayback]);

  const connect = useCallback(async () => {
    if (isStarting || isConnected) return;
    const existingSocket = wsRef.current;
    if (
      existingSocket
      && (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    manualCloseRef.current = false;

    setErrorMessage('');
    setIsStarting(true);
    setStatus('Connecting...');
    setLastEvent('connecting');

    try {
      await ensureSpeakerContext();
    } catch (error) {
      setStatus('Error');
      setErrorMessage(error.message);
      setIsStarting(false);
      setLastEvent('speaker_context_error');
      return;
    }

    const socket = new WebSocket(backendUrl);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;

    socket.onopen = () => {
      if (wsRef.current !== socket) return;
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);
      setIsConnected(true);
      setIsStarting(false);
      setStatus('Connected (waiting setupComplete)');
      setLastEvent('ws_open');
    };

    socket.onmessage = async (event) => {
      if (wsRef.current !== socket) return;
      let message = null;

      if (typeof event.data === 'string') {
        message = tryParseJson(event.data);
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

      // Diagnostic: log every parsed server message type
      const msgKeys = Object.keys(message).join(',');
      console.log(`[WS] Message received — keys: [${msgKeys}]`);

      // Debug: log transcription data forwarded from server
      if (message.debugTranscription) {
        const dt = message.debugTranscription;
        console.log(`%c[Transcription:${dt.type}] "${dt.text}" (finished=${dt.finished})`, 'color: #00ff00; font-weight: bold');
        return; // Don't process debug messages further
      }

      const serverStatus = message?.serverStatus ?? message?.server_status;
      if (serverStatus?.state === 'gemini_reconnecting') {
        if (bootstrapPromptSentRef.current) {
          restoreAfterGeminiReconnectRef.current = true;
        }
        lastModelAudioAtRef.current = Date.now();
        // DON'T stop playback or reset state — let buffered audio finish naturally.
        // Cutting audio mid-speech causes jarring stuttering.
        const attempt = Number(serverStatus.attempt || 0);
        const maxAttempts = Number(serverStatus.maxAttempts || MAX_RECONNECT_ATTEMPTS);
        const delaySeconds = Math.max(1, Math.ceil(Number(serverStatus.delayMs || RECONNECT_DELAY_MS) / 1000));
        setStatus(`Gemini reconnecting (${attempt}/${maxAttempts}) in ${delaySeconds}s...`);
        setLastEvent('gemini_reconnecting');
        return;
      }
      if (serverStatus?.state === 'gemini_recovered') {
        // Don't reset — audio may still be playing from before reconnect
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
        setStatus('Connected to Gemini Live');
        setLastEvent('setup_complete');
        lastModelAudioAtRef.current = Date.now();
        const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;
        // On first connect: reset everything. On Gemini reconnect: let audio finish.
        if (!isGeminiReconnect) {
          resetAgentTurnState();
          stopPlayback();
        }
        // Pre-initialize AudioWorklet so first audio plays without delay
        ensurePcmWorklet().catch(() => {});
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
              const now = Date.now();
              if (now - lastRestorePromptAtRef.current < 6000) {
                restoreAfterGeminiReconnectRef.current = false;
                return;
              }
              lastRestorePromptAtRef.current = now;
              // Send a minimal, invisible context restore — no "reconnection" language.
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
              setLastEvent('mic_autostart_timeout');
            } catch (error) {
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
      // Do NOT start mic here during first response — getUserMedia blocks the main thread
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
        // Update live transcript with latest agent text
        setTranscript(prev => [
          ...prev,
          { role: 'agent', text: textParts.join(' '), time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
        ].slice(-4));

        // No audio yet — release mic after a short wait
        // so conversation doesn't get stuck on text-only responses.
        if (textReleaseTimeoutRef.current) {
          window.clearTimeout(textReleaseTimeoutRef.current);
        }
        textReleaseTimeoutRef.current = window.setTimeout(() => {
          if (isAgentSpeakingRef.current) {
            setIsAgentSpeaking(false);
            isAgentSpeakingRef.current = false;
          }
          textReleaseTimeoutRef.current = null;
        }, 1200);
      }

      const turnAudioBlobs = getTurnDataAudioBlobs(message);
      const selectedAudioBlobs = directAudioBlobs.length > 0 ? directAudioBlobs : turnAudioBlobs;
      if (selectedAudioBlobs.length > 0) {
        if (textReleaseTimeoutRef.current) {
          window.clearTimeout(textReleaseTimeoutRef.current);
          textReleaseTimeoutRef.current = null;
        }
        setIsAgentSpeaking(true);
        isAgentSpeakingRef.current = true;
        for (const blob of selectedAudioBlobs) {
          if (blob?.data) {
            await playPcmChunk(base64ToArrayBuffer(blob.data), parsePcmSampleRate(blob.mimeType));
            setLastEvent('audio_chunk');
          }
        }
        return;
      }
    };

    socket.onerror = () => {
      if (wsRef.current !== socket) return;
      setStatus('Error');
      setErrorMessage('WebSocket error. Retrying if possible.');
      setIsStarting(false);
      setLastEvent('ws_error');
    };

    socket.onclose = async () => {
      if (wsRef.current !== socket) return;
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
    backendUrl,
    capturedImage,
    ensureSpeakerContext,
    ensurePcmWorklet,
    handleToolCall,
    isConnected,
    isStarting,
    lang,
    resetAgentTurnState,
    playPcmChunk,
    startMicrophone,
    stopMicrophone,
    stopPlayback,
  ]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="App">
      <div className="overlay">
        {appView === 'dashboard' ? (
          <Dashboard onBack={() => setAppView('live')} />
        ) : (
          <>
            {/* Brand Header */}
            <div className="brand-header">
              <div className="brand-logo-row">
                <div>
                  <div className="brand-name">{t.brandName}</div>
                  <div className="brand-arabic">{t.brandSub}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'} className="icon-btn lang-toggle" onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')} title="Toggle Language">
                    {lang === 'en' ? 'AR' : 'EN'}
                  </button>
                  {!isConnected && !isStarting && (
                    <button aria-label={t.memoryBank} className="icon-btn" onClick={() => setAppView('dashboard')} title={t.memoryBank}>
                      {t.dashboardBtn}
                    </button>
                  )}
                </div>
              </div>
              <div className={`status-badge ${statusClass}`}>
                <span className="dot"></span>
                {isConnected ? t.statusActive : status === 'Disconnected' ? t.statusDisconnected : status}
              </div>
            </div>

            {/* Main Controls */}
            <div className="section">
              {!isConnected && !isStarting && (
                <div className="camera-setup">
                  <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

                  {!isCameraActive && !capturedImage ? (
                    <button className="primary-btn" onClick={startCamera}>
                      {t.captureBtn}
                    </button>
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
              )}

              <button
                className={`primary-btn ${isConnected ? 'secure-link' : ''}`}
                onClick={connect}
                disabled={isConnected || isStarting}
              >
                {isConnected ? (
                  t.connectedMsg
                ) : isStarting ? (
                  <div className="loading-container">
                    <span className="loading-text">{t.connecting}</span>
                    <div className="spinner"><div className="spinner-ring"></div></div>
                  </div>
                ) : (
                  capturedImage
                    ? t.enterSpaceVision
                    : t.enterSpace
                )}
              </button>
            </div>

            {/* Connected Activity */}
            {isConnected && (
              <div className="section">
                <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

                {isAgentSpeaking && (
                  <div className="ai-state-bar">
                    <div className="wave">
                      <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    {t.agentSpeaking}
                  </div>
                )}

                <div className="visual-feedback">
                  <Visualizer stream={micStreamRef.current} isConnected={isConnected} />
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
                      <button className="retake-live-btn" onClick={startCamera} style={{ flex: 1 }}>
                        {t.updateVisual}
                      </button>
                      <button className="retake-live-btn" onClick={handleLookAtMe} style={{ flex: 1, background: "rgba(255, 209, 102, 0.15)", color: "#FFD700", borderColor: "rgba(255, 209, 102, 0.4)" }}>
                        {t.lookAtMe}
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
                  <button className="secondary disconnect-btn" onClick={disconnect}>
                    {t.endSession}
                  </button>
                </div>
              </div>
            )}

            {/* Circle Control Panel */}
            {isConnected && (
              <div className="circle-controls">
                <div className="circle-controls-row">
                  {[
                    { id: 1, label: lang === 'ar' ? 'الوعي' : 'Awareness', color: '#FFD700' },
                    { id: 2, label: lang === 'ar' ? 'العلم' : 'Knowledge', color: '#00CED1' },
                    { id: 3, label: lang === 'ar' ? 'الحقيقة' : 'Truth', color: '#4169E1' },
                  ].map(c => (
                    <div key={c.id} className="circle-control-item">
                      <span className="circle-control-label" style={{ color: c.color }}>{c.label}</span>
                      <div className="circle-control-btns">
                        <button aria-label={`${lang === 'ar' ? 'صغّر' : 'Shrink'} ${c.label}`} onClick={() => handleCircleAction(c.id, 'shrink')} title={lang === 'ar' ? 'صغّر' : 'Shrink'}>−</button>
                        <button aria-label={`${lang === 'ar' ? 'كبّر' : 'Grow'} ${c.label}`} onClick={() => handleCircleAction(c.id, 'grow')} title={lang === 'ar' ? 'كبّر' : 'Grow'}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Text command input */}
                <form className="command-input-form" onSubmit={(e) => {
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

            {isConnected && !errorMessage && (
              <p className={`hint ${lang === 'en' ? 'ltr' : ''}`}>{t.hint}</p>
            )}

            {errorMessage && <p className="error-message">&#x26A0;&#xFE0F; {errorMessage}</p>}

            <footer className="footer-info" style={{ display: 'none' }}>
              <span>Backend: {backendUrl}</span>
              <span>Mic: {isMicActive ? 'on' : 'off'} | Tools: {toolCallsCount} | Event: {lastEvent}</span>
            </footer>
          </>
        )}
      </div>

      {/* Live Transcript Overlay */}
      {isConnected && transcript.length > 0 && (
        <div className="transcript-overlay">
          <div className="transcript-header">{t.liveChat}</div>
          {transcript.map((entry, idx) => (
            <div key={idx} className={`transcript-entry transcript-${entry.role}`}>
              <span className="transcript-time">{entry.time}</span>
              <span className="transcript-text">{entry.text.substring(0, 120)}{entry.text.length > 120 ? '...' : ''}</span>
            </div>
          ))}
        </div>
      )}

      <DawayirCanvas ref={canvasRef} />
    </div>
  );
}

export default App;

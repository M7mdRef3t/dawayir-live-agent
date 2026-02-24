import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DawayirCanvas from './components/DawayirCanvas';
import './App.css';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const MIC_WORKLET_NAME = 'dawayir-mic-processor';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

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

const tryParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

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
  const [status, setStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastEvent, setLastEvent] = useState('none');
  const [toolCallsCount, setToolCallsCount] = useState(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [appView, setAppView] = useState('live'); // 'live' or 'dashboard'

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
  const manualCloseRef = useRef(false);
  const sessionContextRef = useRef([]); // Stores last few text segments for context preservation

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Force play for browsers that need it
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Autoplay prevented, user interaction needed", playErr);
        }
        setIsCameraActive(true);
        console.log("[Camera] Video stream started successfully");
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setErrorMessage("Camera access denied. Visual Pulse Check skipped.");
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

    try {
      await speakerContextRef.current.close();
    } catch {
      // Ignore close race errors.
    }

    speakerContextRef.current = null;
    nextPlaybackTimeRef.current = 0;
    activeSourcesRef.current.clear();
  }, []);

  const stopPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Ignore if source already stopped.
      }

      try {
        source.disconnect();
      } catch {
        // Ignore disconnect errors.
      }
    }

    activeSourcesRef.current.clear();

    if (speakerContextRef.current) {
      nextPlaybackTimeRef.current = speakerContextRef.current.currentTime;
    } else {
      nextPlaybackTimeRef.current = 0;
    }
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

  const playPcmChunk = useCallback(
    async (arrayBuffer) => {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;

      const audioContext = await ensureSpeakerContext();
      const float32 = pcm16ToFloat32(arrayBuffer);
      if (float32.length === 0) return;

      const audioBuffer = audioContext.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const startAt = Math.max(audioContext.currentTime + 0.02, nextPlaybackTimeRef.current);
      source.start(startAt);
      nextPlaybackTimeRef.current = startAt + audioBuffer.duration;

      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        try {
          source.disconnect();
        } catch {
          // Ignore disconnect errors.
        }
      };
    },
    [ensureSpeakerContext]
  );

  const stopMicrophone = useCallback(async () => {
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
    if (!arrayBuffer || !setupCompleteRef.current) return;

    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

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
          if (!int16arrayBuffer) return;
          sendRealtimeAudioChunk(int16arrayBuffer, micContext.sampleRate);
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
        sendRealtimeAudioChunk(float32ToPcm16Buffer(input), micContext.sampleRate);
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
          const id = Number(args.id);
          const currentNodes = canvasRef.current?.getNodes() || [];
          if (!Number.isFinite(id) || !currentNodes.some(n => n.id === id)) {
            throw new Error(`Invalid or non-existent node id: ${args.id}`);
          }

          const updates = { ...args };
          delete updates.id;
          console.log(`[App] Updating node ${id}:`, updates);
          canvasRef.current?.updateNode(id, updates);
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

    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && responses.length > 0) {
      socket.send(
        JSON.stringify({
          toolResponse: {
            functionResponses: responses,
          },
        })
      );
    }
    setToolCallsCount((prev) => prev + functionCalls.length);
    setLastEvent(`tool_call:${functionCalls.length}`);
  }, []);

  const disconnect = useCallback(async () => {
    manualCloseRef.current = true;
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    const socket = wsRef.current;
    wsRef.current = null;

    setupCompleteRef.current = false;
    bootstrapPromptSentRef.current = false;
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
  }, [closeSpeakerContext, stopMicrophone, stopPlayback]);

  const connect = useCallback(async () => {
    if (isStarting || isConnected) return;
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
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);
      setIsConnected(true);
      setIsStarting(false);
      setStatus('Connected (waiting setupComplete)');
      setLastEvent('ws_open');
    };

    socket.onmessage = async (event) => {
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

      const serverError = getServerErrorMessage(message);
      if (serverError) {
        setStatus('Error');
        setErrorMessage(serverError);
        setLastEvent('server_error');
        return;
      }

      if (isSetupCompleteMessage(message)) {
        setupCompleteRef.current = true;
        setStatus('Connected to Gemini Live');
        setLastEvent('setup_complete');

        try {
          await startMicrophone();
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const isReconnect = reconnectAttemptRef.current > 0;
            const currentNodes = canvasRef.current?.getNodes() || [];

            if (!bootstrapPromptSentRef.current) {
              bootstrapPromptSentRef.current = true;
              console.log('[App] Sending bootstrap prompt...');

              const parts = [
                {
                  text: `مهم جداً: ابدأ الكلام فوراً بدون انتظار المستخدم. 
                  أهلًا بك! أنا "دوائر"، رفيقك في رحلة استكشاف مساحتك الذهنية. 
                  ابدأ بالترحيب بالمستخدم بلهجة مصرية ودودة جداً وبأسلوب هادئ،
                  وحلل تعبير وجهه المبدئي (متوتر، سعيد، مرهق) إذا وجدته في الصورة، 
                  واذكر ذلك بشكل لطيف جداً، ثم اطلب منه أن يعبر عن مشاعره لكي نراها سوياً في الدوائر التي أمامه.`,
                }
              ];

              if (capturedImage) {
                const base64Data = capturedImage.split(',')[1];
                parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
                console.log('[App] Including captured snapshot in bootstrap.');
              }

              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts }], turnComplete: true }
              }));
            } else if (isReconnect) {
              const nodesContext = currentNodes.map(n => `- ${n.label} (id: ${n.id}, size: ${n.radius}, color: ${n.color})`).join('\n');
              const lastConv = sessionContextRef.current.length > 0
                ? `آخر حاجة كنا بنقولها كانت: "${sessionContextRef.current.join(' ... ')}"`
                : "";
              const promptText = `حصل انقطاع بسيط في الاتصال ورجعنا تاني. 
                خليك فاكر إننا بنكمل نفس الجلسة. 
                ${lastConv}
                حالة الدوائر الحالية قدام المستخدم هي:
                ${nodesContext}
                كمل كلامك مع المستخدم من مكان ما وقفنا بأسلوب طبيعي جداً كأن مفيش حاجة حصلت، 
                ومتقولش "أهلاً بك" تاني ولا تعتذر عن الانقطاع بشكل رسمي، ادخل في الموضوع فوراً بلهجة مصرية ودودة.`;
              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true }
              }));
            }
          }
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
        stopPlayback();
        setLastEvent('server_interrupted');
      }

      const parts = getParts(message);
      const audioParts = Array.isArray(parts)
        ? parts.filter((part) =>
          isAudioMimeType(getInlineData(part)?.mimeType)
          || isAudioMimeType(getInlineData(part)?.mime_type)
        )
        : [];

      for (const part of audioParts) {
        const inline = getInlineData(part);
        if (inline?.data) {
          await playPcmChunk(base64ToArrayBuffer(inline.data));
          setLastEvent('audio_chunk');
        }
      }

      // Capture text for context preservation
      const textParts = Array.isArray(parts) ? parts.filter(p => p.text).map(p => p.text) : [];
      if (textParts.length > 0) {
        sessionContextRef.current = [...sessionContextRef.current, ...textParts].slice(-5);
      }

      const turnAudioBlobs = getTurnDataAudioBlobs(message);
      if (audioParts.length === 0 && turnAudioBlobs.length === 0) return;

      for (const blob of turnAudioBlobs) {
        if (blob?.data) {
          await playPcmChunk(base64ToArrayBuffer(blob.data));
          setLastEvent('audio_chunk_turn_data');
        }
      }
    };

    socket.onerror = () => {
      setStatus('Error');
      setErrorMessage('WebSocket error. Retrying if possible.');
      setIsStarting(false);
      setLastEvent('ws_error');
    };

    socket.onclose = async () => {
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
        reconnectAttemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);
        setStatus(`Reconnecting (${nextAttempt}/${MAX_RECONNECT_ATTEMPTS})...`);
        setLastEvent('ws_closed_retrying');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
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
    handleToolCall,
    isConnected,
    isStarting,
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
            <header>
              <div className="title-row">
                <h1>Dawayir Live Agent</h1>
                {!isConnected && !isStarting && (
                  <button className="icon-btn" onClick={() => setAppView('dashboard')} title="Memory Bank">
                    💾
                  </button>
                )}
              </div>
              <div className={`status-badge ${statusClass}`}>
                <span className="dot"></span> {isConnected ? 'Live Session Active' : status}
              </div>
            </header>

            <section className="main-controls">
              {!isConnected && !isStarting && (
                <div className="camera-setup">
                  {!isCameraActive && !capturedImage ? (
                    <button className="primary-btn" onClick={startCamera}>
                      📸 Start Visual Pulse Check
                    </button>
                  ) : isCameraActive ? (
                    <div className="video-capture-flow">
                      <div className="video-container">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="camera-actions-row">
                        <button className="capture-btn" onClick={captureSnapshot}>
                          🎯 Take Snapshot
                        </button>
                        <button className="cancel-btn" onClick={stopCamera}>
                          ❌ Close Camera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="captured-preview-container">
                      <div className="preview-heading">Your initial mindset:</div>
                      <img src={capturedImage} className="pulse-preview-large" alt="Captured" />
                      <button className="retake-btn" onClick={() => { setCapturedImage(null); startCamera(); }}>
                        🔄 Retake Snapshot
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
                  '✨ Connection Secured'
                ) : isStarting ? (
                  <div className="loading-container">
                    <span className="loading-text">Establishing Link</span>
                    <div className="spinner">
                      <div className="spinner-ring"></div>
                    </div>
                  </div>
                ) : (
                  capturedImage
                    ? 'Enter the Mental Space (with Vision)'
                    : 'Enter the Mental Space (Audio Only)'
                )}
              </button>

              {isConnected && (
                <div className="activity-container">
                  <div className="visual-feedback">
                    <Visualizer stream={micStreamRef.current} isConnected={isConnected} />
                    {capturedImage && (
                      <div className="snapshot-preview">
                        <img src={capturedImage} alt="Pulse Snapshot" />
                        <span>Initial Mindset</span>
                      </div>
                    )}
                  </div>

                  <div className="connected-actions">
                    {!isCameraActive ? (
                      <button className="secondary retake-live-btn" onClick={startCamera}>
                        📸 Update Visual Context
                      </button>
                    ) : (
                      <div className="live-camera-mini">
                        <div className="video-container-mini">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="mini-camera-actions">
                          <button className="mini-capture-btn" onClick={captureSnapshot}>
                            🎯 Capture
                          </button>
                          <button className="mini-cancel-btn" onClick={stopCamera}>
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <button className="secondary disconnect-btn" onClick={disconnect}>
                      Finish Session
                    </button>
                  </div>
                </div>
              )}
            </section>

            {isConnected && !errorMessage && (
              <p className="hint">
                Speak naturally and explore your mental space.
              </p>
            )}

            {errorMessage && <p className="error-message">⚠️ {errorMessage}</p>}

            <footer className="footer-info">
              <span>Backend: {backendUrl} | Client: v1.0.1</span>
              <br />
              <span>
                Mic: {isMicActive ? 'on' : 'off'} | Retries: {reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS} | Tools: {toolCallsCount} | Event: {lastEvent}
              </span>
            </footer>
          </>
        )}
      </div>
      <DawayirCanvas ref={canvasRef} />
    </div>
  );
}

export default App;

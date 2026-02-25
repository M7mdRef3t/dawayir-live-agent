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
  const [transcript, setTranscript] = useState([]); // Live transcript entries
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

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
                  text: '\u0645\u0647\u0645 \u062c\u062f\u0627\u064b: \u0627\u0628\u062f\u0623 \u0627\u0644\u0643\u0644\u0627\u0645 \u0641\u0648\u0631\u0627\u064b \u0628\u062f\u0648\u0646 \u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645. ' +
                    '\u0623\u0647\u0644\u0627\u064b \u0628\u0643! \u0623\u0646\u0627 "\u062f\u0648\u0627\u0626\u0631"\u060c \u0631\u0641\u064a\u0642\u0643 \u0641\u064a \u0631\u062d\u0644\u0629 \u0627\u0633\u062a\u0643\u0634\u0627\u0641 \u0645\u0633\u0627\u062d\u062a\u0643 \u0627\u0644\u0630\u0647\u0646\u064a\u0629. ' +
                    '\u0627\u0628\u062f\u0623 \u0628\u0627\u0644\u062a\u0631\u062d\u064a\u0628 \u0628\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0644\u0647\u062c\u0629 \u0645\u0635\u0631\u064a\u0629 \u0648\u062f\u0648\u062f\u0629 \u062c\u062f\u0627\u064b \u0648\u0628\u0623\u0633\u0644\u0648\u0628 \u0647\u0627\u062f\u0626\u060c ' +
                    '\u0648\u062d\u0644\u0644 \u062a\u0639\u0628\u064a\u0631 \u0648\u062c\u0647\u0647 \u0627\u0644\u0645\u0628\u062f\u0626\u064a (\u0645\u062a\u0648\u062a\u0631\u060c \u0633\u0639\u064a\u062f\u060c \u0645\u0631\u0647\u0642) \u0625\u0630\u0627 \u0648\u062c\u062f\u062a\u0647 \u0641\u064a \u0627\u0644\u0635\u0648\u0631\u0629\u060c ' +
                    '\u0648\u0627\u0630\u0643\u0631 \u0630\u0644\u0643 \u0628\u0634\u0643\u0644 \u0644\u0637\u064a\u0641 \u062c\u062f\u0627\u064b\u060c \u062b\u0645 \u0627\u0637\u0644\u0628 \u0645\u0646\u0647 \u0623\u0646 \u064a\u0639\u0628\u0631 \u0639\u0646 \u0645\u0634\u0627\u0639\u0631\u0647 \u0644\u0643\u064a \u0646\u0631\u0627\u0647\u0627 \u0633\u0648\u064a\u0627\u064b \u0641\u064a \u0627\u0644\u062f\u0648\u0627\u0626\u0631 \u0627\u0644\u062a\u064a \u0623\u0645\u0627\u0645\u0647. ' +
                    'CRITICAL: You MUST call update_node tool BEFORE speaking to update the circles!'
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
                ? `\u0622\u062e\u0631 \u062d\u0627\u062c\u0629 \u0643\u0646\u0627 \u0628\u0646\u0642\u0648\u0644\u0647\u0627 \u0643\u0627\u0646\u062a: "${sessionContextRef.current.join(' ... ')}"`
                : "";
              const promptText = '\u062d\u0635\u0644 \u0627\u0646\u0642\u0637\u0627\u0639 \u0628\u0633\u064a\u0637 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0648\u0631\u062c\u0639\u0646\u0627 \u062a\u0627\u0646\u064a. ' +
                '\u062e\u0644\u064a\u0643 \u0641\u0627\u0643\u0631 \u0625\u0646\u0646\u0627 \u0628\u0646\u0643\u0645\u0644 \u0646\u0641\u0633 \u0627\u0644\u062c\u0644\u0633\u0629. ' +
                lastConv + ' ' +
                '\u062d\u0627\u0644\u0629 \u0627\u0644\u062f\u0648\u0627\u0626\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0642\u062f\u0627\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0647\u064a:\n' + nodesContext + '\n' +
                '\u0643\u0645\u0644 \u0643\u0644\u0627\u0645\u0643 \u0645\u0639 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0645\u0627 \u0648\u0642\u0641\u0646\u0627 \u0628\u0623\u0633\u0644\u0648\u0628 \u0637\u0628\u064a\u0639\u064a \u062c\u062f\u0627\u064b.';
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

    // Capture text for context preservation and live transcript
    const textParts = Array.isArray(parts) ? parts.filter(p => p.text).map(p => p.text) : [];
    if (textParts.length > 0) {
      sessionContextRef.current = [...sessionContextRef.current, ...textParts].slice(-5);
      setIsAgentSpeaking(true);
      // Update live transcript with latest agent text
      setTranscript(prev => [
        ...prev,
        { role: 'agent', text: textParts.join(' '), time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
      ].slice(-4));
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
          {/* Brand Header */}
          <div className="brand-header">
            <div className="brand-logo-row">
              <div>
                <div className="brand-name">&#x62F;&#x648;&#x627;&#x626;&#x631;</div>
                <div className="brand-arabic">&#x645;&#x633;&#x627;&#x62D;&#x62A;&#x643; &#x627;&#x644;&#x630;&#x647;&#x646;&#x64A;&#x629; &#x627;&#x644;&#x62D;&#x64A;&#x629;</div>
              </div>
              {!isConnected && !isStarting && (
                <button className="icon-btn" onClick={() => setAppView('dashboard')} title="&#x628;&#x646;&#x643; &#x627;&#x644;&#x630;&#x627;&#x643;&#x631;&#x629;">
                  &#x1F4BE;
                </button>
              )}
            </div>
            <div className={`status-badge ${statusClass}`}>
              <span className="dot"></span>
              {isConnected ? 'الجلسة نشطة' : status === 'Disconnected' ? 'غير متصل' : status}
            </div>
          </div>

          {/* Main Controls */}
          <div className="section">
            {!isConnected && !isStarting && (
              <div className="camera-setup">
                <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

                {!isCameraActive && !capturedImage ? (
                  <button className="primary-btn" onClick={startCamera}>
                    &#x1F4F8; &#x641;&#x62D;&#x635; &#x627;&#x644;&#x62D;&#x627;&#x644;&#x629; &#x627;&#x644;&#x628;&#x635;&#x631;&#x64A;&#x629;
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
                      <button className="capture-btn" onClick={captureSnapshot}>&#x1F3AF; &#x627;&#x644;&#x62A;&#x642;&#x627;&#x637;</button>
                      <button className="cancel-btn" onClick={stopCamera}>&#x2715; &#x625;&#x63A;&#x644;&#x627;&#x642;</button>
                    </div>
                  </div>
                ) : (
                  <div className="captured-preview-container">
                    <div className="preview-heading">&#x62D;&#x627;&#x644;&#x62A;&#x643; &#x627;&#x644;&#x645;&#x628;&#x62F;&#x626;&#x64A;&#x629;</div>
                    <img src={capturedImage} className="pulse-preview-large" alt="Captured" />
                    <button className="retake-btn" onClick={() => { setCapturedImage(null); setTimeout(() => setIsCameraActive(true), 50); setTimeout(startCamera, 100); }}>
                      &#x1F504; &#x625;&#x639;&#x627;&#x62F;&#x629; &#x627;&#x644;&#x62A;&#x642;&#x627;&#x637;
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
                '✨ متصل بمساحتك الذهنية'
              ) : isStarting ? (
                <div className="loading-container">
                  <span className="loading-text">&#x62C;&#x627;&#x631;&#x64A; &#x627;&#x644;&#x627;&#x62A;&#x635;&#x627;&#x644;</span>
                  <div className="spinner"><div className="spinner-ring"></div></div>
                </div>
              ) : (
                capturedImage
                  ? 'ادخل المساحة الذهنية (مع الرؤية)'
                  : 'ادخل المساحة الذهنية 🧠'
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
                  &#x62F;&#x648;&#x627;&#x626;&#x631; &#x64A;&#x62A;&#x643;&#x644;&#x645;...
                </div>
              )}

              <div className="visual-feedback">
                <Visualizer stream={micStreamRef.current} isConnected={isConnected} />
                {capturedImage && (
                  <div className="snapshot-preview">
                    <img src={capturedImage} alt="Pulse Snapshot" />
                    <span>&#x62D;&#x627;&#x644;&#x62A;&#x643; &#x627;&#x644;&#x645;&#x628;&#x62F;&#x626;&#x64A;&#x629;</span>
                  </div>
                )}
              </div>

              <div className="connected-actions">
                {!isCameraActive ? (
                  <button className="retake-live-btn" onClick={startCamera}>
                    &#x1F4F8; &#x62A;&#x62D;&#x62F;&#x64A;&#x62B; &#x627;&#x644;&#x633;&#x64A;&#x627;&#x642; &#x627;&#x644;&#x628;&#x635;&#x631;&#x64A;
                  </button>
                ) : (
                  <div className="live-camera-mini">
                    <div className="video-container-mini">
                      <video autoPlay playsInline muted
                        ref={(el) => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="mini-camera-actions">
                      <button className="mini-capture-btn" onClick={captureSnapshot}>&#x1F3AF; &#x627;&#x644;&#x62A;&#x642;&#x627;&#x637;</button>
                      <button className="mini-cancel-btn" onClick={stopCamera}>&#x2715; &#x625;&#x644;&#x63A;&#x627;&#x621;</button>
                    </div>
                  </div>
                )}
                <button className="secondary disconnect-btn" onClick={disconnect}>
                  &#x625;&#x646;&#x647;&#x627;&#x621; &#x627;&#x644;&#x62C;&#x644;&#x633;&#x629;
                </button>
              </div>
            </div>
          )}

          {isConnected && !errorMessage && (
            <p className="hint">&#x62A;&#x62D;&#x62F;&#x62B; &#x628;&#x62D;&#x631;&#x64A;&#x629; &#x648;&#x627;&#x633;&#x62A;&#x643;&#x634;&#x641; &#x645;&#x633;&#x627;&#x62D;&#x62A;&#x643; &#x627;&#x644;&#x630;&#x647;&#x646;&#x64A;&#x629;. &#x2728;</p>
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
        <div className="transcript-header">&#x1F4AC; &#x627;&#x644;&#x645;&#x62D;&#x627;&#x62F;&#x62B;&#x629; &#x627;&#x644;&#x62D;&#x64A;&#x629;</div>
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

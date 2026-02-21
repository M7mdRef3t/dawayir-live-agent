import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DawayirCanvas from './components/DawayirCanvas';
import './App.css';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const MIC_WORKLET_NAME = 'dawayir-mic-processor';

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

function App() {
  const [status, setStatus] = useState('Disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const wsRef = useRef(null);
  const canvasRef = useRef(null);
  const setupCompleteRef = useRef(false);

  const micStreamRef = useRef(null);
  const micContextRef = useRef(null);
  const micSourceRef = useRef(null);
  const micWorkletRef = useRef(null);
  const micProcessorRef = useRef(null);
  const micSilentGainRef = useRef(null);
  const bootstrapPromptSentRef = useRef(false);

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
  }, [sendRealtimeAudioChunk, stopMicrophone]);

  const handleToolCall = useCallback((toolCall) => {
    const functionCalls = Array.isArray(toolCall?.functionCalls) ? toolCall.functionCalls : [];
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
          if (!Number.isFinite(id)) {
            throw new Error('Invalid node id for update_node.');
          }

          const updates = { ...args };
          delete updates.id;
          canvasRef.current?.updateNode(id, updates);
        } else if (call.name === 'highlight_node') {
          const id = Number(args.id);
          if (!Number.isFinite(id)) {
            throw new Error('Invalid node id for highlight_node.');
          }

          canvasRef.current?.pulseNode(id);
        } else {
          throw new Error(`Unsupported tool: ${call.name}`);
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: { result: { ok: true } },
        });
      } catch (error) {
        responses.push({
          id: call.id,
          name: call.name,
          response: { result: { ok: false, error: error.message } },
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
  }, []);

  const disconnect = useCallback(async () => {
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
  }, [closeSpeakerContext, stopMicrophone, stopPlayback]);

  const connect = useCallback(async () => {
    if (isStarting || isConnected) return;

    setErrorMessage('');
    setIsStarting(true);
    setStatus('Connecting...');

    try {
      await ensureSpeakerContext();
    } catch (error) {
      setStatus('Error');
      setErrorMessage(error.message);
      setIsStarting(false);
      return;
    }

    const socket = new WebSocket(backendUrl);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setIsStarting(false);
      setStatus('Connected (waiting setupComplete)');
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

      if (message.setupComplete) {
        setupCompleteRef.current = true;
        setStatus('Connected to Gemini Live');

        try {
          await startMicrophone();
          if (!bootstrapPromptSentRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
            bootstrapPromptSentRef.current = true;
            wsRef.current.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: 'ابدأ بتحية قصيرة بالمصري للمستخدم، وبعدها نبهه يطلب تعديل الدواير بصوته.',
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                },
              })
            );
          }
        } catch (error) {
          setStatus('Error');
          setErrorMessage(error.message);
        }
        return;
      }

      if (message.toolCall) {
        handleToolCall(message.toolCall);
      }

      if (message.serverContent?.interrupted) {
        stopPlayback();
      }

      const parts = message.serverContent?.modelTurn?.parts;
      if (!Array.isArray(parts)) return;

      const audioParts = parts.filter(
        (part) => part?.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData?.data
      );

      for (const part of audioParts) {
        await playPcmChunk(base64ToArrayBuffer(part.inlineData.data));
      }
    };

    socket.onerror = () => {
      setStatus('Error');
      setErrorMessage('WebSocket error. Verify backend is running and URL is correct.');
      setIsStarting(false);
    };

    socket.onclose = async () => {
      wsRef.current = null;
      setupCompleteRef.current = false;
      bootstrapPromptSentRef.current = false;
      setIsConnected(false);
      setIsStarting(false);

      await stopMicrophone();
      stopPlayback();

      setStatus((prev) => (prev === 'Error' ? prev : 'Disconnected'));
    };
  }, [
    backendUrl,
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
        <h1>Dawayir Live Agent</h1>
        <p>
          Status: <span className={statusClass}>{status}</span>
        </p>
        <p className="backend">Backend: {backendUrl}</p>
        <div className="controls">
          <button onClick={connect} disabled={isConnected || isStarting}>
            {isConnected
              ? 'Live Interaction Active'
              : isStarting
                ? 'Connecting...'
                : 'Start Gemini Live Journey'}
          </button>
          {isConnected && (
            <button className="secondary" onClick={disconnect}>
              Disconnect
            </button>
          )}
          {isConnected && (
            <p className="hint">
              Speak naturally: Gemini will listen, respond with audio, and update the circles live.
            </p>
          )}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      </div>
      <DawayirCanvas ref={canvasRef} />
    </div>
  );
}

export default App;

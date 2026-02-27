import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isValidReportFilename } from './report-filename.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Knowledge Base at startup for grounding
let knowledgeBase = null;
try {
    const kbPath = path.join(__dirname, 'knowledge_base.json');
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    console.log('[dawayir-server] Knowledge Base loaded successfully:', knowledgeBase.platform_name);
} catch (err) {
    console.error('[dawayir-server:error] Failed to load knowledge_base.json:', err.message);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
    server,
    maxPayload: 5 * 1024 * 1024 // 5MB limit for images
});

// Middleware for JSON and CORS (if needed)
app.use(express.json());

// API: List session reports
app.get('/api/reports', async (req, res) => {
    try {
        if (!BUCKET_NAME) throw new Error('Bucket not configured');
        const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: 'session_report_' });
        const reports = files.map(file => ({
            name: file.name,
            updated: file.metadata.updated,
            size: file.metadata.size
        })).sort((a, b) => new Date(b.updated) - new Date(a.updated));
        res.json(reports);
    } catch (error) {
        console.error('Error listing reports:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get report content
app.get('/api/reports/:filename', async (req, res) => {
    const { filename } = req.params;
    if (!isValidReportFilename(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
    }

    try {
        if (!BUCKET_NAME) throw new Error('Bucket not configured');
        const file = storage.bucket(BUCKET_NAME).file(filename);
        const [content] = await file.download();
        res.send(content.toString());
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(404).json({ error: 'Report not found' });
    }
});

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'alrehla-486806';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
const storage = new Storage({ projectId: PROJECT_ID });

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const isDebug = LOG_LEVEL === 'debug';
const logInfo = (...args) => console.log('[dawayir-server]', ...args);
const logDebug = (...args) => {
    if (isDebug) {
        console.log('[dawayir-server:debug]', ...args);
    }
};
const logError = (...args) => console.error('[dawayir-server:error]', ...args);

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    logError('GEMINI_API_KEY is not set in .env');
    process.exit(1);
}
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
logInfo(`[DEBUG] LIVE_MODEL value: "${LIVE_MODEL}"`);
const LIVE_API_VERSION = process.env.GEMINI_API_VERSION || 'v1alpha';

const ai = new GoogleGenAI({
    apiKey: API_KEY,
    apiVersion: LIVE_API_VERSION,
});

// ---- Server-side circle command detection (fallback if model skips tool calls) ----
const CIRCLE_IDS = {
    'وعي': '1',
    'الوعي': '1',
    'awareness': '1',
    'علم': '2',
    'العلم': '2',
    'knowledge': '2',
    'science': '2',
    'حقيقة': '3',
    'الحقيقة': '3',
    'truth': '3',
    'دايرة': null,
    'دائرة': null,
    'الدائرة': null,
    'circle': null,
};

const CIRCLE_ORDINALS = {
    'اولى': '1',
    'أولى': '1',
    'الأولى': '1',
    'الاولى': '1',
    'اول': '1',
    'أول': '1',
    'تانية': '2',
    'الثانية': '2',
    'ثانية': '2',
    'تاني': '2',
    'تالتة': '3',
    'الثالثة': '3',
    'ثالثة': '3',
    'تالت': '3',
};

function detectCircleCommand(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.trim().toLowerCase();

    let action = null;
    if (/صغ/.test(t) || /shrink/.test(t) || /smaller/.test(t)) action = 'shrink';
    else if (/كبر/.test(t) || /grow/.test(t) || /bigger/.test(t)) action = 'grow';
    else if (/غي/.test(t) || /change/.test(t) || /adjust/.test(t)) action = 'change';
    if (!action) return null;

    let circleId = null;
    for (const [name, id] of Object.entries(CIRCLE_IDS)) {
        if (id && t.includes(name)) {
            circleId = id;
            break;
        }
    }

    if (!circleId) {
        for (const [ord, id] of Object.entries(CIRCLE_ORDINALS)) {
            if (t.includes(ord)) {
                circleId = id;
                break;
            }
        }
    }

    if (!circleId && (/(دا[يئ]ر|دائ)/.test(t) || /circle/.test(t))) {
        circleId = '1';
    }
    if (!circleId) return null;

    const radius = action === 'shrink' ? '35' : action === 'grow' ? '90' : '60';
    const colors = { '1': '#FFD700', '2': '#00CED1', '3': '#4169E1' };
    return {
        id: circleId,
        radius,
        color: colors[circleId] || '#FFD700',
    };
}
// --- Sentiment-based auto-update (backup when Gemini doesn't call update_node) ---
const SENTIMENT_KEYWORDS = {
    1: {
        positive: ['هدوء', 'هادي', 'سكينة', 'سلام', 'تأمل', 'مركز', 'واعي', 'صافي', 'مرتاح', 'راحة', 'calm', 'peace', 'mindful', 'relaxed'],
        negative: ['مشتت', 'قلق', 'توتر', 'مضغوط', 'تايه', 'anxious', 'stressed', 'confused'],
    },
    2: {
        positive: ['فضول', 'تعلم', 'اكتشاف', 'فاهم', 'ذكي', 'فكرة', 'معرفة', 'نمو', 'curious', 'learn', 'discover', 'idea', 'growth'],
        negative: ['جاهل', 'مش فاهم', 'ضايع', 'lost', 'clueless'],
    },
    3: {
        positive: ['صادق', 'قوي', 'شجاع', 'حقيقي', 'واثق', 'ثبات', 'إيمان', 'strong', 'brave', 'honest', 'confident', 'authentic'],
        negative: ['خايف', 'ضعيف', 'كذب', 'شك', 'weak', 'afraid', 'doubt'],
    },
};
const SENTIMENT_COLORS = {
    1: { positive: '#00F5FF', negative: '#334455' },
    2: { positive: '#00FF41', negative: '#335533' },
    3: { positive: '#FF00E5', negative: '#553355' },
};
let lastSentimentUpdateAt = 0;
const SENTIMENT_THROTTLE_MS = 10000;
let accumulatedTranscript = '';

function autoUpdateCirclesFromSentiment(text, sendToClient) {
    accumulatedTranscript += ' ' + text;
    const now = Date.now();
    if (now - lastSentimentUpdateAt < SENTIMENT_THROTTLE_MS) return;
    const fullText = accumulatedTranscript.toLowerCase();
    const updates = [];
    for (const [circleId, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
        let score = 0;
        for (const word of keywords.positive) { if (fullText.includes(word)) score += 1; }
        for (const word of keywords.negative) { if (fullText.includes(word)) score -= 1; }
        if (score !== 0) {
            const isPositive = score > 0;
            const intensity = Math.min(Math.abs(score), 3);
            const radius = isPositive ? String(50 + intensity * 15) : String(50 - intensity * 10);
            const color = isPositive ? SENTIMENT_COLORS[circleId].positive : SENTIMENT_COLORS[circleId].negative;
            updates.push({ id: String(circleId), radius, color });
        }
    }
    if (updates.length > 0) {
        lastSentimentUpdateAt = now;
        accumulatedTranscript = '';
        for (const update of updates) {
            sendToClient({ toolCall: { functionCalls: [{ id: `sentiment_${now}_${update.id}`, name: 'update_node', args: update }] } });
        }
    }
}

const GEMINI_RECONNECT_MAX_ATTEMPTS = Number(process.env.GEMINI_RECONNECT_MAX_ATTEMPTS || 10);
const GEMINI_RECONNECT_BASE_DELAY_MS = Number(process.env.GEMINI_RECONNECT_BASE_DELAY_MS || 1200);
const GEMINI_RECONNECT_MAX_DELAY_MS = Number(process.env.GEMINI_RECONNECT_MAX_DELAY_MS || 15000);
const MAX_PENDING_CLIENT_MESSAGES = 120;

const tools = [
    {
        functionDeclarations: [
            {
                name: "update_node",
                description: "Silently update a visual element. Call this when you sense the user's emotional state shifting. NEVER mention this tool or its effects in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "ID: 1, 2, or 3" },
                        radius: { type: "STRING", description: "Size (30-100)" },
                        color: { type: "STRING", description: "Hex color" }
                    },
                    required: ["id", "radius", "color"]
                },
            },
            {
                name: "highlight_node",
                description: "Silently highlight a visual element. NEVER mention this in speech.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "STRING", description: "ID: 1, 2, or 3" }
                    },
                    required: ["id"]
                }
            },
            {
                name: "get_expert_insight",
                description: "Retrieve psychological principles from the Al-Rehla framework. Use this when the user asks for deep advice or when you need to ground your response in the knowledge base.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        topic: { type: "STRING", description: "The psychological concept or topic to look up" }
                    },
                    required: ["topic"]
                }
            },
            {
                name: "save_mental_map",
                description: "Save the current state of the mental circles to memory. Use this when the user asks to save, or after a significant breakthrough.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        session_name: { type: "STRING", description: "Optional name for the session" }
                    }
                }
            },
            {
                name: "generate_session_report",
                description: "Generate and save a summary report of the session. Use at the end of the session.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING", description: "Executive summary of the session" },
                        insights: { type: "STRING", description: "Core psychological insights discovered" },
                        recommendations: { type: "STRING", description: "Actionable recommendations for the user" }
                    },
                    required: ["summary", "insights"]
                }
            }
        ]
    }
];

const systemInstruction = {
    parts: [{
        text: `You are a warm Egyptian friend. Speak ONLY in Egyptian Arabic dialect (عامية مصرية).

Rules:
1. One short sentence + one question. Then STOP and wait.
2. Never talk about what happens on screen. Never describe visual changes.
3. When you see a photo: say what you feel about the person in one sentence, then ask one question. Stop.
4. Be natural. Never explain yourself. If asked what you do — just say you're a friend who listens.
5. Call update_node silently whenever you sense a shift in the user's emotional state. Never mention it. Never announce it. Just call it.
6. When calling update_node, always send exactly these fields: id, radius, color. Never use size, expansion, scale, or any substitute field name.
7. Radius must be a numeric string from 30 to 100. Color must be a hex color string like #FFD700.
8. When you ask a question: STOP. Wait for user reply. NEVER answer your own question.

Keep every response under 15 words total.`
    }],
};

const toCompatMessage = (message) => {
    const payload = JSON.parse(JSON.stringify(message ?? {}));

    if (payload.setupComplete && payload.setup_complete === undefined) {
        payload.setup_complete = payload.setupComplete;
    }
    if (payload.serverContent && payload.server_content === undefined) {
        payload.server_content = payload.serverContent;
    }
    if (payload.toolCall && payload.tool_call === undefined) {
        payload.tool_call = payload.toolCall;
    }
    if (payload.toolCallCancellation && payload.tool_call_cancellation === undefined) {
        payload.tool_call_cancellation = payload.toolCallCancellation;
    }
    if (payload.usageMetadata && payload.usage_metadata === undefined) {
        payload.usage_metadata = payload.usageMetadata;
    }

    return payload;
};

const toBlobFromChunk = (chunk) => {
    const data = chunk?.data;
    const mimeType = chunk?.mimeType ?? chunk?.mime_type;
    if (typeof data !== 'string' || typeof mimeType !== 'string') {
        return null;
    }
    return { data, mimeType };
};

const isAudioOnlyRealtimeInput = (realtimeInput) => {
    if (!realtimeInput || typeof realtimeInput !== 'object') {
        return false;
    }

    const mediaChunks = Array.isArray(realtimeInput.mediaChunks)
        ? realtimeInput.mediaChunks
        : Array.isArray(realtimeInput.media_chunks)
            ? realtimeInput.media_chunks
            : [];

    if (mediaChunks.length === 0) {
        return false;
    }

    const hasNonAudioMedia = mediaChunks.some((chunk) => {
        const mimeType = chunk?.mimeType ?? chunk?.mime_type ?? '';
        return typeof mimeType === 'string' && !mimeType.startsWith('audio/');
    });

    if (hasNonAudioMedia) {
        return false;
    }

    const hasText = typeof realtimeInput.text === 'string' && realtimeInput.text.trim().length > 0;
    const hasAudioStreamEnd = Boolean(realtimeInput.audioStreamEnd ?? realtimeInput.audio_stream_end);
    return !hasText && !hasAudioStreamEnd;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

wss.on('connection', (ws) => {
    logInfo('Client connected');
    let audioChunkCount = 0;
    let serverMessageCount = 0;
    let clientClosed = false;
    let session = null;
    let connectingSession = false;
    let reconnectInProgress = false;
    let reconnectAttempt = 0;
    const pendingClientMessages = [];
    let lastCmdText = '';
    let lastCmdAt = 0;
    let inputTranscriptBuffer = '';
    let inputTranscriptTimer = null;
    const INPUT_TRANSCRIPT_FLUSH_MS = 1500; // flush after 1.5s of silence

    function flushInputTranscriptBuffer() {
        if (!inputTranscriptBuffer.trim()) return;
        const fullText = inputTranscriptBuffer.trim();
        inputTranscriptBuffer = '';
        const cmd = detectCircleCommand(fullText);
        if (cmd) {
            const now = Date.now();
            if (fullText !== lastCmdText || now - lastCmdAt > 3000) {
                lastCmdText = fullText;
                lastCmdAt = now;
                logInfo(`[CMD] Detected circle command from accumulated transcription: "${fullText}" => ${JSON.stringify(cmd)}`);
                sendToClient({
                    toolCall: {
                        functionCalls: [{
                            id: `server_cmd_${now}`,
                            name: 'update_node',
                            args: cmd,
                        }],
                    },
                });
            }
        }
    }

    const sendToClient = (payload) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
        }
    };

    const sendServerStatus = (state, extra = {}) => {
        sendToClient({
            serverStatus: {
                state,
                ...extra,
            },
        });
    };

    const queueClientMessage = (message) => {
        if (!message || typeof message !== 'object') {
            return;
        }

        const realtimeInput = message.realtimeInput ?? message.realtime_input;
        if (isAudioOnlyRealtimeInput(realtimeInput)) {
            // Audio is high-frequency and becomes stale during reconnect windows.
            return;
        }

        if (pendingClientMessages.length >= MAX_PENDING_CLIENT_MESSAGES) {
            pendingClientMessages.shift();
        }
        pendingClientMessages.push(message);
    };

    const flushPendingMessages = () => {
        if (!session || pendingClientMessages.length === 0) {
            return;
        }

        while (pendingClientMessages.length > 0) {
            const message = pendingClientMessages.shift();
            try {
                processClientMessage(message);
            } catch (error) {
                logError('Failed to process queued client message:', error);
            }
        }
    };

    const processRealtimeInput = (realtimeInput) => {
        if (!session || !realtimeInput || typeof realtimeInput !== 'object') {
            return;
        }

        const mediaChunks = Array.isArray(realtimeInput.mediaChunks)
            ? realtimeInput.mediaChunks
            : Array.isArray(realtimeInput.media_chunks)
                ? realtimeInput.media_chunks
                : [];
        for (const chunk of mediaChunks) {
            const blob = toBlobFromChunk(chunk);
            if (!blob) {
                continue;
            }

            if (blob.mimeType.startsWith('audio/')) {
                audioChunkCount += 1;
                if (audioChunkCount === 1 || audioChunkCount % 100 === 0) {
                    logInfo(`Client audio chunks received: ${audioChunkCount} (mime: ${blob.mimeType})`);
                }
                session.sendRealtimeInput({ audio: blob });
            } else {
                session.sendRealtimeInput({ media: blob });
            }
        }

        const audioStreamEnd = Boolean(realtimeInput.audioStreamEnd ?? realtimeInput.audio_stream_end);
        if (audioStreamEnd) {
            session.sendRealtimeInput({ audioStreamEnd: true });
        }

        if (typeof realtimeInput.text === 'string' && realtimeInput.text.trim().length > 0) {
            session.sendRealtimeInput({ text: realtimeInput.text });
        }
    };

    const processClientMessage = (message) => {
        if (!session) {
            queueClientMessage(message);
            return;
        }

        const realtimeInput = message.realtimeInput ?? message.realtime_input;
        const clientContent = message.clientContent ?? message.client_content;
        const toolResponse = message.toolResponse ?? message.tool_response;

        if (realtimeInput) {
            processRealtimeInput(realtimeInput);
        }

        if (clientContent) {
            logDebug('Client content turn received');
            // Detect circle commands from text input (reliable fallback)
            const turns = clientContent.turns || clientContent.turn || [];
            const turnsArr = Array.isArray(turns) ? turns : [turns];
            for (const turn of turnsArr) {
                const parts = turn?.parts || [];
                for (const part of parts) {
                    if (part?.text) {
                        const cmd = detectCircleCommand(part.text);
                        if (cmd) {
                            const now = Date.now();
                            logInfo(`[CMD] Detected circle command from text input: "${part.text}" => ${JSON.stringify(cmd)}`);
                            sendToClient({
                                toolCall: {
                                    functionCalls: [{
                                        id: `text_cmd_${now}`,
                                        name: 'update_node',
                                        args: cmd,
                                    }],
                                },
                            });
                        }
                    }
                }
            }
            session.sendClientContent(clientContent);
        }

        if (toolResponse) {
            logDebug('Client tool response received');

            // Filter out visual tool responses — they were already resolved server-side
            const responses = toolResponse.functionResponses || toolResponse.function_responses || [];
            const visualToolPrefixes = ['gemini_visual_', 'sentiment_', 'server_cmd_', 'text_cmd_', 'client_cmd_'];
            const filteredResponses = responses.filter(resp => {
                const id = resp.id || '';
                return !visualToolPrefixes.some(prefix => id.startsWith(prefix));
            });
            if (filteredResponses.length === 0) {
                logInfo('[FILTER] All tool responses were visual — not forwarding to Gemini');
                return;
            }
            // Update the tool response with only non-visual responses
            if (filteredResponses.length < responses.length) {
                toolResponse.functionResponses = filteredResponses;
                toolResponse.function_responses = filteredResponses;
                logInfo(`[FILTER] Filtered ${responses.length - filteredResponses.length} visual tool response(s)`);
            }

            // Intercept save_mental_map for GCS upload
            for (const resp of filteredResponses) {
                if (resp.name === 'save_mental_map' && resp.response?.result?.ok) {
                    const nodes = resp.response.result.nodes;
                    if (nodes && BUCKET_NAME) {
                        const filename = `mental_map_${Date.now()}.json`;
                        logInfo(`Uploading mental map to GCS: ${filename}`);

                        const file = storage.bucket(BUCKET_NAME).file(filename);
                        file.save(JSON.stringify(nodes, null, 2), {
                            contentType: 'application/json',
                        }).then(() => {
                            logInfo('GCS Upload Successful');
                        }).catch(err => {
                            logError('GCS Upload Failed:', err);
                        });
                    }
                }

                if (resp.name === 'generate_session_report' && resp.response?.result?.ok) {
                    const { summary, insights, recommendations, timestamp } = resp.response.result;
                    if (BUCKET_NAME) {
                        const filename = `session_report_${Date.now()}.md`;
                        const content = `
# Dawayir Session Report
**Date:** ${new Date().toLocaleString()}

## Executive Summary
${summary}

## Core Insights
${insights}

## Recommendations
${recommendations || "N/A"}

---
*Generated by Dawayir Live Agent (Gemini 2.0)*
                        `;

                        logInfo(`Uploading session report to GCS: ${filename}`);
                        const file = storage.bucket(BUCKET_NAME).file(filename);
                        file.save(content, {
                            contentType: 'text/markdown',
                        }).then(() => {
                            logInfo('GCS Report Upload Successful');
                        }).catch(err => {
                            logError('GCS Report Upload Failed:', err);
                        });
                    }
                }
            }

            // Fallback for tools the client handles visually (update_node, highlight_node)
            session.sendToolResponse(toolResponse);
        }
    };

    const scheduleReconnect = async (reason = 'unknown') => {
        if (clientClosed || reconnectInProgress) {
            return;
        }
        reconnectInProgress = true;

        while (!clientClosed && !session && reconnectAttempt < GEMINI_RECONNECT_MAX_ATTEMPTS) {
            reconnectAttempt += 1;
            const delayMs = Math.min(
                GEMINI_RECONNECT_BASE_DELAY_MS * (2 ** (reconnectAttempt - 1)),
                GEMINI_RECONNECT_MAX_DELAY_MS
            );

            logInfo(`Gemini reconnect scheduled (#${reconnectAttempt}/${GEMINI_RECONNECT_MAX_ATTEMPTS}) after ${delayMs}ms. reason=${reason}`);
            sendServerStatus('gemini_reconnecting', {
                attempt: reconnectAttempt,
                maxAttempts: GEMINI_RECONNECT_MAX_ATTEMPTS,
                delayMs,
            });

            await sleep(delayMs);
            if (clientClosed || session) {
                break;
            }

            await connectLiveSession();
        }

        reconnectInProgress = false;

        if (!clientClosed && !session) {
            logError('Gemini reconnect attempts exhausted.');
            sendToClient({
                serverError: {
                    message: 'Gemini connection dropped and retries were exhausted.',
                },
            });
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
    };

    const connectLiveSession = async () => {
        if (clientClosed || session || connectingSession) {
            return;
        }
        connectingSession = true;

        try {
            const liveSession = await ai.live.connect({
                model: LIVE_MODEL,
                config: {
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: "Aoede",
                            }
                        }
                    },
                    responseModalities: ["AUDIO"],
                    maxOutputTokens: 200,
                    thinkingConfig: { thinkingBudget: 0 },
                    tools,
                    systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        logInfo(`Connected to Gemini Live API via Google GenAI SDK (${LIVE_MODEL})`);
                    },
                    onmessage: (message) => {
                        if (reconnectAttempt > 0) {
                            reconnectAttempt = 0;
                            sendServerStatus('gemini_recovered');
                        }
                        serverMessageCount += 1;
                        const payload = toCompatMessage(message);

                        // Always log first 200 chars to debug no-response issue
                        const payloadStr = JSON.stringify(payload);
                        logInfo(`Gemini msg #${serverMessageCount} (${payloadStr.length} bytes): ${payloadStr.substring(0, 200)}`);

                        // ---- Diagnostic: log serverContent sub-keys ----
                        const sc = payload.serverContent || payload.server_content;
                        if (sc) {
                            const scKeys = Object.keys(sc).filter(k => sc[k] != null);
                            if (scKeys.length > 0 && !scKeys.every(k => k === 'modelTurn' || k === 'model_turn')) {
                                logInfo(`[SC:keys] ${scKeys.join(', ')}`);
                            }

                            // ---- Transcription-based command detection (fallback) ----
                            const inTx = sc.inputTranscription || sc.input_transcription;
                            if (inTx?.text) {
                                logInfo(`[Transcription:in] "${inTx.text}" (finished=${inTx.finished})`);
                                // Forward transcription to client for debugging
                                sendToClient({ debugTranscription: { type: 'input', text: inTx.text, finished: inTx.finished } });
                                // Accumulate fragments instead of processing each one
                                inputTranscriptBuffer += inTx.text;
                                // Reset the flush timer on each new fragment
                                if (inputTranscriptTimer) clearTimeout(inputTranscriptTimer);
                                if (inTx.finished) {
                                    // Sentence complete — flush immediately
                                    flushInputTranscriptBuffer();
                                } else {
                                    // Set a timeout to flush after silence
                                    inputTranscriptTimer = setTimeout(flushInputTranscriptBuffer, INPUT_TRANSCRIPT_FLUSH_MS);
                                }
                            }
                            const outTx = sc.outputTranscription || sc.output_transcription;
                            if (outTx?.text) {
                                logInfo(`[Transcription:out] "${outTx.text}" (finished=${outTx.finished})`);
                                sendToClient({ debugTranscription: { type: 'output', text: outTx.text, finished: outTx.finished } });
                                // Auto-update circles based on sentiment (backup for when Gemini doesn't call update_node)
                                autoUpdateCirclesFromSentiment(outTx.text, sendToClient);
                            }
                        }

                        // Intercept server-side tool calls before forwarding.
                        // Important: don't drop non-tool payload content.
                        const toolCall = payload.toolCall || payload.tool_call;
                        if (toolCall) {
                            const functionCalls = toolCall.functionCalls || toolCall.function_calls || [];
                            const serverTools = ['get_expert_insight', 'generate_session_report'];
                            // Visual tools: forward to client for rendering, but resolve server-side
                            // so Gemini doesn't get a tool response that triggers repetition
                            const visualTools = ['update_node', 'highlight_node'];
                            const clientTools = functionCalls.filter(fc => !serverTools.includes(fc.name) && !visualTools.includes(fc.name));
                            const serverOnlyTools = functionCalls.filter(fc => serverTools.includes(fc.name));
                            const visualOnlyTools = functionCalls.filter(fc => visualTools.includes(fc.name));

                            // Resolve server-side tools immediately
                            if (serverOnlyTools.length > 0) {
                                resolveServerToolCalls(serverOnlyTools, session);
                            }

                            // Visual tools: forward to client for rendering + resolve immediately on server
                            if (visualOnlyTools.length > 0) {
                                // Send to client so circles update visually
                                sendToClient({
                                    toolCall: {
                                        functionCalls: visualOnlyTools.map(fc => ({
                                            ...fc,
                                            id: `gemini_visual_${fc.id || Date.now()}`,
                                        })),
                                    },
                                });
                                // Resolve immediately on Gemini side so it doesn't repeat speech
                                const visualResponses = visualOnlyTools.map(fc => ({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: { ok: true } },
                                }));
                                try {
                                    session.sendToolResponse({ functionResponses: visualResponses });
                                    logInfo(`[VISUAL] Resolved ${visualOnlyTools.length} visual tool(s) server-side`);
                                } catch (err) {
                                    logError('[VISUAL] Failed to send tool response:', err);
                                }
                            }

                            // Forward remaining client tools
                            const payloadWithoutTools = { ...payload };
                            delete payloadWithoutTools.toolCall;
                            delete payloadWithoutTools.tool_call;
                            const hasNonToolPayload = Object.keys(payloadWithoutTools).length > 0;

                            if (clientTools.length > 0) {
                                const clientPayload = { ...payload };
                                const clientToolCall = { ...(clientPayload.toolCall || clientPayload.tool_call) };
                                clientToolCall.functionCalls = clientTools;
                                clientToolCall.function_calls = clientTools;
                                clientPayload.toolCall = clientToolCall;
                                clientPayload.tool_call = clientToolCall;
                                sendToClient(clientPayload);
                            } else if (hasNonToolPayload) {
                                sendToClient(payloadWithoutTools);
                            }
                            return;
                        }

                        sendToClient(payload);
                    },
                    onerror: (error) => {
                        logError('Gemini Live session error:', error);
                    },
                    onclose: (event) => {
                        logInfo(`Gemini Live session closed. code=${event?.code ?? 'n/a'} reason=${String(event?.reason ?? '')}`);
                        if (session === liveSession) {
                            session = null;
                        }
                        if (!clientClosed) {
                            void scheduleReconnect(`onclose:${event?.code ?? 'n/a'}`);
                        }
                    },
                },
            });

            session = liveSession;
            if (clientClosed && session) {
                session.close();
                session = null;
                return;
            }

            flushPendingMessages();
        } catch (error) {
            logError('Failed to initialize Gemini Live session via SDK:', error);
            if (!clientClosed) {
                session = null;
                void scheduleReconnect('connect_exception');
            }
        } finally {
            connectingSession = false;
        }
    };

    void connectLiveSession();

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            logDebug('Ignoring unexpected binary frame from client.');
            return;
        }

        try {
            const message = JSON.parse(data.toString());
            processClientMessage(message);
        } catch (error) {
            logDebug('Ignoring non-JSON client frame.');
            if (isDebug) {
                logDebug(error);
            }
        }
    });

    ws.on('close', () => {
        clientClosed = true;
        logInfo('Client disconnected');
        if (session) {
            try {
                session.close();
            } catch (error) {
                logError('Error closing Gemini Live session:', error);
            }
        }
    });
});

// ---- Server-side Tool Resolution ----
const resolveServerToolCalls = (functionCalls, liveSession) => {
    if (!liveSession || functionCalls.length === 0) return;

    const responses = [];

    for (const call of functionCalls) {
        let args = call?.args ?? {};
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch { args = {}; }
        }

        try {
            if (call.name === 'get_expert_insight') {
                const topic = (args.topic || '').toLowerCase().trim();
                logInfo(`[Grounding] get_expert_insight called for topic: "${topic}"`);

                if (!knowledgeBase) {
                    throw new Error('Knowledge base not loaded');
                }

                // Search principles by ID or by content match
                const principle = knowledgeBase.principles.find(p =>
                    p.id === topic ||
                    p.concept.toLowerCase().includes(topic) ||
                    p.description.toLowerCase().includes(topic)
                );

                if (principle) {
                    logInfo(`[Grounding] Found principle: ${principle.concept}`);
                    responses.push({
                        id: call.id,
                        name: call.name,
                        response: {
                            result: {
                                ok: true,
                                platform: knowledgeBase.platform_name,
                                concept: principle.concept,
                                description: principle.description,
                                guideline: principle.guideline,
                                persona_rules: knowledgeBase.agent_persona_rules
                            }
                        }
                    });
                } else {
                    // Return all principles as general guidance
                    logInfo(`[Grounding] No exact match for "${topic}", returning full framework`);
                    responses.push({
                        id: call.id,
                        name: call.name,
                        response: {
                            result: {
                                ok: true,
                                platform: knowledgeBase.platform_name,
                                philosophy: knowledgeBase.core_philosophy,
                                all_principles: knowledgeBase.principles.map(p => ({
                                    concept: p.concept,
                                    description: p.description,
                                    guideline: p.guideline
                                })),
                                tone_system: knowledgeBase.tone_system,
                                orbital_dictionary: knowledgeBase.orbital_dictionary,
                                success_stories: knowledgeBase.success_stories,
                                emergency_protocol: knowledgeBase.emergency_protocol,
                                dawayir_model: knowledgeBase.dawayir_circle_model,
                                persona_rules: knowledgeBase.agent_persona_rules
                            }
                        }
                    });
                }
            } else if (call.name === 'save_mental_map') {
                const sessionName = args.session_name || `session_${Date.now()}`;
                logInfo(`[Memory] save_mental_map called: ${sessionName}`);
                // We resolve the tool call, the GCS upload happens when client sends back nodes
                responses.push({
                    id: call.id,
                    name: call.name,
                    response: { result: { ok: true, saved_as: sessionName } }
                });
            } else if (call.name === 'generate_session_report') {
                const { summary, insights, recommendations } = args;
                logInfo(`[Memory] generate_session_report called`);

                if (BUCKET_NAME) {
                    const filename = `session_report_${Date.now()}.md`;
                    const content = `# Dawayir Session Report\n**Date:** ${new Date().toLocaleString()}\n\n## Executive Summary\n${summary || 'N/A'}\n\n## Core Insights\n${insights || 'N/A'}\n\n## Recommendations\n${recommendations || 'N/A'}\n\n---\n*Generated by Dawayir Live Agent (Gemini 2.5 Flash)*`;

                    const file = storage.bucket(BUCKET_NAME).file(filename);
                    file.save(content, { contentType: 'text/markdown' })
                        .then(() => logInfo(`GCS Report Upload Successful: ${filename}`))
                        .catch(err => logError('GCS Report Upload Failed:', err));
                }

                responses.push({
                    id: call.id,
                    name: call.name,
                    response: { result: { ok: true, summary, insights, recommendations, timestamp: new Date().toISOString() } }
                });
            }
        } catch (error) {
            logError(`[Tool] Server-side tool error (${call.name}):`, error);
            responses.push({
                id: call.id,
                name: call.name,
                response: { result: { ok: false, error: error.message } }
            });
        }
    }

    if (responses.length > 0) {
        logInfo(`[Tool] Sending ${responses.length} server-resolved tool response(s) to Gemini`);
        liveSession.sendToolResponse({ functionResponses: responses });
    }
};

app.get('/health', (req, res) => res.send('OK'));

// Serve static files from the React app
const clientDistCandidates = [
    path.join(__dirname, 'client/dist'),
    path.join(__dirname, '../client/dist'),
];
const clientDistPath = clientDistCandidates.find((candidate) => fs.existsSync(candidate));

if (clientDistPath) {
    app.use(express.static(clientDistPath));
}

// Catch-all to serve index.html
app.get('/{*any}', (req, res) => {
    if (clientDistPath) {
        return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    return res.status(503).send('Frontend build is missing. Backend is running.');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
    logInfo(`Log level: ${LOG_LEVEL}`);
    logInfo(`Live API version: ${LIVE_API_VERSION}`);
});



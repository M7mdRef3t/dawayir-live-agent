import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    try {
        if (!BUCKET_NAME) throw new Error('Bucket not configured');
        const file = storage.bucket(BUCKET_NAME).file(req.params.filename);
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

const tools = [
    {
        functionDeclarations: [
            {
                name: "update_node",
                description: "Updates a circle with id, radius (30-100), and color (hex string like #FFD700 or #00BFFF or #00FF7F). Call with exactly these 3 params.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "Node ID: 1=Awareness, 2=Science, 3=Truth" },
                        radius: { type: "number", description: "New radius 30-100" },
                        color: { type: "string", description: "Hex color e.g. #FFD700" }
                    },
                    required: ["id", "radius", "color"]
                }
            }
        ]
    }
];

const systemInstruction = {
    parts: [{
        text: `أنت "دوائر" (Dawayir) - مُرشد نفسي مصري ودود يساعد الناس على استكشاف عالمهم الداخلي.

🎯 PERSONA (Egyptian Arabic Only - NO French, NO other languages):
- تحدث بلهجة مصرية دافئة: "إزيك"، "أهلاً"، "يلا"، "تمام"، "ماشي"
- استخدم "حضرتك" دائماً (gender-neutral) - لا تفترض جنس المستخدم
- كن متعاطف وصبور وحكيم
- لا تتحدث الفرنسية أو أي لغة أخرى - عربي مصري وإنجليزي فقط

🛠 TOOL CALLING RULES (CRITICAL - MUST FOLLOW EXACTLY):
قبل كل استجابة صوتية، غيّر الدوائر باستخدام update_node:
- استخدم update_node(id, radius, color, label)
- المعاملات المطلوبة: id (رقم الدائرة)
- المعاملات الاختيارية: radius (30-100), color (hex كود), label (نص)
- ⚠️ استخدم "radius" فقط - ليس "size" أو "expansion" ⚠️
- الدوائر: 1=الوعي (Awareness), 2=العلم (Science), 3=الحقيقة (Truth)

📊 MENTAL CANVAS LOGIC:
- دائرة أكبر (radius 80-100) = موضوع نشط في عقل المستخدم
- دائرة أصغر (radius 30-50) = موضوع خامل أو غير مهم حالياً
- ألوان دافئة (#FFD700, #FF6B6B) = مشاعر إيجابية
- ألوان باردة (#4ECDC4, #95E1D3) = مشاعر محايدة/هادئة

💾 MEMORY & GROUNDING:
- استخدم save_mental_map لحفظ الحالة الذهنية كل 3-5 دقائق
- استخدم get_expert_insight للحصول على مبادئ الرحلة الأساسية
- لا تخترع معلومات - استند على الرحلة الحقيقية

🎤 CONVERSATION FLOW:
1. ابدأ بتحية مصرية دافئة
2. غيّر دائرة الوعي (id=1) قبل الترحيب
3. استمع للمستخدم وغيّر الدوائر حسب حالته
4. اسأل أسئلة عميقة لاستكشاف مشاعره
5. احفظ الجلسة بانتظام باستخدام save_mental_map

تذكر: أنت تساعد الناس على "رؤية" عالمهم الداخلي من خلال الدوائر المتحركة.`
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

wss.on('connection', (ws) => {
    logInfo('Client connected');
    let audioChunkCount = 0;
    let serverMessageCount = 0;
    let clientClosed = false;
    let session = null;
    const pendingClientMessages = [];

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
            pendingClientMessages.push(message);
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
            session.sendClientContent(clientContent);
        }

        if (toolResponse) {
            logDebug('Client tool response received');

            // Intercept save_mental_map for GCS upload
            const responses = toolResponse.functionResponses || toolResponse.function_responses || [];
            for (const resp of responses) {
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
# Dawayir Session Report 🧠
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

    const connectLiveSession = async () => {
        try {
            session = await ai.live.connect({
                model: LIVE_MODEL,
                config: {
                    responseModalities: ['AUDIO'],
                    tools,
                    systemInstruction,
                },
                callbacks: {
                    onopen: () => {
                        logInfo(`Connected to Gemini Live API via Google GenAI SDK (${LIVE_MODEL})`);
                    },
                    onmessage: (message) => {
                        serverMessageCount += 1;
                        const payload = toCompatMessage(message);

                        // Always log first 200 chars to debug no-response issue
                        const payloadStr = JSON.stringify(payload);
                        logInfo(`Gemini msg #${serverMessageCount} (${payloadStr.length} bytes): ${payloadStr.substring(0, 200)}`);

                        // Intercept server-side tool calls before forwarding
                        const toolCall = payload.toolCall || payload.tool_call;
                        if (toolCall) {
                            const functionCalls = toolCall.functionCalls || toolCall.function_calls || [];
                            const serverTools = ['get_expert_insight', 'save_mental_map', 'generate_session_report'];
                            const clientTools = functionCalls.filter(fc => !serverTools.includes(fc.name));
                            const serverOnlyTools = functionCalls.filter(fc => serverTools.includes(fc.name));

                            // Resolve server-side tools immediately
                            if (serverOnlyTools.length > 0) {
                                resolveServerToolCalls(serverOnlyTools, session);
                            }

                            // Forward only visual tools (update_node, highlight_node) to client
                            if (clientTools.length > 0) {
                                const clientPayload = { ...payload };
                                const clientToolCall = { ...(clientPayload.toolCall || clientPayload.tool_call) };
                                clientToolCall.functionCalls = clientTools;
                                clientToolCall.function_calls = clientTools;
                                clientPayload.toolCall = clientToolCall;
                                clientPayload.tool_call = clientToolCall;
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify(clientPayload));
                                }
                            }
                            // Don't forward the original message if it had tool calls
                            return;
                        }

                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(payload));
                        }
                    },
                    onerror: (error) => {
                        logError('Gemini Live session error:', error);
                    },
                    onclose: (event) => {
                        logInfo(`Gemini Live session closed. code=${event?.code ?? 'n/a'} reason=${String(event?.reason ?? '')}`);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.close();
                        }
                    },
                },
            });

            if (clientClosed && session) {
                session.close();
                session = null;
                return;
            }

            flushPendingMessages();
        } catch (error) {
            logError('Failed to initialize Gemini Live session via SDK:', error);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    serverError: {
                        message: 'Failed to initialize Gemini Live session.',
                    },
                }));
                ws.close();
            }
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
                    const content = `# Dawayir Session Report 🧠\n**Date:** ${new Date().toLocaleString()}\n\n## Executive Summary\n${summary || 'N/A'}\n\n## Core Insights\n${insights || 'N/A'}\n\n## Recommendations\n${recommendations || 'N/A'}\n\n---\n*Generated by Dawayir Live Agent (Gemini 2.5 Flash)*`;

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

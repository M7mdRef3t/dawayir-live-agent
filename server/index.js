import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';

dotenv.config();

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
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';
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
                description: "Updates the properties of a Dawayir node (circle).",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "The ID of the node to update." },
                        radius: { type: "number", description: "The new radius of the node." },
                        color: { type: "string", description: "The new color (hex) of the node." },
                        label: { type: "string", description: "The new label for the node." }
                    },
                    required: ["id"]
                }
            },
            {
                name: "highlight_node",
                description: "Causes a node to pulse visually to draw attention.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "The ID of the node to highlight." }
                    },
                    required: ["id"]
                }
            },
            {
                name: "save_mental_map",
                description: "Saves the current configuration of all Dawayir nodes to cloud storage for future reference.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        session_name: { type: "string", description: "A name for this mental map session." }
                    }
                }
            },
            {
                name: "generate_session_report",
                description: "Generates a tangible summary of the user's mental state journey, insights discovered, and future recommendations. Saves as a Markdown file.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        summary: { type: "string", description: "A concise summary of the conversation and themes." },
                        insights: { type: "string", description: "Key mental-clarity insights discovered during the session." },
                        recommendations: { type: "string", description: "Actionable recommendations for the user based on their circles." }
                    },
                    required: ["summary", "insights"]
                }
            }
        ]
    }
];

const systemInstruction = {
    parts: [{
        text: 'You are the Dawayir Live Agent. Use concise spoken Egyptian Arabic and actively call tools when the user references a specific circle. Map circles as: 1=Awareness/Al-Way, 2=Science/Al-Ilm, 3=Truth/Al-Haqiqa. Use update_node for size/color/label changes and highlight_node when focusing on a circle. Use save_mental_map for state snapshots. Crucially, use generate_session_report when the conversation is winding down or the user asks for a summary; this creates a lasting therapeutic artifact for them.',
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

                        if (isDebug) {
                            logDebug(`Gemini message #${serverMessageCount}:`, JSON.stringify(payload));
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

app.get('/health', (req, res) => res.send('OK'));

// Serve static files from the React app
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
    logInfo(`Log level: ${LOG_LEVEL}`);
    logInfo(`Live API version: ${LIVE_API_VERSION}`);
});

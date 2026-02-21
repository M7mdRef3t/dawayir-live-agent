import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('GEMINI_API_KEY is not set in .env');
    process.exit(1);
}
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'models/gemini-2.5-flash-native-audio-latest';

const tools = [
    {
        function_declarations: [
            {
                name: "update_node",
                description: "Updates the properties of a Dawayir node (circle).",
                parameters: {
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
                parameters: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: "The ID of the node to highlight." }
                    },
                    required: ["id"]
                }
            }
        ]
    }
];

// Endpoint for Gemini Live API (BidiGenerateContent)
const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

wss.on('connection', (ws) => {
    console.log('Client connected');
    let audioChunkCount = 0;

    const geminiWs = new WebSocket(GEMINI_WS_URL);

    geminiWs.on('open', () => {
        console.log('Connected to Gemini Live API');
        const setupMessage = {
            setup: {
                model: LIVE_MODEL,
                tools,
                generationConfig: {
                    responseModalities: ['AUDIO']
                },
                systemInstruction: {
                    parts: [{
                        text: 'You are the Dawayir Live Agent. Use concise spoken Egyptian Arabic and actively call tools when the user references a specific circle. Map circles as: 1=Awareness/Al-Way, 2=Science/Al-Ilm, 3=Truth/Al-Haqiqa. Use update_node for size/color/label changes and highlight_node when focusing on a circle.'
                    }]
                }
            }
        };
        console.log('Sending setup message:', JSON.stringify(setupMessage, null, 2));
        geminiWs.send(JSON.stringify(setupMessage));
    });

    geminiWs.on('message', (data, isBinary) => {
        if (!isBinary) {
            try {
                const msg = JSON.parse(data.toString());
                console.log('Received from Gemini:', JSON.stringify(msg, null, 2));
            } catch (e) {
                // Non-JSON text frame
            }
        }
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data, { binary: isBinary });
        }
    });

    ws.on('message', (data, isBinary) => {
        if (!isBinary) {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.realtimeInput?.mediaChunks?.length) {
                    const chunks = msg.realtimeInput.mediaChunks;
                    for (const chunk of chunks) {
                        if (typeof chunk?.mimeType === 'string' && chunk.mimeType.startsWith('audio/pcm')) {
                            audioChunkCount += 1;
                            if (audioChunkCount === 1 || audioChunkCount % 50 === 0) {
                                console.log(`Client audio chunks received: ${audioChunkCount} (mime: ${chunk.mimeType})`);
                            }
                        }
                    }
                } else if (msg.clientContent) {
                    console.log('Client content turn received');
                } else if (msg.toolResponse) {
                    console.log('Client tool response received');
                }
            } catch (e) {
                // Non-JSON text frame
            }
        }
        if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(data, { binary: isBinary });
        }
    });

    geminiWs.on('error', (err) => {
        console.error('Gemini WebSocket Error:', err);
    });

    geminiWs.on('close', (code, reason) => {
        console.log(`Gemini WebSocket Closed. Code: ${code}, Reason: ${reason}`);
        if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (geminiWs.readyState === WebSocket.OPEN) geminiWs.close();
    });
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const API_KEY = process.env.GEMINI_API_KEY;

// Tool definitions for Gemini
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

const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.MultimodalLiveChat?key=${API_KEY}`;

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Connect to Gemini Live API
    const geminiWs = new WebSocket(GEMINI_WS_URL);

    geminiWs.on('open', () => {
        console.log('Connected to Gemini Live API');

        // Send initial setup with tools and instructions
        const setupMessage = {
            setup: {
                model: "models/gemini-2.0-flash-exp",
                tools: tools,
                system_instruction: {
                    parts: [
                        {
                            text: `You are the Dawayir Live Agent, a philosophical guide and life coach. 
              You can see and manipulate a visual canvas containing three nodes:
              1. Awareness (Al-Wa'y) - ID: 1
              2. Science/Knowledge (Al-Ilm) - ID: 2
              3. Truth (Al-Haqiqa) - ID: 3
              
              Your goal is to guide the user through a journey of self-discovery. 
              Be extremely responsive to the user's voice. If they interrupt you, stop immediately and acknowledge their new direction.
              Use the 'update_node' tool to change the sizes, colors, or labels of the nodes as the conversation evolves.
              Use the 'highlight_node' tool to pulse a node when you are speaking about it specifically.
              Your tone should be Egyptian Arabic (Ammiya), encouraging, and deep.`
                        }
                    ]
                }
            }
        };
        geminiWs.send(JSON.stringify(setupMessage));
    });

    geminiWs.on('message', (data) => {
        // Forward message from Gemini to Client
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ws.on('message', (data) => {
        // Forward message from Client to Gemini
        if (geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(data);
        } else {
            console.warn('Gemini WebSocket not open yet, buffering or dropping message');
        }
    });

    geminiWs.on('error', (err) => {
        console.error('Gemini WebSocket Error:', err);
    });

    geminiWs.on('close', () => {
        console.log('Gemini WebSocket Closed');
        ws.close();
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        geminiWs.close();
    });
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

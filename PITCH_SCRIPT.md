# Dawayir Live Agent - Judge Demo Script (3:30)

Goal: show a reliable, real-time Live Agent that listens, speaks, handles interruption, and updates a visual world through tool calls.

## 0:00-0:25 Hook: The Problem
Voiceover:
"Most AI assistants respond in text, but your mental state is not text-only. It is dynamic and emotional. Dawayir turns that into a live, visible space."

Visual:
- App home with circles visible
- Quick zoom into canvas labels

## 0:25-0:55 What This Agent Does
Voiceover:
"Dawayir is a Gemini Live Agent. You speak naturally, it responds with live audio, and it can call tools to modify your circle map in real time."

Visual:
- Show status badge and backend URL
- Point to debug line briefly

## 0:55-1:45 Live Interaction + Tool Call
Action (user says):
"Make the Truth circle larger and turn it yellow."

Expected:
- Spoken response from agent
- Circle mutation via `update_node`

Voiceover:
"This is not a static response. The agent changes the environment using function calls."

## 1:45-2:25 Interruption Test
Action:
- Let agent speak
- Interrupt: "Stop, focus on Awareness instead."

Expected:
- Agent pivots quickly
- Highlight or update event on Awareness circle

Voiceover:
"Low-latency interruption handling is a core requirement for Live Agents, and this flow remains stable under interruption."

## 2:25-2:55 Resilience Proof
Action:
- Briefly simulate a drop or reconnect scenario
- Show bounded retry behavior and recovery

Voiceover:
"The client uses bounded reconnect attempts and clear fallback messaging, so failures are visible and recoverable."

## 2:55-3:20 Cloud Proof
Visual:
- Cloud Run service page
- Health endpoint returns OK

Voiceover:
"The backend is deployed on Google Cloud Run and proxies real-time WebSocket traffic to Gemini Live."

## 3:20-3:30 Close
Voiceover:
"Dawayir demonstrates a practical future for live, multimodal coaching agents: spoken, interruptible, and world-changing in real time."

## Recording Notes
- Keep total duration under 4:00
- Use clean audio and stable network
- Keep one backup recording
- Keep all claims aligned with actual behavior in the app

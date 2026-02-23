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

## 2:25-3:15 Cloud Persistence & Session Reports
Action (user says):
"Save this session and generate a mental clarity report."

Expected:
- Agent calls `save_mental_map`.
- Agent calls `generate_session_report`.
- Spoken confirmation of cloud backup.

Voiceover:
"But Dawayir is more than a live chat; it is a persistent coaching engine. Sessions are snapshot to Google Cloud Storage as both JSON data and human-readable Markdown reports. This creates a tangible artifact of the user's mental journey."

## 3:15-3:45 Cloud Proof & The Rihlaty Vision
Visual:
- Cloud Run service page
- Google Cloud Storage Bucket showing the `.md` and `.json` files
- Brief mention of Cloud Build / Terraform files

Voiceover:
"Behind the scenes, the system is enterprise-ready, with automated CI/CD and IaC. Dawayir is the real-time engine designed to power the upcoming **Rihlaty** platform—a comprehensive ecosystem for personal growth."

## 3:45-4:00 Close
Voiceover:
"Dawayir: Spoken, interruptible, world-changing, and persistent. The future of live coaching on Google Cloud."

## Recording Notes
- Keep total duration under 4:00
- Use clean audio and stable network
- Keep one backup recording
- Keep all claims aligned with actual behavior in the app

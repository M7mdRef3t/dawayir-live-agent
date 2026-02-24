# Dawayir (دوائر) - Redefining Interaction 🧠✨

> **"From Static Chatbots to Immersive, Multimodal Experiences"**
> 
> *Built for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/)*

---

## 🌟 The Vision
**Dawayir** is not just an AI agent; it is a **multimodal mental space**. We are moving beyond the "text-box" paradigm into an immersive realm where AI doesn't just talk—it **sees**, **visualizes**, and **remembers** your inner world in real-time.

By combining the **Gemini 2.0 Flash Live API** with a dynamic, glassmorphic visual canvas, Dawayir creates a living bridge between human speech and mental clarity.

---

## 🚀 Key Multimodal Features

### 🗣️ Live Audio (The Pulse)
- **Natural, Full-Duplex Conversation:** Talk to Dawayir naturally with seamless interruption handling (barge-in).
- **Egyptian Arabic Persona:** A warm, empathetic Egyptian persona that understands the nuances of human emotion.
- **Low-Latency Streaming:** Powered by the `Google GenAI SDK` for real-time audio bidirectional streaming.

### 👁️ Multimodal Vision (The Insight)
- **Visual Pulse Check:** Users can activate the camera and take a snapshot before or during the conversation. This captured image is sent to Gemini to analyze facial expressions and understand the mental/emotional state.
- **Pre-Session Snapshot:** Before starting, click "📸 Start Visual Pulse Check" → camera opens with live preview → click "🎯 Take Snapshot" to capture initial mindset.
- **Live Session Update:** During an active conversation, click "📸 Update Visual Context" to send an updated snapshot to Gemini, allowing the agent to adapt to your current emotional state.
- **Contextual Awareness:** The agent can see which "Mental Domains" (Circles) are largest on your screen and prioritize them in the dialogue.

### ☸️ Agentic UI Manipulation (The Living Canvas)
- **Dynamic State Mutations:** Gemini uses real-time tool calling (`update_node`, `highlight_node`) to physically transform your mind-map based on what you share.
- **Visual Feedback:** Watch your "Awareness," "Science," and "Truth" circles grow, change color, or pulse as you gain clarity.

### 💾 The Memory Bank (Cloud Grounding)
- **Long-term Persistence:** Your mental map isn't lost. Using `save_mental_map`, Dawayir serializes your state to **Google Cloud Storage**.
- **Session Continuity:** Our custom context relay allows you to resume your journey even after a disconnection, with Gemini remembering the last 5 segments of conversation.
- **Session Insights:** Generates a Markdown-based "Mental State Report" stored securely in the cloud.

---

## 🛠️ Tech Stack & Proof of GCP
Built 100% on **Google Cloud** to meet "Grand Prize" requirements:
- **Model:** `gemini-2.0-flash-exp` (via Google GenAI SDK).
- **Backend:** Node.js hosted on **Google Cloud Run**.
- **Memory:** **Google Cloud Storage** for persistent session reports and mental maps.
- **Frontend:** React + Vite + Canvas API (Glassmorphism shaders).
- **IaC:** Automated deployment via **Terraform** (`main.tf`) and shell scripting.

---

## 📦 Local Setup (Reproduce in 5 Minutes)

### 1️⃣ Prerequisites
- Node.js 20+
- Google Cloud Project with Gemini API access.

### 2️⃣ Backend (Maestro)
```bash
cd server
npm install
# Set your API Key in .env
echo "GEMINI_API_KEY=your_key_here" > .env
echo "GOOGLE_PROJECT_ID=your_project_id" >> .env
echo "GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name" >> .env
npm start
```

### 3️⃣ Frontend (Interface)
```bash
cd client
npm install
npm run dev
```

---

## 🏛️ Architecture & Documentation
- **Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system diagrams.
- **Cloud Deployment:** See [main.tf](./main.tf) and `cloud-deploy.sh` for automation proof.
- **Demo Script:** See [PITCH_SCRIPT.md](./PITCH_SCRIPT.md) for how we win.

---

## 🏆 Submission Category
**Track:** Live Agents 🗣️  
**Primary Tech:** Gemini Live API / Google GenAI SDK

---

## 📄 License
ISC © 2026 Mohammed Refaat

---
*Created with ❤️ for the Gemini Live Agent Challenge #GeminiLiveAgentChallenge*

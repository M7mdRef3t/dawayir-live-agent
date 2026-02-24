# Devpost Submission Summary: Dawayir (دوائر)

## 📋 Project Summary
**Dawayir** is a multimodal AI agent designed to revolutionize the way we interact with our own mental state. Moving away from static chat interfaces, it provides an immersive "Mental Space" where users can speak naturally to an empathetic Egyptian AI persona. The agent doesn't just respond with voice; it physically manipulates a glassmorphic visual canvas in real-time to represent the user's emotional domains. 

By optionally capturing a visual snapshot at the start of a session (sent to Gemini for initial mood analysis) and maintaining stateful persistence through Google Cloud Storage, Dawayir serves as a "Memory Bank" for mental clarity, tracking insights and transformations across sessions.

## 🛠️ Technologies Used
- **Core AI:** Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`) via the Google GenAI SDK.
- **Microservice Backend:** Node.js + Express + WebSockets (Binary PCM16 relay).
- **Cloud Infrastructure:** 
    - **Google Cloud Run:** Scalable serverless hosting for low-latency relay.
    - **Google Cloud Storage (GCS):** Secure persistence for mental maps and session reports.
    - **Google Manifest Artifacts:** Terraform for Infrastructure-as-Code (IaC).
- **Frontend Architecture:** React + Vite + Custom Canvas API for real-time physics-based visualization.
- **Audio Pipeline:** `AudioWorklet` for raw PCM capture and `Web Audio API` for precision jitter-buffer playback.

## 🧠 Findings & Learnings
- **Multimodal Synergy:** We discovered that visual feedback (the pulsing and resizing of circles) significantly lowers the user's cognitive load during emotional sharing compared to text-only interfaces.
- **Bidi-Streaming Calibration:** Tuning the binary WebSocket buffer size was critical to achieving "near-zero" latency, ensuring the agent feels "alive" and present.
- **Grounding through GCS:** Using Cloud Storage to store serialized canvas states allowed Gemini to "remember" visual context across reconnections, a feature users found "magical."
- **Cultural Nuance:** Implementing an Egyptian Arabic persona helped bridge the gap between high-tech AI and deeply personal human conversation.

## 🚀 Impact
Dawayir demonstrates that AI agents should be **multimodal by design**. By seeing (vision), hearing (audio), and acting (UI manipulation), Dawayir provides a tactile sense of mental progress that a simple chatbot never could.

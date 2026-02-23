# Devpost Submission Draft - Dawayir Live Agent

Use this as copy-ready base for the final Devpost submission.

## Project Title
Dawayir Live Agent

## One-line Pitch
A real-time Gemini Live Agent that speaks with users and dynamically manipulates a visual circle-map through function calls.

## What It Does
Dawayir is a Live Agent experience for relationship and mental-clarity coaching. Users speak naturally, receive low-latency spoken responses, and see a live canvas update as the agent calls tools such as `update_node` and `highlight_node`.

## Why It Matters
Emotional and relational reasoning is dynamic, but most AI interfaces are static text panes. Dawayir transforms conversation into a living visual state, helping users externalize internal complexity in real time.

## How We Built It
- Frontend: React + Vite, Web Audio API, canvas renderer
- Backend: Node.js + `@google/genai` live-session bridge
- Model/API: Gemini Live API with multimodal streaming via Google GenAI SDK
- Hosting: Google Cloud Run backend
- Tools: function-calling for live circle mutations

Compliance statement:
- Built using **Google GenAI SDK** (`@google/genai`) + **Gemini Live API** and deployed on **Google Cloud Run**.

## Key Technical Strengths
- Full-duplex voice streaming
- Interruption-aware interaction
- Tool invocation and tool-response loop
- **Cloud Memory Persistence:** Automatic snapshotting of mental maps to Google Cloud Storage via custom Tool Calling.
- Bounded reconnect strategy and debug telemetry
- Cloud-ready deployment flow

## Challenges We Solved
- Bridging browser audio capture to Gemini-compatible PCM streaming
- Stabilizing reconnect behavior for live demos
- Handling message format differences in streaming events
- Ensuring tool-call execution remains deterministic and safe

## What We Are Proud Of
- A live, interruptible spoken agent that changes a visual world in real time
- **Premium Multimodal Experience:** Real-time audio waveform visualization and a dynamic "Mental Space" canvas that reacts to user presence.
- Reliable cloud-backed architecture suitable for judging demos
- Strong submission package with reproducible run paths

## What Is Next
- Add richer multimodal inputs (camera/context overlays)
- Expand tool vocabulary and adaptive coaching behaviors
- Add session analytics and replay support for coaching insights

## Links
- **GitHub Repository:** https://github.com/M7mdRef3t/dawayir-live-agent
- **Live Cloud Backend:** wss://dawayir-live-agent-880073923613.europe-west1.run.app
- **Health Endpoint:** https://dawayir-live-agent-880073923613.europe-west1.run.app/health
- **Demo Video:** [ADD_YOUTUBE_URL_HERE]
- **Architecture Diagram:** See submission-assets/architecture/
- **Social Media Post:** [ADD_POST_URL_AFTER_PUBLISHING]

## Technologies Stack
- **AI/ML:** Google GenAI SDK v1.42.0, Gemini Live API (gemini-2.0-flash-exp)
- **Cloud Infrastructure:** Google Cloud Run, Google Cloud Storage, Cloud Build (CI/CD), Terraform (IaC)
- **Backend:** Node.js 18+, Express 5.2, WebSocket (ws 8.19)
- **Frontend:** React 19, Vite 7.3, Web Audio API, Canvas API
- **Real-time Communication:** Full-duplex WebSocket streaming, PCM16 audio at 16kHz

## Competition Compliance Statement
✅ **Built with Google GenAI SDK:** Using `@google/genai` package v1.42.0 for all Gemini Live API interactions
✅ **Deployed on Google Cloud:** Backend running on Google Cloud Run with auto-scaling
✅ **Gemini Live API Integration:** Direct connection via `ai.live.connect()` with function calling support
✅ **Track: Live Agents** - Real-time voice interaction with interruption handling and multimodal output (voice + visual canvas)

## Unique Differentiators
1. **Cultural Accessibility:** Egyptian Arabic language support for MENA region users.
2. **Real-time Visual Feedback:** Live canvas manipulation through AI tool calling (not just voice responses).
3. **Cloud Memory Persistence:** Automatic mental map snapshots and session reports saved to GCS.
4. **Professional Monitoring:** Built-in debug telemetry, health checks, and CI/CD automation.
5. **The Rihlaty Vision:** Positioning Dawayir as a core engine for a larger coaching platform, rather than a standalone hackathon demo.

## Submission Completeness Checklist
- [x] Description finalized
- [x] GitHub link added and repository public
- [x] Cloud proof screenshots prepared
- [x] Architecture diagrams exported as PNG
- [ ] Demo video recorded and uploaded (< 4 min)
- [ ] All bonus evidence collected
- [ ] Social media post published with #GeminiLiveAgentChallenge

## Additional Notes for Judges
We automated the entire deployment pipeline with Google Cloud Build and provided Terraform configurations to prove enterprise-readiness. The system demonstrates production-ready reliability with bounded retry logic and health monitoring.

The mental clarity coaching domain was chosen to showcase how Live Agents can address emotional and relational complexity—areas where static text interfaces fall short. By combining real-time Arabic voice interaction with dynamic visual state manipulation and **Session Report artifacts**, Dawayir creates a lasting, accessible experience for users navigating personal growth. This project serves as the real-time engine for the upcoming **Rihlaty** platform.

All code is open-source under ISC license, well-documented, and includes comprehensive setup instructions for judges to run locally or deploy to their own Google Cloud projects.

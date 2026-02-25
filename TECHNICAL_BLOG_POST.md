# Building Dawayir: A Real-Time Multimodal Mental Clarity Coach using Gemini Live API

*This article was created for the purposes of entering the Google Gemini Live Agent Challenge.*

## The Vision: Beyond the Text Box
For too long, AI interactions have been constrained by the paradigm of the text box. We type, we wait, we read. But human emotional and relational reasoning is fluid, dynamic, and often hard to articulate through text alone. We wanted to build an agent that doesn't just process words, but participates in a real-time, flowing conversation while providing a visual anchor for abstract thoughts.

Enter **Dawayir** (دوائر, meaning "Circles" in Arabic) — a living conceptual canvas and a warm, empathetic mental clarity coach. Dawayir leverages the brand new **Google GenAI SDK** and the **Gemini Live API** to bridge the gap between multimodal voice interaction and dynamic visual state manipulation.

## Architecture: The Maestro & The Mental Space
At the heart of Dawayir is a high-performance relay architecture hosted entirely on Google Cloud. 

1. **The Pulse (Frontend / <200ms Latency Pipeline):** 
   To solve the critical challenge of conversational delay—where anything over 200ms breaks the "magic" of a human-like interaction—we completely abandoned the traditional Request-Response (REST) paradigm. Instead, the browser captures the user's voice using the Web Audio API, converting it into PCM16 at 16kHz, and streams it continuously via high-speed WebSockets (inspired by WebRTC pipelines). It also handles the 'Visual Pulse Check', capturing initial user emotion via the webcam.
2. **The Maestro (Node.js Backend):** 
   Deployed on **Google Cloud Run**, our Node.js server acts as an ultra-low latency relay. It uses the official `@google/genai` SDK to maintain a full-duplex session with the Gemini Live API. It forwards audio and tool calls seamlessly between the human and the AI without waiting for HTTP handshakes.
3. **The Intelligence:** 
   We utilized `gemini-2.5-flash-native-audio-latest` to provide low-latency voice responses in a natural Egyptian Arabic persona, bringing a sense of cultural warmth and empathy to the experience.

## Real-Time Tool Calling: Making the Canvas Alive
What truly sets Dawayir apart in the "Live Agents" category is how it uses Gemini's Function Calling in real-time. The user sees three interactive nodes on their screen:
- **الوعي (Awareness)**
- **العلم (Science/Knowledge)**
- **الحقيقة (Truth/Values)**

As the user speaks, Gemini actively calls tools like `update_node` and `highlight_node`. If a user expresses anxiety, Gemini might autonomously increase the 'Awareness' circle's radius and change its color to yellow. The frontend React application instantly interprets these tool calls to mutate the glassmorphism canvas. The agent doesn't just react with words; it physically alters the user's visual "Mental Space."

## Cloud Grounding & Memory Banks
To ensure Dawayir isn't just a fleeting interaction, we integrated **Google Cloud Storage (GCS)** for memory persistence.
Through tools like `save_mental_map` and `generate_session_report`, Gemini serializes the state of the conversation and generates a Markdown summary of the user's insights. These are saved back to GCS, providing users with a tangible therapeutic artifact of their journey.

## Token Optimization & Cost Control
A major challenge with multimodal Live APIs is the sheer volume of tokens consumed by continuous audio and video streaming. Unoptimized apps can burn through Google Cloud credits in hours. 

To ensure **Dawayir** is scalable and cost-effective, we implemented aggressive token optimization:
1. **Visual Downsampling:** The 'Visual Pulse Check' doesn't stream 60fps video. It captures targeted, optimally-compressed snapshots.
2. **Context Window Management:** Instead of keeping the entire session transcript in context indefinitely, `save_mental_map` acts as a compression algorithm, saving state to GCS and allowing the agent to free up the immediate context window.

## Infrastructure as Code & Automation: Cloud Run Efficiency
To prove enterprise-readiness and secure the "Automated Deployment" bonus points, we automated the entire deployment pipeline with a focus on **Cloud Costs**. 

Instead of leaving an expensive GKE cluster or compute instance running 24/7, we purposefully chose **Google Cloud Run**.
- **Scale-to-Zero Efficiency:** Cloud Run ensures we only pay for the exact milliseconds the WebSocket container is handling a connected user. When idle, costs drop to absolute zero.
- **GitOps Automation:** Using **Terraform** (`main.tf`), we provisioned the Cloud Run services, IAM permissions, and Cloud Storage buckets. A custom `cloudbuild.yaml` ensures that every code push seamlessly transitions into a live backend without skipping a beat, proving full Infrastructure-as-Code (IaC) mastery.

## Conclusion
Building Dawayir for the Gemini Live Agent Challenge pushed us to rethink what an AI agent can be. By fusing Google's state-of-the-art multimodal streaming with real-time UI manipulation and scalable Cloud infrastructure, we've taken a step toward a future where AI isn't just a chatbot, but a living, breathing companion.

---
*Check out our project on Devpost and our source code on GitHub. #GeminiLiveAgentChallenge #GoogleCloud #BuildWithAI*

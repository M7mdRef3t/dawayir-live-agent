# Devpost Submission Copy

## Project Title

Dawayir

## One-Line Tagline

The first live cognitive operating system that renders the mind changing in real time.

## Elevator Pitch

Dawayir is a real-time multimodal AI system that listens, sees, and reshapes a live cognitive canvas during conversation. Instead of acting like a standard chatbot, it turns the user’s inner state into a visible environment that can be explained, replayed, compared across sessions, and exported for review.

## What Problem Does It Solve

Most AI wellness tools are still chat interfaces. They may reply well, but they do not give the user a live mental interface.

When someone is overwhelmed, anxious, or cognitively scattered, they often do not need more words alone. They need:

- a visible reflection of what is happening now
- immediate adjustment during the conversation
- clear explanation for why the system changed state
- continuity across sessions

Dawayir addresses that gap.

## What Makes It Different

Dawayir is not just an AI companion. It is a `Cognitive OS`.

Key differentiators:

- live voice conversation through Gemini Live
- optional camera-based multimodal input
- real-time circle mutation on a cognitive canvas
- `Why Now` reasoning layer for visual changes
- interruption-first behavior so the user can cut in and regain control
- session replay and cross-session comparison
- judge-ready presentation layer for fast, high-signal demos

## Core Features

### 1. Live Cognitive Canvas

Three living circles represent:

- `Awareness`
- `Knowledge`
- `Truth`

They change during the conversation, not after it.

### 2. Why Now

The system explains why the state changed so the user can understand the reasoning behind each visual mutation.

### 3. Interruption First

If the user interrupts, the agent stops quickly and yields control back to the human.

### 4. Session Replay

Each session can be replayed step by step as a cognitive journey instead of disappearing after the chat ends.

### 5. Cross-Session Diff

The product compares sessions to show progress in clarity, equilibrium, overload, and the relative state of the circles.

### 6. Signature Moment and Highlight Reel

The system extracts the strongest moments from a session and packages them into judge-friendly artifacts.

### 7. One-Click Demo Route

The product can launch a judge-ready live demo from the home screen and later switch into a guided presentation mode.

## How We Built It

### Frontend

- React
- Vite
- real-time canvas UI
- session replay and judge presentation tools

### Backend

- Node.js
- WebSocket orchestration
- Gemini Live integration
- server-side tool handling and policy enforcement

### Infra

- Google Cloud Run
- Google Cloud Storage
- Terraform
- Cloud Build

## Google Technology Used

- Gemini Live API
- Gemini model integration through the backend orchestration layer
- Google Cloud Run for deployment
- Google Cloud Storage for saved session artifacts

## Challenges We Ran Into

- getting real-time voice behavior to feel stable enough for live demos
- making interruption handling reliable so the system stops when the user cuts in
- avoiding a generic chatbot feel by making the UI itself an intervention layer
- turning live session data into replayable and comparable artifacts
- balancing strong visual feedback with cognitive safety and clarity

## Accomplishments We Are Proud Of

- building a real-time cognitive canvas instead of a standard chat app
- making the agent act on the environment, not only speak
- adding replay, diff, export, and signature layers on top of live interaction
- shipping a strong judge-mode flow that works under competition time pressure

## What We Learned

- the strongest AI experience here was not “better answers” but “visible state change”
- judges understand the value much faster when the system acts before long explanation
- persistence and replay make the product feel far more real than an ephemeral voice demo

## What Is Next

- stronger privacy modes
- richer cross-session longitudinal insights
- clinician or coach handoff artifacts
- more advanced multimodal understanding
- broader production deployment and user testing

## Demo Script Summary

Recommended short demo flow:

1. open the app
2. click `Run Live Demo`
3. show live voice + moving circles
4. interrupt once
5. open Memory Bank
6. show Replay
7. show Highlight Reel
8. show Signature Moment
9. show Cross-Session Diff
10. enable Judge Mode

## Repository

https://github.com/M7mdRef3t/dawayir-live-agent

## Release

https://github.com/M7mdRef3t/dawayir-live-agent/releases/tag/v1.0.0

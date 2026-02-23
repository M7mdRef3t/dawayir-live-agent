# Acceptance Suite

Run these scenarios before recording and before final submission.

## 0) SDK Compliance Gate
- Preconditions: dependencies installed in `server/`
- Steps: verify `server/package.json` includes `@google/genai`; verify `server/index.js` uses `ai.live.connect(...)`
- Expected: runtime path uses Google GenAI SDK Live API (not raw direct Gemini WS)

## 1) Cloud WS Connect
- Preconditions: `client/.env.local` has Cloud Run WSS URL
- Steps: Start frontend, click start
- Expected: Status reaches `Connected to Gemini Live`

## 2) Local Fallback Connect
- Preconditions: remove/rename `client/.env.local`
- Steps: start local backend + frontend
- Expected: frontend connects to `ws://localhost:8080`

## 3) Interruption Responsiveness
- Steps: let agent speak, interrupt with redirect command
- Expected: agent pivots without crashing session

## 4) Tool Invocation
- Steps: command color/size/highlight change
- Expected: visual mutation occurs and tool counter increases

## 5) Reconnect Behavior
- Steps: induce transient disconnect
- Expected: bounded retry attempts shown, then recovery or clear terminal message

## 6) Mic Permission Flow
- Steps: deny mic once, retry
- Expected: readable error + ability to reconnect after granting permission

## 7) Cloud Proof
- Steps: call `/health`, capture cloud console screenshot
- Expected: endpoint OK and service visible

## 8) Submission Completeness
- Steps: review all submission docs and links
- Expected: no missing assets or broken links

## Pass Criteria
All eight scenarios pass in one pre-submission rehearsal.

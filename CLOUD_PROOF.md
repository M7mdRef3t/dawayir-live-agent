# Cloud Proof Checklist

Use this file to gather and store cloud deployment evidence for judges.

## Target Service
- WebSocket URL: `wss://dawayir-live-agent-880073923613.europe-west1.run.app`
- Health URL: `https://dawayir-live-agent-880073923613.europe-west1.run.app/health`

## Required Evidence
- [ ] Screenshot: Cloud Run service overview page
- [ ] Screenshot: Revision details (latest deployed revision)
- [ ] Screenshot: `/health` returns `OK`
- [ ] Screenshot: App connected to cloud backend (status visible)
- [ ] Code proof link: `server/index.js` showing `@google/genai` + `ai.live.connect(...)`

## Command Verification
```bash
curl -i https://dawayir-live-agent-880073923613.europe-west1.run.app/health
```
Expected:
- HTTP 200
- Body: `OK`

## Optional WS Verification Snippet
```bash
node -e "const WebSocket=require('ws');const ws=new WebSocket('wss://dawayir-live-agent-880073923613.europe-west1.run.app');ws.on('open',()=>console.log('open'));ws.on('message',d=>{console.log(String(d));ws.close();});"
```
Expected:
- `open`
- setup message including `setupComplete`

## Evidence Storage
Store screenshots in a local folder and link them in Devpost.
Suggested folder:
- `submission-assets/cloud-proof/`

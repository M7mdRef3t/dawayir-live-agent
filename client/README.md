# Dawayir Client

React + Vite frontend for Dawayir Live Agent.

## Environment
Create `client/.env.local` only when pointing to a remote backend.

```bash
VITE_BACKEND_WS_URL=wss://your-cloud-run-service-url
```

Behavior:
- If `VITE_BACKEND_WS_URL` exists, frontend uses it.
- On localhost without override, frontend uses `ws://localhost:8080`.
- On non-localhost without override, frontend uses current host `ws(s)://<host>`.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Demo Notes
- Debug line in UI shows setup/mic/retry/tool state.
- For judge demo flow, use root docs:
  - `../DEMO_CHECKLIST.md`
  - `../PITCH_SCRIPT.md`
  - `../VIDEO_SHOTLIST.md`

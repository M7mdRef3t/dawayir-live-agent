# Dawayir Client

React + Vite frontend for the Gemini Live canvas experience.

## Environment

Create `client/.env.local` only if your backend is not local:

```bash
VITE_BACKEND_WS_URL=wss://your-backend-host
```

Behavior:
- If `VITE_BACKEND_WS_URL` is set, it is used.
- If running on localhost, fallback is `ws://localhost:8080`.
- Otherwise, fallback is same host as the current page (`ws(s)://<current-host>`).

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

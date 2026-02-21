# Dawayir Live Demo Checklist

## 1) Backend
- Verify `server/.env` has:
  - `GEMINI_API_KEY=...`
  - Optional: `GEMINI_LIVE_MODEL=models/gemini-2.5-flash-native-audio-latest`
- Start backend:
  - `cd server`
  - `npm start`
- Validate health:
  - `http://localhost:8080/health` returns `OK`

## 2) Frontend
- Optional cloud config:
  - Create `client/.env.local`
  - Add `VITE_BACKEND_WS_URL=wss://<your-backend-host>`
- Start frontend:
  - `cd client`
  - `npm run dev`

## 3) Pre-demo verification
- Open app in browser.
- Click `Start Gemini Live Journey`.
- Allow microphone permission.
- Confirm status changes to `Connected to Gemini Live`.
- Speak a command like:
  - "كبر دايرة الحقيقة وخليها صفراء"
- Confirm both:
  - Gemini speaks back with audio.
  - At least one circle updates/pulses from tool calls.

## 4) Safety fallback if connection drops
- Use `Disconnect`.
- Reconnect from button.
- Re-grant microphone permission if browser revoked it.

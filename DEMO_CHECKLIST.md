# Dawayir Live Demo Pre-Flight Checklist

Use this checklist before every recording, judging session, or live demo.

## A) Environment Lock
- [ ] Browser profile is clean (no noisy extensions, mic blockers, or aggressive ad blockers)
- [ ] Stable internet connection verified
- [ ] Correct branch and latest code pulled
- [ ] `client/.env.local` points to intended backend

## B) Backend Health
- [ ] `server/.env` contains `GEMINI_API_KEY`
- [ ] Optional model confirmed: `GEMINI_LIVE_MODEL`
- [ ] Backend started with `npm start`
- [ ] `GET /health` returns `OK`
- [ ] No fatal server logs

## C) Frontend Health
- [ ] Frontend started with `npm run dev`
- [ ] UI loads without overlay errors
- [ ] Debug line is visible (setup/mic/retries/tools/last)

## D) Core Functional Checks
- [ ] Click `Start Gemini Live Journey`
- [ ] Microphone permission granted
- [ ] Status reaches `Connected to Gemini Live`
- [ ] Agent returns audio output
- [ ] Tool call updates at least one circle

## E) Reliability Checks
- [ ] Interruption test passed (user interrupts and agent pivots)
- [ ] Reconnect test passed (bounded retries, then clear message)
- [ ] Manual disconnect and reconnect both work
- [ ] Mic stop/start cycles do not break audio

## F) Cloud Proof Capture
- [ ] Cloud Run service URL captured
- [ ] `/health` response screenshot captured
- [ ] Cloud console service screenshot captured
- [ ] Optional WebSocket setup proof captured

## G) Video Recording Readiness
- [ ] Final script loaded (`PITCH_SCRIPT.md`)
- [ ] Shot list loaded (`VIDEO_SHOTLIST.md`)
- [ ] Desktop notifications disabled
- [ ] Sensitive data hidden (keys, private tabs)
- [ ] Backup take planned

## H) Submission Pack Completeness
- [ ] `README.md` up to date
- [ ] `ARCHITECTURE.md` up to date
- [ ] `DEVPOST_SUBMISSION.md` filled and reviewed
- [ ] `CLOUD_PROOF.md` updated with final evidence
- [ ] Bonus evidence prepared (`BONUS_EXECUTION.md`)

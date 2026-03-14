# Execution Map (Tickets ⇢ Code Paths)

This map connects each planned ticket to concrete files in this repository, with an owner suggestion and technical Definition of Done.

## Ownership Legend
- `BE`: Backend Engineer
- `FE`: Frontend Engineer
- `SE`: Security Engineer
- `SRE`: Platform/SRE
- `DX`: Developer Experience

---

## Sprint 1

### ARCH-101 — Modular Boundaries in Server
- Owner: `BE`
- Primary files:
  - `server/index.js`
  - `server/config/index.js`
  - `server/config/constants.js`
  - `server/config/tools.js`
  - `server/services/voice-commands.js`
  - `server/prompts/system-instruction.js`
  - `server/services/*` (new module folders)
  - `server/routes/*` (if extracting routes)
- Technical DoD:
  - no cyclic imports between modules
  - module readmes created (`auth/realtime/artifacts/analytics`)
  - integration behavior unchanged (smoke test pass)

### PLAT-102 — Central Error & Logging Contract
- Owner: `BE`
- Primary files:
  - `server/index.js` (error middleware / ws error shape)
  - `server/routes/api.js` (if present)
  - `server/services/*` (standard throw/return envelope)
  - `server/config/constants.js` (error codes)
- Technical DoD:
  - unified error response envelope for REST + WS
  - request correlation id included in logs
  - no raw stack traces returned to clients

### SEC-103 — Auth Token Lifecycle
- Owner: `SE`
- Primary files:
  - `server/index.js` (WS token validation)
  - `server/config/constants.js` (token TTL settings)
  - `server/config/index.js` (env wiring)
  - `client/src/hooks/useConnection.js` (token send behavior)
  - `client/src/features/session/constants.js`
- Technical DoD:
  - short-lived access token validated for API + WS
  - refresh token rotation implemented (or feature-flagged)
  - revoked/expired tokens rejected deterministically

### DX-104 — CI Quality Lock
- Owner: `DX`
- Primary files:
  - `.github/workflows/client-ci.yml`
  - `client/package.json`
  - `client/scripts/check_bundle_budget.cjs`
  - `client/scripts/accessibility_smoke.cjs`
- Technical DoD:
  - PR cannot merge if `ci:check` fails
  - pipeline runs lint/build/perf/a11y/tests in this order

---

## Sprint 2

### RT-201 — Realtime Path Isolation
- Owner: `BE`
- Primary files:
  - `server/index.js` (ws handling path)
  - `server/services/voice-commands.js`
  - `server/services/*` (split hot path handlers)
  - `client/src/hooks/useConnection.js` (client protocol tolerance)
- Technical DoD:
  - heavy work removed from WS hot loop
  - p95 WS message handling reduced and documented
  - no event ordering regressions in session flow

### RT-202 — Queue for Heavy Jobs
- Owner: `BE`
- Primary files:
  - `server/services/cognitive-artifacts.js`
  - `server/routes/api.js`
  - `server/index.js` (enqueue producer points)
  - `server/config/constants.js` (retry/backoff)
- Technical DoD:
  - long-running report/artifact jobs are async
  - retry + dead-letter behavior documented and test-covered

### OBS-203 — Realtime SLO Dashboard
- Owner: `SRE`
- Primary files:
  - `server/index.js` (metrics emit points)
  - `server/services/*` (latency instrumentation)
  - `.github/workflows/*` (optional upload/report)
- Technical DoD:
  - p50/p95/p99 latency metrics captured
  - reconnect and WS close code metrics visible
  - alert thresholds documented

---

## Sprint 3

### DATA-301 — Session/Transcript Index Review
- Owner: `BE`
- Primary files:
  - `server/services/cognitive-artifacts.js`
  - `server/routes/api.js`
  - `server/*db*` or migration files (new)
- Technical DoD:
  - top 5 hot queries identified
  - indexes added with before/after benchmark note

### DATA-302 — Transcript Retention & Archive
- Owner: `BE`
- Primary files:
  - `server/services/cognitive-artifacts.js`
  - `server/cognitive_artifacts.json` (current store baseline)
  - `server/config/constants.js` (retention policy)
  - `scripts/*` (archive job)
- Technical DoD:
  - retention job runs safely
  - archived records remain retrievable
  - storage growth trend reduced

### DATA-303 — Table Partitioning Prep
- Owner: `BE`
- Primary files:
  - migration scripts (new)
  - `server/services/*` query updates
  - runbook docs (new)
- Technical DoD:
  - partition strategy tested on staging dataset
  - no read/write regressions post-cutover

---

## Sprint 4

### SEC-401 — RBAC + Ownership Enforcement
- Owner: `SE`
- Primary files:
  - `server/index.js` (authz middleware)
  - `server/routes/api.js`
  - `server/services/*` (ownership checks)
- Technical DoD:
  - deny-by-default policy applied
  - IDOR test cases fail closed

### SEC-402 — Rate Limiting & Abuse Controls
- Owner: `SE`
- Primary files:
  - `server/index.js` (API + WS rate controls)
  - `server/config/constants.js`
  - `server/config/index.js` (limits from env)
- Technical DoD:
  - per-IP and per-user limits active
  - legitimate traffic unaffected in smoke test

### SEC-403 — Sensitive Logging Redaction
- Owner: `SE`
- Primary files:
  - `server/index.js`
  - `server/services/*`
  - `client/src/hooks/useConnection.js` (client-side console hygiene)
- Technical DoD:
  - token/transcript/PII redaction rules enforced
  - log samples verified manually

---

## Sprint 5

### PROD-501 — Contract Completion Funnel
- Owner: `BE`
- Primary files:
  - `server/services/cognitive-artifacts.js`
  - `server/routes/api.js`
  - `client/src/App.jsx`
  - `client/src/components/DashboardView.jsx`
- Technical DoD:
  - events for create/seen/complete captured
  - dashboard endpoint exposes funnel by cohort

### PROD-502 — Artifact Search MVP
- Owner: `FE + BE`
- Primary files:
  - `server/routes/api.js` (search endpoint)
  - `server/services/cognitive-artifacts.js`
  - `client/src/components/DashboardView.jsx` (search UI integration)
  - `client/src/i18n/strings.js`
- Technical DoD:
  - end-to-end search works on artifacts
  - latency and relevance baseline documented

### PROD-503 — Reconnect Recovery UX
- Owner: `FE`
- Primary files:
  - `client/src/hooks/useConnection.js`
  - `client/src/App.jsx`
  - `client/src/i18n/strings.js`
  - `client/src/components/ConnectProgressCard.jsx`
- Technical DoD:
  - reconnect states are explicit in UI
  - user can distinguish retry/recovered/failed states clearly

---

## Cross-Cutting Checklists (Apply to Every Ticket)
- Tests:
  - `npm --prefix client run test:unit`
  - server smoke for affected flows
- Quality:
  - `npm --prefix client run ci:check`
- Security:
  - no new endpoint without auth/authz/rate checks
- Docs:
  - update ticket notes + ADR link if decision changed

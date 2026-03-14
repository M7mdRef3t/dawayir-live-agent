# Dawayir Implementation Plan (Sprint-by-Sprint)

## Assumptions
- Sprint length: 2 weeks
- Team: 4–8 engineers
- Priority: shipping safely with low-latency realtime preserved

---

## Sprint 1 (Weeks 1–2) — Foundation Hardening

### Goal
Stabilize core quality gates and architecture boundaries before new feature load.

### Tickets
1. **ARCH-101: Modular Boundaries in Server**
- Scope: separate modules (`auth`, `realtime`, `artifacts`, `analytics`) in `server/`.
- Deliverable: folder + import boundaries + README per module.
- Acceptance:
  - no cross-module cyclic imports
  - linter/test pass

2. **PLAT-102: Central Error & Logging Contract**
- Scope: standard error envelope + structured logs + correlation id.
- Deliverable: middleware + logger helper + docs.
- Acceptance:
  - all API/WS errors follow unified shape
  - logs include `requestId/userKey/path`

3. **SEC-103: Auth Token Lifecycle**
- Scope: short-lived access token + refresh rotation (behind feature flag).
- Deliverable: token service + revoke list storage.
- Acceptance:
  - refresh rotates old token
  - revoked token rejected on API + WS

4. **DX-104: CI Quality Lock**
- Scope: enforce `ci:check` on PR.
- Deliverable: workflow gate update.
- Acceptance:
  - PR cannot merge unless lint/build/perf/a11y/tests pass

### Risks
- Refactor churn in server imports.
- Mitigation: migrate module-by-module, keep adapter layer.

---

## Sprint 2 (Weeks 3–4) — Realtime Isolation

### Goal
Protect latency path from non-critical work.

### Tickets
1. **RT-201: Realtime Path Isolation**
- Scope: move heavy side effects out of WS message critical path.
- Deliverable: `realtime worker` path + async handoff.
- Acceptance:
  - p95 WS handling latency improves measurably
  - no dropped session events in smoke run

2. **RT-202: Queue for Heavy Jobs**
- Scope: async queue for report generation and artifact enrichment.
- Deliverable: producer/consumer + retry policy.
- Acceptance:
  - live session continues without waiting for report generation
  - retries + dead-letter policy documented

3. **OBS-203: Realtime SLO Dashboard**
- Scope: instrument latency, reconnect rate, WS close codes.
- Deliverable: metrics + alert thresholds.
- Acceptance:
  - dashboard shows p50/p95/p99 + reconnect failure %

### Risks
- Event ordering bugs.
- Mitigation: idempotency keys + monotonic sequence ids.

---

## Sprint 3 (Weeks 5–6) — Data Scale Safety

### Goal
Control data growth and query performance.

### Tickets
1. **DATA-301: Session/Transcript Index Review**
- Scope: add/adjust indexes for hot queries.
- Deliverable: migration scripts + benchmark note.
- Acceptance:
  - target queries improve by agreed threshold

2. **DATA-302: Transcript Retention & Archive**
- Scope: retention policy + archive jobs to object storage.
- Deliverable: scheduler + archive manifest.
- Acceptance:
  - records older than policy are archived and retrievable

3. **DATA-303: Table Partitioning Prep**
- Scope: monthly partition strategy for high-volume tables.
- Deliverable: partition migration + runbook.
- Acceptance:
  - write/read flow intact after partition cutover

### Risks
- Backfill load on production DB.
- Mitigation: off-peak migration windows + batched jobs.

---

## Sprint 4 (Weeks 7–8) — Security Depth

### Goal
Close high-risk security gaps for scale readiness.

### Tickets
1. **SEC-401: RBAC + Ownership Enforcement**
- Scope: centralized authz middleware (`resource ownership + role checks`).
- Deliverable: policy helpers + endpoint coverage.
- Acceptance:
  - IDOR test cases blocked

2. **SEC-402: Rate Limiting & Abuse Controls**
- Scope: per-IP/per-user limits for API + WS.
- Deliverable: Redis-backed limiter.
- Acceptance:
  - abusive traffic throttled without harming normal users

3. **SEC-403: Sensitive Logging Redaction**
- Scope: redact transcript/token/PII fields in logs.
- Deliverable: logger redaction map.
- Acceptance:
  - no raw tokens/transcripts appear in production logs

### Risks
- False positives in limiter.
- Mitigation: soft-mode rollout then hard enforcement.

---

## Sprint 5 (Weeks 9–10) — Product Throughput

### Goal
Ship higher-value capabilities on top of stable platform.

### Tickets
1. **PROD-501: Contract Completion Funnel**
- Scope: full funnel tracking from creation to completion.
- Deliverable: events + dashboard.
- Acceptance:
  - funnel visible by language/channel/user cohort

2. **PROD-502: Artifact Search MVP**
- Scope: Postgres FTS for reports/artifacts.
- Deliverable: indexed search endpoint + UI integration.
- Acceptance:
  - query latency and relevance baseline met

3. **PROD-503: Recovery UX for Reconnect**
- Scope: explicit reconnection states + resume messaging.
- Deliverable: UX copy/state handling.
- Acceptance:
  - reconnect success and confusion metrics improve

---

## Definition of Done (All Tickets)
- Code + tests + docs updated
- `ci:check` passes
- Backward compatibility verified
- Observability for new behavior added
- Rollback plan documented

---

## Execution Order (Highest ROI First)
1. ARCH-101
2. RT-201
3. DATA-302
4. SEC-401
5. PROD-501


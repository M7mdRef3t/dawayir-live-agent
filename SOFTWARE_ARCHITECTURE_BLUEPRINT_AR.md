# Software Architecture Blueprint (Principal-Level)

## 0) Context & Assumptions
- Product: Dawayir live voice coaching + cognitive artifacts + reports.
- Expected scale (assumed): `200k–1M` API requests/day + realtime WebSocket load.
- Team (assumed): `4–8` engineers (mixed seniority).
- Budget (assumed): medium startup budget, reliability-sensitive.
- Preferred stack: keep current `React + Node.js` and evolve incrementally.

---

## SECTION 1 — Architecture Options

### Option A: Modular Monolith (Recommended Now)
**Pros in our context**
- Fastest delivery with current team size.
- Lowest operational complexity for realtime + APIs.
- Easy local debugging and integration testing.

**Cons**
- Deployment blast radius larger than services.
- Needs strict module boundaries to avoid coupling.

**Hidden trade-offs**
- If boundaries are weak, migration to services later becomes expensive.
- Team autonomy is limited unless ownership is explicit.

**When we will regret it**
- Multiple squads shipping independently with conflicting release cadence.

---

### Option B: Microservices
**Pros in our context**
- Better team/service ownership at scale.
- Independent scaling for hot paths (realtime vs reporting).

**Cons**
- High early overhead: contracts, tracing, retries, local dev complexity.
- More infra cost and operational load before PMF maturity.

**Hidden trade-offs**
- "Integration tax": more time on service contracts than features.
- Data consistency across services is harder.

**When we will regret it**
- If adopted before product scope stabilizes.

---

### Option C: Serverless + Managed Realtime
**Pros in our context**
- Good time-to-market, minimal ops initially.
- Pay-per-use can be efficient early.

**Cons**
- Realtime long-lived connections are less straightforward.
- Vendor lock-in grows quickly.

**Hidden trade-offs**
- Harder deterministic latency tuning for voice loop.
- Runtime limits can force architectural rewrites later.

**When we will regret it**
- If we need strict low-latency control + heavy custom realtime orchestration.

---

### Recommendation
Adopt **Modular Monolith + Managed Infrastructure** now, with clean internal domains:
1. Auth & Identity
2. Realtime Session
3. Cognitive Artifacts
4. Analytics & Reporting

This keeps change cheap now and preserves a clean extraction path later.

---

## SECTION 2 — System Diagram (Text)

```text
Client Layer
  ├── Web App (React/Vite)
  ├── Optional Mobile Wrapper (PWA/Capacitor, later)
  └── CDN + Edge Cache (Cloudflare or CloudFront)

API Layer
  ├── API Gateway / BFF (Node.js)
  ├── Auth Module (JWT + refresh rotation)
  ├── Realtime Session Module (WebSocket)
  ├── Artifacts Module (reports/contracts/progress)
  └── Analytics Module (events + aggregates)

Data Layer
  ├── Primary DB: PostgreSQL
  ├── Cache: Redis (session hot state + rate limits)
  ├── Search: PostgreSQL FTS first, OpenSearch later
  └── File Storage: S3-compatible object storage

Infrastructure
  ├── Cloud Provider: AWS (primary region near users, DR secondary)
  ├── Compute: ECS Fargate now (K8s only if needed later)
  └── CI/CD:
      ├── quality gates (lint/build/perf/a11y/tests)
      ├── security checks
      └── blue/green deploy
```

---

## SECTION 3 — Data Decisions

### 1) `users`
- Schema: `id, email_or_phone, locale, status, created_at, updated_at`
- DB choice: PostgreSQL for strong consistency + relational integrity.
- Indexing: unique(email_or_phone), index(status), index(created_at).
- Growth impact: low risk; linear growth with user base.

### 2) `sessions`
- Schema: `id, user_id, started_at, ended_at, state, metadata_jsonb`
- DB choice: PostgreSQL (transactional session lifecycle).
- Indexing: `(user_id, started_at DESC)`, `(state, started_at)`.
- Growth impact: high volume table; partition by month when 10x.

### 3) `transcript_events`
- Schema: `id, session_id, role, text, ts, source, attrs_jsonb`
- DB choice: PostgreSQL first (simple ops), archive old rows to object storage.
- Indexing: `(session_id, ts)`, optional GIN on attrs_jsonb.
- Growth impact: highest write volume; enforce retention + archive policy.

### 4) `cognitive_artifacts`
- Schema: `id, session_id, type, payload_jsonb, version, created_at`
- DB choice: PostgreSQL (versioned artifacts with joins to sessions/users).
- Indexing: `(session_id, created_at DESC)`, `(type, created_at DESC)`.
- Growth impact: medium; manageable with cold storage snapshots.

### 5) `security_audit_events`
- Schema: `id, actor_id, action, resource_type, resource_id, ip_hash, ts`
- DB choice: PostgreSQL (queryable audit trail).
- Indexing: `(actor_id, ts DESC)`, `(action, ts DESC)`.
- Growth impact: medium-high; use retention windows.

---

## SECTION 4 — Security by Design

### Authentication
- Access token: short-lived JWT.
- Refresh token: rotation + revocation list.
- Optional device binding for suspicious sessions.

### Authorization
- Start with RBAC (`user`, `support`, `admin`) + resource ownership checks.
- Add ABAC conditions for sensitive operations as scale increases.

### Likely attack surfaces
1. WebSocket token abuse/replay.
2. IDOR on session/report/artifact endpoints.
3. Prompt/tool input injection.
4. Rate abuse / DoS on realtime endpoints.
5. Sensitive data leakage in logs.

### OWASP Top 5 (most applicable)
1. Broken Access Control:
  enforce ownership checks on every resource endpoint.
2. Cryptographic Failures:
  TLS everywhere, encrypted at rest, secret rotation.
3. Injection:
  strict input validation, parameterized queries, safe tool argument parsing.
4. Security Misconfiguration:
  explicit CORS, secure headers, least-privilege IAM.
5. Identification & Authentication Failures:
  token expiry discipline, refresh rotation, anomaly detection.

---

## SECTION 5 — Evolution Roadmap

### MVP (Weeks 1–4)
- Single deployable modular monolith.
- Core live session, artifact storage, basic dashboard.
- PostgreSQL + Redis.
- Mandatory CI quality gates.

### Growth (Months 3–6, ~10x)
- Split hot realtime workers from core API process.
- Add async queue for heavy/report jobs.
- Introduce read replicas + table partitioning.
- Tighten observability (SLOs + tracing + alerting).

### Scale (Months 6–18, ~100x)
- Extract services by domain boundary:
  `realtime`, `artifacts`, `analytics`.
- Event-driven internal pipeline.
- Dedicated search service if FTS limits reached.
- Multi-region DR and runbooks.

### 3 risky decisions now
1. Skipping domain boundaries inside monolith.
2. No transcript retention/archival strategy.
3. Mixing realtime critical path with heavy report generation.

---

## Decision Summary
- **Now:** Modular monolith.
- **Near future:** isolate hot paths + async processing.
- **Later:** selective service extraction based on real bottlenecks, not hype.

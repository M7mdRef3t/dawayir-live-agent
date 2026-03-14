# ADR-004: Isolate Realtime Hot Path

## Status
Accepted

## Context
Realtime voice/session flow is latency-sensitive and must not be blocked by heavy jobs.

## Decision
Keep realtime processing on an isolated execution path/process from reporting and long-running tasks.

## Consequences
- Lower tail latency and better user experience.
- Slightly higher deployment complexity.

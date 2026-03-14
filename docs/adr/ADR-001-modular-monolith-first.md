# ADR-001: Start with Modular Monolith

## Status
Accepted

## Context
Current team size and product maturity favor speed and low operational complexity.

## Decision
Adopt a modular monolith with explicit domain boundaries:
- auth
- realtime-session
- artifacts
- analytics

## Consequences
- Faster initial delivery and lower ops overhead.
- Requires strict ownership/boundaries to prevent coupling.
- Enables selective extraction into services later.

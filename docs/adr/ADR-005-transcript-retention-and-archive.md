# ADR-005: Transcript Retention and Archival Policy

## Status
Accepted

## Context
Transcript events are the fastest-growing dataset and can impact cost/performance.

## Decision
Apply retention windows with periodic archival to object storage:
- hot data in PostgreSQL
- cold data archived for compliance/analytics

## Consequences
- Predictable DB growth and lower storage pressure.
- Requires retrieval tooling for archived records.

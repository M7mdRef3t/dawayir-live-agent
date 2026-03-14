# ADR-002: Use PostgreSQL as Primary Data Store

## Status
Accepted

## Context
Core data is relational (users, sessions, artifacts, audit events) with transactional needs.

## Decision
Use PostgreSQL as the primary system of record.

## Consequences
- Strong consistency and mature tooling.
- Requires partitioning/archival strategy for high-volume transcript events.

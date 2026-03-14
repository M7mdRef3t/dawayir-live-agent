# ADR-003: JWT + Refresh Token Rotation

## Status
Accepted

## Context
The system includes API and WebSocket access requiring stateless auth with revocation controls.

## Decision
Use short-lived JWT access tokens with refresh token rotation and revocation list.

## Consequences
- Better security posture than long-lived static tokens.
- Requires token lifecycle management and monitoring.

# WebSocket Contract (Dawayir Live Agent)

Last updated: March 12, 2026

## 1) Standard Event Envelope

All server-side status/telemetry events should use:

```json
{
  "event": {
    "type": "server_status | hybrid_status | debug_transcription",
    "requestId": "uuid-or-client-provided-id",
    "payload": {}
  }
}
```

## 2) Standard Error Envelope

```json
{
  "error": {
    "code": "string_code",
    "message": "human readable",
    "requestId": "uuid-or-client-provided-id",
    "details": {}
  }
}
```

## 3) Backward Compatibility (Temporary)

During migration, server also sends legacy keys alongside `event`:

- `serverStatus` (with `event.type = "server_status"`)
- `hybridStatus` (with `event.type = "hybrid_status"`)
- `debugTranscription` (with `event.type = "debug_transcription"`)

## 4) Tool Calls

Tool calls stay in their existing shape:

```json
{
  "toolCall": {
    "functionCalls": []
  }
}
```

## 5) Deprecation Plan

1. Phase A (active now, from March 12, 2026): send both `event` + legacy keys.
2. Phase B (target April 15, 2026): client reads only `event`; keep legacy emission enabled.
3. Phase C (target May 15, 2026): remove legacy keys from server emission.

## 6) Feature Flag

Server supports:

- `WS_LEGACY_FIELDS=1` (default): emit legacy keys with `event`.
- `WS_LEGACY_FIELDS=0`: emit `event` only (no `serverStatus` / `hybridStatus` / `debugTranscription`).

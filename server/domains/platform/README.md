# Platform Domain

Cross-cutting HTTP platform concerns:

- Request context (`x-request-id`) propagation.
- Standard API error envelope via `sendError`.

## Error Contract

```json
{
  "ok": false,
  "error": {
    "code": "some_error_code",
    "message": "Human-readable error",
    "requestId": "uuid-or-forwarded-id"
  }
}
```

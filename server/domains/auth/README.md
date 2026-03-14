# Auth Domain

Responsibilities:
- API token validation
- User key normalization/binding to authenticated token
- Shared auth middleware for REST/WS entry points

Public API:
- `createApiTokenMiddleware`
- `normalizeUserKey`
- `buildBoundUserKeyFromToken`
- `resolveSessionUserKey`


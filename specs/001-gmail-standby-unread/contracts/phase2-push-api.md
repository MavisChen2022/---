# Contract: Phase 2 — C# Web Push API (placeholder)

**Status**: Not in MVP — documented for future implementation

## Endpoints (planned)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Register Web Push subscription |
| POST | `/api/push/notify` | Internal trigger (webhook pipeline) |
| POST | `/api/webhooks/gmail` | Gmail Pub/Sub push receiver |

## MVP replacement

- 60s foreground polling
- `visibilitychange` refresh
- `Notification` API client-side

No implementation required until Phase 2 roadmap item is scheduled.

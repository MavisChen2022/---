# Contract: Backend Push/Webhook Extensions

**Status**: Backend now exists in MVP for OAuth, Gmail sync, and module APIs. Web Push and external webhook ingestion remain future extensions.

## Endpoints (planned)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Register Web Push subscription |
| POST | `/api/push/notify` | Internal trigger (webhook pipeline) |
| POST | `/api/webhooks/gmail` | Gmail Pub/Sub push receiver |

## MVP backend endpoints already implemented

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/login` | Start Google OAuth code flow |
| GET | `/api/auth/callback` | Exchange code using backend `client_secret` |
| GET | `/api/auth/status` | Return frontend login state |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/gmail/inbox` | Return INBOX unread and top unread summaries |
| GET | `/api/modules` | Return available module manifests |
| GET | `/api/modules/{id}/assets/{path}` | Serve module assets |

## Still future work

- Server-triggered Web Push
- Gmail Pub/Sub webhook receiver
- Persistent encrypted token database

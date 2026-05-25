# Contract: Gmail INBOX Unread Sync

**Scope**: MVP frontend/backend split. Vue PWA calls the C# backend; only the backend calls Google OAuth/Gmail APIs.

## OAuth scopes

```
https://www.googleapis.com/auth/gmail.readonly
```

## Frontend-facing endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/status` | Returns `{ connected, email, status }` |
| GET | `/api/auth/login` | Redirects user to Google OAuth |
| GET | `/api/auth/callback` | Google redirects here; backend exchanges code with `client_secret` |
| POST | `/api/auth/logout` | Clears HttpOnly session and backend token state |

### Gmail sync

```
GET /api/gmail/inbox
Cookie: avatarmail.session=...
```

Response:

```json
{
  "unreadCount": 3,
  "messages": [],
  "syncedAt": "2026-05-25T00:00:00Z",
  "status": "ok"
}
```

## Backend Google calls

### Unread count (primary)

```
GET https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX
Authorization: Bearer {accessToken}
```

Use response field: `messagesUnread` (integer)

## Message list (summary, optional per sync)

```
GET https://gmail.googleapis.com/gmail/v1/users/me/messages
  ?labelIds=INBOX
  &q=is:unread
  &maxResults=20
```

Then batch `messages.get` with `format=metadata` and `metadataHeaders=Subject,From`.

Access tokens and refresh tokens are backend-only. The frontend must never receive Google tokens.

## Polling

| Event | Action |
|-------|--------|
| App visible + interval 60s | Full sync |
| `visibilitychange` → `visible` | Immediate sync |
| App hidden | Pause interval |

## Errors

| HTTP | UI state |
|------|----------|
| 401 | `auth_error` → reconnect Gmail |
| Network | `offline` → use cache |
| 403 scope | Show scope error |

## Privacy

- Do not persist full message bodies
- Store only fields in `messages` entity (data-model.md)
- Store Google token server-side only; frontend uses HttpOnly session cookie

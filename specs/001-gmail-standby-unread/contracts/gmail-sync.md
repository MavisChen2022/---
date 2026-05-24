# Contract: Gmail INBOX Unread Sync

**Scope**: MVP client-only

## OAuth scopes

```
https://www.googleapis.com/auth/gmail.readonly
```

## Unread count (primary)

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

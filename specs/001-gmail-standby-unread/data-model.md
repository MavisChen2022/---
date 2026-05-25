# Data Model: 001-gmail-standby-unread

**Date**: 2026-05-24

## IndexedDB

**Database**: `avatar-platform`  
**Version**: `1`

### Store: `user_settings`（key-value，key = `"default"`）

| Field | Type | Description |
|-------|------|-------------|
| `stateThresholds` | `Record<AvatarState, ThresholdRange>` | 使用者門檻 |
| `activeModuleId` | `string` | 如 `cat-pack` |
| `displayRule` | `"RULE_RESET_ON_WAKE"` \| `"RULE_LIVE_UNREAD"` | 二擇一 |
| `displayUnreadBaseline` | `number` | 規則一重置後基準 |
| `notificationEnabled` | `boolean` | 是否允許本機通知 |
| `onboardingCompleted` | `boolean` | 安裝／授權引導完成 |

**ThresholdRange**:
```typescript
interface ThresholdRange {
  min: number;      // integer >= 0
  max: number | null; // null = +∞，僅 panic 允許
}
```

**Default** (first run):
```json
{
  "stateThresholds": {
    "sleep": { "min": 0, "max": 0 },
    "normal": { "min": 1, "max": 5 },
    "busy": { "min": 6, "max": 20 },
    "panic": { "min": 21, "max": null }
  },
  "activeModuleId": "cat-pack",
  "displayRule": "RULE_LIVE_UNREAD",
  "displayUnreadBaseline": 0,
  "notificationEnabled": true,
  "onboardingCompleted": false
}
```

**Validation** (on save):
- States keys exactly: `sleep`, `normal`, `busy`, `panic`
- Ranges partition `[0, ∞)` with no gaps/overlaps
- Only `panic` may have `max: null`

---

### Store: `unread_counter`（key = `"gmail-inbox"`）

| Field | Type | Description |
|-------|------|-------------|
| `source` | `"gmail-inbox"` | 固定 |
| `count` | `number` | INBOX 未讀總數 |
| `displayCount` | `number` | 規則一時用 baseline 計算後之「顯示用未讀」 |
| `resolvedState` | `AvatarState` | 引擎輸出 |
| `syncedAt` | `ISO8601 string` | 最後成功同步 |
| `status` | `"ok"` \| `"offline"` \| `"auth_error"` | |

---

### Store: `messages`（key = Gmail `messageId`）

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Gmail message id |
| `threadId` | `string` | |
| `subject` | `string` | 摘要用 |
| `from` | `string` | |
| `snippet` | `string` | |
| `internalDate` | `number` | |
| `isUnread` | `boolean` | |

**Retention**: 最多保留最近 **50** 筆未讀摘要；超出刪最舊（配額保護）。

---

### Store: `installed_modules`（key = `moduleId`）

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | |
| `manifest` | `ModuleManifest` | 解析後 JSON |
| `baseUrl` | `string` | 如 `/modules/cat-pack/` |
| `enabled` | `boolean` | |
| `installedAt` | `ISO8601` | |
| `validationStatus` | `"valid"` \| `"invalid"` | |
| `validationErrors` | `string[]` | |

---

## Runtime types（TypeScript）

```typescript
type AvatarState = "sleep" | "normal" | "busy" | "panic";

interface ModuleManifest {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  preview: string;
  compatibility: { minRuntimeVersion: string };
  renderers?: { lottie?: string };
  states: Record<AvatarState, StateAssets>;
  transitions?: { default: { duration: number; easing: string } };
  performance?: {
    preferredFPS?: number;
    backgroundBehavior?: "pause";
    lowPowerFallback?: "static";
  };
}

interface StateAssets {
  image: string;
  animation: null | {
    type: "apng" | "webp" | "json";
    src: string;
    loop: boolean;
    fps?: number;
    renderer?: "lottie";
  };
}
```

---

## State transitions

### Avatar 狀態解析

```
displayUnread = f(displayRule, actualUnread, displayUnreadBaseline)
state = resolveState(displayUnread, stateThresholds)
assets = manifest.states[state]
```

### 規則一 `RULE_RESET_ON_WAKE`

- On `visibilitychange` → `visible`: set `displayUnreadBaseline = actualUnread` at wake
- `displayCount` for UI = `max(0, actualUnread - displayUnreadBaseline)` **或** spec 語意「重置基準」→ 實作為 wake 時 baseline = actualUnread，之後 display 用 `actualUnread - baseline` 的增量驅動狀態（plan 實作採 **增量未讀** 驅動狀態，wake 時 baseline 快照）

**Clarified implementation** (from spec): 解除待機後「顯示用未讀基準重置」→ 重置後 `displayUnread = 0` 直至新郵件增加未讀；wake 事件將 `displayUnreadBaseline` 設為當前 `actualUnread`，`displayUnread = actualUnread - baseline` → 0 at wake.

### 規則二 `RULE_LIVE_UNREAD`

- `displayUnread = actualUnread` always

---

## Gmail 帳戶（backend session）

Google tokens are stored backend-side only. The frontend stores no Google access token or refresh token.

| Field | Storage |
|-------|---------|
| `accessToken` | C# backend session / token store |
| `refreshToken` | C# backend session / future encrypted DB |
| `email` | `user_settings.gmailEmail` |

**Privacy**: 不存郵件正文；僅 snippet；符合 Constitution V。

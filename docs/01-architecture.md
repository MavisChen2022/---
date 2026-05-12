# 01 — 系統架構

## 1. 系統定位

**UnreadSync** 是一個 **PWA Avatar Platform**，主要功能：

- 透過 **LINE LIFF** 登入辨識使用者
- 接收訊息（Phase 1 為 mock，未來接 LINE Webhook / Web Push）
- 依「未讀數」自動切換 Avatar 視覺狀態（sleep / normal / busy / panic）
- 模組化的 Avatar Pack（圖像 + 動畫）系統，可動態增減
- 本機資料為主、後端只做認證 + 模組索引 + 未來 push 中繼

## 2. 系統分層（V3 心智圖凍結版）

```
┌──────────────────────────────────────────────────────────┐
│  1??  Client Layer (PWA 前端)                              │
│  ────────────────────────────────────────────────────    │
│  ? UI Framework        Vue 3 + Tailwind + Naive UI       │
│  ? PWA Core            Service Worker (Workbox) +        │
│                        IndexedDB (idb) + Web Push 預留    │
│  ? Auth Layer          LIFF SDK + JWT + Session Store    │
│  ? Event Bus           mitt                              │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  2??  Module System                                        │
│  ────────────────────────────────────────────────────    │
│  ? Build-time Index    本地 modules.index.json (主)       │
│  ? Server Index API    GET /api/modules/index (補充)      │
│  ? Module Loader       lazy load + cache                 │
│  ? Features            enable/disable + preview          │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  3??  Avatar Runtime Engine                                │
│  ────────────────────────────────────────────────────    │
│  ? State Engine        sleep / normal / busy / panic     │
│  ? State Rule Engine   unread → state mapping            │
│  ? Trigger System      messageRead / unreadChanged /     │
│                        appResume / visibility / manual    │
│  ? Recalculation       debounced batch update            │
│  ? Render Pipeline     state → module → animation        │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  4??  Animation Runtime                                    │
│  ────────────────────────────────────────────────────    │
│  ? Formats             APNG / Animated WebP / Lottie     │
│  ? Renderers           原生 <img> / dotlottie-web (WASM) │
│  ? Controls            play / pause / fps / loop         │
│  ? Power Strategy      background pause / low fps        │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  5??  Lifecycle & Power Manager                            │
│  ────────────────────────────────────────────────────    │
│  ? visibilitychange    pause animation on hide           │
│  ? focus / blur        reduce fps on blur                │
│  ? pageshow/pagehide   bfcache 友善                       │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  6??  User Settings System                                 │
│  ────────────────────────────────────────────────────    │
│  ? State Rules         閾值（normal/busy/panic）          │
│  ? Trigger Settings    readThresholdReset / resumeReset  │
│  ? UI Settings         module / animation / fps / theme  │
│  ? Accessibility       reduced motion / low power        │
└──────────────────────────────────────────────────────────┘
                          │
┌──────────────────────────────────────────────────────────┐
│  7??  Data Layer                                           │
│  ────────────────────────────────────────────────────    │
│  ? IndexedDB Stores    messages, user_settings,          │
│                        module_cache, auth                │
│  ? ※ 不存 unread_counter（從 messages 即時算）             │
└──────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS / JSON
                          │
┌──────────────────────────────────────────────────────────┐
│  8??  Backend (C# ASP.NET Core 10 Minimal API)             │
│  ────────────────────────────────────────────────────    │
│  ? LIFF Auth           驗 LINE ID Token + 簽自家 JWT      │
│  ? Module Index API    /api/modules/index                │
│  ? Static Files        wwwroot/modules/* 公開             │
│  ? Webhook Receiver    Phase 1.5+ 才接 LINE Bot           │
│  ? Push Service        Phase 1.5+ 才做 Web Push           │
│  ? SQLite (EF Core)    使用者資料 minimum 存              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  9??  Future Expansion                                     │
│  ────────────────────────────────────────────────────    │
│  Live2D / AI Avatar / Marketplace / UGC Modules /        │
│  Cloud Sync / Theme Engine                               │
└──────────────────────────────────────────────────────────┘
```

## 3. 主要資料流（Phase 1, Mock 模式）

```
使用者按下「+1 訊息」(Settings.Mock)
        │
        ▼
messagesStore.addMessage({ id, text, time, read: false })
        │
        ▼
Pinia 響應式系統觸發 computed
        │
        ▼
unread = messages.filter(m => !m.read).length   (Vue computed)
        │
        ▼
emit Event Bus: 'unread:changed' { count }
        │
        ▼
Recalculation Engine (debounce 50ms)
        │
        ▼
State Rule Engine: unread → newState
        │
        ▼
emit Event Bus: 'state:transition' { from, to }
        │
        ▼
Render Pipeline: state → activeModule → animation
        │
        ▼
Animation Runtime: crossfade 300ms → 新動畫
        │
        ▼
畫面更新（Avatar 換臉）
```

## 4. 主要資料流（Phase 1.5+, 真實 LINE 訊息）

```
LINE 使用者傳訊息 → Bot
        │
        ▼
LINE Platform → POST /api/webhook/line
        │
        ▼
驗 x-line-signature → 解析 events → 找對應 push subscription
        │
        ▼
web-push 套件 → 送 Web Push notification
        │
        ▼
PWA Service Worker 收到 push event
        │
        ▼
寫入 IndexedDB.messages (read=false)
        │
        ▼
postMessage 給主執行緒（或 client 重新讀 store）
        │
        ▼
（後續同 Phase 1 流程，從 unread changed 開始）
```

## 5. 認證流程概覽

```
PWA 啟動 → liff.init() → 是否 isLoggedIn()
                              │
                  No ─────────┴───────── Yes
                  │                       │
            顯示登入頁                liff.getIDToken()
                  │                       │
            liff.login()                  ▼
                  │              POST /api/auth/line
            (LINE 跳轉)                   │
                  │                       ▼
                  └─→ ?  後端驗簽 + 簽自家 JWT (30 天)
                              │
                              ▼
                  前端存 JWT 於 IndexedDB.auth
                              │
                              ▼
                  後續 API 帶 Authorization: Bearer ...
                              │
                              ▼
                  進入 Avatar Dashboard
```

詳見 `04-auth-flow.md`。

## 6. 模組系統概覽

```
modules/
  ├── modules.index.json        (build-time 自動生成)
  └── cat-pack/
       ├── manifest.json
       ├── preview.webp
       ├── states/
       │    ├── sleep.webp
       │    ├── normal.webp
       │    ├── busy.webp
       │    └── panic.webp
       ├── animations/
       │    ├── normal.apng
       │    ├── busy.webp
       │    └── panic.json
       └── assets/              (future: sounds, etc.)
```

合併策略：

```
Module Loader 啟動:
  1. 讀本地 modules.index.json
  2. fetch /api/modules/index (timeout 3s)
       ├ 成功 → 取「本地沒有的 id」加入清單
       └ 失敗 → 略過，純用本地
  3. 寫入 IndexedDB.module_cache
```

詳見 `08-manifest-schema.md`、`13-module-loader.md`。

## 7. 邊界與責任

| 區塊 | 責任 | 不負責 |
|------|------|--------|
| **前端** | UI / 狀態演算 / 動畫渲染 / 本機快取 | 訊息正確性（信任 push 內容） |
| **後端** | 認證 / 模組目錄 / 未來 push 中繼 | 不存使用者訊息（Phase 1） |
| **LIFF / LINE** | 使用者身份來源 | 不負責訊息儲存 |
| **IndexedDB** | 本機持久化 | 不負責跨裝置同步（Phase 2+） |
| **Service Worker** | 離線快取 / push 接收 | 不直接渲染 UI |

## 8. 不在本系統範圍的事

- 多人對話（這是 1 人 1 Avatar）
- 訊息回覆能力（這是「狀態觀看器」）
- 雲端資料同步（Phase 2+）
- 付費模組商城（Phase 2+）
- AI 對話 / Live2D（Future）

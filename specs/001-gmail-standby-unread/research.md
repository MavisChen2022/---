# Research: 001-gmail-standby-unread

**Date**: 2026-05-24  
**Spec**: [spec.md](./spec.md)

## R1 — Frontend stack

**Decision**: Vue 3.5+ · Vite 6 · TypeScript 5 · Vue Router 4 · Pinia 2

**Rationale**: Spec 規劃偏好 Vue；Composition API 利於 Avatar Runtime 與服務分層；Pinia 管理 `user_settings` 與同步狀態。

**Alternatives considered**:
- React：可行，但與 spec Planning Inputs 不一致
- Nuxt：MVP 不需 SSR，Vite SPA 較輕

---

## R2 — PWA & Service Worker

**Decision**: `vite-plugin-pwa`（Workbox）· `display: standalone` · 快取 `public/modules/**` 與 app shell

**Rationale**: 符合 iOS/Android 安裝需求；模組資源可離線讀取；MVP 不依賴 Push SW 事件處理未讀（無 C# 後端）。

**Alternatives considered**:
- 手寫 SW：維護成本高
- 不做 PWA：無法滿足主畫面捷徑與雙平台 spec

---

## R3 — Gmail 未讀（INBOX only）

**Decision**: OAuth 2.0 Authorization Code + PKCE（Google Identity Services / `@react-oauth/google` 或自管 redirect）· Gmail API `users.messages.list` with `labelIds=INBOX` + `q=is:unread` · 以 `resultSizeEstimate` 或分頁計數取得未讀總數

**Rationale**: Clarification 明確僅 INBOX；REST 可直接在 PWA 呼叫；無需 Phase 2 Webhook。

**Alternatives considered**:
- `users.labels.get` 的 `messagesUnread` on INBOX label：更省流量，**首選實作**
- Pub/Sub + 後端：Phase 2

**Implementation note**: 優先使用 `users.labels.get(userId, 'INBOX')` → `messagesUnread`；列表 API 僅用於訊息摘要（`messages` store）。

---

## R4 — 同步策略（MVP）

**Decision**:
- 前景 `setInterval` **60_000 ms**
- `document.visibilitychange` → `visible` 時立即 `syncInboxUnread()`
- 僅在 `document.visibilityState === 'visible'` 時啟動 interval（節省電量）

**Rationale**: 與 Clarifications 一致；避免背景無限輪詢被 OS 節流。

**Alternatives considered**:
- Background Sync API：支援不一致，作為增強項
- C# Web Push：Phase 2

---

## R5 — 本機通知

**Decision**: Web Notifications API · 僅在 `Notification.permission === 'granted'` 且未讀數變更時 `showNotification` · `icon` 使用當前狀態 `image` 絕對 URL

**Rationale**: MVP 明確排除伺服器 Push；鎖定畫面能見度依授權與平台能力。

**Alternatives considered**:
- 僅 App 內 UI：不符合 spec 產品承諾（已授權通知者）

---

## R6 — IndexedDB

**Decision**: `idb` 庫 · DB 名 `avatar-platform` v1 · stores：`messages`、`unread_counter`、`installed_modules`、`user_settings`

**Rationale**: 輕量、Promise API、符合 spec 四 store 命名。

---

## R7 — 模組 Loader & Renderer

**Decision**:
- 掃描 `GET /modules/index.json`（建置時生成）或啟動時 probe `cat-pack` + 未來 manifest 列表
- MVP：靜態 `public/modules/` · 啟動 fetch `/modules/{id}/manifest.json`
- `animation.type === 'json'` → `import(/* @vite-ignore */ manifest.renderers.lottie)` 動態載入模組 ESM
- App **不** bundle `lottie-web`

**Rationale**: Clarification 要求模組自帶 renderer；`cat-pack` 已示範。

**Alternatives considered**:
- 全域 lottie-web：違反澄清決策
- iframe 沙箱模組：過重

---

## R8 — 測試

**Decision**: Vitest · Vue Test Utils · `@vue/test-utils` · 單元測試狀態引擎／manifest 驗證 · Playwright 可選 E2E（Phase 1.5）

**Rationale**: Constitution I 要求自動測試；Vitest 與 Vite 原生整合。

---

## R9 — Badging（主畫面圖示）

**Decision**: Navigator `setAppBadge` / `clearAppBadge` when available；不支援時僅 App 內顯示

**Rationale**: 滿足 PWA 主畫面未讀提示；iOS 16.4+ / Android 漸進支援。

---

## R10 — Phase 2 邊界

**Decision**: 不建立 `backend/` 於 MVP · `contracts/phase2-push-api.md` 僅文件預留

**Rationale**: spec FR-040/041 明確排除。

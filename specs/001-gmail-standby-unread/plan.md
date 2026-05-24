# Implementation Plan: PWA Avatar Notification Platform — Gmail 未讀 Avatar（001）

**Branch**: `001-gmail-standby-unread` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-gmail-standby-unread/spec.md`（含 Clarifications 2026-05-24）

## Summary

建置 **Vue 3 PWA**，以 **Gmail INBOX 未讀數** 驅動 **Avatar 四狀態**（sleep／normal／busy／panic），透過 **可熱插拔模組**（`public/modules/`，manifest `1.0.0`）渲染靜態 WebP／APNG／Lottie（模組自帶 renderer）。MVP 採 **60 秒前景輪詢**、**visibilitychange 立即同步**、**Notification API 本機通知**；**不含 C# Web Push**。內建 **`cat-pack`** 為預設模組。

## Technical Context

**Language/Version**: TypeScript 5.x · Vue 3.5+ · Node 20 LTS

**Primary Dependencies**: Vite 6 · vue-router · pinia · vite-plugin-pwa · idb · @vueuse/core（visibility）· Ajv（manifest 驗證，可選）

**Storage**: IndexedDB `avatar-platform` v1（`messages`, `unread_counter`, `installed_modules`, `user_settings`）

**Testing**: Vitest · @vue/test-utils · 單元：state engine、threshold validation、manifest loader

**Target Platform**: PWA on **iOS Safari**、**Android Chrome**（installed to home screen）

**Project Type**: Single-page web application（frontend-only MVP）

**Performance Goals**: 狀態切換 UI &lt; 100ms（靜態）；動畫 15 FPS cap per module `performance.preferredFPS`；Gmail label API &lt; 2s p95 on 4G

**Constraints**: HTTPS required（Gmail OAuth）；前景 60s 輪詢；模組 renderer 動態 import；無全域 lottie-web；僅 INBOX 未讀

**Scale/Scope**: 單使用者單 Gmail 帳戶 · 4 畫面（Dashboard、Modules、Messages、Settings）· 1 內建模組 · Phase 2 才加後端

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How plan addresses it |
|-----------|--------|------------------------|
| **I. Automated testing** | PASS | Vitest for state engine, threshold validator, manifest schema; `npm test` in CI；implement 階段每任務跑測試 |
| **II. Modular architecture** | PASS | `core/`（engine、loader、render）· `services/`（gmail、sync、notify）· `stores/` · `views/` 分層；模組目錄獨立 |
| **III. Code quality** | PASS | ESLint + Prettier；TypeScript strict；單一職責服務 |
| **IV. UX consistency** | PASS | 共用 Layout、Toast 錯誤、離線／auth 狀態列；設定與 Dashboard 術語統一 |
| **V. Privacy & performance** | PASS | 僅 INBOX 未讀 + snippet；token session 優先；文檔化 IDB 保留策略；60s 輪詢僅 visible |

**Post-design re-check**: PASS — 無憲法違規；Phase 2 後端已明確排除於 MVP。

## Project Structure

### Documentation (this feature)

```text
specs/001-gmail-standby-unread/
├── plan.md              # 本檔
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── module-manifest-v1.schema.json
│   ├── module-renderer-interface.md
│   ├── gmail-sync.md
│   └── phase2-push-api.md
└── tasks.md             # /speckit-tasks（尚未產生）
```

### Source Code (repository root)

```text
public/
├── modules/
│   ├── index.json              # 可選：["cat-pack"] 模組清單
│   └── cat-pack/               # 已存在（內建預設）
├── icons/                      # PWA icons
└── manifest.webmanifest        # 或由 vite-plugin-pwa 生成

src/
├── main.ts
├── App.vue
├── router/
│   └── index.ts
├── views/
│   ├── DashboardView.vue
│   ├── ModulesView.vue
│   ├── MessagesView.vue
│   └── SettingsView.vue
├── components/
│   ├── AvatarCanvas.vue
│   ├── StateThresholdEditor.vue
│   ├── ModuleCard.vue
│   └── InstallGuideBanner.vue
├── core/
│   ├── avatar/
│   │   ├── state-engine.ts
│   │   ├── threshold-validator.ts
│   │   └── types.ts
│   ├── modules/
│   │   ├── module-loader.ts
│   │   ├── manifest-validator.ts
│   │   └── module-registry.ts
│   └── render/
│       ├── render-engine.ts
│       ├── static-webp.ts
│       ├── apng-player.ts
│       └── webp-animated.ts
├── services/
│   ├── gmail/
│   │   ├── oauth.ts
│   │   └── inbox-sync.ts
│   ├── sync-scheduler.ts
│   └── notification-service.ts
├── stores/
│   ├── settings.ts
│   ├── gmail.ts
│   ├── modules.ts
│   └── avatar.ts
├── db/
│   ├── index.ts
│   └── migrations/v1.ts
└── composables/
    ├── useVisibilitySync.ts
    └── useAvatarDisplay.ts

tests/
├── unit/
│   ├── state-engine.spec.ts
│   ├── threshold-validator.spec.ts
│   └── manifest-validator.spec.ts
└── fixtures/
    └── manifests/

.env.example                 # VITE_GOOGLE_CLIENT_ID
```

**Structure Decision**: 單一 **frontend** 專案（Vue + Vite）；**無 `backend/`** 於 MVP。Avatar 與模組為 `core/`；Gmail／通知為 `services/`。既有 `public/modules/cat-pack/` 保留為預設模組。

## Implementation Phases（高層）

### Phase A — 骨架（P1）

- `npm create vite@latest` → Vue + TS
- vite-plugin-pwa、vue-router、pinia、idb
- 路由四頁空殼 + InstallGuideBanner
- IndexedDB v1 + 預設 `user_settings`

### Phase B — 模組系統（P1）

- `module-loader` fetch `/modules/{id}/manifest.json`
- Ajv 驗證 `contracts/module-manifest-v1.schema.json`
- 註冊 `cat-pack`；Modules 頁預覽
- `RenderEngine` 靜態 WebP + panic Lottie via module renderer

### Phase C — Avatar 狀態引擎（P1）

- `state-engine` + `threshold-validator`
- Settings：`StateThresholdEditor` + 即時預覽
- Dashboard：`AvatarCanvas` 綁定 store

### Phase D — Gmail（P1）

- OAuth PKCE（`VITE_GOOGLE_CLIENT_ID`）
- `inbox-sync`：`labels.get` INBOX → `messagesUnread`
- 訊息列表（top 20 unread metadata）
- `sync-scheduler`：60s + `useVisibilitySync`

### Phase E — 通知 & 規則（P1）

- `notification-service` on unread change
- `RULE_RESET_ON_WAKE` vs `RULE_LIVE_UNREAD`（見 data-model.md）
- Badging API when available

### Phase F — 測試 & 打磨（P2）

- Vitest 覆蓋核心邏輯
- 離線／auth 錯誤 UX
- iOS/Android 手動驗收清單（spec SC-001～008）

## Key Design Decisions

| Topic | Decision | Reference |
|-------|----------|-----------|
| Unread source | INBOX `messagesUnread` | [research.md](./research.md) R3 |
| Sync | 60s visible + visibility refresh | R4 |
| Notifications | Notification API only | R5 |
| Modules path | `public/modules/` → `/modules/*` | R7 |
| Default module | `cat-pack` | spec FR-007d |
| Lottie | Module `renderers.lottie` ESM | [contracts/module-renderer-interface.md](./contracts/module-renderer-interface.md) |
| C# API | Phase 2 | [contracts/phase2-push-api.md](./contracts/phase2-push-api.md) |

## Complexity Tracking

> 無憲法例外；此表留空。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Artifacts Generated

| Artifact | Path |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
| Manifest schema | [contracts/module-manifest-v1.schema.json](./contracts/module-manifest-v1.schema.json) |
| Renderer contract | [contracts/module-renderer-interface.md](./contracts/module-renderer-interface.md) |
| Gmail contract | [contracts/gmail-sync.md](./contracts/gmail-sync.md) |

## Next Step

執行 **`/speckit-tasks`** 將本 plan 拆解為可實作任務清單，再 **`/speckit-implement`**。

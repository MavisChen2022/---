# 13 — Module Loader（模組載入與索引合併）

## 1. 設計目標

- 啟動時取得「目前可用模組清單」
- 本地內建模組永遠可用（離線可跑）
- 遠端模組為補充（不覆蓋本地）
- 切換 module 時 lazy load manifest
- 快取至 IndexedDB.module_cache

## 2. 凍結策略

| 項目 | 決定 |
|------|------|
| 索引合併策略 | **本地優先，遠端補充** |
| 本地索引產生 | **build-time（Vite plugin / 腳本掃 modules/）** |
| 遠端索引 timeout | **3 秒**，失敗純用本地 |
| 模組檔案位置 | **後端 wwwroot/modules/** (Phase 1) |
| 公開存取 | **是**，所有檔案公開（不驗 JWT） |
| 同時啟用數 | **單一模組** |
| 切模組時舊資產 | 不立即釋放，留 cache（IndexedDB + browser HTTP cache） |

## 3. 啟動流程

```
App 啟動
   │
   ▼
import('@/modules/index.json')              (vite 內建 import)
   │  → 本地 modules.index.json (build 時生成)
   ▼
得到 localModules: ModuleIndexEntry[]
   │
   ▼
fetch('/api/modules/index', { timeout: 3000 })
   │
   ├─ 成功:
   │    remoteModules = response.modules
   │    補充清單:
   │      merged = [
   │        ...localModules,
   │        ...remoteModules.filter(r => !localModules.find(l => l.id === r.id))
   │      ]
   │
   └─ 失敗 / timeout:
        merged = localModules
   │
   ▼
寫入 modulesStore.availableModules = merged
   │
   ▼
寫入 IndexedDB.module_cache
   │
   ▼
emit 'module:loaded' 每個 module
   │
   ▼
若使用者 settings.selectedModuleId 在清單中 → 載入該 module 的完整 manifest
若不在 → 退回預設 'cat-pack'
```

## 4. 本地索引產生（build-time）

**腳本**：`scripts/build-module-index.mjs`

```
邏輯:
  1. 讀 modules/ 下所有資料夾
  2. 每個資料夾讀 manifest.json
  3. 用 Zod 驗證
  4. 收集 { id, name, version, type, preview, manifestUrl } 到陣列
  5. 寫入 modules/modules.index.json
  6. 同時複製到:
       frontend/public/modules/    （前端 dev 用）
       backend/UnreadSync.Api/wwwroot/modules/  （後端 serve）
```

**觸發**：

- `npm run build:modules`（手動）
- `npm run dev`（自動先跑）
- `npm run build`（自動先跑）
- CI verify 前

**Vite plugin（未來）**：可考慮把腳本包成 Vite plugin，watch modules/ 目錄變動時自動更新。

## 5. modules.index.json 格式

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-12T08:30:00Z",
  "modules": [
    {
      "id": "cat-pack",
      "name": "Cute Cat Pack",
      "version": "1.0.0",
      "type": "avatar",
      "preview": "/modules/cat-pack/preview.webp",
      "manifestUrl": "/modules/cat-pack/manifest.json"
    }
  ]
}
```

## 6. 切換 module 的流程

```
使用者在 Settings 選 robot-pack
   │
   ▼
settingsStore.selectedModuleId = 'robot-pack'
   │
   ▼
emit 'module:selected' { id: 'robot-pack' }
   │
   ▼
Module Loader 接到事件:
   1. 從 module_cache get('robot-pack')
   2. 若無 → fetch /modules/robot-pack/manifest.json
   3. Zod 驗證
   4. 寫入 module_cache
   5. emit 'module:loaded' { id, version }
   │
   ▼
Render Pipeline 接到 'module:loaded':
   resolveState(newManifest, currentState) → 換圖 / 換動畫
   │
   ▼
觸發 crossfade
```

## 7. 模組驗證失敗的處理

```
情境: manifest.json 格式錯
   ↓
emit 'module:failed' { id, error }
   ↓
從 availableModules 移除（或標記為 disabled）
   ↓
若是當前 selectedModule → 退回 'cat-pack'
   ↓
Toast 提示「模組 X 載入失敗」
```

## 8. 快取策略

| 對象 | 位置 | TTL |
|------|------|-----|
| 模組清單合併結果 | `modulesStore.availableModules` (記憶體) | 啟動週期 |
| 模組 manifest | `IndexedDB.module_cache` | 永久（更新時覆寫） |
| 模組圖檔 / 動畫 | Service Worker cache + 瀏覽器 HTTP cache | 1 年（靠版本 cache-bust） |
| 遠端 `/api/modules/index` | 不快取（每次啟動重打） | — |

## 9. 版本更新偵測（未來）

```
啟動時:
  remoteIndex 拿到的 module 與 local cache 比 version
  若 remote 版本較新 → 標記 hasUpdate
  UI 顯示 "X 模組有新版本可用 [更新]"
  
  → 使用者按更新 → 重新 fetch manifest + 清舊 cache
```

> 注意：「**本地優先**」策略下，本地內建模組的版本不會被遠端覆蓋。此邏輯只針對「遠端來的模組」。

## 10. UI

### Module Store 頁面（`ModuleStoreView.vue`）

```
┌─────────────────────────────────────────┐
│ Module Store                             │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐             │
│  │ [預覽圖] │  │ [預覽圖] │             │
│  │ Cat Pack │  │Robot Pack│             │
│  │ v1.0.0   │  │ v1.0.0   │             │
│  │  [使用]  │  │ [使用]   │             │
│  └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘
```

- 列出 `availableModules`
- 點「使用」→ 觸發切換流程
- 當前使用中的模組 highlight

### Settings → Module Selector

簡化版（單選）：

```
Selected Module:
  ? Cute Cat Pack (cat-pack)
  ○ Robot Pack (robot-pack)
```

## 11. 邊界情境

| 情境 | 行為 |
|------|------|
| 完全離線啟動 | 用 local index，遠端 timeout，正常運作 |
| 本地 index 壞掉 | 顯示「找不到任何模組」錯誤頁，可選清快取重試 |
| 遠端返回 schemaVersion 不認得 | 略過該模組，log warn |
| 模組 manifest fetch 成功但 Zod 失敗 | emit 'module:failed'，移除該模組 |
| 切換到不存在的 module（id 拼錯） | 退回 'cat-pack'，顯示 toast |
| 模組資產 404 | 對應 state 用 fallback（static） |

## 12. 測試覆蓋

| 測試 | 工具 |
|------|------|
| 索引合併（local vs remote 同 id） | Vitest |
| 索引合併（remote 補新 id） | Vitest |
| 遠端 timeout → fallback 純 local | Vitest + mock fetch |
| Zod 驗證 manifest（合法 + 各種違規） | Vitest 表驅動 |
| 切換 module 觸發事件 | Component test |
| 模組 fetch 失敗的 fallback | Component test |

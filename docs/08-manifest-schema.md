# 08 — 模組 manifest.json 規格

## 1. 設計目標

模組（Avatar Pack）是 UnreadSync 的核心擴充機制。每個模組是一個獨立資料夾，包含 `manifest.json` 與資產。

## 2. 目錄結構

```
modules/
└── <pack-id>/
    ├── manifest.json         # 必要：模組描述
    ├── preview.webp          # 必要：縮圖預覽
    │
    ├── states/               # 必要：4 個 state 的靜態圖
    │   ├── sleep.webp
    │   ├── normal.webp
    │   ├── busy.webp
    │   └── panic.webp
    │
    ├── animations/           # 可選：動畫檔
    │   ├── normal.apng
    │   ├── busy.webp
    │   └── panic.json
    │
    └── assets/               # 可選：未來音效等
```

## 3. 凍結 schemaVersion

**目前 schema 版本**：`"4.0.0"`

| 變化點 | v4.0.0 vs v3 |
|--------|--------------|
| `transitions/` 資料夾移除 | 改放 `assets/` |
| 新增 `type` 欄位 | 預留 Phase 2+ 多層 |
| Lottie 預設值規則化 | 可省略 `loop` `autoplay` `speed` |

## 4. 完整範例

```json
{
  "schemaVersion": "4.0.0",

  "id": "cat-pack",
  "name": "Cute Cat Pack",
  "version": "1.0.0",
  "type": "avatar",
  "author": "Your Name",
  "description": "Cute avatar module pack",
  "license": "CC-BY-4.0",
  "tags": ["cute", "cat", "animal"],
  "locale": "zh-TW",

  "preview": "preview.webp",

  "compatibility": {
    "minRuntimeVersion": "1.0.0"
  },

  "states": {
    "sleep": {
      "image": "states/sleep.webp",
      "animation": null
    },
    "normal": {
      "image": "states/normal.webp",
      "animation": {
        "type": "apng",
        "src": "animations/normal.apng",
        "loop": true,
        "fps": 12
      }
    },
    "busy": {
      "image": "states/busy.webp",
      "animation": {
        "type": "webp",
        "src": "animations/busy.webp",
        "loop": true,
        "fps": 15
      }
    },
    "panic": {
      "image": "states/panic.webp",
      "animation": {
        "type": "json",
        "renderer": "lottie",
        "src": "animations/panic.json"
      }
    }
  },

  "transitions": {
    "default": {
      "duration": 300,
      "easing": "ease-in-out"
    }
  },

  "performance": {
    "preferredFPS": 15,
    "maxFPS": 30,
    "backgroundBehavior": "pause",
    "lowPowerFallback": "static"
  },

  "fallback": {
    "onAnimationError": "static",
    "onAssetMissing": "skip"
  }
}
```

## 5. 欄位規格

### 5.1 頂層必要欄位

| 欄位 | 型別 | 必要 | 說明 |
|------|------|------|------|
| `schemaVersion` | string (semver) | ? | 必須是 `"4.0.0"` |
| `id` | string (kebab-case) | ? | 全域唯一 |
| `name` | string | ? | 顯示名 |
| `version` | string (semver) | ? | 模組版本 |
| `type` | enum | ? | Phase 1 必須是 `"avatar"` |
| `author` | string | ? | 作者 |
| `preview` | string (path) | ? | 預覽圖（相對路徑） |
| `states` | object | ? | 4 個 state 的定義 |

### 5.2 頂層可選欄位

| 欄位 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `description` | string | `""` | 模組描述 |
| `license` | string (SPDX) | `"Unlicensed"` | 授權 |
| `tags` | string[] | `[]` | 標籤（marketplace 用） |
| `locale` | BCP 47 | `"zh-TW"` | 模組語系 |
| `compatibility` | object | `{ minRuntimeVersion: "1.0.0" }` | 相容性 |
| `transitions` | object | 預設 crossfade 300ms | 轉場參數 |
| `performance` | object | 見下 | 效能策略 |
| `fallback` | object | 見下 | 錯誤 fallback |

### 5.3 `states` 物件

**必須包含 4 個 key**：`sleep`, `normal`, `busy`, `panic`。

每個 state：

```ts
{
  image: string                  // 必要：靜態圖 fallback
  animation: AnimationConfig | null
}
```

#### AnimationConfig（discriminated union）

**APNG**：

```json
{
  "type": "apng",
  "src": "animations/xxx.apng",
  "loop": true,             // 可選，預設 true
  "fps": 12                 // 可選，預設 12
}
```

**Animated WebP**：

```json
{
  "type": "webp",
  "src": "animations/xxx.webp",
  "loop": true,
  "fps": 15
}
```

**Lottie JSON**：

```json
{
  "type": "json",
  "renderer": "lottie",
  "src": "animations/xxx.json",
  "loop": true,             // 可選，預設 true
  "autoplay": true,         // 可選，預設 true
  "speed": 1.0              // 可選，預設 1.0
}
```

> Lottie 三個欄位預設值已凍結（策略 A）：未寫即套預設。

### 5.4 `transitions` 物件

```json
{
  "default": {
    "duration": 300,          // 毫秒
    "easing": "ease-in-out"
  },
  "rules": [
    {
      "from": "sleep",
      "to": "panic",
      "duration": 100,
      "easing": "ease-out"
    }
  ]
}
```

- `default` 必要
- `rules` 可選，逐對覆寫

### 5.5 `performance` 物件

```json
{
  "preferredFPS": 15,
  "maxFPS": 30,
  "backgroundBehavior": "pause",         // "pause" | "lowFps" | "continue"
  "lowPowerFallback": "static"           // "static" | "lowFps" | "continue"
}
```

FPS 決定優先序：

```
finalFPS = min(
  module.preferredFPS,
  userSettings.fpsLimit,
  systemLowPower ? 5 : Infinity
)
```

### 5.6 `fallback` 物件

```json
{
  "onAnimationError": "static",       // "static" | "skip" | "throw"
  "onAssetMissing":   "skip"          // "static" | "skip" | "throw"
}
```

| 值 | 行為 |
|----|------|
| `static` | 用 `states.<state>.image` 替代 |
| `skip` | 該 state 不顯示動畫，純靜態 |
| `throw` | 拋錯（dev 用，prod 不建議） |

## 6. 路徑解析規則

manifest 中所有 `src` / `image` / `preview` 路徑：

- 相對於 **manifest.json 所在資料夾**
- 不可包含 `..`（防穿越）
- 不可絕對路徑（不可 `https://` 或 `/`）

Loader 解析時組成：

```
finalUrl = `${moduleBaseUrl}/${pathInManifest}`

例:
  moduleBaseUrl = '/modules/cat-pack'
  pathInManifest = 'states/sleep.webp'
  → '/modules/cat-pack/states/sleep.webp'
```

## 7. Zod Schema（簡述）

```ts
import { z } from 'zod'

const SemVer = z.string().regex(/^\d+\.\d+\.\d+$/)
const KebabCase = z.string().regex(/^[a-z][a-z0-9-]*$/)
const RelativePath = z.string().refine(
  s => !s.startsWith('/') && !s.startsWith('http') && !s.includes('..'),
  'must be relative path'
)

const AnimationConfig = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('apng'),
    src: RelativePath,
    loop: z.boolean().default(true),
    fps: z.number().int().min(1).max(60).default(12)
  }),
  z.object({
    type: z.literal('webp'),
    src: RelativePath,
    loop: z.boolean().default(true),
    fps: z.number().int().min(1).max(60).default(15)
  }),
  z.object({
    type: z.literal('json'),
    renderer: z.literal('lottie'),
    src: RelativePath,
    loop: z.boolean().default(true),
    autoplay: z.boolean().default(true),
    speed: z.number().positive().default(1.0)
  })
])

const StateConfig = z.object({
  image: RelativePath,
  animation: AnimationConfig.nullable()
})

const ManifestSchema = z.object({
  schemaVersion: z.literal('4.0.0'),
  id: KebabCase,
  name: z.string().min(1),
  version: SemVer,
  type: z.literal('avatar'),
  author: z.string(),
  description: z.string().default(''),
  license: z.string().default('Unlicensed'),
  tags: z.array(z.string()).default([]),
  locale: z.string().default('zh-TW'),
  preview: RelativePath,
  compatibility: z.object({
    minRuntimeVersion: SemVer
  }).default({ minRuntimeVersion: '1.0.0' }),
  states: z.object({
    sleep: StateConfig,
    normal: StateConfig,
    busy: StateConfig,
    panic: StateConfig
  }),
  transitions: z.object({
    default: z.object({
      duration: z.number().int().min(0),
      easing: z.string()
    }),
    rules: z.array(/* ... */).optional()
  }).default({
    default: { duration: 300, easing: 'ease-in-out' }
  }),
  performance: z.object({
    preferredFPS: z.number().int().min(1).max(60).default(15),
    maxFPS: z.number().int().min(1).max(60).default(30),
    backgroundBehavior: z.enum(['pause', 'lowFps', 'continue']).default('pause'),
    lowPowerFallback: z.enum(['static', 'lowFps', 'continue']).default('static')
  }).default({
    preferredFPS: 15,
    maxFPS: 30,
    backgroundBehavior: 'pause',
    lowPowerFallback: 'static'
  }),
  fallback: z.object({
    onAnimationError: z.enum(['static', 'skip', 'throw']).default('static'),
    onAssetMissing: z.enum(['static', 'skip', 'throw']).default('skip')
  }).default({
    onAnimationError: 'static',
    onAssetMissing: 'skip'
  })
})

type ModuleManifest = z.infer<typeof ManifestSchema>
```

## 8. 驗證時機

| 時機 | 動作 |
|------|------|
| Module Loader 載入時 | parse + validate → 失敗則跳過該模組（log warn） |
| Module Store UI 預覽前 | 驗證通過才顯示 |
| 上架（未來） | 上架時嚴格驗證 + 視覺檢查 |

## 9. 編號與相容性

| schemaVersion | 變動 | 支援？ |
|---------------|------|--------|
| `4.0.0` | 凍結版 | ? |
| `5.x` | 新增多層、layers、custom states | 需 Loader migration |
| `< 4.0.0` | 舊版 | Loader 拒絕載入（log warn） |

## 10. 內建模組

Phase 1 內建 **1 個模組**：

```
modules/cat-pack/
  - 三種動畫格式都用上（APNG / WebP / Lottie），作為 reference
  - 視覺風格：手繪可愛
  - License: CC-BY-4.0
```

詳見 `14-phase-roadmap.md`。

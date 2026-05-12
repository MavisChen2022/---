# 03 — 目錄結構

## 1. 頂層結構

```
UnreadSync/
├── backend/                    # ASP.NET Core 10 後端
├── frontend/                   # Vue 3 + Vite 前端
├── modules/                    # 模組原始檔（build 時複製到 backend/wwwroot 與 frontend/public）
├── docs/                       # 凍結規格文件（本資料夾）
├── scripts/                    # 工具腳本（build modules index、verify 等）
├── .github/
│   └── workflows/
│       └── verify.yml          # CI（PR/push 必跑）
├── .gitignore
├── .editorconfig
├── README.md                   # 專案總入口
├── package.json                # 根目錄 npm scripts（verify、dev、build 串接）
└── UnreadSync.sln              # .NET 解決方案
```

## 2. 後端結構（`backend/`）

```
backend/
├── UnreadSync.Api/
│   ├── Program.cs              # Minimal API 入口
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── UnreadSync.Api.csproj
│   │
│   ├── Endpoints/
│   │   ├── AuthEndpoints.cs           # /api/auth/line, /api/me
│   │   ├── ModuleEndpoints.cs         # /api/modules/index
│   │   └── HealthEndpoints.cs         # /healthz
│   │
│   ├── Services/
│   │   ├── ILineTokenVerifier.cs
│   │   ├── LineTokenVerifier.cs       # 用 JWKS 驗 ID Token
│   │   ├── IJwtIssuer.cs
│   │   ├── JwtIssuer.cs               # 簽自家 JWT
│   │   ├── IModuleService.cs
│   │   └── ModuleService.cs           # 回傳 module index
│   │
│   ├── Models/
│   │   ├── User.cs                    # EF 實體
│   │   ├── LineIdTokenPayload.cs      # 解 LINE token 後的 DTO
│   │   ├── AuthResponse.cs            # /api/auth/line 回傳
│   │   └── ModuleIndexEntry.cs        # /api/modules/index 元素
│   │
│   ├── Data/
│   │   ├── AppDbContext.cs            # EF Core
│   │   └── Migrations/                # EF Migrations
│   │
│   ├── Middleware/
│   │   ├── ErrorHandlingMiddleware.cs
│   │   └── RequestLoggingMiddleware.cs
│   │
│   ├── Auth/
│   │   ├── JwtAuthenticationExtensions.cs
│   │   └── CorsExtensions.cs
│   │
│   ├── wwwroot/
│   │   └── modules/                   # build 時從 /modules 複製進來
│   │       └── cat-pack/...
│   │
│   └── data/
│       └── unreadsync.db              # SQLite（.gitignore）
│
├── UnreadSync.Api.Tests/
│   ├── AuthEndpointTests.cs           # xUnit + WebApplicationFactory
│   ├── ModuleEndpointTests.cs
│   ├── JwtIssuerTests.cs
│   ├── LineTokenVerifierTests.cs      # 用 fixture token
│   └── UnreadSync.Api.Tests.csproj
│
└── (UnreadSync.sln 在根目錄)
```

## 3. 前端結構（`frontend/`）

```
frontend/
├── public/
│   ├── manifest.webmanifest           # PWA manifest（由 vite-plugin-pwa 生成）
│   ├── icons/                         # APP 圖示（多尺寸）
│   └── modules/                       # build 時從 /modules 複製進來（同時 serve）
│       └── cat-pack/...
│
├── src/
│   ├── main.ts                        # 入口
│   ├── App.vue
│   ├── env.d.ts
│   ├── vite-env.d.ts
│   │
│   ├── router/
│   │   └── index.ts                   # Vue Router 設定
│   │
│   ├── views/
│   │   ├── DashboardView.vue          # Avatar 主畫面
│   │   ├── ModuleStoreView.vue        # 模組瀏覽
│   │   ├── SettingsView.vue           # 使用者設定
│   │   └── LoginView.vue              # 未登入 fallback
│   │
│   ├── components/
│   │   ├── avatar/
│   │   │   ├── AvatarStage.vue        # Avatar 容器
│   │   │   ├── ApngRenderer.vue
│   │   │   ├── WebpRenderer.vue
│   │   │   ├── LottieRenderer.vue
│   │   │   └── StaticRenderer.vue
│   │   │
│   │   ├── settings/
│   │   │   ├── StateRulesEditor.vue
│   │   │   ├── MockTools.vue          # Phase 1 模擬訊息按鈕
│   │   │   └── ModuleSelector.vue
│   │   │
│   │   ├── module/
│   │   │   ├── ModuleCard.vue
│   │   │   └── ModulePreview.vue
│   │   │
│   │   └── common/
│   │       ├── AppHeader.vue
│   │       └── LoadingSpinner.vue
│   │
│   ├── stores/                        # Pinia stores
│   │   ├── auth.ts                    # JWT、user
│   │   ├── messages.ts                # messages + unread (computed)
│   │   ├── settings.ts                # user_settings
│   │   ├── modules.ts                 # 模組清單 / activeModule
│   │   └── runtime.ts                 # currentState / isAnimating
│   │
│   ├── runtime/
│   │   ├── stateEngine.ts             # state 名稱列舉
│   │   ├── stateRuleEngine.ts         # unread → state
│   │   ├── triggerSystem.ts           # 事件來源註冊
│   │   ├── recalculationEngine.ts     # debounce + batch
│   │   └── renderPipeline.ts          # state → render decision
│   │
│   ├── animation/
│   │   ├── apngRenderer.ts
│   │   ├── webpRenderer.ts
│   │   ├── lottieRenderer.ts
│   │   ├── staticFallback.ts
│   │   └── transition.ts              # crossfade 邏輯
│   │
│   ├── modules/
│   │   ├── moduleLoader.ts            # 載入 + 合併 index
│   │   ├── moduleValidator.ts         # Zod schema 驗 manifest
│   │   └── schema/
│   │       └── manifest.schema.ts     # Zod schema
│   │
│   ├── data/
│   │   ├── indexedDb.ts               # idb 包裝
│   │   ├── indexedDbAdapter.ts        # Pinia persistedstate 自訂 adapter
│   │   └── migrations.ts              # store 版本遷移
│   │
│   ├── auth/
│   │   ├── liffClient.ts              # LIFF SDK 封裝
│   │   ├── authFlow.ts                # 登入/續期/登出流程
│   │   └── fetchInterceptor.ts        # 自動帶 JWT + 401 處理
│   │
│   ├── lifecycle/
│   │   └── powerManager.ts            # visibilitychange / focus
│   │
│   ├── eventBus/
│   │   ├── bus.ts                     # mitt 實例
│   │   └── events.ts                  # 事件型別定義
│   │
│   ├── api/
│   │   ├── client.ts                  # fetch 包裝
│   │   ├── auth.api.ts
│   │   └── modules.api.ts
│   │
│   ├── i18n/                          # （未來）
│   │   └── locales/
│   │
│   └── style/
│       ├── tailwind.css
│       └── global.css
│
├── tests/
│   ├── unit/
│   │   ├── stateRuleEngine.test.ts
│   │   ├── moduleValidator.test.ts
│   │   └── messages.store.test.ts
│   ├── component/
│   │   └── AvatarStage.test.ts
│   └── e2e/
│       └── login.spec.ts              # Playwright
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── vitest.config.ts
└── playwright.config.ts
```

## 4. 模組目錄（`modules/`）

```
modules/
├── modules.index.json                 # build 時由 scripts/build-module-index 生成
└── cat-pack/                          # 內建模組範例
    ├── manifest.json
    ├── preview.webp
    ├── states/
    │   ├── sleep.webp
    │   ├── normal.webp
    │   ├── busy.webp
    │   └── panic.webp
    ├── animations/
    │   ├── normal.apng
    │   ├── busy.webp
    │   └── panic.json
    └── assets/                        # （future）sounds 等
```

詳見 `08-manifest-schema.md`、`13-module-loader.md`。

## 5. 腳本目錄（`scripts/`）

```
scripts/
├── build-module-index.mjs             # 掃 modules/ 產生 modules.index.json
├── copy-modules-to-public.mjs         # 複製到 frontend/public/modules 與 backend/wwwroot/modules
└── verify.mjs                         # 串接前後端 verify（替代 npm-run-all）
```

## 6. CI 設定（`.github/workflows/`）

```
.github/
└── workflows/
    └── verify.yml                     # 觸發：pull_request / push to main
                                       # Job：lint + typecheck + test (前 + 後)
```

詳見 `15-testing-ci.md`。

## 7. 根目錄重要檔案

| 檔案 | 用途 |
|------|------|
| `README.md` | 專案總入口（簡介 + 啟動步驟） |
| `package.json` | 根目錄 npm scripts（`verify`, `dev`, `build`） |
| `UnreadSync.sln` | .NET 解決方案（用 VS / Rider 開啟） |
| `.gitignore` | 排除 `node_modules`, `dist`, `bin`, `obj`, `*.db`, `.env` |
| `.editorconfig` | 跨編輯器一致縮排 / 換行 |
| `LICENSE` | （未來決定） |

## 8. 命名約定

| 對象 | 規範 | 範例 |
|------|------|------|
| 資料夾 | kebab-case | `avatar/`、`module-store/` |
| Vue 元件 | PascalCase | `AvatarStage.vue` |
| Composable / store | camelCase | `useMessagesStore.ts` |
| 型別 / interface | PascalCase | `interface ModuleManifest` |
| 常數 | UPPER_SNAKE | `const DEFAULT_FPS = 15` |
| C# 類別 | PascalCase | `JwtIssuer.cs` |
| C# 命名空間 | UnreadSync.Api.* | `namespace UnreadSync.Api.Endpoints` |

## 9. 跨資料夾的依賴方向（不可違反）

```
docs/      → 不依賴任何程式碼
modules/   → 不依賴 frontend / backend
frontend/  → 依賴 modules（讀取資產）+ backend API
backend/   → 依賴 modules（serve 靜態檔）
scripts/   → 可讀 modules / 寫 frontend & backend 衍生檔
```

- ? backend 不能 import frontend code
- ? modules 不能寫死特定 runtime 行為
- ? frontend 可呼叫 backend API（HTTP）

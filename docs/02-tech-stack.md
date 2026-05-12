# 02 — 技術選型

本文列出 UnreadSync 所有已凍結的技術選型與決策理由。

## 1. 前端（Client）

| 角色 | 技術 | 版本 | 凍結理由 |
|------|------|------|----------|
| **核心框架** | Vue 3 | ^3.5 | 響應式系統最適合狀態驅動的 Avatar |
| **建置工具** | Vite | ^6 | Vue 生態事實標準，啟動快 |
| **語言** | TypeScript | ^5 | strict 模式，型別保證 |
| **路由** | Vue Router | ^4 | Vue 官方 |
| **狀態管理** | Pinia | ^2.3 | Vue 官方推薦，TS 友善 |
| **持久化** | pinia-plugin-persistedstate | latest | 搭配 idb 自訂 adapter |
| **CSS** | Tailwind CSS | ^4 | utility-first，AI 工具友善 |
| **UI 元件庫** | Naive UI | latest | TS 寫的、設計現代、MIT 免費 |
| **PWA** | vite-plugin-pwa | latest | 背後 Workbox 7 |
| **IndexedDB** | idb | ^8 | Promise 包裝、Jake Archibald 維護 |
| **Event Bus** | mitt | ^3 | 200B、極輕 |
| **Schema 驗證** | Zod | ^3 | TS-first |
| **LINE SDK** | @line/liff | ^2 | LINE 官方 |
| **JWT 解析** | jwt-decode | ^4 | ~2KB，只解 payload |
| **Lottie** | @lottiefiles/dotlottie-web | latest | WASM、3 倍小、2-5 倍快 |
| **HTTP** | 原生 fetch + interceptor | — | 不引入 axios |

## 2. 後端（Backend）

| 角色 | 技術 | 版本 | 凍結理由 |
|------|------|------|----------|
| **執行平台** | .NET | 10 LTS | 支援到 2028-11 |
| **API 框架** | ASP.NET Core Minimal API | 10 | 輕量、現代 |
| **ORM** | EF Core | 10 | 官方 |
| **資料庫** | SQLite | 3.53.1 | 檔案型、免安裝 |
| **JWT** | Microsoft.AspNetCore.Authentication.JwtBearer | 10 | 官方 |
| **JWKS（驗 LINE Token）** | Microsoft.IdentityModel.Protocols.OpenIdConnect | latest | 自動拉公鑰 |
| **靜態檔** | ASP.NET Core 內建 UseStaticFiles | — | 提供 wwwroot/modules/ |
| **CORS** | ASP.NET Core 內建 | — | 允許前端網域 |
| **OpenAPI** | Swashbuckle / Microsoft.AspNetCore.OpenApi | 10 | API 文件 |
| **Log** | Serilog | latest | 結構化 log |
| **Secrets**（開發） | dotnet user-secrets | — | 不入 git |

## 3. 開發工具與品質

| 角色 | 技術 | 用途 |
|------|------|------|
| **TypeScript 檢查** | vue-tsc | 補強 Vite 不檢查 TS |
| **Linter** | ESLint | 抓邏輯問題 |
| **Formatter** | Prettier | 統一格式 |
| **單元測試（前端）** | Vitest | 純函式、composable |
| **元件測試** | @vue/test-utils | Vue 元件 |
| **E2E 測試** | Playwright | smoke 路徑 |
| **單元測試（後端）** | xUnit | 業務邏輯 |
| **整合測試（後端）** | WebApplicationFactory | API endpoint |
| **CI** | GitHub Actions（或等效） | PR / push 必跑 |
| **版本控制** | Git | — |

## 4. 部署與運行

| 角色 | 技術 / 選項 |
|------|------------|
| **HTTPS（dev）** | dotnet dev-certs / Vite proxy（未來決定） |
| **HTTPS（prod）** | Cloudflare / Let's Encrypt（未來決定） |
| **容器化（可選）** | Docker + Docker Compose |
| **靜態檔 / API 主機** | Phase 1 同站 self-host（後端 wwwroot serve 模組 + 前端 build dist） |

## 5. 不採用 / 已否決

| 技術 | 否決理由 |
|------|---------|
| React / SolidJS | 已確定 Vue 3 |
| Flutter Web | PWA 哲學不符、LIFF 整合困難、bundle 過大 |
| Vuex | 已被 Pinia 取代 |
| Webpack | 啟動慢、Vite 取代 |
| UnoCSS | 生態系較小、AI 工具支援不如 Tailwind |
| Element Plus | 設計感「後台風」與 Avatar 主題不搭 |
| Vuetify | Material 風衝突、bundle 大 |
| lottie-web | 比 dotlottie-web 大 3 倍、慢 |
| Axios | 原生 fetch 已足夠 |
| .NET 6 / 8 | 6 已停 LTS；8 半年後停 LTS |
| MS SQL Server / PostgreSQL | Phase 1 不需要 |

## 6. 版本鎖定原則

- `package.json` 用 `^x.y.z`（允許 minor 更新）
- `package-lock.json` 必須 commit
- .NET TargetFramework 鎖定 `net10.0`
- NuGet 套件鎖在 .NET 10 相容版

## 7. 未來可能引入（不在 Phase 1）

| 套件 | 用途 | 何時引入 |
|------|------|---------|
| web-push (npm) | 後端送 Web Push | Phase 1.5 |
| @line/bot-sdk | LINE Messaging API webhook | Phase 1.5 |
| Sentry | 錯誤監控 | 上線後 |
| posthog / plausible | 分析 | 上線後 |
| live2d-web-runtime | Live2D Avatar | Phase 2+ |

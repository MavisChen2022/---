# UnreadSync

> **PWA Avatar Platform** — 你的 Avatar 會依「未讀訊息數」自動切換情緒狀態。

---

## 一句話介紹

UnreadSync 是個 **Progressive Web App**：透過 **LINE LIFF** 登入後，桌面 / 手機 Avatar 會依未讀訊息數自動換臉（sleep / normal / busy / panic），模組化的 Avatar Pack 可動態擴充。

## 技術棧概覽

| 層級 | 技術 |
|------|------|
| 前端 | Vue 3 + Vite + TypeScript（strict）|
| UI | Tailwind CSS 4 + Naive UI |
| 狀態 | Pinia + persistedstate（IndexedDB） |
| PWA | vite-plugin-pwa（Workbox 7） |
| 動畫 | APNG / Animated WebP / Lottie（dotlottie-web） |
| 認證 | LIFF + 後端驗 ID Token + 自家 JWT（30 天） |
| 後端 | ASP.NET Core 10 Minimal API |
| 資料庫 | SQLite 3.53.1 + EF Core 10 |
| 測試 | Vitest + xUnit + Playwright |

完整規格見 [docs/](docs/README.md)。

## 專案結構

```
UnreadSync/
├── backend/       # ASP.NET Core 10
├── frontend/      # Vue 3 + Vite
├── modules/       # Avatar Pack（cat-pack 等）
├── docs/          # 系統文件（凍結規格）
├── scripts/       # build 工具
└── README.md
```

詳見 `docs/03-project-layout.md`。

## 啟動（將於開發完成後補上）

```bash
# 安裝相依
npm install                     # 根目錄 + frontend
cd backend && dotnet restore

# 開發模式（前後端並行）
npm run dev

# 跑驗證（每次提交前必跑）
npm run verify

# 建置
npm run build
```

> **注意**：上述指令對應的腳本將於程式碼進場時建立。

## 開發前置作業

### 必裝

| 工具 | 版本 |
|------|------|
| Node.js | LTS |
| .NET SDK | 10.0+ |
| Git | 任意 |
| VS Code 或 Visual Studio 2022+ | 任意 |

### 必設定

- LINE Developers Console
  - 建立 Provider
  - 在 Provider 底下建立 **LINE Login Channel**（取得 Channel ID）
  - Channel 底下建立 **LIFF App**（取得 LIFF ID）
  - 設 LIFF Endpoint URL 與允許清單
- 前端 `.env.local`：
  ```
  VITE_LIFF_ID=<你的 LIFF ID>
  VITE_API_BASE_URL=<後端 base URL>
  ```
- 後端 user-secrets：
  ```
  Auth:Line:ChannelId    = <LINE Login Channel ID>
  Auth:Jwt:Secret        = <隨機 32 byte base64>
  ```

詳見 `docs/04-auth-flow.md`。

## 開發流程

1. 開新 branch
2. 撰寫程式碼
3. 跑 `npm run verify`
4. 全綠後 commit / push
5. 開 PR → CI 跑 verify → review → merge

「每次修正必跑驗證」規範詳見 `docs/15-testing-ci.md`。

## 文件導覽

| 主題 | 文件 |
|------|------|
| 系統架構 | [01-architecture.md](docs/01-architecture.md) |
| 技術選型 | [02-tech-stack.md](docs/02-tech-stack.md) |
| 目錄結構 | [03-project-layout.md](docs/03-project-layout.md) |
| 認證流程 | [04-auth-flow.md](docs/04-auth-flow.md) |
| API 合約 | [05-api-contract.md](docs/05-api-contract.md) |
| IndexedDB | [06-indexeddb-schema.md](docs/06-indexeddb-schema.md) |
| 後端 DB | [07-db-schema.md](docs/07-db-schema.md) |
| 模組規格 | [08-manifest-schema.md](docs/08-manifest-schema.md) |
| 狀態機 | [09-state-engine.md](docs/09-state-engine.md) |
| 事件匯流排 | [10-event-bus.md](docs/10-event-bus.md) |
| 動畫執行層 | [11-animation.md](docs/11-animation.md) |
| 生命週期 | [12-lifecycle.md](docs/12-lifecycle.md) |
| 模組載入 | [13-module-loader.md](docs/13-module-loader.md) |
| 階段里程碑 | [14-phase-roadmap.md](docs/14-phase-roadmap.md) |
| 測試與 CI | [15-testing-ci.md](docs/15-testing-ci.md) |

## 授權

（待定）

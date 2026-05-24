# Quickstart: 001-gmail-standby-unread

**Branch**: `001-gmail-standby-unread`  
**Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js 20+
- npm 10+
- Google Cloud 專案（OAuth 2.0 Web client）
- HTTPS 本機開發（Gmail OAuth 需要）— 使用 `vite --host` + mkcert 或 Cloudflare tunnel

## Google OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Enable **Gmail API**
2. Credentials → OAuth 2.0 Client ID → **Web application**
3. Authorized JavaScript origins: `https://localhost:5173`（依你 dev 埠號）
4. Authorized redirect URIs: 同上（PKCE  implicit / code flow 依實作）
5. Copy Client ID → `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Bootstrap app（實作階段執行）

```bash
cd c:\Users\User\Desktop\Side0\---
git checkout 001-gmail-standby-unread

# 首次 scaffold（/speckit-implement 會執行；手動可先）：
npm create vite@latest . -- --template vue-ts
npm install vue-router pinia idb @vueuse/core
npm install -D vite-plugin-pwa vitest @vue/test-utils jsdom eslint prettier
```

## 內建模組

已存在，無需建立：

```text
public/modules/cat-pack/
```

驗證：瀏覽器開啟 `https://localhost:5173/modules/cat-pack/manifest.json`

## Dev commands（實作後）

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run test         # Vitest unit tests
npm run preview      # Preview production build
```

## Manual test checklist

1. **安裝 PWA**：Android Chrome「安裝應用程式」／iOS Safari「加入主畫面」
2. **Gmail**：完成 OAuth，Dashboard 顯示 INBOX 未讀
3. **Avatar**：未讀 0 → sleep；3 → normal；10 → busy；25 → panic（預設門檻）
4. **設定**：修改 normal 為 1–9，確認預覽與 Dashboard 更新
5. **輪詢**：前景等待 60s 或切換分頁再回來（visibility 立即刷新）
6. **通知**：允許通知權限，未讀變更時出現本機通知
7. **模組**：Modules 頁見 cat-pack；panic 狀態 Lottie（需網路載入 esm.sh 時注意 CORS）

## Constitution — test gate

每次提交前：

```bash
npm test
```

新增核心邏輯必須附 unit test（state engine、threshold、manifest validator）。

## Related docs

- [spec.md](./spec.md)
- [data-model.md](./data-model.md)
- [contracts/gmail-sync.md](./contracts/gmail-sync.md)

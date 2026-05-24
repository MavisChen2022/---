# PWA Avatar Notification Platform

Gmail INBOX 未讀驅動 Avatar 的 PWA（Vue 3 + Vite）。

## 開發

需安裝 [Node.js](https://nodejs.org/) 20+。

```bash
npm install
npm run dev
```

瀏覽器開啟終端顯示的 URL（預設 http://localhost:5173）。

## 測試

```bash
npm test
```

## 內建模組

`public/modules/cat-pack/` — 預設 Avatar 模組（manifest schema 1.0.0）。

## 規格與計畫

- [spec.md](specs/001-gmail-standby-unread/spec.md)
- [plan.md](specs/001-gmail-standby-unread/plan.md)
- [quickstart.md](specs/001-gmail-standby-unread/quickstart.md)

## 目前進度

- Phase A + B：PWA 骨架、IndexedDB、模組 Loader、cat-pack 渲染
- Phase C：設定頁門檻編輯器、顯示規則、Dashboard 與 Pinia store 連動
- Phase D：Gmail OAuth PKCE、INBOX 未讀同步、訊息列表、60s 前景輪詢
- Phase E：Notification API 本機通知、App Badge、規則一／二與同步整合
- Phase F：測試打磨、雙平台驗收（見 plan.md）

## Gmail OAuth

複製 `.env.example` 為 `.env` 並填入 `VITE_GOOGLE_CLIENT_ID`。詳見 [quickstart.md](specs/001-gmail-standby-unread/quickstart.md)。

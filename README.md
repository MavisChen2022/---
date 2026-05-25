# PWA Avatar Notification Platform

Gmail INBOX 未讀驅動 Avatar 的 PWA。前端使用 Vue 3 + Vite，後端使用 C# ASP.NET Core Minimal API 負責 Google OAuth secret、Gmail API 與模組 API。

## 開發

需安裝 [Node.js](https://nodejs.org/) 20+ 與 [.NET SDK](https://dotnet.microsoft.com/download) 7+。

```bash
npm install
npm run dev
```

另開一個終端啟動後端：

```bash
cd backend/AvatarMail.Api
dotnet run
```

瀏覽器開啟前端 URL（預設 http://localhost:5173）。後端預設為 http://localhost:5080。

## 測試

```bash
npm test
npm run build
cd backend/AvatarMail.Api
dotnet build
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
- Phase D：C# 後端 OAuth code flow、INBOX 未讀數同步、Gmail 隱私說明頁、60s 前景輪詢
- Phase E：Notification API 本機通知、App Badge、規則一／二與同步整合
- Phase F：測試打磨、雙平台驗收（見 plan.md）

## Gmail OAuth

前端 `.env` 只需設定：

```env
VITE_API_BASE_URL=http://localhost:5080
```

Google `ClientId` / `ClientSecret` 放在後端 `backend/AvatarMail.Api/appsettings.Development.json` 或環境變數，不要放前端。Google Console redirect URI 請設定為：

```text
http://localhost:5080/api/auth/callback
```

詳見 [quickstart.md](specs/001-gmail-standby-unread/quickstart.md)。

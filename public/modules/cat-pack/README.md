# cat-pack（內建模組範例）

平台預設 Avatar 模組，符合 `schemaVersion` **1.0.0**。

## 目錄

- `manifest.json` — 模組契約（含 `renderers.lottie`）
- `states/*.webp` — 四狀態靜態圖（目前為 1×1 佔位圖，請替換為正式美術）
- `animations/panic.json` — Lottie 佔位動畫（`panic` 狀態）
- `renderers/lottie-renderer.mjs` — **模組自帶** Lottie 渲染器（平台不內建 lottie-web）

## 替換美術

1. 覆寫 `states/sleep.webp` … `panic.webp` 與 `preview.webp`
2. 可為 `normal`／`busy` 在 manifest 加入 `animation`（`apng` 或 `webp`）
3. 替換 `animations/panic.json` 為正式 Lottie 檔

## 掃描路徑

PWA 透過 `/modules/cat-pack/manifest.json` 載入（對應 `public/modules/cat-pack/`）。

# 04 — 認證流程（LIFF + 後端驗 ID Token）

## 1. 凍結決定

| 項目 | 決定 |
|------|------|
| 認證模式 | **Mode B**：LIFF 取 ID Token → 後端驗簽 → 後端簽自家 JWT |
| 自家 JWT 有效期 | **30 天** |
| JWT 過期策略 | **過期 → 重新登入**（不做 silent refresh） |
| 外部瀏覽器策略 | **走 LINE Login OAuth**（`liff.login()`） |
| JWT 演算法 | **HS256**（對稱金鑰、單一後端） |
| 後端使用者儲存 | **Minimum**：sub / displayName / pictureUrl + 建立/更新時間 |
| tokenVersion 強制下線機制 | **是**（payload 帶 tokenVersion，DB 比對） |

## 2. 完整流程

```
┌───────────────────────────────────────────────────────────────┐
│ ヾ App 啟動                                                     │
│    liff.init({ liffId })                                       │
└─────────────────────────────┬─────────────────────────────────┘
                              ▼
                       liff.isLoggedIn()?
                       ├─ true  ──────┐
                       └─ false        │
                              │        │
                              ▼        │
                ┌──────────────────┐   │
                │ 顯示 LoginView    │   │
                │ [使用 LINE 登入]  │   │
                └────────┬─────────┘   │
                         ▼             │
                liff.login({           │
                  redirectUri:         │
                    location.href      │
                })                     │
                         │             │
              (LINE 跳轉登入頁)        │
                         │             │
              (使用者授權後導回)        │
                         │             ▼
                         └──→ ? liff.isLoggedIn() == true
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │ ゝ liff.getIDToken()         │
                        │    得到 LINE ID Token (JWT) │
                        └─────────────┬──────────────┘
                                      ▼
                        ┌────────────────────────────┐
                        │ ゞ POST /api/auth/line       │
                        │    Body: { idToken }        │
                        └─────────────┬──────────────┘
                                      ▼
                  ┌────────────────────────────────────┐
                  │ 々 後端驗 LINE ID Token              │
                  │   1. 從 JWKS 抓公鑰 (有 cache)      │
                  │      https://api.line.me/          │
                  │      oauth2/v2.1/certs             │
                  │   2. 驗簽章 + iss + aud + exp      │
                  │   3. 取得 payload: sub / name /    │
                  │      picture                       │
                  └─────────────┬──────────────────────┘
                                ▼
                  ┌────────────────────────────────────┐
                  │ ぁ Upsert User                       │
                  │   - 用 sub (LINE userId) 找/建      │
                  │   - 更新 displayName, pictureUrl   │
                  │   - 不變 tokenVersion              │
                  └─────────────┬──────────────────────┘
                                ▼
                  ┌────────────────────────────────────┐
                  │ あ 簽自家 JWT (HS256, 30 天)         │
                  │   payload: {                       │
                  │     sub: lineUserId,               │
                  │     name, picture,                 │
                  │     tokenVersion,                  │
                  │     iat, exp                       │
                  │   }                                │
                  └─────────────┬──────────────────────┘
                                ▼
                  ┌────────────────────────────────────┐
                  │ ぃ Response 200                      │
                  │   { token, expiresAt, user }       │
                  └─────────────┬──────────────────────┘
                                ▼
                  ┌────────────────────────────────────┐
                  │ い 前端存 JWT 於 IndexedDB.auth       │
                  │   啟用 fetch interceptor            │
                  │   建立 router.push('/')             │
                  └─────────────┬──────────────────────┘
                                ▼
                        進入 DashboardView
                                │
                                │ ...使用中...
                                ▼
                  ┌────────────────────────────────────┐
                  │ ぅ 任何 /api/* 401                   │
                  │   清掉 IndexedDB.auth               │
                  │   router.push('/login')             │
                  │   提示「登入已過期」               │
                  └────────────────────────────────────┘
```

## 3. 後端驗證項目（每一項都必須做）

| 檢查 | 為什麼 |
|------|--------|
| 簽章驗證（用 LINE JWKS 公鑰） | 確認 token 不是偽造的 |
| `iss == "https://access.line.me"` | 確認是 LINE 簽的 |
| `aud == 你的 LINE Login Channel ID` | 防別 channel 的 token 過來 |
| `exp > now` | token 未過期 |
| `iat` 合理（不能太久以前） | 防 replay |

未來可選加：

| 檢查 | 何時 |
|------|------|
| `nonce` 驗證 | 若前端 login 時傳 nonce |
| email 驗證 | 若要求 email scope（目前不要） |

## 4. 自家 JWT Payload 規格

```json
{
  "sub": "U4af49806xxxx",
  "name": "Sam",
  "picture": "https://profile.line-scdn.net/...",
  "tokenVersion": 1,
  "iat": 1758094800,
  "exp": 1760686800
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `sub` | string | LINE userId（系統主鍵） |
| `name` | string | 顯示名（可用於 UI） |
| `picture` | string | 頭像 URL（可用於 UI） |
| `tokenVersion` | number | 強制下線用（DB 升版則舊 token 失效） |
| `iat` | number | 簽發時間（秒） |
| `exp` | number | 過期時間（秒，30 天） |

## 5. tokenVersion 強制下線機制

- 使用者表記錄 `tokenVersion`（初始 1）
- 每次簽 JWT 時把當下版本寫進 payload
- 認證中介軟體驗 JWT 時，比對 payload.tokenVersion 與 DB.tokenVersion
  - 一致 → 通過
  - 不一致 → 401
- **觸發升版的時機（未來）**：
  - 使用者手動「登出所有裝置」
  - 管理員強制下線
  - 偵測異常活動

## 6. fetch interceptor 行為

```
所有 fetch (除 /api/auth/*) 自動：
  ヾ 從 store 取 JWT
  ゝ 加 Authorization: Bearer <JWT>
  ゞ 發送請求

收到 401:
  ヾ 清空 IndexedDB.auth
  ゝ 清空 Pinia auth store
  ゞ 顯示 Toast「登入已過期」
  々 router.push('/login?reason=expired')

收到 403:
  ヾ 顯示「權限不足」訊息
  ゝ 不導向（使用者已登入但這個資源沒權限）

其他 4xx/5xx:
  ヾ 拋出 ApiError，由呼叫端處理
```

## 7. 環境變數需求

### 後端（`appsettings.json` / user-secrets）

```json
{
  "Auth": {
    "Line": {
      "ChannelId": "<LINE Login Channel ID>",
      "JwksUri": "https://api.line.me/oauth2/v2.1/certs",
      "Issuer": "https://access.line.me"
    },
    "Jwt": {
      "Secret": "<32 bytes random base64>",
      "Issuer": "UnreadSync",
      "Audience": "UnreadSync.Web",
      "AccessTokenLifetimeDays": 30
    }
  }
}
```

- `Auth:Line:ChannelId` → 公開值，可在 git
- `Auth:Jwt:Secret` → 機密，**絕不入 git**，dev 用 user-secrets、prod 用環境變數

### 前端（`.env.local`，不入 git）

```env
VITE_LIFF_ID=1234567890-AbCdEfGh
VITE_API_BASE_URL=https://your-api.example.com
```

## 8. 安全清單

| 風險 | 對策 |
|------|------|
| HTTPS 強制 | 後端 enforce HTTPS（生產） |
| CORS | 只允許前端網域 |
| JWT Secret 外洩 | user-secrets / 環境變數，不入 git |
| `aud` / `iss` 沒驗 | 必驗，缺一不可 |
| Token replay | 自家 JWT 過期 30 天 + tokenVersion |
| 錯誤訊息洩漏 | 401 統一回 `INVALID_TOKEN`，不細分原因 |
| LIFF ID 公開 | LIFF ID 本身可公開（前端 build 後可見），靠 token 簽章保安全 |

## 9. 邊角情境（Edge Cases）

| 情境 | 行為 |
|------|------|
| 在 LINE 內第一次開 | 自動 isLoggedIn=true，直接拿 token |
| 在 LINE 內但已過期 | `getIDToken()` 仍可，LIFF 自動續 LINE session |
| 外部瀏覽器初訪 | 顯示 LoginView，點按鈕走 OAuth |
| 外部瀏覽器 LINE 已登入過 | `liff.login()` 仍會跳轉但秒回（已授權） |
| 自家 JWT 30 天到期 | fetch 401 → 重新登入 |
| 使用者改 LINE 顯示名 | 重新登入時後端 upsert 會更新 |
| LINE 帳號被砍 | `getIDToken()` 失敗 → LoginView |

## 10. 測試覆蓋（對應 `15-testing-ci.md`）

### 後端（xUnit + WebApplicationFactory）

- `LineTokenVerifierTests`：
  - 用 fixture token + mock JWKS 驗成功
  - 簽章不對 → 拒絕
  - iss 不對 → 拒絕
  - aud 不對 → 拒絕
  - exp 過期 → 拒絕
- `JwtIssuerTests`：
  - 簽出 JWT 內 payload 正確
  - exp 等於 now + 30 天（±誤差）
- `AuthEndpointTests`：
  - POST /api/auth/line 成功流程
  - 缺欄位 → 400
  - token 無效 → 401
  - tokenVersion 不一致 → 401（中介軟體驗 /api/me）

### 前端（Vitest）

- `authFlow` 測試：mock LIFF SDK，驗登入分支
- `fetchInterceptor` 測試：401 → 清 store + 導向

---

實際 API 規格詳見 `05-api-contract.md`。

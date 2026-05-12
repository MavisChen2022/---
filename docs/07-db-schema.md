# 07 — 後端資料庫 Schema（SQLite + EF Core）

## 1. 概要

| 項目 | 值 |
|------|---|
| 資料庫引擎 | SQLite 3.53.1 |
| ORM | Entity Framework Core 10 |
| 檔案位置 | `backend/UnreadSync.Api/data/unreadsync.db` |
| Journal Mode | WAL (Write-Ahead Logging) |
| Migration | EF Core Migrations |

**儲存原則（凍結）**：

- Phase 1 後端**只存使用者 minimum 資料**（sub + name + picture + 建立/更新時間）
- 不存訊息（messages 都在 client 端 IndexedDB）
- 不存使用者設定（settings 都在 client 端）

## 2. Tables 總覽

| 表 | 用途 | Phase |
|----|------|-------|
| `users` | 使用者基本資料 + tokenVersion | Phase 1 |
| `push_subscriptions` | Web Push 訂閱 | Phase 1.5+（預留） |
| `webhook_events` | LINE webhook 紀錄 | Phase 1.5+（預留） |

## 3. `users` 表

**EF Core 實體**：

```csharp
public class User
{
    public string Id { get; set; }              // = LINE userId (sub)
    public string DisplayName { get; set; }
    public string PictureUrl { get; set; }
    public int TokenVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**SQL DDL**：

```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY NOT NULL,
    display_name    TEXT NOT NULL,
    picture_url     TEXT NOT NULL,
    token_version   INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL,    -- ISO 8601
    updated_at      TEXT NOT NULL
);
```

**索引**：無（PK 已足夠）。

**寫入時機**：

| 觸發 | 行為 |
|------|------|
| `POST /api/auth/line` 成功 | Upsert by `id`：第一次建立、後續更新 `displayName / pictureUrl / updatedAt`，**不動 `tokenVersion`** |
| （未來）使用者主動「登出所有裝置」 | `tokenVersion += 1` |
| （未來）管理員強制下線 | `tokenVersion += 1` |

## 4. `push_subscriptions` 表（Phase 1.5+ 預留）

```csharp
public class PushSubscription
{
    public long Id { get; set; }                 // auto increment
    public string UserId { get; set; }           // FK -> users.id
    public string Endpoint { get; set; }
    public string P256dh { get; set; }
    public string Auth { get; set; }
    public string UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}
```

```sql
CREATE TABLE push_subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT NOT NULL,
    endpoint        TEXT NOT NULL UNIQUE,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    user_agent      TEXT,
    created_at      TEXT NOT NULL,
    last_used_at    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

## 5. `webhook_events` 表（Phase 1.5+ 預留）

主要用於除錯 / 重試 / 防重複處理。

```csharp
public class WebhookEvent
{
    public long Id { get; set; }
    public string Source { get; set; }          // 'line' | 'gmail' | ...
    public string ExternalId { get; set; }      // 來源 id（防重）
    public string Payload { get; set; }         // 原始 JSON
    public DateTime ReceivedAt { get; set; }
    public bool Processed { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? Error { get; set; }
}
```

```sql
CREATE TABLE webhook_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT NOT NULL,
    external_id     TEXT NOT NULL,
    payload         TEXT NOT NULL,
    received_at     TEXT NOT NULL,
    processed       INTEGER NOT NULL DEFAULT 0,
    processed_at    TEXT,
    error           TEXT,
    UNIQUE(source, external_id)              -- 防重
);
```

## 6. AppDbContext

```csharp
public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    
    // Phase 1.5+ 啟用:
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<WebhookEvent> WebhookEvents => Set<WebhookEvent>();
    
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PascalCase property → snake_case column
        // 用 EFCore.NamingConventions or 手動 ToTable / ToColumn
    }
}
```

## 7. Migration 策略

```
dotnet ef migrations add InitialCreate
dotnet ef database update
```

**自動 migration（dev 環境）**：

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}
```

**prod 環境**：手動執行 `dotnet ef database update`（避免啟動時被卡）。

## 8. 連線字串

`appsettings.json`：

```json
{
  "ConnectionStrings": {
    "Sqlite": "Data Source=data/unreadsync.db;Cache=Shared"
  }
}
```

確保 `data/` 資料夾在 `.gitignore` 中（含 `*.db`, `*.db-shm`, `*.db-wal`）。

## 9. 備份策略（未來）

| 階段 | 做法 |
|------|------|
| Phase 1 | 不需要備份（dev only） |
| 上線初期 | 每日 `cp unreadsync.db backup/$(date).db` |
| 成熟期 | Litestream（SQLite replication） |

## 10. 容量預估

| 表 | 列大小 | 估計列數 | 估計總大小 |
|----|--------|---------|----------|
| `users` | ~500 B | 1000 | 500 KB |
| `push_subscriptions` | ~600 B | 2000 | 1.2 MB |
| `webhook_events` | ~2 KB | 100000 | 200 MB（要做 retention） |

SQLite 對這個量級**綽綽有餘**（單檔可到 281 TB）。

## 11. 跨環境一致性

- dev / staging / prod 都用 SQLite（Phase 1）
- 未來需要時可改 PostgreSQL：透過 EF Core provider 切換，**程式碼不變**

## 12. 測試覆蓋

- `xUnit + WebApplicationFactory + InMemory Sqlite`
- 每個測試獨立 db（`Data Source=:memory:`）
- 涵蓋：
  - User Upsert
  - tokenVersion 增減
  - Migration apply

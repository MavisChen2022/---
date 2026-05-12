# 09 — State Engine（狀態機 + 規則引擎）

## 1. 設計目標

- 將 **unread 數** 對應到 **Avatar State**
- 規則可由使用者調整、可由 module 預設提供（未來）
- 動畫切換要平滑（搭配 Render Pipeline 的 crossfade）

## 2. 狀態列表

```ts
type AvatarState = 'sleep' | 'normal' | 'busy' | 'panic'
```

| State | 預設區間 | 含意 |
|-------|----------|------|
| `sleep` | unread = 0 | 沒訊息，睡覺 |
| `normal` | unread 1 ~ 5 | 輕鬆狀態 |
| `busy` | unread 6 ~ 20 | 忙碌 |
| `panic` | unread 21+ | 爆量 |

> Phase 2+ 可開放 `custom` states。

## 3. State Rule 規格

```ts
interface StateRule {
  state: AvatarState
  min: number
  max: number | null   // null = 無上限
}
```

**預設**（凍結，存於 `user_settings.stateRules`）：

```json
[
  { "state": "sleep",  "min": 0,  "max": 0 },
  { "state": "normal", "min": 1,  "max": 5 },
  { "state": "busy",   "min": 6,  "max": 20 },
  { "state": "panic",  "min": 21, "max": null }
]
```

## 4. 規則驗證（必須通過）

| 檢查 | 描述 |
|------|------|
| **完整性** | 規則必須覆蓋 0 ~ ∞ |
| **無重疊** | 任兩個區間不可有交集 |
| **無間隙** | 不可有未覆蓋的 unread 數值 |
| **固定首尾** | `sleep.min=0, sleep.max=0` 與 `panic.max=null` 必填 |
| **遞增** | min 必須隨陣列順序遞增 |

**驗證演算法**（虛擬碼）：

```ts
function validateStateRules(rules: StateRule[]): ValidationResult {
  // 1. 4 個 state 都要有
  const states = rules.map(r => r.state)
  if (new Set(states).size !== 4) return invalid('需要 4 個 state')
  
  // 2. 排序後檢查
  const sorted = [...rules].sort((a, b) => a.min - b.min)
  
  // 第一個必須 min=0
  if (sorted[0].min !== 0) return invalid('第一個 state 必須 min=0')
  
  // 連續性
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    if (prev.max === null) return invalid('null max 必須在最後')
    if (cur.min !== prev.max + 1) {
      return invalid(`區間不連續: ${prev.state}.max=${prev.max} 但 ${cur.state}.min=${cur.min}`)
    }
  }
  
  // 最後一個必須 max=null
  if (sorted[sorted.length - 1].max !== null) {
    return invalid('最後一個 state 必須 max=null')
  }
  
  return valid()
}
```

## 5. State 解析函式

```ts
function getStateFromUnread(unread: number, rules: StateRule[]): AvatarState {
  for (const rule of rules) {
    if (rule.max === null) {
      if (unread >= rule.min) return rule.state
    } else {
      if (unread >= rule.min && unread <= rule.max) return rule.state
    }
  }
  // 不可能到這（如果規則有效），fallback
  return 'sleep'
}
```

複雜度 O(n)，n 永遠是 4，等同 O(1)。

## 6. State 過渡（Transition）

Phase 1 凍結：**直接切**，由 Render Pipeline 用 crossfade 平滑視覺。

State 切換期間的 `currentState`：

| 時間點 | currentState | 視覺 |
|--------|-------------|------|
| t=0 | normal | normal 動畫 |
| t=0+ | panic ← 立刻切 | crossfade 開始 |
| t=300ms | panic | crossfade 結束 |

→ `currentState` 永遠是「**邏輯上應該是的 state**」，視覺漸變交給 Render Pipeline。

## 7. Trigger System

### 7.1 觸發來源

| 來源 | 何時觸發 |
|------|---------|
| `unreadChanged` | messages add / delete / read 改變 |
| `messageRead` | 使用者標記訊息為已讀 |
| `appResume` | App 從背景回到前景 |
| `visibilitychange` | `document.visibilityState` 變化 |
| `manualRefresh` | 使用者按 「重新計算」 |

### 7.2 觸發 → Recalc 的流程

```
Trigger 來源 emit Event Bus 事件
        │
        ▼
Recalculation Engine 收到事件
        │
        ▼
debounce 50ms (避免一秒內 100 次觸發)
        │
        ▼
從 messagesStore 取 unread
        │
        ▼
從 settingsStore 取 stateRules
        │
        ▼
getStateFromUnread(unread, rules) → newState
        │
        ▼
比較 currentState != newState ?
   ├ 是 → emit 'state:transition' { from, to }
   └ 否 → 無事
```

### 7.3 Recalculation Engine 偽碼

```ts
class RecalculationEngine {
  private queue: TriggerSource[] = []
  private timer: number | null = null
  
  trigger(source: TriggerSource): void {
    this.queue.push(source)
    if (this.timer) return
    
    this.timer = window.setTimeout(() => {
      this.flush()
      this.timer = null
    }, 50)
  }
  
  private flush(): void {
    const sources = [...this.queue]
    this.queue = []
    
    const unread = messagesStore.unreadCount   // computed
    const rules = settingsStore.stateRules
    const newState = getStateFromUnread(unread, rules)
    
    if (runtimeStore.currentState !== newState) {
      const from = runtimeStore.currentState
      runtimeStore.currentState = newState
      bus.emit('state:transition', { from, to: newState, sources })
    }
  }
}
```

## 8. Trigger Settings（使用者可調）

```ts
{
  readThresholdReset: true,    // 已讀後是否觸發 recalc
  resumeReset: true,           // appResume 是否觸發
  visibilityRecalc: true       // visibilitychange 是否觸發
}
```

例：使用者關掉 `resumeReset` → 從背景回前景時 Avatar 不會立刻換 state（要主動操作才換）。

## 9. State Engine 與其他系統的關係

```
Trigger System  →  Recalculation Engine  →  State Rule Engine  →  Render Pipeline
                                                      ↑
                                              User Settings
                                                      ↑
                                              IndexedDB.user_settings
```

## 10. 在 UI 顯示

Settings 頁的 State Rules Editor：

```
┌─────────────────────────────────────────┐
│ State Rules                              │
├─────────────────────────────────────────┤
│  Sleep    0          (固定)              │
│  Normal   1 ~ [ 5 ]                      │
│  Busy     6 ~ [ 20 ]                     │
│  Panic    21+        (固定)              │
│                                          │
│  [回復預設]   [儲存]                       │
└─────────────────────────────────────────┘
```

- 「Sleep」與「Panic」的端點固定，不可調
- 中間兩個 max 可調，但會即時驗證
- 改完後 emit `settings:changed` 觸發 recalc

## 11. 邊角情境

| 情境 | 行為 |
|------|------|
| unread = -1（不可能但 defensive） | clamp 到 0，當 sleep |
| 規則破損（IndexedDB 壞掉） | 退回預設規則，提示使用者 |
| 載入中 currentState 為 undefined | 顯示 sleep 圖（保守） |
| Module 切換時 currentState 不變 | 用新 module 的 state 對應圖 |

## 12. 測試覆蓋

| 測試 | 範例 |
|------|------|
| `getStateFromUnread` 表驅動 | unread=0 → sleep；unread=5 → normal；unread=20 → busy；unread=21 → panic |
| `validateStateRules` | 重疊 / 間隙 / 缺 state 都應拒絕 |
| Recalculation debounce | 100ms 內 10 次 trigger 只 emit 一次 |
| Trigger Settings 開關 | resumeReset=false 時 appResume 不觸發 recalc |

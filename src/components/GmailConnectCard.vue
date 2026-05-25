<script setup lang="ts">
import { useGmailStore } from "@/stores/gmail";

const gmail = useGmailStore();

async function onConnect() {
  try {
    await gmail.connect();
  } catch (e) {
    gmail.oauthError = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div class="gmail-card">
    <h3>Gmail</h3>
    <p class="status">{{ gmail.statusLabel }}</p>

    <p v-if="!gmail.configured" class="warn">
      請確認後端 API 已啟動，且前端 <code>.env</code> 設定 <code>VITE_API_BASE_URL</code>。
    </p>

    <p v-if="gmail.email" class="email">{{ gmail.email }}</p>
    <p v-if="gmail.lastSyncedAt" class="meta">
      上次同步：{{ new Date(gmail.lastSyncedAt).toLocaleString() }}
    </p>
    <p v-if="gmail.syncError" class="error">{{ gmail.syncError }}</p>
    <p v-if="gmail.oauthError" class="error">{{ gmail.oauthError }}</p>

    <div class="actions">
      <button
        v-if="gmail.configured && !gmail.connected"
        type="button"
        :disabled="gmail.syncing"
        @click="onConnect"
      >
        連線 Gmail
      </button>
      <button
        v-if="gmail.connected"
        type="button"
        :disabled="gmail.syncing"
        @click="gmail.syncInbox()"
      >
        {{ gmail.syncing ? "同步中…" : "立即同步" }}
      </button>
      <button
        v-if="gmail.connected"
        type="button"
        class="secondary"
        @click="gmail.disconnect()"
      >
        中斷連線
      </button>
    </div>
  </div>
</template>

<style scoped>
.gmail-card {
  background: #16162a;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.gmail-card h3 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
}
.status {
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
  color: #c8c8e0;
}
.email {
  font-size: 0.8rem;
  margin: 0 0 0.25rem;
}
.meta {
  font-size: 0.75rem;
  color: #a0a0b8;
  margin: 0 0 0.5rem;
}
.warn,
.error {
  font-size: 0.8rem;
  margin: 0 0 0.5rem;
}
.warn {
  color: #e8c547;
}
.error {
  color: #ff8a8a;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
button {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: none;
  background: #3d5a80;
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
button.secondary {
  background: #2d2d44;
}
code {
  font-size: 0.75rem;
}
</style>

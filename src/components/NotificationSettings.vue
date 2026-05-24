<script setup lang="ts">
import { computed, ref } from "vue";
import { isBadgeSupported } from "@/services/notification/badge-service";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@/services/notification/notification-service";
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();
const permission = ref(getNotificationPermission());
const message = ref<string | null>(null);

const supported = computed(() => isNotificationSupported());
const badgeSupported = computed(() => isBadgeSupported());

const permissionLabel = computed(() => {
  switch (permission.value) {
    case "granted":
      return "已授權";
    case "denied":
      return "已拒絕（請至瀏覽器設定開啟）";
    case "default":
      return "尚未詢問";
    default:
      return "不支援";
  }
});

async function onToggleEnabled(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  await settings.setNotificationEnabled(checked);
  message.value = checked ? "已啟用通知設定" : "已關閉通知（仍會更新 App 內 UI）";
}

async function requestPermission() {
  message.value = null;
  const result = await requestNotificationPermission();
  permission.value = getNotificationPermission();
  if (result === "granted") {
    await settings.setNotificationEnabled(true);
    message.value = "通知權限已授予";
  } else if (result === "denied") {
    message.value = "通知權限遭拒絕";
  } else {
    message.value = "無法取得通知權限";
  }
}
</script>

<template>
  <div class="notify-card">
    <h3>本機通知</h3>
    <p v-if="!supported" class="warn">此瀏覽器不支援 Notification API。</p>
    <template v-else>
      <p class="meta">權限狀態：<strong>{{ permissionLabel }}</strong></p>
      <p v-if="badgeSupported" class="meta">主畫面圖示角標：支援</p>
      <p v-else class="meta">主畫面圖示角標：此裝置不支援</p>

      <label class="toggle">
        <input
          type="checkbox"
          :checked="settings.notificationEnabled"
          :disabled="permission === 'denied'"
          @change="onToggleEnabled"
        />
        未讀變更時發送本機通知
      </label>

      <button
        v-if="permission !== 'granted'"
        type="button"
        class="btn"
        @click="requestPermission"
      >
        請求通知權限
      </button>
      <p v-if="message" class="msg">{{ message }}</p>
      <p class="hint">
        僅在 Gmail 同步後未讀或 Avatar 狀態改變時通知；MVP 不使用伺服器 Push。
      </p>
    </template>
  </div>
</template>

<style scoped>
.notify-card {
  background: #16162a;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
.notify-card h3 {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
}
.meta {
  font-size: 0.8rem;
  color: #a0a0b8;
  margin: 0 0 0.35rem;
}
.warn {
  color: #e8c547;
  font-size: 0.8rem;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin: 0.5rem 0;
  cursor: pointer;
}
.btn {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: none;
  background: #3d5a80;
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}
.msg {
  color: #8fd68f;
  font-size: 0.8rem;
  margin: 0.35rem 0 0;
}
.hint {
  font-size: 0.75rem;
  color: #707090;
  margin: 0.5rem 0 0;
}
</style>

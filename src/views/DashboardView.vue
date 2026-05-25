<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AvatarCanvas from "@/components/AvatarCanvas.vue";
import GmailConnectCard from "@/components/GmailConnectCard.vue";
import { thresholdsToSummary } from "@/core/avatar/threshold-format";
import { useAvatarStore } from "@/stores/avatar";
import { useGmailStore } from "@/stores/gmail";
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();
const avatar = useAvatarStore();
const gmail = useGmailStore();
const router = useRouter();

const devMode = ref(false);

const summary = computed(() =>
  settings.stateThresholds ? thresholdsToSummary(settings.stateThresholds) : [],
);

const ruleLabel = computed(() =>
  settings.displayRule === "RULE_LIVE_UNREAD"
    ? "規則二：實際未讀"
    : "規則一：增量未讀（自解除待機起）",
);

const counterStatus = computed(() => {
  if (gmail.syncStatus === "auth_error") return "授權失效";
  if (gmail.syncStatus === "offline") return "離線快取";
  return "正常";
});

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  if (!gmail.bootstrapped) await gmail.bootstrap();
  if (!avatar.hydrated) await avatar.hydrateFromDb();
});

watch(
  () => gmail.connected,
  (connected) => {
    if (connected) devMode.value = false;
  },
);

function onUnreadInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  avatar.setActualUnread(Number.isNaN(v) ? 0 : v);
}

async function onUnreadChange() {
  await avatar.persistCounterState();
}

async function simulateWake() {
  await avatar.applyWakeReset();
  await avatar.persistCounterState();
}
</script>

<template>
  <section class="card">
    <h2>Avatar Dashboard</h2>

    <p v-if="settings.loaded" class="meta">
      模組：<strong>{{ settings.activeModuleId }}</strong>
      · {{ ruleLabel }}
      · 同步：<strong>{{ counterStatus }}</strong>
    </p>

    <GmailConnectCard />

    <AvatarCanvas />

    <div class="stats">
      <div class="stat">
        <span class="label">INBOX 未讀</span>
        <strong>{{ avatar.actualUnread }}</strong>
      </div>
      <div class="stat">
        <span class="label">顯示用未讀</span>
        <strong>{{ avatar.displayUnread }}</strong>
      </div>
      <div class="stat">
        <span class="label">Avatar 狀態</span>
        <strong>{{ avatar.resolvedStateComputed }}</strong>
      </div>
    </div>

    <template v-if="!gmail.connected">
      <label class="dev-toggle">
        <input v-model="devMode" type="checkbox" />
        開發模式：手動模擬未讀
      </label>
      <label v-if="devMode" class="slider">
        模擬未讀數（0–30）
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          :value="avatar.actualUnread"
          @input="onUnreadInput"
          @change="onUnreadChange"
        />
      </label>
    </template>

    <button
      v-if="settings.displayRule === 'RULE_RESET_ON_WAKE' && gmail.connected"
      type="button"
      class="wake-btn"
      @click="simulateWake"
    >
      手動重置基準（規則一測試）
    </button>

    <div class="threshold-summary">
      <h3>目前門檻</h3>
      <ul>
        <li v-for="row in summary" :key="row.state">
          {{ row.label }}：<span>{{ row.range }}</span>
        </li>
      </ul>
      <button type="button" class="linkish" @click="router.push('/settings')">
        編輯門檻設定
      </button>
      <button type="button" class="linkish" @click="router.push('/messages')">
        查看 Gmail 隱私設定
      </button>
    </div>

    <p class="hint">
      已連線時每 60 秒前景自動同步；切回 App 時立即刷新。規則一在回到前景時自動重置基準。
    </p>
  </section>
</template>

<style scoped>
.meta {
  font-size: 0.875rem;
  color: #a0a0b8;
  margin: 0 0 0.75rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 0.75rem 0;
}
.stat {
  background: #16162a;
  border-radius: 8px;
  padding: 0.5rem;
  text-align: center;
}
.stat .label {
  display: block;
  font-size: 0.7rem;
  color: #a0a0b8;
  margin-bottom: 0.25rem;
}
.dev-toggle {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}
.slider {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.slider input {
  width: 100%;
  margin-top: 0.25rem;
}
.wake-btn {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  border: none;
  border-radius: 8px;
  background: #4a4e69;
  color: #fff;
  cursor: pointer;
}
.threshold-summary h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}
.threshold-summary ul {
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
  font-size: 0.8rem;
}
.linkish {
  margin-right: 0.5rem;
  margin-bottom: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #3d5a80;
  background: transparent;
  color: #7eb8ff;
  cursor: pointer;
  font-size: 0.8rem;
}
.hint {
  font-size: 0.8rem;
  color: #a0a0b8;
  margin-top: 0.75rem;
}
</style>

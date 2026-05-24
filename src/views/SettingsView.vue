<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AvatarCanvas from "@/components/AvatarCanvas.vue";
import StateThresholdEditor from "@/components/StateThresholdEditor.vue";
import { cloneThresholds, thresholdsToSummary } from "@/core/avatar/threshold-format";
import type { DisplayRule, StateThresholds } from "@/core/avatar/types";
import GmailConnectCard from "@/components/GmailConnectCard.vue";
import NotificationSettings from "@/components/NotificationSettings.vue";
import { updateAppBadge } from "@/services/notification/badge-service";
import { useAvatarStore } from "@/stores/avatar";
import { useGmailStore } from "@/stores/gmail";
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();
const avatar = useAvatarStore();
const gmail = useGmailStore();
const router = useRouter();

const saveMessage = ref<string | null>(null);
const draft = ref<StateThresholds | null>(null);

const summary = computed(() =>
  settings.stateThresholds ? thresholdsToSummary(settings.stateThresholds) : [],
);

onMounted(async () => {
  if (!settings.loaded) await settings.load();
  if (!gmail.bootstrapped) await gmail.bootstrap();
  settings.startThresholdDraft();
  draft.value = settings.draftThresholds;
});

function onDraftUpdate(value: StateThresholds) {
  draft.value = value;
  settings.updateDraftThresholds(value);
}

async function saveThresholds() {
  saveMessage.value = null;
  if (!draft.value) return;
  settings.updateDraftThresholds(draft.value);
  const ok = await settings.saveThresholdDraft();
  if (ok) {
    saveMessage.value = "已儲存門檻設定";
    draft.value = settings.stateThresholds
      ? cloneThresholds(settings.stateThresholds)
      : null;
    await avatar.persistCounterState();
  } else {
    saveMessage.value = "儲存失敗，請修正紅色錯誤提示";
  }
}

async function resetDefaults() {
  await settings.resetThresholdsToDefault();
  draft.value = settings.draftThresholds;
  saveMessage.value = "已還原預設門檻";
}

async function onDisplayRuleChange(rule: DisplayRule) {
  await settings.setDisplayRule(rule);
  await updateAppBadge(avatar.displayUnread);
  saveMessage.value = null;
}
</script>

<template>
  <section class="card">
    <h2>設定</h2>

    <div v-if="!settings.loaded" class="hint">載入中…</div>

    <template v-else>
      <div class="section">
        <GmailConnectCard />
      </div>

      <div class="section">
        <NotificationSettings />
      </div>

      <div class="section">
        <h3>未讀顯示規則</h3>
        <label class="radio">
          <input
            type="radio"
            name="displayRule"
            value="RULE_LIVE_UNREAD"
            :checked="settings.displayRule === 'RULE_LIVE_UNREAD'"
            @change="onDisplayRuleChange('RULE_LIVE_UNREAD')"
          />
          規則二：依 Gmail 實際未讀即時顯示
        </label>
        <label class="radio">
          <input
            type="radio"
            name="displayRule"
            value="RULE_RESET_ON_WAKE"
            :checked="settings.displayRule === 'RULE_RESET_ON_WAKE'"
            @change="onDisplayRuleChange('RULE_RESET_ON_WAKE')"
          />
          規則一：解除待機後重置顯示基準
        </label>
        <p class="hint">
          規則一：App 回到前景時自動重置基準；Dashboard 亦可手動測試。
        </p>
      </div>

      <div class="section">
        <h3>Avatar 狀態門檻</h3>
        <p class="hint">定義各狀態對應的未讀信件數區間（須完整覆蓋 0 封起算）。</p>

        <StateThresholdEditor
          v-if="draft"
          :model-value="draft"
          @update:model-value="onDraftUpdate"
        />

        <div class="actions">
          <button type="button" :disabled="!settings.draftValidation.valid" @click="saveThresholds">
            儲存門檻
          </button>
          <button type="button" class="secondary" @click="resetDefaults">還原預設</button>
        </div>
        <p v-if="saveMessage" class="save-msg">{{ saveMessage }}</p>
      </div>

      <div class="section">
        <h3>目前生效門檻</h3>
        <ul class="summary-list">
          <li v-for="row in summary" :key="row.state">
            <strong>{{ row.label }}</strong>：{{ row.range }}
          </li>
        </ul>
      </div>

      <div class="section">
        <h3>模組</h3>
        <p>
          使用中：<strong>{{ settings.activeModuleId }}</strong>
          <button type="button" class="linkish" @click="router.push('/modules')">變更</button>
        </p>
      </div>

      <div class="section">
        <h3>預覽（目前未讀 {{ avatar.actualUnread }} 封）</h3>
        <AvatarCanvas />
      </div>
    </template>
  </section>
</template>

<style scoped>
.section {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #2d2d44;
}
.section:last-child {
  border-bottom: none;
}
.section h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.hint {
  color: #a0a0b8;
  font-size: 0.8rem;
  margin: 0 0 0.5rem;
}
.radio {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #3d5a80;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.secondary {
  background: #2d2d44;
}
.linkish {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid #3d5a80;
}
.save-msg {
  color: #8fd68f;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
.summary-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}
.summary-list li {
  margin-bottom: 0.25rem;
}
</style>

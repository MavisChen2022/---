<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useAvatarStore } from "@/stores/avatar";
import { useSettingsStore } from "@/stores/settings";

const props = defineProps<{
  /** Override actual unread; default uses avatar store */
  unread?: number;
}>();

const avatar = useAvatarStore();
const settings = useSettingsStore();
const { displayUnread, resolvedStateComputed } = storeToRefs(avatar);

const containerRef = ref<HTMLElement | null>(null);

async function paint() {
  if (props.unread !== undefined) {
    avatar.setActualUnread(props.unread);
  }
  if (containerRef.value) {
    await avatar.renderToContainer(containerRef.value);
  }
}

watch(() => props.unread, paint);

watch(
  () => avatar.actualUnread,
  () => {
    if (props.unread === undefined) paint();
  },
);

watch(
  () => [
    settings.stateThresholds,
    settings.displayRule,
    settings.displayUnreadBaseline,
    settings.activeModuleId,
  ],
  () => paint(),
  { deep: true },
);

onMounted(paint);
onBeforeUnmount(() => avatar.engine.teardown());
</script>

<template>
  <div class="avatar-stage">
    <div ref="containerRef" class="avatar-canvas" />
    <p v-if="avatar.renderError" class="error-text">{{ avatar.renderError }}</p>
  </div>
  <p class="state-label">
    狀態：<strong>{{ resolvedStateComputed }}</strong>
    <span class="sub">（顯示用未讀 {{ displayUnread }}）</span>
  </p>
</template>

<style scoped>
.avatar-canvas {
  width: 160px;
  height: 160px;
}
.state-label {
  text-align: center;
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
}
.sub {
  display: block;
  font-size: 0.75rem;
  color: #a0a0b8;
  font-weight: normal;
  margin-top: 0.15rem;
}
</style>

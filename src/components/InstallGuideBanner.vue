<script setup lang="ts">
import { computed } from "vue";

const isStandalone = computed(
  () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
);
</script>

<template>
  <div v-if="!isStandalone" class="banner">
    <strong>安裝 PWA</strong>：Android 請用 Chrome「安裝應用程式」；iOS 請用 Safari「加入主畫面」，以獲得完整主畫面與通知體驗。
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useGmailSync } from "@/composables/useGmailSync";
import { useSettingsStore } from "@/stores/settings";
import { useModulesStore } from "@/stores/modules";
import { useGmailStore } from "@/stores/gmail";
import InstallGuideBanner from "@/components/InstallGuideBanner.vue";

const settings = useSettingsStore();
const modules = useModulesStore();
const gmail = useGmailStore();

const gmailSync = useGmailSync();

onMounted(async () => {
  await settings.load();
  await modules.load();
  await gmail.bootstrap();
  gmailSync.start();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Avatar Mail</h1>
    </header>
    <InstallGuideBanner />
    <main class="app-main">
      <RouterView />
    </main>
    <nav class="app-nav">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/modules">模組</RouterLink>
      <RouterLink to="/messages">隱私</RouterLink>
      <RouterLink to="/settings">設定</RouterLink>
    </nav>
  </div>
</template>

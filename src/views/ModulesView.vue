<script setup lang="ts">
import { resolveModuleAssetUrl } from "@/core/modules/module-loader";
import { useModulesStore } from "@/stores/modules";
import { useSettingsStore } from "@/stores/settings";

const modules = useModulesStore();
const settings = useSettingsStore();

async function selectModule(id: string) {
  await settings.setActiveModuleId(id);
}
</script>

<template>
  <section class="card">
    <h2>模組</h2>
    <button type="button" :disabled="modules.loading" @click="modules.rescan()">
      {{ modules.loading ? "掃描中…" : "重新掃描" }}
    </button>
    <p v-if="modules.error" class="error-text">{{ modules.error }}</p>
    <div class="module-grid">
      <article
        v-for="mod in modules.modules"
        :key="mod.id"
        class="module-card"
        :class="{ active: settings.activeModuleId === mod.id }"
      >
        <img
          v-if="mod.validationStatus === 'valid'"
          :src="resolveModuleAssetUrl(mod.baseUrl, mod.manifest.preview)"
          :alt="mod.manifest.name"
        />
        <div>
          <strong>{{ mod.manifest.name || mod.id }}</strong>
          <p>v{{ mod.manifest.version }} · {{ mod.validationStatus }}</p>
          <ul v-if="mod.validationErrors.length" class="error-text">
            <li v-for="(err, i) in mod.validationErrors" :key="i">{{ err }}</li>
          </ul>
          <button
            v-if="mod.validationStatus === 'valid'"
            type="button"
            :disabled="settings.activeModuleId === mod.id"
            @click="selectModule(mod.id)"
          >
            {{ settings.activeModuleId === mod.id ? "使用中" : "啟用" }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
button {
  margin-bottom: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #3d5a80;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.module-card p {
  margin: 0.25rem 0;
  font-size: 0.8rem;
  color: #a0a0b8;
}
.module-card ul {
  margin: 0.25rem 0;
  padding-left: 1rem;
  font-size: 0.75rem;
}
</style>

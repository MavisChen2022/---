import { defineStore } from "pinia";
import { loadAllModules } from "@/core/modules/module-loader";
import { saveInstalledModule } from "@/db";
import type { InstalledModule } from "@/core/avatar/types";

export const useModulesStore = defineStore("modules", {
  state: () => ({
    loaded: false,
    loading: false,
    error: null as string | null,
    modules: [] as InstalledModule[],
  }),
  getters: {
    activeModule(state): InstalledModule | undefined {
      return state.modules.find((m) => m.enabled && m.validationStatus === "valid");
    },
    getById: (state) => (id: string) => state.modules.find((m) => m.id === id),
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        const modules = await loadAllModules();
        this.modules = modules;
        for (const mod of modules) {
          await saveInstalledModule(mod);
        }
        this.loaded = true;
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e);
      } finally {
        this.loading = false;
      }
    },
    async rescan() {
      await this.load();
    },
  },
});

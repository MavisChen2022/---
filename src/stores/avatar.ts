import { defineStore } from "pinia";
import { displayUnreadFromRule, resolveState } from "@/core/avatar/state-engine";
import { RenderEngine } from "@/core/render/render-engine";
import { getUnreadCounter, saveUnreadCounter } from "@/db";
import type { AvatarState } from "@/core/avatar/types";
import type { SyncStatus } from "@/services/gmail/types";
import { useSettingsStore } from "./settings";
import { useModulesStore } from "./modules";

export const useAvatarStore = defineStore("avatar", {
  state: () => ({
    /** Gmail INBOX unread (from sync or manual dev override) */
    actualUnread: 0,
    resolvedState: "sleep" as AvatarState,
    renderError: null as string | null,
    engine: new RenderEngine(),
    hydrated: false,
  }),
  getters: {
    displayUnread(): number {
      const settings = useSettingsStore();
      if (!settings.loaded) return this.actualUnread;
      return displayUnreadFromRule(
        this.actualUnread,
        settings.displayRule,
        settings.displayUnreadBaseline,
      );
    },
    resolvedStateComputed(): AvatarState {
      const settings = useSettingsStore();
      const thresholds = settings.stateThresholds;
      if (!thresholds) return "sleep";
      return resolveState(this.displayUnread, thresholds);
    },
  },
  actions: {
    async hydrateFromDb() {
      const counter = await getUnreadCounter();
      this.actualUnread = counter.count;
      this.resolvedState = counter.resolvedState;
      this.hydrated = true;
    },
    setActualUnread(n: number) {
      this.actualUnread = Math.max(0, Math.floor(n));
    },
    async persistCounterState(overrides?: {
      status?: SyncStatus;
      syncedAt?: string;
    }) {
      const state = this.resolvedStateComputed;
      this.resolvedState = state;
      await saveUnreadCounter({
        count: this.actualUnread,
        displayCount: this.displayUnread,
        resolvedState: state,
        syncedAt: overrides?.syncedAt ?? new Date().toISOString(),
        status: overrides?.status ?? "ok",
      });
    },
    async applyWakeReset() {
      const settings = useSettingsStore();
      if (settings.displayRule !== "RULE_RESET_ON_WAKE") return;
      await settings.setDisplayUnreadBaseline(this.actualUnread);
    },
    async renderToContainer(container: HTMLElement) {
      const settings = useSettingsStore();
      const modules = useModulesStore();
      this.renderError = null;

      if (!settings.loaded) await settings.load();
      if (!modules.loaded) await modules.load();
      if (!this.hydrated) await this.hydrateFromDb();

      const mod =
        modules.getById(settings.activeModuleId) ?? modules.activeModule;
      if (!mod || mod.validationStatus !== "valid") {
        this.renderError = "No valid active module";
        return;
      }

      this.resolvedState = this.resolvedStateComputed;

      try {
        await this.engine.render({
          module: mod,
          state: this.resolvedState,
          container,
          documentVisible: document.visibilityState === "visible",
        });
        await this.persistCounterState();
      } catch (e) {
        this.renderError = e instanceof Error ? e.message : String(e);
      }
    },
  },
});

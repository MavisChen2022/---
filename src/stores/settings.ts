import { defineStore } from "pinia";
import { validateThresholds } from "@/core/avatar/threshold-validator";
import { createDefaultThresholds, cloneThresholds } from "@/core/avatar/threshold-format";
import { getUserSettings, saveUserSettings } from "@/db";
import { onNotificationPreferenceChange } from "@/services/notification/notification-service";
import type { DisplayRule, StateThresholds } from "@/core/avatar/types";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    loaded: false,
    stateThresholds: null as StateThresholds | null,
    activeModuleId: "cat-pack",
    displayRule: "RULE_LIVE_UNREAD" as DisplayRule,
    displayUnreadBaseline: 0,
    notificationEnabled: true,
    onboardingCompleted: false,
    gmailEmail: null as string | null,
    lastThresholdErrors: [] as string[],
    draftThresholds: null as StateThresholds | null,
  }),
  getters: {
    draftValidation(state): { valid: boolean; errors: string[] } {
      const t = state.draftThresholds;
      if (!t) return { valid: false, errors: ["尚未載入草稿"] };
      return validateThresholds(t);
    },
  },
  actions: {
    async load() {
      const s = await getUserSettings();
      this.stateThresholds = cloneThresholds(s.stateThresholds);
      this.draftThresholds = null;
      this.activeModuleId = s.activeModuleId;
      this.displayRule = s.displayRule;
      this.displayUnreadBaseline = s.displayUnreadBaseline;
      this.notificationEnabled = s.notificationEnabled;
      this.onboardingCompleted = s.onboardingCompleted;
      this.gmailEmail = s.gmailEmail ?? null;
      this.lastThresholdErrors = [];
      this.loaded = true;
    },
    startThresholdDraft() {
      if (this.stateThresholds) {
        this.draftThresholds = cloneThresholds(this.stateThresholds);
      }
    },
    updateDraftThresholds(thresholds: StateThresholds) {
      this.draftThresholds = cloneThresholds(thresholds);
    },
    cancelThresholdDraft() {
      this.draftThresholds = null;
      this.lastThresholdErrors = [];
    },
    async saveThresholdDraft(): Promise<boolean> {
      if (!this.draftThresholds) return false;
      const { valid, errors } = validateThresholds(this.draftThresholds);
      if (!valid) {
        this.lastThresholdErrors = errors;
        return false;
      }
      this.stateThresholds = cloneThresholds(this.draftThresholds);
      this.draftThresholds = null;
      this.lastThresholdErrors = [];
      await saveUserSettings({ stateThresholds: this.stateThresholds });
      return true;
    },
    async resetThresholdsToDefault() {
      const defaults = createDefaultThresholds();
      this.stateThresholds = defaults;
      this.draftThresholds = cloneThresholds(defaults);
      this.lastThresholdErrors = [];
      await saveUserSettings({ stateThresholds: defaults });
    },
    async setActiveModuleId(id: string) {
      this.activeModuleId = id;
      await saveUserSettings({ activeModuleId: id });
    },
    async setDisplayRule(rule: DisplayRule) {
      this.displayRule = rule;
      await saveUserSettings({ displayRule: rule });
    },
    async setDisplayUnreadBaseline(baseline: number) {
      this.displayUnreadBaseline = Math.max(0, Math.floor(baseline));
      await saveUserSettings({ displayUnreadBaseline: this.displayUnreadBaseline });
    },
    async setGmailEmail(email: string | null) {
      this.gmailEmail = email;
      await saveUserSettings({ gmailEmail: email });
    },
    async setNotificationEnabled(enabled: boolean) {
      this.notificationEnabled = enabled;
      await saveUserSettings({ notificationEnabled: enabled });
      await onNotificationPreferenceChange(enabled);
    },
    async patchSettings(patch: {
      stateThresholds?: StateThresholds;
      displayRule?: DisplayRule;
      notificationEnabled?: boolean;
      gmailEmail?: string | null;
    }) {
      if (patch.stateThresholds) this.stateThresholds = cloneThresholds(patch.stateThresholds);
      if (patch.displayRule !== undefined) this.displayRule = patch.displayRule;
      if (patch.notificationEnabled !== undefined) {
        this.notificationEnabled = patch.notificationEnabled;
      }
      if (patch.gmailEmail !== undefined) this.gmailEmail = patch.gmailEmail;
      await saveUserSettings(patch);
    },
  },
});

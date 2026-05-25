import { onUnmounted } from "vue";
import { useGmailStore } from "@/stores/gmail";
import { useAvatarStore } from "@/stores/avatar";
import { useModulesStore } from "@/stores/modules";
import { useSettingsStore } from "@/stores/settings";
import {
  captureUnreadSnapshot,
  handleAfterSync,
} from "@/services/notification/notification-service";

const SYNC_INTERVAL_MS = 60_000;

export function useGmailSync() {
  const gmail = useGmailStore();
  const avatar = useAvatarStore();
  const settings = useSettingsStore();
  const modules = useModulesStore();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let started = false;

  async function applyWakeRuleIfNeeded(): Promise<void> {
    if (settings.displayRule !== "RULE_RESET_ON_WAKE") return;

    const mod = modules.getById(settings.activeModuleId) ?? modules.activeModule;
    const previous = captureUnreadSnapshot(
      avatar.actualUnread,
      avatar.displayUnread,
      avatar.resolvedStateComputed,
    );
    await avatar.applyWakeReset();
    const current = captureUnreadSnapshot(
      avatar.actualUnread,
      avatar.displayUnread,
      avatar.resolvedStateComputed,
    );
    await handleAfterSync({
      previous,
      current,
      notificationEnabled: settings.notificationEnabled,
      module: mod,
      moduleName: mod?.manifest.name ?? "Avatar",
    });
  }

  async function onVisible() {
    if (!gmail.connected) return;
    await applyWakeRuleIfNeeded();
    await gmail.syncInbox();
  }

  function startInterval() {
    stopInterval();
    if (!gmail.connected) return;
    if (document.visibilityState !== "visible") return;
    intervalId = setInterval(() => {
      void gmail.syncInbox();
    }, SYNC_INTERVAL_MS);
  }

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      void onVisible();
      startInterval();
    } else {
      stopInterval();
    }
  }

  function start() {
    if (started) return;
    started = true;
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (gmail.connected) {
      startInterval();
      if (document.visibilityState === "visible") {
        void onVisible();
      }
    }
  }

  function stop() {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    stopInterval();
    started = false;
  }

  onUnmounted(stop);

  return { start, stop, onVisible, syncNow: () => gmail.syncInbox() };
}

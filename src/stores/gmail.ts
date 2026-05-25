import { defineStore } from "pinia";
import {
  consumeOAuthErrorFromUrl,
  fetchAuthStatus,
  logoutBackendSession,
  startBackendOAuthLogin,
} from "@/services/api/auth-api";
import { fetchInboxSync, GmailBackendError } from "@/services/api/gmail-api";
import type { InboxMessageSummary, SyncStatus } from "@/services/gmail/types";
import { getStoredMessages, replaceStoredMessages } from "@/db";
import { clearAppBadge, updateAppBadge } from "@/services/notification/badge-service";
import {
  captureUnreadSnapshot,
  handleAfterSync,
  primeSnapshotFromHydration,
  resetNotificationSnapshot,
} from "@/services/notification/notification-service";
import { useAvatarStore } from "./avatar";
import { useModulesStore } from "./modules";
import { useSettingsStore } from "./settings";

export const useGmailStore = defineStore("gmail", {
  state: () => ({
    configured: true,
    connected: false,
    email: null as string | null,
    syncing: false,
    syncStatus: "ok" as SyncStatus,
    lastSyncedAt: null as string | null,
    messages: [] as InboxMessageSummary[],
    syncError: null as string | null,
    oauthError: null as string | null,
    bootstrapped: false,
    bootstrapping: false,
  }),
  getters: {
    statusLabel(state): string {
      if (!state.configured) return "後端未連線";
      if (!state.connected) return "未連線";
      if (state.syncing) return "同步中…";
      if (state.syncStatus === "auth_error") return "授權失效";
      if (state.syncStatus === "offline") return "離線（使用快取）";
      return "已連線";
    },
  },
  actions: {
    async bootstrap() {
      if (this.bootstrapped || this.bootstrapping) return;
      this.bootstrapping = true;
      this.configured = true;
      const settings = useSettingsStore();
      try {
        if (!settings.loaded) await settings.load();

        const oauthError = consumeOAuthErrorFromUrl();
        if (oauthError) this.oauthError = oauthError;

        try {
          const auth = await fetchAuthStatus();
          this.configured = true;
          this.connected = auth.connected;
          this.email = auth.email;
          this.syncStatus = auth.status;
          await settings.setGmailEmail(auth.email);
        } catch (e) {
          this.configured = false;
          this.connected = false;
          this.syncStatus = "offline";
          this.syncError = e instanceof Error ? e.message : "Backend unavailable";
        }

        if (!this.messages.length) {
          const cached = await getStoredMessages();
          this.messages = cached;
        }

        const avatar = useAvatarStore();
        const modules = useModulesStore();
        if (!avatar.hydrated) await avatar.hydrateFromDb();
        if (!modules.loaded) await modules.load();

        const hydrated = captureUnreadSnapshot(
          avatar.actualUnread,
          avatar.displayUnread,
          avatar.resolvedStateComputed,
        );
        primeSnapshotFromHydration(hydrated);
        if (settings.notificationEnabled) {
          await updateAppBadge(hydrated.displayUnread);
        } else {
          await clearAppBadge();
        }

        this.bootstrapped = true;
      } finally {
        this.bootstrapping = false;
      }
    },
    async connect() {
      this.oauthError = null;
      startBackendOAuthLogin();
    },
    async disconnect() {
      await logoutBackendSession();
      this.connected = false;
      this.email = null;
      this.syncError = null;
      this.syncStatus = "ok";
      this.lastSyncedAt = null;
      this.messages = [];
      const settings = useSettingsStore();
      await settings.setGmailEmail(null);
      await replaceStoredMessages([]);
      resetNotificationSnapshot();
      const avatar = useAvatarStore();
      avatar.setActualUnread(0);
      await clearAppBadge();
      await avatar.persistCounterState();
    },
    async syncInbox(): Promise<boolean> {
      if (!this.connected) {
        return false;
      }

      this.syncing = true;
      this.syncError = null;
      const avatar = useAvatarStore();
      const settings = useSettingsStore();
      const modules = useModulesStore();

      const previousSnapshot = captureUnreadSnapshot(
        avatar.actualUnread,
        avatar.displayUnread,
        avatar.resolvedStateComputed,
      );

      try {
        const result = await fetchInboxSync();
        this.connected = true;
        this.syncStatus = "ok";
        this.lastSyncedAt = result.syncedAt;
        this.messages = result.messages;

        avatar.setActualUnread(result.unreadCount);
        await replaceStoredMessages(result.messages);
        await avatar.persistCounterState({
          status: "ok",
          syncedAt: result.syncedAt,
        });

        const mod =
          modules.getById(settings.activeModuleId) ?? modules.activeModule;
        const currentSnapshot = captureUnreadSnapshot(
          avatar.actualUnread,
          avatar.displayUnread,
          avatar.resolvedStateComputed,
        );

        await handleAfterSync({
          previous: previousSnapshot,
          current: currentSnapshot,
          notificationEnabled: settings.notificationEnabled,
          module: mod,
          moduleName: mod?.manifest.name ?? "Avatar",
        });

        return true;
      } catch (e) {
        if (e instanceof GmailBackendError) {
          this.syncStatus = e.syncStatus;
          this.syncError = e.message;
          if (e.syncStatus === "auth_error") {
            this.connected = false;
          }
          await avatar.persistCounterState({
            status: e.syncStatus,
            syncedAt: new Date().toISOString(),
          });
        } else {
          this.syncStatus = "offline";
          this.syncError = e instanceof Error ? e.message : "Network error";
          await avatar.persistCounterState({
            status: "offline",
            syncedAt: new Date().toISOString(),
          });
        }
        return false;
      } finally {
        this.syncing = false;
      }
    },
    async loadCachedMessages() {
      this.messages = await getStoredMessages();
    },
  },
});

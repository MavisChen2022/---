import { defineStore } from "pinia";
import {
  clearOAuthParamsFromUrl,
  disconnectOAuth,
  isOAuthConfigured,
  parseOAuthCallback,
  saveOAuthTokenFromCallback,
  startOAuthLogin,
} from "@/services/gmail/oauth-pkce";
import { fetchProfileEmail, syncInboxUnread } from "@/services/gmail/inbox-sync";
import { getTokens, isTokenValid, clearTokens } from "@/services/gmail/token-storage";
import { GmailApiError, type InboxMessageSummary, type SyncStatus } from "@/services/gmail/types";
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
    configured: isOAuthConfigured(),
    connected: false,
    email: null as string | null,
    syncing: false,
    syncStatus: "ok" as SyncStatus,
    lastSyncedAt: null as string | null,
    messages: [] as InboxMessageSummary[],
    syncError: null as string | null,
    oauthError: null as string | null,
    bootstrapped: false,
  }),
  getters: {
    statusLabel(state): string {
      if (!state.configured) return "未設定 OAuth";
      if (!state.connected) return "未連線";
      if (state.syncing) return "同步中…";
      if (state.syncStatus === "auth_error") return "授權失效";
      if (state.syncStatus === "offline") return "離線（使用快取）";
      return "已連線";
    },
  },
  actions: {
    async bootstrap() {
      this.configured = isOAuthConfigured();
      const settings = useSettingsStore();
      if (!settings.loaded) await settings.load();

      this.email = settings.gmailEmail ?? null;
      this.connected = isTokenValid();

      const { accessToken, expiresIn, error } = parseOAuthCallback(window.location.search);
      if (error) {
        this.oauthError = error;
        clearOAuthParamsFromUrl();
      } else if (accessToken) {
        try {
          saveOAuthTokenFromCallback(accessToken, expiresIn);
          clearOAuthParamsFromUrl();
          this.connected = true;
          const tokens = getTokens();
          if (tokens) {
            const email = await fetchProfileEmail(tokens.accessToken);
            this.email = email;
            await settings.setGmailEmail(email);
          }
          await this.syncInbox();
        } catch (e) {
          this.oauthError = e instanceof Error ? e.message : String(e);
          clearOAuthParamsFromUrl();
        }
      }

      if (this.connected && !this.email) {
        const tokens = getTokens();
        if (tokens) {
          try {
            const email = await fetchProfileEmail(tokens.accessToken);
            this.email = email;
            await settings.setGmailEmail(email);
          } catch {
            /* profile optional on restore */
          }
        }
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
      await updateAppBadge(hydrated.displayUnread);

      this.bootstrapped = true;
    },
    async connect() {
      this.oauthError = null;
      await startOAuthLogin();
    },
    async disconnect() {
      disconnectOAuth();
      this.connected = false;
      this.email = null;
      this.syncError = null;
      this.syncStatus = "ok";
      const settings = useSettingsStore();
      await settings.setGmailEmail(null);
      resetNotificationSnapshot();
      const avatar = useAvatarStore();
      await clearAppBadge();
      await avatar.persistCounterState();
    },
    async syncInbox(): Promise<boolean> {
      if (!this.connected && !isTokenValid()) {
        this.connected = false;
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
        const result = await syncInboxUnread();
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
        if (e instanceof GmailApiError) {
          this.syncStatus = e.syncStatus;
          this.syncError = e.message;
          if (e.syncStatus === "auth_error") {
            clearTokens();
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

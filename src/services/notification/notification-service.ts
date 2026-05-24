import type { AvatarState, InstalledModule } from "@/core/avatar/types";
import { resolveModuleAssetUrl } from "@/core/modules/module-loader";
import { updateAppBadge, clearAppBadge } from "./badge-service";
import {
  buildNotificationContent,
  shouldNotifyAfterSync,
  type UnreadSnapshot,
} from "./notification-payload";

const NOTIFICATION_TAG = "avatar-mail-unread";

let lastSnapshot: UnreadSnapshot | null = null;
let snapshotInitialized = false;

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function isNotificationSupported(): boolean {
  return typeof Notification !== "undefined";
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function resetNotificationSnapshot(): void {
  lastSnapshot = null;
  snapshotInitialized = false;
}

export function captureUnreadSnapshot(
  actualUnread: number,
  displayUnread: number,
  state: AvatarState,
): UnreadSnapshot {
  return {
    actualUnread: Math.max(0, Math.floor(actualUnread)),
    displayUnread: Math.max(0, Math.floor(displayUnread)),
    state,
  };
}

export function resolveNotificationIcon(
  module: InstalledModule | undefined,
  state: AvatarState,
): string {
  if (!module || module.validationStatus !== "valid") {
    return new URL("/modules/cat-pack/preview.webp", window.location.origin).href;
  }
  const assets = module.manifest.states[state];
  const rel = assets?.image ?? module.manifest.preview;
  return resolveModuleAssetUrl(module.baseUrl, rel);
}

export interface AfterSyncNotifyOptions {
  previous: UnreadSnapshot | null;
  current: UnreadSnapshot;
  notificationEnabled: boolean;
  module: InstalledModule | undefined;
  moduleName: string;
}

export async function handleAfterSync(options: AfterSyncNotifyOptions): Promise<void> {
  const { previous, current, notificationEnabled, module, moduleName } = options;

  await updateAppBadge(current.displayUnread);

  if (!snapshotInitialized) {
    lastSnapshot = current;
    snapshotInitialized = true;
    return;
  }

  const baseline = previous ?? lastSnapshot;
  const shouldShow =
    notificationEnabled &&
    getNotificationPermission() === "granted" &&
    shouldNotifyAfterSync(baseline, current);

  lastSnapshot = current;

  if (!shouldShow) return;

  showUnreadNotification(current, module, moduleName);
}

export function showUnreadNotification(
  snapshot: UnreadSnapshot,
  module: InstalledModule | undefined,
  moduleName: string,
): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const { title, body } = buildNotificationContent(snapshot, moduleName);
  const icon = resolveNotificationIcon(module, snapshot.state);

  try {
    new Notification(title, {
      body,
      icon,
      tag: NOTIFICATION_TAG,
    });
  } catch (err) {
    console.warn("[notification] show failed", err);
  }
}

export async function onNotificationPreferenceChange(enabled: boolean): Promise<void> {
  if (!enabled) {
    await clearAppBadge();
    return;
  }
  if (lastSnapshot) {
    await updateAppBadge(lastSnapshot.displayUnread);
  }
}

export function primeSnapshotFromHydration(snapshot: UnreadSnapshot): void {
  lastSnapshot = snapshot;
  snapshotInitialized = true;
}

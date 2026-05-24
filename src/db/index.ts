import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_THRESHOLDS,
  type AvatarState,
  type InstalledModule,
  type StateThresholds,
  type DisplayRule,
} from "@/core/avatar/types";

const DB_NAME = "avatar-platform";
const DB_VERSION = 1;

export interface UserSettingsRecord {
  key: "default";
  stateThresholds: StateThresholds;
  activeModuleId: string;
  displayRule: DisplayRule;
  displayUnreadBaseline: number;
  notificationEnabled: boolean;
  onboardingCompleted: boolean;
  gmailEmail?: string | null;
}

export interface MessageRecord {
  key: string;
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate: number;
  isUnread: boolean;
}

export interface UnreadCounterRecord {
  key: "gmail-inbox";
  source: "gmail-inbox";
  count: number;
  displayCount: number;
  resolvedState: AvatarState;
  syncedAt: string;
  status: "ok" | "offline" | "auth_error";
}

export interface InstalledModuleRecord extends InstalledModule {
  key: string;
}

interface AvatarDB extends DBSchema {
  user_settings: {
    key: string;
    value: UserSettingsRecord;
  };
  unread_counter: {
    key: string;
    value: UnreadCounterRecord;
  };
  installed_modules: {
    key: string;
    value: InstalledModuleRecord;
  };
  messages: {
    key: string;
    value: MessageRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<AvatarDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<AvatarDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AvatarDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("user_settings")) {
          db.createObjectStore("user_settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("unread_counter")) {
          db.createObjectStore("unread_counter", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("installed_modules")) {
          db.createObjectStore("installed_modules", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getUserSettings(): Promise<UserSettingsRecord> {
  const db = await getDb();
  const existing = await db.get("user_settings", "default");
  if (existing) return existing;

  const defaults: UserSettingsRecord = {
    key: "default",
    stateThresholds: {
      sleep: { ...DEFAULT_THRESHOLDS.sleep },
      normal: { ...DEFAULT_THRESHOLDS.normal },
      busy: { ...DEFAULT_THRESHOLDS.busy },
      panic: { ...DEFAULT_THRESHOLDS.panic },
    },
    activeModuleId: "cat-pack",
    displayRule: "RULE_LIVE_UNREAD",
    displayUnreadBaseline: 0,
    notificationEnabled: true,
    onboardingCompleted: false,
  };
  await db.put("user_settings", defaults);
  return defaults;
}

export async function saveUserSettings(
  patch: Partial<Omit<UserSettingsRecord, "key">>,
): Promise<UserSettingsRecord> {
  const db = await getDb();
  const current = await getUserSettings();
  const next = { ...current, ...patch, key: "default" as const };
  await db.put("user_settings", next);
  return next;
}

export async function saveInstalledModule(mod: InstalledModule): Promise<void> {
  const db = await getDb();
  await db.put("installed_modules", { ...mod, key: mod.id });
}

export async function getInstalledModules(): Promise<InstalledModuleRecord[]> {
  const db = await getDb();
  return db.getAll("installed_modules");
}

export async function getUnreadCounter(): Promise<UnreadCounterRecord> {
  const db = await getDb();
  const existing = await db.get("unread_counter", "gmail-inbox");
  if (existing) return existing;

  const defaults: UnreadCounterRecord = {
    key: "gmail-inbox",
    source: "gmail-inbox",
    count: 0,
    displayCount: 0,
    resolvedState: "sleep",
    syncedAt: new Date(0).toISOString(),
    status: "ok",
  };
  await db.put("unread_counter", defaults);
  return defaults;
}

export async function saveUnreadCounter(
  patch: Partial<Omit<UnreadCounterRecord, "key" | "source">>,
): Promise<UnreadCounterRecord> {
  const db = await getDb();
  const current = await getUnreadCounter();
  const next = { ...current, ...patch, key: "gmail-inbox" as const, source: "gmail-inbox" as const };
  await db.put("unread_counter", next);
  return next;
}

const MAX_STORED_MESSAGES = 50;

export async function getStoredMessages(): Promise<MessageRecord[]> {
  const db = await getDb();
  const all = await db.getAll("messages");
  return all.sort((a, b) => b.internalDate - a.internalDate);
}

export async function replaceStoredMessages(
  messages: Omit<MessageRecord, "key">[],
): Promise<void> {
  const db = await getDb();
  const sorted = [...messages]
    .sort((a, b) => b.internalDate - a.internalDate)
    .slice(0, MAX_STORED_MESSAGES);
  const tx = db.transaction("messages", "readwrite");
  await tx.store.clear();
  for (const m of sorted) {
    await tx.store.put({ ...m, key: m.id });
  }
  await tx.done;
}

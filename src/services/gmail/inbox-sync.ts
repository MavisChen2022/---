import {
  fetchGmailProfile,
  fetchInboxUnreadCount,
  fetchUnreadMessageSummaries,
} from "./gmail-api";
import { parseMessageMetadata } from "./message-parser";
import { getTokens, isTokenValid } from "./token-storage";
import {
  GmailApiError,
  type InboxMessageSummary,
  type InboxSyncResult,
} from "./types";

export async function syncInboxUnread(accessToken?: string): Promise<InboxSyncResult> {
  const storedTokens = getTokens();
  const token = accessToken ?? storedTokens?.accessToken;
  if (!token || (!accessToken && !isTokenValid(storedTokens))) {
    throw new GmailApiError("Not authenticated", 401, "auth_error");
  }

  const syncedAt = new Date().toISOString();
  const [unreadCount, rawMessages] = await Promise.all([
    fetchInboxUnreadCount(token),
    fetchUnreadMessageSummaries(token, 20),
  ]);

  const messages: InboxMessageSummary[] = rawMessages
    .map(parseMessageMetadata)
    .sort((a, b) => b.internalDate - a.internalDate);

  return {
    unreadCount,
    messages,
    syncedAt,
    status: "ok",
  };
}

export async function fetchProfileEmail(accessToken: string): Promise<string> {
  const profile = await fetchGmailProfile(accessToken);
  return profile.emailAddress;
}

export { isTokenValid, getTokens };

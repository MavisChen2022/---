import { classifyHttpError } from "./message-parser";
import {
  GmailApiError,
  type GmailMessageListResponse,
  type GmailMessageMetadata,
  type GmailProfile,
  type InboxLabelResponse,
} from "./types";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const syncStatus = classifyHttpError(res.status);
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new GmailApiError(detail, res.status, syncStatus);
  }

  return res.json() as Promise<T>;
}

export async function fetchInboxUnreadCount(accessToken: string): Promise<number> {
  const label = await gmailFetch<InboxLabelResponse>("/labels/INBOX", accessToken);
  return Math.max(0, label.messagesUnread ?? 0);
}

export async function fetchGmailProfile(accessToken: string): Promise<GmailProfile> {
  return gmailFetch<GmailProfile>("/profile", accessToken);
}

export async function listUnreadInboxMessageIds(
  accessToken: string,
  maxResults = 20,
): Promise<string[]> {
  const params = new URLSearchParams({
    labelIds: "INBOX",
    q: "is:unread",
    maxResults: String(maxResults),
  });
  const list = await gmailFetch<GmailMessageListResponse>(
    `/messages?${params.toString()}`,
    accessToken,
  );
  return (list.messages ?? []).map((m) => m.id);
}

export async function fetchMessageMetadata(
  accessToken: string,
  messageId: string,
): Promise<GmailMessageMetadata> {
  const params = new URLSearchParams({
    format: "metadata",
    metadataHeaders: "Subject",
  });
  params.append("metadataHeaders", "From");
  return gmailFetch<GmailMessageMetadata>(
    `/messages/${messageId}?${params.toString()}`,
    accessToken,
  );
}

export async function fetchUnreadMessageSummaries(
  accessToken: string,
  maxResults = 20,
): Promise<GmailMessageMetadata[]> {
  const ids = await listUnreadInboxMessageIds(accessToken, maxResults);
  if (ids.length === 0) return [];

  const results = await Promise.all(
    ids.map((id) =>
      fetchMessageMetadata(accessToken, id).catch(() => null),
    ),
  );
  return results.filter((m): m is GmailMessageMetadata => m !== null);
}

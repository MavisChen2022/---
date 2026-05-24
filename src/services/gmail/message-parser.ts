import type { GmailMessageMetadata, InboxMessageSummary } from "./types";

export function headerValue(
  headers: { name: string; value: string }[] | undefined,
  name: string,
): string {
  const found = headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value?.trim() ?? "";
}

export function parseMessageMetadata(msg: GmailMessageMetadata): InboxMessageSummary {
  const headers = msg.payload?.headers ?? [];
  const isUnread = msg.labelIds?.includes("UNREAD") ?? true;
  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: headerValue(headers, "Subject") || "(無主旨)",
    from: headerValue(headers, "From") || "未知寄件者",
    snippet: msg.snippet ?? "",
    internalDate: msg.internalDate ? parseInt(msg.internalDate, 10) : 0,
    isUnread,
  };
}

export function classifyHttpError(status: number): "auth_error" | "offline" {
  if (status === 401 || status === 403) return "auth_error";
  return "offline";
}

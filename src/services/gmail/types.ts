export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export interface GmailTokens {
  accessToken: string;
  expiresAt: number;
}

export interface GmailProfile {
  emailAddress: string;
}

export interface InboxLabelResponse {
  id: string;
  messagesUnread?: number;
}

export interface GmailMessageListItem {
  id: string;
  threadId: string;
}

export interface GmailMessageListResponse {
  messages?: GmailMessageListItem[];
  resultSizeEstimate?: number;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageMetadata {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: GmailMessageHeader[];
  };
}

export interface InboxMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate: number;
  isUnread: boolean;
}

export type SyncStatus = "ok" | "offline" | "auth_error";

export interface InboxSyncResult {
  unreadCount: number;
  messages: InboxMessageSummary[];
  syncedAt: string;
  status: SyncStatus;
}

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly syncStatus: SyncStatus,
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

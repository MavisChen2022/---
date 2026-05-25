import type { InboxSyncResult } from "@/services/gmail/types";
import { ApiError, apiFetch } from "./config";

export async function fetchInboxSync(): Promise<InboxSyncResult> {
  try {
    return await apiFetch<InboxSyncResult>("/api/gmail/inbox");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      throw new GmailBackendError(e.message, e.status, "auth_error");
    }
    if (e instanceof ApiError) {
      throw new GmailBackendError(e.message, e.status, "offline");
    }
    throw e;
  }
}

export class GmailBackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly syncStatus: "auth_error" | "offline",
  ) {
    super(message);
    this.name = "GmailBackendError";
  }
}

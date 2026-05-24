import { describe, it, expect } from "vitest";
import {
  classifyHttpError,
  headerValue,
  parseMessageMetadata,
} from "@/services/gmail/message-parser";
import type { GmailMessageMetadata } from "@/services/gmail/types";

describe("message-parser", () => {
  it("extracts headers case-insensitively", () => {
    const headers = [
      { name: "Subject", value: "Hello" },
      { name: "From", value: "a@b.com" },
    ];
    expect(headerValue(headers, "subject")).toBe("Hello");
    expect(headerValue(headers, "from")).toBe("a@b.com");
  });

  it("parses metadata into summary", () => {
    const msg: GmailMessageMetadata = {
      id: "m1",
      threadId: "t1",
      snippet: "preview",
      internalDate: "1700000000000",
      labelIds: ["INBOX", "UNREAD"],
      payload: {
        headers: [
          { name: "Subject", value: "Test" },
          { name: "From", value: "me@test.com" },
        ],
      },
    };
    const summary = parseMessageMetadata(msg);
    expect(summary.subject).toBe("Test");
    expect(summary.from).toBe("me@test.com");
    expect(summary.isUnread).toBe(true);
    expect(summary.internalDate).toBe(1700000000000);
  });

  it("classifies HTTP errors", () => {
    expect(classifyHttpError(401)).toBe("auth_error");
    expect(classifyHttpError(403)).toBe("auth_error");
    expect(classifyHttpError(500)).toBe("offline");
  });
});

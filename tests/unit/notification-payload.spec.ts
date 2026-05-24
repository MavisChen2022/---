import { describe, it, expect } from "vitest";
import {
  buildNotificationContent,
  shouldNotifyAfterSync,
} from "@/services/notification/notification-payload";

describe("notification-payload", () => {
  it("builds title and body with unread count", () => {
    const { title, body } = buildNotificationContent(
      { actualUnread: 5, displayUnread: 5, state: "normal" },
      "Cat Pack",
    );
    expect(title).toContain("Cat Pack");
    expect(body).toContain("5");
    expect(body).toContain("Normal");
  });

  it("builds zero-unread body", () => {
    const { body } = buildNotificationContent(
      { actualUnread: 0, displayUnread: 0, state: "sleep" },
      "Cat",
    );
    expect(body).toContain("無未讀");
  });

  it("notifies only when snapshot changed", () => {
    const prev = { actualUnread: 3, displayUnread: 3, state: "normal" as const };
    const same = { ...prev };
    const changed = { actualUnread: 4, displayUnread: 4, state: "normal" as const };
    expect(shouldNotifyAfterSync(prev, same)).toBe(false);
    expect(shouldNotifyAfterSync(prev, changed)).toBe(true);
    expect(shouldNotifyAfterSync(null, changed)).toBe(false);
  });

  it("notifies on state change even if display unread unchanged", () => {
    const prev = { actualUnread: 5, displayUnread: 5, state: "normal" as const };
    const next = { actualUnread: 5, displayUnread: 5, state: "busy" as const };
    expect(shouldNotifyAfterSync(prev, next)).toBe(true);
  });
});

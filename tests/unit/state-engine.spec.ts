import { describe, expect, it } from "vitest";
import { displayUnreadFromRule, resolveState } from "@/core/avatar/state-engine";
import { DEFAULT_THRESHOLDS } from "@/core/avatar/types";

describe("resolveState", () => {
  it("maps unread to sleep/normal/busy/panic with defaults", () => {
    expect(resolveState(0, DEFAULT_THRESHOLDS)).toBe("sleep");
    expect(resolveState(3, DEFAULT_THRESHOLDS)).toBe("normal");
    expect(resolveState(10, DEFAULT_THRESHOLDS)).toBe("busy");
    expect(resolveState(25, DEFAULT_THRESHOLDS)).toBe("panic");
  });
});

describe("displayUnreadFromRule", () => {
  it("uses actual unread for RULE_LIVE_UNREAD", () => {
    expect(displayUnreadFromRule(7, "RULE_LIVE_UNREAD", 0)).toBe(7);
  });

  it("subtracts baseline for RULE_RESET_ON_WAKE", () => {
    expect(displayUnreadFromRule(10, "RULE_RESET_ON_WAKE", 10)).toBe(0);
    expect(displayUnreadFromRule(15, "RULE_RESET_ON_WAKE", 10)).toBe(5);
  });
});

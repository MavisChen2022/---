import type { AvatarState, StateThresholds } from "./types";

/** Map display unread count to avatar state using user thresholds. */
export function resolveState(
  displayUnread: number,
  thresholds: StateThresholds,
): AvatarState {
  const n = Math.max(0, Math.floor(displayUnread));
  for (const state of ["sleep", "normal", "busy", "panic"] as AvatarState[]) {
    const range = thresholds[state];
    if (n >= range.min && (range.max === null || n <= range.max)) {
      return state;
    }
  }
  return "panic";
}

export function displayUnreadFromRule(
  actualUnread: number,
  rule: "RULE_RESET_ON_WAKE" | "RULE_LIVE_UNREAD",
  baseline: number,
): number {
  const actual = Math.max(0, Math.floor(actualUnread));
  if (rule === "RULE_LIVE_UNREAD") return actual;
  return Math.max(0, actual - Math.max(0, Math.floor(baseline)));
}

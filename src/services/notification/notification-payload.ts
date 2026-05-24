import { STATE_LABELS } from "@/core/avatar/threshold-format";
import type { AvatarState } from "@/core/avatar/types";

export interface UnreadSnapshot {
  actualUnread: number;
  displayUnread: number;
  state: AvatarState;
}

export function buildNotificationContent(
  snapshot: UnreadSnapshot,
  moduleName: string,
): { title: string; body: string } {
  const stateLabel = STATE_LABELS[snapshot.state];
  const title = `Avatar Mail · ${moduleName}`;
  const body =
    snapshot.displayUnread === 0
      ? `目前無未讀郵件（${stateLabel}）`
      : `INBOX 未讀 ${snapshot.displayUnread} 封 · ${stateLabel}`;
  return { title, body };
}

/** Notify when display unread or avatar state changed after a successful sync. */
export function shouldNotifyAfterSync(
  previous: UnreadSnapshot | null,
  current: UnreadSnapshot,
): boolean {
  if (!previous) return false;
  return (
    previous.displayUnread !== current.displayUnread ||
    previous.state !== current.state ||
    previous.actualUnread !== current.actualUnread
  );
}

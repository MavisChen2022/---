export function isBadgeSupported(): boolean {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export async function updateAppBadge(count: number): Promise<void> {
  if (!isBadgeSupported()) return;
  const n = Math.max(0, Math.floor(count));
  try {
    if (n === 0) {
      await navigator.clearAppBadge?.();
    } else {
      await navigator.setAppBadge?.(n);
    }
  } catch (err) {
    console.warn("[badge] update failed", err);
  }
}

export async function clearAppBadge(): Promise<void> {
  if (!isBadgeSupported()) return;
  try {
    await navigator.clearAppBadge?.();
  } catch (err) {
    console.warn("[badge] clear failed", err);
  }
}

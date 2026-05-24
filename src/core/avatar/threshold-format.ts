import { AVATAR_STATES, type AvatarState, type StateThresholds, DEFAULT_THRESHOLDS } from "./types";

export const STATE_LABELS: Record<AvatarState, string> = {
  sleep: "Sleep（無壓力）",
  normal: "Normal（正常）",
  busy: "Busy（忙碌）",
  panic: "Panic（高壓）",
};

export function cloneThresholds(source: StateThresholds): StateThresholds {
  return {
    sleep: { ...source.sleep },
    normal: { ...source.normal },
    busy: { ...source.busy },
    panic: { ...source.panic },
  };
}

export function formatThresholdRange(range: { min: number; max: number | null }): string {
  if (range.max === null) {
    return range.min === 0 ? "0 封以上" : `${range.min} 封以上`;
  }
  if (range.min === range.max) {
    return `${range.min} 封`;
  }
  return `${range.min}–${range.max} 封`;
}

export function thresholdsToSummary(thresholds: StateThresholds): { state: AvatarState; label: string; range: string }[] {
  return AVATAR_STATES.map((state) => ({
    state,
    label: STATE_LABELS[state],
    range: formatThresholdRange(thresholds[state]),
  }));
}

export function createDefaultThresholds(): StateThresholds {
  return cloneThresholds(DEFAULT_THRESHOLDS);
}

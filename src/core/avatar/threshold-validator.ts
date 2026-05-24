import { AVATAR_STATES, type AvatarState, type StateThresholds } from "./types";

export interface ThresholdValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateThresholds(thresholds: StateThresholds): ThresholdValidationResult {
  const errors: string[] = [];

  for (const state of AVATAR_STATES) {
    const r = thresholds[state];
    if (r.min < 0 || !Number.isInteger(r.min)) {
      errors.push(`${state}: min must be a non-negative integer`);
    }
    if (r.max !== null && (r.max < r.min || !Number.isInteger(r.max))) {
      errors.push(`${state}: max must be null or an integer >= min`);
    }
    if (state !== "panic" && r.max === null) {
      errors.push(`${state}: only panic may have unlimited max`);
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  const sorted = AVATAR_STATES.map((s) => ({
    state: s,
    min: thresholds[s].min,
    max: thresholds[s].max ?? Number.POSITIVE_INFINITY,
  })).sort((a, b) => a.min - b.min);

  if (sorted[0]?.min !== 0) {
    errors.push("Ranges must start at 0");
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]!;
    const next = sorted[i + 1]!;
    if (curr.max === Number.POSITIVE_INFINITY) {
      errors.push(`${curr.state}: only the highest range may be unbounded`);
    } else if (next.min !== curr.max + 1) {
      errors.push(`Gap or overlap between ${curr.state} and ${next.state}`);
    }
  }

  const last = sorted[sorted.length - 1]!;
  if (last.max !== Number.POSITIVE_INFINITY) {
    errors.push("Highest range (panic) must extend to infinity (max: null)");
  }

  return { valid: errors.length === 0, errors };
}

export function isAvatarState(value: string): value is AvatarState {
  return AVATAR_STATES.includes(value as AvatarState);
}

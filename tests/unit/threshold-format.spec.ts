import { describe, it, expect } from "vitest";
import {
  cloneThresholds,
  formatThresholdRange,
  thresholdsToSummary,
  createDefaultThresholds,
} from "@/core/avatar/threshold-format";
import { DEFAULT_THRESHOLDS } from "@/core/avatar/types";

describe("threshold-format", () => {
  it("clones thresholds deeply", () => {
    const a = createDefaultThresholds();
    const b = cloneThresholds(a);
    b.normal.max = 99;
    expect(a.normal.max).toBe(DEFAULT_THRESHOLDS.normal.max);
  });

  it("formats single value and ranges", () => {
    expect(formatThresholdRange({ min: 0, max: 0 })).toBe("0 封");
    expect(formatThresholdRange({ min: 1, max: 5 })).toBe("1–5 封");
    expect(formatThresholdRange({ min: 21, max: null })).toBe("21 封以上");
  });

  it("builds summary for all states", () => {
    const summary = thresholdsToSummary(DEFAULT_THRESHOLDS);
    expect(summary).toHaveLength(4);
    expect(summary[0]?.state).toBe("sleep");
  });
});

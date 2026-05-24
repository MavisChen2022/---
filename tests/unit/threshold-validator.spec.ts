import { describe, expect, it } from "vitest";
import { validateThresholds } from "@/core/avatar/threshold-validator";
import { DEFAULT_THRESHOLDS } from "@/core/avatar/types";

describe("validateThresholds", () => {
  it("accepts default thresholds", () => {
    expect(validateThresholds(DEFAULT_THRESHOLDS).valid).toBe(true);
  });

  it("rejects overlapping ranges", () => {
    const bad = {
      ...DEFAULT_THRESHOLDS,
      sleep: { min: 0, max: 5 },
      normal: { min: 1, max: 5 },
    };
    expect(validateThresholds(bad).valid).toBe(false);
  });
});

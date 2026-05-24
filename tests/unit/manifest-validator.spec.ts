import { describe, expect, it } from "vitest";
import { validateManifest } from "@/core/modules/manifest-validator";

const validMinimal = {
  schemaVersion: "1.0.0",
  id: "test-pack",
  name: "Test",
  version: "1.0.0",
  author: "t",
  description: "d",
  preview: "preview.webp",
  compatibility: { minRuntimeVersion: "1.0.0" },
  states: {
    sleep: { image: "states/sleep.webp", animation: null },
    normal: { image: "states/normal.webp", animation: null },
    busy: { image: "states/busy.webp", animation: null },
    panic: {
      image: "states/panic.webp",
      animation: { type: "json", src: "a.json", renderer: "lottie", loop: true },
    },
  },
  renderers: { lottie: "renderers/lottie-renderer.mjs" },
};

describe("validateManifest", () => {
  it("accepts valid manifest", () => {
    const r = validateManifest(validMinimal);
    expect(r.valid).toBe(true);
    expect(r.manifest?.id).toBe("test-pack");
  });

  it("rejects wrong schema version", () => {
    const r = validateManifest({ ...validMinimal, schemaVersion: "2.0.0" });
    expect(r.valid).toBe(false);
  });

  it("requires lottie renderer for json animation", () => {
    const { renderers: _, ...noRenderers } = validMinimal;
    const r = validateManifest(noRenderers);
    expect(r.valid).toBe(false);
  });
});

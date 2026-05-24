import {
  AVATAR_STATES,
  RUNTIME_VERSION,
  type ModuleManifest,
  type StateAnimation,
} from "@/core/avatar/types";

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function validateAnimation(anim: StateAnimation, stateKey: string, errors: string[]): void {
  if (!anim.src) errors.push(`${stateKey}: animation.src required`);
  if (anim.type === "json" && anim.renderer !== "lottie") {
    errors.push(`${stateKey}: json animation requires renderer lottie`);
  }
}

export function validateManifest(raw: unknown): {
  valid: boolean;
  manifest?: ModuleManifest;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Manifest must be an object"] };
  }

  const m = raw as Record<string, unknown>;

  if (m.schemaVersion !== "1.0.0") {
    errors.push(`Unsupported schemaVersion: ${String(m.schemaVersion)}`);
  }

  const required = ["id", "name", "version", "author", "description", "preview", "compatibility", "states"];
  for (const key of required) {
    if (m[key] === undefined) errors.push(`Missing required field: ${key}`);
  }

  const compat = m.compatibility as { minRuntimeVersion?: string } | undefined;
  if (compat?.minRuntimeVersion && compareSemver(RUNTIME_VERSION, compat.minRuntimeVersion) < 0) {
    errors.push(`Runtime ${RUNTIME_VERSION} < minRuntimeVersion ${compat.minRuntimeVersion}`);
  }

  const states = m.states as Record<string, { image?: string; animation?: StateAnimation | null }> | undefined;
  if (states) {
    for (const key of AVATAR_STATES) {
      const s = states[key];
      if (!s?.image) errors.push(`states.${key}.image required`);
      if (s?.animation) validateAnimation(s.animation, key, errors);
      if (s?.animation?.type === "json" && !(m.renderers as { lottie?: string } | undefined)?.lottie) {
        errors.push(`states.${key}: json animation requires renderers.lottie`);
      }
    }
  } else {
    errors.push("states object required");
  }

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, manifest: m as unknown as ModuleManifest, errors: [] };
}

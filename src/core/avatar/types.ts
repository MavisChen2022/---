export type AvatarState = "sleep" | "normal" | "busy" | "panic";

export const AVATAR_STATES: AvatarState[] = ["sleep", "normal", "busy", "panic"];

export interface ThresholdRange {
  min: number;
  max: number | null;
}

export type StateThresholds = Record<AvatarState, ThresholdRange>;

export type DisplayRule = "RULE_RESET_ON_WAKE" | "RULE_LIVE_UNREAD";

export interface StateAnimation {
  type: "apng" | "webp" | "json";
  src: string;
  loop: boolean;
  fps?: number;
  renderer?: "lottie";
}

export interface StateAssets {
  image: string;
  animation: StateAnimation | null;
}

export interface ModuleManifest {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  preview: string;
  compatibility: { minRuntimeVersion: string };
  renderers?: { lottie?: string };
  states: Record<AvatarState, StateAssets>;
  transitions?: { default: { duration: number; easing: string } };
  performance?: {
    preferredFPS?: number;
    backgroundBehavior?: "pause";
    lowPowerFallback?: "static";
  };
}

export interface InstalledModule {
  id: string;
  manifest: ModuleManifest;
  baseUrl: string;
  enabled: boolean;
  validationStatus: "valid" | "invalid";
  validationErrors: string[];
}

export const RUNTIME_VERSION = "1.0.0";

export const DEFAULT_THRESHOLDS: StateThresholds = {
  sleep: { min: 0, max: 0 },
  normal: { min: 1, max: 5 },
  busy: { min: 6, max: 20 },
  panic: { min: 21, max: null },
};

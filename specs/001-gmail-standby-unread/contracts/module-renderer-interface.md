# Contract: Module Renderer Interface

**Version**: 1.0.0  
**Runtime**: Avatar Platform PWA

## Overview

Avatar modules MAY ship renderer adapters under `renderers/`. The platform loads them via `manifest.renderers.<name>` only when needed.

## Lottie renderer (`renderers.lottie`)

**Module exports** (ESM):

```typescript
export interface AnimationHandle {
  destroy(): void;
}

export interface MountOptions {
  container: HTMLElement;
  src: string;       // resolved URL to animation JSON
  loop?: boolean;
}

export function mountAnimation(opts: MountOptions): Promise<AnimationHandle>;
export function unmountAnimation(handle: AnimationHandle | null | undefined): void;
```

**Platform behavior**:
1. Resolve `moduleBaseUrl + manifest.renderers.lottie`
2. `const mod = await import(/* @vite-ignore */ url)`
3. On state `panic` with `animation.type === "json"`, call `mountAnimation`
4. On state change or unmount, call `unmountAnimation`

**Dependency rule**: Module MUST bundle or re-export its own Lottie dependency path (e.g. `vendor/lottie-esm-shim.mjs`). Platform MUST NOT import `lottie-web` directly.

## APNG / animated WebP

Platform built-in renderers (not module-provided):
- `apng`: `<canvas>` + decoder or `<img>` if browser supports
- `webp`: `<img>` element with animated WebP

Fallback: `states.*.image` static WebP on decode failure.

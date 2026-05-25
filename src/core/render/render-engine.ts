import type { AvatarState, InstalledModule, ModuleManifest } from "@/core/avatar/types";
import { resolveModuleAssetUrl } from "@/core/modules/module-loader";

export interface AnimationHandle {
  destroy: () => void;
}

export interface RenderContext {
  module: InstalledModule;
  state: AvatarState;
  container: HTMLElement;
  documentVisible?: boolean;
}

type ModuleRendererModule = {
  mountAnimation?: (opts: {
    container: HTMLElement;
    src: string;
    loop?: boolean;
  }) => Promise<AnimationHandle>;
  unmountAnimation?: (handle: AnimationHandle | null | undefined) => void;
};

export class RenderEngine {
  private currentHandle: AnimationHandle | null = null;
  private staticImg: HTMLImageElement | null = null;
  private renderToken = 0;
  private lastContainer: HTMLElement | null = null;

  async render(ctx: RenderContext): Promise<void> {
    const myToken = ++this.renderToken;
    this.teardown();

    const { module, state, container } = ctx;
    this.lastContainer = container;
    container.replaceChildren();

    const assets = module.manifest.states[state];
    if (!assets) return;

    const imageUrl = resolveModuleAssetUrl(module.baseUrl, assets.image);
    const visible = ctx.documentVisible !== false;
    const perf = module.manifest.performance;
    const useStaticOnly =
      !visible &&
      (perf?.backgroundBehavior === "pause" || perf?.lowPowerFallback === "static");

    if (!assets.animation || useStaticOnly) {
      if (this.renderToken !== myToken) return;
      this.renderStatic(container, imageUrl, state);
      return;
    }

    try {
      if (assets.animation.type === "json" && assets.animation.renderer === "lottie") {
        await this.renderLottie(module.manifest, module.baseUrl, container, assets.animation, myToken);
        return;
      }
      if (assets.animation.type === "apng" || assets.animation.type === "webp") {
        if (this.renderToken !== myToken) return;
        this.renderAnimatedImg(container, resolveModuleAssetUrl(module.baseUrl, assets.animation.src), imageUrl);
        return;
      }
    } catch (err) {
      console.warn("[RenderEngine] animation failed, fallback to static", err);
    }

    if (this.renderToken !== myToken) return;
    container.replaceChildren();
    this.renderStatic(container, imageUrl, state);
  }

  teardown(): void {
    if (this.currentHandle) {
      this.currentHandle.destroy();
      this.currentHandle = null;
    }
    if (this.staticImg) {
      this.staticImg.remove();
      this.staticImg = null;
    }
    if (this.lastContainer) {
      this.lastContainer.replaceChildren();
    }
  }

  private renderStatic(container: HTMLElement, url: string, state: AvatarState): void {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Avatar ${state}`;
    img.className = "avatar-static";
    img.width = 160;
    img.height = 160;
    container.appendChild(img);
    this.staticImg = img;
  }

  private renderAnimatedImg(container: HTMLElement, animUrl: string, fallbackUrl: string): void {
    const img = document.createElement("img");
    img.src = animUrl;
    img.alt = "Avatar animation";
    img.className = "avatar-animated";
    img.width = 160;
    img.height = 160;
    img.onerror = () => {
      img.src = fallbackUrl;
    };
    container.appendChild(img);
    this.staticImg = img;
  }

  private async renderLottie(
    manifest: ModuleManifest,
    baseUrl: string,
    container: HTMLElement,
    animation: NonNullable<import("@/core/avatar/types").StateAssets["animation"]>,
    token: number,
  ): Promise<void> {
    const rendererPath = manifest.renderers?.lottie;
    if (!rendererPath) throw new Error("renderers.lottie missing");

    const rendererUrl = resolveModuleAssetUrl(baseUrl, rendererPath);
    const mod = (await import(/* @vite-ignore */ rendererUrl)) as ModuleRendererModule;

    if (!mod.mountAnimation) throw new Error("renderer missing mountAnimation");

    const animSrc = resolveModuleAssetUrl(baseUrl, animation.src);
    const handle = await mod.mountAnimation({
      container,
      src: animSrc,
      loop: animation.loop,
    });

    if (this.renderToken !== token) {
      handle?.destroy?.();
      return;
    }

    this.currentHandle = handle;
  }
}

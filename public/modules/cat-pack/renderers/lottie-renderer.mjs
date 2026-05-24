/**
 * cat-pack bundled Lottie renderer.
 * The platform Runtime loads this file via manifest.renderers.lottie
 * (modules MUST ship their own renderer adapters; the app does not bundle lottie-web).
 */

/**
 * @param {{ container: HTMLElement, src: string, loop?: boolean }} opts
 * @returns {Promise<{ destroy: () => void }>}
 */
export async function mountAnimation({ container, src, loop = true }) {
  const { default: lottie } = await import(
    /* @vite-ignore */ new URL("./vendor/lottie-esm-shim.mjs", import.meta.url)
  );
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Failed to load Lottie JSON: ${src}`);
  }
  const animationData = await response.json();
  const instance = lottie.loadAnimation({
    container,
    renderer: "svg",
    loop,
    autoplay: true,
    animationData,
  });
  return {
    destroy() {
      instance.destroy();
    },
  };
}

export function unmountAnimation(handle) {
  handle?.destroy?.();
}

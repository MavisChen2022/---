import type { InstalledModule } from "@/core/avatar/types";
import { validateManifest } from "./manifest-validator";

const MODULES_INDEX = "/modules/index.json";

export async function fetchModuleIndex(): Promise<string[]> {
  const res = await fetch(MODULES_INDEX);
  if (!res.ok) throw new Error(`Failed to load ${MODULES_INDEX}: ${res.status}`);
  const ids = (await res.json()) as string[];
  if (!Array.isArray(ids)) throw new Error("modules index must be a string array");
  return ids;
}

export async function loadModule(moduleId: string): Promise<InstalledModule> {
  const baseUrl = `/modules/${moduleId}/`;
  const manifestUrl = `${baseUrl}manifest.json`;
  const res = await fetch(manifestUrl, { cache: "no-cache" });
  if (!res.ok) {
    return {
      id: moduleId,
      manifest: {} as InstalledModule["manifest"],
      baseUrl,
      enabled: false,
      validationStatus: "invalid",
      validationErrors: [`HTTP ${res.status} loading manifest`],
    };
  }

  const raw = await res.json();
  const { valid, manifest, errors: validationErrors } = validateManifest(raw);
  const errors = [...validationErrors];

  if (!valid || !manifest) {
    return {
      id: moduleId,
      manifest: {} as InstalledModule["manifest"],
      baseUrl,
      enabled: false,
      validationStatus: "invalid",
      validationErrors: errors,
    };
  }

  if (manifest.id !== moduleId) {
    errors.push(`Folder ${moduleId} manifest.id mismatch: ${manifest.id}`);
  }

  const assetErrors = await verifyAssets(baseUrl, manifest);
  const allErrors = [...errors, ...assetErrors];

  return {
    id: moduleId,
    manifest,
    baseUrl,
    enabled: allErrors.length === 0,
    validationStatus: allErrors.length === 0 ? "valid" : "invalid",
    validationErrors: allErrors,
  };
}

async function verifyAssets(
  baseUrl: string,
  manifest: InstalledModule["manifest"],
): Promise<string[]> {
  const errors: string[] = [];
  const paths = new Set<string>([manifest.preview]);

  for (const state of Object.values(manifest.states)) {
    paths.add(state.image);
    if (state.animation?.src) paths.add(state.animation.src);
  }

  if (manifest.renderers?.lottie) paths.add(manifest.renderers.lottie);

  await Promise.all(
    [...paths].map(async (rel) => {
      const url = new URL(rel, window.location.origin + baseUrl).href;
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (!head.ok) {
          const get = await fetch(url);
          if (!get.ok) errors.push(`Missing asset: ${rel}`);
        }
      } catch {
        errors.push(`Failed to verify asset: ${rel}`);
      }
    }),
  );

  return errors;
}

export async function loadAllModules(): Promise<InstalledModule[]> {
  const ids = await fetchModuleIndex();
  return Promise.all(ids.map((id) => loadModule(id)));
}

export function resolveModuleAssetUrl(baseUrl: string, relativePath: string): string {
  return new URL(relativePath, window.location.origin + baseUrl).href;
}

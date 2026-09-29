import type { ManifoldToplevel } from "manifold-3d";

let loading: Promise<ManifoldToplevel> | undefined;

/**
 * Loads the manifold-3d WASM module once, on first use. The dynamic import keeps the WASM
 * glue out of bundles that only need the engine's types and constants (the page's main
 * thread). The module locates `manifold.wasm` next to its own script
 * (`new URL(..., import.meta.url)`), which Node, Vitest and the Next.js worker bundle resolve.
 */
export function loadManifold(): Promise<ManifoldToplevel> {
  loading ??= import("manifold-3d").then(async ({ default: Module }) => {
    const wasm = await Module();
    wasm.setup();
    return wasm;
  });
  return loading;
}

interface Deletable {
  delete(): void;
}

/**
 * Runs `build` and frees every WASM object registered with `own` when it returns or
 * throws: manifold objects are not garbage-collected (ADR 0004). Register each object
 * exactly once, including intermediate results, and copy what must outlive the call.
 */
export function withArena<T>(build: (own: <D extends Deletable>(object: D) => D) => T): T {
  const owned: Deletable[] = [];
  try {
    return build((object) => {
      owned.push(object);
      return object;
    });
  } finally {
    for (const object of owned) object.delete();
  }
}

// Computes the articles of the basket (and its manifold-3d WASM) off the main thread.
import { loadEngine } from "@repo/geometry";
import { measureArticle } from "./article-measure";
import type { BasketEngineRequest, BasketEngineResponse } from "./basket-protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: BasketEngineResponse): void;
  onmessage: ((event: MessageEvent<BasketEngineRequest | { type: "warm-up" }>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async ({ data: request }) => {
  if (request.type === "warm-up") {
    // A failure here resurfaces, with its reason, on the first real request.
    await loadEngine().catch(() => undefined);
    return;
  }
  try {
    const measure = await measureArticle(request, request.buildPlate);
    scope.postMessage({ id: request.id, type: "measure", measure });
  } catch (error) {
    scope.postMessage({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};

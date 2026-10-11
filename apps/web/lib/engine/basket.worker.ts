// Computes the articles of the basket (and its manifold-3d WASM) off the main thread.
import { loadEngine } from "@repo/geometry";
import { measureArticle } from "./article-measure";
import { writeBasketDownload } from "./basket-download";
import type { BasketEngineRequest, BasketEngineResponse } from "./basket-protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: BasketEngineResponse, transfer?: Transferable[]): void;
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
    if (request.type === "measure") {
      const measure = await measureArticle(request, request.buildPlate, request.stack);
      scope.postMessage({ id: request.id, type: "measure", measure });
    } else {
      const file = await writeBasketDownload(request.plan, request.options, (done, total) => scope.postMessage({ id: request.id, type: "progress", done, total }));
      scope.postMessage({ id: request.id, type: "download", ...file }, [file.bytes.buffer as ArrayBuffer]);
    }
  } catch (error) {
    scope.postMessage({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};

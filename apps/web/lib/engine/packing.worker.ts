// Searches the rangement of the basket (#42) off the main thread. Pure TypeScript, no WASM: the
// client stops a search by terminating this worker, and starts another one for the next search.
import { searchPacking } from "@repo/geometry";
import type { PackingRequest, PackingResponse } from "./packing-protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: PackingResponse): void;
  onmessage: ((event: MessageEvent<PackingRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = ({ data: request }) => {
  try {
    const search = searchPacking(request.problem, { onImprove: (progress) => scope.postMessage({ type: "progress", progress }) });
    scope.postMessage({ type: "done", search });
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};

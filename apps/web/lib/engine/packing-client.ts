import type { PackingProblem, PackingProgress, PackingSearch } from "@repo/geometry";
import type { PackingRequest, PackingResponse } from "./packing-protocol";

export interface PackingEvents {
  /** The first rangement of the search, then each better one. */
  onProgress(progress: PackingProgress): void;
  /** The search ended by itself: the bound reached, its space exhausted, or out of time. */
  onDone(search: PackingSearch): void;
  onError(message: string): void;
}

export interface PackingClient {
  /** Searches the rangement of `problem`, the search under way abandoned. */
  search(problem: PackingProblem): void;
  /** Ends the search under way: the last rangement it told stays the one found. */
  stop(): void;
  dispose(): void;
}

/**
 * Runs the search of the rangement in a Web Worker of its own (#42): the search never blocks the
 * page, and a worker terminated stops it at once, wherever it is (a new one costs no WASM).
 */
export function createPackingClient(events: PackingEvents): PackingClient {
  let worker: Worker | null = null;

  function stop() {
    worker?.terminate();
    worker = null;
  }

  return {
    search(problem) {
      stop();
      const started = new Worker(new URL("./packing.worker.ts", import.meta.url), { type: "module" });
      worker = started;
      started.onmessage = ({ data: response }: MessageEvent<PackingResponse>) => {
        if (worker !== started) return; // a message of an abandoned search
        if (response.type === "progress") events.onProgress(response.progress);
        else {
          stop();
          if (response.type === "done") events.onDone(response.search);
          else events.onError(response.message);
        }
      };
      started.onerror = (event) => {
        event.preventDefault();
        if (worker !== started) return;
        stop();
        events.onError(event.message || "The rangement worker crashed");
      };
      started.postMessage({ type: "search", problem } satisfies PackingRequest);
    },
    stop,
    dispose: stop,
  };
}

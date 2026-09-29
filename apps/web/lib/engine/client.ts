import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";
import type { BaseplateSummary, EngineRequest, EngineResponse, EngineWarmUp } from "./protocol";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface EngineClientEvents {
  /** A baseplate for the latest settings shown: the preview first, then the final quality. */
  onBaseplate(baseplate: Baseplate, quality: Quality): void;
  /** Computing the latest settings shown failed. */
  onError(error: Error): void;
}

export interface EngineClient {
  /**
   * Computes `settings` for display: the preview, then the final quality, each reported
   * through `onBaseplate`. Newer settings supersede older ones: a computation that became
   * stale is dropped (its result, or its final quality not started yet), so only the
   * latest settings are rendered.
   */
  show(settings: BaseplateSettings): void;
  exportStl(settings: BaseplateSettings): Promise<{ bytes: Uint8Array; baseplate: BaseplateSummary }>;
  dispose(): void;
}

/**
 * Meshes this large grow the WASM heap by about 100 MB or more (a 20 × 20 final leaves the
 * worker at ~280 MB), and a WASM heap never shrinks: the worker is then replaced once idle.
 */
const LARGE_MESH_TRIANGLES = 250_000;
/**
 * Idle time before that replacement, so that a user still adjusting a large baseplate
 * does not wait for a fresh worker to load its WASM on every change.
 */
const RECYCLE_AFTER_IDLE_MS = 1_000;
/**
 * The final quality starts once the settings have stayed put this long after their
 * preview, so that holding a key or dragging does not start (then cancel) finals.
 */
const FINAL_AFTER_STILL_MS = 200;

/** Prefix of the User Timing entries recorded for each engine request (DevTools, e2e tests). */
export const ENGINE_TIMING_PREFIX = "engine:";

/** What a request computes, as named in its User Timing measure. */
type RequestLabel = Quality | "export-stl";

interface Pending {
  resolve: (response: EngineResponse) => void;
  reject: (error: Error) => void;
  label: RequestLabel;
  settings: BaseplateSettings;
  startedAt: number;
}

/** Latest settings to show, and the quality still to compute for them (null when done). */
interface Shown {
  settings: BaseplateSettings;
  next: Quality | null;
}

/**
 * Runs the engine in a Web Worker. Display requests go one at a time, latest settings
 * first, so dragging a setting never piles computations up in the worker. A final quality
 * made stale while it runs (a 20 × 20 takes about a second) is cancelled by replacing the
 * worker, so the new preview does not wait for it. A worker that
 * crashes is dropped and started again on the next request; a worker that computed a
 * large mesh is replaced by a fresh one once idle, to give its WASM heap back.
 *
 * Each request is recorded as a User Timing measure named `engine:<request>`, whose
 * detail holds the settings (and `cancelled: true` for a cancelled final).
 */
export function createEngineClient(events: EngineClientEvents): EngineClient {
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let nextId = 0;
  let recycleWhenIdle = false;
  let recycleTimer: ReturnType<typeof setTimeout> | undefined;
  let shown: Shown | null = null;
  let rendering = false;
  /** Id of the display request of final quality in flight, if any. */
  let finalInFlight: number | null = null;

  function rejectAll(error: Error) {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
    finalInFlight = null;
  }

  function stop() {
    clearTimeout(recycleTimer);
    worker?.terminate();
    worker = null;
  }

  function start(): Worker {
    performance.mark(`${ENGINE_TIMING_PREFIX}worker-start`);
    const started = new Worker(new URL("./baseplate.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data: response }: MessageEvent<EngineResponse>) => {
      const request = settle(response.id, false);
      if (!request) return;
      if (triangleCount(response) >= LARGE_MESH_TRIANGLES) recycleWhenIdle = true;
      if (response.type === "error") request.reject(new Error(response.message));
      else request.resolve(response);
      if (recycleWhenIdle && pending.size === 0) {
        clearTimeout(recycleTimer);
        recycleTimer = setTimeout(replaceWorker, RECYCLE_AFTER_IDLE_MS);
      }
    };
    started.onerror = (event) => {
      stop();
      rejectAll(new Error(event.message || "Geometry worker failed"));
    };
    return started;
  }

  /** Removes a request from the pending ones and records its User Timing measure. */
  function settle(id: number, cancelled: boolean): Pending | undefined {
    const request = pending.get(id);
    if (!request) return undefined;
    pending.delete(id);
    if (id === finalInFlight) finalInFlight = null;
    performance.measure(`${ENGINE_TIMING_PREFIX}${request.label}`, {
      start: request.startedAt,
      end: performance.now(),
      detail: cancelled ? { ...request.settings, cancelled } : { ...request.settings },
    });
    return request;
  }

  /**
   * Cancels the final quality in flight, now stale, when it is the worker's only request
   * (an export in progress keeps it): a WASM computation cannot be interrupted, so the
   * worker is replaced.
   */
  function cancelStaleFinal() {
    if (finalInFlight === null || !pending.has(finalInFlight) || pending.size !== 1) return;
    const request = settle(finalInFlight, true);
    replaceWorker();
    request?.reject(new Error("Stale computation cancelled"));
  }

  /** Replaces the worker by a fresh one, warmed up so the next request stays fast. */
  function replaceWorker() {
    recycleWhenIdle = false;
    stop();
    worker = start();
    worker.postMessage({ type: "warm-up" } satisfies EngineWarmUp);
  }

  function send(
    request: DistributiveOmit<EngineRequest, "id">,
    label: RequestLabel,
  ): { id: number; response: Promise<EngineResponse> } {
    const id = nextId++;
    clearTimeout(recycleTimer); // busy again: the replacement waits for the next idle time
    worker ??= start();
    const target = worker;
    const response = new Promise<EngineResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject, label, settings: request.settings, startedAt: performance.now() });
      target.postMessage({ ...request, id });
    });
    return { id, response };
  }

  async function generate(settings: BaseplateSettings, quality: Quality): Promise<Baseplate> {
    const { id, response: reply } = send({ type: "generate", settings, quality }, quality);
    if (quality === "final") finalInFlight = id;
    const response = await reply;
    if (response.type !== "baseplate") throw new Error(`Unexpected engine response: ${response.type}`);
    return response.baseplate;
  }

  /** Computes what `shown` still needs, one request at a time, until it is up to date. */
  async function render() {
    if (rendering) return;
    rendering = true;
    try {
      while (shown?.next) {
        const target = shown;
        const quality = shown.next;
        if (quality === "final") {
          await new Promise((resolve) => setTimeout(resolve, FINAL_AFTER_STILL_MS));
          if (shown !== target) continue;
        }
        try {
          const baseplate = await generate(target.settings, quality);
          if (shown !== target) continue; // stale: dropped, the latest settings come next
          target.next = quality === "preview" ? "final" : null;
          events.onBaseplate(baseplate, quality);
        } catch (error) {
          if (shown !== target) continue;
          target.next = null;
          events.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    } finally {
      rendering = false;
    }
  }

  return {
    show(settings) {
      shown = { settings, next: "preview" };
      cancelStaleFinal();
      void render();
    },
    async exportStl(settings) {
      const response = await send({ type: "export-stl", settings }, "export-stl").response;
      if (response.type !== "stl") throw new Error(`Unexpected engine response: ${response.type}`);
      return { bytes: response.bytes, baseplate: response.baseplate };
    },
    dispose() {
      shown = null;
      stop();
      rejectAll(new Error("Geometry engine disposed"));
    },
  };
}

function triangleCount(response: EngineResponse): number {
  if (response.type === "baseplate") return response.baseplate.mesh.indices.length / 3;
  if (response.type === "stl") return (response.bytes.byteLength - 84) / 50; // binary STL layout
  return 0;
}

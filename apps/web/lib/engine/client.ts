import type { Baseplate, BaseplateSettings, BuildPlate, Quality } from "@repo/geometry";
import type { BaseplateSummary, EngineRequest, EngineResponse, EngineWarmUp, ExportFormat, ExportPiece, FileExtension } from "./protocol";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface EngineClientEvents {
  /**
   * A baseplate for the latest settings and build plate shown, which it gets with them: the
   * preview first, then the final quality.
   */
  onBaseplate(baseplate: Baseplate, quality: Quality, settings: BaseplateSettings, buildPlate: BuildPlate): void;
  /** Computing the latest settings shown failed. */
  onError(error: Error): void;
  /**
   * The volume of baseplates to compare with the one shown (`compare`), measured on their
   * final mesh, each with the settings and the build plate it was computed for.
   */
  onVolumes?(volumes: { settings: BaseplateSettings; volume: number }[], buildPlate: BuildPlate): void;
}

export interface EngineClient {
  /**
   * Computes `settings`, cut for `buildPlate`, for display: the preview, then the final
   * quality, each reported through `onBaseplate`. Newer settings supersede older ones: a
   * computation that became stale is dropped (its result, or its final quality not started
   * yet), so only the latest settings are rendered.
   */
  show(settings: BaseplateSettings, buildPlate: BuildPlate): void;
  /**
   * Baseplates to compare with the settings shown (the same one with another shape of
   * margin): once the final quality of the settings shown is done, and when it has a margin,
   * their volumes are measured, all in one request, and reported through `onVolumes`. Newer
   * settings shown drop the list (they call for their own), and cancel its request.
   */
  compare(settings: readonly BaseplateSettings[]): void;
  /**
   * The file of `piece` for `settings` in `format`, computed in final quality and cut for
   * `buildPlate`, its name without extension, and its extension (a zip for the STL files of
   * a cut baseplate). A 3MF carries `link`, the absolute link that generates it again, and
   * names each piece of a cut baseplate by `pieceName` (`{n}` for its number), and its clips
   * by `clipName` (`{n}` for how many).
   */
  exportFile(
    piece: ExportPiece,
    settings: BaseplateSettings,
    format: ExportFormat,
    options: { link: string; buildPlate: BuildPlate; pieceName: string; clipName: string },
  ): Promise<{ bytes: Uint8Array; name: string; extension: FileExtension; baseplate: BaseplateSummary }>;
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
type RequestLabel = Quality | "volumes" | `export-${ExportFormat}` | `export-test-kit-${ExportFormat}`;

interface Pending {
  resolve: (response: EngineResponse) => void;
  reject: (error: Error) => void;
  label: RequestLabel;
  settings: BaseplateSettings;
  startedAt: number;
}

/**
 * Latest settings and build plate to show, and what is still to compute for them: a quality,
 * or the volumes to compare with; null when done.
 */
interface Shown {
  settings: BaseplateSettings;
  buildPlate: BuildPlate;
  next: Quality | "volumes" | null;
  /** Baseplates to compare with it (`compare`). */
  compare: readonly BaseplateSettings[];
  /** Whether its final quality is shown, and has a margin: the shape of the margin then changes its volume. */
  comparable: boolean;
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
 * detail holds the settings (and `cancelled: true` for a cancelled final, `serializeMs`
 * for an export).
 */
export function createEngineClient(events: EngineClientEvents): EngineClient {
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let nextId = 0;
  let recycleWhenIdle = false;
  let recycleTimer: ReturnType<typeof setTimeout> | undefined;
  let shown: Shown | null = null;
  let rendering = false;
  /** Id of the display request of final quality (or of the volumes to compare) in flight, if any. */
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
      const request = settle(response.id, false, response.type === "export" ? response.serializeMs : undefined);
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

  /**
   * Removes a request from the pending ones and records its User Timing measure; its
   * detail holds the settings, plus the serialisation time of an export.
   */
  function settle(id: number, cancelled: boolean, serializeMs?: number): Pending | undefined {
    const request = pending.get(id);
    if (!request) return undefined;
    pending.delete(id);
    if (id === finalInFlight) finalInFlight = null;
    performance.measure(`${ENGINE_TIMING_PREFIX}${request.label}`, {
      start: request.startedAt,
      end: performance.now(),
      detail: cancelled
        ? { ...request.settings, cancelled }
        : serializeMs === undefined
          ? { ...request.settings }
          : { ...request.settings, serializeMs },
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
    // The volumes to compare are recorded with the first of their settings.
    const settings = Array.isArray(request.settings) ? (request.settings[0] as BaseplateSettings) : request.settings;
    const response = new Promise<EngineResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject, label, settings, startedAt: performance.now() });
      target.postMessage({ ...request, id });
    });
    return { id, response };
  }

  async function generate(settings: BaseplateSettings, buildPlate: BuildPlate, quality: Quality): Promise<Baseplate> {
    const { id, response: reply } = send({ type: "generate", settings, quality, buildPlate }, quality);
    if (quality === "final") finalInFlight = id;
    const response = await reply;
    if (response.type !== "baseplate") throw new Error(`Unexpected engine response: ${response.type}`);
    return response.baseplate;
  }

  /** Measures the volumes of `settings` in final quality, cut for `buildPlate`: optional, never an error on screen. */
  async function measureVolumes(target: Shown) {
    const list = target.compare;
    const { id, response: reply } = send({ type: "volumes", settings: [...list], buildPlate: target.buildPlate }, "volumes");
    finalInFlight = id;
    try {
      const response = await reply;
      if (response.type === "volumes") {
        // True whatever the settings shown since: the page keeps them by their settings.
        events.onVolumes?.(list.map((settings, k) => ({ settings, volume: response.volumes[k] as number })), target.buildPlate);
      }
    } catch {
      // Cancelled, or failed: the comparison is left out.
    }
    if (shown !== target) return;
    // Another list asked for meanwhile is measured next.
    target.next = target.compare !== list && target.compare.length > 0 ? "volumes" : null;
  }

  /** Computes what `shown` still needs, one request at a time, until it is up to date. */
  async function render() {
    if (rendering) return;
    rendering = true;
    try {
      while (shown?.next) {
        const target: Shown = shown;
        const quality = target.next;
        if (quality === null) break;
        if (quality === "volumes") {
          await measureVolumes(target);
          continue;
        }
        if (quality === "final") {
          await new Promise((resolve) => setTimeout(resolve, FINAL_AFTER_STILL_MS));
          if (shown !== target) continue;
        }
        try {
          const baseplate = await generate(target.settings, target.buildPlate, quality);
          if (shown !== target) continue; // stale: dropped, the latest settings come next
          if (quality === "final") target.comparable = hasMargin(baseplate);
          target.next = quality === "preview" ? "final" : target.comparable && target.compare.length > 0 ? "volumes" : null;
          events.onBaseplate(baseplate, quality, target.settings, target.buildPlate);
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
    show(settings, buildPlate) {
      shown = { settings, buildPlate, next: "preview", compare: [], comparable: false };
      cancelStaleFinal();
      void render();
    },
    compare(settings) {
      if (!shown) return;
      shown.compare = settings;
      // Done with the settings shown: the volumes are measured now; otherwise after their final.
      if (shown.next === null && shown.comparable && settings.length > 0) {
        shown.next = "volumes";
        void render();
      }
    },
    async exportFile(piece, settings, format, { link, buildPlate, pieceName, clipName }) {
      const label = piece === "test-kit" ? (`export-test-kit-${format}` as const) : (`export-${format}` as const);
      const response = await send({ type: "export", piece, settings, format, link, buildPlate, pieceName, clipName }, label).response;
      if (response.type !== "export") throw new Error(`Unexpected engine response: ${response.type}`);
      return { bytes: response.bytes, name: response.name, extension: response.extension, baseplate: response.baseplate };
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
  if (response.type === "export" || response.type === "volumes") return response.triangles;
  return 0;
}

/** Whether a baseplate has a margin, whose shape changes its volume. */
function hasMargin({ layout: { margins } }: Baseplate): boolean {
  return margins.left > 0 || margins.right > 0 || margins.back > 0 || margins.front > 0;
}

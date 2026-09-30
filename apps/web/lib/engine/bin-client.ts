import type { Bin, BinSettings, Quality } from "@repo/geometry";
import type { BinEngineRequest, BinEngineResponse } from "./bin-protocol";
import type { ExportFormat } from "./protocol";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface BinEngineEvents {
  /** A bin for the latest settings shown: the preview first, then the final quality. */
  onBin(bin: Bin, quality: Quality, settings: BinSettings): void;
  /** Computing the latest settings shown failed. */
  onError(error: Error): void;
}

export interface BinEngineClient {
  /**
   * Computes `settings` for display: the preview, then the final quality once they stay put.
   * Newer settings supersede older ones; a stale final is cancelled.
   */
  show(settings: BinSettings): void;
  /** The file of the bin of `settings` in `format`, in final quality, and its name without extension. */
  exportFile(settings: BinSettings, format: ExportFormat, link: string): Promise<{ bytes: Uint8Array; name: string }>;
  dispose(): void;
}

/** The final quality starts once the settings have stayed put this long after their preview. */
const FINAL_AFTER_STILL_MS = 200;

class Cancelled extends Error {}

/**
 * Runs the bin engine in a Web Worker, like the baseplate's (client.ts) in a smaller way: one
 * display request at a time, the latest settings first; a final quality made stale while it
 * runs is cancelled by replacing the worker, unless a download waits on it.
 */
export function createBinEngineClient(events: BinEngineEvents): BinEngineClient {
  const pending = new Map<number, { resolve: (response: BinEngineResponse) => void; reject: (error: Error) => void; display: boolean }>();
  let worker: Worker | null = null;
  let nextId = 0;
  /** The latest settings to show, and what is left to compute for them. */
  let wanted: { settings: BinSettings; next: Quality | null } | null = null;
  /** The display request in flight, if any. */
  let busy: object | null = null;
  let finalTimer: ReturnType<typeof setTimeout> | undefined;

  function start(): Worker {
    const started = new Worker(new URL("./bin.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data: response }: MessageEvent<BinEngineResponse>) => {
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.type === "error") request.reject(new Error(response.message));
      else request.resolve(response);
    };
    started.onerror = (event) => {
      event.preventDefault();
      stop(new Error(event.message || "The bin engine worker crashed"));
    };
    started.postMessage({ type: "warm-up" });
    return started;
  }

  function stop(reason: Error) {
    worker?.terminate();
    worker = null;
    for (const request of pending.values()) request.reject(reason);
    pending.clear();
    busy = null;
  }

  function send(message: DistributiveOmit<BinEngineRequest, "id">, display: boolean): Promise<BinEngineResponse> {
    worker ??= start();
    const id = nextId++;
    const target = worker;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, display });
      target.postMessage({ ...message, id });
    });
  }

  /** Sends what is left to compute for the latest settings, one request at a time. */
  function pump() {
    if (busy || !wanted || wanted.next === null) return;
    const current = wanted;
    const quality = current.next as Quality;
    current.next = null;
    const token = {};
    busy = token;
    const done = () => {
      if (busy === token) busy = null;
    };
    send({ type: "generate", settings: current.settings, quality }, true).then(
      (response) => {
        done();
        if (response.type === "bin" && wanted === current) {
          events.onBin(response.bin, quality, current.settings);
          if (quality === "preview") {
            clearTimeout(finalTimer);
            finalTimer = setTimeout(() => {
              if (wanted === current) {
                current.next = "final";
                pump();
              }
            }, FINAL_AFTER_STILL_MS);
          }
        }
        pump();
      },
      (error: Error) => {
        done();
        if (!(error instanceof Cancelled) && wanted === current) events.onError(error);
        pump();
      },
    );
  }

  return {
    show(settings) {
      clearTimeout(finalTimer);
      const exporting = [...pending.values()].some((request) => !request.display);
      // A stale computation in flight: replace the worker, so the new preview does not wait for it.
      if (busy && !exporting) stop(new Cancelled());
      wanted = { settings, next: "preview" };
      pump();
    },
    async exportFile(settings, format, link) {
      const response = await send({ type: "export", settings, format, link }, false);
      if (response.type !== "export") throw new Error("Unexpected response to an export");
      return { bytes: response.bytes, name: response.name };
    },
    dispose() {
      clearTimeout(finalTimer);
      wanted = null;
      stop(new Cancelled());
    },
  };
}

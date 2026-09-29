import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";
import type { BaseplateSummary, EngineRequest, EngineResponse } from "./protocol";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface EngineClient {
  generate(settings: BaseplateSettings, quality: Quality): Promise<Baseplate>;
  exportStl(settings: BaseplateSettings): Promise<{ bytes: Uint8Array; baseplate: BaseplateSummary }>;
  dispose(): void;
}

interface Pending {
  resolve: (response: EngineResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Runs the engine in a Web Worker and exposes it as promises. A worker that crashes is
 * dropped and started again on the next request. Stale-computation cancellation and
 * recycling after large exports arrive with #5.
 */
export function createEngineClient(): EngineClient {
  const pending = new Map<number, Pending>();
  let worker: Worker | null = null;
  let nextId = 0;

  function rejectAll(error: Error) {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  }

  function stop() {
    worker?.terminate();
    worker = null;
  }

  function start(): Worker {
    const started = new Worker(new URL("./baseplate.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data: response }: MessageEvent<EngineResponse>) => {
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.type === "error") request.reject(new Error(response.message));
      else request.resolve(response);
    };
    started.onerror = (event) => {
      stop();
      rejectAll(new Error(event.message || "Geometry worker failed"));
    };
    return started;
  }

  function send(request: DistributiveOmit<EngineRequest, "id">): Promise<EngineResponse> {
    const id = nextId++;
    worker ??= start();
    const target = worker;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      target.postMessage({ ...request, id });
    });
  }

  return {
    async generate(settings, quality) {
      const response = await send({ type: "generate", settings, quality });
      if (response.type !== "baseplate") throw new Error(`Unexpected engine response: ${response.type}`);
      return response.baseplate;
    },
    async exportStl(settings) {
      const response = await send({ type: "export-stl", settings });
      if (response.type !== "stl") throw new Error(`Unexpected engine response: ${response.type}`);
      return { bytes: response.bytes, baseplate: response.baseplate };
    },
    dispose() {
      stop();
      rejectAll(new Error("Geometry engine disposed"));
    },
  };
}

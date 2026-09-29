import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";
import type { EngineRequest, EngineResponse } from "./protocol";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export interface EngineClient {
  generate(settings: BaseplateSettings, quality: Quality): Promise<Baseplate>;
  exportStl(settings: BaseplateSettings): Promise<{ bytes: Uint8Array; baseplate: Omit<Baseplate, "mesh"> }>;
  dispose(): void;
}

/**
 * Starts the engine worker and exposes it as promises. Stale-computation cancellation and
 * worker recycling after large exports arrive with #5.
 */
export function createEngineClient(): EngineClient {
  const worker = new Worker(new URL("./baseplate.worker.ts", import.meta.url), { type: "module" });
  const pending = new Map<number, { resolve: (response: EngineResponse) => void; reject: (error: Error) => void }>();
  let nextId = 0;

  worker.onmessage = ({ data: response }: MessageEvent<EngineResponse>) => {
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.type === "error") request.reject(new Error(response.message));
    else request.resolve(response);
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Geometry worker failed");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  function send(request: DistributiveOmit<EngineRequest, "id">): Promise<EngineResponse> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...request, id });
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
      worker.terminate();
      pending.clear();
    },
  };
}

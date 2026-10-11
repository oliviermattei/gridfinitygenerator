import type { BuildPlate } from "@repo/geometry";
import type { Article } from "../basket";
import type { ArticleMeasure, StackChoice } from "./article-measure";
import type { BasketEngineRequest, BasketEngineResponse } from "./basket-protocol";

export interface BasketEngineClient {
  /**
   * Measures one article in final quality, cut for `buildPlate` and stacked as `stack` asks
   * (`measureArticle`). The worker takes its requests one at a time, in the order they are made.
   */
  measure(article: Pick<Article, "model" | "link">, buildPlate: BuildPlate, stack: StackChoice | null): Promise<ArticleMeasure>;
  dispose(): void;
}

/** Runs the measures of the basket in a Web Worker, started again after a crash. */
export function createBasketEngineClient(): BasketEngineClient {
  const pending = new Map<number, { resolve: (measure: ArticleMeasure) => void; reject: (error: Error) => void }>();
  let worker: Worker | null = null;
  let nextId = 0;

  function stop(reason: Error) {
    worker?.terminate();
    worker = null;
    for (const request of pending.values()) request.reject(reason);
    pending.clear();
  }

  function start(): Worker {
    const started = new Worker(new URL("./basket.worker.ts", import.meta.url), { type: "module" });
    started.onmessage = ({ data: response }: MessageEvent<BasketEngineResponse>) => {
      const request = pending.get(response.id);
      if (!request) return;
      pending.delete(response.id);
      if (response.type === "error") request.reject(new Error(response.message));
      else request.resolve(response.measure);
    };
    started.onerror = (event) => {
      event.preventDefault();
      stop(new Error(event.message || "The basket engine worker crashed"));
    };
    started.postMessage({ type: "warm-up" });
    return started;
  }

  return {
    measure({ model, link }, buildPlate, stack) {
      worker ??= start();
      const id = nextId++;
      const target = worker;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        target.postMessage({ id, type: "measure", model, link, buildPlate, stack } satisfies BasketEngineRequest);
      });
    },
    dispose() {
      stop(new Error("Basket engine disposed"));
    },
  };
}

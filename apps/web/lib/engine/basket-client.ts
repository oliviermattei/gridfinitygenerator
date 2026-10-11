import type { BuildPlate } from "@repo/geometry";
import type { Article } from "../basket";
import type { ArticleMeasure, StackChoice } from "./article-measure";
import type { BasketDownloadOptions, BasketDownloadPlan, BasketFile } from "./basket-download";
import type { BasketEngineRequest, BasketEngineResponse } from "./basket-protocol";

export interface BasketEngineClient {
  /**
   * Measures one article in final quality, cut for `buildPlate` and stacked as `stack` asks
   * (`measureArticle`). The worker takes its requests one at a time, in the order they are made.
   */
  measure(article: Pick<Article, "model" | "link">, buildPlate: BuildPlate, stack: StackChoice | null): Promise<ArticleMeasure>;
  /**
   * Writes the file of the basket (#43, `writeBasketDownload`), telling `onProgress` how many
   * articles are computed. A computation cannot be interrupted: `dispose` cancels it.
   */
  download(plan: BasketDownloadPlan, options: BasketDownloadOptions, onProgress: (done: number, total: number) => void): Promise<BasketFile>;
  dispose(): void;
}

/** Runs the measures and the download of the basket in a Web Worker, started again after a crash. */
export function createBasketEngineClient(): BasketEngineClient {
  const pending = new Map<
    number,
    { resolve: (result: ArticleMeasure | BasketFile) => void; reject: (error: Error) => void; progress?: (done: number, total: number) => void }
  >();
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
      if (response.type === "progress") {
        request.progress?.(response.done, response.total);
        return;
      }
      pending.delete(response.id);
      if (response.type === "error") request.reject(new Error(response.message));
      else if (response.type === "measure") request.resolve(response.measure);
      else request.resolve({ bytes: response.bytes, name: response.name, extension: response.extension });
    };
    started.onerror = (event) => {
      event.preventDefault();
      stop(new Error(event.message || "The basket engine worker crashed"));
    };
    started.postMessage({ type: "warm-up" });
    return started;
  }

  function send<T extends ArticleMeasure | BasketFile>(request: BasketEngineRequest, progress?: (done: number, total: number) => void): Promise<T> {
    worker ??= start();
    const target = worker;
    return new Promise<T>((resolve, reject) => {
      pending.set(request.id, { resolve: resolve as (result: ArticleMeasure | BasketFile) => void, reject, progress });
      target.postMessage(request);
    });
  }

  return {
    measure({ model, link }, buildPlate, stack) {
      return send<ArticleMeasure>({ id: nextId++, type: "measure", model, link, buildPlate, stack });
    },
    download(plan, options, onProgress) {
      return send<BasketFile>({ id: nextId++, type: "download", plan, options }, onProgress);
    },
    dispose() {
      stop(new Error("Basket engine disposed"));
    },
  };
}

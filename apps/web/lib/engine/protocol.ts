import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";

/** A baseplate without its mesh: what the page needs besides the geometry itself. */
export type BaseplateSummary = Omit<Baseplate, "mesh">;

/** Requests from the page to the engine worker; each one gets a response with its id. */
export type EngineRequest =
  | { id: number; type: "generate"; settings: BaseplateSettings; quality: Quality }
  | { id: number; type: "export-stl"; settings: BaseplateSettings };

/** Loads the WASM ahead of the first request; it gets no response. */
export interface EngineWarmUp {
  type: "warm-up";
}

/** Messages from the engine worker back to the page. */
export type EngineResponse =
  | { id: number; type: "baseplate"; baseplate: Baseplate }
  | { id: number; type: "stl"; bytes: Uint8Array; baseplate: BaseplateSummary }
  | { id: number; type: "error"; message: string };

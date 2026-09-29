import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";

/** Messages from the page to the engine worker. */
export type EngineRequest =
  | { id: number; type: "generate"; settings: BaseplateSettings; quality: Quality }
  | { id: number; type: "export-stl"; settings: BaseplateSettings };

/** Messages from the engine worker back to the page. */
export type EngineResponse =
  | { id: number; type: "baseplate"; baseplate: Baseplate }
  | { id: number; type: "stl"; bytes: Uint8Array; baseplate: Omit<Baseplate, "mesh"> }
  | { id: number; type: "error"; message: string };

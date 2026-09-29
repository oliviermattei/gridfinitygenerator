import type { Baseplate, BaseplateSettings, Quality } from "@repo/geometry";

/** A baseplate without its mesh: what the page needs besides the geometry itself. */
export type BaseplateSummary = Omit<Baseplate, "mesh">;

/** File formats of the download: 3MF by default, STL for the slicers that cannot read it. */
export type ExportFormat = "3mf" | "stl";

/** Requests from the page to the engine worker; each one gets a response with its id. */
export type EngineRequest =
  | { id: number; type: "generate"; settings: BaseplateSettings; quality: Quality }
  | {
      id: number;
      type: "export";
      settings: BaseplateSettings;
      format: ExportFormat;
      /** Absolute share link of the settings, written into the 3MF. */
      shareLink: string;
    };

/** Loads the WASM ahead of the first request; it gets no response. */
export interface EngineWarmUp {
  type: "warm-up";
}

/** Messages from the engine worker back to the page. */
export type EngineResponse =
  | { id: number; type: "baseplate"; baseplate: Baseplate }
  | {
      id: number;
      type: "export";
      /** The file, in the requested format. */
      bytes: Uint8Array;
      baseplate: BaseplateSummary;
      /** Triangles of the exported mesh (final quality). */
      triangles: number;
      /** Time spent writing the file, in milliseconds (the mesh computation excluded). */
      serializeMs: number;
    }
  | { id: number; type: "error"; message: string };

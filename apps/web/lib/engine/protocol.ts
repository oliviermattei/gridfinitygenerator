import type { Baseplate, BaseplateSettings, BuildPlate, Quality } from "@repo/geometry";

/** A baseplate without its mesh: what the page needs besides the geometry itself. */
export type BaseplateSummary = Omit<Baseplate, "mesh">;

/** File formats of the download: 3MF by default, STL for the slicers that cannot read it. */
export type ExportFormat = "3mf" | "stl";

/** Extension of a downloaded file: its format, or a zip of the STL files of the pieces of a cut baseplate. */
export type FileExtension = ExportFormat | "zip";

/**
 * What a download holds: the baseplate of the settings, or the test kit (a 1 × 2 baseplate
 * with one cell of each pocket profile, which takes the cell size, the outline and the
 * print settings only).
 */
export type ExportPiece = "baseplate" | "test-kit";

/** Requests from the page to the engine worker; each one gets a response with its id. */
export type EngineRequest =
  | {
      id: number;
      type: "generate";
      settings: BaseplateSettings;
      quality: Quality;
      /** Build plate the baseplate is cut for (a local preference). */
      buildPlate: BuildPlate;
    }
  | {
      id: number;
      type: "export";
      piece: ExportPiece;
      settings: BaseplateSettings;
      format: ExportFormat;
      /** Absolute link written into the 3MF to generate the piece again: the share link of the settings. */
      link: string;
      /** Build plate the baseplate is cut for; the test kit is never cut. */
      buildPlate: BuildPlate;
      /**
       * Name of a piece of a cut baseplate in the 3MF, in the language of the page, `{n}`
       * standing for its number (« pièce {n} »).
       */
      pieceName: string;
      /** Name of the object of the clips in the 3MF, `{n}` standing for their number (« clip × {n} »). */
      clipName: string;
    }
  | {
      id: number;
      type: "volumes";
      /**
       * Baseplates to measure, in final quality: the one shown with another shape of margin,
       * to compare what each shape costs (#23).
       */
      settings: BaseplateSettings[];
      buildPlate: BuildPlate;
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
      /** Name of the file without its extension, also the name of the object in a 3MF of a single piece. */
      name: string;
      /** Extension of the file: a zip holds the STL files of the pieces of a cut baseplate, and of its clips. */
      extension: FileExtension;
      baseplate: BaseplateSummary;
      /** Triangles of the exported mesh (final quality). */
      triangles: number;
      /** Time spent writing the file, in milliseconds (the mesh computation excluded). */
      serializeMs: number;
    }
  | {
      id: number;
      type: "volumes";
      /** Volume of each baseplate of the request, in mm³, measured on its final mesh. */
      volumes: number[];
      /** Triangles of the largest of their meshes (final quality). */
      triangles: number;
    }
  | { id: number; type: "error"; message: string };

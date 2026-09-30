import type { Bin, BinSettings, Quality } from "@repo/geometry";
import type { ExportFormat } from "./protocol";

/** Requests from the bin page to its engine worker; each one gets a response with its id. */
export type BinEngineRequest =
  | { id: number; type: "generate"; settings: BinSettings; quality: Quality }
  | {
      id: number;
      type: "export";
      settings: BinSettings;
      format: ExportFormat;
      /** Absolute link written into the 3MF to generate the bin again: the share link of the settings. */
      link: string;
    };

/** Messages from the bin engine worker back to the page. */
export type BinEngineResponse =
  | { id: number; type: "bin"; bin: Bin }
  | { id: number; type: "export"; bytes: Uint8Array; name: string }
  | { id: number; type: "error"; message: string };

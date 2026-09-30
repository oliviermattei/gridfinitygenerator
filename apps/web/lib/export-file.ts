import type { BaseplateSettings, BinSettings } from "@repo/geometry";
import type { BaseplateSummary, ExportPiece, FileExtension } from "./engine/protocol";

/** Media type of each downloaded file. */
export const MEDIA_TYPES: Record<FileExtension, string> = { "3mf": "model/3mf", stl: "model/stl", zip: "application/zip" };

/**
 * Name of a downloaded file without its extension, which is also the name of the object
 * inside a 3MF:
 * - a baseplate, `baseplate-{nx}x{ny}-{W}x{D}mm` (the naming of the spec), with `-tray` for
 *   a tray and `-flush` when its pockets have the flush profile, so that two files to
 *   compare tell apart;
 * - the test kit, `baseplate-test-kit-hybrid-flush-{W}x{D}mm`: its profiles, front to back;
 * - the pieces of a cut baseplate stacked for a single print (#28), with `-stack` at the end.
 */
export function exportName(piece: ExportPiece, { layout, stats }: BaseplateSummary, settings: BaseplateSettings, stacked = false): string {
  const mm = (value: number) => String(Number(value.toFixed(1)));
  const size = `${mm(stats.dimensions.width)}x${mm(stats.dimensions.depth)}mm`;
  if (piece === "test-kit") return `baseplate-test-kit-hybrid-flush-${size}`;
  const type = settings.baseplateType === "normal" ? "" : `-${settings.baseplateType}`;
  const profile = settings.pocketProfile === "flush" ? "-flush" : "";
  return `baseplate-${layout.columns}x${layout.rows}-${size}${type}${profile}${stacked ? "-stack" : ""}`;
}

/**
 * Name of a downloaded bin without its extension, also the name of its object in a 3MF:
 * `bin-{x}x{y}x{h}u`, then its compartments when there are several (`-3x2`), and its lip
 * when it is not the normal one (`-reduced-lip`, `-no-lip`).
 */
export function binExportName(settings: BinSettings): string {
  const { columns, rows, units, compartmentColumns, compartmentRows, lip } = settings;
  const compartments = compartmentColumns * compartmentRows > 1 ? `-${compartmentColumns}x${compartmentRows}` : "";
  const lipName = lip === "normal" ? "" : lip === "reduced" ? "-reduced-lip" : "-no-lip";
  return `bin-${columns}x${rows}x${units}u${compartments}${lipName}`;
}

/** Saves bytes as a file through a temporary link. */
export function download(bytes: Uint8Array<ArrayBuffer>, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

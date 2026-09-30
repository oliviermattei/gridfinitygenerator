import type { BaseplateSettings } from "@repo/geometry";
import type { BaseplateSummary, ExportPiece, FileExtension } from "./engine/protocol";

/** Media type of each downloaded file. */
export const MEDIA_TYPES: Record<FileExtension, string> = { "3mf": "model/3mf", stl: "model/stl", zip: "application/zip" };

/**
 * Name of a downloaded file without its extension, which is also the name of the object
 * inside a 3MF:
 * - a baseplate, `baseplate-{nx}x{ny}-{W}x{D}mm` (the naming of the spec), with `-tray` for
 *   a tray and `-flush` when its pockets have the flush profile, so that two files to
 *   compare tell apart;
 * - the test kit, `baseplate-test-kit-hybrid-flush-{W}x{D}mm`: its profiles, front to back.
 */
export function exportName(piece: ExportPiece, { layout, stats }: BaseplateSummary, settings: BaseplateSettings): string {
  const mm = (value: number) => String(Number(value.toFixed(1)));
  const size = `${mm(stats.dimensions.width)}x${mm(stats.dimensions.depth)}mm`;
  if (piece === "test-kit") return `baseplate-test-kit-hybrid-flush-${size}`;
  const type = settings.baseplateType === "normal" ? "" : `-${settings.baseplateType}`;
  const profile = settings.pocketProfile === "flush" ? "-flush" : "";
  return `baseplate-${layout.columns}x${layout.rows}-${size}${type}${profile}`;
}

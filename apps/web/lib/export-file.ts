import type { BaseplateSummary, ExportFormat } from "./engine/protocol";

/** Media type of each download format. */
export const MEDIA_TYPES: Record<ExportFormat, string> = { "3mf": "model/3mf", stl: "model/stl" };

/**
 * `baseplate-{nx}x{ny}-{W}x{D}mm`, the naming of the spec: the name of the downloaded file
 * without its extension, and the name of the object inside a 3MF.
 */
export function exportName({ layout, stats }: BaseplateSummary): string {
  const mm = (value: number) => String(Number(value.toFixed(1)));
  const { width, depth } = stats.dimensions;
  return `baseplate-${layout.columns}x${layout.rows}-${mm(width)}x${mm(depth)}mm`;
}

/** Name of the downloaded file: `baseplate-{nx}x{ny}-{W}x{D}mm.{ext}`. */
export function exportFileName(summary: BaseplateSummary, format: ExportFormat): string {
  return `${exportName(summary)}.${format}`;
}

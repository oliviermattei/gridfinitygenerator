import type { BuildPlate } from "@repo/geometry";
import type { Filament } from "../mass";

/**
 * Printers a 3MF can be made for (ADR 0023). "other" is a plain 3MF, which every slicer reads;
 * a Bambu Lab printer makes it a project of Bambu Studio: one plate per piece, and the settings
 * of the printer, its nozzle and the filament of the page, which it opens without asking.
 */
export const PRINTERS = ["other", "bambu-p1s"] as const;

export type Printer = (typeof PRINTERS)[number];

export function isPrinter(value: unknown): value is Printer {
  return PRINTERS.includes(value as Printer);
}

/** Bed of each Bambu Lab printer: the build plate the pieces are cut for. */
export const PRINTER_BEDS: Record<Exclude<Printer, "other">, BuildPlate> = {
  "bambu-p1s": { width: 256, depth: 256 },
};

/** What a 3MF needs to be a Bambu Studio project: the printer and its nozzle, the filament. */
export interface BambuTarget {
  printer: Exclude<Printer, "other">;
  /** Nozzle diameter, in millimetres. */
  nozzle: number;
  filament: Filament;
}

/** Settings of a project, as `scripts/bambu-profiles.mjs` writes them in `bambu-p1s.json`. */
type Settings = Record<string, unknown>;
interface Profile {
  version: string;
  nozzles: Record<string, { settings: Settings; filaments: Partial<Record<Filament, Settings>> }>;
}

/**
 * The settings of the Bambu Studio project for the target, at the layer height of the print;
 * null when Bambu has no preset of that filament for that nozzle (TPU with a 0.2 mm nozzle):
 * the 3MF then stays a plain one. Loaded on demand, out of the page's bundle.
 */
export async function bambuSettings({ nozzle, filament }: BambuTarget, layerHeight: number): Promise<Settings | null> {
  const profile = (await import("./bambu-p1s.json")).default as Profile;
  const forNozzle = profile.nozzles[nozzle.toFixed(1)];
  if (!forNozzle) return null;
  const ofFilament = filament === "pla" ? {} : forNozzle.filaments[filament];
  if (!ofFilament) return null;
  const settings: Settings = { ...forNozzle.settings, ...ofFilament };
  const layer = String(Number(layerHeight.toFixed(3)));
  if (settings.layer_height !== layer) {
    settings.layer_height = layer;
    // Changed from the system process: Bambu Studio keeps this value and shows the process modified.
    const different = [...((settings.different_settings_to_system as string[] | undefined) ?? [])];
    different[0] = [different[0], "layer_height"].filter(Boolean).join(";");
    settings.different_settings_to_system = different;
  }
  return settings;
}

/** The Bambu Studio project the preferences ask for, or null for a plain 3MF. */
export function bambuTargetOf({ printer, nozzle, filament }: { printer: Printer; nozzle: number; filament: { filament: Filament } }): BambuTarget | null {
  return printer === "other" ? null : { printer, nozzle, filament: filament.filament };
}

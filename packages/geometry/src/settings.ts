/**
 * Settings of a baseplate: everything the share link carries (spec v1). Their defaults and
 * ranges live here only, for the engine, the interface and the settings codec alike.
 * Local preferences (nozzle, build plate, preview colour…) are not baseplate settings.
 */
export interface BaseplateSettings {
  /** Number of cells along X (left to right). */
  columns: number;
  /** Number of cells along Y (front to back). */
  rows: number;
  /** Layer height of the print, in millimetres: thicknesses the generator chooses are multiples of it. */
  layerHeight: number;
  /** Line width of the print, in millimetres. */
  lineWidth: number;
}

export interface NumericSetting {
  min: number;
  max: number;
  default: number;
  /** Whole numbers only: a value in between is rounded. */
  integer: boolean;
}

/** Range and default of every baseplate setting (spec v1, table of settings). */
export const BASEPLATE_SETTINGS = {
  columns: { min: 1, max: 24, default: 4, integer: true },
  rows: { min: 1, max: 24, default: 3, integer: true },
  layerHeight: { min: 0.12, max: 0.28, default: 0.2, integer: false },
  lineWidth: { min: 0.1, max: 1.2, default: 0.4, integer: false },
} as const satisfies Record<keyof BaseplateSettings, NumericSetting>;

/** The default baseplate: the cheapest one to print for a newcomer. */
export const DEFAULT_SETTINGS: BaseplateSettings = {
  columns: BASEPLATE_SETTINGS.columns.default,
  rows: BASEPLATE_SETTINGS.rows.default,
  layerHeight: BASEPLATE_SETTINGS.layerHeight.default,
  lineWidth: BASEPLATE_SETTINGS.lineWidth.default,
};

/**
 * Brings every setting into its range, rounding the whole ones; a missing setting, or one
 * that is not a number, takes its default.
 */
export function clampSettings(settings: Partial<BaseplateSettings>): BaseplateSettings {
  const clamped = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(BASEPLATE_SETTINGS) as (keyof BaseplateSettings)[]) {
    const value = settings[key];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    clamped[key] = clampSetting(BASEPLATE_SETTINGS[key], value);
  }
  return clamped;
}

function clampSetting({ min, max, integer }: NumericSetting, value: number): number {
  return Math.min(max, Math.max(min, integer ? Math.round(value) : value));
}

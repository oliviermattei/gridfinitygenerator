import { STANDARD_CELL_SIZE_MM, type ChoiceSetting, type FlagSetting, type NumericSetting } from "./settings";

/**
 * Settings of a bin that the engine implements: what the share link of a bin carries (spec
 * v2, #32). Like the baseplate settings, their current defaults and ranges live here only;
 * the codec (bin-share-link.ts) keeps its own frozen table per link version.
 */

/**
 * Stacking lip on top of the walls (CONTEXT.md): `normal` (the standard one), `reduced` (the
 * seat of the bin above only, a wider opening and more useful height), or `none`.
 */
export type StackingLip = "normal" | "reduced" | "none";

export const STACKING_LIPS: readonly StackingLip[] = ["normal", "reduced", "none"];

/** A side of a compartment, seen from above: the front is towards the user (−Y). */
export type BinSide = "front" | "back" | "left" | "right";

export const BIN_SIDES: readonly BinSide[] = ["front", "back", "left", "right"];

/** The side across a compartment from `side`. */
export function oppositeSide(side: BinSide): BinSide {
  return ({ front: "back", back: "front", left: "right", right: "left" } as const)[side];
}

export interface BinSettings {
  /** Size of the bin in cells, along X (width) and Y (depth). */
  columns: number;
  rows: number;
  /** Height of the bin in U of 7 mm, without its stacking lip; the first U is its socle. */
  units: number;
  /** Compartments along X and Y, in a regular grid: 1 to 3 per cell each way. */
  compartmentColumns: number;
  compartmentRows: number;
  lip: StackingLip;
  /** Fillet between the inner floor and the walls, and in the vertical corners (congé). */
  fillet: boolean;
  /** Scoop at the bottom of each compartment (pelle), against `scoopSide`. */
  scoop: boolean;
  /** Side of the scoop, the same for every compartment; front by default. */
  scoopSide: BinSide;
  /** Label tab at the top of each compartment (onglet d'étiquette), across from the scoop. */
  labelTab: boolean;
  /** Side of the label tab without a scoop; with one, the tab always takes the opposite side. */
  labelSide: BinSide;
  /** Depth of the label tab from its wall, in millimetres: the height of the label stuck on it. */
  labelDepth: number;
  /** Pitch of the grid the bin sits on, in millimetres; 42 in the standard. */
  cellSize: number;
  /** Print settings the walls follow (shared with the baseplate). */
  layerHeight: number;
  lineWidth: number;
}

/** Compartments per cell, each way, at most: under a third of a cell, a finger no longer fits. */
export const MAX_COMPARTMENTS_PER_CELL = 3;

/** Range and default of every bin setting (spec v2). */
export const BIN_SETTINGS = {
  columns: { min: 1, max: 20, default: 2, integer: true },
  rows: { min: 1, max: 20, default: 1, integer: true },
  units: { min: 2, max: 20, default: 3, integer: true },
  compartmentColumns: { min: 1, max: 20 * MAX_COMPARTMENTS_PER_CELL, default: 1, integer: true },
  compartmentRows: { min: 1, max: 20 * MAX_COMPARTMENTS_PER_CELL, default: 1, integer: true },
  lip: { options: STACKING_LIPS, default: "normal" } as ChoiceSetting<StackingLip>,
  fillet: { default: true } as FlagSetting,
  scoop: { default: false } as FlagSetting,
  scoopSide: { options: BIN_SIDES, default: "front" } as ChoiceSetting<BinSide>,
  labelTab: { default: false } as FlagSetting,
  labelSide: { options: BIN_SIDES, default: "back" } as ChoiceSetting<BinSide>,
  labelDepth: { min: 6, max: 20, default: 12, integer: false },
  cellSize: { min: 20, max: 80, default: STANDARD_CELL_SIZE_MM, integer: false },
  layerHeight: { min: 0.12, max: 0.28, default: 0.2, integer: false },
  lineWidth: { min: 0.1, max: 1.2, default: 0.4, integer: false },
} as const satisfies {
  [K in keyof BinSettings]: BinSettings[K] extends string ? ChoiceSetting : BinSettings[K] extends boolean ? FlagSetting : NumericSetting;
};

export const DEFAULT_BIN_SETTINGS: BinSettings = Object.fromEntries(
  Object.entries(BIN_SETTINGS).map(([key, setting]) => [key, setting.default]),
) as unknown as BinSettings;

/**
 * Brings every setting into its range, rounding the whole ones; a missing setting, or one
 * not of its type or not one of its choices, takes its default. The compartments are then
 * limited to 3 per cell each way.
 */
export function clampBinSettings(settings: Partial<BinSettings>): BinSettings {
  const clamped: Record<string, unknown> = { ...DEFAULT_BIN_SETTINGS };
  for (const [key, setting] of Object.entries(BIN_SETTINGS) as [keyof BinSettings, NumericSetting | ChoiceSetting | FlagSetting][]) {
    const value = settings[key];
    if ("options" in setting) {
      if (typeof value === "string" && setting.options.includes(value)) clamped[key] = value;
    } else if (!("min" in setting)) {
      if (typeof value === "boolean") clamped[key] = value;
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      clamped[key] = Math.min(setting.max, Math.max(setting.min, setting.integer ? Math.round(value) : value));
    }
  }
  const result = clamped as unknown as BinSettings;
  result.compartmentColumns = Math.min(result.compartmentColumns, result.columns * MAX_COMPARTMENTS_PER_CELL);
  result.compartmentRows = Math.min(result.compartmentRows, result.rows * MAX_COMPARTMENTS_PER_CELL);
  return result;
}

/** The side of the label tab of a bin: across from its scoop when it has one, its own side otherwise. */
export function labelSideOf(settings: Pick<BinSettings, "scoop" | "scoopSide" | "labelSide">): BinSide {
  return settings.scoop ? oppositeSide(settings.scoopSide) : settings.labelSide;
}

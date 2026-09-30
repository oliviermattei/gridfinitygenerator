import { POCKET_PROFILES, type PocketProfileName } from "./pocket-profile";

/**
 * Settings of a baseplate that the engine implements: what the share link carries (spec v1).
 * Their current defaults and ranges live here only, for the engine and the interface. The
 * settings codec (share-link.ts) keeps its own frozen table per link version, so that an old
 * link keeps its meaning when a default changes here.
 * Local preferences (nozzle, build plate, preview colour…) are not baseplate settings.
 */

export type { PocketProfileName };

/** How the size of the baseplate is given: by the drawer it fills, or by a number of cells. */
export type SizeMode = "drawer" | "cells";

/**
 * Where the grid sits in the baseplate when a margin is left, seen from above: back (`t`)
 * to front (`b`), left (`l`) to right (`r`). The back is the far end of the drawer (+Y).
 */
export type Alignment = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";

/**
 * Shape of the margin (margin.ts, ADR 0011): a frame of crossbars (`frame`, the cheapest, by
 * default), truncated cells (`cells`, the grid carried on up to the outline), or corner
 * brackets only (`brackets`).
 */
export type MarginShape = "frame" | "cells" | "brackets";

export interface BaseplateSettings {
  /** Size mode: the drawer by default, or a number of cells (shelf, worktop…). */
  sizeMode: SizeMode;
  /** Inner width of the drawer, in millimetres, along X (mode `drawer`). */
  drawerWidth: number;
  /** Inner depth of the drawer, in millimetres, along Y (mode `drawer`). */
  drawerDepth: number;
  /** Gap taken off the drawer width and depth so the baseplate goes in without forcing, in millimetres. */
  drawerGap: number;
  /** Number of cells along X, left to right (mode `cells`). */
  columns: number;
  /** Number of cells along Y, front to back (mode `cells`). */
  rows: number;
  /** Margin added to the width of the grid, in millimetres (mode `cells`). */
  marginWidth: number;
  /** Margin added to the depth of the grid, in millimetres (mode `cells`). */
  marginDepth: number;
  /** Where the grid sits when there is a margin; the margin takes the rest. */
  alignment: Alignment;
  /** Shape of the margin: the frame of crossbars by default, the cheapest. */
  marginShape: MarginShape;
  /** Profile of the pockets: the hybrid one (ADR 0002) by default, or the flush one, 0.35 mm lower. */
  pocketProfile: PocketProfileName;
  /** Countersunk screw holes that fix the baseplate to the bottom of the drawer, on the inner intersections of the grid. */
  screws: boolean;
  /** Diameter of the screw shank, in millimetres, before the hole gap. */
  screwShank: number;
  /** Diameter of the screw head, in millimetres, before the hole gap; never narrower than the shank. */
  screwHead: number;
  /** Gap added to the diameters of the holes so the screws go in without forcing, in millimetres. */
  holeGap: number;
  /**
   * Clips that hold the pieces together when the baseplate is cut for the build plate: U-shaped
   * staples printed apart, pushed up into the foot of the murets on each cut (clips.ts).
   */
  clips: boolean;
  /**
   * Side of a cell, in millimetres: the pitch of the grid, 42 in the Gridfinity standard. The
   * pocket keeps the vertical profile of the standard; only its footprint follows the cell.
   */
  cellSize: number;
  /** Radius of the outer corners of the baseplate, in millimetres, never more than half its smallest side. */
  outerRadius: number;
  /** 45° chamfer along the bottom of the whole outline, margin included, in millimetres (0: none). */
  bottomChamfer: number;
  /** Layer height of the print, in millimetres: thicknesses the generator chooses are multiples of it. */
  layerHeight: number;
  /** Line width of the print, in millimetres: widths the generator chooses are multiples of it. */
  lineWidth: number;
}

export interface NumericSetting {
  min: number;
  max: number;
  default: number;
  /** Whole numbers only: a value in between is rounded. */
  integer: boolean;
}

export interface ChoiceSetting<T extends string = string> {
  options: readonly T[];
  default: T;
}

/** A setting that is on or off. */
export interface FlagSetting {
  default: boolean;
}

/** Side of a Gridfinity cell in the standard, in millimetres: the default cell size. */
export const STANDARD_CELL_SIZE_MM = 42;

/** The 9 alignments, row by row from the back left to the front right (the order of a keypad). */
export const ALIGNMENTS: readonly Alignment[] = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"];

/** The shapes of the margin, the default (the cheapest) first. */
export const MARGIN_SHAPES: readonly MarginShape[] = ["frame", "cells", "brackets"];

/** Range and default of every baseplate setting (spec v1, table of settings). */
export const BASEPLATE_SETTINGS = {
  sizeMode: { options: ["drawer", "cells"], default: "drawer" } as ChoiceSetting<SizeMode>,
  drawerWidth: { min: 42, max: 1000, default: 400, integer: false },
  drawerDepth: { min: 42, max: 1000, default: 280, integer: false },
  drawerGap: { min: 0, max: 5, default: 1, integer: false },
  columns: { min: 1, max: 24, default: 4, integer: true },
  rows: { min: 1, max: 24, default: 3, integer: true },
  marginWidth: { min: 0, max: 500, default: 0, integer: false },
  marginDepth: { min: 0, max: 500, default: 0, integer: false },
  alignment: { options: ALIGNMENTS, default: "c" } as ChoiceSetting<Alignment>,
  marginShape: { options: MARGIN_SHAPES, default: "frame" } as ChoiceSetting<MarginShape>,
  pocketProfile: {
    options: Object.keys(POCKET_PROFILES) as PocketProfileName[],
    default: "hybrid",
  } as ChoiceSetting<PocketProfileName>,
  screws: { default: false } as FlagSetting,
  screwShank: { min: 2, max: 6, default: 3, integer: false },
  screwHead: { min: 2, max: 8, default: 6, integer: false },
  holeGap: { min: 0, max: 1, default: 0.5, integer: false },
  clips: { default: true } as FlagSetting,
  cellSize: { min: 20, max: 80, default: STANDARD_CELL_SIZE_MM, integer: false },
  outerRadius: { min: 0, max: 10, default: 4, integer: false },
  bottomChamfer: { min: 0, max: 3, default: 0, integer: false },
  layerHeight: { min: 0.12, max: 0.28, default: 0.2, integer: false },
  lineWidth: { min: 0.1, max: 1.2, default: 0.4, integer: false },
} as const satisfies {
  [K in keyof BaseplateSettings]: BaseplateSettings[K] extends string ? ChoiceSetting : BaseplateSettings[K] extends boolean ? FlagSetting : NumericSetting;
};

/** The default baseplate: the one for the default drawer, the cheapest to print for a newcomer. */
export const DEFAULT_SETTINGS: BaseplateSettings = {
  sizeMode: BASEPLATE_SETTINGS.sizeMode.default,
  drawerWidth: BASEPLATE_SETTINGS.drawerWidth.default,
  drawerDepth: BASEPLATE_SETTINGS.drawerDepth.default,
  drawerGap: BASEPLATE_SETTINGS.drawerGap.default,
  columns: BASEPLATE_SETTINGS.columns.default,
  rows: BASEPLATE_SETTINGS.rows.default,
  marginWidth: BASEPLATE_SETTINGS.marginWidth.default,
  marginDepth: BASEPLATE_SETTINGS.marginDepth.default,
  alignment: BASEPLATE_SETTINGS.alignment.default,
  marginShape: BASEPLATE_SETTINGS.marginShape.default,
  pocketProfile: BASEPLATE_SETTINGS.pocketProfile.default,
  screws: BASEPLATE_SETTINGS.screws.default,
  screwShank: BASEPLATE_SETTINGS.screwShank.default,
  screwHead: BASEPLATE_SETTINGS.screwHead.default,
  holeGap: BASEPLATE_SETTINGS.holeGap.default,
  clips: BASEPLATE_SETTINGS.clips.default,
  cellSize: BASEPLATE_SETTINGS.cellSize.default,
  outerRadius: BASEPLATE_SETTINGS.outerRadius.default,
  bottomChamfer: BASEPLATE_SETTINGS.bottomChamfer.default,
  layerHeight: BASEPLATE_SETTINGS.layerHeight.default,
  lineWidth: BASEPLATE_SETTINGS.lineWidth.default,
};

/**
 * The advanced settings (family "Avancé" of the interface, spec v1): away from their
 * defaults, standard bins may no longer fit, and the interface says so.
 */
export const ADVANCED_SETTINGS = ["cellSize", "outerRadius", "bottomChamfer", "drawerGap", "holeGap"] as const;

export type AdvancedSetting = (typeof ADVANCED_SETTINGS)[number];

/** The advanced settings that differ from their default, in the order of ADVANCED_SETTINGS. */
export function changedAdvancedSettings(settings: BaseplateSettings): AdvancedSetting[] {
  return ADVANCED_SETTINGS.filter((key) => settings[key] !== BASEPLATE_SETTINGS[key].default);
}

/**
 * Brings every setting into its range, rounding the whole ones; a missing setting, or one
 * that is not of its type or not one of its choices, takes its default. A screw head
 * narrower than its shank would not hold: it is raised to the shank.
 */
export function clampSettings(settings: Partial<BaseplateSettings>): BaseplateSettings {
  const clamped: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const [key, setting] of Object.entries(BASEPLATE_SETTINGS) as [keyof BaseplateSettings, NumericSetting | ChoiceSetting | FlagSetting][]) {
    const value = settings[key];
    if ("options" in setting) {
      if (typeof value === "string" && setting.options.includes(value)) clamped[key] = value;
    } else if (!("min" in setting)) {
      if (typeof value === "boolean") clamped[key] = value;
    } else if (typeof value === "number" && !Number.isNaN(value)) {
      clamped[key] = clampSetting(setting, value);
    }
  }
  const result = clamped as unknown as BaseplateSettings;
  result.screwHead = Math.max(result.screwHead, result.screwShank);
  return result;
}

function clampSetting({ min, max, integer }: NumericSetting, value: number): number {
  return Math.min(max, Math.max(min, integer ? Math.round(value) : value));
}

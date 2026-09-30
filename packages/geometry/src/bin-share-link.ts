import { DEFAULT_BIN_SETTINGS, clampBinSettings, type BinSettings } from "./bin-settings";
import { choice, flag, number, readValue, type LinkSetting } from "./share-link";

/**
 * Settings codec of a bin (#32): bin settings ↔ the query string of its share link, like the
 * baseplate's (share-link.ts). A link is `v=<version>` plus the settings that differ from the
 * defaults of that version, and is always read with the defaults of its own version.
 */

/** Version of the bin links written today. */
const BIN_LINK_VERSION = 1;

/**
 * Every setting a v1 bin link carries, by its link key, with its v1 range and default:
 * frozen. A change of default or range makes a new version with its own table.
 */
const V1 = {
  /** Size in cells, height in U. */
  x: number(1, 20, 2, true),
  y: number(1, 20, 1, true),
  h: number(2, 20, 3, true),
  /** Compartments along X and Y (at most 3 per cell each way). */
  dx: number(1, 60, 1, true),
  dy: number(1, 60, 1, true),
  /** Stacking lip. */
  lip: choice(["normal", "reduced", "none"], "normal"),
  /** Fillet (congé), scoop (pelle), label tab (onglet d'étiquette). */
  fi: flag(true),
  sc: flag(false),
  lt: flag(false),
  /** Advanced: cell size, in millimetres. */
  cs: number(20, 80, 42),
  /** Print: layer height and line width, in millimetres. */
  lh: number(0.12, 0.28, 0.2),
  lw: number(0.1, 1.2, 0.4),
} as const satisfies Record<string, LinkSetting>;

type LinkTable = typeof V1;
type LinkKey = keyof LinkTable;

const VERSIONS: Record<number, LinkTable> = { 1: V1 };

/** Link key of each bin setting. */
const LINK_KEYS = {
  columns: "x",
  rows: "y",
  units: "h",
  compartmentColumns: "dx",
  compartmentRows: "dy",
  lip: "lip",
  fillet: "fi",
  scoop: "sc",
  labelTab: "lt",
  cellSize: "cs",
  layerHeight: "lh",
  lineWidth: "lw",
} as const satisfies Record<keyof BinSettings, LinkKey>;

/** `v=1` plus the settings that differ from the defaults of v1, in the order of the table. */
export function encodeBinSettings(settings: BinSettings): string {
  const clamped = clampBinSettings(settings);
  const params = new URLSearchParams({ v: String(BIN_LINK_VERSION) });
  const table = VERSIONS[BIN_LINK_VERSION] as LinkTable;
  const byKey = new Map<LinkKey, unknown>((Object.keys(LINK_KEYS) as (keyof BinSettings)[]).map((field) => [LINK_KEYS[field], clamped[field]]));
  for (const [key, setting] of Object.entries(table) as [LinkKey, LinkSetting][]) {
    const value = byKey.get(key);
    if (value === setting.default) continue;
    params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  return params.toString();
}

/**
 * The bin settings of a share link, read with the defaults of its version and brought into
 * their ranges. Null when the query string is not a share link (no `v`).
 */
export function decodeBinSettings(query: string): BinSettings | null {
  const params = new URLSearchParams(query);
  const version = params.get("v");
  if (version === null || !/^[1-9]\d*$/.test(version)) return null;
  const table = VERSIONS[Number(version)] ?? (VERSIONS[BIN_LINK_VERSION] as LinkTable);
  const settings: Record<string, unknown> = {};
  for (const field of Object.keys(LINK_KEYS) as (keyof BinSettings)[]) {
    const key = LINK_KEYS[field];
    const setting = table[key] as LinkSetting;
    const raw = params.get(key);
    const value = raw === null ? null : readValue(setting, raw);
    settings[field] = value ?? setting.default;
  }
  return clampBinSettings(settings as Partial<BinSettings>);
}

/**
 * Settings to open the bin generator with: those of the shared link in the page address when
 * there is one, otherwise the last settings stored in this browser, otherwise the defaults.
 */
export function openingBinSettings(pageQuery: string, stored: string | null): BinSettings {
  return decodeBinSettings(pageQuery) ?? (stored === null ? null : decodeBinSettings(stored)) ?? DEFAULT_BIN_SETTINGS;
}

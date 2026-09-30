import { DEFAULT_SETTINGS, clampSettings, type BaseplateSettings } from "./settings";

/**
 * Settings codec (spec v1): baseplate settings ↔ the query string of a share link. Pure
 * functions, no DOM.
 *
 * A link is `v=<version>` plus the settings that differ from the defaults of that version.
 * A link is always read with the defaults of its own version, so it gives back the same
 * baseplate after the defaults of a newer version change. An unknown key is ignored; a
 * value out of range is brought back into it; a value that cannot be read takes the default.
 */

/** Version of the links written today. */
const SHARE_LINK_VERSION = 1;

export type NumberSetting = { kind: "number"; min: number; max: number; default: number; integer?: boolean };
export type ChoiceSetting<T extends string> = { kind: "choice"; options: readonly T[]; default: T };
export type FlagSetting = { kind: "flag"; default: boolean };
export type LinkSetting = NumberSetting | ChoiceSetting<string> | FlagSetting;

export const number = (min: number, max: number, value: number, integer = false): NumberSetting => ({
  kind: "number",
  min,
  max,
  default: value,
  integer,
});
export const choice = <T extends string>(options: readonly T[], value: T): ChoiceSetting<T> => ({
  kind: "choice",
  options,
  default: value,
});
export const flag = (value: boolean): FlagSetting => ({ kind: "flag", default: value });

/**
 * Every setting a v1 link can carry, by its link key, with its v1 range and default: the
 * table of settings of spec v1, frozen. Never edit it: a change of default or range makes
 * a new version, with its own table, so that v1 links keep their meaning.
 */
const V1 = {
  /** Size mode: from the drawer, or from a number of cells. */
  mode: choice(["drawer", "cells"], "drawer"),
  /** Inner width and depth of the drawer, in millimetres (mode `drawer`). */
  w: number(42, 1000, 400),
  d: number(42, 1000, 280),
  /** Columns and rows (mode `cells`). */
  cx: number(1, 24, 4, true),
  cy: number(1, 24, 3, true),
  /** Margins in width and depth, in millimetres (mode `cells`). */
  mx: number(0, 500, 0),
  my: number(0, 500, 0),
  /** Alignment of the grid: one of 9 positions, back (t) to front (b), left to right. */
  al: choice(["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"], "c"),
  /** Shape of the margin (#23): frame of crossbars, truncated cells, or corner brackets. */
  mg: choice(["frame", "cells", "brackets"], "frame"),
  /** Type of baseplate (#25): the open grid, a tray on a solid floor, a skeleton (#26), or CLICKbase (#27). */
  ty: choice(["normal", "tray", "skeleton", "clickbase"], "normal"),
  /** Pocket profile. */
  pr: choice(["hybrid", "flush"], "hybrid"),
  /** Screw holes, and their shank and head diameters in millimetres (head ≥ shank). */
  sc: flag(false),
  ss: number(2, 6, 3),
  sh: number(2, 8, 6),
  /** Clips between the pieces of a baseplate cut for the build plate (#22). */
  cl: flag(true),
  /** Advanced: cell size, hole tolerance, outer corner radius, bottom chamfer, drawer gap (mm). */
  cs: number(20, 80, 42),
  tol: number(0, 1, 0.5),
  or: number(0, 10, 4),
  ch: number(0, 3, 0),
  gap: number(0, 5, 1),
  /** Print: layer height and line width, in millimetres. */
  lh: number(0.12, 0.28, 0.2),
  lw: number(0.1, 1.2, 0.4),
} as const;

type LinkTable = typeof V1;
type LinkKey = keyof LinkTable;
type ValueOf<S> = S extends ChoiceSetting<infer T> ? T : S extends FlagSetting ? boolean : number;

/** Content of a share link: every setting of the link table, by its link key. */
export type ShareLinkSettings = { [K in LinkKey]: ValueOf<LinkTable[K]> };

/** Tables of the link versions; a link of an unknown version is read with the latest. */
const VERSIONS: Record<number, LinkTable> = { 1: V1 };

/** Link key of each baseplate setting the engine implements. */
const LINK_KEYS = {
  sizeMode: "mode",
  drawerWidth: "w",
  drawerDepth: "d",
  drawerGap: "gap",
  columns: "cx",
  rows: "cy",
  marginWidth: "mx",
  marginDepth: "my",
  alignment: "al",
  marginShape: "mg",
  baseplateType: "ty",
  pocketProfile: "pr",
  screws: "sc",
  screwShank: "ss",
  screwHead: "sh",
  holeGap: "tol",
  clips: "cl",
  cellSize: "cs",
  outerRadius: "or",
  bottomChamfer: "ch",
  layerHeight: "lh",
  lineWidth: "lw",
} as const satisfies Record<keyof BaseplateSettings, LinkKey>;

function defaultsOf(table: LinkTable): ShareLinkSettings {
  const entries = Object.entries(table).map(([key, setting]) => [key, setting.default]);
  return Object.fromEntries(entries) as ShareLinkSettings;
}

/** `v=1` plus the settings that differ from the defaults of v1, in the order of the table. */
export function encodeSettings(settings: BaseplateSettings): string {
  const table = VERSIONS[SHARE_LINK_VERSION] as LinkTable;
  const defaults = defaultsOf(table);
  const content: ShareLinkSettings = { ...defaults };
  const clamped = clampSettings(settings);
  for (const field of Object.keys(LINK_KEYS) as (keyof BaseplateSettings)[]) {
    (content as Record<LinkKey, unknown>)[LINK_KEYS[field]] = clamped[field];
  }
  const params = new URLSearchParams({ v: String(SHARE_LINK_VERSION) });
  for (const key of Object.keys(table) as LinkKey[]) {
    const value = content[key];
    if (value === defaults[key]) continue;
    params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  return params.toString();
}

/**
 * Everything a share link says, every setting of its version filled in: the values it
 * carries, brought into range, and the defaults of its version for the others. Null when
 * the query string is not a share link (no `v`).
 */
export function readShareLink(query: string): ShareLinkSettings | null {
  const params = new URLSearchParams(query);
  const version = params.get("v");
  // A version is a whole number; a newer one than this code knows is read with the latest.
  if (version === null || !/^[1-9]\d*$/.test(version)) return null;
  const table = VERSIONS[Number(version)] ?? (VERSIONS[SHARE_LINK_VERSION] as LinkTable);
  const content = defaultsOf(table) as Record<LinkKey, unknown>;
  for (const [key, setting] of Object.entries(table) as [LinkKey, LinkSetting][]) {
    const raw = params.get(key);
    if (raw === null) continue;
    const value = readValue(setting, raw);
    if (value !== null) content[key] = value;
  }
  const settings = content as ShareLinkSettings;
  // A screw head narrower than its shank would not hold: raised to the shank.
  settings.sh = Math.max(settings.sh, settings.ss);
  return settings;
}

export function readValue(setting: LinkSetting, raw: string): number | string | boolean | null {
  switch (setting.kind) {
    case "number": {
      // Plain decimals only, with a point or a comma (no hexadecimal, exponent or Infinity).
      const text = raw.trim().replace(",", ".");
      if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
      const value = Number(text);
      const whole = setting.integer ? Math.round(value) : value;
      return Math.min(setting.max, Math.max(setting.min, whole));
    }
    case "choice":
      return setting.options.includes(raw) ? raw : null;
    case "flag":
      return raw === "1" || raw === "true" ? true : raw === "0" || raw === "false" ? false : null;
  }
}

/**
 * The baseplate settings of a share link, read with the defaults of its version; the
 * settings the engine does not implement yet are ignored. Null when the query string is
 * not a share link.
 */
export function decodeSettings(query: string): BaseplateSettings | null {
  const content = readShareLink(query);
  if (!content) return null;
  const settings: Record<string, unknown> = {};
  for (const field of Object.keys(LINK_KEYS) as (keyof BaseplateSettings)[]) {
    settings[field] = content[LINK_KEYS[field]];
  }
  return clampSettings({ ...DEFAULT_SETTINGS, ...(settings as Partial<BaseplateSettings>) });
}

/**
 * Settings to open the generator with: those of the shared link in the page address when
 * there is one, otherwise the last settings stored in this browser (kept as a link too),
 * otherwise the defaults.
 */
export function openingSettings(pageQuery: string, stored: string | null): BaseplateSettings {
  return decodeSettings(pageQuery) ?? (stored === null ? null : decodeSettings(stored)) ?? DEFAULT_SETTINGS;
}

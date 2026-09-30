import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, decodeSettings, encodeSettings, openingSettings, readShareLink, type BaseplateSettings } from "../src";

// Settings codec (spec v1, entry point 2): baseplate settings ↔ share link query string.

/** Settings in cells mode, the only mode of the app before the drawer mode (#10). */
const CELLS: BaseplateSettings = { ...DEFAULT_SETTINGS, sizeMode: "cells" };

describe("share link round trip", () => {
  it("gives back the same settings: settings → link → settings", () => {
    const drawer: BaseplateSettings = {
      ...DEFAULT_SETTINGS,
      drawerWidth: 512.5,
      drawerDepth: 333,
      drawerGap: 0.5,
      alignment: "bl",
      layerHeight: 0.28,
      lineWidth: 0.6,
    };
    expect(decodeSettings(encodeSettings(drawer))).toEqual(drawer);
    const cells: BaseplateSettings = { ...CELLS, columns: 7, rows: 5, marginWidth: 12.5, marginDepth: 30, alignment: "r" };
    expect(decodeSettings(encodeSettings(cells))).toEqual(cells);
    const screwed: BaseplateSettings = { ...DEFAULT_SETTINGS, screws: true, screwShank: 3.5, screwHead: 7.2, holeGap: 0.3 };
    expect(decodeSettings(encodeSettings(screwed))).toEqual(screwed);
    const flush: BaseplateSettings = { ...DEFAULT_SETTINGS, pocketProfile: "flush" };
    expect(decodeSettings(encodeSettings(flush))).toEqual(flush);
    const advanced: BaseplateSettings = { ...DEFAULT_SETTINGS, cellSize: 36.5, outerRadius: 0, bottomChamfer: 0.8 };
    expect(decodeSettings(encodeSettings(advanced))).toEqual(advanced);
    const unclipped: BaseplateSettings = { ...DEFAULT_SETTINGS, clips: false };
    expect(decodeSettings(encodeSettings(unclipped))).toEqual(unclipped);
    expect(decodeSettings(encodeSettings(DEFAULT_SETTINGS))).toEqual(DEFAULT_SETTINGS);
  });
});

describe("share link content", () => {
  it("carries v=1 and only the settings that differ from the v1 defaults", () => {
    // The default drawer of v1: nothing but the version.
    expect(encodeSettings(DEFAULT_SETTINGS)).toBe("v=1");
    expect(encodeSettings({ ...DEFAULT_SETTINGS, drawerWidth: 512.5, drawerGap: 2, alignment: "t" })).toBe("v=1&w=512.5&al=t&gap=2");
    expect(encodeSettings({ ...CELLS, columns: 6, layerHeight: 0.28 })).toBe("v=1&mode=cells&cx=6&lh=0.28");
    expect(encodeSettings({ ...CELLS, marginWidth: 10, marginDepth: 4.5 })).toBe("v=1&mode=cells&mx=10&my=4.5");
    expect(encodeSettings({ ...DEFAULT_SETTINGS, screws: true, screwShank: 4, screwHead: 8, holeGap: 0.3 })).toBe("v=1&sc=1&ss=4&sh=8&tol=0.3");
    // The hybrid pocket profile is the v1 default: only the flush one is written.
    expect(encodeSettings({ ...DEFAULT_SETTINGS, pocketProfile: "flush" })).toBe("v=1&pr=flush");
    expect(encodeSettings({ ...DEFAULT_SETTINGS, pocketProfile: "hybrid" })).toBe("v=1");
    expect(encodeSettings({ ...DEFAULT_SETTINGS, cellSize: 30, outerRadius: 0, bottomChamfer: 1.5 })).toBe("v=1&cs=30&or=0&ch=1.5");
    // The diameters and the hole gap are kept when the screws are off: turning them back on finds them again.
    expect(encodeSettings({ ...DEFAULT_SETTINGS, screwShank: 4 })).toBe("v=1&ss=4");
    // The clips are on by default (#22): only turning them off is written.
    expect(encodeSettings({ ...DEFAULT_SETTINGS, clips: false })).toBe("v=1&cl=0");
  });

  it("writes the settings brought into their ranges", () => {
    expect(encodeSettings({ ...DEFAULT_SETTINGS, drawerWidth: 2000, drawerGap: -1 })).toBe("v=1&w=1000&gap=0");
  });
});

describe("frozen v1 links", () => {
  it("a bare v1 link holds the defaults of the v1 table of the spec", () => {
    expect(readShareLink("v=1")).toEqual({
      mode: "drawer",
      w: 400,
      d: 280,
      cx: 4,
      cy: 3,
      mx: 0,
      my: 0,
      al: "c",
      pr: "hybrid",
      sc: false,
      ss: 3,
      sh: 6,
      cl: true,
      cs: 42,
      tol: 0.5,
      or: 4,
      ch: 0,
      gap: 1,
      lh: 0.2,
      lw: 0.4,
    });
  });

  it("a given v1 link always gives the same settings", () => {
    const link =
      "v=1&mode=cells&w=512.5&d=300&cx=7&cy=5&mx=12.5&my=30&al=tr&pr=flush&sc=1&ss=4&sh=8&cs=40&tol=0.3&or=2&ch=0.6&gap=2&lh=0.28&lw=0.6";
    expect(readShareLink(link)).toEqual({
      mode: "cells",
      w: 512.5,
      d: 300,
      cx: 7,
      cy: 5,
      mx: 12.5,
      my: 30,
      al: "tr",
      pr: "flush",
      sc: true,
      ss: 4,
      sh: 8,
      // `cl` came into the v1 table with the clips (#22), before v1 was published: on by default.
      cl: true,
      cs: 40,
      tol: 0.3,
      or: 2,
      ch: 0.6,
      gap: 2,
      lh: 0.28,
      lw: 0.6,
    });
    const settings: BaseplateSettings = {
      sizeMode: "cells",
      drawerWidth: 512.5,
      drawerDepth: 300,
      drawerGap: 2,
      columns: 7,
      rows: 5,
      marginWidth: 12.5,
      marginDepth: 30,
      alignment: "tr",
      // `pr` was in the v1 table from the start; the engine reads it since the flush profile (#12).
      pocketProfile: "flush",
      screws: true,
      screwShank: 4,
      screwHead: 8,
      holeGap: 0.3,
      clips: true,
      // `cs`, `or` and `ch` were in the v1 table from the start; the engine reads them since the advanced settings (#13).
      cellSize: 40,
      outerRadius: 2,
      bottomChamfer: 0.6,
      layerHeight: 0.28,
      lineWidth: 0.6,
    };
    expect(decodeSettings(link)).toEqual(settings);
    // The leading "?" of a page address is accepted.
    expect(decodeSettings(`?${link}`)).toEqual(settings);
  });

  it("a bare v1 link is the default drawer, 400 × 280 mm", () => {
    expect(decodeSettings("v=1")).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings("v=1")?.sizeMode).toBe("drawer");
  });

  it("links written before the drawer mode keep their meaning: a number of cells, without margin", () => {
    // Until #10, every link said `mode=cells` (#8).
    expect(decodeSettings("v=1&mode=cells&cx=3&cy=2")).toEqual({ ...CELLS, columns: 3, rows: 2 });
    expect(decodeSettings("v=1&mode=cells")).toEqual(CELLS);
  });
});

describe("reading any link", () => {
  it("ignores unknown keys", () => {
    expect(decodeSettings("v=1&mode=cells&cx=6&magnets=1&utm_source=forum")).toEqual({ ...CELLS, columns: 6 });
  });

  it("brings values out of range back into their range", () => {
    expect(decodeSettings("v=1&cx=0&cy=99&lh=0.05&lw=3")).toEqual({ ...DEFAULT_SETTINGS, columns: 1, rows: 24, layerHeight: 0.12, lineWidth: 1.2 });
    expect(decodeSettings("v=1&w=5000&d=10&gap=9&mx=-3&my=900")).toEqual({
      ...DEFAULT_SETTINGS,
      drawerWidth: 1000,
      drawerDepth: 42,
      drawerGap: 5,
      marginWidth: 0,
      marginDepth: 500,
    });
    // Whole numbers of cells: a value in between is rounded.
    expect(decodeSettings("v=1&cx=6.6")?.columns).toBe(7);
    expect(decodeSettings("v=1&cs=100&or=-2&ch=4")).toMatchObject({ cellSize: 80, outerRadius: 0, bottomChamfer: 3 });
    const link = readShareLink("v=1&w=5000&d=10&mx=-3&gap=9&tol=2");
    expect(link).toMatchObject({ w: 1000, d: 42, mx: 0, gap: 5, tol: 1 });
  });

  it("reads the clips off from `cl=0`, on otherwise", () => {
    expect(decodeSettings("v=1&cl=0")).toEqual({ ...DEFAULT_SETTINGS, clips: false });
    expect(decodeSettings("v=1&cl=1")).toEqual(DEFAULT_SETTINGS);
    expect(decodeSettings("v=1&cl=maybe")).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps the screw head at least as wide as the shank", () => {
    expect(readShareLink("v=1&ss=5&sh=4")).toMatchObject({ ss: 5, sh: 5 });
    expect(decodeSettings("v=1&ss=5&sh=4")).toMatchObject({ screwShank: 5, screwHead: 5 });
  });

  it("takes the default for a value it cannot read, and accepts a decimal comma", () => {
    expect(decodeSettings("v=1&cx=abc&cy=&lh=0,28")).toEqual({ ...DEFAULT_SETTINGS, layerHeight: 0.28 });
    expect(readShareLink("v=1&mode=shelf&al=middle&sc=maybe")).toMatchObject({ mode: "drawer", al: "c", sc: false });
    expect(decodeSettings("v=1&pr=rebuilt")).toEqual(DEFAULT_SETTINGS);
    // Plain decimals only: no hexadecimal, exponent or Infinity.
    expect(decodeSettings("v=1&cx=0x10&cy=1e1&lw=Infinity")).toEqual(DEFAULT_SETTINGS);
  });

  it("is not a share link without a version", () => {
    expect(decodeSettings("")).toBeNull();
    expect(decodeSettings("?utm_source=forum")).toBeNull();
    expect(decodeSettings("cx=6")).toBeNull();
    expect(decodeSettings("v=abc&cx=6")).toBeNull();
    expect(decodeSettings("v=0&cx=6")).toBeNull();
  });

  it("reads a link of a version newer than it knows with the latest one", () => {
    expect(decodeSettings("v=7&mode=cells&cx=6")).toEqual({ ...CELLS, columns: 6 });
  });
});

describe("settings on opening", () => {
  // The last settings are stored as a link too, in this browser.
  const stored = encodeSettings({ ...CELLS, columns: 9, rows: 2 });

  it("a shared link wins over the stored settings", () => {
    expect(openingSettings("?v=1&mode=cells&cx=5&cy=5", stored)).toEqual({ ...CELLS, columns: 5, rows: 5 });
  });

  it("without a shared link, the stored settings come back", () => {
    expect(openingSettings("", stored)).toEqual({ ...CELLS, columns: 9, rows: 2 });
    expect(openingSettings("?utm_source=forum", stored)).toEqual({ ...CELLS, columns: 9, rows: 2 });
  });

  it("with neither, or unreadable stored settings, the defaults", () => {
    expect(openingSettings("", null)).toEqual(DEFAULT_SETTINGS);
    expect(openingSettings("", "{corrupted")).toEqual(DEFAULT_SETTINGS);
  });
});

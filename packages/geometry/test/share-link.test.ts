import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, decodeSettings, encodeSettings, openingSettings, readShareLink, type BaseplateSettings } from "../src";

// Settings codec (spec v1, entry point 2): baseplate settings ↔ share link query string.

describe("share link round trip", () => {
  it("gives back the same settings: settings → link → settings", () => {
    const settings: BaseplateSettings = { columns: 7, rows: 5, layerHeight: 0.28, lineWidth: 0.6 };
    expect(decodeSettings(encodeSettings(settings))).toEqual(settings);
    expect(decodeSettings(encodeSettings(DEFAULT_SETTINGS))).toEqual(DEFAULT_SETTINGS);
  });
});

describe("share link content", () => {
  it("carries v=1 and only the settings that differ from the v1 defaults", () => {
    // The engine builds from a number of cells until the drawer mode lands (#10): the
    // link says so, since the v1 default mode is `drawer`.
    expect(encodeSettings(DEFAULT_SETTINGS)).toBe("v=1&mode=cells");
    expect(encodeSettings({ ...DEFAULT_SETTINGS, columns: 6, layerHeight: 0.28 })).toBe("v=1&mode=cells&cx=6&lh=0.28");
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
      cs: 40,
      tol: 0.3,
      or: 2,
      ch: 0.6,
      gap: 2,
      lh: 0.28,
      lw: 0.6,
    });
    expect(decodeSettings(link)).toEqual({ columns: 7, rows: 5, layerHeight: 0.28, lineWidth: 0.6 });
    // The leading "?" of a page address is accepted.
    expect(decodeSettings(`?${link}`)).toEqual({ columns: 7, rows: 5, layerHeight: 0.28, lineWidth: 0.6 });
  });
});

describe("reading any link", () => {
  it("ignores unknown keys", () => {
    expect(decodeSettings("v=1&mode=cells&cx=6&magnets=1&utm_source=forum")).toEqual({ ...DEFAULT_SETTINGS, columns: 6 });
  });

  it("brings values out of range back into their range", () => {
    expect(decodeSettings("v=1&cx=0&cy=99&lh=0.05&lw=3")).toEqual({ columns: 1, rows: 24, layerHeight: 0.12, lineWidth: 1.2 });
    // Whole numbers of cells: a value in between is rounded.
    expect(decodeSettings("v=1&cx=6.6")?.columns).toBe(7);
    const link = readShareLink("v=1&w=5000&d=10&mx=-3&gap=9&tol=2");
    expect(link).toMatchObject({ w: 1000, d: 42, mx: 0, gap: 5, tol: 1 });
  });

  it("keeps the screw head at least as wide as the shank", () => {
    expect(readShareLink("v=1&ss=5&sh=4")).toMatchObject({ ss: 5, sh: 5 });
  });

  it("takes the default for a value it cannot read, and accepts a decimal comma", () => {
    expect(decodeSettings("v=1&cx=abc&cy=&lh=0,28")).toEqual({ ...DEFAULT_SETTINGS, layerHeight: 0.28 });
    expect(readShareLink("v=1&mode=shelf&al=middle&sc=maybe")).toMatchObject({ mode: "drawer", al: "c", sc: false });
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
    expect(decodeSettings("v=7&mode=cells&cx=6")).toEqual({ ...DEFAULT_SETTINGS, columns: 6 });
  });
});

describe("settings on opening", () => {
  // The last settings are stored as a link too, in this browser.
  const stored = encodeSettings({ ...DEFAULT_SETTINGS, columns: 9, rows: 2 });

  it("a shared link wins over the stored settings", () => {
    expect(openingSettings("?v=1&mode=cells&cx=5&cy=5", stored)).toEqual({ ...DEFAULT_SETTINGS, columns: 5, rows: 5 });
  });

  it("without a shared link, the stored settings come back", () => {
    expect(openingSettings("", stored)).toEqual({ ...DEFAULT_SETTINGS, columns: 9, rows: 2 });
    expect(openingSettings("?utm_source=forum", stored)).toEqual({ ...DEFAULT_SETTINGS, columns: 9, rows: 2 });
  });

  it("with neither, or unreadable stored settings, the defaults", () => {
    expect(openingSettings("", null)).toEqual(DEFAULT_SETTINGS);
    expect(openingSettings("", "{corrupted")).toEqual(DEFAULT_SETTINGS);
  });
});

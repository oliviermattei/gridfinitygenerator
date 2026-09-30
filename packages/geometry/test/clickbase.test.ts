import { describe, expect, it } from "vitest";
import {
  BASEPLATE_TYPES,
  MARGIN_SHAPES,
  clampSettings,
  clickbaseOf,
  generateBaseplate,
  generateTestKit,
  pieceMesh,
  type BaseplateSettings,
  type BuildPlate,
} from "../src/index";
import { HYBRID_PROFILE } from "../src/pocket-profile";
import { areaOutside, badEdges, checkMesh, inSection } from "./support/measure";

// The CLICKbase type of baseplate (#27, ADR 0015), observed through the public interface: in
// the wall of each side of a pocket, two lamellas cut free by a slit hold a bin by an ergot bent
// into the pocket. The bench, and the measures of CLICKbase Refined, are in prototypes/clickbase.

const TOLERANCE_MM = 0.001;
const CLICKBASE: Partial<BaseplateSettings> = { baseplateType: "clickbase" };
const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** From the centre of a cell of 42 mm: the vertical pocket wall, the back of a lamella, the back of its slit. */
const WALL_MM = 18.85;
const LAMELLA_BACK_MM = 19.65;
const SLIT_BACK_MM = 20.15;
/** Face of the ergot: the wall less its protrusion of 0.5 mm. */
const ERGOT_MM = 18.35;
/** The foot of a standard bin, 0.25 mm narrower than the wall. */
const FOOT_MM = 18.6;

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

const cells = (columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> => ({
  sizeMode: "cells",
  columns,
  rows,
  ...settings,
});

/**
 * Where the material of a section starts along a ray from `from`, stepping 0.005 mm: the
 * pocket wall seen from the centre of a cell.
 */
function wallAlong(contours: [number, number][][], [x, y]: [number, number], [dx, dy]: [number, number]): number {
  let d = 0;
  while (d < 30 && !inSection(contours, [x + dx * d, y + dy * d])) d += 0.005;
  return d;
}

describe("the CLICKbase setting", () => {
  it("is the fourth type of baseplate", () => {
    expect(BASEPLATE_TYPES).toEqual(["normal", "tray", "skeleton", "clickbase"]);
    expect(clampSettings(CLICKBASE).baseplateType).toBe("clickbase");
  });

  it("puts two lamellas of 12 mm on each side of a cell of 42 mm, one alone in the middle under 34 mm", () => {
    const at = (cellSize: number) => {
      const { centres, length } = clickbaseOf(cellSize, HYBRID_PROFILE, 0.2);
      return { centres: [...centres], length };
    };
    expect(at(42)).toEqual({ centres: [-10.5, 10.5], length: 12 });
    expect(at(80)).toEqual({ centres: [-20, 20], length: 12 });
    // From 4.5 mm off the middle to 0.5 mm before the rounded corner of the pocket.
    expect(at(36)).toEqual({ centres: [-9, 9], length: 9 });
    expect(at(34)).toEqual({ centres: [-8.5, 8.5], length: 8 });
    expect(at(33)).toEqual({ centres: [0], length: 12 });
    expect(at(20)).toEqual({ centres: [0], length: 11 });
  });

  it("prints the lamellas on a base of one layer, from the foot of the vertical wall rounded up to the layer", () => {
    expect(clickbaseOf(42, HYBRID_PROFILE, 0.2)).toMatchObject({ protrusion: 0.5, grip: 0.25, base: 0.2, bottom: 1.2 });
    expect(clickbaseOf(42, HYBRID_PROFILE, 0.12)).toMatchObject({ base: 0.24, bottom: 1.08 });
    expect(clickbaseOf(42, HYBRID_PROFILE, 0.28)).toMatchObject({ base: 0.28, bottom: 1.12 });
  });
});

describe("a CLICKbase", () => {
  it("cuts a lamella free behind the pocket wall, bends its ergot into the pocket, and keeps the middle of each side", async () => {
    const heights = [0.1, 1.1, 1.5, 2.2, 3.8, 4.3];
    const [normal, clickbase] = await Promise.all([generateBaseplate(cells(2, 2), "final"), generateBaseplate(cells(2, 2, CLICKBASE), "final")]);
    const [open, clicked] = await Promise.all([checkMesh(normal.mesh, heights), checkMesh(clickbase.mesh, heights)]);
    expect(clicked.status).toBe("NoError");
    expect(badEdges(clickbase.mesh)).toBe(0);
    expectWithin(clickbase.stats.dimensions.height, 4.6);
    const section = (z: number) => clicked.sections.get(z) ?? [];
    // Along the +Y side of cell (0, 0), centred on (−21, −21): u along the side, v from the centre.
    const at = (u: number, v: number): [number, number] => [-21 + u, -21 + v];
    // Out of the ergot, 6 mm off the middle: the lamella, 0.8 mm, then its slit, 0.5 mm.
    expectWithin(wallAlong(section(1.5), at(6, 0), [0, 1]), WALL_MM, 0.01);
    expect(inSection(section(1.5), at(6, (WALL_MM + LAMELLA_BACK_MM) / 2))).toBe(true);
    expect(inSection(section(1.5), at(6, (LAMELLA_BACK_MM + SLIT_BACK_MM) / 2))).toBe(false);
    expect(inSection(section(1.5), at(6, SLIT_BACK_MM + 0.05))).toBe(true);
    // In the middle of the ergot, 10.5 mm off the middle: the wall 0.5 mm into the pocket, over the foot of a bin.
    expectWithin(wallAlong(section(1.5), at(10.5, 0), [0, 1]), ERGOT_MM, 0.01);
    expectWithin(FOOT_MM - wallAlong(section(1.5), at(10.5, 0), [0, 1]), 0.25, 0.01);
    expectWithin(wallAlong(open.sections.get(1.5) ?? [], at(10.5, 0), [0, 1]), WALL_MM, 0.01);
    // Back into the wall at 45° above z = 2.0: 0.2 mm left at 2.2.
    expectWithin(wallAlong(section(2.2), at(10.5, 0), [0, 1]), WALL_MM - 0.3, 0.01);
    // Under the lamella (it starts at 1.2 mm): the recess, then the web, then the slit.
    expect(inSection(section(1.1), at(6, 19.1))).toBe(false);
    expect(inSection(section(1.1), at(6, 19.3))).toBe(true);
    expect(inSection(section(1.1), at(6, 19.5))).toBe(false);
    // The base, one layer, is whole.
    expect(inSection(section(0.1), at(6, (LAMELLA_BACK_MM + SLIT_BACK_MM) / 2))).toBe(true);
    // The slit goes up through the upper slope of the pocket, whose top flat stays whole.
    expect(inSection(open.sections.get(3.8) ?? [], at(6, 19.9))).toBe(true);
    expect(inSection(section(3.8), at(6, 19.9))).toBe(false);
    expect(await areaOutside(open.sections.get(4.3) ?? [], section(4.3))).toBeLessThan(0.01);
    // The middle of each side, 4.5 mm either way, is the open baseplate's: room for a clip or a number.
    for (const u of [-4.4, 0, 4.4]) expect(inSection(section(1.5), at(u, 19.9))).toBe(true);
    // Two lamellas on each of the 4 sides of the 4 cells, the outline's included; the magnet stays.
    expect(inSection(section(1.5), at(-6, 19.9))).toBe(false);
    expect(inSection(section(1.5), [-21 + 6, 21 + 19.9])).toBe(false);
    expect(clickbase.stats.magnets).toBe(normal.stats.magnets);
    expect(clickbase.stats.volume as number).toBeLessThan(normal.stats.volume as number);
  });

  it("follows the flush profile: the lamella starts at the foot of its vertical wall", async () => {
    const flush = await generateBaseplate(cells(2, 2, { ...CLICKBASE, pocketProfile: "flush" }), "final");
    const { status, sections } = await checkMesh(flush.mesh, [0.7, 0.9, 1.5]);
    expect(status).toBe("NoError");
    expect(badEdges(flush.mesh)).toBe(0);
    expectWithin(flush.stats.dimensions.height, 4.25);
    const at = (u: number, v: number): [number, number] => [-21 + u, -21 + v];
    expect(inSection(sections.get(0.7) ?? [], at(6, 19.1))).toBe(false);
    expect(inSection(sections.get(0.9) ?? [], at(6, 19.1))).toBe(true);
    expectWithin(wallAlong(sections.get(1.5) ?? [], at(10.5, 0), [0, 1]), ERGOT_MM, 0.01);
  });

  it("keeps the lamellas off a side on the outline that the bottom chamfer would open", async () => {
    // Without a margin, the slit of a side on the outline has 0.85 mm of skin behind it; a
    // chamfer of 1 mm leaves 0.05 mm at the top of the base: that side has no lamella.
    const chamfered = await generateBaseplate(cells(2, 2, { ...CLICKBASE, bottomChamfer: 1 }), "final");
    const { status, sections } = await checkMesh(chamfered.mesh, [1.5]);
    expect(status).toBe("NoError");
    const section = sections.get(1.5) ?? [];
    // The +Y side of cell (0, 1), on the outline: whole. Its −Y side, inside: a slit.
    expect(inSection(section, [-21 + 6, 21 + 19.9])).toBe(true);
    expect(inSection(section, [-21 + 6, 21 - 19.9])).toBe(false);
  });

  it("gives the test kit no lamella: it tries the pockets of an open baseplate", async () => {
    const [open, clickbase] = await Promise.all([generateTestKit({}, "final"), generateTestKit(CLICKBASE, "final")]);
    expect(clickbase.stats.volume).toBe(open.stats.volume);
  });

  it("previews the slits only, straight, from the base up", async () => {
    const preview = await generateBaseplate(cells(2, 2, CLICKBASE), "preview");
    const { status, sections } = await checkMesh(preview.mesh, [1.1, 1.5]);
    expect(status).toBe("NoError");
    expect(badEdges(preview.mesh)).toBe(0);
    const at = (u: number, v: number): [number, number] => [-21 + u, -21 + v];
    expect(inSection(sections.get(1.5) ?? [], at(6, 19.9))).toBe(false);
    expect(inSection(sections.get(1.1) ?? [], at(6, 19.1))).toBe(true);
    expectWithin(wallAlong(sections.get(1.5) ?? [], at(10.5, 0), [0, 1]), WALL_MM, 0.01);
  });
});

describe("a CLICKbase cut for the build plate", () => {
  /** The stretches of the lamellas along a side, from its middle, for a cell size. */
  const lamellas = (cellSize: number) => {
    const { centres, length } = clickbaseOf(cellSize, HYBRID_PROFILE, 0.2);
    return centres.map((c) => [c - length / 2, c + length / 2] as const);
  };

  it("keeps its clips in the middle of the sides, between the lamellas, and no slot of a clip meets a slit", async () => {
    const bare = { magnets: false, buildPlate: PLATE_256 };
    const [clipped, unclipped, normalClipped, normalUnclipped] = await Promise.all([
      generateBaseplate(CLICKBASE, "final", bare),
      generateBaseplate({ ...CLICKBASE, clips: false }, "final", bare),
      generateBaseplate({}, "final", bare),
      generateBaseplate({ clips: false }, "final", bare),
    ]);
    expect(clipped.stats.pieces).toBe(4);
    expect(clipped.stats.clips).toBe(15);
    expect(clipped.layout.clips?.placements.every(({ offset }) => offset === 0)).toBe(true);
    expect(clipped.layout.clips?.slot.length).toBeLessThanOrEqual(8);
    // Each slot takes exactly what it takes from the open baseplate: it meets no lamella.
    const slots = (normalUnclipped.stats.volume as number) - (normalClipped.stats.volume as number);
    expectWithin((unclipped.stats.volume as number) - (clipped.stats.volume as number), slots, 0.05);
    for (const piece of clipped.pieces) {
      const mesh = pieceMesh(clipped, piece);
      expect((await checkMesh(mesh)).status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
    }
  });

  it.each<[number, number]>([
    [42, 0],
    [36, 0],
    [30, 9],
  ])("in cells of %i mm, moves each clip %i mm off the middle, clear of the lamellas", async (cellSize, offset) => {
    const clickbase = await generateBaseplate(cells(6, 4, { ...CLICKBASE, cellSize }), "final", { buildPlate: { width: 3 * cellSize + 10, depth: 3 * cellSize + 10 } });
    const placements = clickbase.layout.clips?.placements ?? [];
    expect(placements.length).toBeGreaterThan(0);
    const length = clickbase.layout.clips?.slot.length ?? 0;
    for (const placement of placements) {
      expect(Math.abs(placement.offset)).toBe(offset);
      const [from, to] = [placement.offset - length / 2, placement.offset + length / 2];
      for (const [start, end] of lamellas(cellSize)) expect(to <= start || from >= end).toBe(true);
    }
    expect((await checkMesh(clickbase.mesh)).status).toBe("NoError");
  });

  it("has no clips in cells of 20 mm: a lamella takes the whole side", async () => {
    const clickbase = await generateBaseplate(cells(8, 4, { ...CLICKBASE, cellSize: 20 }), "final", { buildPlate: { width: 90, depth: 90 } });
    expect(clickbase.stats.pieces).toBeGreaterThan(1);
    expect(clickbase.stats.clips).toBe(0);
  });

  it("keeps whole the side where a piece has its number, when the digits would reach a lamella", async () => {
    // 4 × 2 cells of 30 mm on a plate of 70 mm: two pieces of 2 × 2, each with its number under
    // the +X side of its first cell, where the single lamella of a cell of 30 mm lies.
    const clickbase = await generateBaseplate(cells(4, 2, { ...CLICKBASE, cellSize: 30 }), "final", { buildPlate: { width: 70, depth: 70 } });
    expect(clickbase.stats.pieces).toBe(2);
    const section = (await checkMesh(clickbase.mesh, [1.5])).sections.get(1.5) ?? [];
    // Slits at 13.9 mm from the centre of a cell of 30 mm (15 − 2.15 + 0.8 + 0.25), 4 mm off the
    // middle of the side, out of the ergot.
    for (const x of [-45, 15]) {
      expect(inSection(section, [x + 13.9, -15 + 4])).toBe(true);
      expect(inSection(section, [x + 30 - 13.9, -15 + 4])).toBe(false);
    }
  });
});

describe("the same CLICKbase by the cell bricks and by the booleans (ADR 0004)", () => {
  const cases: [string, Partial<BaseplateSettings>, BuildPlate | null][] = [
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer, ${marginShape}`, { marginShape }, null]),
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer cut, ${marginShape}`, { marginShape }, PLATE_256]),
    ["chamfered and screwed, cut", { bottomChamfer: 0.8, screws: true }, PLATE_256],
    ["whole cells of the margin, cut", cells(3, 3, { marginWidth: 100, marginDepth: 90, marginShape: "cells" }), { width: 150, depth: 150 }],
    ["flush, truncated cells of 30 mm", { pocketProfile: "flush", cellSize: 30, marginShape: "cells" }, null],
    ["cells of 20 mm at 0.12 mm layers", cells(5, 4, { cellSize: 20, layerHeight: 0.12 }), null],
    ["cells of 36 mm at 0.28 mm layers, flush", cells(4, 3, { cellSize: 36, layerHeight: 0.28, pocketProfile: "flush" }), null],
    ["cells of 80 mm, sharp corners, 3 mm chamfer, large screws, cut", cells(3, 3, { cellSize: 80, outerRadius: 0, bottomChamfer: 3, screws: true, screwHead: 8, holeGap: 1 }), { width: 200, depth: 200 }],
  ];
  it.each(cases)("%s", async (_, settings, buildPlate) => {
    const input = { ...settings, ...CLICKBASE };
    const [bricks, booleans] = await Promise.all([
      generateBaseplate(input, "final", { strategy: "bricks", buildPlate }),
      generateBaseplate(input, "final", { strategy: "boolean", buildPlate }),
    ]);
    expectWithin(bricks.stats.volume as number, booleans.stats.volume as number, 0.1);
    expect(bricks.stats.pieces).toBe(booleans.stats.pieces);
    expect(bricks.stats.clips).toBe(booleans.stats.clips);
    for (const piece of bricks.pieces) {
      const mesh = pieceMesh(bricks, piece);
      expect((await checkMesh(mesh)).status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
    }
  });

  it("builds a single row by the booleans", async () => {
    const row = await generateBaseplate(cells(1, 4, CLICKBASE), "final");
    expect((await checkMesh(row.mesh)).status).toBe("NoError");
    expect(badEdges(row.mesh)).toBe(0);
    const open = await generateBaseplate(cells(1, 4), "final");
    expect(row.stats.volume as number).toBeLessThan(open.stats.volume as number);
  });
});

import { describe, expect, it } from "vitest";
import {
  BASEPLATE_TYPES,
  MARGIN_SHAPES,
  clampSettings,
  generateBaseplate,
  generateTestKit,
  pieceMesh,
  trayFloorOf,
  type BaseplateSettings,
  type BuildPlate,
} from "../src/index";
import { HYBRID_OPENINGS, checkMesh, holeReach, inSection, pocketOpening } from "./support/measure";

// Types of baseplate (#25, ADR 0013), observed through the public interface only: the open
// grid (normal, by default) and the tray, the same grid raised on a solid floor under its
// pockets, a gap under the foot of a seated bin. The bench is in prototypes/tray.

const TOLERANCE_MM = 0.001;
/** 3 layers of 0.2 mm of floor, and a layer of gap under the foot of a bin: the pockets rise 0.8 mm. */
const FLOOR_MM = 0.6;
const GAP_MM = 0.2;
const LIFT_MM = FLOOR_MM + GAP_MM;
const PLATE_256: BuildPlate = { width: 256, depth: 256 };
const TRAY: Partial<BaseplateSettings> = { baseplateType: "tray" };

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
 * Area of the polygon of a rounded square, as the final quality builds it: 32 segments per
 * quarter circle, a vertex at each end of each arc.
 */
const roundedSquarePolygon = (side: number, radius: number) => side * side - 4 * radius * radius * (1 - 16 * Math.sin(Math.PI / 64));

describe("the type setting", () => {
  it("offers the open grid by default, the tray, the skeleton and CLICKbase; an unknown type falls back to the default", () => {
    expect(BASEPLATE_TYPES).toEqual(["normal", "tray", "skeleton", "clickbase"]);
    expect(clampSettings({}).baseplateType).toBe("normal");
    expect(clampSettings(TRAY).baseplateType).toBe("tray");
    expect(clampSettings({ baseplateType: "skeleton" }).baseplateType).toBe("skeleton");
    expect(clampSettings({ baseplateType: "clickbase" }).baseplateType).toBe("clickbase");
    expect(clampSettings({ baseplateType: "hollow" as never }).baseplateType).toBe("normal");
  });

  it("rounds the floor and the gap up to the layer", () => {
    expect(trayFloorOf(0.2)).toEqual({ thickness: 0.6, gap: 0.2 });
    expect(trayFloorOf(0.12)).toEqual({ thickness: 0.6, gap: 0.24 });
    expect(trayFloorOf(0.28)).toEqual({ thickness: 0.84, gap: 0.28 });
  });
});

describe("a tray is the open baseplate raised on a floor", () => {
  it("adds, on the default drawer, the grid raised by the floor and the gap, less the pockets down to the floor", async () => {
    const [normal, tray] = await Promise.all([generateBaseplate({}, "final"), generateBaseplate(TRAY, "final")]);
    expectWithin(normal.stats.dimensions.height, 4.6);
    expectWithin(tray.stats.dimensions.height, 4.6 + LIFT_MM);
    expect(tray.stats.layers).toBe(27);
    expectWithin(tray.stats.dimensions.width, normal.stats.dimensions.width);
    expectWithin(tray.stats.dimensions.depth, normal.stats.dimensions.depth);
    // Under the grid (9 × 6 cells of 42 mm), 0.8 mm of material more, but in each pocket,
    // from the floor up to the foot of the raised profile: a rounded square of 36.3 mm, 1.15 mm
    // radius, 0.2 mm high. The margin (the frame of crossbars) does not change, nor do the
    // magnet holes, under the crossings.
    const { columns, rows, cellSize } = tray.layout;
    const grid = columns * cellSize * rows * cellSize;
    const pocketFoot = roundedSquarePolygon(cellSize - 2 * 2.85, 4 - 2.85);
    const added = grid * LIFT_MM - columns * rows * pocketFoot * GAP_MM;
    expectWithin((tray.stats.volume as number) - (normal.stats.volume as number), added, 1);
    // 78.42 → 140.41 cm³: × 1.79 (prototypes/tray).
    expectWithin((normal.stats.volume as number) / 1000, 78.42, 0.01);
    expectWithin((tray.stats.volume as number) / 1000, 140.41, 0.01);
    expect(tray.layout.magnets).toEqual(normal.layout.magnets);
    expect(tray.stats.magnets).toBe(40);
  });

  it("has a solid floor under each pocket, then the pocket at its foot, then the profile raised by 0.8 mm", async () => {
    const heights = [0.3, 0.7, ...HYBRID_OPENINGS.map(({ z }) => z + LIFT_MM)];
    const { mesh } = await generateBaseplate(cells(2, 2, TRAY), "final");
    const { status, sections } = await checkMesh(mesh, heights);
    expect(status).toBe("NoError");
    const centres: [number, number][] = [
      [-21, -21],
      [21, -21],
      [-21, 21],
      [21, 21],
    ];
    for (const centre of centres) {
      // In the floor: the centre of the cell is material.
      expect(inSection(sections.get(0.3) ?? [], centre)).toBe(true);
      // Between the floor and the foot of a bin: the pocket, at the inset of its foot.
      expectWithin(pocketOpening(sections.get(0.7) ?? [], centre)?.width, 42 - 2 * 2.85);
      for (const { z, inset } of HYBRID_OPENINGS) {
        expectWithin(pocketOpening(sections.get(z + LIFT_MM) ?? [], centre)?.width, 42 - 2 * inset);
      }
    }
  });

  it("raises the flush profile the same way, and follows the layer height", async () => {
    const flush = await generateBaseplate(cells(2, 2, { ...TRAY, pocketProfile: "flush" }), "final");
    expectWithin(flush.stats.dimensions.height, 4.25 + LIFT_MM);
    const { sections } = await checkMesh(flush.mesh, [0.7, 0.8 + 0.35, 0.8 + 1.6]);
    expectWithin(pocketOpening(sections.get(0.7) ?? [], [21, 21])?.width, 42 - 2 * 2.85);
    expectWithin(pocketOpening(sections.get(0.8 + 0.35) ?? [], [21, 21])?.width, 42 - 2 * 2.5);
    expectWithin(pocketOpening(sections.get(0.8 + 1.6) ?? [], [21, 21])?.width, 42 - 2 * 2.15);
    const coarse = await generateBaseplate(cells(2, 2, { ...TRAY, layerHeight: 0.28 }), "preview");
    expectWithin(coarse.stats.dimensions.height, 4.6 + 0.84 + 0.28);
    expect(coarse.stats.layers).toBe(21);
  });

  it("keeps the magnet holes and the screw holes under the crossings, through the height of the floor", async () => {
    const { mesh, layout } = await generateBaseplate(cells(3, 3, { ...TRAY, screws: true }), "final");
    // 3 × 3: 4 inner crossings, all screwed; a 3 × 2 gets magnets.
    expect(layout.screws).toHaveLength(4);
    const { sections } = await checkMesh(mesh, [0.3, 3.5]);
    const screw = layout.screws[0] as [number, number];
    // The shank (3 mm + 0.5) at the height of the floor, the countersink under the seat of the
    // head, raised with the upper slope: 3.6 mm, where the open baseplate has its bore.
    expect(await holeReach(sections.get(0.3) ?? [], screw)).toBeCloseTo(1.75, 1);
    expect(await holeReach(sections.get(3.5) ?? [], screw)).toBeCloseTo(1.75 + 3.5 - (3.6 - 1.5), 1);
    const magnets = await generateBaseplate(cells(3, 2, TRAY), "final");
    expect(magnets.stats.magnets).toBe(2);
    const holes = await checkMesh(magnets.mesh, [0.3, 2.3]);
    const magnet = magnets.layout.magnets[0] as [number, number];
    expect(await holeReach(holes.sections.get(0.3) ?? [], magnet)).toBeCloseTo(3.25, 1);
    expect(inSection(holes.sections.get(2.3) ?? [], magnet)).toBe(true);
  });

  it("gives the test kit no floor: it tries the pockets of an open baseplate", async () => {
    const [open, tray] = await Promise.all([generateTestKit({}, "final"), generateTestKit(TRAY, "final")]);
    expect(tray.stats.volume).toBe(open.stats.volume);
  });
});

describe("a tray cut for the build plate, with clips", () => {
  it("takes as many clips as the open baseplate, their slots up to the foot of its raised upper slope", async () => {
    const [normal, tray] = await Promise.all([
      generateBaseplate({}, "preview", { buildPlate: PLATE_256 }),
      generateBaseplate(TRAY, "final", { buildPlate: PLATE_256 }),
    ]);
    expect(tray.stats.pieces).toBe(4);
    expect(tray.stats.clips).toBe(normal.stats.clips);
    expect(tray.stats.clips).toBe(15);
    expect(normal.layout.clips?.slot.top).toBe(2.8);
    expect(tray.layout.clips?.slot.top).toBe(3.6);
    expect((await checkMesh(tray.clip ?? { positions: new Float32Array(), indices: new Uint32Array() })).status).toBe("NoError");
    for (const piece of tray.pieces) expect((await checkMesh(pieceMesh(tray, piece))).status).toBe("NoError");
  });
});

describe("the same tray by the cell bricks and by the booleans (ADR 0004)", () => {
  const cases: [string, Partial<BaseplateSettings>, BuildPlate | null][] = [
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer, ${marginShape}`, { marginShape }, null]),
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer cut, ${marginShape}`, { marginShape }, PLATE_256]),
    ["chamfered and screwed, cut", { bottomChamfer: 0.8, screws: true }, PLATE_256],
    ["flush, truncated cells of 30 mm", { pocketProfile: "flush", cellSize: 30, marginShape: "cells" }, null],
    ["4 × 3 without margin, sharp corners", { sizeMode: "cells", columns: 4, rows: 3, outerRadius: 0 }, null],
  ];
  it.each(cases)("%s", async (_, settings, buildPlate) => {
    const input = { ...settings, ...TRAY };
    const [bricks, booleans] = await Promise.all([
      generateBaseplate(input, "final", { strategy: "bricks", buildPlate }),
      generateBaseplate(input, "final", { strategy: "boolean", buildPlate }),
    ]);
    expectWithin(bricks.stats.volume as number, booleans.stats.volume as number, 0.1);
    expect(bricks.stats.pieces).toBe(booleans.stats.pieces);
    for (const piece of bricks.pieces) expect((await checkMesh(pieceMesh(bricks, piece))).status).toBe("NoError");
  });
});

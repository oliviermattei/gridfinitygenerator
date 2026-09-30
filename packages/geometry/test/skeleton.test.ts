import { describe, expect, it } from "vitest";
import {
  MARGIN_SHAPES,
  clampSettings,
  generateBaseplate,
  generateTestKit,
  pieceMesh,
  skeletonOf,
  type BaseplateSettings,
  type BuildPlate,
} from "../src/index";
import { badEdges, checkMesh, inSection } from "./support/measure";

// The skeleton type of baseplate (#26, ADR 0014), observed through the public interface only:
// each muret between two crossings of the lattice is notched down to a low band, and a post
// around each crossing keeps the whole pocket profile. The bench is in prototypes/skeleton.

const TOLERANCE_MM = 0.001;
const SKELETON: Partial<BaseplateSettings> = { baseplateType: "skeleton" };
const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** The band at the default layer of 0.2 mm: 0.35 mm rounded up to 2 layers. */
const BAND_MM = 0.4;
/** Height of the hybrid profile, the top of the frame. */
const HEIGHT_MM = 4.6;
/** Arm of a post along its murets at the top of the frame: the corner radius of the pocket and 1 mm. */
const ARM_TOP_MM = 5;

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
 * How far the material of a section reaches from `from` along a direction: the first point,
 * stepping 0.005 mm from `start`, that is not in it.
 */
function reach(contours: [number, number][][], [x, y]: [number, number], [dx, dy]: [number, number], start = 0): number {
  let d = start;
  while (d < 30 && inSection(contours, [x + dx * d, y + dy * d])) d += 0.005;
  return d;
}

describe("the skeleton setting", () => {
  it("is a type of baseplate, and its band is 0.35 mm rounded up to the layer", () => {
    expect(clampSettings(SKELETON).baseplateType).toBe("skeleton");
    expect(skeletonOf(0.2)).toEqual({ band: 0.4 });
    expect(skeletonOf(0.12)).toEqual({ band: 0.36 });
    expect(skeletonOf(0.28)).toEqual({ band: 0.56 });
  });
});

describe("a skeleton is the open baseplate with its murets notched between the crossings", () => {
  it("halves the material of the default drawer, as high and as wide, with the same magnets", async () => {
    const [normal, skeleton] = await Promise.all([generateBaseplate({}, "final"), generateBaseplate(SKELETON, "final")]);
    expectWithin(skeleton.stats.dimensions.height, HEIGHT_MM);
    expectWithin(skeleton.stats.dimensions.width, normal.stats.dimensions.width);
    expectWithin(skeleton.stats.dimensions.depth, normal.stats.dimensions.depth);
    // 78.42 → 39.57 cm³: × 0.50 (prototypes/skeleton; extrabold's is × 0.44 of its own Normal).
    expectWithin((normal.stats.volume as number) / 1000, 78.42, 0.01);
    expectWithin((skeleton.stats.volume as number) / 1000, 39.57, 0.01);
    expect(skeleton.layout.magnets).toEqual(normal.layout.magnets);
    expect(skeleton.stats.magnets).toBe(40);
    expect(badEdges(skeleton.mesh)).toBe(0);
  });

  it("keeps the whole muret up to the band, then only the posts, 45° wider per millimetre down from the top", async () => {
    const heights = [BAND_MM - 0.05, BAND_MM + 0.05, 1, 3, 4.5];
    const [normal, skeleton] = await Promise.all([generateBaseplate(cells(2, 2), "final"), generateBaseplate(cells(2, 2, SKELETON), "final")]);
    const [open, notched] = await Promise.all([checkMesh(normal.mesh, heights), checkMesh(skeleton.mesh, heights)]);
    expect(notched.status).toBe("NoError");
    // Under the band, the section is the open baseplate's.
    const below = BAND_MM - 0.05;
    expect(inSection(notched.sections.get(below) ?? [], [0, 21])).toBe(true);
    expect(inSection(notched.sections.get(BAND_MM + 0.05) ?? [], [0, 21])).toBe(false);
    for (const z of [1, 3, 4.5]) {
      const section = notched.sections.get(z) ?? [];
      // The middle of an inner muret is notched, the open baseplate's is not.
      expect(inSection(open.sections.get(z) ?? [], [0, 21])).toBe(true);
      expect(inSection(section, [0, 21])).toBe(false);
      // The post of the central crossing (beside its magnet hole) reaches 5 mm along each muret at
      // the top of the frame, and 1 mm farther per millimetre down.
      const from = z < 2.2 ? 3.3 : 0;
      for (const direction of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ] as [number, number][]) {
        expectWithin(reach(section, [0, 0], direction, from), ARM_TOP_MM + HEIGHT_MM - z, 0.01);
      }
      // The murets on the outline of the grid stay whole: a rim.
      expect(inSection(section, [41.9, 21])).toBe(true);
      expect(inSection(section, [21, -41.9])).toBe(true);
    }
  });

  it("follows the flush profile, the layer height and the cell size", async () => {
    const flush = await generateBaseplate(cells(2, 2, { ...SKELETON, pocketProfile: "flush" }), "final");
    const { status, sections } = await checkMesh(flush.mesh, [0.35, 0.45, 3]);
    expect(status).toBe("NoError");
    expectWithin(flush.stats.dimensions.height, 4.25);
    expect(inSection(sections.get(0.35) ?? [], [0, 21])).toBe(true);
    expect(inSection(sections.get(0.45) ?? [], [0, 21])).toBe(false);
    expectWithin(reach(sections.get(3) ?? [], [0, 0], [0, 1]), ARM_TOP_MM + 4.25 - 3, 0.01);
    // At 0.28 mm, a band of 2 layers: 0.56 mm.
    const coarse = await generateBaseplate(cells(2, 2, { ...SKELETON, layerHeight: 0.28, cellSize: 30 }), "final");
    const coarseSections = (await checkMesh(coarse.mesh, [0.5, 0.6])).sections;
    expect(inSection(coarseSections.get(0.5) ?? [], [0, 15])).toBe(true);
    expect(inSection(coarseSections.get(0.6) ?? [], [0, 15])).toBe(false);
  });

  it("keeps the posts around the screws, and the magnets in them", async () => {
    // 3 × 3: 4 inner crossings, all screwed; the bore of a 6 mm head (6.5 with the gap) leaves
    // the posts 1.85 mm along each muret at 4.5 mm, 3.45 mm at the seat of the heads.
    const screwed = await generateBaseplate(cells(3, 3, { ...SKELETON, screws: true }), "final");
    expect(screwed.stats.screws).toBe(4);
    const { sections } = await checkMesh(screwed.mesh, [2.9, 4.5]);
    const screw = screwed.layout.screws[0] as [number, number];
    expectWithin(reach(sections.get(4.5) ?? [], screw, [1, 0], 3.3), ARM_TOP_MM + HEIGHT_MM - 4.5, 0.01);
    expectWithin(reach(sections.get(2.9) ?? [], screw, [1, 0], 3.3), ARM_TOP_MM + HEIGHT_MM - 2.9, 0.01);
    expect(inSection(sections.get(4.5) ?? [], [screw[0] + 3.3, screw[1]])).toBe(true);
    // A magnet hole of 6.5 mm, 2.2 mm deep: 4.25 mm of post along each muret at its ceiling.
    const magnets = await generateBaseplate(cells(2, 2, SKELETON), "final");
    const magnet = (await checkMesh(magnets.mesh, [2.1])).sections.get(2.1) ?? [];
    expect(inSection(magnet, [0, 0])).toBe(false);
    expectWithin(reach(magnet, [0, 0], [0, 1], 3.3) - 3.25, ARM_TOP_MM + HEIGHT_MM - 2.1 - 3.25, 0.01);
  });

  it("gives the test kit no notch: it tries the pockets of an open baseplate", async () => {
    const [open, skeleton] = await Promise.all([generateTestKit({}, "final"), generateTestKit(SKELETON, "final")]);
    expect(skeleton.stats.volume).toBe(open.stats.volume);
  });
});

describe("a skeleton cut for the build plate", () => {
  it("takes no clips, whatever the setting: the middle of the murets is notched", async () => {
    const skeleton = await generateBaseplate({ ...SKELETON, clips: true }, "final", { buildPlate: PLATE_256 });
    expect(skeleton.stats.pieces).toBe(4);
    expect(skeleton.stats.clips).toBe(0);
    expect(skeleton.layout.clips).toBeNull();
    expect(skeleton.clip).toBeNull();
    for (const piece of skeleton.pieces) {
      const mesh = pieceMesh(skeleton, piece);
      expect((await checkMesh(mesh)).status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
    }
  });

  it("keeps whole the side of a cell where a piece has its number, which the band could not hold", async () => {
    // 4 × 2 cells on a plate of 100 mm: two pieces of 2 × 2, each with its number under the +X
    // side of its first cell, the muret between its two columns in its front row.
    const skeleton = await generateBaseplate(cells(4, 2, SKELETON), "final", { buildPlate: { width: 100, depth: 100 } });
    expect(skeleton.stats.pieces).toBe(2);
    const { sections } = await checkMesh(skeleton.mesh, [3]);
    const section = sections.get(3) ?? [];
    for (const x of [-42, 42]) {
      expect(inSection(section, [x, -21])).toBe(true);
      expect(inSection(section, [x, 21])).toBe(false);
    }
  });
});

describe("the same skeleton by the cell bricks and by the booleans (ADR 0004)", () => {
  const cases: [string, Partial<BaseplateSettings>, BuildPlate | null][] = [
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer, ${marginShape}`, { marginShape }, null]),
    ...MARGIN_SHAPES.map((marginShape): [string, Partial<BaseplateSettings>, BuildPlate | null] => [`default drawer cut, ${marginShape}`, { marginShape }, PLATE_256]),
    ["chamfered and screwed, cut", { bottomChamfer: 0.8, screws: true }, PLATE_256],
    ["whole cells of the margin, cut", cells(3, 3, { marginWidth: 100, marginDepth: 90, marginShape: "cells" }), { width: 150, depth: 150 }],
    ["flush, truncated cells of 30 mm", { pocketProfile: "flush", cellSize: 30, marginShape: "cells" }, null],
    ["cells of 20 mm at 0.12 mm layers", cells(5, 4, { cellSize: 20, layerHeight: 0.12 }), null],
    ["cells of 80 mm, sharp corners, 3 mm chamfer, large screws, cut", cells(3, 3, { cellSize: 80, outerRadius: 0, bottomChamfer: 3, screws: true, screwHead: 8, holeGap: 1 }), { width: 200, depth: 200 }],
  ];
  it.each(cases)("%s", async (_, settings, buildPlate) => {
    const input = { ...settings, ...SKELETON };
    const [bricks, booleans] = await Promise.all([
      generateBaseplate(input, "final", { strategy: "bricks", buildPlate }),
      generateBaseplate(input, "final", { strategy: "boolean", buildPlate }),
    ]);
    expectWithin(bricks.stats.volume as number, booleans.stats.volume as number, 0.1);
    expect(bricks.stats.pieces).toBe(booleans.stats.pieces);
    for (const piece of bricks.pieces) {
      const mesh = pieceMesh(bricks, piece);
      expect((await checkMesh(mesh)).status).toBe("NoError");
      expect(badEdges(mesh)).toBe(0);
    }
  });

  it("builds a single row by the booleans", async () => {
    const row = await generateBaseplate(cells(1, 4, SKELETON), "final");
    expect((await checkMesh(row.mesh)).status).toBe("NoError");
    expect(badEdges(row.mesh)).toBe(0);
    const open = await generateBaseplate(cells(1, 4), "final");
    expect(row.stats.volume as number).toBeLessThan(open.stats.volume as number);
  });
});

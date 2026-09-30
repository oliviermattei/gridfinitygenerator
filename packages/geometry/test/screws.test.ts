import { describe, expect, it } from "vitest";
import { generateBaseplate, type BaseplateSettings, type Quality } from "../src/index";
import { areaOutside, checkMesh, pocketOpening, type Disc } from "./support/measure";

// Screw holes (#11), observed through the public interface only. Layout of extrabold
// v0.5.21 (docs/research/gridfinity-baseplate.md, A.4): one screw on each inner
// intersection of the grid, none on the border of the grid nor in the margin.

const TOLERANCE_MM = 0.001;
const HEIGHT_MM = 4.6;
/** Default diameters plus the default hole gap (0.5 mm): shank 3 mm, head 6 mm. */
const SHANK_HOLE_MM = 3.5;
const HEAD_HOLE_MM = 6.5;
/** Seat of the head at the default 0.2 mm layer: 14 layers, just under the upper slope (2.85 mm). */
const SEAT_MM = 2.8;

/**
 * Heights of reference of the hybrid pocket profile (ADR 0002), as in public-api.test.ts:
 * the pocket opening is a rounded square of side 42 − 2·inset and radius 4 − inset.
 */
const POCKET_OPENINGS: readonly { z: number; inset: number }[] = [
  { z: 0.1, inset: 2.85 },
  { z: 0.7, inset: 2.5 },
  { z: 1.5, inset: 2.15 },
  { z: 2.0, inset: 2.15 },
  { z: 3.5, inset: 1.5 },
  { z: 4.5, inset: 0.5 },
];
const roundedSquareArea = (side: number, radius: number) => side * side - (4 - Math.PI) * radius * radius;

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** A grid of cells without margin, screws on. */
function screwedCells(columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> {
  return { sizeMode: "cells", columns, rows, screws: true, ...settings };
}

/** Positions sorted along X then Y, to compare them regardless of order. */
function sorted(positions: readonly (readonly [number, number])[]): [number, number][] {
  return positions.map(([x, y]) => [x, y] as [number, number]).sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
}

function expectPositions(actual: readonly (readonly [number, number])[], expected: [number, number][]) {
  const [a, b] = [sorted(actual), sorted(expected)];
  expect(a.length).toBe(b.length);
  a.forEach(([x, y], i) => {
    expectWithin(x, (b[i] as [number, number])[0]);
    expectWithin(y, (b[i] as [number, number])[1]);
  });
}

/** Every combination of the given X and Y coordinates. */
const grid = (xs: number[], ys: number[]) => xs.flatMap((x) => ys.map((y) => [x, y] as [number, number]));
const steps = (first: number, count: number, step = 42) => Array.from({ length: count }, (_, k) => first + k * step);

describe("layout of the screws, as extrabold: the inner intersections of the grid", () => {
  it("puts a screw on each inner intersection of the grid, none on its border", async () => {
    const { layout, stats } = await generateBaseplate(screwedCells(4, 3), "preview");
    // 168 × 126 mm centred on the origin: inner grid lines at x = −42, 0, 42 and y = −21, 21.
    expectPositions(layout.screws, grid([-42, 0, 42], [-21, 21]));
    expect(stats.screws).toBe(6);
  });

  it("gives a single screw to 2 × 2 cells, in the centre, and none to a single row or column", async () => {
    const square = await generateBaseplate(screwedCells(2, 2), "preview");
    expectPositions(square.layout.screws, [[0, 0]]);
    expect(square.stats.screws).toBe(1);
    for (const [columns, rows] of [
      [1, 5],
      [5, 1],
      [1, 1],
    ] as const) {
      const { layout, stats } = await generateBaseplate(screwedCells(columns, rows), "preview");
      expect(layout.screws).toEqual([]);
      expect(stats.screws).toBe(0);
    }
  });

  it("follows the grid wherever it is aligned, and never puts a screw in the margin", async () => {
    // Default drawer: 9 × 6 cells centred in 10.5 and 13.5 mm margins, (9 − 1) × (6 − 1) screws.
    const centred = await generateBaseplate({ screws: true }, "preview");
    expect(centred.stats.screws).toBe(40);
    expectPositions(centred.layout.screws, grid(steps(-147, 8), steps(-84, 5)));

    // Pushed to the back left: the whole margin is on the right (21 mm) and at the front (27 mm).
    const backLeft = await generateBaseplate({ screws: true, alignment: "tl" }, "preview");
    expect(backLeft.layout.margins).toEqual({ left: 0, right: 21, back: 0, front: 27 });
    expectPositions(backLeft.layout.screws, grid(steps(-199.5 + 42, 8), steps(-139.5 + 27 + 42, 5)));
  });

  it("has no screw hole when the screws are off, the default: a magnet hole on each inner intersection instead", async () => {
    const { layout, stats, mesh } = await generateBaseplate({ sizeMode: "cells", columns: 4, rows: 3 }, "preview");
    expect(layout.screws).toEqual([]);
    expect(stats.screws).toBe(0);
    expectPositions(layout.magnets, grid([-42, 0, 42], [-21, 21]));
    // At the foot of the frame: the outline, one pocket per cell and the 6 magnet holes.
    const { sections } = await checkMesh(mesh, [0.5]);
    expect(sections.get(0.5)).toHaveLength(1 + 12 + 6);
    // Above the magnets (2.20 mm), nothing else.
    expect((await checkMesh(mesh, [2.5])).sections.get(2.5)).toHaveLength(1 + 12);
  });
});

describe.each<Quality>(["preview", "final"])("countersunk screw holes, %s quality", (quality) => {
  it("drills one hole at each screw, and nowhere else", async () => {
    const { layout, mesh } = await generateBaseplate(screwedCells(4, 3), quality);
    const { sections } = await checkMesh(mesh, [0.5]);
    const contours = sections.get(0.5) ?? [];
    // The outline, one pocket per cell and one hole per screw.
    expect(contours).toHaveLength(1 + 12 + 6);
    for (const position of layout.screws) {
      expectWithin(pocketOpening(contours, [...position])?.width, SHANK_HOLE_MM);
    }
  });

  it.each<[shank: number, head: number, gap: number]>([
    [3, 6, 0.5],
    [4, 7, 0.3],
    [2.5, 5, 0],
  ])("measures shank %s mm and head %s mm plus a hole gap of %s mm", async (screwShank, screwHead, holeGap) => {
    const { layout, mesh } = await generateBaseplate(screwedCells(3, 3, { screwShank, screwHead, holeGap }), quality);
    const { sections } = await checkMesh(mesh, [0.5, SEAT_MM + 0.1]);
    for (const position of layout.screws) {
      const shank = pocketOpening(sections.get(0.5) ?? [], [...position]);
      expectWithin(shank?.width, screwShank + holeGap);
      expectWithin(shank?.depth, screwShank + holeGap);
      const head = pocketOpening(sections.get(SEAT_MM + 0.1) ?? [], [...position]);
      expectWithin(head?.width, screwHead + holeGap);
      expectWithin(head?.depth, screwHead + holeGap);
    }
  });

  it.each<[shank: number, head: number, gap: number]>([
    [3, 6, 0.5],
    [4, 7, 0.3],
  ])("countersinks at 90° a shank of %s mm under a head of %s mm (gap %s): 2 mm narrower per millimetre down", async (screwShank, screwHead, holeGap) => {
    const { layout, mesh } = await generateBaseplate(screwedCells(3, 3, { screwShank, screwHead, holeGap }), quality);
    const depths = [0.25, 0.5, 1, 1.4];
    const { sections } = await checkMesh(
      mesh,
      depths.map((depth) => SEAT_MM - depth),
    );
    for (const depth of depths) {
      const hole = pocketOpening(sections.get(SEAT_MM - depth) ?? [], [...(layout.screws[0] as [number, number])]);
      expectWithin(hole?.width, screwHead + holeGap - 2 * depth);
    }
  });

  it.each<[layerHeight: number, seat: number]>([
    [0.2, 2.8],
    [0.28, 2.8],
    [0.12, 2.76],
  ])("seats the head at %s mm layers on a whole number of layers under the upper slope: %s mm", async (layerHeight, seat) => {
    const { layout, mesh, stats } = await generateBaseplate(screwedCells(3, 3, { layerHeight }), quality);
    const { sections } = await checkMesh(mesh, [seat - 0.01, seat + 0.01]);
    const centre = [...(layout.screws[0] as [number, number])] as [number, number];
    // Just under the seat, the countersink; just over it, the full head.
    expectWithin(pocketOpening(sections.get(seat - 0.01) ?? [], centre)?.width, HEAD_HOLE_MM - 0.02);
    expectWithin(pocketOpening(sections.get(seat + 0.01) ?? [], centre)?.width, HEAD_HOLE_MM);
    // The frame keeps its height: no base under it.
    expectWithin(stats.dimensions.height, HEIGHT_MM);
  });
});

describe("the head is not seated on the pocket slopes", () => {
  // The head bears on its countersink, under the upper 45° slope, where the bins are
  // seated; above the seat, only the bore the head goes down through is cut.
  it.each<[number, number]>([
    [2, 2],
    [4, 3],
  ])("keeps every pocket of %i × %i cells intact up to the seat of the heads", async (columns, rows) => {
    const { mesh } = await generateBaseplate(screwedCells(columns, rows), "final");
    const below = POCKET_OPENINGS.filter(({ z }) => z < SEAT_MM);
    const { sections } = await checkMesh(
      mesh,
      below.map(({ z }) => z),
    );
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++) {
        const centre: [number, number] = [(i - (columns - 1) / 2) * 42, (j - (rows - 1) / 2) * 42];
        for (const { z, inset } of below) {
          const opening = pocketOpening(sections.get(z) ?? [], centre);
          const side = 42 - 2 * inset;
          expectWithin(opening?.width, side);
          expectWithin(opening?.depth, side);
          expectWithin(opening?.area, roundedSquareArea(side, 4 - inset), 0.02);
        }
      }
  });

  it.each<[shank: number, head: number, gap: number]>([
    [3, 6, 0.5],
    [4, 7, 0.3],
  ])("takes away, at every height of reference, nothing but the holes (shank %s, head %s, gap %s), and adds no material", async (screwShank, screwHead, holeGap) => {
    const settings = screwedCells(4, 3, { screwShank, screwHead, holeGap });
    // Without the magnet holes, which the crossings without a screw get (magnets.test.ts).
    const [plain, screwed] = await Promise.all([
      generateBaseplate({ ...settings, screws: false }, "final", { magnets: false }),
      generateBaseplate(settings, "final", { magnets: false }),
    ]);
    const heights = POCKET_OPENINGS.map(({ z }) => z);
    const [before, after] = await Promise.all([checkMesh(plain.mesh, heights), checkMesh(screwed.mesh, heights)]);
    // Up to the seat, the countersink; above it, the bore of the head, at most.
    const bores: Disc[] = screwed.layout.screws.map(([x, y]) => ({ x, y, radius: (screwHead + holeGap) / 2 + 0.01 }));
    for (const z of heights) {
      const [a, b] = [before.sections.get(z) ?? [], after.sections.get(z) ?? []];
      expect(await areaOutside(a, b, bores), `material lost outside the bores at z = ${z}`).toBeLessThan(1e-3);
      expect(await areaOutside(b, a), `material added at z = ${z}`).toBeLessThan(1e-3);
    }
    expect(after.volume).toBeLessThan(before.volume);
  });
});

describe("with screws, the mesh", () => {
  const VOLUME_TOLERANCE_MM3 = 0.1;

  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each<[string, Partial<BaseplateSettings>]>([
      ["2 × 2", screwedCells(2, 2)],
      ["3 × 2", screwedCells(3, 2)],
      ["2 × 5", screwedCells(2, 5)],
      ["7 × 4", screwedCells(7, 4)],
      ["the default drawer (margin all around)", { screws: true }],
      ["a drawer aligned to the front right", { screws: true, alignment: "br", drawerWidth: 300, drawerDepth: 200 }],
      ["large screws in 0.12 mm layers", screwedCells(3, 3, { screwShank: 6, screwHead: 8, holeGap: 1, layerHeight: 0.12 })],
    ])("is valid and the same by cell bricks and by booleans: %s", async (_, settings) => {
      const [fast, fallback] = await Promise.all([
        generateBaseplate(settings, quality),
        generateBaseplate(settings, quality, { strategy: "boolean" }),
      ]);
      const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
      expect(fastCheck.status).toBe("NoError");
      expect(fallbackCheck.status).toBe("NoError");
      expectWithin(fastCheck.volume, fallbackCheck.volume, VOLUME_TOLERANCE_MM3);
      expect(fastCheck.genus).toBe(fallbackCheck.genus);
      expect(fast.layout).toEqual(fallback.layout);
      expect(fast.stats.screws).toBe(fallback.stats.screws);
    });
  });

  it("counts the 361 screws of a 20 × 20 (its final mesh is checked by performance.test.ts)", async () => {
    const { stats } = await generateBaseplate(screwedCells(20, 20), "preview");
    expect(stats.screws).toBe(361);
  });
});

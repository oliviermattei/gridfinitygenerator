import { describe, expect, it } from "vitest";
import { STANDARD_CELL_SIZE_MM, generateBaseplate, generateTestKit, type BaseplateSettings, type Quality } from "../src/index";
import { checkMesh, pocketOpening } from "./support/measure";

// Pocket profiles (#12) and the test kit, observed through the public interface only.
// Reference values: docs/research/gridfinity-baseplate.md, section C.2 (an extrabold export
// measured with trimesh) for the flush profile, ADR 0002 for the hybrid one.

const TOLERANCE_MM = 0.001;
const HYBRID_HEIGHT_MM = 4.6;
const FLUSH_HEIGHT_MM = 4.25;

/**
 * Flush profile (extrabold, no vertical step under the pocket), bottom to top: 45° 0.7,
 * vertical 1.8, then 45° up to the 0.4 mm flat, 4.25 mm high. The pocket opening at a
 * height is a rounded square of side 42 − 2·inset and radius 4 − inset.
 */
const FLUSH_OPENINGS: readonly { z: number; inset: number }[] = [
  { z: 0.01, inset: 2.84 }, // 36.32 mm, measured on the extrabold export at the foot
  { z: 0.35, inset: 2.5 }, // middle of the lower 45° chamfer: 37.0 mm
  { z: 1.6, inset: 2.15 }, // 37.70 mm, measured on the extrabold export
  { z: 3.0, inset: 1.65 }, // upper 45° chamfer: 38.7 mm
  { z: 4.24, inset: 0.41 }, // 41.18 mm, measured on the extrabold export just under the flat
];

/** Hybrid profile (ADR 0002): the vertical 0.35 mm step, then the same slopes 0.35 mm higher. */
const HYBRID_OPENINGS: readonly { z: number; inset: number }[] = [
  { z: 0.1, inset: 2.85 },
  { z: 0.7, inset: 2.5 },
  { z: 1.5, inset: 2.15 },
  { z: 3.5, inset: 1.5 },
  { z: 4.5, inset: 0.5 },
];

const roundedSquareArea = (side: number, radius: number) => side * side - (4 - Math.PI) * radius * radius;
/** A 32-segment quarter circle falls short of the true arc by less than 0.01 mm² here. */
const FINAL_AREA_TOLERANCE_MM2 = 0.02;

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** Bounding box of a horizontal section of the mesh. */
function sectionBox(contours: [number, number][][]) {
  const xs = contours.flat().map(([x]) => x);
  const ys = contours.flat().map(([, y]) => y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Checks the pocket around `centre` against a profile's openings, in the sections of `sections`. */
function expectOpenings(
  sections: Map<number, [number, number][][]>,
  centre: [number, number],
  openings: readonly { z: number; inset: number }[],
  quality: Quality,
) {
  for (const { z, inset } of openings) {
    const opening = pocketOpening(sections.get(z) ?? [], centre);
    const side = STANDARD_CELL_SIZE_MM - 2 * inset;
    expectWithin(opening?.width, side);
    expectWithin(opening?.depth, side);
    if (quality === "final") expectWithin(opening?.area, roundedSquareArea(side, 4 - inset), FINAL_AREA_TOLERANCE_MM2);
  }
}

const flushCells = (columns: number, rows: number, settings: Partial<BaseplateSettings> = {}): Partial<BaseplateSettings> => ({
  sizeMode: "cells",
  columns,
  rows,
  pocketProfile: "flush",
  ...settings,
});

describe("pocket profile setting", () => {
  it("is the hybrid profile by default, 4.60 mm high", async () => {
    const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "preview");
    expectWithin(stats.dimensions.height, HYBRID_HEIGHT_MM);
  });
});

describe.each<Quality>(["preview", "final"])("flush profile, %s quality", (quality) => {
  describe.each<[number, number]>([
    [1, 1],
    [1, 3],
    [3, 2],
  ])("%i × %i cells", (columns, rows) => {
    it("is 4.25 mm high, as reported and as measured, a closed mesh with one open pocket per cell", async () => {
      const baseplate = await generateBaseplate(flushCells(columns, rows), quality);
      expectWithin(baseplate.stats.dimensions.height, FLUSH_HEIGHT_MM);
      expectWithin(baseplate.stats.dimensions.width, columns * 42);
      expectWithin(baseplate.stats.dimensions.depth, rows * 42);
      const check = await checkMesh(baseplate.mesh);
      expect(check.status).toBe("NoError");
      expect(check.genus).toBe(columns * rows);
      expectWithin(check.bounds.min[2], 0);
      expectWithin(check.bounds.max[2], FLUSH_HEIGHT_MM);
    });

    it("cuts every pocket to the openings measured on the extrabold export (36.32 / 37.70 / 41.18 mm)", async () => {
      const baseplate = await generateBaseplate(flushCells(columns, rows), quality);
      const { sections } = await checkMesh(
        baseplate.mesh,
        FLUSH_OPENINGS.map(({ z }) => z),
      );
      for (let i = 0; i < columns; i++)
        for (let j = 0; j < rows; j++) {
          const centre: [number, number] = [(i - (columns - 1) / 2) * 42, (j - (rows - 1) / 2) * 42];
          expectOpenings(sections, centre, FLUSH_OPENINGS, quality);
        }
    });
  });

  it.each<[string, Partial<BaseplateSettings>]>([
    ["2 × 2", flushCells(2, 2)],
    ["7 × 4", flushCells(7, 4)],
    ["the default drawer (margin all around)", { pocketProfile: "flush" }],
    ["4 × 3 with screws", flushCells(4, 3, { screws: true })],
    ["a drawer aligned to the back left, with screws", { pocketProfile: "flush", screws: true, alignment: "tl", drawerWidth: 300 }],
  ])("is the same by cell bricks and by booleans: %s", async (_, settings) => {
    const [fast, fallback] = await Promise.all([
      generateBaseplate(settings, quality),
      generateBaseplate(settings, quality, { strategy: "boolean" }),
    ]);
    const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
    expect(fastCheck.status).toBe("NoError");
    expect(fallbackCheck.status).toBe("NoError");
    expectWithin(fastCheck.volume, fallbackCheck.volume, 0.1);
    expect(fastCheck.genus).toBe(fallbackCheck.genus);
    expectWithin(fastCheck.bounds.max[2], FLUSH_HEIGHT_MM);
  });
});

describe("flush profile, statistics", () => {
  it("matches the volume of a 1 × 1 cell worked out from the flush profile", async () => {
    const wall: [number, number][] = [
      [0, 2.85],
      [0.7, 2.15],
      [2.5, 2.15],
      [4.25, 0.4],
    ];
    const opening = (inset: number) => roundedSquareArea(42 - 2 * inset, 4 - inset);
    // The inset is linear on each segment, so the area is quadratic: Simpson's rule is exact.
    let pocket = 0;
    for (let i = 1; i < wall.length; i++) {
      const [z0, i0] = wall[i - 1] as [number, number];
      const [z1, i1] = wall[i] as [number, number];
      pocket += ((z1 - z0) / 6) * (opening(i0) + 4 * opening((i0 + i1) / 2) + opening(i1));
    }
    const block = roundedSquareArea(42, 4) * FLUSH_HEIGHT_MM;
    const { stats } = await generateBaseplate(flushCells(1, 1), "final");
    expectWithin(stats.volume ?? Number.NaN, block - pocket, 0.5);
  });

  it.each([
    { layerHeight: 0.2, layers: 22 }, // 21.25 layers: the last one is partial
    { layerHeight: 0.12, layers: 36 }, // 35.4 layers
    { layerHeight: 0.28, layers: 16 }, // 15.2 layers
  ])("gives the height in layers of the 4.25 mm: $layers at $layerHeight mm", async ({ layerHeight, layers }) => {
    const { stats } = await generateBaseplate(flushCells(2, 2, { layerHeight }), "preview");
    expect(stats.layers).toBe(layers);
    // The profile follows the standard: never rounded to the layer.
    expectWithin(stats.dimensions.height, FLUSH_HEIGHT_MM);
  });
});

describe("flush profile with a margin", () => {
  it("keeps the margin 2.00 mm high under the 4.25 mm grid", async () => {
    const { mesh } = await generateBaseplate({ pocketProfile: "flush" }, "preview");
    const { sections, status, bounds } = await checkMesh(mesh, [1.9, 2.1, 4.2]);
    expect(status).toBe("NoError");
    expectWithin(bounds.max[2], FLUSH_HEIGHT_MM);
    const width = (z: number) => {
      const box = sectionBox(sections.get(z) ?? []);
      return [box.x1 - box.x0, box.y1 - box.y0];
    };
    // The default drawer less its gap, 399 × 279 mm; above the margin, the 9 × 6 grid.
    expect(width(1.9).map((value) => Math.round(value * 1000) / 1000)).toEqual([399, 279]);
    expect(width(2.1).map((value) => Math.round(value * 1000) / 1000)).toEqual([378, 252]);
    expect(width(4.2).map((value) => Math.round(value * 1000) / 1000)).toEqual([378, 252]);
  });
});

describe("flush profile with a margin, in thicker layers", () => {
  it("rounds the margin up to the layer: 2.24 mm at 0.28 mm, still under the 4.25 mm grid", async () => {
    const { mesh } = await generateBaseplate({ pocketProfile: "flush", layerHeight: 0.28 }, "preview");
    const { sections, status } = await checkMesh(mesh, [2.23, 2.25]);
    expect(status).toBe("NoError");
    const width = (z: number) => {
      const box = sectionBox(sections.get(z) ?? []);
      return Math.round((box.x1 - box.x0) * 1000) / 1000;
    };
    expect(width(2.23)).toBe(399);
    expect(width(2.25)).toBe(378);
  });
});

describe("flush profile with screws", () => {
  /** Default diameters plus the default hole gap: head 6 + 0.5 mm. */
  const HEAD_HOLE_MM = 6.5;

  it.each<[layerHeight: number, seat: number]>([
    [0.2, 2.4],
    [0.28, 2.24],
    [0.12, 2.4],
  ])("seats the head at %s mm layers on a whole number of layers under the upper slope (2.5 mm): %s mm", async (layerHeight, seat) => {
    const { layout, mesh } = await generateBaseplate(flushCells(3, 3, { screws: true, layerHeight }), "final");
    const { sections } = await checkMesh(mesh, [seat - 0.01, seat + 0.01]);
    const centre = [...(layout.screws[0] as [number, number])] as [number, number];
    expectWithin(pocketOpening(sections.get(seat - 0.01) ?? [], centre)?.width, HEAD_HOLE_MM - 0.02);
    expectWithin(pocketOpening(sections.get(seat + 0.01) ?? [], centre)?.width, HEAD_HOLE_MM);
  });

  it("keeps every pocket intact up to the seat of the heads", async () => {
    const { mesh, stats } = await generateBaseplate(flushCells(4, 3, { screws: true }), "final");
    expect(stats.screws).toBe(6);
    const below = FLUSH_OPENINGS.filter(({ z }) => z < 2.4);
    const { sections } = await checkMesh(
      mesh,
      below.map(({ z }) => z),
    );
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) expectOpenings(sections, [(i - 1.5) * 42, (j - 1) * 42], below, "final");
    expectWithin(stats.dimensions.height, FLUSH_HEIGHT_MM);
  });
});

describe.each<Quality>(["preview", "final"])("test kit, %s quality", (quality) => {
  // 1 × 2 cells: the hybrid one at the front (−Y), the flush one at the back (+Y).
  const FRONT: [number, number] = [0, -21];
  const BACK: [number, number] = [0, 21];

  it("is a 1 × 2 baseplate, 42 × 84 mm, as high as its hybrid cell, without margin nor screw", async () => {
    const kit = await generateTestKit({}, quality);
    expect(kit.layout).toEqual({
      columns: 1,
      rows: 2,
      cellSize: STANDARD_CELL_SIZE_MM,
      margins: { left: 0, right: 0, back: 0, front: 0 },
      screws: [],
    });
    expectWithin(kit.stats.dimensions.width, 42);
    expectWithin(kit.stats.dimensions.depth, 84);
    expectWithin(kit.stats.dimensions.height, HYBRID_HEIGHT_MM);
    expect(kit.stats.screws).toBe(0);
    expect(kit.stats.pieces).toBe(1);
    expect(kit.stats.layers).toBe(23);
  });

  it("is a closed, valid mesh with one hybrid cell and one flush cell", async () => {
    const kit = await generateTestKit({}, quality);
    const heights = [...new Set([...HYBRID_OPENINGS, ...FLUSH_OPENINGS].map(({ z }) => z))];
    const check = await checkMesh(kit.mesh, heights);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(2);
    expectOpenings(check.sections, FRONT, HYBRID_OPENINGS.filter(({ z }) => z < FLUSH_HEIGHT_MM), quality);
    expectOpenings(check.sections, BACK, FLUSH_OPENINGS, quality);
  });

  it("joins the two heights with a 0.35 mm step on the muret between the cells", async () => {
    const kit = await generateTestKit({}, quality);
    const { sections } = await checkMesh(kit.mesh, [4.24, 4.26, 4.5]);
    // Under the top of the flush cell, the whole kit.
    const low = sectionBox(sections.get(4.24) ?? []);
    expectWithin(low.y0, -42);
    expectWithin(low.y1, 42);
    // Above it, only the hybrid cell, up to the line between the cells.
    for (const z of [4.26, 4.5]) {
      const high = sectionBox(sections.get(z) ?? []);
      expectWithin(high.y0, -42);
      expectWithin(high.y1, 0);
      expectWithin(high.x1 - high.x0, 42);
    }
    // The hybrid pocket keeps its profile up to its flat.
    expectOpenings(sections, FRONT, [{ z: 4.5, inset: 0.5 }], quality);
  });

  it("ignores the size, margin, alignment, profile and screws of the settings", async () => {
    const plain = await generateTestKit({}, quality);
    const odd = await generateTestKit(
      { sizeMode: "cells", columns: 5, rows: 4, marginWidth: 20, alignment: "tl", pocketProfile: "flush", screws: true },
      quality,
    );
    expect(odd.layout).toEqual(plain.layout);
    const [a, b] = await Promise.all([checkMesh(plain.mesh), checkMesh(odd.mesh)]);
    expectWithin(b.volume, a.volume, 0);
  });
});

describe("test kit, statistics", () => {
  it("measures its volume on the final mesh", async () => {
    const kit = await generateTestKit({}, "final");
    expectWithin(kit.stats.volume ?? Number.NaN, (await checkMesh(kit.mesh)).volume, 0.01);
    expect((await generateTestKit({}, "preview")).stats.volume).toBeNull();
  });

  it("gives the height in layers of its hybrid cell at the layer height of the settings", async () => {
    expect((await generateTestKit({ layerHeight: 0.28 }, "preview")).stats.layers).toBe(17);
  });
});

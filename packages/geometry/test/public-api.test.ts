import { describe, expect, it } from "vitest";
import {
  CELLS_PER_AXIS,
  STANDARD_CELL_SIZE_MM,
  generateBaseplate,
  serializeStl,
  type Quality,
} from "../src/index";
import { checkMesh, pocketOpeningWidth, readBinaryStl } from "./support/measure";

// Behaviour of the geometry engine, observed only through its public interface.
// Reference values: docs/research/gridfinity-baseplate.md (sections B and C),
// prototypes/geometry-perf/RESULTS.md (validation) and ADR 0002 (hybrid pocket profile).

const TOLERANCE_MM = 0.001;
const HEIGHT_MM = 4.6;

/** Expected pocket opening, measured across a cell through its centre (ADR 0002). */
const POCKET_OPENINGS: readonly { z: number; width: number }[] = [
  { z: 0.1, width: 36.3 }, // vertical muret foot, inset 2.85
  { z: 0.7, width: 37.0 }, // middle of the lower 45° chamfer
  { z: 1.5, width: 37.7 }, // vertical 1.8 mm, inset 2.15
  { z: 2.0, width: 37.7 },
  { z: 3.5, width: 39.0 }, // upper 45° chamfer
  { z: 4.5, width: 41.0 }, // just under the 0.4 mm flat
];

const SIZES: readonly [number, number][] = [
  [1, 1],
  [1, 4],
  [4, 1],
  [3, 2],
];

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** Cell centres of an nx × ny grid centred on the origin. */
function cellCentres(nx: number, ny: number): [number, number][] {
  const centres: [number, number][] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      centres.push([(i - (nx - 1) / 2) * STANDARD_CELL_SIZE_MM, (j - (ny - 1) / 2) * STANDARD_CELL_SIZE_MM]);
  return centres;
}

describe.each<Quality>(["preview", "final"])("generateBaseplate, %s quality", (quality) => {
  describe.each(SIZES)("%i × %i cells", (columns, rows) => {
    it("fills nx·42 × ny·42 × 4.60 mm, as reported and as measured on the mesh", async () => {
      const baseplate = await generateBaseplate({ columns, rows }, quality);
      const { dimensions } = baseplate.stats;
      expectWithin(dimensions.width, columns * 42);
      expectWithin(dimensions.depth, rows * 42);
      expectWithin(dimensions.height, HEIGHT_MM);

      const { bounds } = await checkMesh(baseplate.mesh);
      expectWithin(bounds.max[0] - bounds.min[0], columns * 42);
      expectWithin(bounds.max[1] - bounds.min[1], rows * 42);
      expectWithin(bounds.min[2], 0);
      expectWithin(bounds.max[2], HEIGHT_MM);
    });

    it("is a closed, valid mesh with one open pocket per cell", async () => {
      const baseplate = await generateBaseplate({ columns, rows }, quality);
      const check = await checkMesh(baseplate.mesh);
      expect(check.status).toBe("NoError");
      expect(check.volume).toBeGreaterThan(0);
      // A pocket open at the bottom is a hole through the frame: one handle per cell.
      expect(check.genus).toBe(columns * rows);
    });

    it("cuts every pocket to the hybrid profile, within 0.001 mm", async () => {
      const baseplate = await generateBaseplate({ columns, rows }, quality);
      const { sections } = await checkMesh(
        baseplate.mesh,
        POCKET_OPENINGS.map(({ z }) => z),
      );
      for (const centre of cellCentres(columns, rows)) {
        for (const { z, width } of POCKET_OPENINGS) {
          expectWithin(pocketOpeningWidth(sections.get(z) ?? [], centre), width);
        }
      }
    });

    it("lays out the grid without any margin", async () => {
      const { layout } = await generateBaseplate({ columns, rows }, quality);
      expect(layout).toEqual({
        columns,
        rows,
        cellSize: STANDARD_CELL_SIZE_MM,
        margins: { left: 0, right: 0, back: 0, front: 0 },
      });
    });
  });
});

describe("generateBaseplate settings", () => {
  it("accepts 1 to 24 cells per axis", () => {
    expect(CELLS_PER_AXIS).toEqual({ min: 1, max: 24 });
  });

  it("brings out-of-range cell counts back into range", async () => {
    const tooMany = await generateBaseplate({ columns: 99, rows: 0 }, "preview");
    expect([tooMany.layout.columns, tooMany.layout.rows]).toEqual([24, 1]);
    expectWithin(tooMany.stats.dimensions.width, 24 * 42);
    expectWithin(tooMany.stats.dimensions.depth, 42);

    const odd = await generateBaseplate({ columns: 2.6, rows: -3 }, "preview");
    expect([odd.layout.columns, odd.layout.rows]).toEqual([3, 1]);

    const invalid = await generateBaseplate({ columns: Number.NaN, rows: Number.POSITIVE_INFINITY }, "preview");
    expect([invalid.layout.columns, invalid.layout.rows]).toEqual([1, 24]);
  });

  it("uses fewer triangles for the preview than for the final quality", async () => {
    const preview = await generateBaseplate({ columns: 2, rows: 2 }, "preview");
    const final = await generateBaseplate({ columns: 2, rows: 2 }, "final");
    expect(preview.mesh.indices.length).toBeLessThan(final.mesh.indices.length);
  });
});

describe("serializeStl", () => {
  it("writes a binary STL that reads back with the same volume and dimensions", async () => {
    const baseplate = await generateBaseplate({ columns: 3, rows: 2 }, "final");
    const bytes = serializeStl(baseplate.mesh);
    const triangles = baseplate.mesh.indices.length / 3;
    expect(bytes.byteLength).toBe(84 + 50 * triangles);

    const original = await checkMesh(baseplate.mesh);
    const reread = await checkMesh(readBinaryStl(bytes));
    expect(reread.status).toBe("NoError");
    expectWithin(reread.volume, original.volume);
    for (const axis of [0, 1, 2] as const) {
      expectWithin(reread.bounds.min[axis], original.bounds.min[axis]);
      expectWithin(reread.bounds.max[axis], original.bounds.max[axis]);
    }
  });
});

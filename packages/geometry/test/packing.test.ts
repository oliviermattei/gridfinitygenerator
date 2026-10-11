import { describe, expect, it } from "vitest";
import { clipBlockOf, plateKeyOf, searchPacking, type Packing, type PackingItem, type PackingMode, type PackingProblem } from "../src/index";

// Rangement (#42, ADR 0024), observed through the public interface: rectangles laid on plates.

const PLATE_256 = { width: 256, depth: 256 };
const EPSILON = 1e-6;
/** A 1 × 1 bin: one cell of 42 mm, less the 0.5 mm gap of its foot. */
const BIN_1X1 = 41.5;

function items(count: number, width: number, depth: number, key = "all", prefix = "item"): PackingItem[] {
  return Array.from({ length: count }, (_, k) => ({ id: `${prefix}-${k}`, width, depth, key }));
}

/**
 * The rules of the rangement, checked plate by plate: every item once, as large as asked (turned
 * or not), within the plate, 5 mm (`gap`) from every other one, out of the excluded corner.
 */
function expectRules(problem: PackingProblem, packing: Packing, { corner = true } = {}) {
  const gap = problem.gap ?? 5;
  const byId = new Map(problem.items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  for (const plate of packing.plates) {
    for (const placed of plate.items) {
      const item = byId.get(placed.id)!;
      expect(item, placed.id).toBeDefined();
      expect(seen.has(placed.id), `${placed.id} placed twice`).toBe(false);
      seen.add(placed.id);
      expect(item.key).toBe(plate.key);
      const [width, depth] = placed.turned ? [item.depth, item.width] : [item.width, item.depth];
      expect(placed.width).toBeCloseTo(width, 6);
      expect(placed.depth).toBeCloseTo(depth, 6);
      expect(placed.x).toBeGreaterThanOrEqual(-EPSILON);
      expect(placed.y).toBeGreaterThanOrEqual(-EPSILON);
      expect(placed.x + placed.width).toBeLessThanOrEqual(problem.plate.width + EPSILON);
      expect(placed.y + placed.depth).toBeLessThanOrEqual(problem.plate.depth + EPSILON);
      const excluded = problem.excludedCorner;
      if (excluded && corner) {
        const out = placed.x >= excluded.width - EPSILON || placed.y >= excluded.depth - EPSILON;
        expect(out, `${placed.id} in the excluded corner`).toBe(true);
      }
    }
    for (const [i, a] of plate.items.entries())
      for (const b of plate.items.slice(i + 1)) {
        const apart =
          a.x + a.width + gap <= b.x + EPSILON ||
          b.x + b.width + gap <= a.x + EPSILON ||
          a.y + a.depth + gap <= b.y + EPSILON ||
          b.y + b.depth + gap <= a.y + EPSILON;
        expect(apart, `${a.id} and ${b.id} less than ${gap} mm apart`).toBe(true);
      }
  }
  expect([...seen, ...packing.unplaced].sort()).toEqual(problem.items.map((item) => item.id).sort());
}

describe("searchPacking", () => {
  it("lays 25 bins 1 × 1 on one plate of 256 × 256, the minimum possible", () => {
    const problem: PackingProblem = { items: items(25, BIN_1X1, BIN_1X1), plate: PLATE_256 };
    const result = searchPacking(problem);
    expectRules(problem, result.packing);
    expect(result.packing.plates).toHaveLength(1);
    expect(result.bound).toBe(1);
    expect(result.status).toBe("optimal");
  });

  it("proves 2 plates the minimum for 36 bins 1 × 1, which 5 mm apart take more than one", () => {
    const problem: PackingProblem = { items: items(36, BIN_1X1, BIN_1X1), plate: PLATE_256 };
    const result = searchPacking(problem);
    expectRules(problem, result.packing);
    expect(result.packing.plates).toHaveLength(2);
    expect(result.bound).toBe(2);
    expect(result.status).toBe("optimal");
  });

  it("keeps 5 mm between two objects and none at the border", () => {
    // Two halves of 125.5 mm fill 256 mm with exactly the gap between them; 126 mm do not.
    const tight: PackingProblem = { items: items(2, 125.5, 256), plate: PLATE_256 };
    expect(searchPacking(tight).packing.plates).toHaveLength(1);
    expectRules(tight, searchPacking(tight).packing);
    const loose: PackingProblem = { items: items(2, 126, 256), plate: PLATE_256 };
    expect(searchPacking(loose).packing.plates).toHaveLength(2);
  });

  it("turns an object a quarter when it fits only that way", () => {
    const problem: PackingProblem = { items: [{ id: "long", width: 250, depth: 100, key: "all" }], plate: { width: 120, depth: 256 } };
    const [plate] = searchPacking(problem).packing.plates;
    expect(plate!.items[0]).toMatchObject({ turned: true, width: 100, depth: 250 });
    expectRules(problem, searchPacking(problem).packing);
  });

  it("centres the content of each plate", () => {
    const problem: PackingProblem = { items: items(1, 100, 50), plate: PLATE_256 };
    const [plate] = searchPacking(problem).packing.plates;
    expect(plate!.items[0]).toMatchObject({ x: 78, y: 103 });
  });

  it("keeps out of the excluded corner of a Bambu bed when there is room, beside it", () => {
    const corner = { width: 18, depth: 28 };
    // Centred, 240 mm wide, the content would start at x = 8, in the corner: it moves to x = 18.
    const problem: PackingProblem = { items: items(1, 220, 240), plate: PLATE_256, excludedCorner: corner };
    const [plate] = searchPacking(problem).packing.plates;
    expectRules(problem, searchPacking(problem).packing);
    expect(plate!.items[0]!.x).toBeGreaterThanOrEqual(18);
    // 25 bins 1 × 1 still take one plate.
    const bins: PackingProblem = { items: items(25, BIN_1X1, BIN_1X1), plate: PLATE_256, excludedCorner: corner };
    expect(searchPacking(bins).packing.plates).toHaveLength(1);
    expectRules(bins, searchPacking(bins).packing);
  });

  it("keeps half a millimetre clear of the excluded corner: Bambu Studio refuses an object touching it", () => {
    // Centred, 220 mm wide, the content would start at x = 18, against the corner (#43, sliced by the CLI).
    const problem: PackingProblem = { items: items(1, 220, 240), plate: PLATE_256, excludedCorner: { width: 18, depth: 28 } };
    const [plate] = searchPacking(problem).packing.plates;
    expect(plate!.items[0]!.x).toBeCloseTo(18.5, 9);
  });

  it("lays the objects around the excluded corner when the content fills the plate", () => {
    // 256 × 100 and 200 × 150 fill 256 × 255: moved as one, they enter the corner wherever they
    // lie; packed again, the smaller one right of the corner and the wide one behind it, they do not.
    const corner = { width: 18, depth: 28 };
    const problem: PackingProblem = {
      items: [...items(1, 256, 100, "all", "wide"), ...items(1, 200, 150, "all", "small")],
      plate: PLATE_256,
      excludedCorner: corner,
    };
    const result = searchPacking(problem);
    expect(result.packing.plates).toHaveLength(1);
    expectRules(problem, result.packing);
  });

  it("bites the excluded corner only when nothing else fits", () => {
    const problem: PackingProblem = { items: items(1, 256, 256), plate: PLATE_256, excludedCorner: { width: 18, depth: 28 } };
    const result = searchPacking(problem);
    expect(result.packing.plates).toHaveLength(1);
    expectRules(problem, result.packing, { corner: false });
  });

  it("leaves out an object larger than the plate, and lays the others", () => {
    const problem: PackingProblem = { items: [...items(1, 300, 100, "all", "huge"), ...items(2, 50, 50)], plate: PLATE_256 };
    const result = searchPacking(problem);
    expect(result.packing.unplaced).toEqual(["huge-0"]);
    expectRules(problem, result.packing);
  });

  it("never lays two keys on one plate", () => {
    const problem: PackingProblem = { items: [...items(2, 50, 50, "bins", "bin"), ...items(1, 50, 50, "clips", "clips")], plate: PLATE_256 };
    const result = searchPacking(problem);
    expect(result.packing.plates.map((plate) => plate.key)).toEqual(["bins", "clips"]);
    expect(result.bound).toBe(2);
    expectRules(problem, result.packing);
  });
});

describe("searchPacking, the search for a better rangement", () => {
  /** A pinwheel: four 156 × 95 around a 56 × 56 fill 256 × 256 with 5 mm between them, no guillotine cut. */
  const pinwheel = (copies: number): PackingItem[] => [...items(4 * copies, 156, 95, "all", "blade"), ...items(copies, 56, 56, "all", "hub")];
  /** Bins of a basket whose bound the search does not reach in a few thousand nodes. */
  const hard: PackingProblem = {
    items: [...items(40, 41.5, 83.5, "all", "a"), ...items(10, 125.5, 41.5, "all", "b"), ...items(3, 167.5, 83.5, "all", "c")],
    plate: PLATE_256,
  };

  it("finds the plate MaxRects alone loses, and proves it the minimum", () => {
    const problem: PackingProblem = { items: pinwheel(1), plate: PLATE_256 };
    const found: number[] = [];
    const result = searchPacking(problem, { onImprove: ({ packing }) => found.push(packing.plates.length) });
    expect(found).toEqual([2, 1]);
    expect(result).toMatchObject({ bound: 1, status: "optimal" });
    expectRules(problem, result.packing);
  });

  it("never announces the minimum above the bound", () => {
    for (const problem of [
      { items: pinwheel(2), plate: PLATE_256 },
      { items: items(25, 100, 100), plate: PLATE_256 },
      { items: [...items(12, 100, 100, "all", "square"), ...items(6, 150, 60, "all", "long")], plate: PLATE_256 },
    ]) {
      const result = searchPacking(problem);
      expectRules(problem, result.packing);
      expect(result.packing.plates.length).toBeGreaterThanOrEqual(result.bound);
      if (result.status === "optimal") expect(result.packing.plates.length).toBe(result.bound);
      else expect(result.status).toBe("exhausted");
    }
    // 25 squares of 100 mm: four per plate at most, which the area alone does not tell.
    expect(searchPacking({ items: items(25, 100, 100), plate: PLATE_256 })).toMatchObject({ bound: 5, status: "exhausted" });
  });

  it("stops when asked, with the best rangement found", () => {
    let asked = 0;
    let best: Packing | null = null;
    const result = searchPacking(hard, { shouldStop: () => ++asked > 3, onImprove: ({ packing }) => (best = packing) });
    expect(result.status).toBe("stopped");
    expect(result.packing).toEqual(best);
    expect(result.packing.plates.length).toBeGreaterThan(result.bound);
    expectRules(hard, result.packing);
  });

  it("ends after 60 s by default, with the best rangement found and the time it ran", () => {
    let clock = 0;
    let best: Packing | null = null;
    const result = searchPacking(hard, { now: () => (clock += 1000), onImprove: ({ packing }) => (best = packing) });
    expect(result.status).toBe("timeout");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(60_000);
    expect(result.elapsedMs).toBeLessThan(62_000);
    expect(result.packing).toEqual(best);
    expectRules(hard, result.packing);
  });
});

describe("plateKeyOf", () => {
  // A basket of three bins, a baseplate in two pieces and the block of its clips, all small.
  const objects = [
    ...["bin-1", "bin-2", "bin-3"].map((id) => ({ id, category: "bins" })),
    ...["piece-1", "piece-2"].map((id) => ({ id, category: "baseplates" })),
    { id: "clips", category: "clips" },
  ];
  const problemOf = (mode: PackingMode): PackingProblem => ({
    items: objects.map(({ id, category }) => ({ id, width: 60, depth: 60, key: plateKeyOf(mode, id, category) })),
    plate: PLATE_256,
  });
  const categoriesOf = (packing: Packing) =>
    packing.plates.map((plate) => [...new Set(plate.items.map((item) => objects.find((o) => o.id === item.id)!.category))]);

  it("mixes every category in « moins de plateaux », the clips included", () => {
    const { packing } = searchPacking(problemOf("fewest-plates"));
    expect(packing.plates).toHaveLength(1);
    expect(categoriesOf(packing)[0]).toEqual(["bins", "baseplates", "clips"]);
  });

  it("never mixes two categories on a plate « par catégorie », the clips on their own", () => {
    const { packing } = searchPacking(problemOf("by-category"));
    expect(categoriesOf(packing)).toEqual([["bins"], ["baseplates"], ["clips"]]);
  });

  it("lays one object per plate in « un objet par plateau », the clips on their own", () => {
    const problem = problemOf("one-per-plate");
    const result = searchPacking(problem);
    expect(result.packing.plates.map((plate) => plate.items.map((item) => item.id))).toEqual(objects.map(({ id }) => [id]));
    expect(result.status).toBe("optimal");
    expectRules(problem, result.packing);
  });

  // Provisional (#43): a Bambu Studio project prints each plate at one layer height.
  it("never puts two layer heights on a plate, in any rangement", () => {
    for (const mode of ["fewest-plates", "by-category"] as const) {
      const problem: PackingProblem = {
        items: objects.map(({ id, category }, k) => ({ id, width: 60, depth: 60, key: plateKeyOf(mode, id, category, k % 2 === 0 ? 0.2 : 0.12) })),
        plate: PLATE_256,
      };
      const { packing } = searchPacking(problem);
      for (const plate of packing.plates) expect(new Set(plate.items.map((item) => objects.findIndex((o) => o.id === item.id) % 2)).size).toBe(1);
    }
    expect(plateKeyOf("fewest-plates", "a", "bins", 0.2)).toBe(plateKeyOf("fewest-plates", "b", "baseplates", 0.2));
  });
});

describe("clipBlockOf", () => {
  const clip = (id: string, count: number, width = 2.5, depth = 2.6) => ({ id, width, depth, count });

  it("lays the clips of one shape in a near-square grid, 3 mm apart", () => {
    const block = clipBlockOf([clip("a", 5)])!;
    // 5 clips: 3 columns, 2 rows.
    expect(block.width).toBeCloseTo(3 * 2.5 + 2 * 3, 9);
    expect(block.depth).toBeCloseTo(2 * 2.6 + 3, 9);
    expect(block.clips.map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [5.5, 0],
      [11, 0],
      [0, 5.6],
      [5.5, 5.6],
    ]);
    expect(block.clips.every((c) => c.id === "a")).toBe(true);
  });

  it("puts every clip of the basket in one block, a grid per shape side by side", () => {
    const block = clipBlockOf([clip("baseplate", 3), clip("alone", 2), clip("flush", 4, 2.5, 2.2)])!;
    expect(block.clips).toHaveLength(9);
    // The 5 clips of 2.5 × 2.6 (3 × 2), 3 mm, then the 4 of 2.5 × 2.2 (2 × 2).
    expect(block.width).toBeCloseTo(13.5 + 3 + 8, 9);
    expect(block.depth).toBeCloseTo(8.2, 9);
    expect(block.clips.filter((c) => c.id === "flush").map(({ x, y }) => [x, y])).toEqual([
      [16.5, 0],
      [22, 0],
      [16.5, 5.2],
      [22, 5.2],
    ]);
    expect(block.clips.map((c) => c.id)).toEqual(["baseplate", "baseplate", "baseplate", "alone", "alone", "flush", "flush", "flush", "flush"]);
  });

  it("is no block without clips", () => {
    expect(clipBlockOf([clip("none", 0)])).toBeNull();
    expect(clipBlockOf([])).toBeNull();
  });
});

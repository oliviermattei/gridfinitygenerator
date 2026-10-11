import { describe, expect, test } from "vitest";
import { measureArticle } from "../lib/engine/article-measure";

// What the basket page shows of an article (#41): measured on the model computed again from its
// share link in final quality, with the build plate of the preferences.

const PLATE = { width: 256, depth: 256 };

describe("measuring an article", { timeout: 30_000 }, () => {
  test("a bin: its bounding box and its material, measured on its final mesh", async () => {
    const measure = await measureArticle({ model: "bin", link: "v=1" }, PLATE);
    // The default bin, 2 × 1 cells of 3 U: 83.5 × 41.5 mm, 25 mm high with its lip.
    expect(measure.dimensions.width).toBeCloseTo(83.5, 3);
    expect(measure.dimensions.depth).toBeCloseTo(41.5, 3);
    expect(measure.dimensions.height).toBeCloseTo(25, 3);
    expect(measure.material.volume).toBeGreaterThan(0);
    expect(measure.material.clips).toBe(0);
    expect(measure.pieces).toBe(1);
    expect(measure.fits).toBe(true);
  });

  test("a bin larger than the build plate does not fit", async () => {
    expect((await measureArticle({ model: "bin", link: "v=1&x=7" }, PLATE)).fits).toBe(false);
    expect((await measureArticle({ model: "bin", link: "v=1&x=7" }, { width: 320, depth: 320 })).fits).toBe(true);
  });

  test("a baseplate is cut for the build plate: its pieces and its clips", async () => {
    const link = "v=1&mode=cells&cx=7&cy=1";
    const whole = await measureArticle({ model: "baseplate", link }, { width: 320, depth: 320 });
    expect(whole.pieces).toBe(1);
    const cut = await measureArticle({ model: "baseplate", link }, PLATE);
    expect(cut.pieces).toBe(2);
    expect(cut.material.clips).toBeGreaterThan(0);
    expect(cut.fits).toBe(true);
    // Assembled, the same footprint: 7 cells of 42 mm.
    expect(cut.dimensions.width).toBeCloseTo(whole.dimensions.width, 3);
  });

  test("a clip alone: all its material is clips", async () => {
    const measure = await measureArticle({ model: "clip", link: "v=1" }, PLATE);
    expect(measure.material.volume).toBe(0);
    expect(measure.material.clips).toBeGreaterThan(0);
    expect(measure.dimensions.width).toBeGreaterThan(0);
    expect(measure.dimensions.width).toBeLessThan(42);
    expect(measure.fits).toBe(true);
  });

  // What the rangement lays on the plates (#42): each exemplar's objects and its clips.
  test("a bin is one object on the plates, its footprint", async () => {
    const { parts, clips } = await measureArticle({ model: "bin", link: "v=1" }, PLATE);
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ kind: "whole", numbers: [] });
    expect(parts[0]!.width).toBeCloseTo(83.5, 3);
    expect(parts[0]!.depth).toBeCloseTo(41.5, 3);
    expect(clips).toBeNull();
  });

  test("a cut baseplate lays its pieces, numbered, and its clips apart", async () => {
    const measure = await measureArticle({ model: "baseplate", link: "v=1&mode=cells&cx=7&cy=1" }, PLATE);
    expect(measure.parts.map((part) => [part.kind, part.numbers])).toEqual([
      ["piece", [1]],
      ["piece", [2]],
    ]);
    // Across the cut, the two pieces make the whole footprint again.
    expect(measure.parts[0]!.width + measure.parts[1]!.width).toBeCloseTo(measure.dimensions.width, 3);
    expect(measure.clips!.count).toBeGreaterThan(0);
    expect(measure.clips!.width).toBeGreaterThan(0);
    expect(measure.clips!.width).toBeLessThan(5);
  });

  test("stacked, a cut baseplate lays its stacks, with the pieces of each", async () => {
    const link = "v=1&mode=cells&cx=7&cy=1";
    const measure = await measureArticle({ model: "baseplate", link }, PLATE, { ears: true, pins: false });
    expect(measure.parts.length).toBeGreaterThan(0);
    expect(measure.parts.every((part) => part.kind === "stack")).toBe(true);
    expect(measure.parts.flatMap((part) => part.numbers).sort()).toEqual([1, 2]);
    // The ears stand out of the pieces.
    const pieces = await measureArticle({ model: "baseplate", link }, PLATE);
    expect(Math.max(...measure.parts.map((part) => part.width))).toBeGreaterThan(Math.max(...pieces.parts.map((part) => part.width)));
  });

  test("a baseplate that cannot be stacked lays its pieces, one that is not cut itself", async () => {
    // The default baseplate holds a frame of crossbars for its margin: never stacked.
    const framed = await measureArticle({ model: "baseplate", link: "v=1" }, PLATE, { ears: false, pins: false });
    expect(framed.parts.length).toBeGreaterThan(1);
    expect(framed.parts.every((part) => part.kind === "piece")).toBe(true);
    const uncut = await measureArticle({ model: "baseplate", link: "v=1&mode=cells&cx=3&cy=3" }, PLATE, { ears: false, pins: false });
    expect(uncut.parts.map((part) => part.kind)).toEqual(["whole"]);
  });

  test("a clip alone is one clip of the block, no object of its own", async () => {
    const { parts, clips } = await measureArticle({ model: "clip", link: "v=1" }, PLATE);
    expect(parts).toEqual([]);
    expect(clips!.count).toBe(1);
  });
});

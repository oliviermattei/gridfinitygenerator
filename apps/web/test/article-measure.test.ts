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

  test("the test kit: 42 × 84 mm with the standard cell", async () => {
    const measure = await measureArticle({ model: "test-kit", link: "v=1&mode=cells&cx=7&cy=1" }, PLATE);
    expect(measure.dimensions.width).toBeCloseTo(42, 3);
    expect(measure.dimensions.depth).toBeCloseTo(84, 3);
    expect(measure.material.volume).toBeGreaterThan(0);
    expect(measure.fits).toBe(true);
  });

  test("a clip alone: all its material is clips", async () => {
    const measure = await measureArticle({ model: "clip", link: "v=1" }, PLATE);
    expect(measure.material.volume).toBe(0);
    expect(measure.material.clips).toBeGreaterThan(0);
    expect(measure.dimensions.width).toBeGreaterThan(0);
    expect(measure.dimensions.width).toBeLessThan(42);
    expect(measure.fits).toBe(true);
  });
});

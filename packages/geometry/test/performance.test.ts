import { describe, expect, it } from "vitest";
import { generateBaseplate, serialize3mf } from "../src/index";
import { cells, medianGenerationMs, medianMs } from "./support/timing";

// Guard against gross performance regressions on any machine, CI included. The thresholds
// are wide on purpose (several times the spec targets) so the test never flakes; the
// precise spec targets, and the speed of the cell bricks against the boolean fallback (a
// ratio of two measures, which a shared runner can skew), are checked by
// `pnpm --filter @repo/geometry test:perf` (local).

/** The largest drawer: 23 × 23 cells and a margin on every side. */
const LARGEST_DRAWER = { drawerWidth: 1000, drawerDepth: 1000 };

describe("generation time (wide CI thresholds)", { timeout: 60_000 }, () => {
  it("computes a 20 × 20 preview well under a second", async () => {
    expect(await medianGenerationMs(cells(20, 20), "preview", 3)).toBeLessThan(500);
  });

  it("computes the preview of the largest drawer, margin included, well under a second", async () => {
    expect(await medianGenerationMs(LARGEST_DRAWER, "preview", 3)).toBeLessThan(500);
  });

  it("computes the preview of the largest drawer in the smallest cells, chamfered, well under a second", async () => {
    const smallest = { ...LARGEST_DRAWER, cellSize: 20, bottomChamfer: 3, outerRadius: 0 };
    expect(await medianGenerationMs(smallest, "preview", 3)).toBeLessThan(500);
  });

  it("computes the final 10 × 10 and 20 × 20 within a few seconds", async () => {
    expect(await medianGenerationMs(cells(10, 10), "final", 3)).toBeLessThan(3_000);
    expect(await medianGenerationMs(cells(20, 20), "final", 1)).toBeLessThan(9_000);
  });

  it("computes the final default drawer and largest drawer, margin included, within a few seconds", async () => {
    expect(await medianGenerationMs({}, "final", 3)).toBeLessThan(3_000);
    expect(await medianGenerationMs(LARGEST_DRAWER, "final", 1)).toBeLessThan(9_000);
  });

  it("computes the largest drawer cut in 16 pieces for a 256 mm build plate, preview well under a second and final within a few seconds", async () => {
    const plate = { buildPlate: { width: 256, depth: 256 } };
    expect(await medianGenerationMs(LARGEST_DRAWER, "preview", 3, plate)).toBeLessThan(500);
    expect(await medianGenerationMs(LARGEST_DRAWER, "final", 1, plate)).toBeLessThan(9_000);
  });

  // The final mesh of the cell bricks is checked NoError by the engine itself: a broken seam would throw.
  it("computes a 20 × 20 with its 361 screws, preview well under a second and final within a few seconds", async () => {
    const screwed = { ...cells(20, 20), screws: true };
    expect(await medianGenerationMs(screwed, "preview", 3)).toBeLessThan(500);
    expect(await medianGenerationMs(screwed, "final", 1)).toBeLessThan(9_000);
  });
});

describe("export time (wide CI thresholds)", { timeout: 60_000 }, () => {
  it("writes the 3MF of a final 20 × 20 within a few seconds", async () => {
    const { mesh } = await generateBaseplate(cells(20, 20), "final");
    const options = { name: "baseplate", shareLink: "https://example.org/fr/baseplate?v=1&mode=cells&cx=20&cy=20" };
    expect(await medianMs(() => serialize3mf(mesh, options), 1)).toBeLessThan(5_000);
  });
});

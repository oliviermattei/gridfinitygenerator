import { describe, expect, it } from "vitest";
import { generateBaseplate, serialize3mf } from "../src/index";
import { medianGenerationMs, medianMs } from "./support/timing";

// Guard against gross performance regressions on any machine, CI included. The thresholds
// are wide on purpose (several times the spec targets) so the test never flakes; the
// precise spec targets are checked by `pnpm --filter @repo/geometry test:perf` (local).

describe("generation time (wide CI thresholds)", { timeout: 60_000 }, () => {
  it("computes a 20 × 20 preview well under a second", async () => {
    expect(await medianGenerationMs([20, 20], "preview", 3)).toBeLessThan(500);
  });

  it("computes the final 10 × 10 and 20 × 20 within a few seconds", async () => {
    expect(await medianGenerationMs([10, 10], "final", 3)).toBeLessThan(3_000);
    expect(await medianGenerationMs([20, 20], "final", 1)).toBeLessThan(9_000);
  });

  it("is several times faster than the boolean fallback on a 10 × 10 grid", async () => {
    // A ratio holds on slow and fast machines alike; the prototype measured about 14×.
    const fast = await medianGenerationMs([10, 10], "final", 3);
    const fallback = await medianGenerationMs([10, 10], "final", 3, { strategy: "boolean" });
    expect(fast * 3).toBeLessThan(fallback);
  });
});

describe("export time (wide CI thresholds)", { timeout: 60_000 }, () => {
  it("writes the 3MF of a final 20 × 20 within a few seconds", async () => {
    const { mesh } = await generateBaseplate({ columns: 20, rows: 20 }, "final");
    const options = { name: "baseplate", shareLink: "https://example.org/fr/baseplate?v=1&mode=cells&cx=20&cy=20" };
    expect(await medianMs(() => serialize3mf(mesh, options), 1)).toBeLessThan(5_000);
  });
});

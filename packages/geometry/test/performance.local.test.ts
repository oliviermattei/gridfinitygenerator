import { afterAll, describe, expect, it } from "vitest";
import { medianGenerationMs } from "./support/timing";

// LOCAL ONLY (excluded from `pnpm test` and CI): the spec v1 performance targets, measured
// precisely. Run with `pnpm --filter @repo/geometry test:perf` on an idle machine.

const RUNS = 9;
const report: string[] = [];

afterAll(() => {
  console.log(["", "| case | median (ms) | target (ms) |", "|---|---|---|", ...report].join("\n"));
});

async function measure(size: [number, number], quality: "preview" | "final", targetMs: number) {
  const ms = await medianGenerationMs(size, quality, RUNS);
  report.push(`| ${size[0]} × ${size[1]} ${quality} | ${ms.toFixed(1)} | ${targetMs} |`);
  expect(ms).toBeLessThan(targetMs);
}

describe("spec v1 performance targets (local)", () => {
  it.each<[number, number]>([
    [1, 24],
    [4, 3],
    [10, 10],
    [20, 20],
    [24, 24],
  ])("previews %i × %i in under 100 ms", (columns, rows) => measure([columns, rows], "preview", 100));

  it("computes the final 10 × 10 in under 1 s", () => measure([10, 10], "final", 1_000));

  it("computes the final 20 × 20 in under 3 s", () => measure([20, 20], "final", 3_000));

  // Not in the spec: the largest grids, held to the 20 × 20 target.
  it.each<[number, number]>([
    [1, 24],
    [24, 24],
  ])("computes the final %i × %i in under 3 s", (columns, rows) => measure([columns, rows], "final", 3_000));
});

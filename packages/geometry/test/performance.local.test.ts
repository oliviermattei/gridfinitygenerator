import { afterAll, describe, expect, it } from "vitest";
import { generateBaseplate, serialize3mf, serializeStl } from "../src/index";
import { medianGenerationMs, medianMs } from "./support/timing";

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

describe("spec v1 export targets (local)", () => {
  it("writes the 3MF of a final 20 × 20 in under 1 s", async () => {
    const { mesh } = await generateBaseplate({ columns: 20, rows: 20 }, "final");
    const options = { name: "baseplate", shareLink: "https://example.org/fr/baseplate?v=1&mode=cells&cx=20&cy=20" };
    const ms = await medianMs(() => serialize3mf(mesh, options), RUNS);
    const size = (await serialize3mf(mesh, options)).byteLength;
    const triangles = mesh.indices.length / 3;
    report.push(`| 20 × 20 3MF (${triangles} triangles, ${(size / 1e6).toFixed(1)} MB) | ${ms.toFixed(1)} | 1000 |`);
    // Not a spec target: the STL, for comparison.
    const stlMs = await medianMs(() => serializeStl(mesh), RUNS);
    report.push(`| 20 × 20 STL | ${stlMs.toFixed(1)} | — |`);
    expect(ms).toBeLessThan(1_000);
  });
});

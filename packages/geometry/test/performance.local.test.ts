import { afterAll, describe, expect, it } from "vitest";
import { generateBaseplate, serialize3mf, serializeStl } from "../src/index";
import type { BaseplateSettings } from "../src/index";
import { cells, medianGenerationMs, medianMs } from "./support/timing";

// LOCAL ONLY (excluded from `pnpm test` and CI): the spec v1 performance targets, measured
// precisely. Run with `pnpm --filter @repo/geometry test:perf` on an idle machine.

const RUNS = 9;
const report: string[] = [];

afterAll(() => {
  console.log(["", "| case | median (ms) | target (ms) |", "|---|---|---|", ...report].join("\n"));
});

async function measure(size: [number, number], quality: "preview" | "final", targetMs: number) {
  await measureSettings(`${size[0]} × ${size[1]}`, cells(...size), quality, targetMs);
}

async function measureSettings(name: string, settings: Partial<BaseplateSettings>, quality: "preview" | "final", targetMs: number) {
  const ms = await medianGenerationMs(settings, quality, RUNS);
  report.push(`| ${name} ${quality} | ${ms.toFixed(1)} | ${targetMs} |`);
  expect(ms).toBeLessThan(targetMs);
}

/** Drawers whose baseplate has a margin on every side (#10). */
const DRAWERS: [name: string, settings: Partial<BaseplateSettings>][] = [
  ["default drawer 400 × 280 (9 × 6, margin)", {}],
  ["20 × 20 + margins 21 × 27", { sizeMode: "cells", columns: 20, rows: 20, marginWidth: 21, marginDepth: 27 }],
  ["drawer 1000 × 1000 (23 × 23, margin)", { drawerWidth: 1000, drawerDepth: 1000 }],
  ["drawer 60 × 1000 (1 × 23, margin, boolean path)", { drawerWidth: 60, drawerDepth: 1000 }],
  ["default drawer with its 40 screws", { screws: true }],
  ["20 × 20 with its 361 screws", { sizeMode: "cells", columns: 20, rows: 20, screws: true }],
  ["drawer 1000 × 1000 with its 484 screws", { drawerWidth: 1000, drawerDepth: 1000, screws: true }],
  // Advanced settings (#13): the smallest cells fill a drawer up to 24 × 24 cells, the rest in the margin.
  ["drawer 1000 × 1000 in 20 mm cells (24 × 24, margin)", { drawerWidth: 1000, drawerDepth: 1000, cellSize: 20 }],
  ["drawer 1000 × 1000 in 20 mm cells with its 529 screws", { drawerWidth: 1000, drawerDepth: 1000, cellSize: 20, screws: true }],
  ["drawer 1000 × 1000 in 20 mm cells, sharp corners, 3 mm chamfer", { drawerWidth: 1000, drawerDepth: 1000, cellSize: 20, outerRadius: 0, bottomChamfer: 3 }],
  ["24 × 24 cells of 80 mm, 3 mm chamfer, 529 screws", { sizeMode: "cells", columns: 24, rows: 24, cellSize: 80, bottomChamfer: 3, screws: true }],
];

describe("spec v1 performance targets (local)", () => {
  it.each<[number, number]>([
    [1, 24],
    [4, 3],
    [10, 10],
    [20, 20],
    [24, 24],
  ])("previews %i × %i in under 100 ms", (columns, rows) => measure([columns, rows], "preview", 100));

  // With a margin, held to the same targets. Previews run before any final: a large final
  // grows the WASM heap, which slows what follows (the app replaces its worker after one).
  it.each(DRAWERS)("previews the %s in under 100 ms", (name, settings) => measureSettings(name, settings, "preview", 100));

  it("computes the final 10 × 10 in under 1 s", () => measure([10, 10], "final", 1_000));

  it("computes the final 20 × 20 in under 3 s", () => measure([20, 20], "final", 3_000));

  // Not in the spec: the largest grids, held to the 20 × 20 target.
  it.each<[number, number]>([
    [1, 24],
    [24, 24],
  ])("computes the final %i × %i in under 3 s", (columns, rows) => measure([columns, rows], "final", 3_000));

  it.each(DRAWERS)("computes the final %s in under 3 s", (name, settings) => measureSettings(name, settings, "final", 3_000));
});

describe("cell bricks against the boolean fallback (local)", () => {
  it("builds a final 10 × 10 grid several times faster than the boolean fallback", async () => {
    // A ratio of two measures: meaningful on an idle machine only. The prototype measured about 14×.
    const fast = await medianGenerationMs(cells(10, 10), "final", RUNS);
    const fallback = await medianGenerationMs(cells(10, 10), "final", RUNS, { strategy: "boolean" });
    report.push(`| 10 × 10 final, boolean fallback / bricks | ×${(fallback / fast).toFixed(1)} | ×3 |`);
    expect(fast * 3).toBeLessThan(fallback);
  });

  it("stays several times faster than the boolean fallback with screws", async () => {
    const screwed = { ...cells(10, 10), screws: true };
    const fast = await medianGenerationMs(screwed, "final", RUNS);
    const fallback = await medianGenerationMs(screwed, "final", RUNS, { strategy: "boolean" });
    report.push(`| 10 × 10 with screws final, boolean fallback / bricks | ×${(fallback / fast).toFixed(1)} | ×3 |`);
    expect(fast * 3).toBeLessThan(fallback);
  });
});

describe("spec v1 export targets (local)", () => {
  it("writes the 3MF of a final 20 × 20 in under 1 s", async () => {
    const { mesh } = await generateBaseplate(cells(20, 20), "final");
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

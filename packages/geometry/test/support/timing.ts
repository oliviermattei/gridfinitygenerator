import { generateBaseplate, type BaseplateSettings, type GenerateOptions, type Quality } from "../../src/index";

/** Settings of a grid of `columns` × `rows` cells without margin. */
export function cells(columns: number, rows: number): Partial<BaseplateSettings> {
  return { sizeMode: "cells", columns, rows };
}

/** Median wall-clock time of `generateBaseplate`, in milliseconds, after one warm-up run. */
export async function medianGenerationMs(
  settings: Partial<BaseplateSettings>,
  quality: Quality,
  runs: number,
  options?: GenerateOptions,
): Promise<number> {
  await generateBaseplate(settings, quality, options);
  const times: number[] = [];
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    await generateBaseplate(settings, quality, options);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] as number;
}

/** Median wall-clock time of `run`, in milliseconds, after one warm-up run. */
export async function medianMs(run: () => unknown, runs: number): Promise<number> {
  await run();
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] as number;
}

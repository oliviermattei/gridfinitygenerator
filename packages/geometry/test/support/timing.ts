import { generateBaseplate, type GenerateOptions, type Quality } from "../../src/index";

/** Median wall-clock time of `generateBaseplate`, in milliseconds, after one warm-up run. */
export async function medianGenerationMs(
  [columns, rows]: readonly [number, number],
  quality: Quality,
  runs: number,
  options?: GenerateOptions,
): Promise<number> {
  await generateBaseplate({ columns, rows }, quality, options);
  const times: number[] = [];
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    await generateBaseplate({ columns, rows }, quality, options);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] as number;
}

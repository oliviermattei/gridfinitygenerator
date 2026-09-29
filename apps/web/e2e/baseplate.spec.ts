import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { closeSettings, numberField, openSettings, readout } from "./support";

test("the French baseplate page opens in the project colours", async ({ page }) => {
  const response = await page.goto("/fr/baseplate");
  expect(response?.status()).toBe(200);

  await expect(page).toHaveTitle(/Générateur de baseplates/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Générateur de baseplates");
  await expect(heading).toHaveCSS("font-family", /Outfit/);

  // The brand accent (terracotta #C4502F) reaches the page from its single source.
  await expect(page.getByRole("button", { name: "Télécharger le STL" })).toHaveCSS("background-color", "rgb(196, 80, 47)");
});

test("the site root leads to the baseplate generator", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/fr\/baseplate$/);
});

test("cell counts drive the 3D preview and the STL download", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");

  // Default 4 × 3 baseplate, computed by the engine in its worker (manifold-3d WASM).
  await expect(readout(page, "cells")).toHaveText("4 × 3 cellules");
  await expect(readout(page, "dimensions")).toHaveText("168 × 126 mm");
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(preview.locator("canvas")).toBeVisible();
  const defaultTriangles = Number(await preview.getAttribute("data-triangles"));
  expect(defaultTriangles).toBeGreaterThan(0);

  await numberField(page, "Colonnes").fill("3");
  await numberField(page, "Rangées").fill("2");
  await expect(readout(page, "cells")).toHaveText("3 × 2 cellules");
  await expect(readout(page, "dimensions")).toHaveText("126 × 84 mm");
  // The preview received the new mesh.
  await expect(preview).not.toHaveAttribute("data-triangles", String(defaultTriangles));
  await expect(preview).not.toHaveAttribute("data-triangles", "0");

  await closeSettings(page, testInfo); // mobile: the download sits in the dock, under the sheet
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le STL" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("baseplate-3x2-126x84mm.stl");
  const bytes = await readFile(await download.path());
  // Binary STL: 80-byte header, triangle count, then 50 bytes per triangle.
  const triangles = bytes.readUInt32LE(80);
  expect(triangles).toBeGreaterThan(0);
  expect(bytes.byteLength).toBe(84 + 50 * triangles);
});

test("cell counts are brought back into 1 to 24", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const columns = numberField(page, "Colonnes");

  await columns.fill("30");
  await columns.blur();
  await expect(columns).toHaveValue("24");
  await expect(readout(page, "cells")).toHaveText("24 × 3 cellules");

  await columns.fill("0");
  await columns.blur();
  await expect(columns).toHaveValue("1");
  await expect(readout(page, "cells")).toHaveText("1 × 3 cellules");
});

interface EngineMeasure {
  name: string;
  start: number;
  end: number;
  columns: number;
  rows: number;
  cancelled: boolean;
}

/** User Timing measures recorded by the engine client for the display requests, in order. */
function renderMeasures(page: Page): Promise<EngineMeasure[]> {
  return page.evaluate(() =>
    performance
      .getEntriesByType("measure")
      .filter(({ name }) => name === "engine:preview" || name === "engine:final")
      .map((entry) => {
        const detail = (entry as PerformanceMeasure).detail as { columns: number; rows: number; cancelled?: boolean };
        const { columns, rows, cancelled = false } = detail;
        return { name: entry.name, start: entry.startTime, end: entry.startTime + entry.duration, columns, rows, cancelled };
      })
      .sort((a, b) => a.start - b.start),
  );
}

test("dragging a cell count never piles computations up, and only the last state is rendered", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("4 × 3 cellules");
  await numberField(page, "Rangées").fill("20");
  await expect(readout(page, "cells")).toHaveText("4 × 20 cellules");

  // Hold the arrow key: 16 settings in a row, as fast as the keyboard sends them.
  const columns = numberField(page, "Colonnes");
  await columns.focus();
  const dragStart = await page.evaluate(() => performance.now());
  const changes = 16;
  for (let step = 0; step < changes; step++) await page.keyboard.press("ArrowUp");
  await expect(columns).toHaveValue("20");

  // The preview, then the final quality, of the last state only end up on screen.
  await expect
    .poll(async () => (await renderMeasures(page)).at(-1), { timeout: 20_000 })
    .toMatchObject({ name: "engine:final", columns: 20, rows: 20 });
  await expect(readout(page, "cells")).toHaveText("20 × 20 cellules");
  await expect(readout(page, "dimensions")).toHaveText("840 × 840 mm");

  // One computation at a time: a new one starts only once the previous one has answered,
  // so nothing ever waits in the worker behind a stale request.
  const measures = await renderMeasures(page);
  measures.slice(1).forEach((measure, i) => expect(measure.start).toBeGreaterThanOrEqual((measures[i] as EngineMeasure).end));
  const drag = measures.filter(({ end }) => end > dragStart);
  test.info().annotations.push({
    type: "measure",
    description: `${changes} changes: computed during the drag, ${drag.filter(({ name }) => name === "engine:preview").length} previews, ${drag.filter(({ name }) => name === "engine:final").length} finals computed`,
  });

  // A 20 × 20 final is a large computation: the worker is replaced by a fresh one...
  await expect
    .poll(() => page.evaluate(() => performance.getEntriesByName("engine:worker-start").length))
    .toBeGreaterThanOrEqual(2);
  // ...which keeps computing the next settings.
  await numberField(page, "Rangées").fill("2");
  await expect(readout(page, "dimensions")).toHaveText("840 × 84 mm");
});

test("a setting changed during a large final is shown without waiting for that final", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await numberField(page, "Colonnes").fill("24");
  await numberField(page, "Rangées").fill("24");
  await expect(readout(page, "cells")).toHaveText("24 × 24 cellules");
  // The preview is on screen; the final quality (over a second for 24 × 24) starts 200 ms later.
  await page.waitForTimeout(500);

  await numberField(page, "Rangées").fill("23");
  await expect(readout(page, "cells")).toHaveText("24 × 23 cellules");
  const measures = await renderMeasures(page);
  // Earlier finals may have been cancelled too (the 4 × 3 one, on a loaded machine).
  const cancelled = measures.find(({ cancelled, columns, rows }) => cancelled && columns === 24 && rows === 24);
  expect(cancelled?.name).toBe("engine:final");
  // The new preview did not wait for the stale final to finish.
  const preview = measures.find(({ name, rows }) => name === "engine:preview" && rows === 23);
  expect(preview?.start).toBeGreaterThanOrEqual(cancelled?.end ?? Number.NaN);

  await expect
    .poll(async () => (await renderMeasures(page)).at(-1), { timeout: 20_000 })
    .toMatchObject({ name: "engine:final", columns: 24, rows: 23, cancelled: false });
  await expect(readout(page, "dimensions")).toHaveText(/^1\s008 × 966 mm$/); // French digit grouping
});

import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { chooseCells, closeSettings, openSettings } from "./support";

// Clips between the pieces of a baseplate cut for the build plate (#22), at the corners (#30),
// always there, and a single clip to download (#37).

/** The number of clips in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function clipCount(page: Page) {
  return page.getByTestId("stat-clips").filter({ visible: true });
}

test("a cut baseplate counts its clips, always there, and a baseplate in a single piece shows none", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  // The default drawer on the default build plate: 4 pieces, 4 junctions, two clips on each,
  // one at each end, against the corner. No setting for them any more.
  await expect(clipCount(page)).toHaveText("8");
  await expect(page.getByRole("button", { name: /^Clips/ })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Clips" })).toHaveCount(0);

  // A baseplate that fits on the build plate is not cut: no clip to print, nor to show.
  const size = page.getByRole("button", { name: /^Taille/ });
  if ((await size.getAttribute("aria-expanded")) !== "true") await size.click();
  await chooseCells(page);
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("1");
  await expect(clipCount(page)).toHaveCount(0);
});

test("an old shared link with the clips turned off keeps them all the same", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&cl=0");
  await openSettings(page, testInfo);
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("4");
  await expect(clipCount(page)).toHaveText("8");
});

test("downloads a single clip as an STL, from the menu of the download, with or without a cut", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&mode=cells");
  await openSettings(page, testInfo);
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("1");
  await closeSettings(page, testInfo); // mobile: the download sits in the dock, under the sheet

  await page.getByRole("button", { name: "Autres formats" }).click();
  const item = page.getByRole("menuitem", { name: /Télécharger le clip \(STL\)/ });
  await expect(item).toContainText("deux baseplates se clipsent");
  const [file] = await Promise.all([page.waitForEvent("download"), item.click()]);
  expect(file.suggestedFilename()).toBe("baseplate-clip.stl");
  // A binary STL of the clip alone: 2,5 × 2,6 × 4,5 mm, lying on its side.
  const bytes = await readFile(await file.path());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangles = view.getUint32(80, true);
  expect(bytes.byteLength).toBe(84 + 50 * triangles);
  const max = [-Infinity, -Infinity, -Infinity];
  const min = [Infinity, Infinity, Infinity];
  for (let t = 0; t < triangles; t++)
    for (let v = 0; v < 3; v++)
      for (let axis = 0; axis < 3; axis++) {
        const value = view.getFloat32(84 + 50 * t + 12 + 12 * v + 4 * axis, true);
        max[axis] = Math.max(max[axis] as number, value);
        min[axis] = Math.min(min[axis] as number, value);
      }
  expect(max.map((value, axis) => Number((value - (min[axis] as number)).toFixed(3)))).toEqual([2.5, 2.6, 4.5]);
});

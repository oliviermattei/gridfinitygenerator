import { expect, test, type Page } from "@playwright/test";
import { chooseCells, openSettings } from "./support";

// Magnet holes under the crossings of the murets (#24): always there, no setting; the
// statistics say how many magnets to buy.

/** The number of magnets in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function magnetCount(page: Page) {
  return page.getByTestId("stat-magnets").filter({ visible: true });
}

test("the statistics count the magnets, which follow the margin, the screws and the cuts", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  // The default drawer: 9 × 6 cells, a magnet under each of the 8 × 5 inner crossings, but
  // those on the cuts of its 4 pieces for the default build plate (12): 28. The frame of
  // crossbars, 2 mm high, holds no magnet on the edge of the grid.
  await expect(magnetCount(page)).toHaveText("28 (Ø 6 × 2 mm)");

  // A grid of 4 × 3 cells, uncut: its 3 × 2 inner crossings.
  await chooseCells(page);
  await expect(magnetCount(page)).toHaveText("6 (Ø 6 × 2 mm)");

  // Truncated cells carry the murets on: the crossings of the edge of the grid get magnets too.
  await page.goto("/fr/baseplate?v=1&mg=cells");
  await openSettings(page, testInfo);
  await expect(magnetCount(page)).toHaveText("54 (Ø 6 × 2 mm)");

  // A screw takes the crossing: with the frame, the screws take every magnet.
  await page.goto("/fr/baseplate?v=1&sc=1");
  await openSettings(page, testInfo);
  await expect(page.getByTestId("stat-screws").filter({ visible: true })).toHaveText("28");
  await expect(magnetCount(page)).toHaveText("aucun");
  await page.goto("/fr/baseplate?v=1&sc=1&mg=cells");
  await openSettings(page, testInfo);
  await expect(magnetCount(page)).toHaveText("26 (Ø 6 × 2 mm)");
});

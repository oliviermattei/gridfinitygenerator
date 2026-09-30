import { expect, test, type Page } from "@playwright/test";
import { chooseCells, openSettings } from "./support";

// Clips between the pieces of a baseplate cut for the build plate (#22).

/** The number of clips in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function clipCount(page: Page) {
  return page.getByTestId("stat-clips").filter({ visible: true });
}

test("a cut baseplate counts its clips, on by default, and they can be turned off", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Clips/ });
  const toggle = page.getByRole("switch", { name: "Clips" });

  // The default drawer on the default build plate: 4 pieces, one clip in the middle of each
  // side of a cell along the cuts, 6 on the cut across X and 9 on the cut across Y.
  await expect(toggle).toBeChecked();
  await expect(clipCount(page)).toHaveText("15");
  await expect(family).toHaveAccessibleName("Clips 15 clips à imprimer");
  await family.click();
  await expect(page.getByText(/s'enfoncent par-dessous dans le pied des murets/).filter({ visible: true })).toBeVisible();

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(clipCount(page)).toHaveText("aucun");
  await expect(family).toHaveAccessibleName("Clips Désactivés");

  // Kept on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(clipCount(page)).toHaveText("aucun");
  await page.getByRole("switch", { name: "Clips" }).click();
  await expect(clipCount(page)).toHaveText("15");

  // A baseplate that fits on the build plate is not cut: no clip to print.
  const size = page.getByRole("button", { name: /^Taille/ });
  if ((await size.getAttribute("aria-expanded")) !== "true") await size.click();
  await chooseCells(page);
  await expect(clipCount(page)).toHaveText("aucun");
  await expect(page.getByRole("button", { name: /^Clips/ })).toHaveAccessibleName("Clips Sans découpe");
});

test("a shared link carries the clips turned off", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&cl=0");
  await openSettings(page, testInfo);
  await expect(page.getByRole("switch", { name: "Clips" })).not.toBeChecked();
  await expect(clipCount(page)).toHaveText("aucun");
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("4");
});

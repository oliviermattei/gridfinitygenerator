import { expect, test, type Page } from "@playwright/test";
import { chooseCells, openSettings } from "./support";

// Clips between the pieces of a baseplate cut for the build plate (#22), at the corners (#30).

/** The number of clips in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function clipCount(page: Page) {
  return page.getByTestId("stat-clips").filter({ visible: true });
}

test("a cut baseplate counts its clips, on by default, and they can be turned off", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Clips/ });
  const toggle = page.getByRole("switch", { name: "Clips" });

  // The default drawer on the default build plate: 4 pieces, 4 junctions, two clips on each,
  // one at each end, against the corner.
  await expect(toggle).toBeChecked();
  await expect(clipCount(page)).toHaveText("8");
  await expect(family).toHaveAccessibleName("Clips 8 clips à imprimer");
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
  await expect(clipCount(page)).toHaveText("8");

  // A baseplate that fits on the build plate is not cut: no clip to print, and nothing to set,
  // so the family is hidden, as the stacked print's.
  const size = page.getByRole("button", { name: /^Taille/ });
  if ((await size.getAttribute("aria-expanded")) !== "true") await size.click();
  await chooseCells(page);
  await expect(clipCount(page)).toHaveText("aucun");
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("1");
  await expect(page.getByRole("button", { name: /^Clips/ })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Clips" })).toHaveCount(0);
});

test("a shared link carries the clips turned off", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&cl=0");
  await openSettings(page, testInfo);
  await expect(page.getByRole("switch", { name: "Clips" })).not.toBeChecked();
  await expect(clipCount(page)).toHaveText("aucun");
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("4");
});

import { expect, test, type Page } from "@playwright/test";
import { chooseCells, openSettings } from "./support";

// The shape of the margin, one of three (#23): frame of crossbars (the default), truncated
// cells, corner brackets.

/** The volume in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function volume(page: Page) {
  return page.getByTestId("stat-volume").filter({ visible: true });
}

/** A shape of the margin, by its label, in the open margin family. */
function shape(page: Page, label: "Cadre" | "Cellules" | "Équerres") {
  return page.getByRole("radio", { name: new RegExp(`^${label}`) });
}

test("the margin comes in three shapes, each with the volume it gives, the frame by default", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Marge/ });
  await expect(family).toHaveAccessibleName("Marge Cadre à traverses");
  await family.click();
  await expect(shape(page, "Cadre")).toBeChecked();

  // The default drawer cut in 4 pieces for the default build plate, measured on the final
  // meshes: the current shape, then the other two, measured once it is shown. The truncated
  // cells carry the magnets on to the edge of the grid: 54 holes instead of 28.
  await expect(volume(page)).toHaveText("79,0 cm³");
  await expect(shape(page, "Cadre")).toContainText("79,0 cm³");
  await expect(shape(page, "Cellules")).toContainText("97,2 cm³");
  await expect(shape(page, "Équerres")).toContainText("75,8 cm³");

  // Changing the shape changes the volume shown, and the family says which one it is.
  await shape(page, "Équerres").click();
  await expect(volume(page)).toHaveText("75,8 cm³");
  await expect(family).toHaveAccessibleName("Marge Équerres de coin");
  await expect(page.getByText(/Une équerre de 2 mm à chaque coin/).filter({ visible: true })).toBeVisible();
  await shape(page, "Cellules").click();
  await expect(volume(page)).toHaveText("97,2 cm³");
  await expect(family).toHaveAccessibleName("Marge Cellules tronquées");

  // Kept on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Cellules tronquées");
  await expect(volume(page)).toHaveText("97,2 cm³");
});

test("a shared link carries the shape of the margin, and a link without it gives the frame", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&mg=brackets");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Équerres de coin");
  await expect(volume(page)).toHaveText("75,8 cm³");

  await page.goto("/fr/baseplate?v=1&w=400");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Cadre à traverses");
  await expect(volume(page)).toHaveText("79,0 cm³");
});

test("without a margin, the shape changes nothing and no volume is compared", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await chooseCells(page);
  await page.getByRole("button", { name: /^Marge/ }).click();
  await expect(page.getByText("La grille remplit le tiroir : pas de marge, la forme ne change rien.").filter({ visible: true })).toBeVisible();
  await expect(shape(page, "Cellules")).not.toContainText("cm³");
});

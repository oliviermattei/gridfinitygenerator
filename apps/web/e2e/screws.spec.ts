import { expect, test, type Page } from "@playwright/test";
import { chooseCells, numberField, openSettings } from "./support";

/** The number of screws in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function screwCount(page: Page) {
  return page.getByTestId("stat-screws").filter({ visible: true });
}

test("turning the screws on opens their family and counts them in the statistics", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Vis/ });
  const size = page.getByRole("button", { name: /^Taille/ });
  const toggle = page.getByRole("switch", { name: "Vis" });

  // Off by default, the cheapest: no hole, no screw to buy.
  await expect(toggle).not.toBeChecked();
  await expect(family).toHaveAccessibleName("Vis Désactivées");
  await expect(family).toHaveAttribute("aria-expanded", "false");
  await expect(screwCount(page)).toHaveText("aucune");

  await toggle.click();
  await expect(toggle).toBeChecked();
  // Its family opens, and closes the one that was open (exclusive accordion).
  await expect(family).toHaveAttribute("aria-expanded", "true");
  await expect(size).toHaveAttribute("aria-expanded", "false");
  await expect(numberField(page, "Ø tige")).toHaveValue("3");
  await expect(numberField(page, "Ø tête")).toHaveValue("6");
  // The default drawer: 9 × 6 cells, a screw on each of the 8 × 5 inner intersections.
  await expect(screwCount(page)).toHaveText("40");
  await expect(family).toHaveAccessibleName("Vis 40 vis, tige 3 mm, tête 6 mm");

  // The head follows a shank made wider than it.
  await numberField(page, "Ø tige").fill("6,5");
  await numberField(page, "Ø tige").blur();
  await expect(numberField(page, "Ø tige")).toHaveValue("6");
  await numberField(page, "Ø tête").fill("5");
  await numberField(page, "Ø tête").blur();
  await expect(numberField(page, "Ø tête")).toHaveValue("6");
  await numberField(page, "Ø tête").fill("7,5");
  await numberField(page, "Ø tête").blur();
  await expect(family).toHaveAccessibleName("Vis 40 vis, tige 6 mm, tête 7,5 mm");

  // Fewer cells, fewer screws: 4 × 3 cells, 3 × 2 inner intersections.
  await size.click();
  await chooseCells(page);
  await expect(screwCount(page)).toHaveText("6");

  // Kept on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(screwCount(page)).toHaveText("6");

  // Off again: no screw, and the family says so.
  await page.getByRole("switch", { name: "Vis" }).click();
  await expect(screwCount(page)).toHaveText("aucune");
  await expect(page.getByRole("button", { name: /^Vis/ })).toHaveAccessibleName("Vis Désactivées");
});

test("the hole gap is an advanced setting", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const advanced = page.getByRole("button", { name: /^Avancé/ });
  await expect(advanced).toHaveAccessibleName("Avancé Valeurs par défaut");
  await advanced.click();
  const gap = numberField(page, "Jeu des trous");
  await expect(gap).toHaveValue("0,5");
  await gap.fill("0,3");
  await gap.blur();
  await expect(advanced).toHaveAccessibleName("Avancé Jeu des trous 0,3 mm");
});

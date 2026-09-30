import { expect, test, type Page } from "@playwright/test";
import { numberField, openSettings, readout } from "./support";

// Advanced settings (#13): cell size, outer corner radius, bottom chamfer, and the gaps.

/** The warning that bins may no longer fit, on screen (with the statistics). */
function advancedWarning(page: Page) {
  return page.getByRole("alert").filter({ hasText: "les bins standard risquent de ne plus s'emboîter", visible: true });
}

/** Types a value in a field of the settings and leaves it, as a user would. */
async function type(page: Page, label: string, value: string) {
  const field = numberField(page, label);
  await field.fill(value);
  await field.blur();
}

test("changing an advanced setting shows the warning; the defaults again remove it", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const advanced = page.getByRole("button", { name: /^Avancé/ });
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(advanced).toHaveAccessibleName("Avancé Valeurs par défaut");
  await expect(advancedWarning(page)).toHaveCount(0);

  await advanced.click();
  await expect(numberField(page, "Taille de cellule")).toHaveValue("42");
  await expect(numberField(page, "Rayon des coins")).toHaveValue("4");
  await expect(numberField(page, "Chanfrein du dessous")).toHaveValue("0");

  // Cells of 30 mm: 399 / 30 and 279 / 30 give 13 × 9 cells in the default drawer.
  await type(page, "Taille de cellule", "30");
  await expect(readout(page, "cells")).toHaveText("13 × 9 cellules");
  await expect(readout(page, "dimensions")).toHaveText("399 × 279 mm");
  await expect(advancedWarning(page)).toBeVisible();
  await expect(advanced).toHaveAccessibleName("Avancé Cellule 30 mm");

  // Back to the default: the warning goes away.
  await type(page, "Taille de cellule", "42");
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(advancedWarning(page)).toHaveCount(0);

  // Any setting of the family counts, the gaps included.
  await type(page, "Chanfrein du dessous", "0,6");
  await expect(advancedWarning(page)).toBeVisible();
  await type(page, "Rayon des coins", "0");
  await expect(advanced).toHaveAccessibleName("Avancé Coins 0 mm, chanfrein 0,6 mm");
  await type(page, "Chanfrein du dessous", "0");
  await type(page, "Rayon des coins", "4");
  await expect(advancedWarning(page)).toHaveCount(0);
  await type(page, "Jeu des trous", "0,3");
  await expect(advancedWarning(page)).toBeVisible();
  await type(page, "Jeu des trous", "0,5");
  await expect(advancedWarning(page)).toHaveCount(0);
  await type(page, "Jeu au tiroir", "2");
  await expect(advancedWarning(page)).toBeVisible();
  await type(page, "Jeu au tiroir", "1");
  await expect(advancedWarning(page)).toHaveCount(0);
  await expect(advanced).toHaveAccessibleName("Avancé Valeurs par défaut");
});

test("the cell size is kept on reload and the test kit follows it", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await page.getByRole("button", { name: /^Avancé/ }).click();
  await type(page, "Taille de cellule", "50");
  // 399 / 50 and 279 / 50: 7 × 5 cells.
  await expect(readout(page, "cells")).toHaveText("7 × 5 cellules");

  await page.reload();
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("7 × 5 cellules");
  await expect(advancedWarning(page)).toBeVisible();
  await page.getByRole("button", { name: /^Profil de poche/ }).click();
  await expect(page.getByText("Une baseplate 1 × 2 de 50 × 100 mm", { exact: false }).filter({ visible: true })).toBeVisible();
});

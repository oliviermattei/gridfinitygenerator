import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { chooseCells, chooseLanguage, closeMenu, closeSettings, isMobile, numberField, openMenu, openSettings, readout, runAction } from "./support";

// Share, memory of the last settings and reset (#8).

// Share copies the link to the clipboard: allowed up front, so that no native prompt shows.
// An English browser: a French page shows that the language comes from the address, or from the menu.
test.use({ permissions: ["clipboard-read", "clipboard-write"], locale: "en-US" });

async function setCells(page: Page, testInfo: TestInfo, columns: number, rows: number) {
  await openSettings(page, testInfo);
  await chooseCells(page);
  await numberField(page, "Colonnes").fill(String(columns));
  await numberField(page, "Rangées").fill(String(rows));
  await expect(readout(page, "cells")).toHaveText(`${columns} × ${rows} cellules`);
  await closeSettings(page, testInfo);
}

test("a shared link opened in a new context gives back the same baseplate", async ({ page, browser }, testInfo) => {
  await page.goto("/fr/baseplate");
  await setCells(page, testInfo, 7, 5);
  await openMenu(page, testInfo);
  await numberField(page, "Hauteur de couche").fill("0,28");
  await numberField(page, "Hauteur de couche").blur();
  await closeMenu(page);

  await runAction(page, testInfo, "Partager");
  await expect(page.getByText("Lien copié")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  // Only what differs from the v1 defaults, whose size mode is the drawer.
  expect(new URL(link).pathname).toBe("/fr/baseplate");
  expect(new URL(link).search).toBe("?v=1&mode=cells&cx=7&cy=5&lh=0.28");

  // Someone else, with nothing stored in their browser, opens the link.
  const other = await browser.newContext({
    viewport: page.viewportSize(),
    isMobile: isMobile(testInfo),
    hasTouch: isMobile(testInfo),
  });
  try {
    const recipient = await other.newPage();
    await recipient.goto(link);
    await expect(readout(recipient, "dimensions")).toHaveText("294 × 210 mm");
    await expect(readout(recipient, "cells")).toHaveText("7 × 5 cellules");
    await openMenu(recipient, testInfo);
    await expect(numberField(recipient, "Hauteur de couche")).toHaveValue("0,28");
  } finally {
    await other.close();
  }
});

test("reloading keeps the settings, and a shared link wins over them", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await setCells(page, testInfo, 6, 3);
  await page.reload();
  await expect(readout(page, "cells")).toHaveText("6 × 3 cellules");
  await openSettings(page, testInfo);
  await expect(numberField(page, "Colonnes")).toHaveValue("6");
  await closeSettings(page, testInfo);

  // A shared link wins over the settings stored in this browser…
  const shared = "/fr/baseplate?v=1&mode=cells&cx=2&cy=2";
  await page.goto(shared);
  await expect(readout(page, "cells")).toHaveText("2 × 2 cellules");
  // …without replacing them while it is only looked at.
  await page.goto("/fr/baseplate");
  await expect(readout(page, "cells")).toHaveText("6 × 3 cellules");

  // Changing a setting of the link stores it, and takes the link out of the address, so
  // that a reload keeps the change.
  await page.goto(shared);
  await expect(readout(page, "cells")).toHaveText("2 × 2 cellules");
  await setCells(page, testInfo, 3, 2);
  await expect(page).toHaveURL(/\/fr\/baseplate$/);
  await page.reload();
  await expect(readout(page, "cells")).toHaveText("3 × 2 cellules");
});

test("reset asks for a confirmation, then brings back the defaults and keeps the preferences", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  // French chosen in the menu, over the English of the browser (#14).
  await chooseLanguage(page, testInfo, "en");
  await chooseLanguage(page, testInfo, "fr");
  await setCells(page, testInfo, 8, 2);
  const menu = await openMenu(page, testInfo);
  await menu.getByRole("radio", { name: "pouces" }).click();
  await menu.getByRole("radio", { name: "Graphite" }).click();
  await numberField(page, "Largeur du plateau").fill("200");
  await numberField(page, "Hauteur de couche").fill("0,28");
  await numberField(page, "Hauteur de couche").blur();
  await closeMenu(page);

  // Cancel: nothing changes.
  await runAction(page, testInfo, "Réinitialiser");
  const confirm = page.getByRole("alertdialog", { name: "Réinitialiser les réglages ?" });
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole("button", { name: "Annuler" })).toBeFocused();
  await confirm.getByRole("button", { name: "Annuler" }).click();
  await expect(confirm).toBeHidden();
  await expect(readout(page, "cells")).toHaveText("8 × 2 cellules");

  // Confirm: the baseplate settings come back to their defaults, the 400 × 280 mm drawer.
  await runAction(page, testInfo, "Réinitialiser");
  await confirm.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(confirm).toBeHidden();
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(readout(page, "dimensions")).toHaveText("399 × 279 mm");

  // The preferences are kept, and the layer height too: it describes the printer.
  await expect(page).toHaveURL(/\/fr\/baseplate$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByTestId("mesh-preview")).toHaveAttribute("data-color", "#2E3137");
  const kept = await openMenu(page, testInfo);
  await expect(kept.getByRole("radio", { name: "pouces" })).toBeChecked();
  await expect(numberField(page, "Largeur du plateau")).toHaveValue("200");
  await expect(numberField(page, "Hauteur de couche")).toHaveValue("0,28");
  await closeMenu(page);
  // The default drawer of 400 × 280 mm, still in inches.
  await openSettings(page, testInfo);
  await expect(numberField(page, "Largeur")).toHaveValue("15,75");
  await closeSettings(page, testInfo);

  // The reset is remembered like any other change.
  await page.reload();
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  // And the language chosen still leads the site root, over the English browser.
  await page.goto("/");
  await expect(page).toHaveURL(/\/fr\/baseplate$/);
});

test("a drawer is shared by its dimensions, and links made before the drawer mode keep their cells", async ({ page, browser }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await numberField(page, "Largeur").fill("500");
  await numberField(page, "Profondeur").fill("300");
  await expect(readout(page, "cells")).toHaveText("11 × 7 cellules");
  await closeSettings(page, testInfo);
  await runAction(page, testInfo, "Partager");
  await expect(page.getByText("Lien copié")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  // The drawer is the default size mode of v1: the link carries its dimensions only.
  expect(new URL(link).search).toBe("?v=1&w=500&d=300");

  const other = await browser.newContext({
    viewport: page.viewportSize(),
    isMobile: isMobile(testInfo),
    hasTouch: isMobile(testInfo),
  });
  try {
    const recipient = await other.newPage();
    await recipient.goto(link);
    await expect(readout(recipient, "dimensions")).toHaveText("499 × 299 mm");
    await expect(readout(recipient, "cells")).toHaveText("11 × 7 cellules");
    // Every link written before #10 said mode=cells: it still opens as that number of cells.
    await recipient.goto("/fr/baseplate?v=1&mode=cells&cx=3&cy=2");
    await expect(readout(recipient, "dimensions")).toHaveText("126 × 84 mm");
    await expect(readout(recipient, "cells")).toHaveText("3 × 2 cellules");
  } finally {
    await other.close();
  }
});

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { closeMenu, closeSettings, isMobile, numberField, openMenu, openSettings, readout } from "./support";

// Share, memory of the last settings and reset (#8).

// Share copies the link to the clipboard: allowed up front, so that no native prompt shows.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

/** Runs an action of the top bar: on the right of the top bar on desktop, in the menu on mobile. */
async function runAction(page: Page, testInfo: TestInfo, name: "Partager" | "Réinitialiser") {
  if (isMobile(testInfo)) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name }).click();
  } else {
    await page.getByRole("button", { name }).click();
  }
}

async function setCells(page: Page, testInfo: TestInfo, columns: number, rows: number) {
  await openSettings(page, testInfo);
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
  // Only what differs from the v1 defaults: the engine builds from a number of cells.
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
  await setCells(page, testInfo, 8, 2);
  const menu = await openMenu(page, testInfo);
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

  // Confirm: the baseplate settings come back to their defaults.
  await runAction(page, testInfo, "Réinitialiser");
  await confirm.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(confirm).toBeHidden();
  await expect(readout(page, "cells")).toHaveText("4 × 3 cellules");
  await expect(readout(page, "dimensions")).toHaveText("168 × 126 mm");

  // The preferences are kept, and the layer height too: it describes the printer.
  await expect(page.getByTestId("mesh-preview")).toHaveAttribute("data-color", "#2E3137");
  await openMenu(page, testInfo);
  await expect(numberField(page, "Largeur du plateau")).toHaveValue("200");
  await expect(numberField(page, "Hauteur de couche")).toHaveValue("0,28");
  await closeMenu(page);

  // The reset is remembered like any other change.
  await page.reload();
  await expect(readout(page, "cells")).toHaveText("4 × 3 cellules");
});

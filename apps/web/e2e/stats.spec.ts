import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { closeSettings, isMobile, numberField, openSettings, readout } from "./support";

/** A value of the statistics frame on screen: on the right on desktop, in the sheet on mobile. */
function stat(page: Page, id: "dimensions" | "cells" | "margin" | "layers" | "volume" | "screws" | "pieces" | "fit") {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

/** The warning of a build plate too small, in the statistics frame on screen. */
function plateWarning(page: Page) {
  return page.getByRole("alert").filter({ hasText: "dépasse votre plateau", visible: true });
}

/** Opens the gear menu: "Paramètres" on desktop, "Menu" (with the actions) on mobile. */
async function openMenu(page: Page, testInfo: TestInfo) {
  const name = isMobile(testInfo) ? "Menu" : "Paramètres";
  await page.getByRole("button", { name }).click();
  const menu = page.getByRole("dialog", { name });
  await expect(menu).toBeVisible();
  return menu;
}

async function closeMenu(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /^(Paramètres|Menu)$/ })).toBeHidden();
}

test("the statistics frame shows the real numbers of the baseplate, and … while the final volume is computed", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);

  await expect(stat(page, "dimensions")).toHaveText("168 × 126 × 4,6 mm");
  await expect(stat(page, "cells")).toHaveText("4 × 3");
  await expect(stat(page, "margin")).toHaveText("aucune");
  await expect(stat(page, "layers")).toHaveText("23 couches de 0,2 mm");
  await expect(stat(page, "screws")).toHaveText("aucune");
  await expect(stat(page, "pieces")).toHaveText("1");
  await expect(stat(page, "fit")).toHaveText("tient");
  // Measured on the final mesh, in cm³: no grams, no estimate.
  const volume = stat(page, "volume");
  await expect(volume).toHaveText(/^\d+,\d cm³$/);
  await expect(volume).not.toHaveAttribute("aria-busy");
  const small = parseFloat((await volume.innerText()).replace(",", "."));

  // A 20 × 20 final takes about a second: the volume shows "…" until it answers.
  await numberField(page, "Colonnes").fill("20");
  await numberField(page, "Rangées").fill("20");
  await expect(stat(page, "cells")).toHaveText("20 × 20");
  await expect(volume).toHaveAttribute("aria-busy", "true");
  await expect(volume).toContainText("…");
  await expect(stat(page, "dimensions")).toHaveText("840 × 840 × 4,6 mm");
  await expect(volume).toHaveText(/^\d[\d\s]*,\d cm³$/, { timeout: 20_000 });
  const large = parseFloat((await volume.innerText()).replace(/\s/g, "").replace(",", "."));
  expect(large).toBeGreaterThan(20 * small);
});

test("the print settings live in the gear menu, and the layer height gives the height in layers", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  const menu = await openMenu(page, testInfo);

  // Nozzle: a preference; choosing one sets the line width, a baseplate setting.
  await expect(menu.getByRole("radiogroup", { name: "Buse" }).getByRole("radio", { name: "0,4" })).toBeChecked();
  await expect(numberField(page, "Largeur de ligne")).toHaveValue("0,4");
  await menu.getByRole("radio", { name: "0,6" }).click();
  await expect(numberField(page, "Largeur de ligne")).toHaveValue("0,6");

  const layerHeight = numberField(page, "Hauteur de couche");
  await expect(layerHeight).toHaveValue("0,2");
  await layerHeight.fill("0,28");
  await layerHeight.blur();
  // Out of range: brought back into 0.1 – 1.2 mm.
  await numberField(page, "Largeur de ligne").fill("5");
  await numberField(page, "Largeur de ligne").blur();
  await expect(numberField(page, "Largeur de ligne")).toHaveValue("1,2");
  await closeMenu(page);

  await openSettings(page, testInfo);
  // The pocket profile is not rounded to the layer: 4.60 mm, 16.4 layers of 0.28 mm printed as 17.
  await expect(stat(page, "layers")).toHaveText("17 couches de 0,28 mm");
  await expect(stat(page, "dimensions")).toHaveText("168 × 126 × 4,6 mm");
});

test("a baseplate larger than the build plate shows the warning and « ne tient pas »", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openMenu(page, testInfo);
  // Default build plate: 256 × 256 mm.
  await expect(numberField(page, "Largeur du plateau")).toHaveValue("256");
  await expect(numberField(page, "Profondeur du plateau")).toHaveValue("256");
  await numberField(page, "Largeur du plateau").fill("200");
  await numberField(page, "Profondeur du plateau").fill("200");
  await numberField(page, "Profondeur du plateau").blur();
  await closeMenu(page);

  await openSettings(page, testInfo);
  await expect(stat(page, "fit")).toHaveText("tient");
  await numberField(page, "Colonnes").fill("5");
  await numberField(page, "Rangées").fill("5");
  await expect(stat(page, "dimensions")).toHaveText("210 × 210 × 4,6 mm");
  await expect(stat(page, "fit")).toHaveText("ne tient pas");
  await expect(plateWarning(page)).toContainText("La baseplate dépasse votre plateau (200 × 200 mm) dans les deux sens.");

  // Mobile: the dock repeats the warning once the sheet is closed.
  if (isMobile(testInfo)) {
    await closeSettings(page, testInfo);
    await expect(page.getByText("Ne tient pas sur le plateau")).toBeVisible();
  }

  // Back to a baseplate that fits: the warning goes away.
  await openSettings(page, testInfo);
  await numberField(page, "Colonnes").fill("4");
  await numberField(page, "Rangées").fill("4");
  await expect(readout(page, "cells")).toHaveText("4 × 4 cellules");
  await expect(stat(page, "fit")).toHaveText("tient");
  await expect(plateWarning(page)).toHaveCount(0);

  // The build plate is a local preference: still there after a reload.
  await page.reload();
  await openMenu(page, testInfo);
  await expect(numberField(page, "Largeur du plateau")).toHaveValue("200");
});

import { expect, test, type Page } from "@playwright/test";
import { chooseCells, closeMenu, closeSettings, isMobile, numberField, openMenu, openSettings } from "./support";

/** A value of the statistics frame on screen: on the right on desktop, in the sheet on mobile. */
function stat(page: Page, id: "dimensions" | "cells" | "margin" | "layers" | "volume" | "screws" | "pieces" | "fit") {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

/** The warning of a build plate too small, in the statistics frame on screen. */
function plateWarning(page: Page) {
  return page.getByRole("alert").filter({ hasText: "dépasse votre plateau", visible: true });
}

test("the statistics frame shows the real numbers of the baseplate, and … while the final volume is computed", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);

  // The default drawer, 400 × 280 mm less its 1 mm gap: the grid centred in its margin.
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 4,6 mm");
  await expect(stat(page, "cells")).toHaveText("9 × 6");
  await expect(stat(page, "margin")).toHaveText("gauche 10,5, droite 10,5, arrière 13,5, avant 13,5 mm");
  await expect(stat(page, "layers")).toHaveText("23 couches de 0,2 mm");
  await expect(stat(page, "screws")).toHaveText("aucune");
  // Larger than the default build plate (256 × 256 mm): cut into 4 pieces that fit on it.
  await expect(stat(page, "pieces")).toHaveText("4");
  await expect(stat(page, "fit")).toHaveText("tient");
  // Measured on the final meshes of the pieces, in cm³: no grams, no estimate. The grid and
  // its frame of crossbars, as measured by the margin prototype (#3, variant 3), less the
  // numbers engraved under the pieces (about 1 mm³ each) and the slots of the clips that join
  // them (27,8 mm³ each), plus the crossbars doubled on the cuts.
  const volume = stat(page, "volume");
  await expect(volume).toHaveText("81,0 cm³");
  await expect(volume).not.toHaveAttribute("aria-busy");

  await chooseCells(page);
  await expect(stat(page, "cells")).toHaveText("4 × 3");
  await expect(stat(page, "margin")).toHaveText("aucune");
  await expect(volume).toHaveText(/^\d+,\d cm³$/);
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
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 4,6 mm");
});

test("a baseplate larger than the build plate is cut, and warns when a cell and its margin do not fit on it", async ({ page }, testInfo) => {
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
  await chooseCells(page);
  await expect(stat(page, "fit")).toHaveText("tient");
  await expect(stat(page, "pieces")).toHaveText("1");
  // 210 × 210 mm on 200 × 200 mm: cut into 2 × 2 pieces, which fit.
  await numberField(page, "Colonnes").fill("5");
  await numberField(page, "Rangées").fill("5");
  await expect(stat(page, "dimensions")).toHaveText("210 × 210 × 4,6 mm");
  await expect(stat(page, "pieces")).toHaveText("4");
  await expect(stat(page, "fit")).toHaveText("tient");
  await expect(plateWarning(page)).toHaveCount(0);

  // A margin of 10 mm on each side on a build plate of 50 mm: a cell fits, not with its margin.
  await closeSettings(page, testInfo);
  await openMenu(page, testInfo);
  await numberField(page, "Largeur du plateau").fill("50");
  await numberField(page, "Profondeur du plateau").fill("50");
  await numberField(page, "Profondeur du plateau").blur();
  await closeMenu(page);
  await openSettings(page, testInfo);
  await expect(stat(page, "pieces")).toHaveText("25");
  await expect(stat(page, "fit")).toHaveText("tient");
  await numberField(page, "Marge en largeur").fill("20");
  await numberField(page, "Marge en largeur").blur();
  await expect(stat(page, "dimensions")).toHaveText("230 × 210 × 4,6 mm");
  await expect(stat(page, "fit")).toHaveText("ne tient pas");
  await expect(plateWarning(page)).toContainText("Même découpée, une pièce dépasse votre plateau (50 × 50 mm) dans les deux sens");

  // Mobile: the dock repeats the warning once the sheet is closed.
  if (isMobile(testInfo)) {
    await closeSettings(page, testInfo);
    await expect(page.getByText("Ne tient pas sur le plateau")).toBeVisible();
    await openSettings(page, testInfo);
  }

  // Back to a margin that fits: the warning goes away.
  await numberField(page, "Marge en largeur").fill("0");
  await numberField(page, "Marge en largeur").blur();
  await expect(stat(page, "fit")).toHaveText("tient");
  await expect(plateWarning(page)).toHaveCount(0);

  // The build plate is a local preference: still there after a reload.
  await page.reload();
  await openMenu(page, testInfo);
  await expect(numberField(page, "Largeur du plateau")).toHaveValue("50");
});

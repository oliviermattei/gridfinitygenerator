import { expect, test, type Page } from "@playwright/test";
import { chooseCells, numberField, openSettings, readout } from "./support";

// Drawer, alignment (#10) and margin (#10, #19).

/** A value of the statistics frame on screen: on the right on desktop, in the sheet on mobile. */
function stat(page: Page, id: "dimensions" | "cells" | "margin" | "volume") {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

/** The warning of a margin too narrow to print, on screen. */
function narrowMarginWarning(page: Page) {
  return page.getByRole("alert").filter({ hasText: "plus étroite que deux largeurs de ligne", visible: true });
}

test("entering a drawer updates the cells, the preview and the statistics", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");

  // The default drawer, 400 × 280 mm, less the 1 mm gap: 9 × 6 cells, the rest in the margin.
  await expect(page.getByRole("radio", { name: "Tiroir" })).toBeChecked();
  await expect(numberField(page, "Largeur")).toHaveValue("400");
  await expect(numberField(page, "Profondeur")).toHaveValue("280");
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(page.getByTestId("size-result").filter({ visible: true })).toHaveText("9 × 6 cellules, marge 21 × 27 mm");
  await expect(stat(page, "margin")).toHaveText("gauche 10,5, droite 10,5, arrière 13,5, avant 13,5 mm");
  await expect(preview).not.toHaveAttribute("data-triangles", "0");
  const drawerTriangles = await preview.getAttribute("data-triangles");

  await numberField(page, "Largeur").fill("500");
  await numberField(page, "Profondeur").fill("300");
  // 499 / 42 gives 11 cells and 37 mm left; 299 / 42 gives 7 cells and 5 mm left.
  await expect(readout(page, "cells")).toHaveText("11 × 7 cellules");
  await expect(readout(page, "dimensions")).toHaveText("499 × 299 mm");
  await expect(page.getByTestId("size-result").filter({ visible: true })).toHaveText("11 × 7 cellules, marge 37 × 5 mm");
  await expect(stat(page, "dimensions")).toHaveText("499 × 299 × 4,6 mm");
  await expect(stat(page, "cells")).toHaveText("11 × 7");
  await expect(stat(page, "margin")).toHaveText("gauche 18,5, droite 18,5, arrière 2,5, avant 2,5 mm");
  await expect(preview).not.toHaveAttribute("data-triangles", drawerTriangles ?? "");

  // The grid pushed to the back left: the whole margin goes to the right and to the front.
  const alignment = page.getByRole("button", { name: /^Alignement/ });
  await alignment.click();
  await expect(alignment).toHaveAccessibleName("Alignement Centre");
  await page.getByRole("radio", { name: "Arrière gauche" }).click();
  await expect(alignment).toHaveAccessibleName("Alignement Arrière gauche");
  await expect(stat(page, "margin")).toHaveText("gauche 0, droite 37, arrière 0, avant 5 mm");
  await page.getByRole("radio", { name: "Avant droite" }).click();
  await expect(stat(page, "margin")).toHaveText("gauche 37, droite 0, arrière 5, avant 0 mm");

  // Without the gap, the drawer itself: 500 × 300 mm.
  const advanced = page.getByRole("button", { name: /^Avancé/ });
  await advanced.click();
  await expect(advanced).toHaveAccessibleName("Avancé Valeurs par défaut");
  await numberField(page, "Jeu au tiroir").fill("0");
  await expect(readout(page, "dimensions")).toHaveText("500 × 300 mm");
  await expect(stat(page, "margin")).toHaveText("gauche 38, droite 0, arrière 6, avant 0 mm");
});

test("the margin carries the grid on up to the drawer, and the statistics count its truncated cells", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const volume = stat(page, "volume");

  // The default drawer: the 9 × 6 grid (77,2 cm³) and its margin of truncated cells, as high
  // as the grid (24,3 cm³), as measured by the margin prototype (#3, variant 1 flush).
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 4,6 mm");
  await expect(volume).toHaveText("101,5 cm³");
  const drawerTriangles = await page.getByTestId("mesh-preview").getAttribute("data-triangles");
  expect(drawerTriangles).not.toBeNull();

  // 500 × 300 mm: 11 × 7 cells, a margin of 18,5 mm on the left and right, carried on in
  // truncated cells, and of 2,5 mm at the back and front, too narrow for a hole: full.
  await numberField(page, "Largeur").fill("500");
  await numberField(page, "Profondeur").fill("300");
  await expect(stat(page, "cells")).toHaveText("11 × 7");
  await expect(stat(page, "margin")).toHaveText("gauche 18,5, droite 18,5, arrière 2,5, avant 2,5 mm");
  await expect(stat(page, "dimensions")).toHaveText("499 × 299 × 4,6 mm");
  await expect(volume).toHaveText("133,8 cm³");
  await expect(page.getByTestId("mesh-preview")).not.toHaveAttribute("data-triangles", drawerTriangles ?? "");
});

test("a margin narrower than two line widths shows a warning", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(narrowMarginWarning(page)).toHaveCount(0);

  // 43.5 mm less the gap: one cell and 0.25 mm of margin on each side.
  await numberField(page, "Largeur").fill("43,5");
  await expect(readout(page, "dimensions")).toHaveText("42,5 × 279 mm");
  await expect(stat(page, "margin")).toHaveText("gauche 0,25, droite 0,25, arrière 13,5, avant 13,5 mm");
  await expect(narrowMarginWarning(page)).toContainText(
    "Une marge de 0,25 mm est plus étroite que deux largeurs de ligne (0,8 mm)",
  );

  // A margin of 2 mm on each side prints well.
  await numberField(page, "Largeur").fill("47");
  await expect(readout(page, "dimensions")).toHaveText("46 × 279 mm");
  await expect(narrowMarginWarning(page)).toHaveCount(0);

  // In cells mode, no margin at all is no warning either.
  await chooseCells(page);
  await expect(readout(page, "dimensions")).toHaveText("168 × 126 mm");
  await expect(stat(page, "margin")).toHaveText("aucune");
  await expect(narrowMarginWarning(page)).toHaveCount(0);
  await numberField(page, "Marge en largeur").fill("1");
  await expect(readout(page, "dimensions")).toHaveText("169 × 126 mm");
  await expect(narrowMarginWarning(page)).toContainText("Une marge de 0,5 mm");
});

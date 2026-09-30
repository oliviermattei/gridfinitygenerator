import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { chooseCells, closeSettings, openSettings, readout } from "./support";

// The type of baseplate (#25): the open grid (Normal, the default) or a tray, the grid on a
// solid floor, its pockets raised by the floor and a layer of gap (ADR 0013).

/** A statistic of the frame on screen (on the right on desktop, in the sheet on mobile). */
function stat(page: Page, id: string) {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

/** A type, by its label, in the open type family. */
function type(page: Page, label: "Normal" | "Tray") {
  return page.getByRole("radio", { name: new RegExp(`^${label}`) });
}

test("choosing the tray raises the baseplate on a floor, in the preview and the statistics", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");
  const family = page.getByRole("button", { name: /^Type/ });

  // Normal by default: the open grid, 4.6 mm; the default drawer cut in 4 pieces.
  await expect(family).toHaveAccessibleName("Type Normal, sans fond");
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(stat(page, "volume")).toHaveText("79,0 cm³");
  const normalTriangles = await preview.getAttribute("data-triangles");

  // Each type shows the volume it gives, measured on its final mesh.
  await family.click();
  await expect(type(page, "Normal")).toBeChecked();
  await expect(type(page, "Normal")).toContainText("79,0 cm³");
  await expect(type(page, "Tray")).toContainText("140,9 cm³");

  await type(page, "Tray").click();
  await expect(type(page, "Tray")).toBeChecked();
  // 0.6 mm of floor and 0.2 mm of gap: 5.4 mm, 27 layers, measured on the new mesh.
  await expect(readout(page, "height")).toHaveText("5,4 mm");
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 5,4 mm");
  await expect(stat(page, "layers")).toHaveText("27 couches de 0,2 mm");
  await expect(stat(page, "volume")).toHaveText("140,9 cm³");
  await expect(preview).not.toHaveAttribute("data-triangles", normalTriangles ?? "");
  await expect(family).toHaveAccessibleName("Type Tray, fond plein");
  await expect(page.getByText(/La grille sur un fond plein de 0,6 mm/).filter({ visible: true })).toBeVisible();
  // The magnets and the clips stay: the same numbers as the open grid.
  await expect(stat(page, "magnets")).toHaveText("28 (Ø 6 × 2 mm)");

  // Kept in the share link and on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Tray, fond plein");
  await expect(readout(page, "height")).toHaveText("5,4 mm");

  // The file says which type it holds, and its link gives it back.
  await closeSettings(page, testInfo);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le 3MF" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("baseplate-9x6-399x279mm-tray.3mf");
  const model = strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain("ty=tray");
});

test("a shared link carries the type, a link without it gives the open grid", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&mode=cells&ty=tray");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Tray, fond plein");
  await expect(stat(page, "volume")).toHaveText("30,4 cm³");

  // A type the engine does not build yet gives the open grid.
  await page.goto("/fr/baseplate?v=1&mode=cells&ty=skeleton");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Normal, sans fond");
  await expect(stat(page, "volume")).toHaveText("16,7 cm³");
});

test("without a margin, the types still compare their volumes", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await chooseCells(page);
  await page.getByRole("button", { name: /^Type/ }).click();
  await expect(type(page, "Normal")).toContainText("16,7 cm³");
  await expect(type(page, "Tray")).toContainText("30,4 cm³");
});

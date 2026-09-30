import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { chooseCells, closeSettings, openSettings, readout } from "./support";

// The type of baseplate (#25): the open grid (Normal, the default), a tray, the grid on a
// solid floor, its pockets raised by the floor and a layer of gap (ADR 0013), a skeleton,
// its murets notched between the crossings (#26, ADR 0014), or CLICKbase, whose lamellas
// hold the bins (#27, ADR 0015).

/** A statistic of the frame on screen (on the right on desktop, in the sheet on mobile). */
function stat(page: Page, id: string) {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

/** A type, by its label, in the open type family. */
function type(page: Page, label: "Normal" | "Tray" | "Skeleton" | "CLICKbase") {
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
  await expect(stat(page, "volume")).toHaveText("79,2 cm³");
  const normalTriangles = await preview.getAttribute("data-triangles");

  // Each type shows the volume it gives, measured on its final mesh.
  await family.click();
  await expect(type(page, "Normal")).toBeChecked();
  await expect(type(page, "Normal")).toContainText("79,2 cm³");
  await expect(type(page, "Tray")).toContainText("141,1 cm³");
  await expect(type(page, "Skeleton")).toContainText("42,0 cm³");
  await expect(type(page, "CLICKbase")).toContainText("67,0 cm³");

  await type(page, "Tray").click();
  await expect(type(page, "Tray")).toBeChecked();
  // 0.6 mm of floor and 0.2 mm of gap: 5.4 mm, 27 layers, measured on the new mesh.
  await expect(readout(page, "height")).toHaveText("5,4 mm");
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 5,4 mm");
  await expect(stat(page, "layers")).toHaveText("27 couches de 0,2 mm");
  await expect(stat(page, "volume")).toHaveText("141,1 cm³");
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
  await expect(stat(page, "volume")).toHaveText("30,3 cm³");

  await page.goto("/fr/baseplate?v=1&mode=cells&ty=skeleton");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Skeleton, allégée");
  await expect(stat(page, "volume")).toHaveText("9,5 cm³");

  await page.goto("/fr/baseplate?v=1&mode=cells&ty=clickbase");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type CLICKbase, bins clipsés");
  await expect(stat(page, "volume")).toHaveText("14,0 cm³");

  // A type the engine does not know gives the open grid.
  await page.goto("/fr/baseplate?v=1&mode=cells&ty=hollow");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Normal, sans fond");
  await expect(stat(page, "volume")).toHaveText("16,5 cm³");
});

test("without a margin, the types still compare their volumes", async ({ page }, testInfo) => {
  // 4 × 3 cells without margin: the 8 edge slots of the sides are in every volume (#37); the
  // lamellas of a CLICKbase next to them are shorter, and give back more than they take.
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await chooseCells(page);
  await page.getByRole("button", { name: /^Type/ }).click();
  await expect(type(page, "Normal")).toContainText("16,5 cm³");
  await expect(type(page, "Tray")).toContainText("30,3 cm³");
  await expect(type(page, "Skeleton")).toContainText("9,5 cm³");
  await expect(type(page, "CLICKbase")).toContainText("14,0 cm³");
});

test("choosing the skeleton notches the murets, halves the material and keeps its clips, in its posts", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");
  await expect(stat(page, "volume")).toHaveText("79,2 cm³");
  await expect(stat(page, "clips")).toHaveText("8");
  const normalTriangles = await preview.getAttribute("data-triangles");

  await page.getByRole("button", { name: /^Type/ }).click();
  await type(page, "Skeleton").click();
  await expect(type(page, "Skeleton")).toBeChecked();
  // As high as the open grid, about half its material, measured on the new mesh.
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(stat(page, "volume")).toHaveText("42,0 cm³");
  await expect(preview).not.toHaveAttribute("data-triangles", normalTriangles ?? "");
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type Skeleton, allégée");
  await expect(page.getByText(/jusqu'à une bande de 0,4 mm/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/Les clips se logent dans les poteaux/).filter({ visible: true })).toBeVisible();
  // The magnets stay under the crossings, in the posts; so do the clips, at the corners (#30).
  await expect(stat(page, "magnets")).toHaveText("28 (Ø 6 × 2 mm)");
  await expect(stat(page, "clips")).toHaveText("8");

  // The file says which type it holds, and holds its clips.
  await closeSettings(page, testInfo);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le 3MF" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("baseplate-9x6-399x279mm-skeleton.3mf");
  const model = strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain("ty=skeleton");
  expect(model).toContain("clip × 8");
});

test("choosing CLICKbase cuts the lamellas, keeps the clips and warns to print in PETG", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");
  const warning = page.getByRole("alert").filter({ hasText: /imprimez en PETG/ }).filter({ visible: true });
  await expect(stat(page, "volume")).toHaveText("79,2 cm³");
  await expect(warning).toHaveCount(0);
  const normalTriangles = await preview.getAttribute("data-triangles");

  await page.getByRole("button", { name: /^Type/ }).click();
  await type(page, "CLICKbase").click();
  await expect(type(page, "CLICKbase")).toBeChecked();
  await expect(page.getByRole("button", { name: /^Type/ })).toHaveAccessibleName("Type CLICKbase, bins clipsés");
  // As high as the open grid, less material (the slits), measured on the new mesh.
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(stat(page, "volume")).toHaveText("67,0 cm³");
  await expect(preview).not.toHaveAttribute("data-triangles", normalTriangles ?? "");
  await expect(page.getByText(/serrent le pied du bin de 0,25 mm/).filter({ visible: true })).toBeVisible();
  // PETG, Arachne and a 0.4 mm nozzle: said in the family, and with the statistics.
  await expect(page.getByTestId("clickbase-warning").filter({ visible: true })).toContainText("imprimez en PETG, pas en PLA");
  await expect(page.getByTestId("clickbase-warning").filter({ visible: true })).toContainText("Arachne, buse de 0,4 mm");
  await expect(warning).toHaveCount(1);
  // The magnets stay under the crossings, the clips at the corners, the lamellas next to them shortened.
  await expect(stat(page, "magnets")).toHaveText("28 (Ø 6 × 2 mm)");
  await expect(stat(page, "clips")).toHaveText("8");

  // The file says which type it holds, and its link gives it back.
  await closeSettings(page, testInfo);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le 3MF" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("baseplate-9x6-399x279mm-clickbase.3mf");
  const model = strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain("ty=clickbase");
  expect(model).toContain("clip ×");

  // Back to the open grid, the warning goes. The type family may still be open (desktop): a
  // click would close it, and the next one land in the panel as it collapses.
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Type/ });
  if ((await family.getAttribute("aria-expanded")) !== "true") await family.click();
  await expect(family).toHaveAttribute("aria-expanded", "true");
  await type(page, "Normal").click();
  await expect(stat(page, "volume")).toHaveText("79,2 cm³");
  await expect(warning).toHaveCount(0);
});

import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { closeSettings, numberField, openSettings, readout, runAction } from "./support";

// The bin generator (#32).

test("the bin page opens on the default bin, 2 × 1 cells of 3 U, and downloads it", async ({ page }, testInfo) => {
  const response = await page.goto("/fr/bin");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Générateur de bins/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Générateur de bins");
  await expect(readout(page, "dimensions")).toHaveText("83,5 × 41,5 mm");
  await expect(readout(page, "cells")).toHaveText("2 × 1 cellules, 3 U");

  await openSettings(page, testInfo);
  // Measured on the mesh: 21 mm of walls and 4 mm of stacking lip.
  await expect(page.getByTestId("stat-height").filter({ visible: true })).toHaveText("25 mm (21 sans rebord)");
  await expect(page.getByTestId("stat-volume").filter({ visible: true })).toHaveText(/^\d+,\d cm³$/);
  await closeSettings(page, testInfo);

  const [threeMf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
  expect(threeMf.suggestedFilename()).toBe("bin-2x1x3u.3mf");
  const model = strFromU8(unzipSync(await readFile(await threeMf.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain('name="bin-2x1x3u"');
  expect(model).toMatch(/<metadata name="Description">https?:\/\/[^<]+\/fr\/bin\?v=1</);
});

test("compartments, finishes and lip change the bin, and its share link carries them", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/fr/bin");
  await openSettings(page, testInfo);
  await page.getByRole("button", { name: /^Compartiments/ }).click();
  await numberField(page, "En largeur").fill("3");
  await numberField(page, "En profondeur").fill("2");
  await numberField(page, "En profondeur").press("Tab");
  await expect(page.getByTestId("stat-compartments").filter({ visible: true })).toHaveText("6");

  await page.getByRole("button", { name: /^Finitions/ }).click();
  await page.getByRole("switch", { name: "Pelle" }).click();
  await page.getByRole("switch", { name: "Onglet d'étiquette" }).click();
  await page.getByRole("button", { name: /^Rebord d'empilage/ }).click();
  await page.getByRole("radio", { name: "Aucun" }).click();
  await expect(page.getByTestId("stat-height").filter({ visible: true })).toHaveText("21 mm");
  await closeSettings(page, testInfo);

  await runAction(page, testInfo, "Partager");
  await expect(page.getByText("Lien copié")).toBeVisible();
  const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(link.pathname + link.search).toBe("/fr/bin?v=1&dx=3&dy=2&lip=none&sc=1&lt=1");

  // Reopened, the link gives the same bin.
  await page.goto(link.pathname + link.search);
  await expect(readout(page, "cells")).toHaveText("2 × 1 cellules, 3 U");
  await openSettings(page, testInfo);
  await expect(page.getByTestId("stat-compartments").filter({ visible: true })).toHaveText("6");
});

test("a bin larger than the build plate is shown, not downloadable, and its link is not changed", async ({ page }, testInfo) => {
  await page.goto("/fr/bin?v=1&x=7");
  await expect(readout(page, "cells")).toHaveText("7 × 1 cellules, 3 U");
  await expect(page).toHaveURL(/\/fr\/bin\?v=1&x=7$/);
  await expect(page.getByRole("button", { name: "Télécharger le 3MF" })).toBeDisabled();
  if (testInfo.project.name === "mobile") await expect(page.getByText("Dépasse le plateau")).toBeVisible();
  await openSettings(page, testInfo);
  await expect(page.getByText(/Ce bin dépasse votre plateau \(256 × 256 mm\)/).filter({ visible: true })).toBeVisible();
  // The steppers stop at the plate: one cell less, and it fits again.
  await page.getByRole("button", { name: "Une cellule de moins en largeur" }).click();
  await expect(readout(page, "cells")).toHaveText("6 × 1 cellules, 3 U");
  await expect(page.getByRole("button", { name: "Une cellule de plus en largeur" })).toBeDisabled();
  await closeSettings(page, testInfo);
  await expect(page.getByRole("button", { name: "Télécharger le 3MF" })).toBeEnabled();
});

test("the bin page in English, and back to the index", async ({ page }) => {
  await page.goto("/en/bin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bin generator");
  await expect(readout(page, "cells")).toHaveText("2 × 1 cells, 3 U");
  await page.getByRole("link", { name: "All generators" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.getByRole("link", { name: /Bins/ }).click();
  await expect(page).toHaveURL(/\/en\/bin$/);
});

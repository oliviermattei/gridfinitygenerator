import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { chooseCells, closeSettings, openSettings } from "./support";

// Stacked print of the pieces of a cut baseplate (#28): an export preference, offered only
// with several pieces, refused with a low margin.

test("the stack is offered with several pieces, asks for a margin held upside down, and exports the stacks", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Empiler les pièces/ });
  const toggle = page.getByRole("switch", { name: "Empiler les pièces" });

  // The default drawer, cut in 4 pieces, has a frame of 2 mm: it would hang in the air.
  await expect(family).toHaveAccessibleName("Empiler les pièces Marge en cadre");
  await expect(toggle).toBeDisabled();
  await family.click();
  await page.getByRole("button", { name: "Passer aux cellules tronquées" }).click();
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Cellules tronquées");

  await expect(toggle).toBeEnabled();
  await expect(family).toHaveAccessibleName("Empiler les pièces Désactivé");
  await toggle.click();
  await expect(family).toHaveAccessibleName("Empiler les pièces 4 pièces en 2 piles");
  // The 5-column pieces and the back left one in a stack; the front left one would need both mirrors.
  await expect(page.getByTestId("stack-plan").filter({ visible: true })).toHaveText("Pile 1 : pièces 2, 4, 1, 14,2 mmPile 2 : pièces 3, 4,6 mm");
  await expect(page.getByText(/pas de 4,8 mm/).filter({ visible: true })).toBeVisible();

  await closeSettings(page, testInfo); // mobile: the download sits in the dock, under the sheet
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
  expect(download.suggestedFilename()).toBe("baseplate-9x6-399x279mm-stack.3mf");
  const model = strFromU8(unzipSync(await readFile(await download.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  const objects = [...model.matchAll(/<object\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/object>/g)];
  expect(objects.map(([, name]) => name)).toEqual(["pile 1 : pièces 2, 4, 1", "pile 2 : pièces 3", "clip × 15"]);
  // The first stack keeps its heights: 3 pieces of 4.6 mm, one layer of 0.2 mm between two.
  const heights = [...(objects[0]?.[2] ?? "").matchAll(/ z="([^"]+)"/g)].map(([, z]) => Number(z));
  expect(heights.reduce((low, z) => Math.min(low, z), Infinity)).toBe(0);
  expect(heights.reduce((high, z) => Math.max(high, z), -Infinity)).toBeCloseTo(14.2, 4);
  expect(heights.some((z) => Math.abs(z - 4.8) < 1e-4)).toBe(true);

  // A preference of this browser: kept on reload, out of the share link.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(page.getByRole("switch", { name: "Empiler les pièces" })).toBeChecked();
  expect(page.url()).not.toContain("stack");
});

test("a baseplate in a single piece offers no stack", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Empiler les pièces/ })).toBeVisible();
  const size = page.getByRole("button", { name: /^Taille/ });
  if ((await size.getAttribute("aria-expanded")) !== "true") await size.click();
  await chooseCells(page);
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("1");
  await expect(page.getByRole("button", { name: /^Empiler les pièces/ })).toHaveCount(0);
});

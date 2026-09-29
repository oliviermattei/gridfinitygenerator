import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { closeSettings, openSettings, readout } from "./support";

/** A statistic of the frame on screen (on the right on desktop, in the sheet on mobile). */
function stat(page: Page, id: string) {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

test("choosing the flush profile lowers the baseplate, in the preview and the statistics", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const preview = page.getByTestId("mesh-preview");
  const family = page.getByRole("button", { name: /^Profil de poche/ });

  // Hybrid by default, the recommended profile: 4.60 mm, 23 layers of 0.2 mm.
  await expect(family).toHaveAccessibleName("Profil de poche Hybride");
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(stat(page, "layers")).toHaveText("23 couches de 0,2 mm");
  const hybridTriangles = await preview.getAttribute("data-triangles");

  await family.click();
  await expect(page.getByRole("radio", { name: /^Hybride/ })).toBeChecked();
  const flush = page.getByRole("radio", { name: /^Ras/ });
  await expect(flush).toBeEnabled();
  await flush.click();
  await expect(flush).toBeChecked();

  // 4.25 mm, measured on the new mesh: the preview received it.
  await expect(readout(page, "height")).toHaveText("4,25 mm");
  await expect(stat(page, "dimensions")).toHaveText("399 × 279 × 4,25 mm");
  await expect(stat(page, "layers")).toHaveText("22 couches de 0,2 mm");
  await expect(preview).not.toHaveAttribute("data-triangles", hybridTriangles ?? "");
  await expect(family).toHaveAccessibleName("Profil de poche Ras");

  // Kept in the share link and on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(readout(page, "height")).toHaveText("4,25 mm");

  // The file says which profile it holds.
  await closeSettings(page, testInfo);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le 3MF" }).click(),
  ]);
  expect(file.suggestedFilename()).toBe("baseplate-9x6-399x279mm-flush.3mf");
  const model = strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain("pr=flush");
});

test("the test kit downloads as a single 3MF, from the pocket profile family", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await page.getByRole("button", { name: /^Profil de poche/ }).click();

  const kit = page.getByRole("button", { name: "Télécharger le kit de test" });
  await expect(kit).toBeVisible();
  const [file] = await Promise.all([page.waitForEvent("download"), kit.click()]);
  expect(file.suggestedFilename()).toBe("baseplate-test-kit-hybrid-flush-42x84mm.3mf");

  // One 3MF package, one named object in millimetres, with the share link of the settings.
  const parts = unzipSync(await readFile(await file.path()));
  expect(Object.keys(parts)).toContain("3D/3dmodel.model");
  const model = strFromU8(parts["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toContain('unit="millimeter"');
  expect(model.match(/<object /g)).toHaveLength(1);
  expect(model).toContain('name="baseplate-test-kit-hybrid-flush-42x84mm"');
  expect(model).toMatch(/<metadata name="Description">https?:\/\/[^<?]+\/fr\/baseplate\?v=1</);
  expect(model.match(/<triangle /g)?.length).toBeGreaterThan(0);

  // The baseplate on screen is left as it was.
  await expect(readout(page, "cells")).toHaveText("9 × 6 cellules");
  await expect(kit).toBeEnabled();
});

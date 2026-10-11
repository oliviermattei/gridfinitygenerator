import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { closeSettings, openSettings, readout } from "./support";

// A single pocket profile, the hybrid one (ADR 0002): the flush profile and its key `pr` are
// retired, and what still carries them opens with the hybrid profile.

test("a link of the retired flush profile opens the baseplate with the hybrid profile", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate?v=1&mode=cells&cx=2&cy=2&pr=flush");
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("2 × 2 cellules");
  // 4.60 mm, measured on the mesh: the hybrid profile.
  await expect(readout(page, "height")).toHaveText("4,6 mm");
  await expect(page.getByRole("button", { name: /^Profil de poche/ })).toHaveCount(0);

  // The file and its share link say nothing of a profile.
  await closeSettings(page, testInfo);
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
  expect(file.suggestedFilename()).toBe("baseplate-2x2-84x84mm.3mf");
  const model = strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toMatch(/<metadata name="Description">https?:\/\/[^<?]+\/fr\/baseplate\?v=1&amp;mode=cells&amp;cx=2&amp;cy=2</);
  expect(model).not.toContain("pr=");
});

test("settings stored with the flush profile come back with the hybrid one", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await page.evaluate(() => localStorage.setItem("settings", "v=1&mode=cells&cx=3&cy=2&pr=flush"));
  await page.reload();
  await openSettings(page, testInfo);
  await expect(readout(page, "cells")).toHaveText("3 × 2 cellules");
  await expect(readout(page, "height")).toHaveText("4,6 mm");
});

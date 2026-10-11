import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "@playwright/test";
import { closeMenu, closeSettings, openMenu, openSettings } from "./support";

// A Bambu Lab printer makes the 3MF a Bambu Studio project (ADR 0023): one plate per piece,
// and the settings of the printer, its nozzle and the filament.

test("with a Bambu Lab P1S, a cut baseplate downloads as a Bambu Studio project, one piece per plate", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  const menu = await openMenu(page, testInfo);
  await menu.getByRole("radio", { name: "Bambu Lab P1S" }).click();
  // The bed of the printer is the build plate.
  await expect(menu.getByText("256 × 256 mm, celui de l'imprimante.")).toBeVisible();
  await expect(menu.getByRole("textbox", { name: "Largeur du plateau", exact: true })).toHaveCount(0);
  await closeMenu(page);

  await openSettings(page, testInfo);
  await expect(page.getByTestId("stat-pieces").filter({ visible: true })).toHaveText("4");
  await closeSettings(page, testInfo); // mobile: the download sits in the dock, under the sheet

  const [threeMf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
  expect(threeMf.suggestedFilename()).toBe("baseplate-9x6-399x279mm.3mf");
  const files = unzipSync(await readFile(await threeMf.path()));
  const model = strFromU8(files["3D/3dmodel.model"] ?? new Uint8Array());
  expect(model).toMatch(/<metadata name="Application">BambuStudio-[\d.]+<\/metadata>/);
  // The meshes stay in the model, where every slicer reads them.
  expect([...model.matchAll(/<object\b[^>]*\bname="([^"]*)"/g)].map(([, name]) => name)).toEqual(["pièce 1", "pièce 2", "pièce 3", "pièce 4", "clip × 8"]);

  const config = strFromU8(files["Metadata/model_settings.config"] ?? new Uint8Array());
  const plates = [...config.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(([, plate]) => ({
    name: /key="plater_name" value="([^"]*)"/.exec(plate ?? "")?.[1],
    objects: plate?.match(/<model_instance>/g)?.length,
  }));
  // The clips beside the last piece.
  expect(plates).toEqual([
    { name: "pièce 1", objects: 1 },
    { name: "pièce 2", objects: 1 },
    { name: "pièce 3", objects: 1 },
    { name: "pièce 4", objects: 2 },
  ]);
  const settings = JSON.parse(strFromU8(files["Metadata/project_settings.config"] ?? new Uint8Array())) as Record<string, unknown>;
  expect(settings).toMatchObject({
    printer_settings_id: "Bambu Lab P1S 0.4 nozzle",
    filament_settings_id: ["Bambu PLA Basic @BBL P1S 0.4 nozzle"],
    layer_height: "0.2",
  });
});

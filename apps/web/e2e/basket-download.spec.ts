import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Download, type Page } from "@playwright/test";

// The download of the basket (#43, ADR 0024): rangé as on the page, a ZIP of a 3MF per plate
// with « Autre », a Bambu Studio project with a Bambu Lab P1S; read back from the files.

/** Fills the basket of this browser, then opens its page. */
async function openBasket(page: Page, articles: { model: string; link: string; quantity: number }[], preferences: object = {}) {
  await page.goto("/fr");
  await page.evaluate(
    ([stored, prefs]) => {
      localStorage.setItem("basket", JSON.stringify({ v: 1, articles: stored }));
      localStorage.setItem("preferences", JSON.stringify(prefs));
    },
    [articles.map((article, k) => ({ id: `a${k}`, ...article })), preferences] as const,
  );
  await page.goto("/fr/panier");
}

async function download(page: Page, name: string): Promise<{ file: Download; files: Record<string, Uint8Array> }> {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name }).click()]);
  return { file, files: unzipSync(await readFile(await file.path())) };
}

const objectNames = (model: string) => [...model.matchAll(/<object\b[^>]*\bname="([^"]*)"/g)].map(([, name]) => name);

// Two bins, a cut baseplate (2 pieces and their clips) and a bin too large for the plate.
const BASKET = [
  { model: "bin", link: "v=1", quantity: 2 },
  { model: "baseplate", link: "v=1&mode=cells&cx=7&cy=1", quantity: 1 },
  { model: "bin", link: "v=1&x=7", quantity: 1 },
];

test("with « Autre », a ZIP of a 3MF per plate, the article too large left out", async ({ page }) => {
  await openBasket(page, BASKET, { packingMode: "by-category" });
  await expect(page.getByTestId("packing-status")).toHaveText(/le minimum possible/);
  const plateNames = await page.getByTestId("plate-name").allTextContents();
  await expect(page.getByTestId("download-excluded")).toHaveText("Un article ne tient pas sur le plateau : il n'est pas téléchargé.");

  const { file, files } = await download(page, "Télécharger les 3MF");
  expect(file.suggestedFilename()).toBe(`panier-${plateNames.length}-plateaux.zip`);
  expect(Object.keys(files)).toEqual(plateNames.map((_, k) => `panier-plateau-${k + 1}.3mf`));

  const models = Object.values(files).map((threeMf) => strFromU8(unzipSync(threeMf)["3D/3dmodel.model"] ?? new Uint8Array()));
  models.forEach((model, k) => expect(model).toContain(`<metadata name="Title">${plateNames[k]}</metadata>`));
  expect(models.flatMap(objectNames).sort()).toEqual(
    ["Bin 2×1, 3 U (1)", "Bin 2×1, 3 U (2)", "Baseplate 294 × 42 — pièce 1", "Baseplate 294 × 42 — pièce 2", "Baseplate 294 × 42 — clips × 1"].sort(),
  );
  // Each object carries the share link of its article.
  expect(models.join("")).toMatch(/<metadatagroup><metadata name="Description">http:\/\/[^<]+\/fr\/bin\?v=1<\/metadata><\/metadatagroup>/);
});

test("with a Bambu Lab P1S, one Bambu Studio project, a plate per plate of the rangement", async ({ page }) => {
  await openBasket(page, BASKET, { printer: "bambu-p1s", packingMode: "one-per-plate" });
  await expect(page.getByTestId("packing-status")).toHaveText(/le minimum possible/);
  const plateNames = await page.getByTestId("plate-name").allTextContents();
  expect(plateNames).toHaveLength(5);

  const { file, files } = await download(page, "Télécharger le projet Bambu");
  expect(file.suggestedFilename()).toBe("panier-5-plateaux.3mf");
  const config = strFromU8(files["Metadata/model_settings.config"] ?? new Uint8Array());
  const plates = [...config.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(([, plate]) => ({
    name: /key="plater_name" value="([^"]*)"/.exec(plate ?? "")?.[1],
    objects: plate?.match(/<model_instance>/g)?.length,
  }));
  expect(plates).toEqual(plateNames.map((name) => ({ name, objects: 1 })));
  const settings = JSON.parse(strFromU8(files["Metadata/project_settings.config"] ?? new Uint8Array())) as Record<string, unknown>;
  expect(settings).toMatchObject({
    printer_settings_id: "Bambu Lab P1S 0.4 nozzle",
    filament_settings_id: ["Bambu PLA Basic @BBL P1S 0.4 nozzle"],
    layer_height: "0.2",
  });
});

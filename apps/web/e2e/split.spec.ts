import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { closeSettings, isMobile, openSettings } from "./support";

/** A value of the statistics frame on screen: on the right on desktop, in the sheet on mobile. */
function stat(page: Page, id: "pieces" | "fit" | "volume") {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

test("the default drawer, larger than the default build plate, is cut into 4 pieces shown apart", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  // 399 × 279 mm on 256 × 256 mm: 2 × 2 pieces, each on the build plate.
  await expect(stat(page, "pieces")).toHaveText("4");
  await expect(stat(page, "fit")).toHaveText("tient");
  // The preview sets the pieces 4 mm apart across each cut.
  await expect(page.getByTestId("mesh-preview")).toHaveAttribute("data-extent", "403.0 283.0");
  if (isMobile(testInfo)) {
    await closeSettings(page, testInfo);
    await expect(page.getByText("Ne tient pas sur le plateau")).toHaveCount(0);
  }
});

test("a cut baseplate downloads as one 3MF with a named object per piece, or a zip of one STL per piece", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await expect(stat(page, "pieces")).toHaveText("4");
  await closeSettings(page, testInfo); // mobile: the download sits in the dock, under the sheet

  const [threeMf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
  expect(threeMf.suggestedFilename()).toBe("baseplate-9x6-399x279mm.3mf");
  const model = strFromU8(unzipSync(await readFile(await threeMf.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  expect([...model.matchAll(/<object\b[^>]*\bname="([^"]*)"/g)].map(([, name]) => name)).toEqual(["pièce 1", "pièce 2", "pièce 3", "pièce 4"]);
  expect(model.match(/<item /g)).toHaveLength(4);
  expect(model).toContain('<metadata name="Title">baseplate-9x6-399x279mm</metadata>');

  await page.getByRole("button", { name: "Autres formats" }).click();
  const [zip] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /STL/ }).click()]);
  expect(zip.suggestedFilename()).toBe("baseplate-9x6-399x279mm.zip");
  const files = unzipSync(await readFile(await zip.path()));
  expect(Object.keys(files)).toEqual([1, 2, 3, 4].map((n) => `baseplate-9x6-399x279mm-piece-${n}.stl`));
  for (const bytes of Object.values(files)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const triangles = view.getUint32(80, true);
    expect(triangles).toBeGreaterThan(0);
    expect(bytes.byteLength).toBe(84 + 50 * triangles);
  }
});

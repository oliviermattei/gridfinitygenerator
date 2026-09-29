import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("the French baseplate page opens in the project colours", async ({ page }) => {
  const response = await page.goto("/fr/baseplate");
  expect(response?.status()).toBe(200);

  await expect(page).toHaveTitle(/Générateur de baseplates/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText("Générateur de baseplates");
  await expect(heading).toHaveCSS("font-family", /Outfit/);

  // The brand accent (terracotta #C4502F) reaches the page from its single source.
  await expect(page.getByTestId("brand-mark")).toHaveCSS("background-color", "rgb(196, 80, 47)");
});

test("the site root leads to the baseplate generator", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/fr\/baseplate$/);
});

test("cell counts drive the 3D preview and the STL download", async ({ page }) => {
  await page.goto("/fr/baseplate");
  const preview = page.getByTestId("mesh-preview");

  // Default 4 × 3 baseplate, computed by the engine in its worker (manifold-3d WASM).
  await expect(page.getByTestId("cells")).toHaveText("4 × 3");
  await expect(page.getByTestId("dimensions")).toHaveText("168 × 126 × 4,6 mm");
  await expect(preview.locator("canvas")).toBeVisible();
  const defaultTriangles = Number(await preview.getAttribute("data-triangles"));
  expect(defaultTriangles).toBeGreaterThan(0);

  await page.getByLabel("Colonnes").fill("3");
  await page.getByLabel("Rangées").fill("2");
  await expect(page.getByTestId("cells")).toHaveText("3 × 2");
  await expect(page.getByTestId("dimensions")).toHaveText("126 × 84 × 4,6 mm");
  // The preview received the new mesh.
  await expect(preview).not.toHaveAttribute("data-triangles", String(defaultTriangles));
  await expect(preview).not.toHaveAttribute("data-triangles", "0");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le STL" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("baseplate-3x2-126x84mm.stl");
  const bytes = await readFile(await download.path());
  // Binary STL: 80-byte header, triangle count, then 50 bytes per triangle.
  const triangles = bytes.readUInt32LE(80);
  expect(triangles).toBeGreaterThan(0);
  expect(bytes.byteLength).toBe(84 + 50 * triangles);
});

test("cell counts are brought back into 1 to 24", async ({ page }) => {
  await page.goto("/fr/baseplate");
  const columns = page.getByLabel("Colonnes");

  await columns.fill("30");
  await columns.blur();
  await expect(columns).toHaveValue("24");
  await expect(page.getByTestId("cells")).toHaveText("24 × 3");

  await columns.fill("0");
  await columns.blur();
  await expect(columns).toHaveValue("1");
  await expect(page.getByTestId("cells")).toHaveText("1 × 3");
});

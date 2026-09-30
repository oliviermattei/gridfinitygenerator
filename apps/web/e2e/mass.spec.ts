import { expect, test, type Page } from "@playwright/test";
import { closeMenu, closeSettings, openMenu, openSettings } from "./support";

// The mass of the filament, in grams, and its cost (#31, ADR 0019): the volume measured on the
// final meshes, clips included, times the density of the filament, a preference of this browser.

/** A value of the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function stat(page: Page, id: "material" | "volume" | "mass" | "mass-details") {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

test("the default drawer weighs its measured volume, clips included, in PLA; PETG and a price change it", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);

  // 79,18 cm³ of pieces and 8 clips of 18,25 mm³ (0,15 cm³), at 1,24 g/cm³: 98,4 g. The clips
  // weigh 0,18 g, less than a gram. No cost without a price.
  await expect(stat(page, "volume")).toHaveText("79,2 cm³");
  await expect(stat(page, "mass")).toHaveText("≈ 98 g");
  await expect(stat(page, "mass-details")).toHaveText("dont < 1 g de clips");
  await expect(stat(page, "material")).not.toContainText("€");

  // How the mass is worked out.
  await page.getByRole("button", { name: "Comment la masse est calculée" }).filter({ visible: true }).click();
  await expect(page.getByTestId("mass-hint")).toHaveText(/^Volume mesuré × densité du filament, pièce imprimée pleine/);
  await page.keyboard.press("Escape");

  // PETG, 1,27 g/cm³: 100,7 g; then a price of 20 €/kg: 2,01 €.
  await closeSettings(page, testInfo);
  const menu = await openMenu(page, testInfo);
  const filament = menu.getByRole("combobox", { name: "Filament" });
  await expect(filament).toHaveValue("pla");
  await expect(menu.getByTestId("filament-density")).toHaveText("Densité : 1,24 g/cm³, d'après la fiche technique du fabricant.");
  await filament.selectOption("petg");
  await expect(menu.getByTestId("filament-density")).toContainText("1,27 g/cm³");
  const price = menu.getByRole("textbox", { name: "Prix du filament", exact: true });
  await expect(price).toHaveValue("");
  await price.fill("20");
  await price.blur();
  await closeMenu(page);
  await openSettings(page, testInfo);
  await expect(stat(page, "mass")).toHaveText("≈ 101 g");
  await expect(stat(page, "mass-details")).toHaveText("dont < 1 g de clips · ≈ 2,01 €");

  // Another filament: the density typed by hand.
  await closeSettings(page, testInfo);
  const again = await openMenu(page, testInfo);
  await again.getByRole("combobox", { name: "Filament" }).selectOption("other");
  const density = again.getByRole("textbox", { name: "Densité", exact: true });
  await expect(density).toHaveValue("1,24");
  await density.fill("2");
  await density.blur();
  await closeMenu(page);
  await openSettings(page, testInfo);
  await expect(stat(page, "mass")).toHaveText("≈ 159 g"); // 79,32 cm³ × 2
  // Emptied, the price shows no cost again.
  await closeSettings(page, testInfo);
  const last = await openMenu(page, testInfo);
  await last.getByRole("textbox", { name: "Prix du filament", exact: true }).fill("");
  await last.getByRole("textbox", { name: "Prix du filament", exact: true }).blur();
  await closeMenu(page);

  // Preferences of this browser: kept on reload, out of the share link.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(stat(page, "mass")).toHaveText("≈ 159 g");
  await expect(stat(page, "material")).not.toContainText("€");
  expect(page.url()).not.toMatch(/fil|dens|price/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("preferences") ?? "{}") as { filament?: unknown });
  expect(stored.filament).toEqual({ filament: "other", density: 2, price: null });
});

test("the surplus of each shape of margin and each type show their grams", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);

  // The margin family: what each shape adds to the grid alone, in cm³ and in grams of PLA.
  await page.getByRole("button", { name: /^Marge/ }).click();
  const shape = (label: string) => page.getByRole("radio", { name: new RegExp(`^${label}`) });
  await expect(shape("Cadre")).toContainText("+ 4,2 cm³ · + 5 g");
  await expect(shape("Cellules")).toContainText("+ 22,4 cm³ · + 28 g");
  await expect(shape("Grille")).toContainText("+ 16,1 cm³ · + 20 g");

  // The type family: the volume of each, and its mass with its clips (those of a tray are taller).
  await page.getByRole("button", { name: /^Type/ }).click();
  const type = (label: string) => page.getByRole("radio", { name: new RegExp(`^${label}`) });
  await expect(type("Normal")).toContainText("79,2 cm³ · ≈ 98 g");
  await expect(type("Tray")).toContainText("141,1 cm³ · ≈ 175 g");
  await expect(type("Skeleton")).toContainText("42,0 cm³ · ≈ 52 g");
  await expect(type("CLICKbase")).toContainText("67,0 cm³ · ≈ 83 g");
});

import { expect, test } from "@playwright/test";
import { readout } from "./support";

// Index of the generators at /{lang} (#33, ADR 0020).

test.describe("a French browser", () => {
  test.use({ locale: "fr-FR" });

  test("an older share link at the site root still opens the baseplate it shares", async ({ page }) => {
    await page.goto("/?v=1&mode=cells&cx=2&cy=2");
    await expect(page).toHaveURL(/\/fr\/baseplate\?v=1&mode=cells&cx=2&cy=2$/);
    await expect(readout(page, "cells")).toHaveText("2 × 2 cellules");
  });

  test("a hash at the site root goes to the baseplate too, kept", async ({ page }) => {
    await page.goto("/#top");
    await expect(page).toHaveURL(/\/fr\/baseplate#top$/);
  });
});

test("the index shows every generator, and leads to those available", async ({ page }) => {
  await page.goto("/fr");
  await expect(page).toHaveTitle("Gridfinity Generator");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Des rangements qui tombent juste.");
  const cards = page.getByRole("listitem");
  await expect(cards).toHaveCount(2);

  const baseplates = page.getByRole("link", { name: /Baseplates/ });
  await expect(baseplates).toHaveAttribute("href", "/fr/baseplate");
  await baseplates.click();
  await expect(page).toHaveURL(/\/fr\/baseplate$/);

  // The mark of the generator leads back to the index.
  await page.getByRole("link", { name: "Tous les générateurs" }).click();
  await expect(page).toHaveURL(/\/fr$/);
});

test("the index in English, and the language link remembers the choice", async ({ page }) => {
  await page.goto("/fr");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Storage that fits just right.");
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("the index has no horizontal scroll", async ({ page }) => {
  await page.goto("/fr");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

import { expect, test } from "@playwright/test";
import { chooseCells, chooseLanguage, closeMenu, closeSettings, numberField, openMenu, openSettings, readout, runAction } from "./support";

// French and English, millimetres and inches (#14).

/** The browser languages of a first visit, and the index the site root leads to (ADR 0020). */
const FIRST_VISITS = [
  { browser: "fr-FR", lang: "fr" },
  { browser: "en-US", lang: "en" },
  // A language the site does not speak: English.
  { browser: "de-DE", lang: "en" },
] as const;

for (const { browser, lang } of FIRST_VISITS) {
  test.describe(`a ${browser} browser`, () => {
    test.use({ locale: browser });

    test(`on a first visit, the site root leads to /${lang}`, async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${lang}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    });
  });
}

test.describe("a French browser", () => {
  test.use({ locale: "fr-FR", permissions: ["clipboard-read", "clipboard-write"] });

  test("choosing English in the menu shows /en/baseplate without a reload, and the choice is kept", async ({ page }, testInfo) => {
    await page.goto("/fr/baseplate");
    await openSettings(page, testInfo);
    await chooseCells(page);
    await numberField(page, "Colonnes").fill("7");
    await numberField(page, "Rangées").fill("5");
    await expect(readout(page, "cells")).toHaveText("7 × 5 cellules");
    await closeSettings(page, testInfo);
    await page.evaluate(() => Object.assign(window, { samePage: true }));

    await chooseLanguage(page, testInfo, "en");
    await expect(page).toHaveURL(/\/en\/baseplate$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Baseplate generator");
    await expect(page).toHaveTitle(/Baseplate generator/);
    // The same page, with the settings in progress; numbers in English.
    expect(await page.evaluate(() => "samePage" in window)).toBe(true);
    await expect(readout(page, "cells")).toHaveText("7 × 5 cells");
    await expect(readout(page, "dimensions")).toHaveText("294 × 210 mm");

    // Kept on reload, and followed by the site root over the French browser.
    await page.reload();
    await expect(page).toHaveURL(/\/en\/baseplate$/);
    await expect(readout(page, "cells")).toHaveText("7 × 5 cells");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("a shared link in the address comes along to the other language, and is read there", async ({ page }, testInfo) => {
    await page.goto("/fr/baseplate?v=1&mode=cells&cx=2&cy=2");
    await expect(readout(page, "cells")).toHaveText("2 × 2 cellules");

    await chooseLanguage(page, testInfo, "en");
    await expect(page).toHaveURL(/\/en\/baseplate\?v=1&mode=cells&cx=2&cy=2$/);
    await expect(readout(page, "cells")).toHaveText("2 × 2 cells");
    await page.reload();
    await expect(readout(page, "cells")).toHaveText("2 × 2 cells");

    // Shared from here, the link opens the English page.
    await runAction(page, testInfo, "Share");
    await expect(page.getByText("Link copied")).toBeVisible();
    const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(link.pathname + link.search).toBe("/en/baseplate?v=1&mode=cells&cx=2&cy=2");
  });

  test("in inches, 15,75 in gives a drawer of 400 mm, and the share link stays in millimetres", async ({ page }, testInfo) => {
    await page.goto("/fr/baseplate");
    const menu = await openMenu(page, testInfo);
    await menu.getByRole("radio", { name: "pouces" }).click();
    await closeMenu(page);
    await openSettings(page, testInfo);

    // The default drawer, 400 × 280 mm, read in inches to the hundredth.
    await expect(numberField(page, "Largeur")).toHaveValue("15,75");
    await expect(numberField(page, "Profondeur")).toHaveValue("11,02");
    await numberField(page, "Profondeur").fill("15,75");
    await expect(readout(page, "dimensions")).toHaveText("399 × 399 mm");
    // The margins read in inches too: 21 mm is 0,83 in.
    await expect(page.getByTestId("size-result").filter({ visible: true })).toHaveText("9 × 9 cellules, marge 0,83 × 0,83 in");
    await expect(page.getByTestId("stat-margin").filter({ visible: true })).toHaveText(
      "gauche 0,41, droite 0,41, arrière 0,41, avant 0,41 in",
    );
    // A decimal point is read as well: 20.5 in is 520,7 mm.
    await numberField(page, "Largeur").fill("20.5");
    await expect(readout(page, "dimensions")).toHaveText("519,7 × 399 mm");
    await numberField(page, "Largeur").blur();
    await expect(numberField(page, "Largeur")).toHaveValue("20,5");
    await closeSettings(page, testInfo);

    await runAction(page, testInfo, "Partager");
    await expect(page.getByText("Lien copié")).toBeVisible();
    const link = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(link.search).toBe("?v=1&w=520.7&d=400");

    // The unit is a preference of this browser: kept on reload.
    await page.reload();
    await openSettings(page, testInfo);
    await expect(numberField(page, "Profondeur")).toHaveValue("15,75");
  });
});

test.describe("an English page", () => {
  test("numbers follow English conventions, and a decimal comma is read as well", async ({ page }, testInfo) => {
    await page.goto("/en/baseplate");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(readout(page, "cells")).toHaveText("9 × 6 cells");
    await openSettings(page, testInfo);
    await expect(readout(page, "height")).toHaveText("4.6 mm");
    await expect(page.getByTestId("stat-margin").filter({ visible: true })).toHaveText(
      "left 10.5, right 10.5, back 13.5, front 13.5 mm",
    );
    await numberField(page, "Width").fill("43,5");
    await expect(readout(page, "dimensions")).toHaveText("42.5 × 279 mm");
    await numberField(page, "Width").blur();
    await expect(numberField(page, "Width")).toHaveValue("43.5");
    await closeSettings(page, testInfo);

    const menu = await openMenu(page, testInfo);
    await menu.getByRole("radio", { name: "inches" }).click();
    await closeMenu(page);
    await openSettings(page, testInfo);
    await expect(numberField(page, "Width")).toHaveValue("1.71");
    // Leaving a field as it was keeps the length in millimetres: 1.71 in would be 43,4 mm.
    await numberField(page, "Width").focus();
    await numberField(page, "Width").blur();
    expect(await page.evaluate(() => localStorage.getItem("settings"))).toContain("w=43.5");
    await numberField(page, "Depth").fill("15,75");
    await expect(readout(page, "dimensions")).toHaveText("42.5 × 399 mm");
  });
});

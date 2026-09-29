import { expect, test, type Page } from "@playwright/test";
import { isMobile, modelRect, numberField, readout } from "./support";

type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * The whole model sits inside `area` (CSS pixels), once framed. With `previous`, the
 * model on screen must also differ from that earlier one (a new mesh was framed).
 */
async function expectFramedIn(page: Page, area: Rect, previous?: Rect | null): Promise<Rect> {
  let framed: Rect | null = null;
  await expect
    .poll(async () => {
      const rect = await modelRect(page);
      framed = rect;
      return (
        rect !== null &&
        (!previous || JSON.stringify(rect) !== JSON.stringify(previous)) &&
        rect.left >= area.left &&
        rect.top >= area.top &&
        rect.right <= area.right &&
        rect.bottom <= area.bottom
      );
    })
    .toBe(true);
  return framed as unknown as Rect;
}

/** Bottom of the top bar: its menu button. */
async function topBarBottom(page: Page, menu: string): Promise<number> {
  const box = await page.getByRole("button", { name: menu }).boundingBox();
  if (!box) throw new Error("No top bar");
  return box.y + box.height;
}

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop layout");

  test("opening a family closes the previous one", async ({ page }) => {
    await page.goto("/fr/baseplate");
    const size = page.getByRole("button", { name: /^Taille/ });
    const profile = page.getByRole("button", { name: /^Profil de poche/ });

    // Each family is summarised on one line, open or closed.
    await expect(size).toHaveAccessibleName("Taille 168 × 126 mm, 4 × 3 cellules");
    await expect(profile).toHaveAccessibleName("Profil de poche Hybride");
    await expect(size).toHaveAttribute("aria-expanded", "true");
    await expect(profile).toHaveAttribute("aria-expanded", "false");

    await profile.click();
    await expect(profile).toHaveAttribute("aria-expanded", "true");
    await expect(size).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("radio", { name: /Hybride/ })).toBeChecked();
    await expect(numberField(page, "Colonnes")).toHaveCount(0);

    await size.click();
    await expect(size).toHaveAttribute("aria-expanded", "true");
    await expect(profile).toHaveAttribute("aria-expanded", "false");
    await expect(numberField(page, "Colonnes")).toBeVisible();

    // Closing the open family leaves them all closed.
    await size.click();
    await expect(size).toHaveAttribute("aria-expanded", "false");
    await expect(profile).toHaveAttribute("aria-expanded", "false");
  });

  test("the top bar holds the actions, and the gear menu parameters only", async ({ page }) => {
    await page.goto("/fr/baseplate");
    // Share and reset arrive with #8: shown, inactive.
    await expect(page.getByRole("button", { name: "Partager" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Réinitialiser" })).toBeDisabled();
    // Donation: a link when NEXT_PUBLIC_DONATION_URL is set at build time, inactive otherwise.
    await expect(page.getByRole("button", { name: "Offrir un café" }).or(page.getByRole("link", { name: "Offrir un café" }))).toBeVisible();

    await page.getByRole("button", { name: "Paramètres" }).click();
    const menu = page.getByRole("dialog", { name: "Paramètres" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("radiogroup", { name: "Couleur de l'aperçu" }).getByRole("radio")).toHaveCount(5);
    // Nothing else to act on in the menu: no action button, no link.
    await expect(menu.getByRole("button")).toHaveCount(0);
    await expect(menu.getByRole("link")).toHaveCount(0);
  });

  test("the model is framed to the right of the settings panel", async ({ page }) => {
    await page.goto("/fr/baseplate");
    const panel = await page.getByRole("complementary", { name: "Réglages" }).boundingBox();
    const viewport = page.viewportSize();
    if (!panel || !viewport) throw new Error("No layout");
    const top = await topBarBottom(page, "Paramètres");
    const visible = { left: panel.x + panel.width, top, right: viewport.width, bottom: viewport.height };
    const first = await expectFramedIn(page, visible);

    // A larger baseplate is reframed in the same area.
    await numberField(page, "Colonnes").fill("12");
    await expect(readout(page, "cells")).toHaveText("12 × 3 cellules");
    await expectFramedIn(page, visible, first);
  });

  test("every control is reachable and operable with the keyboard, with a visible focus", async ({ page }) => {
    await page.goto("/fr/baseplate");
    await expect(readout(page, "cells")).toHaveText("4 × 3 cellules");

    const reached: string[] = [];
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return "";
        const label = element.id ? document.querySelector(`label[for="${element.id}"]`)?.textContent : null;
        return (element.getAttribute("aria-label") ?? label ?? element.textContent ?? "").trim();
      });
      reached.push(name);
    }
    for (const name of ["Paramètres", "Colonnes", "Rangées", "Télécharger le STL", "Recentrer la vue"]) {
      expect(reached, `${name} is reached with Tab`).toContain(name);
    }
    expect(reached.some((name) => name.startsWith("Taille"))).toBe(true);
    expect(reached.some((name) => name.startsWith("Profil de poche"))).toBe(true);

    // Focus is visible: the accent ring around the focused control.
    const download = page.getByRole("button", { name: "Télécharger le STL" });
    await download.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(download).toBeFocused();
    await expect(download).not.toHaveCSS("box-shadow", "none");

    // Operable: the arrow keys step a cell count, Enter opens a family.
    await numberField(page, "Colonnes").focus();
    await page.keyboard.press("ArrowUp");
    await expect(readout(page, "cells")).toHaveText("5 × 3 cellules");
    await page.getByRole("button", { name: /^Profil de poche/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /^Profil de poche/ })).toHaveAttribute("aria-expanded", "true");
  });
});

test("the preview takes the accent colour by default, and keeps the colour chosen in the menu", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  const preview = page.getByTestId("mesh-preview");
  // Interface and preview derive from the same single accent.
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  expect(accent.toUpperCase()).toBe("#C4502F");
  await expect(preview).toHaveAttribute("data-color", accent);

  const menuName = isMobile(testInfo) ? "Menu" : "Paramètres";
  await page.getByRole("button", { name: menuName }).click();
  const menu = page.getByRole("dialog", { name: menuName });
  await expect(menu.getByRole("radio", { name: "Terre cuite" })).toBeChecked();
  await menu.getByRole("radio", { name: "Graphite" }).click();
  await expect(preview).toHaveAttribute("data-color", "#2E3137");

  // A local preference: still there after a reload.
  await page.reload();
  await expect(preview).toHaveAttribute("data-color", "#2E3137");
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile layout");

  test("the dock opens the settings sheet, and the preview stays visible above it", async ({ page }) => {
    await page.goto("/fr/baseplate");
    const settings = page.getByRole("button", { name: "Réglages" });
    await expect(settings).toBeVisible();
    await expect(page.getByRole("button", { name: "Télécharger le STL" })).toBeVisible();
    await expect(readout(page, "dimensions")).toHaveText("168 × 126 mm");
    // No desktop panel nor top bar actions at this width.
    await expect(page.getByRole("complementary", { name: "Réglages" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Partager" })).toBeHidden();

    await settings.click();
    const sheet = page.getByRole("dialog", { name: "Réglages" });
    await expect(sheet).toBeVisible();
    await expect(numberField(page, "Colonnes")).toBeVisible();

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("No viewport");
    // The sheet covers 58 % of the height: the top of the screen stays on the preview.
    await expect
      .poll(async () => ((await sheet.boundingBox())?.y ?? 0) / viewport.height, { message: "sheet top" })
      .toBeCloseTo(0.42, 1);
    await expect(page.getByTestId("mesh-preview").locator("canvas")).toBeVisible();
    const sheetTop = (await sheet.boundingBox())?.y ?? 0;
    const visible = { left: 0, top: await topBarBottom(page, "Menu"), right: viewport.width, bottom: sheetTop };
    const first = await expectFramedIn(page, visible);

    // The settings apply while the sheet is open, and the model is reframed above it.
    await numberField(page, "Colonnes").fill("6");
    await expect(readout(page, "cells")).toHaveText("6 × 3 cellules");
    await expectFramedIn(page, visible, first);

    await sheet.getByRole("button", { name: "Fermer" }).click();
    await expect(sheet).toBeHidden();
    await expect(settings).toBeVisible();
  });

  test("the top menu holds the actions and the parameters", async ({ page }) => {
    await page.goto("/fr/baseplate");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("button", { name: "Partager" })).toBeDisabled();
    await expect(menu.getByRole("button", { name: "Réinitialiser" })).toBeDisabled();
    await expect(menu.getByRole("button", { name: "Offrir un café" }).or(menu.getByRole("link", { name: "Offrir un café" }))).toBeVisible();
    await expect(menu.getByRole("radiogroup", { name: "Couleur de l'aperçu" })).toBeVisible();
  });
});

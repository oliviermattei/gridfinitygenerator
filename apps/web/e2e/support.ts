import { expect, type Page, type TestInfo } from "@playwright/test";

/** The settings sheet of the mobile layout, in either language. */
const SETTINGS = /^(Réglages|Settings)$/;

export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === "mobile";
}

/**
 * Makes the settings reachable: always on screen on desktop, in the sheet that
 * "Réglages" (or "Settings") opens on mobile.
 */
export async function openSettings(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return;
  await page.getByRole("button", { name: SETTINGS }).click();
  await expect(page.getByRole("dialog", { name: SETTINGS })).toBeVisible();
}

/** Closes the settings sheet (mobile); nothing to do on desktop. */
export async function closeSettings(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return;
  const sheet = page.getByRole("dialog", { name: SETTINGS });
  await sheet.getByRole("button", { name: /^(Fermer|Close)$/ }).click();
  await expect(sheet).toBeHidden();
}

/** The gear menu: "Paramètres" (or "Parameters") on desktop, "Menu" (with the actions) on mobile. */
function menuName(testInfo: TestInfo): RegExp {
  return isMobile(testInfo) ? /^Menu$/ : /^(Paramètres|Parameters)$/;
}

/** Opens the gear menu, whatever the language of the page. */
export async function openMenu(page: Page, testInfo: TestInfo) {
  const name = menuName(testInfo);
  await page.getByRole("button", { name }).click();
  const menu = page.getByRole("dialog", { name });
  await expect(menu).toBeVisible();
  return menu;
}

export async function closeMenu(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /^(Paramètres|Parameters|Menu)$/ })).toBeHidden();
}

/**
 * Switches the size to a number of cells (the size family must be on screen). The
 * default size mode is the drawer.
 */
export async function chooseCells(page: Page) {
  const cells = page.getByRole("radio", { name: "Nombre de cellules" });
  await cells.click();
  await expect(cells).toBeChecked();
}

/** A number field of the settings, by its label. */
export function numberField(page: Page, label: string) {
  return page.getByRole("textbox", { name: label, exact: true });
}

/**
 * A value of the dimensions readout shown on screen: the panel on desktop; the dock,
 * or the open sheet, on mobile.
 */
export function readout(page: Page, value: "dimensions" | "cells" | "height") {
  return page.getByTestId(value).filter({ visible: true });
}

/** Screen rectangle of the model in the preview, once framed. */
export async function modelRect(page: Page) {
  const box = await page.getByTestId("mesh-preview").getAttribute("data-view-box");
  if (!box) return null;
  const [left, top, right, bottom] = box.split(" ").map(Number) as [number, number, number, number];
  return { left, top, right, bottom };
}

/**
 * Runs an action of the top bar: on the right of the top bar on desktop, in the menu on
 * mobile. The name is in the language of the page.
 */
export async function runAction(page: Page, testInfo: TestInfo, name: string) {
  if (isMobile(testInfo)) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name }).click();
  } else {
    await page.getByRole("button", { name }).click();
  }
}

/**
 * Chooses the language in the gear menu, whatever the language of the page, and waits for
 * the generator in that language.
 */
export async function chooseLanguage(page: Page, testInfo: TestInfo, language: "fr" | "en") {
  const menu = await openMenu(page, testInfo);
  await menu.getByRole("combobox", { name: /^(Langue|Language)$/ }).selectOption(language);
  await expect(page).toHaveURL(new RegExp(`/${language}/baseplate([?#]|$)`));
  await expect(page.locator("html")).toHaveAttribute("lang", language);
}

import { expect, type Page, type TestInfo } from "@playwright/test";

export function isMobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === "mobile";
}

/**
 * Makes the settings reachable: always on screen on desktop, in the sheet that
 * "Réglages" opens on mobile.
 */
export async function openSettings(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return;
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
}

/** Closes the settings sheet (mobile); nothing to do on desktop. */
export async function closeSettings(page: Page, testInfo: TestInfo) {
  if (!isMobile(testInfo)) return;
  const sheet = page.getByRole("dialog", { name: "Réglages" });
  await sheet.getByRole("button", { name: "Fermer" }).click();
  await expect(sheet).toBeHidden();
}

/** Opens the gear menu: "Paramètres" on desktop, "Menu" (with the actions) on mobile. */
export async function openMenu(page: Page, testInfo: TestInfo) {
  const name = isMobile(testInfo) ? "Menu" : "Paramètres";
  await page.getByRole("button", { name }).click();
  const menu = page.getByRole("dialog", { name });
  await expect(menu).toBeVisible();
  return menu;
}

export async function closeMenu(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /^(Paramètres|Menu)$/ })).toBeHidden();
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

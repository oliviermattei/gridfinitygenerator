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

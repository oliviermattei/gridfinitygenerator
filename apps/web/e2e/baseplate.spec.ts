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

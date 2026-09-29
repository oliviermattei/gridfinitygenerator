import { expect, test } from "@playwright/test";

// The e2e build runs without NEXT_PUBLIC_UMAMI_WEBSITE_ID: Umami must stay fully off.
test("without a Umami site id, nothing is requested from Umami", async ({ page }) => {
  const umamiRequests: string[] = [];
  page.on("request", (request) => {
    if (/umami/i.test(request.url())) umamiRequests.push(request.url());
  });

  await page.goto("/fr/baseplate");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("script[data-website-id]")).toHaveCount(0);
  expect(umamiRequests).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

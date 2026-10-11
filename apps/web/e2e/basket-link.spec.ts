import { deflateRawSync } from "node:zlib";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { isMobile } from "./support";

// The basket link (#44, ADR 0024): the whole basket in one link of /{lang}/panier, opened in
// another browser into an empty basket, or into a basket that has articles after asking.

// The link is copied to the clipboard: allowed up front, so that no native prompt shows.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

/** A basket of a v1 bin, twice, and a test kit, as #41 stores it. */
const BASKET = JSON.stringify({
  v: 1,
  articles: [
    { id: "a1", model: "bin", link: "v=1&x=3", quantity: 2 },
    { id: "a2", model: "test-kit", link: "v=1", quantity: 1 },
  ],
});

/** The names of the articles of the basket page, in their order. */
const names = (page: Page) => page.getByRole("list", { name: "Articles" }).getByTestId("article-name");

/** A browser with nothing stored, the size of the test's. */
function emptyBrowser(browser: Browser, page: Page, testInfo: TestInfo) {
  return browser.newContext({
    viewport: page.viewportSize(),
    isMobile: isMobile(testInfo),
    hasTouch: isMobile(testInfo),
  });
}

test("a copied basket link fills an empty basket, then asks to replace or add to one that has articles", async ({ page, browser }, testInfo) => {
  await page.goto("/fr/panier");
  await page.evaluate((basket) => localStorage.setItem("basket", basket), BASKET);
  await page.reload();
  await expect(names(page)).toHaveText(["Bin 3×1, 3 U", "Kit de test"]);

  await page.getByRole("button", { name: "Copier le lien du panier" }).click();
  await expect(page.getByText("Lien copié")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).pathname).toBe("/fr/panier");
  expect(new URL(link).search).toMatch(/^\?p=1\.[\w-]+$/);

  const other = await emptyBrowser(browser, page, testInfo);
  try {
    // Someone else, with an empty basket: filled at once, and the link leaves the address.
    const recipient = await other.newPage();
    await recipient.goto(link);
    await expect(recipient.getByText("Panier ouvert : 2 articles")).toBeVisible();
    await expect(names(recipient)).toHaveText(["Bin 3×1, 3 U", "Kit de test"]);
    await expect(recipient.getByRole("listitem", { name: "Bin 3×1, 3 U" }).getByRole("textbox", { name: "Quantité" })).toHaveValue("2");
    await expect(recipient).toHaveURL(/\/fr\/panier$/);
    await recipient.reload();
    await expect(names(recipient)).toHaveText(["Bin 3×1, 3 U", "Kit de test"]);

    // Their basket now has articles: the link asks first. Added after them…
    await recipient.goto(link);
    const dialog = recipient.getByRole("alertdialog", { name: "Ouvrir le panier de ce lien ?" });
    await expect(dialog).toContainText("Ce lien apporte 2 articles, et votre panier en a déjà 2.");
    await dialog.getByRole("button", { name: "Ajouter à mon panier" }).click();
    await expect(names(recipient)).toHaveText(["Bin 3×1, 3 U", "Kit de test", "Bin 3×1, 3 U", "Kit de test"]);
    await expect(recipient).toHaveURL(/\/fr\/panier$/);

    // …or in their place.
    await recipient.goto(link);
    await recipient.getByRole("button", { name: "Remplacer mon panier" }).click();
    await expect(names(recipient)).toHaveText(["Bin 3×1, 3 U", "Kit de test"]);

    // Cancelled: the basket stays as it is, and the link leaves the address all the same.
    await recipient.goto(link);
    await recipient.getByRole("button", { name: "Annuler" }).click();
    await expect(recipient).toHaveURL(/\/fr\/panier$/);
    await expect(names(recipient)).toHaveText(["Bin 3×1, 3 U", "Kit de test"]);
  } finally {
    await other.close();
  }
});

test("an unreadable article of a basket link is left out and said; an unreadable link opens nothing", async ({ page }) => {
  const payload = ["bin 1 v=1&x=4", "drawer 1 v=1", "clip 3 v=1"].join("\n");
  const data = deflateRawSync(payload).toString("base64url");
  await page.goto(`/en/panier?p=1.${data}`);
  await expect(page.getByText("Basket opened: 2 articles")).toBeVisible();
  await expect(page.getByText("An article of the link cannot be read and was left out.")).toBeVisible();
  await expect(names(page)).toHaveText(["Bin 4×1, 3 U", "Clip"]);

  await page.goto("/en/panier?p=1.broken");
  await expect(page.getByText("This basket link cannot be read: nothing was opened.")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/panier$/);
  await expect(names(page)).toHaveText(["Bin 4×1, 3 U", "Clip"]);
});

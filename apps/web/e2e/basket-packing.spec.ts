import { expect, test, type Page } from "@playwright/test";

// The rangement of the basket on the plates (#42, ADR 0024): its three modes, where the search
// stands, and each plate seen from above.

/** Fills the basket of this browser, then opens its page. */
async function openBasket(page: Page, articles: { model: string; link: string; quantity: number }[], preferences: object = {}) {
  await page.goto("/fr");
  await page.evaluate(
    ([stored, prefs]) => {
      localStorage.setItem("basket", JSON.stringify({ v: 1, articles: stored }));
      localStorage.setItem("preferences", JSON.stringify(prefs));
    },
    [articles.map((article, k) => ({ id: `a${k}`, ...article })), preferences] as const,
  );
  await page.goto("/fr/panier");
}

const mode = (page: Page, name: string) => page.getByRole("radiogroup", { name: "Rangement sur les plateaux" }).getByRole("radio", { name });

test("changing the rangement changes the plates and their view; the choice is remembered", async ({ page }) => {
  // Two bins, a test kit and a clip: small enough to share one plate.
  await openBasket(page, [
    { model: "bin", link: "v=1", quantity: 2 },
    { model: "test-kit", link: "v=1", quantity: 1 },
    { model: "clip", link: "v=1", quantity: 1 },
  ]);
  const status = page.getByTestId("packing-status");
  const plates = page.getByTestId("plate");

  await expect(mode(page, "Moins de plateaux")).toBeChecked();
  await expect(status).toHaveText("1 plateau, le minimum possible");
  await expect(plates).toHaveCount(1);
  await expect(page.getByTestId("plate-name")).toHaveText(["Plateau 1"]);
  await expect(plates.first().getByTestId("plate-object")).toHaveCount(4);
  await expect(page.getByTestId("total-plates")).toHaveText("1");

  await mode(page, "Par catégorie").click();
  await expect(status).toHaveText("3 plateaux, le minimum possible");
  await expect(page.getByTestId("plate-name")).toHaveText(["Bins 1", "Kit de test", "Clips"]);
  await expect(page.getByTestId("total-plates")).toHaveText("3");

  await mode(page, "Un objet par plateau").click();
  await expect(status).toHaveText("4 plateaux, le minimum possible");
  await expect(page.getByTestId("plate-name")).toHaveText(["Bin 2×1, 3 U (1)", "Bin 2×1, 3 U (2)", "Kit de test", "Clips"]);
  for (const plate of await plates.all()) await expect(plate.getByTestId("plate-object")).toHaveCount(1);

  // Remembered in this browser.
  await page.reload();
  await expect(mode(page, "Un objet par plateau")).toBeChecked();
  await expect(plates).toHaveCount(4);

  // A change of the basket searches again.
  await page.getByRole("button", { name: "Supprimer Kit de test" }).click();
  await expect(status).toHaveText("3 plateaux, le minimum possible");
});

test("« Arrêter » keeps the best rangement found", async ({ page }) => {
  // Bins whose bound the search does not reach soon: 40 of 1 × 2, 10 of 3 × 1 and 3 of 4 × 2.
  await openBasket(page, [
    { model: "bin", link: "v=1&x=1&y=2", quantity: 40 },
    { model: "bin", link: "v=1&x=3&y=1", quantity: 10 },
    { model: "bin", link: "v=1&x=4&y=2", quantity: 3 },
  ]);
  const status = page.getByTestId("packing-status");
  await expect(status).toContainText(/^Recherche d'un meilleur rangement… \d+ plateaux trouvés, au moins 4 possibles/, { timeout: 15_000 });
  await expect(page.getByTestId("packing-elapsed")).toHaveText(/· [1-9]\d* s ·/);
  const found = Number((await status.textContent())?.match(/(\d+) plateaux trouvés/)?.[1]);
  await page.getByRole("button", { name: "Arrêter" }).click();

  await expect(status).toHaveText(`${found} plateaux, meilleur rangement trouvé`);
  await expect(page.getByTestId("plate")).toHaveCount(found);
  await expect(page.getByTestId("total-plates")).toHaveText(String(found));
  // Stopped: nothing changes any more.
  await page.waitForTimeout(1500);
  await expect(status).toHaveText(`${found} plateaux, meilleur rangement trouvé`);
  await expect(page.getByRole("button", { name: "Arrêter" })).toHaveCount(0);
});

test("with a Bambu Lab printer, each plate shows its excluded corner", async ({ page }) => {
  await openBasket(page, [{ model: "bin", link: "v=1", quantity: 1 }], { printer: "bambu-p1s" });
  await expect(page.getByTestId("packing-status")).toHaveText("1 plateau, le minimum possible");
  await expect(page.getByTestId("plate").locator("title", { hasText: "Zone exclue du lit" })).toHaveCount(1);
});

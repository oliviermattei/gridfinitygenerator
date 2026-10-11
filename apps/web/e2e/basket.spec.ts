import { expect, test, type Page } from "@playwright/test";
import { closeSettings, openSettings, readout } from "./support";

// The basket (#41, ADR 0024): articles added from the generators, kept in this browser, and
// their page, /{lang}/panier, with what each one measures.

/** The basket in the header, by its number of articles. */
function basketLink(page: Page, label: string | RegExp) {
  return page.getByRole("link", { name: label });
}

/** An article of the basket page, by its name. */
function article(page: Page, name: string) {
  return page.getByRole("list", { name: "Articles" }).getByRole("listitem", { name, exact: true });
}

/** A value of the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function stat(page: Page, id: string) {
  return page.getByTestId(`stat-${id}`).filter({ visible: true });
}

test("add a bin and a baseplate, change a quantity, edit an article and update it, remove them all", async ({ page }, testInfo) => {
  await page.goto("/fr/panier");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panier");
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();
  await expect(basketLink(page, "Panier, vide")).toBeVisible();

  // A bin: confirmed without leaving the page, counted in the header.
  await page.goto("/fr/bin");
  await expect(readout(page, "dimensions")).toHaveText("83,5 × 41,5 mm");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("« Bin 2×1, 3 U » ajouté au panier")).toBeVisible();
  await expect(basketLink(page, "Panier, 1 article")).toBeVisible();
  await expect(page).toHaveURL(/\/fr\/bin$/);

  // A baseplate: its statistics, to compare with the basket's.
  await page.goto("/fr/baseplate");
  await expect(basketLink(page, "Panier, 1 article")).toBeVisible();
  await openSettings(page, testInfo);
  await expect(stat(page, "mass")).toHaveText("≈ 98 g");
  const dimensions = await stat(page, "dimensions").textContent();
  await closeSettings(page, testInfo);
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByText("« Baseplate 399 × 279 » ajouté au panier")).toBeVisible();
  await expect(basketLink(page, "Panier, 2 articles")).toBeVisible();

  // The basket page: the same values as the generator's, measured on the model.
  await basketLink(page, "Panier, 2 articles").click();
  await expect(page).toHaveURL(/\/fr\/panier$/);
  const baseplate = article(page, "Baseplate 399 × 279");
  // Cut for the build plate of 256 × 256 mm, as in its generator.
  await expect(baseplate.getByTestId("article-dimensions")).toHaveText(`${dimensions} · 4 pièces`);
  await expect(baseplate.getByTestId("article-mass")).toHaveText("≈ 98 g");
  const bin = article(page, "Bin 2×1, 3 U");
  await expect(bin.getByTestId("article-dimensions")).toHaveText("83,5 × 41,5 × 25 mm");
  await expect(bin.getByTestId("article-mass")).toHaveText(/^≈\s\d+\sg$/);
  await expect(page.getByTestId("total-mass")).toHaveText(/^≈\s\d+\sg$/);

  // Two bins: the mass of the line doubles, the quantity is kept.
  const binMass = Number((await bin.getByTestId("article-mass").textContent())?.match(/\d+/)?.[0]);
  await bin.getByRole("button", { name: "Un de plus" }).click();
  await expect(bin.getByRole("textbox", { name: "Quantité" })).toHaveValue("2");
  await expect(bin.getByTestId("article-mass")).toContainText(`≈ ${binMass} g l'unité`);
  await page.reload();
  await expect(article(page, "Bin 2×1, 3 U").getByRole("textbox", { name: "Quantité" })).toHaveValue("2");

  // Edit the bin in its generator, then update the article: its quantity stays.
  await article(page, "Bin 2×1, 3 U").getByRole("link", { name: "Modifier Bin 2×1, 3 U" }).click();
  await expect(page).toHaveURL(/\/fr\/bin\?v=1#article=/);
  await expect(page.getByTestId("edited-article").filter({ visible: true })).toHaveText("Article du panier : Bin 2×1, 3 U");
  await openSettings(page, testInfo);
  await page.getByRole("button", { name: "Une cellule de plus en largeur" }).click();
  await expect(readout(page, "cells")).toHaveText("3 × 1 cellules, 3 U");
  await closeSettings(page, testInfo);
  await page.getByRole("button", { name: "Mettre à jour l'article" }).click();
  await expect(page.getByText("« Bin 3×1, 3 U » mis à jour")).toBeVisible();
  await expect(basketLink(page, "Panier, 2 articles")).toBeVisible();

  await page.goto("/fr/panier");
  await expect(article(page, "Bin 3×1, 3 U").getByRole("textbox", { name: "Quantité" })).toHaveValue("2");
  await expect(article(page, "Bin 3×1, 3 U").getByTestId("article-dimensions")).toHaveText("125,5 × 41,5 × 25 mm");

  // Remove them all: the empty basket tells how to fill it.
  await page.getByRole("button", { name: "Supprimer Bin 3×1, 3 U" }).click();
  await expect(basketLink(page, "Panier, 1 article")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer Baseplate 399 × 279" }).click();
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();
  await expect(basketLink(page, "Panier, vide")).toBeVisible();
});

test("an edited article can be added as a new one; the test kit and a clip go in the basket too", async ({ page }, testInfo) => {
  await page.goto("/en/bin");
  await expect(readout(page, "dimensions")).toHaveText("83.5 × 41.5 mm");
  await page.getByRole("button", { name: "Add to the basket" }).click();
  await expect(page.getByRole("link", { name: "Basket, 1 article" })).toBeVisible();

  await page.goto("/en/panier");
  await page.getByRole("link", { name: "Edit Bin 2×1, 3 U" }).click();
  await openSettings(page, testInfo);
  await page.getByRole("button", { name: "One U more" }).click();
  await closeSettings(page, testInfo);
  await page.getByRole("button", { name: "Add as a new article" }).click();
  await expect(page.getByText("“Bin 2×1, 4 U” added to the basket")).toBeVisible();
  await expect(page.getByRole("link", { name: "Basket, 2 articles" })).toBeVisible();

  // The test kit, from its family; a single clip, from the menu of the download.
  await page.goto("/en/baseplate");
  await openSettings(page, testInfo);
  await page.getByRole("button", { name: /^Pocket profile/ }).click();
  await page.getByRole("button", { name: "Add the test kit to the basket" }).click();
  await expect(page.getByText("“Test kit” added to the basket")).toBeVisible();
  await closeSettings(page, testInfo);
  await page.getByRole("button", { name: "Other formats" }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: /^Add a clip to the basket/ }).click();
  await expect(page.getByText("“Clip” added to the basket")).toBeVisible();

  await page.goto("/en/panier");
  const names = page.getByRole("list", { name: "Articles" }).getByTestId("article-name");
  await expect(names).toHaveText(["Bin 2×1, 3 U", "Bin 2×1, 4 U", "Test kit", "Clip"]);
  await expect(article(page, "Test kit").getByTestId("article-dimensions")).toHaveText(/^42 × 84 × /);
});

test("an article that no longer fits on the build plate is shown in red, with why", async ({ page }) => {
  await page.goto("/fr/bin?v=1&x=6");
  await expect(readout(page, "cells")).toHaveText("6 × 1 cellules, 3 U");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("link", { name: "Panier, 1 article" })).toBeVisible();

  // A smaller build plate, chosen afterwards: the whole basket follows.
  await page.evaluate(() => localStorage.setItem("preferences", JSON.stringify({ buildPlate: { width: 200, depth: 200 } })));
  await page.goto("/fr/panier");
  const bin = article(page, "Bin 6×1, 3 U");
  await expect(bin).toHaveAttribute("data-fits", "false");
  await expect(bin.getByRole("alert")).toHaveText("Ne tient pas sur votre plateau (200 × 200 mm) : exclu du téléchargement.");
  await expect(page.getByText("Hors l'article qui ne tient pas sur le plateau.")).toBeVisible();

  // Too large in its generator, it cannot be added again, like it cannot be downloaded.
  await page.goto("/fr/bin?v=1&x=6");
  await expect(readout(page, "cells")).toHaveText("6 × 1 cellules, 3 U");
  await expect(page.getByRole("button", { name: "Ajouter au panier" })).toBeDisabled();
});

test("two tabs see the same basket", async ({ page, context }) => {
  await page.goto("/fr/panier");
  await expect(page.getByText("Votre panier est vide.")).toBeVisible();

  const other = await context.newPage();
  await other.goto("/fr/bin");
  await expect(readout(other, "dimensions")).toHaveText("83,5 × 41,5 mm");
  await other.getByRole("button", { name: "Ajouter au panier" }).click();

  // Without reloading, the first tab shows it.
  await expect(article(page, "Bin 2×1, 3 U")).toBeVisible();
  await expect(basketLink(page, "Panier, 1 article")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer Bin 2×1, 3 U" }).click();
  await expect(basketLink(other, "Panier, vide")).toBeVisible();
});

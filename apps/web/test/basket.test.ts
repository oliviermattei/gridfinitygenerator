import { describe, expect, test } from "vitest";
import {
  addArticle,
  articleBinSettings,
  articleHref,
  articleName,
  categoryOf,
  editedArticleId,
  parseBasket,
  removeArticle,
  serializeBasket,
  setQuantity,
  updateArticle,
  type Article,
  type Basket,
} from "../lib/basket";
import { formatsFor } from "../lib/format";
import { STRINGS } from "../lib/strings";

// The basket of this browser (#41, ADR 0024): articles kept as share links and quantities.

const EMPTY: Basket = { articles: [] };

/** The basket as the next page load reads it back from storage. */
const stored = (basket: Basket) => parseBasket(serializeBasket(basket));

describe("reading the stored basket", () => {
  test("nothing stored is an empty basket", () => {
    expect(parseBasket(null)).toEqual(EMPTY);
  });

  test.each(["", "{", "null", "42", '"basket"', "[]", '{"v":1}', '{"v":1,"articles":"none"}'])("a corrupted basket (%s) is an empty one", (raw) => {
    expect(parseBasket(raw)).toEqual(EMPTY);
  });

  test("a basket of an unknown version is an empty one", () => {
    expect(parseBasket('{"v":2,"articles":[{"id":"a1","model":"bin","link":"v=1","quantity":1}]}')).toEqual(EMPTY);
  });

  test("only the valid articles of a stored basket are kept, their quantity a whole number from 1", () => {
    const raw = JSON.stringify({
      v: 1,
      articles: [
        { id: "a1", model: "bin", link: "v=1&x=3", quantity: 2 },
        { id: "a2", model: "drawer", link: "v=1", quantity: 1 },
        { id: "a3", model: "baseplate", quantity: 1 },
        null,
        { id: "a4", model: "clip", link: "v=1", quantity: 0 },
        { id: "a5", model: "test-kit", link: "v=1", quantity: 2.6 },
        { id: "a1", model: "baseplate", link: "v=1", quantity: 1 },
      ],
    });
    expect(parseBasket(raw).articles).toEqual([
      { id: "a1", model: "bin", link: "v=1&x=3", quantity: 2 },
      { id: "a4", model: "clip", link: "v=1", quantity: 1 },
      { id: "a5", model: "test-kit", link: "v=1", quantity: 3 },
    ]);
  });
});

describe("articles", () => {
  test("an added article keeps its share link and its quantity, and is read back from storage", () => {
    const basket = addArticle(EMPTY, { model: "bin", link: "v=1&x=3&h=6", quantity: 4 }, "a1");
    expect(stored(basket).articles).toEqual([{ id: "a1", model: "bin", link: "v=1&x=3&h=6", quantity: 4 }]);
  });

  const two = addArticle(addArticle(EMPTY, { model: "bin", link: "v=1", quantity: 1 }, "a1"), { model: "baseplate", link: "v=1&w=562&d=470", quantity: 1 }, "a2");

  test("articles stay in the order they were added", () => {
    expect(two.articles.map(({ id }) => id)).toEqual(["a1", "a2"]);
  });

  test("the quantity of an article changes, a whole number from 1 to 999", () => {
    expect(stored(setQuantity(two, "a2", 3)).articles[1]).toMatchObject({ id: "a2", quantity: 3 });
    expect(setQuantity(two, "a2", 0).articles[1]?.quantity).toBe(1);
    expect(setQuantity(two, "a2", 2.4).articles[1]?.quantity).toBe(2);
    expect(setQuantity(two, "a2", 5000).articles[1]?.quantity).toBe(999);
    expect(setQuantity(two, "a2", Number.NaN).articles[1]?.quantity).toBe(1);
    expect(setQuantity(two, "a2", 3).articles[0]).toEqual(two.articles[0]);
  });

  test("a removed article leaves the others", () => {
    expect(stored(removeArticle(two, "a1")).articles.map(({ id }) => id)).toEqual(["a2"]);
    expect(removeArticle(removeArticle(two, "a1"), "a2")).toEqual(EMPTY);
  });

  test("an updated article takes the new link, and keeps its id, place and quantity", () => {
    const updated = updateArticle(setQuantity(two, "a1", 4), "a1", "v=1&x=3");
    expect(stored(updated).articles).toEqual([
      { id: "a1", model: "bin", link: "v=1&x=3", quantity: 4 },
      { id: "a2", model: "baseplate", link: "v=1&w=562&d=470", quantity: 1 },
    ]);
  });

  test("changing an article no longer in the basket changes nothing", () => {
    expect(setQuantity(two, "gone", 3)).toEqual(two);
    expect(updateArticle(two, "gone", "v=1&x=3")).toEqual(two);
    expect(removeArticle(two, "gone")).toEqual(two);
  });

  test("an added quantity is brought into its range", () => {
    expect(addArticle(EMPTY, { model: "clip", link: "v=1", quantity: 0 }, "c").articles[0]?.quantity).toBe(1);
  });
});

describe("what an article is", () => {
  const bin = (link: string): Article => ({ id: "a1", model: "bin", link, quantity: 1 });

  test("a v1 bin link kept in an article still gives its bin", () => {
    expect(articleBinSettings(bin("v=1&x=3&y=2&h=6&lip=none&sc=1"))).toMatchObject({ columns: 3, rows: 2, units: 6, lip: "none", scoop: true });
  });

  test("its name says what it is, in the language of the page", () => {
    const fr = STRINGS.fr;
    const en = STRINGS.en;
    const lengths = (t: typeof fr) => formatsFor(t.locale).lengths;
    expect(articleName(bin("v=1&h=6"), fr, lengths(fr))).toBe("Bin 2×1, 6 U");
    expect(articleName(bin("v=1&x=3&y=4"), en, lengths(en))).toBe("Bin 3×4, 3 U");
    const baseplate: Article = { id: "b", model: "baseplate", link: "v=1&w=563&d=471", quantity: 1 };
    expect(articleName(baseplate, fr, lengths(fr), { width: 562, depth: 470 })).toBe("Baseplate 562 × 470");
    expect(articleName(baseplate, en, lengths(en), { width: 398.5, depth: 278.5 })).toBe("Baseplate 398.5 × 278.5");
    // Its size is measured: until then, only what it is.
    expect(articleName(baseplate, fr, lengths(fr))).toBe("Baseplate");
    expect(articleName({ ...baseplate, model: "test-kit" }, fr, lengths(fr))).toBe("Kit de test");
    expect(articleName({ ...baseplate, model: "test-kit" }, en, lengths(en))).toBe("Test kit");
    expect(articleName({ ...baseplate, model: "clip" }, fr, lengths(fr))).toBe("Clip");
  });

  test("its category: bins, baseplates (test kits included) or clips", () => {
    expect(categoryOf("bin")).toBe("bins");
    expect(categoryOf("baseplate")).toBe("baseplates");
    expect(categoryOf("test-kit")).toBe("baseplates");
    expect(categoryOf("clip")).toBe("clips");
  });

  test("it opens in its generator with its settings, which then edits it", () => {
    expect(articleHref(bin("v=1&x=3"), "fr")).toBe("/fr/bin?v=1&x=3#article=a1");
    expect(articleHref({ id: "k", model: "test-kit", link: "v=1&cs=40", quantity: 1 }, "en")).toBe("/en/baseplate?v=1&cs=40#article=k");
    expect(editedArticleId("#article=k")).toBe("k");
    expect(editedArticleId("")).toBeNull();
    expect(editedArticleId("#other")).toBeNull();
  });
});

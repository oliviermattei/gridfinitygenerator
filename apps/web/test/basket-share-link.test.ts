import { deflate } from "@repo/geometry";
import { describe, expect, test } from "vitest";
import type { ArticleDraft } from "../lib/basket";
import { basketShareQuery, readBasketShareLink } from "../lib/basket-share-link";

// The basket link (#44, ADR 0024): every article's model, share link and quantity, deflated
// then in base64url, in one versioned parameter of /{lang}/panier.

/** Twenty articles of every model, with links as the generators write them. */
const TWENTY: ArticleDraft[] = Array.from({ length: 20 }, (_, i): ArticleDraft => {
  switch (i % 4) {
    case 0:
      return { model: "bin", link: `v=1&x=${1 + (i % 5)}&y=${1 + (i % 3)}&h=${3 + (i % 6)}&lip=reduced&sc=1`, quantity: 1 + i };
    case 1:
      return { model: "baseplate", link: `v=1&mode=cells&cx=${4 + i}&cy=${3 + (i % 4)}&lh=0.28`, quantity: 1 };
    case 2:
      return { model: "baseplate", link: "v=1&type=skeleton&mg=1", quantity: 2 };
    default:
      return { model: "clip", link: `v=1&w=${400 + i}&d=${300 + i}`, quantity: 12 };
  }
});

/** The `p` parameter of a basket link. */
const parameterOf = (query: string) => new URLSearchParams(query).get("p") ?? "";

/** A basket link of a payload as the codec writes it, version 1. */
const linkOfPayload = (payload: string) => {
  const data = deflate(new TextEncoder().encode(payload));
  const base64 = btoa(String.fromCharCode(...data));
  return `p=1.${base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
};

describe("the basket link", () => {
  test("gives back the articles of a basket of twenty mixed articles, in their order", () => {
    expect(readBasketShareLink(basketShareQuery(TWENTY))).toEqual({ articles: TWENTY, unreadable: 0 });
  });

  test("is short enough to send: the twenty articles fit in 300 characters", () => {
    // Measured: 252 characters for the query (`p=1.` and 248 of base64url, 186 bytes of
    // deflate, as many as zlib at its best level), against 714 for the articles before
    // deflate; the page address adds about 40. Far under the 2 000 every browser and chat app takes.
    const query = basketShareQuery(TWENTY);
    expect(query.length).toBeLessThan(300);
  });

  test("is one versioned parameter, in base64url, which the address keeps as is", () => {
    const query = basketShareQuery(TWENTY);
    expect(query).toMatch(/^p=1\.[A-Za-z0-9_-]+$/);
    expect(new URLSearchParams(query).toString()).toBe(query);
  });

  test("carries only the articles: their model, share link and quantity", () => {
    const query = basketShareQuery([{ model: "baseplate", link: "v=1&type=skeleton", quantity: 2 }]);
    expect(readBasketShareLink(query)).toEqual({ articles: [{ model: "baseplate", link: "v=1&type=skeleton", quantity: 2 }], unreadable: 0 });
  });

  test("of an empty basket opens as an empty basket", () => {
    expect(readBasketShareLink(basketShareQuery([]))).toEqual({ articles: [], unreadable: 0 });
  });

  test("an address without one is not a basket link", () => {
    expect(readBasketShareLink("")).toBeNull();
    expect(readBasketShareLink("?v=1&x=3")).toBeNull();
  });

  test("is read from the page address, with its question mark", () => {
    expect(readBasketShareLink(`?${basketShareQuery(TWENTY.slice(0, 2))}`)).toEqual({ articles: TWENTY.slice(0, 2), unreadable: 0 });
  });
});

describe("a basket link written before", () => {
  test("reads an old bin link (bin v1) as it was", () => {
    // A frozen basket link of version 1: two v1 bins and a baseplate.
    const frozen = "p=1.JcpBCoAgFATQfadwNetMqtUcRu1HgqlghN4-pOWD50JSRr3UaDToXHBxQwyFKSfBGThP4-hxJmerlGgf-Y07H0IvMVb4xh2-c_0A";
    expect(readBasketShareLink(frozen)).toEqual({
      articles: [
        { model: "bin", link: "v=1&x=3&y=2&h=6&lip=none&fi=0", quantity: 3 },
        { model: "bin", link: "v=1", quantity: 1 },
        { model: "baseplate", link: "v=1&mode=cells&cx=7&cy=5", quantity: 1 },
      ],
      unreadable: 0,
    });
  });
});

describe("a broken basket link opens nothing, without failing", () => {
  const query = basketShareQuery(TWENTY);
  const value = parameterOf(query);

  test.each([
    ["corrupted", `p=1.${[...value.slice(2)].reverse().join("")}`],
    ["truncated", `p=${value.slice(0, value.length - 12)}`],
    ["empty", "p="],
    ["with no data", "p=1."],
    ["not base64url", "p=1.%%%%"],
    ["of an unknown version", `p=2.${value.slice(2)}`],
    ["with no version", `p=${value.slice(2)}`],
  ])("%s", (_, broken) => {
    expect(readBasketShareLink(broken)).toBe("unreadable");
  });
});

describe("an article that cannot be read", () => {
  test("is left out and counted, and the others open", () => {
    const link = linkOfPayload(
      [
        "bin 2 v=1&x=3",
        "drawer 1 v=1", // an unknown model
        "bin 1 x=3", // a link with no version
        "bin two v=1", // a quantity that is not one
        "baseplate", // nothing to read
        "clip 0 v=1", // a quantity out of range, brought back into it
        "baseplate 5000 v=1",
        "test-kit 1 v=1", // the test kit, removed with the flush profile (ADR 0002)
      ].join("\n"),
    );
    expect(readBasketShareLink(link)).toEqual({
      articles: [
        { model: "bin", link: "v=1&x=3", quantity: 2 },
        { model: "clip", link: "v=1", quantity: 1 },
        { model: "baseplate", link: "v=1", quantity: 999 },
      ],
      unreadable: 5,
    });
  });
});

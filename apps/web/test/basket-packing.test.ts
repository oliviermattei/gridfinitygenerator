import { searchPacking, type PackedPlate } from "@repo/geometry";
import { describe, expect, test } from "vitest";
import type { Article } from "../lib/basket";
import { basketPackingOf, objectLabel, plateNames, type BasketPacking } from "../lib/basket-packing";
import type { ArticleMeasure, ArticlePart } from "../lib/engine/article-measure";
import { STRINGS } from "../lib/strings";

// What the rangement of the basket lays on the plates (#42, ADR 0024), and how the plates are named.

const t = STRINGS.fr;
const PLATE = { width: 256, depth: 256 };

const part = (kind: ArticlePart["kind"], numbers: number[], width: number, depth: number): ArticlePart => ({ kind, numbers, width, depth });
const measure = (parts: ArticlePart[], clips: ArticleMeasure["clips"] = null, fits = true): ArticleMeasure => ({
  dimensions: { width: 1, depth: 1, height: 1 },
  material: { volume: 1, clips: 0 },
  pieces: parts.length,
  fits,
  parts,
  clips,
});

const bin: Article = { id: "bin", model: "bin", link: "v=1", quantity: 3 };
const baseplate: Article = { id: "plate", model: "baseplate", link: "v=1", quantity: 1 };
const clip: Article = { id: "clip", model: "clip", link: "v=1", quantity: 2 };
const big: Article = { id: "big", model: "bin", link: "v=1&x=7", quantity: 1 };

const MEASURES = new Map<string, ArticleMeasure | "failed">([
  ["bin", measure([part("whole", [], 83.5, 41.5)])],
  ["plate", measure([part("piece", [1], 200, 100), part("piece", [2], 200, 100), part("piece", [3], 200, 100)], { width: 2.5, depth: 2.6, count: 4 })],
  ["clip", measure([], { width: 2.5, depth: 2.6, count: 1 })],
  ["big", measure([part("whole", [], 293.5, 41.5)], null, false)],
]);
const measureOf = (article: Article) => MEASURES.get(article.id);

const names = new Map([
  ["bin", "Bin 2×1, 3 U"],
  ["plate", "Baseplate 562 × 470"],
  ["clip", "Clip"],
]);
const nameOf = (id: string) => names.get(id) ?? "?";

const pack = (basket: BasketPacking) => searchPacking({ objects: basket.objects, plate: PLATE }).packing;

describe("the objects of the basket", () => {
  test("each exemplar of a bin, each piece of a baseplate, and one block of every clip", () => {
    const basket = basketPackingOf([bin, baseplate, clip], measureOf, "fewest-plates")!;
    expect(basket.objects.map((object) => object.id)).toEqual(["bin/1/0", "bin/2/0", "bin/3/0", "plate/1/0", "plate/1/1", "plate/1/2", "clips"]);
    // 4 clips of the baseplate and 2 alone: 6 in one block, 3 × 2.
    const block = basket.objects.at(-1)!;
    expect(block.width).toBeCloseTo(3 * 2.5 + 2 * 3, 9);
    expect(block.depth).toBeCloseTo(2 * 2.6 + 3, 9);
    expect(basket.clipBlocks.get("clips")!.clips.map((c) => c.id)).toEqual(["plate", "plate", "plate", "plate", "clip", "clip"]);
    expect(basket.byId.get("plate/1/1")).toMatchObject({ articleId: "plate", exemplar: 1, category: "baseplates", part: { numbers: [2] } });
  });

  test("an article that does not fit, or whose computation failed, is left out", () => {
    const basket = basketPackingOf([bin, big, { ...baseplate, id: "broken" }], (a) => (a.id === "broken" ? "failed" : measureOf(a)), "fewest-plates")!;
    expect(basket.objects.map((object) => object.id)).toEqual(["bin/1/0", "bin/2/0", "bin/3/0"]);
  });

  test("nothing to lay out until every article is measured", () => {
    expect(basketPackingOf([bin, { ...bin, id: "unknown" }], measureOf, "fewest-plates")).toBeNull();
  });

  test("the rangement decides which objects may share a plate", () => {
    const keys = (mode: Parameters<typeof basketPackingOf>[2]) => new Set(basketPackingOf([bin, baseplate, clip], measureOf, mode)!.objects.map((object) => object.key)).size;
    expect(keys("fewest-plates")).toBe(1);
    expect(keys("by-category")).toBe(3);
    expect(keys("one-per-plate")).toBe(7);
  });

  // Provisional (#43): a plate of a Bambu Studio project prints at one layer height.
  test("two layer heights never share a plate: the clips of each in a block of their own", () => {
    const fine: Article = { id: "fine", model: "bin", link: "v=1&lh=0.12", quantity: 1 };
    const fineClip: Article = { id: "fineClip", model: "clip", link: "v=1&lh=0.12", quantity: 1 };
    const measures = new Map(MEASURES).set("fine", MEASURES.get("bin")!).set("fineClip", MEASURES.get("clip")!);
    const basket = basketPackingOf([bin, fine, baseplate, fineClip], (a) => measures.get(a.id), "fewest-plates")!;
    const keyOf = (id: string) => basket.objects.find((object) => object.id === id)!.key;
    expect(keyOf("fine/1/0")).not.toBe(keyOf("bin/1/0"));
    expect(keyOf("plate/1/0")).toBe(keyOf("bin/1/0"));
    // The clips of the baseplate at 0.2 mm, the clip alone at 0.12 mm: two blocks.
    expect(basket.objects.filter((object) => basket.byId.get(object.id)!.category === "clips").map((object) => object.id)).toEqual(["clips", "clips-2"]);
    expect(basket.clipBlocks.get("clips")!.clips.map((c) => c.id)).toEqual(["plate", "plate", "plate", "plate"]);
    expect(basket.clipBlocks.get("clips-2")!.clips.map((c) => c.id)).toEqual(["fineClip"]);
    expect(keyOf("clips-2")).toBe(keyOf("fine/1/0"));
  });
});

describe("names of the plates and of their objects", () => {
  test("numbered in « moins de plateaux »", () => {
    const basket = basketPackingOf([bin, baseplate, clip], measureOf, "fewest-plates")!;
    const plates = pack(basket);
    expect(plateNames(plates.plates, "fewest-plates", basket, nameOf, t)).toEqual(plates.plates.map((_, k) => `Plateau ${k + 1}`));
  });

  test("by what they hold « par catégorie »", () => {
    const basket = basketPackingOf([bin, baseplate, clip], measureOf, "by-category")!;
    const plates = pack(basket);
    // Three bins on one plate, three pieces of 200 × 100 on two, the clips on theirs.
    expect(plateNames(plates.plates, "by-category", basket, nameOf, t)).toEqual([
      "Bins 1",
      expect.stringMatching(/^Baseplate 562 × 470 — pièces (1-2|1, 3|2-3)$/),
      expect.stringMatching(/^Baseplate 562 × 470 — pièce [1-3]$/),
      "Clips",
    ]);
  });

  test("the baseplates of several articles on one plate share a numbered name", () => {
    const other: Article = { id: "kit", model: "baseplate", link: "v=1", quantity: 1 };
    const measures = new Map(MEASURES).set("kit", measure([part("whole", [], 42, 84)]));
    const basket = basketPackingOf([{ ...baseplate, id: "small" }, other], (a) => (a.id === "small" ? measure([part("whole", [], 84, 84)]) : measures.get(a.id)), "by-category")!;
    const plates: PackedPlate[] = pack(basket).plates;
    expect(plateNames(plates, "by-category", basket, nameOf, t)).toEqual(["Baseplates 1"]);
  });

  test("by their object in « un objet par plateau »", () => {
    const basket = basketPackingOf([bin, baseplate, clip], measureOf, "one-per-plate")!;
    const plates = pack(basket);
    expect(plateNames(plates.plates, "one-per-plate", basket, nameOf, t)).toEqual([
      "Bin 2×1, 3 U (1)",
      "Bin 2×1, 3 U (2)",
      "Bin 2×1, 3 U (3)",
      "Baseplate 562 × 470 — pièce 1",
      "Baseplate 562 × 470 — pièce 2",
      "Baseplate 562 × 470 — pièce 3",
      "Clips",
    ]);
  });

  test("an object is named after its article, its piece or its stack", () => {
    const stacked = basketPackingOf([{ ...baseplate, quantity: 2 }], () => measure([part("stack", [1, 2, 3], 210, 110)]), "fewest-plates")!;
    expect(objectLabel(stacked.byId.get("plate/2/0")!, stacked, nameOf, t)).toBe("Baseplate 562 × 470 — pile des pièces 1-3 (2)");
  });
});

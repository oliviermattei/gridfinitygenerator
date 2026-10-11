import { clipBlockOf, plateKeyOf, type ClipBlock, type PackedPlate, type PackingItem, type PackingMode } from "@repo/geometry";
import { categoryOf, type Article, type Category } from "./basket";
import type { ArticleMeasure, ArticlePart } from "./engine/article-measure";
import type { Strings } from "./strings";

/**
 * What the rangement of the basket lays on the plates (#42, ADR 0024), from the measures of its
 * articles: each exemplar of a bin, test kit or whole baseplate, each piece or stack of a cut
 * baseplate, and one block of all the clips of the basket. Pure: no React, no worker.
 */

/** Id of the block of clips among the objects. */
export const CLIP_BLOCK_ID = "clips";

/** One object of the rangement, and what it comes from. */
export interface BasketObject {
  id: string;
  category: Category;
  /** Its article; null for the block of clips, which holds the clips of several. */
  articleId: string | null;
  /** Which exemplar of its article, from 1. */
  exemplar: number;
  /** What of the exemplar it is; null for the block of clips. */
  part: ArticlePart | null;
}

export interface BasketPacking {
  /** The objects as the rangement takes them, their keys those of the mode (`plateKeyOf`). */
  items: PackingItem[];
  objects: ReadonlyMap<string, BasketObject>;
  /** Where each clip lies in its block, with the article it comes from; null without clips. */
  clipBlock: ClipBlock | null;
  /** Quantity of each article laid out, to tell its exemplars apart. */
  quantities: ReadonlyMap<string, number>;
}

/**
 * The objects of the articles that fit on the plate, in the order of the basket, the block of
 * clips last; null while an article is not measured yet. An article that does not fit, or whose
 * computation failed, is left out, as it is of the download.
 */
export function basketPackingOf(articles: readonly Article[], measureOf: (article: Article) => ArticleMeasure | "failed" | undefined, mode: PackingMode): BasketPacking | null {
  const items: PackingItem[] = [];
  const objects = new Map<string, BasketObject>();
  const quantities = new Map<string, number>();
  const clips: { id: string; width: number; depth: number; count: number }[] = [];
  for (const article of articles) {
    const measure = measureOf(article);
    if (measure === undefined) return null;
    if (measure === "failed" || !measure.fits) continue;
    quantities.set(article.id, article.quantity);
    const category = categoryOf(article.model);
    for (let exemplar = 1; exemplar <= article.quantity; exemplar++)
      measure.parts.forEach((part, index) => {
        const id = `${article.id}/${exemplar}/${index}`;
        objects.set(id, { id, category, articleId: article.id, exemplar, part });
        items.push({ id, width: part.width, depth: part.depth, key: plateKeyOf(mode, id, category) });
      });
    if (measure.clips) clips.push({ id: article.id, width: measure.clips.width, depth: measure.clips.depth, count: measure.clips.count * article.quantity });
  }
  const clipBlock = clipBlockOf(clips);
  if (clipBlock) {
    objects.set(CLIP_BLOCK_ID, { id: CLIP_BLOCK_ID, category: "clips", articleId: null, exemplar: 1, part: null });
    items.push({ id: CLIP_BLOCK_ID, width: clipBlock.width, depth: clipBlock.depth, key: plateKeyOf(mode, CLIP_BLOCK_ID, "clips") });
  }
  return { items, objects, clipBlock, quantities };
}

/** Piece numbers as runs: 1-4, or 1, 3. */
function runsOf(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    runs.push(j > i ? `${sorted[i]}-${sorted[j]}` : String(sorted[i]));
    i = j + 1;
  }
  return runs.join(", ");
}

/** What of its article an object is: nothing for a whole one, its pieces, or its stack. */
function partSuffix(part: ArticlePart, t: Strings): string | null {
  if (part.kind === "whole") return null;
  const pieces = t.basket.packing.pieces(runsOf(part.numbers), part.numbers.length);
  return part.kind === "stack" ? t.basket.packing.stack(pieces) : pieces;
}

/**
 * The name of an object on its plate: its article's (`nameOf`), its piece or stack, and which
 * exemplar it is when there are several; « Clips » for the block.
 */
export function objectLabel(object: BasketObject, basket: BasketPacking, nameOf: (articleId: string) => string, t: Strings): string {
  const names = t.basket.packing;
  if (object.articleId === null || object.part === null) return names.clips;
  const suffix = partSuffix(object.part, t);
  const name = suffix ? names.withPart(nameOf(object.articleId), suffix) : nameOf(object.articleId);
  return (basket.quantities.get(object.articleId) ?? 1) > 1 ? names.exemplar(name, object.exemplar) : name;
}

/**
 * The names of the plates: numbered in « moins de plateaux »; « par catégorie », after their
 * category and numbered (« Bins 1 »), or after their baseplate and its pieces when they hold one
 * article (« Baseplate 562 × 470 — pièces 1-4 »), « Clips »; after their object in « un objet
 * par plateau ».
 */
export function plateNames(plates: readonly PackedPlate[], mode: PackingMode, basket: BasketPacking, nameOf: (articleId: string) => string, t: Strings): string[] {
  const names = t.basket.packing;
  const counts = new Map<Category, number>();
  return plates.map((plate, index) => {
    const objects = plate.items.map((item) => basket.objects.get(item.id)!);
    if (mode === "fewest-plates") return names.plate(index + 1);
    if (mode === "one-per-plate") return objectLabel(objects[0]!, basket, nameOf, t);
    const category = objects[0]!.category;
    if (category === "clips") return names.clips;
    const number = (counts.get(category) ?? 0) + 1;
    counts.set(category, number);
    if (category === "bins") return names.bins(number);
    const articles = new Set(objects.map((object) => object.articleId));
    if (articles.size > 1) return names.baseplates(number);
    const articleId = objects[0]!.articleId!;
    const numbers = objects.flatMap((object) => object.part?.numbers ?? []);
    if (numbers.length === 0) return nameOf(articleId);
    return names.withPart(nameOf(articleId), names.pieces(runsOf(numbers), new Set(numbers).size));
  });
}

import {
  DEFAULT_BIN_SETTINGS,
  DEFAULT_SETTINGS,
  decodeBinSettings,
  decodeSettings,
  type BaseplateSettings,
  type BinSettings,
} from "@repo/geometry";
import { baseplatePath, binPath, type Locale } from "./i18n";
import type { Strings } from "./strings";

/**
 * The basket (#41, ADR 0024): what to print in one go, common to every generator and kept in
 * this browser. An article keeps the settings of a model, as the query string of its share
 * link, and a quantity; its model is computed again from them (for the totals shown, and at
 * the download). Pure: no React, no storage.
 */

/** What an article makes, which tells its generator and how its link is read. */
export type ArticleModel = "bin" | "baseplate" | "test-kit" | "clip";

/** A line of the basket. */
export interface Article {
  /** Unique in the basket, kept across changes: what the page and the generators name it by. */
  id: string;
  model: ArticleModel;
  /** Query string of the model's share link (`v=1&x=3`), kept as is: versioned like the link. */
  link: string;
  /** How many to print, at least 1. */
  quantity: number;
}

/** The basket of this browser. */
export interface Basket {
  articles: Article[];
}

/** Version of the stored basket written today. */
const BASKET_VERSION = 1;

export const ARTICLE_MODELS: readonly ArticleModel[] = ["bin", "baseplate", "test-kit", "clip"];

/** What an added article is made of: all but its id. */
export type ArticleDraft = Omit<Article, "id">;

/** The stored basket, versioned so that a later shape can still read it. */
export function serializeBasket(basket: Basket): string {
  return JSON.stringify({ v: BASKET_VERSION, articles: basket.articles });
}

/** Quantities an article takes. */
export const QUANTITY_RANGE = { min: 1, max: 999 } as const;

/** A quantity brought to a whole number in its range. */
export function quantityOf(value: number): number {
  return Math.min(QUANTITY_RANGE.max, Math.max(QUANTITY_RANGE.min, Math.round(value)));
}

/** An article as stored, when it is one, its quantity brought into its range. */
function articleOf(value: unknown): Article | null {
  if (!value || typeof value !== "object") return null;
  const { id, model, link, quantity } = value as Record<string, unknown>;
  if (typeof id !== "string" || !ARTICLE_MODELS.includes(model as ArticleModel) || typeof link !== "string") return null;
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return null;
  return { id, model: model as ArticleModel, link, quantity: quantityOf(quantity) };
}

/**
 * Reads the stored basket: nothing stored, a corrupted basket or one of an unknown version is
 * an empty basket; of a known one, only the valid articles are kept (the first of an id).
 */
export function parseBasket(raw: string | null): Basket {
  let value: unknown = null;
  try {
    value = JSON.parse(raw ?? "null");
  } catch {
    // Corrupted: empty.
  }
  if (!value || typeof value !== "object") return { articles: [] };
  const { v, articles } = value as Record<string, unknown>;
  if (v !== BASKET_VERSION || !Array.isArray(articles)) return { articles: [] };
  const ids = new Set<string>();
  const kept: Article[] = [];
  for (const stored of articles) {
    const article = articleOf(stored);
    if (!article || ids.has(article.id)) continue;
    ids.add(article.id);
    kept.push(article);
  }
  return { articles: kept };
}

/** The basket with one more article, last, named `id`. */
export function addArticle(basket: Basket, draft: ArticleDraft, id: string): Basket {
  return { articles: [...basket.articles, { id, ...draft, quantity: quantityOf(draft.quantity) }] };
}

/** The basket with `change` made to the article `id`; the same basket without it. */
function changed(basket: Basket, id: string, change: (article: Article) => Article): Basket {
  if (!basket.articles.some((article) => article.id === id)) return basket;
  return { articles: basket.articles.map((article) => (article.id === id ? change(article) : article)) };
}

/** The basket with another quantity of the article `id`, brought into its range (1 for a non-number). */
export function setQuantity(basket: Basket, id: string, quantity: number): Basket {
  return changed(basket, id, (article) => ({ ...article, quantity: Number.isFinite(quantity) ? quantityOf(quantity) : QUANTITY_RANGE.min }));
}

/** The basket with the article `id` made of the settings of `link`, in its place, with its quantity. */
export function updateArticle(basket: Basket, id: string, link: string): Basket {
  return changed(basket, id, (article) => ({ ...article, link }));
}

/** The basket without the article `id`. */
export function removeArticle(basket: Basket, id: string): Basket {
  if (!basket.articles.some((article) => article.id === id)) return basket;
  return { articles: basket.articles.filter((article) => article.id !== id) };
}

/** The kind of object of an article (glossary: Catégorie); a test kit is a baseplate. */
export type Category = "bins" | "baseplates" | "clips";

const CATEGORIES: Record<ArticleModel, Category> = { bin: "bins", baseplate: "baseplates", "test-kit": "baseplates", clip: "clips" };

export function categoryOf(model: ArticleModel): Category {
  return CATEGORIES[model];
}

/** The bin settings of a bin article, read with the defaults of its link's version. */
export function articleBinSettings(article: Pick<Article, "link">): BinSettings {
  return decodeBinSettings(article.link) ?? DEFAULT_BIN_SETTINGS;
}

/**
 * The baseplate settings of a baseplate, test kit or clip article: the test kit and the clip
 * take theirs from them, as their downloads do.
 */
export function articleBaseplateSettings(article: Pick<Article, "link">): BaseplateSettings {
  return decodeSettings(article.link) ?? DEFAULT_SETTINGS;
}

/**
 * The automatic name of an article: « Bin 2×1, 6 U », « Baseplate 562 × 470 » (its footprint
 * measured on its mesh, in millimetres, and only « Baseplate » until then), « Kit de test », « Clip ».
 */
export function articleName(article: Article, t: Strings, lengths: Intl.NumberFormat, footprint?: { width: number; depth: number } | null): string {
  const names = t.basket.names;
  switch (article.model) {
    case "bin": {
      const { columns, rows, units } = articleBinSettings(article);
      return names.bin(columns, rows, units);
    }
    case "baseplate":
      return footprint ? names.baseplateSized(lengths.format(footprint.width), lengths.format(footprint.depth)) : names.baseplate;
    case "test-kit":
      return names.testKit;
    case "clip":
      return names.clip;
  }
}

/** The layer height an article prints at, in millimetres: that of its settings (0.2 mm by default). */
export function articleLayerHeight(article: Pick<Article, "model" | "link">): number {
  return article.model === "bin" ? articleBinSettings(article).layerHeight : articleBaseplateSettings(article).layerHeight;
}

/**
 * The absolute share link of an article, as its generator copies it (`?` and its settings), on
 * the site at `origin`: what its objects carry in a downloaded file (#43).
 */
export function articleShareLink(article: Pick<Article, "model" | "link">, origin: string, locale: Locale): string {
  return `${origin}${article.model === "bin" ? binPath(locale) : baseplatePath(locale)}?${article.link}`;
}

/** Fragment of a generator's address that names the article it edits. */
const EDIT_PREFIX = "#article=";

/** The generator of an article with its settings, which then offers to update it (`editedArticleId`). */
export function articleHref(article: Article, locale: Locale): string {
  const path = article.model === "bin" ? binPath(locale) : baseplatePath(locale);
  return `${path}?${article.link}${EDIT_PREFIX}${encodeURIComponent(article.id)}`;
}

/** The id of the article a generator edits, from the fragment of its address; null for none. */
export function editedArticleId(hash: string): string | null {
  if (!hash.startsWith(EDIT_PREFIX)) return null;
  const id = decodeURIComponent(hash.slice(EDIT_PREFIX.length));
  return id === "" ? null : id;
}

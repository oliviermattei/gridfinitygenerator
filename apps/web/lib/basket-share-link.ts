import { decodeBinSettings, decodeSettings, deflate, inflate } from "@repo/geometry";
import { ARTICLE_MODELS, quantityOf, type ArticleDraft, type ArticleModel } from "./basket";

/**
 * The basket link (#44, ADR 0024): the whole basket in one parameter of /{lang}/panier, to send
 * it to someone or open it on another device. It carries the articles only, each its model,
 * its share link as is and its quantity: the build plate, the printer and the arrangement are
 * preferences of each browser. Each article's link keeps its own version, so the basket link
 * reads every link its generator reads. Pure: no React, no storage.
 *
 * Format: `p=<version>.<data>`, the data being the articles deflated then in base64url; once
 * inflated, one article per line, `<model> <quantity> <link>` (version 1).
 */

/** Version of the basket links written today. */
const BASKET_LINK_VERSION = 1;
/** Name of the parameter of the basket page that carries the basket. */
const PARAMETER = "p";
/** Bound on the inflated articles: far above a basket of 999 long links, far below a deflate bomb. */
const MAX_PAYLOAD_BYTES = 1 << 20;

/** The articles a basket link opens, and how many of its articles could not be read. */
export interface OpenedBasketLink {
  articles: ArticleDraft[];
  unreadable: number;
}

/** The query string of the basket link of these articles, without its `?`: `p=1.<data>`. */
export function basketShareQuery(articles: readonly ArticleDraft[]): string {
  const payload = articles.map(({ model, quantity, link }) => `${model} ${quantity} ${link}`).join("\n");
  return `${PARAMETER}=${BASKET_LINK_VERSION}.${toBase64Url(deflate(new TextEncoder().encode(payload)))}`;
}

/**
 * The articles of the basket link in a page's query string (with or without its `?`): null
 * when it has none; "unreadable" when the whole link cannot be read (corrupted, truncated, or
 * of a version written later); otherwise its articles, those that cannot be read left out and
 * counted, their quantities brought into their range.
 */
export function readBasketShareLink(query: string): OpenedBasketLink | "unreadable" | null {
  const value = new URLSearchParams(query).get(PARAMETER);
  if (value === null) return null;
  const match = /^([1-9]\d*)\.([A-Za-z0-9_-]+)$/.exec(value);
  if (!match || Number(match[1]) !== BASKET_LINK_VERSION) return "unreadable";
  let payload: string;
  try {
    payload = new TextDecoder("utf-8", { fatal: true }).decode(inflate(fromBase64Url(match[2] as string), MAX_PAYLOAD_BYTES));
  } catch {
    return "unreadable";
  }
  const opened: OpenedBasketLink = { articles: [], unreadable: 0 };
  if (payload === "") return opened;
  for (const line of payload.split("\n")) {
    const article = articleOf(line);
    if (article) opened.articles.push(article);
    else opened.unreadable++;
  }
  return opened;
}

/** An article of a basket link of version 1, when it can be read: one its generator opens. */
function articleOf(line: string): ArticleDraft | null {
  const match = /^(\S+) (\d+) (\S+)$/.exec(line);
  if (!match) return null;
  const model = match[1] as ArticleModel;
  const link = match[3] as string;
  if (!ARTICLE_MODELS.includes(model)) return null;
  const settings = model === "bin" ? decodeBinSettings(link) : decodeSettings(link);
  if (settings === null) return null;
  return { model, link, quantity: quantityOf(Number(match[2])) };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** Throws when `text` is not base64url. */
function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

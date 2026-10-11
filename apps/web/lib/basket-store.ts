"use client";

import { useSyncExternalStore } from "react";
import { addArticle, editedArticleId, parseBasket, serializeBasket, type Article, type ArticleDraft, type Basket } from "./basket";
import { BASKET_STORAGE_KEY } from "./storage-keys";

/**
 * The basket of this browser (#41, ADR 0024), shared by every page and every tab: kept in the
 * browser storage like the preferences, read again when another tab changes it, and kept in
 * memory until the page is closed when the storage cannot save it.
 */

const EMPTY: Basket = { articles: [] };

/** The basket changed in this page, kept here when the browser storage could not save it. */
let unsaved: Basket | null = null;
/** Last snapshot, reused while the stored text is unchanged (useSyncExternalStore needs a stable one). */
let cache: { raw: string | null; basket: Basket } | null = null;

function readStorage(): string | null {
  try {
    return localStorage.getItem(BASKET_STORAGE_KEY);
  } catch {
    return null; // storage blocked
  }
}

function snapshot(): Basket {
  if (unsaved) return unsaved;
  const raw = readStorage();
  if (cache?.raw !== raw) cache = { raw, basket: parseBasket(raw) };
  return cache.basket;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the basket.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const serverSnapshot = () => EMPTY;

/** The basket of this browser; empty while the page hydrates. */
export function useBasket(): Basket {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** Makes a change to the basket of this browser (one of basket.ts), stores it, and shows it everywhere. */
export function changeBasket(change: (basket: Basket) => Basket) {
  const next = change(snapshot());
  try {
    localStorage.setItem(BASKET_STORAGE_KEY, serializeBasket(next));
    unsaved = null;
  } catch {
    unsaved = next; // storage unavailable or full: the basket lasts until the page is closed
  }
  listeners.forEach((listener) => listener());
}

function newArticleId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Adds an article to the basket of this browser, and returns it. */
export function addToBasket(draft: ArticleDraft): Article {
  const id = newArticleId();
  changeBasket((basket) => addArticle(basket, draft, id));
  return snapshot().articles.find((article) => article.id === id) as Article;
}

function subscribeToHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

/**
 * The article of the basket the generator on screen edits: the one its address names
 * (`articleHref`), while it is still in the basket; null otherwise, and while the page hydrates.
 */
export function useEditedArticle(): Article | null {
  const id = useSyncExternalStore(
    subscribeToHash,
    () => editedArticleId(window.location.hash),
    () => null,
  );
  const basket = useBasket();
  return id === null ? null : (basket.articles.find((article) => article.id === id) ?? null);
}

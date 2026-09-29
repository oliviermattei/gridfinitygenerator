"use client";

import { BRAND_ACCENT } from "@repo/ui";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Local preferences: kept in this browser only, never in the share link, and left alone
 * by a reset of the baseplate settings. Language, units, printer and build plate join
 * them with #7 and #14.
 */

/** Plastic colours of the 3D preview: the brand accent first (the default), then four neutrals. */
export const PREVIEW_COLORS = {
  brand: BRAND_ACCENT,
  white: "#F0F0EC",
  pebble: "#A4A8AF",
  graphite: "#2E3137",
  sand: "#D8C7A4",
} as const;

export type PreviewColor = keyof typeof PREVIEW_COLORS;

const DEFAULT_PREVIEW_COLOR: PreviewColor = "brand";
const STORAGE_KEY = "preferences";

function isPreviewColor(value: unknown): value is PreviewColor {
  return typeof value === "string" && Object.hasOwn(PREVIEW_COLORS, value);
}

/** Choice made in this page, kept here when the browser storage could not save it. */
let unsaved: PreviewColor | null = null;

function readPreviewColor(): PreviewColor {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const value = (stored as { previewColor?: unknown } | null)?.previewColor;
    if (unsaved) return unsaved;
    return isPreviewColor(value) ? value : DEFAULT_PREVIEW_COLOR;
  } catch {
    return unsaved ?? DEFAULT_PREVIEW_COLOR; // storage blocked or corrupted
  }
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the preferences.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The preview colour chosen in this browser, and its setter. */
export function usePreviewColor(): [PreviewColor, (next: PreviewColor) => void] {
  const color = useSyncExternalStore(subscribe, readPreviewColor, () => DEFAULT_PREVIEW_COLOR);
  const setColor = useCallback((next: PreviewColor) => {
    try {
      let others: object = {};
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        if (stored && typeof stored === "object") others = stored;
      } catch {
        // Corrupted preferences: start again from this one.
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...others, previewColor: next }));
      unsaved = null;
    } catch {
      unsaved = next; // storage unavailable or full: the choice lasts until the page is closed
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [color, setColor];
}

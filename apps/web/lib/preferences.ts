"use client";

import type { BuildPlate } from "@repo/geometry";
import { BRAND_ACCENT } from "@repo/ui";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Local preferences: kept in this browser only, never in the share link, and left alone
 * by a reset of the baseplate settings. Language and units join them with #14.
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

/** Nozzle diameters offered, in millimetres; 0.4 is the one most printers ship with. */
export const NOZZLES = [0.2, 0.4, 0.6, 0.8] as const;

export type Nozzle = (typeof NOZZLES)[number];

/** Usable size of a build plate, per axis, in millimetres. */
export const BUILD_PLATE_RANGE = { min: 50, max: 1000 } as const;

export interface Preferences {
  previewColor: PreviewColor;
  /** Nozzle of the printer, in millimetres: the line width follows it when it changes. */
  nozzle: Nozzle;
  /** Usable area of the build plate, in millimetres. */
  buildPlate: BuildPlate;
}

export const DEFAULT_PREFERENCES: Preferences = {
  previewColor: "brand",
  nozzle: 0.4,
  buildPlate: { width: 256, depth: 256 },
};

const STORAGE_KEY = "preferences";

function isPreviewColor(value: unknown): value is PreviewColor {
  return typeof value === "string" && Object.hasOwn(PREVIEW_COLORS, value);
}

function isNozzle(value: unknown): value is Nozzle {
  return NOZZLES.includes(value as Nozzle);
}

function plateLength(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(BUILD_PLATE_RANGE.max, Math.max(BUILD_PLATE_RANGE.min, value));
}

/** Reads stored preferences, keeping the valid ones and the defaults for the rest. */
function parse(raw: string | null): Preferences {
  let stored: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (value && typeof value === "object") stored = value as Record<string, unknown>;
  } catch {
    // Corrupted preferences: the defaults.
  }
  const plate = (stored.buildPlate ?? {}) as Partial<Record<keyof BuildPlate, unknown>>;
  return {
    previewColor: isPreviewColor(stored.previewColor) ? stored.previewColor : DEFAULT_PREFERENCES.previewColor,
    nozzle: isNozzle(stored.nozzle) ? stored.nozzle : DEFAULT_PREFERENCES.nozzle,
    buildPlate: {
      width: plateLength(plate.width, DEFAULT_PREFERENCES.buildPlate.width),
      depth: plateLength(plate.depth, DEFAULT_PREFERENCES.buildPlate.depth),
    },
  };
}

/** Choices made in this page, kept here when the browser storage could not save them. */
let unsaved: Preferences | null = null;
/** Last snapshot, reused while the stored text is unchanged (useSyncExternalStore needs a stable one). */
let cache: { raw: string | null; preferences: Preferences } | null = null;

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked
  }
}

function snapshot(): Preferences {
  if (unsaved) return unsaved;
  const raw = readStorage();
  if (cache?.raw !== raw) cache = { raw, preferences: parse(raw) };
  return cache.preferences;
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

const serverSnapshot = () => DEFAULT_PREFERENCES;

/** The preferences of this browser, and a setter that merges a change into them. */
export function usePreferences(): [Preferences, (patch: Partial<Preferences>) => void] {
  const preferences = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...snapshot(), ...patch };
    try {
      // Keys of other versions, unknown here, are kept.
      let others: object = {};
      try {
        const stored: unknown = JSON.parse(readStorage() ?? "{}");
        if (stored && typeof stored === "object") others = stored;
      } catch {
        // Corrupted preferences: start again from these.
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...others, ...next }));
      unsaved = null;
    } catch {
      unsaved = next; // storage unavailable or full: the choices last until the page is closed
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [preferences, update];
}

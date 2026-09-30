"use client";

import {
  DEFAULT_BIN_SETTINGS,
  DEFAULT_SETTINGS,
  decodeBinSettings,
  decodeSettings,
  encodeBinSettings,
  encodeSettings,
  openingBinSettings,
  openingSettings,
  type BaseplateSettings,
  type BinSettings,
} from "@repo/geometry";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Settings of the model on screen, one store per generator. On opening, a shared link in the
 * page address wins over the last settings stored in this browser, which win over the
 * defaults. Only a change made on the page is stored: opening a link to look at it keeps the
 * work in progress. The server renders the defaults; the browser switches to the restored
 * settings right after hydration, so both renders match.
 */

interface Codec<T> {
  /** Browser storage of the last settings, kept as a share link (versioned like one). */
  storageKey: string;
  defaults: T;
  encode: (settings: T) => string;
  decode: (query: string) => T | null;
  opening: (pageQuery: string, stored: string | null) => T;
}

export type SettingsUpdate<T> = T | ((previous: T) => T);

function createSettingsStore<T>({ storageKey, defaults, encode, decode, opening }: Codec<T>) {
  /** Settings on screen; restored from the address or the storage on the first client read. */
  let current: T | null = null;
  const listeners = new Set<() => void>();

  function snapshot(): T {
    if (current === null) {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(storageKey);
      } catch {
        // Storage blocked: nothing to restore.
      }
      current = opening(window.location.search, stored);
    }
    return current;
  }

  const serverSnapshot = () => defaults;

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  /** Stores the settings as the last ones of this browser; they are lost with the page if storage fails. */
  function save(settings: T) {
    try {
      localStorage.setItem(storageKey, encode(settings));
    } catch {
      // Storage unavailable or full.
    }
  }

  /**
   * Once the settings of a shared link are changed, the address stops carrying that link, so
   * that a reload keeps the change instead of opening the link again.
   */
  function forgetSharedLinkInAddress() {
    const { pathname, search, hash } = window.location;
    if (decode(search) !== null) window.history.replaceState(null, "", pathname + hash);
  }

  /** The settings on screen, and a setter that changes and stores them. */
  function useSettings(): [T, (update: SettingsUpdate<T>) => void] {
    const settings = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const setSettings = useCallback((update: SettingsUpdate<T>) => {
      current = typeof update === "function" ? (update as (previous: T) => T)(snapshot()) : update;
      save(current);
      forgetSharedLinkInAddress();
      listeners.forEach((listener) => listener());
    }, []);
    return [settings, setSettings];
  }

  /** The share link of the settings: this page, with the settings in its query string. */
  function shareLink(settings: T): string {
    const { origin, pathname } = window.location;
    return `${origin}${pathname}?${encode(settings)}`;
  }

  return { useSettings, shareLink };
}

const baseplates = createSettingsStore<BaseplateSettings>({
  storageKey: "settings",
  defaults: DEFAULT_SETTINGS,
  encode: encodeSettings,
  decode: decodeSettings,
  opening: openingSettings,
});

const bins = createSettingsStore<BinSettings>({
  storageKey: "bin-settings",
  defaults: DEFAULT_BIN_SETTINGS,
  encode: encodeBinSettings,
  decode: decodeBinSettings,
  opening: openingBinSettings,
});

/** The baseplate settings on screen, and a setter that changes and stores them. */
export const useSavedSettings = baseplates.useSettings;
/** The share link of baseplate settings. */
export const shareLinkOf = baseplates.shareLink;
/** The bin settings on screen, and a setter that changes and stores them. */
export const useSavedBinSettings = bins.useSettings;
/** The share link of bin settings. */
export const binShareLinkOf = bins.shareLink;

const noSubscription = () => () => {};

/** False while the page hydrates (server settings), true once the restored settings apply. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * The settings after a reset: the defaults of the baseplate. Layer height and line width
 * are kept: they belong to the share link, but they describe the printer, like the
 * preferences a reset leaves alone.
 */
export function resetSettings(settings: BaseplateSettings): BaseplateSettings {
  return { ...DEFAULT_SETTINGS, layerHeight: settings.layerHeight, lineWidth: settings.lineWidth };
}

/** The bin settings after a reset: the defaults, the print settings kept, like a baseplate. */
export function resetBinSettings(settings: BinSettings): BinSettings {
  return { ...DEFAULT_BIN_SETTINGS, layerHeight: settings.layerHeight, lineWidth: settings.lineWidth };
}

"use client";

import { DEFAULT_SETTINGS, decodeSettings, encodeSettings, openingSettings, type BaseplateSettings } from "@repo/geometry";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Settings of the baseplate on screen. On opening, a shared link in the page address wins
 * over the last settings stored in this browser, which win over the defaults. Only a change
 * made on the page is stored: opening a link to look at it keeps the work in progress. The server
 * renders the defaults; the browser switches to the restored settings right after
 * hydration, so both renders match.
 */

/** Browser storage of the last settings, kept as a share link (versioned like one). */
const STORAGE_KEY = "settings";

/** Settings on screen; restored from the address or the storage on the first client read. */
let current: BaseplateSettings | null = null;
const listeners = new Set<() => void>();

function snapshot(): BaseplateSettings {
  if (current === null) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked: nothing to restore.
    }
    current = openingSettings(window.location.search, stored);
  }
  return current;
}

const serverSnapshot = () => DEFAULT_SETTINGS;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stores the settings as the last ones of this browser; they are lost with the page if storage fails. */
function saveSettings(settings: BaseplateSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, encodeSettings(settings));
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
  if (decodeSettings(search) !== null) window.history.replaceState(null, "", pathname + hash);
}

export type SettingsUpdate = BaseplateSettings | ((previous: BaseplateSettings) => BaseplateSettings);

/** The settings on screen, and a setter that changes and stores them. */
export function useSavedSettings(): [BaseplateSettings, (update: SettingsUpdate) => void] {
  const settings = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const setSettings = useCallback((update: SettingsUpdate) => {
    current = typeof update === "function" ? update(snapshot()) : update;
    saveSettings(current);
    forgetSharedLinkInAddress();
    listeners.forEach((listener) => listener());
  }, []);
  return [settings, setSettings];
}

const noSubscription = () => () => {};

/** False while the page hydrates (server settings), true once the restored settings apply. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/** The share link of the settings: this page, with the settings in its query string. */
export function shareLinkOf(settings: BaseplateSettings): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${encodeSettings(settings)}`;
}

/**
 * The settings after a reset: the defaults of the baseplate. Layer height and line width
 * are kept: they belong to the share link, but they describe the printer, like the
 * preferences a reset leaves alone.
 */
export function resetSettings(settings: BaseplateSettings): BaseplateSettings {
  return { ...DEFAULT_SETTINGS, layerHeight: settings.layerHeight, lineWidth: settings.lineWidth };
}

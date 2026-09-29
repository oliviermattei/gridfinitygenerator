"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Width from which the desktop layout applies: Tailwind's `md` breakpoint. */
export const DESKTOP_QUERY = "(min-width: 48rem)";

/**
 * Whether a CSS media query matches, kept up to date. `serverValue` is used for the
 * server render and hydration; the layouts themselves switch with CSS, so a mismatch
 * only affects what CSS cannot express (labels, measured insets).
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

import type { CSSProperties } from "react";

/**
 * Brand accent (terracotta), chosen on 2026-09-29.
 * This is the ONLY place where the accent colour is defined: every accent token of the
 * interface derives from it (and so will the default plastic colour of the 3D preview).
 */
export const BRAND_ACCENT = "#C4502F";

// Candidate text colours laid on the accent. INK_DARK matches --color-ink in tokens.css.
const INK_LIGHT = "#FFFFFF";
const INK_DARK = "#121319";

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  const [r, g, b] = match.slice(1).map((channel) => {
    const s = parseInt(channel, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour laid on the accent: whichever ink contrasts most with it. */
const accentInk =
  contrast(INK_LIGHT, BRAND_ACCENT) >= contrast(INK_DARK, BRAND_ACCENT) ? INK_LIGHT : INK_DARK;

/** CSS custom properties of the accent, all derived from BRAND_ACCENT. */
export function accentVars(): CSSProperties {
  return {
    "--accent": BRAND_ACCENT,
    "--accent-strong": `color-mix(in oklab, ${BRAND_ACCENT} 82%, black)`,
    "--accent-ink": accentInk,
    "--accent-tint": `color-mix(in oklab, ${BRAND_ACCENT} 10%, white)`,
    "--accent-ring": `color-mix(in srgb, ${BRAND_ACCENT} 28%, transparent)`,
  } as CSSProperties;
}

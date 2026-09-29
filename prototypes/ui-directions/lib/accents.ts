// PROTOTYPE JETABLE — accent unique de la direction Studio : SEULE source de sa couleur.
// Pour changer l'accent du site : modifier BRAND_ACCENT (ou ajouter une entrée à ACCENTS).
// Chaque accent fixe les jetons CSS de l'interface (--accent*) et la couleur du plastique de l'aperçu 3D
// (par défaut, la baseplate a la couleur de la marque). `ink` = texte posé sur l'accent (contraste ≥ 4,5:1).
// Test sans toucher au code : ?accent=<clé> dans l'URL.
import type { CSSProperties } from "react";

export type Accent = {
  key: string;
  fr: string;
  en: string;
  hex: string;
  /** Texte d'accent sur fond blanc (liens, icône d'alerte). */
  strong: string;
  ink: string;
  tint: string;
  /** Couleur du plastique dans l'aperçu (corrigée pour le tone mapping ACES si besoin). */
  plastic: string;
  plasticRender?: string;
};

export const ACCENTS: Accent[] = [
  { key: "orange", fr: "Orange signal", en: "Signal orange", hex: "#F26A21", strong: "#B8470C", ink: "#1A0F08", tint: "#FFF0E6", plastic: "#F26A21" },
  { key: "terracotta", fr: "Terre cuite", en: "Terracotta", hex: "#C4502F", strong: "#A33F22", ink: "#FFFFFF", tint: "#FBEDE8", plastic: "#C4502F" },
  { key: "fir", fr: "Sapin", en: "Fir", hex: "#2E6B4F", strong: "#2E6B4F", ink: "#FFFFFF", tint: "#E8F2EC", plastic: "#2E6B4F", plasticRender: "#3A7D5F" },
  { key: "petrol", fr: "Pétrole", en: "Petrol", hex: "#0F7C7A", strong: "#0B6E6C", ink: "#FFFFFF", tint: "#E4F3F2", plastic: "#0F7C7A", plasticRender: "#168C89" },
  { key: "mustard", fr: "Moutarde", en: "Mustard", hex: "#E3A21A", strong: "#8A5E00", ink: "#1F1604", tint: "#FDF4E0", plastic: "#E3A21A" },
  { key: "graphite", fr: "Graphite", en: "Graphite", hex: "#22242A", strong: "#22242A", ink: "#FFFFFF", tint: "#EDEEF1", plastic: "#F0F0EC" },
];

/** Accent de la marque, choisi le 29/09/2026 (l'outremer a été rejeté). */
export const BRAND_ACCENT = "terracotta";
export const DEFAULT_ACCENT = Math.max(0, ACCENTS.findIndex((a) => a.key === BRAND_ACCENT));

export function accentVars(a: Accent): CSSProperties {
  return {
    "--accent": a.hex,
    "--accent-strong": a.strong,
    "--accent-ink": a.ink,
    "--accent-tint": a.tint,
    "--accent-ring": `color-mix(in srgb, ${a.hex} 28%, transparent)`,
  } as CSSProperties;
}

/** Règle CSS qui pose les jetons d'accent sur la racine de la direction et sur les popups portés hors de l'arbre. */
export function accentCss(a: Accent) {
  const vars = Object.entries(accentVars(a)).map(([k, v]) => `${k}: ${v};`).join(" ");
  return `.dir-b, .kit-popup { ${vars} }`;
}

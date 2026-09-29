"use client";
// PROTOTYPE JETABLE — état des réglages partagé par les 3 directions visuelles.
// Pas de vraie géométrie : seulement assez de logique pour que l'aperçu et les libellés vivent.
import { useCallback, useMemo, useState } from "react";

export type Align = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";
export const ALIGNS: Align[] = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"];

export type Settings = {
  sizeMode: "drawer" | "cells";
  drawerW: number;
  drawerD: number;
  cellsX: number;
  cellsY: number;
  marginX: number;
  marginY: number;
  align: Align;
  profile: "hybrid" | "flush";
  magnets: boolean;
  magnetD: number;
  magnetH: number;
  magnetRelease: boolean;
  screws: boolean;
  screwShaft: number;
  screwHead: number;
  cellSize: number;
  tolerance: number;
  outerRadius: number;
  bottomChamfer: number;
  nozzle: number;
  layer: number;
  unit: "mm" | "in";
  lang: "fr" | "en";
  /** Couleur de filament de l'aperçu (index dans la palette de la variante). */
  filament: number;
  /** Accent de l'interface (index dans lib/accents.ts) : choix de prototype, pas un réglage produit. */
  accent: number;
};

export const DEFAULTS: Settings = {
  sizeMode: "drawer",
  drawerW: 400,
  drawerD: 280,
  cellsX: 4,
  cellsY: 3,
  marginX: 0,
  marginY: 0,
  align: "c",
  profile: "hybrid",
  magnets: false,
  magnetD: 6,
  magnetH: 2,
  magnetRelease: false,
  screws: false,
  screwShaft: 3,
  screwHead: 6,
  cellSize: 42,
  tolerance: 0.2,
  outerRadius: 4,
  bottomChamfer: 0,
  nozzle: 0.4,
  layer: 0.2,
  unit: "mm",
  lang: "fr",
  filament: 0,
  accent: 0,
};

export type Layout = {
  width: number;
  depth: number;
  nx: number;
  ny: number;
  marginLeft: number;
  marginRight: number;
  marginBack: number;
  marginFront: number;
  height: number;
};

export function computeLayout(s: Settings): Layout {
  const c = s.cellSize;
  let width: number, depth: number, nx: number, ny: number;
  if (s.sizeMode === "drawer") {
    width = s.drawerW;
    depth = s.drawerD;
    nx = Math.max(1, Math.floor(width / c));
    ny = Math.max(1, Math.floor(depth / c));
  } else {
    nx = s.cellsX;
    ny = s.cellsY;
    width = nx * c + s.marginX;
    depth = ny * c + s.marginY;
  }
  const restX = Math.max(0, width - nx * c);
  const restY = Math.max(0, depth - ny * c);
  const col = s.align.includes("l") ? 0 : s.align.includes("r") ? 1 : 0.5;
  const row = s.align.startsWith("t") ? 0 : s.align.startsWith("b") ? 1 : 0.5;
  // "l" = grille collée à gauche → toute la marge à droite.
  const marginLeft = restX * col;
  const marginBack = restY * row;
  const base = s.profile === "hybrid" ? 4.6 : 4.25;
  return {
    width,
    depth,
    nx,
    ny,
    marginLeft,
    marginRight: restX - marginLeft,
    marginBack,
    marginFront: restY - marginBack,
    height: base + (s.magnets || s.screws ? 2.8 : 0),
  };
}

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const set = useCallback((patch: Partial<Settings>) => setS((p) => ({ ...p, ...patch })), []);
  const reset = useCallback(() => setS((p) => ({ ...DEFAULTS, lang: p.lang, unit: p.unit, filament: p.filament, accent: p.accent })), []);
  const layout = useMemo(() => computeLayout(s), [s]);
  const t = STRINGS[s.lang];
  return { s, set, reset, layout, t };
}

export type Ctx = ReturnType<typeof useSettings>;

/** Affiche une longueur (mm en interne) dans l'unité choisie. */
export function fmtLen(mm: number, unit: Settings["unit"], digits?: number) {
  if (unit === "in") return `${(mm / 25.4).toFixed(digits ?? 2)} in`;
  return `${round(mm, digits ?? 1)} mm`;
}
export function toUnit(mm: number, unit: Settings["unit"]) {
  return unit === "in" ? +(mm / 25.4).toFixed(3) : mm;
}
export function fromUnit(v: number, unit: Settings["unit"]) {
  return unit === "in" ? +(v * 25.4).toFixed(2) : v;
}
function round(v: number, d: number) {
  const f = 10 ** d;
  return (Math.round(v * f) / f).toString();
}

/* ------------------------------------------------------------------ */
/* Textes EN / FR — libellés FR alignés sur le glossaire (CONTEXT.md) */
/* ------------------------------------------------------------------ */
const fr = {
  generator: "Générateur de baseplates",
  tagline: "Une baseplate Gridfinity taillée pour ton tiroir.",
  download: "Télécharger",
  downloadAs: (f: string) => `Télécharger en ${f}`,
  share: "Partager",
  shared: "Lien copié",
  reset: "Réinitialiser",
  donate: "Offrir un café",
  language: "Langue",
  units: "Unités",
  printProfile: "Profil d'impression",
  nozzle: "Buse",
  layer: "Hauteur de couche",
  settings: "Réglages",
  preview: "Aperçu",
  size: "Taille",
  sizeDrawer: "Tiroir en mm",
  sizeDrawerIn: "Tiroir en pouces",
  sizeCells: "Nombre de cellules",
  width: "Largeur",
  depth: "Profondeur",
  cols: "Colonnes",
  rows: "Rangées",
  margin: "Marge",
  marginX: "Marge en largeur",
  marginY: "Marge en profondeur",
  alignment: "Alignement",
  alignHint: "Où placer la grille quand la marge ne tombe pas juste.",
  alignNames: {
    tl: "Arrière gauche", t: "Arrière", tr: "Arrière droite",
    l: "Gauche", c: "Centre", r: "Droite",
    bl: "Avant gauche", b: "Avant", br: "Avant droite",
  } as Record<Align, string>,
  profile: "Profil de poche",
  hybrid: "Hybride",
  hybridDesc: "Muret de 0,35 mm : le bac est tenu par les pentes, sans jeu.",
  flush: "Ras",
  flushDesc: "Sans muret : baseplate plus fine de 0,35 mm.",
  recommended: "Recommandé",
  magnets: "Aimants",
  magnetsDesc: "Logements pour aimants sous chaque cellule.",
  diameter: "Diamètre",
  thickness: "Épaisseur",
  releaseHoles: "Trous d'éjection",
  releaseDesc: "Un trou traversant pour pousser l'aimant.",
  screws: "Vis",
  screwsDesc: "Trous fraisés pour visser la baseplate au fond du tiroir.",
  shaft: "Ø tige",
  head: "Ø tête",
  advanced: "Avancé",
  advancedWarn: "Au-delà des valeurs par défaut, les bacs standard risquent de ne plus s'emboîter.",
  cellSize: "Taille de cellule",
  tolerance: "Tolérance",
  outerRadius: "Rayon des coins",
  bottomChamfer: "Chanfrein du dessous",
  cells: (x: number, y: number) => `${x} × ${y} cellules`,
  off: "Désactivé",
  on: "Activé",
  total: "Baseplate",
  heightLabel: "Hauteur",
  layers: (n: number) => `${n} couches`,
  debug: "État",
  more: "Plus",
  close: "Fermer",
  cellsUnit: "cellules",
  sep: " : ",
  filament: "Filament",
  recenter: "Recentrer la vue",
  releaseNone: "Fond plein",
  releaseThrough: "Trou d'éjection",
  magnetsOffHint: "Active-les pour tenir la baseplate sur une tôle ou les bacs sur la baseplate.",
  screwsOffHint: "Pour fixer la baseplate au fond du tiroir.",
  orbitHint: "Glisser pour tourner, pincer ou molette pour zoomer",
  mmOnly: "Toujours en mm",
  print: "Impression",
  preferences: "Préférences",
  printer: "Imprimante",
  previewColor: "Couleur de l'aperçu",
  languageNames: { fr: "Français", en: "English" },
};

const en: typeof fr = {
  generator: "Baseplate generator",
  tagline: "A Gridfinity baseplate cut to fit your drawer.",
  download: "Download",
  downloadAs: (f: string) => `Download as ${f}`,
  share: "Share",
  shared: "Link copied",
  reset: "Reset",
  donate: "Buy me a coffee",
  language: "Language",
  units: "Units",
  printProfile: "Print profile",
  nozzle: "Nozzle",
  layer: "Layer height",
  settings: "Settings",
  preview: "Preview",
  size: "Size",
  sizeDrawer: "Drawer in mm",
  sizeDrawerIn: "Drawer in inches",
  sizeCells: "Cell count",
  width: "Width",
  depth: "Depth",
  cols: "Columns",
  rows: "Rows",
  margin: "Margin",
  marginX: "Width margin",
  marginY: "Depth margin",
  alignment: "Alignment",
  alignHint: "Where the grid sits when the margin doesn't divide evenly.",
  alignNames: {
    tl: "Back left", t: "Back", tr: "Back right",
    l: "Left", c: "Center", r: "Right",
    bl: "Front left", b: "Front", br: "Front right",
  },
  profile: "Pocket profile",
  hybrid: "Hybrid",
  hybridDesc: "0.35 mm wall: the bin rests on the slopes, no play.",
  flush: "Flush",
  flushDesc: "No wall: a 0.35 mm thinner baseplate.",
  recommended: "Recommended",
  magnets: "Magnets",
  magnetsDesc: "Magnet pockets under every cell.",
  diameter: "Diameter",
  thickness: "Thickness",
  releaseHoles: "Release holes",
  releaseDesc: "A through-hole to push the magnet out.",
  screws: "Screws",
  screwsDesc: "Countersunk holes to screw the baseplate to the drawer.",
  shaft: "Shaft Ø",
  head: "Head Ø",
  advanced: "Advanced",
  advancedWarn: "Outside the defaults, standard bins may no longer fit.",
  cellSize: "Cell size",
  tolerance: "Tolerance",
  outerRadius: "Corner radius",
  bottomChamfer: "Bottom chamfer",
  cells: (x: number, y: number) => `${x} × ${y} cells`,
  off: "Off",
  on: "On",
  total: "Baseplate",
  heightLabel: "Height",
  layers: (n: number) => `${n} layers`,
  debug: "State",
  more: "More",
  close: "Close",
  cellsUnit: "cells",
  sep: ": ",
  filament: "Filament",
  recenter: "Recenter view",
  releaseNone: "Solid floor",
  releaseThrough: "Release hole",
  magnetsOffHint: "Turn on to hold the baseplate on steel, or the bins on the baseplate.",
  screwsOffHint: "To fix the baseplate to the drawer floor.",
  orbitHint: "Drag to orbit, pinch or scroll to zoom",
  mmOnly: "Always in mm",
  print: "Print",
  preferences: "Preferences",
  printer: "Printer",
  previewColor: "Preview color",
  languageNames: { fr: "Français", en: "English" },
};

export const STRINGS = { fr, en };
export type Strings = typeof fr;

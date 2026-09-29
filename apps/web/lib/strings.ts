import { BRAND_ACCENT_NAME } from "@repo/ui";

/**
 * Interface copy, worded with the glossary (CONTEXT.md). French only for now: English and
 * language switching arrive with #14.
 */
export const strings = {
  locale: "fr-FR",
  generator: "Générateur de baseplates",
  // Top bar and menu
  share: "Partager",
  reset: "Réinitialiser",
  donate: "Offrir un café",
  comingSoon: "Bientôt disponible",
  newTab: "s'ouvre dans un nouvel onglet",
  parameters: "Paramètres",
  menu: "Menu",
  actions: "Actions",
  previewColor: "Couleur de l'aperçu",
  previewColors: {
    brand: BRAND_ACCENT_NAME.fr,
    white: "Blanc",
    pebble: "Galet",
    graphite: "Graphite",
    sand: "Sable",
  },
  // Preview
  recenter: "Recentrer la vue",
  webglUnavailable: "Aperçu 3D indisponible : WebGL est désactivé dans ce navigateur.",
  // Settings panel
  settings: "Réglages",
  close: "Fermer",
  dimensions: "Dimensions",
  cells: (columns: number, rows: number) => `${columns} × ${rows} cellules`,
  height: "hauteur",
  size: "Taille",
  columns: "Colonnes",
  fewerColumns: "Une colonne de moins",
  moreColumns: "Une colonne de plus",
  rows: "Rangées",
  fewerRows: "Une rangée de moins",
  moreRows: "Une rangée de plus",
  pocketProfile: "Profil de poche",
  hybrid: "Hybride",
  hybridDescription: "Muret de 0,35 mm : le bac est bien assis sur ses pentes, sans jeu.",
  flush: "Ras",
  flushDescription: "Sans le muret de 0,35 mm : baseplate plus fine.",
  recommended: "Recommandé",
  soon: "Bientôt",
  // Download
  downloadStl: "Télécharger le STL",
  preparingStl: "Préparation du STL…",
  // Errors
  computeFailed: "Le calcul de la baseplate a échoué. Modifiez un réglage pour réessayer.",
  exportFailed: "L'export STL a échoué. Réessayez.",
};

import { baseplatePath, binPath, type Locale } from "./i18n";

/** The generators of the site, in the order of the index (ADR 0017). */
export const GENERATOR_IDS = ["baseplate", "bin"] as const;

export type GeneratorId = (typeof GENERATOR_IDS)[number];

export interface Generator {
  id: GeneratorId;
  /** Its page in a language. */
  path: (locale: Locale) => string;
  /** Fixed image of the card, rendered from the engine (`pnpm card-images`), under public/; null until it exists. */
  image: { src: string; width: number; height: number } | null;
  /** False while it is only announced: its card is greyed, "coming soon", and links nowhere. */
  available: boolean;
}

const IMAGE_SIZE = { width: 960, height: 720 };

export const GENERATORS: readonly Generator[] = [
  { id: "baseplate", path: baseplatePath, image: { src: "/previews/baseplate.jpg", ...IMAGE_SIZE }, available: true },
  { id: "bin", path: binPath, image: { src: "/previews/bin.jpg", ...IMAGE_SIZE }, available: true },
];

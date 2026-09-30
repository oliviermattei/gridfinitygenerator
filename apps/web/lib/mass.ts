/**
 * Mass and cost of the filament a baseplate takes (#31, ADR 0019): the volume measured on its
 * final meshes times the density of the filament, a preference of this browser. It is a
 * calculation on a measured volume and a declared density, not an estimate of the slicer's:
 * the pieces are thin walls that it fills with solid perimeters, printed full. Pure: no React.
 */

/** Filaments offered, the cheapest and most common first; "other" takes a density typed by hand. */
export const FILAMENTS = ["pla", "petg", "abs", "asa", "tpu", "other"] as const;

export type Filament = (typeof FILAMENTS)[number];

/**
 * Density of each filament, in g/cm³, from the manufacturers' technical data sheets (ISO 1183,
 * sources in ADR 0019).
 */
export const FILAMENT_DENSITIES: Record<Exclude<Filament, "other">, number> = {
  pla: 1.24,
  petg: 1.27,
  abs: 1.04,
  asa: 1.07,
  tpu: 1.21,
};

/** Densities that can be typed for another filament, in g/cm³: from foamed filaments to metal-filled ones. */
export const DENSITY_RANGE = { min: 0.5, max: 5 } as const;

/** Prices of the filament that can be typed, in € per kg. */
export const PRICE_RANGE = { min: 0, max: 1000 } as const;

/** The filament of the prints, kept in this browser only, out of the share link. */
export interface FilamentPreference {
  filament: Filament;
  /** Density of the "other" filament, in g/cm³; the others have theirs. */
  density: number;
  /** Price of the filament, in € per kg; null (the default) shows no cost. */
  price: number | null;
}

export const DEFAULT_FILAMENT: FilamentPreference = { filament: "pla", density: FILAMENT_DENSITIES.pla, price: null };

export function isFilament(value: unknown): value is Filament {
  return FILAMENTS.includes(value as Filament);
}

/**
 * The filament preference stored in this browser, as far as it is valid: a filament of the
 * list, a density and a price in their ranges (brought into them), the defaults for the rest.
 * An empty or invalid price is no price.
 */
export function parseFilament(stored: unknown): FilamentPreference {
  const value = (stored && typeof stored === "object" ? stored : {}) as Partial<Record<keyof FilamentPreference, unknown>>;
  const within = (number: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, number));
  const finite = (number: unknown): number is number => typeof number === "number" && Number.isFinite(number);
  return {
    filament: isFilament(value.filament) ? value.filament : DEFAULT_FILAMENT.filament,
    density: finite(value.density) ? within(value.density, DENSITY_RANGE) : DEFAULT_FILAMENT.density,
    price: finite(value.price) ? within(value.price, PRICE_RANGE) : null,
  };
}

/** The density of the filament chosen, in g/cm³. */
export function densityOf({ filament, density }: FilamentPreference): number {
  return filament === "other" ? density : FILAMENT_DENSITIES[filament];
}

/**
 * Material of a baseplate, in mm³, measured on its final meshes: its pieces, and all its clips
 * (the engine's `stats.volume` and `stats.clipsVolume`).
 */
export interface Material {
  volume: number;
  clips: number;
}

/** Mass of a material, in grams, not rounded, and the cost of the filament, in €. */
export interface Mass {
  /** Pieces and clips together. */
  total: number;
  /** The clips, included in the total. */
  clips: number;
  /** The cost of the total, in €, not rounded; null without a price. */
  cost: number | null;
}

/** Grams of a volume in mm³ of a filament of `density` g/cm³. */
export function gramsOf(volume: number, density: number): number {
  return (volume / 1000) * density;
}

/** The mass of `material` in the filament of `preference`, and its cost when a price is given. */
export function massOf(material: Material, preference: FilamentPreference): Mass {
  const density = densityOf(preference);
  const total = gramsOf(material.volume + material.clips, density);
  return {
    total,
    clips: gramsOf(material.clips, density),
    cost: preference.price === null ? null : (total / 1000) * preference.price,
  };
}

/** The difference of two materials (a margin less the grid alone), in mm³. */
export function materialLess(material: Material, less: Material): Material {
  return { volume: material.volume - less.volume, clips: material.clips - less.clips };
}

/**
 * Grams shown, without their sign: rounded to the gram, "<1" for a mass that rounds to
 * nothing (the clips of a small baseplate), 0 only for none.
 */
export function roundGrams(grams: number): number | "<1" {
  const rounded = Math.round(Math.abs(grams));
  return rounded === 0 && grams !== 0 ? "<1" : rounded;
}

/** Grams shown, without their sign, in `format` (to the gram), or `belowOne` ("< 1") for a mass that rounds to nothing. */
export function gramsText(grams: number, format: Intl.NumberFormat, belowOne: string): string {
  const rounded = roundGrams(grams);
  return rounded === "<1" ? belowOne : format.format(rounded);
}

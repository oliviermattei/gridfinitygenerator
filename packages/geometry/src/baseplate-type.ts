// Types of baseplate (#25, ADR 0013): what each one changes in the baseplate of the settings.
import { clickbaseOf, type Clickbase } from "./clickbase";
import type { PocketProfile } from "./pocket-profile";
import { roundUpToLayer } from "./print";
import { skeletonOf, type Skeleton } from "./skeleton";

/**
 * Type of baseplate: the open grid (`normal`, by default), the grid on a solid floor
 * (`tray`), which nothing falls through, the open grid with its murets notched between the
 * crossings (`skeleton`, the least material, ADR 0014), or the open grid whose pocket walls
 * hold the bins with lamellas (`clickbase`, after CLICKbase Refined, ADR 0015).
 */
export type BaseplateType = "normal" | "tray" | "skeleton" | "clickbase";

/** The types of baseplate the engine builds, the default first. */
export const BASEPLATE_TYPES: readonly BaseplateType[] = ["normal", "tray", "skeleton", "clickbase"];

/**
 * What a type changes in a baseplate. Each type is one entry of `BASEPLATE_TYPE_VARIANTS`:
 * a new type adds its entry, and whatever it changes as a field here.
 */
export interface BaseplateTypeVariant {
  /** The pocket profile of the cells, from the profile of the settings, at a layer height. */
  profile(profile: PocketProfile, layerHeight: number): PocketProfile;
  /** The notches of the murets at a layer height (skeleton.ts), null for a type without. */
  skeleton(layerHeight: number): Skeleton | null;
  /** The lamellas of the pocket walls (clickbase.ts), null for a type without. */
  clickbase(cellSize: number, profile: PocketProfile, layerHeight: number): Clickbase | null;
}

/** Thickness of the floor of a tray before rounding up to the layer: 3 layers of 0.2 mm (spec v1.1). */
const TRAY_FLOOR_MM = 0.6;
/**
 * Gap between the floor of a tray and the bottom of the foot of a seated bin, before
 * rounding up to the layer: a bin seated on the slopes of the hybrid profile reaches the
 * bottom of the pocket exactly (ADR 0002), so the floor lies this much lower, for the bin to
 * stand on its slopes and not on the floor.
 */
const TRAY_GAP_MM = 0.2;

/** The floor of a tray, on whole numbers of layers. */
export interface TrayFloor {
  /** Thickness of the floor, under every pocket, in millimetres. */
  thickness: number;
  /** Gap between the floor and the bottom of the pocket profile, raised above it. */
  gap: number;
}

/** The floor of a tray at a layer height: 0.6 mm and a gap of 0.2 mm, each rounded up to the layer. */
export function trayFloorOf(layerHeight: number): TrayFloor {
  return { thickness: roundUpToLayer(TRAY_FLOOR_MM, layerHeight), gap: roundUpToLayer(TRAY_GAP_MM, layerHeight) };
}

/**
 * The pocket profile of a tray (ADR 0013): the profile raised by the floor and the gap, on a
 * floor under the pocket. From the floor up to the raised profile, the pocket wall is
 * vertical, at the inset of the foot of the profile; a first segment already vertical (the
 * 0.35 mm step of the hybrid profile) goes on down to the floor. A seated bin stands on the
 * slopes as in the open baseplate, the gap above the floor; the whole profile rises by a
 * whole number of layers.
 */
export function trayProfile(profile: PocketProfile, { thickness, gap }: TrayFloor): PocketProfile {
  const lift = thickness + gap;
  const at = (z: number) => Math.round(z * 1e6) / 1e6;
  const raised = profile.points.map(([z, inset]) => [at(z + lift), inset] as const);
  const [foot, next] = raised;
  if (!foot || !next) throw new Error("A pocket profile needs at least two points");
  const wall = next[1] === foot[1] ? raised.slice(1) : raised;
  return { height: at(profile.height + lift), topRadius: profile.topRadius, floor: thickness, points: [[thickness, foot[1]], ...wall] };
}

/** The variant of each type of baseplate (`BaseplateSettings.baseplateType`). */
export const BASEPLATE_TYPE_VARIANTS: Record<BaseplateType, BaseplateTypeVariant> = {
  normal: { profile: (profile) => profile, skeleton: () => null, clickbase: () => null },
  tray: {
    profile: (profile, layerHeight) => trayProfile(profile, trayFloorOf(layerHeight)),
    skeleton: () => null,
    clickbase: () => null,
  },
  // The slots of the clips lie against the corners, under the posts (ADR 0018).
  skeleton: { profile: (profile) => profile, skeleton: skeletonOf, clickbase: () => null },
  // The lamellas next to the slot of a clip start past it (clickbase.ts).
  clickbase: { profile: (profile) => profile, skeleton: () => null, clickbase: clickbaseOf },
};

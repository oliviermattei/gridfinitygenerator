// Types of baseplate (#25, ADR 0013): what each one changes in the baseplate of the settings.
import type { PocketProfile } from "./pocket-profile";
import { roundUpToLayer } from "./print";
import { skeletonOf, type Skeleton } from "./skeleton";

/**
 * Type of baseplate: the open grid (`normal`, by default), the grid on a solid floor
 * (`tray`), which nothing falls through, or the open grid with its murets notched between
 * the crossings (`skeleton`, the least material, ADR 0014). CLICKbase (#27) is planned: the
 * share link already reads its name (`ty`), and the settings bring it back to the default
 * until the engine builds it.
 */
export type BaseplateType = "normal" | "tray" | "skeleton";

/** The types of baseplate the engine builds, the default first. */
export const BASEPLATE_TYPES: readonly BaseplateType[] = ["normal", "tray", "skeleton"];

/**
 * What a type changes in a baseplate. Each type is one entry of `BASEPLATE_TYPE_VARIANTS`:
 * a new type adds its entry, and whatever it changes as a field here.
 */
export interface BaseplateTypeVariant {
  /** The pocket profile of the cells, from the profile of the settings, at a layer height. */
  profile(profile: PocketProfile, layerHeight: number): PocketProfile;
  /** Whether a baseplate of this type, cut for the build plate, takes clips (clips.ts). */
  clips: boolean;
  /** The notches of the murets at a layer height (skeleton.ts), null for a type without. */
  skeleton(layerHeight: number): Skeleton | null;
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

/** Whether a baseplate of a type takes clips when it is cut (none in a skeleton: ADR 0014). */
export function takesClips(type: BaseplateType): boolean {
  return BASEPLATE_TYPE_VARIANTS[type].clips;
}

/** The variant of each type of baseplate (`BaseplateSettings.baseplateType`). */
export const BASEPLATE_TYPE_VARIANTS: Record<BaseplateType, BaseplateTypeVariant> = {
  normal: { profile: (profile) => profile, clips: true, skeleton: () => null },
  tray: { profile: (profile, layerHeight) => trayProfile(profile, trayFloorOf(layerHeight)), clips: true, skeleton: () => null },
  // The middle of the murets, where the slots of the clips go, is notched away: no clips.
  skeleton: { profile: (profile) => profile, clips: false, skeleton: skeletonOf },
};

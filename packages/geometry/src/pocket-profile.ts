/**
 * Pocket profile as data (ADR 0002): the pocket wall of a cell, from the bottom of the
 * baseplate to its top, as [height, inset] points. The inset is measured from the cell
 * edge; the pocket corner radius at a given inset is `topRadius − inset`.
 */
export interface PocketProfile {
  /** Height of the pocket, which is also the height of the baseplate frame. */
  readonly height: number;
  /** Pocket corner radius at inset 0 (the Gridfinity 4 mm, concentric with the outline). */
  readonly topRadius: number;
  /** [z, inset] from bottom to top; the last point is the top flat of the muret. */
  readonly points: readonly (readonly [z: number, inset: number])[];
}

/**
 * Hybrid profile (ADR 0002), bottom to top: vertical 0.35, 45° 0.7, vertical 1.8, then 45°
 * up to the 0.4 mm flat. 4.60 mm high, radius 4 − 2.85 = 1.15 at the bottom.
 */
export const HYBRID_PROFILE: PocketProfile = {
  height: 4.6,
  topRadius: 4,
  points: [
    [0, 2.85],
    [0.35, 2.85],
    [1.05, 2.15],
    [2.85, 2.15],
    [4.6, 0.4],
  ],
};

/**
 * Flush profile, extrabold's (docs/research/gridfinity-baseplate.md, C.2), bottom to top:
 * 45° 0.7, vertical 1.8, then 45° up to the 0.4 mm flat, without the vertical step. 4.25 mm
 * high: a seated bin stands on the bottom of the drawer, with a little play (ADR 0002).
 */
export const FLUSH_PROFILE: PocketProfile = {
  height: 4.25,
  topRadius: 4,
  points: [
    [0, 2.85],
    [0.7, 2.15],
    [2.5, 2.15],
    [4.25, 0.4],
  ],
};

/**
 * Inset of the pocket wall at height `z`, from the cell edge: linear between the points of
 * the profile, the first segment carried on below its first point and the top flat above
 * its last one (as the pocket tool does).
 */
export function insetAt({ points }: PocketProfile, z: number): number {
  for (let k = 1; k < points.length; k++) {
    const [z0, d0] = points[k - 1] as readonly [number, number];
    const [z1, d1] = points[k] as readonly [number, number];
    if (z <= z1 || k === points.length - 1) {
      if (z >= z1) return d1;
      return d0 + ((d1 - d0) * (z - z0)) / (z1 - z0);
    }
  }
  throw new Error("A pocket profile needs at least two points");
}

/** Name of a pocket profile in the settings and in the share link (`pr`). */
export type PocketProfileName = "hybrid" | "flush";

export const POCKET_PROFILES: Record<PocketProfileName, PocketProfile> = {
  hybrid: HYBRID_PROFILE,
  flush: FLUSH_PROFILE,
};

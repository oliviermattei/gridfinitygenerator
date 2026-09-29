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

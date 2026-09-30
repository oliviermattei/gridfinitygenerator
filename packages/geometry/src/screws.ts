// Screw holes that fix the baseplate to the bottom of the drawer (#11).
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";
import { roundDownToLayer } from "./print";
import type { BaseplateSettings } from "./settings";
import { TOOL_OVERSHOOT_MM, circle, gridRect, loft, type GridFrame } from "./shapes";

/**
 * Countersunk screw holes of a baseplate, one on each inner intersection of the grid, as
 * extrabold lays them out (docs/research/gridfinity-baseplate.md, A.4): none on the border
 * of the grid nor in the margin, a quarter of the screws one per cell would take.
 *
 * Each hole is cut in the crossing of the murets, the only part of the frame that no bin
 * stands on (ADR 0006): a bin seated on the slopes of its pocket reaches the bottom of the
 * frame, so no material can be added under it. From the bottom up: the shank, the 90°
 * countersink the head bears on, then the bore the head goes down through. The seat of the
 * head, the top of the countersink, is the highest whole number of layers under the upper
 * 45° slope of the pocket, where bins are seated; the frame keeps its height.
 */
export interface ScrewHoles {
  /** Diameter of the shank hole: the screw shank plus the hole gap, in millimetres. */
  shankDiameter: number;
  /** Diameter of the countersink at the seat, and of the bore above it: the head plus the hole gap. */
  headDiameter: number;
  /** Height of the seat of the heads, on a whole number of layers. */
  seat: number;
}

/**
 * The screw holes the settings ask for, null without screws. The settings are brought into
 * their ranges already (`clampSettings`): the head is never narrower than the shank.
 */
export function screwHolesOf(settings: BaseplateSettings, profile: PocketProfile): ScrewHoles | null {
  if (!settings.screws) return null;
  return {
    shankDiameter: settings.screwShank + settings.holeGap,
    headDiameter: settings.screwHead + settings.holeGap,
    seat: roundDownToLayer(upperSlopeFoot(profile), settings.layerHeight),
  };
}

/** Height where the upper 45° slope of the pocket starts: the last segment of the profile. */
function upperSlopeFoot({ points }: PocketProfile): number {
  const foot = points[points.length - 2];
  if (!foot) throw new Error("A pocket profile needs an upper slope");
  return foot[0];
}

/**
 * Whether the intersection of grid lines (a, b) holds a screw: a from 0 (left edge of the
 * grid) to `columns`, b from 0 (front edge) to `rows`. Only the inner ones do, and none on a
 * line the baseplate is cut on for the build plate: a crossing cut in two or four holds no screw.
 */
export function hasScrew({ screws, columns, rows, cuts }: GridFrame, a: number, b: number): boolean {
  return (
    screws !== null &&
    a >= 1 &&
    a <= columns - 1 &&
    b >= 1 &&
    b <= rows - 1 &&
    !cuts.columns.includes(a) &&
    !cuts.rows.includes(b)
  );
}

/** Centre of every screw, in the coordinates of the outline, left to right then front to back. */
export function screwPositions(frame: GridFrame): [x: number, y: number][] {
  if (!frame.screws) return [];
  const [x0, y0] = gridRect(frame);
  const positions: [number, number][] = [];
  for (let a = 1; a < frame.columns; a++)
    for (let b = 1; b < frame.rows; b++)
      if (hasScrew(frame, a, b)) positions.push([x0 + a * frame.cellSize, y0 + b * frame.cellSize]);
  return positions;
}

/**
 * Solid removed for one screw, centred on the origin: a loft of circles, from below the
 * frame to above it. Its circles have a vertex on each axis, so that the planes between two
 * cells, which go through the screw axis, cut it on vertices (the seams of the cell bricks).
 */
export function screwTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { screws: ScrewHoles }): Manifold {
  const { screws: holes, profile, segmentsPerHole } = frame;
  const shank = holes.shankDiameter / 2;
  const head = holes.headDiameter / 2;
  // A 90° countersink widens by as much as it rises.
  const cone = holes.seat - (head - shank);
  const radiusAt = (z: number) => Math.min(head, Math.max(shank, shank + z - cone));
  const bottom = -TOOL_OVERSHOOT_MM;
  const levels = [bottom, cone, holes.seat, profile.height + TOOL_OVERSHOOT_MM].filter(
    (z, i, all) => i === 0 || (z > bottom && z > (all[i - 1] as number)),
  );
  const { positions, indices } = loft(levels.map((z) => ({ z, points: circle(radiusAt(z), segmentsPerHole) })));
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

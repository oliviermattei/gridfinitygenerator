// Magnet holes that hold the baseplate in a sheet-metal drawer (#24, ADR 0012).
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { Own } from "./manifold";
import { marginOf, wallWidth } from "./margin";
import { roundUpToLayer } from "./print";
import { hasScrew } from "./screws";
import type { BaseplateSettings } from "./settings";
import { TOOL_OVERSHOOT_MM, cellCentre, circle, insideOutline, loft, type GridFrame } from "./shapes";
import type { Lattice } from "./split";

/** Diameter of the magnet the holes take: the common 6 × 2 mm disc (spec v1.1). */
export const MAGNET_DIAMETER_MM = 6;
/** Thickness of the magnet. */
export const MAGNET_THICKNESS_MM = 2;
/**
 * Gap added to the thickness of the magnet before rounding up to the layer: the ceiling of
 * the hole is a bridge, which may sag a little, and the magnet must not stick out below.
 */
const DEPTH_GAP_MM = 0.2;

/**
 * Magnet holes of a baseplate, open underneath, one under each crossing of the murets that
 * the material holds (ADR 0012): the only part of the frame that no bin stands on (ADR
 * 0006), and wide enough for a 6 mm magnet. The standard position, 13 mm from the centre of
 * the cell, falls in the opening of the pocket of an open baseplate: it would take a base.
 *
 * Around a crossing, the nearest point of a pocket is the middle of its rounded corner, at
 * 4·√2 − (4 − inset) from the axis: 3.81 mm where the pocket is steepest (inset 2.15), so a
 * hole of 6.5 mm leaves 0.56 mm of wall on the diagonals, and never cuts into a pocket below
 * the upper slope, whatever the cell size (prototypes/magnets).
 */
export interface MagnetHoles {
  /** Diameter of the hole: the magnet plus the hole gap, in millimetres. */
  diameter: number;
  /** Depth of the hole from the bottom: the magnet plus a gap, on a whole number of layers. */
  depth: number;
}

/** The magnet holes of settings brought into their ranges: always, the same gap as the screw holes. */
export function magnetHolesOf(settings: BaseplateSettings): MagnetHoles {
  return {
    diameter: MAGNET_DIAMETER_MM + settings.holeGap,
    depth: roundUpToLayer(MAGNET_THICKNESS_MM + DEPTH_GAP_MM, settings.layerHeight),
  };
}

/**
 * Whether the crossing of grid lines (a, b) holds a magnet: a from the first line of the
 * lattice (left) to its last, b likewise from the front, in the indices of the grid.
 * - Every crossing inside the lattice does (the grid, and the whole cells of the margin),
 *   but where a screw sits, and on a line the baseplate is cut on (as the screws).
 * - A crossing on the edge of the lattice only does when the margin carries the murets on
 *   at their full height (truncated cells, extended grid), the hole stays inside the outline
 *   by a wall (and the bottom chamfer), and a wall off the parts of the margin left empty
 *   (between the supports of a minimal margin, between the heels of the extended grid, #29):
 *   the murets of the margin must surround it. A margin of walls 2 mm high (the frame of
 *   crossbars) is lower than the hole, and leaves half of it empty: no magnet there.
 */
export function hasMagnet(frame: GridFrame, lattice: Lattice, a: number, b: number): boolean {
  const { magnets, cuts } = frame;
  const [[a0, a1], [b0, b1]] = [lattice.columns, lattice.rows];
  if (!magnets || a < a0 || a > a1 || b < b0 || b > b1) return false;
  if (cuts.columns.includes(a) || cuts.rows.includes(b) || hasScrew(frame, a, b)) return false;
  if (a > a0 && a < a1 && b > b0 && b < b1) return true;
  const margin = marginOf(frame);
  if (!margin.carriesMurets) return false;
  const [x, y] = crossing(frame, a, b);
  const clear = magnets.diameter / 2 + wallWidth(frame);
  if (insideOutline(frame, x, y) < clear + frame.bottomChamfer - EPSILON_MM) return false;
  return (margin.emptyAreas?.(frame) ?? []).every(([x0, y0, x1, y1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) >= clear - EPSILON_MM);
}

/** Slack for the floating-point error of a distance compared with a hole and its wall. */
const EPSILON_MM = 1e-9;

/** Position of the crossing of grid lines (a, b), in the coordinates of the outline. */
function crossing(frame: GridFrame, a: number, b: number): [x: number, y: number] {
  const [cx, cy] = cellCentre(a, b, frame);
  return [cx - frame.cellSize / 2, cy - frame.cellSize / 2];
}

/** Centre of every magnet, in the coordinates of the outline, left to right then front to back. */
export function magnetPositions(frame: GridFrame, lattice: Lattice): [x: number, y: number][] {
  if (!frame.magnets) return [];
  const positions: [number, number][] = [];
  for (let a = lattice.columns[0]; a <= lattice.columns[1]; a++)
    for (let b = lattice.rows[0]; b <= lattice.rows[1]; b++) if (hasMagnet(frame, lattice, a, b)) positions.push(crossing(frame, a, b));
  return positions;
}

/**
 * Solid removed for one magnet, centred on the origin: a cylinder from below the frame up to
 * the depth of the hole. Its circle has a vertex on each axis, so that the planes between two
 * cells, which go through its axis, cut it on vertices (the seams of the cell bricks).
 */
export function magnetTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { magnets: MagnetHoles }): Manifold {
  const points = circle(frame.magnets.diameter / 2, frame.segmentsPerHole);
  const { positions, indices } = loft([
    { z: -TOOL_OVERSHOOT_MM, points },
    { z: frame.magnets.depth, points },
  ]);
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

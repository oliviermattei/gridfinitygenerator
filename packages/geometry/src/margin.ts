// Margin of the baseplate: the part between the grid and the outline.
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Margins } from "./layout";
import type { Own } from "./manifold";
import { insetAt } from "./pocket-profile";
import { roundUpToLayer, roundUpToLine } from "./print";
import { TOOL_OVERSHOOT_MM, gridRect, pocketTool, rect, roundedRect, type GridFrame } from "./shapes";

/** Part of the baseplate, seen from above, that a cut is limited to: [x0, y0, x1, y1]. */
export type CutWindow = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * Shape of the margin, one variant among those of the margin prototype (#3). Every
 * assembly extrudes the outline, less the variant's holes, to the full height, then removes
 * the pockets and the variant's solid cut: what is left over the margin is the margin.
 * Changing the variant changes neither the grid nor the interface of the engine.
 */
export interface MarginVariant {
  /** The cut of the margin of a baseplate; null when nothing is removed (no margin). */
  prepare(wasm: ManifoldToplevel, own: Own, frame: GridFrame): MarginCut | null;
  /**
   * Number of whole cells of the grid the margin carries on beyond each side of the grid,
   * before what is left of it: cells built exactly as the grid's inner cells, which the cell
   * bricks lay as such (ADR 0004). None when absent: a margin that does not carry the grid on.
   */
  wholeCells?(frame: GridFrame): Record<keyof Margins, number>;
}

/**
 * What a margin variant removes from the slab of the outline, in the baseplate's
 * coordinates: all of it, or only what lies in `window` (a cell brick takes its own
 * neighbourhood only); null when nothing lies there. Both stay outside the grid rectangle,
 * so they never meet a pocket of the grid, and never end on a plane between two cells (the
 * seams of the cell bricks, ADR 0004).
 */
export interface MarginCut {
  /** Holes through the whole height, seen from above: taken off the outline before it is extruded. */
  holes(window?: CutWindow): CrossSection | null;
  /** Solid removed from the extruded slab. */
  solid(window?: CutWindow): Manifold | null;
}

/** Height of the frame before rounding to the layer: 10 layers of 0.2 mm (#3). */
const FRAME_HEIGHT_MM = 2;
/** Width of its outer wall and crossbars before rounding to the line: 3 lines of 0.4 mm (#3). */
const FRAME_WALL_MM = 1.2;
/** Fewest lines in a wall or a crossbar: a single extrusion would print badly. */
const FRAME_MIN_LINES = 2;
/** A hole exactly one wall wide is still a hole: slack for the rounding of the offset. */
const SLIT_TOLERANCE_MM = 1e-3;

/**
 * Frame of crossbars (traverses), the provisional variant of #3, whose prototype calls it
 * "cadre à nervures": an outer wall that follows the outline, tied to the grid by a crossbar
 * on every grid line, in line with the murets. The wall on the grid side is the grid's own
 * edge muret. The frame is 2.00 mm high, rounded up to the layer; the wall and crossbars
 * are 1.2 mm wide, rounded up to a whole number of lines, never fewer than two. Crossbars on
 * the first and last grid lines lie within the grid's extent, so that each corner of the
 * margin is a closed box. A hole narrower than a wall is left full: a margin narrower than
 * two walls (the outer wall and a hole) has no hole. With a bottom chamfer, the outer wall
 * is thicker by the chamfer on its inside, so that its foot stays one wall wide.
 */
export const CROSSBAR_FRAME: MarginVariant = {
  prepare(wasm, own, frame) {
    const { margins, columns, rows, cellSize, width, depth, outerRadius, segmentsPerQuarter, profile } = frame;
    if (margins.left <= 0 && margins.right <= 0 && margins.back <= 0 && margins.front <= 0) return null;
    const height = roundUpToLayer(FRAME_HEIGHT_MM, frame.layerHeight);
    const wall = roundUpToLine(FRAME_WALL_MM, frame.lineWidth, FRAME_MIN_LINES);
    const [x0, y0, x1, y1] = gridRect(frame);
    const top = profile.height + TOOL_OVERSHOOT_MM;
    // Farther than any part of the baseplate; `keep` reaches beyond `bound` on its open sides.
    const far = width + depth;
    const section = (points: [number, number][]) => own(new wasm.CrossSection([points]));

    // Holes of the frame: inside the outer wall, outside the grid and the crossbars.
    const solid: CrossSection[] = [section(rect(x0, y0, x1, y1))];
    for (let i = 0; i <= columns; i++) {
      const [a, b] = band(x0 + i * cellSize, i, columns, wall);
      solid.push(section(rect(a, -far, b, far)));
    }
    for (let j = 0; j <= rows; j++) {
      const [a, b] = band(y0 + j * cellSize, j, rows, wall);
      solid.push(section(rect(-far, a, far, b)));
    }
    // The bottom chamfer cuts the outer wall at 45°: its inside moves in by the chamfer, so
    // that its foot stays one wall wide instead of hanging over a hole.
    const outerWall = wall + frame.bottomChamfer;
    const inside = section(roundedRect(width - 2 * outerWall, depth - 2 * outerWall, outerRadius - outerWall, segmentsPerQuarter));
    // A hole narrower than a wall (a margin narrower than two walls) would print as a slit:
    // it is left full. A hole is kept when something is left of it once shrunk by half a wall.
    const pieces = own(inside.subtract(own(wasm.CrossSection.union(solid))))
      .decompose()
      .map(own)
      .filter((piece) => !own(piece.offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty());
    const holes = own(wasm.CrossSection.compose(pieces));

    // Above the frame, everything outside the grid on the sides that have a margin.
    const keep = section(
      rect(
        margins.left > 0 ? x0 : -2 * far,
        margins.front > 0 ? y0 : -2 * far,
        margins.right > 0 ? x1 : 2 * far,
        margins.back > 0 ? y1 : 2 * far,
      ),
    );
    const above = height < profile.height ? own(section(rect(-far, -far, far, far)).subtract(keep)) : null;

    const clip = (area: CrossSection, window?: CutWindow) => {
      const clipped = window ? own(area.intersect(section(rect(...window)))) : area;
      return clipped.isEmpty() ? null : clipped;
    };
    return {
      holes: (window) => clip(holes, window),
      solid(window) {
        const area = above && clip(above, window);
        return area && own(own(wasm.Manifold.extrude(area, top - height)).translate([0, 0, height]));
      },
    };
  },
};

/**
 * Band of a crossbar along a grid line: centred on an inner line, and inside the grid's extent
 * on the first and last ones.
 */
function band(line: number, index: number, count: number, wall: number): [number, number] {
  if (index === 0) return [line, line + wall];
  if (index === count) return [line - wall, line];
  return [line - wall / 2, line + wall / 2];
}

/** Slack for the floating-point error of a width compared with a wall, or of a height with a layer. */
const EPSILON_MM = 1e-9;

/** A cell of the grid carried on into the margin, as the margin cuts it. */
interface TruncatedCell {
  /** Centre of the whole cell, as if the grid went on. */
  centre: [x: number, y: number];
  /** Height of the bottom of its hole, a whole number of layers; 0 for a hole open at the bottom. */
  floor: number;
  /**
   * How the outer wall cuts its pocket: along straight sides, the part of the cell that is
   * kept, around its centre ([x0, y0, x1, y1]); near a rounded corner, "corner"; null when
   * it does not cut it.
   */
  cut: CutWindow | "corner" | null;
  /** A point of its hole: its centre, brought inside the outer wall. */
  anchor: [x: number, y: number];
}

/**
 * Truncated cells (cellules tronquées), variant 1 of the margin prototype (#3), flush with
 * the grid (#19): the grid goes on into the margin, cell after cell on the same pitch, and
 * the outline cuts it. Each cell of the margin is an empty pocket of the grid's profile,
 * open at the bottom, cut by an outer wall that follows the whole outline. The murets of
 * the margin are the grid's murets carried on: same profile, same full height, same flat top.
 *
 * The outer wall is 1.2 mm wide, rounded up to a whole number of lines, never fewer than
 * two (the rule of #10); with a bottom chamfer, it is thicker by the chamfer on its inside,
 * so that its foot stays one wall wide.
 *
 * Narrow truncated cells: a hole of the margin is never narrower than a wall, at any height,
 * so that it never prints as a slit. The wall of a pocket slopes, so a truncated cell
 * narrows downwards; below the height where its hole would get narrower than a wall, it is
 * filled, and the hole gets a flat bottom (a floor) on a whole number of layers. A cell
 * whose hole would be less than a layer deep, or narrower than a wall even at the top, is
 * filled whole: its room goes to the outer wall, merged with the muret next to it. Near a
 * corner of the outline, the hole must also hold a disc one wall wide at the height of its floor.
 */
export const TRUNCATED_CELLS: MarginVariant = {
  prepare(wasm, own, frame) {
    const { margins, columns, rows, cellSize, segmentsPerQuarter, profile, layerHeight } = frame;
    if (margins.left <= 0 && margins.right <= 0 && margins.back <= 0 && margins.front <= 0) return null;
    const { wall, hx, hy, innerRadius, topInset } = outerWallOf(frame);
    // The inside of the outer wall, to which the pockets of the margin are cut.
    const inside = own(new wasm.CrossSection([roundedRect(2 * hx, 2 * hy, innerRadius, segmentsPerQuarter)]));
    const [x0, y0] = gridRect(frame);

    // Width of the hole of a cell starting at `start` along an axis, at a given inset, between the walls at ±`half`.
    const along = (start: number, inset: number, half: number) =>
      Math.min(start + cellSize - inset, half) - Math.max(start + inset, -half);
    const inCorner = (x: number, y: number) => Math.abs(x) > hx - innerRadius && Math.abs(y) > hy - innerRadius;

    const cells: TruncatedCell[] = [];
    const [firstColumn, endColumn] = [-Math.ceil(margins.left / cellSize), columns + Math.ceil(margins.right / cellSize)];
    const [firstRow, endRow] = [-Math.ceil(margins.front / cellSize), rows + Math.ceil(margins.back / cellSize)];
    for (let i = firstColumn; i < endColumn; i++)
      for (let j = firstRow; j < endRow; j++) {
        if (i >= 0 && i < columns && j >= 0 && j < rows) continue;
        const [left, bottom] = [x0 + i * cellSize, y0 + j * cellSize];
        const holeWidth = (inset: number) => Math.min(along(left, inset, hx), along(bottom, inset, hy));
        // Widest at the top: a cell narrower than a wall there is filled whole.
        if (holeWidth(topInset) < wall - EPSILON_MM) continue;
        const centre: [number, number] = [left + cellSize / 2, bottom + cellSize / 2];
        // The pocket at the top, and whether it reaches a corner of the inside, rounded or
        // sharp: there, its own rounded corner, or the rounded corner of the inside, narrows
        // what is left of it on both axes.
        const xs = [left + topInset, left + cellSize - topInset] as const;
        const ys = [bottom + topInset, bottom + cellSize - topInset] as const;
        const nearCorner = xs.some((x) => ys.some((y) => inCorner(x, y)));
        const straight = xs[0] < -hx || xs[1] > hx || ys[0] < -hy || ys[1] > hy;
        const wideEnough = (z: number) => {
          const inset = insetAt(profile, z);
          if (holeWidth(inset) < wall - EPSILON_MM) return false;
          if (!nearCorner) return true;
          const side = cellSize - 2 * inset;
          const opening = own(own(new wasm.CrossSection([roundedRect(side, side, profile.topRadius - inset, segmentsPerQuarter)])).translate(centre));
          return !own(own(opening.intersect(inside)).offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty();
        };
        const floor = floorOf(profile.height, layerHeight, wideEnough);
        if (floor === null) continue;
        // Beyond the cell, the kept part reaches past it, so that the cut never lies on its sides.
        const reach = cellSize / 2 + TOOL_OVERSHOOT_MM;
        const kept = (at: number, half: number): [number, number] => [Math.max(-reach, -half - at), Math.min(reach, half - at)];
        const [[kx0, kx1], [ky0, ky1]] = [kept(centre[0], hx), kept(centre[1], hy)];
        const cut = nearCorner ? "corner" : straight || floor > 0 ? ([kx0, ky0, kx1, ky1] as const) : null;
        cells.push({ centre, floor, cut, anchor: [clamp(centre[0], hx), clamp(centre[1], hy)] });
      }

    const pocket = pocketTool(wasm, own, frame);
    const o = TOOL_OVERSHOOT_MM;
    // The inside of the outer wall, from a floor (from below the frame without one) to above the frame.
    const clips = new Map<number, Manifold>();
    const clipFrom = (floor: number) => {
      const bottom = floor > 0 ? floor : -2 * o;
      const clip = clips.get(floor) ?? own(own(wasm.Manifold.extrude(inside, profile.height + 2 * o - bottom)).translate([0, 0, bottom]));
      clips.set(floor, clip);
      return clip;
    };
    // The cells cut along straight sides repeat along the outline: their tool is cut once per
    // shape, around the origin, and copied.
    const shapes = new Map<string, Manifold>();
    const toolOf = ({ centre, floor, cut }: TruncatedCell): Manifold => {
      if (cut === null) return own(pocket.translate([...centre, 0]));
      if (cut === "corner") return own(own(pocket.translate([...centre, 0])).intersect(clipFrom(floor)));
      const key = [...cut, floor].map((value) => value.toFixed(6)).join(",");
      let shape = shapes.get(key);
      if (!shape) {
        const [x0, y0, x1, y1] = cut;
        const bottom = floor > 0 ? floor : -2 * o;
        const box = own(own(wasm.Manifold.cube([x1 - x0, y1 - y0, profile.height + 2 * o - bottom])).translate([x0, y0, bottom]));
        shape = own(pocket.intersect(box));
        shapes.set(key, shape);
      }
      return own(shape.translate([...centre, 0]));
    };
    return {
      holes: () => null,
      solid(window) {
        // A brick takes the cells of the margin whose hole it holds: a truncated cell lies within
        // the brick of its row or column, whatever its centre, beyond the outline.
        const inWindow = ({ anchor: [x, y] }: TruncatedCell) =>
          !window || (window[0] < x && x < window[2] && window[1] < y && y < window[3]);
        // Each tool stays within its own cell: they never overlap, and compose.
        const tools = cells.filter(inWindow).map(toolOf);
        return tools.length === 0 ? null : own(wasm.Manifold.compose(tools));
      },
    };
  },

  wholeCells(frame) {
    const { margins, cellSize } = frame;
    const { outerWall, innerRadius, topInset } = outerWallOf(frame);
    // A cell of the margin is whole when its pocket stays clear of the outer wall and of its
    // rounded corners, whatever its row or column.
    const whole = (margin: number) =>
      margin > 0 ? Math.max(0, Math.floor((margin - outerWall - innerRadius + topInset) / cellSize + EPSILON_MM)) : 0;
    return { left: whole(margins.left), right: whole(margins.right), back: whole(margins.back), front: whole(margins.front) };
  },
};

/**
 * The outer wall of the truncated cells: its width, its width at the top with the chamfer,
 * the half sides and the corner radius of its inside, and the inset of the pocket at the top.
 */
function outerWallOf(frame: GridFrame) {
  const wall = roundUpToLine(FRAME_WALL_MM, frame.lineWidth, FRAME_MIN_LINES);
  const outerWall = wall + frame.bottomChamfer;
  return {
    wall,
    outerWall,
    hx: frame.width / 2 - outerWall,
    hy: frame.depth / 2 - outerWall,
    innerRadius: Math.max(0, frame.outerRadius - outerWall),
    topInset: Math.min(...frame.profile.points.map(([, inset]) => inset)),
  };
}

/** `value` brought into [−half, half]. */
function clamp(value: number, half: number): number {
  return Math.min(half, Math.max(-half, value));
}

/**
 * Lowest height, on a whole number of layers, from which the hole of a truncated cell is
 * wide enough up to the top (it only widens upwards); 0 for a hole open at the bottom, null
 * when no hole at least a layer deep is wide enough.
 */
function floorOf(height: number, layerHeight: number, wideEnough: (z: number) => boolean): number | null {
  for (let layers = 0; ; layers++) {
    const z = Math.round(layers * layerHeight * 1e6) / 1e6;
    if (z > height - layerHeight + EPSILON_MM) return null;
    if (wideEnough(z)) return z;
  }
}

/**
 * The margin built today: truncated cells, flush with the grid (#19). The frame of
 * crossbars, the provisional variant of #3, stays in the code, no longer exposed.
 */
export const MARGIN: MarginVariant = TRUNCATED_CELLS;

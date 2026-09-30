// Margin of the baseplate: the part between the grid and the outline.
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Margins } from "./layout";
import type { Own } from "./manifold";
import { insetAt } from "./pocket-profile";
import { roundUpToLayer, roundUpToLine } from "./print";
import type { MarginShape } from "./settings";
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

/** Length of a leg of a bracket along the outline, past the grid line of its crossbar (#3, variant 2). */
const BRACKET_LEG_MM = 10;
/** A side of the grid longer than this many cells gets intermediate T brackets (#3, variant 2). */
const BRACKET_SPAN_CELLS = 4;

/**
 * What a margin of walls 2.00 mm high holds besides the grid: crossbars on some grid lines,
 * and the outer wall along the whole outline, or only within some zones.
 */
interface WallLayout {
  /** Grid lines across X (0 to `columns`) and across Y (0 to `rows`) that carry a crossbar. */
  columns: readonly number[];
  rows: readonly number[];
  /**
   * Where the outer wall stands, as rectangles of the baseplate seen from above ([x0, y0, x1,
   * y1], reaching past the outline): the wall is what of the outline's band lies in them.
   * Null for a wall along the whole outline.
   */
  zones: readonly CutWindow[] | null;
}

/**
 * A margin of walls, the variants 2 and 3 of the margin prototype (#3): an outer wall and
 * crossbars, 2.00 mm high, rounded up to the layer; the wall and crossbars are 1.2 mm wide,
 * rounded up to a whole number of lines, never fewer than two. A crossbar goes along a grid
 * line, in line with the murets, from the grid to the outer wall; the wall on the grid side
 * is the grid's own edge muret. Crossbars on the first and last grid lines lie within the
 * grid's extent, so that each corner of the margin is a closed box; a crossbar on a line the
 * baseplate is cut on (split.ts) is doubled, one on each side of the cut, so that each piece
 * keeps a whole one. A hole narrower than a wall is left full: a margin narrower than two
 * walls (the outer wall and a hole) has no hole. With a bottom chamfer, the outer wall is
 * thicker by the chamfer on its inside, so that its foot stays one wall wide.
 */
function wallMargin(layoutOf: (frame: GridFrame) => WallLayout): MarginVariant {
  return {
    prepare(wasm, own, frame) {
      const { margins, cellSize, width, depth, outerRadius, segmentsPerQuarter, profile } = frame;
      if (margins.left <= 0 && margins.right <= 0 && margins.back <= 0 && margins.front <= 0) return null;
      const height = roundUpToLayer(FRAME_HEIGHT_MM, frame.layerHeight);
      const wall = roundUpToLine(FRAME_WALL_MM, frame.lineWidth, FRAME_MIN_LINES);
      const [x0, y0, x1, y1] = gridRect(frame);
      const top = profile.height + TOOL_OVERSHOOT_MM;
      // Farther than any part of the baseplate; `keep` reaches beyond `bound` on its open sides.
      const far = width + depth;
      const section = (points: [number, number][]) => own(new wasm.CrossSection([points]));
      const layout = layoutOf(frame);

      // Holes of the margin: inside the outer wall, outside the grid and the crossbars.
      const solid: CrossSection[] = [section(rect(x0, y0, x1, y1))];
      const cut = { columns: new Set(frame.cuts.columns), rows: new Set(frame.cuts.rows) };
      for (const i of layout.columns) {
        const [a, b] = band(x0 + i * cellSize, i, frame.columns, wall, cut.columns.has(i));
        solid.push(section(rect(a, -far, b, far)));
      }
      for (const j of layout.rows) {
        const [a, b] = band(y0 + j * cellSize, j, frame.rows, wall, cut.rows.has(j));
        solid.push(section(rect(-far, a, far, b)));
      }
      // The bottom chamfer cuts the outer wall at 45°: its inside moves in by the chamfer, so
      // that its foot stays one wall wide instead of hanging over a hole.
      const outerWall = wall + frame.bottomChamfer;
      const inside = section(roundedRect(width - 2 * outerWall, depth - 2 * outerWall, outerRadius - outerWall, segmentsPerQuarter));
      // Without a wall along the whole outline, the holes open onto the outline between the
      // zones of the wall: they reach past it, so that the outline never lies on their edge.
      let open = inside;
      let outline: CrossSection | null = null;
      if (layout.zones) {
        const o = TOOL_OVERSHOOT_MM;
        open = section(rect(-width / 2 - o, -depth / 2 - o, width / 2 + o, depth / 2 + o));
        const zones = own(wasm.CrossSection.union(layout.zones.map((zone) => section(rect(...zone)))));
        solid.push(own(own(open.subtract(inside)).intersect(zones)));
        outline = section(roundedRect(width, depth, outerRadius, segmentsPerQuarter));
      }
      // A hole narrower than a wall (a margin narrower than two walls) would print as a slit:
      // it is left full. A hole is kept when something is left of it, within the outline, once
      // shrunk by half a wall.
      const pieces = own(open.subtract(own(wasm.CrossSection.union(solid))))
        .decompose()
        .map(own)
        .filter((piece) => {
          const within = outline ? own(piece.intersect(outline)) : piece;
          return !own(within.offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty();
        });
      const holes = own(wasm.CrossSection.compose(pieces));

      // Above the walls, everything outside the grid on the sides that have a margin, but for
      // the holes, where nothing is left to cut: the cut never has a face on the side of a hole
      // (the grid's edge along a hole between brackets), whose vertices would then differ
      // between two neighbouring bricks.
      const keep = section(
        rect(
          margins.left > 0 ? x0 : -2 * far,
          margins.front > 0 ? y0 : -2 * far,
          margins.right > 0 ? x1 : 2 * far,
          margins.back > 0 ? y1 : 2 * far,
        ),
      );
      const above = height < profile.height ? own(own(section(rect(-far, -far, far, far)).subtract(keep)).subtract(holes)) : null;

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
}

/**
 * Band of a crossbar along a grid line: centred on an inner line, and inside the grid's extent
 * on the first and last ones; on a cut, one wall on each side of it.
 */
function band(line: number, index: number, count: number, wall: number, cut: boolean): [number, number] {
  if (index === 0) return [line, line + wall];
  if (index === count) return [line - wall, line];
  if (cut) return [line - wall, line + wall];
  return [line - wall / 2, line + wall / 2];
}

/** Every grid line from 0 to `count`. */
const allLines = (count: number) => Array.from({ length: count + 1 }, (_, line) => line);

/**
 * Frame of crossbars (cadre à traverses), variant 3 of the margin prototype (#3), whose
 * prototype calls it "cadre à nervures", the default margin, the cheapest to print that holds
 * along the whole outline (ADR 0006-marge, ADR 0011): an outer wall along the whole outline,
 * tied to the grid by a crossbar on every grid line.
 */
export const CROSSBAR_FRAME: MarginVariant = wallMargin(({ columns, rows }) => ({
  columns: allLines(columns),
  rows: allLines(rows),
  zones: null,
}));

/**
 * Corner brackets only (équerres de coin), variant 2 of the margin prototype (#3, ADR 0011):
 * at each corner of the baseplate, an L of outer wall whose legs reach 10 mm past the grid
 * lines, tied to the grid by the crossbars on the first and last grid lines; at a corner
 * between two margins, the bracket closes a box. A side of the grid longer than 4 cells
 * gets intermediate T brackets, spread over its grid lines so that no span is longer than 4
 * cells: a crossbar, and the outer wall 10 mm on each side of it. The rest of the margin is
 * empty, open onto the drawer. A T on a cut is doubled like its crossbar: each piece gets an
 * L. A piece along the outline between the brackets has none, and is held by its clips.
 */
export const CORNER_BRACKETS: MarginVariant = wallMargin((frame) => {
  const { columns, rows, cellSize, width, depth } = frame;
  const [x0, y0, x1, y1] = gridRect(frame);
  const far = width + depth;
  const leg = BRACKET_LEG_MM;
  const [middleColumns, middleRows] = [middleLines(columns), middleLines(rows)];
  const zones: CutWindow[] = [
    [-far, -far, x0 + leg, y0 + leg],
    [x1 - leg, -far, far, y0 + leg],
    [-far, y1 - leg, x0 + leg, far],
    [x1 - leg, y1 - leg, far, far],
    ...middleColumns.map((i): CutWindow => [x0 + i * cellSize - leg, -far, x0 + i * cellSize + leg, far]),
    ...middleRows.map((j): CutWindow => [-far, y0 + j * cellSize - leg, far, y0 + j * cellSize + leg]),
  ];
  return { columns: [0, ...middleColumns, columns], rows: [0, ...middleRows, rows], zones };
});

/**
 * Grid lines of the intermediate brackets along a side of `count` cells: as few as leave no
 * span longer than 4 cells, spread evenly (the margin prototype, #3).
 */
function middleLines(count: number): number[] {
  const brackets = Math.max(0, Math.ceil(count / BRACKET_SPAN_CELLS) - 1);
  return Array.from({ length: brackets }, (_, m) => Math.round((count * (m + 1)) / (brackets + 1)));
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

/** The variant of each shape of the margin (`BaseplateSettings.marginShape`, ADR 0011). */
export const MARGIN_VARIANTS: Record<MarginShape, MarginVariant> = {
  frame: CROSSBAR_FRAME,
  cells: TRUNCATED_CELLS,
  brackets: CORNER_BRACKETS,
};

/** The variant that builds the margin of a frame. */
export function marginOf(frame: GridFrame): MarginVariant {
  return MARGIN_VARIANTS[frame.marginShape];
}

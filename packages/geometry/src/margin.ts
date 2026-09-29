// Margin of the baseplate: the part between the grid and the outline.
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Own } from "./manifold";
import { roundUpToLayer, roundUpToLine } from "./print";
import { TOOL_OVERSHOOT_MM, gridRect, rect, roundedRect, type GridFrame } from "./shapes";

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
}

/**
 * What a margin variant removes from the slab of the outline, in the baseplate's
 * coordinates: all of it, or only what lies in `window` (a cell brick takes its own
 * neighbourhood only); null when nothing lies there. Both stay outside the grid rectangle,
 * so they never meet a pocket, and never end on a plane between two cells (the seams of
 * the cell bricks, ADR 0004).
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
 * two walls (the outer wall and a hole) has no hole.
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
    const inside = section(roundedRect(width - 2 * wall, depth - 2 * wall, outerRadius - wall, segmentsPerQuarter));
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

/** The margin built today: the provisional variant of #3, until its print test (#16). */
export const MARGIN: MarginVariant = CROSSBAR_FRAME;

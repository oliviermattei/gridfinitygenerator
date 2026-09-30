// Shapes shared by the assembly strategies: outlines, the pocket tool and mesh helpers.
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import type { Clickbase } from "./clickbase";
import type { ClipLayout } from "./clips";
import type { Margins } from "./layout";
import type { MarginShape } from "./settings";
import type { Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";
import type { MagnetHoles } from "./magnets";
import type { ScrewHoles } from "./screws";
import type { Skeleton } from "./skeleton";

/**
 * What an assembly strategy needs to build a baseplate: its grid, its margins and its
 * outline. The outline is centred on the origin; the grid sits in it, shifted by the margins.
 */
export interface GridFrame {
  columns: number;
  rows: number;
  cellSize: number;
  /**
   * Pocket profile of the cells, as the type of baseplate makes it (baseplate-type.ts): the
   * frame is as high as it, and its floor, if any, is under every pocket.
   */
  profile: PocketProfile;
  /**
   * Cells cut to a lower profile than `profile` (the test kit): each one is lowered to the
   * height of its own profile, down to the line between it and its neighbours. Only the
   * boolean assembly builds them; empty for a baseplate.
   */
  lowerCells: readonly LowerCell[];
  margins: Margins;
  /**
   * Shape of the margin (margin.ts): which variant builds it; `"none"` for the grid alone, its
   * layout and cut unchanged (`GenerateOptions.margin`), which the surplus of a margin is
   * measured from.
   */
  marginShape: MarginShape | "none";
  /** Whether the margin is reduced to its supports (`BaseplateSettings.minimalMargin`). */
  minimalMargin: boolean;
  /** Size of the outline, grid and margins included. */
  width: number;
  depth: number;
  /** Radius of the rounded outer corners, already limited to the outline. */
  outerRadius: number;
  /** 45° chamfer along the bottom of the outline, in millimetres; 0 for none. */
  bottomChamfer: number;
  segmentsPerQuarter: number;
  /** Segments of the circle of a hole (spec v1: 16 in preview, 64 in final), a multiple of 4. */
  segmentsPerHole: number;
  /** Countersunk screw holes on the inner intersections of the grid, null without screws. */
  screws: ScrewHoles | null;
  /**
   * Magnet holes under the crossings of the murets the material holds (magnets.ts), where no
   * screw sits; null without them (the test kit, the benches).
   */
  magnets: MagnetHoles | null;
  /**
   * Grid lines the baseplate is cut on for the build plate (`SplitPlan`), across X and
   * across Y: no screw nor magnet sits on an intersection they cut. Empty without a cut.
   */
  cuts: { columns: readonly number[]; rows: readonly number[] };
  /** Clips astride the cuts, whose slots the pieces carry (clips.ts); null without them. */
  clips: ClipLayout | null;
  /**
   * The notches of a skeleton baseplate between the crossings of the murets (skeleton.ts,
   * the type of baseplate), null for every other type.
   */
  skeleton: Skeleton | null;
  /**
   * The lamellas of a CLICKbase baseplate in the pocket walls of the cells of the grid
   * (clickbase.ts, the type of baseplate), null for every other type.
   */
  clickbase: Clickbase | null;
  /** Print settings the thicknesses and widths chosen by the generator follow. */
  layerHeight: number;
  lineWidth: number;
}

/** A cell (i along X, j along Y) cut to a lower pocket profile than the rest of the grid. */
export interface LowerCell {
  i: number;
  j: number;
  profile: PocketProfile;
}

/** Overshoot of cutting tools below and above the frame, to avoid coplanar faces. */
export const TOOL_OVERSHOOT_MM = 1;

/** Grid rectangle in the outline: [x0, y0, x1, y1]. */
export function gridRect({ width, depth, margins }: GridFrame): [x0: number, y0: number, x1: number, y1: number] {
  return [-width / 2 + margins.left, -depth / 2 + margins.front, width / 2 - margins.right, depth / 2 - margins.back];
}

/** Centre of cell (i, j) of the grid (i along X, j along Y). */
export function cellCentre(i: number, j: number, frame: GridFrame): [x: number, y: number] {
  const { cellSize } = frame;
  const [x0, y0] = gridRect(frame);
  return [x0 + (i + 0.5) * cellSize, y0 + (j + 0.5) * cellSize];
}

/** Distance from (x, y), in the coordinates of the outline, to the rounded outline, positive inside it. */
export function insideOutline({ width, depth, outerRadius: radius }: Pick<GridFrame, "width" | "depth" | "outerRadius">, x: number, y: number): number {
  const [qx, qy] = [Math.abs(x) - (width / 2 - radius), Math.abs(y) - (depth / 2 - radius)];
  return radius - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0);
}

/** Counter-clockwise rectangle from its corners. */
export function rect(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/**
 * Outline of a cross-section around (cx, cy), to a tenth of a micrometre, whatever the order of
 * its polygons and of their points: the same for two shapes that repeat, to share their work.
 */
export function sectionKey(section: CrossSection, cx: number, cy: number): string {
  const text = (value: number) => (Math.round(value * 1e4) / 1e4 + 0).toFixed(4);
  return section
    .toPolygons()
    .map((polygon) => {
      const points = polygon.map(([x, y]) => `${text(x - cx)} ${text(y - cy)}`);
      const first = points.indexOf(points.reduce((min, point) => (point < min ? point : min)));
      return [...points.slice(first), ...points.slice(0, first)].join(",");
    })
    .sort()
    .join("|");
}

/** Throws unless manifold reports the solid as closed and valid. */
export function assertNoError(status: string): void {
  if (status !== "NoError") throw new Error(`Baseplate mesh is not manifold: ${status}`);
}

/**
 * Counter-clockwise rounded rectangle centred on the origin, `segmentsPerQuarter` segments
 * per corner; a plain rectangle without radius.
 */
export function roundedRect(width: number, depth: number, radius: number, segmentsPerQuarter: number): [number, number][] {
  if (radius <= 0) return rect(-width / 2, -depth / 2, width / 2, depth / 2);
  const hx = width / 2 - radius;
  const hy = depth / 2 - radius;
  const centres: [number, number][] = [
    [hx, hy],
    [-hx, hy],
    [-hx, -hy],
    [hx, -hy],
  ];
  const points: [number, number][] = [];
  centres.forEach(([cx, cy], corner) => {
    for (let s = 0; s <= segmentsPerQuarter; s++) {
      const angle = ((corner + s / segmentsPerQuarter) * Math.PI) / 2;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  });
  return points;
}

/** Vertices closer than this to a level or to the outline are on it (they are built on them exactly). */
const ON_SHAPE_MM = 1e-4;

/**
 * Corner radius of the foot of the chamfer, as a share of the outer corner radius, when the
 * chamfer is wider than that radius: the foot of such a corner would be sharp, which would
 * fold its arc onto a single point; a small radius keeps its vertices apart.
 */
const SHARP_FOOT_RADIUS_SHARE = 0.1;

/**
 * Prism of an area of the baseplate seen from above, as high as the frame, with the bottom
 * chamfer of the outline: a 45° slope that sets the foot of the outline in by
 * `bottomChamfer` and reaches the outline at that height. `at` is where the origin of the
 * area lies in the baseplate (a cell brick is built around its cell centre).
 *
 * The chamfer is not a boolean. The prism gets a ring of vertices halfway up its walls,
 * lowered to the top of the chamfer, and each vertex of its foot on the outline moves in
 * (`footOfChamfer`): the sides by the chamfer, the corners onto smaller arcs. A point of the outline moves the same way whatever brick it
 * belongs to, so the seams of the cell bricks still weld (ADR 0004); nothing else moves,
 * since the margin keeps its holes farther than the chamfer from the outline.
 */
export function slabOf(
  wasm: ManifoldToplevel,
  own: Own,
  area: CrossSection,
  frame: GridFrame,
  at: readonly [x: number, y: number] = [0, 0],
): Manifold {
  const { profile, bottomChamfer } = frame;
  if (bottomChamfer <= 0) return own(wasm.Manifold.extrude(area, profile.height));
  const middle = profile.height / 2;
  const foot = footOfChamfer(frame);
  const prism = own(wasm.Manifold.extrude(area, profile.height, 1));
  return own(
    prism.warp((vertex) => {
      if (Math.abs(vertex[2] - middle) < ON_SHAPE_MM) {
        vertex[2] = bottomChamfer;
      } else if (Math.abs(vertex[2]) < ON_SHAPE_MM) {
        const moved = foot(vertex[0] + at[0], vertex[1] + at[1]);
        if (moved) [vertex[0], vertex[1]] = [moved[0] - at[0], moved[1] - at[1]];
      }
    }),
  );
}

/**
 * Where a point of the outline lies at the foot of the chamfer, null for a point off the
 * outline. The foot is the outline set in by the chamfer: its sides move in by the chamfer,
 * its corner arcs shrink by it around their centres. A corner sharper than the chamfer
 * (radius under it) has a foot of a tenth of its radius, a little inside the true sharp foot.
 */
function footOfChamfer({ width, depth, outerRadius: radius, bottomChamfer: chamfer }: GridFrame) {
  const [hx, hy] = [width / 2, depth / 2];
  // Centres of the corner arcs of the outline and of the foot, in the first quadrant.
  const [cx, cy] = [hx - radius, hy - radius];
  const footRadius = Math.max(radius - chamfer, radius * SHARP_FOOT_RADIUS_SHARE);
  const [fx, fy] = [hx - chamfer - footRadius, hy - chamfer - footRadius];
  return (x: number, y: number): [number, number] | null => {
    const [sx, sy] = [x < 0 ? -1 : 1, y < 0 ? -1 : 1];
    const [dx, dy] = [Math.abs(x) - cx, Math.abs(y) - cy];
    // On a corner arc, its ends included.
    if (radius > 0 && dx > -ON_SHAPE_MM && dy > -ON_SHAPE_MM) {
      const distance = Math.hypot(dx, dy);
      if (Math.abs(distance - radius) > ON_SHAPE_MM) return null;
      return [sx * (fx + (footRadius * dx) / distance), sy * (fy + (footRadius * dy) / distance)];
    }
    // On a side, or on both at a sharp corner.
    const onX = Math.abs(Math.abs(x) - hx) < ON_SHAPE_MM;
    const onY = Math.abs(Math.abs(y) - hy) < ON_SHAPE_MM;
    if (!onX && !onY) return null;
    return [onX ? sx * (hx - chamfer) : x, onY ? sy * (hy - chamfer) : y];
  };
}

/**
 * Solid removed for one cell, centred on the origin: a loft of the layers of its profile,
 * the frame's own by default. Below the frame, the first segment of the profile goes on
 * straight (a vertical step stays vertical, a slope widens), so that the bottom of the
 * frame cuts the tool across a face, not along a ring of its edges; above the frame, the
 * tool goes up vertically from the top flat. A profile with a floor (a tray) starts at its
 * floor, inside the frame: the floor is what the tool leaves under it. `grow` stretches the
 * tool past its left, right, front and back sides.
 */
export function pocketTool(
  wasm: ManifoldToplevel,
  own: Own,
  frame: GridFrame,
  profile = frame.profile,
  grow: readonly [left: number, right: number, front: number, back: number] = [0, 0, 0, 0],
): Manifold {
  const { cellSize, segmentsPerQuarter } = frame;
  // A pocket open on some sides (the extended grid, margin.ts) reaches past them by `grow`,
  // with the same levels: no parallel muret on those sides.
  const [left, right, front, back] = grow;
  const layers = pocketLevels(profile).map(([z, inset]) => ({
    z,
    points: roundedRect(cellSize - 2 * inset + left + right, cellSize - 2 * inset + front + back, profile.topRadius - inset, segmentsPerQuarter).map(
      ([x, y]): [number, number] => [x + (right - left) / 2, y + (back - front) / 2],
    ),
  }));
  const { positions, indices } = loft(layers);
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

/**
 * The levels of the pocket tool of a profile, [z, inset] from bottom to top: the points of
 * the profile, the first one carried on below the frame (or the floor of a tray), and the
 * top flat carried on above it.
 */
export function pocketLevels(profile: PocketProfile): (readonly [z: number, inset: number])[] {
  const [first, second] = profile.points;
  const last = profile.points[profile.points.length - 1];
  if (!first || !second || !last) throw new Error("A pocket profile needs at least two points");
  if (second[0] <= first[0]) throw new Error("A pocket profile rises from its first point to its second");
  const slope = (second[1] - first[1]) / (second[0] - first[0]);
  const bottom = profile.floor ? first : ([first[0] - TOOL_OVERSHOOT_MM, first[1] - slope * TOOL_OVERSHOOT_MM] as const);
  return [bottom, ...profile.points.slice(1), [last[0] + TOOL_OVERSHOOT_MM, last[1]] as const];
}

/**
 * Counter-clockwise circle centred on the origin, starting on the +X axis. With a multiple of
 * 4 segments, a vertex lies exactly on each axis (cos 90° is not exactly 0 in floating point).
 */
export function circle(radius: number, segments: number): [number, number][] {
  const exact = (value: number) => (Math.abs(value) < 1e-12 ? 0 : value);
  return Array.from({ length: segments }, (_, k) => {
    const angle = (2 * Math.PI * k) / segments;
    return [radius * exact(Math.cos(angle)), radius * exact(Math.sin(angle))] as [number, number];
  });
}

/** Closed mesh through horizontal layers with the same number of CCW points, bottom to top. */
export function loft(layers: { z: number; points: [number, number][] }[]): TriangleMesh {
  const n = layers[0]?.points.length ?? 0;
  const positions = new Float32Array(layers.length * n * 3);
  layers.forEach(({ z, points }, layer) =>
    points.forEach(([x, y], i) => positions.set([x, y, z], (layer * n + i) * 3)),
  );
  const indices: number[] = [];
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const a = layer * n;
    const b = a + n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(a + i, a + j, b + j, a + i, b + j, b + i);
    }
  }
  const top = (layers.length - 1) * n;
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i, top, top + i, top + i + 1);
  return { positions, indices: new Uint32Array(indices) };
}

/**
 * Copies a manifold out of the WASM heap as an indexed mesh (positions only), so that the
 * buffers outlive the arena. Throws when the solid is not a valid manifold.
 */
export function meshOf(solid: Manifold): TriangleMesh {
  assertNoError(solid.status());
  const { vertProperties, triVerts, numProp } = solid.getMesh();
  return { positions: positionsOnly(vertProperties, numProp), indices: triVerts };
}

function positionsOnly(properties: Float32Array, numProp: number): Float32Array {
  if (numProp === 3) return properties;
  const count = properties.length / numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) positions.set(properties.subarray(v * numProp, v * numProp + 3), v * 3);
  return positions;
}

// Skeleton baseplate (#26, ADR 0014): the murets notched between the crossings.
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { Label, LabelSide } from "./label";
import type { Own } from "./manifold";
import { roundUpToLayer } from "./print";
import { insetAt } from "./pocket-profile";
import { TOOL_OVERSHOOT_MM, cellCentre, loft, pocketLevels, pocketTool, roundedRect, type GridFrame } from "./shapes";
import type { Lattice } from "./split";

/**
 * Height of the low band a notched muret keeps, before rounding up to the layer: extrabold's
 * 0.35 mm (docs/research/types-de-baseplate.md), 2 layers of 0.2 mm once rounded.
 */
const BAND_MM = 0.35;

/**
 * A skeleton baseplate (ADR 0014): each muret between two crossings of the lattice is notched
 * down to a low band, and only a post around each crossing keeps the whole pocket profile.
 * At the top, the post reaches 5 mm along each muret from the axis of the crossing: the
 * rounded corner of the pocket (4 mm) and 1 mm of its side, at every height, the only part of
 * the pocket a bin is guided by. Below, it widens at 45° down to the band, so that it stands on
 * a broad foot, and keeps a thick wall around a magnet hole or a screw.
 *
 * Not notched: the murets on the edge of the lattice (a whole rim, which stiffens the edges
 * and holds the margin), and the side of a cell that holds the number of its piece (the
 * engraving would go through the band), on both of its halves.
 */
export interface Skeleton {
  /** Height of the band left between the posts, on a whole number of layers. */
  band: number;
}

/** The skeleton at a layer height: a band of 0.35 mm, rounded up to the layer. */
export function skeletonOf(layerHeight: number): Skeleton {
  return { band: roundUpToLayer(BAND_MM, layerHeight) };
}

/**
 * What a post keeps of the straight side of the pocket, at the top of the frame, beyond its
 * rounded corner (4 mm from the axis of its crossing): the flanks of its notches reach the ends
 * of the corner arcs above the frame, not on it, where they would pinch the mesh; and the bore
 * of the largest screw head (8 mm and a hole gap of 1 mm) keeps 0.5 mm of post around it.
 */
const POST_SIDE_MM = 1;

/** Slack for levels and points built on the same values. */
const EPSILON_MM = 1e-9;

/** Offsets of the neighbour across each side of a cell (0 +X, 1 +Y, 2 −X, 3 −Y). */
const SIDES: readonly (readonly [di: number, dj: number])[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/**
 * Bit set of the sides of cell (i, j) whose muret is notched (bit `1 << side`, sides as
 * `LabelSide`): the sides it shares with another cell of the lattice, but for the side that
 * holds a label, on either cell. None without a skeleton.
 */
export function notchedSides(frame: GridFrame, lattice: Lattice, labels: readonly Label[], i: number, j: number): number {
  if (!frame.skeleton) return 0;
  const [[i0, i1], [j0, j1]] = [lattice.columns, lattice.rows];
  return SIDES.reduce((bits, [di, dj], side) => {
    const [ni, nj] = [i + di, j + dj];
    if (ni < i0 || ni >= i1 || nj < j0 || nj >= j1) return bits;
    const labelled = labels.some(
      (label) =>
        (label.cell[0] === i && label.cell[1] === j && label.side === side) ||
        (label.cell[0] === ni && label.cell[1] === nj && label.side === (side + 2) % 4),
    );
    return labelled ? bits : bits | (1 << side);
  }, 0);
}

/**
 * Half the length of the notch of a muret at height `z`, along the muret, from the middle of
 * the side of a cell: the side less a post at each end. At the top of the frame, the post
 * reaches the rounded corner of the pocket and `POST_SIDE_MM` more from the axis of its
 * crossing, and 45° farther per millimetre down to the band. Above the frame, the flanks of
 * the notch go on at 45° up to the ends of the corner arcs, then straight up, so that the
 * notches of the four murets of a crossing never meet, and never turn on the top of the frame.
 * Not positive when the cell is too small to leave a notch.
 */
function notchLength({ cellSize, profile }: Pick<GridFrame, "cellSize" | "profile">, z: number): number {
  const straight = cellSize / 2 - profile.topRadius;
  return Math.min(straight, straight - POST_SIDE_MM - (profile.height - z));
}

/**
 * How far the post of a crossing reaches along each of its murets at height `z`, from the axis
 * of the crossing: 5 mm at the top of the frame, 45° farther per millimetre down (6.80 mm at
 * 2.80 mm in the hybrid profile). Where a clip's slot must end, under the post (clips.ts, ADR
 * 0018). Null when the cell is too small to leave a notch: the whole muret is a post.
 */
export function postReach(frame: Pick<GridFrame, "cellSize" | "profile"> & { skeleton: Skeleton }, z: number): number | null {
  if (notchLength(frame, frame.skeleton.band) <= 0) return null;
  return frame.cellSize / 2 - notchLength(frame, z);
}

/** Height where the flanks of a notch reach the ends of the corner arcs, above the frame, and turn straight up. */
const flankTop = ({ profile }: GridFrame) => profile.height + POST_SIDE_MM;

/** Points turned a number of quarter turns counter-clockwise about the origin (sides as `LabelSide`). */
function turn([x, y]: readonly [number, number], quarters: number): [number, number] {
  switch (quarters) {
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
    default:
      return [x, y];
  }
}

/**
 * Solid removed from a whole muret by its notch, around the centre of the cell on its `side`
 * (the boolean assembly): in the middle of the side, from the band up to above the frame, and
 * across the whole muret into the pockets on both sides of it. Null when the cell is too small
 * to leave a notch between its posts.
 */
export function notchTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { skeleton: Skeleton }, side: LabelSide): Manifold | null {
  const { cellSize, profile, skeleton } = frame;
  const half = cellSize / 2;
  if (notchLength(frame, skeleton.band) <= 0) return null;
  // Across the muret, into both pockets, past the widest part of the muret.
  const across = Math.max(...profile.points.map(([, inset]) => inset)) + TOOL_OVERSHOOT_MM;
  // Built for the +X side (the muret along Y), then turned.
  const layer = (z: number) => {
    const length = notchLength(frame, z);
    return {
      z,
      points: [
        [half - across, -length],
        [half + across, -length],
        [half + across, length],
        [half - across, length],
      ].map((point) => turn(point as [number, number], side)),
    };
  };
  const top = Math.max(flankTop(frame), profile.height + TOOL_OVERSHOOT_MM);
  const { positions, indices } = loft([layer(skeleton.band), ...(top > flankTop(frame) ? [layer(flankTop(frame))] : []), layer(top)]);
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

/**
 * The pocket tool of a cell of a skeleton (the cell bricks, ADR 0004), with the notch of each of
 * its `sides` (bits `1 << side`) up to the seam with the next cell, as a single mesh: no boolean.
 * From the band up, each level of the pocket gets two points on the wall of each notched side,
 * where its notch meets it, and the pocket wall between them opens onto a tab, the notch from
 * the wall to the seam: its floor, a flank on each side, its face on the seam and its top.
 * Across the band, the wall goes round the points where the tabs stand on their floors. The
 * tool ends above the frame where the flanks of the notches reach the ends of the corner arcs.
 *
 * The face of a tab on the seam is a single flat face, with points at the band and at the top
 * of the tool only: the two bricks of a muret notch it on the same points, and their faces on
 * the seam weld. A notch that went across the seam, or had points on the seam at every level of
 * the pocket, would leave points there that depend on how each brick triangulates, or
 * simplifies, its faces.
 */
export function notchedPocketTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { skeleton: Skeleton }, sides: number): Manifold {
  const { cellSize, profile, segmentsPerQuarter: q, skeleton } = frame;
  const { band } = skeleton;
  if (sides === 0 || notchLength(frame, band) <= 0) return pocketTool(wasm, own, frame);
  const half = cellSize / 2;
  const top = flankTop(frame);
  const levels = [...pocketLevels(profile).filter(([z]) => z < profile.height + EPSILON_MM), [top, insetAt(profile, top)] as const];
  const last = levels.length - 1;
  const notched = [0, 1, 2, 3].filter((side) => sides & (1 << side));

  const positions: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  // A face of the tool, left out when it closes up to a line (two of its points are one).
  const triangle = (a: number, b: number, c: number) => {
    if (a !== b && b !== c && c !== a) indices.push(a, b, c);
  };

  // The ring of each level, counter-clockwise, from the middle of the arc of the first corner
  // (never in line with a side, so that a fan from it closes a cap): the corner arcs and, from
  // the band up, the two points of each notched side. At the top of the tool, a notch is as long
  // as the straight side of the pocket: its points are the ends of the corner arcs, and the ring
  // gives them the same vertex.
  const middle = q >> 1;
  const rings = levels.map(([z, inset]) => {
    const notches = z > band - EPSILON_MM;
    const side = cellSize - 2 * inset;
    const corners = roundedRect(side, side, profile.topRadius - inset, q);
    const arc = (corner: number) => corners.slice(corner * (q + 1), (corner + 1) * (q + 1));
    const [wall, length] = [half - inset, notchLength(frame, Math.max(z, band))];
    const points: [number, number][] = [];
    const tabs = new Map<number, number>();
    const along = (turned: number) => {
      if (!notches || !(sides & (1 << turned))) return;
      tabs.set(turned, points.length);
      points.push(turn([wall, -length], turned), turn([wall, length], turned));
    };
    points.push(...arc(0).slice(middle));
    along(1);
    points.push(...arc(1));
    along(2);
    points.push(...arc(2));
    along(3);
    points.push(...arc(3));
    along(0);
    points.push(...arc(0).slice(0, middle));
    const ring: number[] = [];
    points.forEach(([x, y], k) => {
      const previous = points[k - 1];
      const same = previous && Math.abs(previous[0] - x) < EPSILON_MM && Math.abs(previous[1] - y) < EPSILON_MM;
      ring.push(same ? (ring[k - 1] as number) : vertex(x, y, z));
    });
    return { z, ring, tabs };
  });
  const ringAt = (level: number) => rings[level] as (typeof rings)[number];

  // The points where each tab stands on its floor, on the pocket wall at the band: those of a
  // level at the band, or points of their own between two levels.
  const bandLevel = levels.findIndex(([z]) => Math.abs(z - band) < EPSILON_MM);
  const floorLength = notchLength(frame, band);
  const wallAtBand = half - insetAt(profile, band);
  const floors = new Map(
    notched.map((side) => {
      if (bandLevel >= 0) {
        const { ring, tabs } = ringAt(bandLevel);
        const at = tabs.get(side) as number;
        return [side, [ring[at] as number, ring[at + 1] as number]] as const;
      }
      const [minus, plus] = [turn([wallAtBand, -floorLength], side), turn([wallAtBand, floorLength], side)];
      return [side, [vertex(...minus, band), vertex(...plus, band)]] as const;
    }),
  );

  // The pocket wall between consecutive levels, as `loft`. From the band up, the wall opens onto
  // the tabs. Across the band, a ring without the points of the tabs joins one with them: along
  // a notched side, the wall goes round the points where its tab stands.
  for (let level = 0; level < last; level++) {
    const { z: za, ring: a, tabs } = ringAt(level);
    const { ring: b, tabs: tabsAbove } = ringAt(level + 1);
    const opening = za > band - EPSILON_MM;
    // The side of the tab that starts after each point of the ring above, when the ring below has none.
    const across = new Map(tabs.size === 0 ? [...tabsAbove].map(([side, at]) => [at - 1, side]) : []);
    const openings = new Set(opening ? tabs.values() : []);
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      const side = across.get(k);
      const [ai, aj, bi] = [a[i], a[j], b[k]] as [number, number, number];
      if (side !== undefined) {
        const [minusAbove, plusAbove, next] = [b[k + 1], b[k + 2], b[(k + 3) % b.length]] as [number, number, number];
        const [minus, plus] = floors.get(side) as readonly [number, number];
        triangle(ai, aj, plus);
        triangle(ai, plus, minus);
        triangle(ai, minus, minusAbove);
        triangle(ai, minusAbove, bi);
        triangle(aj, next, plusAbove);
        triangle(aj, plusAbove, plus);
        k += 3;
        continue;
      }
      const bj = b[(k + 1) % b.length] as number;
      if (!openings.has(i)) {
        triangle(ai, aj, bj);
        triangle(ai, bj, bi);
      }
      k += 1;
    }
  }
  // The caps: fans from the first point, the bottom facing down and the top facing up.
  const [bottomRing, topRing] = [ringAt(0).ring, ringAt(last).ring];
  for (let k = 1; k < bottomRing.length - 1; k++) triangle(bottomRing[0] as number, bottomRing[k + 1] as number, bottomRing[k] as number);
  for (let k = 1; k < topRing.length - 1; k++) triangle(topRing[0] as number, topRing[k] as number, topRing[k + 1] as number);

  // The tabs, built for the +X side (the muret along Y) and turned: the notch at a height is
  // [wall, seam] × [−length, length], its flanks at 45° from the band up to the top of the tool.
  const topLength = notchLength(frame, top);
  const above = levels.flatMap(([z], level) => (z > band + EPSILON_MM ? [level] : []));
  for (const side of notched) {
    const at = (level: number, end: 0 | 1) => {
      const { ring, tabs } = ringAt(level);
      return ring[(tabs.get(side) as number) + end] as number;
    };
    const seam = (y: number, z: number) => vertex(...turn([half, y], side), z);
    const [floorMinus, floorPlus, topMinus, topPlus] = [seam(-floorLength, band), seam(floorLength, band), seam(-topLength, top), seam(topLength, top)];
    const [standMinus, standPlus] = floors.get(side) as readonly [number, number];
    // The flanks, fans from the seam at the band over the points of the wall from the band up.
    const minus = [standMinus, ...above.map((level) => at(level, 0)), topMinus];
    const plus = [standPlus, ...above.map((level) => at(level, 1)), topPlus];
    for (let k = 0; k < minus.length - 1; k++) triangle(floorMinus, minus[k + 1] as number, minus[k] as number);
    for (let k = 0; k < plus.length - 1; k++) triangle(floorPlus, plus[k] as number, plus[k + 1] as number);
    // The face on the seam, facing it; the floor, facing down; the top, facing up.
    triangle(floorMinus, floorPlus, topPlus);
    triangle(floorMinus, topPlus, topMinus);
    triangle(standMinus, floorPlus, floorMinus);
    triangle(standMinus, standPlus, floorPlus);
    triangle(at(last, 0), topMinus, topPlus);
    triangle(at(last, 0), topPlus, at(last, 1));
  }
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(indices) })));
}

/** How far the reach of a notch (`notchReach`) stands off its flanks, along the muret. */
const REACH_SLACK_MM = 0.1;

/**
 * Where the notches of a cell's `sides` (bits `1 << side`) lie, around its centre (the cell
 * bricks): on each notched side, from the pocket wall at its widest inset out past the seam,
 * as long along the muret as its notch at every height and `REACH_SLACK_MM` more, from below
 * the frame up past the top of the notched pocket tool. Its faces never meet those of a tab
 * (`notchedPocketTool`), and it stays clear of the posts, and so of the corners of the cell,
 * by nearly 5 mm within the frame.
 *
 * A whole cell of the margin on the edge of the lattice gets its pocket from the margin's cut,
 * which keeps what the margin keeps of it: along a side of the lattice without margin, the
 * outer wall of the truncated cells or the band of the extended grid (#38), at most a wall and
 * the bottom chamfer wide. Its notched pocket is removed within this reach only, which never
 * meets them. Null without a notch.
 */
export function notchReach(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { skeleton: Skeleton }, sides: number): Manifold | null {
  const { cellSize, profile, skeleton } = frame;
  if (sides === 0 || notchLength(frame, skeleton.band) <= 0) return null;
  const half = cellSize / 2;
  const o = TOOL_OVERSHOOT_MM;
  const from = half - Math.max(...profile.points.map(([, inset]) => inset)) - REACH_SLACK_MM;
  const top = flankTop(frame);
  // Built for the +X side (the muret along Y), then turned; below the band, as long as at the band.
  const layer = (side: number, z: number, at = z) => {
    const length = notchLength(frame, at) + REACH_SLACK_MM;
    return {
      z,
      points: [
        [from, -length],
        [half + o, -length],
        [half + o, length],
        [from, length],
      ].map((point) => turn(point as [number, number], side)),
    };
  };
  const reaches = [0, 1, 2, 3]
    .filter((side) => sides & (1 << side))
    .map((side) => {
      const layers = [layer(side, -2 * o, skeleton.band), layer(side, skeleton.band), layer(side, top), layer(side, top + o, top)];
      const { positions, indices } = loft(layers);
      return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
    });
  // Two reaches would meet near a corner of the pocket for a profile whose widest inset came
  // near its corner radius: a union.
  return own(wasm.Manifold.union(reaches));
}

/**
 * Every notch of a skeleton baseplate at once, in the coordinates of the outline (the boolean
 * assembly): one per muret between two cells of the lattice, on its +X or +Y side; null
 * without a skeleton or without a notch. The notches never meet each other, and compose.
 */
export function notchTools(wasm: ManifoldToplevel, own: Own, frame: GridFrame, lattice: Lattice, labels: readonly Label[]): Manifold | null {
  const { skeleton } = frame;
  if (!skeleton) return null;
  const tools = ([0, 1] as const).map((side) => notchTool(wasm, own, { ...frame, skeleton }, side));
  const placed: Manifold[] = [];
  for (let i = lattice.columns[0]; i < lattice.columns[1]; i++)
    for (let j = lattice.rows[0]; j < lattice.rows[1]; j++) {
      const sides = notchedSides(frame, lattice, labels, i, j);
      tools.forEach((tool, side) => {
        if (tool && sides & (1 << side)) placed.push(own(tool.translate([...cellCentre(i, j, frame), 0])));
      });
    }
  return placed.length === 0 ? null : own(wasm.Manifold.compose(placed));
}

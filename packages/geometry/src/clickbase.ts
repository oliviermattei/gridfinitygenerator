// CLICKbase baseplate (#27, ADR 0015): lamellas in the pocket walls that hold the bins.
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { DIGIT_GAP_MM, DIGIT_HEIGHT_MM, type Label, type LabelSide } from "./label";
import type { Own } from "./manifold";
import { insetAt, type PocketProfile } from "./pocket-profile";
import { roundUpToLayer } from "./print";
import { TOOL_OVERSHOOT_MM, cellCentre, insideOutline, pocketTool, type GridFrame } from "./shapes";

/**
 * A CLICKbase baseplate, after CLICKbase Refined (Printables 1487592, ZeroCtrl, itself after
 * John Hall's CLICKbase; its measures in prototypes/clickbase): a bin clicks into its pocket
 * and stays, without magnets. In the wall of each side of a pocket, a lamella, a strip of the
 * vertical pocket wall 0.8 mm thick, is cut free from the muret by a slit behind it, 0.5 mm
 * wide, and held at both ends. Its middle is bent into the pocket by `protrusion`: the ergot,
 * which grips the vertical band of the foot of a standard bin, 0.25 mm narrower than the wall.
 * The bin pushes the ergot back into the slit; the bent lamella presses on it, and friction
 * holds it (docs/research/retenue-des-bacs-clickbase.md).
 *
 * The lamella is printed in place: the first layers under it stay whole (the base), and above
 * them a thin web holds up the lamella, its pocket side cut back into a recess, its slit side
 * narrowing up to a 0.1 mm ridge under the lamella, which the first bin breaks free. It needs a
 * material that does not creep (PETG, not PLA), the Arachne wall generator and a 0.4 mm
 * nozzle: the interface says so.
 *
 * Two lamellas per side, at a quarter of the cell from its middle, from 4.5 mm off the middle
 * (the middle stays whole, for a clip of the cut or the number of a piece) to 0.5 mm before
 * the rounded corner of the pocket, 12 mm long at most; a cell under 34 mm has a single one, in
 * the middle. Only the cells of the grid have lamellas, not those of the margin.
 */
export interface Clickbase {
  /** Centres of the lamellas along a side, from its middle, in millimetres. */
  centres: readonly number[];
  /** Length of a lamella along the side (its slit and its recess), in millimetres. */
  length: number;
  /** How far the ergot stands into the pocket from the vertical pocket wall. */
  protrusion: number;
  /** How much the ergot squeezes the vertical band of the foot of a standard bin (0.25 mm narrower than the wall). */
  grip: number;
  /** Top of the whole layers under a lamella (its base), on a whole number of layers. */
  base: number;
  /** Bottom of a lamella over its web, the foot of the vertical pocket wall rounded up to the layer. */
  bottom: number;
  /**
   * Whether only the slits are built, straight, from the base up (the preview): the ergots,
   * webs and recesses, under a millimetre, would take the preview of the largest drawers over
   * its 100 ms. The final mesh, the one exported and measured, has them all.
   */
  slitsOnly: boolean;
}

/** Thickness of a lamella: two lines of a 0.4 mm nozzle, as in CLICKbase Refined. */
export const LAMELLA_THICKNESS_MM = 0.8;
/** Width of the slit behind a lamella, as in CLICKbase Refined: the lamella bends into it. */
export const SLIT_WIDTH_MM = 0.5;
/**
 * How far the ergot stands into the pocket, as in CLICKbase Refined: the foot of a standard
 * bin is 0.25 mm narrower than the vertical pocket wall, so it is squeezed by 0.25 mm.
 */
const PROTRUSION_MM = 0.5;
/** Gap between the vertical pocket wall and the foot of a standard bin (2.4 mm off the edge of its cell). */
const FOOT_GAP_MM = 0.25;
/** Longest lamella, as in CLICKbase Refined. */
const LAMELLA_LENGTH_MM = 12;
/** Shortest lamella: its ergot and the ramps on each side of it, and a little lamella beyond. */
const MIN_LAMELLA_LENGTH_MM = 8;
/** Half the middle of a side that stays whole between two lamellas: room for a clip of 8 mm. */
const FREE_MIDDLE_MM = 4.5;
/** Room left between the end of a lamella and the rounded corner of the pocket. */
const CORNER_CLEARANCE_MM = 0.5;
/** Half the length of the flat of the ergot, along the side, and of its ramps beyond it. */
const ERGOT_HALF_MM = 1.5;
const ERGOT_RAMP_MM = 1.4;
/**
 * Top of the flat of the ergot, above the bottom of the foot of a seated bin (at z = 0 in both
 * pocket profiles): the vertical band of the foot runs from 0.8 to 2.6 mm. Above it, the
 * lamella bends back into the wall at 45°.
 */
const ERGOT_TOP_MM = 2;
/** Whole layers under a lamella, before rounding up to the layer: a first layer of 0.2 mm. */
const BASE_MM = 0.2;
/** Recess of the web under a lamella, behind its pocket face, as in CLICKbase Refined. */
const RECESS_MM = 0.4;
/** Width of the web at its top, under the lamella: the ridge the first bin breaks. */
const WEB_TOP_MM = 0.1;
/**
 * Skin left between the slit of a lamella on the edge of the grid and the outline, at the top
 * of the base (after the bottom chamfer): at least two lines. Otherwise the side has none.
 */
const MIN_SKIN_MM = 0.8;
/** Room between a lamella and a clip, or the digits of a number engraved under the same side. */
export const LAMELLA_CLEARANCE_MM = 0.5;
/** Overlap between the parts of a tool, so that they never meet on a face. */
const OVERLAP_MM = 0.05;
/** Past the wall, in the muret, how far the solid that keeps the ergot reaches. */
const ERGOT_BACK_MM = 0.25;
/** Into the pocket, past the web, how far the recess reaches. */
const RECESS_INTO_POCKET_MM = 1.5;

/** Where the lamellas of a side lie, for a cell size: their centres and their length. */
function lamellasOf(cellSize: number): Pick<Clickbase, "centres" | "length"> {
  const end = cellSize / 2 - 4 - CORNER_CLEARANCE_MM; // the straight side of the pocket, less the clearance
  const two = Math.min(LAMELLA_LENGTH_MM, end - FREE_MIDDLE_MM);
  if (two >= MIN_LAMELLA_LENGTH_MM) return { centres: [-cellSize / 4, cellSize / 4], length: two };
  return { centres: [0], length: Math.min(LAMELLA_LENGTH_MM, 2 * end) };
}

/** The foot of the vertical pocket wall (the second-last segment of the profile). */
function wallFoot(profile: PocketProfile): number {
  const foot = profile.points[profile.points.length - 3];
  if (!foot) throw new Error("A pocket profile needs a vertical wall under its upper slope");
  return foot[0];
}

/** Inset of the vertical pocket wall from the edge of the cell (2.15 mm in both profiles). */
function wallInset(profile: PocketProfile): number {
  const top = profile.points[profile.points.length - 2];
  if (!top) throw new Error("A pocket profile needs a vertical wall under its upper slope");
  return top[1];
}

/** The lamellas of a CLICKbase baseplate, for a cell size, a pocket profile and a layer height. */
export function clickbaseOf(cellSize: number, profile: PocketProfile, layerHeight: number, protrusion = PROTRUSION_MM): Clickbase {
  return {
    ...lamellasOf(cellSize),
    protrusion,
    grip: Math.round((protrusion - FOOT_GAP_MM) * 1e6) / 1e6,
    base: roundUpToLayer(BASE_MM, layerHeight),
    bottom: roundUpToLayer(wallFoot(profile), layerHeight),
    slitsOnly: false,
  };
}

/** Offsets of the neighbour across each side of a cell, as `LabelSide` (0 +X, 1 +Y, 2 −X, 3 −Y). */
const SIDES: readonly (readonly [dx: number, dy: number])[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/**
 * The stretches of a side of a cell its lamellas take, from its middle along the side, with
 * the clearance around them: what a clip or the digits of a number must keep clear of.
 */
export function lamellaStretches({ centres, length }: Pick<Clickbase, "centres" | "length">): (readonly [from: number, to: number])[] {
  const half = length / 2 + LAMELLA_CLEARANCE_MM;
  return centres.map((centre) => [centre - half, centre + half] as const);
}

/**
 * Bit set of the sides of cell (i, j) that have lamellas (bit `1 << side`, sides as
 * `LabelSide`): every side of a cell of the grid, but a side on the edge of the baseplate
 * where the outline (its corner, its bottom chamfer) would leave less than two lines of skin
 * behind a slit, and the side that holds the number of a piece, when its digits reach a
 * lamella. None for a cell of the margin, nor without CLICKbase.
 */
export function lamellaSides(frame: GridFrame, labels: readonly Label[], i: number, j: number): number {
  const { clickbase, cellSize, profile } = frame;
  if (!clickbase || i < 0 || i >= frame.columns || j < 0 || j >= frame.rows) return 0;
  const [cx, cy] = cellCentre(i, j, frame);
  // The corners of the slits, on their side away from the pocket.
  const back = cellSize / 2 - wallInset(profile) + LAMELLA_THICKNESS_MM + SLIT_WIDTH_MM;
  const skin = MIN_SKIN_MM + Math.max(0, frame.bottomChamfer - clickbase.base);
  const ends = clickbase.centres.flatMap((centre) => [centre - clickbase.length / 2, centre + clickbase.length / 2]);
  const stretches = lamellaStretches(clickbase);
  return SIDES.reduce((bits, _, side) => {
    const clear = ends.every((u) => {
      const [x, y] = turn([back, u], side);
      return insideOutline(frame, cx + x, cy + y) >= skin - 1e-9;
    });
    const label = labels.find((label) => label.cell[0] === i && label.cell[1] === j && label.side === side);
    const half = label ? (label.text.length * DIGIT_HEIGHT_MM + (label.text.length - 1) * DIGIT_GAP_MM) / 2 : 0;
    const free = !label || stretches.every(([from, to]) => to <= -half || from >= half);
    return clear && free ? bits | (1 << side) : bits;
  }, 0);
}

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
 * A strip of material along a side, as a closed mesh: at each of `levels`, from bottom to top,
 * its section across the side between an inner and an outer line, both given at each of the
 * `stations` along the side (built for the +X side: x across it, y along it, then turned to
 * `side`). Its walls are quads between two levels; the quad of a corner of the ergot gets the
 * diagonal from its point bent the most, so that the bent faces are the planes of a truncated
 * pyramid (the displacement `bend` is the smaller of its ramps along the side and up). Its
 * caps are ladders across the strip: a strip may be bent, which a fan would not cover.
 */
function strip(
  wasm: ManifoldToplevel,
  own: Own,
  side: LabelSide,
  stations: readonly number[],
  levels: readonly { z: number; inner: (u: number) => number; outer: (u: number) => number }[],
  bend: (u: number, z: number) => number,
): Manifold {
  const n = stations.length;
  const positions: number[] = [];
  const bent: number[] = [];
  // Each level: the outer line along the side, then the inner line back (counter-clockwise).
  for (const { z, inner, outer } of levels) {
    const ring = [...stations.map((u) => [outer(u), u] as const), ...[...stations].reverse().map((u) => [inner(u), u] as const)];
    for (const [x, u] of ring) {
      positions.push(...turn([x, u], side), z);
      bent.push(bend(u, z));
    }
  }
  const m = 2 * n;
  const indices: number[] = [];
  for (let level = 0; level < levels.length - 1; level++) {
    const [a, b] = [level * m, (level + 1) * m];
    for (let k = 0; k < m; k++) {
      const next = (k + 1) % m;
      const [ai, aj, bj, bi] = [a + k, a + next, b + next, b + k];
      // The diagonal from the corner bent the most (a ramp of the ergot meets its top there).
      const most = Math.max(bent[ai] as number, bent[aj] as number, bent[bj] as number, bent[bi] as number);
      if (bent[aj] === most || bent[bi] === most) indices.push(ai, aj, bi, aj, bj, bi);
      else indices.push(ai, aj, bj, ai, bj, bi);
    }
  }
  const top = (levels.length - 1) * m;
  for (let k = 0; k < n - 1; k++) {
    // Outer k, outer k + 1, inner k + 1, inner k: counter-clockwise seen from above.
    const [o0, o1, i1, i0] = [k, k + 1, m - 2 - k, m - 1 - k];
    indices.push(o0, i1, o1, o0, i0, i1);
    indices.push(top + o0, top + o1, top + i1, top + o0, top + i1, top + i0);
  }
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(indices) })));
}

/**
 * The pocket tool of a cell of a CLICKbase baseplate, with the lamellas of its `sides` (bits
 * `1 << side`), centred on the origin: the pocket less the ergots, which stand into it, plus,
 * for each lamella, its slit, and its recess and the slit under it, which leave its web. All
 * of it stays 0.85 mm inside the cell: the seams of the cell bricks are untouched (ADR 0004).
 */
export function clickPocketTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame & { clickbase: Clickbase }, sides: number): Manifold {
  const pocket = pocketTool(wasm, own, frame);
  if (sides === 0) return pocket;
  const { cellSize, profile, clickbase } = frame;
  const { length, protrusion: d, base, bottom } = clickbase;
  const wall = cellSize / 2 - wallInset(profile);
  const [t, s] = [LAMELLA_THICKNESS_MM, SLIT_WIDTH_MM];
  const top = profile.height + TOOL_OVERSHOOT_MM;
  const ergots: Manifold[] = [];
  const cuts: Manifold[] = [];
  for (let side = 0 as LabelSide; side < 4; side++) {
    if (!(sides & (1 << side))) continue;
    for (const c of clickbase.centres) {
      // The ergot: the lamella and all behind it bent into the pocket by d, along the flat of
      // the ergot up to its top, and less along its ramps (45° up, ERGOT_RAMP_MM along).
      const along = (u: number) => Math.min(1, Math.max(0, (ERGOT_HALF_MM + ERGOT_RAMP_MM - Math.abs(u - c)) / ERGOT_RAMP_MM));
      const up = (z: number) => Math.min(1, Math.max(0, 1 - (z - ERGOT_TOP_MM) / d));
      const bend = (u: number, z: number) => d * Math.min(along(u), up(z));
      const stations = [c - length / 2, c - ERGOT_HALF_MM - ERGOT_RAMP_MM, c - ERGOT_HALF_MM, c + ERGOT_HALF_MM, c + ERGOT_HALF_MM + ERGOT_RAMP_MM, c + length / 2];
      const level = (z: number, inner: (u: number) => number, outer: (u: number) => number) => ({ z, inner, outer });
      if (clickbase.slitsOnly) {
        const straight = [base, top].map((z) => level(z, () => wall + t, () => wall + t + s));
        cuts.push(strip(wasm, own, side, [c - length / 2, c + length / 2], straight, () => 0));
        continue;
      }
      // Under the lamella, from the base up: the recess on the pocket side of the web, and the
      // slit on its other side, which narrows the web up to its ridge under the lamella.
      const recessFace = (u: number) => wall + RECESS_MM - bend(u, bottom);
      cuts.push(
        strip(wasm, own, side, stations, [level(base, () => wall - RECESS_INTO_POCKET_MM, recessFace), level(bottom, () => wall - RECESS_INTO_POCKET_MM, recessFace)], bend),
        strip(
          wasm,
          own,
          side,
          stations,
          [
            level(base, (u) => wall + t - bend(u, base), (u) => wall + t + s - bend(u, base)),
            level(bottom, (u) => recessFace(u) + WEB_TOP_MM, (u) => wall + t + s - bend(u, bottom)),
          ],
          bend,
        ),
      );
      // The slit behind the lamella, from its bottom up through the upper slope of the pocket.
      const slitLevels = [bottom - OVERLAP_MM, ERGOT_TOP_MM, ERGOT_TOP_MM + d, top].map((z) =>
        level(z, (u) => wall + t - bend(u, z), (u) => wall + t + s - bend(u, z)),
      );
      cuts.push(strip(wasm, own, side, stations, slitLevels, bend));
      // What keeps the ergot: from the pocket face bent in, back into the muret. It starts in the
      // recess, which takes its foot off again, and has a level at each bend of the profile.
      const [from, to] = [base + OVERLAP_MM, ERGOT_TOP_MM + d];
      const heights = [...new Set([from, ...profile.points.map(([z]) => z).filter((z) => z > from && z < to), ERGOT_TOP_MM, to])].sort((a, b) => a - b);
      const face = (z: number) => cellSize / 2 - insetAt(profile, z);
      ergots.push(
        strip(
          wasm,
          own,
          side,
          stations.slice(1, -1),
          heights.map((z) => level(z, (u) => face(z) - bend(u, z), () => wall + ERGOT_BACK_MM)),
          bend,
        ),
      );
    }
  }
  const kept = ergots.length === 0 ? pocket : own(pocket.subtract(own(wasm.Manifold.compose(ergots))));
  return own(wasm.Manifold.union([kept, ...cuts]));
}

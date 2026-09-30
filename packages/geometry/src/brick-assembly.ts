import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { labelTool, type Label } from "./label";
import { MARGIN } from "./margin";
import { withArena, type Own } from "./manifold";
import { hasScrew, screwTool } from "./screws";
import { TOOL_OVERSHOOT_MM, assertNoError, cellCentre, meshOf, pocketTool, rect, roundedRect, slabOf, type GridFrame } from "./shapes";
import { latticeOf, type Lattice, type PiecePlan } from "./split";

/**
 * Cell-brick assembly (ADR 0004, `brickMesh` in prototypes/geometry-perf): one brick per
 * kind of cell is computed with small booleans, then copied across the grid at the mesh
 * level. The faces between neighbouring bricks are dropped and the seam vertices welded,
 * so the whole baseplate costs no global boolean, only O(triangles) of plain JavaScript.
 *
 * Kinds of cells: the inner cell, the edge cells of a side with a margin (the brick carries
 * its piece of margin), and the four corners (rounded like the outline, with their margin).
 * A corner is only a corner on both axes, so every axis of the lattice (below) needs at
 * least two cells; single rows and columns without whole cells of margin go through the
 * boolean fallback, and so does a grid of mixed pocket profiles (the test kit). With screws, a kind of cell is also told apart by its corners
 * that hold a screw: the brick carries a quarter of each of their holes, whose circles have
 * a vertex on the seams, so that neighbouring quarters weld.
 *
 * Bricks are laid on the lattice of the grid (`latticeOf`): the grid, and the whole cells
 * the margin carries on beyond it, which are inner cells; the rest of the margin goes to
 * the bricks along the outline.
 *
 * A baseplate cut for the build plate (split.ts) is cut on seams between bricks: each piece
 * joins the bricks of its cells, and keeps their faces on its cuts, which are flat, with
 * sharp corners and no chamfer. The bricks are those of the whole baseplate, so the pieces
 * together are exactly the baseplate, less the screws on the cuts and the engraved numbers:
 * the brick that holds the number of a piece is a brick of its own (label.ts).
 */
export function canAssembleWithBricks(frame: GridFrame): boolean {
  const { columns, rows } = latticeOf(frame);
  return columns[1] - columns[0] >= 2 && rows[1] - rows[0] >= 2 && frame.lowerCells.length === 0;
}

/**
 * Joins the cell bricks into the pieces of the baseplate, in the order of `pieces` (a single
 * one covering the whole lattice when it is not cut), each piece with its label if any. With
 * `checked`, each joined mesh is rebuilt as a manifold solid to prove it is closed
 * (`NoError`): that check costs about ten times the assembly itself, so the preview skips
 * it and only the final mesh pays for it.
 */
export function assembleWithBricks(
  wasm: ManifoldToplevel,
  frame: GridFrame,
  checked: boolean,
  pieces: readonly PiecePlan[],
  labels: readonly Label[] = [],
): TriangleMesh[] {
  if (!canAssembleWithBricks(frame)) {
    throw new RangeError(
      `Cell bricks need a lattice of at least 2 × 2 cells of a single pocket profile, not ${frame.columns} × ${frame.rows} cells and their margin`,
    );
  }
  const lattice = latticeOf(frame);
  const bricks = cellBricks(wasm, frame, lattice, labels);
  return pieces.map((piece, index) => {
    const label = labels[index];
    const mesh = joinBricks(bricks, frame, lattice, piece, label ? { cell: label.cell, key: labelKey(label, frame, lattice) } : null);
    if (checked) assertManifold(wasm, mesh);
    return mesh;
  });
}

/** Key of the brick that holds a label: the brick of its cell, less the digits. */
function labelKey(label: Label, frame: GridFrame, lattice: Lattice): string {
  return `${brickKey(...label.cell, frame, lattice)},label:${label.text}@${label.side}`;
}

/** Bit per cut face of a brick: +X, −X, +Y, −Y (the faces a neighbouring brick touches). */
const PLUS_X = 1;
const MINUS_X = 2;
const PLUS_Y = 4;
const MINUS_Y = 8;

/** Coordinates closer than this to a cut face are on it (bricks are built on exact planes). */
const ON_FACE_MM = 1e-4;
/** Seam vertices of neighbouring bricks are welded when they match to this grid. */
const WELD_GRID_MM = 1e-3;

interface Brick extends TriangleMesh {
  /** Cut faces each vertex lies on (bit set of PLUS_X…MINUS_Y). */
  vertexFaces: Uint8Array;
  /** Cut face each triangle lies in, 0 when it is not in one. */
  triangleFaces: Uint8Array;
}

/** Side of a cell on each axis: −1 on the first row or column, 1 on the last, 0 inside. */
type Side = -1 | 0 | 1;

/**
 * Key of a kind of cell in the table of bricks: its sides, its corners that hold a screw, and
 * whether it is a cell of the margin on the outline: its pocket comes from the margin's cut,
 * which may differ from the grid's pocket (along a side without margin, the outer wall cuts
 * it). An inner cell of the margin is an inner cell of the grid.
 */
const kindKey = (sx: Side, sy: Side, screws: number, margin: boolean) =>
  `${sx},${sy},${screws}${margin && (sx !== 0 || sy !== 0) ? ",margin" : ""}`;

/** Corners of a cell, as offsets of the intersection of grid lines from the cell index. */
const CORNERS: readonly (readonly [da: 0 | 1, db: 0 | 1])[] = [
  [1, 1],
  [0, 1],
  [0, 0],
  [1, 0],
];

/** Bit set of the corners of cell (i, j) that hold a screw, one bit per entry of CORNERS. */
function screwCorners(i: number, j: number, frame: GridFrame): number {
  return CORNERS.reduce((bits, [da, db], corner) => (hasScrew(frame, i + da, j + db) ? bits | (1 << corner) : bits), 0);
}

/** Key of the brick of cell (i, j). */
function brickKey(i: number, j: number, frame: GridFrame, lattice: Lattice): string {
  return kindKey(...kindOf(i, j, frame, lattice), screwCorners(i, j, frame), !inGrid(i, j, frame));
}

/**
 * Kind of cell (i, j): its sides on the outline, at the ends of the lattice. An edge cell of
 * the grid on a side without margin is an inner cell, unless the bottom of the outline is
 * chamfered; a corner stays a corner, since the outline rounds it; and a cell of the margin
 * stays an edge, since the margin cuts it along the whole outline.
 */
function kindOf(i: number, j: number, frame: GridFrame, lattice: Lattice): [sx: Side, sy: Side] {
  const { columns, rows } = lattice;
  const sx: Side = i === columns[1] - 1 ? 1 : i === columns[0] ? -1 : 0;
  const sy: Side = j === rows[1] - 1 ? 1 : j === rows[0] ? -1 : 0;
  if ((sx !== 0 && sy !== 0) || frame.bottomChamfer > 0 || !inGrid(i, j, frame)) return [sx, sy];
  return [restX(lattice, sx) > 0 ? sx : 0, restY(lattice, sy) > 0 ? sy : 0];
}

/** Whether cell (i, j) of the lattice is a cell of the grid, not of the margin. */
function inGrid(i: number, j: number, { columns, rows }: GridFrame): boolean {
  return i >= 0 && i < columns && j >= 0 && j < rows;
}

/**
 * One brick per kind of cell present in the grid, centred on its cell centre: the inner
 * brick is a cell block minus the pocket tool; the others are the slab of their footprint
 * (cell plus margin, cut by the outline at the corners, less the margin's holes, with the
 * bottom chamfer of the outline) minus the pocket tool and the margin's solid cut (which
 * holds the pocket of a cell of the margin, cut by the outline). Then the
 * quarter of a screw hole is removed at each corner of the brick that holds a screw.
 */
function cellBricks(wasm: ManifoldToplevel, frame: GridFrame, lattice: Lattice, labels: readonly Label[]): Map<string, Brick> {
  const { cellSize, profile } = frame;
  const half = cellSize / 2;
  return withArena((own) => {
    const pocket = pocketTool(wasm, own, frame);
    const margin = MARGIN.prepare(wasm, own, frame);
    const screw = frame.screws && screwTool(wasm, own, { ...frame, screws: frame.screws });
    // The corner screws of a brick, far from each other, compose; the bore of a head meets
    // the corners of the pockets, so they are removed after the pocket.
    const withScrews = (solid: Manifold, corners: number) => {
      if (!screw || corners === 0) return solid;
      const tools = CORNERS.filter((_, corner) => corners & (1 << corner)).map(([da, db]) =>
        own(screw.translate([(2 * da - 1) * half, (2 * db - 1) * half, 0])),
      );
      return own(solid.subtract(own(wasm.Manifold.compose(tools))));
    };
    // The brick of a kind of cell without its screws, shared by the bricks of that kind whatever
    // their screws: manifold computes it once.
    const bases = new Map<string, Manifold>();
    // A cut shows the faces of the bricks along it: with a bottom chamfer, the slabs of the
    // bricks on the outline have a ring of vertices at the top of the chamfer, on their seams
    // too, so the inner bricks get it as well, for their faces on a cut to meet on the same
    // vertices. Without a cut, the ring on the seams is dropped with them.
    const ringed = frame.bottomChamfer > 0 && (frame.cuts.columns.length > 0 || frame.cuts.rows.length > 0);
    const baseOf = (i: number, j: number, sx: Side, sy: Side): Manifold => {
      if (sx === 0 && sy === 0) {
        const square = rect(-half, -half, half, half);
        const block =
          ringed
            ? slabOf(wasm, own, own(new wasm.CrossSection([square])), frame, cellCentre(i, j, frame))
            : own(own(wasm.Manifold.cube([cellSize, cellSize, profile.height])).translate([-half, -half, 0]));
        return own(block.subtract(pocket));
      }
      const [cx, cy] = cellCentre(i, j, frame);
      const [x0, y0, x1, y1] = brickArea(frame, lattice, sx, sy);
      // Only the margin's cut around the brick, a little beyond it, so that no edge of the
      // cut lies on a face of the brick.
      const o = TOOL_OVERSHOOT_MM;
      const window = [cx + x0 - o, cy + y0 - o, cx + x1 + o, cy + y1 + o] as const;
      let area = footprint(wasm, own, frame, lattice, sx, sy, cx, cy);
      const holes = margin?.holes(window);
      if (holes) area = own(area.subtract(own(holes.translate([-cx, -cy]))));
      // The pocket of a cell of the margin comes with the margin's cut, as the margin shapes it.
      const tools = inGrid(i, j, frame) ? [pocket] : [];
      const cut = margin?.solid(window);
      if (cut) tools.push(own(cut.translate([-cx, -cy, 0])));
      const slab = slabOf(wasm, own, area, frame, [cx, cy]);
      return tools.length === 0 ? slab : own(slab.subtract(own(wasm.Manifold.compose(tools))));
    };
    const solids = new Map<string, Manifold>();
    for (let i = lattice.columns[0]; i < lattice.columns[1]; i++)
      for (let j = lattice.rows[0]; j < lattice.rows[1]; j++) {
        const [sx, sy] = kindOf(i, j, frame, lattice);
        const corners = screwCorners(i, j, frame);
        const margin = !inGrid(i, j, frame);
        const key = kindKey(sx, sy, corners, margin);
        if (solids.has(key)) continue;
        const kind = kindKey(sx, sy, 0, margin);
        const base = bases.get(kind) ?? baseOf(i, j, sx, sy);
        bases.set(kind, base);
        solids.set(key, withScrews(base, corners));
      }
    for (const label of labels) {
      const solid = solids.get(brickKey(...label.cell, frame, lattice)) as Manifold;
      solids.set(labelKey(label, frame, lattice), own(solid.subtract(labelTool(wasm, own, frame, label))));
    }
    return new Map([...solids].map(([key, solid]) => [key, brickOf(meshOf(solid), half)]));
  });
}

/**
 * Footprint of a brick around its cell centre (cx, cy): the cell, extended by the margins
 * on its sides on the outline, and cut by the outline's rounded corner for a corner cell.
 */
function footprint(
  wasm: ManifoldToplevel,
  own: Own,
  frame: GridFrame,
  lattice: Lattice,
  sx: Side,
  sy: Side,
  cx: number,
  cy: number,
) {
  const { width, depth, outerRadius, segmentsPerQuarter } = frame;
  const area = own(new wasm.CrossSection([rect(...brickArea(frame, lattice, sx, sy))]));
  if (sx === 0 || sy === 0) return area;
  const outline = own(new wasm.CrossSection([roundedRect(width, depth, outerRadius, segmentsPerQuarter)]));
  return own(area.intersect(own(outline.translate([-cx, -cy]))));
}

/** Rectangle of a brick around its cell centre: the cell, and the rest of the margin on its sides on the outline. */
function brickArea(frame: GridFrame, lattice: Lattice, sx: Side, sy: Side): [x0: number, y0: number, x1: number, y1: number] {
  const half = frame.cellSize / 2;
  const [mx, my] = [restX(lattice, sx), restY(lattice, sy)];
  return [-half - (sx === -1 ? mx : 0), -half - (sy === -1 ? my : 0), half + (sx === 1 ? mx : 0), half + (sy === 1 ? my : 0)];
}

/** Rest of the margin on the side of the outline a cell touches along X (left or right), 0 inside. */
function restX({ rests }: Lattice, sx: Side): number {
  return sx === 1 ? rests.right : sx === -1 ? rests.left : 0;
}

/** Rest of the margin on the side of the outline a cell touches along Y (front or back), 0 inside. */
function restY({ rests }: Lattice, sy: Side): number {
  return sy === 1 ? rests.back : sy === -1 ? rests.front : 0;
}

function brickOf(mesh: TriangleMesh, half: number): Brick {
  const { positions, indices } = mesh;
  const vertexFaces = new Uint8Array(positions.length / 3);
  for (let v = 0; v < vertexFaces.length; v++) {
    const x = positions[3 * v] as number;
    const y = positions[3 * v + 1] as number;
    vertexFaces[v] =
      (Math.abs(x - half) < ON_FACE_MM ? PLUS_X : 0) |
      (Math.abs(x + half) < ON_FACE_MM ? MINUS_X : 0) |
      (Math.abs(y - half) < ON_FACE_MM ? PLUS_Y : 0) |
      (Math.abs(y + half) < ON_FACE_MM ? MINUS_Y : 0);
  }
  const triangleFaces = new Uint8Array(indices.length / 3);
  for (let t = 0; t < triangleFaces.length; t++) {
    triangleFaces[t] =
      (vertexFaces[indices[3 * t] as number] as number) &
      (vertexFaces[indices[3 * t + 1] as number] as number) &
      (vertexFaces[indices[3 * t + 2] as number] as number);
  }
  return { positions, indices, vertexFaces, triangleFaces };
}

/**
 * Copies the bricks across the cells of a piece, drops the faces between neighbours and
 * welds the seams; the faces on the sides of the piece stay, on the outline as on a cut.
 * `label` is the cell whose brick is the piece's own, with its engraved number.
 */
function joinBricks(
  bricks: Map<string, Brick>,
  frame: GridFrame,
  lattice: Lattice,
  piece: PiecePlan,
  label: { cell: readonly [number, number]; key: string } | null,
): TriangleMesh {
  const [[i0, i1], [j0, j1]] = [piece.columns, piece.rows];
  const brickAt = (i: number, j: number) =>
    bricks.get(label && label.cell[0] === i && label.cell[1] === j ? label.key : brickKey(i, j, frame, lattice)) as Brick;
  let vertexCount = 0;
  let indexCount = 0;
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const brick = brickAt(i, j);
      vertexCount += brick.vertexFaces.length;
      indexCount += brick.indices.length;
    }
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const seam = new Map<string, number>();
  let vertices = 0;
  let written = 0;

  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const brick = brickAt(i, j);
      const [cx, cy] = cellCentre(i, j, frame);
      const remap = new Uint32Array(brick.vertexFaces.length);
      for (let v = 0; v < remap.length; v++) {
        const x = (brick.positions[3 * v] as number) + cx;
        const y = (brick.positions[3 * v + 1] as number) + cy;
        const z = brick.positions[3 * v + 2] as number;
        if (brick.vertexFaces[v]) {
          const key = `${Math.round(x / WELD_GRID_MM)},${Math.round(y / WELD_GRID_MM)},${Math.round(z / WELD_GRID_MM)}`;
          const welded = seam.get(key);
          if (welded !== undefined) {
            remap[v] = welded;
            continue;
          }
          seam.set(key, vertices);
        }
        positions[3 * vertices] = x;
        positions[3 * vertices + 1] = y;
        positions[3 * vertices + 2] = z;
        remap[v] = vertices++;
      }
      // Faces shared with a neighbour are inside the baseplate: drop them.
      const inside = (i < i1 - 1 ? PLUS_X : 0) | (i > i0 ? MINUS_X : 0) | (j < j1 - 1 ? PLUS_Y : 0) | (j > j0 ? MINUS_Y : 0);
      for (let t = 0; t < brick.triangleFaces.length; t++) {
        if ((brick.triangleFaces[t] as number) & inside) continue;
        indices[written++] = remap[brick.indices[3 * t] as number] as number;
        indices[written++] = remap[brick.indices[3 * t + 1] as number] as number;
        indices[written++] = remap[brick.indices[3 * t + 2] as number] as number;
      }
    }
  return withoutUnusedVertices({ positions: positions.subarray(0, vertices * 3), indices: indices.subarray(0, written) });
}

/**
 * Drops the vertices no triangle uses: a seam vertex that only the dropped faces between
 * bricks held (the ring the bottom chamfer adds halfway up the walls, on a seam inside the
 * grid). Copies the buffers either way, so that they own no more memory than they use.
 */
function withoutUnusedVertices({ positions, indices }: TriangleMesh): TriangleMesh {
  const count = positions.length / 3;
  const remap = new Int32Array(count).fill(-1);
  for (let t = 0; t < indices.length; t++) remap[indices[t] as number] = 0;
  let kept = 0;
  for (let v = 0; v < count; v++) if (remap[v] === 0) remap[v] = kept++;
  if (kept === count) return { positions: positions.slice(), indices: indices.slice() };
  const compact = new Float32Array(kept * 3);
  for (let v = 0; v < count; v++) {
    const to = remap[v] as number;
    if (to >= 0) compact.set(positions.subarray(3 * v, 3 * v + 3), 3 * to);
  }
  const reindexed = new Uint32Array(indices.length);
  for (let t = 0; t < indices.length; t++) reindexed[t] = remap[indices[t] as number] as number;
  return { positions: compact, indices: reindexed };
}

/** Rebuilds the joined mesh as a manifold solid: the seams must close it (`NoError`). */
function assertManifold(wasm: ManifoldToplevel, { positions, indices }: TriangleMesh): void {
  withArena((own) => {
    let solid: Manifold;
    try {
      solid = own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
    } catch (error) {
      throw new Error(`Baseplate mesh is not manifold: ${error instanceof Error ? error.message : String(error)}`);
    }
    assertNoError(solid.status());
  });
}

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { withArena } from "./manifold";
import { TOOL_OVERSHOOT_MM, assertNoError, cellCentre, meshOf, pocketTool, roundedRect, type GridFrame } from "./shapes";

/**
 * Cell-brick assembly (ADR 0004, `brickMesh` in prototypes/geometry-perf): the brick of
 * one cell and its four rounded corner variants are computed once with small booleans,
 * then copied across the grid at the mesh level. The faces between neighbouring bricks are
 * dropped and the seam vertices welded, so the whole baseplate costs no global boolean,
 * only O(triangles) of plain JavaScript.
 *
 * A brick has its corner rounded only on the outline, so every axis needs at least two
 * cells; single rows and columns go through the boolean fallback.
 */
export function canAssembleWithBricks({ columns, rows }: GridFrame): boolean {
  return columns >= 2 && rows >= 2;
}

/**
 * Joins the cell bricks into the baseplate. With `checked`, the joined mesh is rebuilt as
 * a manifold solid to prove it is closed (`NoError`): that check costs about ten times the
 * assembly itself, so the preview skips it and only the final mesh pays for it.
 */
export function assembleWithBricks(wasm: ManifoldToplevel, frame: GridFrame, checked: boolean): TriangleMesh {
  if (!canAssembleWithBricks(frame)) {
    throw new RangeError(`Cell bricks need at least 2 × 2 cells, not ${frame.columns} × ${frame.rows}`);
  }
  const mesh = joinBricks(cellBricks(wasm, frame), frame);
  if (checked) assertManifold(wasm, mesh);
  return mesh;
}

/** Corner of a cell on the outline, as the signs of its X and Y. */
const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

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

/**
 * The inner brick (a cell block minus the pocket tool, centred on the origin), then one
 * brick per outer corner of the grid in CORNERS order, rounded like the outline.
 */
function cellBricks(wasm: ManifoldToplevel, frame: GridFrame): Brick[] {
  const { cellSize, profile, outerRadius, segmentsPerQuarter } = frame;
  const half = cellSize / 2;
  return withArena((own) => {
    const block = own(own(wasm.Manifold.cube([cellSize, cellSize, profile.height])).translate([-half, -half, 0]));
    const inner = own(block.subtract(pocketTool(wasm, own, frame)));
    // A rounded square two cells wide: shifted by half a cell, one of its rounded corners
    // lands on a corner of the brick while it covers the rest of the brick.
    const outline = own(new wasm.CrossSection([roundedRect(2 * cellSize, 2 * cellSize, outerRadius, segmentsPerQuarter)]));
    const rounding = own(own(wasm.Manifold.extrude(outline, profile.height + 2 * TOOL_OVERSHOOT_MM)).translate([0, 0, -TOOL_OVERSHOOT_MM]));
    const corners: Manifold[] = CORNERS.map(([sx, sy]) => own(inner.intersect(own(rounding.translate([-sx * half, -sy * half, 0])))));
    return [inner, ...corners].map((solid) => brickOf(meshOf(solid), half));
  });
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

/** Index in cellBricks() of the brick for cell (i, j): a corner variant or the inner brick. */
function brickIndex(i: number, j: number, columns: number, rows: number): number {
  const sx = i === columns - 1 ? 1 : i === 0 ? -1 : 0;
  const sy = j === rows - 1 ? 1 : j === 0 ? -1 : 0;
  return CORNERS.findIndex(([cx, cy]) => cx === sx && cy === sy) + 1; // 0 when not a corner
}

/** Copies the bricks across the grid, drops the faces between neighbours and welds the seams. */
function joinBricks(bricks: Brick[], frame: GridFrame): TriangleMesh {
  const { columns, rows } = frame;
  let vertexCount = 0;
  let indexCount = 0;
  for (let i = 0; i < columns; i++)
    for (let j = 0; j < rows; j++) {
      const brick = bricks[brickIndex(i, j, columns, rows)] as Brick;
      vertexCount += brick.vertexFaces.length;
      indexCount += brick.indices.length;
    }
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const seam = new Map<string, number>();
  let vertices = 0;
  let written = 0;

  for (let i = 0; i < columns; i++)
    for (let j = 0; j < rows; j++) {
      const brick = bricks[brickIndex(i, j, columns, rows)] as Brick;
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
      const inside =
        (i < columns - 1 ? PLUS_X : 0) | (i > 0 ? MINUS_X : 0) | (j < rows - 1 ? PLUS_Y : 0) | (j > 0 ? MINUS_Y : 0);
      for (let t = 0; t < brick.triangleFaces.length; t++) {
        if ((brick.triangleFaces[t] as number) & inside) continue;
        indices[written++] = remap[brick.indices[3 * t] as number] as number;
        indices[written++] = remap[brick.indices[3 * t + 1] as number] as number;
        indices[written++] = remap[brick.indices[3 * t + 2] as number] as number;
      }
    }
  return { positions: positions.slice(0, vertices * 3), indices: indices.slice(0, written) };
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

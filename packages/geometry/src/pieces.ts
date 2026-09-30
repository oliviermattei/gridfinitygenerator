// The pieces of a cut baseplate, taken out of its mesh for the preview and the export.
import type { Baseplate, BaseplatePiece } from "./baseplate";
import { clipGrid } from "./clips";
import type { TriangleMesh } from "./mesh";

/** Space between the pieces laid out for the print (3MF, STL), in millimetres. */
export const PRINT_GAP_MM = 10;

/** The mesh of one piece of a baseplate, on its own (a copy, indexed from 0). */
export function pieceMesh({ mesh }: Pick<Baseplate, "mesh">, piece: Pick<BaseplatePiece, "vertices" | "triangles">): TriangleMesh {
  const [v0, v1] = piece.vertices;
  const [t0, t1] = piece.triangles;
  const indices = mesh.indices.slice(3 * t0, 3 * t1);
  for (let k = 0; k < indices.length; k++) indices[k] = (indices[k] as number) - v0;
  return { positions: mesh.positions.slice(3 * v0, 3 * v1), indices };
}

/**
 * Where each piece moves when the pieces are set apart by `gap` across each cut, the
 * assembly staying centred: an exploded view of the baseplate.
 */
function offsetsOf({ layout, pieces }: Pick<Baseplate, "layout" | "pieces">, gap: number): [dx: number, dy: number][] {
  const { columnCuts, rowCuts, pieces: plans } = layout.split;
  const shift = (start: number, cuts: readonly number[]) =>
    gap * (cuts.filter((line) => line <= start).length - cuts.length / 2);
  return pieces.map((_, index) => {
    const plan = plans[index];
    return plan ? [shift(plan.columns[0], columnCuts), shift(plan.rows[0], rowCuts)] : [0, 0];
  });
}

/**
 * The mesh of the baseplate with its pieces set apart by `gap` millimetres across each cut,
 * so that the cuts show in the preview. The mesh itself when the baseplate is not cut.
 */
export function spreadPieces(baseplate: Pick<Baseplate, "mesh" | "layout" | "pieces">, gap: number): TriangleMesh {
  if (baseplate.pieces.length <= 1) return baseplate.mesh;
  const positions = baseplate.mesh.positions.slice();
  offsetsOf(baseplate, gap).forEach(([dx, dy], index) => {
    const [v0, v1] = (baseplate.pieces[index] as BaseplatePiece).vertices;
    for (let v = v0; v < v1; v++) {
      positions[3 * v] = (positions[3 * v] as number) + dx;
      positions[3 * v + 1] = (positions[3 * v + 1] as number) + dy;
    }
  });
  return { positions, indices: baseplate.mesh.indices };
}

/**
 * The pieces of a baseplate laid out for the print, each its own mesh: set apart by
 * `PRINT_GAP_MM` across each cut, none overlapping another, and turned a quarter when the
 * split plan lays them on the build plate that way (`SplitPlan.turned`), so that each lies
 * on the build plate as it fits. The slicer then arranges them on its plates.
 */
export function printPieces(baseplate: Pick<Baseplate, "mesh" | "layout" | "pieces">): TriangleMesh[] {
  const offsets = offsetsOf(baseplate, PRINT_GAP_MM);
  return baseplate.pieces.map((piece, index) => {
    const mesh = pieceMesh(baseplate, piece);
    const [dx, dy] = offsets[index] as [number, number];
    const { positions } = mesh;
    for (let v = 0; v < positions.length; v += 3) {
      const [x, y] = [(positions[v] as number) + dx, (positions[v + 1] as number) + dy];
      // A quarter turn counter-clockwise keeps the triangles counter-clockwise.
      [positions[v], positions[v + 1]] = baseplate.layout.split.turned ? [-y, x] : [x, y];
    }
    return mesh;
  });
}

/**
 * The clips of a cut baseplate laid out for the print, as one mesh of `stats.clips` closed
 * shells, each clip lying on its side as `Baseplate.clip`, in a near-square grid: beside the
 * meshes of `beside` (the pieces laid out by `printPieces`), `PRINT_GAP_MM` to their right
 * and from their front, or from the origin without them. Null without clips.
 */
export function printClips(baseplate: Pick<Baseplate, "clip" | "layout" | "stats">, beside: readonly TriangleMesh[] = []): TriangleMesh | null {
  const { clip, layout, stats } = baseplate;
  if (!clip || !layout.clips || stats.clips === 0) return null;
  let [right, front] = [beside.length > 0 ? -Infinity : -PRINT_GAP_MM, beside.length > 0 ? Infinity : 0];
  for (const { positions } of beside)
    for (let v = 0; v < positions.length; v += 3) {
      right = Math.max(right, positions[v] as number);
      front = Math.min(front, positions[v + 1] as number);
    }
  const offsets = clipGrid(layout.clips.slot, stats.clips, [right + PRINT_GAP_MM, front]);
  const vertices = clip.positions.length / 3;
  const positions = new Float32Array(clip.positions.length * offsets.length);
  const indices = new Uint32Array(clip.indices.length * offsets.length);
  offsets.forEach(([dx, dy], k) => {
    for (let v = 0; v < clip.positions.length; v += 3) {
      const at = k * clip.positions.length + v;
      positions[at] = (clip.positions[v] as number) + dx;
      positions[at + 1] = (clip.positions[v + 1] as number) + dy;
      positions[at + 2] = clip.positions[v + 2] as number;
    }
    for (let t = 0; t < clip.indices.length; t++) indices[k * clip.indices.length + t] = (clip.indices[t] as number) + k * vertices;
  });
  return { positions, indices };
}

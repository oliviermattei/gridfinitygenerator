// The pieces of a cut baseplate, taken out of its mesh for the preview and the export.
import type { Baseplate, BaseplatePiece } from "./baseplate";
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

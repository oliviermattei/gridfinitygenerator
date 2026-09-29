// Measuring instruments for the engine tests. manifold-3d is used here as an independent
// checker of the meshes returned by the public interface (validity, volume, sections),
// the TypeScript counterpart of the trimesh script prototypes/geometry-perf/validate.py.
import Module, { type Manifold, type ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "../../src/index";

let wasm: Promise<ManifoldToplevel> | undefined;

async function manifoldModule(): Promise<ManifoldToplevel> {
  wasm ??= Module().then((module) => {
    module.setup();
    return module;
  });
  return wasm;
}

export interface MeshCheck {
  /** Manifold status of the mesh: "NoError" for a closed, valid solid. */
  status: string;
  volume: number;
  genus: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Closed contours of the horizontal section at each requested height. */
  sections: Map<number, [number, number][][]>;
}

/**
 * Rebuilds the mesh as a manifold solid and measures it. The constructor throws when the
 * mesh is not manifold, which fails the test with manifold's own reason.
 */
export async function checkMesh(mesh: TriangleMesh, sectionHeights: readonly number[] = []): Promise<MeshCheck> {
  const W = await manifoldModule();
  const solid: Manifold = new W.Manifold(
    new W.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices }),
  );
  try {
    const box = solid.boundingBox();
    const sections = new Map<number, [number, number][][]>();
    for (const z of sectionHeights) {
      const section = solid.slice(z);
      sections.set(z, section.toPolygons() as [number, number][][]);
      section.delete();
    }
    return {
      status: solid.status(),
      volume: solid.volume(),
      genus: solid.genus(),
      bounds: { min: [...box.min] as [number, number, number], max: [...box.max] as [number, number, number] },
      sections,
    };
  } finally {
    solid.delete();
  }
}

/**
 * Width along X of the pocket opening around a cell centre, in one horizontal section:
 * the narrowest contour whose bounding box contains the centre (the outline is wider).
 * The straight sides of a pocket make this width exact, whatever the corner segments.
 */
export function pocketOpeningWidth(contours: [number, number][][], [cx, cy]: [number, number]): number | undefined {
  let best: number | undefined;
  for (const contour of contours) {
    const xs = contour.map(([x]) => x);
    const ys = contour.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    if (x0 < cx && cx < x1 && y0 < cy && cy < y1) {
      const width = x1 - x0;
      if (best === undefined || width < best) best = width;
    }
  }
  return best;
}

/** Parses a binary STL and welds identical vertices back into an indexed mesh. */
export function readBinaryStl(bytes: Uint8Array): TriangleMesh {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (bytes.byteLength !== 84 + count * 50) throw new Error(`STL size ${bytes.byteLength} does not match ${count} triangles`);
  const positions: number[] = [];
  const indices = new Uint32Array(count * 3);
  const seen = new Map<string, number>();
  for (let t = 0; t < count; t++) {
    const record = 84 + t * 50 + 12; // skip the facet normal
    for (let corner = 0; corner < 3; corner++) {
      const at = record + corner * 12;
      const x = view.getFloat32(at, true);
      const y = view.getFloat32(at + 4, true);
      const z = view.getFloat32(at + 8, true);
      const key = `${x},${y},${z}`;
      let index = seen.get(key);
      if (index === undefined) {
        index = positions.length / 3;
        seen.set(key, index);
        positions.push(x, y, z);
      }
      indices[t * 3 + corner] = index;
    }
  }
  return { positions: new Float32Array(positions), indices };
}

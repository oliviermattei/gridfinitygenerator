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
  const manifold = await manifoldModule();
  const solid: Manifold = new manifold.Manifold(
    new manifold.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices }),
  );
  try {
    const box = solid.boundingBox();
    const sections = new Map<number, [number, number][][]>();
    for (const z of sectionHeights) {
      const section = solid.slice(z);
      try {
        sections.set(z, section.toPolygons() as [number, number][][]);
      } finally {
        section.delete();
      }
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

export interface PocketOpening {
  /** Opening along X; exact, since the straight sides do not depend on corner segments. */
  width: number;
  /** Opening along Y. */
  depth: number;
  /** Area enclosed by the opening contour, which reflects its corner radius. */
  area: number;
}

/**
 * Pocket opening around a cell centre, in one horizontal section: the smallest contour
 * whose bounding box contains the centre (the outline of the baseplate is larger).
 */
export function pocketOpening(contours: [number, number][][], [cx, cy]: [number, number]): PocketOpening | undefined {
  let best: PocketOpening | undefined;
  for (const contour of contours) {
    const xs = contour.map(([x]) => x);
    const ys = contour.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    if (x0 < cx && cx < x1 && y0 < cy && cy < y1 && (best === undefined || x1 - x0 < best.width)) {
      best = { width: x1 - x0, depth: y1 - y0, area: Math.abs(shoelaceArea(contour)) };
    }
  }
  return best;
}

function shoelaceArea(contour: [number, number][]): number {
  let twice = 0;
  contour.forEach(([x, y], i) => {
    const [nx, ny] = contour[(i + 1) % contour.length] as [number, number];
    twice += x * ny - nx * y;
  });
  return twice / 2;
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

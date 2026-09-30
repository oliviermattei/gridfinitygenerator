// Measuring instruments for the engine tests. manifold-3d is used here as an independent
// checker of the meshes returned by the public interface (validity, volume, sections),
// the TypeScript counterpart of the trimesh script prototypes/geometry-perf/validate.py.
import { crc32, inflateRawSync } from "node:zlib";
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

/**
 * Heights of reference of the hybrid pocket profile (ADR 0002): at height `z`, the pocket
 * wall is `inset` mm off the edge of its cell. Whatever the cell size, the opening is a
 * rounded square of side `cellSize − 2·inset`; only its footprint follows the cell.
 */
export const HYBRID_OPENINGS: readonly { z: number; inset: number }[] = [
  { z: 0.1, inset: 2.85 },
  { z: 0.7, inset: 2.5 },
  { z: 1.5, inset: 2.15 },
  { z: 3.5, inset: 1.5 },
  { z: 4.5, inset: 0.5 },
];

/**
 * Edges of a mesh used by other than exactly two triangles: none for a closed surface without
 * pinches. manifold's `NoError` does not see an edge pinched between four faces (ADR 0014).
 */
export function badEdges({ indices }: TriangleMesh): number {
  const uses = new Map<number, number>();
  const count = indices.length;
  for (let t = 0; t < count; t += 3)
    for (let k = 0; k < 3; k++) {
      const [a, b] = [indices[t + k] as number, indices[t + ((k + 1) % 3)] as number];
      const key = Math.min(a, b) * count + Math.max(a, b);
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  return [...uses.values()].filter((n) => n !== 2).length;
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

/** Whether a point lies in the material of a horizontal section (even-odd rule over its contours). */
export function inSection(contours: [number, number][][], [px, py]: [number, number]): boolean {
  let inside = false;
  for (const contour of contours) {
    contour.forEach(([x0, y0], i) => {
      const [x1, y1] = contour[(i + 1) % contour.length] as [number, number];
      if (y0 > py !== y1 > py && px < x0 + ((py - y0) * (x1 - x0)) / (y1 - y0)) inside = !inside;
    });
  }
  return inside;
}

/** The outer contour of a section: the one whose bounding box is the largest. */
export function outerContour(contours: [number, number][][]): { width: number; depth: number; area: number } {
  let best = { width: 0, depth: 0, area: 0 };
  for (const contour of contours) {
    const xs = contour.map(([x]) => x);
    const ys = contour.map(([, y]) => y);
    const [width, depth] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    if (width * depth > best.width * best.depth) best = { width, depth, area: Math.abs(shoelaceArea(contour)) };
  }
  return best;
}

/** A disc seen from above: centre and radius, in millimetres. */
export interface Disc {
  x: number;
  y: number;
  radius: number;
}

/**
 * Area of the part of section `a` that is neither in section `b` nor in any of `discs`,
 * in mm²: zero when everything `a` has more than `b` lies in the discs. Sections are the
 * contours of `MeshCheck.sections`.
 */
export async function areaOutside(a: [number, number][][], b: [number, number][][], discs: readonly Disc[] = []): Promise<number> {
  const manifold = await manifoldModule();
  const owned: { delete(): void }[] = [];
  const own = <T extends { delete(): void }>(object: T) => {
    owned.push(object);
    return object;
  };
  try {
    let rest = own(own(new manifold.CrossSection(a, "EvenOdd")).subtract(own(new manifold.CrossSection(b, "EvenOdd"))));
    for (const { x, y, radius } of discs) {
      rest = own(rest.subtract(own(own(manifold.CrossSection.circle(radius, 256)).translate([x, y]))));
    }
    return rest.area();
  } finally {
    for (const object of owned) object.delete();
  }
}

/** Area of a section (the contours of `MeshCheck.sections`), in mm². */
export async function sectionArea(contours: [number, number][][]): Promise<number> {
  const manifold = await manifoldModule();
  const section = new manifold.CrossSection(contours, "EvenOdd");
  try {
    return section.area();
  } finally {
    section.delete();
  }
}

/**
 * Radius of the largest disc the holes of a section around `point` can hold, to the
 * hundredth of a millimetre: 0 when `point` is in the material. A hole is the empty part of
 * the section inside its outer contour.
 */
export async function holeReach(contours: [number, number][][], point: [number, number]): Promise<number> {
  const manifold = await manifoldModule();
  const owned: { delete(): void }[] = [];
  const own = <T extends { delete(): void }>(object: T) => {
    owned.push(object);
    return object;
  };
  try {
    const material = own(new manifold.CrossSection(contours, "EvenOdd"));
    const bounds = material.bounds();
    const box = own(manifold.CrossSection.square([bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]]).translate([bounds.min[0], bounds.min[1]]));
    const holes = own(box.subtract(material));
    const hole = holes.decompose().map(own).find((piece) => inSection(piece.toPolygons() as [number, number][][], point));
    if (!hole) return 0;
    let reach = 0;
    for (let radius = 0.01; !own(hole.offset(-radius, "Round")).isEmpty(); radius += 0.01) reach = radius;
    return Math.round(reach * 100) / 100;
  } finally {
    for (const object of owned) object.delete();
  }
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

/**
 * Entries of a zip archive, read through its central directory and inflated by zlib (the
 * library most slicers read 3MF with); the CRC-32 and size of every entry are checked.
 */
export function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.byteLength - 22;
  if (view.getUint32(end, true) !== 0x06054b50) throw new Error("zip: no end of central directory");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files: Record<string, Uint8Array> = {};
  for (let entry = 0; entry < count; entry++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("zip: bad central directory header");
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const compressedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;

    if (view.getUint32(offset, true) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`);
    const dataAt = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    const stored = bytes.subarray(dataAt, dataAt + compressedSize);
    const data = method === 8 ? new Uint8Array(inflateRawSync(stored)) : stored;
    if (data.byteLength !== size) throw new Error(`zip: ${name} is ${data.byteLength} bytes, not ${size}`);
    if (crc32(data) !== crc) throw new Error(`zip: CRC-32 mismatch for ${name}`);
    files[name] = data;
  }
  return files;
}

/** What a 3MF package holds, as read back by `readThreeMf`. */
export interface ThreeMfContent {
  /** Paths of the parts of the package (zip entries). */
  parts: string[];
  /** Target of the package relationship to the 3D model. */
  modelTarget: string | undefined;
  /** Content type declared for the `.model` extension. */
  modelContentType: string | undefined;
  unit: string | undefined;
  /** `name` of each object of the model. */
  objectNames: string[];
  /** Object ids referenced by the build items. */
  buildItems: string[];
  /** Translation of the first build item (its `transform`), zero without one. */
  placement: [number, number, number];
  /** Translation of each build item, in order. */
  placements: [number, number, number][];
  /** Model metadata, by name, with XML entities decoded. */
  metadata: Map<string, string>;
  /** The mesh of the first object, as stored (without the build item transform). */
  mesh: TriangleMesh;
  /** Every object, its name and its mesh as stored, in order. */
  objects: { name: string; mesh: TriangleMesh }[];
}

/** Translation of a 3MF transform (`m00 m01 m02 … m30 m31 m32`), which must not rotate nor scale. */
function placementOf(transform: string | undefined): [number, number, number] {
  if (transform === undefined) return [0, 0, 0];
  const matrix = transform.trim().split(/\s+/).map(Number);
  if (matrix.slice(0, 9).join(" ") !== "1 0 0 0 1 0 0 0 1") throw new Error(`Unexpected transform: ${transform}`);
  return matrix.slice(9, 12) as [number, number, number];
}

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * Unzips a 3MF package and reads its model back: an independent reader for the tests,
 * which follows the package relationships (3MF core specification) rather than assuming
 * where the model lives.
 */
export function readThreeMf(bytes: Uint8Array): ThreeMfContent {
  const files = readZip(bytes);
  const text = (path: string) => {
    const file = files[path];
    if (!file) throw new Error(`3MF part missing: ${path}`);
    return new TextDecoder().decode(file);
  };
  const contentTypes = text("[Content_Types].xml");
  const rels = text("_rels/.rels");
  const modelTarget = /<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bType="http:\/\/schemas\.microsoft\.com\/3dmanufacturing\/2013\/01\/3dmodel"/.exec(rels)?.[1]
    ?? /<Relationship\b[^>]*\bType="http:\/\/schemas\.microsoft\.com\/3dmanufacturing\/2013\/01\/3dmodel"[^>]*\bTarget="([^"]+)"/.exec(rels)?.[1];
  const modelContentType = /<Default\b[^>]*\bExtension="model"[^>]*\bContentType="([^"]+)"/.exec(contentTypes)?.[1];
  const xml = text((modelTarget ?? "").replace(/^\//, ""));

  const metadata = new Map<string, string>();
  for (const [, name, value] of xml.matchAll(/<metadata\b[^>]*\bname="([^"]+)"[^>]*>([^<]*)<\/metadata>/g)) {
    metadata.set(decodeXml(name as string), decodeXml(value as string));
  }
  const meshOf = (objectXml: string): TriangleMesh => {
    const positions: number[] = [];
    for (const [, x, y, z] of objectXml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\s*\/>/g)) {
      positions.push(Number(x), Number(y), Number(z));
    }
    const indices: number[] = [];
    for (const [, a, b, c] of objectXml.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\s*\/>/g)) {
      indices.push(Number(a), Number(b), Number(c));
    }
    return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
  };
  const objects = [...xml.matchAll(/<object\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/object>/g)].map(([, name, body]) => ({
    name: decodeXml(name as string),
    mesh: meshOf(body as string),
  }));
  return {
    parts: Object.keys(files),
    modelTarget,
    modelContentType,
    unit: /<model\b[^>]*\bunit="([^"]+)"/.exec(xml)?.[1],
    objectNames: [...xml.matchAll(/<object\b[^>]*\bname="([^"]*)"/g)].map(([, name]) => decodeXml(name as string)),
    buildItems: [...xml.matchAll(/<item\b[^>]*\bobjectid="([^"]+)"/g)].map(([, id]) => id as string),
    placement: placementOf(/<item\b[^>]*\btransform="([^"]+)"/.exec(xml)?.[1]),
    placements: [...xml.matchAll(/<item\b[^>]*\btransform="([^"]+)"/g)].map(([, transform]) => placementOf(transform)),
    metadata,
    mesh: objects[0]?.mesh ?? { positions: new Float32Array(0), indices: new Uint32Array(0) },
    objects,
  };
}

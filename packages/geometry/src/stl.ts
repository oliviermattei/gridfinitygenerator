import type { TriangleMesh } from "./baseplate";

const HEADER_BYTES = 80;
const TRIANGLE_BYTES = 50;

/** Serialises a mesh as binary STL (little-endian, millimetres, facet normals computed). */
export function serializeStl(mesh: TriangleMesh, name = "baseplate"): Uint8Array {
  const { positions, indices } = mesh;
  const count = indices.length / 3;
  const bytes = new Uint8Array(HEADER_BYTES + 4 + count * TRIANGLE_BYTES);
  const view = new DataView(bytes.buffer);
  // ASCII header; it must not start with "solid", which marks an ASCII STL.
  const header = `binary STL: ${name}`.slice(0, HEADER_BYTES);
  for (let i = 0; i < header.length; i++) bytes[i] = header.charCodeAt(i) & 0x7f;
  view.setUint32(HEADER_BYTES, count, true);

  let at = HEADER_BYTES + 4;
  for (let t = 0; t < count; t++) {
    const a = (indices[3 * t] as number) * 3;
    const b = (indices[3 * t + 1] as number) * 3;
    const c = (indices[3 * t + 2] as number) * 3;
    const [ax, ay, az] = [positions[a] as number, positions[a + 1] as number, positions[a + 2] as number];
    const [bx, by, bz] = [positions[b] as number, positions[b + 1] as number, positions[b + 2] as number];
    const [cx, cy, cz] = [positions[c] as number, positions[c + 1] as number, positions[c + 2] as number];
    const [ux, uy, uz] = [bx - ax, by - ay, bz - az];
    const [vx, vy, vz] = [cx - ax, cy - ay, cz - az];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const length = Math.hypot(nx, ny, nz) || 1;
    for (const value of [nx / length, ny / length, nz / length, ax, ay, az, bx, by, bz, cx, cy, cz]) {
      view.setFloat32(at, value, true);
      at += 4;
    }
    at += 2; // attribute byte count, left at 0
  }
  return bytes;
}

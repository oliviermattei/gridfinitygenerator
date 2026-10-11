/**
 * Normals of a triangle mesh for display, smooth across the facets of a curved surface (a
 * fillet, a scoop, a rounded corner) and sharp across a real edge: at each corner of a
 * triangle, the normals of the triangles around the vertex that face within `creaseDegrees`
 * of it are averaged, weighted by their area. The mesh comes out unshared, three vertices per
 * triangle, each with its own normal. Display only: the exported mesh does not change.
 */
export function creasedNormals(
  positions: Float32Array,
  indices: Uint32Array,
  creaseDegrees: number,
): { positions: Float32Array; normals: Float32Array } {
  const triangles = indices.length / 3;
  const vertices = positions.length / 3;
  // Area-weighted normal of each triangle (its cross product), and its unit direction.
  const faces = new Float32Array(triangles * 3);
  const units = new Float32Array(triangles * 3);
  for (let t = 0; t < triangles; t++) {
    const a = 3 * (indices[3 * t] as number);
    const b = 3 * (indices[3 * t + 1] as number);
    const c = 3 * (indices[3 * t + 2] as number);
    const [ux, uy, uz] = [(positions[b] as number) - (positions[a] as number), (positions[b + 1] as number) - (positions[a + 1] as number), (positions[b + 2] as number) - (positions[a + 2] as number)];
    const [vx, vy, vz] = [(positions[c] as number) - (positions[a] as number), (positions[c + 1] as number) - (positions[a + 1] as number), (positions[c + 2] as number) - (positions[a + 2] as number)];
    const [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    faces[3 * t] = nx;
    faces[3 * t + 1] = ny;
    faces[3 * t + 2] = nz;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    units[3 * t] = nx / length;
    units[3 * t + 1] = ny / length;
    units[3 * t + 2] = nz / length;
  }
  // The triangles around each vertex, as compressed rows.
  const counts = new Uint32Array(vertices + 1);
  for (let k = 0; k < indices.length; k++) (counts[(indices[k] as number) + 1] as number)++;
  for (let v = 0; v < vertices; v++) counts[v + 1] = (counts[v + 1] as number) + (counts[v] as number);
  const around = new Uint32Array(indices.length);
  const fill = counts.slice(0, vertices);
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k] as number;
    around[(fill[v] as number)++] = Math.floor(k / 3);
  }
  const cosine = Math.cos((creaseDegrees * Math.PI) / 180);
  const outPositions = new Float32Array(indices.length * 3);
  const normals = new Float32Array(indices.length * 3);
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k] as number;
    const t = Math.floor(k / 3);
    const ox = units[3 * t] as number;
    const oy = units[3 * t + 1] as number;
    const oz = units[3 * t + 2] as number;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let r = counts[v] as number; r < (counts[v + 1] as number); r++) {
      const other = around[r] as number;
      const dot = ox * (units[3 * other] as number) + oy * (units[3 * other + 1] as number) + oz * (units[3 * other + 2] as number);
      if (dot < cosine) continue;
      sx += faces[3 * other] as number;
      sy += faces[3 * other + 1] as number;
      sz += faces[3 * other + 2] as number;
    }
    const length = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    normals[3 * k] = sx / length;
    normals[3 * k + 1] = sy / length;
    normals[3 * k + 2] = sz / length;
    outPositions[3 * k] = positions[3 * v] as number;
    outPositions[3 * k + 1] = positions[3 * v + 1] as number;
    outPositions[3 * k + 2] = positions[3 * v + 2] as number;
  }
  return { positions: outPositions, normals };
}

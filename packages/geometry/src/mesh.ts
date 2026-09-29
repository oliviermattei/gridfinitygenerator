/**
 * Indexed triangle mesh in millimetres, ready to transfer and render. Triangles are
 * counter-clockwise seen from outside. Axes: +X right, +Y back of the drawer, +Z up; the
 * baseplate is centred on the origin in XY and stands on z = 0.
 */
export interface TriangleMesh {
  /** x, y, z per vertex. */
  positions: Float32Array;
  /** Three vertex indices per triangle. */
  indices: Uint32Array;
}

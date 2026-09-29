// Public entry point of the geometry engine (ADR 0003): pure TypeScript on top of
// manifold-3d, with no dependency on React, the DOM or the app.
export {
  CELLS_PER_AXIS,
  STANDARD_CELL_SIZE_MM,
  clampCellCount,
  generateBaseplate,
  loadEngine,
  type AssemblyStrategy,
  type Baseplate,
  type BaseplateLayout,
  type BaseplateSettings,
  type BaseplateStats,
  type GenerateOptions,
  type Quality,
  type TriangleMesh,
} from "./baseplate";
export { serializeStl } from "./stl";

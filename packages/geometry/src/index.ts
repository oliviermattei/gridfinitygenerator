// Public entry point of the geometry engine (ADR 0003): pure TypeScript on top of
// manifold-3d, with no dependency on React, the DOM or the app.
export {
  STANDARD_CELL_SIZE_MM,
  generateBaseplate,
  loadEngine,
  type AssemblyStrategy,
  type Baseplate,
  type BaseplateLayout,
  type BaseplateStats,
  type GenerateOptions,
  type Quality,
  type TriangleMesh,
} from "./baseplate";
export {
  BASEPLATE_SETTINGS,
  DEFAULT_SETTINGS,
  clampSettings,
  type BaseplateSettings,
  type NumericSetting,
} from "./settings";
export { fitsOnBuildPlate, roundUpToLayer, type BuildPlate } from "./print";
export { serializeStl } from "./stl";

// Public entry point of the geometry engine (ADR 0003): pure TypeScript on top of
// manifold-3d, with no dependency on React, the DOM or the app.
export {
  STANDARD_CELL_SIZE_MM,
  generateBaseplate,
  loadEngine,
  type AssemblyStrategy,
  type Baseplate,
  type BaseplateLayout,
  type Margins,
  type BaseplateStats,
  type GenerateOptions,
  type Quality,
  type TriangleMesh,
} from "./baseplate";
export {
  ALIGNMENTS,
  BASEPLATE_SETTINGS,
  DEFAULT_SETTINGS,
  clampSettings,
  type Alignment,
  type BaseplateSettings,
  type ChoiceSetting,
  type FlagSetting,
  type NumericSetting,
  type SizeMode,
} from "./settings";
export {
  decodeSettings,
  encodeSettings,
  openingSettings,
  readShareLink,
  type ShareLinkSettings,
} from "./share-link";
export { fitsOnBuildPlate, narrowMargin, roundUpToLayer, type BuildPlate } from "./print";
export { serializeStl } from "./stl";
export { serialize3mf, type ThreeMfOptions } from "./three-mf";

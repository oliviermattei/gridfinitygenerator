// Public entry point of the geometry engine (ADR 0003): pure TypeScript on top of
// manifold-3d, with no dependency on React, the DOM or the app.
export {
  generateBaseplate,
  generateTestKit,
  loadEngine,
  type AssemblyStrategy,
  type Baseplate,
  type BaseplateLayout,
  type BaseplatePiece,
  type PiecePlan,
  type SplitPlan,
  type Margins,
  type BaseplateStats,
  type GenerateOptions,
  type Quality,
  type TriangleMesh,
} from "./baseplate";
export {
  ADVANCED_SETTINGS,
  ALIGNMENTS,
  BASEPLATE_SETTINGS,
  DEFAULT_SETTINGS,
  STANDARD_CELL_SIZE_MM,
  changedAdvancedSettings,
  clampSettings,
  type AdvancedSetting,
  type Alignment,
  type BaseplateSettings,
  type ChoiceSetting,
  type FlagSetting,
  type NumericSetting,
  type PocketProfileName,
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
export { PRINT_GAP_MM, pieceMesh, printPieces, spreadPieces } from "./pieces";
export { serializeStl } from "./stl";
export { serialize3mf, type ThreeMfObject, type ThreeMfOptions } from "./three-mf";
export { zipFiles } from "./zip";

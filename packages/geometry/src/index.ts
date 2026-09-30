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
  type ClipLayout,
  type PiecePlan,
  type SplitPlan,
  type Margins,
  type BaseplateStats,
  type GenerateOptions,
  type Quality,
  type TriangleMesh,
} from "./baseplate";
export { BASEPLATE_TYPES, takesClips, trayFloorOf, type BaseplateType, type TrayFloor } from "./baseplate-type";
export { skeletonOf, type Skeleton } from "./skeleton";
export { clickbaseOf, type Clickbase } from "./clickbase";
export { POCKET_PROFILES, type PocketProfile } from "./pocket-profile";
export {
  ADVANCED_SETTINGS,
  ALIGNMENTS,
  BASEPLATE_SETTINGS,
  DEFAULT_SETTINGS,
  MARGIN_SHAPES,
  STANDARD_CELL_SIZE_MM,
  changedAdvancedSettings,
  clampSettings,
  type AdvancedSetting,
  type Alignment,
  type BaseplateSettings,
  type ChoiceSetting,
  type FlagSetting,
  type MarginShape,
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
export { PRINT_GAP_MM, pieceMesh, printClips, printPieces, spreadPieces } from "./pieces";
export type { ClipPlacement, ClipSlot } from "./clips";
export { serializeStl } from "./stl";
export { serialize3mf, type ThreeMfObject, type ThreeMfOptions } from "./three-mf";
export { zipFiles } from "./zip";
export {
  EAR_RADIUS_MM,
  PIN_DIAMETER_MM,
  STACK_MAX_LAYER_MM,
  printStacks,
  stackPitch,
  stackPlanOf,
  stackRuleOf,
  type PrintedStack,
  type StackBlocker,
  type StackFlip,
  type StackOptions,
  type StackPlan,
  type StackWarning,
  type StackedPiece,
} from "./stack";

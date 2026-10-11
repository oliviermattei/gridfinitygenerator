import {
  binFitsOn,
  fitsOnBuildPlate,
  generateBaseplate,
  generateBin,
  generateClip,
  generateTestKit,
  meshDimensions,
  meshVolume,
  orientStacks,
  printPieces,
  printStacks,
  stackPlanOf,
  stackRuleOf,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
  type StackOptions,
  type TriangleMesh,
} from "@repo/geometry";
import { articleBaseplateSettings, articleBinSettings, type Article } from "../basket";
import type { Material } from "../mass";

/**
 * What the basket shows of one exemplar of an article (#41, ADR 0024), measured on its model
 * computed again from its share link in final quality, as its download will be: never an
 * estimate. Runs in the basket's worker (basket.worker.ts), and in the tests.
 */
export interface ArticleMeasure {
  /** Bounding box of the model, in millimetres; a cut baseplate assembled. */
  dimensions: { width: number; depth: number; height: number };
  /** Its material, in mm³: the pieces, and the clips (a clip alone is all clips). */
  material: Material;
  /** Pieces it prints in: more than 1 for a baseplate cut for the build plate. */
  pieces: number;
  /**
   * Whether it fits on the build plate, as its generator tells: a bin by its footprint, a
   * baseplate by each of its pieces. One that does not is left out of the download.
   */
  fits: boolean;
  /**
   * The objects one exemplar lays on the plates (#42): itself, or its pieces, or its stacks when
   * printed stacked; none for a clip alone, whose clip joins the block of clips.
   */
  parts: ArticlePart[];
  /** The clips of one exemplar, which join the block of all the clips of the basket; null without. */
  clips: { width: number; depth: number; count: number } | null;
}

/** An object of the rangement: its footprint as it prints, measured on its mesh. */
export interface ArticlePart {
  /** The whole model, a piece of a cut baseplate, or a stack of its pieces. */
  kind: "whole" | "piece" | "stack";
  /** The numbers of its pieces: one for a piece, those of a stack, none for a whole model. */
  numbers: number[];
  width: number;
  depth: number;
}

/** How the pieces of a cut baseplate print stacked (the preference), or null for side by side. */
export type StackChoice = Pick<StackOptions, "ears" | "pins">;

/** An article computed: its measure, and the meshes of what it lays on the plates (#43: the download). */
export interface ComputedArticle {
  measure: ArticleMeasure;
  /** The mesh of each of its `measure.parts`, in order, as it prints. */
  parts: TriangleMesh[];
  /** One of its clips, as it prints; null without. */
  clip: TriangleMesh | null;
}

/** The objects of a model printed whole: itself. */
const whole = (mesh: TriangleMesh, { width, depth }: { width: number; depth: number }) => ({
  parts: [{ kind: "whole", numbers: [], width, depth }] as ArticlePart[],
  meshes: [mesh],
});

/**
 * The objects a baseplate prints in: itself uncut; its pieces as `printPieces` lays them; its
 * stacks as `printStacks` makes them when stacked and the baseplate allows it (the export's way).
 */
async function baseplateParts(baseplate: Baseplate, settings: BaseplateSettings, stack: StackChoice | null): Promise<{ parts: ArticlePart[]; meshes: TriangleMesh[] }> {
  if (baseplate.pieces.length <= 1) return whole(baseplate.mesh, baseplate.stats.dimensions);
  if (stack && stackRuleOf(settings, baseplate.layout).blockers.length === 0) {
    const plan = await orientStacks(baseplate, stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, settings.layerHeight));
    const stacks = await printStacks(baseplate, plan, { ...stack, layerHeight: settings.layerHeight, lineWidth: settings.lineWidth });
    return { parts: stacks.map(({ mesh, pieces }) => ({ kind: "stack", numbers: pieces, ...meshDimensions(mesh) })), meshes: stacks.map(({ mesh }) => mesh) };
  }
  const meshes = printPieces(baseplate);
  return { parts: meshes.map((mesh, index) => ({ kind: "piece", numbers: [baseplate.pieces[index]?.number ?? index + 1], ...meshDimensions(mesh) })), meshes };
}

/**
 * Computes an article in final quality, a baseplate cut for `buildPlate` as its generator cuts
 * it, and its pieces stacked as `stack` asks when it allows it: what it measures, and its meshes.
 */
export async function computeArticle({ model, link }: Pick<Article, "model" | "link">, buildPlate: BuildPlate, stack: StackChoice | null = null): Promise<ComputedArticle> {
  const article = { id: "", model, link, quantity: 1 };
  switch (model) {
    case "bin": {
      const settings = articleBinSettings(article);
      const { stats, mesh } = await generateBin(settings, "final");
      const { parts, meshes } = whole(mesh, stats.dimensions);
      return {
        measure: { dimensions: stats.dimensions, material: { volume: stats.volume as number, clips: 0 }, pieces: 1, fits: binFitsOn(settings, buildPlate), parts, clips: null },
        parts: meshes,
        clip: null,
      };
    }
    case "baseplate": {
      const settings = articleBaseplateSettings(article);
      const baseplate = await generateBaseplate(settings, "final", { buildPlate });
      const { stats, pieces, clip } = baseplate;
      const { parts, meshes } = await baseplateParts(baseplate, settings, stack);
      const clips = clip && stats.clips > 0 ? clip : null;
      return {
        measure: {
          dimensions: stats.dimensions,
          material: { volume: stats.volume as number, clips: stats.clipsVolume as number },
          pieces: stats.pieces,
          fits: pieces.every((piece) => fitsOnBuildPlate(piece.dimensions, buildPlate)),
          parts,
          clips: clips ? { ...meshDimensions(clips), count: stats.clips } : null,
        },
        parts: meshes,
        clip: clips,
      };
    }
    case "test-kit": {
      const { stats, mesh } = await generateTestKit(articleBaseplateSettings(article), "final");
      const { parts, meshes } = whole(mesh, stats.dimensions);
      return {
        measure: { dimensions: stats.dimensions, material: { volume: stats.volume as number, clips: 0 }, pieces: 1, fits: fitsOnBuildPlate(stats.dimensions, buildPlate), parts, clips: null },
        parts: meshes,
        clip: null,
      };
    }
    case "clip": {
      const clip = await generateClip(articleBaseplateSettings(article));
      const dimensions = meshDimensions(clip);
      return {
        measure: {
          dimensions,
          material: { volume: 0, clips: meshVolume(clip) },
          pieces: 1,
          fits: fitsOnBuildPlate(dimensions, buildPlate),
          parts: [],
          clips: { width: dimensions.width, depth: dimensions.depth, count: 1 },
        },
        parts: [],
        clip,
      };
    }
  }
}

/**
 * Measures an article, a baseplate cut for `buildPlate` as its generator cuts it, and its pieces
 * stacked as `stack` asks when it allows it.
 */
export async function measureArticle(article: Pick<Article, "model" | "link">, buildPlate: BuildPlate, stack: StackChoice | null = null): Promise<ArticleMeasure> {
  return (await computeArticle(article, buildPlate, stack)).measure;
}

import {
  binFitsOn,
  fitsOnBuildPlate,
  generateBaseplate,
  generateBin,
  generateClip,
  generateTestKit,
  meshDimensions,
  meshVolume,
  type BuildPlate,
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
}

/** Measures an article, a baseplate cut for `buildPlate` as its generator cuts it. */
export async function measureArticle({ model, link }: Pick<Article, "model" | "link">, buildPlate: BuildPlate): Promise<ArticleMeasure> {
  const article = { id: "", model, link, quantity: 1 };
  switch (model) {
    case "bin": {
      const settings = articleBinSettings(article);
      const { stats } = await generateBin(settings, "final");
      return { dimensions: stats.dimensions, material: { volume: stats.volume as number, clips: 0 }, pieces: 1, fits: binFitsOn(settings, buildPlate) };
    }
    case "baseplate": {
      const { stats, pieces } = await generateBaseplate(articleBaseplateSettings(article), "final", { buildPlate });
      return {
        dimensions: stats.dimensions,
        material: { volume: stats.volume as number, clips: stats.clipsVolume as number },
        pieces: stats.pieces,
        fits: pieces.every((piece) => fitsOnBuildPlate(piece.dimensions, buildPlate)),
      };
    }
    case "test-kit": {
      const { stats } = await generateTestKit(articleBaseplateSettings(article), "final");
      return { dimensions: stats.dimensions, material: { volume: stats.volume as number, clips: 0 }, pieces: 1, fits: fitsOnBuildPlate(stats.dimensions, buildPlate) };
    }
    case "clip": {
      const clip = await generateClip(articleBaseplateSettings(article));
      const dimensions = meshDimensions(clip);
      return { dimensions, material: { volume: 0, clips: meshVolume(clip) }, pieces: 1, fits: fitsOnBuildPlate(dimensions, buildPlate) };
    }
  }
}

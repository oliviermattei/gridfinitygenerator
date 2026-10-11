import { serialize3mf, serializeBambu3mf, serializeStl, zipFiles, type BambuPlate, type BuildPlate, type ThreeMfObject, type TriangleMesh } from "@repo/geometry";
import { articleLayerHeight, type Article } from "../basket";
import { bambuSettings, type BambuTarget } from "../printers/bambu";
import { computeArticle, type ComputedArticle, type StackChoice } from "./article-measure";
import type { ExportFormat } from "./protocol";

/**
 * The download of the basket (#43, ADR 0024): each article computed once in final quality, as
 * its measure was, then each of its objects copied where the rangement put it, one plate of the
 * file per plate of the rangement. With a Bambu Lab printer, a Bambu Studio project; with
 * « Autre », a ZIP of a 3MF per plate; in STL, a ZIP of an STL per plate. Runs in a worker of the
 * basket (basket.worker.ts), and in the tests.
 */

/** One object of a plate of the file, and what it is made of. */
export interface DownloadObject {
  name: string;
  /** The absolute share link of its article. */
  description: string;
  articleId: string;
  /**
   * One of the parts of an exemplar of its article (its index in `ArticleMeasure.parts`), or
   * its clips in the block of clips: the front left corner of each one in the block.
   */
  source: { kind: "part"; index: number } | { kind: "clips"; at: { x: number; y: number }[] };
  /** Where the box of its frame lies on the plate, from the front left of the plate. */
  x: number;
  y: number;
  /** Turned a quarter: the width of its frame along the depth of the plate. */
  turned: boolean;
  /** Its frame, unturned: the block of clips for clips; null for a part, its own box. */
  frame: { width: number; depth: number } | null;
}

export interface DownloadPlate {
  name: string;
  objects: DownloadObject[];
}

/** What the download writes: the articles to compute, and each plate of the rangement. */
export interface BasketDownloadPlan {
  articles: Pick<Article, "id" | "model" | "link">[];
  plates: DownloadPlate[];
  /** The absolute link of the basket (#44), the description of the files. */
  link: string;
}

export interface BasketDownloadOptions {
  /** The build plate the articles were measured and laid out for. */
  buildPlate: BuildPlate;
  /** How the pieces of a cut baseplate print stacked, as they were measured. */
  stack: StackChoice | null;
  format: ExportFormat;
  /** The Bambu Lab printer of the preferences, or null for « Autre ». */
  bambu: BambuTarget | null;
}

export interface BasketFile {
  bytes: Uint8Array;
  /** Without its extension: `panier-{n}-plateaux`. */
  name: string;
  extension: "3mf" | "zip";
}

/** The mesh moved by `dx`, `dy`, `dz`; its triangles shared. */
function moved({ positions, indices }: TriangleMesh, dx: number, dy: number, dz: number): TriangleMesh {
  const copy = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    copy[i] = positions[i]! + dx;
    copy[i + 1] = positions[i + 1]! + dy;
    copy[i + 2] = positions[i + 2]! + dz;
  }
  return { positions: copy, indices };
}

/** The lowest X, Y and Z of a mesh. */
function minimumOf({ positions }: TriangleMesh): [number, number, number] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  for (let i = 0; i < positions.length; i++) if (positions[i]! < min[i % 3]!) min[i % 3] = positions[i]!;
  return min;
}

/** The largest Y of a mesh. */
function depthOf({ positions }: TriangleMesh): number {
  let max = -Infinity;
  for (let i = 1; i < positions.length; i += 3) if (positions[i]! > max) max = positions[i]!;
  return max;
}

/** The mesh in its own frame: its box from the origin, set down on z = 0. */
function framed(mesh: TriangleMesh): TriangleMesh {
  const [x, y, z] = minimumOf(mesh);
  return moved(mesh, -x, -y, -z);
}

/** One mesh of several, their triangles renumbered. */
function joined(meshes: readonly TriangleMesh[]): TriangleMesh {
  const positions = new Float32Array(meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0));
  const indices = new Uint32Array(meshes.reduce((sum, mesh) => sum + mesh.indices.length, 0));
  let vertex = 0;
  let index = 0;
  for (const mesh of meshes) {
    positions.set(mesh.positions, vertex * 3);
    for (let i = 0; i < mesh.indices.length; i++) indices[index + i] = mesh.indices[i]! + vertex;
    vertex += mesh.positions.length / 3;
    index += mesh.indices.length;
  }
  return { positions, indices };
}

/**
 * A mesh of a frame laid on the plate: its box at (`x`, `y`) from the front left of the plate,
 * turned a quarter about Z when asked (its width then along the depth of the plate).
 */
function laid(mesh: TriangleMesh, frameDepth: number, { x, y, turned }: Pick<DownloadObject, "x" | "y" | "turned">): TriangleMesh {
  if (!turned) return moved(mesh, x, y, 0);
  const { positions, indices } = mesh;
  const copy = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    // (u, v) → (−v, u), then the box brought back to x ≥ 0: a rotation keeps the triangles' winding.
    copy[i] = x + frameDepth - positions[i + 1]!;
    copy[i + 1] = y + positions[i]!;
    copy[i + 2] = positions[i + 2]!;
  }
  return { positions: copy, indices };
}

/** The mesh of an object where it lies on its plate. */
function objectMesh(object: DownloadObject, computed: ComputedArticle): TriangleMesh {
  if (object.source.kind === "part") {
    const part = computed.parts[object.source.index];
    if (!part) throw new Error(`No part ${object.source.index} of article ${object.articleId}`);
    const own = framed(part);
    return laid(own, depthOf(own), object);
  }
  if (!computed.clip || !object.frame) throw new Error(`No clip of article ${object.articleId}`);
  const clip = framed(computed.clip);
  const block = joined(object.source.at.map(({ x, y }) => moved(clip, x, y, 0)));
  return laid(block, object.frame.depth, object);
}

/** The layer height most objects of the plan print at: that of the project. */
function projectLayerHeight(plan: BasketDownloadPlan): number {
  const articles = new Map(plan.articles.map((article) => [article.id, article]));
  const counts = new Map<number, number>();
  for (const plate of plan.plates)
    for (const object of plate.objects) {
      const height = articleLayerHeight(articles.get(object.articleId)!);
      counts.set(height, (counts.get(height) ?? 0) + 1);
    }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0.2;
}

/** `panier-3-plateaux`, `panier-1-plateau`. */
export function basketFileName(plates: number): string {
  return `panier-${plates}-plateau${plates > 1 ? "x" : ""}`;
}

/**
 * Writes the file of the basket: computes each article of the plan once (telling `onProgress`
 * how many are done of how many), then lays each object on its plate.
 */
export async function writeBasketDownload(plan: BasketDownloadPlan, options: BasketDownloadOptions, onProgress?: (done: number, total: number) => void): Promise<BasketFile> {
  const total = plan.articles.length;
  onProgress?.(0, total);
  const computed = new Map<string, ComputedArticle>();
  for (const article of plan.articles) {
    computed.set(article.id, await computeArticle(article, options.buildPlate, options.stack));
    onProgress?.(computed.size, total);
  }

  const plates = plan.plates.map((plate) => ({
    name: plate.name,
    objects: plate.objects.map((object): ThreeMfObject => {
      const article = computed.get(object.articleId);
      if (!article) throw new Error(`Article ${object.articleId} is not in the plan`);
      return { mesh: objectMesh(object, article), name: object.name, description: object.description };
    }),
  }));
  const name = basketFileName(plates.length);

  if (options.format === "stl") {
    const files = plates.map((plate, index): [string, Uint8Array] => [`panier-plateau-${index + 1}.stl`, serializeStl(joined(plate.objects.map(({ mesh }) => mesh)))]);
    return { bytes: zipFiles(files), name, extension: "zip" };
  }
  // A Bambu Studio project when the printer is a Bambu Lab one and Bambu has its presets (ADR 0023).
  const projectSettings = options.bambu ? await bambuSettings(options.bambu, projectLayerHeight(plan)) : null;
  if (projectSettings) {
    const bambuPlates: BambuPlate[] = plates;
    return { bytes: serializeBambu3mf(bambuPlates, { name, shareLink: plan.link, projectSettings, keepPositions: true }), name, extension: "3mf" };
  }
  const files = plates.map((plate, index): [string, Uint8Array] => [
    `panier-plateau-${index + 1}.3mf`,
    serialize3mf(plate.objects, { name: plate.name, shareLink: plan.link, keepPositions: true }),
  ]);
  return { bytes: zipFiles(files), name, extension: "zip" };
}

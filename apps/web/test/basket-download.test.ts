import { writeFileSync } from "node:fs";
import { generateBaseplate, generateBin, meshVolume, printPieces, searchPacking, type BuildPlate, type PackedPlate, type TriangleMesh } from "@repo/geometry";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, test } from "vitest";
import { articleShareLink, type Article } from "../lib/basket";
import { basketDownloadPlan, basketPackingOf, type BasketPacking } from "../lib/basket-packing";
import { measureArticle, type ArticleMeasure } from "../lib/engine/article-measure";
import { writeBasketDownload, type BasketDownloadPlan } from "../lib/engine/basket-download";
import { STRINGS } from "../lib/strings";

// The download of the basket (#43, ADR 0024): its articles computed once each in final quality,
// as many exemplars as their quantity, each object where the rangement put it, one plate of the
// file per plate of the rangement; read back through the files themselves.

const t = STRINGS.fr;
const PLATE: BuildPlate = { width: 256, depth: 256 };
const P1S = { printer: "bambu-p1s", nozzle: 0.4, filament: "pla" } as const;
/** Gap between two plates of Bambu Studio: a fifth of the bed. */
const STRIDE = 256 * 1.2;
const ORIGIN = "https://example.test";

// A mixed basket: the default baseplate, cut in 4 pieces with 8 clips on a 256 mm plate, and 6 bins.
const baseplate: Article = { id: "plate", model: "baseplate", link: "v=1", quantity: 1 };
const bins: Article = { id: "bins", model: "bin", link: "v=1", quantity: 6 };
const articles = [baseplate, bins];

let measures: Map<string, ArticleMeasure>;
let basket: BasketPacking;
let plates: PackedPlate[];
let plan: BasketDownloadPlan;

const nameOf = (id: string) => (id === "plate" ? "Baseplate 399 × 279" : "Bin 2×1, 3 U");
const linkOf = (article: Article) => articleShareLink(article, ORIGIN, "fr");

beforeAll(async () => {
  measures = new Map();
  for (const article of articles) measures.set(article.id, await measureArticle(article, PLATE));
  basket = basketPackingOf(articles, (article) => measures.get(article.id), "fewest-plates")!;
  plates = searchPacking({ items: basket.items, plate: PLATE, excludedCorner: { width: 18, depth: 28 } }).packing.plates;
  plan = basketDownloadPlan(articles, basket, plates, "fewest-plates", { nameOf, linkOf, t, basketLink: `${ORIGIN}/fr/panier?p=1.x` });
}, 120_000);

interface ReadObject {
  name: string;
  description: string | undefined;
  mesh: TriangleMesh;
  /** Translation of its build item. */
  offset: [number, number, number];
}

/** The objects of a 3MF model, as written, with their build items. */
function readModel(xml: string): ReadObject[] {
  const offsets = [...xml.matchAll(/<item\b[^>]*\btransform="([^"]+)"/g)].map(([, transform]) => {
    const matrix = transform!.split(" ").map(Number);
    expect(matrix.slice(0, 9)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    return matrix.slice(9, 12) as [number, number, number];
  });
  return [...xml.matchAll(/<object\b[^>]*\bname="([^"]*)"[^>]*>([\s\S]*?)<\/object>/g)].map(([, name, body], index) => {
    const positions = [...body!.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].flatMap((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    const indices = [...body!.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)].flatMap((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    const description = /^<metadatagroup><metadata name="Description">([^<]*)<\/metadata>/.exec(body!)?.[1]?.replace(/&amp;/g, "&");
    return { name: name!, description, mesh: { positions: new Float32Array(positions), indices: new Uint32Array(indices) }, offset: offsets[index]! };
  });
}

/** The box of an object from above, its build item applied. */
function boxOf({ mesh: { positions }, offset }: ReadObject) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const value = positions[i]! + offset[i % 3]!;
    min[i % 3] = Math.min(min[i % 3]!, value);
    max[i % 3] = Math.max(max[i % 3]!, value);
  }
  return { x: min[0]!, y: min[1]!, z: min[2]!, width: max[0]! - min[0]!, depth: max[1]! - min[1]! };
}

/** The plates of a Bambu Studio project: their names and the ids of their objects (from 1). */
function bambuPlatesOf(config: string): { name: string; objects: number[] }[] {
  return [...config.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(([, plate]) => ({
    name: /key="plater_name" value="([^"]*)"/.exec(plate!)![1]!,
    objects: [...plate!.matchAll(/key="object_id" value="(\d+)"/g)].map((m) => Number(m[1])),
  }));
}

/** The boxes the rangement gives the objects of a plate, as the file should lay them: the clips by article. */
function expectedBoxes(plate: PackedPlate) {
  return plate.items.map(({ x, y, width, depth }) => ({ x, y, width, depth }));
}

describe("the Bambu Studio project of a mixed basket", { timeout: 120_000 }, () => {
  let files: Record<string, Uint8Array>;
  let objects: ReadObject[];
  let name: string;
  let extension: string;
  const progress: [number, number][] = [];

  beforeAll(async () => {
    const file = await writeBasketDownload(plan, { buildPlate: PLATE, stack: null, format: "3mf", bambu: P1S }, (done, total) => progress.push([done, total]));
    ({ name, extension } = file);
    // To slice it with the Bambu Studio CLI (ADR 0023): `BAMBU_3MF_OUT=/tmp/panier.3mf`.
    if (process.env.BAMBU_3MF_OUT) writeFileSync(process.env.BAMBU_3MF_OUT, file.bytes);
    files = unzipSync(file.bytes);
    objects = readModel(strFromU8(files["3D/3dmodel.model"]!));
  }, 120_000);

  test("one plate per plate of the rangement, named as on the page", () => {
    const read = bambuPlatesOf(strFromU8(files["Metadata/model_settings.config"]!));
    expect(read.map((plate) => plate.name)).toEqual(plates.map((_, k) => `Plateau ${k + 1}`));
    expect(read.map((plate) => plate.objects.length)).toEqual(plates.map((plate) => plate.items.length));
    expect(name).toBe(`panier-${plates.length}-plateaux`);
    expect(extension).toBe("3mf");
  });

  test("each object where the rangement put it, on its plate", () => {
    const read = bambuPlatesOf(strFromU8(files["Metadata/model_settings.config"]!));
    const columns = Math.ceil(Math.sqrt(plates.length));
    plates.forEach((plate, index) => {
      const origin = [(index % columns) * STRIDE, -Math.floor(index / columns) * STRIDE];
      const boxes = read[index]!.objects.map((id) => boxOf(objects[id - 1]!));
      const onPlate = boxes.map(({ x, y, width, depth, z }) => {
        expect(z).toBeCloseTo(0, 4);
        return { x: x - origin[0]!, y: y - origin[1]!, width, depth };
      });
      // One object per item of the rangement, in its box: here the block holds the clips of one article.
      onPlate.forEach((box, k) => {
        const expected = expectedBoxes(plate)[k]!;
        for (const key of ["x", "y", "width", "depth"] as const) expect(box[key]).toBeCloseTo(expected[key], 3);
      });
    });
  });

  test("each object keeps its name and, as its description, the share link of its article", () => {
    expect(objects.filter((object) => object.name.startsWith("Bin 2×1, 3 U (")).map((object) => object.description)).toEqual(
      Array.from({ length: 6 }, () => `${ORIGIN}/fr/bin?v=1`),
    );
    const pieces = objects.filter((object) => object.name.startsWith("Baseplate 399 × 279 — pièce "));
    expect(pieces).toHaveLength(4);
    for (const piece of pieces) expect(piece.description).toBe(`${ORIGIN}/fr/baseplate?v=1`);
    expect(objects.find((object) => object.name === "Baseplate 399 × 279 — clips × 8")?.description).toBe(`${ORIGIN}/fr/baseplate?v=1`);
  });

  test("the volumes of the objects are those of the statistics of their generator", async () => {
    const { stats } = await generateBaseplate({}, "final", { buildPlate: PLATE });
    const bin = await generateBin({}, "final");
    const volume = (filter: (object: ReadObject) => boolean) => objects.filter(filter).reduce((sum, object) => sum + meshVolume(object.mesh), 0);
    expect(volume((object) => object.name.includes("— pièce "))).toBeCloseTo(stats.volume!, 0);
    expect(volume((object) => object.name.includes("clips × "))).toBeCloseTo(stats.clipsVolume!, 1);
    expect(volume((object) => object.name.startsWith("Bin "))).toBeCloseTo(6 * bin.stats.volume!, 0);
  });

  test("with the settings of the printer, its nozzle, the filament and the layer height", () => {
    const settings = JSON.parse(strFromU8(files["Metadata/project_settings.config"]!)) as Record<string, unknown>;
    expect(settings).toMatchObject({
      printer_settings_id: "Bambu Lab P1S 0.4 nozzle",
      filament_settings_id: ["Bambu PLA Basic @BBL P1S 0.4 nozzle"],
      layer_height: "0.2",
    });
  });

  test("tells how many articles are computed, each once", () => {
    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("the ZIP of files per plate", { timeout: 120_000 }, () => {
  test("« Autre »: a 3MF per plate, its objects where they lie on the plate", async () => {
    const file = await writeBasketDownload(plan, { buildPlate: PLATE, stack: null, format: "3mf", bambu: null });
    expect(file.extension).toBe("zip");
    expect(file.name).toBe(`panier-${plates.length}-plateaux`);
    const entries = unzipSync(file.bytes);
    expect(Object.keys(entries)).toEqual(plates.map((_, k) => `panier-plateau-${k + 1}.3mf`));
    plates.forEach((plate, index) => {
      const model = strFromU8(unzipSync(entries[`panier-plateau-${index + 1}.3mf`]!)["3D/3dmodel.model"]!);
      expect(model).toContain(`<metadata name="Title">Plateau ${index + 1}</metadata>`);
      readModel(model)
        .map(boxOf).forEach((box, k) => {
        const expected = expectedBoxes(plate)[k]!;
        for (const key of ["x", "y", "width", "depth"] as const) expect(box[key]).toBeCloseTo(expected[key], 3);
      });
    });
  });

  test("a Bambu Lab printer without presets for the filament and the nozzle gives the ZIP of 3MF", async () => {
    const file = await writeBasketDownload(plan, { buildPlate: PLATE, stack: null, format: "3mf", bambu: { printer: "bambu-p1s", nozzle: 0.2, filament: "tpu" } });
    expect(file.extension).toBe("zip");
    expect(Object.keys(unzipSync(file.bytes))).toHaveLength(plates.length);
  });

  test("STL: an STL per plate, its objects in one mesh", async () => {
    const file = await writeBasketDownload(plan, { buildPlate: PLATE, stack: null, format: "stl", bambu: P1S });
    expect(file.extension).toBe("zip");
    const entries = unzipSync(file.bytes);
    expect(Object.keys(entries)).toEqual(plates.map((_, k) => `panier-plateau-${k + 1}.stl`));
    // Every triangle of the basket, once: 4 pieces, 8 clips and 6 bins.
    const triangles = Object.values(entries).reduce((sum, stl) => sum + new DataView(stl.buffer, stl.byteOffset).getUint32(80, true), 0);
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE });
    const bin = await generateBin({}, "final");
    const count = (mesh: TriangleMesh) => mesh.indices.length / 3;
    expect(triangles).toBe(printPieces(cut).reduce((sum, mesh) => sum + count(mesh), 0) + 8 * count(cut.clip!) + 6 * count(bin.mesh));
  });
});

describe("the plan of the download", () => {
  test("a plate's objects: each exemplar, each piece, and the clips of each article of the block", () => {
    expect(plan.plates).toHaveLength(plates.length);
    expect(plan.articles.map((article) => article.id)).toEqual(["plate", "bins"]);
    const names = plan.plates.flatMap((plate) => plate.objects.map((object) => object.name));
    expect(names.filter((n) => n.startsWith("Bin "))).toHaveLength(6);
    expect(names).toContain("Baseplate 399 × 279 — clips × 8");
  });

  test("a turned object keeps its footprint turned in the file", async () => {
    // A single bin, turned by hand on its plate: its width along the depth of the plate.
    const one: Article = { id: "one", model: "bin", link: "v=1", quantity: 1 };
    const measure = await measureArticle(one, PLATE);
    const single = basketPackingOf([one], () => measure, "fewest-plates")!;
    const turned: PackedPlate[] = [{ key: "plate", items: [{ id: "one/1/0", x: 100, y: 50, width: measure.dimensions.depth, depth: measure.dimensions.width, turned: true }] }];
    const file = await writeBasketDownload(
      basketDownloadPlan([one], single, turned, "fewest-plates", { nameOf, linkOf, t, basketLink: "" }),
      { buildPlate: PLATE, stack: null, format: "3mf", bambu: null },
    );
    const box = boxOf(readModel(strFromU8(unzipSync(unzipSync(file.bytes)["panier-plateau-1.3mf"]!)["3D/3dmodel.model"]!))[0]!);
    expect(box.x).toBeCloseTo(100, 3);
    expect(box.y).toBeCloseTo(50, 3);
    expect(box.width).toBeCloseTo(41.5, 3);
    expect(box.depth).toBeCloseTo(83.5, 3);
    expect(file.name).toBe("panier-1-plateau");
  });

  // Provisional (#43): one layer height per plate, given to its objects in Bambu Studio.
  test("a plate of another layer height than the project's gives it to its objects", async () => {
    const normal: Article = { id: "normal", model: "bin", link: "v=1", quantity: 2 };
    const fine: Article = { id: "fine", model: "bin", link: "v=1&lh=0.12", quantity: 1 };
    const both = [normal, fine];
    const known = new Map<string, ArticleMeasure>();
    for (const article of both) known.set(article.id, await measureArticle(article, PLATE));
    const mixed = basketPackingOf(both, (article) => known.get(article.id), "fewest-plates")!;
    const packed = searchPacking({ items: mixed.items, plate: PLATE }).packing.plates;
    expect(packed).toHaveLength(2);
    const names = (id: string) => (id === "fine" ? "Bin fin" : "Bin");
    const file = await writeBasketDownload(
      basketDownloadPlan(both, mixed, packed, "fewest-plates", { nameOf: names, linkOf, t, basketLink: "" }),
      { buildPlate: PLATE, stack: null, format: "3mf", bambu: P1S },
    );
    const files = unzipSync(file.bytes);
    // The project at the layer height of most objects; the fine bin at its own.
    expect(JSON.parse(strFromU8(files["Metadata/project_settings.config"]!))).toMatchObject({ layer_height: "0.2" });
    const objects = [...strFromU8(files["Metadata/model_settings.config"]!).matchAll(/<object id="\d+">([\s\S]*?)<\/object>/g)].map(([, body]) => [
      /key="name" value="([^"]*)"/.exec(body!)![1],
      /key="layer_height" value="([^"]*)"/.exec(body!)?.[1],
    ]);
    expect(objects.sort()).toEqual([
      ["Bin (1)", undefined],
      ["Bin (2)", undefined],
      ["Bin fin", "0.12"],
    ]);
  });
});

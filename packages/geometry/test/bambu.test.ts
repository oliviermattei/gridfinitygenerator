import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  generateBaseplate,
  partPlates,
  printClips,
  printPieces,
  serializeBambu3mf,
  type BambuPlate,
  type BuildPlate,
  type TriangleMesh,
} from "../src/index";
import { readThreeMf, readZip } from "./support/measure";

// Bambu Studio project (ADR 0023), observed through the public interface: the 3MF any slicer
// reads, with its plates and the settings of its printer for Bambu Studio.

const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** The keys of the settings of a P1S that place the plates, and one more to see it passed through. */
const SETTINGS = {
  version: "02.08.02.61",
  printable_area: ["0x0", "256x0", "256x256", "0x256"],
  bed_exclude_area: ["0x0", "18x0", "18x28", "0x28"],
  print_settings_id: "0.20mm Standard @BBL X1C",
};
const OPTIONS = { name: "baseplate", shareLink: "https://example.test/fr/baseplate?v=1", projectSettings: SETTINGS };
/** Gap between two plates of Bambu Studio: a fifth of the bed. */
const STRIDE = 256 * 1.2;

const text = (files: Record<string, Uint8Array>, path: string) => new TextDecoder().decode(files[path]);

/** The plates of `Metadata/model_settings.config`: their names and the ids of their objects. */
function platesOf(config: string): { name: string; objects: number[] }[] {
  return [...config.matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(([, plate]) => ({
    name: /key="plater_name" value="([^"]*)"/.exec(plate!)![1]!,
    objects: [...plate!.matchAll(/key="object_id" value="(\d+)"/g)].map((m) => Number(m[1])),
  }));
}

function boxOf({ positions }: TriangleMesh, [dx, dy, dz]: [number, number, number]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const value = (positions[i] as number) + [dx, dy, dz][i % 3]!;
    min[i % 3] = Math.min(min[i % 3]!, value);
    max[i % 3] = Math.max(max[i % 3]!, value);
  }
  return { min, max };
}

describe("serializeBambu3mf", () => {
  it("puts each piece of a cut baseplate on a plate of its own, inside the bed, out of its excluded corner", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const pieces = printPieces(cut).map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` }));
    const clips = printClips(cut, pieces.map(({ mesh }) => mesh));
    const plates = partPlates(pieces, clips && { mesh: clips, name: "clip × 8" }, PLATE_256);
    const bytes = serializeBambu3mf(plates, OPTIONS);
    if (process.env.BAMBU_3MF_OUT) writeFileSync(process.env.BAMBU_3MF_OUT, bytes);

    const files = readZip(bytes);
    const content = readThreeMf(bytes);
    expect(content.metadata.get("Application")).toBe("BambuStudio-02.08.02.61");
    expect(content.metadata.get("Description")).toBe(OPTIONS.shareLink);
    expect(JSON.parse(text(files, "Metadata/project_settings.config"))).toEqual(SETTINGS);

    // One plate per piece; the clips, small, join the last one.
    const read = platesOf(text(files, "Metadata/model_settings.config"));
    expect(read.map(({ name }) => name)).toEqual(pieces.map(({ name }) => name));
    expect(read.at(-1)!.objects).toHaveLength(2);
    expect(content.objectNames).toEqual([...pieces.map(({ name }) => name), "clip × 8"]);

    // Plates on a grid of ⌈√n⌉ columns, rows towards -Y; each object inside its plate, set on it.
    const columns = Math.ceil(Math.sqrt(read.length));
    read.forEach(({ objects }, index) => {
      const origin = [(index % columns) * STRIDE, -Math.floor(index / columns) * STRIDE];
      const boxes = objects.map((id) => boxOf(content.objects[id - 1]!.mesh, content.placements[id - 1]!));
      const min = [0, 1, 2].map((axis) => Math.min(...boxes.map((box) => box.min[axis]!)));
      const max = [0, 1].map((axis) => Math.max(...boxes.map((box) => box.max[axis]!)));
      expect(min[0]! - origin[0]!).toBeGreaterThanOrEqual(-1e-3);
      expect(min[1]! - origin[1]!).toBeGreaterThanOrEqual(-1e-3);
      expect(max[0]! - origin[0]!).toBeLessThanOrEqual(256 + 1e-3);
      expect(max[1]! - origin[1]!).toBeLessThanOrEqual(256 + 1e-3);
      expect(min[2]).toBeCloseTo(0, 4);
      // Out of the 18 × 28 mm corner of the cutter, at the front left of the bed.
      expect(min[0]! - origin[0]! >= 18 - 1e-3 || min[1]! - origin[1]! >= 28 - 1e-3).toBe(true);
    });
  });

  it("keeps the vertices where the engine puts them: only the build items move the objects", async () => {
    const { mesh } = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 1 }, "final");
    const content = readThreeMf(serializeBambu3mf([{ name: "plate", objects: [{ mesh, name: "baseplate" }] }], OPTIONS));
    expect(Array.from(content.mesh.indices)).toEqual(Array.from(mesh.indices));
    // Written to 0.00001 mm, like `serialize3mf`.
    const drift = Math.max(...Array.from(mesh.positions, (value, i) => Math.abs(value - (content.mesh.positions[i] as number))));
    expect(drift).toBeLessThanOrEqual(1e-5);
  });

  it("gives the clips a plate of their own when they do not fit beside the last part", () => {
    const box = (width: number, depth: number): TriangleMesh => ({
      positions: new Float32Array([0, 0, 0, width, 0, 0, 0, depth, 0, 0, 0, 2]),
      indices: new Uint32Array([0, 1, 2, 0, 1, 3, 0, 2, 3, 1, 2, 3]),
    });
    const clips = { mesh: box(30, 10), name: "clips" };
    const full: BambuPlate[] = partPlates([{ mesh: box(240, 250), name: "pièce 1" }], clips, PLATE_256);
    expect(full.map(({ name, objects }) => [name, objects.length])).toEqual([
      ["pièce 1", 1],
      ["clips", 1],
    ]);
    const roomy = partPlates([{ mesh: box(100, 100), name: "pièce 1" }], clips, PLATE_256);
    expect(roomy.map(({ objects }) => objects.length)).toEqual([2]);
  });
});

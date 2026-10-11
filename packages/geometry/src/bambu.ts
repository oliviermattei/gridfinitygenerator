import type { TriangleMesh } from "./mesh";
import type { BuildPlate } from "./print";
import {
  CONTENT_TYPES,
  DECIMALS,
  encoder,
  escapeXml,
  MODEL_PATH,
  RELATIONSHIPS,
  writeModel,
  type ThreeMfObject,
  type ThreeMfOptions,
} from "./three-mf";
import { zipParts } from "./zip";

/**
 * Bambu Studio project (ADR 0023): the 3MF of `serialize3mf`, which any slicer reads, with what
 * makes Bambu Studio open it as one of its own projects instead of loading its geometry alone:
 * the application that wrote it, its plates (`Metadata/model_settings.config`) and the settings
 * of its printer, process and filament (`Metadata/project_settings.config`). The meshes stay in
 * the model, where every slicer finds them; each build item places its object on its plate.
 */

/** One plate of a Bambu Studio project: its name, and its objects where they lie from each other. */
export interface BambuPlate {
  name: string;
  objects: readonly ThreeMfObject[];
}

export interface BambuProjectOptions extends ThreeMfOptions {
  /**
   * Settings of the project, flattened, as Bambu Studio writes them. They also give the bed the
   * plates are laid out on (`printable_area`, `bed_exclude_area`) and the version of Bambu
   * Studio the project claims to come from (`version`).
   */
  projectSettings: Readonly<Record<string, unknown>>;
}

/** Room left between the objects that share a plate, in millimetres. */
const PLATE_GAP_MM = 5;
/** Gap between two plates of Bambu Studio, as a share of the bed (`LOGICAL_PART_PLATE_GAP`, PartPlate.cpp). */
const PLATE_SPACING = 1 / 5;

interface Box {
  min: [number, number, number];
  max: [number, number, number];
}

function boxOf(meshes: readonly TriangleMesh[]): Box {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const { positions } of meshes)
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3;
      const value = positions[i] as number;
      if (value < min[axis]!) min[axis] = value;
      if (value > max[axis]!) max[axis] = value;
    }
  return { min, max };
}

/** A copy of the mesh moved by `offset`. */
function moved({ positions, indices }: TriangleMesh, offset: readonly [number, number, number]): TriangleMesh {
  const copy = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i++) copy[i] = (positions[i] as number) + offset[i % 3]!;
  return { positions: copy, indices };
}

/**
 * The plates of the parts of a print (the pieces of a cut baseplate, or its stacks): one per
 * part, named after it. The clips join the plate of the last part, beside it, when they fit on
 * the bed with it; else they get a plate of their own.
 */
export function partPlates(parts: readonly ThreeMfObject[], clips: ThreeMfObject | null, bed: BuildPlate): BambuPlate[] {
  const plates = parts.map((part) => ({ name: part.name, objects: [part] }));
  const last = plates.at(-1);
  if (!clips) return plates;
  if (last) {
    const part = boxOf([last.objects[0]!.mesh]);
    const clip = boxOf([clips.mesh]);
    const size = (box: Box, axis: 0 | 1) => box.max[axis] - box.min[axis];
    // Beside the part along X, else behind it along Y, the clips aligned on its first corner.
    const besideX = size(part, 0) + PLATE_GAP_MM + size(clip, 0) <= bed.width && Math.max(size(part, 1), size(clip, 1)) <= bed.depth;
    const besideY = size(part, 1) + PLATE_GAP_MM + size(clip, 1) <= bed.depth && Math.max(size(part, 0), size(clip, 0)) <= bed.width;
    if (besideX || besideY) {
      const offset: [number, number, number] = besideX
        ? [part.max[0] + PLATE_GAP_MM - clip.min[0], part.min[1] - clip.min[1], part.min[2] - clip.min[2]]
        : [part.min[0] - clip.min[0], part.max[1] + PLATE_GAP_MM - clip.min[1], part.min[2] - clip.min[2]];
      last.objects = [...last.objects, { name: clips.name, mesh: moved(clips.mesh, offset) }];
      return plates;
    }
  }
  return [...plates, { name: clips.name, objects: [clips] }];
}

/** The largest X and Y of a list of Bambu Studio points (`"256x0"`), or zero. */
function extentOf(points: unknown): [number, number] {
  if (!Array.isArray(points) || points.length === 0) return [0, 0];
  const xy = points.map((point) => String(point).split("x").map(Number));
  return [Math.max(...xy.map((p) => p[0] ?? 0)), Math.max(...xy.map((p) => p[1] ?? 0))];
}

/** Columns of the grid of plates in Bambu Studio (`compute_colum_count`, PartPlate.hpp). */
function columnCount(plates: number): number {
  const root = Math.sqrt(plates);
  const rounded = Math.round(root);
  return root > rounded ? rounded + 1 : rounded;
}

const fixed = (value: number) => String(Number(value.toFixed(DECIMALS)));

/**
 * Translation of the objects of each plate onto that plate: Bambu Studio lays its plates out on
 * a grid, and gives an object to the plate under it. The content of a plate is centred on its
 * bed and set down on it, then moved out of the excluded corner of the bed if it fits beside it.
 */
function placements(plates: readonly BambuPlate[], [width, depth]: [number, number], [excludeX, excludeY]: [number, number]): string[] {
  const columns = columnCount(plates.length);
  return plates.flatMap((plate, index) => {
    const { min, max } = boxOf(plate.objects.map(({ mesh }) => mesh));
    const size = [max[0] - min[0], max[1] - min[1]];
    // Plate origin: columns left to right, rows towards -Y (`compute_shape_position`).
    const originX = (index % columns) * width * (1 + PLATE_SPACING);
    const originY = -Math.floor(index / columns) * depth * (1 + PLATE_SPACING);
    let left = (width - size[0]!) / 2;
    let front = (depth - size[1]!) / 2;
    if (left < excludeX && front < excludeY) {
      if (excludeX + size[0]! <= width) left = excludeX;
      else if (excludeY + size[1]! <= depth) front = excludeY;
    }
    const offset = [originX + left - min[0], originY + front - min[1], -min[2]];
    return plate.objects.map(() => `1 0 0 0 1 0 0 0 1 ${offset.map(fixed).join(" ")}`);
  });
}

/** `Metadata/model_settings.config`: the name of each object, and the objects of each plate. */
function modelSettings(plates: readonly BambuPlate[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n';
  let id = 0;
  const platesXml = plates.map((plate, index) => {
    let entry = `  <plate>\n    <metadata key="plater_id" value="${index + 1}"/>\n`;
    entry += `    <metadata key="plater_name" value="${escapeXml(plate.name)}"/>\n    <metadata key="locked" value="false"/>\n`;
    for (const object of plate.objects) {
      id++;
      const name = escapeXml(object.name);
      xml += `  <object id="${id}">\n    <metadata key="name" value="${name}"/>\n    <metadata key="extruder" value="1"/>\n`;
      xml += `    <part id="${id}" subtype="normal_part">\n      <metadata key="name" value="${name}"/>\n`;
      xml += '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>\n  </object>\n';
      entry += `    <model_instance>\n      <metadata key="object_id" value="${id}"/>\n      <metadata key="instance_id" value="0"/>\n`;
      entry += `      <metadata key="identify_id" value="${id}"/>\n    </model_instance>\n`;
    }
    return `${entry}  </plate>\n`;
  });
  return `${xml}${platesXml.join("")}  <assemble>\n  </assemble>\n</config>\n`;
}

/**
 * Serialises plates of objects as a Bambu Studio project: the 3MF of `serialize3mf` (the meshes,
 * their names, the share link), each object on its plate, the plates named, and the settings of
 * the printer, process and filament given in `options.projectSettings`.
 */
export function serializeBambu3mf(plates: readonly BambuPlate[], options: BambuProjectOptions): Uint8Array {
  const { projectSettings } = options;
  const version = String(projectSettings.version ?? "");
  const objects = plates.flatMap((plate) => plate.objects);
  const transforms = placements(plates, extentOf(projectSettings.printable_area), extentOf(projectSettings.bed_exclude_area));
  const metadata =
    `<metadata name="Application">BambuStudio-${escapeXml(version)}</metadata>` + '<metadata name="BambuStudio:3mfVersion">1</metadata>';
  const text = (content: string) => (out: { bytes(bytes: Uint8Array): void }) => out.bytes(encoder.encode(content));
  return zipParts([
    ["[Content_Types].xml", text(CONTENT_TYPES)],
    ["_rels/.rels", text(RELATIONSHIPS)],
    [MODEL_PATH, (out) => writeModel(objects, options, out, { transforms, metadata })],
    ["Metadata/model_settings.config", text(modelSettings(plates))],
    ["Metadata/project_settings.config", text(JSON.stringify(projectSettings, null, 4))],
  ]);
}

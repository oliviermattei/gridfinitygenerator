import { DeflateEncoder, MIN_COPY, WINDOW_BYTES } from "./deflate";
import type { TriangleMesh } from "./mesh";
import { zipParts } from "./zip";

/**
 * 3MF writer (3MF core specification, 2015/02 namespace): a zip package of three parts,
 * `[Content_Types].xml`, `_rels/.rels` and the model `3D/3dmodel.model`, with one named
 * object in millimetres. The model XML is never built as a string nor as a buffer: it goes
 * straight into the deflate encoder, which is told where the XML repeats itself.
 */

export interface ThreeMfOptions {
  /** Name of the object, shown by slicers; also the title of the model. */
  name: string;
  /**
   * Absolute share link of the settings, kept as the model description so the same
   * baseplate can be generated again. The app builds it: the engine knows no address.
   */
  shareLink: string;
}

const MODEL_PATH = "3D/3dmodel.model";

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>' +
  "</Types>";

const RELATIONSHIPS =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Target="/${MODEL_PATH}" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
  "</Relationships>";

/**
 * Coordinates are written to 0.00001 mm, finer than the float32 precision of a coordinate
 * of a few hundred millimetres: the model reads back as the same mesh, to 0.000005 mm.
 */
const DECIMALS = 5;
const SCALE = 10 ** DECIMALS;

/** Slots of the table of recent decimal numbers (a power of two). */
const DECIMAL_SLOTS_SHIFT = 16;
const DECIMAL_SLOTS = 2 ** (32 - DECIMAL_SLOTS_SHIFT);

const encoder = new TextEncoder();

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A constant piece of XML repeated by every element: from its second occurrence on, it
 * is sent as a copy of the previous one, a few dozen bytes back.
 */
class Token {
  private last = -Infinity;

  constructor(private readonly text: string) {}

  write(out: DeflateEncoder) {
    const distance = out.position - this.last;
    this.last = out.position;
    if (distance <= WINDOW_BYTES) out.copyText(this.text, distance);
    else out.text(this.text);
  }
}

/** Numbers in decimal, sent to the encoder one number at a time. */
class NumberWriter {
  /** Characters of the number being written, right-aligned at the end. */
  private readonly chars = new Uint8Array(32);
  /** Where each vertex index was last written, to send it again as a copy. */
  private readonly lastIndexAt: Float64Array;
  /** Last decimal numbers written, by hash slot: the number and where it was written. */
  private readonly decimalKey = new Float64Array(DECIMAL_SLOTS).fill(Number.NaN);
  private readonly decimalAt = new Float64Array(DECIMAL_SLOTS);

  constructor(
    private readonly out: DeflateEncoder,
    vertexCount: number,
  ) {
    this.lastIndexAt = new Float64Array(vertexCount).fill(-Infinity);
  }

  /** Writes the digits of a non-negative integer so that they end at `end`; returns where they start. */
  private spell(value: number, end: number): number {
    let start = end;
    do {
      const next = (value / 10) | 0;
      this.chars[--start] = 48 + value - next * 10;
      value = next;
    } while (value > 0);
    return start;
  }

  /**
   * A vertex index. Neighbouring triangles share vertices, so an index written shortly
   * before is sent as a copy of it.
   */
  index(value: number) {
    const end = this.chars.length;
    const start = this.spell(value, end);
    const distance = this.out.position - (this.lastIndexAt[value] as number);
    this.lastIndexAt[value] = this.out.position;
    if (end - start >= MIN_COPY && distance <= WINDOW_BYTES) this.out.copyBytes(this.chars, start, end - start, distance);
    else this.out.bytes(this.chars, start, end);
  }

  /** A number to `DECIMALS` decimals, without trailing zeros (`12.5`, `-0.00125`, `3`). */
  decimal(value: number) {
    let scaled = Math.round(value * SCALE);
    const negative = scaled < 0;
    if (negative) scaled = -scaled;
    const whole = Math.floor(scaled / SCALE);
    let fraction = scaled - whole * SCALE;
    const end = this.chars.length;
    let start = end;
    if (fraction !== 0) {
      let decimals = DECIMALS;
      while (fraction % 10 === 0) {
        fraction /= 10;
        decimals--;
      }
      for (let digit = 0; digit < decimals; digit++) {
        const next = (fraction / 10) | 0;
        this.chars[--start] = 48 + fraction - next * 10;
        fraction = next;
      }
      this.chars[--start] = 46; // "."
    }
    start = this.spell(whole, start);
    if (negative) this.chars[--start] = 45; // "-"

    // Vertices share coordinates (a grid, the same heights): a number written shortly
    // before is sent as a copy of it. The table keeps the last position of each number,
    // at most one per slot: a collision only costs a missed copy.
    const key = negative ? -scaled : scaled;
    const slot = Math.imul(key | 0, 0x9e3779b1) >>> DECIMAL_SLOTS_SHIFT;
    const distance = this.out.position - (this.decimalAt[slot] as number);
    const known = this.decimalKey[slot] === key;
    this.decimalKey[slot] = key;
    this.decimalAt[slot] = this.out.position;
    if (known && end - start >= MIN_COPY && distance <= WINDOW_BYTES) this.out.copyBytes(this.chars, start, end - start, distance);
    else this.out.bytes(this.chars, start, end);
  }
}

/**
 * Placement of the object on the build plate: a translation that brings the mesh, centred
 * on the origin by the engine, into the positive octant, where the build plate of a 3MF
 * starts. It goes in the build item, so the vertices keep their exact coordinates.
 */
function placement(positions: Float32Array): string {
  const min = [Infinity, Infinity, Infinity];
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    if ((positions[i] as number) < (min[axis] as number)) min[axis] = positions[i] as number;
  }
  // Fixed-point, never exponent notation, with the precision of the vertices.
  const offset = min.map((value) => (Number.isFinite(value) ? String(Number((-value).toFixed(DECIMALS))) : "0"));
  return `1 0 0 0 1 0 0 0 1 ${offset.join(" ")}`;
}

/** Writes the model XML of the mesh. */
function writeModel(mesh: TriangleMesh, { name, shareLink }: ThreeMfOptions, out: DeflateEncoder) {
  const { positions, indices } = mesh;
  const numbers = new NumberWriter(out, positions.length / 3);
  const title = escapeXml(name);

  out.bytes(
    encoder.encode(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">' +
        `<metadata name="Title">${title}</metadata>` +
        `<metadata name="Description">${escapeXml(shareLink)}</metadata>` +
        `<resources><object id="1" type="model" name="${title}"><mesh><vertices>`,
    ),
  );

  // Each element but the first opens by closing the previous one: `"/><vertex x="`.
  const nextVertex = new Token('"/><vertex x="');
  const y = new Token('" y="');
  const z = new Token('" z="');
  for (let i = 0; i < positions.length; i += 3) {
    if (i === 0) out.text('<vertex x="');
    else nextVertex.write(out);
    numbers.decimal(positions[i] as number);
    y.write(out);
    numbers.decimal(positions[i + 1] as number);
    z.write(out);
    numbers.decimal(positions[i + 2] as number);
  }
  out.text(positions.length > 0 ? '"/></vertices><triangles>' : "</vertices><triangles>");

  const nextTriangle = new Token('"/><triangle v1="');
  const v2 = new Token('" v2="');
  const v3 = new Token('" v3="');
  for (let i = 0; i < indices.length; i += 3) {
    if (i === 0) out.text('<triangle v1="');
    else nextTriangle.write(out);
    numbers.index(indices[i] as number);
    v2.write(out);
    numbers.index(indices[i + 1] as number);
    v3.write(out);
    numbers.index(indices[i + 2] as number);
  }
  out.text(indices.length > 0 ? '"/></triangles>' : "</triangles>");
  out.text(`</mesh></object></resources><build><item objectid="1" transform="${placement(positions)}"/></build></model>`);
}

/**
 * Serialises a mesh as a 3MF package, ready for slicers (PrusaSlicer, Bambu Studio,
 * OrcaSlicer, Cura): one object named `options.name`, in millimetres, lying in the positive
 * octant, with the share link of its settings in the model metadata.
 */
export function serialize3mf(mesh: TriangleMesh, options: ThreeMfOptions): Uint8Array {
  return zipParts([
    ["[Content_Types].xml", (out) => out.bytes(encoder.encode(CONTENT_TYPES))],
    ["_rels/.rels", (out) => out.bytes(encoder.encode(RELATIONSHIPS))],
    [MODEL_PATH, (out) => writeModel(mesh, options, out)],
  ]);
}

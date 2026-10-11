// Merges the 3MF files of a prototype (`files/*.3mf`) into one Bambu Studio project,
// `<prototype>/<prototype>.3mf`, with one plate per file, named after the file.
//
//   node prototypes/bambu-plates/plates.mjs              # every prototype with a files/ folder
//   node prototypes/bambu-plates/plates.mjs stack bin    # only these ones
//
// The project carries `project_settings.config` (P1S 0.4, 0.20mm Standard, Bambu PLA Basic,
// Textured PEI Plate): Bambu Studio then loads it as one of its own projects, plates included,
// without the "not from Bambu Lab" warning. Throwaway tooling, like the prototypes.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const PROTOTYPES = path.dirname(HERE);
const SETTINGS = fs.readFileSync(path.join(HERE, "project_settings.config"), "utf8");
const settings = JSON.parse(SETTINGS);
const VERSION = settings.version;

/** Printable area of the bed, from the settings: [width, depth]. */
const bed = (() => {
  const points = settings.printable_area.map((p) => p.split("x").map(Number));
  return [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];
})();
/** Area in front of the bed left corner where nothing may be printed (P1S: the cutter). */
const exclude = (() => {
  const points = (settings.bed_exclude_area ?? []).map((p) => p.split("x").map(Number));
  return points.length ? [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))] : [0, 0];
})();

// Bambu Studio lays its plates out on a grid: same column count and gap as PartPlate.cpp.
const PLATE_GAP = 1 / 5;
function columnCount(count) {
  const value = Math.sqrt(count);
  const rounded = Math.round(value);
  return value > rounded ? rounded + 1 : rounded;
}
function plateOrigin(index, columns) {
  const row = Math.floor(index / columns);
  const col = index % columns;
  return [col * bed[0] * (1 + PLATE_GAP), -row * bed[1] * (1 + PLATE_GAP)];
}

// ---------------------------------------------------------------- zip

function readZip(buffer) {
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip file");
  const count = buffer.readUInt16LE(eocd + 10);
  let at = buffer.readUInt32LE(eocd + 16);
  const parts = new Map();
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const dataAt = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(dataAt, dataAt + size);
    parts.set(name, method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return parts;
}

function writeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = Buffer.from(content);
    const packed = zlib.deflateRawSync(data, { level: 6 });
    const nameBytes = Buffer.from(name, "utf8");
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// ---------------------------------------------------------------- 3MF in

function attributes(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function unescapeXml(text) {
  return text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

/** The objects of one of our 3MF files, each mesh moved by its build item into place. */
function readObjects(file) {
  const xml = readZip(fs.readFileSync(file)).get("3D/3dmodel.model").toString("utf8");
  const meshes = new Map();
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const attrs = attributes(m[1]);
    if (m[2].includes("<components")) throw new Error(`${file}: components are not supported`);
    const vertices = [];
    for (const v of m[2].matchAll(/<vertex\b([^>]*)\/>/g)) {
      const a = attributes(v[1]);
      vertices.push([Number(a.x), Number(a.y), Number(a.z)]);
    }
    const triangles = [];
    for (const t of m[2].matchAll(/<triangle\b([^>]*)\/>/g)) {
      const a = attributes(t[1]);
      triangles.push(`${a.v1} ${a.v2} ${a.v3}`);
    }
    meshes.set(attrs.id, { name: unescapeXml(attrs.name ?? ""), vertices, triangles });
  }
  const objects = [];
  for (const m of xml.matchAll(/<item\b([^>]*)\/>/g)) {
    const a = attributes(m[1]);
    const mesh = meshes.get(a.objectid);
    const t = (a.transform ?? "1 0 0 0 1 0 0 0 1 0 0 0").split(/\s+/).map(Number);
    const vertices = mesh.vertices.map(([x, y, z]) => [
      t[0] * x + t[3] * y + t[6] * z + t[9],
      t[1] * x + t[4] * y + t[7] * z + t[10],
      t[2] * x + t[5] * y + t[8] * z + t[11],
    ]);
    objects.push({ name: mesh.name, vertices, triangles: mesh.triangles });
  }
  return objects;
}

function bounds(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const v of vertices)
    for (let i = 0; i < 3; i++) {
      if (v[i] < min[i]) min[i] = v[i];
      if (v[i] > max[i]) max[i] = v[i];
    }
  return { min, max };
}

// ---------------------------------------------------------------- 3MF out

const escapeXml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const num = (value) => String(Math.round(value * 1e5) / 1e5);
const hex8 = (n) => n.toString(16).padStart(8, "0");
const MODEL_NS =
  'unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ' +
  'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" ' +
  'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p"';

/** Writes the Bambu Studio project of `plates`: [{ name, objects: [{ name, vertices, triangles }] }]. */
function writeProject(title, plates) {
  const columns = columnCount(plates.length);
  const objects = []; // { id, partId, name, plate, center, vertices, triangles }
  const warnings = [];
  plates.forEach((plate, index) => {
    const all = plate.objects.flatMap((o) => o.vertices);
    const { min, max } = bounds(all);
    const size = [max[0] - min[0], max[1] - min[1]];
    if (size[0] > bed[0] || size[1] > bed[1])
      warnings.push(`${plate.name}: ${num(size[0])} × ${num(size[1])} mm, larger than the ${bed[0]} × ${bed[1]} mm bed`);
    // Centre the plate's content on the bed, keeping the objects where they are relative to each other.
    const [ox, oy] = plateOrigin(index, columns);
    const shift = [ox + bed[0] / 2 - (min[0] + max[0]) / 2, oy + bed[1] / 2 - (min[1] + max[1]) / 2, -min[2]];
    if (min[0] + shift[0] - ox < exclude[0] && min[1] + shift[1] - oy < exclude[1])
      warnings.push(`${plate.name}: reaches into the ${exclude[0]} × ${exclude[1]} mm excluded corner of the bed`);
    for (const object of plate.objects) {
      const placed = object.vertices.map((v) => [v[0] + shift[0], v[1] + shift[1], v[2] + shift[2]]);
      const b = bounds(placed);
      const center = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2);
      const k = objects.length + 1;
      objects.push({
        id: 2 * k,
        partId: 2 * k - 1,
        file: `3D/Objects/object_${k}.model`,
        name: object.name || plate.name,
        plate: index,
        center,
        vertices: placed.map((v) => [v[0] - center[0], v[1] - center[1], v[2] - center[2]]),
        triangles: object.triangles,
      });
    }
  });

  const entries = [];
  entries.push([
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
      ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
      ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n' +
      ' <Default Extension="png" ContentType="image/png"/>\n <Default Extension="gcode" ContentType="text/x.gcode"/>\n</Types>\n',
  ]);
  entries.push([
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
      ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n</Relationships>\n',
  ]);

  let model = `<?xml version="1.0" encoding="UTF-8"?>\n<model ${MODEL_NS}>\n`;
  model += ` <metadata name="Application">BambuStudio-${VERSION}</metadata>\n`;
  model += ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n';
  model += ` <metadata name="Title">${escapeXml(title)}</metadata>\n <resources>\n`;
  for (const o of objects) {
    model += `  <object id="${o.id}" p:UUID="${hex8(o.id / 2)}-61cb-4c03-9d28-80fed5dfa1dc" type="model">\n   <components>\n`;
    model += `    <component p:path="/${o.file}" objectid="${o.partId}" p:UUID="${hex8((o.id / 2) * 65536)}-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n`;
    model += "   </components>\n  </object>\n";
  }
  model += ' </resources>\n <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">\n';
  for (const o of objects)
    model += `  <item objectid="${o.id}" p:UUID="${hex8(o.id)}-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 ${o.center.map(num).join(" ")}" printable="1"/>\n`;
  model += " </build>\n</model>\n";
  entries.push(["3D/3dmodel.model", model]);

  let rels = '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n';
  objects.forEach((o, i) => {
    rels += ` <Relationship Target="/${o.file}" Id="rel-${i + 1}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n`;
  });
  entries.push(["3D/_rels/3dmodel.model.rels", rels + "</Relationships>\n"]);

  for (const o of objects) {
    const lines = [`<?xml version="1.0" encoding="UTF-8"?>\n<model ${MODEL_NS}>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n`];
    lines.push(`  <object id="${o.partId}" p:UUID="${hex8((o.id / 2) * 65536)}-81cb-4c03-9d28-80fed5dfa1dc" type="model">\n   <mesh>\n    <vertices>\n`);
    for (const v of o.vertices) lines.push(`     <vertex x="${num(v[0])}" y="${num(v[1])}" z="${num(v[2])}"/>\n`);
    lines.push("    </vertices>\n    <triangles>\n");
    for (const t of o.triangles) {
      const [a, b, c] = t.split(" ");
      lines.push(`     <triangle v1="${a}" v2="${b}" v3="${c}"/>\n`);
    }
    lines.push("    </triangles>\n   </mesh>\n  </object>\n </resources>\n <build/>\n</model>\n");
    entries.push([o.file, lines.join("")]);
  }

  let config = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n';
  for (const o of objects) {
    const name = escapeXml(o.name);
    config += `  <object id="${o.id}">\n    <metadata key="name" value="${name}"/>\n    <metadata key="extruder" value="1"/>\n`;
    config += `    <part id="${o.partId}" subtype="normal_part">\n      <metadata key="name" value="${name}"/>\n`;
    config += '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n    </part>\n  </object>\n';
  }
  plates.forEach((plate, index) => {
    config += `  <plate>\n    <metadata key="plater_id" value="${index + 1}"/>\n    <metadata key="plater_name" value="${escapeXml(plate.name)}"/>\n`;
    config += '    <metadata key="locked" value="false"/>\n';
    for (const o of objects.filter((o) => o.plate === index)) {
      config += `    <model_instance>\n      <metadata key="object_id" value="${o.id}"/>\n      <metadata key="instance_id" value="0"/>\n`;
      config += `      <metadata key="identify_id" value="${o.id * 10}"/>\n    </model_instance>\n`;
    }
    config += "  </plate>\n";
  });
  entries.push(["Metadata/model_settings.config", config + "  <assemble>\n  </assemble>\n</config>\n"]);
  entries.push(["Metadata/project_settings.config", SETTINGS]);
  entries.push([
    "Metadata/slice_info.config",
    '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n    <header_item key="X-BBL-Client-Type" value="slicer"/>\n' +
      `    <header_item key="X-BBL-Client-Version" value="${VERSION}"/>\n  </header>\n</config>\n`,
  ]);
  return { zip: writeZip(entries), warnings };
}

// ---------------------------------------------------------------- main

const wanted = process.argv.slice(2);
const prototypes = (wanted.length ? wanted : fs.readdirSync(PROTOTYPES)).filter((p) =>
  fs.existsSync(path.join(PROTOTYPES, p, "files")),
);
for (const prototype of prototypes) {
  const dir = path.join(PROTOTYPES, prototype, "files");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".3mf")).sort();
  if (files.length === 0) continue;
  const plates = files.map((f) => ({ name: f.replace(/\.3mf$/, ""), objects: readObjects(path.join(dir, f)) }));
  const { zip, warnings } = writeProject(prototype, plates);
  const out = path.join(PROTOTYPES, prototype, `${prototype}.3mf`);
  fs.writeFileSync(out, zip);
  console.log(`${path.relative(process.cwd(), out)}: ${plates.length} plates, ${(zip.length / 1024).toFixed(0)} KB`);
  for (const w of warnings) console.log(`  warning: ${w}`);
}

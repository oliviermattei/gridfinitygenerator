// Rebuilds `project_settings.config` from the system presets of the local Bambu Studio:
// each preset is flattened (its `inherits` chain and its `include`s), then the Bambu Studio
// CLI exports a project with them, whose settings are kept, on a Textured PEI Plate.
//
//   node prototypes/bambu-plates/settings.mjs
//
// Run it again after a Bambu Studio update, or to change the printer, process or filament.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const MACHINE = "Bambu Lab P1S 0.4 nozzle";
const PROCESS = "0.20mm Standard @BBL X1C";
const FILAMENT = "Bambu PLA Basic @BBL P1S 0.4 nozzle";
const BED = "Textured PEI Plate";

const APP = "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio";
const SYSTEM = path.join(os.homedir(), "Library/Application Support/BambuStudio/system/BBL");
const HERE = path.dirname(new URL(import.meta.url).pathname);

function flatten(type, name) {
  const dir = path.join(SYSTEM, type);
  const byName = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const preset = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (preset.name) byName.set(preset.name, preset);
    } catch {
      // not a preset
    }
  }
  const own = ({ inherits, include, instantiation, ...rest }) => rest;
  const resolve = (n) => {
    const preset = byName.get(n);
    if (!preset) throw new Error(`no ${type} preset named ${n}`);
    let merged = preset.inherits ? resolve(preset.inherits) : {};
    for (const included of preset.include ?? []) merged = { ...merged, ...own(resolve(included)) };
    return { ...merged, ...own(preset) };
  };
  return { ...resolve(name), name, from: "system" };
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "bambu-settings-"));
const write = (file, data) => {
  fs.writeFileSync(path.join(work, file), typeof data === "string" ? data : JSON.stringify(data));
  return path.join(work, file);
};
const machine = write("machine.json", flatten("machine", MACHINE));
const process_ = write("process.json", flatten("process", PROCESS));
const filament = write("filament.json", flatten("filament", FILAMENT));
const cube = write("cube.stl", `solid c\n${cubeFacets(10)}endsolid c\n`);
execFileSync(APP, ["--load-settings", `${machine};${process_}`, "--load-filaments", filament, "--arrange", "1",
  "--outputdir", work, "--export-3mf", "project.3mf", cube], { cwd: work, stdio: "ignore" });

const settings = JSON.parse(readPart(fs.readFileSync(path.join(work, "project.3mf")), "Metadata/project_settings.config"));
settings.curr_bed_type = BED;
fs.writeFileSync(path.join(HERE, "project_settings.config"), JSON.stringify(settings, null, 4) + "\n");
fs.rmSync(work, { recursive: true });
console.log(`project_settings.config: ${settings.printer_settings_id}, ${settings.print_settings_id}, ${FILAMENT}, ${BED}, Bambu Studio ${settings.version}`);

function cubeFacets(s) {
  const v = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [(i >> 2) & 1, (i >> 1) & 1, i & 1].map((b) => b * s));
  const faces = [[0, 2, 3], [0, 3, 1], [4, 5, 7], [4, 7, 6], [0, 1, 5], [0, 5, 4], [2, 6, 7], [2, 7, 3], [0, 4, 6], [0, 6, 2], [1, 3, 7], [1, 7, 5]];
  return faces
    .map((f) => ` facet normal 0 0 0\n  outer loop\n${f.map((i) => `   vertex ${v[i].join(" ")}\n`).join("")}  endloop\n endfacet\n`)
    .join("");
}

function readPart(zip, name) {
  let eocd = zip.length - 22;
  while (zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let at = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < zip.readUInt16LE(eocd + 10); i++) {
    const nameLength = zip.readUInt16LE(at + 28);
    const local = zip.readUInt32LE(at + 42);
    if (zip.toString("utf8", at + 46, at + 46 + nameLength) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + zip.readUInt32LE(at + 20));
      return (zip.readUInt16LE(at + 10) === 8 ? zlib.inflateRawSync(data) : data).toString("utf8");
    }
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  throw new Error(`${name} not found`);
}

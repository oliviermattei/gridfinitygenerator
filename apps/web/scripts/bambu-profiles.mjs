// Builds lib/printers/bambu-p1s.json, the settings a 3MF carries when the printer is a Bambu Lab
// P1S (ADR 0023), from the system presets of the Bambu Studio installed on this Mac. For each
// nozzle, the machine preset and its default process; for each filament of the page, the Bambu
// preset of that filament for that nozzle. Each combination is flattened (`inherits`, `include`)
// and handed to the Bambu Studio CLI, which writes the full settings of a project with them; the
// file keeps those of the PLA, and for each other filament only the keys that differ. A filament
// Bambu has no preset of for a nozzle is left out: the 3MF of that combination stays a plain one.
//
//   node scripts/bambu-profiles.mjs
//
// Run it again after a Bambu Studio update: a 3MF from a newer version than the reader's warns.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const APP = "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio";
const SYSTEM = path.join(os.homedir(), "Library/Application Support/BambuStudio/system/BBL");
const OUT = fileURLToPath(new URL("../lib/printers/bambu-p1s.json", import.meta.url));

const MACHINE = "Bambu Lab P1S {nozzle} nozzle";
const NOZZLES = ["0.2", "0.4", "0.6", "0.8"];
/** Bambu presets of each filament of the page (lib/mass.ts), by preference: the first one made for the nozzle. */
const FILAMENTS = {
  pla: ["Bambu PLA Basic"],
  petg: ["Bambu PETG HF", "Bambu PETG Basic", "Generic PETG"],
  abs: ["Bambu ABS", "Generic ABS"],
  asa: ["Bambu ASA", "Generic ASA"],
  tpu: ["Bambu TPU 95A HF", "Generic TPU"],
  other: ["Generic PLA"],
};
/** The build plate the P1S ships with. */
const BED = "Textured PEI Plate";

function presets(type) {
  const byName = new Map();
  const dir = path.join(SYSTEM, type);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const preset = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (preset.name) byName.set(preset.name, preset);
    } catch {
      // not a preset
    }
  }
  /** A preset without the keys that only say how to build it. */
  const own = (preset) => Object.fromEntries(Object.entries(preset).filter(([key]) => !["inherits", "include", "instantiation"].includes(key)));
  const flatten = (name) => {
    const preset = byName.get(name);
    if (!preset) throw new Error(`no ${type} preset named ${name}`);
    let merged = preset.inherits ? flatten(preset.inherits) : {};
    for (const included of preset.include ?? []) merged = { ...merged, ...own(flatten(included)) };
    return { ...merged, ...own(preset) };
  };
  return { byName, flatten: (name) => ({ ...flatten(name), name, from: "system" }) };
}

const machines = presets("machine");
const processes = presets("process");
const filaments = presets("filament");

/** The first preset of the candidates made for the machine; null when Bambu has none (TPU with a 0.2 mm nozzle). */
function filamentFor(candidates, machine) {
  for (const candidate of candidates)
    for (const [name, preset] of filaments.byName) {
      if ((name !== candidate && !name.startsWith(`${candidate} @`)) || preset.instantiation !== "true") continue;
      if ((filaments.flatten(name).compatible_printers ?? []).includes(machine)) return name;
    }
  return null;
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

const work = fs.mkdtempSync(path.join(os.tmpdir(), "bambu-profiles-"));
const cube = path.join(work, "cube.stl");
/** A closed 10 mm cube: the CLI exports no project without an object to print. */
const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [(i >> 2) & 1, (i >> 1) & 1, i & 1].map((bit) => bit * 10));
const faces = [[0, 2, 3], [0, 3, 1], [4, 5, 7], [4, 7, 6], [0, 1, 5], [0, 5, 4], [2, 6, 7], [2, 7, 3], [0, 4, 6], [0, 6, 2], [1, 3, 7], [1, 7, 5]];
const facets = faces.map((face) => ` facet normal 0 0 0\n  outer loop\n${face.map((i) => `   vertex ${corners[i].join(" ")}\n`).join("")}  endloop\n endfacet\n`);
fs.writeFileSync(cube, `solid c\n${facets.join("")}endsolid c\n`);

/** Settings of a project of Bambu Studio with these presets, as its CLI writes them. */
function projectSettings(machine, process, filament) {
  const write = (file, preset) => {
    fs.writeFileSync(path.join(work, file), JSON.stringify(preset));
    return path.join(work, file);
  };
  const files = [write("machine.json", machines.flatten(machine)), write("process.json", processes.flatten(process)), write("filament.json", filaments.flatten(filament))];
  execFileSync(APP, ["--load-settings", `${files[0]};${files[1]}`, "--load-filaments", files[2], "--arrange", "1", "--outputdir", work, "--export-3mf", "project.3mf", cube], {
    cwd: work,
    stdio: "ignore",
  });
  const settings = JSON.parse(readPart(fs.readFileSync(path.join(work, "project.3mf")), "Metadata/project_settings.config"));
  settings.curr_bed_type = BED;
  return settings;
}

const profile = { nozzles: {} };
for (const nozzle of NOZZLES) {
  const machine = MACHINE.replace("{nozzle}", nozzle);
  const process = machines.flatten(machine).default_print_profile;
  const names = Object.fromEntries(
    Object.entries(FILAMENTS)
      .map(([filament, candidates]) => [filament, filamentFor(candidates, machine)])
      .filter(([, name]) => name !== null),
  );
  const base = projectSettings(machine, process, names.pla);
  const others = {};
  for (const [filament, name] of Object.entries(names)) {
    if (filament === "pla") continue;
    const settings = projectSettings(machine, process, name);
    others[filament] = Object.fromEntries(Object.entries(settings).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(base[key])));
  }
  profile.version ??= base.version;
  profile.nozzles[nozzle] = { settings: base, filaments: others };
  console.log(`${machine}: ${process}; ${Object.values(names).join(", ")}`);
}
fs.rmSync(work, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(profile) + "\n");
console.log(`${path.relative(process.cwd(), OUT)}: Bambu Studio ${profile.version}, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);

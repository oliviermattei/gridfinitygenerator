import Module from "manifold-3d";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BIN_SETTINGS,
  binFitsOn,
  clampBinSettings,
  decodeBinSettings,
  encodeBinSettings,
  generateBin,
  maxBinCells,
  openingBinSettings,
  type TriangleMesh,
} from "../src/index";
import { checkMesh } from "./support/measure";

// The bin (#32), observed through the public interface only: the standard foot (ADR 0018),
// the heights in U, the stacking lip, the compartments, and the build plate.

const TOLERANCE_MM = 0.01;

function expectWithin(actual: number, expected: number, tolerance = TOLERANCE_MM) {
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** Width of the widest contour of a section of a 1 × 1 bin, along X. */
function widest(contours: [number, number][][]): number {
  return Math.max(...contours.map((contour) => Math.max(...contour.map(([x]) => x)) - Math.min(...contour.map(([x]) => x))));
}

/** Width of the narrowest contour (the inner face of the wall, the opening), along X. */
function narrowest(contours: [number, number][][]): number {
  return Math.min(...contours.map((contour) => Math.max(...contour.map(([x]) => x)) - Math.min(...contour.map(([x]) => x))));
}

describe("the foot", () => {
  it("is the exact standard foot, 41.5 mm at the top, 35.6 mm at the bottom", async () => {
    const bin = await generateBin({ columns: 1, rows: 1 }, "final");
    // [z, inset from the 41.5 mm top of the foot]: 45° 0.8, vertical 1.8, 45° 2.15.
    const levels = [
      [0.01, 2.94],
      [0.4, 2.55],
      [1.7, 2.15],
      [3.675, 1.075],
      [4.74, 0.01],
    ] as const;
    const check = await checkMesh(bin.mesh, levels.map(([z]) => z));
    expect(check.status).toBe("NoError");
    for (const [z, inset] of levels) expectWithin(widest(check.sections.get(z) ?? []), 41.5 - 2 * inset);
  });

  it("is repeated under every cell, 42 mm apart", async () => {
    const bin = await generateBin({ columns: 3, rows: 2 }, "preview");
    const check = await checkMesh(bin.mesh, [1]);
    expect(check.sections.get(1)).toHaveLength(6);
    expectWithin(bin.stats.dimensions.width, 3 * 42 - 0.5);
    expectWithin(bin.stats.dimensions.depth, 2 * 42 - 0.5);
  });
});

describe("the height", () => {
  it("is 7 mm per U, plus 4 mm of stacking lip", async () => {
    const bin = await generateBin({ units: 3 }, "final");
    expect(bin.stats.heightWithoutLip).toBe(21);
    expectWithin(bin.stats.dimensions.height, 25);
    const none = await generateBin({ units: 5, lip: "none" }, "preview");
    expectWithin(none.stats.dimensions.height, 35);
    const reduced = await generateBin({ units: 5, lip: "reduced" }, "preview");
    expectWithin(reduced.stats.dimensions.height, 39);
  });

  it("keeps the standard socle: the inner floor at 7 mm", async () => {
    const bin = await generateBin({ columns: 1, rows: 1, fillet: false }, "final");
    expect(bin.layout.floor).toBe(7);
    // Solid at 6.9 mm across the whole cell, open at 7.1 mm inside the walls.
    const check = await checkMesh(bin.mesh, [6.9, 7.1]);
    expect(check.sections.get(6.9)).toHaveLength(1);
    expect(check.sections.get(7.1)).toHaveLength(2);
    expectWithin(narrowest(check.sections.get(7.1) ?? []), 41.5 - 2 * bin.layout.wall);
  });
});

describe("the stacking lip", () => {
  it("opens to 37.7 mm on its vertical, the seat of the foot of the bin above", async () => {
    const bin = await generateBin({ columns: 1, rows: 1, units: 3 }, "final");
    const check = await checkMesh(bin.mesh, [21 + 1.6]);
    expectWithin(narrowest(check.sections.get(21 + 1.6) ?? []), 41.5 - 2 * 1.9);
  });

  it.each(["normal", "reduced"] as const)("%s, carries a bin stacked on it on its slopes, the bottom of its feet 0.35 mm under the top of the walls, clear of the dividers and tabs", async (lip) => {
    const lower = await generateBin({ columns: 1, rows: 1, units: 3, lip, compartmentColumns: 2, compartmentRows: 2, labelTab: true }, "final");
    const upper = await generateBin({ columns: 1, rows: 1, units: 3 }, "final");
    const wasm = await Module();
    wasm.setup();
    const solid = (mesh: TriangleMesh) => new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices }));
    const [a, b] = [solid(lower.mesh), solid(upper.mesh)];
    const overlap = (z: number) => {
      const moved = b.translate([0, 0, z]);
      const common = a.intersect(moved);
      const volume = common.volume();
      moved.delete();
      common.delete();
      return volume;
    };
    expect(overlap(21 - 0.35 + 0.02)).toBeLessThan(0.01);
    expect(overlap(21 - 0.35 - 0.1)).toBeGreaterThan(1);
    a.delete();
    b.delete();
  });
});

describe("the compartments", () => {
  it("divide the inside in a regular grid, with dividers of whole lines", async () => {
    const bin = await generateBin({ columns: 2, rows: 1, compartmentColumns: 3, compartmentRows: 2 }, "final");
    expect(bin.stats.compartments).toBe(6);
    expect(bin.layout.divider).toBe(0.8);
    expect(bin.layout.wall).toBe(1.2);
    expectWithin(bin.stats.compartment.width, (83.5 - 2.4 - 2 * 0.8) / 3);
    expectWithin(bin.stats.compartment.depth, (41.5 - 2.4 - 0.8) / 2);
    // Under the lip, the six compartments are six holes.
    const check = await checkMesh(bin.mesh, [12]);
    expect(check.status).toBe("NoError");
    expect(check.sections.get(12)).toHaveLength(7);
  });

  it("follow the line width: walls and dividers stay whole lines", async () => {
    const bin = await generateBin({ lineWidth: 0.6 }, "preview");
    expect(bin.layout.wall).toBe(1.2);
    expect(bin.layout.divider).toBe(1.2);
  });

  it("are 3 per cell each way at most", () => {
    expect(clampBinSettings({ columns: 2, compartmentColumns: 9 }).compartmentColumns).toBe(6);
  });

  it("lose useful volume to the fillet, the scoop and the label tab, each a valid solid", async () => {
    const plain = await generateBin({ fillet: false }, "final");
    const fillet = await generateBin({ fillet: true }, "final");
    const scoop = await generateBin({ fillet: true, scoop: true }, "final");
    const tab = await generateBin({ fillet: true, scoop: true, labelTab: true }, "final");
    const useful = [plain, fillet, scoop, tab].map((bin) => bin.stats.usefulVolume as number);
    expect(useful[0]).toBeGreaterThan(useful[1] as number);
    expect(useful[1]).toBeGreaterThan(useful[2] as number);
    expect(useful[2]).toBeGreaterThan(useful[3] as number);
    // Material goes the other way, by exactly the space lost.
    const volume = [plain, fillet, scoop, tab].map((bin) => bin.stats.volume as number);
    for (let k = 1; k < 4; k++) expectWithin((volume[k] as number) - (volume[k - 1] as number), (useful[k - 1] as number) - (useful[k] as number), 0.5);
    for (const bin of [fillet, scoop, tab]) expect((await checkMesh(bin.mesh)).status).toBe("NoError");
  });
});

describe("the build plate", () => {
  it("takes 6 cells each way on a plate of 256 mm, not 7", () => {
    const plate = { width: 256, depth: 256 };
    expect(binFitsOn({ columns: 6, rows: 6 }, plate)).toBe(true);
    expect(binFitsOn({ columns: 7, rows: 1 }, plate)).toBe(false);
    expect(maxBinCells(42, plate)).toEqual({ short: 6, long: 6 });
    expect(maxBinCells(42, { width: 180, depth: 300 })).toEqual({ short: 4, long: 7 });
    // Turned a quarter: 7 × 4 fits on 180 × 300.
    expect(binFitsOn({ columns: 7, rows: 4 }, { width: 180, depth: 300 })).toBe(true);
  });
});

describe("the socle", () => {
  it("hollow, it keeps the foot and takes less material", async () => {
    const solid = await generateBin({ columns: 1, rows: 1 }, "final");
    const hollow = await generateBin({ columns: 1, rows: 1 }, "final", { socle: "hollow" });
    expect((await checkMesh(hollow.mesh)).status).toBe("NoError");
    expect(hollow.layout.floor).toBe(6);
    expect(hollow.stats.volume as number).toBeLessThan(solid.stats.volume as number);
  });
});

describe("the share link of a bin", () => {
  it("carries only what differs from the defaults, and reads back the same bin", () => {
    expect(encodeBinSettings(DEFAULT_BIN_SETTINGS)).toBe("v=1");
    const settings = clampBinSettings({ columns: 3, rows: 2, units: 6, compartmentColumns: 4, lip: "reduced", fillet: false, scoop: true, labelTab: true });
    const link = encodeBinSettings(settings);
    expect(link).toBe("v=1&x=3&y=2&h=6&dx=4&lip=reduced&fi=0&sc=1&lt=1");
    expect(decodeBinSettings(link)).toEqual(settings);
  });

  it("brings a value back into its range, and ignores what it cannot read", () => {
    expect(decodeBinSettings("v=1&x=99&h=abc&lip=wide")).toEqual({ ...DEFAULT_BIN_SETTINGS, columns: 20 });
    expect(decodeBinSettings("x=3")).toBeNull();
    expect(openingBinSettings("", "v=1&x=4")).toEqual({ ...DEFAULT_BIN_SETTINGS, columns: 4 });
  });
});

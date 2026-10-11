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
  MIN_FLOOR_THICKNESS_MM,
  labelSideOf,
  openingBinSettings,
  oppositeSide,
  type TriangleMesh,
} from "../src/index";
import { checkMesh } from "./support/measure";

// The bin (#32), observed through the public interface only: the standard foot (ADR 0021),
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

describe("the scoop and the label tab (grilling of the finishes)", () => {
  it.each(["front", "back", "left", "right"] as const)("the scoop on the %s side, the label tab across from it, both valid solids", async (scoopSide) => {
    const bin = await generateBin({ columns: 2, rows: 2, units: 4, compartmentColumns: 2, compartmentRows: 2, scoop: true, scoopSide, labelTab: true, labelSide: scoopSide }, "final");
    expect(bin.layout.scoopSide).toBe(scoopSide);
    expect(bin.layout.labelSide).toBe(oppositeSide(scoopSide));
    expect((await checkMesh(bin.mesh)).status).toBe("NoError");
  });

  it("without a scoop, the label tab takes its own side", () => {
    expect(labelSideOf({ scoop: false, scoopSide: "front", labelSide: "left" })).toBe("left");
    expect(labelSideOf({ scoop: true, scoopSide: "left", labelSide: "left" })).toBe("right");
  });

  it("the scoop rises from the floor on its side, and turns into its two corners", async () => {
    const bin = await generateBin({ columns: 1, rows: 1, units: 4, scoop: true, scoopSide: "front" }, "final");
    const { floor, scoop, fillet } = bin.layout;
    expect(scoop).toBe(12);
    // 2 mm above the floor, the inside sets in by the arc of the scoop at the front, of the fillet at the back.
    const z = floor + 2;
    const check = await checkMesh(bin.mesh, [z]);
    const inner = (check.sections.get(z) ?? []).reduce((a, b) => (Math.max(...a.map(([x]) => x)) - Math.min(...a.map(([x]) => x)) < Math.max(...b.map(([x]) => x)) - Math.min(...b.map(([x]) => x)) ? a : b));
    const ys = inner.map(([, y]) => y);
    const arc = (r: number, h: number) => r - Math.sqrt(r * r - (r - h) * (r - h));
    const half = 41.5 / 2 - bin.layout.wall;
    expectWithin(Math.min(...ys), -half + arc(scoop, 2), 0.05);
    expectWithin(Math.max(...ys), half - arc(fillet, 2), 0.05);
  });

  it("the label tab is as deep as asked, and costs a console per cell", async () => {
    const settings = { columns: 3, rows: 1, units: 4, labelTab: true } as const;
    const deep = await generateBin({ ...settings, labelDepth: 16 }, "final");
    expect(deep.layout.labelTab).toBe(16);
    const plain = await generateBin({ ...settings, labelTab: false }, "final");
    const tab = (deep.stats.volume as number) - (plain.stats.volume as number);
    // A ribbed shelf, far from a solid wedge (16² / 2 × 123 mm ≈ 15.7 cm³).
    expect(tab).toBeGreaterThan(1000);
    expect(tab).toBeLessThan(5000);
    expect(encodeBinSettings(clampBinSettings({ ...settings, labelDepth: 16, scoop: true, scoopSide: "left" }))).toBe("v=1&x=3&h=4&sc=1&lt=1&ss=left&ld=16");
  });
});

describe("the scoop radius (#32, decision of 2026-10-11)", () => {
  /** How far the inside sets in at the front and at the back, `h` above the floor of a 1 × 1 bin of one compartment. */
  async function frontAndBackInsets(bin: Awaited<ReturnType<typeof generateBin>>, h: number) {
    const z = bin.layout.floor + h;
    const check = await checkMesh(bin.mesh, [z]);
    const contours = check.sections.get(z) ?? [];
    const inner = contours.reduce((a, b) => (Math.max(...a.map(([x]) => x)) - Math.min(...a.map(([x]) => x)) < Math.max(...b.map(([x]) => x)) - Math.min(...b.map(([x]) => x)) ? a : b));
    const ys = inner.map(([, y]) => y);
    const half = 41.5 / 2 - bin.layout.wall;
    return { front: Math.min(...ys) + half, back: half - Math.max(...ys) };
  }

  it("is 12 mm by default, brought down in a bin of 3 U to 10.4 mm, what the compartment leaves under the lip", async () => {
    const bin = await generateBin({ scoop: true }, "preview");
    expectWithin(bin.layout.scoop, 10.4);
    const tall = await generateBin({ scoop: true, units: 6 }, "preview");
    expect(tall.layout.scoop).toBe(12);
  });

  it("the higher, the rounder: the scoop sets in by the arc of the radius asked", async () => {
    const arc = (r: number, h: number) => r - Math.sqrt(r * r - (r - h) * (r - h));
    // 3 mm, the least, is less round than the 5 mm fillet of the other sides.
    for (const scoopRadius of [3, 6, 16]) {
      const bin = await generateBin({ columns: 1, rows: 1, units: 6, scoop: true, scoopRadius }, "final");
      expect(bin.layout.scoop).toBe(scoopRadius);
      expect((await checkMesh(bin.mesh)).status).toBe("NoError");
      expectWithin((await frontAndBackInsets(bin, 2)).front, arc(scoopRadius, 2), 0.05);
    }
  });

  it("is brought down to half the compartment across from its side", async () => {
    const bin = await generateBin({ columns: 1, rows: 1, units: 8, scoop: true, scoopRadius: 40 }, "preview");
    expectWithin(bin.layout.scoop, (41.5 - 2 * 1.2) / 2);
  });
});

describe("the share link of the scoop radius and the floor height", () => {
  it("carries the scoop radius as rs, and reads a link written before it with the 12 mm of then", () => {
    const settings = clampBinSettings({ scoop: true, scoopSide: "left", scoopRadius: 15.5 });
    expect(encodeBinSettings(settings)).toBe("v=1&sc=1&ss=left&rs=15.5");
    expect(decodeBinSettings("v=1&sc=1&ss=left&rs=15.5")).toEqual(settings);
    expect(decodeBinSettings("v=1&sc=1")?.scoopRadius).toBe(12);
  });

  it("carries the floor height as fh, and reads a link written before it with the standard floor at 7 mm", () => {
    const settings = clampBinSettings({ columns: 3, units: 4, floorHeight: 5.2 });
    expect(encodeBinSettings(settings)).toBe("v=1&x=3&h=4&fh=5.2");
    expect(decodeBinSettings("v=1&x=3&h=4&fh=5.2")).toEqual(settings);
    expect(decodeBinSettings("v=1&x=3&h=4")?.floorHeight).toBe(7);
    expect(decodeBinSettings("v=1&fh=0.2")?.floorHeight).toBe(1);
  });
});

describe("the floor height (#32, decision of 2026-10-11)", () => {
  it("by default, with the scoop radius, keeps the bin of before both settings, to the mm³", async () => {
    // Volumes measured on main before the floor height and the scoop radius existed.
    const cases = [
      [{}, 29198.111, 34630.232],
      [{ scoop: true }, 30687.293, 33141.049],
      [{ scoop: true, labelTab: true, units: 5, compartmentColumns: 2 }, 39170.796, 73001.805],
      [{ columns: 1, rows: 1, scoop: true, scoopSide: "left" }, 16469.940, 15651.907],
    ] as const;
    for (const [settings, volume, usefulVolume] of cases) {
      const bin = await generateBin(settings, "final");
      expectWithin(bin.stats.volume as number, volume);
      expectWithin(bin.stats.usefulVolume as number, usefulVolume);
    }
  });

  it("puts the inner floor where asked, lower into the socle or higher over it", async () => {
    for (const floorHeight of [5, 10]) {
      const bin = await generateBin({ columns: 1, rows: 1, fillet: false, floorHeight }, "final");
      expect(bin.layout.floor).toBe(floorHeight);
      // Solid 0.1 mm under the floor across the whole cell, open 0.1 mm over it inside the walls.
      const check = await checkMesh(bin.mesh, [floorHeight - 0.1, floorHeight + 0.1]);
      expect(check.status).toBe("NoError");
      expect(check.sections.get(floorHeight - 0.1)).toHaveLength(1);
      expect(check.sections.get(floorHeight + 0.1)).toHaveLength(2);
      // The useful height goes from the floor to under the lip, at 18.4 mm in 3 U.
      expectWithin(bin.stats.compartment.height, 18.4 - floorHeight);
    }
  });

  it("stays 2 mm under the top of the useful space", async () => {
    const bin = await generateBin({ floorHeight: 30 }, "preview");
    expectWithin(bin.layout.floor, 18.4 - 2);
  });
});

describe("the material under the inner floor", () => {
  it("keeps 1.2 mm at least by default: the floor at 7 mm, 2.25 mm over the gap between the feet", async () => {
    expect(MIN_FLOOR_THICKNESS_MM).toBe(1.2);
    expect((await generateBin({}, "final")).stats.thinFloor).toBeNull();
    expect((await generateBin({ columns: 1, rows: 1 }, "final", { socle: "hollow" })).stats.thinFloor).toBeNull();
  });

  it("is measured on the solids when thinner: over the gap at 4.75 mm, under 1.2 mm with the floor under 5.95 mm, 0 through the socle", async () => {
    const thin = async (floorHeight: number, quality: "preview" | "final" = "final") => (await generateBin({ floorHeight }, quality)).stats.thinFloor;
    expect(await thin(6)).toBeNull();
    expect(await thin(5.95)).toBeNull();
    expectWithin((await thin(5.9)) as number, 1.15);
    expectWithin((await thin(5.9, "preview")) as number, 1.15);
    expectWithin((await thin(5)) as number, 0.25);
    expect(await thin(4)).toBe(0);
  });

  it("on one cell without fillet, is the distance from the corner of the floor, 1.2 mm in from the outside, to the 45° slope of the foot", async () => {
    const bin = await generateBin({ columns: 1, rows: 1, fillet: false, floorHeight: 5.2 }, "final");
    expectWithin(bin.stats.thinFloor as number, (1.2 + 5.2 - 4.75) / Math.SQRT2);
    expect((await generateBin({ columns: 1, rows: 1, fillet: false, floorHeight: 5.25 }, "final")).stats.thinFloor).toBeNull();
  });
});

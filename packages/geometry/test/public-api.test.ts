import { describe, expect, it } from "vitest";
import {
  ADVANCED_SETTINGS,
  BASEPLATE_SETTINGS,
  changedAdvancedSettings,
  DEFAULT_SETTINGS,
  STANDARD_CELL_SIZE_MM,
  clampSettings,
  fitsOnBuildPlate,
  generateBaseplate,
  loadEngine,
  roundUpToLayer,
  serialize3mf,
  serializeStl,
  type BaseplateSettings,
  type Quality,
} from "../src/index";
import { checkMesh, pocketOpening, readBinaryStl, readThreeMf } from "./support/measure";

// Behaviour of the geometry engine, observed only through its public interface.
// Reference values: docs/research/gridfinity-baseplate.md (sections B and C),
// prototypes/geometry-perf/RESULTS.md (validation) and ADR 0002 (hybrid pocket profile).

const TOLERANCE_MM = 0.001;
const HEIGHT_MM = 4.6;

/**
 * Expected pocket opening at a height (ADR 0002): a rounded square of side 42 − 2·inset
 * whose corner radius is 4 − inset (1.15 at the bottom, 3.6 at the top flat).
 */
const POCKET_OPENINGS: readonly { z: number; inset: number }[] = [
  { z: 0.1, inset: 2.85 }, // vertical muret foot: 36.3 mm
  { z: 0.7, inset: 2.5 }, // middle of the lower 45° chamfer: 37.0 mm
  { z: 1.5, inset: 2.15 }, // vertical 1.8 mm: 37.7 mm
  { z: 2.0, inset: 2.15 },
  { z: 3.5, inset: 1.5 }, // upper 45° chamfer: 39.0 mm
  { z: 4.5, inset: 0.5 }, // just under the 0.4 mm flat: 41.0 mm
];

/** Area of a rounded square: side² minus the four corners cut by the radius. */
const roundedSquareArea = (side: number, radius: number) => side * side - (4 - Math.PI) * radius * radius;
/** A 32-segment quarter circle falls short of the true arc by less than 0.01 mm² here. */
const FINAL_AREA_TOLERANCE_MM2 = 0.02;

const SIZES: readonly [number, number][] = [
  [1, 1],
  [1, 4],
  [4, 1],
  [3, 2],
];

function expectWithin(actual: number | undefined, expected: number, tolerance = TOLERANCE_MM) {
  expect(actual).toBeDefined();
  expect(Math.abs((actual ?? Number.NaN) - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
}

/** Cell centres of an nx × ny grid centred on the origin. */
function cellCentres(nx: number, ny: number): [number, number][] {
  const centres: [number, number][] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      centres.push([(i - (nx - 1) / 2) * STANDARD_CELL_SIZE_MM, (j - (ny - 1) / 2) * STANDARD_CELL_SIZE_MM]);
  return centres;
}

describe.each<Quality>(["preview", "final"])("generateBaseplate, %s quality", (quality) => {
  describe.each(SIZES)("%i × %i cells", (columns, rows) => {
    it("fills nx·42 × ny·42 × 4.60 mm, as reported and as measured on the mesh", async () => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      const { dimensions } = baseplate.stats;
      expectWithin(dimensions.width, columns * 42);
      expectWithin(dimensions.depth, rows * 42);
      expectWithin(dimensions.height, HEIGHT_MM);

      const { bounds } = await checkMesh(baseplate.mesh);
      expectWithin(bounds.max[0] - bounds.min[0], columns * 42);
      expectWithin(bounds.max[1] - bounds.min[1], rows * 42);
      expectWithin(bounds.min[2], 0);
      expectWithin(bounds.max[2], HEIGHT_MM);
    });

    it("is a closed, valid mesh with one open pocket per cell", async () => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      const check = await checkMesh(baseplate.mesh);
      expect(check.status).toBe("NoError");
      expect(check.volume).toBeGreaterThan(0);
      // A pocket open at the bottom is a hole through the frame: one handle per cell.
      expect(check.genus).toBe(columns * rows);
    });

    it("cuts every pocket to the hybrid profile, within 0.001 mm", async () => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      const { sections } = await checkMesh(
        baseplate.mesh,
        POCKET_OPENINGS.map(({ z }) => z),
      );
      for (const centre of cellCentres(columns, rows)) {
        for (const { z, inset } of POCKET_OPENINGS) {
          const opening = pocketOpening(sections.get(z) ?? [], centre);
          const side = STANDARD_CELL_SIZE_MM - 2 * inset;
          expectWithin(opening?.width, side);
          expectWithin(opening?.depth, side);
          if (quality === "final") {
            expectWithin(opening?.area, roundedSquareArea(side, 4 - inset), FINAL_AREA_TOLERANCE_MM2);
          }
        }
      }
    });

    it("lays out the grid without any margin", async () => {
      const { layout } = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      expect(layout).toMatchObject({
        columns,
        rows,
        cellSize: STANDARD_CELL_SIZE_MM,
        margins: { left: 0, right: 0, back: 0, front: 0 },
        // Without screws (the default), no screw hole.
        screws: [],
      });
    });
  });
});

describe.each<Quality>(["preview", "final"])("large grids, %s quality", (quality) => {
  describe.each<[number, number]>([
    [2, 2],
    [20, 20],
  ])("%i × %i cells", (columns, rows) => {
    it("is a closed, valid mesh of the expected size, with one open pocket per cell", async () => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      const check = await checkMesh(baseplate.mesh);
      expect(check.status).toBe("NoError");
      expect(check.genus).toBe(columns * rows);
      expectWithin(check.bounds.max[0] - check.bounds.min[0], columns * 42);
      expectWithin(check.bounds.max[1] - check.bounds.min[1], rows * 42);
      expectWithin(check.bounds.min[2], 0);
      expectWithin(check.bounds.max[2], HEIGHT_MM);
      expectWithin(baseplate.stats.dimensions.width, columns * 42);
      expectWithin(baseplate.stats.dimensions.depth, rows * 42);
    });

    it("cuts the corner, edge and inner pockets to the hybrid profile", async () => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, quality);
      const { sections } = await checkMesh(
        baseplate.mesh,
        POCKET_OPENINGS.map(({ z }) => z),
      );
      const centres = cellCentres(columns, rows);
      // Corners, the middle of the first column and a cell inside the grid.
      const sampled = [0, rows - 1, rows * (columns - 1), centres.length - 1, Math.floor(rows / 2), Math.floor(centres.length / 2) + 1];
      for (const index of sampled) {
        const centre = centres[index] as [number, number];
        for (const { z, inset } of POCKET_OPENINGS) {
          const opening = pocketOpening(sections.get(z) ?? [], centre);
          expectWithin(opening?.width, STANDARD_CELL_SIZE_MM - 2 * inset);
          expectWithin(opening?.depth, STANDARD_CELL_SIZE_MM - 2 * inset);
        }
      }
    });
  });
});

describe("assembly strategies", () => {
  // The default assembly (cell bricks joined at the mesh level, ADR 0004) must give the
  // same solid as the grouped boolean fallback.
  const VOLUME_TOLERANCE_MM3 = 0.1;

  describe.each<Quality>(["preview", "final"])("%s quality", (quality) => {
    it.each<[number, number]>([
      [2, 2],
      [3, 2],
      [2, 5],
      [7, 4],
      [10, 10],
    ])("%i × %i cells have the same volume and bounds as the boolean fallback", async (columns, rows) => {
      const [fast, fallback] = await Promise.all([
        generateBaseplate({ sizeMode: "cells", columns, rows }, quality),
        generateBaseplate({ sizeMode: "cells", columns, rows }, quality, { strategy: "boolean" }),
      ]);
      const [fastCheck, fallbackCheck] = await Promise.all([checkMesh(fast.mesh), checkMesh(fallback.mesh)]);
      expect(fastCheck.status).toBe("NoError");
      expect(fallbackCheck.status).toBe("NoError");
      expectWithin(fastCheck.volume, fallbackCheck.volume, VOLUME_TOLERANCE_MM3);
      expect(fastCheck.genus).toBe(fallbackCheck.genus);
      for (const axis of [0, 1, 2] as const) {
        expectWithin(fastCheck.bounds.min[axis], fallbackCheck.bounds.min[axis]);
        expectWithin(fastCheck.bounds.max[axis], fallbackCheck.bounds.max[axis]);
      }
      expect(fast.layout).toEqual(fallback.layout);
    });
  });

  it("builds single-row and single-column grids with the boolean fallback", async () => {
    for (const [columns, rows] of [
      [1, 1],
      [1, 6],
      [6, 1],
    ] as const) {
      const byDefault = await generateBaseplate({ sizeMode: "cells", columns, rows }, "final");
      const fallback = await generateBaseplate({ sizeMode: "cells", columns, rows }, "final", { strategy: "boolean" });
      expectWithin((await checkMesh(byDefault.mesh)).volume, (await checkMesh(fallback.mesh)).volume, 0);
      await expect(generateBaseplate({ sizeMode: "cells", columns, rows }, "final", { strategy: "bricks" })).rejects.toThrow(RangeError);
    }
  });
});

describe("loadEngine", () => {
  it("loads the engine ahead of the first generation", async () => {
    await expect(loadEngine()).resolves.toBeUndefined();
  });
});

describe("generateBaseplate settings", () => {
  it("accepts 1 to 24 cells per axis, rounding the others into range", () => {
    const columns = [0, 1, 2.4, 2.6, 24, 25, -3, Number.POSITIVE_INFINITY].map((value) => clampSettings({ columns: value }).columns);
    expect(columns).toEqual([1, 1, 2, 3, 24, 24, 1, 24]);
  });

  it("brings out-of-range cell counts back into range", async () => {
    const tooMany = await generateBaseplate({ sizeMode: "cells", columns: 99, rows: 0 }, "preview");
    expect([tooMany.layout.columns, tooMany.layout.rows]).toEqual([24, 1]);
    expectWithin(tooMany.stats.dimensions.width, 24 * 42);
    expectWithin(tooMany.stats.dimensions.depth, 42);

    const odd = await generateBaseplate({ sizeMode: "cells", columns: 2.6, rows: -3 }, "preview");
    expect([odd.layout.columns, odd.layout.rows]).toEqual([3, 1]);

    // Not a number: the default count (4 × 3).
    const invalid = await generateBaseplate({ sizeMode: "cells", columns: Number.NaN, rows: Number.POSITIVE_INFINITY }, "preview");
    expect([invalid.layout.columns, invalid.layout.rows]).toEqual([4, 24]);
  });

  it("uses fewer triangles for the preview than for the final quality", async () => {
    const preview = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "preview");
    const final = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "final");
    expect(preview.mesh.indices.length).toBeLessThan(final.mesh.indices.length);
  });
});

describe("serializeStl", () => {
  it("writes a binary STL that reads back with the same volume and dimensions", async () => {
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 3, rows: 2 }, "final");
    const bytes = serializeStl(baseplate.mesh);
    const triangles = baseplate.mesh.indices.length / 3;
    expect(bytes.byteLength).toBe(84 + 50 * triangles);

    const original = await checkMesh(baseplate.mesh);
    const reread = await checkMesh(readBinaryStl(bytes));
    expect(reread.status).toBe("NoError");
    // Coordinates are written to 0.00001 mm: each vertex moves by up to 0.000005 mm, which
    // changes the volume of a 20 × 20 (half a million mm³) by a few thousandths of a mm³.
    expectWithin(reread.volume, original.volume, Math.max(TOLERANCE_MM, 1e-8 * original.volume));
    for (const axis of [0, 1, 2] as const) {
      expectWithin(reread.bounds.min[axis], original.bounds.min[axis]);
      expectWithin(reread.bounds.max[axis], original.bounds.max[axis]);
    }
  });
});

describe("serialize3mf", () => {
  // An absolute share link, as the app passes it: its "&" must survive the XML.
  const shareLink = "https://example.org/fr/baseplate?v=1&mode=cells&cx=3&cy=2";

  it("writes a 3MF package that slicers open: one named object, in millimetres", async () => {
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 3, rows: 2 }, "preview");
    const content = readThreeMf(serialize3mf(baseplate.mesh, { name: "baseplate 3x2", shareLink }));
    expect(content.parts).toEqual(expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model"]));
    expect(content.modelTarget).toBe("/3D/3dmodel.model");
    expect(content.modelContentType).toBe("application/vnd.ms-package.3dmanufacturing-3dmodel+xml");
    expect(content.unit).toBe("millimeter");
    expect(content.objectNames).toEqual(["baseplate 3x2"]);
    expect(content.buildItems).toHaveLength(1);
    expect(content.metadata.get("Title")).toBe("baseplate 3x2");
  });

  it("keeps the share link of the settings in its metadata", async () => {
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns: 3, rows: 2 }, "preview");
    const content = readThreeMf(serialize3mf(baseplate.mesh, { name: "baseplate", shareLink }));
    expect([...content.metadata.values()]).toContain(shareLink);
  });

  it.each<[number, number]>([
    [1, 1],
    [3, 2],
    [20, 20],
  ])("reads back %i × %i with the same volume and dimensions as the mesh, on the build plate", async (columns, rows) => {
    const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, "final");
    const content = readThreeMf(serialize3mf(baseplate.mesh, { name: "baseplate", shareLink }));
    expect(content.mesh.indices.length).toBe(baseplate.mesh.indices.length);

    const original = await checkMesh(baseplate.mesh);
    const reread = await checkMesh(content.mesh);
    expect(reread.status).toBe("NoError");
    // Coordinates are written to 0.00001 mm: each vertex moves by up to 0.000005 mm, which
    // changes the volume of a 20 × 20 (half a million mm³) by a few thousandths of a mm³.
    expectWithin(reread.volume, original.volume, Math.max(TOLERANCE_MM, 1e-8 * original.volume));
    for (const axis of [0, 1, 2] as const) {
      expectWithin(reread.bounds.min[axis], original.bounds.min[axis]);
      expectWithin(reread.bounds.max[axis], original.bounds.max[axis]);
      // The build item places it in the positive octant, where the build plate of a 3MF starts.
      expectWithin(reread.bounds.min[axis] + content.placement[axis], 0);
    }
  });
});

describe("statistics", () => {
  describe("volume of material", () => {
    it.each<[number, number]>([
      [1, 1],
      [3, 2],
      [10, 10],
    ])("is measured on the final mesh of %i × %i cells, in mm³", async (columns, rows) => {
      const baseplate = await generateBaseplate({ sizeMode: "cells", columns, rows }, "final");
      const measured = (await checkMesh(baseplate.mesh)).volume;
      // Same solid as manifold measures it: no density, no estimate, float32 rounding only.
      expect(baseplate.stats.volume).not.toBeNull();
      expectWithin(baseplate.stats.volume ?? Number.NaN, measured, measured * 1e-6);
    });

    it("is not given for the preview, whose mesh is coarser than the printed one", async () => {
      const preview = await generateBaseplate({ sizeMode: "cells", columns: 3, rows: 2 }, "preview");
      expect(preview.stats.volume).toBeNull();
    });

    it("matches the volume of a 1 × 1 cell worked out from the hybrid profile", async () => {
      // ADR 0002, bottom to top: [z, inset] of the pocket wall; the pocket opening at a
      // height is a rounded square of side 42 − 2·inset and radius 4 − inset.
      const wall: [number, number][] = [
        [0, 2.85],
        [0.35, 2.85],
        [1.05, 2.15],
        [2.85, 2.15],
        [4.6, 0.4],
      ];
      const opening = (inset: number) => roundedSquareArea(42 - 2 * inset, 4 - inset);
      // The inset is linear on each segment, so the area is quadratic: Simpson's rule is exact.
      let pocket = 0;
      for (let i = 1; i < wall.length; i++) {
        const [z0, i0] = wall[i - 1] as [number, number];
        const [z1, i1] = wall[i] as [number, number];
        pocket += ((z1 - z0) / 6) * (opening(i0) + 4 * opening((i0 + i1) / 2) + opening(i1));
      }
      const block = roundedSquareArea(42, 4) * 4.6;
      const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 1, rows: 1 }, "final");
      // 32 segments per quarter circle fall short of the true arcs by well under 0.5 mm³.
      expectWithin(stats.volume ?? Number.NaN, block - pocket, 0.5);
    });
  });
});

describe("rounding to the layer", () => {
  it("rounds a thickness chosen by the generator up to a multiple of the layer height", () => {
    expect(roundUpToLayer(0.4, 0.2)).toBe(0.4);
    expect(roundUpToLayer(0.4, 0.28)).toBe(0.56);
    expect(roundUpToLayer(0.6, 0.2)).toBe(0.6);
    expect(roundUpToLayer(0.41, 0.2)).toBe(0.6);
    expect(roundUpToLayer(1, 0.12)).toBe(1.08);
    expect(roundUpToLayer(2.8, 0.28)).toBe(2.8);
    expect(roundUpToLayer(0.05, 0.2)).toBe(0.2);
  });

  it("never rounds the pocket profile: the baseplate stays 4.60 mm high at any layer height", async () => {
    for (const layerHeight of [0.12, 0.2, 0.28]) {
      const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, layerHeight }, "preview");
      expectWithin(stats.dimensions.height, HEIGHT_MM);
    }
  });

  it("gives the height in layers: the layers needed to print the 4.60 mm", async () => {
    const layers = async (layerHeight: number) =>
      (await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, layerHeight }, "preview")).stats.layers;
    expect(await layers(0.2)).toBe(23);
    expect(await layers(0.12)).toBe(39); // 38.3 layers: the last one is partial
    expect(await layers(0.28)).toBe(17); // 16.4 layers
    // Without a layer height, the default one of the settings: 0.2 mm.
    expect((await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2 }, "preview")).stats.layers).toBe(23);
  });
});

describe("settings", () => {
  it("keeps the defaults and ranges of every setting in one place", () => {
    // The table of settings of spec v1: the default drawer, 400 × 280 mm.
    expect(DEFAULT_SETTINGS).toEqual({
      sizeMode: "drawer",
      drawerWidth: 400,
      drawerDepth: 280,
      drawerGap: 1,
      columns: 4,
      rows: 3,
      marginWidth: 0,
      marginDepth: 0,
      alignment: "c",
      marginShape: "frame",
      baseplateType: "normal",
      pocketProfile: "hybrid",
      screws: false,
      screwShank: 3,
      screwHead: 6,
      holeGap: 0.5,
      clips: true,
      cellSize: 42,
      outerRadius: 4,
      bottomChamfer: 0,
      layerHeight: 0.2,
      lineWidth: 0.4,
    });
    expect(BASEPLATE_SETTINGS.sizeMode).toMatchObject({ options: ["drawer", "cells"], default: "drawer" });
    expect(BASEPLATE_SETTINGS.drawerWidth).toMatchObject({ min: 42, max: 1000, default: 400 });
    expect(BASEPLATE_SETTINGS.drawerDepth).toMatchObject({ min: 42, max: 1000, default: 280 });
    expect(BASEPLATE_SETTINGS.drawerGap).toMatchObject({ min: 0, max: 5, default: 1 });
    expect(BASEPLATE_SETTINGS.marginWidth).toMatchObject({ min: 0, max: 500, default: 0 });
    expect(BASEPLATE_SETTINGS.marginDepth).toMatchObject({ min: 0, max: 500, default: 0 });
    expect(BASEPLATE_SETTINGS.alignment).toMatchObject({ options: ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"], default: "c" });
    // The frame of crossbars is the default margin, the cheapest (#23, ADR 0011).
    expect(BASEPLATE_SETTINGS.marginShape).toMatchObject({ options: ["frame", "cells", "brackets"], default: "frame" });
    // The open grid is the default type (#25); the tray adds a floor, the skeleton (#26) notches the murets.
    expect(BASEPLATE_SETTINGS.baseplateType).toMatchObject({ options: ["normal", "tray", "skeleton", "clickbase"], default: "normal" });
    expect(BASEPLATE_SETTINGS.layerHeight).toMatchObject({ min: 0.12, max: 0.28, default: 0.2 });
    expect(BASEPLATE_SETTINGS.lineWidth).toMatchObject({ min: 0.1, max: 1.2, default: 0.4 });
    expect(BASEPLATE_SETTINGS.columns).toMatchObject({ min: 1, max: 24, default: 4 });
    expect(BASEPLATE_SETTINGS.rows).toMatchObject({ min: 1, max: 24, default: 3 });
    expect(BASEPLATE_SETTINGS.pocketProfile).toMatchObject({ options: ["hybrid", "flush"], default: "hybrid" });
    expect(BASEPLATE_SETTINGS.screws).toMatchObject({ default: false });
    expect(BASEPLATE_SETTINGS.screwShank).toMatchObject({ min: 2, max: 6, default: 3 });
    expect(BASEPLATE_SETTINGS.screwHead).toMatchObject({ min: 2, max: 8, default: 6 });
    expect(BASEPLATE_SETTINGS.holeGap).toMatchObject({ min: 0, max: 1, default: 0.5 });
    // The clips are on by default (#22): they only show on a baseplate cut for the build plate.
    expect(BASEPLATE_SETTINGS.clips).toMatchObject({ default: true });
    expect(BASEPLATE_SETTINGS.cellSize).toMatchObject({ min: 20, max: 80, default: STANDARD_CELL_SIZE_MM });
    expect(BASEPLATE_SETTINGS.outerRadius).toMatchObject({ min: 0, max: 10, default: 4 });
    expect(BASEPLATE_SETTINGS.bottomChamfer).toMatchObject({ min: 0, max: 3, default: 0 });
  });

  it("brings every setting into its range, and fills the missing ones with their default", () => {
    expect(
      clampSettings({
        sizeMode: "cells",
        drawerWidth: 10,
        drawerDepth: 1200,
        drawerGap: -1,
        columns: 30,
        rows: 2.6,
        marginWidth: 600,
        marginDepth: -2,
        alignment: "tr",
        marginShape: "brackets",
        baseplateType: "tray",
        pocketProfile: "flush",
        screws: true,
        screwShank: 7,
        screwHead: 1,
        holeGap: 2,
        clips: false,
        cellSize: 10,
        outerRadius: 12,
        bottomChamfer: -1,
        layerHeight: 0.05,
        lineWidth: 3,
      }),
    ).toEqual({
      sizeMode: "cells",
      drawerWidth: 42,
      drawerDepth: 1000,
      drawerGap: 0,
      columns: 24,
      rows: 3,
      marginWidth: 500,
      marginDepth: 0,
      alignment: "tr",
      marginShape: "brackets",
      baseplateType: "tray",
      pocketProfile: "flush",
      screws: true,
      screwShank: 6,
      // A screw head narrower than its shank would not hold: raised to the shank.
      screwHead: 6,
      holeGap: 1,
      clips: false,
      cellSize: 20,
      outerRadius: 10,
      bottomChamfer: 0,
      layerHeight: 0.12,
      lineWidth: 1.2,
    });
    expect(clampSettings({ layerHeight: 0.5, lineWidth: 0 })).toEqual({ ...DEFAULT_SETTINGS, layerHeight: 0.28, lineWidth: 0.1 });
    expect(clampSettings({ layerHeight: Number.NaN, lineWidth: 0.45 })).toMatchObject({ layerHeight: 0.2, lineWidth: 0.45 });
    // A choice that is not one of its options takes its default.
    const unknown = { sizeMode: "shelf", alignment: "middle", marginShape: "solid", baseplateType: "hollow", pocketProfile: "rebuilt", screws: "yes" } as unknown as Partial<BaseplateSettings>;
    expect(clampSettings(unknown)).toMatchObject({ sizeMode: "drawer", alignment: "c", marginShape: "frame", baseplateType: "normal", pocketProfile: "hybrid", screws: false });
    expect(clampSettings({ screwShank: 4, screwHead: 3.5 })).toMatchObject({ screwShank: 4, screwHead: 4 });
  });

  it("tells the advanced settings that differ from their default", () => {
    expect(ADVANCED_SETTINGS).toEqual(["cellSize", "outerRadius", "bottomChamfer", "drawerGap", "holeGap"]);
    expect(changedAdvancedSettings(DEFAULT_SETTINGS)).toEqual([]);
    // The size, the screws or the print are not advanced settings.
    expect(changedAdvancedSettings({ ...DEFAULT_SETTINGS, drawerWidth: 500, screws: true, layerHeight: 0.28 })).toEqual([]);
    expect(changedAdvancedSettings({ ...DEFAULT_SETTINGS, holeGap: 0.3, cellSize: 30 })).toEqual(["cellSize", "holeGap"]);
  });

  it("computes the settings as brought into range", async () => {
    const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 2, layerHeight: 1 }, "preview");
    expect(stats.layers).toBe(17); // 0.28 mm, the thickest layer allowed
  });
});

describe("build plate", () => {
  it("counts one piece: cutting for the build plate is not in v1", async () => {
    const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 24, rows: 24 }, "preview");
    expect(stats.pieces).toBe(1);
  });

  it("tells whether the baseplate fits on the build plate, in either orientation", async () => {
    const { stats } = await generateBaseplate({ sizeMode: "cells", columns: 5, rows: 5 }, "preview"); // 210 × 210 mm
    expect(fitsOnBuildPlate(stats.dimensions, { width: 200, depth: 200 })).toBe(false);
    expect(fitsOnBuildPlate(stats.dimensions, { width: 256, depth: 256 })).toBe(true);
    expect(fitsOnBuildPlate(stats.dimensions, { width: 210, depth: 210 })).toBe(true); // just fits

    const long = { width: 300, depth: 200, height: 4.6 };
    expect(fitsOnBuildPlate(long, { width: 310, depth: 210 })).toBe(true);
    expect(fitsOnBuildPlate(long, { width: 210, depth: 310 })).toBe(true); // turned a quarter
    expect(fitsOnBuildPlate(long, { width: 250, depth: 250 })).toBe(false);
    expect(fitsOnBuildPlate(long, { width: 300, depth: 199 })).toBe(false);
  });
});

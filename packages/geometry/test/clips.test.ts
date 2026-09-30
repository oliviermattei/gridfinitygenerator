import { describe, expect, it } from "vitest";
import {
  generateBaseplate,
  pieceMesh,
  printClips,
  printPieces,
  serialize3mf,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
} from "../src/index";
import { areaOutside, checkMesh, inSection, readThreeMf } from "./support/measure";

// Clips between the pieces of a cut baseplate (#22, ADR 0010), observed through the public
// interface: where they go, the slots they leave in the pieces, and the clip to print.

const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** Two cells of 42 mm on a plate of 50 mm: two pieces of a single cell, cut on line 1 (x = 0). */
const TWO_SINGLE_CELLS: Partial<BaseplateSettings> = { sizeMode: "cells", columns: 2, rows: 1 };
const PLATE_50: BuildPlate = { width: 50, depth: 50 };

/** Volume of the slot of one clip, both pieces: the channel of the bridge, and the slot of each leg. */
function slotVolume(top: number, bridge = 0.8): number {
  return 2 * (1.35 * 5 * bridge + (1.35 - 0.5) * 5 * (top - bridge));
}

/** The contours of the horizontal sections of every piece at `z`, together. */
async function sectionOf(baseplate: Baseplate, z: number): Promise<[number, number][][]> {
  const contours: [number, number][][] = [];
  for (const piece of baseplate.pieces) contours.push(...((await checkMesh(pieceMesh(baseplate, piece), [z])).sections.get(z) ?? []));
  return contours;
}

/** Intervals of material of a section along the line y = y0, in x (even-odd over the contours). */
function materialAlong(contours: [number, number][][], y0: number): [number, number][] {
  const xs: number[] = [];
  for (const contour of contours)
    contour.forEach(([ax, ay], k) => {
      const [bx, by] = contour[(k + 1) % contour.length] as [number, number];
      if (ay <= y0 !== by <= y0) xs.push(ax + ((y0 - ay) * (bx - ax)) / (by - ay));
    });
  xs.sort((a, b) => a - b);
  const intervals: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) intervals.push([xs[k] as number, xs[k + 1] as number]);
  return intervals;
}

describe("where the clips go", () => {
  it("puts one clip in the middle of each side of a cell along each cut: 15 on the default drawer", async () => {
    const cut = await generateBaseplate({}, "preview", { buildPlate: PLATE_256 });
    const clips = cut.layout.clips;
    expect(cut.stats.clips).toBe(15);
    expect(clips?.placements).toHaveLength(15);
    // Column cut on line 4 (x = −21), 6 rows; row cut on line 3 (y = 0), 9 columns.
    const column = clips?.placements.filter(({ cut: axis }) => axis === "column") ?? [];
    expect(column.map(({ line, cell, offset }) => [line, cell, offset])).toEqual([0, 1, 2, 3, 4, 5].map((j) => [4, j, 0]));
    expect(column.map(({ centre }) => centre)).toEqual([-105, -63, -21, 21, 63, 105].map((y) => [-21, y]));
    const row = clips?.placements.filter(({ cut: axis }) => axis === "row") ?? [];
    expect(row.map(({ centre }) => centre)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [-168 + 42 * i, 0]));
    // The slot: 1.35 mm on each side of the cut, 5 mm long, a tooth of 0.5 mm per piece, the
    // channel of the bridge up to 0.8 mm, the legs up to the foot of the upper slope, on the layer.
    expect(clips?.slot).toEqual({ halfWidth: 1.35, tooth: 0.5, length: 5, bridge: 0.8, top: 2.8 });
  });

  it("puts no clip on a baseplate in a single piece, nor with the clips off", async () => {
    for (const baseplate of [
      await generateBaseplate({}, "preview"),
      await generateBaseplate({}, "preview", { buildPlate: { width: 400, depth: 400 } }),
      await generateBaseplate({ clips: false }, "preview", { buildPlate: PLATE_256 }),
    ]) {
      expect(baseplate.layout.clips).toBeNull();
      expect(baseplate.stats.clips).toBe(0);
      expect(baseplate.clip).toBeNull();
    }
  });

  it("follows the flush profile and the layer: the slot stays under the upper slope of the pocket", async () => {
    const flush = await generateBaseplate({ pocketProfile: "flush" }, "preview", { buildPlate: PLATE_256 });
    expect(flush.layout.clips?.slot).toMatchObject({ bridge: 0.8, top: 2.4 });
    const coarse = await generateBaseplate({ layerHeight: 0.28 }, "preview", { buildPlate: PLATE_256 });
    expect(coarse.layout.clips?.slot).toMatchObject({ bridge: 0.84, top: 2.8 });
    const flushCoarse = await generateBaseplate({ pocketProfile: "flush", layerHeight: 0.28 }, "preview", { buildPlate: PLATE_256 });
    expect(flushCoarse.layout.clips?.slot).toMatchObject({ bridge: 0.84, top: 2.24 });
  });

  it("moves the clip along the cut, clear of the number of a piece of a single cell", async () => {
    const cut = await generateBaseplate(TWO_SINGLE_CELLS, "final", { buildPlate: PLATE_50 });
    expect(cut.stats.pieces).toBe(2);
    // Both numbers lie on the cut, in the middle of its side (1 and 2, 3 mm high, from −1.5 to
    // 1.5): the clip moves past them and 0.5 mm of material, to y = 4.5.
    expect(cut.layout.clips?.placements.map(({ centre, offset }) => [centre, offset])).toEqual([[[0, 4.5], 4.5]]);
    // Nothing of the numbers is lost: the pieces lose exactly one slot.
    const plain = await generateBaseplate({ ...TWO_SINGLE_CELLS, clips: false }, "final", { buildPlate: PLATE_50 });
    expect((plain.stats.volume as number) - (cut.stats.volume as number)).toBeCloseTo(slotVolume(2.8), 3);
  });

  it("leaves a clip out where the side of a cell has no room past a number", async () => {
    // 20 mm cells on a plate of 25 mm: pieces of a single cell, numbered up to 12. A number of
    // two digits (6.8 mm) leaves no room for a clip in 20 − 2 × 2.85 mm; one digit does.
    const cut = await generateBaseplate({ sizeMode: "cells", columns: 4, rows: 3, cellSize: 20 }, "preview", { buildPlate: { width: 25, depth: 25 } });
    expect(cut.stats.pieces).toBe(12);
    const sides = 3 * 3 + 2 * 4; // 3 column cuts of 3 cells, 2 row cuts of 4 cells
    expect(cut.stats.clips).toBeGreaterThan(0);
    expect(cut.stats.clips).toBeLessThan(sides);
    for (const { offset } of cut.layout.clips?.placements ?? []) expect(Math.abs(offset) + 2.5).toBeLessThanOrEqual(10 - 2.85 + 1e-9);
  });
});

describe("slots in the pieces", () => {
  it("cuts a slot on both sides of each cut, in the foot of the muret only, and nothing above 2.8 mm", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const plain = await generateBaseplate({ clips: false }, "final", { buildPlate: PLATE_256 });
    const count = cut.stats.clips;
    // The material lost is exactly the slots: none of them reaches a pocket or a number.
    expect((plain.stats.volume as number) - (cut.stats.volume as number)).toBeCloseTo(count * slotVolume(2.8), 2);
    // Heights of reference: under the tooth (channel), along the legs, then above the slot.
    const lost = async (z: number) => {
      const [withClips, without] = [await sectionOf(cut, z), await sectionOf(plain, z)];
      expect(await areaOutside(withClips, without)).toBeLessThan(1e-3); // nothing added
      return areaOutside(without, withClips);
    };
    expect(await lost(0.4)).toBeCloseTo(count * 2.7 * 5, 1);
    expect(await lost(1.5)).toBeCloseTo(count * 2 * 0.85 * 5, 1);
    expect(await lost(2.7)).toBeCloseTo(count * 2 * 0.85 * 5, 1);
    // Invisible from above: the pieces are untouched over the slot, on the slopes and the flats.
    for (const z of [2.9, 3.5, 4.5]) expect(await lost(z)).toBeLessThan(1e-3);
  });

  it("shapes the slot astride the cut: a channel under the tooth, a leg on each side, the tooth each piece keeps", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const [x, y] = [-21, 63]; // a clip on the column cut
    const [low, mid, high] = [await sectionOf(cut, 0.4), await sectionOf(cut, 1.5), await sectionOf(cut, 3)];
    for (const side of [-1, 1]) {
      expect(inSection(low, [x + side * 0.25, y])).toBe(false); // channel of the bridge
      expect(inSection(low, [x + side * 1.75, y])).toBe(true);
      expect(inSection(mid, [x + side * 0.25, y])).toBe(true); // tooth
      expect(inSection(mid, [x + side * 0.9, y])).toBe(false); // leg
      expect(inSection(mid, [x + side * 1.75, y])).toBe(true); // skin towards the pocket
      expect(inSection(high, [x + side * 0.9, y])).toBe(true);
    }
    // 5 mm long: closed at 2.6 mm from its middle.
    expect(inSection(mid, [x - 0.9, y + 2.4])).toBe(false);
    expect(inSection(mid, [x - 0.9, y + 2.6])).toBe(true);
  });

  it.each([
    ["hybrid", {}, [0.1, 0.7, 1.5, 2.7], 2.8],
    ["flush", { pocketProfile: "flush" }, [0.1, 0.5, 1.5, 2.3], 2.4],
  ] as const)("keeps at least 0.8 mm of skin towards the pocket at the heights of reference, %s profile", async (_, settings, heights, top) => {
    const cut = await generateBaseplate(settings, "final", { buildPlate: PLATE_256 });
    expect(cut.layout.clips?.slot.top).toBe(top);
    for (const z of heights) {
      // Along y = 63, through a clip on the cut x = −21: the material of the muret left of it.
      const along = materialAlong(await sectionOf(cut, z), 63).filter(([a, b]) => b > -26 && a < -21);
      const skin = along[0] as [number, number];
      expect(skin[1]).toBeCloseTo(-21 - 1.35, 4);
      expect(skin[1] - skin[0]).toBeGreaterThanOrEqual(0.8 - 1e-4);
    }
  });
});

describe("pieces with clips", () => {
  const CASES: [name: string, settings: Partial<BaseplateSettings>, plate: BuildPlate][] = [
    ["default drawer", {}, { width: 180, depth: 180 }],
    ["flush profile, 0.28 mm layers, chamfered, screws", { pocketProfile: "flush", layerHeight: 0.28, bottomChamfer: 1, screws: true }, { width: 180, depth: 180 }],
    ["3 × 2 cells, a piece per cell, clips moved clear of the numbers", { sizeMode: "cells", columns: 3, rows: 2 }, PLATE_50],
  ];

  it.each(CASES)("%s: each piece is closed (NoError), the same by the cell bricks and by booleans", async (_, settings, plate) => {
    const bricks = await generateBaseplate(settings, "final", { strategy: "bricks", buildPlate: plate });
    const booleans = await generateBaseplate(settings, "final", { strategy: "boolean", buildPlate: plate });
    expect(bricks.stats.clips).toBeGreaterThan(0);
    expect(booleans.layout.clips).toEqual(bricks.layout.clips);
    for (const [index, piece] of bricks.pieces.entries()) {
      const check = await checkMesh(pieceMesh(bricks, piece));
      expect(check.status).toBe("NoError");
      expect(Math.abs((booleans.pieces[index]?.volume as number) - (piece.volume as number))).toBeLessThan(0.1);
    }
  });
});

describe("the clip to print", () => {
  it("is a closed U lying on its side, smaller than its slot by the gaps", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const check = await checkMesh(cut.clip as NonNullable<Baseplate["clip"]>, [2]);
    expect(check.status).toBe("NoError");
    // Across the cut 2.7 − 2 × 0.1, up 2.8 − 0.2, along the cut 5 − 2 × 0.25.
    expect(check.bounds.min).toEqual([-1.25, 0, 0]);
    expect(check.bounds.max[0]).toBeCloseTo(1.25, 5);
    expect(check.bounds.max[1]).toBeCloseTo(2.6, 5);
    expect(check.bounds.max[2]).toBeCloseTo(4.5, 5);
    // Two legs of 0.65 mm, 1.2 mm apart (the tooth of 1 mm and 0.1 mm each side), on a bridge of 0.6 mm.
    const legs = materialAlong(check.sections.get(2) ?? [], 2).map(([a, b]) => [Number(a.toFixed(4)), Number(b.toFixed(4))]);
    expect(legs).toEqual([
      [-1.25, -0.6],
      [0.6, 1.25],
    ]);
    // The outline, less the lead-in chamfers (4 triangles of 0.15 mm), times its length.
    const area = 2.5 * 0.6 + 2 * 0.65 * 2 - 4 * (0.15 * 0.15) / 2;
    expect(check.volume).toBeCloseTo(area * 4.5, 4);
  });

  it("is laid out as many times as there are clips, beside the pieces, and exported as one more object", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const pieces = printPieces(cut);
    const clips = printClips(cut, pieces);
    const check = await checkMesh(clips as NonNullable<typeof clips>);
    expect(check.status).toBe("NoError");
    expect(check.genus).toBe(1 - cut.stats.clips); // 15 shells of genus 0
    const single = await checkMesh(cut.clip as NonNullable<Baseplate["clip"]>);
    expect(check.volume).toBeCloseTo(15 * single.volume, 2); // float32 coordinates, 230 mm off the origin
    const right = Math.max(...(await Promise.all(pieces.map(async (mesh) => (await checkMesh(mesh)).bounds.max[0]))));
    expect(check.bounds.min[0]).toBeCloseTo(right + 10, 4);
    const objects = [...pieces.map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` })), { mesh: clips as NonNullable<typeof clips>, name: "clip × 15" }];
    const content = readThreeMf(serialize3mf(objects, { name: "baseplate-9x6-399x279mm", shareLink: "https://example.org/fr/baseplate?v=1" }));
    expect(content.objectNames).toEqual(["pièce 1", "pièce 2", "pièce 3", "pièce 4", "clip × 15"]);
    for (const { mesh } of content.objects) expect((await checkMesh(mesh)).status).toBe("NoError");
    // Without clips, nothing to lay out.
    expect(printClips(await generateBaseplate({}, "preview"))).toBeNull();
  });
});

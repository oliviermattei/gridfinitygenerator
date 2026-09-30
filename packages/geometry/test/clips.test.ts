import { describe, expect, it } from "vitest";
import {
  BASEPLATE_TYPES,
  generateBaseplate,
  generateClip,
  pieceMesh,
  printClips,
  printPieces,
  serialize3mf,
  type Baseplate,
  type BaseplateSettings,
  type BuildPlate,
  type EdgeSlot,
} from "../src/index";
import { areaOutside, badEdges, checkMesh, inSection, readThreeMf } from "./support/measure";

// Clips between the pieces of a cut baseplate (#22, ADR 0010), at the ends of each junction,
// against the corners (#30, ADR 0018), and the edge slots of the sides without margin (#37,
// ADR 0022), observed through the public interface: where they go, the slots they leave in the
// pieces, and the clip to print.

const PLATE_256: BuildPlate = { width: 256, depth: 256 };
/** Start of a slot from the axis of a crossing of two cuts, and from the edge of the lattice. */
const CROSSING_START = 1.92;
const EDGE_START = 0.8;

/** Volume of the slot of one clip, both pieces: the channel of the bridge, and the slot of each leg. */
function slotVolume(top: number, bridge = 0.8, length = 5): number {
  return 2 * (1.35 * length * bridge + (1.35 - 0.5) * length * (top - bridge));
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

/** The same section turned a quarter, (x, y) → (y, −x): a line along x at y = y0 in it is the line along y at x = −y0... */
function turned(contours: [number, number][][]): [number, number][][] {
  return contours.map((contour) => contour.map(([x, y]) => [y, -x] as [number, number]));
}

/** Rounded to a micrometre, for comparing positions computed along different paths. */
const um = (value: number) => Math.round(value * 1000) / 1000 + 0;

/** 2 × `rows` cells, cut once along its middle (x = 0): a single junction of `rows` cells. */
async function clipsAlongOneCut(rows: number) {
  const cut = await generateBaseplate({ sizeMode: "cells", columns: 2, rows }, "preview", { buildPlate: { width: 50, depth: rows * 42 + 8 } });
  expect(cut.layout.split.columnCuts).toEqual([1]);
  expect(cut.layout.split.rowCuts).toEqual([]);
  return cut;
}

describe("where the clips go", () => {
  it.each([
    [1, [[0, -1]]],
    [2, [[0, -1]]],
    [3, [[0, -1], [2, 1]]],
    [5, [[0, -1], [4, 1]]],
  ] as const)("gives a junction of %i cells between two edges of the grid its clips at its ends, against the corners", async (rows, ends) => {
    const cut = await clipsAlongOneCut(rows);
    const placements = cut.layout.clips?.placements ?? [];
    expect(cut.stats.clips).toBe(ends.length);
    // Each slot starts 0.8 mm inside the edge of the lattice (the frame beyond it is only 2 mm
    // high), and runs 5 mm along the cut from there: its centre is 3.3 mm from the edge.
    const edge = (rows * 42) / 2;
    expect(placements.map(({ cut: axis, line, cell, start, offset, centre }) => [axis, line, cell, start, um(offset), centre.map(um)])).toEqual(
      ends.map(([cell, towards]) => ["column", 1, cell, EDGE_START, um(towards * (21 - 3.3)), [0, um(towards * (edge - 3.3))]]),
    );
  });

  it("puts 8 clips on the default drawer cut in 4 pieces: two per junction, 1.92 mm off the crossing of the cuts", async () => {
    const cut = await generateBaseplate({}, "preview", { buildPlate: PLATE_256 });
    const clips = cut.layout.clips;
    expect(cut.stats.clips).toBe(8);
    // Column cut on line 4 (x = −21), rows 0 to 2 and 3 to 5 either side of the row cut on line 3
    // (y = 0); row cut, columns 0 to 3 and 4 to 8 either side of the column cut.
    expect(clips?.placements.map(({ cut: axis, cell, start, centre }) => [axis, cell, start, centre.map(um)])).toEqual([
      ["column", 0, EDGE_START, [-21, -122.7]],
      ["column", 2, CROSSING_START, [-21, -4.42]],
      ["column", 3, CROSSING_START, [-21, 4.42]],
      ["column", 5, EDGE_START, [-21, 122.7]],
      ["row", 0, EDGE_START, [-185.7, 0]],
      ["row", 3, CROSSING_START, [-25.42, 0]],
      ["row", 4, CROSSING_START, [-16.58, 0]],
      ["row", 8, EDGE_START, [185.7, 0]],
    ]);
    // The slot of ADR 0010, unchanged: 1.35 mm on each side of the cut, 5 mm long, a tooth of
    // 0.5 mm per piece, the channel of the bridge up to 0.8 mm, the legs up to the foot of the
    // upper slope, on the layer.
    expect(clips?.slot).toEqual({ halfWidth: 1.35, tooth: 0.5, length: 5, bridge: 0.8, top: 2.8 });
  });

  it("gives a junction of one or two cells a single clip, on its end at a crossing of two cuts, or its first end", async () => {
    // 2 × 6 cells on a plate of 50 × 90 mm: 6 pieces of 1 × 2 cells, cut once across X and
    // twice across Y (lines 2 and 4). Each junction along the column cut is 2 cells long.
    const cut = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 6 }, "preview", { buildPlate: { width: 50, depth: 90 } });
    expect(cut.layout.split).toMatchObject({ columnCuts: [1], rowCuts: [2, 4] });
    const column = cut.layout.clips?.placements.filter(({ cut: axis }) => axis === "column") ?? [];
    // Rows 0-1: at the crossing with line 2; rows 2-3, between two crossings: at the first;
    // rows 4-5: at the crossing with line 4.
    expect(column.map(({ cell, start, offset }) => [cell, start, um(offset)])).toEqual([
      [1, CROSSING_START, 16.58],
      [2, CROSSING_START, -16.58],
      [4, CROSSING_START, -16.58],
    ]);
    // Across Y, junctions of a single cell, at their end on the crossing with the column cut.
    const row = cut.layout.clips?.placements.filter(({ cut: axis }) => axis === "row") ?? [];
    expect(row.map(({ line, cell, start }) => [line, cell, start])).toEqual([
      [2, 0, CROSSING_START],
      [2, 1, CROSSING_START],
      [4, 0, CROSSING_START],
      [4, 1, CROSSING_START],
    ]);
  });

  it("puts two clips on each junction of the largest drawer in 25 pieces, and none on a baseplate in a single piece, nor with the clips off", async () => {
    const largest = await generateBaseplate({ drawerWidth: 1000, drawerDepth: 1000 }, "preview", { buildPlate: PLATE_256 });
    expect(largest.stats.pieces).toBe(25);
    expect(largest.stats.clips).toBe(2 * (4 * 5 + 4 * 5));
    // The default drawer has a margin on every side: no edge slot either (ADR 0022).
    for (const baseplate of [
      await generateBaseplate({}, "preview"),
      await generateBaseplate({}, "preview", { buildPlate: { width: 400, depth: 400 } }),
      await generateBaseplate({}, "preview", { buildPlate: PLATE_256, clips: false }),
    ]) {
      expect(baseplate.layout.clips).toBeNull();
      expect(baseplate.stats.clips).toBe(0);
      // The clip is there all the same, to download alone.
      expect((await checkMesh(baseplate.clip)).status).toBe("NoError");
    }
  });

  it("leaves the slots out of the preview, which never shows them from above, and counts the clips all the same", async () => {
    const [preview, bare, final] = await Promise.all([
      generateBaseplate({ baseplateType: "clickbase" }, "preview", { buildPlate: PLATE_256 }),
      generateBaseplate({ baseplateType: "clickbase" }, "preview", { buildPlate: PLATE_256, clips: false }),
      generateBaseplate({ baseplateType: "clickbase" }, "final", { buildPlate: PLATE_256 }),
    ]);
    expect(preview.mesh.indices.length).toBe(bare.mesh.indices.length);
    expect(preview.stats.clips).toBe(8);
    expect(preview.layout.clips).toEqual(final.layout.clips);
  });

  it("follows the flush profile and the layer: the slot stays under the upper slope of the pocket", async () => {
    const flush = await generateBaseplate({ pocketProfile: "flush" }, "preview", { buildPlate: PLATE_256 });
    expect(flush.layout.clips?.slot).toMatchObject({ bridge: 0.8, top: 2.4 });
    const coarse = await generateBaseplate({ layerHeight: 0.28 }, "preview", { buildPlate: PLATE_256 });
    expect(coarse.layout.clips?.slot).toMatchObject({ bridge: 0.84, top: 2.8 });
    const flushCoarse = await generateBaseplate({ pocketProfile: "flush", layerHeight: 0.28 }, "preview", { buildPlate: PLATE_256 });
    expect(flushCoarse.layout.clips?.slot).toMatchObject({ bridge: 0.84, top: 2.24 });
  });

  it("starts a slot farther from an edge of the grid on the outline, to keep 0.8 mm of skin over the bottom chamfer", async () => {
    // Without margin, the edge of the lattice is the outline: 0.8 mm plus the chamfer of 1.5 mm.
    const cut = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 3, bottomChamfer: 1.5 }, "final", { buildPlate: { width: 50, depth: 300 } });
    expect(cut.layout.clips?.placements.map(({ start }) => start)).toEqual([2.3, 2.3]);
    const plain = await generateBaseplate({ sizeMode: "cells", columns: 2, rows: 3, bottomChamfer: 1.5 }, "final", { buildPlate: { width: 50, depth: 300 }, clips: false });
    expect((plain.stats.volume as number) - (cut.stats.volume as number)).toBeCloseTo(2 * slotVolume(2.8), 3);
  });

  it("keeps the clips clear of the number of a piece of a single cell: at the other end, or none when neither has room", async () => {
    // 20 mm cells on a plate of 25 mm: 16 pieces of a single cell, numbered up to 16, each on a
    // cut, in the middle of the side. 24 junctions of a single cell: 3 column cuts and 3 row cuts
    // of 4 cells. A number of two digits (6.8 mm and 0.5 mm of clearance) reaches a slot at either
    // end: an outer junction takes its clip at the edge of the grid instead, an inner one none.
    const settings = { sizeMode: "cells", columns: 4, rows: 4, cellSize: 20 } as const;
    const plate = { buildPlate: { width: 25, depth: 25 } };
    const cut = await generateBaseplate(settings, "final", plate);
    expect(cut.stats.pieces).toBe(16);
    expect(cut.stats.clips).toBeGreaterThan(20);
    expect(cut.stats.clips).toBeLessThan(24);
    expect(cut.layout.clips?.placements.some(({ start }) => start === EDGE_START)).toBe(true);
    const plain = await generateBaseplate(settings, "final", { ...plate, clips: false });
    // Nothing of the numbers is lost: the pieces lose exactly their slots, and half a slot per
    // edge slot, two on each side of 4 cells without margin (ADR 0022).
    expect(cut.layout.clips?.edges).toHaveLength(8);
    expect((plain.stats.volume as number) - (cut.stats.volume as number)).toBeCloseTo((cut.stats.clips + 8 / 2) * slotVolume(2.8), 2);
  });
});

describe("slots in the pieces", () => {
  it("cuts a slot on both sides of each cut, in the foot of the muret only, and nothing above 2.8 mm", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const plain = await generateBaseplate({}, "final", { buildPlate: PLATE_256, clips: false });
    const count = cut.stats.clips;
    // The material lost is exactly the slots: none of them reaches a pocket, a margin or a number.
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

  it("shapes the slot astride the cut, against the corner: a channel under the tooth, a leg on each side, the tooth each piece keeps", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const [x, y] = [-21, -4.42]; // the clip on the column cut, below the crossing of the cuts at (−21, 0)
    const [low, mid, high] = [await sectionOf(cut, 0.4), await sectionOf(cut, 1.5), await sectionOf(cut, 3)];
    for (const side of [-1, 1]) {
      expect(inSection(low, [x + side * 0.25, y])).toBe(false); // channel of the bridge
      expect(inSection(low, [x + side * 1.75, y])).toBe(true);
      expect(inSection(mid, [x + side * 0.25, y])).toBe(true); // tooth
      expect(inSection(mid, [x + side * 0.9, y])).toBe(false); // leg
      expect(inSection(mid, [x + side * 1.75, y])).toBe(true); // skin towards the pocket
      expect(inSection(high, [x + side * 0.9, y])).toBe(true);
    }
    // From 1.92 to 6.92 mm below the crossing: closed at both ends.
    expect(inSection(mid, [x - 0.9, -1.92 - 0.1])).toBe(false);
    expect(inSection(mid, [x - 0.9, -1.92 + 0.1])).toBe(true);
    expect(inSection(mid, [x - 0.9, -6.92 + 0.1])).toBe(false);
    expect(inSection(mid, [x - 0.9, -6.92 - 0.1])).toBe(true);
    // At the crossing, the slots of the two cuts keep 0.8 mm of material between their corners.
    const corner = -(1.35 + 1.92) / 2;
    expect(inSection(mid, [x + corner, corner])).toBe(true);
    expect(inSection(mid, [x - 1.3, -1.3])).toBe(true);
  });

  it("keeps 0.8 mm of material between a slot and the margin at the edge of the grid", async () => {
    // Along the leg of the clip at the front end of the column cut (x = −21 − 0.9): from the
    // edge of the lattice (y = −126), 0.8 mm of muret, then the slot; the hole of the frame
    // before it, above the crossbar (2 mm).
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const leg = materialAlong(turned(await sectionOf(cut, 2.5)), 21 + 0.9).map(([a, b]) => [Number(a.toFixed(4)), Number(b.toFixed(4))]);
    expect(leg.find(([, b]) => b === -126 + 0.8)).toEqual([-126, -125.2]);
  });

  it.each([
    ["hybrid", {}, [0.1, 0.7, 1.5, 2.7], 2.8],
    ["flush", { pocketProfile: "flush" }, [0.1, 0.5, 1.5, 2.3], 2.4],
  ] as const)("keeps at least 0.8 mm of skin towards the pocket at the heights of reference, %s profile", async (_, settings, heights, top) => {
    const cut = await generateBaseplate(settings, "final", { buildPlate: PLATE_256 });
    expect(cut.layout.clips?.slot.top).toBe(top);
    for (const z of heights) {
      // Along y = −4.42, through the clip on the cut x = −21: the material of the muret left of it.
      const along = materialAlong(await sectionOf(cut, z), -4.42).filter(([a, b]) => b > -26 && a < -21);
      const skin = along[0] as [number, number];
      expect(skin[1]).toBeCloseTo(-21 - 1.35, 4);
      expect(skin[1] - skin[0]).toBeGreaterThanOrEqual(0.8 - 1e-4);
    }
  });
});

describe("every type takes its clips (ADR 0018)", () => {
  // 2 × 2 cells on a plate of 50 mm: 4 pieces of a single cell, the cuts crossing at (0, 0), and
  // a clip on each of the 4 junctions, at the crossing: the most crowded corner there is.
  const KIT = { sizeMode: "cells", columns: 2, rows: 2 } as const;
  it.each(BASEPLATE_TYPES.flatMap((baseplateType) => (["hybrid", "flush"] as const).map((pocketProfile) => [baseplateType, pocketProfile] as const)))(
    "%s, %s: 0.8 mm of skin towards the pocket and between the slots, nothing above the slot, NoError, the same by bricks and booleans",
    async (baseplateType, pocketProfile) => {
      const settings = { ...KIT, baseplateType, pocketProfile };
      const plate = { width: 50, depth: 50 };
      const [bricks, booleans] = await Promise.all([
        generateBaseplate(settings, "final", { strategy: "bricks", buildPlate: plate }),
        generateBaseplate(settings, "final", { strategy: "boolean", buildPlate: plate }),
      ]);
      expect(bricks.stats.clips).toBe(4);
      expect(booleans.layout).toEqual(bricks.layout);
      const { slot } = bricks.layout.clips as NonNullable<Baseplate["layout"]["clips"]>;
      for (const { mesh } of [bricks, booleans]) {
        expect((await checkMesh(mesh)).status).toBe("NoError");
        expect(badEdges(mesh)).toBe(0);
      }
      expect(Math.abs((bricks.stats.volume as number) - (booleans.stats.volume as number))).toBeLessThan(0.1);
      const end = CROSSING_START + slot.length;
      for (const z of [0.1, 0.5, 1.5, slot.top - 0.1]) {
        const section = await sectionOf(bricks, z);
        // Across each of the 4 slots at mid-length, in the front left piece and the back right
        // one: the skin towards the pocket, then the slot (the leg, or the channel under 0.8 mm).
        for (const [contours, sign] of [
          [section, -1],
          [section, 1],
          [turned(section), -1],
          [turned(section), 1],
        ] as const) {
          const along = materialAlong(contours, sign * (CROSSING_START + slot.length / 2)).filter(([a, b]) => b > -6 && a < 0);
          const skin = along[0] as [number, number];
          expect(Math.min(skin[1], -slot.halfWidth) - skin[0], `${z} mm`).toBeGreaterThanOrEqual(0.8 - 1e-4);
        }
        // Between the corners of the two slots of each quarter of the crossing.
        const corner = (slot.halfWidth + CROSSING_START) / 2;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) expect(inSection(section, [sx * corner, sy * corner])).toBe(true);
      }
      // Nothing is removed over a slot: seen from above, the muret is whole.
      for (const z of [slot.top + 0.05, slot.top + 0.5]) {
        const section = await sectionOf(bricks, z);
        for (const u of [-1.3, -0.9, 0.9, 1.3])
          for (const v of [CROSSING_START + 0.05, CROSSING_START + slot.length / 2, end - 0.05])
            for (const sign of [-1, 1]) {
              expect(inSection(section, [u, sign * v])).toBe(true);
              expect(inSection(section, [sign * v, u])).toBe(true);
            }
      }
    },
  );
});

describe("edge slots on the sides without margin (#37, ADR 0022)", () => {
  /** 2 × 2 cells without margin, from −42 to 42 on both axes. */
  const SQUARE = { sizeMode: "cells", columns: 2, rows: 2 } as const;
  const sidesOf = (edges: readonly EdgeSlot[]) => edges.map(({ side }) => side);
  /** A point `depth` inside the outline from the middle of an edge slot, across it. */
  const inward = ({ side, centre: [x, y] }: EdgeSlot, depth: number): [number, number] =>
    [
      [x - depth, y],
      [x, y - depth],
      [x + depth, y],
      [x, y + depth],
    ][side] as [number, number];

  it("cuts them on the sides without margin only: the 4 sides of cells without margin, none on the default drawer", async () => {
    const square = await generateBaseplate(SQUARE, "preview");
    // Right, back, left, front: a side of 2 cells takes a single one, at its first end.
    expect(sidesOf(square.layout.clips?.edges ?? [])).toEqual([0, 1, 2, 3]);
    expect(square.layout.clips?.placements).toEqual([]);
    expect((await generateBaseplate({}, "preview")).layout.clips).toBeNull();
    // A grid pushed to the back left of the drawer: no margin on the left nor at the back.
    const corner = await generateBaseplate({ alignment: "tl" }, "preview");
    expect(corner.layout.margins).toMatchObject({ left: 0, back: 0 });
    expect(sidesOf(corner.layout.clips?.edges ?? [])).toEqual([1, 1, 2, 2]);
    // A margin on the left and on the right only: the front and the back, 4 cells long, two each.
    const sides = await generateBaseplate({ sizeMode: "cells", columns: 4, rows: 3, marginWidth: 20 }, "preview");
    expect(sidesOf(sides.layout.clips?.edges ?? [])).toEqual([1, 1, 3, 3]);
  });

  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [5, 2],
  ])("gives a side of %i cells %i slot(s), against its corners, at its first end for a single one", async (columns, count) => {
    const { layout } = await generateBaseplate({ sizeMode: "cells", columns, rows: 1 }, "preview");
    // The front side, along X from x = −21 · columns: the slot starts 4 mm from the corner (its radius).
    const front = (layout.clips?.edges ?? []).filter(({ side }) => side === 3);
    const corner = 21 * columns;
    const ends = count === 1 ? [-1] : [-1, 1];
    expect(front.map(({ cut, line, cell, start, centre }) => [cut, line, cell, start, centre.map(um)])).toEqual(
      ends.map((towards) => ["row", 0, towards < 0 ? 0 : columns - 1, 4, [um(towards * (corner - 4 - 2.5)), -21]]),
    );
    // The sides of a single cell: one slot each, at the front.
    expect((layout.clips?.edges ?? []).filter(({ side }) => side === 0 || side === 2).map(({ centre }) => um(centre[1]))).toEqual([um(-21 + 6.5), um(-21 + 6.5)]);
  });

  it.each([
    ["the rounded corner of 4 mm", {}, 4],
    ["the edge slot of the other side, without rounded corner", { outerRadius: 0 }, 1.92],
    ["the skin over a chamfer of 1.3 mm on the other side", { outerRadius: 0, bottomChamfer: 1.3 }, 2.1],
    ["the rounded corner of 10 mm", { outerRadius: 10 }, 10],
    ["the skin inside the lattice, a margin on the other side", { rows: 3, marginDepth: 20 }, 0.8],
  ])("starts a slot past %s", async (_, settings, start) => {
    const { layout } = await generateBaseplate({ ...SQUARE, ...settings }, "preview");
    const edges = layout.clips?.edges ?? [];
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) expect(edge.start).toBe(start);
  });

  it("takes none under a bottom chamfer deeper than the channel and the tooth, nor where the slot passes the middle of the side", async () => {
    // Deeper than 0.8 + 0.5 mm, the chamfer takes the tooth where the leg grips it (prototypes/edge-slots).
    expect((await generateBaseplate({ ...SQUARE, bottomChamfer: 1.35 }, "preview")).layout.clips).toBeNull();
    expect((await generateBaseplate({ ...SQUARE, bottomChamfer: 1.3 }, "preview")).layout.clips?.edges).toHaveLength(4);
    // 20 mm cells: 4 mm of radius and 5 mm of slot fit in the half side, 6 mm of radius do not.
    expect((await generateBaseplate({ ...SQUARE, cellSize: 20 }, "preview")).layout.clips?.edges).toHaveLength(4);
    expect((await generateBaseplate({ ...SQUARE, cellSize: 20, outerRadius: 6 }, "preview")).layout.clips).toBeNull();
  });

  it("counts no clip for them, in the statistics as in the mass, and leaves them out of the preview", async () => {
    const [preview, bare, final] = await Promise.all([
      generateBaseplate(SQUARE, "preview"),
      generateBaseplate(SQUARE, "preview", { clips: false }),
      generateBaseplate(SQUARE, "final"),
    ]);
    expect(final.stats.clips).toBe(0);
    expect(final.stats.clipsVolume).toBe(0);
    expect(printClips(final)).toBeNull();
    expect(preview.layout.clips).toEqual(final.layout.clips);
    expect(preview.mesh.indices.length).toBe(bare.mesh.indices.length);
    // The same clip as the one of the export, to download alone.
    const alone = await generateClip(SQUARE);
    expect(alone.positions).toEqual(final.clip.positions);
    expect(alone.indices).toEqual(final.clip.indices);
    const skeleton = await generateClip({ baseplateType: "skeleton" });
    expect((await checkMesh(skeleton)).bounds.max[2]).toBeCloseTo(4.0 - 0.5, 5);
  });

  it("gives the same edge slots to the same settings, whatever the cuts: the build plate is not in the share link", async () => {
    const settings = { sizeMode: "cells", columns: 4, rows: 3 } as const;
    const [whole, cut] = await Promise.all([generateBaseplate(settings, "preview"), generateBaseplate(settings, "preview", { buildPlate: { width: 100, depth: 100 } })]);
    expect(cut.stats.pieces).toBeGreaterThan(1);
    expect(cut.layout.clips?.edges).toEqual(whole.layout.clips?.edges);
    expect(cut.layout.clips?.edges).toHaveLength(8);
  });

  it.each(BASEPLATE_TYPES.flatMap((baseplateType) => (["hybrid", "flush"] as const).map((pocketProfile) => [baseplateType, pocketProfile] as const)))(
    "%s, %s: half a slot on each side, 0.8 mm of skin towards the pocket, invisible from above, NoError, the same by bricks and booleans",
    async (baseplateType, pocketProfile) => {
      const settings = { ...SQUARE, baseplateType, pocketProfile };
      const [bricks, booleans, plain] = await Promise.all([
        generateBaseplate(settings, "final", { strategy: "bricks" }),
        generateBaseplate(settings, "final", { strategy: "boolean" }),
        generateBaseplate(settings, "final", { clips: false }),
      ]);
      const { slot, edges } = bricks.layout.clips as NonNullable<Baseplate["layout"]["clips"]>;
      expect(edges).toHaveLength(4);
      expect(booleans.layout).toEqual(bricks.layout);
      for (const { mesh } of [bricks, booleans]) {
        expect((await checkMesh(mesh)).status).toBe("NoError");
        expect(badEdges(mesh)).toBe(0);
      }
      expect(Math.abs((bricks.stats.volume as number) - (booleans.stats.volume as number))).toBeLessThan(0.1);
      // Half a slot each; in a CLICKbase, the lamellas next to them are shorter, and give some back.
      const lost = (plain.stats.volume as number) - (bricks.stats.volume as number);
      if (baseplateType === "clickbase") expect(lost).toBeLessThan((4 * slotVolume(slot.top, slot.bridge, slot.length)) / 2);
      else expect(lost).toBeCloseTo((4 * slotVolume(slot.top, slot.bridge, slot.length)) / 2, 2);
      for (const z of [0.1, 0.5, 1.5, slot.top - 0.1]) {
        const section = await sectionOf(bricks, z);
        for (const edge of edges) {
          const low = z < slot.bridge;
          expect(inSection(section, inward(edge, 0.25)), `tooth at ${z} mm`).toBe(!low);
          expect(inSection(section, inward(edge, 0.9)), `leg at ${z} mm`).toBe(false);
          // The skin towards the pocket, 0.8 mm at least.
          expect(inSection(section, inward(edge, slot.halfWidth + 0.01)), `skin at ${z} mm`).toBe(true);
          expect(inSection(section, inward(edge, slot.halfWidth + 0.79)), `skin at ${z} mm`).toBe(true);
        }
      }
      // Nothing is removed over a slot: seen from above, the muret is whole, and so is the
      // baseplate, but in a CLICKbase, whose lamellas next to the slots are shorter (ADR 0018).
      for (const z of [slot.top + 0.05, slot.top + 0.5]) {
        const [slotted, whole] = [await sectionOf(bricks, z), await sectionOf(plain, z)];
        for (const edge of edges)
          for (const depth of [0.05, 0.25, 0.9, 1.3]) {
            const [x, y] = inward(edge, depth);
            for (const along of [-slot.length / 2 + 0.05, 0, slot.length / 2 - 0.05])
              expect(inSection(slotted, edge.cut === "column" ? [x, y + along] : [x + along, y])).toBe(true);
          }
        if (baseplateType === "clickbase") continue;
        expect(await areaOutside(whole, slotted)).toBeLessThan(1e-3);
        expect(await areaOutside(slotted, whole)).toBeLessThan(1e-3);
      }
    },
  );

  it("puts the edge slots of two identical baseplates side by side face to face: together, a whole slot for a clip", async () => {
    const plate = await generateBaseplate(SQUARE, "final");
    const edges = plate.layout.clips?.edges ?? [];
    // Along X, the right side of one against the left side of the other; along Y, back against front.
    for (const [a, b, axis] of [
      [0, 2, 1],
      [1, 3, 0],
    ] as const) {
      const [one, other] = [edges.filter(({ side }) => side === a), edges.filter(({ side }) => side === b)];
      expect(one.map(({ centre, start }) => [um(centre[axis]), start])).toEqual(other.map(({ centre, start }) => [um(centre[axis]), start]));
    }
    // The second baseplate 84 mm to the right: across the joint (x = 42), the two teeth between the legs.
    const right = edges.find(({ side }) => side === 0) as EdgeSlot;
    const y = right.centre[1];
    const shifted = { ...plate.mesh, positions: plate.mesh.positions.map((value, k) => (k % 3 === 0 ? value + 84 : value)) };
    const [low, mid] = [0.4, 1.5];
    const both = async (z: number) => [...((await checkMesh(plate.mesh, [z])).sections.get(z) ?? []), ...((await checkMesh(shifted, [z])).sections.get(z) ?? [])];
    const [lower, middle] = [await both(low), await both(mid)];
    for (const u of [-1, 1]) {
      expect(inSection(lower, [42 + u * 0.25, y])).toBe(false); // the channel of the bridge
      expect(inSection(middle, [42 + u * 0.25, y])).toBe(true); // the teeth
      expect(inSection(middle, [42 + u * 0.9, y])).toBe(false); // the legs
      expect(inSection(middle, [42 + u * 1.75, y])).toBe(true); // the skins
    }
  });
});

describe("pieces with clips", () => {
  const CASES: [name: string, settings: Partial<BaseplateSettings>, plate: BuildPlate][] = [
    ["default drawer", {}, { width: 180, depth: 180 }],
    ["flush profile, 0.28 mm layers, chamfered, screws", { pocketProfile: "flush", layerHeight: 0.28, bottomChamfer: 1, screws: true }, { width: 180, depth: 180 }],
    ["3 × 2 cells, a piece per cell, clips clear of the numbers", { sizeMode: "cells", columns: 3, rows: 2 }, { width: 50, depth: 50 }],
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
    const check = await checkMesh(cut.clip, [2]);
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
    expect(check.genus).toBe(1 - cut.stats.clips); // 8 shells of genus 0
    const single = await checkMesh(cut.clip);
    expect(check.volume).toBeCloseTo(8 * single.volume, 2); // float32 coordinates, 230 mm off the origin
    const right = Math.max(...(await Promise.all(pieces.map(async (mesh) => (await checkMesh(mesh)).bounds.max[0]))));
    expect(check.bounds.min[0]).toBeCloseTo(right + 10, 4);
    const objects = [...pieces.map((mesh, index) => ({ mesh, name: `pièce ${index + 1}` })), { mesh: clips as NonNullable<typeof clips>, name: "clip × 8" }];
    const content = readThreeMf(serialize3mf(objects, { name: "baseplate-9x6-399x279mm", shareLink: "https://example.org/fr/baseplate?v=1" }));
    expect(content.objectNames).toEqual(["pièce 1", "pièce 2", "pièce 3", "pièce 4", "clip × 8"]);
    for (const { mesh } of content.objects) expect((await checkMesh(mesh)).status).toBe("NoError");
    // Without clips, nothing to lay out.
    expect(printClips(await generateBaseplate({}, "preview"))).toBeNull();
  });

  it("gives the volume of all the clips, measured on the clip, apart from the volume of the pieces (#31)", async () => {
    const cut = await generateBaseplate({}, "final", { buildPlate: PLATE_256 });
    const single = await checkMesh(cut.clip);
    expect(cut.stats.clips).toBe(8);
    expect(cut.stats.clipsVolume).toBeCloseTo(8 * single.volume, 6);
    expect(cut.stats.clipsVolume).toBeCloseTo(8 * 18.2475, 3); // 8 clips of 4.055 mm² × 4.5 mm
    // The pieces alone: the clips are not in the volume of the baseplate.
    const pieces = cut.pieces.reduce((sum, piece) => sum + (piece.volume as number), 0);
    expect(cut.stats.volume).toBeCloseTo(pieces, 6);
    // Null for the preview, like the volume; 0 without clips.
    expect((await generateBaseplate({}, "preview", { buildPlate: PLATE_256 })).stats.clipsVolume).toBeNull();
    expect((await generateBaseplate({}, "final")).stats.clipsVolume).toBe(0);
    expect((await generateBaseplate({}, "final", { buildPlate: PLATE_256, clips: false })).stats.clipsVolume).toBe(0);
  });
});

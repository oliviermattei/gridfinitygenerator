import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { clickPocketTool, lamellaKey, cellLamellas, type LamellaSpan } from "./clickbase";
import { slotTools } from "./clips";
import { labelTool, type Label } from "./label";
import { marginOf } from "./margin";
import { withArena } from "./manifold";
import { magnetPositions, magnetTool } from "./magnets";
import { screwPositions, screwTool } from "./screws";
import { notchTools } from "./skeleton";
import { TOOL_OVERSHOOT_MM, cellCentre, meshOf, pocketTool, roundedRect, slabOf, type GridFrame } from "./shapes";
import { latticeOf, type PiecePlan } from "./split";

/**
 * Grouped boolean assembly (ADR 0004 fallback): the slab of the outline (with its bottom
 * chamfer, less the margin's holes) minus every pocket
 * tool (with the lamellas of a CLICKbase, clickbase.ts) and the margin's cut at once, then minus the
 * notches of the murets of a skeleton (skeleton.ts), then minus
 * every screw hole, every magnet hole and every slot of a clip astride a cut or the outline (clips.ts). Works for any grid, including single rows and columns.
 *
 * A baseplate cut for the build plate is then cut into its pieces, in the order of `pieces`:
 * each one is the baseplate within its footprint, which reaches past the outline on its
 * sides on it, less its engraved number (`labels`, in the same order).
 */
export function assembleWithBooleans(
  wasm: ManifoldToplevel,
  frame: GridFrame,
  pieces: readonly PiecePlan[],
  labels: readonly Label[] = [],
): TriangleMesh[] {
  const { columns, rows, width, depth, outerRadius, segmentsPerQuarter } = frame;
  return withArena((own) => {
    const margin = marginOf(frame).prepare(wasm, own, frame);
    const outline = own(new wasm.CrossSection([roundedRect(width, depth, outerRadius, segmentsPerQuarter)]));
    const holes = margin?.holes();
    const slab = slabOf(wasm, own, holes ? own(outline.subtract(holes)) : outline, frame);
    const pocket = pocketTool(wasm, own, frame);
    // The pockets of a CLICKbase, with the lamellas of their sides, once per pattern of lamellas.
    const { clickbase } = frame;
    const clickPockets = new Map<string, Manifold>();
    const clickPocketOf = (lamellas: readonly (readonly LamellaSpan[])[], key: string) => {
      if (!clickbase) throw new Error("No lamellas without CLICKbase");
      const tool = clickPockets.get(key) ?? clickPocketTool(wasm, own, { ...frame, clickbase }, lamellas);
      clickPockets.set(key, tool);
      return tool;
    };
    // The pockets and the margin's cut do not overlap, nor do the lamellas, well inside their
    // cells: composing them is enough.
    const tools: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++) {
        const lamellas = cellLamellas(frame, labels, i, j);
        const key = lamellaKey(lamellas);
        const tool = key !== "" ? clickPocketOf(lamellas, key) : pocket;
        tools.push(own(tool.translate([...cellCentre(i, j, frame), 0])));
      }
    const cut = margin?.solid();
    if (cut) tools.push(cut);
    let solid = own(slab.subtract(own(wasm.Manifold.compose(tools))));
    // The notches of a skeleton reach into the pockets on both sides of their muret: they are
    // removed apart, as are the screw holes, whose bores may meet them at the top.
    const notches = notchTools(wasm, own, frame, latticeOf(frame), labels);
    if (notches) solid = own(solid.subtract(notches));
    // The bore of a screw head meets the corners of the pockets around it, so the screw
    // holes are removed apart; they are far from each other and compose.
    const positions = screwPositions(frame);
    if (frame.screws && positions.length > 0) {
      const screw = screwTool(wasm, own, { ...frame, screws: frame.screws });
      const screws = positions.map((position) => own(screw.translate([...position, 0])));
      solid = own(solid.subtract(own(wasm.Manifold.compose(screws))));
    }
    const magnets = magnetPositions(frame, latticeOf(frame));
    if (frame.magnets && magnets.length > 0) {
      const magnet = magnetTool(wasm, own, { ...frame, magnets: frame.magnets });
      solid = own(solid.subtract(own(wasm.Manifold.compose(magnets.map((position) => own(magnet.translate([...position, 0])))))));
    }
    if (frame.clips && (frame.clips.placements.length > 0 || frame.clips.edges.length > 0)) solid = own(solid.subtract(slotTools(wasm, own, frame.clips)));
    if (pieces.length <= 1) return [meshOf(solid)];
    const o = TOOL_OVERSHOOT_MM;
    const [outerX, outerY] = [frame.width / 2 + o, frame.depth / 2 + o];
    return pieces.map(({ footprint: [x0, y0, x1, y1] }, index) => {
      // Past the outline on its sides on it; exactly on the cuts.
      const [left, front] = [x0 <= -frame.width / 2 ? -outerX : x0, y0 <= -frame.depth / 2 ? -outerY : y0];
      const [right, back] = [x1 >= frame.width / 2 ? outerX : x1, y1 >= frame.depth / 2 ? outerY : y1];
      const box = own(own(wasm.Manifold.cube([right - left, back - front, frame.profile.height + 2 * o])).translate([left, front, -o]));
      let piece = own(solid.intersect(box));
      const label = labels[index];
      if (label) piece = own(piece.subtract(own(labelTool(wasm, own, frame, label).translate([...cellCentre(...label.cell, frame), 0]))));
      return meshOf(piece);
    });
  });
}

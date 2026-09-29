import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { MARGIN } from "./margin";
import { withArena, type Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";
import { screwPositions, screwTool } from "./screws";
import { TOOL_OVERSHOOT_MM, cellCentre, gridRect, meshOf, pocketTool, roundedRect, type GridFrame } from "./shapes";

/**
 * Grouped boolean assembly (ADR 0004 fallback): the slab of the outline minus every pocket
 * tool and the margin's cut at once, then minus the tops of the lower cells, then minus
 * every screw hole. Works for any grid, including single rows and columns and grids of
 * mixed pocket profiles (the test kit).
 */
export function assembleWithBooleans(wasm: ManifoldToplevel, frame: GridFrame): TriangleMesh {
  const { columns, rows, profile, width, depth, outerRadius, segmentsPerQuarter } = frame;
  return withArena((own) => {
    const margin = MARGIN.prepare(wasm, own, frame);
    const outline = own(new wasm.CrossSection([roundedRect(width, depth, outerRadius, segmentsPerQuarter)]));
    const holes = margin?.holes();
    const slab = own(wasm.Manifold.extrude(holes ? own(outline.subtract(holes)) : outline, profile.height));
    const lower = new Map(frame.lowerCells.map((cell) => [`${cell.i},${cell.j}`, cell.profile]));
    const pockets = new Map<PocketProfile, Manifold>();
    const pocketOf = (cellProfile: PocketProfile) => {
      const tool = pockets.get(cellProfile) ?? pocketTool(wasm, own, frame, cellProfile);
      pockets.set(cellProfile, tool);
      return tool;
    };
    // The pockets and the margin's cut do not overlap: composing them is enough.
    const tools: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++) {
        const tool = pocketOf(lower.get(`${i},${j}`) ?? profile);
        tools.push(own(tool.translate([...cellCentre(i, j, frame), 0])));
      }
    const cut = margin?.solid();
    if (cut) tools.push(cut);
    let solid = own(slab.subtract(own(wasm.Manifold.compose(tools))));
    if (frame.lowerCells.length > 0) solid = own(solid.subtract(lowerTops(wasm, own, frame)));
    // The bore of a screw head meets the corners of the pockets around it, so the screw
    // holes are removed apart; they are far from each other and compose.
    const positions = screwPositions(frame);
    if (frame.screws && positions.length > 0) {
      const screw = screwTool(wasm, own, { ...frame, screws: frame.screws });
      const screws = positions.map((position) => own(screw.translate([...position, 0])));
      solid = own(solid.subtract(own(wasm.Manifold.compose(screws))));
    }
    return meshOf(solid);
  });
}

/**
 * What is taken off the top of the lower cells: over each one, from the height of its
 * profile up, a block exactly as wide as the cell between it and its neighbours (the muret
 * they share gets a step on the line between them), and past the grid on its sides on the
 * edge of the grid.
 */
function lowerTops(wasm: ManifoldToplevel, own: Own, frame: GridFrame): Manifold {
  const { columns, rows, cellSize, profile } = frame;
  const [x0, y0] = gridRect(frame);
  const o = TOOL_OVERSHOOT_MM;
  const top = profile.height + o;
  const blocks = frame.lowerCells.map(({ i, j, profile: low }) => {
    const [left, front] = [x0 + i * cellSize - (i === 0 ? o : 0), y0 + j * cellSize - (j === 0 ? o : 0)];
    const [right, back] = [x0 + (i + 1) * cellSize + (i === columns - 1 ? o : 0), y0 + (j + 1) * cellSize + (j === rows - 1 ? o : 0)];
    const block = own(wasm.Manifold.cube([right - left, back - front, top - low.height]));
    return own(block.translate([left, front, low.height]));
  });
  // Neighbouring lower cells share a face: a union, not a composition.
  return own(wasm.Manifold.union(blocks));
}

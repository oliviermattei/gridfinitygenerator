import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { MARGIN } from "./margin";
import { withArena } from "./manifold";
import { cellCentre, meshOf, pocketTool, roundedRect, type GridFrame } from "./shapes";

/**
 * Grouped boolean assembly (ADR 0004 fallback): the slab of the outline minus every pocket
 * tool and the margin's cut at once. Works for any grid, including single rows and columns.
 */
export function assembleWithBooleans(wasm: ManifoldToplevel, frame: GridFrame): TriangleMesh {
  const { columns, rows, profile, width, depth, outerRadius, segmentsPerQuarter } = frame;
  return withArena((own) => {
    const margin = MARGIN.prepare(wasm, own, frame);
    const outline = own(new wasm.CrossSection([roundedRect(width, depth, outerRadius, segmentsPerQuarter)]));
    const holes = margin?.holes();
    const slab = own(wasm.Manifold.extrude(holes ? own(outline.subtract(holes)) : outline, profile.height));
    const tool = pocketTool(wasm, own, frame);
    // The pockets and the margin's cut do not overlap: composing them is enough.
    const tools: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++)
        tools.push(own(tool.translate([...cellCentre(i, j, frame), 0])));
    const cut = margin?.solid();
    if (cut) tools.push(cut);
    return meshOf(own(slab.subtract(own(wasm.Manifold.compose(tools)))));
  });
}

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import { withArena } from "./manifold";
import { cellCentre, meshOf, pocketTool, roundedRect, type GridFrame } from "./shapes";

/**
 * Grouped boolean assembly (ADR 0004 fallback): the outline slab minus every pocket tool
 * at once. Works for any grid, including single rows and columns.
 */
export function assembleWithBooleans(wasm: ManifoldToplevel, frame: GridFrame): TriangleMesh {
  const { columns, rows, cellSize, profile, outerRadius, segmentsPerQuarter } = frame;
  return withArena((own) => {
    const outline = own(new wasm.CrossSection([roundedRect(columns * cellSize, rows * cellSize, outerRadius, segmentsPerQuarter)]));
    const slab = own(wasm.Manifold.extrude(outline, profile.height));
    const tool = pocketTool(wasm, own, frame);
    const tools: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++)
        tools.push(own(tool.translate([...cellCentre(i, j, frame), 0])));
    return meshOf(own(slab.subtract(own(wasm.Manifold.compose(tools)))));
  });
}

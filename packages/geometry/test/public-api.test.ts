import { describe, expect, it } from "vitest";
import { STANDARD_CELL_SIZE_MM } from "../src/index";

// Example test through the engine's public entry point.
// Real behaviour tests (bounding box, pocket sections, mesh validity) arrive with #4.
describe("geometry engine public entry", () => {
  it("exposes the standard Gridfinity cell size of 42 mm", () => {
    expect(STANDARD_CELL_SIZE_MM).toBe(42);
  });
});

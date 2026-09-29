// Public entry point of the geometry engine (ADR 0003): pure TypeScript on top of
// manifold-3d, with no dependency on React, the DOM or the app.
// `generateBaseplate(settings, quality)` and the 3MF/STL serialisers land here with #4.

/** Side of a Gridfinity cell in the standard, in millimetres (default cell size). */
export const STANDARD_CELL_SIZE_MM = 42;

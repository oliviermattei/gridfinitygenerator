import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { chooseCells, closeSettings, openSettings } from "./support";

// The shape of the margin, one of three (#23, #29): frame of crossbars (the default), truncated
// cells, extended grid; and the minimal margin, which reduces each to its supports (#29).

/** The volume in the statistics frame on screen (on the right on desktop, in the sheet on mobile). */
function volume(page: Page) {
  return page.getByTestId("stat-volume").filter({ visible: true });
}

/** A shape of the margin, by its label, in the open margin family. */
function shape(page: Page, label: "Cadre" | "Cellules" | "Grille") {
  return page.getByRole("radio", { name: new RegExp(`^${label}`) });
}

/**
 * Whether the point (x, y) of the baseplate, seen from above in the coordinates of its mesh
 * (centred on the origin), lies in its material at height z: the section of the triangles of
 * the 3MF at z, crossed by a ray towards +X an odd number of times.
 */
function solidAt(model: string, [x, y]: [number, number], z: number): boolean {
  const vertices = [...model.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map(([, a, b, c]) => [Number(a), Number(b), Number(c)] as const);
  let inside = false;
  for (const [, a, b, c] of model.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)) {
    const corners = [a, b, c].map((index) => vertices[Number(index)] as readonly [number, number, number]);
    // The segment where the triangle crosses the plane at z.
    const points: [number, number][] = [];
    corners.forEach((p, k) => {
      const q = corners[(k + 1) % 3] as readonly [number, number, number];
      if (p[2] > z !== q[2] > z) {
        const t = (z - p[2]) / (q[2] - p[2]);
        points.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    });
    const [p, q] = points;
    if (!p || !q || p[1] > y === q[1] > y) continue;
    if (x < p[0] + ((y - p[1]) * (q[0] - p[0])) / (q[1] - p[1])) inside = !inside;
  }
  return inside;
}

test("the margin comes in three shapes, each with the material it adds, the frame by default", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Marge/ });
  await expect(family).toHaveAccessibleName("Marge Cadre à traverses");
  await family.click();
  await expect(shape(page, "Cadre")).toBeChecked();

  // The default drawer cut in 4 pieces for the default build plate, measured on the final
  // meshes, less its grid alone (74,9 cm³): the current shape, then the other two and the grid
  // alone, measured once it is shown. The truncated cells and the extended grid carry the
  // magnets on to the edge of the grid: 54 holes instead of 28.
  await expect(volume(page)).toHaveText("79,2 cm³");
  await expect(shape(page, "Cadre")).toContainText("+ 4,2 cm³");
  await expect(shape(page, "Cellules")).toContainText("+ 22,4 cm³");
  await expect(shape(page, "Grille")).toContainText("+ 16,1 cm³");

  // Changing the shape changes the volume shown, and the family says which one it is.
  await shape(page, "Grille").click();
  await expect(volume(page)).toHaveText("91,0 cm³");
  await expect(family).toHaveAccessibleName("Marge Grille prolongée");
  await expect(page.getByText(/Pas de mur extérieur/).filter({ visible: true })).toBeVisible();
  await shape(page, "Cellules").click();
  await expect(volume(page)).toHaveText("97,4 cm³");
  await expect(family).toHaveAccessibleName("Marge Cellules tronquées");

  // Kept on reload, like every setting of the baseplate.
  await page.reload();
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Cellules tronquées");
  await expect(volume(page)).toHaveText("97,4 cm³");
});

test("the minimal margin reduces every shape to its supports: the preview and the surpluses change", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  const family = page.getByRole("button", { name: /^Marge/ });
  await family.click();
  await expect(shape(page, "Cadre")).toContainText("+ 4,2 cm³");
  const preview = page.getByTestId("mesh-preview");
  const triangles = await preview.getAttribute("data-triangles");

  const minimal = page.getByRole("switch", { name: "Marge minimale" });
  await expect(minimal).not.toBeChecked();
  await minimal.click();
  await expect(minimal).toBeChecked();
  await expect(family).toHaveAccessibleName("Marge Cadre à traverses, minimale");
  await expect(preview).not.toHaveAttribute("data-triangles", triangles ?? "");
  await expect(volume(page)).toHaveText("75,7 cm³");
  await expect(shape(page, "Cadre")).toContainText("+ 0,7 cm³");
  await expect(shape(page, "Cellules")).toContainText("+ 7,9 cm³");
  await expect(shape(page, "Grille")).toContainText("+ 1,8 cm³");

  // The share link carries it, as `min=1`; the corner brackets of #23 come back as it.
  await page.goto("/fr/baseplate?v=1&mg=brackets");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Cadre à traverses, minimale");
  await expect(volume(page)).toHaveText("75,7 cm³");
  await page.goto("/fr/baseplate?v=1&mg=extended&min=1");
  await openSettings(page, testInfo);
  await expect(page.getByRole("button", { name: /^Marge/ })).toHaveAccessibleName("Marge Grille prolongée, minimale");
  await expect(volume(page)).toHaveText("76,7 cm³");
});

test("choosing the extended grid takes the outer wall away: the murets end on heels", async ({ page }, testInfo) => {
  // 3 × 2 cells and 10 mm of margin all around, in one piece: the grid spans ±63 × ±42 mm, the
  // outline ±73 × ±52 mm, the band of the outer wall from 50.8 to 52 mm at the back.
  const threeMf = async (link: string) => {
    await page.goto(`/fr/baseplate?v=1&mode=cells&cx=3&cy=2&mx=20&my=20${link}`);
    await openSettings(page, testInfo);
    await closeSettings(page, testInfo);
    const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger le 3MF" }).click()]);
    return strFromU8(unzipSync(await readFile(await file.path()))["3D/3dmodel.model"] ?? new Uint8Array());
  };
  const frame = await threeMf("");
  // The outer wall of the frame, between two crossbars.
  expect(solidAt(frame, [-42, 51.4], 1)).toBe(true);
  const extended = await threeMf("&mg=extended");
  expect(extended).toContain("mg=extended");
  // No outer wall between two murets, at any height; a heel at the end of the muret of x = −21.
  for (const z of [0.1, 1, 4.5]) {
    expect(solidAt(extended, [-42, 51.4], z), `${z} mm`).toBe(false);
    expect(solidAt(extended, [-21, 51.4], z), `${z} mm`).toBe(true);
  }
});

test("without a margin, the shape changes nothing and no volume is compared", async ({ page }, testInfo) => {
  await page.goto("/fr/baseplate");
  await openSettings(page, testInfo);
  await chooseCells(page);
  await page.getByRole("button", { name: /^Marge/ }).click();
  await expect(page.getByText("La grille remplit le tiroir : pas de marge, la forme ne change rien.").filter({ visible: true })).toBeVisible();
  await expect(shape(page, "Cellules")).not.toContainText("cm³");
});

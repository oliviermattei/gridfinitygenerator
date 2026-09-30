// JETABLE (#27) : relève les cotes de CLICKbase Refined (Printables 1487592, ZeroCtrl, CC BY-NC-SA)
// sur ses STL publics, sans compte, par l'API GraphQL de Printables. Les fichiers restent dans un
// dossier temporaire : rien de Refined n'entre dans le dépôt. Lancer depuis la racine :
//   node prototypes/clickbase/refined.mjs
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "../../packages/geometry/node_modules/manifold-3d/manifold.js";

const API = "https://api.printables.com/graphql/";
const post = async (query) =>
  (await fetch(API, { method: "POST", headers: { "content-type": "application/json", origin: "https://www.printables.com" }, body: JSON.stringify({ query }) })).json();

const { data } = await post(`query{print(id:"1487592"){stls{id name}}}`);
const dir = mkdtempSync(join(tmpdir(), "refined-"));
const download = async (name) => {
  const file = data.print.stls.find((stl) => stl.name === name);
  const link = await post(`mutation{getDownloadLink(id:"${file.id}", printId:"1487592", fileType:stl, source:model_detail){output{link}}}`);
  const path = join(dir, name.replace(/ /g, "-"));
  writeFileSync(path, new Uint8Array(await (await fetch(link.data.getDownloadLink.output.link)).arrayBuffer()));
  return path;
};

const wasm = await Module();
wasm.setup();
/** STL binaire → solide manifold, centré en XY, posé sur z = 0. */
function solidOf(path) {
  const bytes = readFileSync(path);
  const count = bytes.readUInt32LE(80);
  const index = new Map();
  const positions = [];
  const triangles = [];
  for (let t = 0; t < count; t++)
    for (let v = 0; v < 3; v++) {
      const at = 84 + t * 50 + 12 + v * 12;
      const point = [bytes.readFloatLE(at), bytes.readFloatLE(at + 4), bytes.readFloatLE(at + 8)];
      const key = point.map((c) => Math.round(c * 1e4)).join(",");
      if (!index.has(key)) {
        index.set(key, positions.length / 3);
        positions.push(...point);
      }
      triangles.push(index.get(key));
    }
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(triangles) });
  mesh.merge();
  const solid = new wasm.Manifold(mesh);
  const { min, max } = solid.boundingBox();
  return solid.translate([-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]]);
}

/** Tranches de matière le long de la droite x = c d'une coupe : [y0, y1]. */
function along(polygons, c) {
  const ys = [];
  for (const polygon of polygons)
    polygon.forEach(([x0, y0], k) => {
      const [x1, y1] = polygon[(k + 1) % polygon.length];
      if ((x0 - c) * (x1 - c) < 0) ys.push(y0 + ((c - x0) * (y1 - y0)) / (x1 - x0));
    });
  ys.sort((a, b) => a - b);
  const spans = [];
  for (let k = 0; k + 1 < ys.length; k += 2) spans.push([ys[k], ys[k + 1]]);
  return spans;
}

for (const name of ["CLICKbase 1x1.stl", "CLICKbase 2x2.stl"]) {
  const solid = solidOf(await download(name));
  const { min, max } = solid.boundingBox();
  console.log(`${name} : ${solid.status()}, ${(solid.volume() / 1000).toFixed(3)} cm³, ${(max[0] - min[0]).toFixed(2)} × ${(max[1] - min[1]).toFixed(2)} × ${(max[2] - min[2]).toFixed(2)} mm`);
}
// Le côté +Y de la 1 × 1 : matière le long de droites perpendiculaires au côté, depuis le centre.
const one = solidOf(join(dir, "CLICKbase-1x1.stl"));
for (const u of [6, 10.5, 0]) {
  console.log(`\nà ${u} mm du milieu du côté :`);
  for (const z of [0.1, 0.3, 0.7, 0.9, 1.0, 1.1, 1.5, 2.0, 2.2, 2.4, 3.0, 3.5, 4.0]) {
    const spans = along(one.slice(z).toPolygons(), u + 1e-4).filter(([, b]) => b > 17);
    console.log(`  z ${z.toFixed(2)} : ${spans.map(([a, b]) => `${a.toFixed(2)} → ${b.toFixed(2)}`).join(" ; ")}`);
  }
}
// Le long de la fente (à 19,9 mm du centre) : où sont les fentes, à z = 1,5.
console.log(`\nle long du côté, à 19,9 mm du centre, z = 1,5 : matière ${along(one.slice(1.5).toPolygons().map((p) => p.map(([x, y]) => [y, x])), 19.9).map(([a, b]) => `${a.toFixed(2)} → ${b.toFixed(2)}`).join(" ; ")}`);

// PROTOTYPE JETABLE : sérialiseurs minimaux pour un maillage indexé { pos: Float32Array, tris: Uint32Array }.
import { zipSync, strToU8 } from 'fflate';

export function stlBinary({ pos, tris }) {
  const n = tris.length / 3;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const a = tris[3 * t] * 3,
      b = tris[3 * t + 1] * 3,
      c = tris[3 * t + 2] * 3;
    const ux = pos[b] - pos[a],
      uy = pos[b + 1] - pos[a + 1],
      uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a],
      vy = pos[c + 1] - pos[a + 1],
      vz = pos[c + 2] - pos[a + 2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true);
    dv.setFloat32(o + 4, ny / l, true);
    dv.setFloat32(o + 8, nz / l, true);
    o += 12;
    for (const v of [a, b, c]) {
      dv.setFloat32(o, pos[v], true);
      dv.setFloat32(o + 4, pos[v + 1], true);
      dv.setFloat32(o + 8, pos[v + 2], true);
      o += 12;
    }
    o += 2;
  }
  return new Uint8Array(buf);
}

const CT = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;

const f = (x) => {
  const s = x.toFixed(4);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

export function threeMF({ pos, tris }, name = 'baseplate') {
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model" name="${name}"><mesh><vertices>`,
  ];
  for (let i = 0; i < pos.length; i += 3) parts.push(`<vertex x="${f(pos[i])}" y="${f(pos[i + 1])}" z="${f(pos[i + 2])}"/>`);
  parts.push('</vertices><triangles>');
  for (let i = 0; i < tris.length; i += 3) parts.push(`<triangle v1="${tris[i]}" v2="${tris[i + 1]}" v3="${tris[i + 2]}"/>`);
  parts.push('</triangles></mesh></object></resources><build><item objectid="1"/></build></model>');
  return zipSync(
    {
      '[Content_Types].xml': strToU8(CT),
      '_rels/.rels': strToU8(RELS),
      '3D/3dmodel.model': strToU8(parts.join('')),
    },
    { level: 6 },
  );
}

// PROTOTYPE JETABLE (ticket #3): minimal 3MF writer (one named object, millimetres) and reader.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;

// Float32 coordinates up to ~110 mm keep about 5 decimals: write them all, trailing zeros trimmed.
const num = (x) => {
  const s = x.toFixed(5);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function write3mf({ pos, tris }, name) {
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="fr-FR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">`,
    `<metadata name="Title">${escapeXml(name)}</metadata>`,
    `<resources><object id="1" type="model" name="${escapeXml(name)}"><mesh><vertices>`,
  ];
  for (let i = 0; i < pos.length; i += 3) parts.push(`<vertex x="${num(pos[i])}" y="${num(pos[i + 1])}" z="${num(pos[i + 2])}"/>`);
  parts.push('</vertices><triangles>');
  for (let i = 0; i < tris.length; i += 3) parts.push(`<triangle v1="${tris[i]}" v2="${tris[i + 1]}" v3="${tris[i + 2]}"/>`);
  parts.push('</triangles></mesh></object></resources><build><item objectid="1"/></build></model>');
  return zipSync(
    {
      '[Content_Types].xml': strToU8(CONTENT_TYPES),
      '_rels/.rels': strToU8(RELS),
      '3D/3dmodel.model': strToU8(parts.join('')),
    },
    { level: 9, mtime: '2026-01-01' }, // fixed date: identical files on every run
  );
}

export function read3mf(bytes) {
  const xml = strFromU8(unzipSync(bytes)['3D/3dmodel.model']);
  const unit = /<model[^>]*\bunit="([^"]+)"/.exec(xml)?.[1];
  const names = [...xml.matchAll(/<object[^>]*\bname="([^"]*)"/g)].map((m) => m[1]);
  const pos = [];
  for (const m of xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)) pos.push(+m[1], +m[2], +m[3]);
  const tris = [];
  for (const m of xml.matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"\/>/g)) tris.push(+m[1], +m[2], +m[3]);
  return { unit, names, pos: new Float32Array(pos), tris: new Uint32Array(tris) };
}

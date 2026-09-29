// PROTOTYPE JETABLE (ticket #3): generates the margin variants, exports the test bench as 3MF,
// checks every export (read back, NoError) and writes the measures to results.md / results.json.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { init, layoutOf, buildBaseplate, validateMesh, VARIANTS, GRID_H, LAYER_H, OUTER_R } from './baseplate.mjs';
import { write3mf, read3mf } from './threemf.mjs';

await init();

// Test bench of the ticket: 2 x 2 cells + 25 mm of margin on the right and at the back (109 x 109 mm).
const BENCH = layoutOf({ nx: 2, ny: 2, right: 25, back: 25 });
// Default drawer of the spec, 400 x 280 minus the 1 mm gap, centred: 9 x 6 cells, margins 10.5 / 13.5 mm.
const DRAWER = layoutOf({ nx: 9, ny: 6, left: 10.5, right: 10.5, front: 13.5, back: 13.5 });
const HEIGHTS = [GRID_H, +(10 * LAYER_H).toFixed(2)]; // flush with the grid, and low (10 layers of 0.2)
const EXPORTED = ['truncated', 'brackets', 'ribbed'];
const SLUG = { truncated: '1-cellules-tronquees', brackets: '2-equerres', ribbed: '3-cadre-nervures' };

const fr = (x, d = 0) =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ | /g, ' ');

mkdirSync('files', { recursive: true });

function run(L, variant, h, file) {
  const r = buildBaseplate(L, variant, h);
  if (r.status !== 'NoError') throw new Error(`${variant} ${h}: ${r.status}`);
  const row = { variant, h, ...r, marginVolume: r.volume - r.gridVolume, triangles: r.tris.length / 3 };
  delete row.pos;
  delete row.tris;
  if (file) {
    const name = `Banc de marge - ${VARIANTS[variant]} - hauteur ${fr(h, 2)} mm`;
    writeFileSync(file, write3mf(r, name));
    const back = read3mf(readFileSync(file));
    const v = validateMesh(back.pos, back.tris);
    const ext = [0, 1, 2].map((c) => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = c; i < back.pos.length; i += 3) {
        lo = Math.min(lo, back.pos[i]);
        hi = Math.max(hi, back.pos[i]);
      }
      return hi - lo;
    });
    const expected = [L.X1 - L.X0, L.Y1 - L.Y0, GRID_H];
    if (v.status !== 'NoError') throw new Error(`${file}: ${v.status}`);
    if (Math.abs(v.volume - r.volume) > 0.5) throw new Error(`${file}: volume ${v.volume} vs ${r.volume}`);
    if (ext.some((e, c) => Math.abs(e - expected[c]) > 1e-3)) throw new Error(`${file}: bbox ${ext}`);
    if (back.unit !== 'millimeter' || back.names.length !== 1) throw new Error(`${file}: unit/objects`);
    Object.assign(row, {
      file,
      bytes: readFileSync(file).length,
      reread: { status: v.status, volume: v.volume, genus: v.genus, bbox: ext, name: back.names[0] },
    });
  }
  console.log(variant ?? 'grid', h ?? '', r.status, fr(r.volume, 1), 'mm3', file ?? '');
  return row;
}

const bench = { grid: run(BENCH, null), rows: [] };
const drawer = { grid: run(DRAWER, null), rows: [] };
for (const variant of Object.keys(VARIANTS))
  for (const h of HEIGHTS) {
    const file = EXPORTED.includes(variant) ? `files/banc-${SLUG[variant]}-h${h.toFixed(1)}.3mf` : undefined;
    bench.rows.push(run(BENCH, variant, h, file));
    drawer.rows.push(run(DRAWER, variant, h));
  }

writeFileSync('results.json', JSON.stringify({ bench, drawer }, null, 1));

// Markdown tables.
const solidOf = (set, h) => set.rows.find((r) => r.variant === 'solid' && r.h === h).marginVolume;
const md = [];
md.push(`## Banc d'essai : 2 × 2 cellules + 25 mm de marge à droite et à l'arrière (109 × 109 mm)`, '');
md.push(`Grille seule (2 × 2, sans marge) : ${fr(bench.grid.volume, 1)} mm³.`, '');
md.push('| Variante | Hauteur de marge | Volume total (mm³) | Volume de la marge (mm³) | Marge / marge pleine | Triangles | Fichier 3MF | Maillage relu |');
md.push('|---|---|---|---|---|---|---|---|');
for (const r of bench.rows)
  md.push(
    `| ${VARIANTS[r.variant]} | ${fr(r.h, 2)} mm | ${fr(r.volume, 1)} | ${fr(r.marginVolume, 1)} | ${fr((100 * r.marginVolume) / solidOf(bench, r.h), 1)} % | ${fr(r.triangles)} | ${r.file ? `\`${r.file.replace('files/', '')}\` (${fr(r.bytes / 1024)} Ko)` : 'non exporté'} | ${r.reread ? `${r.reread.status}, genre ${r.reread.genus}` : `${r.status} (en mémoire)`} |`,
  );
md.push('', `### Maintien et impression (banc, couche de 0,2 mm)`, '');
md.push(
  `Contact : longueur du contour de la première couche posée à plat contre la paroi du tiroir, sur les côtés qui ont une marge (droite et arrière ; côté droit ${fr(BENCH.Y1 - BENCH.Y0 - 2 * OUTER_R)} mm au plus, hors arrondis de coin). Périmètres et boucles : somme sur les ${Math.round(GRID_H / LAYER_H)} couches de la longueur des contours et de leur nombre, mesurée par coupes du maillage ; l'écart est pris par rapport à la grille seule.`,
  '',
);
md.push('| Variante | Hauteur | Contact droite / arrière (mm) | Longueur de contours (m) | Écart / grille seule (m) | Boucles | Écart / grille seule |');
md.push('|---|---|---|---|---|---|---|');
for (const r of bench.rows)
  md.push(
    `| ${VARIANTS[r.variant]} | ${fr(r.h, 2)} mm | ${fr(r.contact.right, 1)} / ${fr(r.contact.back, 1)} | ${fr(r.layers.perimeter / 1000, 2)} | +${fr((r.layers.perimeter - bench.grid.layers.perimeter) / 1000, 2)} | ${fr(r.layers.loops)} | +${fr(r.layers.loops - bench.grid.layers.loops)} |`,
  );
md.push('', `## Tiroir par défaut de la spec : 400 × 280 mm, jeu de 1 mm, grille centrée (9 × 6 cellules, marges de 10,5 et 13,5 mm)`, '');
md.push(`Grille seule (9 × 6) : ${fr(drawer.grid.volume / 1000, 2)} cm³. Non exporté, mesuré seulement.`, '');
md.push('| Variante | Hauteur de marge | Volume de la marge (cm³) | Volume total (cm³) | Marge / marge pleine | Contact gauche / droite / avant / arrière (mm) | Longueur de contours, écart / grille seule (m) |');
md.push('|---|---|---|---|---|---|---|');
for (const r of drawer.rows)
  md.push(
    `| ${VARIANTS[r.variant]} | ${fr(r.h, 2)} mm | ${fr(r.marginVolume / 1000, 2)} | ${fr(r.volume / 1000, 2)} | ${fr((100 * r.marginVolume) / solidOf(drawer, r.h), 1)} % | ${['left', 'right', 'front', 'back'].map((s) => fr(r.contact[s])).join(' / ')} | +${fr((r.layers.perimeter - drawer.grid.layers.perimeter) / 1000, 2)} |`,
  );
writeFileSync('results.md', `# Mesures générées par \`pnpm generate\` (ne pas éditer à la main)\n\n${md.join('\n')}\n`);
console.log('results.md, results.json written');

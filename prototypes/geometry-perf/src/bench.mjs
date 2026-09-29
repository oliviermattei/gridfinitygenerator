// PROTOTYPE JETABLE : orchestre le bench (1 processus Node par cas) et écrit results/bench.{json,md}.
// Options : --engines manifold,jscad  --sizes 2,5,10,20  --variants a,b  --quality final,preview
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1].split(',') : d;
};
const engines = arg('engines', ['manifold', 'jscad']);
const sizes = arg('sizes', ['2', '5', '10', '20']).map(Number);
const qualities = arg('quality', ['final', 'preview']);
const onlyVariants = arg('variants', null);
const TIMEOUT = 240_000;
const SKIP_AFTER_MS = 10_000; // si une taille dépasse 10 s, on n'essaie pas la suivante (x4 cellules)

const VAR = {
  manifold: {
    final: ['naive', 'seq', 'seqLazy', 'batchUnion', 'batch', 'batchLoft', 'bricks', 'direct', 'brickMesh'],
    preview: ['batch', 'batchLoft', 'brickMesh', 'instanced'],
  },
  jscad: {
    final: ['naive', 'seq', 'batchUnion', 'batch', 'batchLoft', 'bricks', 'brickMesh'],
    preview: ['batch', 'batchLoft', 'brickMesh'],
  },
};

mkdirSync('results', { recursive: true });
const results = [];
const started = Date.now();
for (const engine of engines)
  for (const quality of qualities)
    for (const variant of VAR[engine][quality].filter((v) => !onlyVariants || onlyVariants.includes(v)))
      for (const magnets of [false, true]) {
        let skip = null;
        for (const n of sizes) {
          const c = { engine, variant, quality, magnets, nx: n, ny: n, validate: n <= 10 };
          if (skip) {
            results.push({ ...c, skipped: skip });
            console.log(`${engine} ${quality} ${variant} ${magnets ? 'mag' : 'nomag'} ${n}x${n}: SKIP (${skip})`);
            continue;
          }
          const p = spawnSync(process.execPath, ['--expose-gc', '--max-old-space-size=8192', 'src/case.mjs', JSON.stringify(c)], {
            encoding: 'utf8',
            timeout: TIMEOUT,
            maxBuffer: 1 << 24,
          });
          let r;
          if (p.error || p.status !== 0) {
            r = { ...c, error: p.error ? String(p.error.code || p.error) : (p.stderr || '').split('\n').find((l) => /Error/.test(l)) || 'exit ' + p.status };
            skip = 'échec/timeout à ' + n + 'x' + n;
          } else {
            r = JSON.parse(p.stdout.trim().split('\n').pop());
            if (r.genMs > SKIP_AFTER_MS) skip = `> ${SKIP_AFTER_MS / 1000} s à ${n}x${n}`;
          }
          results.push(r);
          console.log(
            `${engine} ${quality} ${variant} ${magnets ? 'mag' : 'nomag'} ${n}x${n}: ` +
              (r.error ? 'ERREUR ' + r.error : `gen ${r.genMs} ms (x${r.runs}) tri ${r.numTri} ${r.stlMs != null ? `stl ${r.stlMs} ms/${r.stlKB} KB 3mf ${r.mfMs} ms/${r.mfKB} KB ` : ''}rss ${r.maxRssMB} MB${r.manifoldOk != null ? ' manifold ' + r.manifoldOk : ''}`),
          );
        }
      }

const meta = { date: new Date().toISOString(), node: process.version, cpu: cpus()[0].model, cores: cpus().length, platform: process.platform, durationS: Math.round((Date.now() - started) / 1000) };
const suffix = process.argv.includes('--engines') || process.argv.includes('--variants') || process.argv.includes('--sizes') ? '-partial' : '';
writeFileSync(`results/bench${suffix}.json`, JSON.stringify({ meta, results }, null, 1));

// tableau markdown
const fmt = (x) => (x == null ? '' : x >= 1000 ? (x / 1000).toFixed(2) + ' s' : x.toFixed(x < 10 ? 1 : 0) + ' ms');
const lines = [
  `Bench ${meta.date} — Node ${meta.node}, ${meta.cpu} (${meta.cores} cœurs), ${meta.platform}, durée ${meta.durationS} s`,
  '',
  '| moteur | qualité | variante | aimants | grille | génération (médiane) | runs | triangles | STL | 3MF | RSS max | manifold ? |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const r of results) {
  const g = `${r.nx}×${r.ny}`;
  const base = `| ${r.engine} | ${r.quality} | ${r.variant} | ${r.magnets ? 'oui' : 'non'} | ${g} |`;
  if (r.skipped) lines.push(`${base} sauté (${r.skipped}) | | | | | | |`);
  else if (r.error) lines.push(`${base} **${r.error}** | | | | | | |`);
  else
    lines.push(
      `${base} ${fmt(r.genMs)} | ${r.runs} | ${r.numTri.toLocaleString('fr-FR')} | ${r.stlMs != null ? `${fmt(r.stlMs)} / ${r.stlKB} Ko` : ''} | ${r.mfMs != null ? `${fmt(r.mfMs)} / ${r.mfKB} Ko` : ''} | ${r.maxRssMB} Mo | ${r.manifoldOk == null ? '' : r.manifoldOk ? 'oui' : '**non**'} |`,
    );
}
writeFileSync(`results/bench${suffix}.md`, lines.join('\n') + '\n');
console.log(`\nécrit results/bench${suffix}.{json,md} en ${meta.durationS} s`);

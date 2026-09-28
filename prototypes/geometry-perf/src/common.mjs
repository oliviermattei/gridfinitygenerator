// PROTOTYPE JETABLE : données partagées par les deux moteurs (mêmes cotes, mêmes polygones).
export const PITCH = 42; // cellule 42 x 42
export const OUTER_R = 4; // coins extérieurs de la baseplate
export const TOP_R = 4; // rayon de poche en haut du profil théorique (retrait 0)

// Profil hybride ADR 0002, du bas vers le haut : [z, retrait depuis le bord de cellule].
// muret vertical 0,35 / chanfrein 45° 0,7 / vertical 1,8 / chanfrein 45° 2,15 raboté à 4,60.
export const PROFILE = [
  [0.0, 2.85],
  [0.35, 2.85],
  [1.05, 2.15],
  [2.85, 2.15],
  [4.6, 0.4],
];
export const PROFILE_H = 4.6;

// Aimants : trous Ø 6,5 x 2,4 à 13 mm du centre (spec / rebuilt), surépaisseur 2,8 sous le profil
// (valeur extrabold) => 0,4 mm de fond sous l'aimant. Blocs carrés d+4 = 10,5 mm dans chaque coin de
// cellule, fusionnés au muret ; centre de cellule laissé ouvert (comme extrabold).
export const MAGNET = { d: 6.5, depth: 2.4, offset: 13, base: 2.8, block: 6.5 + 4 };

// Segments par cercle complet (arrondis de poche / coins) et pour les trous d'aimant.
export const QUALITY = {
  preview: { corner: 8, hole: 16 },
  final: { corner: 32, hole: 64 },
};

export const plateHeight = (magnets) => PROFILE_H + (magnets ? MAGNET.base : 0);

// Couches de l'outil de poche (solide soustrait), prolongé de 1 mm sous le fond (poche ouverte)
// et de 1 mm au-dessus du plat (retrait 0,4 conservé) pour éviter les faces coplanaires.
export function toolLayers(magnets) {
  const mb = magnets ? MAGNET.base : 0;
  return [[-1, 2.85], ...PROFILE.slice(1).map(([z, d]) => [z + mb, d]), [PROFILE_H + mb + 1, 0.4]];
}

// Rectangle arrondi CCW centré en (cx, cy) ; segCircle = segments pour 360°.
export function roundedRectPoints(w, h, r, segCircle, cx = 0, cy = 0) {
  const q = Math.max(1, Math.round(segCircle / 4));
  const hx = w / 2 - r;
  const hy = h / 2 - r;
  const centers = [
    [hx, hy],
    [-hx, hy],
    [-hx, -hy],
    [hx, -hy],
  ];
  const pts = [];
  for (let c = 0; c < 4; c++) {
    for (let i = 0; i <= q; i++) {
      const a = ((c + i / q) * Math.PI) / 2;
      pts.push([cx + centers[c][0] + r * Math.cos(a), cy + centers[c][1] + r * Math.sin(a)]);
    }
  }
  return pts;
}

// Couche de poche pour un retrait d : taille 42 - 2d, rayon 4 - d (4 -> 1,15, rayons concentriques).
export const pocketLayer = (d, segCircle) => roundedRectPoints(PITCH - 2 * d, PITCH - 2 * d, TOP_R - d, segCircle);

export function cellCenters(nx, ny) {
  const out = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) out.push([(-nx / 2 + i + 0.5) * PITCH, (-ny / 2 + j + 0.5) * PITCH]);
  return out;
}

export const magnetCenters = () => {
  const o = MAGNET.offset;
  return [
    [o, o],
    [-o, o],
    [-o, -o],
    [o, -o],
  ];
};

// Loft direct de couches (même nombre de points) -> positions + triangles indexés, fermé, orienté.
export function loftMesh(layers) {
  // layers: [{ z, pts: [[x,y],...] }] du bas vers le haut, pts CCW
  const k = layers[0].pts.length;
  const pos = new Float32Array(layers.length * k * 3);
  layers.forEach((L, li) =>
    L.pts.forEach(([x, y], i) => {
      const o = (li * k + i) * 3;
      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = L.z;
    }),
  );
  const tris = [];
  for (let li = 0; li < layers.length - 1; li++) {
    const a = li * k;
    const b = (li + 1) * k;
    for (let i = 0; i < k; i++) {
      const j = (i + 1) % k;
      tris.push(a + i, a + j, b + j, a + i, b + j, b + i);
    }
  }
  const top = (layers.length - 1) * k;
  for (let i = 1; i < k - 1; i++) {
    tris.push(0, i + 1, i); // fond, normale -z
    tris.push(top, top + i, top + i + 1); // dessus, normale +z
  }
  return { pos, tris: new Uint32Array(tris) };
}

// Assemblage de briques au niveau maillage (indépendant du moteur).
// variants[0] = brique intérieure, [1..4] = coins (+,+) (-,+) (-,-) (+,-) ; chacune { pos, tris, np }
// en coordonnées locales (cellule centrée en 0). Supprime les faces internes (x/y = ±21) et soude les
// sommets de couture. Suppose nx, ny >= 2.
export function assembleBricks(variants, nx, ny) {
  const half = PITCH / 2;
  const e = 1e-4;
  const cornerIndex = (i, j) =>
    i === nx - 1 && j === ny - 1 ? 1 : i === 0 && j === ny - 1 ? 2 : i === 0 && j === 0 ? 3 : i === nx - 1 && j === 0 ? 4 : 0;
  // par brique : flags de sommets sur chaque face de coupe, calculés une fois
  const info = variants.map((b) => {
    const n = b.pos.length / b.np;
    const side = new Uint8Array(n); // bits : 1 +x, 2 -x, 4 +y, 8 -y
    for (let a = 0; a < n; a++) {
      const x = b.pos[a * b.np],
        y = b.pos[a * b.np + 1];
      side[a] = (Math.abs(x - half) < e) | ((Math.abs(x + half) < e) << 1) | ((Math.abs(y - half) < e) << 2) | ((Math.abs(y + half) < e) << 3);
    }
    const triSide = new Uint8Array(b.tris.length / 3);
    for (let t = 0; t < triSide.length; t++) triSide[t] = side[b.tris[3 * t]] & side[b.tris[3 * t + 1]] & side[b.tris[3 * t + 2]];
    return { n, side, triSide };
  });
  let nv = 0,
    nt = 0;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const c = cornerIndex(i, j);
      nv += info[c].n;
      nt += variants[c].tris.length / 3;
    }
  const pos = new Float32Array(nv * 3);
  const tris = new Uint32Array(nt * 3);
  const seam = new Map();
  let vo = 0,
    to = 0;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const c = cornerIndex(i, j);
      const b = variants[c];
      const I = info[c];
      const cx = (-nx / 2 + i + 0.5) * PITCH,
        cy = (-ny / 2 + j + 0.5) * PITCH;
      const remap = new Uint32Array(I.n);
      for (let a = 0; a < I.n; a++) {
        const X = b.pos[a * b.np] + cx,
          Y = b.pos[a * b.np + 1] + cy,
          z = b.pos[a * b.np + 2];
        if (I.side[a]) {
          const key = `${Math.round(X * 1e3)},${Math.round(Y * 1e3)},${Math.round(z * 1e3)}`;
          const hit = seam.get(key);
          if (hit !== undefined) {
            remap[a] = hit;
            continue;
          }
          seam.set(key, vo);
        }
        pos[vo * 3] = X;
        pos[vo * 3 + 1] = Y;
        pos[vo * 3 + 2] = z;
        remap[a] = vo++;
      }
      const drop = (i < nx - 1 ? 1 : 0) | (i > 0 ? 2 : 0) | (j < ny - 1 ? 4 : 0) | (j > 0 ? 8 : 0);
      for (let t = 0; t < I.triSide.length; t++) {
        if (I.triSide[t] & drop) continue;
        tris[to++] = remap[b.tris[3 * t]];
        tris[to++] = remap[b.tris[3 * t + 1]];
        tris[to++] = remap[b.tris[3 * t + 2]];
      }
    }
  return { pos: pos.slice(0, vo * 3), tris: tris.slice(0, to), numTri: to / 3 };
}

export function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

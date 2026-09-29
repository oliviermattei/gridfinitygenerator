# PROTOTYPE JETABLE — perf géométrie : manifold-3d vs @jscad/modeling

> Prototype jetable (commit `5cddc95`), fusionné dans `main` pour référence. Question : quel moteur de géométrie pour le navigateur ?
> Objectifs : aperçu < 100 ms pendant le réglage ; calcul complet < 1 s (10×10) et < 3 s (20×20), avec aimants.

## Verdict

**manifold-3d (WASM)**, avec une architecture « **brique de cellule assemblée au niveau maillage** » (`brickMesh`).

- On calcule une seule fois, avec des booléens, la brique d'une cellule (cube 42×42 − outil de poche, trous d'aimant compris) et les 4 briques de coin (∩ contour arrondi). Ensuite on la copie N×M fois par translation. On supprime les faces internes (x/y = ±21) et on soude les sommets des coutures. Le plateau entier ne passe par **aucun booléen global** : le coût est en O(triangles), en JS pur.
- Résultat (Node, qualité finale, aimants) : **35 ms en 10×10 et 40 ms en 20×20** (576 k triangles). Le maillage est validé par `new Manifold(mesh)` (NoError, genre 400), par trimesh (watertight) et donne le même volume que la version booléenne. En qualité aperçu : **13–17 ms**. Les trois objectifs sont atteints avec une marge ×25 à ×75.
- Même sans cette astuce, manifold tient les objectifs du calcul complet avec la stratégie booléenne classique (`batch`, une seule soustraction de tous les outils) : 10×10 aimants **371 ms**, 20×20 aimants **1,45 s**. En aperçu il est juste (10×10 aimants 124 ms). jscad fait 848 ms et **9,5 s** sur la même stratégie. Il échoue sur 20×20 aimants, et ses sorties ne sont **jamais manifold**.
- **Pourquoi pas jscad** :
  1. Toutes ses sorties (16 fichiers exportés et tous les cas du bench jusqu'à 10×10) sont non manifold à cause des T-junctions du BSP. C'est cohérent avec l'export extrabold mesuré « non watertight » (recherche C.1).
  2. Ses booléens sont 3 à 6 fois plus lents, en O(n²) quand on les enchaîne.
  3. Ses sérialiseurs sont inutilisables à l'échelle : 3MF 10×10 aimants = **36 à 86 s**, STL = 7 à 19 s. En navigateur, le STL 20×20 aimants prend 69 s.
  4. `brickMesh` en jscad est rapide (237 ms en 20×20 aimants), mais la brique elle-même est déjà non manifold.

## Ce qui a été construit

`src/common.mjs` contient les données partagées : les cotes, le profil et les polygones de coins arrondis, identiques pour les deux moteurs, ainsi que `loftMesh` et `assembleBricks`. Les moteurs sont dans `src/engine-manifold.mjs` et `src/engine-jscad.mjs`. Les exports STL/3MF minimaux (fflate) sont dans `src/export.mjs`. `src/bench.mjs` orchestre un processus Node par cas, décrit dans `src/case.mjs`. `validate.py` fait le contrôle trimesh. `browser/` contient le test Web Worker (Vite).

Géométrie :
- Grille N×M de 42 mm, coins extérieurs r 4.
- Profil de poche ADR 0002, du bas vers le haut : muret vertical 0,35, chanfrein 45° 0,7, vertical 1,8, chanfrein 45° jusqu'au rabotage à 4,60 mm. Le rayon vaut `4 − retrait`, soit 4 → 1,15 (3,6 au plat du haut, concentrique aux coins extérieurs). La poche est ouverte en dessous.
- L'outil de poche déborde de 1 mm en bas et en haut pour éviter les faces coplanaires, et garde le retrait 0,4 au-dessus du plat.
- **Aimants (choix documenté)** :
  - Trous Ø 6,5 × 2,4 à **13 mm** du centre (spec/rebuilt, pas les 14 mm d'extrabold).
  - Surépaisseur **2,8 mm** sous le profil (valeur extrabold), soit **0,4 mm de fond** sous l'aimant (2 couches de 0,2).
  - Blocs carrés d + 4 = 10,5 mm dans chaque coin de cellule, fusionnés au muret. Le centre de la cellule reste ouvert comme chez extrabold, ce qui économise de la matière.
  - Hauteur totale 7,40 mm.
- Qualité : l'aperçu utilise 8 segments par cercle pour les arrondis et 16 pour les trous ; la finale 32 et 64 (comme le « high » d'extrabold et ses trous mesurés à 64 segments).

## Mesures

Machine : Apple M1 Pro, Node 22.17, 1 processus par cas (warm-up 2×2 puis médiane sur 7 à 9 runs, 3 si > 1 s, 1 si > 5 s). « Génération » va jusqu'au maillage triangulé prêt pour three.js (getMesh / triangulation jscad comprise), export exclu. Le bruit machine est d'environ ±20 %. Tableau complet (160 lignes : 2×2, 5×5, triangles, STL/3MF, RSS, manifold ?) : [`results/bench.md`](results/bench.md), données brutes dans `results/bench.json`.

### Qualité finale : temps de génération (médiane)

| Variante | Optimisations | manifold 10×10 (sans / avec aimants) | manifold 20×20 | jscad 10×10 | jscad 20×20 |
|---|---|---|---|---|---|
| `naive` | aucune : outil recalculé par cellule, soustractions successives | 2,54 s / 7,41 s | 33,4 s / 76,9 s | 22,7 s / 94,4 s | sauté |
| `seq` | (1) outil unique translaté | 1,52 s / 4,48 s | 18,9 s / 65,0 s | 22,2 s / 66,0 s | sauté |
| `seqLazy` | (1) + soustractions successives **sans forcer l'évaluation** (arbre CSG paresseux de manifold) | 188 ms / 470 ms | 842 ms / 1,95 s | — | — |
| `batchUnion` | (1)+(2) `union(tableau)` puis 1 soustraction | 260 / 367 ms | 826 ms / 1,43 s | 1,56 s / 5,48 s | 9,5 s / timeout |
| `batch` | (1)+(2) `Manifold.compose` (jscad : concaténation des polygones disjoints) + 1 soustraction | **187 / 371 ms** | **748 ms / 1,45 s** | 491 / 848 ms | 2,15 s / 9,5 s¹ |
| `batchLoft` | (1)+(2)+(3) outil = loft direct de sections 2D | 176 / 503 ms | 850 ms / 1,94 s | 682 ms / 1,30 s | 7,8 s² / 8,5 s¹ |
| `bricks` | façon extrabold : brique (cube − outil) + union des briques ∩ contour | 391 / 838 ms | 1,69 s / 3,91 s | 2,71 s / 7,16 s | 15,4 s / timeout |
| `direct` | (3) poussé au plateau : parois lofted + dessus/dessous `triangulate`, 0 booléen sans aimants | 65 ms / 1,09 s | 263 ms / 4,89 s | — | — |
| **`brickMesh`** | brique + 4 coins par booléens, puis assemblage maillage (copie + soudure) | **13,6 / 35,3 ms** | **26 / 40 ms** | 78 / 235 ms³ | 61 / 237 ms³ |

¹ Génération seule (relancée avec `noExport`) : dans le bench, le cas complet a dépassé le timeout de 240 s à cause du sérialiseur 3MF jscad. ² Un seul run, jscad est très bruité (GC sur un tas de 1,6 Go). ³ Sortie non manifold.

### Aperçu (qualité basse) : temps de génération

| Variante | manifold 10×10 (sans / avec) | manifold 20×20 | jscad 10×10 | jscad 20×20 |
|---|---|---|---|---|
| `batch` | 63 / 124 ms | 247 / 480 ms | 333 / 535 ms | 1,47 / 1,17 s |
| `batchLoft` | 55 / 111 ms | 219 / 449 ms | 375 / 405 ms | 1,69 / 1,82 s |
| `brickMesh` | **6,6 / 16,6 ms** | **9,6 / 12,9 ms** | 22 / 70 ms | 33 / 44 ms |
| `instanced` (1 brique + 4 coins pour `InstancedMesh`, pas de maillage global) | 6,1 / 11,8 ms | 5,1 / 14,8 ms | — | — |

### Export (qualité finale, avec aimants)

| | triangles | STL binaire | 3MF (zip deflate) |
|---|---|---|---|
| manifold `brickMesh` 10×10 | 144 k | 9,5 ms / 6,9 Mo | 398 ms / 1,2 Mo |
| manifold `brickMesh` 20×20 | 576 k | 39 ms / 27,5 Mo | 1,76 s / 4,8 Mo |
| manifold `batch` 20×20 | 575 k | 46 ms / 27,4 Mo | 2,14 s / 5,1 Mo |
| jscad `batch` 10×10 (`@jscad/stl-serializer`, `@jscad/3mf-serializer`) | 168 k | **7,1 s** / 9,6 Mo | **36,2 s** / 3,5 Mo |
| jscad `batch` 20×20 | 670 k | > 240 s au total (timeout) | |

Le 3MF manifold utilise mon sérialiseur naïf, qui construit une chaîne XML : c'est le poste le plus lent de la chaîne rapide (1,8 s en 20×20). Une écriture en tampons binaires et un deflate de niveau 1 le réduiraient probablement à quelques centaines de ms (non mesuré).

### Mémoire (RSS max du processus, export compris, base Node ≈ 40–65 Mo)

- 20×20 aimants : manifold `brickMesh` 797 Mo, manifold `batch` 1,2 Go, jscad `batch` 20×20 sans aimants 1,57 Go.
- 10×10 aimants : manifold `brickMesh` 336 Mo, jscad `seq` 2,1 Go.
- Aperçu `brickMesh` : 68 à 80 Mo, quelle que soit la taille.

La mémoire WASM de manifold ne rétrécit jamais : le tas grandit au pic et y reste.

### Navigateur (Chrome, Web Worker module, Vite dev) : ordre de grandeur confirmé

Init WASM 31 ms (9 ms en Node).

| cas (aimants) | génération | STL |
|---|---|---|
| manifold `brickMesh` aperçu 10×10 | 11 ms | 8 ms |
| manifold `brickMesh` final 10×10 | 24 ms | 7 ms |
| manifold `brickMesh` final 20×20 | 34 ms | 47 ms |
| manifold `batch` aperçu 10×10 | 108 ms | |
| manifold `batch` final 10×10 | 302 ms | 27 ms |
| manifold `batch` final 20×20 (sans aimants) | 651 ms | |
| manifold `batch` final 20×20 | 1,09 s | 25 ms |
| jscad `batch` aperçu 10×10 | 168 ms | |
| jscad `batch` final 10×10 | 630 ms | 4,75 s |
| jscad `batch` final 20×20 | 3,41 s | **68,8 s** |

Le navigateur est aussi rapide que Node, voire un peu plus (même WASM). Relance : `pnpm browser`, puis ouvrir http://localhost:5178. Le test n'est pas automatisé dans `pnpm bench` : je l'ai lancé via Chrome DevTools.

### Validation (`pnpm export && pnpm validate`, détail dans `results/validation-*.json`)

- **Cotes** : bounding box exacte (84 × 84 × **4,600** sans aimants ; 7,400 avec). Largeur d'ouverture de poche à z = 0,1 / 0,7 / 2,0 / 4,5 : écart ≤ 0,001 mm à la théorie (36,3 / 37,0 / 37,7 / 41,0). Trou d'aimant mesuré Ø 6,500. Tout cela vaut pour les deux moteurs.
- **Fermeture** :
  - manifold `batch` et `brickMesh` sont watertight pour trimesh et `NoError` pour manifold-3d, avec un volume identique au dixième de mm³.
  - Toutes les sorties jscad échouent : non watertight pour trimesh, « Not manifold » pour manifold-3d.
  - manifold `direct` avec aimants est `NoError` pour manifold-3d mais non watertight pour trimesh (sommets coïncidents après l'union des étages) : fragile, à écarter.

## Quelles optimisations comptent vraiment

1. **Booléens groupés (2) : décisif.** Passer d'un enchaînement de soustractions à une soustraction de l'ensemble fait gagner ×8 à ×45 en manifold et ×45 en jscad sur 10×10. En manifold, il suffit de **ne pas forcer l'évaluation** (`numTri()`, `status()`, `getMesh()`) entre les opérations : l'arbre CSG paresseux regroupe tout seul (`seqLazy` ≈ `batch`). `compose` et `union(tableau)` se valent, avec `compose` à peine meilleur (les outils sont disjoints).
2. **Outil unique translaté (1) : utile mais secondaire** (−40 % en manifold naïf, ~0 en jscad où le coût est dans le plateau qui grossit). Surtout, il rend possible (2) et `brickMesh`.
3. **Sections 2D (3)** :
   - Pour l'outil : gain négligeable une fois l'outil construit une seule fois (176 contre 187 ms).
   - Pour le plateau entier (`direct`) : ×3 sans aimants (263 ms en 20×20), mais **plus lent et fragile avec aimants**. À ne pas retenir tel quel.
   - Le loft direct reste la bonne façon de construire le profil, parce que le profil est une donnée (ADR 0002).
4. **Aperçu basse résolution (4) : environ ×3** sur la voie booléenne (3,4 fois moins de triangles). Inutile avec `brickMesh`, où même la qualité finale reste sous 40 ms.
5. **(Hors liste) Brique assemblée au niveau maillage : le vrai levier.** Le motif périodique de la grille permet de sortir l'essentiel du travail des booléens. La version « briques + union » d'extrabold est au contraire **plus lente** que `batch` (le coût de l'union reste global).

## Risques et points d'attention

- **Taille** :
  - `manifold.wasm` pèse 541 Ko (**205 Ko gzip**) et `manifold.js` 82 Ko (19 Ko gzip).
  - Notre moteur manifold complet, WASM inliné en base64 par Vite en mode lib, pèse 788 Ko (306 Ko gzip). En production, servir le `.wasm` séparément.
  - jscad + sérialiseurs : 302 Ko (77 Ko gzip).
  - Écart d'environ +150 Ko gzip, chargé une fois, dans le worker, en cache.
- **Gestion mémoire `.delete()`** :
  - Chaque `Manifold` et chaque `CrossSection` doit être libéré à la main. Le prototype utilise un pattern « arène » (`withArena`).
  - J'ai eu un vrai bug de double libération (`BindingError: instance already deleted`) en enveloppant deux fois le même objet. Il faut donc un helper unique et des tests.
  - Le tas WASM ne rétrécit pas (1,2 Go de pic en `batch` 20×20 aimants). Parade : `brickMesh` (797 Mo, dont l'essentiel en JS pour l'export), ou terminer et recréer le worker après un gros export.
- **Qualité des arrondis** : identique sur les deux moteurs, car on fournit nous-mêmes les polygones (même nombre de segments). manifold offre aussi `CrossSection.offset(..., 'Round')` et `setCircularSegments`.
- **API** :
  - manifold n'a pas de loft natif. Un `loftMesh` de 40 lignes suffit, et `Manifold.hull` existe.
  - Son API est plus bas niveau (maillages indexés, Float32/Uint32).
  - Le build npm tourne sur un seul thread (pas de pthreads/TBB dans le worker).
  - manifold garantit des sorties manifold ; c'est le point différenciant face à jscad (T-junctions, sérialiseurs lents).
- **Limites de `brickMesh`** :
  - Il suppose une grille périodique avec au moins 2 cellules par axe. Les cas 1×N sont à traiter à part.
  - Marges (Solid/Half Grid/Margin Fit), découpe en pièces, vis aux intersections, CLICKbase : il faudra des briques de marge ou des booléens locaux sur des pièces plus petites, avec manifold en secours pour tout ce qui n'est pas périodique.
  - Garder un test qui valide `new Manifold(mesh)` et compare le volume à la voie `batch`.
- **Stabilité des mesures** : les timings varient d'environ ±20 % d'un lancement à l'autre (machine de dev chargée). Les ordres de grandeur et les classements, eux, sont stables.

## Choix faits sans pouvoir demander

- Aimants à 13 mm (spec) et non 14 mm (extrabold). Base de 2,8 mm donc 0,4 mm de fond. Blocs de coin de 10,5 mm. Centre ouvert.
- L'équivalent jscad de `Manifold.compose` est la concaténation des polygones (les outils sont disjoints). C'est l'optimisation la plus favorable à jscad : `union()` est 3 à 6 fois plus lent.
- La « génération » inclut la conversion en buffers de triangles, nécessaire pour three.js dans les deux cas.
- La validité manifold n'est calculée par le bench que jusqu'au 10×10 (hors chrono). Les 20×20 manifold sont `NoError` d'office pour les booléens, et `brickMesh` 20×20 a été validé à part (NoError, genre 400).
- Le test navigateur couvre 10 cas et n'est pas scripté.

## Relancer

```bash
cd prototypes/geometry-perf
pnpm install
pnpm bench                     # ~45 min, écrit results/bench.{json,md}
node src/bench.mjs --engines manifold --sizes 10,20 --variants batch,brickMesh   # partiel -> results/bench-partial.*
pnpm export                    # STL/3MF de contrôle dans out/ + validation manifold-3d
python3 -m venv .venv && .venv/bin/pip install trimesh numpy scipy shapely networkx lxml
pnpm validate                  # trimesh : fermeture, bbox, profil, Ø aimant -> out/validation.json
pnpm browser                   # test Web Worker : http://localhost:5178
pnpm size                      # taille des bundles par moteur dans size/
```

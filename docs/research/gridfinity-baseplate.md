# Recherche : générateur de baseplate Gridfinity (extrabold.tools + spec)

> Date : 2026-09-28. Objectif : reproduire https://www.extrabold.tools/gridfinity-baseplate.
> Légende : **[V]** = vérifié dans une source primaire (code, page, dessin) · **[I]** = inféré (raisonnement sur code minifié / comportement), à confirmer.

## Sources primaires utilisées

| Id | Source | Détail |
|----|--------|--------|
| S1 | Page `https://www.extrabold.tools/gridfinity-baseplate` | HTML SSR + rendu dans Chrome (DevTools MCP), requêtes réseau listées |
| S2 | Bundle worker `https://www.extrabold.tools/_app/immutable/workers/jscad-worker-0D2CKfQH.js` (410 Ko, minifié) | Contient **tout le générateur** : objet `{ id: "gridfinity-baseplate", version: "0.5.21", settings: [...] }`, constantes `fx`, fonctions de profil. Repérable par recherche des chaînes citées. |
| S3 | Source **non minifiée** du worker, servie par erreur : `https://www.extrabold.tools/_app/immutable/assets/jscad-worker.BErjMWAi.js` (27,8 Ko) | Imports `@jscad/modeling`, `@jscad/stl-serializer`, `@jscad/3mf-serializer` (l. 83, 219, 223) |
| S4 | Bundle page `https://www.extrabold.tools/_app/immutable/nodes/4.Dh57k2Q7.js` | UI Svelte, export ZIP (`createZipArchive`), presets tiroirs |
| S5 | Chunks `CZnGbK12.js` (three.js), `DlwVXXMR.js` (JSZip), `CzYehBsQ.js` (Supabase), `B3W-DYtu.js` (base imprimantes) | sous `https://www.extrabold.tools/_app/immutable/chunks/` |
| S6 | Doc officielle du site : `https://extrabold.tools/docs/gridfinity-baseplate` ; page MCP `https://extrabold.tools/mcp` | |
| S7 | `kennetek/gridfinity-rebuilt-openscad`, commit `910e22d8607fd7f5f51ad5e5cbc5287a76810bfd` (2025-08-31), licence MIT | fichiers cités avec n° de ligne |
| S8 | Gridfinity Design Reference v5 (dessin de @willtree8), `https://gridfinity.xyz/assets/img/spec_draft_willtree8.jpg`, publié sur `https://gridfinity.xyz/specification/` | seule « spec » communautaire ; la page elle-même dit « This specification is a work in progress! » |
| S9 | Zack Freedman sur X : « All of my Gridfinity stuff is now MIT licensed, so go nuts! » `https://x.com/zackfreedman/status/1650629770156326912` | **Vérifié** le 2026-09-28 via `api.fxtwitter.com` et `cdn.syndication.twimg.com` (x.com/xcancel inaccessibles) : texte exact, 2023-04-24 22:36 UTC, non édité. Voir section « Licence Gridfinity ». |

Les numéros de ligne cités pour S2/S4 renvoient à ma copie « prettier » locale (non stable) ; les **identifiants/chaînes** cités, eux, sont retrouvables dans les bundles publics.

---

## Résumé

1. **Tout est client-side [V]** : génération dans un Web Worker (`jscad-worker-*.js`) avec **JSCAD** (`@jscad/modeling`), export via `@jscad/stl-serializer` / `@jscad/3mf-serializer`, zip via **JSZip**, aperçu **three.js r182** (`WebGLRenderer`, `OrbitControls`, env map `hdri.hdr`). Aucune requête réseau de génération : seuls appels externes = Supabase (pubs/analytics), iconify, `/api/country` (S1, liste réseau).
2. Framework : **SvelteKit** (`__sveltekit_*`, `_app/immutable/...`, 652 occurrences « svelte » dans le bundle page) déployé derrière Cloudflare (rocket-loader) [V].
3. Paramètres : ~35 réglages déclaratifs (type, min/max/step/default, `showIf`, `urlKey`) — tableau complet ci-dessous. L'état complet est sérialisé dans l'URL (lien de partage) [V].
4. Formats : **3MF (défaut) et STL** ; toujours livrés dans un **ZIP** (`gridfinity-baseplate.zip`) avec README, ATTRIBUTIONS, LICENSE éventuel, carte d'assemblage et modèle de clip [V]. Pas de STEP [V : seuls `stl`/`3mf` acceptés, S3 l. 219-233].
5. Profil baseplate extrabold = **0,7 / 1,8 / 2,15 mm (45° / vertical / 45°)**, hauteur 4,65 mm, rayon 4 → 1,15 mm — **identique à `_BASEPLATE_PROFILE` de gridfinity-rebuilt** et au dessin de la spec (S8) [V].
6. Différence clé : rebuilt ajoute un jeu de 0,35 mm sous le profil (`BASEPLATE_HEIGHT = 5`) ; extrabold non (plaque fine = 4,65 mm, puis **Top Cutoff 0,4 mm** qui rabote l'arête vive) [V code / I effet].
7. Remplissage tiroir : les deux outils font `floor(taille / 42)` puis répartissent le reste en marge selon un alignement ; extrabold ajoute 4 « margin types » (Solid, Margin Fit, Half Grid 21 mm, Overtile) [V].
8. **Découpe pour le plateau d'impression** : n'existe **pas** dans gridfinity-rebuilt [V] ; extrabold l'implémente (programmation dynamique « fewer parts / balanced / T-junctions », nesting, clips) [V].
9. Licences : générateur extrabold « CC0 » sauf **CLICKbase = CC BY-NC-SA 4.0** (John Hall) [V] ; rebuilt MIT [V] ; Gridfinity : dessin S8 dit CC BY-NC-SA, Zack a ensuite annoncé MIT (S9) — à trancher.
10. Point à vérifier : la position des trous d'aimant extrabold semble à **14 mm** du centre de cellule (vs **13 mm** dans la spec/rebuilt) — **confirmé par mesure sur export, cf. C.3** [V].

---

## Partie A — Rétro-ingénierie d'extrabold.tools

### A.1 Architecture technique

| Élément | Constat | Preuve |
|---|---|---|
| Framework | SvelteKit (SPA hydratée, `node_ids: [0, 4]`) | S1 : script inline `__sveltekit_16n1am2`, `kit.start(app, element, …)` [V] |
| Hébergement | Cloudflare (`/cdn-cgi/scripts/.../rocket-loader.min.js`, `/cdn-cgi/speculation`) ; preconnect `va.vercel-scripts.com` | S1 [V] ; Vercel = [I] (seulement preconnect) |
| Moteur CAO | **JSCAD** `@jscad/modeling` chargé dynamiquement dans le worker ; API exposée en `self.jscadApi` ; helpers maison `self.loft` (`extrudeFromShapesAtHeights`) et `self.interpolate` | S3 l. 1-2, 40-44, 83 [V] |
| Worker | `new Worker(new URL("../workers/jscad-worker-0D2CKfQH.js", import.meta.url), {type:"module"})` ; messages `generate` / `export` / `cancel`, `progress`, `ready`, `model` | S4 (chaîne `jscad-worker`), S3 l. 587-667 [V] |
| Cache de calcul | `createDependencyManager` : étapes mémoïsées `validateDimensions → gridLayout → layoutStruct → gridUnitProfile → gridUnitFeatures → baseplate → screwHolePrototype → splitPlan → gridUnit3D → assembly`, chacune avec sa liste de dépendances | S2 `_initStages()` [V] |
| Validation | `validateManifold`, `repairManifold`, `dedup3mfModelXml` (dédoublonnage de sommets 3MF) | S3 l. 4-6 [V]. Note : la chaîne « manifold » dans `ZtMF-tzs.js` est un **rapport de validation**, pas la lib `manifold-3d` [V] |
| Aperçu 3D | three.js **r182** (`REVISION "182"`), `WebGLRenderer`, `BufferGeometry`, `OrbitControls` ; env map `GET /hdri.hdr` ; 1 `<canvas>` | S5 `CZnGbK12.js`, S1 réseau [V] |
| Export | STL binaire (`binary: true`, `model/stl`) ; 3MF compressé (`compress: true`, metadata `producer: 'ExtraBold Tools'`) | S3 l. 219-233 [V] |
| ZIP | JSZip, DEFLATE niveau 6 | S4 `createZipArchive` (`generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}})`) [V] |
| Qualité | segments d'arrondi : `draft`=8, défaut=16, `high`=32 ; la page passe `quality ?? "high"` | S2 (`gx=8, px=16, mx=32`, fonction `yx`), S4 [V] |
| Backend | Supabase uniquement pour pubs/analytics : RPC `get_random_normal_ad_by_country`, tables `ads_material`, `ads_normal`, `generation_performance`, `web_vitals` ; `/api/country` | S1 réseau, S5 `CzYehBsQ.js` [V] |
| Stockage local | `localStorage` (préférences, compteurs de téléchargement, imprimante) | S4 [V] |
| MCP | Serveur MCP distant `https://mcp.extrabold.tools/mcp` (outils `find_gridfinity_drawer_presets`, `generate_gridfinity_drawer_baseplate`, `get_gridfinity_grid_questions`, `generate_gridfinity_grid`, `create_gridfinity_baseplate_url`) | S6 `/mcp` [V] |

### A.2 Tableau des paramètres (schéma `settings` du générateur v0.5.21)

Source : S2, objet `dk = { id: "gridfinity-baseplate", … settings: [...] }` ; valeurs confirmées dans le DOM rendu (sliders `min/max/step`) et par la doc S6. Défauts vérifiés dans un contexte navigateur vierge (URL générée : `…tolerance=standard…topCutoff=0.4&v=0.5.21`).

| Catégorie | id (`urlKey`) | Libellé | Type UI | Plage / options | Défaut | Unité | Effet |
|---|---|---|---|---|---|---|---|
| General | `baseplateType` (`baseplate`) | Baseplate Type | grille de boutons-image | `normal`, `tray`, `skeleton`, `clickbase` | `normal` | — | Type de plaque ; `clickbase` désactive les aimants ; `skeleton` interdit les clips |
| General | `tolerance` (`tolerance`) | Tolerance | **hidden** (global) | none 0 / tight 0,1 / standard 0,2 / loose 0,3 / very-loose 0,4 / extra-loose 0,5 | `standard` (0,2) | mm | Ajoutée au Ø des trous d'aimant (`radius = d/2 + tol/2`) et aux connecteurs ; test de tolérance `/models/tolerance-test.zip` |
| Dimensions | `dimensions` (`width`,`depth`) | Baseplate Size | `dimensions` (onglets Direct / Grid / Preset / Path) | 10–3000, pas 1 ; min dynamique = min(gridUnitWidth, gridUnitDepth) | 126 × 126 | mm | Taille extérieure totale |
| Dimensions | `sizingMode` (`mode`) | Sizing mode | hidden | `direct`, `grid`, `drawer`, `custom` (Path) | `direct` | — | Onglet actif. En mode Grid : champs `grid-width-spaces`/`grid-depth-spaces` (nb d'unités) + `grid-width-margin`/`grid-depth-margin` (S4) |
| Dimensions | `containerPresetId` (`preset`) | Container preset | hidden | ids de presets | `""` | — | IKEA ALEX, HELMER, MAXIMERA, BROR + Eurobox/KLT (AUER, SSI Schäfer…) avec `internalDimensions` (S4) |
| Dimensions | `baseplatePolygonPoints`, `customSketchV1` | Path | hidden | polygone / état d'éditeur encodé | `null` | mm | Mode Path (expérimental, v0.5.16) : contour polygonal libre, congés par coin |
| Fit | `gridAlignment` (`align`,`alignX`,`alignY`) | Grid Alignment | `gridAlignment` (9 positions + 2 sliders fins) | top-left … bottom-right ; offsets ± (bornés par la marge) pas 0,1 | `center`, 0, 0 | mm | Répartition de la marge (fonction `bx`) |
| Fit | `marginType` (`margin`) | Margin Type | boutons-image (small) | `solid`, `margin-fit`, `halfgrid`, `overtile` | `solid` | — | Voir A.4. Margin Fit désactivé si une marge >0 est < max(4, 2×borderRadius) mm ; Path : Solid/Overtile seulement |
| Attachment | `toggleMagnets` (`magnets`) | Enable Magnet Holes | toggle | — | `false` | — | Ajoute blocs d'aimant + hauteur de base (2,8 mm) ; désactivé avec CLICKbase |
| Attachment | `magnetHoleStyle` (`magnetStyle`) | Magnet Hole Style | boutons-image | `cylinder` (Round), `crush-rib` (expérimental) | `cylinder` | — | Crush-rib : Ø ext = d+0,5+tol, Ø int = max(d−0,1 ; 0,85·d), 8 nervures |
| Attachment | `magnetDirection` (`magnetSide`) | Magnet Direction | boutons-image | `top`, `bottom` | `top` | — | Côté d'insertion |
| Attachment | `magnetDiameter` | Magnet Diameter | slider | 3–12, pas 0,1 | 6 | mm | Ø trou (+tolérance) et taille du bloc (d+4) |
| Attachment | `magnetHeight` | Magnet Thickness | slider | 1–4, pas 0,1 | 2 | mm | Profondeur du trou |
| Attachment | `toggleMagnetReleaseHole` (`magnetRelease`) | Magnet Release Holes | toggle | — | `false` | — | Trou traversant Ø = d/2 au centre de chaque logement |
| Attachment | `toggleScrewHoles` (`screws`) | Enable Screw Holes | toggle | — | `false` | — | Trous fraisés aux **intersections** de la grille (fixation de la plaque) |
| Attachment | `screwHoleSize` (`screwHole`) | Screw Shaft Diameter | slider | 2–6, pas 0,1 | 3 | mm | Ø de passage |
| Attachment | `screwHeadSize` (`screwHead`) | Screw Head Diameter | slider | 2–8, pas 0,1 | 6 | mm | Ø de fraisage |
| Attachment | `removeHolesOnSplitLines` (`removeSplitHoles`) | Remove Holes on Split Lines | toggle | — | `true` | — | Supprime les vis sur les lignes de découpe |
| Build Plate | `splitToBuildplates` (`split`) | Split to Build Plates | toggle | — | `false` | — | Découpe selon le volume de l'imprimante ; **requiert une imprimante** (base de plusieurs centaines de modèles issus des définitions Cura : `curaDefinition:true`, `sourceFile:"*.def.json"`, S5 `B3W-DYtu.js`) |
| Build Plate | `plateMarginMm` (`plateMargin`) | Build Plate Margin | slider | 0–50, pas 1 | 10 | mm | Marge de sécurité par bord de plateau |
| Build Plate | `splitStrategy` (`splitStyle`) | Split Strategy | boutons-image | `fewerParts`, `balanced`, `tJunctions` | `fewerParts` | — | Algorithme de découpe (A.5) |
| Build Plate | `splitOffMargins` (`splitMargins`) | Split Off Outer Margins | toggle | — | `false` | — | Marges extérieures en bandes séparées |
| Build Plate | `enablePlateNesting` (`nest`) | Nest onto Build Plates | toggle | — | `false` | — | Regroupe les pièces par plateau (3MF par plateau) |
| Build Plate | `pieceSpacingMm` (`pieceSpacing`) | Piece Spacing | slider | 0–20, pas 1 | 3 | mm | Espacement en nesting |
| Build Plate | `partsConnector` (`connector`) | Connectors | boutons-image | `none`, `clips` (`dovetails` caché, WIP) | `none` | — | Trous pour clips « CLICK_clip » le long des découpes ; clip fourni dans le ZIP |
| Build Plate | `enableEdgeConnectors` (`edgeConnectors`) | Edge Connectors | toggle | — | `false` | — | Trous de clip sur les bords extérieurs |
| Build Plate | `edgeConnectorSides` | Connector Edges | `edgeConnectorSides` | back/front/left/right | tous `true` | — | Choix des bords |
| Advanced | `showAdvanced` | Show Advanced Settings | toggle | — | `false` | — | Avertissement « won't fit standard sized gridfinity bins » |
| Advanced | `gridUnitWidth` (`gridWidth`) | Grid Unit Width | slider | 10–100, pas 0,1 | 42 | mm | Pas X |
| Advanced | `gridUnitDepth` (`gridDepth`) | Grid Unit Depth | slider | 10–100, pas 0,1 | 42 | mm | Pas Y |
| Advanced | `borderRadius` (`radius`) | Grid Unit Border Radius | slider | 0–10, pas 0,5 | 4 | mm | Rayon haut de la poche (décroît le long du profil) |
| Advanced | `outerBorderRadius` (`outerRadius`) | Outer Border Radius | slider | 0–borderRadius (ou ½ petit côté si déverrouillé via `overrideMaxOuterBorderRadius`) | 4 | mm | Coins extérieurs de la plaque |
| Advanced | `magnetBaseHeight` (`magnetBase`) | Magnet Base Height | slider | 0–10, pas 0,1 | 2,8 | mm | Épaisseur ajoutée sous le profil si aimants |
| Advanced | `bottomPadding` (`bottomPad`) | Bottom Padding | slider | 0–10, pas 0,1 | 0 | mm | Épaisseur ajoutée indépendante |
| Advanced | `bottomChamfer` | Bottom Chamfer | slider | 0–3, pas 0,1 | 0 | mm | Chanfrein du bord inférieur (anti « pied d'éléphant ») |
| Advanced | `topCutoff` (`topCutoff`) | Top Cutoff | slider | 0–2, pas 0,1 | 0,4 | mm | Rabote le haut (arête vive du profil 45°) |

Remarques :
- Paramètres non exposés mais présents : `quality` (draft/standard/high), `printer` [V S2].
- **Observation** : en ouvrant une URL partielle (`?magnets=true&screws=true`), l'app a complété avec `tolerance=none` et `topCutoff=0` (et non les défauts) [V S1] — probablement une compatibilité des anciens liens via `sinceVersion` [I].
- Règles de cohérence (`onSettingChange`, S2) : passer en `skeleton` remet `partsConnector` à `none` ; `partsConnector = none` coupe les edge connectors ; mode Path force `marginType` ∈ {solid, overtile} [V].
- Contrôles globaux de l'en-tête : unité **mm** (toggle unité), **Printer**, **Regenerate**, **Download 3MF** (menu 3MF/STL), Reset, Share [V S1 texte rendu].

### A.3 Sortie / export

| Aspect | Détail | Statut |
|---|---|---|
| Formats | `3mf` (défaut), `stl` ; aucune autre valeur acceptée (`Unsupported export format`) | [V] S3, S4 (`{value:"3mf"},{value:"stl"}`) |
| Conteneur | Toujours un ZIP `${generator.id}.zip` → `gridfinity-baseplate.zip` | [V] S4 `triggerBlobDownload(e, \`${l}.zip\`)` |
| Nommage | pièce unique `gridfinity-baseplate.3mf` ; multi-pièces `gridfinity-baseplate-part-{n}.{ext}` ; nesting `gridfinity-baseplate-plate-{n}.{ext}` ; `gridfinity-baseplate-assembly-map.txt` ; `CLICK_clip_x{N}.{ext}` (N = nb de clips) ; `README.md`, `ATTRIBUTIONS.md`, `LICENSE` (si CLICKbase) | [V] S4 |
| README | Inclut tiroir choisi, imprimante (volume), lien de partage avec réglages | [V] S4 |
| 3MF | Pièces nommées dans le 3MF (v0.5.11), miniature capturée (`captureThumbnail`) | [V] S2 changelog, S4 |
| Génération | 100 % navigateur (worker). Réseau pendant chargement : uniquement assets, worker, iconify, Supabase RPC pub, `hdri.hdr` | [V] S1 `list_network_requests` |

### A.4 Algorithmes clés observés

- **Layout (Solid)** — fonction `wx` (S2) : `timesX = floor(width / gridUnitWidth)`, marge = reste ; la marge est répartie par `bx(restX, restY, alignment)` (center = moitié/moitié, top-left = tout à droite/bas…) puis décalée de `offsetX/offsetY` (bornée ≥ 0). Centre de la 1ʳᵉ cellule : `marginLeft + w/2` [V].
- **Overtile** — `vx` : si une marge > 0, on ajoute une colonne/rangée complète de chaque côté concerné, puis on clippe par le contour de la plaque (utile pour abouter des plaques) [V].
- **Half Grid** — demi-cellules de 21 mm (par défaut) dans les marges où elles tiennent [V S2 description].
- **Margin Fit** — cellules « sur mesure » dans les marges, requiert marge ≥ max(4, 2×borderRadius) [V S2 `checkMarginFitDisabled`].
- **Profil de cellule** — fonction `_x` + constantes `fx` (S2) :
  ```
  fx = { DEFAULT_GRID_UNIT_SIZE: 42, FIRST_TAPER_REDUCTION: 0.5, MAIN_BODY_REDUCTION: 2.15,
         INNER_RING_REDUCTION: 0.7, PLATEAU_HEIGHT_OFFSET: 1.8, MAGNET_BASE_HEIGHT: 2.8,
         MAGNET_BLOCK_PADDING: 4, MAGNET_DIAMETER: 6, MAGNET_HEIGHT: 2,
         LOFT_BOOLEAN_PAD_MM: 1, MAGNET_CRUSH_RIB_COUNT: 8 }
  ```
  Couches lissées (rounded rectangles) z / demi-réduction : 0 → 0 ; 0,5 → 0,5 ; 2,15 → 2,15 ; 3,95 → 2,15 ; 4,65 → 2,85 ; rayon = `borderRadius − réduction` (4 → 1,15). Le solide est « lofté » puis retourné (`rotateX(π)`) et soustrait de la dalle : z=0 du profil = face supérieure [V `_computeGridUnit3D`]. Le point à 0,5 mm est un point intermédiaire sur la même pente 45° (sert au rayon) [I].
- **Hauteur totale** = 4,65 + (aimants ? max(magnetBaseHeight 2,8 ; bottomPadding) : bottomPadding) ; `tray` = plancher plein à 2,8 mm [V `_x`, `Mx`, `_computeBaseplate`]. Puis `topCutoff` est retiré du haut [V `p_(A, E, plateHeight…)`].
- **Aimants** : trou cylindrique Ø = d + tolérance, profondeur = épaisseur aimant, dans un bloc carré (d+4)² ; centre placé à `42/2 − 2 − (d+4)/2` = **14 mm** du centre de cellule pour d=6 (fonction `Ax`) [V code] → soit 7 mm du bord, contre 8 mm dans la spec. Écart confirmé par mesure sur export (C.3) [V].
- **Vis** : loft circulaire tige Ø s puis cône vers Ø tête, tête cylindrique sur les 2 derniers mm (`_computeScrewHolePrototype`) [V].
- **Disposition des vis** (relevé du 2026-09-29, #11) : une vis à chaque **intersection intérieure** de la grille, **aucune sur le bord de la grille ni dans la marge**. Code de v0.5.21 (`chunks/ZtMF-tzs.js`, fonction `be`, 3ᵉ étape) : pour chaque cellule (rangée r, colonne c), la vis est posée au barycentre des centres des cellules (r, c), (r, c+1), (r+1, c) et (r+1, c+1), seulement si les quatre existent ; les intersections sur une ligne de découpe sont retirées si `removeHolesOnSplitLines`. Soit (nx − 1) × (ny − 1) vis : 4 pour une 3 × 3, 1 pour une 2 × 2, aucune pour une grille 1 × N. En type Normal sans aimants, le trou est simplement soustrait du croisement des murets : pas de plot ni de socle, et **aucun jeu** ajouté aux Ø (`screwHolePrototype` ne dépend que de `toggleScrewHoles`, `screwHoleSize`, `screwHeadSize`, `quality`). Fraisure : tige jusqu’à z = h − a, avec a = (max(tête, 2·tige) − tige) / (2·tan 22,5°) ; cône à 45° (90° inclus) jusqu’au Ø tête, puis alésage cylindrique Ø tête jusqu’en haut, qui entaille les pentes des poches autour du croisement. Pour tige 3 / tête 6 et h = 4,65 : cône de z = 1,03 à 2,53 [V code ; l’aperçu 3D n’a pas pu être relu à l’écran].
- **Skeleton** : prismes trapézoïdaux croisés sous chaque cellule (≠ du `profile_skeleton` de rebuilt) [V code, I géométrie].
- **CLICKbase** : constantes `zx` (cutoutLength 11, cutoutDepth 1,075, aditionDepth 2,4…), sur la base de `42/4` ; le 5ᵉ anneau du profil est modifié [V].

### A.5 Découpe pour plateau (split)

- `_calculateOptimalSplitsWithMargins` : **programmation dynamique** sur le nombre d'unités d'un axe, minimisant le nombre de pièces sous contrainte `taille_pièce(mm, marges incluses) ≤ plateau − 2×plateMargin` ; `fewerParts` essaie les grandes pièces d'abord, `balanced` départage par homogénéité (`_isMoreBalanced`) [V S2].
- Découpes **sur les lignes de grille** (pièces = nombre entier d'unités) ; les marges suivent la pièce de bord ou deviennent des bandes (`splitOffMargins`) [V S2 desc + changelog].
- `tJunctions` décale les coupes pour éviter les croisements à 4 [V description].
- Chaque pièce = intersection de la plaque complète avec un prisme rectangulaire (`extrudeLinear` du contour de pièce) [V S2 l. ~15515].
- Nombre de clips calculé (`connectorClipsNeeded`) et exporté dans le nom du fichier clip [V S4].

### A.6 Autres outils extrabold.tools

- Le sitemap ne liste que : `/`, `/mcp`, `/gridfinity-baseplate`, `/docs/gridfinity-baseplate`, `/category/gridfinity` [V `https://extrabold.tools/sitemap.xml`]. Le registre du worker ne contient qu'un générateur (`/src/lib/core/generators/gridfinity-baseplate/index.js`) [V S2].
- Serveur MCP (A.1). Le changelog mentionne des bases posées pour les **dovetails** (option cachée) [V].

---

## Partie B — Spécification Gridfinity (sources primaires)

### B.1 Statut de la spec

- Pas de spec normative officielle de Zack Freedman sous forme texte : les modèles originaux sont des fichiers Fusion 360 ; `gridfinity.xyz/specification/` renvoie à un **dessin communautaire** « Gridfinity Design Reference v5 » (@willtree8), qui précise : « It is based on and not intended as a replacement for Zack Freedman's original designs » [V S8].
- `gridfinity-rebuilt-openscad` cite explicitement « Based on https://gridfinity.xyz/specification/ » pour ses constantes [V S7 `src/core/standard.scad` l. 34, 104, 168 ; `src/core/gridfinity-baseplate.scad` l. 13].

### B.2 Dimensions de base

| Grandeur | Valeur | Source |
|---|---|---|
| Pas de grille | **42 × 42 mm** | S8 « 42x42mm » ; S7 `standard.scad` l. 15 `GRID_DIMENSIONS_MM = [42, 42]` ; `gridfinity-baseplate.scad` l. 19 `BASEPLATE_DIMENSIONS` [V] |
| Unité de hauteur | **7 mm** (« +1u = +7mm ») | S8 ; S7 `standard.scad` l. 217 `BASE_HEIGHT = 7` [V] |
| Lèvre d'empilement | ≈ 4,4 mm ; profil 0,7 / 1,8 / 1,9 | S8 ; S7 `STACKING_LIP_LINE` l. 124-129 [V] |
| Pied de bac (dessus) | **41,5 × 41,5 mm** (« 0.5mm tolerance »), coin Ø 7,5 (r 3,75) | S8 ; S7 `BASE_TOP_DIMENSIONS` l. 197, `BASE_TOP_RADIUS = 7.5/2` l. 190, `BASE_GAP_MM` l. 205 [V] |
| Profil du pied de bac | 0,8 (45°) / 1,8 (vertical) / 2,15 (45°) = **4,75 mm** ; dessous 35,6 mm, coin Ø 1,6 | S8 ; S7 `BASE_PROFILE` l. 175-180, `base_bottom_dimensions` l. 236-240 [V] |
| Baseplate (cellule) | 42 × 42, coin extérieur **Ø 8** (r 4), hauteur « ~5 mm » | S8 ; S7 `BASEPLATE_OUTER_DIAMETER = 8` l. 31, `BASEPLATE_HEIGHT = 5` l. 26 [V] |
| Profil baseplate | **0,7 (45°) / 1,8 (vertical) / 2,15 (45°) = 4,65 mm** ; « 0.25 offset » sur le dessin | S8 ; S7 `_BASEPLATE_PROFILE` l. 38-43 [V] |
| Rayon intérieur bas de poche | 4 − 2,85 = **1,15 mm** | S7 `BASEPLATE_INNER_RADIUS` l. 59 [V] |
| Jeu sous le profil (rebuilt) | 5 − 4,65 = 0,35 mm (`_baseplate_clearance_height`) « ensures the base makes contact with the baseplate lip » | S7 `gridfinity-baseplate.scad` l. 22-26, 81 [V] |
| Tolérance booléenne interne | `TOLLERANCE = 0.02` (anti-slivers, pas un jeu fonctionnel) | S7 `standard.scad` l. 19 [V] |

### B.3 Schéma ASCII du profil (coupe d'un bord de poche de baseplate)

```
        bord de cellule (42 mm entre axes des murets)
        |
  z=4.65 +  <- arête vive (Top Cutoff extrabold 0,4 mm la supprime)
         \
          \   45°, 2,15 mm en x et en z
           \
  z=2.50    +
            |   vertical, 1,8 mm
            |
  z=0.70    +
             \  45°, 0,7 mm
  z=0.00      +------------------  fond de poche (ouvert : baseplate "thin",
                                   ou dalle si magnets/weighted/tray)
      |<-2.85->|   retrait total horizontal : 0,7 + 2,15

  Pied de bac correspondant : 0,8 / 1,8 / 2,15 (4,75 mm), dessus 41,5 mm
  -> il repose sur le chanfrein haut de la plaque ; jeu latéral nominal
     0,25 mm par côté ((42 - 41,5)/2), cf. « 0.25 offset » sur S8.

  Rayons : haut 4,0 mm (Ø 8) -> bas 1,15 mm (rebuilt / extrabold).
  Rebuilt ajoute 0,35 mm de hauteur libre sous z=0 (BASEPLATE_HEIGHT=5).
```

### B.4 Aimants et vis

| Élément | Spec (S8) | gridfinity-rebuilt (S7) | extrabold (S2) |
|---|---|---|---|
| Aimant | 6 × 2 mm ; trou Ø 6,5 | `MAGNET_HOLE_RADIUS = 6.5/2` (l. 28), `MAGNET_HOLE_DEPTH = 2 + 2×0,2 = 2,4` (l. 29) | Ø d + tolérance (6,2 par défaut), profondeur = épaisseur (2) |
| Crush ribs | — | Ø intérieur 5,9, 8 nervures (l. 45-49) | Ø int max(d−0,1 ; 0,85d), 8 nervures |
| Chanfrein d'entrée | — | +0,8 mm à 45° (l. 52-53) | — |
| Position | 4,8 mm depuis le bord du dessous (35,6) → 13 mm du centre (8 mm du bord de 42) | `HOLE_DISTANCE_FROM_BOTTOM_EDGE = 4.8` (l. 35), `d_hole_from_side = 8` (l. 32), `hole_pattern()` (`gridfinity-rebuilt-baseplate.scad` l. 250-256) | 14 mm du centre [I, cf. A.4] |
| Vis (bacs) | M3, Ø 3,0 | `SCREW_HOLE_RADIUS = 3/2` (l. 27) | — |
| Vis de fixation de la plaque | — | fraisage `+5/2` de rayon, lamage Ø 5,5 × 3 (l. 56-58), `style_hole` 0/1/2 aux positions d'aimant | Fraisage aux intersections **intérieures** de la grille (ni bord ni marge), tige 3 / tête 6, sans jeu (A.4) |
| « Refined » | — | Ø 5,86, h 1,9 (l. 39-42) | — |

### B.5 Variantes de baseplate dans gridfinity-rebuilt

Fichier `gridfinity-rebuilt-baseplate.scad` (S7) :
- `style_plate` l. 54 : `0: thin, 1: weighted, 2: skeletonized, 3: screw together, 4: screw together minimal` (défaut 3).
- Épaisseur ajoutée sous le profil, `calculate_offset` l. 220-234 : thin 0 ; weighted `bp_h_bot = 6.4` ; screw-together **6,75** ; skeletonized `h_skel(1) + (aimant ? 2,4 : 0) + (vis : d_screw / 2,5 / 3)`.
- Weighted : `cutter_weight()` l. 236-249 — carré 21,4 mm profondeur 4 (`bp_cut_size`, `bp_cut_depth`) + 4 encoches arrondies 8,5 × 4,25 profondeur 2 (`standard.scad` l. 256-266).
- Skeletonized : `profile_skeleton()` l. 304-315, rayon `r_skel = 2`, conserve un îlot autour de chaque trou (`MAGNET_HOLE_RADIUS + r_skel + 2`).
- Screw-together : `cutter_screw_together()` l. 317-331, vis horizontales Ø `d_screw = 3.35`, `n_screws` 1-3 par unité.
- Coins extérieurs arrondis r 4 (`square_baseplate_corner`, l. 280-293).
- **« Lite »** : `gridfinity-rebuilt-lite.scad` est un **bac** léger (`gridfinity_base_lite`), pas une baseplate [V]. Pas de variante « lite baseplate » dans rebuilt ; le plus proche est `style_plate = 0` (thin).

### B.6 Remplissage d'un tiroir (taille non entière) — rebuilt

`gridfinityBaseplate()` l. 91-218 (S7) :
- `distancex/distancey` = taille minimale (tiroir) ; si `gridx == 0` → `grid_size = floor(min_size_mm / length)` (l. 110-111).
- `size_mm = max(grid_size_mm, min_size_mm)` ; `padding_mm = size_mm − grid_size_mm` (l. 117-124) : le reste est **plein** (équivalent « Solid » d'extrabold).
- `fitx/fity ∈ [−1, 1]` → part du padding côté +axe = `(fit + 1)/2` (l. 46-48, 130-137). −1/0/+1 ≈ alignements gauche/centre/droite d'extrabold.
- Coins arrondis appliqués au contour **avec** padding (l. 139-144, 201-211).
- **Découpe multi-plateaux : absente** de rebuilt (aucune occurrence de « split »/« build plate » dans les `.scad` et docs) [V]. Les versions screw-together servent à assembler des plaques imprimées séparément.

### B.7 Compatibilité pied de bac / baseplate

- Le pied (4,75 mm, dessus 41,5) est plus haut que la poche (4,65 mm) et plus petit de 0,5 mm : le bac repose sur les chanfreins 45° supérieurs, jeu latéral nominal 0,25 mm/côté [V valeurs S7/S8 ; I interprétation mécanique]. Rebuilt garde 0,35 mm libres sous le profil pour garantir le contact sur la lèvre [V commentaire l. 22-24, 79-80].
- Pour rester compatible : ne pas modifier 42 mm, 0,7/1,8/2,15, rayon 4 ; toute « tolérance » doit élargir la poche et non changer le pas.

---

## Recommandations de stack (brèves, fondées sur les preuves ci-dessus)

1. **Géométrie client-side dans un Web Worker** : c'est l'architecture d'extrabold (S3) et elle évite tout backend. Le cœur géométrique est simple : dalle extrudée − (N × loft de rounded-rectangles 5 couches) + blocs d'aimant / trous → reproductible avec :
   - **`@jscad/modeling`** (choix prouvé en production par extrabold, MIT) + `@jscad/stl-serializer` / `@jscad/3mf-serializer` ; **ou**
   - **manifold-3d** (WASM) si les booléens sur grandes plaques deviennent lents — non vérifié dans cette recherche, à benchmarker [I].
   - Pas besoin d'OpenSCAD-wasm ni d'OCCT tant que STEP n'est pas requis (extrabold n'exporte pas de STEP).
2. **Aperçu** : three.js (extrabold r182 + OrbitControls). Envoyer les polygones JSCAD au thread principal en `BufferGeometry`.
3. **Découpe** : implémenter sur les lignes de grille, avec programmation dynamique 1D par axe (cf. A.5), puis `intersect` par pièce.
4. **Export** : 3MF (multi-objets nommés, un fichier par plateau) + STL, empaquetés avec JSZip.
5. **UI** : schéma de paramètres déclaratif (id, type, min/max/step, default, `showIf`, `urlKey`) sérialisé dans l'URL, comme extrabold. Le workspace utilise majoritairement Vue 3 + Vite + Tailwind (`~/www/CLAUDE.md`) ; extrabold utilise SvelteKit — le choix de framework n'a pas d'impact sur la géométrie.
6. **Mémoïsation par étapes** (graphe de dépendances des paramètres) : c'est ce qui rend l'outil réactif (A.1).
7. **Licences** : ne pas reproduire CLICKbase (CC BY-NC-SA 4.0, usage non commercial) sans respecter la licence ; constantes de rebuilt = MIT.

## Questions ouvertes

1. **Licence Gridfinity** : ~~à confirmer~~ → **tweet MIT vérifié** (2023-04-24) et gridfinity.xyz dit « released under the MIT license » ; la mention « CC BY-NC-SA » du dessin S8 est antérieure/contradictoire et vise le dessin communautaire. Reste ouvert : licence affichée sur Thangs (hébergement officiel de Zack, non lisible sans JS) et statut des fichiers Printables CC-BY-NC-SA. Détails : section « Licence Gridfinity ». Pas un avis juridique.
2. **Position des aimants extrabold** (14 mm vs 13 mm) : ~~vérifier sur un STL exporté~~ → **CONFIRMÉ 14 mm** par mesure (C.3) : centres à 7 mm du bord de cellule, Ø 6,2, profondeur 2,0. Écart de 1 mm avec la spec (13 mm) bien réel dans le fichier ; bug ou choix délibéré reste ouvert (non documenté par l'outil).
3. **Hauteur libre** : faut-il reprendre les 0,35 mm de rebuilt (`BASEPLATE_HEIGHT = 5`) ou le profil ras d'extrabold + Top Cutoff 0,4 ? → Mesure (C.2) : **extrabold n'a aucun segment vertical sous le profil** (le chanfrein 0,7 mm démarre à z = 0) ; hauteur 4,25 mm = 4,65 − 0,4. Le choix de conception reste à trancher pour notre générateur.
4. Tolérance : extrabold l'applique aux trous/connecteurs ; s'applique-t-elle aussi à la poche ? → **CONFIRMÉ non** (C.2) : avec tolérance `standard` (0,2), ouvertures de poche exactement nominales (36,32 / 37,70 / 41,18 mm) alors que le trou d'aimant passe bien à Ø 6,2.
5. Géométrie exacte du clip `CLICK_clip.3mf` et des edge connectors (fichier statique `/models/CLICK_clip.3mf`, non analysé).
6. Détails du mode Path (éditeur de polygone, congés) et de l'algorithme de nesting (non analysés en profondeur).
7. Besoin produit : STEP ? (imposerait replicad/OpenCascade.js au lieu de JSCAD).
8. Base de données imprimantes : réutiliser les définitions Cura (licence LGPL de Cura à vérifier) comme le fait extrabold ?

## C. Mesures sur export réel

Exports réalisés le 2026-09-28 sur https://www.extrabold.tools/gridfinity-baseplate (v0.5.21), sans compte. Fichiers : `scratchpad/extrabold-export/{nomagnets_stl,magnets_stl}/gridfinity-baseplate.stl` (+ variantes 3MF `nomagnets/`, `magnets/`) dans le scratchpad de session.

### C.1 Méthode

- Réglages : page ouverte **sans paramètres d'URL** (seul moyen d'obtenir les vrais défauts : un lien complet `…tolerance=standard…topCutoff=0.4` rechargé est réécrit en `tolerance=none`, `topCutoff=0` — cf. remarque A.2), puis Width = Depth = 84 via l'UI, format STL, « Regenerate ». URL de partage incluse dans le README du zip : `baseplate=normal&tolerance=standard&width=84&depth=84&margin=solid&magnets=false|true&magnetDiameter=6&magnetHeight=2&magnetBase=2.8&bottomPad=0&topCutoff=0.4&v=0.5.21`.
- Piège : le 1er export après changement de dimensions contenait encore l'ancien maillage (84×126) — toujours vérifier la cote affichée dans la modale (« 84×84×4.25mm ») avant de télécharger.
- Récupération : interception du Blob ZIP (`URL.createObjectURL`) via Chrome DevTools MCP, transfert par `postMessage` vers une page locale (la CSP `connect-src` interdit un `fetch` direct vers localhost).
- Mesure : Python + trimesh (`mesh_plane` pour coupes verticales y = 21 ; `section` z = cste pour coupes horizontales ; rayons verticaux pour tester la présence d'un fond). Maillage non « watertight » selon trimesh (sans incidence sur les coupes). Origine du fichier : coin (0,0,0), cellules centrées en (21,21), (63,21), (21,63), (63,63).

### C.2 Type Normal sans aimants (défauts, topCutoff 0,4)

- **Bounding box : 84,000 × 84,000 × 4,250 mm** (= 4,65 − 0,4) ; 1 580 triangles ; volume 5 035 mm³.
- **Pas de fond** : un rayon vertical en (21,21), (7,7), (35,35)… ne touche aucune face → la poche est **ouverte en dessous** (cadre ajouré).
- **Profil du muret entre deux cellules** (coupe y = 21, axe du muret x = 42 ; côté gauche, symétrique à droite) :

  | Sommet | x (mm) | z (mm) | retrait depuis l'axe du muret |
  |---|---|---|---|
  | pied | 39,15 | 0,00 | 2,85 |
  | fin du chanfrein bas 45° | 39,85 | 0,70 | 2,15 |
  | haut du vertical (1,8 mm) | 39,85 | 2,50 | 2,15 |
  | sommet coupé (45° de 1,75 mm) | 41,60 | 4,25 | 0,40 |
  | plat supérieur | 41,60 → 42,40 | 4,25 | largeur 0,8 |

  Le point intermédiaire (40,725 ; 3,375) est un simple milieu de segment (triangulation). Bord extérieur de plaque : même profil, plat supérieur de 0,4 mm (x 0 → 0,4).
- **Aucun segment vertical de 0,35 mm sous le profil** : le chanfrein bas démarre directement à z = 0 (contrairement à rebuilt, `BASEPLATE_HEIGHT = 5`). Niveaux z distincts du maillage : 0 / 0,7 / 2,5 / 4,25 (+ 2,125 et 2,55, artefacts de triangulation des congés).
- **Ouverture de poche et rayons de coin** (coupes horizontales) : z ≈ 0 → 36,32 mm, r ≈ 1,16 ; z = 1,6 → 37,70 mm, r ≈ 1,85 ; z = 4,24 → 41,18 mm, r ≈ 3,59. Conforme à `rayon = 4 − retrait` ; **aucune tolérance appliquée à la poche**.

### C.3 Type Normal avec aimants (défauts : Ø 6, ép. 2, magnetBase 2,8, direction top, cylindre)

- **Bounding box : 84,000 × 84,000 × 7,050 mm** (= 4,65 + 2,8 − 0,4) ; 5 652 triangles ; volume 12 774 mm³.
- Le profil de poche est identique, **décalé de +2,8 mm** : (39,85 ; 3,5) → (39,85 ; 5,3) → (41,6 ; 7,05) ; sous z = 2,8, le muret descend **verticalement** à x = 39,15 (retrait 2,85) jusqu'à z = 0.
- **Pas de dalle pleine** : le centre de cellule reste ouvert (rayon en (21,21) : aucune intersection). La « magnet base » = prolongement vertical des murets + **blocs carrés 10 × 10 mm** (d + 4) dans chaque coin de cellule (x, y ∈ [2 ; 12] depuis le coin, fusionnés au muret, congé ≈ 1 mm côté intérieur).
- **Trous d'aimant** (coupes z = 1,5 et 2,7) : 16 trous, **centres en x, y ∈ {7, 35, 49, 77}** → **14,0 mm du centre de cellule** sur chaque axe (7 mm du bord de cellule), **Ø 6,20 mm** (r 3,10 = 3 + 0,2/2 ; polygone à 64 segments), **profondeur 2,00 mm** (z 0,8 → 2,8), ouverts vers le haut (dans la poche), **borgnes** avec 0,8 mm de fond (rayon en (7,7) : faces à z = 0 et z = 0,8).
- Conclusion : la valeur 14 mm lue dans le code (`Ax`) est **confirmée** ; la spec/rebuilt place les aimants à 13 mm (8 mm du bord). Un bac Gridfinity standard (aimants à 13 mm) aura donc ses aimants décalés de 1 mm (√2 ≈ 1,41 mm en diagonale) par rapport à ceux d'une baseplate extrabold ; l'attraction reste possible (recouvrement partiel des Ø 6) mais l'alignement n'est pas nominal.

## Licence Gridfinity

Vérification du 2026-09-28, sources primaires uniquement. [V] = lu directement ; [I] = inféré.

| Source | Constat | Statut |
|--------|---------|--------|
| Tweet de Zack Freedman `https://x.com/zackfreedman/status/1650629770156326912` (lu via `api.fxtwitter.com/zackfreedman/status/1650629770156326912` et `cdn.syndication.twimg.com/tweet-result?id=1650629770156326912`) | Texte exact : « All of my Gridfinity stuff is now MIT licensed, so go nuts! » — auteur @zackfreedman, **2023-04-24 22:36:19 UTC**, `isEdited: false`. | [V] |
| `https://gridfinity.xyz/` (wiki non officiel, section « Origins of Gridfinity ») | « The Gridfinity designs were first released in the video "Gridfinity: Your Ultimate Modular Workshop is FREE!" as a framework for the community to extend, released under the MIT license. » Mentionne aussi que l'Assortment System d'Alexandre Chappel (CC-BY-NC-SA) a « partly inspired » Gridfinity. | [V] |
| `https://gridfinity.xyz/specification/` (HTML) | Aucune mention de licence dans le texte de la page ; la mention « Gridfinity is licensed CC BY-NC-SA » n'existe que **dans l'image** du dessin S8 (@willtree8). | [V] (texte page) |
| `kennetek/gridfinity-rebuilt-openscad` `LICENSE` (branche `main`) | Double bloc MIT : « Copyright (c) 2023 Kenneth Hodson » **puis** « This repository is based on Gridfinity: MIT License Copyright (c) 2023 Zachary Freedman and Voidstar Lab LLC ». | [V] |
| Description YouTube `ra_9zU-mnl8` (vidéo d'origine, 2022) | « free and open-source hardware that anyone can print » ; **aucune licence nommée** ; les téléchargements pointent vers `thangs.com/designer/ZackFreedman/3d-model/Gridfinity`. | [V] |
| Thangs (page de Zack) | Page rendue en JS, licence non lisible par curl. | non vérifié |
| Printables, compte `_cybermouse_` (id 192666 ; modèles « … by Zack Freedman », 2022-04) — API GraphQL `api.printables.com` | 7 modèles Gridfinity, tous **CC-BY-NC-SA** (ex. 174386 « Printer-Mounted Baseplates »). Que ce compte soit celui de Zack n'est pas prouvé ; ces fiches datent d'avant le tweet et n'ont pas été mises à jour. | [V] licence affichée ; [I] propriétaire |
| GitHub `zackfreedman` | Aucun dépôt contenant « gridfinity » (API GitHub). | [V] |
| Printables 417152 « Gridfinity Specification » (grizzie17) | CC-BY (spec communautaire tierce, pas Zack). | [V] |

### Lecture de l'état des sources (pas un avis juridique)

- Chronologie : sortie 2022 (fiches Printables CC-BY-NC-SA, pas de licence explicite sur YouTube) → **relicenciement annoncé en MIT par l'auteur le 2023-04-24** [V]. Le copyright MIT « Zachary Freedman and Voidstar Lab LLC 2023 » repris dans rebuilt est cohérent avec ce relicenciement [I].
- La mention CC BY-NC-SA du dessin S8 est une affirmation du contributeur communautaire, contredite par l'auteur original et par la page d'accueil du même site [V] ; elle couvre au plus le dessin lui-même (œuvre de @willtree8) [I].
- Des fiches de téléchargement anciennes affichent encore CC-BY-NC-SA [V] ; l'annonce MIT, émise par le titulaire, porte sur « all of my Gridfinity stuff » [V]. Divergence non résolue formellement sur ces fiches [I].
- Pour un **générateur web MIT, code original, qui reprend seulement les cotes** : les cotes/dimensions d'un système d'interface sont des faits fonctionnels, pas du code copié [I] ; et même si l'on considérait l'œuvre de Zack comme source, elle est annoncée MIT par son auteur [V]. Un usage commercial (publicité) paraît donc compatible avec l'état des sources [I]. Précautions raisonnables : ne pas copier de fichiers CC-BY-NC-SA (fiches Printables, CLICKbase, dessin S8) ; conserver la notice MIT de rebuilt si on reprend ses constantes/code ; citer Zack Freedman + lien tweet dans ATTRIBUTIONS ; « Gridfinity » employé comme nom descriptif de compatibilité (statut de marque non vérifié) [I].


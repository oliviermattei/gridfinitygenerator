# Recherche : découpe pour le plateau et liaison des pièces

> Date : 2026-09-30. Question : quand la baseplate dépasse le **plateau**, comment la découper en **pièces** et relier ces pièces, pour notre baseplate ajourée de 4,60 mm (profil hybride, sans socle, marge en cellules tronquées #19, vis optionnelles aux intersections intérieures, ADR 0006) ?
> Contexte : la spec v1 (#1) met la découpe hors périmètre (« pièces multiples, connecteurs, zip multi-pièces »). La recherche précédente (`gridfinity-baseplate.md`, A.5) avait seulement esquissé l'algorithme d'extrabold.
> Légende : **[V]** vérifié dans une source primaire (code, bundle public, fichier, page) · **[I]** inféré (raisonnement, calcul sur nos cotes, lecture de code minifié), à confirmer.

## Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| E1 | Bundle générateur extrabold `https://www.extrabold.tools/_app/immutable/chunks/ZtMF-tzs.js` (147 Ko, v0.5.21, téléchargé le 2026-09-30) | Contient le plan de découpe, les trous de clip, les queues d'aronde cachées, la carte d'assemblage. Numéros de ligne = ma copie prettier locale (non stables) ; les **identifiants cités** sont retrouvables dans le bundle. Le worker `workers/jscad-worker-0D2CKfQH.js` embarque le même code. |
| E2 | Bundle page `https://www.extrabold.tools/_app/immutable/nodes/4.Dh57k2Q7.js` | Export ZIP (`createZipArchive`), nommage des fichiers, ajout du clip. |
| E3 | Modèle du clip `https://www.extrabold.tools/models/CLICK_clip.stl` (2 684 octets, 52 triangles) et `.3mf` | Mesuré avec un script Node (lecture STL binaire). |
| G1 | `yawkat/GridFlock`, commit `962aad7929a4c123eb31d4eb4e5e7a0580223f5b` (2026-09-08), `gridflock.scad`, `README.md`, `puzzle.svg`, `LICENSE` | Générateur OpenSCAD avec découpe et connecteurs puzzle. |
| X1 | `ostat/gridfinity_extended_openscad`, commit `94d5a3e2d39e0b90894c042a255fc487cfcc9197` (2026-09-23) | `gridfinity_baseplate.scad`, `modules/module_gridfinity_frame_connectors.scad`, `LICENSE`. |
| R1 | `kennetek/gridfinity-rebuilt-openscad`, commit `910e22d8607fd7f5f51ad5e5cbc5287a76810bfd` (2025-08-31) | `gridfinity-rebuilt-baseplate.scad`. |
| P1 | API GraphQL `api.printables.com` (requête `print(id)` : nom, auteur, licence, description) | Licences des modèles communautaires. |
| M1 | Page MakerWorld de GRIPS `https://makerworld.com/en/models/704997` (lue dans Chrome le 2026-09-30) | Description, historique, licence, commentaires. |
| S1 | Aide Prusa « Multiple build plates on PrusaSlicer » et annonce PrusaSlicer 2.9 ; article printago.io sur la structure 3MF de Bambu Studio / OrcaSlicer | Plateaux multiples dans les trancheurs. |

---

## Résumé

1. **Tout le monde coupe sur les lignes de grille** [V E1, G1, X1] : une pièce est un nombre entier de cellules, la marge suit la pièce de bord. Couper sur l'axe d'un muret donne à chaque pièce un bord qui est exactement un bord de baseplate standard (demi-muret, plat de 0,4 mm) : deux pièces aboutées refont le muret de 0,8 mm [I, d'après nos cotes].
2. **Extrabold** [V E1] : programmation dynamique par axe (moins de pièces, puis départage « équilibré »), variante « T-junctions » qui décale les coupes d'une colonne sur deux, nesting glouton par rectangles libres, marge de plateau de 10 mm par bord, vis retirées sur les lignes de coupe par défaut, clips séparés (modèle statique `CLICK_clip`, un par bord de cellule le long des coupes), queues d'aronde intégrées **cachées** (WIP). Il ne tourne jamais le plan de découpe en bloc (axe X ↔ largeur du plateau figé).
3. **GridFlock** (MIT + CC-BY 4.0) [V G1] : colonnes de taille « idéale » (égales), puis deux plans de rangées décalés en alternance pour **éviter toute jonction en croix**, sans pièce de plus ; connecteur par défaut = petit **tenon puzzle intégré à chaque intersection** coupée ; numéro de pièce gravé dessous.
4. **Notre géométrie impose le lieu du connecteur** [I] : au milieu d'un bord de cellule, le demi-muret n'a que 2,15 mm de matière de chaque côté entre 1,05 et 2,85 mm de haut ; aucun tenon ne tient là. À une **intersection**, le tenon peut courir le long du muret perpendiculaire, qui est plein sur toute sa longueur : c'est le seul endroit où un connecteur intégré a de la place. Il entre en conflit avec une vis posée à cette intersection.
5. **Recommandation** : couper sur les lignes de la grille prolongée (marge comprise), minimiser le nombre de pièces puis équilibrer, essayer les deux orientations du plateau, décaler les rangées quand c'est gratuit ; connecteur par défaut = **tenon intégré aux intersections des coupes** (aucune pièce en plus), à valider par un coupon d'impression ; exporter **un seul 3MF à plusieurs objets nommés** (pas de zip), un zip seulement pour le STL.
6. **Licences** : ne rien reprendre de CLICKbase / `CLICK_clip` (CC BY-NC-SA 4.0), de GRIPS (licence propriétaire « Standard Digital File ») ni de gridfinity_extended (GPL-3.0). GridFlock (MIT) et les idées d'extrabold (générateur déclaré CC0) sont réutilisables [V licences ; I lecture juridique, pas un avis].

---

## 1. Extrabold (v0.5.21)

### 1.1 Réglages de la famille « Build Plate » [V E1, objet `settings`]

| id (`urlKey`) | Défaut | Rôle |
|---|---|---|
| `splitToBuildplates` (`split`) | `false` | Active la découpe ; désactivé tant qu'aucune imprimante n'est choisie (`disabledIf: printer null`). |
| `plateMarginMm` (`plateMargin`) | 10 mm | Marge retirée **sur chaque bord** du plateau : zone utile = plateau − 2 × 10. |
| `splitStrategy` (`splitStyle`) | `fewerParts` | `fewerParts`, `balanced`, `tJunctions`. |
| `splitOffMargins` (`splitMargins`) | `false` | Marges extérieures en bandes séparées (depuis 0.5.21). |
| `enablePlateNesting` (`nest`) | `false` | Regroupe les pièces par plateau (« only works when exporting 3MF files »). |
| `pieceSpacingMm` (`pieceSpacing`) | 3 mm | Écart entre pièces regroupées. |
| `partsConnector` (`connector`) | `none` | `none`, `clips` (marqué expérimental, `checkPartsConnectorExperimental`), `dovetails` (**`hidden: true`**). Clips interdits en Skeleton. |
| `enableEdgeConnectors`, `edgeConnectorSides` | `false`, 4 côtés | Trous de clip aussi sur le pourtour (pour abouter des baseplates). |
| `removeHolesOnSplitLines` (`removeSplitHoles`) | `true` | Retire les vis tombant sur une ligne de coupe. |

### 1.2 Plan de découpe (`_computeSplitPlan`) [V E1]

- **Zone utile** : `k = buildWidth − 2·plateMargin`, `S = buildDepth − 2·plateMargin`. Les colonnes sont toujours confrontées à la largeur du plateau, les rangées à sa profondeur : **aucun essai du plan tourné de 90°** (seul le nesting sait tourner une pièce).
- **Taille d'une pièce** (`getColPieceSize`, `getRowPieceSize`) : `n × 42`, plus la marge gauche si la pièce commence à la colonne 0, plus la marge droite si elle finit à la dernière. Avec `splitOffMargins`, la marge n'est plus comptée et devient des bandes.
- **Programmation dynamique 1D par axe** (`_calculateOptimalSplitsWithMargins(n, maxUnits, minUnits, sizeFn, effective, strategy)`) :
  - si l'axe entier tient, une seule pièce ;
  - `cost[d]` = nombre minimal de pièces pour couvrir les `d` premières cellules ; on essaie toutes les tailles `t` de `minUnits` à `min(maxUnits, d)` telles que `sizeFn(d − t, t) ≤ effective` ;
  - `fewerParts` parcourt les tailles de la plus grande à la plus petite et garde la première solution de coût minimal (grandes pièces d'abord) ;
  - `balanced` départage à coût égal par `_isMoreBalanced` : variance des tailles plus faible ;
  - `minUnits` vaut 2 quand l'axe entier tient sur le plateau, sinon 1 (`$ = N && O >= 2 ? 2 : 1`) ; en pratique, dès qu'il faut couper, une pièce d'une seule cellule est permise [V code ; I conséquence].
- **T-junctions** (`_calculateOffsetSplits`) : on calcule le plan « fewerParts » des colonnes, puis un second plan décalé de `max(1, floor(moyenne/2))` cellules ; les **rangées impaires** utilisent le plan décalé (`M % 2 == 1 ? Y : q`). Attention : ce sont les **colonnes** qui alternent d'une rangée à l'autre, en briques. Si le décalage ne tient pas sur le plateau, pas de décalage (`return null`).
- **Découpe géométrique** (`Me`) : chaque pièce = `intersect(baseplate entière, extrudeLinear(rectangle de la pièce))` ; le rectangle `ue(w, d)` n'est **pas arrondi** : les coins intérieurs restent vifs, seuls les coins extérieurs de la baseplate gardent leur rayon [V].
- **Vis sur les coupes** : dans `be`, une vis dont le centre est dans l'emprise de plus d'une pièce est retirée si `removeHolesOnSplitLines` [V].
- **Nesting** (`_findBestPlacement`, `_placePieceOnPlate`, `_pruneOverlappingRects`) : pièces triées par aire décroissante, placées dans le rectangle libre qui laisse le moins d'aire perdue (score `1000 × aire perdue + plus petit reste`), avec rotation de 90° autorisée ; découpage des rectangles libres façon « maximal rectangles » avec l'écart `pieceSpacing` ; chaque plateau est ensuite recentré [V]. Sans nesting, une pièce = un plateau, centrée, jamais tournée [V].

### 1.3 Clips [V E1, E3]

- **Emplacement** (fonction `X`) : un trou au **milieu de chaque bord de cellule** le long de chaque ligne de coupe (et le long du pourtour avec les edge connectors, fonction `Z`). Nombre de clips = (somme sur les pièces des cellules bordant une coupe) / 2 (fonction de `connectorClipsNeeded`). Exemple calculé pour le tiroir par défaut coupé en 2 × 2 (§ 3.6) : 6 + 9 = **15 clips** [I calcul].
- **Trou** (fonction `J`, `loft` de rectangles, sans aucune tolérance appliquée) : de chaque côté de la coupe, une demi-fente de **1,5 mm** (perpendiculaire à la coupe) × **5 mm** (le long de la coupe). Profil vertical, pour une pièce de hauteur `h` (4,25 mm en type Normal sans aimants) :
  - de −1,45 à 0,4 mm : fente étroite entre 0,65 et 1,5 mm de la coupe (il reste une « dent » de 0,65 mm de chaque côté, 1,3 mm au total) ;
  - de 0,4 à `h − 2,2` = 2,05 mm : la dent s'amincit linéairement jusqu'à zéro ;
  - de 2,05 mm à `h + 1` : fente pleine de 1,5 mm (3 mm au total, les deux pièces réunies).
- **Clip** (`CLICK_clip.stl`, mesuré) : profil en **U** extrudé sur 4,5 mm, imprimé à plat. Contour en mm (x à travers la coupe, y vertical) : `(1,0) (1,8,0) (2,8,1) (2,8,4,65) (2,65,4,65) (2,15,4,15) (2,15,2,459) (1,591,1,9) (1,209,1,9) (0,65,2,459) (0,65,4,15) (0,15,4,65) (0,4,65) (0,1)`. Soit 2,8 × 4,65 mm, deux jambes de 0,65 mm écartées de 1,5 mm, pont de 1,9 mm, chanfreins d'entrée sur les jambes. Volume 35,8 mm³.
- **Jeux** [I, calcul sur les cotes ci-dessus] : 0,1 mm par côté à travers la coupe (fente 3,0 / clip 2,8 ; dent 1,3 / écart 1,5), 0,25 mm par côté le long de la coupe (fente 5 / clip 4,5). Le clip est inséré par le haut, pont en haut, jambes de part et d'autre de la dent. Il est **plus haut que la pièce** (4,65 contre 4,25 mm) et son pont occupe toute la largeur de la fente en haut, là où se trouvent les pentes des poches : à vérifier s'il gêne l'assise d'un bac (non imprimé ici).
- **Licence** : le modèle vient de CLICKbase (John Hall, **CC BY-NC-SA 4.0**, attribution dans le générateur) [V attribution E1 ; I provenance du clip, par son nom]. Le fichier `LICENSE` n'est ajouté au zip que pour le type `clickbase` (`determineLicense`), pas quand on télécharge seulement des clips [V code].

### 1.4 Queues d'aronde cachées [V E1]

- Tables `te[tolérance]` pour 0 / 0,1 / 0,2 / 0,3 / 0,4 / 0,5 mm : `maleUnion` = tenon à tête ronde (Ø ≈ 2 mm, col ≈ 1,2 mm, saillie ≈ 2 mm), `maleCut` = dégagement ; côtés gauche/haut femelles, droite/bas mâles (`ie`, `le`).
- Positions (fonction `re`) : sur chaque bord coupé, **aux lignes de grille intérieures**, c'est-à-dire aux intersections ; à défaut (pièce d'une cellule), au milieu du bord. Avec `tJunctions`, les bords haut/bas ne reçoivent pas l'union mâle (`m = g && top|bottom`).
- Le côté femelle actuel ne fait qu'ajouter puis retirer un carré de 5 × 5 mm : l'option est visiblement inachevée [I], d'où `hidden: true`.

### 1.5 Export et carte d'assemblage [V E2, E1]

- Toujours un ZIP `gridfinity-baseplate.zip` (JSZip, DEFLATE 6).
- Multi-pièces : `gridfinity-baseplate-part-{n}.{3mf|stl}` ; avec nesting : `gridfinity-baseplate-plate-{n}.{ext}` (un 3MF par plateau, objets nommés `plate-{p}-piece-{i}`).
- `gridfinity-baseplate-assembly-map.txt` (fonction `we`) : grille ASCII, numéro de pièce dans chaque cellule, puis « Piece n: Rows a-b, Cols c-d / Size: … », bandes de marge, « Total connector clips needed ».
- Clips : `CLICK_clip_x{N}.{ext}` récupéré depuis `/models/` (fichier statique, identique quelle que soit la tolérance).
- README avec lien de partage, tiroir, imprimante ; ATTRIBUTIONS ; LICENSE si CLICKbase.

---

## 2. Les autres approches

### 2.1 GridFlock (yawkat) — MIT + CC-BY 4.0 [V G1]

- **Licence** : `LICENSE` « dual-licensed under MIT and CC-BY 4.0 » (Copyright 2026 Jonas Konrad) ; quelques modèles openGrid sous CC-BY 4.0. Fiche Printables 1579487 en CC-BY [V P1]. Le README se dit « clean-room implementation », distincte de GridPlates et GRIPS ; il réutilise gridfinity-rebuilt (MIT) pour le profil.
- **Découpe** (`main`, l. 1497-1532) :
  - marge de plateau pour les connecteurs : `connector_margin = 3,5 mm` (puzzle d'intersection) retirée du lit (défaut `bed_size = [250, 220]`) ;
  - axe X, algorithme « ideal » (`plan_axis_ideal`, l. 1319) : nombre minimal de segments, puis cellules réparties pour des segments de taille à peu près égale ; option « incremental » (segments maximaux, le dernier prend le reste) ;
  - axe Y, **deux plans alternés** (`plan_axis_staggered`, l. 1414) : les colonnes paires et impaires n'ont jamais une coupe au même endroit, donc **aucune jonction où quatre segments se rejoignent**. Le décalage est choisi parmi ceux qui n'ajoutent pas de segment (`plan_size(plan) <= best_size`), avec une pénalité de 20 pour un segment d'une seule cellule (`score_plan_b`, l. 1387) ;
  - marges (« padding ») attachées aux segments de bord, ou en bandes séparées (`separate_edge_padding`), bandes qui reçoivent aussi des connecteurs.
- **Connecteur « Intersection Puzzle »** (défaut, `connector_intersection_puzzle = true`, l. 67 ; modules l. 528-575 et 746) :
  - forme figée dans `puzzle.svg` (carré de 8 × 8 mm centré sur l'intersection) ; `intersection_puzzle_fit` ∈ [0, 1] interpole entre un contour « loose » et un contour « tight » (défaut 1 = serré) ;
  - le tenon mâle est coupé par un cercle de rayon 4 centré sur le coin de la poche voisine (`translate([-4, -4]) circle(4)`) : il ne mord jamais dans une poche ;
  - d'après les coordonnées du SVG, le tenon fait environ 2,5 mm de large et dépasse de 1,2 à 1,5 mm la ligne de coupe [I, conversion des chemins SVG en mm] ;
  - extrudé sur toute la hauteur de la pièce ;
  - README : « intentionally tight », « It may be necessary to use a mallet », et ces connecteurs « can sometimes lead to gaps between the segments » ; des grilles d'étalonnage sont fournies sur Printables.
- **Connecteur « Edge Puzzle »** (option, l. 74-91, 869-880) : tenon rectangulaire arrondi de 10 × 2,5 mm sur un col de 3 × 1,2 mm, au milieu de chaque bord de cellule, jeu `edge_puzzle_gap = 0,15` mm, hauteur femelle 2,25 mm et mâle 2,0 mm. Le README le dit fragile **sans aimants** (pas assez de hauteur) ; le mâle est entaillé à la forme du bac voisin.
- **Vis verticales** : cinq catégories d'intersections réglables séparément (coins de plaque, bords de plaque, coins de segment, bords de segment, autres) ; « Segment edges … can interfere with the intersection puzzle connector, so this combination is not recommended » [V README].
- **Numérotation** : numéro du segment gravé sous la pièce, 0,5 mm de profondeur, 3 mm de haut (`number_depth`, `number_size`, l. 120 et 1248).
- **Mode `hollow`** : baseplate squelettisée, 4 × 4 de 20,6 à 10,5 cm³ ; puzzles et bords de segment restent pleins.

### 2.2 gridfinity-rebuilt — MIT [V R1]

- **Aucune découpe** pour le plateau (aucune occurrence de split, bed ou connector dans les `.scad`).
- Style « screw together » (`style_plate = 3`, défaut) : baseplate rehaussée de **6,75 mm** (`calculate_offset`) et percée de trous **horizontaux** Ø 3,35 mm au milieu de chaque bord de cellule (`cutter_screw_together`, l. 317-331, `n_screws` 1 à 3) pour visser des baseplates entre elles. Incompatible avec notre cadre de 4,60 mm sans socle.

### 2.3 gridfinity_extended_openscad (ostat) — **GPL-3.0** [V X1]

- Découpe par plateau (`build_plate_enabled`, `build_plate_size = [200, 250]`, `split_dimension`, `split_plate`, `average_plate_sizes`), sur lignes de grille.
- Connecteurs (`Connector_Position` : `center_wall`, `intersection`, `both`) : clip séparé (taille 10, jeu 0,1), « butterfly » (papillon 5 × 4 × 1,5, jeu 0,1), pions en filament (Ø 2 × 8), « snaps » (jeu 0,2). Le code marque butterfly, filament et snaps « not yet finalised, or working properly ».
- GPL-3.0 : on ne copie pas de code dans un projet MIT ; les idées et les cotes restent consultables [I].

### 2.4 GRIPS (TooManyThings, MakerWorld) — licence propriétaire [V M1]

- Générateur paramétrique MakerWorld : découpe automatique et « languettes de type puzzle » ; pièces test d'ajustement à imprimer d'abord ; option « Type d'assemblage » plus lâche (6 févr. 2025) ; option vis M3 + écrou (15 févr. 2025) ; avec aimants, **pions en filament 1,75 mm** dans des trous horizontaux ; support des plateaux multiples de Bambu (17 févr. 2025) ; 3MF limité à 20 plateaux.
- Licence affichée : « Standard Digital File » (propriétaire). Des commentaires de la page et le README de GridFlock rapportent une **plainte DMCA** contre GridPlates, un dérivé, contestée par la communauté (dérivé d'une version publiée sous MIT) [V, ce sont des affirmations de tiers ; I sur le fond].

### 2.5 Modèles communautaires (Printables) [V P1]

| Modèle | Principe | Licence |
|---|---|---|
| 633086 « Gridfinity clip together baseplates » (Akio) | clips séparés **sous** la baseplate, trois versions | CC-BY-NC-SA |
| 711904 « Connecting Baseplate with press-fit magnets » (Elber) | fentes pour connecteurs imprimés | CC-BY-NC-SA |
| 719455 « Clickfinity Baseplate w/ Connectors » (James Boone) | connecteurs imprimés attachés à la baseplate | CC-BY-NC-SA |
| 758813 « 7x8 Split Interlocking Baseplate » (PokeyCat) | pièces emboîtables | CC-BY-NC-SA |
| 982173 « CLICKbase » (John Hall) | base à loquets + clips | CC-BY-NC-SA |
| 399677 « Baseplate extendable (snap fit) » (Chillchamp) | encliquetage direct ; l'auteur recommande désormais le remix de Neel | CC0 |
| 430144 « base with snap connectors » (Neel) | connecteurs séparés imprimés sur le flanc, « PETG to allow them to flex » | CC0 |
| 1254617 « Base Light (connectable) » (Kevin:K) | clips intégrés | CC-BY-SA |

Les modèles CC0 peuvent inspirer ou être repris ; les CC-BY-NC-SA, CC-BY-SA (share-alike) et GRIPS ne doivent pas être copiés dans un dépôt MIT [I, pas un avis juridique].

### 2.6 Tableau comparatif

| | Extrabold | GridFlock | gridfinity_extended | GRIPS |
|---|---|---|---|---|
| Lieu de coupe | lignes de grille [V] | lignes de grille [V] | lignes de grille [V] | lignes de grille [I] |
| Critère | min. de pièces, puis variance [V] | min. de segments, tailles égales en X [V] | tailles moyennes optionnelles [V] | ? |
| Jonctions en croix | évitables (`tJunctions`) [V] | toujours évitées quand c'est gratuit [V] | ? | ? |
| Orientation du plan | figée [V] | figée (X = `bed_size.x`) [V] | figée [I] | ? |
| Connecteur par défaut | aucun [V] | puzzle aux intersections [V] | aucun [V] | puzzle [V] |
| Pièces en plus | clips (option) [V] | aucune [V] | clips (option) [V] | pions filament ou vis M3 (options) [V] |
| Jeu | 0,1 / 0,25 mm (clip), 0 à 0,5 (aronde cachée) [V/I] | fit 0 à 1, 0,15 mm (bord) [V] | 0,1 à 0,2 mm [V] | option « plus lâche » [V] |
| Repérage | carte ASCII [V] | numéro gravé dessous [V] | ? | ? |
| Licence | CC0, clip CC BY-NC-SA [V] | MIT + CC-BY 4.0 [V] | GPL-3.0 [V] | propriétaire [V] |

---

## 3. Contraintes de notre géométrie

Cotes de référence (spec #1, ADR 0002) : profil hybride du bas vers le haut, vertical 0,35 → 45° 0,7 → vertical 1,8 → 45° jusqu'au plat ; retrait depuis l'axe du muret de 2,85 (z 0 à 0,35), 2,15 (z 1,05 à 2,85), 0,4 au sommet (z 4,60) ; plat de muret 0,8 mm, 0,4 au bord extérieur.

### 3.1 Où couper

- **Sur l'axe d'un muret, dans un plan vertical, sur toute la hauteur** [I, et pratique de tous les outils V]. Chaque pièce garde alors un demi-muret de 0,4 mm de plat : c'est exactement le bord d'une baseplate Gridfinity standard, qui est conçu pour être abouté [I, d'après la spec : plat de 0,4 au bord extérieur]. Un bac de plusieurs cellules posé à cheval retrouve ses 42 mm de pas si la coupe reste fermée.
- **Jamais au milieu d'une cellule** : le bord de la pièce couperait une poche, un bac posé à cheval n'aurait plus de pente d'un côté.
- **Coins intérieurs vifs** : ni rayon extérieur ni chanfrein du dessous sur une face de coupe (sinon trou à la jonction de quatre coins, rainure en V sous la coupe) ; extrabold coupe la baseplate finie par un rectangle non arrondi [V E1].
- **Marge en cellules tronquées (#19)** : les murets de la marge prolongent les lignes de la grille, donc une ligne de coupe qui traverse la marge tombe sur un muret de marge et donne un bord propre [I]. On peut même autoriser des coupes **dans** la marge, sur la grille prolongée, ce qui traite une grande marge (mode cellules, jusqu'à 500 mm) sans « bandes de marge » séparées [I].
- **Compatibilité avec les briques de cellule (ADR 0004)** : une coupe sur une ligne de grille tombe sur une couture entre briques. Une pièce pourrait s'assembler directement à partir des briques de ses cellules, en remplaçant les briques de bord côté coupe par des briques « bord de coupe » (demi-muret, coin vif, sans chanfrein), sans booléen global [I, à vérifier dans le moteur].

### 3.2 Rigidité d'un cadre sans fond

- La pièce est un cadre de murets : rigide dans son plan, souple en torsion hors plan [I]. Dans un tiroir, elle repose à plat sur le fond : le connecteur n'a pas à porter de charge, il doit **garder la coupe fermée** (pas d'écartement) et **empêcher le glissement** le long de la coupe [I].
- Une pièce d'une seule cellule de large est une échelle fragile à manipuler : l'éviter quand c'est gratuit (GridFlock pénalise ces segments ; extrabold les autorise dès qu'il faut couper) [V code ; I jugement].
- **Jonctions en croix** : quatre coins de pièces se rejoignent en un point, le croisement de murets est coupé en quatre quarts ; c'est le point le plus faible, et quatre blocs indépendants peuvent y jouer. Les jonctions en T (rangées décalées comme des briques) font que chaque pièce s'appuie sur deux voisines [I ; motivation explicite de GridFlock et d'extrabold V].

### 3.3 Alignement

- En Z, rien à faire : toutes les pièces reposent sur le fond du tiroir [I].
- Dans le plan, le tiroir retient déjà l'ensemble : le jeu au tiroir total (1 mm par défaut) borne l'ouverture cumulée des coupes d'un axe [I, spec].
- Avec le profil hybride, un bac est tenu par ses pentes, sans jeu : si une coupe s'ouvre de `g`, un bac de 2 cellules posé à cheval doit soit remonter sur une pente, soit refermer la coupe en descendant (pentes à 45°, effet de centrage) [I]. Une coupe ouverte n'empêche donc pas l'usage, mais un bac à cheval ne sera pas bien assis tant que la coupe ne se referme pas : un connecteur qui la garde fermée a une vraie utilité [I].

### 3.4 Tolérances d'impression

- Jeux relevés : clip extrabold 0,1 mm par côté (0,25 le long de la coupe) ; queue d'aronde extrabold 0 à 0,5 mm (0,2 par défaut) ; GridFlock bord 0,15 mm, intersection « tight » par défaut (maillet parfois nécessaire) ; gridfinity_extended 0,1 à 0,2 mm ; GRIPS propose un réglage plus lâche après des retours de pièces trop serrées [V E1, G1, X1, M1].
- **Pied d'éléphant** : la première couche écrasée déborde vers l'extérieur sur la face de coupe ; deux pièces aboutées se touchent alors en bas et bâillent en haut [I]. Parades : la compensation de pied d'éléphant du trancheur, ou un petit chanfrein de 0,2 à 0,4 mm en bas des faces de coupe (notre chanfrein du dessous est à 0 par défaut et ne doit pas s'appliquer aux coupes, § 3.1) [I, à trancher par impression].
- Tout connecteur intégré doit exposer un jeu réglable, rangé dans les réglages avancés, avec un **coupon d'étalonnage** à imprimer, comme GridFlock et GRIPS [V pratique ; I recommandation].

### 3.5 Où loger un connecteur dans notre profil [I, calcul sur les cotes]

Section du muret au milieu d'un bord de cellule (demi-largeur de chaque côté de la coupe) :

| z (mm) | demi-largeur de matière |
|---|---|
| 0 à 0,35 | 2,85 |
| 0,35 à 1,05 | 2,85 → 2,15 |
| 1,05 à 2,85 | 2,15 |
| 2,85 à 4,60 | 2,15 → 0,40 |

- **Au milieu d'un bord** : un tenon qui traverse la coupe ne peut entrer que de 2,15 mm moins une paroi (au moins 2 lignes de 0,4 = 0,8 mm) dans le muret voisin, soit **environ 1,3 mm**, et seulement jusqu'à z ≈ 2,85. Trop peu pour un tenon, mais possible pour une agrafe séparée ; la fente d'extrabold (1,5 mm par côté) ne laisse que 0,65 mm de paroi et débouche dans la pente de la poche au-dessus de z ≈ 3,5 [I].
- **À une intersection** : de l'autre côté de la coupe, le muret **perpendiculaire** est plein sur toute sa longueur (4,3 mm de large entre z = 1,05 et 2,85, 5,7 mm en bas). Un tenon peut s'y loger en longueur, clippé par les poches voisines à chaque hauteur (comme le cercle de rayon 4 de GridFlock). C'est le **seul lieu où un connecteur intégré a de la matière** ; c'est aussi le choix de GridFlock, de GRIPS et des queues d'aronde d'extrabold [V choix des autres ; I pour notre profil].
- **Conflit avec les vis** : une vis (ADR 0006) occupe le centre de l'intersection (tige Ø 3,5, fraisure Ø 6,5 avec le jeu par défaut). Sur une intersection de coupe, il faut choisir : vis ou tenon [I]. Extrabold retire les vis des coupes par défaut ; GridFlock déconseille vis et puzzle sur les bords de segment [V].
- **Vis sur une coupe** : chaque pièce reçoit une demi-fraisure (un quart à une jonction en croix). La vis plaque alors les deux pièces au fond du tiroir et aligne la coupe ; mais le cône d'une tête fraisée pousse les demi-fraisures l'une loin de l'autre (effet de coin) [I]. À essayer, pas à supposer.
- **Sous la baseplate, impossible** : les poches sont ouvertes en dessous, et un bac assis descend jusqu'à z = 0 (ADR 0006) ; aucun clip ne peut passer dessous ni dans une poche, contrairement aux clips « underside » d'Akio [I].
  - *Note (#22, ADR 0010)* : cela vaut pour un clip qui passerait sous les poches. Un clip qui reste dans l'emprise du pied du muret, sur ±1,35 mm autour de la coupe et sous z = 2,80 mm, laisse 0,8 mm de peau côté poche et ne touche aucun bac : c'est le clip retenu, inséré par-dessous (`prototypes/clips/`).

### 3.6 Exemple : tiroir par défaut, plateau par défaut [I, calcul]

Tiroir 400 × 280, jeu 1 → 399 × 279 mm, 9 × 6 cellules, marges de 10,5 mm (gauche et droite) et 13,5 mm (arrière et avant). Plateau utile 256 × 256.

- Colonnes : une pièce de bord porte 10,5 mm de marge ; 5 cellules + 10,5 = 220,5 ≤ 256, 6 + 10,5 = 262,5 > 256. Il faut 2 colonnes de pièces : 5 + 4 (220,5 et 178,5 mm).
- Rangées : 6 × 42 + 27 = 279 > 256. Il faut 2 rangées : 3 + 3 (139,5 et 139,5 mm).
- Soit **4 pièces**, sur 4 plateaux (deux pièces de 139,5 mm ne tiennent pas côte à côte sur 256 mm).
- Décalage gratuit : la colonne de 4 cellules peut prendre 2 + 4 rangées (4 × 42 + 13,5 = 181,5 ≤ 256), ce qui supprime la jonction en croix sans pièce de plus.
- Avec la marge de plateau de 10 mm d'extrabold (zone utile de 236 mm), le plan est le même ici.

---

## 4. Recommandations et questions ouvertes pour le mainteneur

### 4.1 Règle de découpe par défaut (économe et guidée)

1. **Déclencheur** : ne découper que si la baseplate ne tient sur le plateau dans aucune des deux orientations (la règle actuelle de `fitsOnBuildPlate`). Aucun réglage à activer : le nombre de pièces s'affiche dans les statistiques (déjà prévu : « nombre de pièces »).
2. **Lieu** : lignes de la grille prolongée (grille et marge en cellules tronquées), coupe verticale sur toute la hauteur, coins de coupe vifs, sans chanfrein du dessous.
3. **Critère** (programmation dynamique par axe, comme extrabold, sur la grille prolongée) :
   - d'abord le **moins de pièces** (moins d'impressions, moins de jonctions) ;
   - puis, à nombre égal, les **pièces les plus égales** (le plus grand côté de pièce minimal, variance ensuite) : plus rigide qu'une grande pièce et une bande étroite ;
   - pas de pièce d'une seule cellule de large si une autre solution au même nombre de pièces existe ;
   - essayer le plan **dans les deux orientations** du plateau et garder le meilleur (extrabold et GridFlock ne le font pas).
4. **Décalage en briques** (jonctions en T) seulement quand il ne coûte aucune pièce, comme GridFlock. Il est activé par défaut, car il est gratuit.
5. **Plateau** : l'utilisateur saisit une « taille utile », donc pas de marge de plateau cachée. On réserve seulement la saillie des tenons (≈ 2 mm par côté), sur le modèle des 3,5 mm de GridFlock.
6. **Vis** : sur une intersection de coupe, le tenon a la priorité, et la vis est retirée (comportement d'extrabold). Le nombre de vis affiché suit. Voir la question ouverte Q3.

### 4.2 Connecteur

- **Par défaut : un tenon intégré aux intersections des coupes** (famille « intersection puzzle »). Aucune pièce en plus à imprimer, presque pas de matière, et c'est le seul lieu où notre profil a la matière pour lui (§ 3.5). Tenon mâle d'un côté, logement femelle de l'autre, clippé par les poches voisines à chaque hauteur, jeu par défaut 0,15 mm par côté (valeur à fixer par le coupon), réglable en Avancé.
- **Option « aucun »** : coupe aboutée simple. C'est le repli si le coupon montre que le tenon imprime mal à 4,60 mm.
- **Écartés pour la v1 de la découpe** : clips séparés (pièces en plus, comptage, et la fente au milieu du bord est trop mince dans notre profil) ; tenons au milieu des bords (pas de matière) ; pions en filament ou vis horizontales (pas de hauteur sans socle) ; tout ce qui vient de CLICKbase, GRIPS ou gridfinity_extended (licences).
- **Forme du tenon** : dessin maison. Les cotes de GridFlock (MIT) peuvent servir de point de départ, avec attribution dans `ATTRIBUTIONS.md` si on reprend le contour de `puzzle.svg`.

### 4.3 Ce qu'on exporte

- **3MF (défaut) : un seul fichier à plusieurs objets**, un objet nommé par pièce (« Pièce 2 — colonnes 6-9, rangées 1-3 »), chacun avec son propre `<item>` dans `<build>` (le cœur de la spec 3MF le permet [I]). Pas de zip. Les pièces sont placées **en vue éclatée**, dans leur position d'assemblage avec un écart de quelques mm : on voit l'assemblage à l'ouverture, et « Arranger » les répartit ensuite (PrusaSlicer 2.9+ crée jusqu'à 9 plateaux et y répartit les objets [V S1] ; Bambu Studio et OrcaSlicer gèrent des plateaux dans `Metadata/model_settings.config`, une extension non standard [V S1]).
- **STL** : un fichier par pièce dans un zip (le STL n'a pas d'objets nommés fiables [I]), nom `baseplate-9x6-399x279mm-piece-2-sur-4.stl`.
- **Nom du 3MF** : celui d'aujourd'hui (`baseplate-9x6-399x279mm.3mf`), avec le lien de partage en métadonnée comme maintenant ; le nombre de pièces figure dans les noms des objets.
- **Repérage** : numéro de pièce **gravé sous** un muret (0,4 mm soit 2 couches, chiffres de 3 mm dans le muret de 5,7 mm de large à la base), comme GridFlock [V principe ; I cotes], plus une **carte d'assemblage dans l'interface** (vue de dessus, arrière en haut, numéros des pièces) à la place du fichier texte d'extrabold.
- **Pas de nesting maison** dans un premier temps : avec « le moins de pièces », chaque pièce remplit déjà presque un plateau ; l'arrangement du trancheur suffit pour les restes. Les statistiques donnent le **nombre de pièces** (exact), pas un nombre de plateaux (il dépend du trancheur : ce serait une estimation).

### 4.4 Questions ouvertes

- **Q1. Connecteur par défaut** : tenon intégré aux intersections (proposé) ou coupe simple sans connecteur (le plus économe, et le tiroir retient déjà l'ensemble) ? À trancher après le coupon (§ 5).
- **Q2. Jeu du tenon** : une valeur globale (réutiliser le « jeu des trous » de 0,5 mm ? il est calibré pour des vis, trop large pour un tenon) ou un nouveau réglage avancé « jeu des tenons » ?
- **Q3. Vis sur une coupe** : retirer (proposé, comme extrabold), ou garder la vis et décaler le tenon sur l'intersection voisine ? Une vis sur la coupe aligne et plaque les deux pièces, mais son cône les écarte.
- **Q4. Décalage en briques** : toujours quand il est gratuit (proposé), ou un choix proposé à l'utilisateur ?
- **Q5. Orientation** : autoriser un plan tourné de 90° par rapport au plateau (proposé) ; faut-il aussi autoriser un mélange (certaines pièces tournées) ?
- **Q6. Grande marge en mode cellules** (jusqu'à 500 mm) : faut-il couper dans la marge sur la grille prolongée (proposé), ou limiter la marge ?
- **Q7. Plateaux Bambu/Orca** : écrire `Metadata/model_settings.config` pour préaffecter une pièce par plateau ? C'est non standard, et à maintenir avec leurs versions.
- **Q8. Glossaire** : ajouter à `CONTEXT.md` « Coupe » (la ligne entre deux pièces), « Tenon » (le connecteur intégré, à la place de clip, puzzle et dovetail) et « Carte d'assemblage ».
- **Q9. Limites de taille** : la spec prévoit de relever les limites (1 000 mm, 24 cellules par axe) avec la découpe. Il faut revoir les cibles de performance (#5) pour N pièces, et le recyclage du worker pour un export de plusieurs pièces.

---

## 5. À prototyper et à imprimer

Prototype jetable sous `prototypes/split/` (manifold-3d, même banc que `geometry-perf`) :

1. **Plan de découpe** (pur TypeScript, sans géométrie) : programmation dynamique « moins de pièces puis équilibré », deux orientations, décalage gratuit, marge comprise. Table de cas : tiroir par défaut sur plateaux de 180, 220 × 220, 250 × 210 et 256 ; tiroir de 1 000 × 600 ; marges de 0 et de 41 mm ; grilles 1 × N. On compare le nombre de pièces à celui d'extrabold (même algorithme, orientation figée).
2. **Découpe géométrique** : pièces par intersection de la baseplate finale, puis par assemblage de briques avec des briques « bord de coupe ». On vérifie `NoError`, et que la somme des volumes des pièces égale le volume de la baseplate entière (aux tenons près).
3. **Tenon aux intersections** : trois jeux (0,10 / 0,15 / 0,20 mm) et deux hauteurs (jusqu'à z = 1,05 et jusqu'à z = 2,85).
4. **Export** : un 3MF multi-objets ouvert dans PrusaSlicer, Bambu Studio, OrcaSlicer et Cura (noms visibles, placement, « Arranger »).

Coupons à imprimer par le mainteneur (petits, rapides) :

| Coupon | Contenu | Ce qu'on juge |
|---|---|---|
| C1 Coupe simple | 2 pièces de 2 × 1 formant un 2 × 2, sans connecteur | Écart en haut de la coupe (pied d'éléphant), bac 2 × 1 posé à cheval bien assis ? |
| C2 Tenons | 3 paires de 1 × 1 avec tenon à 0,10 / 0,15 / 0,20 mm | Assemblage à la main sans maillet, aucun jeu, tenue quand on soulève |
| C3 Croix contre T | 4 pièces de 1 × 1 en croix, et 3 pièces en T (2 × 2) | Jeu à la jonction, rigidité à la main |
| C4 Vis sur coupe | C1 avec une vis à l'intersection de la coupe | Plaquage, alignement, écartement par le cône |
| C5 Chanfrein de coupe | C1 avec 0 / 0,2 / 0,4 mm de chanfrein en bas des faces de coupe | Coupe fermée sur toute la hauteur ? |

Critères, dans l'ordre (ceux de la marge, #16) : la baseplate ne bouge pas et un bac à cheval est bien assis ; zéro pièce en plus ; matière et temps ; rendu. Verdicts à noter dans un ticket de recette, comme #16.

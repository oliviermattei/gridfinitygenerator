# Recherche : types de baseplate (extrabold et autres générateurs)

> Date : 2026-09-30. Question du mainteneur pour la v1.1 : « le type de baseplate comme dans extrabold : plateau, “traits”, skeleton… ».
> Légende : **[V]** = vérifié dans une source primaire (code, bundle exécuté, mesure sur maillage, page officielle) · **[I]** = inféré (raisonnement, calcul, interprétation), à confirmer.
> Vocabulaire : `CONTEXT.md`. Contexte : `docs/research/gridfinity-baseplate.md` (appelé ici « recherche baseplate »), ADR 0002 (profil hybride 4,60 mm) et spec #1 (types Tray et Skeleton hors v1).

## Sources primaires

| Id | Source | Détail |
|---|---|---|
| E1 | Bundle worker extrabold `https://www.extrabold.tools/_app/immutable/workers/jscad-worker-0D2CKfQH.js` (v0.5.21, 420 784 octets, sha256 `2db4d3815b8356d0…`) | Schéma des réglages (`settings`), doc intégrée, changelog, géométrie. Identifiants cités : `_x`, `Mx`, `_computeGridUnitFeatures`, `_computeBaseplate`, `g_`, `zx`, `Ix`. Bundle minifié : les n° de ligne ne sont pas stables, on cite les identifiants. |
| E2 | **Exécution** de E1 dans Node 22 (le worker est autonome : JSCAD embarqué) | Harnais maison dans le scratchpad de session (non versionné) : il envoie un message `generate` au worker avec les défauts du schéma, puis mesure le maillage (volume par tétraèdres signés, rayons verticaux, coupes horizontales). **Validation** : le type Normal 84 × 84 donne 5 034,6 mm³, soit les 5 035 mm³ mesurés sur un vrai export (recherche baseplate, C.2). |
| R1 | `kennetek/gridfinity-rebuilt-openscad`, commit `910e22d8607fd7f5f51ad5e5cbc5287a76810bfd` (2025-08-31), MIT | `gridfinity-rebuilt-baseplate.scad`, `src/core/standard.scad` |
| G1 | `yawkat/GridFlock`, commit `962aad7929a4c123eb31d4eb4e5e7a0580223f5b` (2026-09-08), double licence MIT et CC BY 4.0 (`LICENSE`) | `gridflock.scad`, `README.md` |
| F1 | `Le0Michine/FusionGridfinityGenerator`, commit `8a113b9fe84244d90df4d5bdb73ae0ca384a3424` (2026-01-23), CC BY-NC-SA 4.0 (`LICENSE.md`) | `commands/commandCreateBaseplate/entry.py`, `lib/gridfinityUtils/const.py`, wiki « Baseplate generator options » |
| P1 | `https://gridfinity.perplexinglabs.com/pr/gridfinity-rebuilt/0/1` (page rendue dans Chrome le 2026-09-30) | Menu « Style » du modèle Baseplate |
| PR | API Printables (`api.printables.com/graphql`), fiches 413761, 478930, 1117131, 1579487 | Licence affichée et description |
| O1 | Notre moteur `packages/geometry` (`generateBaseplate`, qualité finale), lancé hors dépôt | Volumes de référence de la v1 |

---

## Résumé

1. **extrabold propose 4 types [V E1]** : réglage `baseplateType` (libellé **« Baseplate Type »**, clé de lien `baseplate`), options **Normal**, **Tray**, **Skeleton**, **CLICKbase**, défaut `normal`. Il n'y a ni « Plateau » ni « Traits » dans l'interface : le site n'existe qu'en anglais (`lang="en"`, aucune chaîne française dans les bundles) [V].
2. **« traits » désigne très probablement Tray** (homophone en dictée vocale) [I]. **« plateau »** est soit la traduction de « Tray » par la traduction automatique de Chrome, soit « Normal » (une plaque) [I]. Question ouverte n° 1. Attention : dans `CONTEXT.md`, **Plateau** est réservé au plateau d'impression.
3. **Normal d'extrabold = notre v1** : un cadre ajouré de 4,25 mm, sans fond [V E2]. La doc d'extrabold le décrit pourtant comme une plaque « solid » : c'est faux pour la géométrie produite. Notre profil ras donne le même volume au mm³ près (5 034 contre 5 035 mm³ en 2 × 2) [V O1, E2].
4. **Tray** = Normal posé sur un **fond plein de 2,8 mm** sous chaque cellule, **7,05 mm** de haut. Il consomme **5,1 fois** la matière de Normal [V E2]. Le profil de poche y est décalé de 1 mm vers le haut, ce qui tronque la pente supérieure. C'est probablement un bug (`h + LOFT_BOOLEAN_PAD_MM`) [V géométrie, I bug].
5. **Skeleton** = Normal dont chaque muret est **entaillé** entre deux croisements, jusqu'à une bande de **0,35 mm** de haut. Seuls des « poteaux » au profil complet restent aux croisements. Il consomme **0,44 fois** la matière de Normal. Le bac n'est plus guidé que par ses 4 coins [V E2].
6. **CLICKbase** = Normal avec des languettes à clips sur les 4 côtés de chaque cellule. Il consomme **0,82 fois** la matière de Normal et il est sous **CC BY-NC-SA 4.0**, donc incompatible avec notre MIT si on le reprend [V E1].
7. Ailleurs : gridfinity-rebuilt a **Thin / Weighted / Skeletonized / Screw Together / Screw Together (minimal)**. Ses types « squelette » sont des socles épais évidés (9 à 12 mm), pas des variantes allégées [V R1, P1]. **GridFlock** a un mode **`hollow`** : les murets sont creux, une coque fine suit le profil et un canal ouvert est tourné vers le plateau. Il affiche « environ la moitié » de la matière et du temps [V G1]. GridFlock a aussi un **`solid_base`** paramétrable, qui est un Tray réglable [V G1]. Fusion a **Light / Skeletonized / Full** [V F1].
8. **Pour la v1.1, deux types nous intéressent** : un type **allégé**, plutôt « muret creux » façon GridFlock que les entailles d'extrabold, car il garde toute l'assise du profil hybride ; et un type **à fond**, avec un fond fin arrondi à la couche plutôt que les 2,8 mm d'extrabold. On écarte CLICKbase (licence ; la base à clips maison est déjà prévue), Weighted, Screw Together et Full.

---

## 1. extrabold : les 4 types de « Baseplate Type »

### 1.1 Libellés exacts de l'interface [V E1]

Réglage `{ id: "baseplateType", urlKey: "baseplate", label: "Baseplate Type", type: "imageButtonGrid", defaultValue: "normal" }`. Description : « Choose the type of gridfinity baseplate to generate. Tray adds a solid floor under each cell. CLICKbase uses plastic clips instead of magnets. »

| id | Libellé | Icône (Tabler) | Infobulle (texte exact) |
|---|---|---|---|
| `normal` | **Normal** | `square-rounded-filled` | « Solid baseplate with grid pockets; supports magnets or screws. » |
| `tray` | **Tray** | `box-align-bottom-filled` | « Each cell has a solid floor so small parts do not fall through. Optional magnet holes. » |
| `skeleton` | **Skeleton** | `skull` | « Hollowed baseplate; uses less filament, same grid layout. » |
| `clickbase` | **CLICKbase** | `click` | « No-magnet latching baseplate; bins snap in with clips. » |

Règles de cohérence [V E1] :
- CLICKbase désactive les aimants (`"clickbase" !== c && i`).
- Passer en Skeleton remet les connecteurs `clips` à `none`.
- Tray place les aimants dans le fond (`trayMagnetHolePrototype`) au lieu des blocs de coin.

Historique (changelog E1) [V] :
- CLICKbase intégré en v0.5.6 (2025-11-17) ;
- Tray ajouté en v0.5.16a (2026-05-15) : « solid bottom at standard magnet-base height (2.8 mm) » ;
- fond ajusté en v0.5.17.

Skeleton n'a pas d'entrée datée : il existait avant ces versions [I].

### 1.2 Ce que « plateau » et « traits » peuvent désigner

- Aucun libellé français n'existe dans extrabold [V : `lang="en"` ; seules occurrences de « plateau » dans les bundles : la constante interne `PLATEAU_HEIGHT_OFFSET: 1.8`, la hauteur du segment vertical du profil].
- **« traits » ≈ « Tray »**, prononcé à la française, dicté ou mal retranscrit [I].
- **« plateau »**, deux lectures possibles :
  - (a) « Tray » traduit par Chrome, puisque *tray* se traduit couramment par « plateau » [I] ; mais alors « plateau » et « traits » feraient doublon ;
  - (b) « Normal », vu comme la plaque de base [I].
- La liste « plateau, traits, skeleton » colle mieux à Normal, Tray, Skeleton [I].

### 1.3 Forme exacte de chaque type (mesurée sur E2, 2 × 2 = 84 × 84 mm, défauts : sans aimants, Top Cutoff 0,4, marge Solid)

Toutes les cotes ci-dessous sont mesurées [V E2]. La colonne « retrait » est la distance horizontale entre la paroi de poche et l'axe du muret.

**Normal** : 84 × 84 × **4,25 mm**, 5 035 mm³.
- Poche ouverte en dessous : un rayon vertical au centre d'une cellule ne touche rien.
- Profil ras : 45° de 0 à 0,7, vertical jusqu'à 2,5, 45° jusqu'à 4,25, plat de muret de 0,8 mm (détail dans la recherche baseplate, C.2).
- Avec aimants : 7,05 mm de haut, murets prolongés et blocs de 10 × 10 mm aux coins, 12 774 mm³ (recherche baseplate, C.3).

**Tray** : 84 × 84 × **7,05 mm**, 25 917 mm³.
- **Fond plein de 0 à 2,80 mm** sous toute la cellule : rayons en (21 ; 21), (7 ; 7), (14 ; 21) → solide de 0 à 2,8.
- Profil de poche relevé au-dessus du fond :

  | z (mm) | retrait (mm) | segment |
  |---|---|---|
  | 2,80 → 3,80 | 2,85 | vertical de **1,0 mm** (absent de Normal) |
  | 3,80 → 4,50 | 2,85 → 2,15 | 45° |
  | 4,50 → 6,30 | 2,15 | vertical 1,8 |
  | 6,30 → 7,05 | 2,15 → **1,40** | 45°, **tronqué** |

- Le plat du muret fait donc **2,8 mm** (contre 0,8 en Normal) et l'ouverture de poche en haut fait **39,2 mm** (contre 41,18).
- Cause dans le code : dans `g_`, la brique de poche est posée à `d = traySolidFloorSlab + fx.LOFT_BOOLEAN_PAD_MM` = 2,8 + 1 = 3,8 mm au lieu de 2,8, alors que la dalle fait `max(hauteurs du profil) + traySolidFloorSlab` = 7,45 − 0,4 [V code]. C'est vraisemblablement un bug [I].
- Conséquence calculée pour un pied de bac standard (0,8 / 1,8 / 2,15, dessous 35,6, dessus 41,5) [I, calcul sur cotes V] :
  - le pied s'appuie en même temps sur les deux pentes à 45°, donc le bac est **assis** ;
  - le dessous du pied reste **0,65 mm au-dessus du fond** ;
  - le haut du pied dépasse de 1,15 mm le dessus de la baseplate, contre 0,5 mm en Normal.
- La marge Solid monte aussi à 7,05 mm pleins : rayon en (4 ; 50) sur une 100 × 100 → solide de 0 à 7,05.

**Skeleton** : 84 × 84 × **4,25 mm**, **2 195 mm³**.
- Code : `_computeGridUnitFeatures` ajoute à l'outil de poche deux prismes trapézoïdaux croisés (`skeletonCubes`) [V E1] :
  - base de 38 mm (= 42 − rayon 4) en haut, 19 mm en bas, 4,65 mm de haut, 252 mm de long ;
  - posés à z = 0,35 (5 − 4,65) ;
  - ils traversent donc les murets voisins et la marge.
- Mesure :
  - un muret n'est entier (0 → 4,25) que dans les ~4 mm autour d'un croisement ;
  - entre deux croisements (y de ~11,4 à ~30,6 à mi-cellule), il ne reste qu'une **bande de 0 à 0,35 mm** de haut et de **5,5 mm** de large (x de 39,25 à 44,75 à z = 0,1) ;
  - les flancs de l'entaille remontent en pente, de ~19 mm d'ouverture en bas à ~35 mm en haut.
- Le mur extérieur et la marge Solid sont entaillés de la même façon : rayon en (4 ; 29) sur une 100 × 100 → 0 à 0,35.
- Skeleton est un sous-ensemble strict de Normal : on ne fait qu'enlever de la matière [V code]. Un bac standard entre donc [I], mais il n'est tenu que par les 4 poteaux d'angle.
- 0,35 mm = moins de 2 couches de 0,2 mm, ce qui donne une bande très souple [I].
- Avec aimants, la bande basse garde la hauteur du socle d'aimants (0 → 3,15) [V E2].
- Avec vis : le croisement reste plein, donc la fraisure garde sa matière [V E2].

**CLICKbase** : 84 × 84 × **4,25 mm**, 4 119 mm³.
- Profil Normal ; le 5ᵉ anneau du profil est modifié (`_x`).
- Sur chaque côté de cellule, aux quarts (`Px() = 42/4`), des découpes et des ajouts qui forment des languettes (`zx` : `cutoutLength 11`, `cutoutDepth 1.075`, `aditionLength 3`, `aditionDepth 2.4` ; `Ix`) [V E1].
- Géométrie de détail non relevée ici (la base à clips a sa propre spec).

### 1.4 Matière relative (volumes exacts, E2 et O1)

| Grille (mm) | Normal | Tray | Skeleton | CLICKbase | Normal + aimants | **Notre v1 hybride** | Notre v1 ras |
|---|---|---|---|---|---|---|---|
| 2 × 2 (84 × 84) | 5,03 cm³ | 25,92 | **2,20** | 4,12 | 12,77 | 5,66 | 5,03 |
| 3 × 3 (126) | 11,40 | 58,44 | 5,01 | 9,34 | — | 12,80 | — |
| 4 × 4 (168) | 20,32 | 103,97 | 8,96 | 16,65 | 51,39 | 22,81 | — |
| 5 × 5 (210) | 31,78 | 162,50 | 14,03 | 26,06 | 80,36 | 35,68 | 31,77 |
| Tiroir par défaut 399 × 279 (9 × 6 + marges) | 136,99 | 464,38 | 59,85 | 124,63 | 286,94 | **81,34** | — |
| **Rapport à Normal (4 × 4)** | 1 | **× 5,1** | **× 0,44** | × 0,82 | × 2,5 | × 1,12 | × 1,00 |

Toutes les valeurs sont [V E2 / O1]. Sur le tiroir, la marge d'extrabold est pleine (Solid, 4,25 mm) alors que la nôtre est un cadre à traverses : d'où 81 contre 137 cm³.

Le temps d'impression n'a pas été mesuré. On le suppose à peu près proportionnel au volume et au nombre de parois [I]. La doc d'extrabold dit de Skeleton qu'il « prints faster » [V E1].

---

## 2. Les autres générateurs

### 2.1 gridfinity-rebuilt-openscad (MIT) [V R1]

`style_plate` (l. 54) : `0: thin, 1: weighted, 2: skeletonized, 3: screw together, 4: screw together minimal`. **Défaut 3.** Hauteur = `BASEPLATE_HEIGHT` 5 mm (4,65 + 0,35 de jeu) + `calculate_offset` (l. 220-234).

| Style | Épaisseur ajoutée sous le profil | Sous les poches | Code |
|---|---|---|---|
| Thin | 0 → **5,0 mm** au total | rien : poche traversante | `minimal = sp == 0 \|\| sp == 4` (l. 156) : outil sur toute la hauteur |
| Weighted | `bp_h_bot = 6.4` → 11,4 mm | dalle avec creux de lestage : carré de 21,4 × 4 mm de profondeur et 4 encoches arrondies de 8,5 × 4,25 × 2 mm | `cutter_weight()` l. 236-249 ; `standard.scad` l. 256-266 |
| Skeletonized | `h_skel` 1 + (aimants 2,4) + (vis : 3,35 si aucune, 2,5 si fraisée, 3 si lamée) → **9,35 à 11,75 mm** | dalle percée d'un grand carré aux coins arrondis (`r_skel = 2`), avec des îlots autour de chaque trou d'aimant (`MAGNET_HOLE_RADIUS + r_skel + 2`) | `profile_skeleton()` l. 304-315 ; `standard.scad` l. 271-273 |
| Screw Together | **6,75** → 11,75 mm | comme Skeletonized, plus des trous de vis **horizontaux** Ø 3,35 dans les bords pour assembler les plaques | `cutter_screw_together()` l. 317-331 |
| Screw Together (minimal) | 6,75 | poche traversante, plus les vis horizontales | l. 156, 166-168 |

Sur perplexinglabs (P1), le menu « Style » propose exactement : Screw Together, Weighted, Skeletonized, Thin, Screw Together (minimal). Défaut Screw Together, soit 126 × 126 × 11,9 mm à l'écran [V].

À retenir : chez rebuilt, « skeletonized » évide une **baseplate épaisse** (faite pour les aimants et les vis). Ce n'est pas une variante plus légère que Thin [V code]. Le type le plus économe de rebuilt est Thin, qui équivaut à notre v1.

### 2.2 GridFlock (MIT + CC BY 4.0) [V G1]

- **`hollow`** (`gridflock.scad` l. 109-113, 268, 293, 404-413, 1074-1090, 1289 ; README l. 468-494) :
  - principe (README l. 470) : on n'imprime qu'une paroi fine qui suit le profil ; les cellules voisines partagent un canal creux, ouvert vers le plateau d'impression et fermé en haut par un toit à 45° autoportant ;
  - chiffres affichés : « roughly halves filament use and print time », une 4 × 4 passant de 20,6 à 10,5 cm³. Cohérent avec nos 20,32 cm³ pour Normal 4 × 4 [V E2] ;
  - l'épaisseur `hollow_wall` (0,8 mm par défaut) est **horizontale**, pour valoir un nombre entier de parois au trancheur ;
  - la lèvre basse (le 45° de 0,7 mm) est remplacée par un vertical (`remove_bottom_lip`, forcé en mode creux) : README l. 494, « It is not functionally required » ;
  - le dessus, le mur extérieur et les connecteurs restent pleins ;
  - incompatible avec les aimants, `solid_base` et les clips (assertion l. 268).
- **`solid_base`** (l. 240, 430 : `cutter(size, below=_extra_height - solid_base)`) : un fond plein d'épaisseur libre sous toutes les poches. C'est **un Tray paramétrable**, 0 par défaut [V].
- **`cell_override`** : cellule par cellule, `c` normale, `s` pleine, `e` vide [V README].
- Profil : 4,65 mm sans le jeu de 0,35 de rebuilt (« we cut that out », l. 288-289), donc un profil ras comme extrabold [V].

### 2.3 FusionGridfinityGenerator (CC BY-NC-SA 4.0) [V F1]

`entry.py` l. 65-69 et 217-221 : liste « Baseplate type » avec **Light** (défaut, l. 496), **Skeletonized** et **Full**.
- Light : pas de socle (`hasExtendedBottom = not Light`, l. 442) ; ni aimants ni vis.
- Skeletonized et Full : socle de `BASEPLATE_EXTRA_HEIGHT = 0.64` cm, soit 6,4 mm (`const.py`), qui accepte aimants et vis.
- Skeletonized évide ce socle en gardant les coins (`baseplateGenerator.py` l. 35 et suivantes) et accepte des trous de liaison latéraux.
- Full est décrit par le wiki comme « The heaviest option ».

Comme chez rebuilt, « skeletonized » évide un socle épais. Licence NC : aucune reprise de code.

### 2.4 Modèles statiques (Printables) [V PR]

| Fiche | Idée | Licence |
|---|---|---|
| 1117131 « Gridfinity UltraLight Base » (Danimal91) | Squelette minimal, raisonnement « posée sur une surface plane, elle n'a pas à résister à la flexion ». « 16 grams for a 5x5 grid », soit ≈ 13 cm³ en PLA à 1,24 g/cm³ [I], du même ordre que Skeleton 5 × 5 (14,0 cm³) | CC BY |
| 478930 « Gridfinity Baseplate (Quick print, lite version) » (GlennovitS) | Plaques minces ouvertes, 1 ou 2 parois, 0 % de remplissage : équivalent de Thin et de notre v1 | CC BY |
| 413761 « Gridfinity Refined » (grizzie17) | Baseplate épaisse (aimants insérés par le côté, vis moletée) ; variante « lite » sans le trou de vis moletée | CC BY-SA |

---

## 3. Tableau comparatif

Matière rapportée à Normal d'extrabold (= notre v1 ras) sur une 4 × 4. Les compatibilités sont inférées de la géométrie [I] ; les chiffres sont [V] sauf mention contraire.

| Type (outil) | Forme sous les poches | Hauteur | Matière | Temps (rel.) | Bacs standard | Licence | Intérêt pour nous |
|---|---|---|---|---|---|---|---|
| **Normal** (extrabold) / Thin (rebuilt) / Light (Fusion) / **v1** | rien, poche traversante | 4,25 / 5,0 / 4,60 (nous) | × 1 | × 1 | oui ; assis seulement avec le profil hybride | CC0 / MIT / NC | **déjà fait** (v1) |
| **Tray** (extrabold) | fond plein de 2,8 mm ; profil décalé de 1 mm (pente haute tronquée) | 7,05 | **× 5,1** | ≫ [I] | oui, assis sur les pentes, 0,65 mm au-dessus du fond [I] | CC0 (code non réutilisable tel quel, minifié) | **idée oui, cotes non** |
| `solid_base` (GridFlock) | fond d'épaisseur libre | 4,65 + fond | selon le fond | — | oui (profil ras) | MIT / CC BY | **modèle à suivre** pour un fond fin |
| **Skeleton** (extrabold) | murets entaillés jusqu'à 0,35 mm entre les croisements ; poteaux aux croisements | 4,25 | **× 0,44** | < [V doc, non mesuré] | entre, mais tenu seulement par les coins [I] | CC0 | moyen : économe mais fragile, et perd notre assise |
| **`hollow`** (GridFlock) | murets creux : coque de 0,8 mm, canal ouvert en dessous, toit à 45° | 4,65 | **≈ × 0,51** [V README] | ≈ × 0,5 [V README] | oui, profil complet conservé [I] | MIT / CC BY | **fort** : économe et garde toute la poche |
| UltraLight Base (Printables) | squelette minimal | — | ≈ × 0,4 [I] | — | oui (d'après la fiche) | CC BY | référence d'économie |
| **CLICKbase** (extrabold) | Normal + languettes à clips | 4,25 | × 0,82 | ≈ | oui, tenu par clips | **CC BY-NC-SA 4.0** | non tel quel (la base à clips maison est déjà prévue) |
| Weighted (rebuilt) | dalle lestée | 11,4 | ≫ | ≫ | oui | MIT | non (anti-économe) |
| Skeletonized (rebuilt / Fusion) | socle épais évidé (aimants, vis) | 9,35–11,75 / ~11 | > × 1 | > | oui | MIT / NC | non en v1.1 (pas d'aimants) |
| Screw Together (rebuilt) | socle + vis horizontales | 11,75 | ≫ | ≫ | oui | MIT | non : relève de la future découpe pour le plateau |
| Full (Fusion) | socle plein de 6,4 mm | ~11 | ≫ | ≫ | oui | NC | non |

---

## 4. Recommandations pour la v1.1

1. **Ajouter un réglage « type de baseplate »** avec trois valeurs, la première gardant le comportement actuel :
   - **ajourée** (`open`, défaut ; c'est la v1, équivalente à Normal d'extrabold) ;
   - **allégée** (`hollow`) ;
   - **à fond** (`floor`).

   Clé de lien à créer (par ex. `ty`). Un lien `v=1` sans la clé redonne la baseplate ajourée, ce qui ne casse aucun lien existant [I, conforme au codec].
2. **Allégée : suivre l'approche « muret creux » de GridFlock plutôt que les entailles d'extrabold.**
   - Elle garde tout le profil, donc l'**assise** du profil hybride (ADR 0002), notre différence principale.
   - Elle garde un dessus de muret continu et vise environ −50 % de matière [V G1].
   - Les entailles d'extrabold font −56 % [V E2], mais le bac n'est tenu que par ses coins et la bande de 0,35 mm est très mince.
   - Réécriture propre (clean-room) avec manifold : `murets − décalage intérieur du profil`, coque horizontale = multiple de la largeur de ligne (réglage `lw` existant, par ex. 2 × `lw`), toit à 45°.
   - À traiter : les croisements qui portent une vis restent pleins (ADR 0006), et la marge/cadre (#3) doit être creusée ou non.
   - **À prototyper avant de décider** : volume mesuré, impression, tenue quand on retire un bac.
3. **À fond : un fond fin, arrondi à la couche, pas 2,8 mm.**
   - Le fond d'extrabold quintuple la matière [V E2].
   - Un fond de 3 à 4 couches (0,6–0,8 mm) sous le profil hybride ajouterait ≈ 36,3² × 0,8 ≈ 1,05 cm³ par cellule, soit ≈ +17 cm³ sur une 4 × 4 (≈ 40 cm³ au lieu des 104 d'extrabold) [I, calcul à confirmer au moteur].
   - Avec le muret de 0,35 mm, le pied ne touche pas le fond : l'assise reste sur les pentes [I].
   - Cas d'usage : le mode « nombre de cellules » hors tiroir (étagère, plan de travail, US 5), les petites pièces, une plaque qu'on déplace.
   - Jamais par défaut (plus cher). L'écart de matière se lit dans le volume exact des statistiques.
   - Ne pas reproduire le décalage de 1 mm d'extrabold.
4. **Ne pas faire** :
   - CLICKbase (NC ; la « base à clips » maison de la spec couvre le besoin) ;
   - Weighted, Full, Skeletonized ou Screw Together de rebuilt/Fusion (socles épais, pensés pour les aimants, hors v1) ;
   - Screw Together : à revoir avec la découpe pour le plateau.
5. **Nommage** : ne pas employer « plateau » pour un type (réservé au plateau d'impression dans `CONTEXT.md`). Proposer au glossaire « Type de baseplate », avec « ajourée », « allégée », « à fond » ; identifiants de code en anglais.
6. **Licences** : idées et cotes libres. GridFlock (MIT + CC BY) autorise la reprise, avec attribution si on copie du code. On écrit notre propre géométrie et on crédite l'idée dans `ATTRIBUTIONS.md` [I, pas un avis juridique].

## 5. Questions ouvertes pour le mainteneur

1. « plateau » et « traits » : s'agit-il bien de **Normal** et **Tray** (ou de Tray deux fois) ? Un autre outil était-il visé ?
2. Si l'allégée tient aussi bien à l'impression, doit-elle devenir le **défaut**, selon le principe « le moins cher par défaut » ?
3. Pour l'allégée : peut-on remplacer la pente basse de 0,7 mm par un vertical (comme GridFlock) sans perdre l'assise hybride ? D'après le calcul, le pied touche aussi cette pente [I]. À vérifier avec un kit de test.
4. Pour la version à fond : épaisseur par défaut (en couches) ? Le fond couvre-t-il aussi la marge ? Les vis restent-elles disponibles ?
5. Priorité v1.1 entre la base à clips (déjà prévue) et ces types : faut-il une matrice de compatibilité type × clips (GridFlock interdit `hollow` + clips) ?
6. Faut-il un kit de test par type (1 × 2 ajourée / allégée) pour comparer la tenue avant une grande impression ?

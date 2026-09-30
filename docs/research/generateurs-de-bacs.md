# Recherche : générateurs de bacs Gridfinity existants

> Date : 2026-09-30. Objectif : inventorier les réglages des générateurs de **bacs** existants avant de concevoir le nôtre.
> Légende : **[V]** = vérifié dans une source primaire (code, page rendue, requête réseau, export mesuré) · **[I]** = inféré, à confirmer.
> Faits déjà établis ailleurs (profil de poche, pied 0,8/1,8/2,15, licence Gridfinity) : voir `gridfinity-baseplate.md`, non répétés ici sauf besoin.

## Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| G1 | `https://gridfinitygenerator.com/en/box` rendu dans Chrome (DevTools MCP), snapshot a11y, menus, dialogue Export, `localStorage` | 2026-09-30, version d'app `260731` (clé `version` du localStorage) |
| G2 | Worker `https://gridfinitygenerator.com/_next/static/chunks/worker-7f3eb4c1da985ce3.worker.js` (1,4 Mo, minifié) | fonctions `hz` (bac), `hH` (corps), `hV` (pied), `hj`/`hW` (lèvre), `hK` (scoop), `hZ` (ledge), `h$` (mur), `hJ` (placement) ; constantes `hx=12, hw=.62, hS=4.75, hA=7, hC=.2, hP=1.2, hI=3.75, hU=4.4, hO=.8, hD=1.8, hk=2.15, hN=1.2, hF=2.95` |
| G3 | `https://gridfinitygenerator.com/llms.txt`, `/en/changelog`, `/en/docs`, `/en/pricing`, `/en/privacy`, `sitemap.xml` ; `whois gridfinitygenerator.com` | textes lus le 2026-09-30 |
| P1 | `https://gridfinity.perplexinglabs.com/pr/gridfinity-rebuilt/0/0` rendu dans Chrome | UI Rust/Yew en WASM (`gridfinity-web-ui-*.wasm`, 2,8 Mo) |
| P2 | Définition d'UI `GET https://gridfinity.perplexinglabs.com/ui/gridfinity-rebuilt/0` (JSON, 19 Ko) | schéma complet : `parameter`, `display`, `kind`, `default_value`, `min/max/step`, `render_condition`, `build_file` |
| P3 | Requête de génération `POST /gen/gridfinity-rebuilt/0/0/stl` (corps JSON) → `{stl_url, filename}` ; `GET /download/gridfinity-rebuilt/<sha1>.stl` ; `robots.txt` | génération **côté serveur** |
| B1 | `https://gridfinity.bouwens.co/` (HTML servi par Flask, formulaires POST) | « Gridfinity Creator v0.4.5 » |
| B2 | Dépôt `jeroen94704/gridfinitycreator`, commit `d15e26b9` (2025-12-02) : `grid_constants.py`, `generators/*/…`, `LICENSE`, `README.md` | |
| K1 | `kennetek/gridfinity-rebuilt-openscad`, commit `910e22d8607fd7f5f51ad5e5cbc5287a76810bfd` (2025-08-31), MIT | `gridfinity-rebuilt-bins.scad`, `src/core/{standard,bin,cutouts,tab,wall,base,gridfinity-rebuilt-holes,gridfinity-rebuilt-utility}.scad`, `gridfinity-rebuilt-lite.scad`, `gridfinity-spiral-vase.scad` |
| S8 | Gridfinity Design Reference v5 (@willtree8), `https://gridfinity.xyz/specification/` | déjà cité dans `gridfinity-baseplate.md` |

Mesures : STL téléchargés et bornés en Python pur (P3 : 1×1×6 défaut ; B1 : 2×2×6, 3×3 compartiments).

---

## Résumé

1. **gridfinitygenerator.com porte exactement le nom de notre projet** (« Gridfinity Generator », `application-name` et `<title>`) : SaaS **commercial fermé** de **Flinck Technologies AB** (Suède, n° 559239-6419), construit par **Marcus Svensson**, domaine créé le **2024-07-14**, freemium (sauvegardes cloud payantes : Free 5 modèles, Standard 6 €/mois 50, Premium 20 €/mois 250 ; exports illimités et sans compte). Aucun dépôt public ni licence trouvés [V absence sur GitHub, I fermé]. Perplexing Labs affiche aussi « Gridfinity Generator » comme titre. Voir section « Nom ».
2. Trois architectures : **gridfinitygenerator.com** = 100 % navigateur, noyau **replicad (OpenCascade WASM, 10,7 Mo)**, STL/STEP/GLB [V] ; **Perplexing Labs** = UI WASM + **OpenSCAD côté serveur** (fichiers kennetek, version antérieure au `main` actuel), STL seul, ~1,1 s par rendu [V] ; **Bouwens** = formulaire HTML + **CadQuery côté serveur**, STL/STEP, pas d'aperçu, ~1,2 s [V].
3. gridfinity-rebuilt (K1) reste la référence la plus complète : hauteur en 4 modes, compartiments X/Y, cylindres, scoop 0–1, 6 styles d'onglet, trous aimant (cylindre, crush ribs, chanfrein, imprimable sans support), refined, vis M3, thumbscrew, demi-grille, coins seulement, bac « lite », vase, et API libre de découpes arbitraires [V].
4. **Fonction unique de gridfinitygenerator.com** : éditeur « éléments » — murs, **ledges** (rebords triangulaires 15 × 15) et **scoops** placés librement au **1/12 d'unité**, dupliquables, déplaçables à la souris ; taille « Custom Size » en mm qui **coupe** le bac ; module **Cutout** (shadowbox par soustraction d'un STL importé) ; collections [V].
5. **Fonctions uniques de Bouwens** : **Holey bin** (grille de trous rond/carré/hexagone avec « keepout », taille du bac calculée automatiquement) ; **trous d'extraction d'aimant** ; préréglage de grille **Raaco** (39,5 × 54,5) [V].
6. **Écarts à la spec relevés** : gridfinitygenerator.com fait des bacs de **n × 42 − 0,62 mm** (41,38 pour 1 unité, au lieu de 41,5) et une lèvre au profil du pied (0,8/1,8/2,15 = 4,75) au lieu de 0,7/1,8/1,9 = 4,4 [V code, effet I] ; Bouwens remplace la lèvre par un simple **chanfrein** du mur de 1,9 mm prolongé de 4,4 mm [V code] ; rebuilt arrondit la pointe de la lèvre (hauteur réelle 3,55 au lieu de 4,4) [V].
7. **Aucun des trois ne fait de 3MF** [V] ; aucun ne fait d'étiquette gravée/embossée en texte sur le bac [V pour les UI] (rebuilt le permet par code, pas par l'UI [V exemple l. 185]).

---

## 1. gridfinitygenerator.com (« Gridfinity Generator », /en/box)

### 1.1 Identité, licence, modèle économique

| Élément | Constat | Statut |
|---|---|---|
| Nom affiché | `<title>Box \| Gridfinity Generator</title>`, `<meta name="application-name" content="Gridfinity Generator">` | [V] G1 |
| Auteur | `<meta name="author" content="Marcus Svensson">`, `<link rel="author" href="https://marcussvensson.com">` ; pied de page « Built by Marcus Svensson, Flinck Technologies AB » | [V] G1, G3 |
| Exploitant | Flinck Technologies AB (559239-6419), société suédoise, responsable de traitement ; parle de « Flinck Technologies cloud-based computer-aided software (the "Service") » | [V] G3 privacy (version janvier 2025) |
| Domaine | créé le 2024-07-14 (registrar Instra), titulaire masqué | [V] whois |
| Historique | changelog du 17 juillet 2024 (« Box generator, Basic Grid generator, STL file export ») au 31 juillet 2026 (collections) | [V] G3 |
| Licence du code | aucune mention ; aucun dépôt public trouvé (utilisateur GitHub `MarcusSvensson` sans dépôt listé ; recherche « gridfinitygenerator.com » sans résultat) ; « Based on the Gridfinity project » en pied de page | [V] absence ; **propriétaire [I]** |
| Tarifs | Free 0 € (5 modèles sauvegardés), Standard 6 €/mois (50), Premium 20 €/mois (250 + « priority feature requests ») ; « Unlimited exports » partout ; édition et export sans compte | [V] G3 pricing, llms.txt |
| Comptes | Google, GitHub, Discord, e-mail (depuis 2025-01-22) ; API tRPC (`/api/trpc/user.session`) | [V] G3, réseau |
| Analytics | PostHog (`d3vx06zt4n7k53.cloudfront.net`, clé `phc_…`) | [V] réseau |
| Langues | en, sv, ru, de, ja, uk, es, pt | [V] sitemap, llms.txt |
| Autres outils du site | Baseplate (connectable, clips), **Cutout** (import STL soustrait d'un bac plein), **Connection clip**, **Collections** (disposer plusieurs modèles sur une grille commune), éditeur général | [V] llms.txt |

### 1.2 Paramètres du bac

UI : panneau latéral en 3 groupes repliables **Size**, **General**, **Elements**. Valeurs lues sur les `role=slider` (aria-valuemin/max/now) [V G1] ; noms internes dans `localStorage.model-draft-storage` et G2 [V].

| Groupe | Clé interne | Libellé UI | Type | Plage | Défaut | Unité | Effet (code G2) |
|---|---|---|---|---|---|---|---|
| Size | `unitSize` | Grid unit size | slider + champ | 12–70 | 42 | mm | Pas de grille X et Y (non standard si ≠ 42) |
| Size | `numX` | X units | slider | 1–20 | 2 | unité | Largeur en cellules |
| Size | `numY` | Y units | slider | 1–20 | 2 | unité | Profondeur en cellules |
| Size | `numZ` | Z units | slider | 2–20 | 3 | 7 mm | Hauteur ; total affiché = 7·Z + 4,4 (Z = 3 → 25,4 mm) |
| Size | `useMaxSize` | Custom Size | switch | — | off | — | Coupe le bac (intersection avec un rectangle arrondi r 3,75) à une taille en mm (`h_`, `hQ`) |
| Size | `maxSizeX` / `maxSizeY` | Custom X / Custom Y | slider | (n−1)·unit+1 → n·unit (43–84 pour 2 unités) | 70 / 60 à l'essai | mm | Taille coupée ; le pied est coupé aussi (cellule partielle) |
| Size | — | Measurements / show inches | affichage | — | mm | mm/in | Cotes hors tout X, Y, Z |
| General | — | Show Build Plate | switch | — | off | — | Affiche le plateau d'impression dans l'aperçu |
| General | `magnetStyle` | Base magnets | onglets | None / Corner / Full | None | — | Full : 4 trous par cellule ; Corner : seulement aux 4 coins du bac (depuis 2025-12-08) |
| General | `magnetRadius` (×2) | Magnet Diameter | slider | 2–8,2 | 6,2 | mm | Ø du trou (stocké en rayon 3,1) |
| General | `magnetHeight` | Magnet height | slider | 1–4 | 2,1 | mm | Profondeur du trou |
| General | `screwStyle` | Screw holes | onglets | None / Corner / Full | None | — | Trou Ø 3 (rayon `screwRadius` 1,5 figé) sur toute la hauteur du pied |
| General | `lipStyle` | Lip style | onglets | Default / Thin / None | Default | — | Voir 1.3 |
| General | `bulge` | Scoop shape | slider (visible dès qu'un scoop existe) | 0,1–0,4 | 0,4 (0,42 dans le code par défaut) | — | Bombé de l'arc du scoop (`bulgeArc`) |
| General | `outerWallThickness` | Outer wall thickness | slider | 0,4–3 | 1,2 | mm | Paroi extérieure |
| General | `innerWallThickness` | Inner wall thickness | slider | 0,4–3 | 0,8 | mm | Épaisseur des murs intérieurs (séparateurs) |
| Elements | `walls[]` | Add → Wall | élément | — | aucun | — | Séparateur plein hauteur (jusqu'au bas de la lèvre) |
| Elements | `ledges[]` | Add → Ledge | élément | — | aucun | — | Rebord triangulaire 15 × 15 mm (8 de haut si Z < 3) sous le haut, pour étiquette/prise/empilage |
| Elements | `scoops[]` | Add → Scoop | élément | — | aucun | — | Rampe courbe au fond (rayon 15, hauteur 13,9 ; réduite si Z < 3) |

Réglages de chaque élément (panneau « Wall 1 », « Ledge 1 », « Scoop 1 ») [V G1] :

| Réglage | Wall | Ledge | Scoop | Plage (bac 2 × 2) |
|---|---|---|---|---|
| Rotate 90° (axe X/Y) | oui | oui | oui | — |
| Flip (côté) | non | oui | oui | — |
| X position / Y position | oui | oui | oui | 0–24, soit **1/12 d'unité** (`hx = 12`, 3,5 mm) |
| Length | oui | oui | oui | 1–24 (1/12 d'unité) |
| Duplicate / Delete | oui | oui | oui | — |
| Déplacement à la souris dans l'aperçu (poignées), « Snap to Grid » (menu Tools) | oui | oui | oui | — |

Les éléments touchant un bord ou un coin sont raccordés à la paroi (`isOnEdge`, `startOnCorner`/`endOnCorner` → congé r 3,85) [V G2].

### 1.3 Géométrie relevée dans le code (G2)

| Grandeur | Valeur code | Commentaire |
|---|---|---|
| Taille extérieure du bac | `n·unitSize − hw`, `hw = 0,62` | **83,38 mm** pour 2 unités ; spec = n·42 − 0,5 [V code ; non mesuré sur export] |
| Rayon des coins | `hI = 3,75` | = spec (Ø 7,5) [V] |
| Profil du pied | `hG` : 45° 2,15 → vertical 1,8 → 45° 0,8 ; hauteur `hS = 4,75` | = spec [V] |
| Aimants | centre à ±(unitSize − 16)/2 = **±13 mm** du centre de cellule | = spec (≠ extrabold 14 mm) [V] |
| Plancher | `max(1,2 + 0,01 ; floorTop − 4,75)` au-dessus du pied | [V] |
| Hauteur totale | `7·Z + 4,4` (corps `7·Z − 4,75 + 4,4` posé sur le pied de 4,75) | [V code + affichage 25,4 mm pour Z = 3] |
| Lèvre « Default » (`hj`) | depuis le sommet : 45° 2,15 → vertical 1,8 → 45° 0,8 → vertical 1,2 → retour 45° 2,95 (support) | **Profil du pied (4,75 mm) et non celui de la spec (0,7/1,8/1,9 = 4,4)** [V code ; I conséquence : lèvre plus profonde de 0,35 mm, bac du dessus plus bas d'autant ? non mesuré] |
| Lèvre « Thin » | décalage `hC = 0,2` : 45° 1,95 → vertical 1,8 → retour 45° 1,95 (pas de gradin interne) | [V] ; ajouté le 2024-10-21 |
| Lèvre « None » | mur prolongé de 0,45 mm au lieu de la lèvre | [V] ; « export a model without a stacking lip » 2025-12-08 |
| Coin intérieur | `max(3,75/4 ; 3,75 − paroi/2)` | [V] |
| Scoop | profil `bulgeArc(−15, 13,9, −bulge)` ; si Z < 3 : hauteur 9,9 | [V] |
| Ledge | triangle 15 (horizontal) × 15 (vertical), 8 si Z < 3, sommet au niveau du bas de la lèvre | [V] |
| Mur intérieur | rectangle d'épaisseur `innerWallThickness`, hauteur `7·Z − 4,4 − 1,25 − 0,1 − 0,2` depuis z = 5,95 | [V] |

### 1.4 Export, aperçu, état, performances

| Aspect | Constat | Statut |
|---|---|---|
| Formats | Dialogue « Export » : **STL / STEP / GLB**, nom de fichier éditable ; « 3MF is not supported » | [V] G1, llms.txt |
| Noyau CAO | **replicad** (`replicad_single.*.wasm`, 10 737 812 octets = OpenCascade.js) dans un Web Worker ; cache mémoïsé par hash des paramètres (`hT.compute([...], fn)`), étapes chronométrées (`checkpoint`) | [V] réseau, G2 |
| Aperçu | three.js via react-three-fiber/drei (HDRI `potsdamer_platz_1k.hdr`), gizmo d'axes cliquable, « Fit to screen », **Beauty Mode** (occlusion ambiante), Show Grid, Show Labels, thème, poignées de déplacement, survol surligné depuis la liste | [V] G1 menus View, G3 changelog |
| Partage / URL | l'URL reste `/en/box` : **aucun état dans l'URL** ; brouillon dans `localStorage.model-draft-storage` ; sauvegarde cloud avec compte ; « Move to collection » | [V] G1 |
| Menus | File (New, Save, Save as, Rename, Move to collection, Export), Edit (Add Element), Tools (Snap to Grid), View (Minimize UI, Show Grid, Show Labels, Beauty Mode, Theme, Language), Help (How to, Changelog, Leave feedback) | [V] G1 |
| Performance | « Generating model… » après chaque changement ; ~3–4 s pour un 2 × 2 × 3 avec aimants + vis + 3 éléments (observation visuelle, non chronométrée) | [I] |
| Divers | vote/suggestion de fonctionnalités, bouton « Leave feedback », unités mm/pouces | [V] |

---

## 2. Perplexing Labs (gridfinity.perplexinglabs.com, projet « Gridfinity Rebuilt »)

### 2.1 Identité et architecture

| Élément | Constat | Statut |
|---|---|---|
| Titre | « Gridfinity Generator » (en-tête et `<title>`) ; page projet « Gridfinity Rebuilt - Model Generator \| Perplexing Labs » | [V] P1 |
| Exploitant | « perplexing labs », contact `support@perplexinglabs.com`, Ko-fi, X @perplexinglabs ; liens Amazon affiliés, publicité, Google Ads (gtag `AW-…`) | [V] P1 |
| Licence du site | aucune mention ; pas de dépôt public trouvé (`github.com/perplexinglabs` 404) | [V] absence ; propriétaire [I] |
| Modèle | génère les fichiers **MIT** de kennetek (`build_file: gridfinity-rebuilt-openscad/gridfinity-rebuilt-bins.scad`) ; liens « Documentation » et « OpenSCAD Source » vers kennetek | [V] P2 |
| Version du .scad | expose `cdivx`, `cdivy`, `ch`, `c_depth`, `c_orientation`, `d_tabw`, `d_tabh`, `l_grid`, `style_lip` (booléen) qui **n'existent plus** dans `gridfinity-rebuilt-bins.scad` du commit K1 (mais restent dans `tests/gridfinity-rebuilt-bins.json` et `docs/constants.md` de K1) | [V] ; donc version **antérieure** ou fork [I] |
| Rendu | UI en **Rust/Yew** compilée en WASM ; **génération serveur** : `POST /gen/gridfinity-rebuilt/0/0/stl` (JSON des paramètres) → `{"stl_url":"/download/…/<sha1>.stl","filename":"gf-rebuilt-bin-1x1x6-s1x1-Standard-42ae2.stl"}` ; le SHA1 sert de cache | [V] P3 |
| Temps | 1,09–1,10 s par requête (2 × 2 × 3 et 2 × 3 × 3, aimants, 2 × 3 compartiments, onglet Auto) | [V] P3 (curl) |
| Aperçu | three.js 0.160.1 (CDN jsDelivr), `STLLoader` + `OrbitControls` ; bouton **Render** explicite ; cotes x/y/z affichées ; « Reset view on render » | [V] P1 |
| Export | **STL** seulement (`Download`) ; **EasyPrint** = lien `printables.com/slice?file_url=…` (tranchage en ligne Printables) | [V] P1 |
| Impression à la demande | panier (« Purchase only available to US customers », port 7 $, `pod_config.enable: true`, routes `/pod/cart/estimate`, `/order/checkout`) | [V] P1, P2, chaînes WASM |
| Partage | routes `/share/`, `/shared`, composant `SavedArgumentsSelector`, `SavedModel`, accès presse-papiers ; compte (Google OAuth ou e-mail) ; **URL sans paramètres** (`/pr/<projet>/<modèle>/<version>`) | [V] chaînes WASM + robots.txt ; fonctionnement exact non testé (compte requis) [I] |
| Autres projets sur le site | Gridfinity Extended, GridFlock, Gridfinity Anylid, Rugged Box, Basket, Cullenect Label, openGrid, Underware, openGrid Shelf, Honeycomb Storage Wall, Multiboard | [V] menu P1 |

### 2.2 Paramètres « Basic Bin » (P2, ordre de l'UI ; `render_condition` = affiché si…)

| `parameter` | Libellé | Type | Défaut | Plage / pas | Unité | Condition | Effet |
|---|---|---|---|---|---|---|---|
| `gridy` | Grid rows | int | 1 | 1–30 | unité | — | Profondeur |
| `gridx` | Grid columns | int | 1 | 1–30 | unité | — | Largeur |
| `gridz` | Height | int | 6 | 1–42 | 7 mm | — | Hauteur (mode 7 mm, sans lèvre) |
| `l_grid` | Grid base size | float | 42 | 5–128, pas 1 | mm | — | Pas de grille |
| `style_lip` | Stacking lip | bool | true | — | — | — | Lèvre oui/non |
| `d_wall` | Wall thickness | float | 0,95 | 0–5, pas 0,1 | mm | — | Paroi |
| `style_hole` | Magnet style | enum | **Gridfinity Refined** | None / Magnet holes / Gridfinity Refined | — | — | Type de logement |
| `only_corners` | Magnets on corners only | bool | false | — | — | style ≠ None | Trous aux 4 coins du bac seulement |
| `screw_holes` | Screw holes | bool | false | — | — | — | Trou M3 (« for screwing bin down ») |
| `crush_ribs` | Magnet hole crush ribs | bool | false | — | — | Magnet holes | Nervures d'écrasement |
| `chamfer_holes` | Chamfer magnet hole | bool | false | — | — | Magnet holes | Chanfrein d'entrée |
| `printable_hole_top` | Printable hole tops | bool | true | — | — | aimant ou vis | Pont imprimable sans support |
| `MAGNET_HOLE_RADIUS` | Magnet radius | float | 3,25 | 0–15, pas 0,05 | mm | Magnet holes | |
| `REFINED_HOLE_RADIUS` | Magnet radius | float | 2,93 | 0,5–15, pas 0,01 | mm | Refined | |
| `MAGNET_HEIGHT` | Magnet depth | float | 2,1 | 0,1–10, pas 0,05 | mm | style ≠ None | |
| `enable_thumbscrew` | Thumbscrew | bool | false | — | — | — | Trou fileté M15×1,5 (refined) |
| `bin_style` | Bin style | enum (UI seule) | Standard | Standard / Cylinders / Solid | — | — | Choisit le type de découpe |
| `divy` / `divx` | Sub-bin rows / columns | int | 1 / 1 | 1–20 | — | Standard | Compartiments réguliers |
| `scoop` | Finger scoop | float | 1 | **0–2**, pas 0,2 | — | Standard | Poids du scoop (K1 limite à 0–1) |
| `style_tab` | Label tab | enum | **Left** | Full / Auto / Left / Center / Right / None | — | Standard | Onglet d'étiquette |
| `place_tab` | Label tab sub bin | enum | All sub bins | All sub bins / Top left only | — | onglet ≠ None | |
| `d_tabw` | Max label tab width | float | 42 | 0–840, pas 1 | mm | onglet ∉ {Full, None} | Largeur max |
| `d_tabh` | Label tab depth | float | 15,85 | 0–42, pas 0,5 | mm | onglet ≠ None | Profondeur de l'onglet |
| `cdivy` / `cdivx` | Cylinder rows / columns | int | 1 | 0–200 | — | Cylinders | Grille de trous cylindriques |
| `c_orientation` | Cylinder orientation | enum | Vertical | Vertical / Cross Column / Cross Row | — | Cylinders | Cylindres debout ou couchés |
| `cd` | Cylinder diameter | float | 10 | 0–2000, pas 0,1 | mm | Cylinders | |
| `ch` | Cylinder depth | float | 10 | 0–295, pas 0,1 | mm | Cylinders | |
| `c_depth` | Cylinder start inset | float | 1,1 | 0–295, pas 0,1 | mm | Cylinders | Retrait depuis le haut |
| `c_chamfer` | Cylinder chamfer | float | 0,5 | 0–1000, pas 0,1 | — | Cylinders + Vertical | Chanfrein du bord |

Modèle « Solid » : aucun paramètre de découpe (bac plein) [V P1].
Mesure : 1 × 1 × 6 par défaut → **41,5 × 41,5 × 45,55 mm** (= 42 + lèvre arrondie 3,55) [V P3].

### 2.3 Autres modèles du même projet

- **Vase Mode Bin** (`gridfinity-spiral-vase.scad`) : `type` Bin/Base (deux pièces à coller), `nozzle` 0,6 (0,1–2), `layer` 0,35, `bottom_layer` 3 (1–10), `gridx/gridy/gridz`, `l_grid` 40–128, `n_divx` 0–20, `enable_holes` (aimants, base), `MAGNET_HOLE_RADIUS`, `MAGNET_HEIGHT`, `enable_lip`, `enable_scoop_chamfer` (« Finger scoop »), `enable_funnel` (« Label tab finger funnel »), `enable_pinch` (lèvre pincée pour rigidité), `style_tab` Continuous/Broken/Auto/Right/Center/Left/None, **`a_tab` angle d'onglet 37–75° (défaut 40)**, `style_base` All/Corners only/Edges/Auto/None ; `enable_inset` figé à false [V P2].
- **Baseplate** : hors sujet ici (voir `gridfinity-baseplate.md`).
- Le **bac « lite »** de K1 (`gridfinity-rebuilt-lite.scad`) n'est **pas** exposé [V P2].

---

## 3. Bouwens (gridfinity.bouwens.co, « Gridfinity Creator »)

### 3.1 Identité et architecture

| Élément | Constat | Statut |
|---|---|---|
| Auteur | Jeroen Bouwens (« ©2024 Jeroen Bouwens », CITATION.cff) ; Discord, Ko-fi | [V] B1, B2 |
| Licence | **CC BY-NC-SA 4.0** (fichier `LICENSE` ; GitHub : `NOASSERTION`) | [V] B2 |
| Source | `github.com/jeroen94704/gridfinitycreator`, 52 étoiles, dernier push 2025-12-02, v0.4.5 ; auto-hébergeable (Docker) | [V] B2 |
| Pile | Python, **CadQuery** (OpenCascade), Flask + Jinja2 + Gunicorn, Bootstrap/Bootswatch Flatly | [V] B1 « Made possible by », B2 |
| Statut | « GridfinityCreator is alpha software. It may produce incorrect output, fail inexplicably or cease to exist at any moment. » | [V] B1 |
| Rendu | formulaire `POST /` → fichier en pièce jointe (`Content-Disposition: attachment; filename="Divider Bin 2x2x6 3x3 Compartments.stl"`), en-tête STL « Exported by Open CASCADE Technology » | [V] curl |
| Temps | **1,16 s** pour un bac 2 × 2 × 6, 3 × 3 compartiments, aimants, lèvre, scoop, onglet (1 Mo, 20 854 triangles) | [V] curl |
| Aperçu | **aucun aperçu 3D** ; images d'exemple (rendus Blender) dans l'aide « ? » de chaque champ | [V] B1 |
| Export | **STL / STEP** ; 3MF refusé : « The framework … does have the option to export to 3MF, but this is currently a little buggy » | [V] B1 |
| État / partage | aucun partage ni URL d'état ; seule la grille (X, Y, Z) est mémorisée dans un **cookie** `gridspec` | [V] B2 `gfg_main.py` l. 53-71, 84-113 |
| Limites | 1–6 unités en X/Y, hauteur ≤ 12 (« to protect the server ») ; compartiments ≤ 24 par axe (aide : 3 par unité ; code : `MAX_COMPARTMENTS_PER_GRID_UNIT = 4`) | [V] B1, B2 |

### 3.2 Paramètres par type de bac (B1 formulaires, B2 `*_settings.py`)

**Divider bin** (`classicbin`)

| Champ | Libellé | Type | Plage | Défaut page | Effet |
|---|---|---|---|---|---|
| `sizeUnitsX/Y` | Width / Length | int | 1–6 | 2 / 2 | Unités de 42 mm |
| `sizeUnitsZ` | Height | int | 2–12 | 6 | Unités de 7 mm |
| `compartmentsX/Y` | Width / Length direction | int | 1–24 | 3 / 3 | Compartiments réguliers ; séparateurs de **1,5 mm** (`dividerThickness`) |
| `addMagnetHoles` | Magnet holes | bool | — | oui | Ø réglable, profondeur 2 |
| `addRemovalHoles` | Magnet removal holes | bool | — | non | Trou Ø 3,5 décalé de 2,16 mm (sur le bord du trou d'aimant) pour extraire l'aimant |
| `addScrewHoles` | Screw holes | bool | — | non | Ø 3 × 6 mm |
| `magnetHoleDiameter` | Magnet-hole diameter | float | libre | 6,5 | mm |
| `addStackingLip` | Stacking lip | bool | — | oui | Voir 3.3 |
| `addGrabCurve` | Scoop ramp | bool | — | oui | Congé au fond de chaque rangée ; rayon = min((Z−1)·7 ; longueur du compartiment ; 20,75) |
| `addLabelRidge` | Add label tab(s) | bool | — | oui | Onglet triangulaire 45° de **13 mm** (`labelRidgeWidth`), arête arrondie 0,5 |
| `multiLabel` | Label tab per row | bool | — | non | Un onglet par rangée de compartiments |
| `exportFormat` | Export format | select | STL / STEP | STL | |

**Holey bin** : `numHolesX/Y` (≥ 1, défaut 3), `sizeUnitsX/Y` (1–6, recalculé : l'un pilote l'autre, formule `ceil((n·keepout + 2·1,9 + 0,5)/42)`), `keepoutDiameter` 12, `holeShape` Circle/Square/Hexagon, `holeSize` 4 (Ø, entre-plats ou côté), `holeDepth` 5, lèvre, aimants/extraction/vis/Ø, format. **Pas de champ hauteur dans le formulaire** [V B1].
**Light bin** : X/Y 1–6, Z 1–12, lèvre, onglet, format ; plancher 0,9 mm, **ni aimants ni vis** [V].
**Solid bin** : X/Y 1–6, Z 1–12, aimants/extraction/vis/Ø, lèvre, format (bac plein, point de départ pour modifications) [V].
**Réglages avancés** (panneau « … ») : préréglages **Gridfinity** (42/42/7) ou **Raaco** (39,5/54,5/7), champs Grid size X, Grid size Y, Height unit ; avertissement « Don't make any changes unless … » [V].

### 3.3 Géométrie (B2 `grid_constants.py`, `classicbin_generator.py`)

- Bac = n·42 − **0,5** (`BRICK_SIZE_TOLERANCE_MM`) ; mesuré **83,5 × 83,5 × 46,4** pour 2 × 2 × 6 [V].
- Pied : 0,8 (chanfrein) + 1,8 + 2,15 (`BASE_BOTTOM_THICKNESS 2,6`, chanfrein 0,8, `BASE_TOP_THICKNESS 2,15`), rayon 3,75 ; plancher 2,25 pour que la base fasse exactement 7 mm [V].
- Aimants à 41,5/2 − 2,14 − 0,8 − 4,8 = **13,01 mm** du centre [V calcul sur les constantes].
- Paroi **1,9 mm** fixe (`WALL_THICKNESS`), non réglable [V].
- **Lèvre simplifiée** : la paroi est prolongée de 4,4 mm puis son arête intérieure haute est **chanfreinée de 1,9 mm** — pas le profil 0,7/1,8/1,9 de la spec [V code ; compatibilité d'empilage non testée, I].

---

## 4. gridfinity-rebuilt-openscad (K1, source amont de Perplexing Labs)

Fichier `gridfinity-rebuilt-bins.scad` (commit K1), groupes du Customizer OpenSCAD :

| Groupe | Paramètre | Défaut | Plage / valeurs | Effet |
|---|---|---|---|---|
| Setup | `$fa`, `$fs` | 4, 0,25 | — | Finesse des arcs |
| General | `gridx`, `gridy` | 3, 2 | ≥ 1 (fractions acceptées par `new_bin`) | Taille en cellules |
| General | `gridz` | 6 | pas 0,1 | Hauteur (selon `gridz_define`) |
| General | `half_grid` | false | — | Bacs en **demi-grille 21 mm** ; implique `only_corners` |
| Height | `gridz_define` | 0 | 0 : unités de 7 mm hors lèvre ; 1 : mm intérieurs ; 2 : mm extérieurs hors lèvre ; 3 : mm extérieurs lèvre comprise | Interprétation de `gridz` |
| Height | `height_internal` | 0 | mm | Hauteur de remplissage (bac plein partiel) |
| Height | `enable_zsnap` | false | — | Arrondit au multiple de 7 supérieur |
| Height | `include_lip` | true | — | Lèvre d'empilage |
| Compartments | `divx`, `divy` | 1, 1 | 0 = bac plein | Compartiments réguliers (séparateurs `d_div = 1,2`) |
| Compartments | `depth` | 0 | mm | Profondeur des compartiments (0 = maximale) |
| Cylindrical | `cut_cylinders` | false | — | Trous cylindriques au lieu de compartiments |
| Cylindrical | `cd` | 10 | mm | Ø des cylindres |
| Cylindrical | `c_chamfer` | 0,5 | mm | Chanfrein du bord |
| Features | `style_tab` | 1 (Auto) | 0 Full, 1 Auto, 2 Left, 3 Center, 4 Right, 5 None | Onglet ; Auto = gauche sur la 1ʳᵉ colonne, droite sur la dernière, centré ailleurs (`tab.scad` l. 114-118) |
| Features | `place_tab` | 0 | 0 partout, 1 compartiment haut-gauche | |
| Features | `scoop` | 1 | 0–1 (pas 0,1), « any real number will scale » | Rayon = scoop × hauteur/2 |
| Base holes | `only_corners` | false | — | Trous aux coins extérieurs seulement |
| Base holes | `refined_holes` | **true** | incompatible avec `magnet_holes` | Logement **Gridfinity Refined** : aimant glissé latéralement (fente 11 mm), Ø 5,86, h 1,9, 2 couches sous l'aimant, trou d'extraction au cure-dent (`refined_hole()`) |
| Base holes | `magnet_holes` | false | — | Ø 6,5 × 2,4 (2 + 2 couches) |
| Base holes | `screw_holes` | false | — | M3 Ø 3, profondeur 7 |
| Base holes | `crush_ribs` | true | — | 8 nervures, Ø intérieur 5,9 |
| Base holes | `chamfer_holes` | true | — | +0,8 mm à 45° |
| Base holes | `printable_hole_top` | true | — | Ponts imprimables sans support (technique « sacrificial bridges ») |
| Base holes | `enable_thumbscrew` | false | — | Taraudage M15×1,5 au centre de chaque cellule (refined) |

Constantes utiles (`standard.scad`) : paroi `d_wall = 0,95`, congé intérieur `r_f2 = 2,8`, séparateur `d_div = 1,2`, onglet `_tab_depth = 15,85`, angle `36°`, hauteur `tan 36° × 15,85 + 1,2 = 12,72 mm`, largeur nominale 42 [V].
API au-delà du Customizer (exemples l. 145-279) : `bin_translate` + `compartment_cutter(cgs([x, y]))` pour des **compartiments de tailles quelconques, fractionnaires, voire chevauchants**, `cut_chamfered_cylinder`, `pattern_grid`, `child_per_element` (formes et **texte** différents par compartiment) [V].
Variantes : `gridfinity-rebuilt-lite.scad` (bac « lite » : base creuse, `bottom_layer`, `style_lip` 0 lèvre / 1 retirée / 2 retirée en gardant la hauteur) ; `gridfinity-spiral-vase.scad` (voir 2.3) [V].

---

## 5. Matrice fusionnée des fonctionnalités

Colonnes : **GGC** = gridfinitygenerator.com, **PL** = Perplexing Labs (UI), **BW** = Bouwens, **RB** = gridfinity-rebuilt (source K1). Sources : GGC → G1/G2, PL → P1/P2, BW → B1/B2, RB → K1.

| Fonctionnalité | GGC | PL | BW | RB |
|---|---|---|---|---|
| Taille X/Y en unités | 1–20 [V] | 1–30 [V] | 1–6 [V] | illimité, fractionnaire par API [V] |
| Hauteur en unités de 7 mm | 2–20 [V] | 1–42 [V] | 2–12 (divider) [V] | oui + 3 autres modes mm, zsnap [V] |
| Hauteur en mm | non [V] | non [V] | non [V] | oui (`gridz_define` 1-3) [V] |
| Taille libre en mm (bac coupé) | oui, « Custom Size » [V] | non [V] | non [V] | non (par code seulement) [I] |
| Demi-grille / tailles fractionnaires | non (mais coupe en mm) [V] | non [V] | non [V] | `half_grid` 21 mm ; fractions via `new_bin` [V] |
| Pas de grille personnalisé | 12–70 mm (X = Y) [V] | 5–128 mm [V] | X, Y, Z libres + préréglage Raaco [V] | `GRID_DIMENSIONS_MM` [V] |
| Épaisseur de paroi | 0,4–3, défaut 1,2 [V] | 0–5, défaut 0,95 [V] | fixe 1,9 [V] | `d_wall` 0,95 (constante) [V] |
| Épaisseur des séparateurs | 0,4–3, défaut 0,8 [V] | non (1,2 fixe) [I] | fixe 1,5 [V] | `d_div` 1,2 (constante) [V] |
| Séparateurs réguliers X/Y | non (murs à placer un par un) [V] | 1–20 × 1–20 [V] | 1–24 × 1–24 [V] | `divx`/`divy` [V] |
| Compartiments libres (position, longueur) | oui, murs au 1/12 d'unité [V] | non [V] | non [V] | oui par code (`compartment_cutter`) [V] |
| Profondeur des compartiments | non [V] | non [V] | non [V] | `depth` [V] |
| Scoop (rampe) | élément placé, bombé 0,1–0,4 [V] | 0–2 [V] | oui/non [V] | 0–1 (réel) [V] |
| Onglet d'étiquette | « Ledge » 15 × 15 placé librement, par unités de 1/12 [V] | Full/Auto/Left/Center/Right/None + largeur max + profondeur [V] | oui/non, un par rangée en option [V] | 6 styles, placement tous/haut-gauche [V] |
| Angle de l'onglet | fixe 45° [V] | fixe (36°) ; vase : 37–75° [V] | fixe 45° [V] | 36° constante ; vase `a_tab` [V] |
| Lèvre d'empilage | Default / Thin / None [V] | oui/non [V] | oui/non (chanfrein simplifié) [V] | oui/non ; lite : 3 modes [V] |
| Lèvre conforme au profil spec 0,7/1,8/1,9 | non, profil du pied 0,8/1,8/2,15 [V code] | oui, pointe arrondie 0,6 [V] | non, chanfrein [V] | oui, pointe arrondie 0,6 [V] |
| Jeu du bac (n·42 − x) | 0,62 [V code] | 0,5 [V mesure] | 0,5 [V mesure] | 0,5 [V] |
| Trous d'aimant | None/Corner/Full, Ø 2–8,2 (6,2), prof. 1–4 (2,1) [V] | None/Magnet/Refined, rayon, profondeur [V] | oui, Ø libre (6,5), prof. 2 [V] | Ø 6,5 × 2,4 [V] |
| Aimants aux coins seulement | oui (« Corner ») [V] | oui [V] | non [V] | `only_corners` [V] |
| Crush ribs | non [V] | oui [V] | non [V] | oui (défaut) [V] |
| Chanfrein d'entrée du trou | non [V] | oui [V] | non [V] | oui (défaut) [V] |
| Pont imprimable sans support | non [I] | oui (défaut) [V] | non [I] | oui (défaut) [V] |
| Gridfinity Refined (aimant glissé) | non [V] | oui (**défaut**) [V] | non [V] | oui (défaut) [V] |
| Trou d'extraction d'aimant | non [V] | via Refined (cure-dent) [V] | oui, Ø 3,5 [V] | via Refined [V] |
| Trous de vis | None/Corner/Full, Ø 3 fixe [V] | oui/non M3 [V] | oui/non Ø 3 × 6 [V] | oui/non M3 [V] |
| Thumbscrew M15 | non [V] | oui [V] | non [V] | oui [V] |
| Bac plein (solid) | non [I] | « Solid » [V] | « Solid bin » [V] | `divx = 0` ou `height_internal` [V] |
| Bac léger (lite) | non [V] | non [V] | « Light bin » (plancher 0,9, sans aimants) [V] | `gridfinity-rebuilt-lite.scad` [V] |
| Mode vase | non [V] | « Vase Mode Bin » (2 pièces) [V] | non [V] | `gridfinity-spiral-vase.scad` [V] |
| Trous cylindriques / grille de trous | non [V] | Cylinders : grille, Ø, prof., retrait, orientation debout/couchée, chanfrein [V] | Holey bin : cercle/carré/hexagone, keepout, taille auto [V] | `cut_cylinders` [V] |
| Shadowbox (découpe d'objet) | module **Cutout** : STL importés, déplacés/tournés (pas 15°)/mis à l'échelle, soustraits d'un bac plein [V llms.txt, docs] | non (renvoie vers outils tiers : Georgs outline, Tooltrace) [V] | non [V] | non [V] |
| Texte / étiquette embossée | non [V] | non [V] | non [V] | par code seulement (exemple `text()`) [V] |
| Style de base | fixe [V] | fixe [V] | fixe [V] | normal ou lite (`base_thickness`) [V] |
| Tolérance réglable | non [V] | non [V] | non [V] | non (constantes) [V] |
| Top cutoff | non [V] | non [V] | non [V] | non [V] |
| Export | STL, STEP, GLB [V] | STL [V] | STL, STEP [V] | STL/3MF/… via OpenSCAD local [I] |
| 3MF | non [V] | non [V] | non (« buggy ») [V] | via OpenSCAD 2021+ [I] |
| Aperçu 3D | temps réel, poignées, Beauty mode [V] | après « Render » [V] | aucun [V] | OpenSCAD local [V] |
| Lieu de calcul | navigateur (replicad WASM) [V] | serveur OpenSCAD [V] | serveur CadQuery [V] | poste local [V] |
| Temps typique | ~3–4 s [I] | ~1,1 s + téléchargement [V] | ~1,2 s [V] | « quelques secondes » avec OpenSCAD dev [V README] |
| État dans l'URL | non [V] | non (partage via compte) [V/I] | non (cookie grille) [V] | fichier .scad / JSON Customizer [V] |
| Sauvegarde | compte, 5 à 250 modèles selon abonnement [V] | compte [I] | non [V] | fichiers locaux [V] |
| Licence | propriétaire [I] | site propriétaire [I], modèles MIT [V] | CC BY-NC-SA 4.0 [V] | MIT [V] |

---

## 6. Fonctionnalités notables ou uniques

- **GGC** : édition directe dans l'aperçu (glisser murs/ledges/scoops, duplication, raccord automatique aux parois, grille de placement 1/12) ; coupe à une taille en mm ; lèvre « Thin » ; module Cutout (shadowbox par STL) ; collections sur grille partagée ; STEP et GLB ; thème, 8 langues, pouces [V].
- **PL** : couverture quasi complète de rebuilt sans installer OpenSCAD ; défaut **Gridfinity Refined** ; grille de cylindres couchés ; **impression à la demande** (US) ; bouton EasyPrint (Printables) ; même plateforme pour d'autres systèmes (openGrid, Multiboard…) [V].
- **BW** : Holey bin à taille calculée ; trous d'extraction d'aimant ; préréglage Raaco ; code CadQuery lisible et auto-hébergeable (mais NC) [V].
- **RB** : seul à offrir la hauteur en mm, la demi-grille, la profondeur de compartiment, les compartiments arbitraires et le bac lite/vase ; c'est aussi la seule source MIT exploitable [V].

## 7. Dimensions de la spec utiles pour le générateur de bacs

| Grandeur | Valeur | Source |
|---|---|---|
| Pas de grille | 42 × 42 mm | S8 ; K1 `GRID_DIMENSIONS_MM` l. 15 [V] |
| Unité de hauteur | 7 mm ; hauteur d'un bac = 7·u + lèvre | S8 ; K1 `fromGridfinityUnits` (utility l. 24-25), commentaire bins l. 10-16 (2u → 18,4 ; 3u → 25,4 ; 6u → 46,4) [V] |
| Base (pied + pont) | 7 mm = profil 4,75 + pont 2,25 | K1 `BASE_HEIGHT = 7`, `BASE_BRIDGE_HEIGHT` l. 217-222 ; B2 `FLOOR_THICKNESS 2,25` [V] |
| Dessus du pied | 41,5 × 41,5 mm (jeu 0,5, soit 0,25 par côté), rayon 3,75 | S8 ; K1 `BASE_TOP_DIMENSIONS`, `BASE_TOP_RADIUS`, `BASE_GAP_MM` l. 190-205 (« must be kept constant, even at half/quarter grid sizes ») [V] |
| Profil du pied | 0,8 (45°) / 1,8 (vertical) / 2,15 (45°) = 4,75 ; dessous 35,6 mm, rayon 0,8 | K1 `BASE_PROFILE` l. 175-180, `base_bottom_dimensions` [V] |
| Lèvre d'empilage | 0,7 (45°) / 1,8 (vertical) / 1,9 (45°) = 4,4 mm nominal ; K1 arrondit la pointe (r 0,6) → 3,55 réel, « no impact on stacking height » ; support 1,2 mm sous la lèvre | S8 ; K1 `STACKING_LIP_LINE` l. 124-129, `STACKING_LIP_FILLET_RADIUS`, `STACKING_LIP_SUPPORT_HEIGHT` l. 111-118, bins l. 18-21 [V] |
| Aimants (bac) | 6 × 2 mm ; trou Ø 6,5 ; à 4,8 mm du bord du dessous (35,6) → 13 mm du centre (26 mm entre trous) | S8 ; K1 l. 28-35 ; vase `d_hole = 26` [V] |
| Refined | Ø 5,86, h 1,9, 2 couches dessous | K1 l. 39-42 [V] |
| Crush ribs | Ø int 5,9, 8 nervures | K1 l. 45-49 [V] |
| Vis | M3, Ø 3 | K1 `SCREW_HOLE_RADIUS` l. 27 [V] |
| Paroi / séparateur / congé intérieur | 0,95 / 1,2 / 2,8 (valeurs rebuilt, non normatives) | K1 `standard.scad` l. 4-10 [V] |
| Onglet d'étiquette | profondeur 15,85, angle 36°, largeur nominale 42 (valeurs rebuilt, « arbitrarily chosen ») | K1 l. 60-100 [V] |
| Thumbscrew refined | M15 × 1,5 | K1 l. 247-248 [V] |

## 8. Nom « Gridfinity Generator »

- Le domaine **gridfinitygenerator.com** existe depuis le **2024-07-14**, exploité par **Flinck Technologies AB** (Suède) et construit par **Marcus Svensson** ; son produit s'appelle littéralement **« Gridfinity Generator »** (title, application-name, logo texte, llms.txt) et vend des abonnements (sauvegarde cloud). Code non public [V faits, I licence].
- **Perplexing Labs** titre aussi sa page « Gridfinity Generator » ; un plug-in Fusion 360 s'appelle **FusionGridfinityGenerator** (`Le0Michine/FusionGridfinityGenerator`) [V].
- Conséquence pour nous : le nom de notre dépôt/projet (`gridfinitygenerator`, « Gridfinity Generator ») est **déjà utilisé comme nom de produit** par un service commercial actif sur le `.com` exact. Statut de marque déposée non vérifié [I]. Pas un avis juridique.

## Questions ouvertes

1. Mesurer un export STL de gridfinitygenerator.com pour confirmer 41,38 mm par unité et la hauteur de la lèvre (code lu, pas d'export mesuré).
2. Compatibilité d'empilage des lèvres non standard (GGC 4,75, BW chanfrein) avec un pied standard : à tester à l'impression.
3. Partage de configuration chez Perplexing Labs (`/share/`) : fonctionnement exact non testé (compte requis).
4. Version exacte du .scad utilisée par Perplexing Labs (paramètres `cdivx`, `d_tabw`… absents du `main` K1).
5. Marque « Gridfinity Generator » : existe-t-il un dépôt (EUIPO, USPTO) ? non vérifié.

# Recherche : générateurs de bins et pages d'index (gridfinitygenerator.com, perplexinglabs, bouwens, extrabold)

> Date : 2026-09-30. Question du mainteneur : « on a fait les baseplates, on va faire les bins ; il faut une page d'index qui liste les générateurs ; inspecter gridfinitygenerator.com/en/box, gridfinity.perplexinglabs.com et gridfinity.bouwens.co pour en extraire les fonctionnalités ». Puis : « une page un peu comme extrabold », et « un bin plus grand que le plateau sera découpé comme chez Alexandre Chappel ».
> Légende : **[V]** = vérifié dans une source primaire (HTML, bundle JS, schéma JSON, code source) · **[I]** = inféré, à confirmer.
> Vocabulaire : `CONTEXT.md`. Décisions tirées de cette recherche : ADR 0017 (index), ADR 0018 (pied standard), spec du générateur de bins (issue GitHub).

## Sources primaires

| Id | Source | Détail |
|---|---|---|
| G1 | `https://gridfinitygenerator.com/en/box` (Next.js côté client, fermé) | HTML, `sitemap.xml`, chunks webpack : éditeur dans `static/chunks/5871.*.js`, état par défaut dans `3932-*.js`. Auteur : Marcus Svensson (Flinck Technologies AB). |
| P1 | `https://gridfinity.perplexinglabs.com/pr/gridfinity-rebuilt/0/0` (Rust/Yew en WASM) | Schéma complet des paramètres servi en JSON par `https://gridfinity.perplexinglabs.com/ui/gridfinity-rebuilt/0` ; index lu dans les chaînes du WASM. |
| R1 | `kennetek/gridfinity-rebuilt-openscad`, branche `main` (MIT) | `gridfinity-rebuilt-bins.scad`, `src/core/standard.scad`. P1 en fait tourner une copie plus ancienne. |
| B1 | `https://gridfinity.bouwens.co/` (Flask + CadQuery côté serveur, « Gridfinity Creator v0.4.5 », © 2024 Jeroen Bouwens) | HTML rendu serveur : formulaires, valeurs par défaut, bornes, aides. Source : `github.com/jeroen94704/gridfinitycreator` (non lu). |
| X1 | `https://www.extrabold.tools/` (SvelteKit, v0.3.1) | HTML de `/` et `/category/gridfinity`, `sitemap.xml`, chunks `/_app/immutable/` (nœud 3 = accueil). |
| E1 | Gridfinity Extended (ostat), `modules/module_gridfinity_Extendable.scad` | Découpe d'un bin (« extension ») ; doc `docs.ostat.com/docs/openscad/gridfinity-extended/basic-cup/`. |
| M1 | Fiches ModuBOX sur alch.shop (`modubox-boxes-organizers-complete-3d-printable-set-…`, `…modular-storage-bx233`) et rendu `variations.png` | Versions « split » ; fichiers payants non téléchargés. |
| PR | API Printables, fiches 707095 (« Gridfinity Split bins », CC BY) et 437449 (DatBuschi, GPL-2.0) ; MakerWorld 2855440, 815089 (403, non vérifiés) | Découpes de bins publiées par la communauté. |

---

## 1. Pages d'index

| | gridfinitygenerator.com | perplexinglabs | bouwens | extrabold |
|---|---|---|---|---|
| Forme | 4 cartes « Choose model type » : Box, Baseplate, Cutout, Collection (« New ») [V] | onglets Systems / Components / Projects, rangés par écosystème (Gridfinity, openGrid, autres) [V chaînes WASM] | onglets sur une seule page : Home, Baseplate, 4 sortes de bins [V] | titre animé, recherche floue, grille de cartes, encart MCP, vidéos, pied de page [V] |
| Outils | Box, Baseplate, Cutout, Collection, clip de baseplate [V] | ~15 projets : Gridfinity Rebuilt, Extended, GridFlock, Rugged Box, Basket, Anylid, Cullenect Label, openGrid, Multiboard… [V] | Baseplate, bin à séparateurs, troué, léger, plein [V] | **un seul** : la baseplate ; aucun générateur de bins, malgré le texte de `/category/gridfinity` [V] |
| Autour | comptes (3 modèles gratuits), abonnement [V] | comptes, partage, impression à la demande, Stripe [V] | aucun [V] | bandeau des donateurs, soumission de vidéos [V] |

**Carte d'extrabold** [V] : toute la carte est un lien (`<a class="content-card">`) ; image fixe webp/png (`/previews/{id}-preview.webp`), pas de 3D ; pastille de catégorie ; titre h3 et une ligne. Grille `repeat(auto-fill, minmax(280px, 1fr))`, 2 colonnes sous 768 px. Pas de pastille « bientôt ». Anglais seulement.

## 2. Paramètres des bins

| | gridfinitygenerator.com [V G1] | perplexinglabs / Rebuilt [V P1, R1] | bouwens [V B1] |
|---|---|---|---|
| Taille | 1–20 cellules ; cellule 12–70 mm (42) | 1–30 ; cellule 5–128 mm (42) | 1–6 ; préréglages Gridfinity (42 × 42 × 7) et Raaco (39,5 × 54,5 × 7) |
| Hauteur | unités de 7 mm, 2–20, **3** par défaut ; affichée 7·Z + 4,4 mm | unités de 7 mm, 1–42, **6** par défaut ; R1 : 4 modes (unités, mm intérieurs, mm extérieurs avec ou sans rebord) | 2–12 unités, 6 par défaut |
| Rebord d'empilage | Default / Thin / None | oui / non (R1 : `include_lip`) | oui / non |
| Parois | extérieure 1,2 mm, séparateurs 0,8 mm (0,4–3) | `d_wall` 0,95 mm ; séparateurs `d_div` 1,2 mm | fixes |
| Compartiments | **placement libre** d'éléments (mur, rebord, pelle), accrochés au 1/12 de cellule | grille `divx` × `divy`, 1–20 | grille 1–24, au plus 3 par cellule |
| Pelle | élément à placer ; courbure 0,1–0,4 | `scoop` 0–2 (1), sur chaque ligne | une par ligne |
| Onglet d'étiquette | seulement le « ledge » placé à la main | `style_tab` : pleine largeur, auto, **gauche**, centre, droite, aucun ; `place_tab` tous / un seul ; largeur max 42, profondeur 15,85 | un, ou un par ligne |
| Sous le pied | aimants aucun / coins / tous (Ø 6,2, 2,1) ; vis aucune / coins / toutes | trous **Refined** par défaut, ou classiques ; coins seulement ; crush ribs ; chanfrein ; dessus imprimable ; vis M3 ; vis à molette | aimants Ø 6,5 (activés), trous pour les retirer, vis |
| Sortes de bin | Box ; Cutout (STL importé creusé dans un bloc) | Standard / Cylindres / Plein ; bin en mode vase à part | à séparateurs, troué (grille de trous ronds, carrés, hexagonaux), léger (sans aimant), plein |
| Autres | recadrage « max size » en mm ; collections sur une grille commune | demi-grille (R1 seulement) | — |
| Export | STL, STEP, GLB | STL | STL, STEP (3MF écarté, « un peu bogué ») |
| Aperçu, partage | 3D, comptes | 3D, comptes, liens | ni l'un ni l'autre |

**Ce que personne ne fait** [I, par absence] : couvercle intégré au générateur de bins, export 3MF propre, nombres mesurés sur le maillage à l'écran, lien entre la baseplate d'un tiroir et les bins qui la remplissent, découpe automatique d'un bin selon le plateau.

## 3. Le socle d'un bin Rebuilt [V R1, `src/core/standard.scad`]

- Profil du pied : 0,8 / 1,8 / 2,15 mm, soit `BASE_PROFILE_HEIGHT` = 4,75 mm ; dessus du pied `BASE_TOP_DIMENSIONS` = 41,5 × 41,5, rayon 3,75.
- `BASE_HEIGHT` = 7 : au-dessus des pieds pleins, une dalle de 7 − 4,75 = 2,25 mm (`BASE_BRIDGE_HEIGHT`) les relie. Le fond intérieur est donc à 7 mm : **la première unité est entièrement prise par le socle**. Un bin de 3 unités (21 mm + rebord) a 14 mm de profondeur utile.
- Schéma à l'échelle, pied plein et pied creux proposé : `pied-plein-vs-creux.svg`. Le pied creux (fond d'environ 1,2 mm juste au-dessus des pentes, fond intérieur vers 6 mm) est une hypothèse à mesurer : le trancheur ne remplit pas un volume plein à 100 %, donc le gain réel en grammes est bien moindre que le calcul de volume [I].

## 4. Découpe d'un bin trop grand pour le plateau

- **Aucun raccord mécanique publié ne tient sans colle** [V/I].
- **Gridfinity Extended** [V E1] : un plan traverse tout le bin (pieds, parois, lèvre) ; position en unités, 0,5 par défaut, donc parfois **au milieu d'un pied**. Languettes d'alignement collées côté intérieur (1,4 mm, alternées), arrêtées sous la lèvre : « to assist in gluing together ». La lèvre ne tient que par la colle. Issues : #230 (fente de doigt + découpe), #166 (séparateurs non découpés), #279.
- **ModuBOX split** [V M1] : « a split version that allows for printing of larger boxes on smaller printers », seulement 4H et 6H, jamais les Stackable. Sur le rendu : coupe verticale en travers, **clé trapézoïdale dans l'épaisseur de la paroi**, surépaisseur intérieure le long du joint. Détail de la clé et colle : inconnus [I].
- **« Gridfinity Split bins »** [V PR 707095] : générés avec Extended, profondeurs 2,5 / 3,5 / 4,5 / 5,5, donc coupe au milieu d'un pied ; « use superglue ».
- **DatBuschi** [V PR 437449] : sections de cellules entières (coupe entre deux cellules [I]), reliées par des **queues d'aronde imprimées à part**, une par cellule, 5 jeux de 0 à 0,20 mm.
- **Générateurs** : aucun ne découpe un bin automatiquement selon le plateau ; GridFlock et extrabold ne découpent que des baseplates [V].

# Recherche : fonctionnalités de Tracefinity et de Tooltrace (shadowbox)

> Date : 2026-10-01. Ticket : #36 (shadowbox). Objectif : dresser la liste exhaustive des fonctionnalités et des réglages de deux générateurs existants de shadowbox par photo, avec leurs valeurs par défaut, bornes et unités, pour décider lesquelles reprendre. Faits seulement : cette note ne recommande rien.
> Légende : **[V]** = vérifié dans une source primaire (code, doc du dépôt, page officielle), avec le fichier et la ligne quand c'est possible · **[I]** = inféré, à confirmer.
> Pour le bundle de tooltrace.ai (T8j), **[V]** veut dire « lu dans le code que le site livre au navigateur » : je n'ai pas ouvert de compte ni essayé l'interface, donc l'aspect à l'écran reste non vérifié. Les positions y sont données en octets dans le fichier minifié (`@12345`).
> Vocabulaire : **empreinte** désigne ici le creux à la forme d'un outil dans le bin (à ne pas confondre avec la **poche** d'une baseplate, voir `CONTEXT.md`) ; **jeu** la marge ajoutée autour du contour ; **prise des doigts** les creux ajoutés pour saisir l'outil. Les mots anglais entre guillemets sont les libellés des interfaces.

## 1. Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| T1 | Dépôt `tracefinity/tracefinity` (MIT), commit `13a00d3151ff` (2026-09-21), dernier tag `0.9.4`, cloné et lu le 2026-10-01 | `README.md`, `CONSTITUTION.md`, `docs/features.md`, `docs/usage/*.md`, `docs/stl-generation.md`, `docs/gotchas.md`, `docs/tool-naming.md` ; interface : `frontend/src/components/{ToolEditor,ToolEditorToolbar,BinEditor,BinEditorToolbar,BinConfigurator,BinPreview3D,ToolBrowser,ImageUploader}.tsx`, `frontend/src/app/{bins/[id],trace/[id],tools/[id]}/page.tsx`, `frontend/src/lib/{constants,binDefaults,settings,cutouts,symmetry,svg}.ts`, `frontend/src/types/index.ts` ; serveur : `backend/app/models/schemas.py`, `backend/app/constants.py`, `backend/app/config.py`, `backend/app/api/routes.py`, `backend/app/services/{polygon_scaler,stl_generator_manifold,geometry}.py` |
| T2 | Service hébergé `https://tracefinity.net/`, lu le 2026-10-01 | `/` , `/pricing`, `/changelog`, `/docs/plans-and-limits`, `/privacy` (« Last updated: 13 February 2026 »), `/terms` (« Last updated: 26 July 2026 »). Les pages `/docs/*` reprennent `docs/usage/*.md` du dépôt |
| T3 | Dépôt `tensornext/tooltrace-designer` (MIT), commit `6218bd882513` (2026-09-28 ; c'est le commit que `shadowbox-contour-hors-ligne.md` note `6218bd882512`), cloné et lu en entier le 2026-10-01 | `README.md`, `docs/REVERSE_ENGINEERING.md`, `src/state/store.ts`, `src/components/{PhotoStep,ScaleStep,TraceStep,LayoutStep,Preview3D}.tsx`, `src/lib/{layout,build,offset,paper,contour,warp}.ts`, `src/lib/segment/{classical,sam}.ts`, `src/lib/export/{mesh,stl,threemf,svg,dxf}.ts`, `src/worker/imageWorker.ts`, `package.json` |
| T8 | `https://www.tooltrace.ai/`, pages officielles lues le 2026-10-01 (HTML servi et contenu des accordéons repliés, présent dans la page) | `/` (accueil, tarifs, FAQ), `/how-to` (« How to Use Tooltrace »), `/pricing`, `/about`, `/5s`. `/designer` sans session ne rend que l'écran de dépôt de la photo. `/faq`, `/blog`, `/docs`, `/changelog`, `/terms`, `/privacy`, `/sitemap.xml`, `/robots.txt` répondent 404 |
| T8j | Code JavaScript public de `tooltrace.ai`, déploiement Vercel `dpl_GRagisa8M6HN63vRj3TNWja1D9nx`, téléchargé le 2026-10-01 depuis `/_next/static/chunks/` | `2328-2d4e75c7e183f376.js` (panneau de réglages, carte d'outil, export, limites Pro), `7010.2fb9067d4e17726b.js` (canevas 2D, barre d'outils), `5379-3a62ef925c0cbb97.js` (géométrie 2D : jeu, symétrie, magnétisme, points de contrôle), `5880.519b44752b47f5b5.js` (worker CAO : géométrie 3D), `2259.79549de643c6e7f6.js` (3MF), `8615.d7bd11482bde9305.js` (aperçu 3D), `app/designer/page-a8ae51d52f51ddca.js`, `app/how-to/page-cf677705e183056f.js`. Code propriétaire et minifié : on y lit les libellés, les noms de champs et les constantes, rien n'en est copié |
| A1 | Recherche web et `gh search repos` du 2026-10-01 sur « tracetools » et « tracefinder » | voir § 1.1 |
| A2 | Dépôt `neilyboy/tracefinity`, commit `f3aeba8eb88a` (2026-09-09), et `https://tracetoforge.com/` (titre et description de la page d'accueil), lus le 2026-10-01 | voir § 1.1 |

Remarque sur T3 : `docs/REVERSE_ENGINEERING.md` l. 8-14 dit que son auteur n'a **pas pu charger** `tooltrace.ai` (« the live page could not be fetched […] Everything below comes from search-engine snippets […] and of reviews ») [V]. Ce document n'est donc pas une source sur le service : ce qu'il affirme de Tooltrace est repris ici seulement quand T8 ou T8j le confirme.

### 1.1 Les noms « tracetools » et « tracefinder »

Aucun outil de shadowbox Gridfinity ne porte littéralement ces deux noms : `gh search repos` ne renvoie rien pour « tracetools gridfinity », « tracefinder gridfinity », « tracetools shadowbox » ni « tracefinder shadowbox », et les dépôts nommés `tracetools` ou `TraceFinder` traitent d'autres sujets (traces Go, ROS 2, OSINT) [V A1]. Les noms réels sont **Tooltrace** et **Tracefinity**.

Deux noms proches existent et ne sont pas étudiés ici [V A2, existence seulement] :

| Outil | Constat | Statut |
|---|---|---|
| `neilyboy/tracefinity` | dépôt distinct de `tracefinity/tracefinity`, 1 étoile, sans fichier de licence ; description : « Self-hosted photo-to-Gridfinity tool holder generator. Snap a photo, auto-trace tools, customize, export as SVG/DXF/STL/3MF/STEP » | [V] A2 |
| TraceToForge (`tracetoforge.com`) | service ; description de la page : « Turn a photo of your tools into a custom insert. Trace, adjust the fit, preview your design, and export […]. Free tracing and preview; exports use credits » | [V] A2 |

---

## 2. Tracefinity (T1, T2)

### 2.1 Nature et périmètre

| Point | Constat | Statut |
|---|---|---|
| Nature | application web auto-hébergée (Docker, Helm, sources) et service hébergé ; serveur Python (FastAPI, OpenCV, manifold3d), interface Next.js / react-three-fiber. Tout le calcul (détourage, CAO) se fait sur le serveur | [V] T1 `README.md` l. 29-56, `docs/stl-generation.md` l. 5 |
| Parcours | photo → coins de la feuille → détourage → choix des outils à garder → **bibliothèque d'outils** → éditeur d'outil → éditeur de bin → export | [V] T1 `README.md` l. 16-23 |
| Sortie | uniquement des bins Gridfinity. Hors périmètre déclaré : bins de taille libre en mm, autres systèmes de rangement, mousse | [V] T1 `CONSTITUTION.md` l. 104-118 ; aucune occurrence de « foam » dans le code |
| Entrée | uniquement une photo ou un scan. Hors périmètre déclaré : import SVG, DXF, STL, dessin sur page blanche | [V] T1 `CONSTITUTION.md` l. 89-102 |

### 2.2 Photo → contour (rappel bref, détail dans `shadowbox-contour-hors-ligne.md`)

| Point | Constat | Statut |
|---|---|---|
| Formats | JPG, PNG, WebP, HEIC ; 20 Mo et 64 MP au plus par défaut ; image réduite à 2048 px de grand côté ; l'original est supprimé après le redressement | [V] T1 `docs/usage/uploading-photos.md` l. 28-34 |
| Dépôt de la photo | glisser-déposer ou sélecteur de fichier (`accept="image/*"`) ; pas de capture par la caméra dans l'interface | [V] T1 `ImageUploader.tsx` l. 182-203 ; absence de `getUserMedia` |
| Feuille de référence | A4, Letter, A3, Tabloid ; les outils peuvent dépasser de la feuille | [V] T1 `backend/app/constants.py` l. 13-18, `README.md` l. 16 |
| Coins | détection automatique, puis 4 poignées à glisser, avec zoom et déplacement ; orientation portrait ou paysage déduite des coins | [V] T1 `docs/features.md` l. 8, `README.md` l. 249 ; T2 `/changelog` (24 juin 2026) |
| Avertissements | photo prise de trop près (focale EXIF), feuille coupée par le cadre, perspective extrême ; ils n'empêchent pas de continuer | [V] T1 `docs/usage/uploading-photos.md` l. 18-26 |
| Détoureurs | locaux : IS-Net (défaut), BiRefNet Lite, InSPyReNet ; distants : Gemini, Replicate, fal.ai ; liste déroulante quand plusieurs sont configurés | [V] T1 `README.md` l. 165-216, `docs/usage/tracing.md` l. 7-21 |
| Masque manuel | télécharger l'image redressée, copier le prompt, produire le masque ailleurs, le téléverser | [V] T1 `docs/usage/tracing.md` l. 39-48 |
| Après le détourage | aperçu du masque ; on clique les contours à garder (« N of M selected ») ; nom modifiable par outil ; nommage automatique optionnel par un modèle de vision (Ollama ou OpenRouter, désactivé par défaut) | [V] T1 `app/trace/[id]/page.tsx` l. 579-580, 613 ; `docs/tool-naming.md` l. 3-7 |
| Reprise | la session de détourage est enregistrée et reprend où elle s'est arrêtée | [V] T1 `docs/usage/getting-started.md` l. 41-43 |
| « Photo stations » | coins et format de feuille mémorisés pour un poste de prise de vue fixe, réutilisés à l'envoi suivant ; **désactivé par défaut** (`photo_stations: bool = False`) et non documenté dans `docs/usage/` | [V] T1 `backend/app/config.py` l. 64, `schemas.py` l. 326-393 |

### 2.3 Empreintes : contour, lissage, édition manuelle

| Point | Constat | Statut |
|---|---|---|
| Modes d'édition | « Select » (glisser sommets et découpes), « Add point » (clic sur une arête), « Remove » (clic sur un sommet, 3 sommets au minimum), « Fill in » (visible seulement s'il y a des trous intérieurs) | [V] T1 `ToolEditorToolbar.tsx` l. 78-160 ; `docs/usage/tool-editor.md` l. 7-13 |
| Nature du contour | **polygone** de sommets ; pas de courbes de Bézier ni de poignées de tangente | [V] T1 `types/index.ts` l. 29-35 |
| Trous intérieurs | conservés au détourage (« interior rings », p. ex. l'œil d'une clé) : ils restent des îlots de matière dans l'empreinte. « Fill in » supprime un trou d'un clic | [V] T1 `README.md` l. 238, `ToolEditor.tsx` l. 781-786 |
| Lissage à l'écran | bascule « Accurate / Smooth » qui ne change que l'aperçu ; curseur 0 à 1, pas 0,05 | [V] T1 `ToolEditorToolbar.tsx` l. 270-300 |
| Lissage en sortie | bouton séparé « Output: Smooth / Accurate », enregistré avec l'outil ; **lissé par défaut**, niveau 0,5 (`smoothed: bool = True`, `smooth_level: float = 0.5`) | [V] T1 `ToolEditorToolbar.tsx` l. 301-310 ; `schemas.py` l. 404-405 |
| Algorithme « Smooth » | Douglas-Peucker à tolérance absolue 0,3 + niveau × 1,2 mm (0,3 à 1,5 mm, soit 0,9 mm au niveau par défaut), points d'appui à 2 mm de chaque coin, 3 passes de Chaikin, puis nettoyage à 0,05 mm | [V] T1 `polygon_scaler.py` l. 13-21, 24-38, 218-235 ; `lib/svg.ts` l. 5, 68, 136-139 |
| Algorithme « Accurate » | Douglas-Peucker à 0,3 mm seulement | [V] T1 `polygon_scaler.py` l. 197-216, 248 |
| Simplification manuelle | curseur « Detail » (nombre de nœuds affiché) de 0 à 1, pas 0,01, défaut 1 : Douglas-Peucker à tolérance diagonale × 0,06 × (1 − niveau)², recalculé depuis le tracé d'origine ; indisponible en mode miroir | [V] T1 `ToolEditorToolbar.tsx` l. 314-335 ; `lib/svg.ts` l. 144-151 ; `ToolEditor.tsx` l. 317-337 |
| Magnétisme des sommets | « Snap » sur une grille de 5 mm par défaut, réglable de 0,5 à 42 mm par pas de 0,5 ; **désactivé par défaut** ; quadrillage d'affichage tous les 10 mm | [V] T1 `lib/constants.ts` l. 3-5 ; `ToolEditorToolbar.tsx` l. 210-230 ; `ToolEditor.tsx` l. 69-72, 199 |
| Photo en fond | photo d'origine sous le contour, opacité 0,1 à 1 (défaut 0,45), qui suit rotations et retournements | [V] T1 `ToolEditor.tsx` l. 63, 929-950 |
| Zoom | molette, 0,5× à 20× ; déplacement au clic du milieu ou Espace + glisser ; bouton « Fit » | [V] T1 `ToolEditor.tsx` l. 233, 595, 953-972 |
| Informations affichées | nombre de sommets, nombre de découpes, dimensions de la boîte englobante en mm | [V] T1 `ToolEditor.tsx` l. 921-925 |

### 2.4 Jeu, profondeur, chanfrein

| Point | Constat | Statut |
|---|---|---|
| Jeu (« Clearance ») | **global au bin**, 0 à 5 mm par pas de 0,1, **défaut 1,0 mm** (l'API accepte 0 à 10) ; pas de jeu par outil | [V] T1 `BinConfigurator.tsx` l. 246-255 ; `binDefaults.ts` l. 20 ; `schemas.py` l. 148, 206-211 |
| Calcul du jeu | `buffer` Shapely à joints en onglet (`join_style=2`), appliqué **après** le lissage pour que l'empreinte imprimée soit l'aperçu grossi d'exactement le jeu | [V] T1 `polygon_scaler.py` l. 181, 237-249 ; `docs/gotchas.md` l. 14-16 |
| Profondeur globale (« Cutout Depth ») | 5 mm au maximum du bin, pas 0,25, **défaut 20 mm** ; maximum = hauteur × 7 − 4,75 (socle) − 2 (fond) mm, soit 7,25 mm à 2 U, 14,25 mm à 3 U, 21,25 mm à 4 U ; à 1 U il ne reste que 0,25 mm | [V] T1 `BinConfigurator.tsx` l. 13-18, 231-244 ; `binDefaults.ts` l. 19 ; `docs/usage/bin-configuration.md` l. 12, 21-25 |
| Profondeur par outil | champ « Depth » dans la barre de l'éditeur de bin quand un outil est sélectionné ; vide = profondeur globale ; bouton × pour y revenir | [V] T1 `BinEditorToolbar.tsx` l. 18-74, 209-221 |
| Profondeur par découpe | même champ pour chaque découpe ou prise des doigts sélectionnée dans le bin ; repli sur la profondeur de l'outil, puis du bin | [V] T1 `BinEditorToolbar.tsx` l. 304-316 ; `stl_generator_manifold.py` l. 986-987 |
| Profil en escalier | aucun : une empreinte est une seule extrusion à fond plat. Un palier ne s'obtient qu'en ajoutant une découpe d'une autre profondeur | [V] T1 `stl_generator_manifold.py` l. 852-857 ; palier par découpe [I] |
| Chanfrein d'entrée (« Cutout Chamfer ») | global, 0 à 3 mm par pas de 0,1, **défaut 0** (l'API accepte 0 à 5) ; s'applique aux empreintes et aux découpes ; limité à la profondeur − 1 mm | [V] T1 `BinConfigurator.tsx` l. 257-266 ; `schemas.py` l. 227-232 ; `stl_generator_manifold.py` l. 909, 930 |
| Débordement | une empreinte qui sort du bin est rognée à l'intérieur des parois (retrait = max(épaisseur de paroi, 2,6 mm du rebord d'empilage)) | [V] T1 `stl_generator_manifold.py` l. 787-802, 837 |

### 2.5 Prise des doigts et découpes ajoutées

Les découpes s'ajoutent dans l'**éditeur d'outil** : elles appartiennent à l'outil et le suivent dans tous les bins [V T1 `types/index.ts` l. 15-25, 161-166].

| Type (menu « Cutout ») | Taille par défaut | Forme 3D | Statut |
|---|---|---|---|
| « Finger hole » | rayon 15 mm (Ø 30 mm) | **sphère** centrée à max(dessus du bin, fond de l'empreinte + rayon) : une cuvette | [V] T1 `ToolEditor.tsx` l. 461 ; `stl_generator_manifold.py` l. 989-997 |
| « Circle (sphere) » | rayon 10 mm | même sphère | [V] T1 `ToolEditor.tsx` l. 462 |
| « Cylinder (flat) » | rayon 10 mm | cylindre à fond plat | [V] T1 `ToolEditor.tsx` l. 463 ; `stl_generator_manifold.py` l. 998-1003 |
| « Square » | côté 20 mm | pavé | [V] T1 `ToolEditor.tsx` l. 464 |
| « Rectangle » | 30 × 20 mm | pavé | [V] T1 `ToolEditor.tsx` l. 465 |
| « Filleted rectangle » | 30 × 20 mm | pavé à fond arrondi, rayon = min(largeur / 3, profondeur / 2), non réglable | [V] T1 `ToolEditor.tsx` l. 466 ; `lib/cutouts.ts` l. 23-25 |

| Point | Constat | Statut |
|---|---|---|
| Placement | **manuel** : on choisit le type puis on clique sur le canevas ; aucun placement automatique | [V] T1 `ToolEditor.tsx` l. 471-488, 581-592 |
| Nombre | illimité par outil | [V] T1 `ToolEditor.tsx` l. 484 |
| Déplacement, taille | glisser pour déplacer ; poignées pour redimensionner ; taille minimale 1 mm | [V] T1 `lib/cutouts.ts` l. 5, 35-68 |
| Rotation | poignée de rotation sur les découpes rectangulaires | [V] T1 `docs/usage/tool-editor.md` l. 31 ; `ToolEditor.tsx` l. 570-579 |
| Suppression | sélectionner puis « Delete » | [V] T1 `ToolEditorToolbar.tsx` l. 356-366 |
| Dans l'éditeur de bin | une découpe se sélectionne pour régler sa profondeur, mais ne se déplace pas | [V] T1 `BinEditor.tsx` l. 497-500 |

### 2.6 Symétrie, rotation, retournement

| Point | Constat | Statut |
|---|---|---|
| Miroir (« Mirror ») | reporte une moitié du contour sur l'autre, puis garde les éditions symétriques : glisser un sommet déplace son jumeau, ajouter ou retirer un point agit des deux côtés, une découpe posée est dupliquée en miroir | [V] T1 `ToolEditorToolbar.tsx` l. 232-268 ; `ToolEditor.tsx` l. 296-368, 471-488, 626-637 |
| Axe | vertical par défaut, passant par le centroïde ; bascule vertical / horizontal ; bouton pour changer la moitié gardée ; l'axe se déplace à la souris | [V] T1 `ToolEditor.tsx` l. 339-368, 683-684, 772-775 |
| Robustesse | sur un tracé bruité qui recoupe l'axe plusieurs fois, garde le plus long arc entre deux points de l'axe ; échoue avec un message si l'axe ne coupe pas le contour | [V] T1 `lib/symmetry.ts` l. 100-135, 146-181 |
| Découpes en miroir | celles du côté gardé sont dupliquées, celles à moins de 0,5 mm de l'axe sont centrées dessus, celles du côté écarté sont supprimées | [V] T1 `lib/symmetry.ts` l. 31, 183-201 |
| Limites | les trous intérieurs ne sont pas symétrisés ; le mode n'est pas enregistré (seul le polygone symétrisé l'est) | [V] T1 `lib/symmetry.ts` l. 158-164 ; `ToolEditor.tsx` l. 73-75 |
| Retournement | « Flip horizontally / vertically » : miroir de tout l'outil (contour, trous, découpes, photo) autour du centroïde | [V] T1 `ToolEditorToolbar.tsx` l. 181-194 ; `ToolEditor.tsx` l. 409-439 |
| Rotation dans l'éditeur d'outil | ± 90° ; rotation libre par une poignée près du centroïde ; « Auto » : angle qui minimise la boîte englobante (`cv2.minAreaRect` sur l'enveloppe convexe, côté serveur) | [V] T1 `ToolEditorToolbar.tsx` l. 167-205 ; `ToolEditor.tsx` l. 441-456 ; `backend/app/services/geometry.py` l. 12-26 |
| Rotation dans le bin | poignée de rotation libre sur l'outil sélectionné ; pas de saisie d'angle ni de crans | [V] T1 `BinEditor.tsx` l. 177-195, 319-354 |

### 2.7 Placement dans le bin

| Point | Constat | Statut |
|---|---|---|
| Ajout | clic sur un outil dans la bande de la bibliothèque (filtrée sur le projet courant) ; l'outil est **centré dans le bin** et la grille grandit si besoin | [V] T1 `ToolBrowser.tsx` l. 182, 235 ; `app/bins/[id]/page.tsx` l. 316-358 |
| Disposition automatique | aucune : ni emboîtement ni rangement des outils. Deux outils ajoutés se superposent au centre | [V] T1 `app/bins/[id]/page.tsx` l. 341-347 |
| Déplacement | glisser-déposer libre | [V] T1 `BinEditor.tsx` l. 155-172, 294-318 |
| Magnétisme | « Snap » du centre de l'outil sur une grille de 5 mm (0,5 à 42, pas 0,5), désactivé par défaut ; pas de guides d'alignement entre outils | [V] T1 `BinEditor.tsx` l. 70-71, 299-300 ; `BinEditorToolbar.tsx` l. 154-172 |
| « Recentre » | recentre l'ensemble des outils dans le bin | [V] T1 `BinEditor.tsx` l. 115-133 |
| Taille automatique (« Auto-size grid ») | **activée par défaut** : cellules = arrondi supérieur de (étendue des outils + 2 × (paroi + jeu + 0,25 mm)) / 42 ; pas de 0,5 si le socle est en demi-grille ; les outils sont recentrés quand la grille change | [V] T1 `app/bins/[id]/page.tsx` l. 76-99, 262-294 ; `lib/constants.ts` l. 21-29 |
| Collisions | aucune détection ni alerte : des empreintes qui se chevauchent sont simplement réunies | [V] T1 absence dans `BinEditor*.tsx` ; `stl_generator_manifold.py` l. 862-864 |
| Espacement minimal | aucun réglage | [V] T1 absence dans `BinConfigurator.tsx` |
| Lissage par outil | bascule « Accurate / Smooth » et curseur dans la barre du bin | [V] T1 `BinEditorToolbar.tsx` l. 185-208 |
| Réutilisation | un outil de la bibliothèque se pose dans autant de bins qu'on veut ; « Edit » ouvre l'éditeur d'outil | [V] T1 `docs/usage/tool-library.md` l. 19-21 ; `BinEditorToolbar.tsx` l. 222-230 |

### 2.8 Le bin

| Réglage | Bornes | Défaut | Statut |
|---|---|---|---|
| Largeur, profondeur (« Grid Width / Depth ») | 1 à 25 cellules par axe, pas 0,5, 100 cellules au plus | 2 × 2 | [V] T1 `BinConfigurator.tsx` l. 184-216 ; `lib/constants.ts` l. 13-15 |
| Hauteur | 1 à 20 U | 4 U | [V] T1 `BinConfigurator.tsx` l. 218-229 |
| Épaisseur de paroi | champ `wall_thickness`, 0,4 à 5 mm côté API, 1,6 mm par défaut ; **aucun curseur** dans le panneau à ce commit | [V] T1 `schemas.py` l. 146, 234-239 ; absence dans `BinConfigurator.tsx` |
| Socle en demi-grille (« Half-grid base ») | pieds de 21 mm ; désactive les aimants | non | [V] T1 `BinConfigurator.tsx` l. 269-286 |
| Logements d'aimants (« Magnet holes ») | Ø 3 à 10 mm (pas 0,5), profondeur 1 à 5 mm (pas 0,1) ; 4 par cellule à ± 13 mm du centre | **oui**, Ø 6 × 2,4 mm | [V] T1 `BinConfigurator.tsx` l. 275-306 ; `stl_generator_manifold.py` l. 629-703 |
| « Corners only » | aimants aux 4 coins extérieurs du bin seulement | non | [V] T1 `BinConfigurator.tsx` l. 307-312 |
| Rebord d'empilage (« Stacking lip ») | oui / non ; ajoute 4,4 mm | **oui** | [V] T1 `BinConfigurator.tsx` l. 315-327 ; `docs/stl-generation.md` l. 50 |
| « Raise Lip » | 0 à 10 U (API 0 à 20) : la paroi et le rebord montent au-dessus de la face du bin, pour qu'un outil qui dépasse ne gêne pas le bin empilé | 0 | [V] T1 `BinConfigurator.tsx` l. 330-338 ; `schemas.py` l. 192-197 |
| « Partial Bins » | matrice de cellules à désactiver ; « Connect base » garde une plaque de 5,8 mm sous les cellules désactivées ; « Retain outer wall » garde la paroi du tour | non | [V] T1 `BinConfigurator.tsx` l. 395-430 ; `docs/stl-generation.md` l. 72-97 |
| Plateau (« Bed Size ») | 150 à 500 mm | 256 mm | [V] T1 `BinConfigurator.tsx` l. 374-383 ; `lib/settings.ts` l. 8-11 |
| Vis | aucun trou de vis | — | [V] T1 absence dans `schemas.py` et `BinConfigurator.tsx` |

| Point | Constat | Statut |
|---|---|---|
| Découpe pour le plateau | automatique si (largeur + profondeur) / √2 dépasse le plateau (test de tenue en diagonale) ; coupes planes sur les lignes de la grille, au pas de 21 mm ; **aucun connecteur** entre pièces | [V] T1 `stl_generator_manifold.py` l. 1541-1560, 1583, 1647 ; `docs/stl-generation.md` l. 137-143 |
| Pièces disjointes | un bin partiel dont les cellules gardées ne se touchent pas sort en un STL par îlot | [V] T1 `docs/stl-generation.md` l. 99-104 |
| Cotes affichées | largeur, profondeur et hauteur totale du bin en mm | [V] T1 `app/bins/[id]/page.tsx` l. 484-491 |
| Valeurs par défaut | « Save as default » (navigateur, `localStorage`) et défauts par projet (serveur) ; « Reset » revient aux valeurs d'usine | [V] T1 `lib/binDefaults.ts` l. 52-73 ; `docs/usage/bin-configuration.md` l. 50-58 |

### 2.9 Texte gravé

| Point | Constat | Statut |
|---|---|---|
| Pose | outil « Text », clic sur le canevas, saisie, Entrée ; double-clic pour rééditer ; glisser pour déplacer ; poignée de rotation | [V] T1 `docs/usage/bin-layout.md` l. 27-41 |
| Réglages | texte ; taille 1 à 50 mm (défaut 5) ; profondeur ou relief 0,1 à 5 mm (défaut 0,5) ; « Emboss » (relief, défaut) ou « Recess » (gravé) | [V] T1 `BinEditorToolbar.tsx` l. 244-286 ; `BinEditor.tsx` l. 418-427 |
| Support | sur la face du bin, ou sur le fond d'une empreinte si le centre du texte est dedans ; un texte ne passe pas de l'un à l'autre en le glissant | [V] T1 `stl_generator_manifold.py` l. 1199-1262 ; `BinEditor.tsx` l. 360-363 |
| Police | une seule, celle du serveur (Arial, sinon Liberation Sans, FreeSans, DejaVu Sans) ; pas de choix | [V] T1 `stl_generator_manifold.py` l. 1116-1130 |
| Deux couleurs | un texte en relief forme un corps à part dans le 3MF | [V] T1 `docs/stl-generation.md` l. 147-149 |

### 2.10 Insert de contraste

| Point | Constat | Statut |
|---|---|---|
| « Contrast Insert » | génère un STL séparé à imprimer dans une autre couleur et à poser au fond des empreintes ; l'empreinte est approfondie de l'épaisseur de l'insert | [V] T1 `BinConfigurator.tsx` l. 341-346 ; `stl_generator_manifold.py` l. 543-550 |
| Réglages | épaisseur 0,5 à 10 mm (défaut 1,0) ; ajustement « Insert Fit » 0 à 1 mm (défaut 0,2) | [V] T1 `BinConfigurator.tsx` l. 349-369 |

### 2.11 Bibliothèque, projets, plans de tiroir

| Point | Constat | Statut |
|---|---|---|
| Bibliothèque d'outils | grille de vignettes ; recherche par nom, tri par date ou alphabétique, renommage, suppression ; indique le projet et si l'outil est déjà posé dans un bin | [V] T1 `docs/usage/tool-library.md` l. 3-17 |
| Projets | conteneur nommé d'outils et de bins ; statut (actif, prêt à imprimer, imprimé, archivé) ; création d'un bin depuis les outils cochés ; réglages de bin par défaut du projet ; contrôle de cohérence et réparation des liens | [V] T1 `docs/usage/projects.md` l. 3-82 |
| Plans de tiroir | plusieurs par projet ; taille du tiroir en cellules (1 à 40, pas 0,5) ; on y glisse les bins, rotation par 90°, duplication, couleurs ; « Auto arrange » range les **bins** du plus grand au plus petit ; alertes de chevauchement et de sortie du tiroir ; vue 2D et vue 3D des bins réels | [V] T1 `docs/usage/projects.md` l. 88-127 |

### 2.12 Export et aperçu 3D

| Point | Constat | Statut |
|---|---|---|
| Formats du bin | STL ; ZIP d'un STL par pièce quand le bin est découpé ; 3MF **seulement** s'il y a un texte en relief ; STL de l'insert de contraste | [V] T1 `app/bins/[id]/page.tsx` l. 516-551 ; `docs/usage/exporting.md` l. 7-21 |
| Format de l'outil | SVG du contour en mm (trous compris, lissage appliqué) | [V] T1 `routes.py` l. 1595-1645 |
| Absents | pas de STEP, pas de DXF, pas de PDF | [V] T1 aucune occurrence dans `backend/app` ni `frontend/src` |
| Aperçu 3D | à droite du canevas ; recalculé par le serveur 1 s après chaque changement ; vues Home, Top, Front, Right, Fit ; rendu plein ou arêtes ; pièces découpées en couleurs écartées ; insert en orange | [V] T1 `app/bins/[id]/page.tsx` l. 247-256 ; `BinPreview3D.tsx` l. 16-18 ; `docs/usage/bin-layout.md` l. 51-65 |
| Conservation | les exports sont supprimés du serveur après 24 h et régénérés à la demande | [V] T1 `docs/stl-generation.md` l. 24-42 |

### 2.13 Annuler, raccourcis, comptes, tarifs

| Point | Constat | Statut |
|---|---|---|
| Annuler / refaire | Ctrl+Z et Ctrl+Maj+Z, 50 pas ; présent dans l'éditeur d'outil et dans l'éditeur de polygones du détourage ; **absent de l'éditeur de bin** dans le code, alors que `docs/usage/keyboard-shortcuts.md` l. 5-6 l'annonce | [V] T1 `lib/constants.ts` l. 6 ; `useHistory` n'est importé que par `ToolEditor.tsx` et `PolygonEditor.tsx` |
| Enregistrement | automatique (150 ms après un changement dans l'éditeur de bin) | [V] T1 `app/bins/[id]/page.tsx` l. 225-238 |
| Raccourcis | Échap, Entrée, Espace (déplacer la vue), molette (zoom) ; dans un plan de tiroir : R, D, Suppr | [V] T1 `docs/usage/keyboard-shortcuts.md` ; `docs/usage/projects.md` l. 103-105 |
| Interface | thème clair ou sombre, visite guidée, bulles d'aide, mise en page adaptée au mobile | [V] T1 `docs/features.md` l. 132-138 ; T2 `/changelog` (17 février 2026) |
| Comptes (auto-hébergé) | compte administrateur créé à la première visite ; modes `native`, `proxy`, `open` ; double authentification | [V] T1 `README.md` l. 58-60, 76-80 |
| Tarifs (hébergé) | Free 0 € : 10 tracés à vie + 1 par mois, 3 outils, 2 bins. Pro 4,99 €/mois (54,99 €/an) : 30 tracés par mois, 50 outils, 25 bins. Workshop 9,99 €/mois (109,99 €/an) : 100 tracés par mois, 200 outils, 200 bins. Tous les plans : détourage par IA, STL et 3MF | [V] T2 `/pricing`, `/docs/plans-and-limits` |
| Ce qui compte | un tracé = une photo détourée ; rééditer, créer des bins et exporter n'en consomment pas | [V] T2 `/docs/plans-and-limits` |
| Promesse | aucune fonctionnalité réservée aux abonnés : le service hébergé ne limite que des quantités | [V] T1 `CONSTITUTION.md` l. 20-24 |

### 2.14 Écarts relevés entre la doc et le code

| Point | Constat | Statut |
|---|---|---|
| « Finger hole (15mm default) » | c'est un **rayon** de 15 mm, donc Ø 30 mm | [V] T1 `docs/features.md` l. 39 contre `ToolEditor.tsx` l. 461 |
| « Drag-and-drop tools from library into bin » | l'ajout se fait au clic | [V] T1 `docs/features.md` l. 69 contre `ToolBrowser.tsx` l. 182 |
| « adjustable wall thickness » | annoncé sur l'accueil hébergé et au changelog du 6 mars 2026 ; pas de réglage dans le panneau du dépôt à ce commit | [V] T2 `/` contre T1 `BinConfigurator.tsx` |
| « configurable fillet radius » | changelog du 15 juin 2026 ; dans le dépôt le rayon est calculé, non réglable | [V] T2 `/changelog` contre T1 `lib/cutouts.ts` l. 23-25 |
| Service hébergé | je n'ai pas vérifié que `tracefinity.net` tourne au commit lu : ces écarts peuvent venir d'une version différente | [I] |

---

## 3. Tooltrace

### 3.1 Le service `tooltrace.ai` (T8, T8j)

#### Nature et périmètre

| Point | Constat | Statut |
|---|---|---|
| Éditeur | finalREV, atelier d'usinage à Berkeley (Californie) | [V] T8 `/about` |
| Sorties | deux modes, bascule « Type » : **Foam** (mousse Kaizen / shadowbox à découper) et **Gridfinity** ; les tracés sont conservés en changeant de mode. Le mode par défaut dans le code est `foam` | [V] T8 `/how-to` « Gridfinity vs Foam » ; T8j `2328` @112951 (`insert_type … : "foam"`) |
| Où se fait le calcul | détourage par appels au serveur (« Failed to segment with points ») ; CAO **dans le navigateur**, dans un Web Worker, avec replicad / OpenCascade (composant `ThreeReplicadGeometry`, `blobSTEP`, `blobSTL`) ; la doc dit « Files are generated securely on your device » | [V] T8j `2328` @18536-19575, @76048 ; `8615` ; `5880` ; T8 `/how-to` « Download Files ». Détourage côté serveur [I] |
| Unités | bascule mm / pouces | [V] T8j `2328` @115769-116022 |
| Navigateur | Chrome recommandé ; fonctionne sur mobile, interface pensée pour l'ordinateur | [V] T8 `/how-to` (« Getting Started », FAQ « Can I use Tooltrace on mobile? ») |

#### Photo → contour

| Point | Constat | Statut |
|---|---|---|
| Dépôt de la photo | glisser-déposer, sélecteur de fichier, ou caméra de l'appareil (« Take a Photo ») ; une seule image ; HEIC converti ; image réduite à 2048 px en JPEG | [V] T8j `app/designer/page` @1193-10059 ; `2328` @47655-48111, module `41752` |
| Feuille de référence | **Letter ou A4** seulement | [V] T8 `/how-to` « Paper Selection » ; T8j `2328` @159044-159214 |
| Échelle | on **clique sur la feuille** : elle est détourée et ses coins surlignés ; « Reset Paper Selection » pour recommencer. Aucune poignée de coin à glisser n'est documentée | [V] T8 `/how-to` « Paper Selection », « Troubleshooting » ; absence de poignées [I] |
| Contrôle de la photo | fenêtre « Image might need improvement » (feuille présente, feuille entière dans le cadre), avec « Try Again » ou « Continue Anyway » | [V] T8j `2328` @20900-23144 |
| Détourage | « Add Tool » (touche N ou Entrée), puis clic sur l'outil ; clics supplémentaires pour inclure une zone ; Maj + clic pour exclure | [V] T8 `/how-to` « Selecting Tools », « Troubleshooting » |
| Deux qualités | « Fast » et « Detail » (« Detail mode may take up to 1 minute per tool ») ; 5 tracés Detail gratuits, illimités en Pro | [V] T8j `2328` @27021, @152866-156348 ; T8 FAQ « What is Detail mode? » |
| Modèle | le code enregistre `segmentation_model: "sam3"` et met l'image à l'échelle 1008 px (`samScale`) | [V] T8j `2328` @84314, module `41752` (@183946) ; que le serveur fasse tourner SAM 3 [I] |
| Détection automatique | des masques arrivés sans clic donnent chacun un contour en mode Fast (« auto-detected tool ») | [V] T8j `2328` @85175 ; quand cela se déclenche [I] |
| Sans photo | « blank canvas » : un dessin sans image, pour les formes simples | [V] T8j `2328` @52745-53264 |
| Conseils officiels | papier de couleur (vert, bleu, orange) ; photo de loin au zoom optique, puis recadrée, contre la parallaxe | [V] T8 `/how-to` « Taking Photos », « Pro Tips » |
| Précision annoncée | « typically accurate within 1-2mm » | [V] T8 FAQ (affirmation de l'éditeur) |
| Gabarit de contrôle | PDF « size-check » : une page par outil à l'échelle 1, avec deux règles (3 pouces et 10 cm) pour vérifier que l'imprimante n'a pas mis à l'échelle ; demandé avant toute commande d'impression | [V] T8 `/how-to` « Size-Check PDF » |

#### Empreintes : contour, lissage, édition manuelle

| Point | Constat | Statut |
|---|---|---|
| Nature du contour | **courbes de Bézier cubiques** ajustées sur le tracé (erreur maximale 0,6 en mode Fast, 0,1 en mode Detail, dans l'unité du contour, le mm), envoyées telles quelles au noyau CAO (`bezierCurveTo`) | [V] T8j `5379` (fonction `s`, `maxError:"enhanced"===t.mode?.1:.6`) ; `5880` (fonction `s`) ; unité mm [I] |
| Réglage de lissage | aucun curseur exposé | [V] T8j absence dans `2328` @110500-127500 |
| Édition manuelle (« Fine Tune ») | points de contrôle répartis sur le contour, 1 tous les 5 mm de périmètre, de 12 à 80 ; glisser un point déforme le contour avec une atténuation douce jusqu'aux points voisins ; l'image de l'outil s'affiche en fond (« tool ghost image ») ; « Reset » ; « Done Fine Tuning » | [V] T8j `7010` @16338, @31428-31556 ; `5379` (fonction `m` : `Math.min(80,Math.max(12,Math.round(i/5)))`, fonction `d`) |
| Ajout ou retrait de sommets | non : on déplace des points de contrôle, on n'en ajoute pas un par un. La doc parle de cliquer l'outil pour « add more control points » | [V] T8j `5379` ; T8 `/how-to` « Troubleshooting » ; portée exacte [I] |
| Retracer | « Regenerate Outline » ; les ajustements de points sont réappliqués au nouveau tracé | [V] T8j `2328` @149657, @55233-55286 |
| Trous intérieurs | non gérés : un contour est une boucle unique | [V] T8j `5880` (fonction `s`) |

#### Jeu, profondeur

| Point | Constat | Statut |
|---|---|---|
| Jeu (« Offset ») | **global**, 4 crans sans valeur libre : None, Small **1,5 mm**, Medium **3 mm** (défaut, « Recommended for most tools »), Large **4,5 mm**. La doc donne 0 mm pour None ; le code applique 0,1 mm | [V] T8 `/how-to` « Offset Distance » ; T8j `2328` @114826 (`{label:"None",value:.1}`), @113423 (`offset_distance_mm … :3`) |
| Calcul du jeu | Clipper, joints en onglet (`jtMiter`) | [V] T8j `5379` (fonction `F`) |
| Profondeur globale (« Pocket Depth ») | une valeur pour tout le dessin, saisie libre > 0 ; **défaut 20 mm** (`thickness_mm … : 20`) ; le même champ sert d'épaisseur de mousse (« Foam Thickness ») | [V] T8j `2328` @112629, @116417-116985 |
| Profondeur par outil | en mode Gridfinity, champ « Pocket Depth » sur la carte de l'outil, étiquette « Default » tant qu'il n'est pas modifié, bouton de retour à la valeur globale ; le bin prend la hauteur de l'outil le plus profond ; le panneau dit combien d'outils ont une valeur propre | [V] T8 `/how-to` « Pocket Depth » ; T8j `2328` @145223-146312, @117804 |
| Exclus de la profondeur par outil | cercles, rectangles, texte et prises des doigts suivent la profondeur globale ; pas de profondeur par outil en mousse | [V] T8 `/how-to` « Pocket Depth » ; T8j `5880` (fonction `a`) |
| « Pocket Offset » | épaisseur ajoutée sous les empreintes (Gridfinity), défaut 0 | [V] T8j `2328` @116985 ; `5880` (`Q=1.415+F`) |
| Fond sous l'empreinte | 1,415 mm + « Pocket Offset », au-dessus du pied de 4,75 mm | [V] T8j `5880` (`Q=1.415+F`, `translateZ(-4.75)`) |
| Hauteur affichée | « total print height » = profondeur + Pocket Offset + 5 mm (rebord, s'il est gardé) + 6,4 mm ; convertie en U par (hauteur − 4,4) / 7. Soit 31,4 mm (3,9 U) aux valeurs par défaut | [V] T8j `2328` modules `93369` (`uC`, `q0`) |
| Profil en escalier, chanfrein | aucun : extrusion droite à fond plat, sans chanfrein d'entrée | [V] T8j `5880` (branches `outline`, `circle`, `rectangle`) |
| Fond de contraste | chaque empreinte reçoit au fond une plaque de 0,5 mm, corps distinct (« insert ») exporté à part du bin pour l'imprimer dans une autre couleur | [V] T8j `5880` (fonction `ei`, `createPrintableStlBlobs` → `{tray, inserts}`) |

#### Prise des doigts

| Point | Constat | Statut |
|---|---|---|
| Outil | « Finger Notch », gratuit ; on **clique et on glisse** sur le canevas (« Click and drag ») | [V] T8j `7010` @1134, @56385 |
| Forme | rond si on ne glisse pas, sinon **oblong** (rectangle à bouts ronds) de la longueur glissée ; largeur = diamètre réglé ; l'angle s'aligne sur un multiple de 90° à moins de 10° | [V] T8j `7010` @19754 (fonction `ew`), @26246 ; `5379` (fonction `a`) |
| Diamètre | « Finger Pocket ⌀ », **défaut 20 mm**, le même pour toutes les prises du dessin ; le changer est une option Pro | [V] T8 `/how-to` « Custom Sizes » ; T8j `2328` modules `9678` (`yo=20`), @119988 |
| Profondeur | « Depth », défaut = profondeur de l'empreinte − 3,5 mm ; bornée de 1 mm à profondeur + Pocket Offset ; option Pro, Gridfinity seulement | [V] T8j `2328` modules `9678` (`uw`), @120371-120799 |
| Forme 3D | extrusion dont l'arête du fond est arrondie par un congé de 8 mm | [V] T8j `5880` (fonction `b` : `.fillet(8,…)`) |
| Placement | manuel, nombre libre ; aucun placement automatique | [V] T8j `7010` ; absence d'automatisme [I] |
| Erreur connue | deux prises qui se recoupent font échouer l'export (« Overlapping Finger Pockets ») | [V] T8 `/how-to` « CAD Export Geometry Errors » |

#### Symétrie, rotation

| Point | Constat | Statut |
|---|---|---|
| « Enforce Symmetry » | interrupteur par outil (« Mirror the outline for symmetrical tools ») | [V] T8 `/how-to` « Tool-Specific Settings » ; T8j `2328` @144079 |
| Fonctionnement | l'outil porte un axe (`symmetry_axis` x ou y, et sa position) ; le contour grossi du jeu est coupé à l'axe, la moitié qui a le plus de points est gardée et recopiée en miroir ; exige exactement 2 croisements de l'axe, sinon repli sans symétrie (« Symmetry could not be enforced ») | [V] T8j `5379` (fonctions `O`, `G`, `C`) ; `2328` @74202-74248 |
| Choix de l'axe | aucun réglage d'axe dans la carte de l'outil : il vient avec le tracé | [V] T8j `2328` @143293-146312 ; calcul de l'axe côté serveur [I] |
| Édition en symétrie | un point de contrôle déplacé entraîne son jumeau | [V] T8j `5379` (fonction `N`) |
| Retournement | aucune commande « flip » trouvée | [V] T8j absence dans `2328` et `7010` |
| Rotation | champ « Angle (°) » par pas de 5 sur la carte de l'outil ; poignée de rotation sur le canevas, qui s'aligne sur un multiple de 90° à moins de 5° | [V] T8j `2328` @144483 ; `7010` (cas `rotate`) ; `5379` (fonction `s`) |

#### Placement

| Point | Constat | Statut |
|---|---|---|
| Position de départ | les outils gardent la position qu'ils ont sur la photo (`position_px`), à laquelle s'ajoute le déplacement de l'utilisateur (`transformation`) | [V] T8j `5379` (fonction `F`) |
| Déplacement | glisser-déposer sur le canevas | [V] T8j `7010` (cas `move`) |
| Magnétisme | guides d'alignement sur les centres et les bords des autres outils, à moins de **2 mm** ; Maj maintenue le désactive | [V] T8j `5379` (fonction `u`, `thresholdMm … :2`) ; `7010` @59327 |
| Disposition automatique | aucune commande d'emboîtement ou de rangement trouvée ; la doc dit seulement de pivoter les outils pour les serrer | [V] T8j absence dans `2328`, `7010` ; T8 `/how-to` « Pro Tips » |
| Taille automatique | le panneau entoure les outils avec une marge ; en Gridfinity, cellules = arrondi supérieur de (étendue + 2 × 2,5 mm) / cellule | [V] T8j `2328` module `93369` (`hh`, `r=2.5`) ; `5379` (fonction `V`, marge 0,15) ; quelle étendue est passée [I] |
| Taille imposée | « Customize Overall Size » : « Grid Length » et « Grid Width » en cellules entières ; « Custom Foam Size » en mousse | [V] T8j `2328` @117896-119214 |
| « Recenter Panel » | recentre le panneau ; le bouton clignote quand des outils en sortent | [V] T8j `7010` @3116 |
| Collisions | pas d'alerte en direct trouvée ; l'export échoue si des contours se touchent (« Tools Too Close Together ») | [V] T8 `/how-to` ; T8j `2328` @30173-31182 |
| Dupliquer, supprimer | « Duplicate » et « Delete » par outil | [V] T8 `/how-to` ; T8j `2328` @141497-141671 |
| Importer | « Import Tools » : reprendre des outils tracés dans un autre dessin (Pro) | [V] T8 `/how-to` « Import Tools » ; T8j `2328` @135302-135544 |

#### Le bin Gridfinity

| Réglage | Bornes | Défaut | Statut |
|---|---|---|---|
| Taille | automatique, ou cellules entières ≥ 1 | automatique | [V] T8j `2328` @118727-119214 |
| Pied | profil standard 0,8 / 1,8 / 2,15 mm (4,75 mm), un par cellule ; empreinte au sol = cellules × cellule − 0,5 mm, coins de rayon 4 mm | toujours | [V] T8j `5880` (fonctions `h`, `f`, `z`) |
| Rebord d'empilage (« Lip Design ») | « Default » (profil de 5 mm) ou « None » (Pro, « flush fit ») | Default | [V] T8j `2328` @123908-124249 ; `5880` (fonction `y`) |
| Aimants (« Base magnets ») | « None », « Corner » (4 aux coins du bin), « Full » (4 par cellule, à ± 13 mm) ; option Pro | None | [V] T8j `2328` @124362-124727 ; `5880` (branches `corners`, `full`) |
| Taille des aimants | « Magnet Diameter », « Magnet height », saisie libre, Pro | Ø 6,5 × 2,0 mm | [V] T8j `2328` @113202, @124811-125139 (`3.25`, `2`) |
| Taille de cellule (« Grid Square Size ») | saisie libre, Pro | 42 mm | [V] T8 `/how-to` « Custom Sizes » ; T8j `2328` @121351 |
| « Puzzle Piece Mode » | retire les cellules inutilisées ; « Edit Cells » / « Reset Cells » pour forcer une cellule ; Pro | non | [V] T8j `2328` @123655 ; `7010` @8097-8724 |
| Découpe (« Split for Multiple Prints ») | plateau maximal en mm, saisie libre ; les pièces se rassemblent « edge-to-edge » : coupes droites, sans connecteur | non ; 240 × 240 mm | [V] T8j `2328` @121703-122815, module `70216` (`kY`) ; `5880` (`splitTiles`, `intersect`) |
| Vis | aucun trou de vis | — | [V] T8j absence dans `2328` @110500-127500 et `5880` |
| Couleurs | « Base » et « Inserts » (ou « Background » en mousse), pour l'aperçu et le 3MF | gris, jaune | [V] T8j `2328` @125457-125510 |

Contradiction à noter : la FAQ dit « Tooltrace generates custom inserts that fit within Gridfinity bins » [V T8], alors que le code produit un bin complet, avec pieds et rebord [V T8j `5880`, `includeSocket:!0`].

#### La mousse

| Point | Constat | Statut |
|---|---|---|
| Réglages | « Foam Thickness » (défaut 20 mm), « Custom Foam Size » avec « Foam Length » et « Foam Width », jeu, diamètre des prises des doigts | [V] T8j `2328` @116468-118357 |
| Modèle 3D | empreintes traversant toute l'épaisseur, sur une couche pleine de 6,35 mm | [V] T8j `5880` (fonction `foam`, `translateZ(6.35)`) |
| Exports annoncés | DXF, SVG, STEP | [V] T8 `/how-to` « Gridfinity vs Foam » |

#### Formes simples et texte (Pro)

| Point | Constat | Statut |
|---|---|---|
| Formes | « Circle », « Square », « Rectangle », « Rounded Rectangle », tracées en cliquant-glissant, au pas de 1 mm (0,05 pouce) ; poignées de taille, de rotation et de rayon de coin ; creusées à la profondeur globale | [V] T8j `7010` @1192-1436, cas `resize`, `corner-radius` ; `5379` (`PL`) |
| Gomme | « Erase Shape », « Clear All Shapes » | [V] T8j `7010` @2456-2744 |
| Texte | « Text » : zone tracée puis saisie ; police Archivo grasse, hauteur des lettres = hauteur de la zone ; **en relief de 1 mm** sur la face du bin ou de la mousse, corps séparé ; avertissement « Text shapes may increase 3D preview and export generation times » | [V] T8j `7010` @57070-57962 ; `5880` (branche `text`, `extrude(1)`, `archivo-bold.ttf`) |
| Texte gravé en creux | non | [V] T8j `5880` |

#### Export, aperçu, historique

| Point | Constat | Statut |
|---|---|---|
| Formats | STL, 3MF, STEP, DXF, SVG, PDF « size-check », PDF « poster » ; Gridfinity : STL, 3MF, STEP ; mousse : DXF, SVG, STEP | [V] T8 `/how-to` « Exporting Files » ; T8j `2328` @58028 |
| 3MF | corps séparés avec un extrudeur par corps et un profil Bambu Lab A1 | [V] T8j `2259` @18342-22292 |
| STL imprimables | bin et fonds de contraste séparés ; une série par pièce découpée (`-piece-01-of-NN-`) | [V] T8j `5880` (`createPrintablePieces`) ; `2328` module `97023` |
| Aperçu 3D | vue 3D du modèle exporté ; l'export attend la fin de son chargement | [V] T8j `8615` ; `2328` @58737-58773 |
| Annuler / refaire | boutons « Undo » et « Redo », 30 pas ; aucun raccourci Ctrl+Z trouvé | [V] T8j `7010` @10774-11143 ; `2328` @42972 (`slice(-30)`) ; absence de raccourci [I] |
| Raccourcis | N ou Entrée (ajouter un outil), Suppr ou Retour arrière (supprimer la sélection), Échap, Espace (déplacer la vue), F (« Fit to panel »), Maj (suspendre le magnétisme) | [V] T8 `/how-to` « Pro Tips » ; T8j `7010` @54460 |
| Erreurs d'export | fenêtre « Export Failed » avec causes (prises des doigts qui se recoupent, contour qui se recoupe, outils trop proches) et remèdes | [V] T8j `2328` @30173-34056 |

#### Autour : bibliothèque, communauté, comptes, tarifs

| Point | Constat | Statut |
|---|---|---|
| Bibliothèque | « My Library » : les dessins sont enregistrés automatiquement ; pas de bibliothèque d'outils à part, la réutilisation passe par « Import Tools » | [V] T8 `/how-to` « Pro Tips », « Import Tools » |
| Préférences | couleur, unité, type de sortie et format de feuille par défaut, dans le compte | [V] T8 `/how-to` « User Preferences » |
| Partage | lien en lecture seule (« Read-only — shared with you. You can view and download CAD ») | [V] T8j `app/designer/layout` @26714 |
| Communauté | bibliothèque publique de dessins : recherche, filtres par marque et par type, notes (précision, ergonomie, rareté), « Customize This Design » (copie personnelle), « Publish to Community » avec 1 à 4 photos et liens d'achat, revue automatique | [V] T8 `/how-to` « Community » |
| Commande d'impression | bouton « Buy », panier, catalogue de filaments, « My Orders » ; pas de remboursement pour erreur de taille | [V] T8 `/how-to` « Size-Check PDF » ; T8j `app/designer/layout` @5194-12309 |
| Comptes | connexion Google ; connexion exigée pour télécharger un fichier de la communauté ; « Sign in required for large exports » | [V] T8 `/how-to` ; T8j `2328` @10086-10959 ; un petit export sans compte est-il possible [I] |
| Tarifs | Free 0 $ : 3 dessins actifs. Pro 8 $/mois : dessins illimités, « Enhanced outline detection », formes simples, « Advanced tool tray configuration », assistance prioritaire | [V] T8 `/pricing` |
| Limite gratuite | « Free users can access their 3 most recent tooltraces » | [V] T8j `2328` @28726 |
| Options Pro | mode Detail au-delà de 5 tracés, formes et texte, import d'outils, aimants, diamètre et profondeur des prises des doigts, taille de cellule, sans rebord, Puzzle Piece Mode | [V] T8j `2328` @69300-73200 (liste `nm`) ; T8 `/how-to` « Pro Features » |
| Essai avant achat | toutes les options Pro s'utilisent en dessinant ; le contrôle n'a lieu qu'au téléchargement, où l'on peut les retirer | [V] T8 FAQ « What happens if I use Pro features as a free user? » |
| Formats gratuits | la page des tarifs cite « DXF, SVG, and STL downloads » ; la FAQ dit « export STL/3MF/STEP/DXF/SVG files with no watermarks » | [V] T8 `/pricing` contre T8 FAQ : les deux textes divergent |

### 3.2 La réimplémentation `tooltrace-designer` (T3)

Application React + Vite, entièrement dans le navigateur, sans compte ni serveur [V T3 `README.md` l. 3-8]. Quatre étapes : Photo, Set Scale, Trace Tools, Configure Layout [V `src/state/store.ts` l. 10-16].

| Point | Constat | Statut |
|---|---|---|
| Photo | glisser-déposer ou sélecteur ; photo de démonstration ; EXIF respecté ; réduite à 2400 px | [V] T3 `PhotoStep.tsx` l. 4-16, 47-61 |
| Feuille | A4, Letter, Legal, A3, A5, Tabloid, ou cotes libres ; case « Paper is landscape in the photo » | [V] T3 `lib/paper.ts` l. 6-14 ; `ScaleStep.tsx` l. 138-150 |
| Coins | détection automatique, 4 poignées à glisser, ou 4 clics ; « Auto-detect », « Clear corners » ; alerte si le rapport des côtés s'écarte de plus de 25 % du format | [V] T3 `ScaleStep.tsx` l. 36-47, 79-96, 158-166 |
| Détourage | clic par outil ; clics supplémentaires ; clic droit ou Maj + clic pour exclure ; moteur classique (défaut) ou SlimSAM ; « Tolerance » par outil, 0 à 1 par pas de 0,02, défaut 0,3 ; « Undo marker », « Clear » | [V] T3 `TraceStep.tsx` l. 41-58, 105-134 ; `store.ts` l. 128 |
| Contour | polygone : Douglas-Peucker à 1,2 px (0,3 mm à 4 px/mm) puis une passe de Chaikin ; trous **bouchés** ; aucune édition de sommets | [V] T3 `worker/imageWorker.ts` l. 48 ; `lib/contour.ts` l. 142-147 ; `segment/classical.ts` l. 53 |
| Jeu (« Offset (fit) ») | global : small **0,5 mm** (défaut), medium 1 mm, large 2 mm, ou « custom » 0 à 10 mm par pas de 0,1 ; Clipper à joints ronds. Valeurs choisies par l'auteur, non relevées sur le service | [V] T3 `lib/layout.ts` l. 24 ; `store.ts` l. 146-147 ; `LayoutStep.tsx` l. 142-149 ; `lib/offset.ts` l. 11-19 ; `REVERSE_ENGINEERING.md` l. 42-44 |
| Profondeur | globale, 3 à 60 mm par pas de 1, défaut 20 ; hauteur = profondeur + 10 mm de fond ; case « Snap height to 7 mm units » (cochée) ; ni profondeur par outil ni escalier | [V] T3 `LayoutStep.tsx` l. 153-157 ; `store.ts` l. 95 ; `lib/layout.ts` l. 18, 52-56 |
| Prise des doigts | « Add finger cutout » : un **cercle** posé d'un clic sur l'outil sélectionné, réuni à l'empreinte et creusé à la même profondeur ; « Finger Ø » ≥ 4 mm, défaut **20 mm** ; nombre libre ; suppression par une pastille | [V] T3 `LayoutStep.tsx` l. 126, 183, 197-201 ; `store.ts` l. 157, 184-186, 201-212 |
| Symétrie, retournement | aucun | [V] T3 absence dans `store.ts` et `LayoutStep.tsx` |
| Rotation | curseur 0 à 359° ; « Rotate 90° » ; touche R (15°, Maj pour −15°) | [V] T3 `LayoutStep.tsx` l. 100, 190-195 |
| Placement | glisser ; flèches (1 mm, 5 mm avec Maj) ; « Auto-arrange » : rangement par étagères sur les boîtes englobantes, du plus haut au plus bas ; « Spacing » défaut 4 mm ; « Auto-size bin to tools » (cochée) | [V] T3 `LayoutStep.tsx` l. 94-99, 125, 158, 182 ; `lib/layout.ts` l. 72-91 ; `store.ts` l. 155, 160-183 |
| Collisions | avertissements listés : outil rogné au bord (empreinte en rouge), « A overlaps B » ; paroi de 1,2 mm gardée au bord du bin | [V] T3 `lib/build.ts` l. 51-66 |
| Bin | 1 à 12 cellules par axe ; pied standard ; **pas de rebord d'empilage** ; aimants en option, Ø 6,5 × 2,4 mm, 4 par cellule ; ni vis ni découpe | [V] T3 `LayoutStep.tsx` l. 160-163 ; `lib/layout.ts` l. 14-15, 34 ; `export/mesh.ts` l. 136-168 |
| Mousse | largeur et hauteur de feuille (300 × 200 mm), épaisseur 30, profondeur 25, marge de bord 8, rayon de coin 5 mm | [V] T3 `store.ts` l. 96 ; `LayoutStep.tsx` l. 167-179 |
| Texte | aucun | [V] T3 `REVERSE_ENGINEERING.md` l. 55 |
| Aperçu 3D | onglet « 3D preview » du maillage exporté | [V] T3 `Preview3D.tsx` |
| Export | Gridfinity : STL, 3MF (plus SVG et DXF du plan) ; mousse : DXF, SVG (plus STL) ; contours en JSON ; nom de fichier libre ; pas de STEP | [V] T3 `LayoutStep.tsx` l. 208-227 ; `lib/build.ts` l. 122-146 |
| Persistance | aucune : pas de bibliothèque, pas de projets, rien d'enregistré entre deux visites ; pas d'annuler dans la mise en page | [V] T3 `store.ts` (zustand sans persistance) |

### 3.3 Ce que la réimplémentation couvre du service

| Fonction du service (T8, T8j) | Dans `tooltrace-designer` (T3) | Statut |
|---|---|---|
| Parcours photo → échelle → tracé → mise en page → export, modes mousse et Gridfinity | oui | [V] |
| Clic sur la feuille pour l'échelle | remplacé par 4 coins détectés et corrigeables, et plus de formats de feuille | [V] |
| Détourage par un modèle côté serveur, modes Fast et Detail | remplacé par un détourage classique local, SlimSAM en option | [V] |
| Contour en courbes de Bézier, points de contrôle « Fine Tune » | non : polygone non éditable | [V] |
| Jeu en 4 crans (0,1 / 1,5 / 3 / 4,5 mm) | crans différents (0,5 / 1 / 2 mm) et valeur libre | [V] |
| Profondeur par outil, Pocket Offset | non | [V] |
| Prise des doigts oblongue, profondeur propre, congé de 8 mm | cercle à la profondeur de l'empreinte | [V] |
| Symétrie | non | [V] |
| Guides d'alignement à 2 mm | non ; rangement automatique par étagères à la place, que le service n'a pas | [V] |
| Rebord d'empilage, cellule réglable, Puzzle Piece Mode, découpe pour le plateau | non | [V] |
| Aimants | oui, 4 par cellule seulement, Ø 6,5 × 2,4 mm (service : 2,0 mm) | [V] |
| Formes simples, texte | non | [V] |
| Fond de contraste de 0,5 mm, 3MF multicouleur | non : 3MF à un seul corps | [V] T3 `export/threemf.ts` l. 4-30 |
| STEP, PDF de contrôle | non | [V] |
| Annuler / refaire | non | [V] |
| Comptes, bibliothèque, import d'outils, communauté, commande d'impression | non | [V] T3 `REVERSE_ENGINEERING.md` l. 51-56 |
| « 10 mm base » sous l'empreinte | repris d'après des comptes rendus tiers ; le code du service donne 1,415 mm + Pocket Offset sur le pied de 4,75 mm, et un total « profondeur + 6,4 mm » | [V] T3 `lib/layout.ts` l. 17-18 contre T8j `5880` |

---

## 4. Tableau comparatif

« — » = absent. Les valeurs par défaut sont entre parenthèses. Statuts et références : voir les sections 2 et 3.

### 4.1 Empreintes

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Nature du contour | polygone | courbes de Bézier cubiques | polygone |
| Jeu autour de la forme | global, 0 à 5 mm, pas 0,1 (**1,0 mm**) | global, 4 crans : 0,1 / 1,5 / **3** / 4,5 mm | global, 0,5 / 1 / 2 mm ou libre 0 à 10 (**0,5 mm**) |
| Jeu par outil | — | — | — |
| Joints du décalage | onglet | onglet | ronds |
| Profondeur globale | 5 mm au maximum du bin, pas 0,25 (**20 mm**) | libre > 0 (**20 mm**) | 3 à 60 mm, pas 1 (**20 mm**) |
| Profondeur par outil | oui | oui (Gridfinity) | — |
| Profondeur par découpe ou prise | oui | une valeur pour toutes les prises (Pro) | — |
| Profil en escalier | — | — | — |
| Fond minimal sous l'empreinte | 2 mm au-dessus du socle | 1,415 mm + « Pocket Offset » (0) | 10 mm, pied compris |
| Chanfrein d'entrée | 0 à 3 mm (**0**) | — | — |
| Lissage | « Smooth » (défaut, niveau 0,5) ou « Accurate » ; curseur 0 à 1 | fixe : ajustement de courbes, 0,6 (Fast) ou 0,1 (Detail) | fixe : 0,3 mm puis une passe de Chaikin |
| Simplification réglable | curseur « Detail » | — | — |
| Édition manuelle | sommets : glisser, ajouter, retirer | points de contrôle à glisser (« Fine Tune ») | — |
| Magnétisme des sommets | grille 0,5 à 42 mm (5 mm, désactivé) | — | — |
| Trous intérieurs | gardés ; « Fill in » pour les boucher | — | bouchés |
| Photo en fond de l'éditeur | oui, opacité réglable | image de l'outil en fond pendant « Fine Tune » | case « Show photo » au tracé |
| Rognage au bord du bin | oui | non trouvé | oui, avec avertissement |

### 4.2 Prise des doigts

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Formes | sphère « Finger hole », sphère, cylindre, carré, rectangle, rectangle à fond arrondi | « Finger Notch » rond ou oblong ; fond à congé de 8 mm | cercle |
| Taille par défaut | **rayon 15 mm** (Ø 30) pour « Finger hole » ; rayon 10 ; côté 20 ; 30 × 20 mm | **Ø 20 mm** | **Ø 20 mm** |
| Taille réglable | par découpe, à la poignée, 1 mm au minimum | un diamètre pour tout le dessin (Pro) | un diamètre pour les prises à venir, ≥ 4 mm |
| Profondeur | celle de l'outil, ou propre à la découpe | profondeur − 3,5 mm, réglable (Pro) | celle de l'empreinte |
| Position | manuelle, dans l'éditeur d'outil | manuelle, cliquer-glisser | manuelle, un clic |
| Placement automatique | — | — | — |
| Nombre | libre | libre | libre |
| Rotation | poignée (formes rectangulaires) | angle du glissé, cran à 90° | — |

### 4.3 Symétrie, rotation, retournement

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Rendre le contour symétrique | « Mirror » : axe vertical ou horizontal, déplaçable, moitié gardée au choix | « Enforce Symmetry » : interrupteur, axe fourni avec le tracé | — |
| Édition qui reste symétrique | oui (sommets et découpes) | oui (points de contrôle) | — |
| Retourner l'outil | « Flip » horizontal ou vertical | — | — |
| Rotation de l'outil | ± 90°, libre à la poignée, « Auto » (boîte englobante minimale) | champ d'angle (pas 5°), poignée avec cran à 90° | curseur 0 à 359°, + 90°, touche R (15°) |

### 4.4 Placement dans le bin

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Position de départ | centre du bin | position sur la photo | rangement automatique |
| Glisser-déposer | oui | oui | oui |
| Déplacement au clavier | — | non trouvé | flèches, 1 ou 5 mm |
| Disposition automatique des outils | — | — | par étagères, sur les boîtes englobantes |
| Emboîtement (nesting) | — | — | — |
| Magnétisme | grille 0,5 à 42 mm (5 mm, désactivé) | guides sur centres et bords à 2 mm | — |
| Espacement minimal | — | — | « Spacing » (4 mm), pour le rangement automatique |
| Détection de collision | — | à l'export seulement (échec) | avertissement en direct |
| Taille du bin déduite des outils | oui (activée) | oui (par défaut) | oui (activée) |
| Recentrer | « Recentre » | « Recenter Panel » | — |
| Dupliquer un outil | l'outil de la bibliothèque se repose | « Duplicate » | — |

### 4.5 Le bin et les autres supports

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Taille | 1 à 25 cellules, pas 0,5, 100 au plus (2 × 2) | cellules entières ≥ 1 (automatique) | 1 à 12 (2 × 2) |
| Hauteur | 1 à 20 U (4 U) | déduite de la profondeur | profondeur + 10 mm, arrondie à 7 mm |
| Taille de cellule | 42 mm, ou socle en 21 mm | réglable (42 mm, Pro) | 42 mm |
| Rebord d'empilage | oui / non (**oui**) ; « Raise Lip » 0 à 10 U | « Default » ou « None » (**Default**) | — |
| Aimants | oui / non (**oui**), Ø 3 à 10 × 1 à 5 mm (6 × 2,4) ; tous ou coins | None / Corner / Full (**None**), Ø × hauteur libres (6,5 × 2,0), Pro | oui / non (**non**), 6,5 × 2,4 |
| Vis | — | — | — |
| Cellules retirées | « Partial Bins », avec « Connect base » et « Retain outer wall » | « Puzzle Piece Mode » (Pro) | — |
| Découpe pour le plateau | automatique, plateau 150 à 500 mm (256), test en diagonale | sur demande, plateau libre (240 × 240) | — |
| Connecteurs entre pièces | — | — | — |
| Fond de contraste | « Contrast Insert », 0,5 à 10 mm (1,0), ajustement 0 à 1 mm (0,2) | plaque de 0,5 mm au fond de chaque empreinte, toujours | — |
| Mousse | — (hors périmètre) | oui : épaisseur, longueur, largeur | oui : feuille, épaisseur, profondeur, marge, rayon de coin |

### 4.6 Autour

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Texte | relief ou creux ; taille 1 à 50 mm (5) ; profondeur 0,1 à 5 mm (0,5) ; rotation ; sur la face ou au fond d'une empreinte | relief de 1 mm, police Archivo grasse, Pro | — |
| Formes libres | les 6 découpes du § 2.5, liées à un outil | cercle, carré, rectangle, rectangle arrondi (Pro) | — |
| Bibliothèque d'outils | oui, réutilisables entre bins | — ; « Import Tools » entre dessins (Pro) | — |
| Projets | oui, avec statut et plans de tiroir | « My Library » de dessins | — |
| Communauté | — | oui : publier, télécharger, personnaliser, noter | — |
| STL | oui | oui | oui |
| 3MF | seulement avec un texte en relief | oui, un extrudeur par corps | oui, un corps |
| STEP | — | oui | — |
| SVG | contour d'un outil | plan complet | plan complet |
| DXF | — | oui | oui |
| PDF à l'échelle 1 | — | oui (« size-check », « poster ») | — |
| JSON des contours | — | « Download Outline JSON » dans le code (T8j `2328` @147087), affiché sous condition : sans doute réservé au débogage [I] | oui |
| Aperçu 3D | oui, recalculé par le serveur | oui, dans le navigateur | oui, dans le navigateur |
| Annuler / refaire | éditeur d'outil seulement, 50 pas | oui, 30 pas | — |
| Unités | mm | mm ou pouces | mm |
| Compte | oui (administrateur local, ou compte hébergé) | oui | aucun |
| Offre gratuite | hébergé : 10 tracés + 1 par mois, 3 outils, 2 bins ; auto-hébergé : sans limite | 3 dessins actifs ; options Pro bloquées au téléchargement | tout, sans limite |
| Offre payante | 4,99 € et 9,99 € par mois : quantités seulement | 8 $ par mois : quantités et fonctions | — |
| Commande d'impression | — | oui | — |

### 4.7 Photo → contour

| Fonctionnalité | Tracefinity | Tooltrace (service) | tooltrace-designer |
|---|---|---|---|
| Formats de feuille | A4, Letter, A3, Tabloid | A4, Letter | A4, Letter, Legal, A3, A5, Tabloid, libre |
| Mise à l'échelle | 4 coins détectés, poignées à glisser | clic sur la feuille | 4 coins détectés, poignées ou 4 clics |
| Formats d'image | JPG, PNG, WebP, HEIC | image, HEIC converti, caméra | image lisible par le navigateur |
| Désigner les outils | tous détourés d'un coup, puis choix | un clic par outil, clics d'inclusion, Maj + clic d'exclusion | un clic par outil, clic droit d'exclusion |
| Modèles | IS-Net (défaut), BiRefNet Lite, InSPyReNet, Gemini, Replicate, fal.ai | `sam3` dans le code ; modes Fast et Detail | classique (défaut), SlimSAM |
| Où | serveur | serveur [I] | navigateur |
| Contrôle de la photo | 3 avertissements (distance, feuille coupée, perspective) | fenêtre « Image might need improvement » | alerte sur le rapport des côtés |
| Masque fourni par l'utilisateur | oui | — | — |

---

## 5. Ce qui reste inconnu ou non vérifiable

- **Interface de Tooltrace à l'écran.** Je n'ai ni compte ni session : tout ce qui porte T8j est lu dans le code livré, pas observé. La page du dessin (barre d'export, bascule 2D / 3D, bouton « Buy », partage) est dans un fragment que la page `/designer` sans session ne charge pas ; ses libellés exacts ne sont pas vérifiés.
- **Serveur de Tooltrace.** Le modèle réellement exécuté (le code client dit `sam3`), ce que fait le mode Detail de plus que le mode Fast, la manière dont l'axe de symétrie est choisi, le déclenchement de la détection automatique et le rôle du service de « CAD conversion » (messages « CAD conversion failed », « Export too large — sign in and retry ») ne sont pas visibles côté client.
- **Tooltrace : absences.** Retournement, disposition automatique, alerte de collision en direct, raccourci Ctrl+Z : absents des fragments lus. Un fragment non téléchargé pourrait les contenir.
- **Tooltrace : valeurs en unités.** L'erreur maximale de l'ajustement de courbes (0,6 et 0,1) est supposée en mm d'après le contexte. L'étendue passée au calcul du nombre de cellules (avec ou sans la marge de 15 %) n'est pas tranchée.
- **Tooltrace : export sans compte.** Le message « Sign in required for large exports » laisse penser qu'un petit export passe sans connexion ; non essayé.
- **Tooltrace : formats gratuits.** La page des tarifs et la FAQ ne disent pas la même chose (STL, DXF, SVG contre STL, 3MF, STEP, DXF, SVG).
- **Tooltrace : pages absentes.** `/faq`, `/blog`, `/docs`, `/changelog`, `/terms`, `/privacy` répondent 404 ; les conditions et la politique de confidentialité sont hébergées chez un tiers (termsfeed.com) et n'ont pas été lues. Il n'y a pas de journal des versions public.
- **Tracefinity hébergé.** La version déployée sur `tracefinity.net` n'est pas identifiée : les écarts du § 2.14 (épaisseur de paroi, rayon de congé) peuvent être une différence de version ou une imprécision du changelog. Le modèle de détourage du service n'est pas nommé.
- **Tracefinity : captures d'écran.** Le dépôt contient `docs/screenshots/*.png` et une vidéo de démonstration ; je ne m'en suis pas servi comme source, tout vient du code et de la doc.
- **Comportement à l'impression.** Aucune de ces sources ne donne de mesure d'ajustement réel (jeu utile, profondeur utile, taille de prise confortable) : les valeurs par défaut relevées sont des choix d'éditeur, pas des résultats d'essai.
- **`neilyboy/tracefinity` et TraceToForge.** Seule leur existence est vérifiée (§ 1.1).

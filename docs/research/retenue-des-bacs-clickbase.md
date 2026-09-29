# Recherche : retenir les bacs dans la baseplate sans aimant (CLICKbase et alternatives)

> Date : 2026-09-30. Question : comment concevoir **notre propre** système qui retient les bacs dans la baseplate (le bac « s'enclenche » et ne se soulève pas tout seul), sans aimant, compatible avec les bacs Gridfinity standard et publiable sous MIT ? La spec (#1, Out of Scope) renvoie ce point à la v1.1, « avec un système maison ».
> Légende : **[V]** vérifié dans une source primaire (code, fiche, texte de loi ou de licence) · **[I]** inféré (calcul, raisonnement, lecture de code minifié), à confirmer.
> Ce document n'est pas un avis juridique.

**Avertissement de « salle blanche »** : la section 1.3 relève les cotes de CLICKbase telles qu'elles figurent dans le code d'extrabold. Quiconque dessinera notre système doit partir du **cahier des charges fonctionnel** de la section 4.1, qui ne dérive que du standard Gridfinity, de notre profil (ADR 0002) et de calculs, **pas** de la section 1.3. Voir 3.4.

## Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| P1 | Printables 982173 « CLICKbase: a no-magnet, latching Gridfinity baseplate… », John Hall (`JohnHall_303304`) | Description, licence, remixes parents et commentaires lus via l'API GraphQL publique `api.printables.com/graphql/` (le site renvoie 403 aux robots). Licence affichée `CC-BY-NC-SA`. 639 j'aime, 4 149 téléchargements, 22 makes au 2026-09-30. |
| P2 | Printables 452675 « Gridfinity Clickfinity Baseplate », NoWarrenty | Même méthode. `CC-BY-NC-SA`. Parent : 522164. |
| P3 | Printables 522164 « The OG Clickfinity - ClickPlates », jerrymk | `CC-BY-NC`, publiée le 2023-08-11. Renvoie à GitHub `jrymk/gridfinity-eco`. |
| P4 | GitHub `jrymk/gridfinity-eco`, commit `03fa402df24dc02401e7c6b9f391dc3f68be4d41` (2024-08-25) | Dossier `ClickPlates/` (STL + `ClickPlates.f3d`). **Aucune licence** déclarée (API GitHub : `license: null`). |
| P5 | Printables 1487592 « CLICKbase Refined », ZeroCtrl (2025-12-01) | `CC-BY-NC-SA`, parent : 982173. |
| P6 | Printables 719455 (James Boone), 506105 « Clickfinity Refined » (FPV Smitty), 1269410 (NoWarrenty) | Tous `CC-BY-NC-SA`. |
| P7 | Worker extrabold `https://www.extrabold.tools/_app/immutable/workers/jscad-worker-0D2CKfQH.js` (v0.5.21, téléchargé le 2026-09-30) | Constantes `zx`, fonctions `Ix`, `Rx`, `Cx`, `_x`, `h_`, `u_`, carte d'attribution, `determineLicense`. Voir aussi `docs/research/gridfinity-baseplate.md`, A.4. |
| P8 | Bundle page extrabold `…/nodes/4.Dh57k2Q7.js` | Table `pa` des licences (`CC_BY_NC_SA`, `allowsCommercial: false`). |
| P9 | GitHub `yawkat/GridFlock`, commit `962aad7929a4c123eb31d4eb4e5e7a0580223f5b` (2026-09-08) | Générateur OpenSCAD, `LICENSE` : « dual-licensed under MIT and CC-BY 4.0 ». `gridflock.scad` l. 33-62, 426-448, 643-659 ; README sections « Click Latch ». |
| P10 | Article Printables « Gridfinity latching baseplate without creep », yawkat, 2026-02-22 | Lu dans Chrome (onglet dédié). Test de fluage et mécanisme ClickGroove. |
| P11 | GitHub `IamMrCupp/clickfinity-openscad`, commit `ac6aaa72a35f106d83061c5cc5b7a50bdcafb297` (2026-08-18) | MIT. `README.md`, `lib/clickfinity.scad`. |
| P12 | Printables 413761 « Gridfinity Refined » (grizzie17, `CC-BY-SA`), 555917 « Re-Refined » (`CC-BY-SA`), 432024 « Pressure Fit Collection » (`CC-BY-NC-SA`), 478930 (GlennovitS 3D, `CC-BY`) | Descriptions via l'API. |
| P13 | MakerWorld 2359173 « Lockfinity », Astaroth, publié le 2026-02-06 | Lu dans Chrome. Licence : « Standard Digital File ». |
| P14 | CC BY-NC-SA 4.0, texte légal `https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt` | Sections citées ci-dessous. |
| P15 | 17 U.S.C. § 102(b) (`law.cornell.edu`) ; CJUE C-833/18 *Brompton Bicycle*, 11 juin 2020 (EUR-Lex `62018CJ0833`) ; règlement (CE) 6/2002, art. 8 (EUR-Lex `32002R0006`) | Idée/expression, forme technique, dessins et modèles. |
| P16 | `jeffbarr/gridfinity-catalog`, README (lu le 2026-09-30) | Catalogue communautaire : section des baseplates, articles. |

---

## Résumé

1. **CLICKbase n'est pas un verrou, c'est une pince à friction** [I, étayé par P2, P10] : le pied d'un bac standard s'élargit de bas en haut sans aucune contre-dépouille, donc aucune pièce de la baseplate ne peut l'accrocher. Des lames souples, précontraintes contre la bande verticale du pied, le serrent ; c'est le frottement qui retient. Le « clic » est un ressenti à l'insertion, pas un cran.
2. **Lignée** [V] : ClickPlates de jerrymk (2023, GitHub sans licence, Printables CC BY-NC) → Clickfinity de NoWarrenty (CC BY-NC-SA, 4 lames par cellule) → CLICKbase de John Hall (CC BY-NC-SA, 8 lames par cellule, bords lisses, clips) → CLICKbase Refined (CC BY-NC-SA). Toute la branche est non commerciale.
3. **CLICKbase dans extrabold** [V code] : il remplace le chanfrein bas de la poche par un vertical et taille 2 fentes par côté, qui isolent 8 lames de 11 mm tenues aux deux bouts. Chaque lame porte un ergot de 0,5 mm, avec une rampe à 45°. extrabold marque les fichiers CLICKbase comme CC BY-NC-SA.
4. **Le défaut connu est le fluage** [V P1, P2, P10] : les auteurs interdisent le PLA ; yawkat a montré qu'en PETG, à 55 °C, la lame d'une cellule occupée se déforme définitivement.
5. **Loi de conception** [I, calcul en 4.2] : à contrainte admissible donnée, le produit « force × course » d'un ressort en flexion est proportionnel au **volume de matière qui fléchit**. Une retenue forte, peu sensible aux écarts d'impression et peu sujette au fluage exige donc des lames longues. D'après notre modèle, les lames courtes de CLICKbase travaillent vers 35 MPa en PETG, près de la limite élastique.
6. **Licence** [V P14] : CC BY-NC-SA n'accorde de droits que « for NonCommercial purposes only » et impose la même licence aux adaptations. Une géométrie qui en dérive ne peut donc pas entrer dans un dépôt MIT, qui autorise la vente par des tiers, même si le mainteneur ne vend rien.
7. **L'idée est libre, pas l'expression** [V P15 ; I application] : « lame souple qui serre le pied » est une idée ou une méthode ; les fichiers, les cotes précises et le code d'extrabold relèvent de l'expression. On peut réimplémenter le principe en salle blanche.
8. **Il existe déjà du code réutilisable sous MIT** [V] : GridFlock (MIT + CC-BY, « clean-room implementation » selon son README), avec une lame en arc et la variante **ClickGroove**, sans contrainte permanente mais avec des bacs rainurés ; et clickfinity-openscad (MIT), dont la provenance est plus discutable.
9. **Pistes maison** (section 4) : (A) lame longue à deux appuis au milieu de chaque côté, (B) languette en porte-à-faux, (C) nervures d'écrasement sans ressort, pour servir de référence, (D) rainure d'accroche pour nos futurs bacs, sans fluage. Le premier prototype recommandé est A, comparé à C.
10. **Il manque une cible chiffrée** : la force d'arrachement voulue par cellule n'est fixée nulle part. On propose de la mesurer sur un CLICKbase imprimé pour un usage personnel de test, puis de valider au banc (section 5).

---

## 1. CLICKbase (John Hall)

### 1.1 Lignée et licences

| Modèle | Auteur | Date | Mécanisme (selon la fiche) | Licence | Source |
|---|---|---|---|---|---|
| ClickPlates (« OG Clickfinity ») | jerrymk / jrymk | dépôt GitHub créé le 2023-03-15 ; Printables le 2023-08-11 | « four small arms per square » ; « the layer lines interlock with each other » (cité par P2) | GitHub : **aucune** (tous droits réservés par défaut) ; Printables : **CC BY-NC** | P3, P4 [V] |
| Clickfinity | NoWarrenty | Printables 452675 (catalogue : 2023-05-16) | 4 lames par cellule ; queues d'aronde ; vis M2/M2,5 conseillées car la plaque plie au retrait d'un bac | **CC BY-NC-SA** | P2, P16 [V] |
| CLICKbase | John Hall | description éditée le 2024-10-02, fiche republiée le 2025-05-29 | « latching », sans aimant ; bords lisses ; clips `CLICK_Clip` pour relier les plaques ; 1 × 1 à 6 × 6, puis jusqu'à 8 × 8 | **CC BY-NC-SA** | P1 [V] |
| CLICKbase Refined | ZeroCtrl | 2025-12-01 | « print in place », Arachne obligatoire, « use a rugged or solid bin for the first use to break the detent clip free » | **CC BY-NC-SA** | P5 [V] |
| Intégration extrabold | extrabold.tools | v0.5.6 « CLICKbase Integration », 2025-11-17 | reproduit la géométrie de CLICKbase dans le générateur (constantes `zx`) | sortie marquée **CC BY-NC-SA 4.0** | P7, P8 [V] |

L'auteur décrit la lignée ainsi : Clickfinity « brilliantly introduced the concept of no-magnets bin retention, and was definitely the inspiration for CLICKbase » (John Hall, commentaire du 2025-04-17) [V P1].

### 1.2 Principe mécanique

- **Ce que disent les auteurs** [V] : CLICKbase « holds all Gridfinity compatible bins securely without using any magnets » (P1). Clickfinity dit que la tenue vient des lames et de l'imbrication des lignes de couche (P2). Tous interdisent le PLA à cause du fluage « under continuous loading » (P1, P2).
- **Ce que dit un auteur d'une variante** [V P10] : toutes ces baseplates utilisent « thin plastic walls that push against the bin, and the bending force provides enough friction to keep the bins in place ».
- **Pourquoi il ne peut pas y avoir de vrai cran avec un bac standard** [I, géométrie du standard] : de bas en haut, le pied d'un bac passe de 35,6 mm (chanfrein à 45° sur 0,8 mm) à 37,2 mm, reste vertical sur 1,8 mm, puis s'élargit à 41,5 mm (chanfrein à 45° sur 2,15 mm) (`gridfinity-baseplate.md`, B.2). La largeur ne diminue jamais en montant : aucune surface du pied ne regarde vers le haut. Toute force de contact exercée par la baseplate est donc horizontale (sur la bande verticale) ou dirigée vers le haut (sur les chanfreins). Seul le **frottement** s'oppose à l'arrachement, avec éventuellement l'accroche des lignes de couche. C'est exactement pour cela que ClickGroove (P9, P10) exige une rainure dans le bac.
- **Conséquence** : la retenue vaut à peu près μ × (somme des efforts normaux des lames), où μ est le coefficient de frottement entre les deux plastiques. Elle dépend directement de la précontrainte, donc des tolérances d'impression et du fluage [I].

### 1.3 Cotes relevées dans extrabold (v0.5.21)

Toutes [V code P7], sauf mention contraire. Repère : cellule de 42 mm centrée en 0, z = 0 sous la baseplate, profil ras d'extrabold (4,65 mm avant le rabot de 0,4 mm).

```
zx = { cutoutLength: 11, cutoutWidthOuter: .75, cutoutWidthInner: 10, cutoutDepth: 1.075,
       aditionLength: 3, aditionWidthOuter: .5, aditionWidthInner: 4, aditionDepth: 2.4 }
Px() = 42 / 4 = 10.5 ; positions des lames le long d'un côté : [-10.5, +10.5]
```

| Élément | Cote | Lecture |
|---|---|---|
| Nombre de lames | 2 par côté, 8 par cellule | `Rx`/`Cx` : positions ±10,5 si la cellule fait au moins environ 32 mm de côté, sinon une seule au centre. La fiche Printables dit « eight small arms per square » (résultat de recherche MakerWorld) [V code ; fiche : I]. |
| Fente derrière la lame (`D`, **ajoutée** à l'outil de poche, donc retirée de la baseplate) | trapèze de 11 mm (côté poche) / 10 mm (côté bord) × 0,75 mm, centré à 1,075 mm du bord de cellule, **sur toute la hauteur** | La fente va de 0,70 à 1,45 mm du bord de cellule. |
| Lame | entre la paroi de poche (retrait 2,15) et la fente (retrait 1,45) : **0,70 mm d'épaisseur**, 11 mm de long, **tenue aux deux bouts** | [I] poutre encastrée aux deux extrémités, fond libre (la baseplate est ouverte dessous). |
| Peau extérieure | 2,15 − 0,70 − 0,75 = **0,70 mm** jusqu'au bord de cellule | Entre deux cellules : 1,4 mm d'âme. Au bord de la baseplate : 0,7 mm [I]. |
| Ergot (`O`, **soustrait** de l'outil, donc matière gardée) | trapèze de 3 mm (face au bac) / 4 mm (contre la paroi ; 3,8 + tolérance) × **0,5 mm de saillie**, de z = 0 à z = 2,5 | Saillie vers l'intérieur de la poche, depuis la paroi verticale (retrait 2,15, demi-largeur 18,85) jusqu'à la demi-largeur 18,35. |
| Chanfrein de l'ergot (`chamfers`) | tronc de pyramide de 32,7 mm à z = 0 jusqu'à 42 mm à z = 4,65 (45°), ajouté à l'outil | [I] il taille le haut de l'ergot en rampe à 45° entre z = 2,0 et z = 2,5, et coïncide ailleurs avec la pente haute de la poche. C'est la rampe d'entrée. |
| Tolérance | seule la base extérieure de l'ergot s'élargit : `z = 4 + (tol − 0,2)` | La saillie de 0,5 mm ne dépend pas de la tolérance. |
| Arrêts | sans ergot sur les bords qui portent des clips de liaison (`c.top/bottom/left/right`) | |

Coupe d'un côté de poche (demi-largeur depuis le centre de cellule, profil ras, avant rabot) [I, reconstruit à partir du code] :

```
 z
4.65 |                         bord de cellule (21,0)
     |                    ____/ peau 0,70 (20,30 → 21,0)
3.2  |  pente 45° ...    /    |
2.5  |------------------+ fente 0,75 (19,55 → 20,30), toute hauteur
2.0  |  ergot  /|  lame |     |
     |  18,35 | | 0,70  |     |
0    |________|_|_______|_____|
       18,35  18,85   19,55  20,30  21,0   (mm depuis le centre)
       ergot  paroi   fente         bord
```

### 1.4 Ce qui change dans le profil

- **Chanfrein bas supprimé** [V code `_x`] : pour `clickbase`, l'anneau du bas de la poche garde la largeur de l'anneau du dessus (42 − 2 × 2,15 = 37,7 mm), au lieu de 36,3 mm. La paroi reste verticale au retrait de 2,15 mm **de z = 0 à z = 2,5**. Le chanfrein de 0,7 mm disparaît.
- **Pas de marche de 0,35 mm** : CLICKbase dérive du profil ras (4,65 mm, puis 4,25 mm après rabot) [V code].
- **Conséquence pour l'assise** [I] : sans chanfrein bas et sans marche, un bac standard descend jusqu'au fond du tiroir (comme avec le profil ras, ADR 0002). Il est centré par la symétrie des 8 lames précontraintes plutôt que par les pentes. La bande de contact de l'ergot, z ∈ [0,8 ; 2,0], correspond à la bande verticale du pied (z ∈ [0,8 ; 2,6] quand le bac repose sur le tiroir). L'interférence nominale vaut 0,5 − 0,25 = **0,25 mm par lame**.

### 1.5 Ordre de grandeur mécanique (modèle simple, [I])

On modélise une poutre encastrée aux deux bouts, chargée au centre : k = 16·E·h·t³/L³ et σmax = 12·E·δ·t/L². On prend une hauteur utile h ≈ 3,2 mm, t = 0,70 mm, L = 11 mm, une flèche δ = 0,25 mm et E ≈ 2 000 MPa pour le PETG (valeur de fiche technique usuelle, non sourcée ici).

| Matière | k par lame | Effort par lame | Contrainte max | Somme sur 8 lames |
|---|---|---|---|---|
| PETG (E ≈ 2 000 MPa) | ≈ 26 N/mm | ≈ 6,6 N | **≈ 35 MPa** | ≈ 53 N |
| PLA (E ≈ 3 300 MPa) | ≈ 44 N/mm | ≈ 11 N | **≈ 57 MPa** | ≈ 87 N |

Ce modèle surestime les efforts : les encastrements ne sont pas parfaits, l'âme de 1,4 mm fléchit aussi, l'ergot ne fait que 3 mm et les pièces réelles sont plus fines ou arrondies. Le point robuste est ailleurs : la contrainte s'approche de la limite élastique usuelle du PETG (≈ 50 MPa) et la dépasse en PLA. Cela explique les consignes des auteurs et le résultat du test de fluage (P10).

### 1.6 Retours d'utilisateurs

Tirés des 10 premiers commentaires renvoyés par l'API pour P1, P2 et P5 (échantillon partiel) et de l'article P10 [V] :

- **Positifs** : « BY FAR my favorite grid », pour les plaques qui se relient et l'absence d'aimants (Gary Price, 2025-02-19) ; « holds bins reasonably secure without needing magnets » (rxmd, 2024-12-21) ; « holds boxes sturdy » (Corn Guy, 2024-07-22, sur Clickfinity).
- **Impression** : premier couche en « hundreds of tiny perimeters » sous PrusaSlicer 2.9.3 (terablast, 2025-09-28). Contournement dans Orca : désactiver « Detect thin walls » et mettre une compensation XY des trous minime (Alex Flu, 2025-10-15). L'auteur doute qu'une buse de plus de 0,4 mm convienne ; un utilisateur a réussi en 0,6 (P1). Il imprime en PETG à 50 mm/s et trouve le résultat moins bon plus vite.
- **Serrage** : « they don't hold bins very tightly » sur CLICKbase Refined (lcthrock, 2026-06-25) ; l'auteur conseille la compensation XY des trous ou une matière plus rigide (P5). Le serrage dépend donc beaucoup de l'imprimante.
- **Rigidité** : sur Clickfinity, les plaques « may bend when you attempt to remove a bin », d'où le conseil de les visser (P2).
- **Fluage** [V P10] : baseplate à lames (GridFlock) en PETG, un bac dans une cellule, une autre vide, le tout chauffé vers 55 °C. La lame chargée se déforme au point de ne plus serrer, la lame libre reste intacte. À température ambiante, l'effet est plus lent mais attendu sur des années.

### 1.7 Licence de CLICKbase

- Printables affiche `CC-BY-NC-SA` [V P1] ; extrabold dit « Licensed under CC BY-NC-SA 4.0 » et applique `determineLicense` → CC BY-NC-SA 4.0 dès que le type CLICKbase est choisi (`allowsCommercial: false`) [V P7, P8]. extrabold joint aussi un fichier `LICENSE` au ZIP [V, `gridfinity-baseplate.md` A.3]. On ignore si extrabold a obtenu une autorisation particulière de John Hall [non vérifié].
- Les parents sont eux aussi non commerciaux (CC BY-NC, puis BY-NC-SA) [V P2, P3].

---

## 2. Autres systèmes de retenue sans aimant

| Système | Principe | Bacs standard ? | Licence | Source |
|---|---|---|---|---|
| **Clickfinity / ClickPlates** | 4 lames par cellule, friction et lignes de couche | oui | CC BY-NC-SA / CC BY-NC ; GitHub sans licence | P2, P3, P4 [V] |
| **CLICKbase / Refined** | 8 lames à deux appuis, ergot de 0,5 mm (1.3) | oui | CC BY-NC-SA | P1, P5 [V] |
| **GridFlock « Arc »** (`click_style = 0`) | tout le bas du profil de poche (hauteur 3 mm, épaisseur 1,6 mm) est bombé vers l'intérieur de 1 mm selon une logistique sur 30 mm, avec un mur arrière de 1 mm qui limite la course | oui (le README la dit « very susceptible to creep ») | **MIT + CC-BY 4.0** | P9 `gridflock.scad` l. 38-51, 643-659 [V] |
| **GridFlock « ClickGroove »** (`click_style = 1`, défaut) | languette de 10 mm, saillie 0,9 mm, à mi-hauteur de la bande verticale du pied, fente de 25 mm derrière ; avec un bac **rainuré**, la languette entre dans la rainure **sans contrainte permanente** | serre aussi les bacs standard, mais ceux-ci déforment la baseplate avec le temps | **MIT + CC-BY 4.0** | P9 l. 53-62, 435-448 ; P10 [V] |
| **clickfinity-openscad** (Aaron Cupp) | plaque « shallow » de 4 mm à fond de 1,2 mm ; languette en porte-à-faux sur toute la hauteur, 11 × 1,5 mm, qui pivote autour d'une charnière verticale ; ergot de 3,5 mm à l'extrémité libre, saillie de 0,6 mm ; affiche en console l'effort et la contrainte (cible < 30 MPa) | oui, mais la pente haute du pied dépasse de la plaque : le bac **n'est pas assis sur ses pentes** | **MIT** | P11 [V]. Provenance : « reverse-engineered from a public CLICKbase derivative (Printables 719455) — measured, then reimplemented » ; 719455 est CC BY-NC-SA [V P6]. Voir 3.5. |
| **Lockfinity** (Astaroth) | « verrous mécaniques à ressort », une seule pièce, libération par une traction forte ; PETG recommandé contre le fluage | oui (selon la fiche) | « Standard Digital File » (licence MakerWorld, pas une licence libre) | P13 [V] ; géométrie non analysée |
| **Gridfinity Refined** (grizzie17) | aimants à emboîter ; retenue **sans aimant** par une vis moletée M15 × 1,5 qui traverse le bac | **non** : il faut un bac Refined percé | CC BY-SA | P12 [V] |
| **Re-Refined** (Roboter32) | aimants de 5 × 2, vis, vis moletée ou écrou M3 bas | partiellement | CC BY-SA | P12 [V] |
| **Pressure Fit Collection** (Software2) | aimants emmanchés en force (sans colle) ; ce n'est pas une retenue sans aimant | — | CC BY-NC-SA | P12 [V] |
| **Baseplate « lite »** (GlennovitS 3D) | cadre léger sans aimant ; pas de retenue, le bac est simplement posé | oui | CC BY | P12 [V] |
| **« Lite » de gridfinity-rebuilt** | c'est un **bac** léger, pas une baseplate | — | MIT | `gridfinity-baseplate.md` B.5 [V] |
| **Vis des bacs** (standard) | vis M3 passant par les trous prévus sous le bac | oui si le bac a des trous de vis ; fixation permanente | — | `gridfinity-baseplate.md` B.4 [V] |
| **Poids, adhésif, tapis antidérapant** | ils retiennent la **baseplate**, pas le bac | — | — | P1, P2 [V] |

Autres entrées du catalogue P16 non analysées : « Gridfinity base SnapClip System » (MakerWorld 1034973), « ClickBase StackPlate » (Printables 1342921, dérivé de CLICKbase d'après son nom), « Bookfinity with Latches ». Le README de GridFlock cite « GridPlates (DMCA'd) » ; un générateur tiers parle d'une réclamation DMCA « fallacious » déposée par l'auteur de GRIPS (résultat de recherche Perplexing Labs, non vérifié). Retenons seulement qu'**un projet libre de ce domaine a déjà été retiré sur réclamation** : la traçabilité de notre provenance compte.

---

## 3. Analyse juridique prudente (pas un avis juridique)

### 3.1 Pourquoi une géométrie CC BY-NC-SA ne peut pas entrer dans un dépôt MIT

Textes [V P14] :

- Concession (2(a)(1)) : droit de « reproduce and Share the Licensed Material […] for NonCommercial purposes only » et de « produce, reproduce, and Share Adapted Material for NonCommercial purposes only ». La licence est aussi « non-sublicensable ».
- NonCommercial (1(k)) : « not primarily intended for or directed towards commercial advantage or monetary compensation ».
- ShareAlike (3(b)(1) et (3)) : la licence de l'adaptateur « must be a Creative Commons license with the same License Elements […] or a BY-NC-SA Compatible License », et « You may not offer or impose any additional or different terms […] that restrict exercise of the rights granted under the Adapter's License ».
- Adapted Material (1(a)) : un matériau « derived from or based upon the Licensed Material » et modifié « in a manner requiring permission ».

Raisonnement [I] :

1. **On ne peut pas donner un droit qu'on n'a pas.** La licence MIT accorde à chacun le droit de « use, copy, modify, merge, publish, distribute, sublicense, and/or sell ». Si notre dépôt contenait une géométrie dérivée de CLICKbase, nous prétendrions accorder des droits commerciaux et un droit de sous-licence que John Hall ne nous a pas concédés. Que le mainteneur ne vende rien ne change rien : **ce sont les tiers** qui reçoivent la MIT et peuvent vendre des impressions, forker le site avec de la publicité, etc.
2. **ShareAlike impose la licence de sortie.** Une adaptation doit être publiée en BY-NC-SA, ce qui est incompatible avec la MIT : on ne peut ni relicencier, ni « mélanger » les deux dans un même composant.
3. **Les fichiers générés seraient eux aussi des adaptations.** extrabold marque ainsi ses sorties CLICKbase [V P7, P8]. Notre promesse « tout est MIT » (issue #1, story 68) ne tiendrait plus pour ces fichiers.
4. **Notre propre usage serait déjà à la limite.** Le site affiche « Offrir un café » (spec). Qu'un don rende l'usage « commercial » au sens de 1(k) est discuté, mais le point 1 suffit à exclure l'intégration.
5. **Les brevets et les marques ne sont pas couverts** : « Patent and trademark rights are not licensed under this Public License » (2(b)(2)). La licence ne règle donc pas ces questions.

### 3.2 Ce qui relève de l'idée (libre) et ce qui relève de l'expression

- **Règle générale** [V P15] : aux États-Unis, « In no case does copyright protection […] extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery » (17 U.S.C. § 102(b)). Dans l'UE, la CJUE (*Brompton*, C-833/18, dispositif) protège un produit dont la forme est « at least in part, necessary to obtain a technical result » **seulement** s'il est une création intellectuelle originale. Selon ses points 24 à 27, une réalisation « dictated by technical considerations, rules or other constraints which have left no room for creative freedom » n'est pas originale, et quand l'expression est dictée par la fonction, l'idée et l'expression se confondent.
- **La licence le reconnaît** [V P14] : quand l'autorisation « is not necessary for any reason », l'usage « is not regulated by the license » (considérations pour le public ; voir aussi 2(a)(2)).
- **Libre (idée, méthode, fonction)** [I] : retenir un bac par des lames souples précontraintes ; placer une fente derrière une paroi pour la rendre souple ; mettre un ergot à rampe à 45° pour l'insertion ; appliquer le principe « pas d'aimant » ; relier des plaques par des clips ; compter les lames par cellule ; exiger du PETG. Les **cotes du standard Gridfinity** (42, 0,7/1,8/2,15, rayon 4) sont des faits d'interface (voir `gridfinity-baseplate.md`, « Licence Gridfinity »).
- **Expression, à ne pas reprendre** [I, par prudence] : les fichiers STL, 3MF, STEP et F3D de CLICKbase et de ses parents ; le **jeu de cotes propre à CLICKbase** (11 / 10 / 0,75 / 1,075 / 3 / 4 / 0,5 / 2,4 ; positions ±10,5 ; suppression du chanfrein bas ; ergot trapézoïdal), même si chaque cote prise seule est fonctionnelle, car la combinaison est un choix d'auteur ; le code d'extrabold (aucune licence libre de son code n'a été trouvée ; seules ses **sorties** non CLICKbase sont annoncées CC0, selon `gridfinity-baseplate.md`) ; les photos et descriptions ; le nom « CLICKbase », « Clickfinity » ou « CLICK_Clip ».
- **Zone grise** : il est probable (non vérifié en jurisprudence) qu'une petite lame de 0,7 mm × 11 mm n'ait pas assez d'originalité pour être protégée (Brompton, points 24 à 27). Mais le projet se veut réutilisable par tous sous MIT ; on ne parie pas sur cette zone grise et on la contourne par la salle blanche.

### 3.3 Autres droits à garder en tête

- **Dessins et modèles (UE)** [V P15 texte ; I application] : pas de protection pour les caractéristiques « solely dictated by its technical function » ni pour celles qui doivent être reproduites à l'identique pour s'interconnecter (art. 8(1) et 8(2) du règlement 6/2002). En revanche l'art. 8(3) protège les dessins qui permettent « the multiple assembly or connection of mutually interchangeable products within a modular system », ce qui décrit bien Gridfinity. Un dessin non enregistré dure 3 ans après sa divulgation dans l'UE. CLICKbase existe au moins depuis octobre 2024 [V P1], donc une éventuelle protection non enregistrée courrait jusque vers fin 2027 [I]. La nouveauté, le caractère individuel et le lieu de divulgation ne sont pas établis ; le texte a aussi été réformé en 2024 (non relu ici). À soumettre à un juriste si le sujet devient sensible. La réponse pratique reste une géométrie **visiblement différente**.
- **Brevets** : une recherche rapide n'a trouvé aucun brevet sur ces baseplates ; les brevets américains de rangement modulaire à loquets remontés (US 6 557 955, US 7 472 969) sont anciens et sans lien direct [I, recherche non exhaustive].
- **Marques** : n'utiliser ni « CLICKbase » ni « Clickfinity » comme nom de fonction ; nommer la nôtre en termes descriptifs (« retenue des bacs »).

### 3.4 Concevoir « en salle blanche » à l'échelle d'un petit projet

Une salle blanche classique sépare une équipe qui lit l'original et écrit une spec fonctionnelle, d'une autre qui implémente sans jamais voir l'original. Adaptation proportionnée [I] :

1. **Spec fonctionnelle à part** : la section 4.1 (entrées : standard Gridfinity, notre profil, contraintes d'impression, cible de force) sert de spec. Elle ne contient aucune cote de CLICKbase.
2. **Implémenteur « propre »** : l'agent ou la personne qui code la retenue ne lit **pas** la section 1.3 de ce document, ni le code d'extrabold, ni les fichiers CLICKbase. Lui donner la section 4 et l'ADR, pas ce fichier entier.
3. **Chaque cote est justifiée** par un calcul (4.2), une règle d'impression (multiples de ligne et de couche) ou un résultat de banc (section 5), consigné dans le dépôt : ADR + résultats de prototype. C'est la preuve de création indépendante.
4. **Une géométrie visiblement différente** : une seule lame longue par côté au lieu de deux lames de 11 mm, notre profil hybride avec son chanfrein bas **conservé**, un ergot de forme et de place différentes. La ressemblance d'idée est permise ; on évite la ressemblance de forme.
5. **Aucun import de fichier** (STL, STEP, F3D) de la lignée Clickfinity dans le dépôt, même dans `prototypes/`. Imprimer un CLICKbase pour mesurer sa **force d'arrachement** comme référence de performance est un usage personnel non commercial permis [I]. Ne pas en relever la géométrie.
6. **Attribution d'idée, pas de dérivation** : dans `ATTRIBUTIONS`, écrire par exemple « idée de la retenue par lames souples popularisée par jerrymk, NoWarrenty et John Hall ; aucune géométrie ni aucun fichier repris ». Éviter « basé sur CLICKbase ».

### 3.5 Ce qu'on peut réutiliser légalement

- **GridFlock** (MIT, ou CC-BY 4.0 au choix) [V P9] : on peut porter en TypeScript la lame en arc ou ClickGroove, en gardant la notice MIT « Copyright (c) 2026 Jonas Konrad ». Son auteur la dit « independent, open-source, clean-room implementation » [V]. C'est la voie la plus sûre juridiquement si l'on veut partir de code existant. Attention : le README avertit que l'arc est « very susceptible to creep ».
- **clickfinity-openscad** (MIT) [V P11] : utile pour sa **méthode** (calcul de la force et de la contrainte, tableau de réglage). Sa géométrie a toutefois été « measured » sur un dérivé CC BY-NC-SA. La MIT de l'auteur ne garantit pas que cette mesure ne constitue pas une adaptation [I]. À ne pas copier telle quelle.
- **gridfinity-rebuilt** (MIT) : déjà cité pour le profil ; il n'a pas de retenue sans aimant.

---

## 4. Pistes de conception maison

### 4.1 Cahier des charges fonctionnel (entrée de la salle blanche)

**Notre poche hybride** (ADR 0002), en retrait depuis le bord de cellule, avec z depuis le dessous de la baseplate [V ADR 0002] :

| z (mm) | Paroi de poche |
|---|---|
| 0 → 0,35 | verticale, retrait 2,85 (demi-ouverture 18,15) |
| 0,35 → 1,05 | 45°, retrait 2,85 → 2,15 |
| 1,05 → 2,85 | verticale, retrait 2,15 (demi-ouverture 18,85) |
| 2,85 → 4,60 | 45°, retrait 2,15 → 0,40, plat de 0,8 mm entre cellules (0,4 au bord) |

**Pied de bac standard assis** [I, calcul] : sa pente haute porte sur la pente haute de la poche, et le dessous du pied tombe **exactement à z = 0**. Son chanfrein bas (17,8 + z) coïncide aussi avec le chanfrein bas de la poche. Sa bande verticale (demi-largeur 18,6, z ∈ [0,8 ; 2,6]) laisse **0,25 mm de jeu** face à la paroi verticale, sur z ∈ [1,05 ; 2,6]. **C'est la seule zone de contact utilisable pour serrer** : 1,55 mm de haut.

**Matière disponible** [I] : muret entre deux cellules de 4,3 mm au niveau de la bande verticale (2,15 par cellule), mais **2,15 mm seulement** au bord de la grille quand il n'y a pas de marge. La baseplate est un cadre ouvert dessous (spec), donc une fente la traverse de part en part sans pont. Les vis sont aux intersections (ADR 0006) : garder les lames au **milieu des côtés**.

**Exigences** :
- R1. Tout bac standard entre et sort à la main sans outil ; il reste assis sur ses pentes (principe de l'ADR 0002).
- R2. Une force d'arrachement par cellule dans une plage cible **à fixer** (proposition de départ : 3 à 10 N, soit 0,3 à 1 kgf ; question ouverte Q1).
- R3. La force varie peu avec les écarts d'impression (±0,1 mm sur les parois fines) : **course de la lame δ ≥ 0,3 mm**, soit au moins trois fois l'erreur d'impression.
- R4. Faible fluage : contrainte maximale soutenue ≤ ≈ 15 MPa en PETG. C'est une règle d'ingénieur [I], environ 30 % de la limite élastique, à valider au banc.
- R5. Imprimable sans support, buse de 0,4 mm, en PETG par défaut. Épaisseurs en nombre entier de lignes (2 × `lw` = 0,8 mm) ; hauteurs de l'ergot sur des couches entières ; fente ≥ `lw` + 0,15 mm pour ne pas se refermer sur la première couche.
- R6. Maillage fermé, par briques de cellule (ADR 0004) ; les cellules de bord ont leur propre variante.
- R7. Désactivé par défaut (principe « économe » : pas de PETG imposé) ; réglage `retenue` dans le lien de partage.

### 4.2 La loi qui fixe les compromis [I, calcul]

Pour une poutre en flexion, avec sa répartition de moment la plus courante (porte-à-faux chargé au bout, ou poutre encastrée aux deux bouts chargée au centre), l'énergie stockée à la contrainte maximale σ vaut U = σ²·V / (18·E), où V est le volume de la poutre. Comme U = ½·F·δ :

**F · δ ≤ σ² · V / (9 · E)**

- À σ fixé pour limiter le fluage (R4) et à δ fixé pour tolérer l'impression (R3), **la force ne s'achète qu'avec du volume qui fléchit**, c'est-à-dire des lames plus longues ou plus hautes. L'épaisseur seule ne suffit pas : elle augmente la force mais aussi la contrainte.
- Exemple, PETG : viser 12,5 N d'effort normal par cellule (≈ 5 N d'arrachement si μ ≈ 0,4, valeur à mesurer) avec δ = 0,4 mm demande V ≈ 400 mm³ à 15 MPa, contre 144 mm³ à 25 MPa. Une paroi de 3,2 × 0,8 mm tout autour de la poche ne fait que ≈ 385 mm³. **La cible R4 et une retenue forte sont donc en tension** ; il faudra choisir sur banc.
- Les lames courtes et fines de CLICKbase font l'inverse : peu de volume, forte contrainte (≈ 35 MPa d'après 1.5), petite course (0,25 mm). La force est élevée mais sensible aux tolérances et au fluage, ce que confirment les retours 1.6.

Estimations pour h ≈ 3,2 mm et E ≈ 2 000 MPa (PETG) [I] :

| Forme | t × L (mm) | δ (mm) | Effort par lame | σmax |
|---|---|---|---|---|
| Deux appuis | 0,8 × 24 | 0,3 / 0,4 / 0,5 | 1,1 / 1,5 / 1,9 N | 10 / 13 / 17 MPa |
| Deux appuis | 1,2 × 24 | 0,4 | 5,1 N | 20 MPa |
| Porte-à-faux | 0,8 × 12 | 0,4 | 0,19 N | 7 MPa |
| Porte-à-faux | 1,2 × 10 | 0,4 | 1,1 N | 14 MPa |
| Porte-à-faux (ordre de grandeur de P11) | 1,5 × 11 | 0,6 | 2,4 N | 22 MPa |

### 4.3 Concept A : lame longue à deux appuis (candidat principal)

- **Principe** : sur chaque côté de poche, une seule lame de 20 à 28 mm, centrée, tenue à ses deux bouts. Une fente traversante la sépare du muret. La lame garde la paroi verticale du profil ; son centre porte un **ergot** (bosse) qui ne touche que la bande z ∈ [1,2 ; 2,4], avec une rampe à 45° dessous (imprimable) et dessus (rampe d'entrée). Le chanfrein bas et la marche de 0,35 mm du profil hybride sont **conservés** : l'assise sur les pentes reste celle de l'ADR 0002.
- **Cotes de départ** (issues de 4.1 et 4.2, à valider) : lame t = 0,8 (2 lignes), fente s = 0,55, peau ≥ 0,8 au bord de la grille (0,8 + 0,55 + 0,8 = 2,15), âme de 1,6 mm entre cellules ; saillie de l'ergot 0,55 à 0,75 mm (interférence δ = 0,3 à 0,5) ; ergot long de 6 à 10 mm. La fente limite la course (s > δ) et sert donc de butée anti-casse.
- **Compromis** : 4 lames par cellule, ≈ 1,5 à 2 N chacune → ≈ 6 à 8 N normal par cellule à 13 à 17 MPa. C'est une retenue modérée mais tolérante (δ ≥ 0,3). Pour plus de force : t = 1,0 ou 1,2 aux murets intérieurs (4,3 mm disponibles), au prix de la contrainte. Usure faible (ergot large, rampes douces). Matière : **moins** que sans retenue, puisque la fente retire du plastique ; le volume réel sera mesuré. Impression : parois verticales pleines, flexion dans le plan des couches (pas de délaminage), aucun pont.
- **Différences avec CLICKbase** : une lame par côté au lieu de deux, longueur plus que doublée, profil de poche inchangé, ergot limité à la bande verticale. La ressemblance reste « une fente derrière une paroi », qui est une idée (3.2).
- **Compatibilité** : profil hybride oui ; profil ras oui (la bande verticale va de z = 0,7 à 2,5 et le bac repose sur le tiroir) ; vis aux intersections sans conflit ; marge : si la marge colle au bord de la grille, la peau extérieure s'épaissit, ce qui est favorable.
- **Référence MIT** : l'arc de GridFlock est une variante « paroi bombée » de la même famille. On pourrait le porter plutôt que de concevoir A, avec les réglages de GridFlock (30 mm, 1 mm de bombé, 1,6 mm d'épaisseur).

### 4.4 Concept B : languette en porte-à-faux (charnière verticale)

- **Principe** : une languette de 10 à 14 mm, tenue à un seul bout, qui pivote autour d'une charnière verticale ; la fente entoure le bout libre. L'ergot se place au bout libre.
- **Compromis** : grande course pour peu de force. Pour atteindre ≈ 1 N par languette sans dépasser 15 MPa, il faut t ≈ 1,2 mm (4.2), impossible au bord de la grille sans marge (1,2 + 0,55 + 0,4 < 2 lignes de peau). Le concept ne convient donc qu'aux murets intérieurs ou exige une marge. Il use davantage la charnière (contrainte concentrée à la racine, congé nécessaire). Il tolère bien l'impression.
- **Quand le choisir** : si A se révèle trop raide ou trop sensible aux tolérances.

### 4.5 Concept C : nervures d'écrasement, sans ressort (référence bas coût)

- **Principe** : 2 à 3 nervures verticales par côté, de 0,3 à 0,4 mm de saillie et d'environ 1 ligne de large, sur la bande verticale. Le premier bac les écrase ou les rabote ; la retenue vient ensuite du frottement résiduel et des lignes de couche.
- **Compromis** : rien à régler, aucune fente, imprimable par n'importe quel trancheur, sans matière en plus. En revanche la force est faible et très variable, se perd à l'usure (chaque insertion rabote) et au fluage. Non réversible si l'on change de marque de bacs.
- **Rôle** : témoin de banc, pour mesurer ce qu'apporte vraiment un ressort (A ou B).

### 4.6 Concept D : rainure d'accroche pour nos futurs bacs (zéro fluage)

- **Principe** : c'est l'idée de ClickGroove (GridFlock, MIT). Quand nous aurons un générateur de bacs (spec, « futurs générateurs »), nous ajouterons au pied une **rainure** peu profonde dans la bande verticale. La lame du concept A y entre au repos, **sans flèche** : la contrainte n'existe qu'à l'insertion et au retrait, donc pas de fluage, même en PLA [V P10 pour ClickGroove]. Les bacs standard restent serrés par A comme avant.
- **Compromis** : c'est la seule vraie retenue positive, avec un effet de cran, mais elle demande des bacs maison. La rainure doit rester compatible avec toute baseplate standard (P10 affirme que c'est le cas pour ClickGroove).
- **Recommandation** : prévoir dès la conception de A que l'ergot et la bande de la future rainure soient cohérents (même hauteur et même longueur), pour que le passage à D ne change pas la baseplate.

### 4.7 Tableau comparatif [I]

| | A. Deux appuis | B. Porte-à-faux | C. Nervures | D. Rainure (bacs maison) |
|---|---|---|---|---|
| Bacs standard | oui | oui | oui | oui (retenue de A) |
| Force | moyenne, réglable | faible à moyenne | faible, instable | forte (cran) |
| Tolérance d'impression | bonne si δ ≥ 0,3 | très bonne | mauvaise | bonne |
| Fluage | modéré (≈ 13 à 17 MPa en PETG) | faible si t est grand | fort | nul au repos |
| Usure | faible | charnière | forte | faible |
| Bord de grille sans marge | oui (2,15 mm suffisent) | difficile | oui | oui |
| Complexité du moteur | fentes et ergot par brique | idem, asymétrique | nervures | côté bacs |
| Risque juridique | faible (idée), géométrie distincte | faible | nul | nul (MIT si l'on porte GridFlock, avec la notice) |

---

## 5. Ce qu'il faut prototyper et imprimer pour valider

1. **Prototype géométrique jetable** (`prototypes/retenue/`, manifold-3d) : générer A (et B) dans une brique de cellule, vérifier `NoError`, compter les triangles et mesurer le volume par rapport à la cellule nue.
2. **Kit de retenue** : une baseplate 1 × 4 (ou 2 × 2) qui met une variante par cellule, repérée par des encoches sur le bord extérieur. Par exemple A avec δ = 0,3 / 0,4 / 0,5, et C. À imprimer en **PETG et en PLA**, buse de 0,4, couches de 0,2, sous au moins deux trancheurs (PrusaSlicer et Orca ou Bambu Studio), pour vérifier les fentes, les parois fines (Arachne) et l'absence du « hundreds of tiny perimeters » vu sur CLICKbase (1.6).
3. **Bacs d'essai** : bacs gridfinity-rebuilt, bacs de Zack Freedman et quelques bacs communautaires, avec et sans trous d'aimant, 1 × 1 et 2 × 1, imprimés par au moins deux imprimantes, pour couvrir la dispersion.
4. **Mesures** (chiffres réels, principe du projet) :
   - force d'arrachement verticale par cellule, avec un peson ou une balance de cuisine et un crochet fixé dans un bac vide, sur 5 essais par variante ;
   - force d'insertion (même montage) ;
   - **référence** : même mesure sur un CLICKbase imprimé pour un usage personnel de test (3.4, point 5) et sur une cellule sans retenue ;
   - vérifier que l'assise ne bouge pas (jeu latéral nul, bac à plat).
5. **Fluage accéléré** (méthode de P10) : un bac dans une cellule, une cellule vide, 24 à 72 h à 50 °C (PLA) ou 55 °C (PETG), puis nouvelle mesure de la force. Et un essai à température ambiante : mesures à J0, J7, J30 et J90.
6. **Usure** : 100 cycles d'insertion et de retrait, puis nouvelle mesure.
7. **Décision** : consigner les résultats dans l'ADR, choisir les défauts (δ, t, L) et la plage du réglage, fixer la cible R2.

---

## Recommandations et questions ouvertes pour le mainteneur

### Recommandations

1. **Ne rien intégrer de CLICKbase** : aucun fichier, aucune cote de la section 1.3, aucun code d'extrabold, pas son nom. Cela vaut aussi pour `prototypes/`.
2. **Écrire un ADR « Retenue des bacs »** avant le code. Il consigne la provenance (salle blanche, 3.4), la loi F·δ ≤ σ²V/9E et le choix du concept.
3. **Prototyper A contre C**, avec CLICKbase comme simple référence de force. Si le temps presse, **porter l'arc de GridFlock** (MIT, notice conservée) plutôt que de reprendre quoi que ce soit de la lignée Clickfinity.
4. **Garder le profil hybride intact** : la retenue s'ajoute aux murets, elle ne supprime pas le chanfrein bas comme CLICKbase. On conserve l'assise sur les pentes (ADR 0002).
5. **Désactiver la retenue par défaut**, et quand on l'active, afficher « PETG ou ABS/ASA, pas de PLA » avec la raison (fluage). Montrer le volume réel mesuré sur le maillage.
6. **Préparer D** : quand viendra le générateur de bacs, ajouter une rainure optionnelle compatible avec notre ergot. C'est la seule voie sans fluage.
7. **Attribution** : citer l'idée (jerrymk, NoWarrenty, John Hall) et, si on la porte, GridFlock (notice MIT) dans `ATTRIBUTIONS`, sans écrire « basé sur CLICKbase ».

### Questions ouvertes

- **Q1. Force cible** : quelle force d'arrachement par cellule veut-on (proposition : 3 à 10 N) ? Elle fixe tout le dimensionnement (4.2).
- **Q2. Matière** : accepte-t-on une fonction qui exige du PETG ? Sinon, seul D (bacs rainurés) tient en PLA.
- **Q3. Porter GridFlock ou concevoir A ?** Le portage est plus rapide et juridiquement propre (MIT), mais on hérite d'une forme décrite comme sensible au fluage.
- **Q4. Demander à John Hall** une licence MIT ou une autorisation ? C'est peu coûteux et cela lèverait tout doute, mais ce n'est pas nécessaire si l'on reste en salle blanche.
- **Q5. Profil ras** : doit-on proposer la retenue aussi avec le profil ras (le calcul dit que c'est possible) ou seulement avec l'hybride ?
- **Q6. Glossaire** : ajouter à `CONTEXT.md` les termes **Retenue** (le système), **Lame** (la partie qui fléchit), **Ergot** (la bosse qui serre le pied), **Fente** (la découpe derrière la lame) ? « Bossage » est déjà exclu (réservé au rejet de « plot »).
- **Q7. Bord de grille sans marge** : avec seulement 2,15 mm de muret, accepte-t-on une peau de 0,8 mm (2 lignes), ou retire-t-on les lames des côtés extérieurs ?
- **Q8. Coefficient de frottement** PETG/PLA et PETG/PETG : il n'est pas sourcé ici (0,3 à 0,5 supposé). La mesure de 5.4 le remplacera.
- **Q9. Dessins et modèles UE** (art. 8(3), protection éventuelle de CLICKbase jusque vers fin 2027) : faut-il un avis juridique, ou la différence visible de géométrie (A) suffit-elle ?

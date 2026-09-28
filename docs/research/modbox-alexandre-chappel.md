# Recherche : système ModuBOX d'Alexandre Chappel (grille de 55 mm)

Date : 2026-09-28. Légende : **[V]** vérifié sur une source primaire ou mesuré sur un fichier ; **[I]** inféré ou tiré d'une source secondaire ; **[?]** inconnu.

Référence Gridfinity : `gridfinity-baseplate.md` §B.2–B.4 (pas de 42 mm, poche 0,7/1,8/2,15, pied 0,8/1,8/2,15, dessus 41,5).

---

## Résumé

- Le vrai nom est **ModuBOX** (écrit « ModuBOXES » au pluriel ; la communauté écrit aussi « ModuBox » et préfixe « [ALCH] »). Il s'agit d'un système de boîtes imprimées en 3D, **vendu** en fichiers STL sur alch.shop. Ce n'est pas un système open source. [V S1, S2]
- **Le pas de grille est bien de 55 × 55 mm**, et le shop le dit explicitement. L'hypothèse « ~55 mm » est donc confirmée. [V S2]
- Il y a 6 hauteurs, de **21 à 111 mm par pas de 18 mm** (1H = 21 mm, soit H = 18·n + 3). [V S2 pour les valeurs ; I pour la formule]
- **Le profil officiel de la « BaseGrid » n'a pas pu être mesuré.** Les fichiers d'Alexandre Chappel sont payants (la base grid seule coûte 1 $) et rien n'a été acheté. Aucune cote de profil n'est publiée en texte.
- Deux sources de géométrie restent mesurables. La première est la boîte **gratuite de 2020** de Chappel (ancêtre du système, CC BY-NC-SA). La seconde est une **base « compatible » de la communauté** (Pascal Lieverse, CC BY). Celle-ci montre un **pied par cellule en tronc de pyramide à 45°, haut de 4,5 mm**, et une rainure en V de 5 mm entre les cellules. Ce n'est pas le profil étagé 0,8/1,8/2,15 de Gridfinity. [V mesure ; I quant à la fidélité à l'original]
- ModuBOX et Gridfinity sont **incompatibles** (55 contre 42 mm, 18 contre 7 mm, profils différents). Le système « Assortment » de Chappel est officiellement cité comme **une des inspirations de Gridfinity**. [V S6, S7]

---

## 1. Nom, nature, licence, distribution

| Point | Constat | Statut / source |
|---|---|---|
| Nom | « ModuBOX » et variantes « ModuBOX Home » et « ModuBOX - ALEX » (pour les caissons IKEA Alex) | [V] S1 (menu du shop), S3 (vidéo « Download all the new ModuBOX files here: alch.shop/modubox ») |
| Nature | Boîtes de rangement imprimées (« Regular » et « Stackable », pleine grille ou demi-grille), plaques « BaseGrids » et « EdgeGrids » (pour remplir exactement un tiroir), plus des meubles : Wood Case V2, Printed Case, Assortment Cart, Work table, bloc-tiroirs 100 % imprimé | [V] S2 |
| Distribution | **Payante**, en fichiers STL et fichiers pré-tranchés Bambu Lab. Exemples : « Master set » 75 $, « All Box variations » 35 $, « ModuBOXES - All heights » 20 $, une hauteur seule 15 $, « base grid » 1 $ | [V] S1, S2 |
| Licence | Des **licences commerciales sont vendues à part** sous forme d'abonnement mensuel (par exemple 15 $/mois pour « All Box variations »). Les achats standard sont donc à usage non commercial. Le texte de licence des fichiers payants n'est pas visible sans achat. | [V] S4 ; [I] pour la portée exacte |
| Ancêtre gratuit | « Assortment system box » (février 2020), sur Thingiverse, licence **CC BY-NC-SA** et toujours gratuit. Tailles 1x1 à 2x6, pour des tiroirs en grille 6 × 6. | [V] S5 (page Thingiverse avec licence affichée, vidéo CHFK5sY8ToE) |
| Historique | Février 2020 : cabinet à tiroirs (boîtes gratuites). Octobre 2020 : « Even better assortment boxes » avec caisse (payant). Décembre 2025 : la vidéo « I Organised my Workshop with 3D Printing » lance les « new ModuBOX files ». | [V] S3, S8 |

---

## 2. Grille et hauteurs

| Grandeur | Valeur | Statut / source |
|---|---|---|
| Pas de grille | **55 × 55 mm** (« All the boxes are based on a grid size of 55mm x 55mm ») | [V] S2 (plusieurs fiches produit) |
| Demi-grille | Pas de 0,5 unité, « in 0.5 increments up to 7×7 », soit 27,5 mm | [V] S2 pour le texte ; [I] pour les 27,5 mm |
| Plage de tailles | 1x1 à 8x12 | [V] S2 |
| Hauteurs | 1H 21 · 2H 39 · 3H 57 · 4H 75 · 5H 93 · 6H 111 mm | [V] S2 ; image « 4H 75mm » ; capture Tinkercad « 57.00 » pour une boîte 3H (fiche « Blanks ») |
| Unité de hauteur | **18 mm**, avec un décalage de 3 mm (H = 18·n + 3) | [I] déduit des 6 valeurs |
| Versions « split » | 4H et 6H seulement, pour les petites imprimantes (pas de split pour les Stackable) | [V] S2 |
| Étiquette | « full-width label » et « reinforced back wall » | [V] S2 |
| Aimants | Ø 6 × 2 mm, cités dans la liste de matériel de la « Case V1 ». Rien n'indique qu'ils soient dans les boîtes ou la grille : probablement pour la caisse. | [V] S2 pour la mention ; [I] pour l'usage |
| Cotes extérieur/intérieur 55/54 | Données par Org Like a Pro (54 × 54 intérieur, 55 × 55 extérieur) | [I] source secondaire, peu fiable pour l'intérieur |

---

## 3. Profil : BaseGrid et pied des boîtes (priorité)

### 3.1 Ce que montrent les sources primaires (images du shop, sans cotes)

- **BaseGrid** (images « base grids.PNG » et « full and halfgrid.png ») : c'est une **grille ajourée**, pas une dalle. Des nervures fines tracent des cellules carrées de 55 mm, avec une **arête chanfreinée des deux côtés** de chaque nervure (profil en « toit »). Il n'y a pas de fond : les cellules sont vides. Le rebord extérieur est chanfreiné vers l'intérieur uniquement. [V image ; I pour l'interprétation de la forme]
- **Boîte Regular** (image « 4H with dimension ») : il y a un **léger retrait au pied**, visible comme une marche en bas. En haut, un rebord qui s'élargit légèrement forme une lèvre. [V image]
- **Boîte Stackable** (image « 4H stack ») : une lèvre haute reçoit le pied de la boîte du dessus. [V image]
- **Aucune cote de profil n'est publiée** : ni angle, ni hauteur de chanfrein, ni jeu, ni rayon. Les fichiers qui les contiennent sont payants et **n'ont pas été téléchargés**. [V absence]

### 3.2 Mesure 1 : boîte gratuite de Chappel, 2020 (ancêtre, source primaire)

Fichier : `assortment_box_1x1_v4.STL` (Thingiverse thing:4160638, auteur « chappel », CC BY-NC-SA). Il est téléchargé dans `scratchpad/modbox/files/chappel_2020_assortment_box_1x1_v4.stl`. L'axe de hauteur du fichier est Y. Coupe dans le plan de symétrie, bord gauche, en mm (h = distance horizontale depuis l'enveloppe, z = hauteur). [V mesure]

| # | h | z | Segment |
|---|---|---|---|
| P1 | 4,54 | 0,00 | dessous (arête basse) |
| P2 | 2,77 | 1,77 | chanfrein à **45°** de 1,77 mm |
| P3 | 2,48 | 2,45 | petit congé (r ≈ 0,7) jusqu'à la paroi |
| P4 | 1,65 | 33,9 | paroi en **dépouille** vers l'extérieur (≈ 1,6°) |
| P5 | 0,58 | 67,93 | fin de la dépouille |
| P6 | 0,58 | 75,00 | bande verticale haute (7 mm), jusqu'au bord supérieur |

- Enveloppe haute : **53,9 × 55,6 mm**. Enveloppe basse (au-dessus du chanfrein) : ≈ 50,1 × 51,8 mm. Hauteur 75 mm. [V]
- Cette boîte n'a **pas de pied à emboîter** : c'est un bac à parois inclinées, posé à plat dans un tiroir. Elle ne donne donc pas le profil de la BaseGrid ModuBOX actuelle. [V géométrie ; I conclusion]

### 3.3 Mesure 2 : base « compatible » de la communauté (source secondaire)

Fichier : « [ALCH] holder - base for remixes ModuBOX » de Pascal Lieverse (Printables 671198, CC BY), `alch holder 2x2x75.stl` / `.step`. L'auteur la présente comme une base pour concevoir des pièces compatibles, mais elle a été **redessinée par lui**. Sa fidélité à l'original est **[I]**. Origine z = 0 au plan de jonction pied/paroi ; x part de l'arête extérieure de la paroi basse. [V mesure]

Coupe à travers une cellule (y = 27,5), bord extérieur :

| # | x | z | Segment |
|---|---|---|---|
| A | 4,52 | −4,50 | dessous du pied |
| B | 0,00 | 0,00 | chanfrein unique à **45°**, 4,5 × 4,5 mm |
| C | 0,00 | 0,51 | paroi quasi verticale |
| D | −0,30 | 60,50 | paroi en légère dépouille (+0,3 mm sur 60 mm ≈ 0,3°) |
| E | −0,30 | 70,50 | bord supérieur (boîte « 75 » : 75 mm hors tout, pied compris) |

Entre deux cellules (rainure en V) : (49,60 ; −4,50) → (54,60 ; +0,50) → (59,60 ; −4,50), avec deux chanfreins à 45° de 5 mm. [V]

| Cote mesurée (base Lieverse) | Valeur | Statut |
|---|---|---|
| Largeur de la boîte 2x2 à z = 0 | 109,20 (= 2 × 55 − 0,8), soit **un jeu de 0,4 mm par côté** | [V] |
| Largeur en haut (z ≥ 60,5) | 109,80 (jeu de 0,1 mm par côté) | [V] |
| Pied par cellule, dessous | 45,1 × 45,1 mm, coin **r ≈ 3,0** | [V] |
| Pied par cellule, dessus (z = 0) | ≈ 54,1 à 54,6 mm, coin r ≈ 3,0 (le chanfrein ne change pas le rayon) | [V] |
| Hauteur du pied | **4,5 mm** au bord extérieur, **5,0 mm** au fond des rainures entre cellules | [V] |
| Angle | 45°, un seul segment (pas de marche verticale) | [V] |

Recoupement : les boîtes d'Erik van de Pol (Printables 480542, CC BY) sont « designed from scratch […] share basic angles and dimensions » avec l'original. En mesure (`box-1x1-quarter_height-no_label.stl`) : enveloppe **54,8 × 54,8 mm** (0,1 mm par côté), pied chanfreiné à **45°** d'environ 4,6 à 4,7 mm (x ≈ 4,8 à z = 0 jusqu'à la paroi à x ≈ 0,1–0,2 vers z ≈ 4,6). La géométrie est bruitée par des évidements de paroi. Cela reste cohérent avec la base Lieverse. [V mesure ; I fidélité]

### 3.4 Profil probable de la BaseGrid (non vérifié)

Déduit de l'image officielle (nervures chanfreinées en toit) et des pieds communautaires (45°, environ 4,5–5 mm) : une **nervure triangulaire ou trapézoïdale à 45° de chaque côté**, haute d'environ 4,5–5 mm, centrée sur les lignes de grille tous les 55 mm, sans fond. Le pied pyramidal de la boîte vient s'y centrer. **[I], à confirmer avec un fichier officiel** (par exemple en achetant la « base grid » à 1 $, ce qui est hors du périmètre de cette recherche).

Schéma (inféré) d'une nervure entre deux cellules :

```
 boîte A                boîte B
  paroi |              | paroi
        |\            /|
        | \  45°     / |   <- pieds 45°, ~4,5 mm
         \ \   /\   / /
            \ /  \ /       <- nervure BaseGrid (toit 45°) [I]
   ---------/----\--------
            |<55>|  pas
```

---

## 4. Comparaison avec Gridfinity

| Aspect | ModuBOX | Gridfinity | Compatible ? |
|---|---|---|---|
| Pas | 55 mm [V] | 42 mm [V] | Non (55/42 n'est pas entier) |
| Unité de hauteur | 18 mm, 1H = 21 mm [V/I] | 7 mm [V] | Non |
| Plaque | BaseGrid ajourée à nervures chanfreinées, plus EdgeGrids de remplissage [V image] | Baseplate à poches 0,7/1,8/2,15 (4,65 mm), coin r 4 [V] | Non |
| Pied | Chanfrein simple à 45° d'environ 4,5 mm, coin r ≈ 3 [I, d'après la communauté] | 0,8 / 1,8 / 2,15 (4,75 mm) en trois segments, dessus 41,5, r 3,75 [V] | Non |
| Jeu | ≈ 0,4 mm/côté en bas, 0,1 mm/côté en haut (communauté) [I] | 0,25 mm/côté (41,5 dans 42) [V] | — |
| Aimants dans les bacs | Pas de mention (seulement Ø 6 × 2 pour la caisse) [V/I] | 6 × 2 mm en option [V] | — |
| Empilage | Variante « Stackable » séparée [V] | Lèvre d'empilement standard [V] | — |
| Licence | Payant, licence commerciale séparée ; ancêtre 2020 en CC BY-NC-SA [V] | MIT (designs de Zack Freedman) [V S6] | — |
| Filiation | Le système « Assortment » de Chappel « partly inspired » Gridfinity [V S6] ; la vidéo Gridfinity cite deux vidéos de Chappel [V S7] | — | — |

Point commun : les deux systèmes utilisent une grille carrée, des boîtes de N×M cellules, des chanfreins à 45° qui centrent la boîte, et une plaque de base imprimée. Différence de fond : Gridfinity a un profil étagé normalisé, publié en MIT ; ModuBOX est un produit commercial dont le profil n'est pas documenté publiquement.

**Conséquence pour gridfinitygenerator** : pour supporter ModuBOX, il faut un préréglage distinct (pas de 55, profil de nervure à 45°). La seule géométrie publique mesurable vient de la communauté, pas de Chappel. Il faudrait l'étiqueter « compatible (non officiel) ». [I]

---

## Sources

Primaires (Alexandre Chappel) :
- **S1** Boutique ALCH, catalogue ModuBOX : https://www.alch.shop/modubox (et `?format=json`, consulté le 2026-09-28)
- **S2** Fiches produit : https://www.alch.shop/modubox/p/modubox-boxes-organizers-complete-3d-printable-set-rdzk9-mjxzm (All Box variations), https://www.alch.shop/modubox/p/modubox-boxes-3d-printable-modular-storage-bx233 (All heights), https://www.alch.shop/modubox/p/stackable-all-heights, https://www.alch.shop/modubox/p/base-grid, https://www.alch.shop/modubox/p/assortment-bins-v2-and-case-bundle-kfbg9 (Case V1), https://www.alch.shop/modubox/p/moduboxes-4h-75mm, https://www.alch.shop/modubox/p/modubox-blanks (images incluses)
- **S3** YouTube « I Organised my Workshop with 3D Printing » (2025-12-18) : https://www.youtube.com/watch?v=PzO6GhEdA4U (description)
- **S4** Licences commerciales : https://www.alch.shop/licenses ; FAQ : https://www.alch.shop/contact
- **S5** Thingiverse « Assortment system box 1x1 by chappel » (2020-02-13, CC BY-NC-SA) : https://www.thingiverse.com/thing:4160638 ; vidéo https://www.youtube.com/watch?v=CHFK5sY8ToE
- **S8** YouTube « 3D Printing Even Better Assortment Boxes - And Making a Case for Them! » (2020-10-11) : https://www.youtube.com/watch?v=VntGnLuwoeY

Gridfinity (filiation) :
- **S6** https://gridfinity.xyz/ (section « Origins of Gridfinity »)
- **S7** Zack Freedman, « Gridfinity: Your Ultimate Modular Workshop is FREE! » : https://www.youtube.com/watch?v=ra_9zU-mnl8 (description qui cite les vidéos de Chappel)

Secondaires (géométrie communautaire, mesurée) :
- Pascal Lieverse, « [ALCH] holder - base for remixes ModuBOX », Printables 671198 (CC BY) : https://www.printables.com/model/671198-alch-holder-base-for-remixes-modubox
- Erik van de Pol, « [ALCH] stackable modular boxes… (ModuBox) », Printables 480542 (CC BY) : https://www.printables.com/model/480542-alch-stackable-modular-boxes-in-6-heights-and-9-di
- Org Like a Pro (cotes 55/54) : https://tools.orglikea.pro/box-compatibility/alexandre-chappel-modubox

Non accessibles : le profil MakerWorld de Chappel (@alexandre.chapp) est bloqué (HTTP 403 / Cloudflare), et les fichiers officiels ModuBOX sont payants.

## Méthode de mesure

Les fichiers sont dans `/private/tmp/claude-501/-Users-olivier-www-gridfinitygenerator/58570019-36ee-4826-b549-93225b6eb89a/scratchpad/modbox/files/`. Les coupes planaires ont été faites avec `trimesh.intersections.mesh_plane` (venv du scratchpad, script `modbox/section.py`), plan perpendiculaire à un bord et passant au milieu d'une cellule. Les sommets sont arrondis au µm, et les points intermédiaires de tessellation (congés) sont regroupés dans les tableaux.

## Questions ouvertes

1. Le profil exact de la BaseGrid officielle (hauteur des nervures, largeur du sommet, jeu). Seul le fichier payant « base grid » (1 $) permettrait de le vérifier.
2. Le pied des boîtes ModuBOX 2025 : a-t-il un chanfrein simple à 45° comme les reproductions, ou un profil étagé ?
3. Le pas des tiroirs du cabinet de 2020 (grille 6 × 6) : était-il déjà de 55 mm ? La boîte 1x1 de 2020 mesure 53,9 × 55,6 en haut, ce qui est compatible avec 55–56 mm mais reste non confirmé.

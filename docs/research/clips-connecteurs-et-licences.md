# Rétention des bacs (click/latch) et connecteurs entre plaques : état de l'art et licences

Recherche du 2026-09-29. Complète `docs/research/gridfinity-baseplate.md` (sections A.4 CLICKbase, A.5 split, licences) sans les répéter.
Légende : **[V]** vérifié sur la source primaire citée (fichier, code, API, page) ; **[I]** inféré (calcul, lecture de code minifié, extrapolation). Rien ici n'est un avis juridique.

> **Lien avec les autres rapports** : `retenue-des-bacs-clickbase.md` et `decoupe-et-clips.md` couvrent le même sujet (session parallèle du même soir). Ce rapport-ci ajoute : dates `firstPublish` vérifiées par l'API (CLICKbase 2024-08-28, Clickfinity 452675 2023-04-14, mieux sourcées que celles de `retenue-des-bacs-clickbase.md`), les avis DMCA GRIPS lus dans `github/dmca`, DrawerForge (concurrent MIT, clés insérables par-dessous) et GridFlock « Edge Puzzle » inséré par-dessous. En sens inverse, `retenue-des-bacs-clickbase.md` est mieux sourcé sur la provenance de clickfinity-openscad et la licence GRIPS ; l'orientation du `CLICK_clip` (« sur la tranche » ici, « à plat » là-bas) décrit probablement la même pose.

Méthodes : API GraphQL publique de Printables (`api.printables.com/graphql/`, champs `license`, `firstPublish`, `description`, `comments`), `gh api` pour GitHub, téléchargement du bundle et du worker d'extrabold.tools (`/_app/immutable/workers/jscad-worker-0D2CKfQH.js`) et de `/models/CLICK_clip.3mf`, lecture de `gridflock.scad`. Les pages Printables/MakerWorld en HTML renvoient 403 à WebFetch ; Reddit (JSON) est bloqué depuis ce poste.

---

## 1. CLICKbase (John Hall)

### 1.1 Identité et licence

| Élément | Valeur | Statut |
|---|---|---|
| Page | https://www.printables.com/model/982173-clickbase-a-no-magnet-latching-gridfinity-baseplat | [V] |
| Auteur | « John Hall » (handle `JohnHall_303304`) | [V] |
| Licence affichée | **CC-BY-NC-SA** (« Creative Commons — Attribution — Noncommercial — Share Alike ») ; extrabold l'étiquette « CC BY-NC-SA 4.0 » | [V] (API Printables) ; version 4.0 : [V] côté extrabold, [I] côté Printables (l'API ne donne pas le numéro de version) |
| Première publication | 2024-08-28 (`firstPublish`) ; dernière mise à jour 2025-05-29 | [V] |
| Popularité | 639 likes, 4 149 téléchargements | [V] |
| Fichiers | 1×1 à 6×6 (42 mm), 7×7/8×8 en zip (2025-02-18), variantes 50 mm (2025-02-09), STEP pour toutes les tailles (2025-01-06), `CLICK_Clip` | [V] (description) |
| Lignée | Dérive de Clickfinity : ClickPlates de jrymk (GitHub `jrymk/gridfinity-eco`, dépôt créé le 2023-03-15, **sans licence**), remix Clickfinity de NoWarrenty (Printables 452675, 2023-04-14, CC-BY-NC-SA), Clickfinity Refined (FPV Smitty, 506105, CC-BY-NC-SA). John Hall écrit en commentaire que Clickfinity « brilliantly introduced the concept of no-magnets bin retention, and was definitely the inspiration for CLICKbase ». | [V] |
| Dérivé | « CLICKbase Refined » de ZeroCtrl (Printables 1487592, 2025-12-01, CC-BY-NC-SA) : print-in-place, générateur Onshape | [V] |

### 1.2 Fonctionnement du mécanisme

Ce que dit l'auteur [V, description Printables] :
- Un **mécanisme à ressort** intégré à la plaque produit la retenue ; la page parle de « bin-latching mechanism » et de « very small geometry ». L'extrait d'un moteur de recherche parle de « eight small arms per square » (NoWarrenty, pour Clickfinity : « four small arms per square »).
- En commentaire (2025-02) : « the holding means is simply a **close interference fit** between the baseplate and the bin. It does absolutely require printing to be both accurate and repeatable. »
- Pas de trous de vis ; plaques jugées rigides ; tapis antidérapant ou pastilles adhésives conseillés.

Géométrie, d'après la réimplémentation d'extrabold (fonction `Ix`, constantes `zx`, worker v0.5.2x). **[V] pour les nombres dans le code ; [I] pour l'interprétation physique.** Ce n'est pas une mesure des fichiers de John Hall.

```
zx = { cutoutLength: 11, cutoutWidthOuter: .75, cutoutWidthInner: 10, cutoutDepth: 1.075,
       aditionLength: 3, aditionWidthOuter: .5, aditionWidthInner: 4, aditionDepth: 2.4 }
```

- **Profil de poche modifié** : pour `clickbase`, le 5ᵉ anneau du loft reçoit les dimensions du 3ᵉ (`P[4].width = _` …). Le dernier chanfrein à 45° du bas de la poche (0,7 mm) disparaît : la poche reste **verticale** jusqu'au fond, à la largeur du « main body » (≈ 37,7 mm pour une cellule de 42) [V code ; I cote].
- **Fente (« cutout »)** sur chaque côté de cellule : trapèze de 11 mm (10 mm sur l'autre face) × 0,75 mm, extrudé sur toute la hauteur du profil, centré à 1,075 mm à l'intérieur du bord de cellule (de 0,70 à 1,45 mm du bord). Elle détache de la paroi une **lamelle** d'environ 0,7 mm d'épaisseur (entre la fente et la face verticale de la poche, qui est à 2,15 mm du bord) et d'environ 10 à 11 mm de long. **C'est cette lamelle qui fléchit**, dans le plan XY [I].
- **Bossage (« adition »)** collé à la face de la lamelle : trapèze de 3 mm (côté intérieur) / 4 mm (côté paroi) de long, 0,5 mm d'épaisseur, centré à 2,4 mm du bord (de 2,15 à 2,65 mm), hauteur = `ring[4].z − ring[2].z` (+ `bottomPadding`) ≈ 2,5 mm, c'est-à-dire la **partie basse verticale** de la poche [V code ; I cote]. Il dépasse de 0,5 mm dans la poche.
- **Ce qui est saisi** : la partie basse du pied de bac (bande verticale de 1,8 mm et chanfrein inférieur de 0,8 mm). Calcul nominal : pied de bac à la bande verticale ≈ 41,5 − 2×2,15 = 37,2 mm ; poche avec bossages ≈ 37,7 − 2×0,5 = 36,7 mm, soit **≈ 0,25 mm d'interférence par côté** [I, calcul sur cotes spec].
- **Nombre** : 2 lamelles par côté à ±10,5 mm du milieu du côté (donc 8 par cellule), ou 1 centrée quand deux ne tiennent pas (demi-cellules, `Rx`/`Cx`) [V code]. Changelog 0.5.19 (2026-07-11) : « latching nubs omitted on split edges » (pas de bossage le long des coupes) [V].

Orientation d'impression [V description ; I géométrie] : plaque à plat, comme une baseplate normale ; fentes et lamelles verticales, donc la lamelle fléchit le long des couches (pas de pelage inter-couches). Auteur : buse 0,4 / couche 0,2, PETG à 50 mm/s sur X1C ; 0,6 mm possible (un utilisateur).

### 1.3 Problèmes connus [V, description et 42 commentaires Printables]

- **Matière** : pas de PLA ni de PLA+ pour la plaque (fluage sous charge permanente → la retenue baisse). PETG, ABS, ASA ou nylon. Les clips peuvent être en PLA+.
- **Impression des petits détails** : dans Orca, extrusions manquantes sur les lamelles et les fentes. Correctifs trouvés par les utilisateurs : désactiver « detect thin walls », mettre la compensation de trous XY à 0,001, Arachne + ordre de parois outer/inner ; dans PrusaSlicer, Arachne « minimum perimeter width » à 65 %. Premières couches en « centaines de petits périmètres », décollements (Core One).
- **Tolérance des bacs** : un utilisateur rapporte que, sur 10 modèles de bacs Printables, 2 ne sont pas tenus du tout et 2 trop peu. L'auteur répond que l'ajustement serré est inhérent au principe.
- **Perte de tenue** : un cas en PETG ; la cause s'est révélée être le retrait mal calibré de bacs en PLA.
- **Clips** : il faut une pression ferme (l'auteur utilise un manche de tournevis) ; « I did need to hammer the clips in » ; « annoying to print properly and insert all the way down. They also break easily ».
- Plaques « un peu fragiles » au décollement du plateau.
- Points positifs : 850 g soulevés avec un bac 2×1 sur deux plaques 3×2 clipsées ; de nombreux « best baseplate ».

### 1.4 Ce qui est protégeable (paysage, pas un avis juridique)

1. **Objet des licences CC** [V, legalcode CC BY-NC-SA 4.0] : la licence ne porte que sur le « Licensed Material » et les « Copyright and Similar Rights » ; « **Patent and trademark rights are not licensed under this Public License** ». La clause NC ne restreint donc que ce que le droit d'auteur (ou un droit voisin) couvre.
2. **Couvert par le droit d'auteur** [I, principes généraux : 17 U.S.C. §102(b) aux États-Unis, art. 9(2) de l'accord ADPIC] : l'expression, c'est-à-dire les fichiers STL/3MF/STEP/F3D, les maillages, les photos, le texte et le code. L'idée, le procédé ou le principe fonctionnel (une lamelle souple avec un bossage dans la paroi de poche) ne le sont pas. Copier ou convertir les fichiers de John Hall, ou reprendre ses cotes en y apportant de petites modifications, crée une œuvre dérivée. C'est la lecture d'extrabold : bien qu'ayant réécrit la géométrie en code, il **applique CC BY-NC-SA 4.0 à toute sortie `clickbase`** et crédite John Hall (`determineLicense`, `attributions`) [V code].
3. **Dessins et modèles UE** [I] : un dessin communautaire non enregistré protège l'apparence 3 ans après la première divulgation dans l'UE (ici août 2024, donc jusqu'à environ août 2027). Il ne couvre ni les caractéristiques imposées uniquement par la fonction technique, ni les formes d'interconnexion (art. 8 du règlement 6/2002). Une lamelle de retenue relève très probablement de l'exclusion technique. À faire confirmer.
4. **Brevets** : une recherche rapide n'a trouvé aucun brevet sur ce mécanisme (non exhaustif). Antériorité publique de l'idée : ClickPlates de jrymk (GitHub, mars 2023) et Clickfinity (Printables, 2023-04-14) [V dates]. Cela précède CLICKbase d'environ 17 mois ; l'idée elle-même est donc publique depuis 2023.
5. **Précédent concret : la DMCA GRIPS** (§3.3). Elle visait du code et des tableaux de données copiés, pas l'idée du puzzle. GridFlock, réimplémentation « clean-room » du même concept, est en ligne sous MIT/CC-BY [V].
6. Conséquence pratique [I] : une lamelle de retenue **conçue et cotée par nous, sans ouvrir les fichiers ni les constantes de CLICKbase/extrabold**, reste dans le domaine de l'idée. Des cotes identiques aux constantes `zx` rapprocheraient fortement d'une œuvre dérivée. Le mécanisme sous MIT/CC-BY le plus proche est le ClickGroove ou l'Arc de GridFlock (§2).

---

## 2. Autres systèmes de retenue bac ↔ plaque

| Design | Mécanisme | Licence | Usage commercial ? | Source |
|---|---|---|---|---|
| **ClickPlates** (jrymk), l'original | Bras souples dans la plaque, « DO NOT PRINT IN PLA » | **Aucune licence** sur GitHub (tous droits réservés par défaut) ; Printables 522164 « OG Clickfinity » = CC-BY-NC | Non | https://github.com/jrymk/gridfinity-eco , https://www.printables.com/model/522164 [V] |
| **Clickfinity** (NoWarrenty) | « four small arms per square » ; les lignes de couche s'emboîtent ; connecteurs en queue d'aronde M/W avec « joins » et « hubs » | CC-BY-NC-SA | Non | https://www.printables.com/model/452675 (1 495 likes) [V] |
| **Clickfinity Refined** (FPV Smitty) | Clickfinity + écosystème Refined (connecteurs à coin) ; bras libres sur les murets | CC-BY-NC-SA | Non | https://www.printables.com/model/506105 [V] |
| **CLICKbase / CLICKbase Refined** | §1 | CC-BY-NC-SA | Non | [V] |
| **Gridfinity Plus** (Angry_Sasquatch) | Languettes de verrouillage intégrées qui travaillent en **torsion** (« distributing force away from the 3D-printed layer lines ») ; bacs standard compatibles, bacs « latching » dédiés ; rainure pour fil d'acier 1×15 mm (trombone) | CC-BY-NC-SA | Non | https://www.printables.com/model/765609 [V] |
| **Gridfinity-SP** (akshimassar) | Plaque « snap-in-place » avec ressorts, clips de liaison ; générée par un fork du plugin FreeCAD (Stu142, LGPL-2.1) | CC-BY-NC-SA | Non | https://www.printables.com/model/1714411 [V] |
| **GridFlock « Arc »** (click1) | Latte en arc (courbe logistique) sur chaque côté de cellule, longueur 30, saillie 1 mm, épaisseur 1,6, mur arrière 1, hauteur 3 ; « very susceptible to creep » | **MIT + CC-BY 4.0** | **Oui** | `gridflock.scad` [V] |
| **GridFlock « ClickGroove »** (click2, défaut) | Fente de 25 mm derrière la paroi, laissant une poutre de 1,4 mm ; ergot triangulaire de 10 mm qui dépasse de 0,9 mm de la face verticale, centré à 0,8 + 0,9 mm. Fonctionne avec les bacs standard (avec fluage) ; un bac « ClickGroove » à encoche supprime la contrainte permanente (gabarit Printables + outil Gridfinity Rebase) | **MIT + CC-BY 4.0** | **Oui** | https://github.com/yawkat/GridFlock [V code l. 436-452] |
| **Gridfinity Refined** (grizzie17) | Pas de click : aimants 6×2 insérés en force (plaque par-dessous, bacs par le côté) ; **vis moletée M15×1,5** qui visse le bac dans la plaque | **CC-BY-SA** | Oui (share-alike sur les dérivés du modèle) | https://www.printables.com/model/413761 (2 308 likes) [V] |
| Mqrius, paramétrique Fusion | Sans aimant ni click : encoches dans la lèvre d'empilement contre le glissement | **CC0** | Oui | https://www.printables.com/model/1221568 [V] |
| `IamMrCupp/clickfinity-openscad` | Générateur OpenSCAD « Clickfinity-style » | MIT (GitHub) | Oui en apparence ; **provenance non vérifiée** (possible dérivé d'un travail NC) | GitHub [V licence, I provenance] |
| gridfinity-rebuilt (kennetek) | Pas de retenue click ; aimants, vis | MIT | Oui | [V, recherche d'issues : aucune sur un click] |
| Gridfinity Extended (ostat) | Pas de click bac↔plaque trouvé dans `gridfinity_baseplate.scad` (seulement des connecteurs plaque↔plaque) | **GPL-3.0** depuis le 2024-12-26 (MIT avant) | Oui, mais copyleft incompatible avec une copie dans du code MIT | [V, historique de `LICENSE`] |

**Utilisables commercialement (MIT/CC0/CC-BY)** : GridFlock (Arc, ClickGroove), Mqrius (CC0, sans retenue), gridfinity-rebuilt (MIT, sans retenue). Refined est en CC-BY-SA : commercial permis, mais tout dérivé de ses modèles doit rester en BY-SA. **Toute la lignée Clickfinity/CLICKbase est NC.**

GridFlock précise aussi (README) : « When a bin is placed on the baseplate, the click latch is under constant mechanical stress… _PLA is very susceptible to this._ PETG is more resistant, but long-term tests are still scarce, so _consider this feature experimental_ » [V].

---

## 3. Connecteurs entre plaques imprimées séparément

### 3.1 Tableau

| Connecteur | Géométrie | Pièce en plus ? | Conseils de tolérance | Licence | Source |
|---|---|---|---|---|---|
| **CLICK_clip** (extrabold ; même nom que le « CLICK_Clip » de John Hall) | Agrafe en U, profil 2,8 × 4,65 mm extrudé sur 4,5 mm (le 3MF la pose **sur la tranche**, profil dans XY). Deux pattes de 0,65 mm séparées de 1,5 mm ; le haut (0,8 mm de large, chanfreins à 45°) reprend l'arête du muret. Dans la plaque, de chaque côté de la coupe : fente de 0,85 mm à 0,65–1,5 mm de la coupe, élargie en encoche ouverte de 1,5 mm sur les ~2,2 mm du haut, longueur 5 mm. Insertion **par le dessus**. Un clip par cellule le long des coupes (`connectorClipsNeeded` = ⌈Σ/2⌉) ; John Hall en met 2 ou 3 par bord. | Oui (clip) | Jeu nominal ≈ 0,1 mm par face ; **la tolérance globale d'extrabold ne s'applique pas à la fente** (`qx` ne reçoit pas ce paramètre) ; en pratique, pose au marteau | Clip de John Hall = **CC BY-NC-SA** [I : même nom, titre 3MF « CLICK_Clip »] ; extrabold n'applique la licence NC **que** pour le type `clickbase`, pas pour des clips sur plaque normale [V code] | `extrabold.tools/models/CLICK_clip.3mf` [V mesures] |
| Queues d'aronde extrabold (option cachée) | Tenon lobé mâle/femelle, table de tolérances 0–0,5 mm | Non | Tolérance globale (0,2 par défaut) | Générateur « CC0 » | worker `t_`, `a_` [V code] |
| **Clickfinity joins/hubs** (NoWarrenty) | Queues d'aronde M sur les côtés, W en haut/bas (l'orientation compte) ; pièces « join » et « hub » séparées | Oui | Buse 0,4 **obligatoire** ; expansion horizontale de la 1ʳᵉ couche −0,2 mm ; imprimer d'abord 4 hubs + 2 joins ; trop lâche → débit +5 %, trop serré → −5 % ; un « clic » audible | CC-BY-NC-SA | 452675 [V] |
| **Butterfly wedge lock** (Gridfinity Refined) | Clé papillon / coin inséré sous la jonction | Oui | « print out a few; if they don't fit… scale them in your slicer » ; resserrée le 2023-05-19 | **CC-BY-SA** | 413761 [V] |
| **Screw Together** (Kyle Warren) | Vis CHC 4-40 + inserts thermo-sertis, goupille 1/8" en option | Oui (quincaillerie) | — | **CC-BY** | https://www.printables.com/model/300603 (2 354 likes, 14 686 téléchargements) [V] |
| Snap-lock Pin (Gad_Gad) pour la plaque de Kyle Warren | Goupille à tête qui traverse les trous latéraux | Oui | Jeu voulu ; réduire l'échelle si trop serré | **CC-BY** | https://www.printables.com/model/585701 [V] |
| **gridfinity-rebuilt `style_plate` 3/4** | Vis horizontales Ø 3,35, 1 à 3 par unité, +6,75 mm d'épaisseur | Oui (vis) | — | **MIT** | cf. `docs/research` B.5 [V] |
| **Snapfinity** (mcbillsan) | Plaques 1×1… 6×6 + clips en C | Oui | Clips en **PETG, imprimés sur la tranche** ; le PLA se déforme et se desserre | **CC-BY** | https://www.printables.com/model/403457 [V] |
| Snap fit extensible (Chillchamp) | Emboîtement intégré mâle/femelle (plus facile en inclinant) | Non | L'auteur recommande désormais des **connecteurs séparés imprimés sur la tranche** (remix de Neel) | **CC0** | https://www.printables.com/model/399677 [V] |
| Clip together (Akio) | Clips séparés sous la plaque, bords extérieurs propres, +3,4 mm de hauteur | Oui | — | CC-BY-NC-SA | 633086 [V] |
| Snap Together + aimants captifs (jack_hmr) | Crochets intégrés avec support incorporé à retirer ; angles difficiles → assembler en rangées | Non | — | CC-BY-NC-SA | 356890 [V] |
| Dovetail baseplate (PirateSands2) | Queues d'aronde intégrées sans surépaisseur | Non | — | CC-BY-NC-SA | 1092265 [V] |
| **GRIPS** (MakerWorld, TooManyThings) | Découpe automatique + languettes de puzzle | Non | — | **Licence propriétaire** MakerWorld (interdiction de partager, vendre ou dériver, d'après l'extrait) | https://makerworld.com/en/models/704997 [I : page en 403, extrait de moteur de recherche] |
| **GridFlock** | §3.2 | Non (puzzle intégré) | Paramètre de serrage | **MIT + CC-BY 4.0** | [V] |
| **Gridfinity Extended** (ostat) | Clip (taille 10, jeu 0,1), papillon [5,4,1,5] (jeu 0,1, r 0,1), goupille en filament Ø 2 × 8, « snaps » (jeu 0,2) ; position milieu de muret, intersection ou les deux | Oui/non selon le type | Jeux de 0,1 à 0,2 par défaut | **GPL-3.0** | `gridfinity_baseplate.scad` [V] |
| **DrawerForge** (navigateur, créé en 2026-08) | 7 types : queues d'aronde intégrées (8 mm à la coupe, 11 mm à 1,9 mm de profondeur, **insertion verticale seulement**), puzzle intégré (col 6 → lobe 9,2, demande un plancher plein), clés papillon 14×8, clés puzzle 14×8,39, clips à ressort fendus 14×8, H-clips, aucun ; clés logées dans un plancher plein ou dans les murets, insérées par-dessous ou **par-dessus** | Selon le type | **« Joint fit sample »** : 4 jeux gradués sur une petite impression, à tirer d'abord | **MIT** | https://github.com/Oliver-Johnson/DrawerForge , https://drawerforge.co.uk/guide/ [V] |

### 3.2 GridFlock en détail

- **Dépôt** : https://github.com/yawkat/GridFlock (créé le 2026-01-20, 112 étoiles, actif) ; générateur en ligne https://gridflock.yawk.at/ ; aussi sur perplexinglabs ; page Printables 1579487 (**CC-BY**, 2026-02-01) [V].
- **Licence** [V, `LICENSE`] : « This repository is **dual-licensed under MIT and CC-BY 4.0**. Some models in `opengrid/` are licensed under CC-BY 4.0 by @DavidD and @mitufy. » Copyright (c) 2026 Jonas Konrad. Utilise gridfinity-rebuilt (MIT, sous-module) pour le « baseplate cutter ». GitHub affiche `NOASSERTION` à cause du double texte.
- **Positionnement** : « independent, open-source, **clean-room** implementation » ; « Similar projects include GridPlates (DMCA'd) and GRIPS ». Le fork `yawkat/GridPlates` de l'auteur figure dans la DMCA du 2026-01-09 [V].
- **Découpe** [V README] : d'abord selon X, en segments à peu près égaux (« ideal ») ou maximaux puis reste (« incremental », `x_column_count_first`). Puis selon Y avec **deux plans alternés et décalés** (« staggered ») pour ne jamais avoir 4 segments à un coin, en évitant les segments d'une seule cellule. `separate_edge_padding` imprime les marges en bandes séparées.
- **Connecteur « Intersection Puzzle »** (défaut) : petits tenons de puzzle aux **intersections de cellules**, forme figée dans `puzzle.svg` (variantes tight/loose), mise à l'échelle par `scale(4/128)` et interpolée par `intersection_puzzle_fit` ∈ [0,1] (1 = le plus serré, défaut). La partie qui empiète sur le bac voisin est retirée (cercle r 4). « Intentionally tight… it may be necessary to use a mallet or hammer » ; « can sometimes lead to gaps between the segments ». Grilles de calibration sur Printables [V README et code l. 528-570].
- **Connecteur « Edge Puzzle »** : au milieu de chaque côté de cellule, mâle en T arrondi (col 3 × 1,2 mm, tête 10 × 2,5 mm), jeu de 0,15 mm, femelle haute de 2,25 mm, mâle 0,25 mm plus bas. Par défaut il s'insère **par-dessous** (en pleine hauteur, par les deux côtés, au risque de pièces non connectées sans couche d'aimants). Nombre réglable ; une barre de renfort au niveau des aimants. « More accurate fit, but harder to print, uses more filament » ; fragile sans aimants [V README l. ~869-890].
- **Autres fixations** : vis verticales (Ø 3,2, fraisage/lamage) classées en 5 catégories d'intersections (coins et bords de plaque, coins et bords de segment, autres) ; vis horizontales par bord ; trou de vis moletée compatible Refined [V].

### 3.3 Affaire GRIPS / GridPlates (DMCA)

- GitHub a bloqué `silversword411/GridPlates` (HTTP 451, « reason: dmca », 2026-01-07). Avis : https://github.com/github/dmca/blob/master/2026/01/2026-01-06-grips.md [V].
- Le plaignant, propriétaire de GRIPS, invoque « OpenSCAD source code implementing original procedural geometry algorithms and associated original **curve/geometry data arrays** », que GridPlates.scad aurait copiés avec des « renamed identifiers and minor reformatting/obfuscation ». « Is the work licensed under an open source license? **No** » [V].
- Avis suivants : 2026-01-09 (forks uwbfritz, ChrisOboe, mackinleysmith, pfa230, **yawkat**), 2026-01-21 et 2026-02-03 (`akortman/` et `eran247/GridPlates-x-CLICKbase`, un GridPlates avec CLICKbase) [V].
- Enseignement [I] : le risque réel porte sur le code et les tableaux de coordonnées copiés. Réimplémenter proprement le même concept (puzzle intégré, découpe) n'a pas été attaqué (GridFlock).

---

## 4. Préférences et plaintes des utilisateurs (bref)

- **Proxy de popularité sur Printables** (likes / téléchargements) [V] : Screw Together de Kyle Warren 2 354 / 14 686 ; Refined 2 308 / 11 279 ; Clickfinity 1 495 / 6 993 ; CLICKbase 639 / 4 149 ; Clickfinity Refined 553 / 3 234 ; Gridfinity Plus 469 / 3 214 ; GridFlock 88 / 456 (depuis février 2026).
- **Fluage réel avec le PLA** : sur Clickfinity, « 1 month later, the clicks are gone from the grids where I had bins placed all the time, so the "creep" is real » [V]. Tous les auteurs de systèmes à click imposent le PETG ou l'ABS.
- **Clips séparés** (CLICK_clip) : durs à poser (marteau), cassants, pénibles à imprimer ; mais « the clips make it feel like one grid » [V].
- **Puzzle intégré** (GridFlock) : sur une plaque de 42×58 cm en 7 morceaux, 2 intersections seulement à reprendre (fit 0,95) ; un premier conflit entre edge puzzle et ClickGroove a été corrigé ; l'auteur reconnaît des jours possibles [V].
- **Emboîtements intégrés** : difficiles à assembler en coin (jack_hmr) ; Chillchamp a abandonné son snap intégré pour des connecteurs séparés imprimés sur la tranche [V].
- **Compatibilité** : sur r/gridfinity (« Limitations of the various Gridfinity spin-offs », 2026-03-19, 11 commentaires, https://www.reddit.com/r/gridfinity/comments/1rxp9jb/), on craint que les variantes (pins, etc.) cassent la compatibilité avec les bacs existants. Les plaques click de type CLICKbase/ClickGroove gardent les bacs standard [V post ; I conclusion].
- Limite : Reddit n'a pas pu être interrogé de façon systématique (JSON bloqué, API sociale presque vide). Les avis viennent surtout des commentaires Printables.

---

## Sources principales

- CLICKbase : https://www.printables.com/model/982173-clickbase-a-no-magnet-latching-gridfinity-baseplat (API GraphQL : licence, dates, 42 commentaires)
- CLICKbase Refined : https://www.printables.com/model/1487592
- Clickfinity : https://www.printables.com/model/452675 ; https://www.printables.com/model/506105 ; https://www.printables.com/model/522164 ; https://github.com/jrymk/gridfinity-eco
- extrabold : https://extrabold.tools/_app/immutable/workers/jscad-worker-0D2CKfQH.js (fonctions `Ix`, `_x`, `qx`, `b_`, `w_`, `a_`, `determineLicense`) ; https://extrabold.tools/models/CLICK_clip.3mf ; https://www.extrabold.tools/docs/gridfinity-baseplate
- GridFlock : https://github.com/yawkat/GridFlock (README, LICENSE, gridflock.scad, puzzle.svg) ; https://www.printables.com/model/1579487
- DMCA GRIPS : https://github.com/github/dmca/blob/master/2026/01/2026-01-06-grips.md (et 2026-01-09, 2026-01-21, 2026-02-03)
- Gridfinity Plus : https://www.printables.com/model/765609 ; Gridfinity-SP : https://www.printables.com/model/1714411
- Refined : https://www.printables.com/model/413761 ; Kyle Warren : https://www.printables.com/model/300603 ; Snap-lock pin : https://www.printables.com/model/585701 ; Snapfinity : https://www.printables.com/model/403457 ; Chillchamp : https://www.printables.com/model/399677 ; Akio : https://www.printables.com/model/633086 ; jack_hmr : https://www.printables.com/model/356890 ; PirateSands2 : https://www.printables.com/model/1092265 ; Mqrius : https://www.printables.com/model/1221568
- Gridfinity Extended : https://github.com/ostat/gridfinity_extended_openscad (LICENSE GPL-3.0 depuis 2024-12-26)
- DrawerForge : https://github.com/Oliver-Johnson/DrawerForge ; https://drawerforge.co.uk/guide/
- CC BY-NC-SA 4.0 legalcode : https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en
- GRIPS : https://makerworld.com/en/models/704997 (non lisible directement)

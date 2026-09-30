---
status: proposed
---

# Clips aux coins des jonctions, pour tous les types

Le grilling du 2026-09-30 (#30, suite de #22, #26 et #29) déplace les clips du milieu des bords de cellule vers les coins, en réduit le nombre et les donne aux 4 types de baseplate. Cet ADR remplace le placement de l'ADR 0010 (« un clip au milieu de chaque bord de cellule le long d'une coupe ») et la règle « pas de clip en Skeleton » de l'ADR 0014. L'agrafe, la section de sa fente et ses jeux (ADR 0010) ne changent pas. Glossaire : Jonction, Clip, Fente, Poteau, Lamelle. Mesures : `prototypes/clips-corner/`.

## Décision

- **Nombre** : une **jonction** (le bord commun à deux pièces voisines, le long d'une coupe, d'un croisement de coupes ou d'un bord du treillis au suivant) reçoit **2 clips, un à chaque bout**. Une jonction d'**une ou deux cellules** n'en reçoit **qu'un**, au bout qui est sur un croisement de deux coupes s'il y en a un (là où quatre pièces se rejoignent, la jonction bouge le plus), sinon au premier bout (devant, ou à gauche) ; si ce bout n'a pas la place, à l'autre.
- **Position** : sur le bord de cellule, **collé au coin**, dans la première (ou la dernière) cellule de la jonction. La fente de 5 mm part du croisement de la coupe, qui n'a jamais ni vis ni aimant :
  - depuis un **croisement de deux coupes**, elle part à **1,92 mm** de l'axe (`CROSSING_START_MM` = 1,35 + 0,8/√2, arrondi au centième). Chaque pièce y porte, dans son coin, une fente le long de chaque coupe : partant de l'axe, les deux se chevaucheraient, et les dents de 0,5 mm seraient coupées. À 1,92 mm, il reste 0,81 mm de matière en diagonale entre leurs coins (deux lignes) ;
  - depuis un **bord du treillis**, elle part vers l'intérieur à **0,8 mm** : au-delà, la marge peut être vide (le cadre ne fait que 2 mm de haut, la marge minimale est trouée), et la fente s'y ouvrirait. Quand le bord du treillis est sur le contour (pas de marge), elle recule encore du chanfrein du dessous, pour garder 0,8 mm au-dessus du chanfrein (2,3 mm avec un chanfrein de 1,5 mm).
- **Tiroir par défaut** découpé pour un plateau de 256 mm : **8 clips** (au lieu de 15), deux par jonction ; 4 partent du croisement central (1,92 mm), 4 du bord de la grille (0,8 mm). Le plus grand tiroir (1000 × 1000, 25 pièces) : 80 clips, deux par jonction.
- **Numéro de pièce** : sur une pièce d'une cellule, il est au milieu d'un bord sur une coupe. Une fente qui l'atteindrait (chiffres + 0,5 mm) passe à l'autre bout de la jonction, ou il n'y a pas de clip (cellules de 20 mm, numéros à deux chiffres). Une fente ne dépasse jamais le milieu du bord.
- **Skeleton** : il prend désormais les clips, dans ses **poteaux**. Le poteau s'étend à 6,80 mm de l'axe au haut de la fente (2,80 mm, profil hybride) ; une fente de 5 mm partie à 1,92 mm s'ouvrirait sur l'entaille (mesuré : 0,012 mm³ de conflit, visible de dessus). La fente du Skeleton est donc plus courte, pour finir à 0,8 mm de l'entaille : **4,0 mm** en hybride (6,80 − 0,8 − 1,92 = 4,08, arrondi au dixième inférieur), **4,1 mm** en ras. Son clip mesure 3,5 mm de long. Mur mesuré entre la fente et l'entaille : 0,93 mm (hybride), 0,88 mm (ras). `takesClips` et `BaseplateTypeVariant.clips` sont retirés ; l'interface ne désactive plus l'interrupteur.
- **CLICKbase** : les lamelles commencent à 4,5 mm du coin ; une fente de 5 mm partie à 1,92 mm les traverserait (mesuré : 25 mm³ de fente déjà vide, dans les saignées). Les deux voies proposées par le ticket ne suffisent pas au croisement de deux coupes : déborder sur le croisement est impossible (les fentes de l'autre coupe y sont), et raccourcir la fente la réduirait à 4,0 − 1,92 = 2,08 mm (un clip de 1,6 mm). C'est donc la **lamelle voisine d'un clip qui est raccourcie** : elle commence 0,5 mm après la fente, et son ergot reste en son milieu. En cellule de 42 mm : 9,08 mm au lieu de 12 au croisement de deux coupes, 10,20 mm au bord de la grille. Une lamelle qui ferait moins de 8 mm (cellules de 38 mm au croisement : 7,08 mm) est retirée. La fente et le clip restent ceux des autres types (5 mm).
- **Tray** : la fente traverse le fond (elle est dans le pied du muret, que le fond ne touche pas), jusqu'au pied de la pente haute relevée (3,60 mm), comme avec l'ADR 0013.
- **Peau** : 0,8 mm au moins côté poche dans les 4 types et les 2 profils, poteaux du Skeleton compris (mesuré de z = 0,1 au haut de la fente) ; rien n'est retiré au-dessus du haut de la fente.

## Assemblage (ADR 0004)

- `clipLayoutOf` parcourt chaque coupe, jonction par jonction ; `ClipPlacement` garde `offset` (décalage depuis le milieu du bord) et gagne `start` (distance au croisement). Les outils de fente des briques et des booléens sont inchangés dans leur forme : même volume par les deux voies, `NoError`, aucune arête pincée.
- **Briques** : l'outil de fente d'une brique est désormais un seul maillage (un prisme en L, `loft`), sans booléen. Une fente ne touche jamais une couture soudée : elle s'arrête avant le croisement, et ne s'ouvre que sur la face de coupe.
- **Lamelles** (`cellLamellas`, `lamellaKey`) : la clé de brique d'une cellule de CLICKbase porte désormais l'étendue de chaque lamelle ; l'outil de poche (`clickPocketTool`) les reçoit telles quelles.
- **Aperçu** : sans fentes (et donc lamelles entières). Elles ne se voient pas de dessus, et la qualité finale, affichée dès que les réglages se posent, les a toutes. Avec elles, l'aperçu du tiroir de 1000 × 1000 en 25 pièces prenait 6 à 11 ms de plus (et 44 ms en CLICKbase, 12 motifs de lamelles de plus), au-delà des 100 ms en Skeleton et CLICKbase avec vis. `layout.clips` et `stats.clips` sont les mêmes en aperçu et en finale.
- **Soudure des briques** : la clé d'un sommet de couture est un nombre (au lieu d'une chaîne), et la clé de chaque cellule est calculée une fois : environ −4 ms sur l'aperçu du tiroir de 1000 × 1000, pour tous les types.

## Interface

- La famille **Clips** est cachée quand la baseplate tient en une pièce (comme Empiler) ; le réglage reste dans le lien.
- La famille **Alignement** est cachée quand la baseplate n'a aucune marge, dans les deux modes ; elle revient dès qu'une marge existe. La valeur reste dans le lien.
- Le mode de taille « Tiroir » s'appelle **« Dimensions »** (FR et EN) ; son aide garde « Cotes intérieures du tiroir ». La clé `mode=drawer` ne change pas.

## Considered Options

- **Toutes les fentes collées à l'axe du croisement** (lecture littérale du ticket) : au croisement de deux coupes, les deux fentes d'un coin se chevauchent et coupent les dents. Écarté.
- **Fentes décalées d'un seul côté** (celles d'une coupe à l'axe, celles de l'autre à 2,15 mm) : asymétrique, et 7,15 mm de long au total, trop pour le poteau du Skeleton. Écarté pour le départ symétrique de 1,92 mm.
- **CLICKbase : fente raccourcie** (2,08 mm au croisement) ou **lamelle voisine retirée** (7 lamelles sur 8 pour les cellules des coins, serrage déséquilibré). Écartés pour la lamelle raccourcie (**à valider** à l'impression : la tenue d'un bac dans une cellule de coin).
- **Skeleton : poteau allongé du côté d'un clip**, pour garder une fente de 5 mm : l'outil de poche entaillé (un maillage fait main) devrait porter des entailles asymétriques. Écarté pour une fente de 4,0 mm (**à valider** : la tenue d'un clip de 3,5 mm).
- **Un seul clip au milieu de la jonction** : c'est au bout, surtout au croisement de quatre pièces, que la coupe s'ouvre.

## Consequences

- **À valider par l'impression** (recette #16, `prototypes/clips-corner/files/`) : la tenue du coin au croisement de quatre pièces, le mur de 0,8 mm vers la marge, le clip court du Skeleton, le bac dans une cellule de coin d'un CLICKbase à lamelle raccourcie.
- **À valider** : un seul clip pour une jonction d'une ou deux cellules, au croisement des coupes plutôt qu'au bord.
- Volume du tiroir par défaut découpé : 79,18 cm³ (8 clips) au lieu de 79,0 (15) ; 500 × 300 : 111,4 cm³ (14 clips au lieu de 25).
- **Performance** (médianes locales, aperçu du tiroir de 1000 × 1000 en 25 pièces, seuil de 100 ms) : Normal 70,0 ms, avec vis 79,2 ; Tray 59,7 / 69,9 ; Skeleton 87,2 / 96,7 ; CLICKbase 83,5 / 97,4. Finale CLICKbase 2,1 s (seuil 3 s). Skeleton et CLICKbase avec vis restent à 3 ms du seuil, comme avant ce ticket.

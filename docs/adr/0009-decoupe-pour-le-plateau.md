---
status: proposed
---

# Découpe pour le plateau : plan par axe, pièces en briques, numéro gravé dessous

Le tiroir par défaut (399 × 279 mm) ne tient pas sur un plateau de 256 mm. Depuis #21, le moteur découpe une baseplate qui ne tient sur le plateau dans aucun des deux sens, en pièces qui y tiennent (spec v1.1, #20). Le plateau est une préférence locale : c'est une option de `generateBaseplate` (`{ buildPlate }`), hors des réglages de la baseplate, donc hors du lien de partage. Sans plateau, le moteur ne découpe jamais.

## Plan de découpe (`packages/geometry/src/split.ts`)

- **Où couper** : sur les lignes du treillis des briques (ADR 0004, ADR 0008), c'est-à-dire la grille et les cellules entières que la marge prolonge au-delà. Une coupe traverse toute la baseplate, marge comprise, dans l'axe d'un muret : chaque pièce garde un demi-muret, comme le bord d'une baseplate. Le reste de la marge suit la pièce de bord. Une grande marge de cellules entières (mode cellules, jusqu'à 500 mm) se découpe comme la grille.
- **Programmation dynamique par axe** (`docs/research/gridfinity-baseplate.md` A.5, `decoupe-et-clips.md`). Les pièces forment une grille : chaque axe est découpé seul. Critères, dans l'ordre :
  1. le moins de pièces ;
  2. le moins de pièces d'une seule cellule ;
  3. les pièces les plus égales (somme des carrés des longueurs, en mm, la plus faible).
- **Deux orientations** : le plan est calculé pour le plateau tel quel et tourné d'un quart. On garde, dans l'ordre : toutes les pièces sur le plateau, le moins de pièces, le moins de pièces d'une cellule, les aires les plus égales, puis le plateau tel quel.
- **Aucune marge de plateau cachée** : une pièce tient si elle mesure au plus la taille utile saisie, à 0,001 mm près.
- **Plateau trop petit** : si une cellule seule n'y tient pas, l'axe n'est pas coupé, car couper ne servirait à rien. Si une cellule tient, mais pas avec sa marge, les pièces de bord gardent une seule cellule, et le plan le signale (`fits: false`). L'interface l'affiche (« ne tient pas »).
- **Numérotation** : de 1, rangée par rangée, de l'arrière gauche à l'avant droit, le tiroir vu de dessus (l'ordre des 9 alignements).

Exemples (banc `prototypes/split/`) : le tiroir par défaut sur 256 × 256 donne 4 pièces (4 + 5 colonnes, 3 + 3 rangées ; la plus grande fait 220,5 × 139,5 mm). Sur 180 × 180, il en donne 6. Une 20 × 20 donne 16 pièces de 5 × 5. Une 10 × 4 sur un plateau de 200 × 300 donne 2 pièces, plan tourné.

## Géométrie

- **Pièces en briques** : une coupe tombe sur une couture entre deux briques. Chaque pièce assemble les briques de ses cellules et garde leurs faces du côté de la coupe : la face est plane, les coins sont vifs, sans rayon ni chanfrein. Les briques restent celles de la baseplate entière, calculées une seule fois. Avec un chanfrein du dessous, les briques intérieures reçoivent l'anneau de sommets que `slabOf` pose en haut du chanfrein, pour que leurs faces sur une coupe rejoignent celles des briques du bord sur les mêmes sommets.
- **Voie booléenne** : la baseplate entière est coupée par la boîte de chaque pièce, qui déborde du contour du côté du contour. On retrouve les mêmes volumes, à moins de 0,1 mm³ près.
- **Vis** : aucune vis sur une ligne de coupe (`hasScrew`). Sur le tiroir par défaut, 28 vis au lieu de 40.
- **Numéro gravé** (`label.ts`) : sous chaque pièce, seulement quand il y en a plusieurs. Chiffres à sept segments de 3 mm de haut et 1,8 mm de large, traits de 0,5 mm, espacés de 0,8 mm. La gravure fait 0,4 mm de profondeur, arrondie à la couche supérieure.
  - Un muret est centré sur la couture entre deux briques. Le numéro tient donc dans un demi-muret, 2,80 mm en hybride au fond de la gravure, 2,45 mm en ras. Les chiffres y sont empilés le long du muret, le premier vers l'arrière, et centrés en travers.
  - Ils sont en miroir vu de dessus, pour se lire quand on retourne la pièce.
  - Emplacement : le muret de la ligne la plus proche du milieu de la pièce, au milieu du bord d'une cellule de la rangée du milieu, loin des croisements (vis, aimants). Une pièce d'une colonne prend une ligne en travers. Une pièce d'une seule cellule prend le demi-muret d'une de ses coupes.
  - Le numéro est dans une brique à part, la brique de sa cellule moins les chiffres : aucun booléen sur la pièce entière.
  - Environ 1,1 mm³ de matière retirée par chiffre.

## Interface du moteur

- `layout.split` (`SplitPlan`) : lignes coupées par axe (`columnCuts`, `rowCuts`, en indices de la grille), `turned`, et chaque pièce avec son numéro, ses cellules, son emprise en mm et `fits`.
- `Baseplate.mesh` reste la baseplate entière, assemblée : une coque fermée par pièce, sans sommet partagé. `Baseplate.pieces` donne pour chaque pièce ses plages de sommets et de triangles, ses dimensions et son volume, mesurés sur son maillage.
- `stats.pieces` est le vrai nombre de pièces, et `stats.volume` la somme des volumes des pièces.
- Aides : `pieceMesh`, `spreadPieces` (aperçu : pièces écartées de 4 mm à chaque coupe) et `printPieces` (export : écart de 10 mm, sans chevauchement, et quart de tour si le plan est tourné).
- **Export** : un seul 3MF, un objet nommé par pièce (« pièce 1 »…, dans la langue de la page), une seule translation pour tous les objets. Pour le STL, un zip, avec un fichier par pièce.

## Considered Options

- **Orientation figée** (extrabold, GridFlock) : le plan tourné donne parfois moins de pièces sur un plateau rectangulaire.
- **Rangées décalées en briques** (jonctions en T, GridFlock et `tJunctions` d'extrabold) : plus rigide aux croisements, mais les pièces ne forment plus une grille, et les clips (#22) comme l'empilement (#28) se compliquent. Écartées pour l'instant (**à valider**).
- **Couper la baseplate finie par booléens** : c'est la voie de repli, mais un booléen sur tout le maillage, par pièce, est bien plus lent que l'assemblage des briques.
- **Numéro de 3 mm en travers du muret entier** (5,7 mm au fond), à lire dans le sens du muret : plus lisible, mais à cheval sur la couture de deux briques, qu'il faudrait souder de part et d'autre de la gravure. Écarté au profit des chiffres empilés dans un demi-muret.
- **Un 3MF par pièce dans un zip** (grilling) : un seul 3MF à objets nommés s'ouvre d'un coup dans le trancheur. Le zip reste réservé au STL (**à valider**, spec #20).

## Consequences

- **Découpe automatique, sans interrupteur**, et hors du lien de partage : deux personnes qui ont des plateaux différents obtiennent des pièces différentes à partir du même lien (**à valider**).
- **Coût d'aperçu** (médianes locales, Node) : le tiroir par défaut en 4 pièces prend 31 ms, contre 29 ms entier. Le tiroir de 1000 × 1000 mm en 16 pièces prend 52 ms (33 ms entier), et 88 ms avec ses vis (49 ms). Il faut compter 1,3 ms par numéro gravé. Les finales restent sous 1,1 s, et les seuils de #5 tiennent.
- **Volume** : la somme des pièces est la baseplate entière, moins les numéros (4,5 mm³ sur le tiroir par défaut), et moins les vis retirées, qui rendent de la matière.
- **Tickets suivants** :
  - les clips (#22) se placent le long de `columnCuts` et `rowCuts`, au milieu des bords de cellule ; le numéro n'est sur une coupe que pour une pièce d'une seule cellule ;
  - les aimants (#24) suivent `frame.cuts` comme les vis ;
  - l'empilement (#28) part de `printPieces` ou de `pieceMesh`.
- **Recette #16** : `prototypes/split/files/` contient deux assemblages de 2 pièces, pour juger le raccord à la coupe, sans marge et avec.

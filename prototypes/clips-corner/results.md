# Résultats du banc (généré par `bench.test.ts`)

## Cotes proposées

Fente de l'ADR 0010 inchangée : ±1,35 mm autour de la coupe, dent de 0,50 mm, 5,0 mm de long, canal du pont jusqu'à 0,80 mm (couches de 0,2). Départ depuis l'axe d'un croisement de deux coupes : 1,92 mm (1,35 + 0,80/√2) ; depuis le bord du treillis : 0,80 mm.

## Croisement de deux coupes (2 × 2 cellules en 4 pièces, 4 fentes collées au coin)

Peau côté poche mesurée en travers d'une fente à mi-longueur, à z = 0,10 / 0,50 / 1,50 / haut − 0,10. Col : matière en diagonale entre les coins des deux fentes d'un même quart. Section perdue au-dessus du haut de la fente (3 hauteurs, maximum). Conflit : volume nominal des fentes moins le volume réellement retiré, c'est-à-dire ce qu'elles prendraient déjà vide.

| Type | Profil | Haut de fente (mm) | Peau côté poche (mm) | Col (mm) | Section perdue au-dessus (mm²) | Mur contre l'entaille (Skeleton) | Retiré par clip | Conflit |
|---|---|---|---|---|---|---|---|---|
| normal | hybride | 2,80 | 1,50 / 1,35 / 0,80 / 0,80 | 0,81 | 0,000000 | — | 27,80 mm³ | 0,000 mm³ |
| normal | ras | 2,40 | 1,40 / 1,00 / 0,80 / 0,80 | 0,81 | 0,000000 | — | 24,40 mm³ | 0,000 mm³ |
| tray | hybride | 3,60 | 40,65 / 40,65 / 1,15 / 0,80 | 0,81 | 0,000000 | — | 34,60 mm³ | 0,000 mm³ |
| tray | ras | 3,20 | 40,65 / 40,65 / 0,80 / 0,80 | 0,81 | 0,000000 | — | 31,20 mm³ | 0,000 mm³ |
| skeleton | hybride | 2,80 | 1,50 / 1,35 / 0,80 / 0,80 | 0,81 | 0,000000 | fente ouverte sur l'entaille (poteau jusqu'à 6,85 mm) | 27,80 mm³ | 0,012 mm³ |
| skeleton | ras | 2,40 | 1,40 / 1,00 / 0,80 / 0,80 | 0,81 | 0,000000 | fente ouverte sur l'entaille (poteau jusqu'à 6,90 mm) | 24,40 mm³ | 0,004 mm³ |
| clickbase | hybride | 2,80 | 1,50 / 1,35 / 0,80 / 0,80 | 0,81 | 0,000005 | — | 21,51 mm³ | 25,168 mm³ |
| clickbase | ras | 2,40 | 1,40 / 1,00 / 0,80 / 0,80 | 0,81 | 0,000002 | — | 19,08 mm³ | 21,296 mm³ |

## Bout au bord du treillis (cadre de 10 mm, 2 mm de haut)

Matière le long de la jambe (x = −0,90), en y, du trou du cadre à la fente (bord du treillis en y = −63, fente à partir de -62,20).

| Profil | z (mm) | Matière en y (mm) |
|---|---|---|
| hybride | 0,50 | -73,00 → -62,20 |
| hybride | 2,70 | -63,00 → -62,20 |
| ras | 0,50 | -73,00 → -62,20 |
| ras | 2,30 | -63,00 → -62,20 |

## Longueur de fente possible au croisement de deux coupes (cellule de 42 mm)

| Profil | Normal | Tray | Skeleton | CLICKbase |
|---|---|---|---|---|
| hybride | 5,00 | 5,00 | 4,08 (poteau 6,80 − peau 0,80 − départ 1,92) | 2,08 (lamelle à 4,50 − jeu 0,50 − départ 1,92) |
| ras | 5,00 | 5,00 | 4,13 (poteau 6,85 − peau 0,80 − départ 1,92) | 2,08 (lamelle à 4,50 − jeu 0,50 − départ 1,92) |

## Moteur (ADR 0018)

2 × 2 cellules en 4 pièces, qualité finale : les fentes du moteur, sa longueur de fente par type, et la matière qu'elles retirent (sans clips moins avec clips ; en CLICKbase, les lamelles raccourcies en rendent une partie). Toutes les pièces sont sans arête pincée.

| Type | Profil | Longueur de fente (mm) | Haut (mm) | Clips | Mur contre l'entaille | Matière retirée | Fentes nominales | Volume |
|---|---|---|---|---|---|---|---|---|
| normal | hybride | 5,0 | 2,80 | 4 | — | 111,20 mm³ | 111,20 mm³ | 5,540 cm³ |
| normal | ras | 5,0 | 2,40 | 4 | — | 97,60 mm³ | 97,60 mm³ | 4,932 cm³ |
| tray | hybride | 5,0 | 3,60 | 4 | — | 138,40 mm³ | 138,40 mm³ | 10,094 cm³ |
| tray | ras | 5,0 | 3,20 | 4 | — | 124,80 mm³ | 124,80 mm³ | 9,486 cm³ |
| skeleton | hybride | 4,0 | 2,80 | 4 | 0,93 mm | 88,96 mm³ | 88,96 mm³ | 5,145 cm³ |
| skeleton | ras | 4,1 | 2,40 | 4 | 0,88 mm | 80,03 mm³ | 80,03 mm³ | 4,576 cm³ |
| clickbase | hybride | 5,0 | 2,80 | 4 | — | 46,96 mm³ | 111,20 mm³ | 4,695 cm³ |
| clickbase | ras | 5,0 | 2,40 | 4 | — | 47,84 mm³ | 97,60 mm³ | 4,310 cm³ |

Tiroir par défaut (400 × 280) découpé pour un plateau de 256 mm : départ de chaque fente depuis son croisement (colonne puis ligne).

| Type | Pièces | Clips | Départs (mm) | Volume |
|---|---|---|---|---|
| normal | 4 | 8 | 0,80 / 1,92 / 1,92 / 0,80 / 0,80 / 1,92 / 1,92 / 0,80 | 79,18 cm³ |
| tray | 4 | 8 | 0,80 / 1,92 / 1,92 / 0,80 / 0,80 / 1,92 / 1,92 / 0,80 | 141,11 cm³ |
| skeleton | 4 | 8 | 0,80 / 1,92 / 1,92 / 0,80 / 0,80 / 1,92 / 1,92 / 0,80 | 42,04 cm³ |
| clickbase | 4 | 8 | 0,80 / 1,92 / 1,92 / 0,80 / 0,80 / 1,92 / 1,92 / 0,80 | 67,00 cm³ |

## Fichiers

- `files/kit-coin-croisement-skeleton.3mf` : 2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes ; pièce 1, pièce 2, pièce 3, pièce 4, clip × 4 ; relus NoError, 0 arête pincée ; 5,14 cm³, fente de 4,0 mm.
- `files/kit-coin-croisement-clickbase.3mf` : 2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes ; pièce 1, pièce 2, pièce 3, pièce 4, clip × 4 ; relus NoError, 0 arête pincée ; 4,69 cm³, fente de 5,0 mm.
- `files/kit-coin-croisement-normal.3mf` : 2 × 2 cellules en 4 pièces, 4 clips au croisement des coupes ; pièce 1, pièce 2, pièce 3, pièce 4, clip × 4 ; relus NoError, 0 arête pincée ; 5,54 cm³, fente de 5,0 mm.
- `files/kit-coin-bord-skeleton.3mf` : 2 × 3 cellules et un cadre de 10 mm, en 2 pièces : une jonction de 3 cellules, un clip à chaque bout, au bord de la grille ; pièce 1, pièce 2, clip × 2 ; relus NoError, 0 arête pincée ; 7,96 cm³, fente de 4,0 mm.
- `files/kit-coin-bord-clickbase.3mf` : 2 × 3 cellules et un cadre de 10 mm, en 2 pièces : une jonction de 3 cellules, un clip à chaque bout, au bord de la grille ; pièce 1, pièce 2, clip × 2 ; relus NoError, 0 arête pincée ; 8,69 cm³, fente de 5,0 mm.

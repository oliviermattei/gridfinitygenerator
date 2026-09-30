# Résultats du banc (généré par `bench.test.ts`)

## Banc de 3 × 2 cellules, 12 mm de marge tout autour (150 × 108 mm), qualité finale

Grille seule (le même banc sans marge, `margin: false`) : 8433 mm³. Surplus : volume du banc moins celui de sa grille seule. Contact : longueur du contour de la première couche posée contre les parois du tiroir, sur les côtés en X (gauche et droite, 2 × 108 mm au plus hors arrondis) et en Y (avant et arrière, 2 × 150 mm).

| Variante | Ce qui change | Volume (mm³) | Surplus (mm³) | Contact X / Y (mm) | Triangles | Fichier 3MF | Relu |
|---|---|---|---|---|---|---|---|
| Cadre minimal A | moteur : traverse et mur pleine hauteur, 1,2 mm (3 lignes) | 9162 | 729 | 22,8 / 22,8 | 8668 | `banc-cadre-minimal-A-moteur.3mf` (121 Ko) | NoError, 9162 mm³ |
| Cadre minimal B | appuis à 2,00 mm de haut, comme le cadre complet | 8750 | 317 | 22,8 / 22,8 | 8680 | `banc-cadre-minimal-B-2mm.3mf` (121 Ko) | NoError, 8750 mm³ |
| Cadre minimal C | traverse et mur de 2,0 mm (5 lignes) | 10091 | 1658 | 22,8 / 22,8 | 8850 | `banc-cadre-minimal-C-5-lignes.3mf` (123 Ko) | NoError, 10091 mm³ |
| Cellules minimales A | moteur : première et dernière cellule tronquée, murets entiers, mur de 1,2 mm | 15736 | 7304 | 179,4 / 190,8 | 16476 | `banc-cellules-minimal-A-moteur.3mf` (225 Ko) | NoError, 15736 mm³ |
| Cellules minimales B | cellules d'appui à 2,00 mm de haut | 12041 | 3608 | 179,4 / 190,8 | 14864 | `banc-cellules-minimal-B-2mm.3mf` (203 Ko) | NoError, 12041 mm³ |
| Cellules minimales C | mur extérieur prolongé de 10 mm vers le milieu de chaque côté | 16151 | 7718 | 179,4 / 230,8 | 16712 | `banc-cellules-minimal-C-mur-prolonge.3mf` (228 Ko) | NoError, 16151 mm³ |
| Grille minimale A | moteur : murets d'appui entiers, talon de 1,2 mm | 10239 | 1806 | 22,8 / 22,8 | 11334 | `banc-grille-minimale-A-moteur.3mf` (159 Ko) | NoError, 10239 mm³ |
| Grille minimale B | talon de 2,4 mm (6 lignes) | 10540 | 2107 | 22,8 / 22,8 | 11408 | `banc-grille-minimale-B-talon-2-4.3mf` (160 Ko) | NoError, 10540 mm³ |
| Grille minimale C | talon élargi en patin de 10 mm le long du tiroir | 10621 | 2188 | 40,0 / 40,0 | 11436 | `banc-grille-minimale-C-patin-10.3mf` (160 Ko) | NoError, 10621 mm³ |
| Grille prolongée complète | moteur : tous les murets prolongés, un talon au bout de chacun | 14196 | 5763 | 34,2 / 45,6 | 19414 | `banc-grille-prolongee.3mf` (263 Ko) | NoError, 14196 mm³ |
| Cadre complet (référence) | moteur, non exporté | 10009 | 1576 | 200,8 / 284,8 | 9844 | non exporté | — |
| Cellules complètes (référence) | moteur, non exporté | 16545 | 8112 | 200,8 / 284,8 | 20372 | non exporté | — |

## Tiroir par défaut (400 × 280 mm, 9 × 6 cellules, marges de 10,5 et 13,5 mm), qualité finale

Surplus : volume de la baseplate moins celui de sa grille seule, mêmes réglages (aimants, découpe et clips compris).

| Forme | Marge | Entière : volume (cm³) | Surplus (cm³) | Aimants | Découpée pour 256 mm : volume (cm³) | Surplus (cm³) | Aimants |
|---|---|---|---|---|---|---|---|
| Grille seule | — | 74,29 | — | 40 | 74,75 | — | 28 |
| Cadre | complète | 78,42 | + 4,13 | 40 | 78,98 | + 4,24 | 28 |
| Cadre | minimale | 75,02 | + 0,73 | 40 | 75,47 | + 0,73 | 28 |
| Cellules | complète | 96,43 | + 22,14 | 70 | 97,18 | + 22,43 | 54 |
| Cellules | minimale | 82,23 | + 7,94 | 40 | 82,68 | + 7,94 | 28 |
| Grille prolongée | complète | 90,07 | + 15,78 | 70 | 90,82 | + 16,07 | 54 |
| Grille prolongée | minimale | 76,10 | + 1,81 | 40 | 76,55 | + 1,81 | 28 |

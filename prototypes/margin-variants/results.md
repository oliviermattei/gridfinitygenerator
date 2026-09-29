# Mesures générées par `pnpm generate` (ne pas éditer à la main)

## Banc d'essai : 2 × 2 cellules + 25 mm de marge à droite et à l'arrière (109 × 109 mm)

Grille seule (2 × 2, sans marge) : 5 703,3 mm³.

| Variante | Hauteur de marge | Volume total (mm³) | Volume de la marge (mm³) | Marge / marge pleine | Triangles | Fichier 3MF | Maillage relu |
|---|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 27 850,9 | 22 147,5 | 100,0 % | 5 864 | non exporté | NoError (en mémoire) |
| Marge pleine (référence) | 2,00 mm | 15 332,7 | 9 629,4 | 100,0 % | 5 856 | non exporté | NoError (en mémoire) |
| 1. Cellules tronquées vides | 4,60 mm | 10 344,9 | 4 641,5 | 21,0 % | 9 672 | `banc-1-cellules-tronquees-h4.6.3mf` (93 Ko) | NoError, genre 9 |
| 1. Cellules tronquées vides | 2,00 mm | 8 057,8 | 2 354,5 | 24,5 % | 8 586 | `banc-1-cellules-tronquees-h2.0.3mf` (81 Ko) | NoError, genre 9 |
| 2. Équerres de coin seules | 4,60 mm | 6 694,8 | 991,5 | 4,5 % | 6 330 | `banc-2-equerres-h4.6.3mf` (60 Ko) | NoError, genre 5 |
| 2. Équerres de coin seules | 2,00 mm | 6 134,4 | 431,1 | 4,5 % | 6 320 | `banc-2-equerres-h2.0.3mf` (60 Ko) | NoError, genre 5 |
| 3. Cadre à nervures | 4,60 mm | 7 664,1 | 1 960,8 | 8,9 % | 6 336 | `banc-3-cadre-nervures-h4.6.3mf` (60 Ko) | NoError, genre 9 |
| 3. Cadre à nervures | 2,00 mm | 6 555,8 | 852,5 | 8,9 % | 6 326 | `banc-3-cadre-nervures-h2.0.3mf` (60 Ko) | NoError, genre 9 |

### Maintien et impression (banc, couche de 0,2 mm)

Contact : longueur du contour de la première couche posée à plat contre la paroi du tiroir, sur les côtés qui ont une marge (droite et arrière ; côté droit 101 mm au plus, hors arrondis de coin). Périmètres et boucles : somme sur les 23 couches de la longueur des contours et de leur nombre, mesurée par coupes du maillage ; l'écart est pris par rapport à la grille seule.

| Variante | Hauteur | Contact droite / arrière (mm) | Longueur de contours (m) | Écart / grille seule (m) | Boucles | Écart / grille seule |
|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 101,0 / 101,0 | 23,58 | +2,18 | 115 | +0 |
| Marge pleine (référence) | 2,00 mm | 101,0 / 101,0 | 22,35 | +0,95 | 115 | +0 |
| 1. Cellules tronquées vides | 4,60 mm | 101,0 / 101,0 | 36,39 | +14,99 | 230 | +115 |
| 1. Cellules tronquées vides | 2,00 mm | 101,0 / 101,0 | 27,81 | +6,41 | 165 | +50 |
| 2. Équerres de coin seules | 4,60 mm | 37,0 / 37,0 | 29,61 | +8,21 | 138 | +23 |
| 2. Équerres de coin seules | 2,00 mm | 37,0 / 37,0 | 24,97 | +3,57 | 125 | +10 |
| 3. Cadre à nervures | 4,60 mm | 101,0 / 101,0 | 37,46 | +16,06 | 230 | +115 |
| 3. Cadre à nervures | 2,00 mm | 101,0 / 101,0 | 28,38 | +6,98 | 165 | +50 |

## Tiroir par défaut de la spec : 400 × 280 mm, jeu de 1 mm, grille centrée (9 × 6 cellules, marges de 10,5 et 13,5 mm)

Grille seule (9 × 6) : 77,21 cm³. Non exporté, mesuré seulement.

| Variante | Hauteur de marge | Volume de la marge (cm³) | Volume total (cm³) | Marge / marge pleine | Contact gauche / droite / avant / arrière (mm) | Longueur de contours, écart / grille seule (m) |
|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 73,84 | 151,04 | 100,0 % | 271 / 271 / 391 / 391 | +2,05 |
| Marge pleine (référence) | 2,00 mm | 32,10 | 109,31 | 100,0 % | 271 / 271 / 391 / 391 | +0,89 |
| 1. Cellules tronquées vides | 4,60 mm | 24,32 | 101,53 | 32,9 % | 271 / 271 / 391 / 391 | +69,21 |
| 1. Cellules tronquées vides | 2,00 mm | 12,20 | 89,40 | 38,0 % | 271 / 271 / 391 / 391 | +29,30 |
| 2. Équerres de coin seules | 4,60 mm | 2,43 | 79,63 | 3,3 % | 59 / 59 / 73 / 73 | +20,00 |
| 2. Équerres de coin seules | 2,00 mm | 1,05 | 78,26 | 3,3 % | 59 / 59 / 73 / 73 | +8,70 |
| 3. Cadre à nervures | 4,60 mm | 9,50 | 86,71 | 12,9 % | 271 / 271 / 391 / 391 | +77,31 |
| 3. Cadre à nervures | 2,00 mm | 4,13 | 81,34 | 12,9 % | 271 / 271 / 391 / 391 | +33,62 |

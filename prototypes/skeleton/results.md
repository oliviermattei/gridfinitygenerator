# Résultats du banc (généré par `bench.test.ts`)

## Matière (moteur en qualité finale, bande de 0,40 mm)

Chaque case : murets intérieurs entaillés, contour de la grille entier (règle retenue) ; puis le contour aussi entaillé (comme extrabold). Extrabold mesure × 0,44 sur la 2 × 2 et la 4 × 4, marge comprise.

| Cas | Normal (cm³) | E : extrabold (19 → 38 mm, flancs à 26°) | P : bras de 5 mm en haut, flancs à 45° | V : bras de 4 mm, flancs verticaux |
|---|---|---|---|---|
| 2 × 2 sans marge, sans aimant | 5,66 | 4,03 (× 0,71) ; contour aussi : 2,41 (× 0,43) | 3,98 (× 0,70) ; contour aussi : 2,31 (× 0,41) | 3,56 (× 0,63) ; contour aussi : 1,46 (× 0,26) |
| 4 × 4 sans marge, sans aimant | 22,81 | 13,06 (× 0,57) ; contour aussi : 9,81 (× 0,43) | 12,79 (× 0,56) ; contour aussi : 9,44 (× 0,41) | 10,23 (× 0,45) ; contour aussi : 6,04 (× 0,26) |
| tiroir par défaut (cadre), aimants | 78,42 | 40,64 (× 0,52) ; contour aussi : 34,55 (× 0,44) | 39,57 (× 0,50) ; contour aussi : 33,30 (× 0,42) | 29,67 (× 0,38) ; contour aussi : 21,80 (× 0,28) |

## Assise d'un pied standard dans la cellule d'une 2 × 2 (tout entaillé, contour compris)

| Variante | Dessous du pied (mm) | Jeu en X (mm) | Jeu en diagonale (mm) |
|---|---|---|---|
| Normal | 0,000 | 0,000 | 0,000 |
| E : extrabold (19 → 38 mm, flancs à 26°) | 0,000 | 0,000 | 0,000 |
| P : bras de 5 mm en haut, flancs à 45° | 0,000 | 0,000 | 0,000 |
| V : bras de 4 mm, flancs verticaux | 0,000 | 0,000 | 0,000 |

## Poteau du croisement central d'une 2 × 2 (bras mesuré le long du muret, depuis l'axe)

Avec l'aimant (Ø 6,5, 2,20 de profondeur) : bout du bras à chaque hauteur ; la paroi le long du muret est le bras moins 3,25. Avec une vis (tête + jeu) : bout du bras au-dessus de l'assise (2,80), à z = 2,9 / 4,1 / 4,55 ; 0 quand l'alésage a tout mangé.

| Variante | z = 0,20 | z = 0,41 | z = 1,00 | z = 2,10 | z = 2,90 | z = 4,10 | z = 4,55 | vis 6 + 0,5 | vis 8 + 1 |
|---|---|---|---|---|---|---|---|---|---|
| E : extrabold (19 → 38 mm, flancs à 26°) | 21,00 | 11,38 | 10,18 | 7,92 | 6,29 | 3,84 | 2,92 | 6,29 / 3,84 / 0,00 | 6,29 / 0,00 / 0,00 |
| P : bras de 5 mm en haut, flancs à 45° | 21,00 | 9,19 | 8,60 | 7,50 | 6,70 | 5,50 | 5,05 | 6,70 / 5,50 / 5,05 | 6,70 / 5,50 / 5,05 |
| V : bras de 4 mm, flancs verticaux | 21,00 | 4,00 | 4,00 | 4,00 | 4,00 | 4,00 | 4,00 | 4,00 / 4,00 / 4,00 | 0,00 / 0,00 / 0,00 |

## Numéro de pièce

- Gravure de 0,40 mm dans une bande de 0,40 mm : elle la traverserait. Le bord de cellule qui porte le numéro garde son muret entier (ses deux moitiés).

## Fichiers (relus, `NoError`)

- `files/banc-2x2-skeleton.3mf` : relu NoError. Skeleton 2 × 2 du moteur (variante P, contour entier) : 4,60 mm, bande 0,40 mm, 1 aimant ; 3,91 cm³ contre 5,58 en Normal (× 0,70).
- `files/banc-2x2-skeleton-tout-entaille.3mf` : relu NoError. variante P, contour de la grille entaillé aussi, pour comparer la tenue des bords et le guidage.
- `files/banc-2x2-skeleton-extrabold.3mf` : relu NoError. variante E (entaille d'extrabold, tout entaillé), pour comparer le guidage par les coins en haut.

## Le moteur (qualité finale, aimants compris)

- Tiroir par défaut : Normal 78,42 cm³, Skeleton 39,57 cm³ (× 0,50), le banc 39,57 cm³.
- Coupé pour un plateau de 256 mm (4 pièces, 0 clip) : Normal 78,98 cm³, Skeleton 42,21 cm³ (× 0,53) : chaque pièce garde entier le bord de cellule de son numéro, et les croisements coupés n'ont pas d'aimant.

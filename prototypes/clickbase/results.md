# Résultats du banc (généré par `bench.test.ts`)

## Coupes horizontales du banc (serrage 0,25, profil hybride)

Matière le long d'une droite perpendiculaire au côté +Y d'une cellule, en mm depuis le centre de la cellule, jusqu'au milieu du muret (21,00). La paroi verticale de la poche est à 18,85 ; le pied d'un bac standard, à 18,60.

### Hors de l'ergot (6 mm du milieu du côté)

| z | Matière |
|---|---|
| 0,10 | 18,15 → 21,00 |
| 0,30 | 19,25 → 19,62 ; 20,15 → 21,00 |
| 0,70 | 19,25 → 19,50 ; 20,15 → 21,00 |
| 1,10 | 19,25 → 19,38 ; 20,15 → 21,00 |
| 1,50 | 18,85 → 19,65 ; 20,15 → 21,00 |
| 2,00 | 18,85 → 19,65 ; 20,15 → 21,00 |
| 2,20 | 18,85 → 19,65 ; 20,15 → 21,00 |
| 2,40 | 18,85 → 19,65 ; 20,15 → 21,00 |
| 3,00 | 19,00 → 19,65 ; 20,15 → 21,00 |
| 3,50 | 19,50 → 19,65 ; 20,15 → 21,00 |
| 4,00 | 20,15 → 21,00 |

### Au milieu de l'ergot (10,5 mm du milieu du côté)

| z | Matière |
|---|---|
| 0,10 | 18,15 → 21,00 |
| 0,30 | 18,75 → 19,12 ; 19,65 → 21,00 |
| 0,70 | 18,75 → 19,00 ; 19,65 → 21,00 |
| 1,10 | 18,75 → 18,88 ; 19,65 → 21,00 |
| 1,50 | 18,35 → 19,15 ; 19,65 → 21,00 |
| 2,00 | 18,35 → 19,15 ; 19,65 → 21,00 |
| 2,20 | 18,55 → 19,35 ; 19,85 → 21,00 |
| 2,40 | 18,75 → 19,55 ; 20,05 → 21,00 |
| 3,00 | 19,00 → 19,65 ; 20,15 → 21,00 |
| 3,50 | 19,50 → 19,65 ; 20,15 → 21,00 |
| 4,00 | 20,15 → 21,00 |

### Au milieu du côté (0 mm) : rien n'est retiré, place pour un clip ou un numéro

| z | Matière |
|---|---|
| 0,10 | 18,15 → 21,00 |
| 0,30 | 18,15 → 21,00 |
| 0,70 | 18,50 → 21,00 |
| 1,10 | 18,85 → 21,00 |
| 1,50 | 18,85 → 21,00 |
| 2,00 | 18,85 → 21,00 |
| 2,20 | 18,85 → 21,00 |
| 2,40 | 18,85 → 21,00 |
| 3,00 | 19,00 → 21,00 |
| 3,50 | 19,50 → 21,00 |
| 4,00 | 20,00 → 21,00 |

## Serrages (2 × 2 hybride sans aimant, 8 lamelles par cellule)

Normal : 5,66 cm³. Serrage mesuré = pied du bac (18,60) moins la face de l'ergot, sur la coupe à z = 1,5. Interférence = volume du pied assis à z = 0 qui entre dans les ergots d'une cellule (8 ergots).

| Variante | Saillie de l'ergot (mm) | Serrage mesuré (mm) | Matière | Interférence (mm³) |
|---|---|---|---|---|
| serrage 0,15 | 0,40 | 0,150 | 4,71 (× 0,83) | 3,7 |
| serrage 0,25 (Refined, retenu) | 0,50 | 0,250 | 4,75 (× 0,84) | 6,9 |
| serrage 0,35 | 0,60 | 0,350 | 4,78 (× 0,85) | 10,6 |

## Coupes verticales

- `files/coupe-ergot-hybride.svg` : au milieu d'un ergot, le muret entre deux cellules, et le pied d'un bac assis.
- `files/coupe-lamelle-hybride.svg` : hors de l'ergot.

## Fichiers (relus, `NoError`)

- `files/banc-2x2-clickbase.3mf` : relu NoError. CLICKbase 2 × 2 du moteur (serrage 0,25, profil hybride) : 4,60 mm, 1 aimant ; 4,67 cm³ contre 5,58 en Normal.
- `files/banc-2x2-clickbase-ras.3mf` : relu NoError. CLICKbase 2 × 2 du moteur en profil ras (4,25 mm, celui de Refined) : 4,29 cm³.
- `files/banc-2x2-clickbase-serrage-015.3mf` : relu NoError. banc, serrage 0,15 (saillie de l'ergot 0,40 mm), 1 aimant.
- `files/banc-2x2-clickbase-serrage-035.3mf` : relu NoError. banc, serrage 0,35 (saillie de l'ergot 0,60 mm), 1 aimant.

## Contre CLICKbase Refined

- 2 × 2 en profil ras, sans aimant : moteur 4,363 cm³, 84,00 × 84,00 × 4,25 mm ; Refined 4,268 cm³, 84,00 × 84,00 × 4,25 mm (`refined.mjs`).

## Le moteur (qualité finale, aimants compris)

- 2 × 2 : Normal 5,58 cm³, CLICKbase 4,67 cm³, le banc 4,67 cm³.
- Tiroir par défaut : Normal 78,42 cm³, CLICKbase 66,14 cm³ (× 0,84), le banc 66,14 cm³.
- Coupé pour un plateau de 256 mm (4 pièces) : Normal 78,98 cm³ et 15 clips, CLICKbase 66,70 cm³ et 15 clips : les clips restent au milieu des côtés, entre les lamelles.

## Clips

- Au milieu de chaque côté, 9 mm restent pleins entre les deux lamelles (de −4,5 à +4,5 mm) : un clip de 8 mm au plus y tient, centré.

# Résultats du banc (généré par `bench.test.ts`)

## Assise d'un pied de bac standard (1 × 1, cellule de 42 mm)

Pied de la spec (0,8 / 1,8 / 2,15, dessus 41,5 mm, rayon 3,75), posé par bissection jusqu'au premier contact (chevauchement < 0,001 mm³). « Parois seules » : hauteur où le pied touche la poche, le tiroir ôté. « Touche » : ce que le pied entame quand on le descend de 0,01 mm sous son assise, segment par segment du profil, plus le tiroir s'il s'arrête à z = 0.

| Profil | Points [z ; retrait] | Hauteur | Pied sur les parois seules | Pied s'arrête à | Jeu latéral | Touche |
|---|---|---|---|---|---|---|
| hybride | [0,00 ; 2,85] [0,35 ; 2,85] [1,05 ; 2,15] [2,85 ; 2,15] [4,60 ; 0,40] | 4,60 | 0,000 | 0,000 | 0,000 | pente basse, pente haute, fond du tiroir |
| sans biseau | [0,00 ; 2,15] [2,85 ; 2,15] [4,60 ; 0,40] | 4,60 | 0,000 | 0,000 | 0,000 | pente haute, fond du tiroir |

## Matière et emprise (1 × 1, sans marge ni aimant, rayon extérieur 4, 32 segments par quart)

Masse : volume mesuré × 1,24 g/cm³ (PLA). Emprise : aire de la section à z = 0,001 mm, ce qui touche le plateau. Muret au pied : du profil (2 × retrait à z = 0 entre deux cellules, 1 × au bord sans marge).

| Profil | Volume (mm³) | Masse (g) | Emprise à z = 0 (mm²) | Muret au pied entre deux cellules (mm) | Muret au pied au bord (mm) | Rayon de la poche au fond (mm) | Jeu pied/paroi à z = 0 (mm) |
|---|---|---|---|---|---|---|---|
| hybride | 1366,5 | 1,69 | 433,7 | 5,70 | 2,85 | 1,15 | 0,35 |
| sans biseau | 1295,1 | 1,61 | 331,9 | 4,30 | 2,15 | 1,85 | 1,05 |

## Contraintes du pied de muret (moteur, profil substitué, qualité finale, réglages par défaut)

- **Aimant** (ADR 0012) : 2 × 2, trou Ø 6,5 × 2,20 sous le croisement central. Point de poche le plus proche de l'axe, mesuré sur les sections sans aimant, à z = 0,05 puis le minimum de z = 0,05 à 2,10 ; « formule » : 4·√2 − (4 − retrait à z = 0). Vérifié : à chaque hauteur sous le plafond, la section perd exactement le disque (le trou est tout entier dans la matière), et rien au-dessus.
- **Vis** (ADR 0006) : 3 × 3, vis de 3 / 6 mm, jeu 0,5, aux 4 croisements intérieurs, sans aimant. Assise au plus haut nombre de couches sous le pied de la pente haute. Vérifié : de z = 0,05 à l'assise, chaque section perd exactement les 4 trous (fraisure comprise). Paroi : point de poche le plus proche moins le rayon du trou à cette hauteur, minimum sous l'assise.
- **Fentes de clip** (ADR 0010, 0018, 0022) : 2 × 2 coupé en 4 pièces d'une cellule (plateau de 50 mm), fentes sur les coupes et fentes de bord. Peau côté poche mesurée en travers de chaque fente, à mi-longueur, à z = 0,05, 0,5, 1,5 et haut − 0,05. Vérifié : rien de retiré au-dessus du haut de la fente.

| Profil | Aimant : poche la plus proche à z = 0,05 / minimum (mm) | Paroi de l'aimant (mm) | Assise de la vis (mm) | Paroi de la vis sous l'assise (mm) | Haut de la fente (mm) | Peau de fente au fond (mm) | Peau min, coupes (mm) | Peau min, bords (mm) | Fentes coupes + bords |
|---|---|---|---|---|---|---|---|---|---|
| hybride | 4,507 (formule 4,507) / 3,807 | 0,557 | 2,80 | 0,567 (z 2,79) | 2,80 | 1,500 | 0,800 | 0,800 | 4 + 4 |
| sans biseau | 3,807 (formule 3,807) / 3,807 | 0,557 | 2,80 | 0,567 (z 2,79) | 2,80 | 0,800 | 0,800 | 0,800 | 4 + 4 |

## Fichiers (relus, `NoError`)

- `files/banc-1x1-sans-biseau.3mf` : relu NoError. variante à imprimer : paroi verticale au retrait 2,15 de 0 à 2,85, pente haute jusqu'au plat de 0,4 ; 1 × 1, 4,60 mm, 1295,1 mm³, emprise 331,9 mm² (le moteur, même volume sans fentes ; avec ses 4 fentes de bord : 1239,5 mm³, emprise 304,9 mm²).
- `files/banc-1x1-hybride.3mf` : relu NoError. référence : profil hybride du moteur (ADR 0002) ; 1 × 1, 4,60 mm, 1366,5 mm³, emprise 433,7 mm² (le moteur, même volume sans fentes ; avec ses 4 fentes de bord : 1310,9 mm³, emprise 406,7 mm²).

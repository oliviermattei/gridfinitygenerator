# Résultats du banc (généré par `bench.test.ts`)

## Cotes

Fente : ±1,35 mm de part et d'autre de la coupe, 5,0 mm de long ; demi-dent de 0,50 mm ; canal du pont sur 0,80 mm (couches de 0,2). Clip : jeu de 0,25 mm par bout en long, 0,2 mm en hauteur, chanfrein d'entrée de 0,15 mm en haut des jambes.

- `files/kit-clips-hybride.3mf` : pièce 1, pièce 2, clip jeu 0,05, clip jeu 0,10, clip jeu 0,15, clip jeu 0,20 ; relus NoError. Fente hybride : canal jusqu'à 0,80 mm, jambes jusqu'à 2,80 mm ; 27,80 mm³ retirés par clip (les deux pièces).
- `files/kit-clips-ras.3mf` : pièce 1, pièce 2, clip jeu 0,05, clip jeu 0,10, clip jeu 0,15, clip jeu 0,20 ; relus NoError. Fente ras : canal jusqu'à 0,80 mm, jambes jusqu'à 2,40 mm ; 24,40 mm³ retirés par clip (les deux pièces).

## Peau restante côté poche (pièce de gauche, au droit d'une fente)

Matière le long de la droite y = 6 mm (au milieu d'une fente), en x (la coupe en x = 0, la poche à gauche). Retrait de la poche : distance de la paroi au bord de la cellule.

| Profil | z (mm) | Retrait de la poche (mm) | Matière en x (mm) | Peau côté poche | Section retirée |
|---|---|---|---|---|---|
| hybride | 0,10 | 2,85 | -2,85 → -1,35 | 1,500 mm | 27,000 mm² |
| hybride | 0,70 | 2,50 | -2,50 → -1,35 | 1,150 mm | 27,000 mm² |
| hybride | 1,50 | 2,15 | -2,15 → -1,35 ; -0,50 → 0,00 | 0,800 mm | 17,000 mm² |
| hybride | 2,70 | 2,15 | -2,15 → -1,35 ; -0,50 → 0,00 | 0,800 mm | 17,000 mm² |
| hybride | 2,90 | 2,10 | -2,10 → 0,00 | fente absente, section intacte | 0,000 mm² |
| hybride | 3,50 | 1,50 | -1,50 → 0,00 | fente absente, section intacte | 0,000 mm² |
| hybride | 4,50 | 0,50 | -0,50 → 0,00 | fente absente, section intacte | 0,000 mm² |
| ras | 0,10 | 2,75 | -2,75 → -1,35 | 1,400 mm | 27,000 mm² |
| ras | 0,50 | 2,35 | -2,35 → -1,35 | 1,000 mm | 27,000 mm² |
| ras | 1,50 | 2,15 | -2,15 → -1,35 ; -0,50 → 0,00 | 0,800 mm | 17,000 mm² |
| ras | 2,30 | 2,15 | -2,15 → -1,35 ; -0,50 → 0,00 | 0,800 mm | 17,000 mm² |
| ras | 2,50 | 2,15 | -2,15 → 0,00 | fente absente, section intacte | 0,000 mm² |
| ras | 3,50 | 1,15 | -1,15 → 0,00 | fente absente, section intacte | 0,000 mm² |
| ras | 4,10 | 0,55 | -0,55 → 0,00 | fente absente, section intacte | 0,000 mm² |

## Clips du kit

Dimensions telles qu'imprimées, couché sur le côté : largeur en travers de la coupe × hauteur en service × longueur le long de la coupe.

| Profil | Jeu par face (mm) | Encombrement (mm) | Jambe (mm) | Écart des jambes (mm) | Pont (mm) | Volume | Ouverture possible de la coupe |
|---|---|---|---|---|---|---|---|
| hybride | 0,05 | 2,60 × 2,60 × 4,50 | 0,75 | 1,10 | 0,60 | 20,3 mm³ | 0,10 mm |
| hybride | 0,10 | 2,50 × 2,60 × 4,50 | 0,65 | 1,20 | 0,60 | 18,2 mm³ | 0,20 mm |
| hybride | 0,15 | 2,40 × 2,60 × 4,50 | 0,55 | 1,30 | 0,60 | 16,2 mm³ | 0,30 mm |
| hybride | 0,20 | 2,30 × 2,60 × 4,50 | 0,45 | 1,40 | 0,60 | 14,1 mm³ | 0,40 mm |
| ras | 0,05 | 2,60 × 2,20 × 4,50 | 0,75 | 1,10 | 0,60 | 17,6 mm³ | 0,10 mm |
| ras | 0,10 | 2,50 × 2,20 × 4,50 | 0,65 | 1,20 | 0,60 | 15,9 mm³ | 0,20 mm |
| ras | 0,15 | 2,40 × 2,20 × 4,50 | 0,55 | 1,30 | 0,60 | 14,2 mm³ | 0,30 mm |
| ras | 0,20 | 2,30 × 2,20 × 4,50 | 0,45 | 1,40 | 0,60 | 12,5 mm³ | 0,40 mm |

## Fichier du moteur

- `files/coupe-2x2-en-2-pieces-avec-clips.3mf` : pièce 1, pièce 2, clip × 2 ; relus NoError. 27,80 mm³ retirés par clip, comme le banc ; volume 5,60 cm³ (5,65 cm³ sans clips).

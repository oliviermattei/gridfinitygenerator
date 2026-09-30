# Résultats du banc (généré par `bench.test.ts`)

## Chanfrein du dessous

Plaque de 2 × 2 cellules sans marge, une demi-fente de bord de 5 mm sur le côté droit (x = 42), au bout avant, partie à 4 mm du coin (le rayon du coin). Retiré : volume réellement retiré, sur le nominal de la demi-fente ; déjà vide : ce que le chanfrein avait déjà ôté de la fente. Dent : de quelle hauteur à quelle hauteur la dent garde sa face contre la jambe du clip (x = 42 − 0,5), et sa hauteur. Joint : bas de la face de la dent contre l'autre plaque. Mur : bas de la face de la peau contre la jambe (x = 42 − 1,35). Peau côté poche à z = 0,1 et en haut de la fente − 0,1.

| Profil | Chanfrein (mm) | Retiré | Déjà vide | Dent tenue par la jambe (mm) | Joint (mm) | Mur (mm) | Peau côté poche (mm) |
|---|---|---|---|---|---|---|---|
| hybride | 0,00 | 13,90 / 13,90 mm³ | 0,000 mm³ | 0,80 → 2,80 (2,00 mm) | 0,80 | 0,00 | 1,50 / 0,80 |
| hybride | 0,50 | 13,27 / 13,90 mm³ | 0,625 mm³ | 0,80 → 2,80 (2,00 mm) | 0,80 | 0,00 | 1,50 / 0,80 |
| hybride | 0,80 | 12,30 / 13,90 mm³ | 1,600 mm³ | 0,80 → 2,80 (2,00 mm) | 0,80 | 0,00 | 1,50 / 0,80 |
| hybride | 1,00 | 11,50 / 13,90 mm³ | 2,400 mm³ | 0,80 → 2,80 (2,00 mm) | 0,99 | 0,00 | 1,50 / 0,80 |
| hybride | 1,30 | 10,30 / 13,90 mm³ | 3,600 mm³ | 0,81 → 2,80 (1,99 mm) | 1,29 | 0,00 | 1,50 / 0,80 |
| hybride | 1,50 | 9,46 / 13,90 mm³ | 4,444 mm³ | 1,01 → 2,80 (1,79 mm) | 1,49 | 0,14 | 1,45 / 0,80 |
| hybride | 2,00 | 7,33 / 13,90 mm³ | 6,569 mm³ | 1,51 → 2,80 (1,29 mm) | 1,99 | 0,64 | 0,95 / 0,80 |
| hybride | 3,00 | 3,08 / 13,90 mm³ | 10,819 mm³ | 2,51 → 2,80 (0,29 mm) | 2,80 | 1,64 | 0,00 / 0,80 |
| ras | 0,00 | 12,20 / 12,20 mm³ | 0,000 mm³ | 0,80 → 2,40 (1,60 mm) | 0,80 | 0,00 | 1,40 / 0,80 |
| ras | 0,50 | 11,58 / 12,20 mm³ | 0,625 mm³ | 0,80 → 2,40 (1,60 mm) | 0,80 | 0,00 | 1,40 / 0,80 |
| ras | 0,80 | 10,60 / 12,20 mm³ | 1,600 mm³ | 0,80 → 2,40 (1,60 mm) | 0,80 | 0,00 | 1,40 / 0,80 |
| ras | 1,00 | 9,80 / 12,20 mm³ | 2,400 mm³ | 0,80 → 2,40 (1,60 mm) | 0,99 | 0,00 | 1,40 / 0,80 |
| ras | 1,30 | 8,60 / 12,20 mm³ | 3,600 mm³ | 0,81 → 2,40 (1,59 mm) | 1,29 | 0,00 | 1,40 / 0,80 |
| ras | 1,50 | 7,76 / 12,20 mm³ | 4,444 mm³ | 1,01 → 2,40 (1,39 mm) | 1,49 | 0,14 | 1,35 / 0,80 |
| ras | 2,00 | 5,63 / 12,20 mm³ | 6,569 mm³ | 1,51 → 2,40 (0,89 mm) | 1,99 | 0,64 | 0,85 / 0,80 |
| ras | 3,00 | 1,41 / 12,20 mm³ | 10,794 mm³ | 2,40 → 2,40 (0,00 mm) | 2,40 | 1,64 | 0,00 / 0,80 |

## Coin de la plaque

Deux demi-fentes de bord dans le même coin (côté droit au bout avant, côté avant au bout droit), hybride. Départ proposé : max(1,92 ; rayon du coin ; 0,8 + chanfrein) depuis le coin du treillis. Col : distance entre les coins intérieurs des deux fentes (matière vérifiée au milieu). Coin : matière entre le bout de la fente et le contour (coin arrondi, ou fente de l'autre côté), le long de la jambe (0,9 mm de la face), à z = 1,5.

| Rayon (mm) | Chanfrein (mm) | Départ (mm) | Col (mm) | Coin (mm) | Retiré par fente |
|---|---|---|---|---|---|
| 0,00 | 0,00 | 1,92 | 0,81 | 1,92 | 13,90 / 13,90 mm³ |
| 0,00 | 1,00 | 1,92 | 0,81 | 1,92 | 11,50 / 13,90 mm³ |
| 4,00 | 0,00 | 4,00 | 3,75 | 2,53 | 13,90 / 13,90 mm³ |
| 10,00 | 0,00 | 10,00 | 12,23 | 4,14 | 13,90 / 13,90 mm³ |

## Moteur (ADR 0022)

Plaque de 2 × 2 cellules sans marge, qualité finale : nombre de fentes de bord (une par côté de 2 cellules), départ depuis le coin, matière retirée par fente (plaque sans fentes moins plaque avec), et écart avec les mêmes demi-fentes taillées par le banc. Au-delà de 1,30 mm de chanfrein (canal + dent), pas de fente de bord.

| Profil | Chanfrein (mm) | Fentes de bord | Départ (mm) | Retiré par fente | Écart moteur − banc |
|---|---|---|---|---|---|
| hybride | 0,00 | 4 | 4,00 | 13,90 mm³ | -0,0001 mm³ |
| hybride | 1,00 | 4 | 4,00 | 11,50 mm³ | -0,0001 mm³ |
| hybride | 1,30 | 4 | 4,00 | 10,30 mm³ | -0,0001 mm³ |
| hybride | 1,50 | 0 | — | 0,00 mm³ | 0,0000 mm³ |
| ras | 0,00 | 4 | 4,00 | 12,20 mm³ | -0,0001 mm³ |
| ras | 1,00 | 4 | 4,00 | 9,80 mm³ | -0,0001 mm³ |
| ras | 1,30 | 4 | 4,00 | 8,60 mm³ | -0,0001 mm³ |
| ras | 1,50 | 0 | — | 0,00 mm³ | 0,0000 mm³ |

Deux plaques identiques côte à côte : fentes du côté droit de l'une et du côté gauche de l'autre en y = -35,50 ; du fond et de l'avant en x = -35,50 : en vis-à-vis.

## Fichiers

- `files/deux-plaques-2x2-sans-marge.3mf` : plaque 1, plaque 2, clip × 2 ; relus NoError, 0 arête pincée ; 5,53 cm³ par plaque.

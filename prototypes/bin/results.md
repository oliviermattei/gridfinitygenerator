# Résultats du banc (généré par `bench.test.ts`)

## (1) Assise du pied standard du bin (moteur, qualité finale)

Bin 1 × 1 × 3 U du moteur, posé par bissection au-dessus d'une cellule d'une baseplate 2 × 2 du moteur, sans aimant, jusqu'au premier contact (chevauchement < 0,001 mm³). « Jeu latéral » : glissement possible à la hauteur où il s'arrête.

| Baseplate | Hauteur | Dessous du pied à | Jeu latéral | Porté par |
|---|---|---|---|---|
| Normal, profil hybride | 4,60 | 0,000 | 0,000 | pentes **et** fond (hyperstatique) |
| Normal, profil ras | 4,25 | 0,000 | 0,250 | fond seul |
| Tray, profil hybride | 5,40 | 0,800 | 0,000 | pentes seules |
| Skeleton, profil hybride | 4,60 | 0,000 | 0,000 | pentes **et** fond (hyperstatique) |
| CLICKbase, profil hybride | 4,60 | 0,000 | 0,000 | ergots (chevauchement de 6,9 mm³ à z = 0, libre à 1,450) |

## (2) Socle plein (standard) ou creux

Plein : pieds pleins, fond intérieur à 7 mm (gridfinity-rebuilt `BASE_HEIGHT`). Creux : chaque pied est une coque de 1,2 mm ouverte dessous, sous un fond de 1,2 mm arrondi à la couche (fond intérieur à 6,0 mm). Volume mesuré sur le maillage ; filament et temps donnés par PrusaSlicer 2.7 en ligne de commande (buse 0,4, couches de 0,2, 2 périmètres, remplissage 15 %, PLA 1,24 g/cm³, profil d'imprimante par défaut : le temps est celui du trancheur, pas une mesure).

| Bin | Plein | Creux | Écart du creux |
|---|---|---|---|
| 1 × 1 × 3 U | 15,71 cm³, 11,4 mm utiles, 10,6 g, 1h 0m 27s | 8,17 cm³, 12,4 mm utiles, 9,4 g, 58m 55s | -48 % de volume, -11 % de filament |
| 2 × 2 × 3 U | 53,44 cm³, 11,4 mm utiles, 31,6 g, 2h 50m 55s | 22,73 cm³, 12,4 mm utiles, 26,8 g, 2h 44m 47s | -57 % de volume, -15 % de filament |
| 2 × 1 × 6 U | 35,53 cm³, 32,4 mm utiles, 26,4 g, 2h 35m 45s | 20,31 cm³, 33,4 mm utiles, 24,0 g, 2h 31m 47s | -43 % de volume, -9 % de filament |

## (3) Rayon du congé (bin 1 × 1 × 3 U, un compartiment)

Volume utile calculé sur les solides (du fond intérieur au-dessous du rebord). « Coin mort » : section, dans le coin fond/paroi, qu'un doigt de rayon 8 mm n'atteint pas (calcul exact de géométrie plane, pas une mesure sur le maillage).

| Rayon demandé (mm) | Rayon appliqué | Volume utile (cm³) | Écart | Coin mort (mm²) |
|---|---|---|---|---|
| 0 | 0,0 | 17,36 | 0,0 % | 13,7 |
| 2 | 2,0 | 17,23 | -0,8 % | 12,9 |
| 3 | 3,0 | 17,05 | -1,8 % | 11,8 |
| 5 | 5,0 | 16,41 | -5,5 % | 8,4 |
| 8 | 5,7 | 16,12 | -7,2 % | 0,0 |

## Fichiers (relus, `NoError`)

- `files/bin-1x1x3-plein.3mf` : relu NoError. Bin standard 1 × 1 × 3 U, socle plein, congé ; à essayer dans le kit de test et le CLICKbase.
- `files/bin-1x1x3-creux.3mf` : relu NoError. Le même, socle creux : juger le pont du fond et la rigidité.
- `files/bin-2x1x4-pelle-onglet.3mf` : relu NoError. Bin 2 × 1 × 4 U, 2 compartiments, congé, pelle et onglet d'étiquette : juger la pelle, l'onglet sans support, et l'empilage.
- `files/kit-de-test.3mf` : relu NoError. Kit de test 1 × 2 (hybride à l'avant, ras à l'arrière) du moteur.
- `files/clickbase-1x1.3mf` : relu NoError. CLICKbase 1 × 1 du moteur, en PETG.

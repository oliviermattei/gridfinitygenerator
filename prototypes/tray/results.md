# Résultats du banc (généré par `bench.test.ts`)

## Assise d'un pied de bac standard (cellule de 42 mm, couches de 0,2 mm)

Pied de la spec (0,8 / 1,8 / 2,15, dessus 41,5 mm, rayon 3,75), posé par bissection jusqu'au premier contact (chevauchement < 0,001 mm³). « Pentes seules » : hauteur où le pied touche les pentes, le fond ôté. « Jeu latéral » : glissement possible à la hauteur où il s'arrête.

| Variante | Hauteur | Dessus du fond | Pied sur les pentes | Pied s'arrête à | Écart pied/fond | Jeu latéral | Porté par |
|---|---|---|---|---|---|---|---|
| Normal hybride (posée au fond du tiroir) | 4,60 | 0,00 | 0,000 | 0,000 | 0,000 | 0,000 | pentes **et** fond (hyperstatique) |
| Normal ras (posée au fond du tiroir) | 4,25 | 0,00 | -0,350 | 0,000 | 0,000 | 0,250 | fond seul |
| C : fond de 0,60 dans la poche, poche non relevée | 4,60 | 0,60 | 0,000 | 0,600 | 0,000 | 0,250 | fond seul |
| A : poche relevée du fond (0,60), sans jeu | 5,20 | 0,60 | 0,600 | 0,600 | 0,000 | 0,000 | pentes **et** fond (hyperstatique) |
| **B : poche relevée du fond et d'un jeu de 0,20 (retenu)** | 5,40 | 0,60 | 0,800 | 0,800 | 0,200 | 0,000 | pentes seules |
| B au profil ras | 5,05 | 0,60 | 0,450 | 0,600 | 0,000 | 0,150 | fond seul |

## Matière (moteur, qualité finale, réglages par défaut, aimants compris, sans découpe)

| Cas | Normal (cm³) | Tray (cm³) | Écart | Rapport | Fond aussi sous la marge | Aimants N / T |
|---|---|---|---|---|---|---|
| 2 × 2 sans marge | 5,58 | 10,16 | +4,58 | × 1,82 | — | 1 / 1 |
| 4 × 4 sans marge | 22,16 | 40,51 | +18,36 | × 1,83 | — | 9 / 9 |
| tiroir par défaut, cadre à traverses | 78,42 | 140,41 | +61,99 | × 1,79 | +9,19 | 40 / 40 |
| tiroir par défaut, cellules tronquées | 96,43 | 169,42 | +72,99 | × 1,76 | — | 70 / 70 |
| tiroir par défaut, équerres | 75,35 | 137,33 | +61,99 | × 1,82 | +10,11 | 40 / 40 |

## Fichiers (relus, `NoError`)

- `files/banc-2x2-tray.3mf` : relu NoError. Tray 2 × 2 du moteur (variante B) : 5,40 mm, fond 0,60 mm, jeu 0,20 mm, 1 aimant ; 10,16 cm³ (10,24 sans aimant, comme le banc).
- `files/banc-2x2-tray-sans-jeu.3mf` : relu NoError. variante A, pour comparer : poche relevée du fond seul, le pied touche le fond ; 5,20 mm, sans aimant.

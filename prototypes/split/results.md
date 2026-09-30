# Résultats du banc (généré par `bench.test.ts`)

## Plans de découpe

| Cas | Plateau | Pièces | Colonnes × rangées (cellules) | Tourné | Plus grande pièce (mm) | Pièces hors plateau |
|---|---|---|---|---|---|---|
| tiroir par défaut | 180 × 180 | 6 | 3 + 3 + 3 × 3 + 3 | non | 136,5 × 139,5 | 0 |
| tiroir par défaut | 220 × 220 | 6 | 3 + 3 + 3 × 3 + 3 | non | 136,5 × 139,5 | 0 |
| tiroir par défaut | 250 × 210 | 4 | 4 + 5 × 3 + 3 | non | 220,5 × 139,5 | 0 |
| tiroir par défaut | 256 × 256 | 4 | 4 + 5 × 3 + 3 | non | 220,5 × 139,5 | 0 |
| tiroir par défaut | 350 × 350 | 2 | 4 + 5 × 6 | non | 220,5 × 279,0 | 0 |
| tiroir par défaut | 50 × 50 | 54 | 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 × 1 + 1 + 1 + 1 + 1 + 1 | non | 52,5 × 55,5 | 26 |
| tiroir 1000 × 600 | 256 × 256 | 15 | 4 + 5 + 5 + 5 + 4 × 4 + 5 + 5 | non | 210,0 × 215,5 | 0 |
| tiroir 60 × 1000 (1 × 23) | 256 × 256 | 5 | 1 × 4 + 5 + 5 + 5 + 4 | non | 59,0 × 210,0 | 0 |
| 9 × 6 cellules + 41 mm de marge par côté | 256 × 256 | 4 | 4 + 5 × 3 + 3 | non | 251,0 × 167,0 | 0 |
| 2 × 1 cellules + 250 mm de marge par côté | 256 × 256 | 3 | 4 + 4 + 4 × 1 | non | 208,0 × 42,0 | 0 |
| 20 × 20 cellules | 256 × 256 | 16 | 5 + 5 + 5 + 5 × 5 + 5 + 5 + 5 | non | 210,0 × 210,0 | 0 |
| 10 × 4 cellules | 200 × 300 | 2 | 5 + 5 × 4 | oui | 210,0 × 168,0 | 0 |

## Numéros gravés

| Profil, couche | Profondeur | Demi-muret au fond de la gravure | Peau de chaque côté du chiffre (1,8 mm) | Matière retirée, tiroir par défaut en 4 pièces |
|---|---|---|---|---|
| hybride, 0,2 | 0,40 mm | 2,80 mm | 0,500 mm | 4,47 mm³ |
| ras, 0,2 | 0,40 mm | 2,45 mm | 0,325 mm | 4,47 mm³ |
| hybride, 0,28 | 0,56 mm | 2,64 mm | 0,420 mm | 6,26 mm³ |
| ras, 0,28 | 0,56 mm | 2,29 mm | 0,245 mm | 6,26 mm³ |
| ras, 0,12 | 0,48 mm | 2,37 mm | 0,285 mm | 5,36 mm³ |

## Fichiers de recette

| Fichier | Contenu | Objets | Volume total | Relu `NoError` |
|---|---|---|---|---|
| `coupe-2x2-en-2-pieces.3mf` | 2 pièces de 2 × 1, sans marge | pièce 1, pièce 2 | 5,65 cm³ | NoError |
| `coupe-2x2-marge-en-2-pieces.3mf` | 2 pièces de 2 × 1 avec les marges du tiroir par défaut (10,5 et 13,5 mm) | pièce 1, pièce 2 | 13,03 cm³ | NoError |

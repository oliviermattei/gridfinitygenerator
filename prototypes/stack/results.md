# Résultats du banc (généré par `bench.test.ts`)

## Joints et plafonds (qualité finale, couches de 0,2 mm)

Joint k : la pièce k + 1 de la pile posée sur la pièce k. « Dessous » : section de la pièce du dessus 0,01 mm au-dessus du joint. « Non porté » : la part de ce dessous hors de la section de la pièce du dessous 0,01 mm sous le joint (le pont le plus large : côté court de sa plus grande pièce). « Plafonds » : faces horizontales tournées vers le bas au-dessus du joint dans une pièce retournée (hauteur à l'endroit, surface, plus grande pièce : côté court × côté long).

| Cas | Règle | Piles | Joint | Jeu | Dessous (mm²) | Contact (mm²) | Non porté (mm²) | Pont le plus large | Plafonds d'une pièce retournée |
|---|---|---|---|---|---|---|---|---|---|
| pile de 3, Normal | permise | 1-3↔-2↕ | 1 | 0,200 | 327 | 327 | 0,0 | 0,0 | aucun |
|  |  |  | 2 | 0,200 | 159 | 144 | 14,5 | 3,3 |  |
| pile de 3, Normal ras | permise | 1-3↔-2↕ | 1 | 0,200 | 327 | 327 | 0,0 | 0,0 | aucun |
|  |  |  | 2 | 0,200 | 159 | 144 | 14,6 | 3,3 |  |
| pile de 3, Tray | refusée (tray) | 1-3↔-2↕ | 1 | 0,200 | 327 | 327 | 0,0 | 0,0 | 0,60 mm : 3100 mm², 36,3 × 36,3 |
|  |  |  | 2 | 0,200 | 159 | 144 | 14,5 | 3,3 |  |
| pile de 3, Skeleton | avertie (skeleton) | 1-3↔-2↕ | 1 | 0,200 | 301 | 301 | 0,0 | 0,0 | 0,40 mm : 136 mm², 36,4 × 39,2 |
|  |  |  | 2 | 0,200 | 106 | 96 | 10,4 | 3,3 |  |
| pile de 3, CLICKbase | refusée (clickbase) | 1-3↔-2↕ | 1 | 0,200 | 327 | 327 | 0,0 | 0,0 | 0,20 mm : 272 mm², 1,1 × 12,0 |
|  |  |  | 2 | 0,200 | 159 | 144 | 14,5 | 3,3 |  |
| tiroir par défaut, cellules tronquées | permise | 2-4↕-1↔ / 3 | 1 | 0,200 | 1882 | 1882 | 0,0 | 0,1 | aucun |
|  |  |  | 2 | 0,200 | 1561 | 1272 | 289,6 | 6,5 |  |
| tiroir par défaut, cellules tronquées, vis | permise | 2-4↕-1↔ / 3 | 1 | 0,200 | 1716 | 1716 | 0,0 | 0,0 | aucun |
|  |  |  | 2 | 0,200 | 1436 | 1283 | 153,3 | 6,5 |  |
| tiroir par défaut, cadre (refusé) | refusée (low-margin) | 2-4↕-1↔ / 3 | 1 | 0,200 | 1189 | 1189 | 0,0 | 0,1 | 2,00 mm : 562 mm², 139,5 × 220,5 |
|  |  |  | 2 | 0,200 | 951 | 797 | 154,1 | 6,5 |  |
| tiroir par défaut, équerres (refusé) | refusée (low-margin) | 2-4↕-1↔ / 3 | 1 | 0,200 | 1189 | 1189 | 0,0 | 0,1 | 2,00 mm : 137 mm², 20,5 × 23,5 |
|  |  |  | 2 | 0,200 | 951 | 797 | 154,1 | 6,5 |  |

Piles : numéros des pièces du bas vers le haut ; ↕ retournée autour de X (l'arrière vers l'avant), ↔ autour de Y (la gauche vers la droite).

## Méthode Stu142 contre alternance (pile de 3, pièces 1 et 3 de même contour)

- Plats contre plats (joint 1, les deux méthodes) : 327 mm².
- Dessous contre dessous (joint 2 en alternance) : 1255 mm², soit × 3,8.

## Fichiers (relus, `NoError`)

- `files/pile-3-pieces.3mf` : relu, 2 objets NoError (pile 1 : pièces 1, 3, 2 ; clip × 4), hauteur 14,20 mm, pas 4,80 mm. Pile de 3 pièces d'une colonne, 3 × 2 cellules, marge de 10,5 mm en cellules tronquées, les 4 clips à part.
- `files/pile-3-pieces-oreilles-pions.3mf` : relu, 2 objets NoError (pile 1 : pièces 1, 3, 2 ; clip × 4), hauteur 14,20 mm, pas 4,80 mm. La même, avec oreilles et pions.
- `files/pile-3-pieces-skeleton.3mf` : relu, 1 objets NoError (pile 1 : pièces 1, 3, 2), hauteur 14,20 mm, pas 4,80 mm. La même en Skeleton (bandes pontées entre les poteaux).

## Skeleton : la bande retournée

Retournée, la bande de 0,40 mm (2 couches) d'un muret entaillé est un pont entre les flancs de deux poteaux : 23,62 et 23,62 mm, mesurés juste au-dessus de la bande le long de l'axe du muret (2 × 2 cellules de 42 mm).

# Banc jetable : pile de 2 plaques d'une cellule (recette #16, impression empilée #28)

> Demande du mainteneur : « prototyper un stack de 2 grilles de 1 cellule ; je veux tester l'impression empilée des grilles ; produire les différentes versions possibles de 1x1 ».
>
> Pas de ticket : c'est un prototype de recette. Le moteur n'est pas modifié.

## Construction retenue (la plus fidèle au site)

Une baseplate **2 × 1 en mode cellules, sans marge**, découpée par un **plateau de 50 × 50 mm** en 2 pièces d'une cellule, puis exportée comme le fait « Empiler les pièces » :

- `generateBaseplate(…, "final", { buildPlate })` ;
- `stackPlanOf` → une pile : la pièce 1 à l'endroit, la pièce 2 retournée autour de X (↕), une couche d'air (ADR 0016) ;
- `printStacks`, puis `printClips` (le clip de la jonction, à côté de la pile) et `serialize3mf`.

Chaque plaque porte ce que le site lui donne :

- sa demi-fente de jonction ;
- ses fentes de bord (#37) : 3 sur la pièce 1, 1 sur la pièce 2 ;
- son numéro gravé dessous, sur le bord de coupe.

On retrouve ces fichiers dans le générateur. Réglages : mode « nombre de cellules », 2 × 1, plateau de 50 × 50 mm (dans les paramètres), puis « Empiler les pièces ». Pour les marges : 21 mm en largeur et en profondeur, et un plateau de 70 × 70 mm.

**Seule entorse :** `stackRuleOf` n'est pas appliquée. Le site refuse Tray et CLICKbase ; le mainteneur veut les tester, le banc les génère donc quand même (colonne « Règle du site »).

**Variante « autonome »** : 2 exemplaires d'une baseplate **1 × 1 non découpée**, empilés par un plan écrit à la main. Le site n'empile pas une pièce unique. Elle diffère de la paire découpée :

- 4 fentes de bord, une par côté ;
- pas de demi-fente de jonction, pas de numéro, pas de clip ;
- 4 coins arrondis : sa plaque retournée est portée à 100 % (voir les constats).

Elle n'est produite qu'en Normal hybride.

Toutes les couches sont à **0,2 mm** (le réglage par défaut), la largeur de ligne à 0,4 mm. Grammes : PLA à 1,24 g/cm³, par `apps/web/lib/mass.ts` (`massOf`).

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/stack-1x1
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/` (moins de 2 s). Pour chaque fichier, il vérifie :

- le fichier relu : même nombre de sommets, écart des sommets ≤ 1e-4 mm (5,7e-6 mesuré), donc les Z sont conservés ;
- chaque objet : `NoError` et `badEdges` = 0 ;
- chaque coquille de la pile : `NoError` et `badEdges` = 0, la plaque du bas à z = 0, celle du dessus au pas ;
- le jeu au joint : 0,200 mm.

Aucun cas impossible : les 12 fichiers passent.

## Fichiers et mesures

« Dessous » : la section de la plaque du dessus 0,01 mm au-dessus du joint. « Contact » : la part de ce dessous posée sur la plaque du dessous, mesurée par `sectionArea` et `areaOutside` (test/support/measure.ts). « Non porté » : le reste. « Surplombs » : les faces tournées vers le bas dans la plaque retournée, au-dessus de son dessous, avec la largeur du plus large (diamètre du plus grand disque qu'il contient).

| Prio. | Fichier | Construction | Règle du site | Pile | Plaque / pas (mm) | Hauteur de pile (mm) | Volume pile (cm³) | Clips à part | g PLA | Dessous (mm²) | Contact (mm²) | Non porté (mm²) | Surplombs de la plaque retournée |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `files/pile-1x1-normal-hybride.3mf` | Normal hybride | permise | 1-2↕ | 4,60 / 4,80 | 9,40 | 2,71 | 1 (18,2 mm³) | 3,4 | 72 | 66 | 6,9 | aucun |
| 2 | `files/pile-1x1-normal-ras.3mf` | Normal ras | permise | 1-2↕ | 4,25 / 4,45 | 8,70 | 2,41 | 1 (15,9 mm³) | 3,0 | 72 | 66 | 6,9 | aucun |
| 2 | `files/pile-1x1-autonome-normal-hybride.3mf` | Normal hybride, 2 plaques 1 × 1 autonomes | hors site (pièce unique) | 1-1↕ | 4,60 / 4,80 | 9,40 | 2,62 | aucun | 3,3 | 66 | 66 | 0,0 | aucun |
| 3 | `files/pile-1x1-skeleton-hybride.3mf` | Skeleton hybride | avertie (skeleton) | 1-2↕ | 4,60 / 4,80 | 9,40 | 2,73 | 1 (14,2 mm³) | 3,4 | 72 | 66 | 6,9 | aucun |
| 3 | `files/pile-1x1-skeleton-ras.3mf` | Skeleton ras | avertie (skeleton) | 1-2↕ | 4,25 / 4,45 | 8,70 | 2,43 | 1 (12,7 mm³) | 3,0 | 72 | 66 | 6,9 | aucun |
| 4 | `files/pile-1x1-normal-hybride-oreilles-pions.3mf` | Normal hybride, oreilles et pions | permise | 1-2↕ | 4,60 / 4,80 | 9,40 | 2,86 | 1 (18,2 mm³) | 3,6 | 72 | 66 | 6,9 | aucun |
| 5 | `files/pile-1x1-normal-hybride-marge-grille.3mf` | Normal hybride, marge 10,5 mm en grille prolongée | permise | 1-2↔ | 4,60 / 4,80 | 9,40 | 6,50 | 1 (18,2 mm³) | 8,1 | 224 | 224 | 0,0 | aucun |
| 5 | `files/pile-1x1-normal-hybride-marge-cellules.3mf` | Normal hybride, marge 10,5 mm en cellules tronquées | permise | 1-2↔ | 4,60 / 4,80 | 9,40 | 7,98 | 1 (18,2 mm³) | 9,9 | 385 | 385 | 0,0 | aucun |
| 6 | `files/pile-1x1-tray-hybride.3mf` | Tray hybride | **refusée (tray)** | 1-2↕ | 5,40 / 5,60 | 11,00 | 4,98 | 1 (22,9 mm³) | 6,2 | 72 | 66 | 6,9 | 1 317 mm², large de 36,3 mm |
| 6 | `files/pile-1x1-tray-ras.3mf` | Tray ras | **refusée (tray)** | 1-2↕ | 5,05 / 5,25 | 10,30 | 4,68 | 1 (20,6 mm³) | 5,8 | 72 | 66 | 6,9 | 1 317 mm², large de 36,3 mm |
| 6 | `files/pile-1x1-clickbase-hybride.3mf` | CLICKbase hybride | **refusée (clickbase)** | 1-2↕ | 4,60 / 4,80 | 9,40 | 2,38 | 1 (18,2 mm³) | 3,0 | 72 | 66 | 6,9 | 116 mm², large de 1,1 mm |
| 6 | `files/pile-1x1-clickbase-ras.3mf` | CLICKbase ras | **refusée (clickbase)** | 1-2↕ | 4,25 / 4,45 | 8,70 | 2,17 | 1 (15,9 mm³) | 2,7 | 72 | 66 | 6,9 | 101 mm², large de 0,9 mm |

Colonne « Pile » : les numéros du bas vers le haut. ↕ : retournée autour de X ; ↔ : autour de Y. Les marges tournent autour de Y, pour que le mur de marge de la pièce 2 tombe sur celui de la pièce 1. Oreilles et pions : 4 oreilles par plaque, 4 pions (les 2 plaques partagent leurs 4 coins), + 0,15 cm³. Détail et contrôles par fichier : `results.md`.

## Ce qu'il faut juger

- **Normal hybride** :
  - la séparation, à la main ou à la lame, sans casse ;
  - la face retournée : dessus des murets, pentes à 45° imprimées en surplomb ;
  - un bac standard dans la plaque retournée : jeu, bascule.

  Le contact au joint est petit : 66 mm² seulement, les plats d'une cellule.
- **Normal ras** : la même chose. La plaque fait 4,25 mm, pas un nombre entier de couches. Le pas de 4,45 mm doit laisser une seule couche vide (pas de refus du trancheur, pas de soudure).
- **Autonome** : 4 fentes de bord par plaque, et un dessous porté à 100 %.
- **Skeleton** : aucune bande à juger (voir les constats). La différence avec le Normal, ce sont des fentes de clip plus courtes (4,0 mm contre 5). Pour la bande retournée : `prototypes/stack/files/pile-3-pieces-skeleton.3mf`.
- **Oreilles et pions** : les oreilles tiennent-elles les coins, se coupent-elles proprement ? Les pions de 0,8 mm tiennent-ils, et se séparent-ils sans arracher de coin ?
- **Marges** (grille prolongée, cellules tronquées) :
  - le mur ou les talons de la marge retournée, posés sur ceux du dessous ;
  - la séparation dans la marge.

  Ici le joint est porté à 100 %.
- **Tray, hors règle** : retourné, le fond ponte toute la poche (36,3 mm). Juger l'affaissement, puis l'assise d'un bac.
- **CLICKbase, hors règle** : retournées, les toiles s'impriment sur les lamelles (surplombs de 1,1 mm en hybride, 0,9 en ras). La toile se soude-t-elle à la lamelle ? Les lamelles fléchissent-elles encore ?

Réglages du trancheur, pour tous :

- couches de 0,2 mm, première couche comprise ;
- pas de couches variables ;
- ralentissement des surplombs désactivé ;
- pas de supports.

## Constats mesurés

- **Retourner autour de Y ne laisserait rien en l'air.** Le moteur retourne la pièce 2 de la paire découpée autour de X. Ses deux coins de coupe, carrés, tombent alors sur les coins arrondis (rayon 4 mm) du contour de la pièce 1 : 6,9 mm² en l'air, sur 72 mm² de dessous. Retournée autour de Y, ses coins carrés tombent sur les coins carrés de la pièce 1 : 0 mm² en l'air, 72 mm² de contact. `stackPlanOf` essaie X d'abord et ne regarde pas les coins arrondis. **À trancher**, pour #28 : l'écart est petit (deux coins de 3,4 mm², en l'air sur 1,7 mm au plus, à la pointe du coin), mais il est sur toutes les pièces d'une rangée retournées ainsi.
- **Skeleton : une plaque d'une cellule n'a aucune bande.** Sans fentes ni aimants, la paire découpée pèse 2 794,3 mm³ en Skeleton comme en Normal. Le tour du treillis n'est jamais entaillé, et le seul muret intérieur (la coupe) porte le numéro de la pièce, donc reste entier. Même constat avec 10,5 mm de marge en cellules tronquées : 7,99 contre 7,98 cm³, soit le seul écart des fentes plus courtes. Aucune version 1 × 1 ne permet de juger la bande retournée.
- **Tray et CLICKbase** : les surplombs mesurés confirment les refus de l'ADR 0016 (fond de 36,3 mm pontant la poche ; bases de toile de 1,1 mm). Ces fichiers servent à le vérifier en vrai, pas à lever la règle.

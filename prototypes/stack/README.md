# Banc jetable : impression empilée des pièces (ticket #28)

> Questions posées :
> - Une pièce retournée est-elle portée par celle du dessous, et sur quelle surface (contact, en mm²) ? Qu'est-ce qui ne l'est pas ?
> - Qu'imprime une pièce retournée en pont, ou en l'air, selon son type (Normal, Tray, Skeleton, CLICKbase) et sa marge (cadre, équerres, cellules tronquées) ?
> - Aimants (#24) : un logement retourné pose-t-il un problème de surplomb ?
> - Méthode Stu142 contre alternance : combien de contact en plus aux joints dessous contre dessous ?
>
> Le banc passe par le moteur (`stackPlanOf`, `orientStacks`, `printStacks`, comme l'export) et mesure les coquilles de chaque pile avec manifold. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/stack
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`. Chaque fichier est relu, et chacun de ses objets est reconstruit avec manifold (`NoError`).

## Réponse

- **Le joint est porté partout** : 0 mm² non porté sans aimant ni clip, sur la pile de la recette comme sur le tiroir par défaut. Le jeu mesuré entre deux coquilles fait exactement une couche (0,200 mm). Le joint 1 pose les plats sur les plats (327 mm² sur la pile de la recette, 1 882 mm² sur le tiroir par défaut). Les joints suivants posent les plats sur les pieds des murets de la pièce retournée.
- **Ce qui n'est pas porté**, ce sont les trous de la pièce du dessous, que les plats de la pièce du dessus traversent en pont :
  - les logements d'aimant (Ø 6,5 mm, le pont le plus large) ;
  - les fentes de clip (2,7 mm) ;
  - les tiges de vis.

  Sur le tiroir par défaut : 284,9 mm² pour 1 561 mm² de dessous (289,6 mm² quand le banc a été lancé pour #28 : les fentes de clip ont changé depuis, #30 et #37 ; le sens de retournement n'y est pour rien).
- **Aimants** : retournée, la pièce a son logement ouvert vers le haut, et son fond borgne devient un plancher. Il n'y a plus de pont (à l'endroit, ce fond est un pont de Ø 6,5 mm). Le seul pont est celui des plats de la pièce du dessus au-dessus de l'ouverture.
- **Plafonds d'une pièce retournée**, par type :

  | Cas | Plafonds | Décision |
  |---|---|---|
  | Normal | aucun | permise |
  | Skeleton | bande de 0,40 mm pontée sur 23,62 mm entre deux poteaux | permise, avec avertissement |
  | Tray | fond pontant toute la poche, 36,3 × 36,3 mm | refusée |
  | CLICKbase | bases de toile, 1,1 × 12 mm | refusée : la toile s'imprimerait sur la lamelle (ADR 0016) |
  | Marge en cadre | 562 mm² de départs en l'air, 2,6 mm au-dessus du joint | refusée |
  | Marge en équerres (retirée par #29) | 137 mm² de départs en l'air, 2,6 mm au-dessus du joint | refusée ; cas retiré du banc |
- **Alternance** : dessous contre dessous, 1 248 mm² contre 327 mm² plats contre plats, soit ×3,8.
- **Sens de retournement (#39)** : `orientStacks` mesure, pour chaque pièce retournée, les sens légaux (autour de X ou de Y) et garde ceux qui laissent le moins de dessous en l'air. Il ne change rien aux piles de ce banc, qui tenaient déjà au mieux :
  - pile de 3 : la pièce 2 laisse autant en l'air autour de X que de Y (20,9 mm², en ponts de 3,3 mm au plus) : X est gardé ;
  - tiroir par défaut : un seul sens légal par pièce (la marge doit tomber sur la marge) ;
  - 1000 × 1000 mm en 25 pièces : 5 623,6 mm² non portés dans les deux cas, en 324 ms (à l'export seulement).

  Il change la paire de plaques d'une cellule (`prototypes/stack-1x1/`) : 6,9 mm² en l'air autour de X, 0 autour de Y.

Détail : `results.md`. Décision : ADR 0016.

## Fichiers à imprimer pour la recette (#16)

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `files/pile-3-pieces.3mf` | 3 × 2 cellules, marge de 10,5 mm en cellules tronquées, découpée en 3 pièces d'une colonne, empilées (pièce 1 à l'endroit, 3 retournée autour de Y, 2 autour de X), plus 2 clips à part ; 14,2 mm de haut | À trancher à 0,2 mm, même hauteur de couche, sans couches variables, ralentissement des surplombs désactivé. Juger : la séparation (à la main, à la lame, sans casse), la face retournée (dessus des murets, pentes à 45° imprimées en surplomb), puis l'assise d'un bac standard dans une pièce retournée contre la pièce 1 (jeu latéral, bascule). |
| 2 | `files/pile-3-pieces-oreilles-pions.3mf` | la même, avec oreilles et pions | Les oreilles tiennent-elles les coins ? Se coupent-elles proprement ? Les pions ne gênent-ils pas la séparation ? |
| 3 | `files/pile-3-pieces-skeleton.3mf` | la même en Skeleton | Les bandes pontées sur 23,6 mm entre les poteaux : affaissement, tenue. |

On retrouve la pile 1 dans le générateur. Réglages : mode « nombre de cellules », 3 × 2, marge en largeur 21 mm, marge en cellules tronquées, plateau de 60 × 100 mm (dans les paramètres). Puis « Empiler les pièces ».

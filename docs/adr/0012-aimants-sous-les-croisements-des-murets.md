---
status: proposed
---

# Logements d'aimants sous les croisements des murets, toujours présents

La spec v1.1 (#20, ticket #24) demande un **logement d'aimant** de 6 × 2 mm plus un jeu sous chaque coin de cellule, sans réglage, pour fixer la baseplate dans un tiroir en tôle. Le mainteneur ajoute : pas là où il y a une vis. Ce ne peut pas être la position standard des aimants (13 mm du centre de la cellule, 14 mm chez extrabold) : elle tombe dans l'ouverture de la poche, où une baseplate ajourée n'a pas de matière. Il faudrait un socle, soit ×2,5 de matière chez extrabold (`docs/research/types-de-baseplate.md`). On prend donc le seul endroit où la matière existe et où aucun bac ne repose (ADR 0006) : le **croisement des murets**.

## Décision

- **Logement** (`packages/geometry/src/magnets.ts`) :
  - un cylindre ouvert en dessous, de Ø 6 mm + **jeu des trous** (le réglage des vis, 0,5 mm par défaut, soit Ø 6,5) ;
  - profond de 2 + 0,2 mm, arrondi à la couche supérieure : 2,20 mm à 0,2, 2,24 mm à 0,28 et 2,28 mm à 0,12. Le plafond est un pont, et l'aimant ne dépasse jamais dessous ;
  - un cercle de `segmentsPerHole` côtés (16 en aperçu, 64 en finale), avec un sommet sur chaque axe, comme les vis.
- **Où** : sous chaque croisement tenu par la matière.
  - Tous les croisements **intérieurs** du treillis (la grille, et les cellules entières de la marge).
  - Un croisement du **bord** du treillis seulement si la marge prolonge les murets en pleine hauteur (**cellules tronquées**, `MarginVariant.carriesMurets`), et si le trou reste dans le contour d'au moins un mur (1,2 mm arrondi à la ligne), plus le chanfrein du dessous.
  - Aucun sur un croisement **coupé** (`frame.cuts`), ni là où il y a une **vis** (`hasScrew`).
- **Pas de réglage** : `GenerateOptions.magnets` (vrai par défaut) n'est pas dans les réglages ni dans le lien de partage. `false` sert aux bancs et aux tests qui mesurent ce que les trous retirent.
- **Interface du moteur** : `layout.magnets` (les centres), `stats.magnets` (le nombre), `GridFrame.magnets` (`MagnetHoles` : `diameter`, `depth`).
- **Web** : la statistique « Aimants » donne le nombre d'aimants à acheter, avec leur taille (« 28 (Ø 6 × 2 mm) »). L'aide du jeu des trous dit qu'il vaut aussi pour les aimants.

## Ce que le prototype a mesuré (`prototypes/magnets/`)

- **Aucune entaille** dans les poches. Autour d'un croisement, le point de poche le plus proche est le milieu de son coin arrondi, à 4·√2 − (4 − retrait) de l'axe : 4,51 mm au pied, 3,81 mm sur la partie verticale (retrait 2,15). Le trou de 3,25 mm de rayon reste donc tout entier dans la matière, dans les deux profils et quelle que soit la cellule (42 et 20 mm). La crainte du ticket (« le trou de 6,5 mm dépasse le croisement de 5,7 mm au pied ») ne tient pas : 5,7 mm est la largeur d'un muret, pas celle du croisement.
- **La pente haute est intacte** : au-dessus du plafond du trou, les sections sont identiques à 10⁻⁶ mm² près, et la pente haute commence plus haut (2,85 mm en hybride, 2,50 mm en ras). L'**assise** n'est pas touchée : la règle de repli (aimants en option désactivée) ne s'applique pas.
- **Ce qui tient l'aimant** : les quatre murets, pleins jusqu'au croisement suivant, et, sur les diagonales, une paroi de **0,56 mm** entre le trou et le coin de poche, de z = 1,05 à 2,20 mm en hybride (0,70 à 2,20 en ras), plus épaisse en dessous (1,26 mm au pied en hybride). Avec un jeu des trous de 1 mm (Ø 7), elle descend à 0,31 mm.
- **Bord** : le cadre à traverses et les équerres (2 mm de haut) ne couvrent que 50 % du disque au milieu d'un bord de grille, et 25 % au coin, au-dessus de 2 mm. Le trou y déboucherait. Avec les cellules tronquées, le disque est couvert à 100 %.
- **Cohabitation** : sur le tiroir par défaut coupé pour un plateau de 256 mm, et sur un tiroir en cellules de 20 mm coupé en 6 pièces, le volume retiré est exactement celui des trous. Aucun trou ne touche une fente de clip, un numéro gravé ou une poche. Les fentes sont au milieu des bords, sur les coupes, et les numéros aussi.
- **Matière** : 72,89 mm³ par trou en finale. Le tiroir par défaut d'une pièce passe de 81,34 à 78,42 cm³ (40 aimants). Coupé pour le plateau de 256 mm, il passe de 81,02 à 78,98 cm³ (28 aimants).

## Assemblage

- **Briques (ADR 0004)** : une sorte de cellule se distingue aussi par ses coins qui portent un aimant. La brique porte un quart de trou à chacun, ou la moitié au bord du treillis, avec la marge au-delà. Le cercle a un sommet sur les coutures, et les quarts voisins se soudent.
- **Une seule soustraction légère par brique** : les trous (vis et aimants) et les fentes de clip sont retirés ensemble de la brique de sa sorte, partagée par toutes ses combinaisons de trous. Refaire la poche et la coupe de la marge pour chaque combinaison coûtait jusqu'à deux fois plus, et une soustraction de quelques trous est bien moins chère.
- **Voie booléenne** : les trous sont retirés ensemble, après les vis. Les volumes des deux voies sont égaux à 0,1 mm³ près, coupes comprises.
- **Coût** (médianes locales en aperçu, sans puis avec les aimants, sur une machine chargée) :

  | Cas | Sans aimants | Avec aimants |
  |---|---|---|
  | tiroir par défaut | 23 ms | 31 ms |
  | tiroir par défaut coupé en 4 pièces | 43 ms | 58 ms |
  | le même en cellules tronquées (54 aimants) | 39 ms | 66 ms |
  | 20 × 20 | 10 ms | 19 ms |
  | tiroir de 1000 × 1000 mm en 16 pièces | 71 ms | 90 ms |
  | le même avec ses vis (aucun aimant) | 101 ms | 98 ms |

  Le surcoût vient d'une soustraction de plus par sorte de brique percée, environ 1 ms chacune. Les seuils de #5 tiennent pour les aimants. Le cas des vis était déjà à 100 ms sur cette machine, sans les aimants.

## Considered Options

- **Position standard, 13 mm du centre**, avec un socle : ×2,5 de matière chez extrabold, et un bac assis ne descend plus jusqu'au fond. C'est contraire au principe « le moins cher par défaut ».
- **Aimants en option, désactivée par défaut** : c'est la règle de repli de la spec, si l'assise était gênée. Elle ne l'est pas.
- **Matière locale au bord** pour le cadre et les équerres (un plot de 3 mm autour des croisements du bord) : de la matière en plus, et un relief visible au-dessus du cadre de 2 mm. Écarté pour l'instant (**à valider**).
- **Jeu propre aux aimants** (Ø 6,2, serré, comme extrabold) plutôt que le jeu des trous : le ticket dit « jeu des trous ». Le kit de jeux du prototype (Ø 6,1 à 6,5) dira s'il faut un jeu à part.

## Consequences

- **Toujours présents**, sur toute baseplate (hors kit de test, qui n'a pas de croisement intérieur). Sans vis, chaque croisement intérieur a un aimant ; avec les vis, les aimants ne restent qu'au bord, avec les cellules tronquées.
- **Tickets suivants** :
  - Tray (#25) : le fond plein ferme le dessous. Il faudra choisir entre des trous dans le fond, comme extrabold, ou pas d'aimant. `GridFrame.magnets` à null ou un autre outil.
  - Skeleton (#26) : il garde des poteaux pleine hauteur autour des croisements. Il faut vérifier que le trou de 6,5 mm y garde sa paroi, sinon élargir le poteau.
  - CLICKbase (#27) : extrabold désactive les aimants. À trancher au ticket.
  - L'empilé (#28) retourne les plaques : un trou ouvert en dessous se retrouve en haut. À vérifier au ticket.
- **À valider par l'impression** (recette #16) : le maintien de l'aimant (collé ou serré, kit de jeux), la paroi de 0,56 mm, l'assise d'un bac sur un croisement percé, et le maintien dans un tiroir en tôle.

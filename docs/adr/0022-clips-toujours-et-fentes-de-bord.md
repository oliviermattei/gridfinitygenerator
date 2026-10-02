---
status: proposed
---

# Clips toujours présents, fentes de bord et clip téléchargeable seul

Décisions du 2026-09-30 avec le mainteneur (#37, parent #20, suite de #22, #30 et #31). Les clips ne sont plus un réglage, et une baseplate sans marge sur un côté porte des **fentes de bord**, pour la clipser plus tard à une autre générée à part. L'agrafe, la section de sa fente et ses jeux (ADR 0010), et le placement aux coins des jonctions (ADR 0018) ne changent pas. Glossaire : Clip, Fente, Fente de bord. Mesures : `prototypes/edge-slots/`.

## Décision

- **Plus de réglage « Clips »** : `settings.clips` et la famille Clips du panneau sont retirés. La clé `cl` sort de la table v1 du lien de partage, qui n'est pas encore publiée : un ancien lien qui la porte l'ignore, comme toute clé inconnue, et garde ses clips. Les fentes de jonction sont toujours taillées le long des coupes, avec la règle de l'ADR 0018.
- **Fentes de bord** : chaque côté du contour **sans marge** (marge nulle de ce côté), là où la grille arrive au bord, porte des demi-fentes : la plaque garde sa dent et son canal, comme une pièce le long d'une coupe. Un clip s'y enfonce à cheval sur les deux plaques posées côte à côte.
  - **Nombre et place** : la règle d'une jonction. 2 par côté, une à chaque bout, collées au coin ; 1 seule, au premier bout (devant, ou à gauche), si le côté fait 1 ou 2 cellules ; à l'autre bout si le premier n'a pas la place. La fente ne dépasse jamais le milieu du bord de sa cellule.
  - **Sur tout le côté, quelle que soit la découpe** : le plateau est une préférence locale, hors du lien de partage (ADR 0009). Les mêmes réglages donnent donc les mêmes fentes de bord, découpés ou non, sur n'importe quelle machine. La règle est la même sur les 4 côtés : deux plaques identiques posées côte à côte ont leurs fentes **en vis-à-vis** (mesuré : le côté droit de l'une et le côté gauche de l'autre en y = −35,50 mm, pour 2 × 2 cellules).
  - **Départ depuis le coin du treillis**, arrondi au centième supérieur : le plus grand de 0,8 mm (la peau), du **rayon du coin** moins la marge de l'autre côté (la fente s'ouvre sur la partie droite du contour), de 0,8 mm + le **chanfrein** moins cette marge (la peau au-dessus du chanfrein de l'autre côté), et, quand l'autre côté n'a pas de marge non plus, de **1,92 mm** (`CROSSING_START_MM`) : la fente de bord de l'autre côté, dans le même coin, laisse 0,81 mm de matière en diagonale, comme au croisement de deux coupes. Avec les réglages par défaut (coin de 4 mm) : **4 mm** ; à coins vifs : 1,92 mm ; à côté d'une marge : 0,8 mm.
  - **Chanfrein du dessous** (prototype) : jusqu'à la hauteur du canal (0,8 mm), il tombe tout entier dans la fente ; au-delà, il entame le bas de la dent côté joint, mais la face que la jambe du clip serre reste entière jusqu'à **canal + dent = 1,30 mm** (1,34 mm à 0,28). Au-delà, la face serrée raccourcit (1,79 mm de dent tenue à 1,5 mm de chanfrein, 0,29 mm à 3 mm), et la peau contre la jambe est entamée dès 1,35 mm. **Pas de fente de bord au-delà de 1,30 mm de chanfrein** (`takesEdgeSlots`). À valider à l'impression.
  - **Tous les types** : le muret du tour de la grille n'est jamais entaillé (Skeleton) ; la fente garde la longueur de l'ADR 0018 (4,0 mm en Skeleton, pour que le clip soit le même partout). En CLICKbase, la lamelle voisine est raccourcie comme à côté d'une fente de jonction. Pas d'aimant au bord sans marge, pas de vis sur le contour : aucun conflit.
  - **Peau** : 0,8 mm au moins côté poche, 4 types × 2 profils ; rien n'est retiré au-dessus du haut de la fente, invisible de dessus.
  - **Kit de test** : sans fentes (il sert à essayer l'assise des bacs).
- **Clips dans l'export** : seulement avec plusieurs pièces, un par fente de jonction (`stats.clips`, `stats.clipsVolume`). Les fentes de bord n'en ajoutent pas : les statistiques, la masse (#31) et l'export ne comptent que les clips des jonctions. La ligne « Clips » des statistiques n'apparaît qu'avec plusieurs pièces.
- **« Télécharger le clip (STL) »** : dans le menu du bouton de téléchargement, toujours disponible, avec ou sans découpe. C'est le clip de l'export (`generateClip`, le même que `Baseplate.clip`), qui ne dépend que du profil, du type et de la hauteur de couche. Fichier `baseplate-clip[-skeleton|-tray][-flush][-{couche}mm].stl`.

## Assemblage (ADR 0004)

- `ClipLayout.edges: EdgeSlot[]` (un `ClipPlacement` avec son `side`, le côté de sa cellule sur le contour) ; `layout.clips` n'est plus null dès qu'une fente de bord existe, même d'une seule pièce.
- **Briques** : `slotsByCell` ajoute chaque fente de bord à sa cellule ; l'outil de fente (`brickSlotTool`) est le même qu'au bord d'une coupe, ouvert sur la face du contour, qui n'est pas une couture. Même volume par les deux voies, `NoError`, aucune arête pincée ; volume retiré identique (à 0,0001 mm³) aux demi-fentes taillées par le banc.
- **Booléens** : `slotTools` retire aussi les fentes de bord, à cheval sur le contour ; leur moitié extérieure ne retire rien.
- **Aperçu** : sans fentes, comme l'ADR 0018 ; `layout.clips` est le même en aperçu et en finale.
- `GenerateOptions.clips: false` (nouveau) : sans aucune fente, pour les bancs et les tests qui mesurent autre chose (comme `magnets: false`).
- `Baseplate.clip` est toujours là (même sans fente) ; `generateClip(settings)` le calcule seul.

## Considered Options

- **Fentes de bord par pièce** (chaque côté de pièce sur le contour, entre deux coupes, comme une jonction) : les fentes dépendraient du plateau, qui n'est pas dans le lien. Deux personnes ouvrant le même lien n'auraient pas les mêmes fentes. Écarté.
- **Pas de fente de bord dès qu'il y a un chanfrein** (lecture stricte du ticket) : le prototype montre qu'un chanfrein jusqu'à 1,30 mm laisse la face serrée entière. Écarté pour le seuil de 1,30 mm (**à valider**).
- **Clips des fentes de bord dans l'export** : on ne sait pas combien de plaques l'utilisateur joindra ; le clip seul se télécharge et s'imprime à la demande.
- **Garder le réglage**, désactivé par défaut : une option de plus pour un cas rare, contre le principe « guidé, simple ».

## Consequences

- **À valider par l'impression** (recette #16, `prototypes/edge-slots/files/deux-plaques-2x2-sans-marge.3mf`) : deux plaques 2 × 2 sans marge et 2 clips ; les fentes en vis-à-vis, le clip qui tient les deux plaques à plat, le coin arrondi de 4 mm contre le bout de la fente.
- **À valider** : le seuil de chanfrein de 1,30 mm ; un seul clip par côté de 1 ou 2 cellules, au premier bout.
- Volumes : les baseplates sans marge sur un côté perdent 13,90 mm³ par fente de bord (hybride, 12,20 en ras) ; le tiroir par défaut (marge sur les 4 côtés) ne change pas.

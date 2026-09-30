---
status: proposed
---

# Skeleton : les murets entaillés entre des poteaux au profil complet

La spec v1.1 (#20, ticket #26) ajoute le type de baseplate **Skeleton** (ADR 0013) : le profil de poche complet ne reste qu'aux coins des cellules, autour des croisements, et le milieu des murets descend presque à plat, pour économiser de la matière. Les cotes de départ sont celles d'extrabold (`docs/research/types-de-baseplate.md`) : des poteaux pleine hauteur autour des croisements, une bande de 0 à 0,35 mm entre eux, environ × 0,44 de matière, un bac guidé par ses 4 coins. Le prototype `prototypes/skeleton/` a comparé trois formes d'entaille et mesuré l'assise, les aimants, les vis et le numéro de pièce.

## Décision

- **Entaille** (`packages/geometry/src/skeleton.ts`) : chaque muret entre deux croisements du treillis est entaillé jusqu'à une **bande basse** de 0,35 mm arrondis à la couche supérieure : 0,40 mm à 0,2 (2 couches), 0,36 à 0,12, 0,56 à 0,28. Sous la bande, le muret garde tout son profil.
- **Poteau** : autour de chaque croisement, le profil complet reste sur un **bras** de 5 mm le long de chaque muret en haut de la baseplate (l'arc de coin de la poche, 4 mm, plus 1 mm de côté droit), qui s'élargit à 45° vers le bas : 9,2 mm à la bande en profil hybride. Le bac est guidé par ses 4 coins, sur tout l'arc de coin, à toutes les hauteurs.
  - Le bras de 5 mm, et pas 4 : avec 4 mm, le flanc de l'entaille tourne à la verticale pile sur le dessus de la baseplate, au bout de l'arc, et le maillage des briques y pince une arête. Et l'alésage de la plus grande tête de vis (8 mm + 1 mm de jeu, rayon 4,5) toucherait le bout du poteau.
- **Où** : tous les murets entre deux cellules du treillis (la grille et les cellules entières de la marge), coupes comprises. Restent entiers :
  - **le tour du treillis** (le muret du bord de la grille, ou le demi-muret contre un cadre ou des équerres) : il raidit le bord, porte la marge et guide les bacs du bord sur leur côté extérieur. La marge ne change pas, cellules tronquées comprises ;
  - **le bord de cellule qui porte le numéro de la pièce**, ses deux moitiés : la gravure de 0,4 mm traverserait la bande de 0,4 mm.
- **Clips** : aucun (`BaseplateTypeVariant.clips: false`, `takesClips`). Leur fente se loge au milieu du muret, entaillé. Le réglage garde sa valeur (le lien aussi) ; l'interface désactive l'interrupteur et dit pourquoi.
- **Aimants** : inchangés, sous les croisements, dans les poteaux. Au plafond du logement (2,20 mm), le poteau s'étend à 7,5 mm de l'axe : 4,25 mm de paroi le long des murets. Sur les diagonales, la paroi reste celle de la Normal (0,56 mm contre le coin de poche). Le poteau n'a pas à s'élargir.
- **Vis** : inchangées. Au-dessus de l'assise (2,80 mm), l'alésage de la tête (6 + 0,5 mm) laisse au poteau 3,45 mm le long des murets à 2,9 mm, et 1,85 mm à 4,5 mm. La plus grande tête (8 + 1 mm) en laisse 0,5 mm en haut. Le poteau n'a pas à s'élargir.
- **Découpe** : les coupes passent dans l'axe des murets, donc au milieu des bandes et par les poteaux ; chaque pièce en garde la moitié. Le numéro reste au milieu d'un bord de cellule, dont le muret n'est pas entaillé.
- **Type unique** : Skeleton n'est pas combinable avec Tray (un seul type à la fois). Le kit de test reste ouvert.
- **Lien** : `ty=skeleton`, que la table v1 lisait déjà.

## Assemblage (ADR 0004)

- **Briques** : une sorte de cellule se distingue aussi par ses côtés entaillés (4 bits). L'outil de poche d'une cellule, avec les entailles de ses côtés jusqu'à la couture, est construit directement comme un maillage, sans booléen : les niveaux de la poche, deux points par côté entaillé au-dessus de la bande, et un « tab » par côté (fond, flancs, face sur la couture, dessus). La face d'un tab sur la couture n'a de points qu'à la bande et en haut de l'outil : les deux briques d'un muret l'entaillent sur les mêmes points, et leurs faces se soudent. Deux essais ont échoué : une entaille qui traverse la couture, puis des points sur la couture à chaque niveau de la poche. Dans les deux cas, les points sur la couture dépendaient de la façon dont chaque brique triangulait ou simplifiait ses faces.
- **Booléens** : une entaille par muret, sur toute sa largeur, retirée à part après les poches (elles débordent dans les poches ; l'alésage d'une grosse tête peut les toucher).
- **Mêmes volumes** par les deux voies (à 0,01 mm³ près), `NoError`, et aucune arête pincée (chaque arête a exactement deux faces) : 3 marges coupées ou non, chanfrein et vis, cellules entières de la marge, profil ras, cellules de 20 et 80 mm, couches de 0,12 à 0,28.
- **Performance** : le Skeleton seul faisait passer l'aperçu du 1000 × 1000 coupé en 16 pièces de 90 à 108 ms (seuil 100). Deux gains valent pour tous les types :
  - les trous de la marge qui restent hors des coutures (le cadre à traverses) ne font plus partie de la brique de base : ils partent avec les trous de coin, et les briques d'un côté partagent leur base. Les trous qui traversent une couture (les équerres) restent dans la dalle ;
  - chaque brique ne découpe que les trous de la marge proches d'elle.

  Mesures locales en aperçu : Normal 72 ms (au lieu de 90), avec vis 82 (au lieu de 97) ; Skeleton 86 ms, avec vis 96. Tiroir par défaut : Skeleton 35 ms.

## Mesures (prototypes/skeleton, qualité finale)

| Cas | Normal | Skeleton | Rapport |
|---|---|---|---|
| 2 × 2 (1 aimant) | 5,58 cm³ | 3,91 cm³ | × 0,70 |
| tiroir par défaut, cadre, 40 aimants | 78,42 | 39,57 | × 0,50 |
| tiroir par défaut coupé en 4 (plateau 256) | 78,98 | 42,21 | × 0,53 |

- **Assise** : un pied standard s'arrête au même endroit que dans la Normal (z = 0), sans jeu en X ni en diagonale, avec les trois formes d'entaille : les poteaux gardent les arcs de coin.
- **Formes comparées** (tiroir par défaut, contour entier / contour entaillé) :
  - E, l'entaille d'extrabold (19 → 38 mm, flancs à 26°) : × 0,52 / × 0,44. Le poteau n'a plus que 2,9 mm de bras en haut : il rogne l'arc de coin ;
  - P, retenue (bras de 5 mm en haut, 45°) : × 0,50 / × 0,42 ;
  - V, poteaux droits de 4 mm : × 0,38 / × 0,28, mais 0,75 mm de paroi autour d'un aimant, et rien autour de la plus grande vis.

## Considered Options

- **Entailler aussi le tour de la grille** (comme extrabold, qui entaille aussi le mur extérieur et la marge) : −6,3 cm³ sur le tiroir par défaut (× 0,42 au lieu de × 0,50). Écarté pour l'instant (**à valider**) :
  - le bord serait une bande de 0,4 mm contre les trous du cadre ;
  - le demi-muret du bord est coplanaire au flanc des trous du cadre ;
  - avec les cellules tronquées, seule la moitié intérieure du muret serait entaillée.

  Le banc `banc-2x2-skeleton-tout-entaille.3mf` est fourni pour comparer.
- **L'entaille d'extrabold telle quelle** : plus de matière que P, et le haut de l'arc de coin rogné.
- **Muret creux façon GridFlock (`hollow`)**, recommandé par la recherche : il garde tout le profil, donc l'assise sur tout le tour, pour environ × 0,5 de matière. Le mainteneur a choisi Skeleton ; `hollow` reste une piste pour un type à part, si la tenue des bacs guidés par leurs seuls coins déçoit.
- **Numéro gravé dans un poteau** : 2 chiffres ne tiennent pas entre le logement d'aimant et le bout du bras à la hauteur de la bande. Il faudrait retirer l'aimant.
- **Élargir le poteau pour les aimants ou les vis** : inutile avec des flancs à 45° (voir les parois mesurées).

## Consequences

- Skeleton n'est jamais par défaut : moins de matière, mais un bac tenu par ses seuls coins. L'interface montre son volume mesuré à côté des autres types.
- `GridFrame.skeleton` (`Skeleton { band }`) ; `skeletonOf(layerHeight)` et `takesClips(type)` sont exportés.
- `MarginCut.solid(window, overHoles)` : les briques demandent la découpe de la marge par-dessus les trous qu'elles retirent ensuite.
- CLICKbase (#27) : ajouter son entrée à `BASEPLATE_TYPE_VARIANTS` ; ses lamelles sont sur les côtés des cellules, pas de conflit avec ce type (un seul type à la fois).
- Impression empilée (#28) : un Skeleton retourné pose sur ses poteaux et sur le tour de la grille.
- **À valider par l'impression** (recette #16) : le guidage d'un bac par ses 4 coins (banc 2 × 2), la tenue de la bande de 0,4 mm quand on manipule la baseplate, et la comparaison avec le tour entaillé et avec l'entaille d'extrabold.

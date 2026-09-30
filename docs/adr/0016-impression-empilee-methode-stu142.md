---
status: proposed
---

# Impression empilée : méthode Stu142, une couche d'air, marge pleine hauteur

La spec v1.1 (#20, ticket #28) ajoute un interrupteur **« Empiler les pièces »** à l'export. Les pièces d'une baseplate découpée sortent en une pile, pour une seule impression en mono-matière. Recherche : `docs/research/impression-empilee-multimateriaux.md` (mécanisme des trancheurs) et `impression-empilee-sources.md` (Stu142, Printables 725407, et les échecs rapportés). Mesures : `prototypes/stack/`.

## Décision

- **Méthode Stu142** : dans chaque pile, la 1re pièce est à l'endroit et **toutes les autres sont retournées** sur celle du dessous. Une pièce retournée pose ses plats de muret sur les plats de la 1re pièce, puis sur les pieds des murets de la pièce retournée du dessous. Ses murets partent de leurs plats, et chaque pente s'imprime au-dessus de celle du dessous. Pas d'alternance : les joints dessous contre dessous ont ×3,8 de contact sur la pile de la recette (1 255 contre 327 mm²), et ×4,6 sur le tiroir par défaut d'après la recherche.
- **Pas de la pile** : la hauteur de la pièce **plus exactement une couche** (`stackPitch`). Cela donne 4,80 mm en hybride à 0,2, et 5,60 mm pour un Tray (5,40 mm) à 0,2. **Écart à la spec, à valider** : la spec donne `ceil(H / couche) · couche + couche`. Les deux formules sont égales quand H est un nombre entier de couches, ce qui est le cas des réglages par défaut. Elles diffèrent sinon, par exemple en profil ras (4,25 mm à 0,2 : 4,45 mm contre 4,60 mm). La raison : le trancheur échantillonne chaque couche en son milieu. Un jeu d'exactement une couche contient toujours un seul point d'échantillonnage, quelles que soient la première couche et la hauteur de la pièce (recherche, § 3.5). Il laisse donc une couche vide, jamais zéro (pièces soudées), jamais deux. La formule de la spec laisse 0,35 mm d'air en ras à 0,2, soit deux couches vides, et PrusaSlicer et OrcaSlicer refusent alors le fichier (détecteur de couches vides, § 2.2).
- **Avertissement** si la couche dépasse 0,2 mm : au-delà, ce même détecteur signale la couche vide unique (`STACK_MAX_LAYER_MM`).
- **Qui pose sur qui** (`stackPlanOf`, calculé sur le plan de découpe seul, sans maillage). Une pièce ne se pose sur une autre que si celle-ci la porte, à trois conditions :
  - sa grille tombe sur les mêmes lignes ;
  - elle tient dans l'emprise de l'autre ;
  - chaque mur extérieur de sa marge est sur un mur de l'autre.

  Les plus grandes pièces passent d'abord. Chacune va sur la pile dont le dessus la porte et est le plus petit, sinon elle commence une nouvelle pile. Retourner, c'est un miroir sur un seul axe : autour de X (l'arrière passe à l'avant) ou de Y (la gauche passe à droite). Une pièce dont la marge est sur les deux côtés opposés ne rejoint pas la pile. Le tiroir par défaut donne ainsi **2 piles** (pièces 2, 4, 1 et pièce 3), et une grille alignée en arrière à gauche donne 2 piles de 2. **À valider** : plusieurs piles, c'est plusieurs objets du 3MF, parfois plusieurs plateaux.
- **3MF** : un objet par pile, fait d'autant de coquilles que de pièces (un seul maillage), sans métadonnées de trancheur. Les clips restent un objet à part, à côté des piles (ils ne s'empilent pas). Le 3MF relu garde les hauteurs : les coquilles sont dans les sommets, et le placement ne fait que translater. En STL, le zip contient un fichier par pile. Fichier `…-stack.3mf`, objets « pile 1 : pièces 2, 4, 1 ».
- **Règle de la marge, à valider** : l'empilement n'est proposé qu'avec une **marge en cellules tronquées** (pleine hauteur) ou sans marge. Le cadre et les équerres font 2 mm de haut. Sous une pièce retournée, ils commenceraient 2,6 mm au-dessus du joint, reliés à la grille par des traverses en porte-à-faux : 562 mm² de départs en l'air sur une pièce du tiroir par défaut. L'interface désactive l'interrupteur et propose « Passer aux cellules tronquées ». C'est la règle la plus sûre, et elle ne demande aucune géométrie nouvelle. Elle coûte la matière des cellules tronquées (+18,2 cm³ sur le tiroir par défaut coupé, 97,2 contre 79,0 cm³). Écarté pour l'instant : un cadre pleine hauteur réservé à la pile. Il coûterait moins de matière, mais la pièce exportée ne serait plus celle de l'aperçu et des statistiques.
- **Types** (mesures `prototypes/stack/results.md`) :
  - **Normal** : permis. Aucun plafond dans une pièce retournée.
  - **Skeleton** : permis, **avec avertissement**. Retournée, la bande d'un muret entaillé (0,40 mm, deux couches) est un pont de 23,62 mm entre les flancs de deux poteaux. Le contact au joint est plus faible (301 mm² contre 327 sur la pile de la recette).
  - **Tray** : **refusé**. Retourné, le fond ponte toute la poche (36,3 × 36,3 mm), et son affaissement remonterait vers le pied du bac, posé 0,2 mm au-dessus.
  - **CLICKbase** : **refusé**. Ses toiles portent les lamelles quand il est imprimé à l'endroit, et leur arête de 0,1 mm doit casser sous le premier bac. Retourné, la toile s'imprimerait sur la lamelle, à partir d'une arête plus fine qu'une ligne, et s'y souderait. C'est un raisonnement, pas une mesure : à valider par une impression si le besoin existe.
- **Aimants et trous** : retournée, une pièce a ses logements d'aimant ouverts vers le haut. Leur fond borgne devient un plancher : **plus de pont** dans la pièce, alors qu'à l'endroit ce fond est un pont de Ø 6,5 mm. En revanche, les plats de la pièce du dessus traversent ces ouvertures. Ce sont les seules parts non portées d'un joint :
  - 289,6 mm² sur le tiroir par défaut, pour 1 561 mm² de dessous, et un pont de 6,5 mm au plus (Ø du logement) ;
  - les fentes de clip et les trous de vis donnent le reste ;
  - sans aimant ni clip, le joint est porté à 100 %.
- **Options** : des **oreilles** et des **pions**, désactivés par défaut (le plus économe), préférences locales comme l'interrupteur.
  - Oreilles : un disque de Ø 12 mm, d'une couche, sur chaque coin de la pièce du bas. Il déborde d'une ligne sur le contour et évite le reste de la pièce.
  - Pions : un pion de Ø 0,8 mm monte du plateau à chaque coin que les pièces au-dessus partagent avec celle du bas. Il est relié à chacune par une oreille à sa base. C'est la parade publiée contre le soulèvement des coins des pièces 2 et 3.
  - Sans pions, les pièces du dessus n'ont pas d'oreille : elle pendrait dans le vide.
  - Les pions imposent les oreilles.
- **Exclusions** : le kit de test n'est jamais empilé (une seule pièce, deux hauteurs de plats). Les clips sont exportés à part.
- **Préférence** : l'interrupteur et ses options sont des préférences de ce navigateur, **hors du lien de partage** (à valider). La famille « Empiler les pièces » n'apparaît qu'avec plusieurs pièces.
- **Performance** : l'empilement ne touche que l'export. L'aperçu et la finale ne changent pas. Les oreilles et pions coûtent une union manifold par pile, à l'export seulement.

## Conséquences

- Le moteur expose `stackRuleOf`, `stackPitch`, `stackPlanOf` et `printStacks` (`packages/geometry/src/stack.ts`). L'interface les lit pour afficher les piles, leur hauteur et le pas, tous calculés exactement. Le worker les applique à l'export.
- À imprimer (#16) : `prototypes/stack/files/pile-3-pieces.3mf` d'abord (séparation, face retournée, assise d'un bac dans une pièce retournée), puis les variantes avec oreilles et pions, et en Skeleton.
- Un Tray ou un CLICKbase empilable demanderait une autre méthode (interface bi-matière, hors périmètre de la spec) ou une géométrie propre à la pile.

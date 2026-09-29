---
status: accepted
---

# Marge provisoire : cadre à traverses, 2,00 mm de haut

Le prototype de marge (#3, `prototypes/margin-variants`) a retenu, à titre provisoire, la variante « cadre à nervures ». Le moteur (#10) l'implémente seule, sous le nom de **cadre à traverses** : un **mur extérieur** suit le contour de la baseplate, et une **traverse** part de chaque ligne de la grille, dans l'alignement des murets, pour le relier à la grille. La variante est rangée derrière une interface interne (`MarginVariant` dans `packages/geometry/src/margin.ts`) : si la recette d'impression (#16) en retient une autre, on la remplace sans changer l'interface publique du moteur.

Cotes et règles retenues :

- **Hauteur** : 2,00 mm (10 couches de 0,2), arrondie à la couche supérieure (`roundUpToLayer`) : 2,04 mm à 0,12, 2,08 mm à 0,16, 2,24 mm à 0,28. On arrondit vers le haut pour ne jamais rendre le mur moins raide qu'à 0,2 mm.
- **Largeur du mur extérieur et des traverses** : 1,2 mm, arrondie au nombre de lignes supérieur (`roundUpToLine`), jamais moins de 2 lignes. Le mur reste proche de 1,2 mm quelle que soit la buse (1,2 mm à 0,4 et à 0,6 ; 1,5 mm à 0,5 ; 2,4 mm à 1,2), et il n'est jamais fait d'une seule ligne.
- **Mur côté grille** : c'est le muret de bord de la grille, déjà plein. On n'ajoute pas de second mur.
- **Traverses des première et dernière lignes** : elles restent à l'intérieur de l'emprise de la grille. Ainsi chaque coin de la marge est une boîte fermée.
- **Trou plus étroit qu'un mur** : il est rempli, pour ne jamais imprimer une fente. En particulier, une marge plus étroite que deux murs n'a pas de trou.
- **Marges au centième** : la mise en page arrondit les marges à 0,01 mm, et le partage selon l'alignement conserve leur somme. Aucune poussière flottante n'atteint la géométrie. La baseplate peut dépasser « tiroir − jeu » de 0,005 mm au plus, ce qui est invisible à l'impression.
- **Équerres** : les équerres de coin du prototype (variante 2) ne sont pas implémentées.

## Consequences

- Une variante fournit ce qu'elle retire du bloc extrudé du contour : des trous sur toute la hauteur, et un solide au-dessus de la marge. Elle peut le limiter à une fenêtre, pour qu'une brique de cellule (ADR 0004) ne prenne que sa part. Les briques de bord et de coin portent donc leur morceau de marge : l'assemblage reste sans booléen global.
- Le volume mesuré est celui du prototype : 81,34 cm³ pour le tiroir par défaut (400 × 280 mm, 9 × 6 cellules, dont 4,13 cm³ de marge) et 6 555,8 mm³ pour le banc de 109 × 109 mm. Les tests du moteur s'en servent de référence.
- Le verdict de la recette d'impression (#16) peut changer la variante, la hauteur ou la largeur du mur. Un ticket de correction suivra alors, et cet ADR sera remplacé.

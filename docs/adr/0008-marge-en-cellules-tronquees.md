---
status: proposed
---

# Marge en cellules tronquées, à ras de la grille

> **Révisé par l'ADR 0011 (#23)** : les cellules tronquées ne sont plus la marge par défaut, mais l'une des trois formes au choix (`marginShape: "cells"`, clé `mg=cells`). Le cadre à traverses redevient le défaut. Les règles ci-dessous (mur extérieur, pas de fente, coins, briques sur le treillis) valent toujours pour cette forme.

La marge provisoire de #3 et #10 était un cadre à traverses de 2,00 mm de haut. Le mainteneur le trouve peu esthétique : il veut que la marge ressemble à un bout de la grille (#19). La marge devient donc la variante 1 du prototype de marge, à ras : la grille continue dans la marge, cellule après cellule au même pas, jusqu'au bord du tiroir, où un mur extérieur la coupe. Chaque cellule de la marge que le mur coupe est une **cellule tronquée** : une poche vide, au profil de la grille et sans fond ; les autres sont des poches entières, sans vis. Les murets de la marge sont ceux de la grille, prolongés avec leur profil, leur hauteur complète (4,60 mm en hybride, 4,25 mm en ras) et leur plat.

Le moteur branche cette forme comme une variante interchangeable (`TRUNCATED_CELLS` dans `packages/geometry/src/margin.ts`), sans changer son interface publique. Le cadre à traverses (`CROSSBAR_FRAME`) restait dans le code sans être exposé ; depuis #23, il est de nouveau le défaut (ADR 0011).

## Règles

- **Mur extérieur** : il suit tout le contour, y compris le long d'un côté sans marge. Il fait 1,2 mm, arrondi au nombre de lignes, avec deux lignes au moins (règle de #10). Avec un chanfrein du dessous, il s'épaissit du chanfrein vers l'intérieur.
- **Pas de fente** : un trou de la marge n'est jamais plus étroit qu'un mur, à aucune hauteur. La paroi d'une poche est en pente, donc une cellule tronquée se rétrécit vers le bas. Sous la hauteur où son trou deviendrait plus étroit qu'un mur, elle est remplie. Son trou a alors un fond plat, placé sur un nombre entier de couches (arrondi vers le haut).
- **Cellule remplie** : une cellule tronquée est remplie entièrement si son trou ferait moins d'une couche de profondeur, ou s'il est déjà plus étroit qu'un mur à son sommet. Sa place revient au mur extérieur, qui fusionne avec le muret voisin. Avec les réglages par défaut, cela arrive pour une marge de moins de 3,0 mm : 1,2 mm de mur, 0,6 mm de muret (la paroi de la poche une couche sous le plat), puis 1,2 mm de trou.
- **Coins** : près d'un coin du contour, arrondi ou vif, le trou doit aussi contenir un disque d'un mur de diamètre, à la hauteur de son fond. Le coin arrondi de l'intérieur du mur, ou celui de la poche elle-même, peut en effet rétrécir le trou sur les deux axes à la fois.
- **Pas de vis dans la marge** : les vis restent aux intersections intérieures de la grille (ADR 0006).

Exemples avec les réglages par défaut (mur de 1,2 mm, couches de 0,2 mm) :

| Marge d'un côté | Cellules tronquées de ce côté |
|---|---|
| 10,5 et 13,5 mm (tiroir par défaut) | ouvertes en bas |
| 5 mm | fond à 0,60 mm |
| 3,2 mm | fond à 4,20 mm (rainure de deux couches) |
| 2,7 mm | remplies |

## Briques de cellule (ADR 0004)

Une marge plus large qu'une cellule contient des cellules entières : dans un tiroir de 1000 mm en cellules de 20 mm, le plafond de 24 cellules par axe laisse 519 mm de marge, soit 50 × 50 poches en tout. Construites comme des découpes de la marge, elles coûtaient plusieurs secondes d'aperçu. Les briques sont donc posées sur un **treillis** : la grille, plus les cellules entières de la marge (`MarginVariant.wholeCells`), qui réutilisent la brique intérieure. Seule la bande du bord, une cellule et le reste de la marge, passe par des booléens. Une cellule de la marge au bord du treillis a sa propre clé de brique : sa poche vient de la découpe de la marge, qui peut différer de la poche de la grille (le long d'un côté sans marge, le mur extérieur la coupe).

## Considered Options

- **Garder le cadre à traverses** (#3, #10) : 20 cm³ de moins sur le tiroir par défaut, mais le mainteneur rejette son rendu.
- **Cellules tronquées à 2,00 mm** : 12 cm³ de moins, mais la marge montre une marche de 2,6 mm le long de la grille, et ne la prolonge plus.
- **Pas de mur extérieur sur les côtés sans marge** : les cellules de la marge y continueraient le bord de la grille (plat de 0,4 mm). Mais près d'un coin arrondi, le trou déborderait du contour, et il faudrait une règle de raccord. On garde le mur tout autour, comme le prototype : sur un côté sans marge, le plat passe de 0,4 à 1,2 mm au croisement de la grille et de la marge.
- **Couper les fentes au lieu de les remplir** : une rainure plus étroite qu'un mur s'imprime mal, ou pas du tout.

## Consequences

- **Matière** : sur le tiroir par défaut, la pièce passe de 81,34 à 101,53 cm³ (+20,19 cm³, +25 %). La marge pèse 24,32 cm³, un tiers de la marge pleine à ras (73,84 cm³). C'est un écart assumé au principe « économe », au profit du rendu demandé.
- **Temps d'impression** : +69,2 m de contours sur le tiroir par défaut, contre +33,6 m pour le cadre bas (mesures du prototype, #3).
- **Liens partagés** : un lien `v=1` ne dit pas quelle marge construire. Les liens créés avant #19 redonnent donc une autre marge, avec les mêmes cotes. La v1 n'étant pas encore publiée, on n'ajoute pas de version de lien.
- **Performance** (médianes locales, Node) : le tiroir par défaut passe de 25 à environ 40 ms en aperçu et de 0,3 à 0,5 s en finale. Les seuils de #5 (grilles sans marge) ne bougent pas. Le tiroir 60 × 1000 mm (1 × 23, voie booléenne) passe de 71 à 111 ms en aperçu : au-dessus de la cible de 100 ms.
- **Gros tiroirs en petites cellules** : le plafond de 24 cellules par axe (#13) ne borne plus le nombre de poches, puisque la marge prolonge la grille. Un tiroir de 1000 × 1000 mm en cellules de 20 mm compte 50 × 50 poches : environ 180 ms d'aperçu, 8 s de finale et 3,3 millions de triangles (le cas que le plafond de #13 voulait éviter). Le test local de performance le tient à des limites plus larges, hors des cibles de la spec.
- **Recette #16** : le banc `banc-1-cellules-tronquees-h4.6.3mf` du prototype devient le fichier à imprimer en priorité.

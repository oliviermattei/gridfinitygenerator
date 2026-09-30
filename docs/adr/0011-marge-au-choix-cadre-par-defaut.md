---
status: proposed
---

# Marge au choix : cadre à traverses par défaut, cellules tronquées, équerres de coin

#19 avait remplacé le cadre à traverses par les cellules tronquées (ADR 0008), pour le rendu. Le grilling du 2026-09-29 (spec v1.1, #20) tranche autrement : la forme de la **marge** devient un réglage à trois choix, et le **cadre à traverses** redevient le défaut, parce qu'il est le plus économe des formes qui s'appuient sur tout le tour du tiroir. Cet ADR remplace l'ADR 0008 sur le choix de la variante ; les règles des cellules tronquées de l'ADR 0008 restent valables pour la variante `cells`.

## Décision

- **Réglage** `marginShape` (`packages/geometry/src/settings.ts`), clé `mg` du lien de partage, écrite seulement hors du défaut :
  - `frame` : **cadre à traverses** (défaut, ADR 0006-marge, variante 3 du prototype #3) ;
  - `cells` : **cellules tronquées** (ADR 0008, variante 1) ;
  - `brackets` : **équerres de coin seules** (variante 2).
  La clé entre dans la table v1 sans changer de version, car la v1 n'est pas publiée (comme `cl` en #22). Un lien `v=1` sans `mg` donne le cadre.
- **Moteur** : `MARGIN_VARIANTS` et `marginOf(frame)` (`margin.ts`) ; `GridFrame.marginShape` dit quelle variante construit la marge. Le cadre et les équerres partagent une même construction (`wallMargin`) : un mur extérieur et des traverses de 2,00 mm de haut arrondis à la couche supérieure, de 1,2 mm de large arrondis à la ligne (deux au moins), un trou plus étroit qu'un mur rempli, le mur épaissi du chanfrein du dessous. Seules changent les lignes qui portent une traverse, et l'étendue du mur.
- **Équerres** (variante 2 du prototype, à l'identique) :
  - à chaque coin, un L de mur extérieur dont les jambes dépassent de 10 mm les lignes de la grille, relié à la grille par les traverses des premières et dernières lignes : au coin de deux marges, l'équerre ferme une boîte ;
  - des équerres en T intermédiaires sur les côtés de plus de 4 cellules : ⌈n / 4⌉ − 1 lignes, réparties au plus près de n·k / (T + 1), soit une traverse et le mur 10 mm de part et d'autre ;
  - le reste de la marge est vide et ouvert sur le tiroir.
- **Coupe (ADR 0009)** : une traverse sur une ligne de coupe est **doublée**, une traverse entière de chaque côté de la coupe, comme aux premières et dernières lignes. Chaque pièce garde un bord de marge fermé. Pour les équerres, un T sur une coupe devient deux L, un par pièce.
- **Pièce de bord sans équerre** : les T restent placés sur la baseplate entière, pas pièce par pièce. Une pièce de bord entre deux équerres n'a donc que ses cellules : sa marge est vide et ouverte sur le tiroir. Elle reste un solide fermé (`NoError`), et ce sont ses clips qui la tiennent à ses voisines. Sans clips, elle n'est tenue que par ses voisines bout à bout. **À valider** à l'impression.
- **Interface** : une famille « Marge » donne les trois formes. Chacune affiche le volume de la baseplate qu'elle donne, mesuré sur son maillage final. Quand la famille est ouverte et que la baseplate a une marge, le moteur calcule les deux autres formes en arrière-plan, après la finale de la forme choisie. Ce calcul est annulé dès qu'un réglage change.

## Briques (ADR 0004)

Le cadre se répète de cellule en cellule, mais pas les équerres, ni une traverse doublée sur une coupe. Une brique du contour se distingue donc aussi par la forme des trous de la marge dans son emprise, relevée au dixième de micromètre autour du centre de sa cellule. Deux briques aux mêmes trous partagent leur calcul.

La découpe « au-dessus de la marge » évite les trous. Sinon, sa face sur le bord de la grille, le long d'un trou entre deux équerres, coïnciderait avec la paroi du trou, et le booléen poserait des sommets différents de part et d'autre d'une couture.

## Mesures (tiroir par défaut, 400 × 280 mm, qualité finale)

| Forme | Une pièce | Découpée pour un plateau de 256 mm (4 pièces, 15 clips) | Prototype #3 |
|---|---|---|---|
| Cadre à traverses | 81,34 cm³ | 81,02 cm³ | 81,34 cm³ |
| Cellules tronquées | 101,53 cm³ | 101,11 cm³ | 101,53 cm³ |
| Équerres de coin | 78,26 cm³ | 77,89 cm³ | 78,26 cm³ |

- Les volumes du banc de 109 × 109 mm sont aussi retrouvés à 0,5 mm³ près : 6 555,8 mm³ pour le cadre, 10 344,9 pour les cellules et 6 134,4 pour les équerres.
- Sur la coupe, les traverses doublées du cadre ajoutent 103,7 mm³ au tiroir par défaut : 1,2 mm de plus sur 2 × 12,3 et 2 × 9,3 mm de traverse, à 2 mm de haut.
- **Performance** (médianes locales) : le tiroir par défaut prend 22 ms en aperçu et 120 ms en finale avec le cadre, 28 et 145 ms avec les équerres, 29 et 182 ms avec les cellules. Les seuils de #5 tiennent pour les trois formes. Les cas hors cible de l'ADR 0008 ne concernent plus que les cellules tronquées.

## Considered Options

- **Garder les cellules tronquées par défaut** (#19) : +25 % de matière sur le tiroir par défaut. Écarté par le grilling : le défaut est toujours le choix le plus économe.
- **Équerres par défaut** : 3 cm³ de moins que le cadre, mais la baseplate ne s'appuie sur le tiroir qu'aux équerres (19 à 22 % de chaque côté, #3). La recette (#16) dira si elles suffisent.
- **Placer les T sur les coupes**, pour que chaque pièce de bord ait ses équerres : plus de matière, et une règle de placement de plus. Réversible si la recette montre des pièces de bord qui bougent.
- **Couper la traverse en deux sur une coupe** : chaque pièce aurait gardé une demi-traverse de 0,6 mm, soit une ligne et demie, qui s'imprime mal.

## Consequences

- L'ADR 0008 n'est plus le choix de la marge, mais les règles de la variante `cells`. L'ADR 0006-marge redevient la marge par défaut, avec la traverse doublée sur une coupe.
- Les volumes attendus des tests e2e reviennent au cadre : 81,0 cm³ pour le tiroir par défaut découpé, 114,0 cm³ pour 500 × 300 mm.
- **Recette #16** : les trois bancs du prototype (`prototypes/margin-variants/files/`), que le moteur reproduit, départagent les trois formes sur le maintien.

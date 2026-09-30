# Banc jetable : découpe pour le plateau (ticket #21)

> Questions posées :
> - Le plan par programmation dynamique donne-t-il le bon nombre de pièces sur les cas de la recherche ?
> - Où graver le numéro d'une pièce sans casser l'assemblage par briques (ADR 0004) ?
> - Les pièces assemblées par briques sont-elles fermées, et identiques à celles de la voie booléenne ?
>
> Ce banc mesure le moteur lui-même (`packages/geometry`, ADR 0009), à la différence de `margin-variants/`, qui avait sa propre géométrie. Il sert aussi à produire les fichiers de la recette #16. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/split
```

`bench.test.ts` écrit `results.md` et les fichiers de `files/`. Il relit chaque 3MF avec le lecteur des tests du moteur, reconstruit chaque objet avec manifold, et s'arrête si un objet n'est pas `NoError` ou si le volume relu s'écarte de plus de 0,5 mm³ de celui du moteur. Les tableaux ci-dessous sont repris de `results.md`.

## Plans de découpe

| Cas | Plateau | Pièces | Colonnes × rangées (cellules) | Tourné | Plus grande pièce (mm) | Pièces hors plateau |
|---|---|---|---|---|---|---|
| tiroir par défaut | 180 × 180 | 6 | 3 + 3 + 3 × 3 + 3 | non | 136,5 × 139,5 | 0 |
| tiroir par défaut | 220 × 220 | 6 | 3 + 3 + 3 × 3 + 3 | non | 136,5 × 139,5 | 0 |
| tiroir par défaut | 250 × 210 | 4 | 4 + 5 × 3 + 3 | non | 220,5 × 139,5 | 0 |
| tiroir par défaut | 256 × 256 | 4 | 4 + 5 × 3 + 3 | non | 220,5 × 139,5 | 0 |
| tiroir par défaut | 350 × 350 | 2 | 4 + 5 × 6 | non | 220,5 × 279,0 | 0 |
| tiroir par défaut | 50 × 50 | 54 | 1 × 9 colonnes, 1 × 6 rangées | non | 52,5 × 55,5 | 26 |
| tiroir 1000 × 600 | 256 × 256 | 15 | 4 + 5 + 5 + 5 + 4 × 4 + 5 + 5 | non | 210,0 × 215,5 | 0 |
| tiroir 60 × 1000 (1 × 23) | 256 × 256 | 5 | 1 × 4 + 5 + 5 + 5 + 4 | non | 59,0 × 210,0 | 0 |
| 9 × 6 cellules + 41 mm de marge par côté | 256 × 256 | 4 | 4 + 5 × 3 + 3 | non | 251,0 × 167,0 | 0 |
| 2 × 1 cellules + 250 mm de marge par côté | 256 × 256 | 3 | 4 + 4 + 4 × 1 | non | 208,0 × 42,0 | 0 |
| 20 × 20 cellules | 256 × 256 | 16 | 5 + 5 + 5 + 5 × 5 + 5 + 5 + 5 | non | 210,0 × 210,0 | 0 |
| 10 × 4 cellules | 200 × 300 | 2 | 5 + 5 × 4 | oui | 210,0 × 168,0 | 0 |

Ce qu'on en retient :

- Le tiroir par défaut sur 256 mm donne bien les **4 pièces** calculées par la recherche (`decoupe-et-clips.md` § 3.6). Il n'y a pas de marge de plateau cachée : sur 250 × 210, le plan est le même.
- Sur 220 mm, une pièce de 5 colonnes et sa marge fait 220,5 mm : il faut 3 colonnes de pièces. L'égalité donne alors 3 + 3 + 3 plutôt que 4 + 4 + 1.
- **Plan tourné** : une 10 × 4 (420 × 168 mm) sur un plateau de 200 × 300 prend 3 pièces tel quel, et 2 tourné.
- **Grande marge** : dans le mode cellules, la marge de cellules entières se découpe comme la grille. Une 2 × 1 avec 250 mm de marge par côté donne 3 pièces qui tiennent. Les coupes tombent dans la marge (lignes −1 et 3).
- **Plateau trop petit** (50 mm) : une cellule tient, mais pas avec sa marge. Chaque pièce garde une cellule, et les 26 pièces du bord sont signalées hors plateau.

## Numéros gravés

Un muret est centré sur la couture entre deux briques : un numéro de 3 mm de haut en travers du muret serait à cheval sur deux briques. Il tient donc dans un demi-muret, en chiffres de 3 mm empilés le long du muret, de 1,8 mm de large, et centrés en travers. Ils restent loin de la couture comme de la poche : la brique du numéro est une brique à part, la brique de sa cellule moins les chiffres, sans soudure à reprendre.

| Profil, couche | Profondeur | Demi-muret au fond de la gravure | Peau de chaque côté du chiffre (1,8 mm) | Matière retirée, tiroir par défaut en 4 pièces |
|---|---|---|---|---|
| hybride, 0,2 | 0,40 mm | 2,80 mm | 0,500 mm | 4,47 mm³ |
| ras, 0,2 | 0,40 mm | 2,45 mm | 0,325 mm | 4,47 mm³ |
| hybride, 0,28 | 0,56 mm | 2,64 mm | 0,420 mm | 6,26 mm³ |
| ras, 0,28 | 0,56 mm | 2,29 mm | 0,245 mm | 6,26 mm³ |
| ras, 0,12 | 0,48 mm | 2,37 mm | 0,285 mm | 5,36 mm³ |

La peau la plus mince, 0,245 mm, se trouve en ras avec des couches de 0,28 mm. Elle est mesurée au fond de la gravure, là où la paroi de la poche est la plus rentrée. Le test du moteur (`split.test.ts`) vérifie sur une coupe à 0,2 mm que le « 1 » est bien en miroir vu de dessus.

## Pièces fermées et identiques par les deux voies

Les tests du moteur (`packages/geometry/test/split.test.ts`) couvrent quatre cas :

- le tiroir par défaut ;
- le profil ras avec des couches de 0,28 mm ;
- un chanfrein de 1 mm avec des coins vifs et des vis ;
- des cellules de 20 mm avec de grandes marges.

Dans chaque cas, chaque pièce est `NoError` et a le même volume par les briques et par les booléens, à moins de 0,1 mm³ près.

Le seul piège rencontré vient du chanfrein du dessous. Les briques du bord portent un anneau de sommets en haut du chanfrein, sur leurs coutures aussi. Sur une coupe, leur face touche celle d'une brique intérieure, qui n'avait pas cet anneau. Les briques intérieures le reçoivent donc quand la baseplate est coupée (ADR 0009).

## Fichiers à imprimer pour la recette (#16)

Dans `files/`, en 3MF, un objet nommé par pièce, fermés (`NoError`), tels que le site les exporte.

| Priorité | Fichier | Contenu | Volume total | Ce qu'on juge |
|---|---|---|---|---|
| 1 | `coupe-2x2-en-2-pieces.3mf` | 2 × 2 cellules sans marge, 2 pièces de 2 × 1 | 5,65 cm³ | Le raccord à la coupe : la coupe se ferme-t-elle sur toute la hauteur (pied d'éléphant) ? Un bac 2 × 1 posé à cheval sur la coupe est-il bien assis, sans marche ? Les numéros se lisent-ils sous les pièces ? |
| 2 | `coupe-2x2-marge-en-2-pieces.3mf` | la même, avec les marges du tiroir par défaut (10,5 et 13,5 mm) | 13,03 cm³ | La coupe à travers la marge : le mur extérieur et les murets de la marge se rejoignent-ils bien ? |

On règle le générateur ainsi pour les retrouver :

- fichier 1 : mode « nombre de cellules », 2 × 2, plateau de 90 × 50 mm ;
- fichier 2 : même mode, avec 21 mm de marge en largeur et 27 mm en profondeur, sur un plateau de 110 × 60 mm.

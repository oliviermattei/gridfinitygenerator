# Banc jetable : clips aux coins des jonctions (ticket #30)

> Questions posées :
> - Déplacée du milieu d'un bord de cellule au coin, au bout d'une jonction, la fente d'un clip (ADR 0010) garde-t-elle 0,8 mm de peau côté poche dans les 4 types et les 2 profils ?
> - Au croisement de deux coupes, chaque pièce porte deux fentes dans son coin, une le long de chaque coupe : où les faire partir pour qu'elles ne se touchent pas ?
> - Au bord de la grille, la fente perce-t-elle la marge (le cadre ne fait que 2 mm de haut) ?
> - Le poteau d'un Skeleton loge-t-il la fente ? Et en CLICKbase, qui cède, la fente ou la lamelle qui commence à 4,5 mm du coin ?
>
> Le banc taille ses propres fentes (la section de l'ADR 0010) dans les pièces du moteur générées sans clips, puis vérifie les fentes du moteur (ADR 0018) et écrit les fichiers de la recette. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/clips-corner
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/` (~10 s). Chaque maillage taillé par le banc est `NoError` ; chaque 3MF est relu, reconstruit avec manifold (`NoError`) et compté sans arête pincée (`badEdges`).

## Réponse (mesures de `results.md`)

**Croisement de deux coupes** (2 × 2 cellules en 4 pièces, une fente le long de chaque coupe dans chaque coin) :

- Partant de l'axe, les deux fentes d'un coin se chevauchent sur 1,35 × 1,35 mm et coupent les dents. Elles partent donc à **1,92 mm** de l'axe (1,35 + 0,8/√2) : il reste **0,81 mm** de matière en diagonale entre leurs coins.
- **Peau côté poche** : 0,80 mm au plus mince (sur la partie verticale de la poche), dans les 4 types et les 2 profils ; plus en dessous (1,50 à z = 0,1 en hybride). En Tray, sous le haut du fond, la matière va jusqu'à la poche voisine : la fente traverse le fond.
- **Rien n'est retiré au-dessus du haut de la fente** (section perdue ≤ 5·10⁻⁶ mm², bruit de CLICKbase).

| Type | Fente de 5 mm partie à 1,92 mm | Décision |
|---|---|---|
| Normal, Tray | 27,80 mm³ (hybride), 34,60 mm³ (Tray) par clip, exactement la fente | fente de 5 mm |
| Skeleton | s'ouvre sur l'entaille en haut (poteau à 6,80 mm de l'axe à 2,80 mm ; 0,012 mm³ de conflit) | fente de **4,0 mm** (hybride), **4,1 mm** (ras) : mur de 0,93 / 0,88 mm contre l'entaille, mesuré sur le moteur |
| CLICKbase | traverse les saignées (25 mm³ de la fente déjà vides) ; raccourcie, elle ne ferait que 2,08 mm | fente de 5 mm, **lamelle voisine raccourcie** (commence 0,5 mm après la fente : 9,08 mm au croisement, 10,20 mm au bord, en 42 mm ; retirée sous 8 mm) |

**Bord de la grille** (cadre de 10 mm) : au-dessus de la traverse (2 mm), le trou du cadre commence au bord du treillis. La fente part à **0,8 mm** du bord : il reste 0,80 mm de muret entre elle et le trou (mesuré à 2,70 mm en hybride, 2,30 mm en ras).

**Tiroir par défaut** découpé pour 256 mm (moteur) : **8 clips**, deux par jonction, dans les 4 types ; 79,18 cm³ en Normal (15 clips et 79,0 cm³ avant).

## Fichiers à imprimer pour la recette (#16)

Dans `files/`, en 3MF, un objet nommé par pièce plus l'objet « clip × N », tels que le site les exporte.

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `kit-coin-croisement-skeleton.3mf` | 2 × 2 cellules en 4 pièces, Skeleton, 4 clips de 3,5 mm au croisement des coupes | Les 4 clips entrent-ils par-dessous dans les poteaux, et tiennent-ils les 4 pièces à plat, sans marche au croisement ? Rien ne se voit de dessus, le mur de 0,9 mm entre la fente et l'entaille tient-il ? |
| 2 | `kit-coin-croisement-clickbase.3mf` | 2 × 2 cellules en 4 pièces, CLICKbase, 4 clips de 4,5 mm au croisement, lamelles voisines raccourcies à 9,08 mm | Les clips tiennent-ils les 4 pièces ? Un bac 1 × 1 s'enclenche-t-il et tient-il encore dans une cellule de coin (deux lamelles raccourcies) ? |
| 3 | `kit-coin-bord-skeleton.3mf` | 2 × 3 cellules et un cadre de 10 mm, en 2 pièces, 2 clips aux bouts de la jonction | Le mur de 0,8 mm entre la fente et le trou du cadre s'imprime-t-il, sans que la fente se voie depuis la marge ? |
| 4 | `kit-coin-bord-clickbase.3mf` | la même chose en CLICKbase | La même chose, avec les lamelles raccourcies à 10,20 mm. |
| 5 | `kit-coin-croisement-normal.3mf` | 2 × 2 cellules en 4 pièces, Normal, 4 clips de 4,5 mm | La référence : comparer la tenue du coin avec les types précédents. |

On retrouve les kits dans le générateur : mode « Nombre de cellules », 2 × 2 (plateau de 50 × 50 mm) ou 2 × 3 avec 20 mm de marge en largeur et en profondeur (plateau de 60 × 200 mm), et le type.

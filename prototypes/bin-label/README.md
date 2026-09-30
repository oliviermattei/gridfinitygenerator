# Banc jetable : onglet d'étiquette, pelle dans les coins, rebord normal ou réduit

> Questions du grilling du 2026-09-30 (suite de #32) :
> 1. **Q8 bis** : un onglet d'étiquette qui tienne un bin plein de vis soulevé par sa tablette, sans être plein dessous. Quelle forme ?
> 2. **Q10** : la pelle peut-elle tourner dans ses deux coins, au lieu de buter dans les parois de côté ?
> 3. **Q1** : le rebord normal apporte-t-il quelque chose au réduit, pour l'empilage ?
>
> Le banc part des bins du moteur (`generateBin`) et y ajoute ses propres onglets et sa propre pelle. C'est du code jetable : le moteur sera réécrit d'après le verdict.

## Relancer

```bash
# depuis la racine du dépôt
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/bin-label
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`, relus et reconstruits avec manifold (`NoError`). `coupes.svg` montre les coupes des onglets et des pelles, calculées par manifold sur les mêmes maillages.

## Les quatre onglets (`files/bin-onglets-ABCD.3mf`, de gauche à droite)

Un bin 4 × 1 × 4 U, un compartiment par cellule, un onglet de 12 mm contre la paroi arrière de chacun (matière mesurée, `results.md`) :

| | Forme | Matière | Place prise sous l'onglet |
|---|---|---|---|
| A | coin plein (le moteur aujourd'hui) | 3,39 cm³ | 3,51 cm³ |
| B | triangle creux, coque de 1,2 mm (façon Chappel) | 1,39 cm³ | 3,51 cm³ (vide fermé) |
| **C** | **tablette nervurée** : tablette de 1,6 mm, liseré 0,8 × 1,0 mm, congé de racine de 2 mm, **une console de 1,2 mm à 45° au milieu de la cellule** | **0,94 cm³** | **0,93 cm³** |
| D | la même tablette sans console | 0,87 cm³ | 0,86 cm³ |

La console ne coûte que 0,07 cm³. C prend 3,6 fois moins de matière que A et rend 2,6 cm³ de place par compartiment.

## Essai de charge (à faire)

Imprimer `files/bin-onglets-ABCD.3mf` en PLA, 0,2 mm, 2 périmètres, 15 % de remplissage, **à l'endroit, sans support**. Noter d'abord si la tablette de C et D s'imprime proprement : c'est un pont de 40 mm d'une paroi à l'autre, et C a en plus sa console.

Puis, pour chaque onglet, du plus faible (D) au plus fort (A) :

1. Accrocher sous la tablette, au milieu, un crochet (trombone ouvert, ficelle) relié à une bouteille d'eau.
2. Monter la charge par demi-litres jusqu'à **2 kg** (le seuil retenu, Q11), en soulevant le bin par le crochet.
3. Noter la charge où la tablette plie nettement, se fissure à la racine, ou casse.

Verdict attendu : si **C tient 2 kg**, c'est la forme du moteur. Si **D tient aussi**, la console reste quand même, car elle coûte 0,07 cm³ et protège d'un choc. Si C casse avant 2 kg, on essaie une console plus épaisse ou deux par cellule, puis B en repli.

## Pelle (`files/pelle-actuelle.3mf`, `files/pelle-dans-les-coins.3mf`)

Bin 2 × 1 × 3 U, 2 compartiments, la pelle à l'avant. Dans la pelle actuelle, la rampe bute sur les parois de côté et laisse un pli dans les coins. Dans l'autre, le fond recule à chaque hauteur de l'arrondi de la pelle à l'avant, et de celui du congé ailleurs. Les deux coins avant s'élargissent de l'écart, jusqu'à retrouver le coin du congé en haut de la pelle. Voir `coupes.svg`, section 2. La différence de matière est de +0,4 cm³ sur le bin. À juger à l'œil et au doigt : une vis glisse-t-elle hors du coin ?

## Empilage (`files/empilage-normal.3mf`, `files/empilage-reduit.3mf`)

Trois bins 1 × 1 × 3 U par fichier. Le réduit donne +18 % de volume utile (19,4 contre 16,4 cm³) et 2 mm de plus en hauteur utile. Protocole :

- empiler les trois bins, pleins de vis ;
- soulever la pile par le bin du bas ;
- la porter et la secouer latéralement ;
- noter tout glissement ou basculement.

Si le réduit se comporte comme le normal, il devient le défaut (Q1).

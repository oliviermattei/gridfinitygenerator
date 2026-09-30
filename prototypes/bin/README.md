# Banc jetable : le bin avant son moteur (ticket #34)

> Questions posées (spec v2, #32) :
> 1. Le pied standard exact du bin (ADR 0018) s'assoit-il dans nos baseplates, de chaque type et des deux profils ? Avec quel jeu ?
> 2. Socle plein (standard, fond intérieur à 7 mm) ou creux (fond juste au-dessus des pentes) : combien de matière et de temps au trancheur ?
> 3. Quel rayon pour le congé du fond ?
>
> Le banc prend le bin du moteur (`generateBin`) et les baseplates du moteur (`generateBaseplate`), pose le bin par bissection, et tranche les socles avec PrusaSlicer en ligne de commande. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur ; PrusaSlicer pour la question 2)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/bin
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`, relus et reconstruits avec manifold (`NoError`). Les STL et G-code intermédiaires vont dans `tmp/` (ignoré).

## Réponses

**1. Le pied standard s'assoit partout, sans variante.** Mesuré sur les maillages du moteur (`results.md`, section 1) :

- Normal hybride et Skeleton : le pied touche les pentes et le fond du tiroir à z = 0, sans jeu latéral. C'est l'assise voulue par l'ADR 0002.
- Normal ras : il pose sur le fond du tiroir, avec 0,25 mm de jeu.
- Tray : il est porté par ses pentes seules, 0,2 mm au-dessus du fond (ADR 0013).
- CLICKbase : à la hauteur d'assise, le pied chevauche les ergots de 6,9 mm³. Ce sont les lamelles qui le serrent (ADR 0015) ; sans elles, il serait libre à 1,45 mm.

L'ADR 0018 tient : aucun réglage de pied côté bin.

**2. Le socle reste plein par défaut, en attendant l'impression.** Le socle creux divise le volume du maillage par deux (−43 à −57 %), mais au trancheur, avec 15 % de remplissage, il ne gagne que **9 à 15 % de filament** et 2 à 4 % de temps. Il gagne aussi 1 mm de hauteur utile. En contrepartie, son fond franchit ~35 mm au-dessus du vide (pont), et une coque de pied de 1,2 mm est moins rigide qu'un pied plein. Le gain est réel mais modeste. Le socle creux ne devient le défaut que si l'impression de `bin-1x1x3-creux.3mf` montre un pont propre et un pied qui ne cède pas (recette #16). En attendant, le moteur garde le socle plein, standard, et l'option `socle: "hollow"` reste réservée au banc.

**3. Congé de 5 mm.** Il rend atteignable, pour un doigt de 8 mm de rayon, 40 % du coin mort entre le fond et la paroi (8,4 mm² au lieu de 13,7), pour 5,5 % de volume utile en moins sur un bin 1 × 1 × 3 U. À 8 mm, le rayon est borné par la hauteur utile (5,7 mm appliqués), pour 1,7 point de volume de plus. 5 mm est assez grand pour faire rouler une vis M3 (tête de 5,5 mm) hors du coin. La pelle, quand elle est activée, prolonge ce congé à l'avant avec un rayon de 12 mm (borné par la profondeur du compartiment).

## Fichiers à imprimer (recette #16)

- `files/bin-1x1x3-plein.3mf` et `files/kit-de-test.3mf` : essayer le bin dans les deux cellules du kit.
- `files/bin-1x1x3-plein.3mf` et `files/clickbase-1x1.3mf` (PETG) : le bin doit s'enclencher.
- `files/bin-1x1x3-creux.3mf` : juger le pont du fond et la rigidité du pied creux.
- `files/bin-2x1x4-pelle-onglet.3mf` : la pelle, l'onglet sans support, et un bin empilé dessus.

# Banc jetable : fentes de bord (ticket #37)

> Questions posées :
> - Une baseplate sans marge sur un côté peut-elle porter sa moitié de fente (sa dent et son canal) sur ce côté, pour être clipsée plus tard à une autre générée à part ?
> - Le **chanfrein du dessous** empêche-t-il le pont du clip d'affleurer, ou le clip de tenir ?
> - Où faire partir la fente au coin de la plaque : coin arrondi, fente de bord de l'autre côté, chanfrein de l'autre côté ?
> - Deux plaques identiques posées côte à côte ont-elles leurs fentes en vis-à-vis ?
>
> Le banc taille ses propres demi-fentes (la section de l'ADR 0010, à cheval sur le contour) dans des plaques du moteur générées sans fentes (`GenerateOptions.clips: false`), puis vérifie les fentes du moteur (ADR 0022) et écrit le fichier de la recette. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/edge-slots
```

`bench.test.ts` écrit `results.md` et le 3MF de `files/` (~10 s). Chaque maillage taillé par le banc est `NoError` ; le 3MF est relu, reconstruit avec manifold (`NoError`) et compté sans arête pincée (`badEdges`).

## Réponse (mesures de `results.md`)

**Chanfrein du dessous** (plaque 2 × 2 sans marge, demi-fente de 5 mm sur le côté droit) :

- La fente retire la même matière que sur une coupe : 13,90 mm³ par demi-fente en hybride, 12,20 en ras ; la peau côté poche reste de 0,80 mm au plus mince, et rien n'est retiré au-dessus du haut de la fente.
- Le canal est ouvert dessous sur toute sa largeur : le pont **affleure toujours**. Le chanfrein ne fait que retirer d'avance une partie de la fente (0,6 mm³ à 0,5 mm, 1,6 à 0,8, 4,4 à 1,5).
- Jusqu'à **0,8 mm** (le canal), le chanfrein tombe tout entier dans la fente. Jusqu'à **1,30 mm** (canal + dent), il entame le bas de la dent côté joint (joint à partir de 0,99 mm pour 1 mm de chanfrein), mais **la face que serre la jambe reste entière** (0,80 → 2,80 mm, 2,00 mm de haut). Au-delà, elle raccourcit : 1,79 mm de dent tenue à 1,5 mm de chanfrein, 1,29 à 2 mm, 0,29 à 3 mm ; la peau contre la jambe est entamée dès 1,35 mm (et nulle à z = 0,1 à 3 mm).
- Décision : **fentes de bord jusqu'à 1,30 mm de chanfrein** (`bridge + tooth`), aucune au-delà. À valider à l'impression.

**Coin de la plaque** (deux demi-fentes perpendiculaires dans le même coin) : départ = max(1,92 ; rayon du coin ; 0,8 + chanfrein). À coins vifs, 1,92 mm laisse 0,81 mm en diagonale entre les deux fentes, et 1,92 mm de matière entre le bout de la fente et le contour ; avec le coin de 4 mm par défaut, la fente part à 4 mm (2,53 mm de matière le long de la jambe jusqu'à l'arrondi).

**Moteur** : les fentes de bord du moteur retirent exactement les demi-fentes du banc (écart ≤ 0,0001 mm³), sans arête pincée ; deux plaques identiques ont leurs fentes en vis-à-vis (côté droit de l'une et gauche de l'autre en y = −35,50 mm ; fond et avant en x = −35,50 mm).

## Fichier à imprimer pour la recette (#16)

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `files/deux-plaques-2x2-sans-marge.3mf` | Deux plaques de 2 × 2 cellules sans marge (5,53 cm³ chacune, 4 fentes de bord chacune, une par côté), et 2 clips | Posées côte à côte (le côté droit de l'une contre le côté gauche de l'autre, ou le fond contre l'avant), les fentes tombent-elles en vis-à-vis ? Le clip s'enfonce-t-il par-dessous et tient-il les deux plaques à plat, sans marche ? Rien ne se voit de dessus ? Le bout de la fente près du coin arrondi s'imprime-t-il proprement ? |

On retrouve les plaques dans le générateur : mode « Nombre de cellules », 2 × 2, sans marge ; le clip seul se télécharge par « Télécharger le clip (STL) ».

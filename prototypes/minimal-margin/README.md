# Banc jetable : marge minimale et grille prolongée (ticket #29)

> Questions posées :
> - Réduite à ses appuis (deux par côté, sur la première et la dernière ligne de la grille), chaque forme de marge tient-elle la baseplate dans le tiroir sans casser ? Quelle variante d'appui imprimer pour le savoir ?
> - Que coûte chaque forme, complète ou minimale, par rapport à la grille seule ?
>
> Le banc passe par le moteur (variante A de chaque forme, telle que le générateur la construit) et construit deux autres variantes d'appui par booléens sur son maillage. C'est du code jetable : on ne le reprend pas tel quel. Décision : ADR 0017.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/minimal-margin
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/` (~5 s). Chaque maillage est `NoError` et sans arête pincée (`badEdges`). Chaque 3MF est relu, reconstruit avec manifold (`NoError`) et son volume comparé à 0,5 mm³ près.

## Le banc

3 × 2 cellules de 42 mm, 12 mm de marge sur les quatre côtés (150 × 108 mm), profil hybride, qualité finale, sans découpe. Chaque côté porte ses deux appuis. Les deux côtés courts n'ont que deux rangées : en cellules minimales, tout le côté est gardé.

## Réponse (mesures de `results.md`)

| Variante | Ce qui change | Surplus sur la grille seule (mm³) | Contact avec le tiroir X / Y (mm) |
|---|---|---|---|
| Cadre minimal A (moteur) | traverse et mur pleine hauteur, 1,2 mm (3 lignes), mur de 5,70 mm | 729 | 22,8 / 22,8 |
| Cadre minimal B | appuis à 2,00 mm de haut | 317 | 22,8 / 22,8 |
| Cadre minimal C | traverse et mur de 2,0 mm (5 lignes) | 1 658 | 22,8 / 22,8 |
| Cellules minimales A (moteur) | première et dernière cellule tronquée, fermées | 7 304 | 179,4 / 190,8 |
| Cellules minimales B | cellules d'appui à 2,00 mm | 3 608 | 179,4 / 190,8 |
| Cellules minimales C | mur prolongé de 10 mm vers le milieu | 7 718 | 179,4 / 230,8 |
| Grille minimale A (moteur) | murets d'appui entiers, talon de 1,2 mm | 1 806 | 22,8 / 22,8 |
| Grille minimale B | talon de 2,4 mm | 2 107 | 22,8 / 22,8 |
| Grille minimale C | talon élargi en patin de 10 mm | 2 188 | 40,0 / 40,0 |
| Grille prolongée complète (moteur) | tous les murets, un talon au bout de chacun | 5 763 | 34,2 / 45,6 |
| Cadre complet (référence) | — | 1 576 | 200,8 / 284,8 |
| Cellules complètes (référence) | — | 8 112 | 200,8 / 284,8 |

Grille seule du banc : 8 433 mm³. Tiroir par défaut (3 formes × 2 états, entier et découpé pour 256 mm) : voir `results.md` et l'ADR 0017.

- La marge minimale ne s'appuie plus sur tout le tour : 4 × 5,70 mm de contact par axe au lieu de 200 à 285 mm. C'est ce que la recette doit juger : la baseplate reste-t-elle calée, un appui casse-t-il quand on pousse un bac ?
- Le cadre minimal est le moins cher (0,7 cm³ sur le tiroir par défaut), la grille minimale suit (1,8 cm³), les cellules minimales coûtent plus (7,9 cm³ : huit cellules fermées et leurs murs).
- La grille prolongée complète coûte 30 % de moins que les cellules (15,8 contre 22,1 cm³ sur le tiroir par défaut) pour le même aspect de grille continue, sans mur extérieur.

## Fichiers à imprimer pour la recette (#16)

| Priorité | Fichier | Ce qu'on juge |
|---|---|---|
| 1 | `files/banc-grille-prolongee.3mf` | La nouvelle forme complète : les talons (1,2 mm, pleine hauteur) s'impriment-ils nets ? Le banc tient-il dans un cadre de 150 × 108 mm sans jeu, sans basculer quand on pousse un bac vers le bord ? |
| 2 | `files/banc-cadre-minimal-A-moteur.3mf` | Les appuis du moteur (traverse de 3 lignes, pleine hauteur) : tenue dans le tiroir, casse d'une traverse quand on force la baseplate contre une paroi. |
| 3 | `files/banc-grille-minimale-A-moteur.3mf` | Même jugement, murets d'appui et talons. |
| 4 | `files/banc-cellules-minimal-A-moteur.3mf` | Même jugement ; les cellules d'appui tiennent-elles un bac ? |
| 5 | `files/banc-cadre-minimal-B-2mm.3mf` et `-C-5-lignes` | Si A casse : C (plus large) suffit-il ? Si A tient : B (2 mm, moins de matière) tient-il aussi ? |
| 6 | `files/banc-grille-minimale-B-talon-2-4.3mf` et `-C-patin-10` | Si les talons de A marquent ou cassent : un talon plus profond (B) ou un patin plus long (C). |
| 7 | `files/banc-cellules-minimal-B-2mm.3mf` et `-C-mur-prolonge` | Mêmes questions pour les cellules. |

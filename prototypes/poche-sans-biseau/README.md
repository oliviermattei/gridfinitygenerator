# Banc jetable : la poche « sans biseau » (question du 2026-10-11)

> Question posée : la poche hybride (ADR 0002) est, de bas en haut, verticale sur 0,35 mm au retrait 2,85, à 45° sur 0,7 mm jusqu'au retrait 2,15, verticale jusqu'à z = 2,85, puis à 45° jusqu'au plat de 0,4 mm à z = 4,60. Variante « sans biseau » : on supprime le petit 45° du bas et la marche de 0,35. La paroi est verticale au retrait 2,15 de z = 0 à 2,85, puis la même pente haute monte jusqu'au plat de 0,4, sur 4,60 mm de haut. Points : [0 ; 2,15], [2,85 ; 2,15], [4,6 ; 0,4]. Le rayon de la poche au fond passe à 4 − 2,15 = 1,85.
>
> - Où s'arrête un pied de bac standard, avec quel jeu, sur quelles surfaces ?
> - Combien de matière, et quelle emprise sur le plateau ?
> - Les contraintes du moteur qui dépendent du pied des murets tiennent-elles encore : aimant, peau des fentes de clip, assise des vis ?
>
> Le banc construit ses propres baseplates 1 × 1 (cellule de 42 mm, sans marge ni aimant, rayon extérieur 4) avec l'outil de poche du moteur. Il y pose le pied standard par bissection, comme `prototypes/tray/`. Pour les contraintes, il fait générer au moteur des 2 × 2 et des 3 × 3 avec la variante. Le moteur n'est pas modifié : le banc remplace `POCKET_PROFILES.hybrid` le temps d'un appel. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/poche-sans-biseau
# puis le projet Bambu Studio (P1S 0.4, 0.20mm Standard, Bambu PLA Basic), un plateau par fichier de files/
node prototypes/bambu-plates/plates.mjs poche-sans-biseau
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`, relus et reconstruits avec manifold (`NoError`). Il vérifie aussi que le moteur, sans ses fentes de bord, construit la même 1 × 1 que le banc (même volume à 0,01 mm³ près), dans les deux profils.

## Réponse

**Au banc, rien ne change pour le bac.** Il s'assoit sans jeu, à z = 0, sur la pente haute et sur le fond du tiroir. Il ne perd que le contact de la pente basse, que le hybride ajoutait. La variante coûte 5 % de matière en moins, mais l'emprise au plateau baisse de 23 % : à z = 0, le muret ne fait plus que 4,30 mm entre deux cellules, et 2,15 mm au bord. Les contraintes du moteur tiennent, avec les mêmes minimums, parce que la partie la plus mince était déjà la paroi verticale au retrait 2,15. La variante étend ce minimum jusqu'au fond.

| Mesure (1 × 1, 42 mm) | Hybride | Sans biseau |
|---|---|---|
| Hauteur | 4,60 | 4,60 |
| Pied s'arrête à (bissection) | 0,000 | 0,000 |
| Jeu latéral | 0,000 | 0,000 |
| Surfaces touchées | pente basse, pente haute, fond du tiroir | pente haute, fond du tiroir |
| Jeu pied/paroi à z = 0 | 0,35 | 1,05 |
| Volume | 1366,5 mm³ | 1295,1 mm³ (−71,4, −5,2 %) |
| Masse à 1,24 g/cm³ | 1,69 g | 1,61 g |
| Emprise à z = 0 (contact plateau) | 433,7 mm² | 331,9 mm² (−23,5 %) |
| Emprise à z = 0 du moteur (4 fentes de bord) | 406,7 mm² | 304,9 mm² |
| Muret au pied entre deux cellules | 5,70 | 4,30 |
| Muret au pied au bord sans marge | 2,85 | 2,15 |
| Rayon de la poche au fond | 1,15 | 1,85 |

- **Assise** : dans les deux profils, la pente haute du pied et celle de la poche sont sur la même droite (demi-côté = 16 + z). Le pied y est donc assis exactement quand il touche le tiroir : l'assise reste hyperstatique, comme le hybride au fond du tiroir (banc `tray`), mais sur deux surfaces au lieu de trois. Sans la pente basse, le bas du pied (chanfrein de 0,8 et bande verticale) n'a plus de contact. Il garde 0,25 mm de jeu à la paroi sur sa bande verticale, et 1,05 mm à z = 0, au lieu de 0,35 : plus de place pour un pied d'éléphant de la première couche.
- **Matière** : −71,4 mm³ sur la 1 × 1. Une baseplate de plusieurs cellules n'est pas mesurée ici.

### Contraintes du pied de muret (moteur avec la variante, qualité finale, réglages par défaut)

| Contrainte | Hybride | Sans biseau | Verdict |
|---|---|---|---|
| Aimant (ADR 0012), Ø 6,5 × 2,20, 2 × 2 : poche la plus proche de l'axe du croisement, à z = 0,05 | 4,507 | 3,807 | — |
| Aimant : minimum sous le plafond (z ≤ 2,10), paroi | 3,807, paroi 0,557 | 3,807, paroi 0,557 | tient : même paroi, de z = 0 à 2,20 au lieu de 1,05 à 2,20 |
| Vis (ADR 0006), 3 / 6 mm + 0,5, 3 × 3 : assise | 2,80 | 2,80 | inchangée (pied de la pente haute à 2,85) |
| Vis : paroi la plus mince sous l'assise | 0,567 (à z 2,79) | 0,567 (à z 2,79) | tient : fraisure et tige entières dans la matière |
| Fente de clip (ADR 0010, 0018, 0022), 2 × 2 en 4 pièces : haut | 2,80 | 2,80 | inchangé |
| Fente : peau côté poche au fond (z = 0,05) | 1,500 | 0,800 | — |
| Fente : peau minimale, coupes et bords | 0,800 | 0,800 | tient (≥ 0,8), de z = 0 au haut de la fente |

Le banc vérifie que, sous le plafond de l'aimant et sous l'assise de la vis, chaque section perd exactement les disques des trous : aucun trou n'entame une poche. Il vérifie aussi que rien n'est retiré au-dessus du haut des fentes. Le seuil de l'ADR 0006 (au-delà de 7,6 mm de Ø tête + jeu, la fraisure débouche dans la poche) se joue à l'assise, sur la paroi au retrait 2,15. Il ne change pas.

## Fichiers à imprimer

À imprimer : `poche-sans-biseau.3mf`, le projet Bambu Studio de la P1S (couches de 0,2 mm, Bambu PLA Basic, Textured PEI). Il a un plateau par fichier : `banc-1x1-hybride`, puis `banc-1x1-sans-biseau`.

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `files/banc-1x1-sans-biseau.3mf` | 1 × 1, 4,60 mm, variante sans biseau, sans aimant ni fente | **Assise** d'un bac 1 × 1 : il descend jusqu'au plateau, sans jeu latéral ni bascule. Il ne doit pas rester perché sur un bourrelet du bas de la paroi. **Jeu** : comparer à la main avec le 2 ; la différence ne devrait se sentir qu'au bas du pied. **Adhérence** : le muret ne fait que 2,15 mm au pied (contre 2,85). Vérifier que les coins ne se soulèvent pas et que le bord ne gondole pas. **Première couche** : un anneau continu, sans manque dans les coins de poche (rayon 1,85). Le pied d'éléphant ne doit pas gêner le bac (1,05 mm de jeu au fond). |
| 2 | `files/banc-1x1-hybride.3mf` | 1 × 1, 4,60 mm, profil hybride du moteur | Référence pour comparer l'assise, le jeu et la tenue au plateau. |

Réglages : couches de 0,2 mm, PLA, 23 couches exactes dans les deux profils, sans support ni bordure, pour juger l'adhérence telle quelle. Ces pièces n'ont pas les fentes de bord du moteur : on juge le profil seul. Une 1 × 1 du générateur en a 4, qui réduisent le pied du muret à 0,8 mm sur 5 mm, de z = 0 à 0,8, au milieu de chaque bord (304,9 mm² d'emprise au lieu de 331,9).

## Ce qui reste incertain

- L'adhérence d'un muret de 2,15 mm au bord, et de 0,8 mm au droit d'une fente de bord, ne se mesure qu'à l'impression.
- L'assise reste hyperstatique (pente haute et tiroir). Le banc ne dit pas si, sans la pente basse, un bac imprimé un peu large se centre moins bien. C'est à sentir à la main.
- Le gain de matière d'une grande baseplate (cellules intérieures, marge) n'est pas mesuré : seule la 1 × 1 l'est.

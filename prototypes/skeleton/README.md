# Banc jetable : type Skeleton, les murets entaillés entre des poteaux (ticket #26)

> Questions posées :
> - Quelle forme d'entaille : celle d'extrabold (`docs/research/types-de-baseplate.md`), ou une autre ? Combien de matière contre la Normal ?
> - Le bac, guidé par ses seuls coins, reste-t-il assis, sans jeu ?
> - Le poteau garde-t-il assez de paroi autour d'un logement d'aimant (#24) et de l'alésage d'une vis (#11), ou doit-il s'élargir ?
> - Le numéro de pièce (#21), gravé de 0,4 mm sous le milieu d'un bord de cellule, tient-il dans la bande ?
>
> Le banc retire ses propres entailles à la Normal du moteur (voie booléenne), mesure, puis vérifie que le moteur construit exactement la variante retenue. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/skeleton
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`, relus et reconstruits avec manifold (`NoError`).

## Réponse

**Variante P : une bande de 0,35 mm arrondis à la couche (0,4 mm), et des poteaux dont le bras fait 5 mm en haut (l'arc de coin de la poche et 1 mm de côté droit), 45° plus large par millimètre vers le bas.** Le tour de la grille reste entier. Le moteur construit exactement cette variante : même volume que le banc, sur la 2 × 2 comme sur le tiroir par défaut.

| Forme (cellule de 42 mm, couches de 0,2) | 2 × 2 sans aimant | Tiroir par défaut, aimants | Tout entaillé, tiroir | Bras en haut | Paroi autour d'un aimant (le long du muret) |
|---|---|---|---|---|---|
| Normal | 5,66 cm³ | 78,42 cm³ | — | — | — |
| E : extrabold (19 → 38 mm, flancs à 26°) | 4,03 (× 0,71) | 40,64 (× 0,52) | 34,55 (× 0,44) | 2,9 mm : rogne l'arc de coin | 4,7 mm |
| **P : bras de 5 mm en haut, 45° (retenu)** | **3,98 (× 0,70)** | **39,57 (× 0,50)** | 33,30 (× 0,42) | **5 mm** | **4,25 mm** |
| V : poteaux droits de 4 mm | 3,56 (× 0,63) | 29,67 (× 0,38) | 21,80 (× 0,28) | 4 mm | 0,75 mm |

- **Matière** : × 0,50 sur le tiroir par défaut (78,42 → 39,57 cm³), × 0,53 coupé pour un plateau de 256 mm (78,98 → 42,21 cm³ : chaque pièce garde entier le bord de cellule de son numéro, et les croisements coupés n'ont pas d'aimant). Extrabold annonce × 0,44 de sa propre Normal, marge pleine comprise.
- **Tour de la grille entier** : +6,3 cm³ sur le tiroir par défaut, contre un bord raide qui porte la marge et guide les bacs du bord. Entailler le tour aussi donnerait × 0,42 (**à valider**, banc « tout entaillé » fourni).
- **Assise** : dans les trois formes, un pied standard s'arrête à z = 0, comme dans la Normal, sans jeu en X ni en diagonale : les poteaux gardent les arcs de coin, qui suffisent à le centrer.
- **Aimants** : au plafond du logement (2,20 mm), le poteau P s'étend à 7,5 mm de l'axe, soit 4,25 mm de paroi le long des murets ; sur les diagonales, la paroi reste celle de la Normal (0,56 mm). Pas d'élargissement.
- **Vis** : tête de 6 mm + 0,5 de jeu : 3,45 mm de poteau autour de l'alésage à 2,9 mm, 1,85 mm à 4,5 mm. Tête de 8 + 1 mm : 0,5 mm en haut. Pas d'élargissement. Avec des poteaux droits de 4 mm (V), la plus grande tête n'en laisserait rien.
- **Pourquoi 5 mm et pas 4** : avec un bras de 4 mm, le flanc tourne à la verticale pile sur le dessus de la baseplate, au bout de l'arc de coin. Le maillage des briques y pinçait une arête (4 faces sur une arête). Et l'alésage de la plus grande vis (rayon 4,5) touchait le poteau.
- **Numéro de pièce** : la gravure de 0,4 mm traverserait la bande de 0,4 mm. Le bord de cellule qui porte le numéro garde son muret entier, ses deux moitiés.
- **Clips** : incompatibles, leur fente se loge au milieu du muret.

Les mesures détaillées (coupes des poteaux à chaque hauteur, vis) sont dans `results.md`.

## Fichiers à imprimer pour la recette (#16)

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `files/banc-2x2-skeleton.3mf` | Skeleton 2 × 2 du moteur (variante P, tour entier), 4,60 mm, bande 0,4 mm, 1 aimant, 3,91 cm³ | Le guidage : un bac 1 × 1 dans chaque poche, un bac 2 × 2 sur le tout. Le bac entre-t-il sans accrocher, sans jeu, sans basculer, tenu par ses 4 coins ? La bande de 2 couches se décolle-t-elle, casse-t-elle quand on manipule la plaque ? |
| 2 | `files/banc-2x2-skeleton-tout-entaille.3mf` | la même, le tour de la grille entaillé aussi, 1 aimant | Comparer au 1 : le bord entaillé suffit-il à guider les bacs du bord et à tenir la plaque ? Si oui, on pourra entailler le tour (−6,3 cm³ sur le tiroir par défaut). |
| 3 | `files/banc-2x2-skeleton-extrabold.3mf` | l'entaille d'extrabold, tout entaillé, 1 aimant | Comparer le guidage en haut : ses poteaux rognent l'arc de coin. |

On retrouve le banc 1 dans le générateur : mode « nombre de cellules », 2 × 2, type Skeleton.

# Banc jetable : type Tray, la grille sur un fond plein (ticket #25)

> Questions posées :
> - En profil hybride, un bac assis descend jusqu'au fond de la poche, à z = 0 (ADR 0002, `retenue-des-bacs-clickbase.md`). Où poser le fond du Tray pour que le bac reste **assis sur ses pentes**, et ne pose ni sur le fond seul (jeu latéral) ni sur les deux à la fois (hyperstatique) ?
> - Combien de matière coûte le Tray, et combien coûterait le fond prolongé sous la marge ?
> - Aimants, vis, clips, découpe, chanfrein : le fond les gêne-t-il ?
>
> Le banc construit ses propres baseplates 2 × 2 (outil de poche du moteur, sans marge ni aimant), y pose un pied de bac standard par bissection, puis vérifie que le moteur construit exactement la variante retenue. C'est du code jetable : on ne le reprend pas tel quel.

## Relancer

```bash
# depuis la racine du dépôt (Vitest et manifold-3d du paquet du moteur)
pnpm --filter @repo/geometry exec vitest run --root ../../prototypes/tray
```

`bench.test.ts` écrit `results.md` et les 3MF de `files/`, relus et reconstruits avec manifold (`NoError`).

## Réponse

**Le fond va sous la poche, et la poche monte de l'épaisseur du fond plus une couche de jeu (variante B).** Le bac reste assis sur ses pentes, sans jeu, 0,20 mm au-dessus du fond. Le moteur construit exactement cette variante (même volume que le banc à 0,01 mm³ près).

| Variante (cellule de 42 mm, couches de 0,2 mm) | Hauteur | Pied s'arrête à | Écart pied/fond | Jeu latéral | Porté par |
|---|---|---|---|---|---|
| Normal hybride, posée au fond du tiroir | 4,60 | 0,000 | 0 | 0 | pentes **et** tiroir (hyperstatique) |
| Normal ras, posée au fond du tiroir | 4,25 | 0,000 | — | 0,25 | tiroir seul |
| C : fond de 0,6 dans la poche, poche non relevée | 4,60 | 0,600 | — | 0,25 | fond seul |
| A : poche relevée du fond (0,6), sans jeu | 5,20 | 0,600 | 0 | 0 | pentes **et** fond (hyperstatique) |
| **B : poche relevée du fond et d'un jeu de 0,2 (retenu)** | **5,40** | 0,800 | **0,20** | **0** | **pentes seules** |
| B au profil ras | 5,05 | 0,600 | — | 0,15 | fond seul |

- **Le profil hybride est hyperstatique au fond du tiroir** : mesuré, le pied touche les pentes exactement à z = 0,000, donc aussi le tiroir. C'est l'assise « nominale » de l'ADR 0002 ; sur un tiroir, un écart d'impression se rattrape (le bac s'assoit sur les pentes ou sur le tiroir, le fond n'est pas imprimé).
- **Fond dans la poche (C)** : le bac pose sur le fond, 0,6 mm au-dessus de ses pentes. Il glisse de 0,25 mm (sa bande verticale touche la paroi verticale avant que les pentes ne se touchent). C'est le jeu du profil ras, que le profil hybride a été choisi pour supprimer : rejeté.
- **Poche relevée sans jeu (A)** : même assise nominale que la Normal, mais le dessus du fond est une surface imprimée : une couche un peu haute suffit à soulever le bac de ses pentes. Rejeté, mais fourni à l'impression pour comparer.
- **Retenu (B)** : 0,6 mm de fond (3 couches, arrondi à la couche) et 0,2 mm de jeu (une couche, arrondi à la couche), soit 0,8 mm : un nombre entier de couches, donc le profil s'imprime aux mêmes couches que dans la Normal. La marche verticale du pied de poche passe de 0,35 à 0,55 mm au-dessus du fond.
- **Profil ras** : même règle. Le bac y pose sur le fond (comme sur le tiroir en Normal), avec 0,15 mm de jeu au lieu de 0,25 : pas pire que la Normal ras.
- **Extrabold** (`types-de-baseplate.md`) : fond de 2,8 mm, poche relevée de 3,8 mm, pente haute tronquée ; le bac y est assis 0,65 mm au-dessus du fond, pour × 5,1 de matière.

### Matière (moteur, qualité finale, aimants compris)

| Cas | Normal | Tray | Écart | Fond aussi sous la marge |
|---|---|---|---|---|
| 2 × 2 sans marge | 5,58 cm³ | 10,16 cm³ | × 1,82 | — |
| 4 × 4 sans marge | 22,16 | 40,51 | × 1,83 | — |
| tiroir par défaut, cadre à traverses | 78,42 | 140,41 | × 1,79 | + 9,19 cm³ |
| tiroir par défaut, cellules tronquées | 96,43 | 169,42 | × 1,76 | — (les cellules tronquées sont des poches : elles ont le fond) |
| tiroir par défaut, équerres | 75,35 | 137,33 | × 1,82 | + 10,11 cm³ |

Sur le tiroir par défaut, les +61,99 cm³ se partagent entre le fond sous les 54 poches (42,7 cm³) et les murets relevés de 0,8 mm (19,3 cm³). Le fond n'est posé que sous les poches (grille, cellules entières et tronquées de la marge) : le prolonger sous les trous d'un cadre ou des équerres coûterait encore 9 à 10 cm³, pour une marge qui ne reçoit pas de bac. Sur un bureau, rien ne tombe « à travers » la marge : l'objet posé dans un trou de marge repose sur le bureau.

### Cohabitation

- **Aimants** : inchangés, sous les croisements (40 sur le tiroir par défaut, comme la Normal). Le croisement est plein de 0 à 5,40 mm, le logement de 2,20 mm y reste ouvert dessous ; autour, la poche est plus haute que dans la Normal, donc plus loin du trou. Pas de trou dans le fond : un aimant sous la poche demanderait un socle (ADR 0012).
- **Vis** : l'assise de la tête suit la pente haute relevée (3,60 mm au lieu de 2,80) ; la tige traverse le croisement sur toute sa hauteur.
- **Clips et découpe** : les coupes passent dans l'axe des murets, jamais dans le fond. La fente monte au pied de la pente haute relevée (3,60 mm au lieu de 2,80) : un clip plus haut, qui tient mieux ; même nombre de clips (15 sur le tiroir par défaut coupé en 4).
- **Chanfrein, briques (ADR 0004)** : le fond est dans l'outil de poche (il part du fond au lieu de passer sous la baseplate) ; aucune brique ni booléen de plus. Même volume par les deux voies, aperçu aussi rapide que la Normal (1000 × 1000 coupé en 16 : 82 ms contre 87).

## Fichiers à imprimer pour la recette (#16)

| Priorité | Fichier | Contenu | Ce qu'on juge |
|---|---|---|---|
| 1 | `files/banc-2x2-tray.3mf` | Tray 2 × 2 du moteur, 5,40 mm, fond 0,6 mm, 1 aimant au centre | L'assise : un bac 1 × 1 dans chaque poche, un bac 2 × 2 sur le tout. Aucun jeu latéral, aucune bascule ; le bac ne doit pas toucher le fond (0,2 mm, une feuille de papier ne doit pas être pincée). Le fond de 3 couches est-il fermé, plan, assez rigide pour déplacer la baseplate chargée ? |
| 2 | `files/banc-2x2-tray-sans-jeu.3mf` | la même sans le jeu (variante A), 5,20 mm, sans aimant | Comparer avec le 1 : le bac y bascule-t-il ou y a-t-il du jeu, le dessus du fond l'empêchant de descendre sur ses pentes ? Si A tient aussi bien que B, le jeu d'une couche pourra être retiré (−0,2 mm, −4,8 cm³ sur le tiroir par défaut). |

On retrouve le banc 1 dans le générateur : mode « nombre de cellules », 2 × 2, type Tray.

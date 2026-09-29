---
status: proposed
---

# Vis fraisées dans le croisement des murets, sans matière ajoutée

La spec v1 demande une vis à chaque intersection de la grille, avec un trou fraisé à 90° et un « plot local sous chaque vis, sans socle général ». Le plot est ce qui porte la tête de la vis. Avec le profil hybride (ADR 0002), un bac assis sur les pentes de sa poche descend jusqu'au fond de la baseplate : sa semelle (35,6 mm, rayon 0,8) est à z = 0. Toute matière ajoutée dans une poche, même sur une couche, soulève les bacs et leur donne du jeu. La seule matière de la baseplate sur laquelle aucun bac ne repose est le croisement des murets.

On taille donc la vis dans ce croisement, sans ajouter de matière et sans changer la hauteur de 4,60 mm. Le plot, c'est le croisement lui-même. Du bas vers le haut :

- la tige, de Ø tige + jeu des trous ;
- la fraisure à 90°, jusqu'au Ø tête + jeu des trous ;
- l'assise de la tête, au sommet de la fraisure. Elle est placée au plus haut nombre entier de couches sous le départ de la pente supérieure (2,85 mm) : 2,80 mm à 0,2 et 0,28 mm de couche, 2,76 mm à 0,12 mm ;
- l'alésage de Ø tête + jeu, qui monte jusqu'en haut pour laisser passer la tête.

Les vis sont posées comme chez extrabold, aux intersections intérieures seulement (voir la recherche, A.4).

## Ce que la géométrie ne permet pas

Une tête de vis ne peut pas descendre jusqu'à son assise sans traverser le haut du croisement. À z = 4,5 mm, les coins des quatre poches voisines sont à 2,16 mm de l'axe. Un alésage de plus de 4,3 mm de Ø entaille donc forcément les coins des pentes supérieures. Avec la tête de 6 mm et le jeu de 0,5 mm par défaut, l'entaille va de z = 3,41 mm jusqu'en haut. Elle atteint 1,1 mm de profondeur à z = 4,5 mm, où elle prend environ 63° de l'arc de coin de chaque poche, et 1,2 mm au sommet. Les côtés droits des pentes restent intacts, et le bac y reste assis. Extrabold fait la même entaille, avec un alésage de 6 mm à partir de z = 2,53 mm.

Les tests moteur prouvent ce qui est garanti :

- sous l'assise, toutes les poches sont intactes aux hauteurs de référence ;
- aux hauteurs de référence, aucune matière n'est retirée hors des disques de Ø tête + jeu autour des vis ;
- aucune matière n'est ajoutée.

## Considered Options

- **Plot sous la poche** : un disque plein dans les coins des poches, sous chaque vis. Rejeté : il soulève les bacs d'autant.
- **Profil rehaussé** : la hauteur du plot sous tout le profil, avec les murets prolongés jusqu'au fond, comme la base d'aimants d'extrabold. Rejeté : environ +30 % de matière par millimètre de rehausse, ce qui est un socle général de fait. La hauteur de 4,60 mm change aussi, et l'alésage entaille quand même les pentes du haut.
- **Cadre posé sur des plots**, flottant ailleurs. Rejeté : les bords ne sont pas portés, et le dessous est à imprimer en pont.

## Consequences

- Sans vis, le maillage est inchangé. Avec les vis, le volume baisse légèrement et le nombre de couches ne change pas.
- Au-delà de 7,6 mm de Ø tête + jeu, la fraisure débouche dans le bas des poches. Au-delà de 7,7 mm de Ø tête, la tête posée touche le coin des bacs. Les plages de la spec (tête ≤ 8, jeu ≤ 1) le permettent : c'est à valider à l'impression, avec le reste (#16). Quand la tête dépasse la tige de plus de deux fois la hauteur de l'assise (par exemple tige 2, tête 8), la fraisure débouche sous la baseplate : le trou du dessous est alors plus large que la tige.
- Les briques de cellule portent un quart de trou à chacun de leurs coins vissés, et la clé de brique inclut ces coins. La voie briques reste environ 4 fois plus rapide que la voie booléenne.
- Un lien partagé avec `sc=1` redonne cette géométrie. La changer plus tard (un vrai plot, par exemple) demandera une nouvelle version de lien, ou d'accepter que les anciens liens changent de pièce.
- Avec le profil ras (#12), la règle est la même : un bac assis y repose sur le fond du tiroir, donc rien ne peut être ajouté sous lui. L'assise de la tête est au plus haut nombre entier de couches sous le départ de sa pente supérieure (2,50 mm) : 2,40 mm à 0,2 et 0,12 mm de couche, 2,24 mm à 0,28 mm. L'alésage entaille de même les coins des pentes supérieures.

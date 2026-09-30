---
status: proposed
---

# Type de baseplate, et Tray : la poche relevée sur un fond, une couche de jeu sous le pied

La spec v1.1 (#20, ticket #25) ajoute un réglage **type de baseplate** : Normal (défaut), Tray, puis Skeleton (#26) et CLICKbase (#27). Le **Tray** est la grille posée sur un fond plein, pour qu'une petite pièce ne tombe pas à travers et que la baseplate se pose sur un bureau. La spec fixe un fond de 3 à 4 couches, pas les 2,8 mm d'extrabold, et ne reprend pas son décalage de 1 mm (probable bug, `docs/research/types-de-baseplate.md`).

Le ticket signale une incohérence. En profil hybride, un bac assis sur ses pentes descend **exactement** jusqu'au fond de la poche, à z = 0 (ADR 0002, `retenue-des-bacs-clickbase.md`). Le prototype le mesure : le pied touche les pentes à z = 0,000. Un fond posé là porterait le bac, qui ne serait plus assis sur ses pentes.

## Décision

- **Réglage** `baseplateType` (`packages/geometry/src/baseplate-type.ts`) : `normal` par défaut, le moins cher, ou `tray`. Clé de lien `ty`, écrite hors défaut (`ty=tray`). La table v1 du lien lit déjà `normal`, `tray`, `skeleton` et `clickbase`. Le moteur ramène au défaut un type qu'il ne construit pas encore : un lien `ty=skeleton` donne la Normal jusqu'à #26.
- **Architecture** : chaque type est une entrée de `BASEPLATE_TYPE_VARIANTS` (`BaseplateTypeVariant`). Aujourd'hui, une entrée donne :
  - le profil de poche des cellules à partir de celui des réglages (`profile`) ;
  - si le type prend des clips (`clips`), ce qui servira à Skeleton, qui n'en a pas.

  Un type ajoute son entrée, et ce qu'il change devient un champ de l'interface. L'interface liste `BASEPLATE_TYPES`.
- **Règle de l'assise du Tray** : le fond est **sous la poche**, et la poche monte de l'épaisseur du fond **plus une couche de jeu** :
  - fond de 0,6 mm (3 couches), arrondi à la couche supérieure ;
  - jeu de 0,2 mm (une couche), arrondi à la couche supérieure ;
  - soit 0,8 mm à 0,2. Le profil monte d'un nombre entier de couches et garde ses cotes : 5,40 mm de haut en hybride.

  Un bac assis reste sur ses pentes, sans jeu latéral, et son pied reste 0,20 mm au-dessus du fond : il ne pose pas sur les deux (hyperstatique). Sous le profil relevé, la paroi de la poche descend verticalement jusqu'au fond, au retrait du pied du profil (2,85 mm). En hybride, la marche de 0,35 mm devient une marche de 0,55 mm au-dessus du fond.
- **Profil ras** : même règle. Le bac descend 0,35 mm sous ses pentes, donc il pose sur le fond, 0,2 mm plus haut que sur un tiroir. Il y garde 0,15 mm de jeu, contre 0,25 mm pour la Normal ras.
- **Mise en œuvre** : le fond est une donnée du profil (`PocketProfile.floor`). L'outil de poche part du fond au lieu de passer sous la baseplate. Tout ce qui lit le profil suit : hauteur de la dalle, assise des têtes de vis, haut des fentes de clip, cellules tronquées. Aucune brique ni aucun booléen en plus (ADR 0004).
- **Où est le fond** : sous **toutes les poches**, c'est-à-dire la grille, les cellules entières de la marge et les cellules tronquées, qui sont des poches. Il n'y en a pas sous les trous d'un cadre à traverses ou des équerres, qui gardent leurs 2 mm posés sur le bureau : c'est le plus économe. Prolonger le fond sous la marge coûterait 9 à 10 cm³ de plus sur le tiroir par défaut, pour une zone qui ne reçoit pas de bac. Et sur un bureau, rien ne tombe « à travers » un trou de marge.
- **Aimants** : inchangés, sous les croisements des murets (ADR 0012), mêmes positions et même nombre que la Normal. Le croisement reste plein de 0 à 5,40 mm, et le logement de 2,20 mm reste ouvert dessous. La poche relevée s'en éloigne. Pas de trou dans le fond : sous une poche, un aimant demanderait un socle.
- **Vis** : l'assise de la tête suit la pente haute relevée, à 3,60 mm au lieu de 2,80 mm. La tige traverse le croisement sur toute la hauteur du fond.
- **Clips et découpe** : les coupes passent dans l'axe des murets, jamais dans le fond. La fente monte au pied de la pente haute relevée (3,60 mm) : le clip est plus haut et tient mieux. Le nombre de clips est le même : 15 sur le tiroir par défaut coupé en 4.
- **Kit de test** : toujours ouvert. Il essaie les profils de poche, pas le type.
- **Nom de fichier** : `-tray` après la taille (`baseplate-9x6-399x279mm-tray.3mf`), avant `-flush`.

## Mesures (prototypes/tray)

- **Assise** d'un pied standard, posé par bissection :

  | Variante | Porté par | Jeu latéral |
  |---|---|---|
  | Normal hybride sur le tiroir | pentes et tiroir | 0 |
  | Fond dans la poche, poche non relevée | fond seul, 0,6 mm au-dessus des pentes | 0,25 mm |
  | Poche relevée du fond seul | pentes et fond | 0 |
  | **Poche relevée du fond et d'une couche (retenue)** | **pentes seules, 0,20 mm au-dessus du fond** | **0** |

- **Matière** (finale, aimants compris) :
  - 2 × 2 : de 5,58 à 10,16 cm³ (× 1,82) ;
  - tiroir par défaut, cadre à traverses : de 78,42 à 140,41 cm³ (× 1,79). Le fond sous les 54 poches fait 42,7 cm³, et les murets relevés de 0,8 mm 19,3 cm³ ;
  - chez extrabold, le Tray fait × 5,1 ;
  - un test vérifie l'écart au mm³ près : aire de la grille × 0,8 − 54 × pied de poche × 0,2.
- **Assemblage** :
  - même volume par la voie briques et par la voie booléenne, sur les 3 marges, coupées ou non, chanfrein, vis, profil ras ;
  - aperçu du 1000 × 1000 coupé en 16 pièces : 82 ms en Tray, contre 87 ms en Normal (seuil de 100 ms).

## Considered Options

- **Fond dans la poche, sans la relever** (le Tray d'extrabold sans son décalage) : le bac pose sur le fond, avec 0,25 mm de jeu. On retrouve le défaut du profil ras, que le profil hybride a été choisi pour supprimer.
- **Poche relevée du seul fond** : même assise nominale que la Normal sur un tiroir, pentes et fond à la fois. Mais le dessus du fond est imprimé : une couche un peu haute soulève le bac de ses pentes. Le banc sans jeu (`banc-2x2-tray-sans-jeu.3mf`) est fourni pour comparer. Si l'impression montre qu'il tient aussi bien, on retirera le jeu : −0,2 mm de hauteur, −4,8 cm³ sur le tiroir par défaut.
- **Fond de 2,8 mm et poche relevée de 3,8 mm (extrabold)** : × 5,1 de matière, et la pente haute tronquée.
- **Fond aussi sous la marge** : 9 à 10 cm³ de plus, pour une zone sans bac.
- **Trous d'aimant dans le fond** (comme extrabold) : sous une poche, le trou demanderait un socle. Le croisement porte déjà l'aimant.
- **Pas d'aimant en Tray** : rien ne le justifie, le croisement est aussi plein qu'en Normal.

## Consequences

- Le Tray n'est jamais par défaut : il coûte environ × 1,8. L'interface montre le volume mesuré de chaque type, calculé en arrière-plan quand la famille « Type » est ouverte, comme les formes de marge (#23).
- **Tickets suivants** :
  - Skeleton (#26) : ajouter `skeleton` à `BaseplateType`, `BASEPLATE_TYPES` et `BASEPLATE_TYPE_VARIANTS`, avec `clips: false`, et sa géométrie (poteaux, bande basse). Il faudra sans doute un champ de variante lu par l'assemblage, et `GridFrame` devra porter le type. Skeleton + fond n'est pas prévu.
  - CLICKbase (#27) : même chose ; son profil (chanfrein bas supprimé) passe par `profile`.
  - L'empilé (#28) : un Tray retourné pose sur ses murets, pas sur son fond. Le pas de la pile suit la hauteur (5,40 mm).
- **À valider par l'impression** (recette #16) : l'assise d'un bac dans le Tray 2 × 2 (sans jeu, sans bascule, sans toucher le fond), la tenue du fond de 3 couches, et la comparaison avec la variante sans jeu.

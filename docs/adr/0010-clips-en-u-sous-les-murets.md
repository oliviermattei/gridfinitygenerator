---
status: proposed
---

# Clips en U insérés par-dessous dans le pied des murets

> **Placement remplacé par l'ADR 0018** (#30) : deux clips par jonction, un à chaque bout, collés au coin, et non plus un au milieu de chaque bord de cellule. L'agrafe, sa fente et ses jeux restent ceux-ci.

Une baseplate découpée pour le plateau (ADR 0009) sort en pièces posées bout à bout. Le tiroir les retient dans son plan, mais une coupe qui s'ouvre fait mal asseoir un bac posé à cheval. La spec v1.1 (#20) demande des **clips** : des agrafes en U, imprimées à part, insérées par-dessous dans le pied des murets, à cheval sur la coupe, invisibles de dessus et qui affleurent le dessous. Depuis #22, c'est un réglage de la baseplate (`clips`, clé `cl` du lien de partage), activé par défaut ; il ne sert que quand il y a découpe.

## Géométrie (`packages/geometry/src/clips.ts`, banc `prototypes/clips/`)

- **Où** : un clip au milieu de chaque bord de cellule le long de chaque coupe, sur le treillis des briques (la grille, et les cellules entières de la marge). Le tiroir par défaut sur un plateau de 256 mm prend **15 clips** : 6 sur la coupe en travers de X, 9 sur celle en travers de Y. Les croisements, où vont les vis et les aimants, restent libres ; une coupe n'en porte de toute façon aucun.
- **Fente**, de chaque côté de la coupe, sur 5 mm de long :
  - un canal sous la dent, sur ±1,35 mm, de z = 0 à 0,80 mm, arrondi à la couche supérieure ;
  - une fente de jambe, de 0,50 à 1,35 mm de la coupe, jusqu'au pied de la pente haute de la poche, arrondi à la couche inférieure : 2,80 mm en hybride et 2,40 mm en ras, à 0,2 mm ;
  - la dent de 0,50 mm que chaque pièce garde contre la coupe.
- **Peau** : 0,8 mm au moins côté poche, sur la partie verticale de la poche (2,15 − 1,35), plus en dessous. Rien n'est retiré au-dessus du haut de la fente : de dessus, la baseplate est intacte, et les pentes où le bac s'assoit aussi.
- **Clip** : la fente, moins 0,1 mm par face en travers (spec), 0,25 mm à chaque bout et 0,2 mm en hauteur. Des chanfreins d'entrée de 0,15 mm sont posés en haut des jambes. Le clip mesure 2,50 × 2,60 × 4,50 mm en hybride, avec des jambes de 0,65 mm et un pont de 0,60 mm. Il s'imprime couché sur le côté, le profil en U dans le plan du plateau.
- **Les jeux sont dans le clip**, pas dans la fente : changer de jeu, c'est réimprimer des clips, pas la baseplate.
- **Numéro gravé** : sur une pièce d'une seule cellule, le numéro est au milieu d'un bord sur une coupe (ADR 0009). Le clip glisse alors le long du bord, au-delà des chiffres et de 0,5 mm de matière (4,5 mm pour un chiffre). S'il ne tient plus dans le bord, moins un demi-muret de 2,85 mm à chaque bout, il n'y a pas de clip sur ce bord : c'est le cas d'un numéro à deux chiffres dans une cellule de 20 mm.

## Assemblage

- **Briques (ADR 0004)** : une brique se distingue aussi par ses côtés sur une coupe qui portent un clip, et par la position du clip le long du côté. Elle porte sa moitié de fente, ouverte sur sa face de coupe, que rien ne soude. L'outil d'une fente (un côté, un décalage) est calculé une fois pour toutes les briques.
- **Voie booléenne** : les fentes des deux côtés sont retirées de la baseplate entière, à cheval sur chaque coupe, avant la découpe en pièces. Les volumes des deux voies sont les mêmes, à moins de 0,1 mm³ près.
- **Matière** : 27,80 mm³ par clip en hybride (24,40 mm³ en ras). Le tiroir par défaut passe de 101,53 à 101,11 cm³. Un clip fait 18,2 mm³ de matière.

## Interface du moteur

- `layout.clips` (`ClipLayout | null`) : `slot` (`ClipSlot` : `halfWidth`, `tooth`, `length`, `bridge`, `top`) et `placements` (`ClipPlacement` : `cut`, `line`, `cell`, `offset`, `centre`). Il vaut null sans découpe, clips désactivés, ou quand aucun bord n'a de place.
- `stats.clips` : le nombre de clips à imprimer.
- `Baseplate.clip` : le maillage d'un clip, couché sur le côté, vérifié `NoError`.
- `printClips(baseplate, pieces)` : les N clips en une grille, à 10 mm à droite des pièces de `printPieces`.
- **Export** : l'objet « clip × N » dans le 3MF, et `…-clip-xN.stl` dans le zip des STL.

## Considered Options

- **Clip inséré par-dessus**, comme le `CLICK_clip` d'extrabold : une fente de ±1,5 mm, qui débouche dans la pente des poches au-dessus de z ≈ 3,5 mm, et un clip plus haut que la baseplate. Il est visible, et il peut gêner l'assise.
- **Tenon intégré aux croisements** (recommandation de `decoupe-et-clips.md` § 4.2, puzzle de GridFlock) : c'est le seul endroit où un connecteur intégré a de la matière. Mais le croisement d'une coupe est le point faible de la jonction en croix, et la spec a choisi le clip séparé.
- **Jeu dans la fente** plutôt que dans le clip : un autre jeu obligerait à réimprimer la baseplate.
- **Deux clips par bord** (John Hall en met 2 ou 3) : un seul, en attendant la recette.
- **Une fente plus haute**, jusqu'au plat du muret : elle déboucherait dans la pente haute de la poche, et se verrait.

## Consequences

- **À valider par l'impression** (recette #16, `prototypes/clips/files/`) : le jeu de 0,10 mm (kit de 4 jeux, de 0,05 à 0,20 mm), la dent de 0,5 mm, qui s'imprime en une ligne, la tenue d'un clip d'une seule longueur par bord, et l'affleurement dessous.
- **Défaut activé** (à valider) : les clips se règlent dans la famille « Clips », avec leur nombre dans les statistiques. Sans découpe, il n'y en a pas.
- **Lien de partage** : la clé `cl` entre dans la table v1, avec true par défaut, sans changer de version, car la v1 n'est pas encore publiée (comme #19).
- **Tickets suivants** :
  - le type Skeleton (#26) interdit les clips, car le milieu de ses murets est presque à plat : `clipsOf` renvoie null ;
  - le type CLICKbase (#27) veut un clip de 8 mm au plus, centré entre les lamelles, et décalé sur une cellule courte à lamelle unique. `ClipSlot.length` porte la longueur, et `placeAlong` reçoit des zones interdites (`KeepOut`) le long du bord, comme celles des numéros ;
  - l'empilement (#28) exporte les clips à part : ils ne s'empilent pas.
- **Coût** (médianes locales, aperçu) : le tiroir par défaut en 4 pièces prend 40 ms. Le tiroir de 1000 × 1000 mm en 16 pièces passe de 56 à 62 ms, et de 83 à 93 ms avec ses vis. Les seuils de #5 tiennent.

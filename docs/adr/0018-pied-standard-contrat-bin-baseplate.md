---
status: accepted
---

# Le pied standard exact, seul contrat entre un bin et une baseplate

On veut un écosystème homogène : nos bins doivent s'adapter parfaitement à nos baseplates, de tous les types (Normal, Tray, Skeleton, CLICKbase) et des deux profils de poche (hybride, ras). On pourrait ajuster le pied du bin à nos poches. On décide l'inverse : **le pied d'un bin est le pied Gridfinity standard exact** (0,8 / 1,8 / 2,15 mm, 41,5 mm de côté en haut pour une cellule de 42), sans variante ni réglage de profil. C'est la baseplate qui s'adapte au pied standard, comme elle le fait déjà (ADR 0002 : jeu horizontal de 0,25 mm, pentes qui portent ; ADR 0015 : l'ergot serre la bande verticale du pied, entre z = 1,2 et 2,0 mm).

## Décision

- Le profil du pied vit dans `packages/geometry`, à côté du profil de poche, pour que l'un et l'autre soient compatibles par construction et testés ensemble.
- La bande verticale du pied reste intacte : c'est elle que serre un CLICKbase.
- Un bin reprend la taille de cellule de la baseplate (42 mm par défaut) et les mêmes préférences locales (buse, couche, plateau, unités).
- Un bin n'a ni aimant ni vis sous ses pieds.
- Avant la v1, un banc d'essai (`prototypes/bin/`) imprime un bin et l'essaie dans le kit de test (hybride et ras) et dans un CLICKbase.

## Considered Options

- **Un pied « maison » ajusté à nos poches** (plus serré, ou calé sur la marche du profil hybride) : nos bins ne tiendraient plus sur une baseplate d'ailleurs, ni ceux d'ailleurs sur la nôtre. Contraire au principe « Gridfinity-compatible ». Écarté.
- **Un réglage de profil côté bin**, miroir du profil de poche : double le nombre de combinaisons à vérifier, pour aucun gain, puisque les deux profils reçoivent déjà le pied standard. Écarté.
- **Aimants ou vis sous le pied**, comme gridfinity-rebuilt (trous « Refined » par défaut) : huit aimants par cellule, alors que l'assise, ou les lamelles d'un CLICKbase, tiennent déjà le bin. Écarté.

## Consequences

- Le pied creux (fond intérieur juste au-dessus des pentes) reste possible : il ne touche pas au profil du pied, seulement à ce qu'il y a dessus. Il est mesuré au banc avant de devenir, ou non, le défaut.
- Tout changement du profil de poche doit être vérifié contre le pied standard, qui ne bouge pas.
- Banc #34 (`prototypes/bin/`) : le pied standard du moteur s'assoit sans jeu dans une Normal hybride ou Skeleton (pentes et fond du tiroir), avec 0,25 mm de jeu dans une Normal ras, sur ses pentes seules à 0,2 mm du fond d'un Tray, et il est serré par les ergots d'un CLICKbase. Le pied creux ne gagne que 9 à 15 % de filament au trancheur : le socle reste plein tant que l'impression ne l'a pas validé.

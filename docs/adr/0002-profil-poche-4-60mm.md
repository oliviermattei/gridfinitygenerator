# Profil de poche : muret de 0,35 mm en bas, plat de 0,4 mm en haut, hauteur 4,60 mm

La poche reprend le profil Gridfinity 0,7 / 1,8 / 2,15 mm et le jeu horizontal de 0,25 mm de la spec, pour que tout bac standard s'emboîte. On garde sous le profil le muret vertical de 0,35 mm de gridfinity-rebuilt : il fait porter le bac par les pentes à 45°, qui le centrent sans jeu, et non par le fond du tiroir. On rabote l'arête vive du haut sur 0,4 mm, comme extrabold. Hauteur totale : 4,65 + 0,35 − 0,4 = 4,60 mm, soit 23 couches exactes de 0,2 mm.

## Considered Options

- **Profil extrabold (4,25 mm, sans muret)** : rejeté. Mesuré sur un export, le bac y repose sur le fond du tiroir, ce qui laisse un jeu latéral d'environ 0,35 mm.
- **Profil rebuilt (5,00 mm, arête vive)** : rejeté. L'arête vive est fragile et s'imprime mal, et 5,00 mm n'apporte rien de plus.

## Consequences

Le profil hybride est le profil par défaut, mais le profil de poche est une donnée du moteur, pas une valeur codée en dur. On peut donc proposer d'autres profils en option (par exemple le profil ras d'extrabold, sans muret) pour comparer à l'impression, et plus tard d'autres systèmes de grille.

## Mise en œuvre du profil ras (#12)

- Le profil ras est la seconde donnée du moteur (`FLUSH_PROFILE`) : 45° 0,7 / vertical 1,8 / 45° jusqu'au plat de 0,4 mm, 4,25 mm de haut. Ses ouvertures de poche retrouvent celles de l'export extrabold (36,32 / 37,70 / 41,18 mm, recherche C.2). Il se choisit par le réglage `pocketProfile`, clé de lien `pr=flush` (déjà dans la table v1).
- Le kit de test met les deux profils dans une même baseplate 1 × 2 (hybride à l'avant, ras à l'arrière). Chaque cellule garde sa propre hauteur, sans raccord en pente : le muret commun a une marche verticale de 0,35 mm exactement sur la ligne entre les cellules. Un bac ne dépasse jamais sa cellule (dessus du pied 41,5 mm), donc il ne touche pas la marche, et la cellule la plus haute se reconnaît à l'œil après impression.
- Le kit passe par la voie booléenne (une grille 1 × N y passe déjà). Les briques de cellule n'acceptent qu'un seul profil par grille.
- Avec le profil ras, la marge garde sa règle (2,00 mm arrondis à la couche, sous le cadre de 4,25 mm) et les vis gardent la leur, avec une assise sous la pente supérieure du ras (ADR 0006).
- Le nom d'un fichier au profil ras finit par `-flush` (`baseplate-9x6-399x279mm-flush.3mf`), pour distinguer deux fichiers à comparer. Le kit se nomme `baseplate-test-kit-hybrid-flush-42x84mm.3mf` et ne sort qu'en 3MF.
- Le kit ne prend des réglages que ceux d'impression : son 3MF porte donc le lien de la page du générateur, sans réglages, et non un lien de partage. Aucune clé de lien ne le régénère : il suffit de recliquer sur son bouton. (Remplacé par #13, voir ci-dessous.)

## Taille de cellule et contour (#13)

- La taille de cellule (`cs`, 20 à 80 mm, 42 par défaut) ne change que l'emprise de la poche : le profil vertical reste celui du standard (mêmes hauteurs, mêmes retraits depuis le bord de la cellule, rayon `4 − retrait`). Seul le côté de l'ouverture suit la cellule (`cs − 2 × retrait`). Les vis restent aux intersections intérieures et les traverses de la marge sur les lignes de la grille, au nouveau pas.
- En mode tiroir, `nx = floor(W / cs)` reste plafonné à 24 cellules par axe, la limite du mode cellules pour laquelle les cibles de performance sont fixées : un tiroir de 1000 mm en cellules de 20 mm donne 24 × 24 cellules et 519 mm de marge. Sans plafond (49 × 49), la finale prenait 7,5 s pour 3,2 millions de triangles et un 3MF de 42 Mo.
- Le kit de test suit la taille de cellule, le rayon des coins et le chanfrein, pour essayer les poches et le contour de la baseplate à imprimer. Son 3MF porte donc le lien de partage des réglages : il rouvre le générateur sur ces réglages, et le bouton du kit redonne le même kit.
- Hors des défauts, un bac standard peut ne plus s'emboîter : une cellule qui n'est pas de 42 mm, un rayon de plus d'environ 5 mm qui ouvre la poche d'un coin sans marge, un chanfrein de plus d'environ 2,5 mm qui entame le muret de bord sans marge. L'interface l'annonce par un avertissement non bloquant dès qu'un réglage avancé diffère de son défaut.

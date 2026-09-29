# Prototype jetable : forme de la marge (ticket #3)

> Question posée : **quelle forme donner à la marge pour qu'elle retienne la baseplate dans le tiroir sans coûter plus de matière que la grille ?**
> Code jetable, gardé comme référence : il ne sera pas repris tel quel dans `packages/geometry`. Le moteur de la marge (#10) est parti de la variante provisoire de #3, le cadre à nervures. **Depuis #19, le moteur construit la variante 1, les cellules tronquées, à ras de la grille** (ADR 0008) : c'est elle qu'on imprime en priorité. Le verdict définitif viendra de la recette d'impression (#16).

## Relancer

```bash
cd prototypes/margin-variants
pnpm install --ignore-workspace   # hors du workspace pnpm, lockfile propre au prototype
pnpm generate                     # ~15 s : files/*.3mf, results.md, results.json
```

`pnpm generate` construit chaque baseplate, écrit le 3MF, le relit, reconstruit un `Manifold` à partir du maillage relu et s'arrête si le statut n'est pas `NoError`, si le volume relu s'écarte de plus de 0,5 mm³ ou si la bounding box n'est pas 109 × 109 × 4,60 mm. Les tableaux ci-dessous sont copiés de `results.md`, qui est régénéré à chaque lancement.

## Ce qui est construit

- `src/baseplate.mjs` : la grille et les quatre marges (pleine en référence, puis les trois variantes du ticket), par booléens manifold-3d 3.5.4 ; les mesures (volume, coupes par couche, contact avec les parois).
- `src/threemf.mjs` : écriture d'un 3MF (un seul objet nommé, `unit="millimeter"`) et relecture.
- `src/generate.mjs` : le banc d'essai, le tiroir de référence, l'export et les contrôles.

Géométrie commune :

- **Grille** : profil de poche hybride de l'ADR 0002 (0,35 / 45° 0,7 / 1,8 / 45° jusqu'au plat de 0,4, 4,60 mm), rayon `4 − retrait`, poches ouvertes en dessous, coins extérieurs de rayon 4, qualité finale de la spec (32 segments par quart de cercle).
- **Banc d'essai** : 2 × 2 cellules + 25 mm de marge à droite (+x) et à l'arrière (+y), soit 109 × 109 mm. Les deux autres côtés de la grille sont le bord de la baseplate.
- **Tiroir de référence** (mesuré, non exporté) : le tiroir par défaut de la spec, 400 × 280 mm moins le jeu de 1 mm, grille centrée : 9 × 6 cellules, marges de 10,5 mm à gauche et à droite, 13,5 mm à l'avant et à l'arrière.
- **Mur et nervure** : 1,2 mm de large, soit 3 largeurs de ligne de 0,4. Les éléments de marge sont des prismes (parois verticales, rien en porte-à-faux) et mordent de 0,2 mm dans le muret de bord de la grille pour s'y souder.
- **Hauteurs de marge** : 4,60 mm (à ras de la grille) et 2,00 mm (10 couches de 0,2), deux multiples de la hauteur de couche.

Les variantes :

0. **Marge pleine** (référence, non exportée) : toute la marge est remplie sur la hauteur choisie.
1. **Cellules tronquées vides** : la grille se prolonge dans la marge avec le même profil de poche, coupé par un mur extérieur qui suit le contour. Les cellules tronquées sont vides et sans fond.
2. **Équerres de coin seules** : à chaque coin de la baseplate, un L de mur extérieur dont les jambes dépassent de 10 mm les lignes de la grille, relié à la grille par les nervures des première et dernière lignes de grille. Au coin commun à deux marges, l'équerre forme une boîte fermée. Sur une bande de marge plus longue que 4 cellules (168 mm), on ajoute des équerres en T intermédiaires, réparties sur les lignes de grille : aucune sur le banc, deux sur les grands côtés et une sur les petits côtés du tiroir de référence. Le reste de la marge est vide.
3. **Cadre à nervures** : un mur extérieur sur tout le contour de la marge, relié à la grille par une nervure sur chaque ligne de grille, tous les 42 mm, dans l'alignement des murets. **Le mur côté grille est le muret de bord de la grille** : il existe déjà, plein et vertical sur toute la hauteur, donc on n'ajoute pas un second mur contre lui.

## Mesures

Tous les volumes sont mesurés sur le maillage (`Manifold.volume()`), et le volume de la marge est la différence avec la grille seule. Les exports relus sont fermés (`NoError`) et leur volume ne s'écarte pas de plus de 0,002 mm³ du volume calculé en mémoire.

### Banc d'essai (109 × 109 mm)

Grille seule (2 × 2, sans marge) : 5 703,3 mm³.

| Variante | Hauteur de marge | Volume total (mm³) | Volume de la marge (mm³) | Marge / marge pleine | Triangles | Fichier 3MF | Maillage relu |
|---|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 27 850,9 | 22 147,5 | 100,0 % | 5 864 | non exporté | NoError (en mémoire) |
| Marge pleine (référence) | 2,00 mm | 15 332,7 | 9 629,4 | 100,0 % | 5 856 | non exporté | NoError (en mémoire) |
| 1. Cellules tronquées vides | 4,60 mm | 10 344,9 | 4 641,5 | 21,0 % | 9 672 | `banc-1-cellules-tronquees-h4.6.3mf` (93 Ko) | NoError, genre 9 |
| 1. Cellules tronquées vides | 2,00 mm | 8 057,8 | 2 354,5 | 24,5 % | 8 586 | `banc-1-cellules-tronquees-h2.0.3mf` (81 Ko) | NoError, genre 9 |
| 2. Équerres de coin seules | 4,60 mm | 6 694,8 | 991,5 | 4,5 % | 6 330 | `banc-2-equerres-h4.6.3mf` (60 Ko) | NoError, genre 5 |
| 2. Équerres de coin seules | 2,00 mm | 6 134,4 | 431,1 | 4,5 % | 6 320 | `banc-2-equerres-h2.0.3mf` (60 Ko) | NoError, genre 5 |
| 3. Cadre à nervures | 4,60 mm | 7 664,1 | 1 960,8 | 8,9 % | 6 336 | `banc-3-cadre-nervures-h4.6.3mf` (60 Ko) | NoError, genre 9 |
| 3. Cadre à nervures | 2,00 mm | 6 555,8 | 852,5 | 8,9 % | 6 326 | `banc-3-cadre-nervures-h2.0.3mf` (60 Ko) | NoError, genre 9 |

### Maintien et impression (banc, couches de 0,2 mm)

- **Contact** : longueur du contour de la première couche posée à plat contre la paroi du tiroir, sur les deux côtés qui ont une marge. Chaque côté fait 101 mm au plus, hors arrondis de coin.
- **Contours et boucles** : somme, sur les 23 couches, de la longueur des contours et de leur nombre, mesurés par coupes du maillage. L'écart est pris par rapport à la grille seule.
- Ces deux chiffres servent d'indicateurs géométriques du temps d'impression (longueur de périmètres, nombre de déplacements). Ce ne sont pas des durées.

| Variante | Hauteur | Contact droite / arrière (mm) | Longueur de contours (m) | Écart / grille seule (m) | Boucles | Écart / grille seule |
|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 101,0 / 101,0 | 23,58 | +2,18 | 115 | +0 |
| Marge pleine (référence) | 2,00 mm | 101,0 / 101,0 | 22,35 | +0,95 | 115 | +0 |
| 1. Cellules tronquées vides | 4,60 mm | 101,0 / 101,0 | 36,39 | +14,99 | 230 | +115 |
| 1. Cellules tronquées vides | 2,00 mm | 101,0 / 101,0 | 27,81 | +6,41 | 165 | +50 |
| 2. Équerres de coin seules | 4,60 mm | 37,0 / 37,0 | 29,61 | +8,21 | 138 | +23 |
| 2. Équerres de coin seules | 2,00 mm | 37,0 / 37,0 | 24,97 | +3,57 | 125 | +10 |
| 3. Cadre à nervures | 4,60 mm | 101,0 / 101,0 | 37,46 | +16,06 | 230 | +115 |
| 3. Cadre à nervures | 2,00 mm | 101,0 / 101,0 | 28,38 | +6,98 | 165 | +50 |

### Tiroir par défaut de la spec (400 × 280 mm, 9 × 6 cellules, marges de 10,5 et 13,5 mm)

Grille seule (9 × 6) : 77,21 cm³. Le ticket citait environ 77 cm³ pour la marge pleine contre 68 cm³ pour la grille. Ces deux chiffres se retrouvent par le calcul, sans que leur source soit notée : 68 cm³ est le volume mesuré sur l'export extrabold de 2 × 2 au profil de 4,25 mm (recherche, section C.2 : 5 035 mm³, × 54 / 4 = 68,0 cm³) ; 77 cm³ est une marge pleine de 4,60 mm sans jeu au tiroir ni coins arrondis ((400 × 280 − 378 × 252) × 4,6 = 77,0 cm³). Avec le profil hybride de 4,60 mm et le jeu de 1 mm, la marge pleine pèse 73,84 cm³ : presque autant que la grille.

| Variante | Hauteur de marge | Volume de la marge (cm³) | Volume total (cm³) | Marge / marge pleine | Contact gauche / droite / avant / arrière (mm) | Longueur de contours, écart / grille seule (m) |
|---|---|---|---|---|---|---|
| Marge pleine (référence) | 4,60 mm | 73,84 | 151,04 | 100,0 % | 271 / 271 / 391 / 391 | +2,05 |
| Marge pleine (référence) | 2,00 mm | 32,10 | 109,31 | 100,0 % | 271 / 271 / 391 / 391 | +0,89 |
| 1. Cellules tronquées vides | 4,60 mm | 24,32 | 101,53 | 32,9 % | 271 / 271 / 391 / 391 | +69,21 |
| 1. Cellules tronquées vides | 2,00 mm | 12,20 | 89,40 | 38,0 % | 271 / 271 / 391 / 391 | +29,30 |
| 2. Équerres de coin seules | 4,60 mm | 2,43 | 79,63 | 3,3 % | 59 / 59 / 73 / 73 | +20,00 |
| 2. Équerres de coin seules | 2,00 mm | 1,05 | 78,26 | 3,3 % | 59 / 59 / 73 / 73 | +8,70 |
| 3. Cadre à nervures | 4,60 mm | 9,50 | 86,71 | 12,9 % | 271 / 271 / 391 / 391 | +77,31 |
| 3. Cadre à nervures | 2,00 mm | 4,13 | 81,34 | 12,9 % | 271 / 271 / 391 / 391 | +33,62 |

## Variante retenue depuis #19 : 1. Cellules tronquées, à ras

Le mainteneur a jugé le cadre à nervures peu esthétique. Il veut que la marge ressemble à un bout de la grille : les murets se prolongent dans la marge avec leur profil et leur hauteur complète, comme si la grille continuait jusqu'au bord du tiroir et y était coupée. C'est la variante 1 à 4,60 mm, `banc-1-cellules-tronquees-h4.6.3mf`. Le moteur retrouve ses volumes à 0,5 mm³ près : 10 344,9 mm³ pour le banc, 101,53 cm³ pour le tiroir par défaut.

Ce choix renverse l'ordre des critères ci-dessous sur le rendu, en connaissance de cause :

- **Maintien** : inchangé, les variantes 1 et 3 s'appuient toutes deux sur toute la longueur de chaque paroi.
- **Matière** : sur le tiroir par défaut, la marge passe de 4,13 cm³ (cadre à 2,00 mm) à 24,32 cm³, soit +20,19 cm³ sur la pièce (81,34 → 101,53 cm³, +25 %). Elle reste à 33 % de la marge pleine à ras (73,84 cm³).
- **Temps d'impression** : +69,2 m de contours au lieu de +33,6 m.

Le moteur ajoute au prototype la règle des cellules trop étroites (ADR 0008) : un trou de la marge n'est jamais plus étroit qu'un mur, à aucune hauteur. Une cellule tronquée étroite reçoit un fond plat, sur un nombre entier de couches ; plus étroite encore, elle est remplie.

## Variante provisoire de #3 (remplacée depuis #19) : 3. Cadre à nervures, hauteur 2,00 mm

On applique les critères du ticket dans l'ordre.

1. **La baseplate ne bouge pas quand on retire un bac** (jugé sur la géométrie).
   - Les trois variantes touchent les deux parois opposées de chaque axe. Aucune ne laisse donc la baseplate glisser ni tourner.
   - Les variantes 1 et 3 s'appuient sur toute la longueur de chaque paroi (391 et 271 mm sur le tiroir de référence). Elles forment un cadre fermé, en cellules closes, dont les nervures prolongent les murets et travaillent en compression, tous les 42 mm.
   - La variante 2 ne s'appuie que sur 19 à 22 % de chaque côté du tiroir (59 mm sur 271, 73 mm sur 391), aux coins. Chaque équerre tient à la grille par une seule nervure de 1,2 mm, et les jambes des L sont en porte-à-faux (10 mm au-delà de la nervure). Un tiroir en bois bombé, un fond pas d'équerre ou une jambe tordue suffisent à créer du jeu. Elle est la moins sûre sur ce critère.
   - Verdict : 1 ≈ 3 > 2. La variante 2 est écartée comme choix provisoire, mais elle reste à imprimer comme challenger. Ce qu'elle économiserait est faible à l'échelle de la baseplate : 3,1 cm³ sur 81,3 cm³ au total à 2,00 mm, soit moins de 4 %.
   - Sur la hauteur : les deux hauteurs donnent la même longueur d'appui et le même cadre fermé. La marge ne porte pas de bac, et les efforts pour la retenir sont dans le plan, donc en compression dans les nervures. Une nervure de 1,2 × 2,0 mm (3 lignes × 10 couches) sur 10 à 25 mm de long suffit, sur la géométrie. En revanche, les deux hauteurs ne sont pas équivalentes en raideur. Entre deux nervures (42 mm), le mur extérieur fléchit dans le plan avec une raideur proportionnelle à sa hauteur, donc 2,3 fois plus faible à 2,00 mm qu'à 4,60 mm. Le contact mesuré, lui, ne porte que sur la première couche et ne départage pas les hauteurs. On juge le critère rempli à 2,00 mm, parce que le mur est plaqué contre la paroi et que les nervures reprennent l'effort, mais ce n'est pas démontré. C'est pourquoi les deux hauteurs du cadre sont à imprimer en priorité égale.
2. **Matière** : entre 1 et 3, le cadre à nervures coûte 2,5 à 3 fois moins (tiroir de référence : 4,13 contre 12,20 cm³ à 2,00 mm, et 9,50 contre 24,32 cm³ à ras). À 2,00 mm, sa marge pèse 5,6 % de la marge pleine à ras (73,84 cm³) et 5,3 % de la grille. Passer de 4,60 à 2,00 mm divise sa matière par 2,3.
3. **Temps d'impression** : le cadre bas ajoute 33,6 m de contours sur le tiroir de référence, contre 77,3 m à ras et 29,3 à 69,2 m pour la variante 1. Au-dessus de 2,00 mm, la marge n'ajoute plus rien aux couches.
4. **Rendu** : c'est le seul critère que le choix pénalise. Une marge à ras prolonge le dessus de la grille, alors qu'une marge basse montre une marche de 2,6 mm le long du muret de bord. Il ne départage pas, puisque les critères précédents ont déjà tranché.

Pistes pour le moteur (#10), à confirmer dans ce ticket :

- La marge est un cadre : un mur extérieur de 3 largeurs de ligne qui suit le contour arrondi, plus une nervure sur chaque ligne de grille.
- Sa hauteur est un multiple de la couche, par défaut 10 couches (2,00 mm à 0,2). Il faudra fixer la règle pour une couche de 0,28, par exemple 7 couches, soit 1,96 mm.
- Le mur côté grille est le muret de bord existant.
- Une marge plus étroite que 2 largeurs de mur n'a pas de vide intérieur. Le moteur devra décider s'il la remplit, et la spec prévoit l'avertissement sous deux largeurs de ligne.

## Fichiers à imprimer pour la recette (#16)

Tous sont dans `files/`, en 3MF (un objet, mm), fermés (`NoError`). Ils font chacun moins de 100 Ko et sont commités ; `pnpm generate` les régénère à l'identique.

| Priorité | Fichier | Pourquoi | Volume total |
|---|---|---|---|
| 1 | `banc-1-cellules-tronquees-h4.6.3mf` | la marge du moteur depuis #19 : maintien, rendu de la grille prolongée | 10,34 cm³ |
| 2 | `banc-3-cadre-nervures-h2.0.3mf` | l'ancienne variante provisoire, 3,8 cm³ de moins : le rendu justifie-t-il la matière ? | 6,56 cm³ |
| 3 | `banc-2-equerres-h2.0.3mf` | challenger le plus économe : les équerres suffisent-elles à retenir la baseplate ? | 6,13 cm³ |
| optionnel | `banc-3-cadre-nervures-h4.6.3mf`, `banc-1-cellules-tronquees-h2.0.3mf`, `banc-2-equerres-h4.6.3mf` | complètent la matrice variante × hauteur | 7,66 / 8,06 / 6,69 cm³ |

Le générateur produit la variante 1 à l'identique : mode « nombre de cellules », 2 × 2, 25 mm de marge en largeur et en profondeur, alignement avant gauche (la marge va à droite et à l'arrière).

Pour le test de maintien, le banc n'a de marge qu'à droite et à l'arrière. Il faut donc le caler dans un coin de tiroir (côtés sans marge contre deux parois) ou dans un gabarit de 110 × 110 mm, puis poser et retirer un bac 1 × 1 dans chaque cellule, en regardant si le banc bouge et si les murs ou les jambes fléchissent.

## Limites et choix faits sans pouvoir demander

- La construction passe par des booléens globaux, pas par les briques de l'ADR 0004 : le prototype mesure des formes, pas des performances.
- Le mur côté grille de la variante 3 est le muret de bord de la grille, sans second mur.
- La largeur des murs et des nervures est de 1,2 mm (3 lignes). À 0,8 mm (2 lignes), la matière des variantes 2 et 3 baisserait d'environ un tiers, mais le mur serait plus souple. C'est à réévaluer après impression.
- La jambe des équerres fait 10 mm, et les équerres intermédiaires sont espacées d'au plus 4 cellules.
- La hauteur basse est de 2,00 mm. Une hauteur plus basse (1,20 mm, par exemple) n'a pas été générée : c'est à tenter si le banc à 2,00 mm tient bien.
- Pas de chanfrein du dessous ni de vis, et le jeu au tiroir est hors du banc (109 × 109 mm, cotes brutes).
- Le contact est mesuré sur la première couche seulement. Les longueurs de contours sont des indicateurs géométriques, pas des temps.

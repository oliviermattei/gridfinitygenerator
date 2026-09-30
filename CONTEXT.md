# Gridfinity Generator

Site web public, gratuit et open source d'outils Gridfinity. Premier outil : le générateur de baseplates imprimables en 3D, dimensionnées pour un tiroir donné.

## Language

### Géométrie

**Baseplate**:
L'objet final entier : une dalle portant une grille de poches, qui reçoit des bacs Gridfinity.
_Avoid_: plaque, plate, socle

**Cellule**:
Une case de la grille, 42 × 42 mm par défaut, qui accueille un bac d'une unité.
_Avoid_: case, unité, grid unit

**Grille**:
L'ensemble des cellules d'une baseplate, disposées en lignes et colonnes.
_Avoid_: grid, quadrillage

**Poche**:
Le creux profilé d'une cellule dans lequel se pose le pied d'un bac.
_Avoid_: cavité, empreinte, socket

**Muret**:
La cloison profilée qui sépare deux poches voisines ; son sommet est un plat, pas une arête vive.
_Avoid_: arête, nervure, lip

**Pied**:
La partie profilée sous un bac, qui s'emboîte dans une poche.
_Avoid_: base, socle, foot

**Profil de poche**:
La forme de la paroi d'une poche, du fond de la baseplate au plat du muret. Deux profils : **hybride** (par défaut, 4,60 mm, avec la marche verticale de 0,35 mm qui fait porter le bac par ses pentes, ADR 0002) et **ras** (4,25 mm, celui d'extrabold, sans cette marche : le bac repose sur le fond du tiroir).
_Avoid_: profil de base, socket profile, flush (sauf dans le code)

**Kit de test**:
Une baseplate 1 × 2 dont la cellule avant a le profil hybride et la cellule arrière le profil ras, à imprimer pour essayer ses bacs dans chacun avant une grande baseplate. Chaque cellule garde sa hauteur : le muret entre les deux descend d'une marche de 0,35 mm sur la ligne qui les sépare.
_Avoid_: échantillon, sample, test print

**Type de baseplate**:
Ce que la baseplate a sous sa grille, et la forme de ses murets, au choix (#25, ADR 0013) : **Normal** (par défaut, la grille ajourée, sans fond), **Tray** (la grille sur un fond plein, pour un bureau, une étagère ou de petites pièces) ou **Skeleton** (la grille ajourée, ses murets entaillés entre des poteaux : environ deux fois moins de matière, le bac guidé par ses 4 coins, les clips logés dans les poteaux ; #26, ADR 0014, ADR 0018) ou **CLICKbase** (la grille ajourée, des lamelles dans la paroi des poches qui serrent le pied des bacs, qui s'enclenchent et tiennent sans aimant ; d'après CLICKbase Refined, sous licence CC BY-NC-SA ; #27, ADR 0015).
_Avoid_: style, variante, plateau (réservé au plateau d'impression)

**Fond**:
La dalle pleine d'un Tray sous chaque poche (0,6 mm, arrondis à la couche), cellules tronquées comprises ; les trous d'une marge en cadre, ou d'une marge minimale, n'en ont pas. La poche monte de son épaisseur plus une couche de jeu, pour que le bac reste assis sur ses pentes, 0,2 mm au-dessus du fond (ADR 0013). À ne pas confondre avec le fond du tiroir, ni avec le fond plat d'une cellule tronquée étroite.
_Avoid_: plancher, socle, floor (sauf dans le code)

**Poteau**:
Dans un Skeleton, le croisement des murets et le départ de ses quatre murets, qui gardent tout le profil de poche : 5 mm le long de chaque muret en haut (l'arc de coin de la poche et 1 mm de côté), 45° plus large par millimètre vers le bas. Il porte l'aimant ou la vis, guide le bac par son coin (ADR 0014), et loge la fente d'un clip au bout d'une jonction, plus courte (4 mm) pour finir à 0,8 mm de l'entaille (ADR 0018).
_Avoid_: pilier, plot (réservé à la vis), post (sauf dans le code)

**Bande**:
Dans un Skeleton, ce qui reste d'un muret entre deux poteaux : son pied, de 0,35 mm arrondis à la couche (0,4 mm à 0,2). Le tour de la grille et le bord de cellule qui porte le numéro d'une pièce ne sont pas entaillés (ADR 0014).
_Avoid_: bande basse (sauf pour la décrire), semelle, band (sauf dans le code)

**Lamelle**:
Dans un CLICKbase, un morceau de 0,8 mm de la paroi verticale d'une poche, long de 12 mm au plus, libéré du muret par une saignée et tenu à ses deux bouts ; deux par côté de cellule (une seule, au milieu, sous 34 mm), aucune dans la marge. À côté de la fente d'un clip, elle commence 0,5 mm après elle, ou disparaît s'il en reste moins de 8 mm. Elle fléchit quand le bac entre, et le serre (ADR 0015, ADR 0018).
_Avoid_: lame, languette (réservé à la dent du clip), ressort, clip (réservé aux pièces)

**Saignée**:
La fente de 0,5 mm derrière une lamelle, du dessus de la base jusqu'à travers la pente haute de la poche, qui la sépare du muret (ADR 0015).
_Avoid_: fente (réservé au logement d'un clip), rainure, slit (sauf dans le code)

**Ergot**:
Le milieu d'une lamelle, cintré de 0,5 mm vers la poche : il serre de 0,25 mm la bande verticale du pied d'un bac standard, entre z = 1,2 et 2,0 mm, et se raccorde à la paroi à 45° au-dessus (ADR 0015).
_Avoid_: bossage, cran, bosse

**Toile**:
Sous une lamelle d'un CLICKbase, la paroi mince qui la porte à l'impression, sur une base d'une couche pleine : évidée côté poche, amincie jusqu'à une arête de 0,1 mm sous la lamelle, que le premier bac casse (ADR 0015).
_Avoid_: support, pont, web (sauf dans le code)

**Assise**:
Le contact du pied sur les pentes à 45° de la poche, qui porte et centre le bac ; un bac bien assis n'a aucun jeu latéral.
_Avoid_: appui, contact

**Marge**:
La zone de la baseplate située hors de la grille, qui comble l'écart entre la grille et le tiroir. Sa forme se choisit parmi trois : le **cadre à traverses** (par défaut, le plus économe), les **cellules** (la grille prolongée et fermée par un mur extérieur, ADR 0008) ou la **grille prolongée** (ouverte, sans mur extérieur). Chaque forme peut être réduite à ses appuis (**marge minimale**).
_Avoid_: padding, bordure, remplissage

**Surplus**:
La matière qu'ajoute une forme de marge à la baseplate, affichée sous chaque forme : le volume de la baseplate avec cette marge (marge minimale comprise, si elle est cochée) moins celui de la même baseplate sans marge, sa **grille seule** (mêmes type, vis, découpe et clips), tous deux mesurés sur les maillages finaux (#29, ADR 0017).
_Avoid_: coût de la marge, supplément, delta

**Marge minimale**:
Réglage de la marge, décoché par défaut, applicable à chaque forme : la marge n'est gardée que là où elle est nécessaire pour que la baseplate soit bien placée dans le tiroir, et assez solide pour y rester sans casser. Le reste de la marge est vide. Chaque côté qui a une marge garde deux **appuis**, sur la première et la dernière ligne de la grille de ce côté ; les cellules y gardent aussi la première et la dernière cellule tronquée, fermées. Les coins où deux marges se croisent sont vides.
_Avoid_: marge réduite, équerres, marge partielle

**Grille prolongée**:
La forme de marge ouverte : les murets de la grille continuent dans la marge, avec leur profil et leur hauteur, jusqu'au contour, où ils s'arrêtent net sur un **talon**. Il n'y a pas de mur extérieur : les cellules tronquées restent ouvertes côté tiroir.
_Avoid_: grille tronquée, cellules ouvertes

**Appui**:
Un élément de la marge qui relie une ligne de la grille au tiroir et y transmet la poussée : une traverse et son mur (cadre à traverses), ou un muret prolongé et son talon (grille prolongée, cellules).
_Avoid_: support, pied, équerre

**Talon**:
Le bloc plein, à pleine hauteur, qui termine un muret prolongé contre la paroi du tiroir, pour qu'il y appuie à plat plutôt que par l'arête étroite du haut de son profil.
_Avoid_: plot (réservé à la vis), butée, embout

**Cellule tronquée**:
Une cellule de la grille prolongée dans la marge et coupée au contour : une poche vide, au même profil et sans fond, fermée par le mur extérieur (forme « cellules ») ou ouverte côté tiroir (grille prolongée). Une cellule tronquée trop étroite pour laisser un trou d'au moins un mur de large reçoit un fond plat, sur un nombre entier de couches, ou est remplie (ADR 0008). Une cellule de la marge que le mur extérieur ne coupe pas est entière : c'est une poche comme celles de la grille, sans vis.
_Avoid_: demi-cellule, cellule partielle, fausse poche

**Mur extérieur**:
Le mur de la marge qui suit le contour de la baseplate et s'appuie sur les parois du tiroir (1,2 mm, arrondi au nombre de lignes, deux au moins) : sur tout le contour pour le cadre à traverses et les cellules ; en marge minimale, seulement aux appuis (le cadre) ou le long de la première et de la dernière cellule tronquée de chaque côté (les cellules). La grille prolongée n'en a pas.
_Avoid_: paroi, bordure, ceinture

**Cadre à traverses**:
La forme de marge par défaut : un mur extérieur de 2 mm de haut sur tout le contour, relié à la grille par une traverse sur chaque ligne de la grille (ADR 0006-marge, 0011).
_Avoid_: cadre à nervures (nom du prototype #3), frame

**Traverse**:
Une barre de 2 mm de haut qui prolonge une ligne de la grille, dans l'alignement d'un muret, du bord de la grille jusqu'au mur extérieur (cadre à traverses). Sur une coupe, elle est doublée : chaque pièce en garde une entière.
_Avoid_: nervure (réservé au rejet de « muret »), rib, entretoise

**Alignement**:
La position de la grille dans la baseplate, parmi 9 (arrière gauche … avant droite), quand il reste une marge ; la marge prend le reste. L'arrière est le fond du tiroir.
_Avoid_: position, ancrage

**Chanfrein du dessous**:
La pente à 45° qui retire l'arête du bas sur tout le pourtour de la baseplate, marge comprise (0 mm par défaut) ; elle compense le « pied d'éléphant » de la première couche. Le mur extérieur de la marge s'épaissit d'autant vers l'intérieur, pour garder sa largeur au pied.
_Avoid_: bevel, biseau

**Jeu au tiroir**:
Le jeu retiré à la largeur et à la profondeur du tiroir pour que la baseplate y entre sans forcer (1 mm par défaut).
_Avoid_: tolérance, clearance

**Vis**:
Une vis à tête fraisée qui fixe la baseplate au fond du tiroir, posée à une intersection intérieure de la grille (ni sur le bord de la grille, ni dans la marge, ni sur une coupe) ; on règle le Ø de sa tige et le Ø de sa tête.
_Avoid_: screw, boulon

**Plot**:
La matière qui porte la tête d'une vis. En v1, c'est le croisement des murets lui-même : la fraisure y est taillée sous les pentes des poches, sans matière ajoutée, car un bac assis descend jusqu'au fond de la baseplate (ADR 0006).
_Avoid_: bossage, socle, boss

**Jeu des trous**:
Le jeu ajouté au Ø de la tige et au Ø de la tête d'une vis pour qu'elle entre sans forcer (0,5 mm par défaut), et au Ø des logements d'aimants ; réglage avancé.
_Avoid_: tolérance, clearance

**Aimant**:
Un disque aimanté de 6 × 2 mm, glissé par-dessous dans un logement d'aimant, qui tient la baseplate au fond d'un tiroir en tôle (#24, ADR 0012).
_Avoid_: magnet (sauf dans le code)

**Logement d'aimant**:
Le trou borgne, ouvert en dessous, qui reçoit un aimant sous un croisement de murets tenu par la matière : Ø 6 mm plus le jeu des trous, 2,2 mm de profondeur arrondis à la couche. Toujours présent, sans réglage ; aucun là où il y a une vis, ni sur une coupe, ni au bord de la grille, sauf quand les murets de la marge l'entourent (cellules tronquées, grille prolongée) et gardent un mur entre le trou et le contour, et entre le trou et la marge laissée vide (ADR 0012, ADR 0017).
_Avoid_: trou d'aimant, alvéole, poche (réservé aux bacs)

**Bac**:
Le contenant Gridfinity posé sur la baseplate ; hors du périmètre généré, mais il fixe les contraintes de compatibilité.
_Avoid_: bin, boîte

**Shadowbox**:
Un insert à poser dans un bac, creusé à la forme exacte d'objets précis (outils, pièces) pour les ranger chacun à sa place.
_Avoid_: insert, découpe, cutout

**Séparateur**:
Une cloison amovible qui divise l'intérieur d'un bac en compartiments.
_Avoid_: divider, cloison

**Étiquette**:
Le repère imprimé ou collé sur un bac pour identifier son contenu.
_Avoid_: label, tag

### Site

**Générateur**:
Un outil du site qui produit un modèle imprimable à partir de réglages (générateur de baseplates, de bacs…).
_Avoid_: outil, configurateur, tool

### Impression

**Pièce**:
Un morceau de baseplate obtenu après découpe, imprimable séparément : un rectangle de cellules entières, avec la marge qui le borde sur le contour. Les pièces sont numérotées de 1, de l'arrière gauche à l'avant droit, le tiroir vu de dessus (ADR 0009).
_Avoid_: part, fragment, tuile

**Découpe**:
Le partage automatique d'une baseplate qui ne tient pas sur le plateau, dans aucun des deux sens, en pièces qui y tiennent : le moins de pièces, puis le moins de pièces d'une seule cellule, puis les pièces les plus égales (ADR 0009). Le plan de découpe dit quelles lignes sont coupées et où va chaque pièce.
_Avoid_: split, partition, tuilage

**Coupe**:
Une ligne de la grille, prolongée à travers la marge, où deux pièces se séparent : dans l'axe d'un muret, chaque pièce en garde la moitié. Une coupe est plane, à coins vifs, sans chanfrein ; aucun croisement coupé ne porte de vis.
_Avoid_: joint, jonction, split line

**Jonction**:
Le bord commun à deux pièces voisines, le long d'une coupe. Une jonction reçoit deux clips, un à chaque bout, ou un seul si elle ne fait qu'une ou deux cellules.
_Avoid_: joint, raccord, liaison

**Clip**:
Une agrafe en U imprimée à part, couchée sur le côté, qui relie deux pièces le long d'une coupe. Elle s'enfonce par-dessous dans le pied du muret, au bout d'une jonction, collée au coin, à cheval sur la coupe : son pont affleure le dessous, et ses jambes enserrent les dents des deux pièces. Rien ne se voit de dessus. Tous les types en prennent (ADR 0010, ADR 0018).
_Avoid_: agrafe (sauf pour décrire sa forme), connecteur, attache, clip de liaison

**Fente**:
Le logement d'un clip, creusé par-dessous dans le pied du muret, de part et d'autre d'une coupe : un canal sous la dent pour le pont, et une fente de jambe de chaque côté, sous la pente haute de la poche. Elle part du croisement au bout de la jonction : à 1,92 mm de l'axe d'un croisement de deux coupes (pour laisser la place à la fente de l'autre coupe), à 0,8 mm du bord de la grille (pour ne pas percer la marge).
_Avoid_: rainure, logement (réservé aux aimants), slot

**Dent**:
La lame de matière de 0,5 mm que chaque pièce garde contre la coupe, dans la fente, entre les jambes du clip.
_Avoid_: languette, tenon

**Numéro de pièce**:
Le numéro gravé sous une pièce, dans un demi-muret, en chiffres de 3 mm empilés et en miroir, pour qu'il se lise quand on retourne la pièce (0,4 mm de profondeur, arrondi à la couche). Une baseplate d'une seule pièce n'en a pas.
_Avoid_: étiquette (réservé aux bacs), label, repère

**Pile**:
Des pièces d'une baseplate découpée imprimées l'une sur l'autre en une seule impression, en mono-matière : la première à l'endroit, les autres retournées sur celle du dessous, une couche d'air entre deux (le **pas** de la pile : la hauteur d'une pièce plus une couche). Une pièce ne se pose que sur une pièce qui la porte ; sinon elle commence une autre pile (#28, ADR 0016).
_Avoid_: stack (sauf dans le code), empilement (sauf pour l'action), pile de plaques

**Oreille**:
Dans une pile, un disque d'une couche sur un coin de pièce, qui l'empêche de se décoller ; à couper au cutter (ADR 0016).
_Avoid_: mouse ear (sauf dans le code), languette, patin

**Pion**:
Dans une pile, la colonne de 0,8 mm qui monte du plateau à un coin que les pièces partagent, et que relient les oreilles de chacune (ADR 0016).
_Avoid_: pin (sauf dans le code), tige (réservé à la vis), pilier

**Plateau**:
Le plateau d'impression de l'imprimante, uniquement. Sa taille utile est une préférence locale : elle décide de la découpe, mais n'entre pas dans le lien de partage.
_Avoid_: build plate, lit, bed (et jamais pour désigner la baseplate)

**Filament**:
La matière d'impression, choisie dans le menu engrenage (PLA par défaut, PETG, ABS, ASA, TPU, ou « Autre » avec sa densité). C'est une préférence de ce navigateur, avec son prix facultatif en €/kg : elle n'entre pas dans le lien de partage, et ne sert qu'à la **masse** et au coût affichés (#31, ADR 0019).
_Avoid_: matériau (sauf en général), plastique, bobine

**Densité**:
La masse d'un cm³ de **filament** plein, en g/cm³, telle que la déclare la fiche technique du fabricant (1,24 pour le PLA), ou telle que l'utilisateur la saisit pour « Autre ».
_Avoid_: masse volumique (sauf pour la définir), poids spécifique

**Masse**:
Le poids de filament d'une baseplate, en grammes : le volume mesuré sur les maillages finaux, pièces et clips compris, multiplié par la **densité** du filament, la pièce étant comptée imprimée pleine. Elle est affichée arrondie au gramme, précédée de « ≈ », car le trancheur peut varier de quelques %. C'est la seule valeur affichée qui n'est pas mesurée ou exacte (ADR 0019).
_Avoid_: poids (sauf dans l'interface anglaise), grammage, estimation

**Trancheur**:
Le logiciel qui découpe le fichier 3MF ou STL en couches pour l'imprimante (PrusaSlicer, Bambu Studio, OrcaSlicer, Cura).
_Avoid_: slicer, slicer 3D

### Contexte d'usage

**Tiroir**:
Le contenant cible dont les dimensions intérieures déterminent la taille de la baseplate.
_Avoid_: drawer, conteneur, boîte

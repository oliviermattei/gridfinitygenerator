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

**Assise**:
Le contact du pied sur les pentes à 45° de la poche, qui porte et centre le bac ; un bac bien assis n'a aucun jeu latéral.
_Avoid_: appui, contact

**Marge**:
La zone de la baseplate située hors de la grille, qui comble l'écart entre la grille et le tiroir. Sa forme est une variante interchangeable du moteur ; la variante provisoire (#3) est un cadre : un mur extérieur relié à la grille par des traverses.
_Avoid_: padding, bordure, remplissage

**Mur extérieur**:
Le mur de la marge qui suit le contour de la baseplate et s'appuie sur les parois du tiroir.
_Avoid_: paroi, bordure, ceinture

**Traverse**:
Une barre de la marge qui prolonge une ligne de la grille, dans l'alignement d'un muret, du bord de la grille jusqu'au mur extérieur ; elle transmet à la grille la poussée des parois du tiroir.
_Avoid_: nervure (réservé au rejet de « muret »), rib, entretoise

**Alignement**:
La position de la grille dans la baseplate, parmi 9 (arrière gauche … avant droite), quand il reste une marge ; la marge prend le reste. L'arrière est le fond du tiroir.
_Avoid_: position, ancrage

**Jeu au tiroir**:
Le jeu retiré à la largeur et à la profondeur du tiroir pour que la baseplate y entre sans forcer (1 mm par défaut).
_Avoid_: tolérance, clearance

**Vis**:
Une vis à tête fraisée qui fixe la baseplate au fond du tiroir, posée à une intersection intérieure de la grille (ni sur le bord de la grille, ni dans la marge) ; on règle le Ø de sa tige et le Ø de sa tête.
_Avoid_: screw, boulon

**Plot**:
La matière qui porte la tête d'une vis. En v1, c'est le croisement des murets lui-même : la fraisure y est taillée sous les pentes des poches, sans matière ajoutée, car un bac assis descend jusqu'au fond de la baseplate (ADR 0006).
_Avoid_: bossage, socle, boss

**Jeu des trous**:
Le jeu ajouté au Ø de la tige et au Ø de la tête d'une vis pour qu'elle entre sans forcer (0,5 mm par défaut) ; réglage avancé.
_Avoid_: tolérance, clearance

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
Un morceau de baseplate obtenu après découpe, imprimable séparément.
_Avoid_: part, fragment, tuile

**Plateau**:
Le plateau d'impression de l'imprimante, uniquement.
_Avoid_: build plate, lit, bed (et jamais pour désigner la baseplate)

**Trancheur**:
Le logiciel qui découpe le fichier 3MF ou STL en couches pour l'imprimante (PrusaSlicer, Bambu Studio, OrcaSlicer, Cura).
_Avoid_: slicer, slicer 3D

### Contexte d'usage

**Tiroir**:
Le contenant cible dont les dimensions intérieures déterminent la taille de la baseplate.
_Avoid_: drawer, conteneur, boîte

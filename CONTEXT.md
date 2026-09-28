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

**Assise**:
Le contact du pied sur les pentes à 45° de la poche, qui porte et centre le bac ; un bac bien assis n'a aucun jeu latéral.
_Avoid_: appui, contact

**Marge**:
La zone de la baseplate située hors de la grille, qui comble l'écart entre la grille et le tiroir.
_Avoid_: padding, bordure, remplissage

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

### Contexte d'usage

**Tiroir**:
Le contenant cible dont les dimensions intérieures déterminent la taille de la baseplate.
_Avoid_: drawer, conteneur, boîte

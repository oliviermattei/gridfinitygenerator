# Plateaux Bambu Studio des prototypes

Chaque prototype qui a un dossier `files/` a aussi un projet Bambu Studio, `prototypes/<prototype>/<prototype>.3mf` : un plateau par fichier de `files/`, nommé comme lui, son contenu centré sur le plateau. On l'ouvre et on imprime plateau par plateau, sans rien réimporter.

Le projet embarque la config d'une **P1S 0.4**, en **0.20mm Standard @BBL X1C**, **Bambu PLA Basic** et **Textured PEI Plate** (`project_settings.config`). Bambu Studio le charge donc comme l'un de ses projets, plateaux compris. Sans config, il charge seulement la géométrie, ignore les plateaux et affiche « The 3mf is not from Bambu Lab, load geometry data only ».

## Régénérer

```bash
# après qu'un banc a réécrit ses files/ : tous les prototypes, ou ceux qu'on nomme
node prototypes/bambu-plates/plates.mjs
node prototypes/bambu-plates/plates.mjs stack bin

# la config, depuis les profils système du Bambu Studio installé (après une mise à jour de
# Bambu Studio, ou pour changer d'imprimante, de process, de filament : constantes en tête)
node prototypes/bambu-plates/settings.mjs
```

`plates.mjs` signale un contenu plus grand que le plateau ou qui empiète sur le coin exclu de la P1S (18 × 28 mm, devant à gauche).

## Vérifié

Les 14 projets, tranchés par la CLI de Bambu Studio 2.8.2 (`--slice 0`), donnent un G-code par plateau. La config régénérée par `settings.mjs` ne diffère de celle de l'interface (P1S choisie à la main) que par l'état de l'AMS.

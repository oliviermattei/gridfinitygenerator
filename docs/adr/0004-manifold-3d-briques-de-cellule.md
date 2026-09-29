---
status: accepted
---

# manifold-3d comme moteur, baseplate assemblée par briques de cellule

Le prototype `prototypes/geometry-perf` a comparé manifold-3d (WASM) et @jscad/modeling, le moteur d'extrabold, sur la même baseplate au profil hybride avec aimants. Avec JSCAD, une 20×20 avec aimants prend 9,5 s, aucune sortie n'est manifold et l'export 3MF d'une 10×10 avec aimants prend de 36 à 86 s. On choisit manifold-3d. On calcule une fois la brique d'une cellule (poche et trous compris) et les briques de coin, puis on les assemble au niveau du maillage (copie, suppression des faces internes, soudure des coutures), sans booléen global : 35 ms pour une 10×10 et 40 ms pour une 20×20 avec aimants, maillage fermé et vérifié. La voie booléenne groupée (`batch`, 1,45 s en 20×20) reste la solution de repli pour les cas que les briques ne couvrent pas.

## Consequences

- Les marges, les vis, la découpe en pièces et les grilles de moins de 2 cellules par axe demanderont des briques dédiées ou des booléens locaux.
- Il faut libérer la mémoire WASM à la main (`.delete()`) : on impose un pattern « arène » dans `packages/geometry`. Le tas WASM ne rétrécit jamais.
- Le paquet pèse environ 205 Ko gzip de WASM.
- Le sérialiseur 3MF est à écrire et à optimiser : celui du prototype met 1,8 s en 20×20.

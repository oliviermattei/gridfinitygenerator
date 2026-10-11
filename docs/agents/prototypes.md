# Prototypes

Registre des prototypes de `prototypes/` : une ligne par dossier, la question qu'il teste, ce qu'il alimente, son état. Le `README.md` du dossier fait foi pour le détail (relance, mesures, fichiers à imprimer) ; ce registre sert à trouver le bon banc et à savoir où il en est.

Le mainteneur imprime sur une Bambu Lab P1S, depuis Bambu Studio. Ce qu'il imprime est `prototypes/<prototype>/<prototype>.3mf` : un projet Bambu Studio, un plateau par fichier de `files/`, que `prototypes/bambu-plates/plates.mjs` reconstruit (voir son `README.md`).

## États

- **tranché** : le verdict est mesuré et repris dans l'ADR ou le moteur ; le banc reste comme référence.
- **à imprimer** : le verdict attend l'impression de ses fichiers (`files/`), en général pour la recette #16. Le moteur garde le choix provisoire écrit dans le README.
- **provisoire** : une réponse existe, mais sur des données de synthèse ; la mesure réelle reste à faire.
- **référence** : la question est close ou remplacée ; le banc n'est plus à jour.

## Registre

| Dossier | Ticket | Ce qu'il teste | Ce qu'il alimente | État |
|---|---|---|---|---|
| `geometry-perf/` | — | Quel moteur de géométrie pour le navigateur, manifold-3d ou JSCAD : aperçu < 100 ms, calcul complet < 1 s (10 × 10) et < 3 s (20 × 20), aimants compris. | ADR 0004 (manifold-3d, briques de cellule), moteur rapide #5 | tranché |
| `ui-directions/` | — | À quoi ressemble l'écran du générateur de baseplates v1 (direction « Studio »). | Interface #6 | référence (pas à jour avec la spec v1) |
| `margin-variants/` | #3 | Quelle forme de marge retient la baseplate dans le tiroir sans coûter plus que la grille : cellules tronquées, équerres, cadre à nervures. | ADR 0006, 0008, 0011 ; moteur de la marge #10, #19, #23 ; fichiers de la recette #16 | à imprimer (les équerres sont remplacées par `minimal-margin/`) |
| `split/` | #21 | Le plan de découpe donne-t-il le bon nombre de pièces ; où graver le numéro sans casser les briques ; les pièces par briques sont-elles fermées et identiques à la voie booléenne. | ADR 0009 ; fichiers de la recette #16 | tranché |
| `clips/` | #22 | Une agrafe en U sous les murets, à cheval sur une coupe, tient-elle sans se voir ni entamer les poches ; quelle peau côté poche ; quel jeu (kit de 4 jeux, 0,05 à 0,20 mm). | ADR 0010 | à imprimer (jeu de 0,10 mm en attendant le kit) |
| `magnets/` | #24 | Un trou d'aimant sous le croisement des murets entaille-t-il les poches ; quelle matière autour (cellules de 42 et 20 mm) ; la marge porte-t-elle le trou ; cohabite-t-il avec coupes, clips et numéros. | ADR 0012 | tranché |
| `tray/` | #25 | Où poser le fond du Tray pour que le bac reste assis sur ses pentes, sans jeu ni hyperstatisme ; ce qu'il coûte ; s'il gêne aimants, vis, clips, découpe. | ADR 0013 | tranché |
| `skeleton/` | #26 | Quelle forme d'entaille des murets (extrabold ou autre) et combien de matière contre la Normal ; le bac reste-t-il assis ; le poteau loge-t-il aimant et vis ; le numéro tient-il dans la bande. | ADR 0014 | tranché |
| `clickbase/` | #27 | Comment adapter les lamelles de CLICKbase Refined à nos deux profils ; quel serrage d'ergot (0,15 / 0,25 / 0,35 mm) ; que deviennent clips, aimants, numéros et marges. | ADR 0015 | tranché (serrage de 0,25 mm ; les trois serrages sont à imprimer) |
| `stack/` | #28 | Une pièce retournée est-elle portée par celle du dessous (contact en mm²) ; ce qui s'imprime en pont ou en l'air selon le type et la marge ; Stu142 contre alternance. | ADR 0016 ; sens de retournement #39 | tranché |
| `minimal-margin/` | #29 | La marge réduite à ses appuis tient-elle la baseplate sans casser, et quelle variante d'appui imprimer ; ce que coûte chaque forme, complète ou minimale. | ADR 0017 | à imprimer |
| `clips-corner/` | #30 | La fente déplacée au coin d'une jonction garde-t-elle 0,8 mm de peau dans les 4 types et les 2 profils ; d'où partent les deux fentes d'un croisement ; perce-t-elle la marge ; poteau Skeleton et lamelle CLICKbase. | ADR 0018 | tranché |
| `edge-slots/` | #37 | Une plaque sans marge sur un côté peut-elle porter une demi-fente de bord ; le chanfrein du dessous gêne-t-il le clip ; d'où part la fente au coin ; deux plaques identiques ont-elles leurs fentes en vis-à-vis. | ADR 0022 | tranché |
| `stack-1x1/` | — | L'impression empilée réelle : une pile de deux plaques d'une cellule dans chaque version (types, profils, plaques autonomes), construite comme l'export du site. | Recette #16, impression empilée #28 | à imprimer |
| `bin/` | #34 | Le pied standard du bin s'assoit-il dans chaque type de baseplate et chaque profil, avec quel jeu ; socle plein ou creux (matière et temps au trancheur) ; quel rayon de congé. | ADR 0021 ; générateur de bins #32 | tranché (socle creux à imprimer, #16) |
| `bin-label/` | #32 | Quel onglet d'étiquette tient un bin plein de vis soulevé par sa tablette sans être plein dessous ; la pelle peut-elle tourner dans ses coins ; le rebord réduit empile-t-il comme le normal. | Moteur du bin (`generateBin`), réécrit d'après le verdict | à imprimer (essai de charge de 2 kg, pelle, empilage) |
| `shadowbox-trace/` | #36 | D'une photo d'outils sur une feuille à un contour exact à ±0,5 mm, puis à une poche, entièrement dans le navigateur ; vision classique (défaut) contre SlimSAM (option). | Futur générateur de shadowbox ; `docs/research/shadowbox-contour-hors-ligne.md` | provisoire (photos de synthèse ; les vraies photos restent à mesurer) |

## Tenir le registre

Le registre suit les prototypes dans le même commit :

- **Nouveau prototype** : ajouter sa ligne, dans l'ordre des tickets, avec la question telle que le README la pose et l'état **à imprimer** ou **provisoire** tant qu'aucun verdict n'est tranché.
- **Fichiers de `files/` réécrits** par un banc : relancer `node prototypes/bambu-plates/plates.mjs <prototype>` pour que le projet Bambu Studio suive.
- **Verdict tranché** (ADR écrite, moteur aligné) : passer l'état à **tranché** et nommer l'ADR dans « Ce qu'il alimente ».
- **Résultat d'impression** : mettre à jour l'état et, si l'impression change le choix provisoire, le README du prototype et l'ADR concernée.
- **Question remplacée** par un autre banc : passer l'état à **référence** et nommer le banc qui la reprend.

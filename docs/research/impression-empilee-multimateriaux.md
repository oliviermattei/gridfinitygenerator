# Recherche : impression empilée de baseplates (« stacked printing »)

> Date : 2026-09-30. Question : peut-on proposer d'imprimer plusieurs **baseplates** (ou plusieurs **pièces** d'une baseplate découpée) les unes sur les autres, séparées par une couche d'interface d'un autre matériau pour qu'elles se détachent ? Comment, et avec quelles limites ?
> Contexte : notre baseplate est un cadre ajouré de 4,60 mm (profil hybride) ou 4,25 mm (profil ras), sans fond, exporté en 3MF (un seul `<object>`, un seul `<item>`, `packages/geometry/src/three-mf.ts`). La **découpe pour le plateau** est hors v1 (spec #1) ; elle est étudiée dans `docs/research/decoupe-et-clips.md`.
> Légende : **[V]** vérifié dans une source primaire (code source avec commit et ligne, page officielle, fichier, mesure sur notre maillage) · **[I]** inféré (raisonnement, calcul, lecture partielle), à confirmer par un prototype ou une impression.

## Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| O1 | `SoftFever/OrcaSlicer`, commit `f5679ad3433e7021b16f86d96394807d3e2a8cea` (2026-09-29) | `src/libslic3r/Format/bbs_3mf.cpp`, `Format/3mf.cpp`, `Model.cpp`, `PrintConfig.cpp`, `PrintObject.cpp`, `GCode.cpp` |
| B1 | `bambulab/BambuStudio`, commit `da8b44ee34dd349f2ae0df3f1cbae366df482354` (2026-09-28) | `src/libslic3r/Format/bbs_3mf.cpp`, `Model.cpp`, `PrintConfig.cpp` (même base de code qu'Orca pour le 3MF) |
| P1 | `prusa3d/PrusaSlicer`, tag `version_2.9.6` = commit `b028299c770b8380ee81c921a2867d522f288123` (publiée le 2026-06-25) | `src/libslic3r/Format/3mf.cpp`, `PrintConfig.cpp`, `PrintObject.cpp`, `GCode.cpp`, `Model.cpp`, `src/slic3r/GUI/Plater.cpp`. La branche `main` (commit `30ef591…`) est en pleine réorganisation (`src/slic3r-shared/…`) : j'ai cité la dernière version publiée. |
| C1 | `Ultimaker/Cura`, commit `72521b78f0851e309a067adad260969c5a2c8e0f` (2026-09-14), `plugins/3MFReader/ThreeMFReader.py` ; `Ultimaker/libSavitar`, commit `c513049b0866d6903826c9be46dd84deb12ffcba`, `src/SceneNode.cpp` | Lecture des réglages par objet d'un 3MF |
| S1 | Spécification 3MF Core, `3MFConsortium/spec_core`, commit `997b385e06f3181cf9aae0c578e0b45ccd48ccb2`, `3MF Core Specification.md` | Types d'objets, `basematerials`, `metadatagroup` |
| W1 | Wiki Bambu Lab « Printing guide for using PLA Basic and PETG HF/PETG Basic for support », `https://wiki.bambulab.com/en/filament-acc/filament/h2d-pla-and-petg-mutual-support` (lu dans Chrome le 2026-09-30 ; l'ancienne adresse `…/pla-basic-and-petg-hf` y renvoie) | Couple PLA / PETG, réglages officiels |
| G1 | Printables 725407 « Gridfinity Stack Printing Baseplate », Stu142, mis à jour le 2024-01-25 (description et commentaires lus dans Chrome) | Pile mono-matériau à lame d'air |
| G2 | Printables 796781 « Gridfinity Baseplate Stack 4-high for Bambu with AMS, PLA & PETG », Joe Malovich, mis à jour le 2024-04-05 | Pile bi-matériau, couche d'interface modélisée |
| G3 | MakerWorld 672886 « Gridfinity 5x5 Baseplate Stack 8-high », FFY00 (113 avis, lus en partie) | Pile bi-matériau, « entretoises » |
| G4 | MakerWorld 133657 « Gridfinity Baseplate PETG-Stacked », johan.f.ljungberg, publié le 2024-01-10 | Supports du trancheur en PETG entre des plaques à l'endroit |
| G5 | MakerWorld 811148 « 4x4 Gridfinity Superlight Baseplate Stack A1 Mini » | Pile de baseplates ajourées (Superlight de KYZ Design) |
| F1 | Forum Bambu « How to print identical flat files on top of each using PLA support » (t/16755, 2023-06 → 2024-10) ; « Print multi parts with 1 layer support in between » (t/119816, 2024-12 → 2025-10) | Méthode manuelle dans Bambu Studio |
| F2 | Forum Bambu « Ideas on boosting speed for multi-color printing with AMS » (t/10037), mesures de DzzD du 2023-04-16 | Durée d'un changement de filament AMS |
| F3 | Forum Prusa « PETG with PLA support interface layer - failures? » (XL) | Échec puis réussite d'une interface PLA sur PETG |
| F4 | GitHub `bambulab/BambuStudio#10514` « Vertical Stacking with Sacrificial Separation Layers », ouvert le 2026-05-02, sans réponse | Demande de fonction native |
| M1 | Mesures sur notre moteur (arbre de travail du 2026-09-30, **marge en cellules tronquées #19 en cours, non commitée**), script vitest jetable dans le scratchpad : `generateBaseplate(…, "final")` puis `Manifold.slice(z).area()` | Volumes et surfaces de contact |

Printables et MakerWorld refusent WebFetch (403) : leurs pages ont été lues dans Chrome.

---

## Résumé

1. **La technique existe et marche pour les baseplates Gridfinity** [V G1-G5] : plusieurs modèles publiés impriment 4, 8 ou 16 baseplates en une pile. Deux familles : **lame d'air d'une couche, mono-matériau** (Stu142, [V G1]) et **couche d'interface d'un autre matériau** qui n'adhère pas (PLA / PETG, support pour PLA, PVA) [V G2, G3, G5, W1].
2. **L'astuce géométrique est commune** [V G1] : la première plaque à l'endroit, **les suivantes retournées**. Ainsi une plaque pose toujours ses plats de muret (étroits) sur une surface au moins aussi large : aucun surplomb entre deux plaques. Imprimer toutes les plaques à l'endroit oblige à des supports sous les pieds des murets [I, § 3.2], c'est la voie de G4, dépendante du trancheur.
3. **Coût pour notre baseplate du tiroir par défaut** [V M1 mesures, I calcul] : l'interface d'une couche sur les plats pèse 1,36 cm³ par joint, soit 1,3 % d'une plaque de 101,5 cm³ ; la purge ajoute 0,8 à 1,6 cm³ par joint (deux changements de filament) ; les changements coûtent environ 2 min par joint sur un AMS. Le gain n'est **ni la matière ni vraiment le temps** : c'est **une seule impression sans surveillance** au lieu de N.
4. **Trancheurs** [V O1, B1, P1, C1] : aucun ne sait empiler seul (demande ouverte F4). Tous savent imprimer un **objet à plusieurs pièces** dont les pièces flottent, avec un filament par pièce. Mais la structure du 3MF diffère : **composants + `Metadata/model_settings.config`** pour Bambu Studio / OrcaSlicer, **un seul maillage découpé en plages de triangles + `Metadata/Slic3r_PE_model.config`** pour PrusaSlicer, composants + `metadatagroup` `cura:extruder_nr` pour Cura. **Un même 3MF ne peut pas servir tous les trancheurs à la fois** [I, § 2.3].
5. **Piège principal en bi-matériau** [V P1, O1 code ; I effet] : sans l'option `interface_shells`, une face de plaque au contact de l'interface n'est ni un dessus ni un dessous pour le trancheur : il y met du remplissage clairsemé au lieu d'une peau pleine (c'est la raison des « modificateurs » de G2). L'option existe partout, mais Bambu Studio la cache (`comDevelop`).
6. **Contraintes de notre géométrie** [I, § 3] : le retournement fait imprimer les **pentes à 45° des poches** (l'assise du profil hybride) en surplomb sur N − 1 plaques : c'est le risque fonctionnel n° 1. La marge actuelle de `main` (cadre à traverses de 2,00 mm) flotterait sous une plaque retournée ; la marge en cellules tronquées pleine hauteur (#19) règle ce point. Le kit de test 1 × 2 (murets à deux hauteurs) ne s'empile pas simplement.
7. **Recommandation** : **pas en v1**. Le proposer plus tard, avec la découpe (des pièces identiques ou en miroir s'empilent naturellement, § 3.10) ou une « quantité » de baseplates identiques, sous la forme d'une option d'export **« Pile de N »** : géométrie identique pour tous (plaque 1 à l'endroit, les autres retournées, écart d'une couche), la lame d'air mono-matériau par défaut (la plus économe), la couche d'interface bi-matériau en option (un volume séparé affecté au filament 2). D'abord **valider par impression** (§ 6) l'assise des plaques retournées et la séparation.

---

## 1. Principe et état de l'art

### 1.1 Trois façons d'empiler

| Famille | Principe | Matériel | Exemples |
|---|---|---|---|
| **A. Lame d'air mono-matériau** | Les plaques sont séparées par **une couche vide**. La première couche de la plaque du dessus se dépose presque sans pression sur celle du dessous et n'y colle que faiblement. | Toute imprimante | G1 : « a one-layer gap between pieces to help break them apart » [V G1] |
| **B. Interface modélisée d'un autre matériau** | La couche entre deux plaques est un **volume du modèle** (pièce séparée) affecté à un filament qui n'adhère pas au matériau des plaques. | Multi-matériaux (AMS, MMU, changeur d'outils, double buse) | G2, G3, G5, F1 [V] |
| **C. Supports du trancheur en autre matériau** | Plaques toutes à l'endroit, séparées d'une couche ; le trancheur génère des supports dont l'interface (ou le tout) est dans l'autre filament, avec une distance Z nulle. | Multi-matériaux | G4 : « Distance Z supérieure : 0.2 -> 0 », « Interface de support/radeau : Par défaut -> PETG » [V G4] |

### 1.2 Couples de matériaux

- **PLA et PETG n'adhèrent pas bien l'un à l'autre, et c'est ce qui en fait un bon couple de supports** : le wiki Bambu le dit en toutes lettres et fournit des préréglages pour les deux sens (PETG comme support du PLA, et inversement) [V W1].
- Recommandation officielle : n'utiliser l'autre matériau **que pour l'interface**, pas pour tout le support ; sinon le temps et la purge explosent (dans leur exemple, PETG + support PLA intégral : 5 h 3 min, et « PETG base + PLA interface » fait gagner 1 h 20 min et la moitié de la purge) [V W1].
- Réglages officiels pour le PETG en support du PLA : PETG HF à 265 °C, **vitesse volumétrique maximale 10 mm³/s**, plateau à 60 °C ; imprimante fermée : ouvrir la porte ou le capot [V W1]. Le guide ne couvre que les filaments Bambu PLA Basic, PETG HF et PETG Basic [V W1].
- Sur une imprimante double buse (H2D), un changement de buse prend « environ 5 secondes » plus la mise en pression sur la tour [V W1].
- **Même matériau des deux côtés = échec** : un avis de G3 imprimé en « PLA basique pour la grille et PLA mat pour les entretoises » rapporte que tout a fusionné ; l'auteur rappelle qu'il faut du PETG ou du support pour PLA [V G3, avis].
- Le couple n'est pas infaillible : sur une Prusa XL, une interface PLA ne collait pas au PETG ; l'utilisateur a réussi en déclarant le PLA « soluble » dans PrusaSlicer (ce qui débloque une interface au contact), en alignant le ventilateur et en baissant la vitesse volumétrique du PLA à 6 mm³/s [V F3, résumé du fil].
- Autres interfaces rapportées : « support pour PLA » (produit Bambu « Support for PLA/PETG ») [V G3], **PVA** (un avis de G5 : « J'ai utilisé du PVA pour les supports. L'impression a été parfaite ») [V G5, avis].

### 1.3 Exemples Gridfinity publiés

| Modèle | Méthode | Plaques | Réglages publiés | Retours |
|---|---|---|---|---|
| G1 Stu142 (Printables 725407, 5 229 téléchargements affichés) | A : lame d'air d'une couche, **1re plaque à l'endroit, les autres retournées** « to eliminate overhangs » | Fichiers 4 et 8 de haut (piles de 5 × 5 visibles dans les commentaires) | Conçu pour couches de 0,2 mm et buse de 0,4 ; pas de supports ; **repassage (ironing) sur tous les dessus** ; 3 périmètres ; PETG ou PLA [V G1] | Positifs : PETG séparé au couteau (« Took some effort to separate with PETG ») ; PLA+ qui « peel apart perfectly » ; conseil de désactiver « detect overhang walls », sinon la première couche ralentie de chaque plaque colle trop [V G1, commentaires] |
| G2 Joe Malovich (Printables 796781) | B : couche « support » modélisée en PETG, plaques en PLA+ | 4 | **Purge (flushing volumes) à 800 dans les deux sens**, débit de l'interface à 105 % ; des **couches modificatrices de part et d'autre de l'interface**, sinon « the slicer will treat the intermediate layer as just a modifier with infill the whole way through » [V G2] | — |
| G3 FFY00 (MakerWorld 672886, 113 avis) | B : « entretoises » dans un autre matériau, plaques alternées (l'auteur parle d'entretoises « entre les fonds » et « entre les dessus ») | 8 (versions 4 et 16) | PETG ou support pour PLA ; « le PETG a tendance à être plus facile à séparer que le matériau de support PLA » [V G3] | Mitigés : plusieurs séparations faciles (PLA + support PLA, « s'est détaché très facilement ») ; un utilisateur a dû tout séparer au couteau et a jeté la plaque du bas ; une plaque gauchie ; un avis dit que les couches au-dessus des vides ne sont pas pontées et que les plaques sont fragiles [V G3, avis lus] |
| G4 johan.f.ljungberg (MakerWorld 133657, CC0) | C : supports « ajustés » du trancheur, base et interface en PETG, distances Z 0, écart de 0,25 mm (une couche) entre des plaques toutes à l'endroit | Libre (table de Z jusqu'à 20) | Couches de 0,25 mm ; « Support affleurant aux objets : Faux » ; tour d'amorçage désactivée [V G4] | Aucun avis |
| G5 Superlight 4 × 4 (MakerWorld 811148) | B : interface PETG, baseplates **ajourées** comme la nôtre | 4 et 8 | Recommandé avec AMS ; note de l'auteur : une partie de l'interface fait deux couches et une autre une seule, « because I did the modeling by hand » [V G5] | Positifs (A1 mini) ; filandres de PETG ; coin de la plaque du bas qui se soulève si l'adhérence est faible [V G5] |

### 1.4 Autres pièces plates

- Dans Bambu Studio, la méthode manuelle est : sélectionner les objets, clic droit → **Assemble** (les objets ne sont plus liés au plateau), mêmes X et Y, puis régler Z ; pour la séparation, une pièce d'une couche (obtenue par une coupe) passe de « modificateur » à « pièce » et reçoit le PETG [V F1, t/16755]. Un utilisateur trouve le placement en Z « maddening » car la cote affichée est celle du milieu de la pièce [V F1].
- La même méthode sert pour les panneaux muraux (Multiboard, honeycomb wall) [V F1].
- Bambu Studio n'a **pas** de fonction native : la demande #10514 (« PETG part → PLA separator → PETG part… », nombre d'instances, matériau et épaisseur du séparateur) est ouverte depuis le 2026-05-02 sans réponse [V F4].

### 1.5 Ce que disent les retours

- La séparation dépend beaucoup du **couple exact de filaments** et des réglages (température, vitesse, refroidissement, ralentissement des surplombs) [V G1, G3, F3].
- Les échecs viennent de la **première plaque** (coin décollé, gauchissement) et d'**un même matériau** des deux côtés [V G3, G5].
- Les surfaces de contact larges (fond contre fond) se séparent moins bien que les plats étroits (« je comprends que l'entretoise entre les fonds de plaque puisse être un peu difficile », auteur de G3) [V G3].

---

## 2. Support des trancheurs

### 2.1 Ce que chaque trancheur sait faire

| | Bambu Studio | OrcaSlicer | PrusaSlicer 2.9.6 | Cura |
|---|---|---|---|---|
| Pièces flottantes dans un objet | Oui : un objet est posé sur le plateau, ses pièces gardent leurs positions relatives ; « Assemble » fusionne des objets en pièces [V F1] | Idem (même base de code) [I] | Oui : `ensure_on_bed` translate l'objet entier (ses instances), pas ses volumes [V P1 `Model.cpp` l. 921-943] | Oui : un objet à composants devient un groupe ; `drop_to_buildplate` se règle par nœud [V C1 `ThreeMFReader.py` l. 203-204] |
| Filament par pièce | Oui (`extruder` par pièce) [V B1] | Oui [V O1] | Oui (`extruder` par volume) [V P1 `PrintConfig.cpp` l. 1185] | Oui (`extruder_nr` par nœud) [V C1 l. 193-198] |
| Peau pleine au contact d'un autre matériau | `interface_shells`, mode **`comDevelop`** (caché) [V B1 `PrintConfig.cpp` l. 4149-4156] | `interface_shells`, mode avancé, catégorie Qualité [V O1 `PrintConfig.cpp` l. 4738-4745] | `interface_shells`, mode expert : « Force the generation of solid shells between adjacent materials/volumes » [V P1 `PrintConfig.cpp` l. 2064-2071] | Pas étudié |
| Filament de l'interface de support (famille C) | `support_interface_filament` [I, même option qu'Orca] | `support_interface_filament`, « Support/raft interface », mode simple [V O1 `PrintConfig.cpp` l. 7003-7011] | `support_material_interface_extruder` [V P1 l. 3414-3421] ; distance 0 = « soluble » [V P1 l. 3341-3355] | — |
| Empilage automatique | Non (F4 ouvert) [V] | Non trouvé [I] | Non trouvé [I] | Non trouvé [I] |

L'impression **séquentielle** (« complete individual objects ») ne sert à rien ici : elle termine chaque objet avant de passer au suivant, **à côté**, pas dessus [V P1 `complete_objects`, l. 970-976].

### 2.2 Le détecteur de « couches vides » et la lame d'air

PrusaSlicer et OrcaSlicer vérifient qu'une couche imprimée repose sur quelque chose. Une couche avec extrusions est signalée si elle est plus haute que la dernière couche imprimée **plus une hauteur de couche plus la distance Z de contact des supports** [V P1 `GCode.cpp` l. 365-397 ; O1 `GCode.cpp` l. 2225-2271]. Orca le présente comme critique (« The object has empty layers … and can't be printed ») [V O1 l. 2265].

Conséquence pour la lame d'air (famille A) [I, calcul sur ce code] : avec une couche vide, la couche suivante est à 2 h au-dessus de la dernière imprimée ; l'avertissement tombe si 2 h > h + d, c'est-à-dire si **h > d**. Avec la distance par défaut d = 0,2 mm (PrusaSlicer [V P1 l. 3355] et Orca `support_top_z_distance` [V O1 l. 6926-6943]), une couche de 0,12 à 0,2 mm passe, mais **0,24 ou 0,28 mm déclenchent l'alerte**. Un profil réglé en « soluble » (d = 0) l'alerte aussi.

### 2.3 Ce que le 3MF doit contenir pour arriver prêt

**Aucun mécanisme standard ne suffit** :

- La spec 3MF Core définit des types d'objet `support` et `solidsupport` [V S1 l. 543, 590-594], mais PrusaSlicer n'accepte que `model` et range `solidsupport`, `support`, `surface`, `other` parmi les types invalides (l'objet n'est pas créé) [V P1 `3mf.cpp` l. 210-222, 2015] ; Orca rejette `solidsupport`, `support` et `surface` [V O1 `bbs_3mf.cpp` l. 422-427].
- Les `basematerials` du Core ne sont affectés à aucun extrudeur par PrusaSlicer (aucune occurrence) [V P1]. Orca, lui, **affecte un extrudeur à chaque couleur distincte d'un `m:colorgroup`** (extension Materials) référencé par le `pid` d'un objet [V O1 `bbs_3mf.cpp` l. 2086-2098, 2199-2203] : c'est la seule voie standard, et elle n'est lue que par Orca / Bambu [I].

**Bambu Studio et OrcaSlicer** (fichier `Metadata/model_settings.config` [V O1 l. 173 ; B1 l. 172]) :

- Un fichier n'est traité comme « 3MF Prusa » que si sa métadonnée `Application` contient « PrusaSlicer » et s'il n'a pas de `3D/_rels/3dmodel.model.rels` [V O1 `3mf.cpp` l. 291-349 ; `Model.cpp` l. 468-479 ; B1 `Model.cpp` l. 487-497]. Sinon, l'importeur BBS lit `model_settings.config` **quel que soit le producteur** (les erreurs ne sont fatales que pour un fichier Bambu/Orca) [V O1 `bbs_3mf.cpp` l. 1995-2002].
- Les pièces sont construites **à partir des composants** de l'objet : une pièce = un objet maillage référencé par un `<component>` de l'objet assemblage ; la balise `<part id="…">` du fichier de config retrouve sa pièce par cet `id` [V O1 l. 5032-5090]. L'ancienne forme à plages de triangles (`<volume firstid lastid>`) est lue mais n'est plus utilisée pour construire les pièces [V O1 l. 4354-4380, 2176-2209]. `p:path` (extension Production) est facultatif : l'exporteur écrit un `<component objectid>` simple quand le chemin est vide [V O1 l. 7294-7297].
- Les métadonnées de l'objet deviennent sa config (`config.set_deserialize`) : on peut y mettre `extruder` et, a priori, `interface_shells` [V O1 l. 2163-2175 pour le mécanisme ; I pour `interface_shells`, option d'objet cachée chez Bambu].
- **Piège** : après import, un `extruder` plus grand que le nombre de filaments du projet est ramené à 1 [V O1 l. 2268-2294 ; B1 l. 2450-2471]. Si l'utilisateur ouvre le 3MF dans un projet à un seul filament, l'interface passe dans le filament des plaques et fusionne [I, à vérifier : quelle config est active pendant l'import].

Forme attendue (d'après l'exporteur Orca, [V O1 l. 8003-8060]) :

```xml
<!-- 3D/3dmodel.model : un maillage par pièce, puis l'objet assemblage -->
<object id="1" type="model"><mesh>…plaque 1…</mesh></object>
<object id="2" type="model"><mesh>…interface 1…</mesh></object>
<object id="3" type="model"><mesh>…plaque 2 (retournée)…</mesh></object>
<object id="4" type="model"><components>
  <component objectid="1"/><component objectid="2" transform="…"/><component objectid="3" transform="…"/>
</components></object>
<build><item objectid="4" transform="…"/></build>

<!-- Metadata/model_settings.config -->
<config>
  <object id="4">
    <metadata key="name" value="baseplate-9x6-pile-de-2"/>
    <metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part"><metadata key="name" value="Plaque 1"/></part>
    <part id="2" subtype="normal_part"><metadata key="name" value="Interface 1"/><metadata key="extruder" value="2"/></part>
    <part id="3" subtype="normal_part"><metadata key="name" value="Plaque 2"/></part>
  </object>
</config>
```

**PrusaSlicer** (fichier `Metadata/Slic3r_PE_model.config` [V P1 `3mf.cpp` l. 93]) :

- Un objet = **un seul maillage** ; ses volumes sont des **plages de triangles** `<volume firstid="…" lastid="…">` [V P1 l. 147-148, 3781-3783], chacun avec `<metadata type="volume" key="…" value="…"/>` : `name`, `volume_type` (`ModelPart`…), `matrix`, puis **toute autre clé est lue comme réglage du volume** (donc `extruder`) [V P1 l. 2689-2714]. Les réglages d'objet (`type="object"`) vont dans la config de l'objet (donc `interface_shells`) [V P1 l. 983].
- Le fichier est lu même quand le 3MF ne vient pas de PrusaSlicer [V P1 l. 851-857] (dans ce cas la transformation de l’instance est « cuite » dans le maillage, l. 2642-2649).
- Un 3MF à **composants** donne, lui, **plusieurs objets** (un par maillage) [V P1 l. 2036-2062, 2400-2440]. PrusaSlicer propose alors, pour une géométrie importée, « This file contains several objects positioned at multiple heights … loaded as a single object having multiple parts? » [V P1 `Plater.cpp` l. 1616-1630], ou, sur une imprimante multi-matériaux, de fusionner en un objet multi-pièces [V P1 l. 1725-1731]. Ça marche, mais avec une question posée à l'utilisateur [I].

**Cura** : un objet à composants devient un groupe ; chaque objet peut porter `<metadatagroup><metadata name="cura:extruder_nr">1</metadata></metadatagroup>` et `cura:drop_to_buildplate` [V C1 `ThreeMFReader.py` l. 170-209 ; libSavitar `SceneNode.cpp` l. 102-130, le préfixe `cura:` est retiré]. Le 3MF Core autorise `metadatagroup` sous `<object>` et `<item>` [V S1 l. 515, 554].

**Bilan** [I] : la structure à composants (Bambu, Orca, Cura) et la structure à maillage unique découpé (PrusaSlicer) s'excluent. Il faudrait soit deux exports (« pour Bambu Studio / OrcaSlicer » et « pour PrusaSlicer »), soit viser les composants et accepter la question de PrusaSlicer. Le second rapport de recherche pose déjà la question d'écrire `model_settings.config` (Q7 de `decoupe-et-clips.md`).

### 2.4 Ce qu'on ne peut pas porter dans le 3MF sans écraser le profil de l'utilisateur

La purge, la tour d'amorçage, les températures et le filament réel du slot 2 sont des réglages de **projet** (`Metadata/project_settings.config` chez Bambu/Orca, `Metadata/Slic3r_PE.config` chez Prusa). Les écrire imposerait notre imprimante et nos filaments à l'utilisateur [I]. On ne peut porter proprement que la géométrie, les noms, l'affectation « pièce → filament n » et quelques réglages d'objet (`interface_shells`).

---

## 3. Contraintes pour notre géométrie

### 3.1 Mesures sur notre maillage [V M1]

Mesures sur l'arbre de travail du 2026-09-30 (marge en cellules tronquées pleine hauteur de #19, **en cours et non commitée** ; sur `main`, la marge est encore le cadre à traverses de 2,00 mm, voir § 3.4). Surfaces = sections horizontales du maillage final.

| Baseplate | Volume | Plats du dessus (z = H − 0,001) | Dessous (z = 0,001) | Emprise |
|---|---|---|---|---|
| Tiroir par défaut 400 × 280 (399 × 279, 9 × 6, hybride) | 101 533 mm³ | 6 794 mm² (6,1 % de l'emprise) | 31 010 mm² (27,9 %) | 111 321 mm² |
| Idem, avec vis | 97 669 mm³ | 5 966 mm² | 30 626 mm² | — |
| Idem, profil ras (4,25 mm) | 90 679 mm³ | — | 30 542 mm² (z = 0,05) | — |
| 5 × 5 cellules sans marge, hybride | 35 681 mm³ | 1 933 mm² | 11 172 mm² | 44 100 mm² |

Le dessus d'une plaque, ce sont des **rubans de 0,8 mm** (0,4 mm au bord) ; le dessous, des **barres de 6,5 mm** (0,8 + 2 × 2,85 de retrait du profil) [V cotes de la spec ; I largeur calculée].

### 3.2 Orientation des plaques dans la pile [I, sur nos cotes]

| Disposition | Contacts | Surplombs | Verdict |
|---|---|---|---|
| Toutes à l'endroit | Barres de 6,5 mm de la plaque du dessus sur les plats de 0,8 mm de celle du dessous | **2,85 mm de porte-à-faux de chaque côté** de chaque muret, au-dessus des poches ouvertes : il faut des supports (famille C, G4) | À écarter pour un export : dépend des supports du trancheur, et chaque couche de support dans l'autre filament coûte deux changements |
| Alternées (endroit, envers, endroit…) | Joints alternés : plats contre plats (0,8 mm), puis **dessous contre dessous** (barres de 6,5 mm) | Aucun | Possible, mais les joints « dessous contre dessous » ont 4,6 fois plus de surface de contact (31 010 contre 6 794 mm²) : plus d'interface, séparation plus dure [V G3 avis] |
| **1re à l'endroit, les autres retournées** (G1) | Joint 1 : plats contre plats ; joints suivants : plats (0,8 mm) de la plaque retournée sur les barres (6,5 mm) de la plaque du dessous | Aucun entre plaques | **Retenue** : contact minimal partout, donc interface minimale et séparation la plus facile |

### 3.3 Surplombs dans une plaque retournée [I]

- Retournée, une plaque imprime ses murets **du plat étroit vers le pied large** : les deux flancs de chaque muret sont en surplomb. Le segment vertical de 1,8 mm ne pose pas de problème ; les segments à 45° (0,7 et 2,15 mm) sont à la limite habituelle d'un surplomb sans support.
- Or ces pentes à 45° sont **les surfaces d'assise** du profil hybride (ADR 0002 : le bac est porté par ses pentes, sans jeu). Imprimées en surplomb, elles sont plus rugueuses et peuvent s'affaisser légèrement : **l'assise des plaques 2 à N peut différer de celle de la plaque 1**. Stu142 affirme que ses baseplates retournées restent compatibles [V G1], mais son profil standard n'a pas notre exigence « sans jeu latéral ». C'est **le point à valider en premier** (§ 6).
- Le fraisage des vis (cône à 90°) devient un cône qui s'élargit vers le bas : surplomb à 45°, imprimable [I].
- Le **chanfrein du dessous** n'a de sens que pour la plaque 1 (seule au contact du plateau) ; sur une plaque retournée, il se retrouve en haut et ne sert à rien.

### 3.4 La marge [I, lecture de `margin.ts`]

- Sur `main` (commit 888ae21), la marge est un **cadre à traverses de 2,00 mm de haut** (`FRAME_HEIGHT_MM = 2`, `margin.ts`). Dans une plaque retournée, ce cadre se retrouve entre 2,6 et 4,6 mm au-dessus du joint, **en l'air** : le mur extérieur ne serait porté que par les traverses, tous les 42 mm. Il faudrait des supports ou une cale sacrificielle de 2,6 mm (plus 5,4 mm sous la plaque 2 face à face), ce qui annule l'économie de matière du cadre.
- La **marge en cellules tronquées pleine hauteur** (#19, en cours dans l'arbre de travail : `TRUNCATED_CELLS`, « same profile, same full height, same flat top ») donne un dessus fait uniquement de plats de muret et d'un mur extérieur : **tout est porté**, comme dans la grille. Seules les cellules tronquées très étroites reçoivent un fond plein partiel (« floor ») qui, retourné, reste posé sur le muret [I].
- Donc : **l'impression empilée suppose la marge de #19** (ou toute marge dont le dessus est au niveau des plats).

### 3.5 Hauteurs et couches [I, sauf mention]

- Le trancheur échantillonne chaque couche en son milieu. **Un volume d'exactement une hauteur de couche contient toujours exactement un point d'échantillonnage** (sauf alignement parfait sur une frontière) : une interface de `lh` d'épaisseur donne une couche, quel que soit le décalage de la grille des couches. En la faisant plus épaisse, on risque deux couches, comme le note l'auteur de G5 [V G5 pour le constat].
- Le générateur connaît `lh` (0,12 à 0,28 mm) mais pas la **hauteur de première couche** ; les profils Bambu à 0,12 mm gardent souvent une première couche de 0,2 mm [I]. Ça ne change rien à l'interface (une couche), mais la hauteur de chaque plaque « perd » jusqu'à une demi-couche. C'est déjà le cas aujourd'hui (le profil n'est pas arrondi à la couche, `stats.layers` le dit) [V `BaseplateStats`].
- Pas de pile : pas = `ceil(H / lh) · lh + lh`, soit 4,80 mm en hybride à 0,2 mm (23 + 1 couches) ; le profil ras (4,25 mm) fait 22 couches à 0,2 mm [V M1 `layers`], soit un pas de 4,60 mm.
- En lame d'air, garder `lh ≤ 0,2 mm` pour ne pas déclencher le détecteur de couches vides (§ 2.2). À 0,24 et 0,28 mm, prévenir ou refuser [I].
- Hauteur variable, couches adaptatives ou « Precise Z height » d'Orca (qui retouche les dernières couches d'un objet [V O1 `PrintConfig.cpp` l. 4115-4122]) peuvent déplacer ou supprimer la couche d'interface.

### 3.6 Peau au contact de l'interface (famille B) [V code ; I effet]

Sans `interface_shells`, le trancheur cherche les dessus et les dessous **en comparant avec toutes les régions de la couche voisine** (`upper_layer->lslices`), et non avec la région du même matériau [V P1 `PrintObject.cpp` l. 1076-1083 ; O1 l. 1723]. Le dessus d'une plaque recouvert par l'interface n'est donc pas un dessus : il reçoit du remplissage clairsemé. Pour notre géométrie :

- les plats de 0,8 mm sont faits de périmètres (deux lignes de 0,4 mm) : pas de remplissage, pas de problème ;
- mais les barres de 6,5 mm (le dessus d'une plaque retournée, qui porte l'interface suivante) ont un cœur de remplissage entre leurs périmètres : l'interface y serait posée sur du clairsemé.

D'où les « couches modificatrices » de G2 [V G2]. Avec `interface_shells = 1` sur l'objet, le trancheur compare région par région et crée les peaux [V code]. À vérifier : que Bambu Studio applique bien cette option cachée quand elle vient du 3MF.

### 3.7 Première couche et nombre de plaques [I]

- Seule la plaque 1 touche le plateau ; un coin qui se soulève compromet toute la pile [V G5 note, G3 avis].
- Il n'y a pas de limite géométrique sérieuse : 8 plaques font 38,4 mm de haut, très stables sur une emprise de 399 × 279 mm. La limite est le **risque** (un défaut à la plaque k ruine les suivantes) et la durée d'une impression d'une traite. Les exemples publiés vont de 4 à 16 [V G1-G3].
- Proposer de 2 à 8 plaques, par défaut aucune pile [I].

### 3.8 Coût d'une pile [V M1 pour les volumes ; V F2 et G2 pour les données d'entrée ; I pour le calcul]

Par joint (entre deux plaques), famille B, disposition retenue (plats sur barres) :

| | Tiroir par défaut (101,5 cm³ / plaque) | 5 × 5 sans marge (35,7 cm³ / plaque) |
|---|---|---|
| Interface d'une couche de 0,2 mm sur les plats | 6 794 × 0,2 = **1,36 cm³** | 1 933 × 0,2 = **0,39 cm³** |
| Purge : 2 changements × 400 mm³ (volume mesuré par F2) à 800 mm³ (G2) | 0,8 à 1,6 cm³ | 0,8 à 1,6 cm³ |
| Total matière par joint | 2,2 à 3,0 cm³, soit **2 à 3 %** d'une plaque | 1,2 à 2,0 cm³, soit **3 à 6 %** d'une plaque |
| Temps des 2 changements, AMS sur X1 (52 s à 107 mm³, 72 s à 400 mm³ [V F2]) | ≈ 2 à 2,5 min | idem |
| Temps des 2 changements, double buse H2D (≈ 5 s par changement + mise en pression [V W1]) | quelques dizaines de secondes | idem |

Il faut y ajouter la **tour d'amorçage**, non chiffrée ici (elle dépend du trancheur et de ses réglages).

Famille A (lame d'air) : **aucune matière ni aucun temps en plus**.

### 3.9 Gain réel [I]

- **Matière** : aucun gain ; la famille B coûte 2 à 6 % par plaque supplémentaire, la famille A rien.
- **Temps machine** : le temps d'impression des plaques est le même. On économise, par plaque supplémentaire, une séquence de démarrage (chauffe, nivellement, calibrations) et on paie deux changements de filament : sur un AMS, c'est à peu près neutre ; sur une double buse ou un changeur d'outils, c'est un petit gain.
- **Temps humain** : c'est le vrai gain. **Une impression de nuit au lieu de N retraits de plateau**. Il n'a de valeur que si l'utilisateur imprime **plusieurs baseplates identiques** (tiroirs identiques d'une servante) ou **plusieurs pièces** d'une baseplate découpée.
- Le principe « chiffres réels seulement » interdit d'afficher un gain en minutes ou en grammes (estimations). On peut afficher des valeurs exactes : nombre de plaques, **volume d'interface mesuré sur le maillage**, **nombre de changements de filament** (2 × (N − 1)), hauteur de la pile [I].

### 3.10 Pièces d'une baseplate découpée [I, en s'appuyant sur `decoupe-et-clips.md`]

- Des pièces **de même contour** s'empilent sans surplomb ; une pièce plus grande que celle du dessous a des cellules en l'air.
- Le retournement est un **miroir** : retourner une plaque autour de l'axe X échange l'avant et l'arrière. Avec une découpe symétrique (par exemple 3 + 3 rangées et 13,5 mm de marge devant et derrière pour le tiroir par défaut), la pièce arrière retournée a **exactement le contour** de la pièce avant : elles forment une paire parfaite. La règle de découpe « pièces les plus égales » de l'autre rapport favorise ces paires.
- Les **tenons** intégrés proposés par l'autre rapport dépassent d'environ 2 mm : sur une pièce retournée, un tenon qui dépasse du contour de la pièce du dessous est en l'air. Il faut empiler de façon que les tenons tombent au-dessus de matière, ou les exclure de la pile.
- Le **kit de test 1 × 2** (cellule hybride à 4,60 mm, cellule ras 0,35 mm plus bas) n'a pas un dessus plan : ses plats sont à deux hauteurs. À exclure de la pile.

---

## 4. Faisabilité

- **Techniquement faisable** avec notre moteur : une pile, c'est N copies du même maillage, retournées (rotation de 180° autour de X) sauf la première, décalées d'un pas, plus (famille B) N − 1 volumes d'interface. Le volume d'interface est l'extrusion de `lh` de la section du dessus de la plaque inférieure, **intersectée** avec la section du dessous de la plaque supérieure. Le moteur sait déjà calculer des sections (manifold `slice`) [I].
- **Fiabilité non démontrée pour notre profil** : elle dépend de l'assise des plaques retournées (§ 3.3) et du couple de filaments.
- **Export** : la famille A tient dans notre 3MF actuel (un objet, plusieurs coquilles, ou plusieurs composants) sans aucune métadonnée propre à un trancheur. La famille B exige des métadonnées non standard différentes selon le trancheur (§ 2.3), à suivre au fil de leurs versions.
- **Hors périmètre v1** : la spec exclut la découpe et le choix du matériau ; la pile n'a de sens qu'avec des plaques multiples.

---

## 5. Recommandations et questions ouvertes pour le mainteneur

### 5.1 Recommandations

1. **Ne pas l'ajouter en v1.** Le cas d'usage (plusieurs plaques identiques) n'existe pas encore dans le produit : une baseplate par tiroir, sans découpe.
2. **Le proposer avec la découpe** (ou avec une « quantité » de baseplates identiques), sous la forme d'une **option d'export « Pile de N »** (2 à 8), désactivée par défaut, avec :
   - la disposition de Stu142 : **plaque 1 à l'endroit, les autres retournées**, pas de `ceil(H / lh) · lh + lh` ;
   - par défaut la **lame d'air d'une couche, mono-matériau** : c'est la plus économe (aucune matière, aucune purge, aucune seconde bobine), elle marche sur toutes les imprimantes et dans tous les trancheurs, et le 3MF reste standard ;
   - en option « **Interface dans un 2e filament** » : les mêmes positions, avec un volume d'interface d'une couche dans chaque écart, **pièce séparée affectée au filament 2**, et `interface_shells = 1` sur l'objet ; conseil affiché : PETG pour des plaques en PLA (ou l'inverse), d'après le wiki Bambu [V W1].
3. **Statistiques exactes de la pile** : hauteur, nombre de plaques, volume d'interface mesuré, nombre de changements de filament. Pas de temps ni de grammes.
4. **Garde-fous** : pile refusée pour le kit de test ; en lame d'air, avertissement si `lh > 0,2 mm` (détecteur de couches vides) ; pile désactivée tant que la marge n'est pas pleine hauteur (#19).
5. **Mode d'emploi** court dans l'interface : repasser (ironing) les dessus, désactiver le ralentissement des surplombs (« detect overhang walls ») sur les premières couches de chaque plaque, séparer avec une lame fine en faisant le tour [V G1, commentaires].
6. **Écrire un ADR** avant d'écrire des métadonnées propres aux trancheurs (`model_settings.config`, `Slic3r_PE_model.config`) : c'est un engagement de maintenance, à décider une fois pour la pile et pour les plateaux multiples de la découpe (Q7 de `decoupe-et-clips.md`).

### 5.2 Questions ouvertes

- **Q1. Quand ?** Avec la découpe, avec une « quantité » de baseplates identiques, ou jamais (on se contente d'un paragraphe d'aide qui explique la manipulation dans le trancheur) ?
- **Q2. Défaut mono ou bi-matériau ?** La lame d'air est la plus économe mais sa séparation dépend du filament et des réglages ; l'interface bi-matériau est plus sûre à séparer mais exige un AMS, une MMU ou une double buse, et une seconde bobine.
- **Q3. Quels trancheurs viser pour la famille B ?** Bambu Studio et OrcaSlicer (composants + `model_settings.config`) seulement, ou aussi un export PrusaSlicer (maillage unique + `Slic3r_PE_model.config`) ? Un seul fichier ne peut pas servir les deux (§ 2.3).
- **Q4. Assise des plaques retournées** : si l'impression montre qu'une plaque retournée n'assoit pas un bac aussi bien (profil hybride), accepte-t-on une pile où N − 1 plaques sont « de second choix », ou abandonne-t-on la pile ?
- **Q5. Faut-il ajouter la hauteur de première couche** aux réglages d'impression (pour placer les écarts exactement sur la grille des couches), ou la supposer égale à `lh` ?
- **Q6. Glossaire** : ajouter « Pile » (plusieurs plaques imprimées l'une sur l'autre) et « Interface » (la couche sacrificielle entre deux plaques) à `CONTEXT.md` ? Attention, « plaque » est un terme à éviter pour « baseplate » : il faudrait dire « pile de baseplates » ou « pile de pièces ».

---

## 6. À prototyper et à imprimer

Prototype jetable sous `prototypes/stack-printing/` (aucune modification du moteur) :

1. **Générateur de piles** : à partir de `generateBaseplate`, écrire deux 3MF d'un **5 × 5 sans marge** (plateau 256 mm) et d'un **3 × 3 avec marge #19** :
   - pile de 3 en lame d'air d'une couche (un objet, trois coquilles) ;
   - pile de 3 avec interface, variante Bambu/Orca (composants + `model_settings.config`, `extruder` 2 sur les interfaces, `interface_shells` 1 sur l'objet) ;
   - la même pour PrusaSlicer (maillage unique + `Slic3r_PE_model.config`).
2. **Contrôles dans les trancheurs**, sans imprimer (Bambu Studio, OrcaSlicer, PrusaSlicer 2.9, Cura) : les pièces gardent-elles leurs Z ? Le filament 2 est-il affecté, y compris dans un projet ouvert avec un seul filament (bridage à 1, § 2.3) ? L'interface fait-elle exactement une couche à 0,12 / 0,2 / 0,28 mm, avec une première couche de 0,2 mm ? `interface_shells` venu du 3MF est-il appliqué dans Bambu Studio (aperçu : peau pleine sous l'interface) ? Le détecteur de couches vides se déclenche-t-il en lame d'air à 0,28 mm ?
3. **Impression 1 — assise** (le plus important) : un 2 × 2 hybride imprimé à l'endroit et le même retourné (dans une pile de 2). Comparer l'assise de bacs standard (jeu latéral, bac porté par les pentes) et l'état des pentes à 45°.
4. **Impression 2 — séparation** : piles de 3 en 5 × 5 : lame d'air en PLA, lame d'air en PETG, interface PETG sur PLA, interface « support pour PLA » sur PLA. Noter la facilité de séparation (à la main, à la lame), l'état des plats, le temps et la purge rapportés par le trancheur.
5. **Impression 3 — marge et vis** : une pile de 2 du 3 × 3 avec marge #19 et vis : mur extérieur, cellules tronquées étroites et fraisages imprimés retournés.
6. **Impression 4 — hauteur** (si 1 à 4 sont concluants) : pile de 8 du tiroir par défaut coupé en pièces (après la découpe), pour mesurer la dérive, le gauchissement de la plaque du bas et la séparation en haut de pile.
7. **Critères de décision** : assise des plaques retournées indiscernable de celle d'une plaque à l'endroit, séparation sans outil ou à la lame sans casse, aucune reprise manuelle dans le trancheur au-delà du choix des filaments.

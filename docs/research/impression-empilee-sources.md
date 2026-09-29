# Impression empilée (« stack printing ») de baseplates : état des lieux

Recherche du 2026-09-29. Légende : **[V]** vérifié dans la source citée (page lue, code source lu, ou commentaire utilisateur lu) ; **[I]** inféré (déduction, recoupement ou source secondaire non recoupée).

> **Lien avec les autres rapports** : `impression-empilee-multimateriaux.md` (session parallèle du même soir) est la référence pour le mécanisme des trancheurs (`interface_shells`, `lslices`, lecture de `<part>` dans Orca) : il est mieux sourcé sur ces points. Ce rapport-ci ajoute les sources communautaires (Stu142 725407 et sa parade oreilles + pions de 0,8 mm, gerolori, vit-ka et son jeu de 0,1 mm film/plaque, MultiBuild, 995911, HSW 405935, MakerWorld 819758 et 1335610) et les modes d'échec rapportés.

Contexte projet rappelé : nos baseplates font 4,60 mm (profil hybride) ou 4,25 mm (profil ras), les poches sont traversantes (le bac descend jusqu'au fond, CONTEXT.md), le 3MF est écrit par notre moteur (ADR 0005), sans métadonnées de slicer aujourd'hui.

---

## Résumé

1. **Trois familles de techniques** coexistent : (a) mono-matière avec un jeu d'air d'une couche (souvent + ironing), (b) bi-matière avec une **pièce d'interface modélisée** (film PETG entre plaques PLA, ou l'inverse), (c) bi-matière via la **génération de supports** du slicer avec « filament d'interface » = matière non adhérente et Z distance = 0.
2. **Pour les baseplates Gridfinity, le mono-matière marche déjà en pratique** : le modèle Printables « Gridfinity Stack Printing Baseplate » (Stu142) a 5 229 téléchargements, 440 likes, et des dizaines de retours positifs (PLA et PETG, piles de 4 à 8, Bambu, Prusa, Creality, Anycubic). Pas besoin d'AMS.
3. **Un 3MF peut encoder une pile**, mais seulement si toutes les plaques et interfaces sont des **parties d'un même objet** (sinon chaque objet est posé sur le plateau). Le core spec seul ne suffit pas à fixer la matière par partie de façon portable : il faut `Metadata/model_settings.config` (Bambu/Orca) et `Metadata/Slic3r_PE_model.config` (PrusaSlicer).
4. **Pièges connus** : parties qui se touchent fusionnées par le slicer (plus de couches pleines haut/bas), gap non aligné sur la hauteur de couche, soulèvement des coins des plaques 2-3, séparation difficile de la 1re paire, face supérieure/inférieure rugueuse, temps d'ironing, purge à chaque changement de filament.
5. **Part des utilisateurs multi-matière** : aucune donnée publique fiable trouvée. Seul proxy : Bambu Lab = 37 % des livraisons d'imprimantes entry-level au T4 2025 (CONTEXT), et la plupart de ses modèles se vendent aussi en « Combo » avec AMS, sans chiffre d'attach rate publié.

---

## 1. Comment fonctionne l'impression empilée de pièces plates

### 1.1 Mono-matière, jeu d'air d'une couche (« ironing stack »)

- **Principe [V]** : les pièces sont empilées avec un jeu égal à **une hauteur de couche (0,2 mm)** ; la couche du dessus est déposée sur une surface déjà refroidie (et idéalement ironée), l'adhérence est faible et les pièces se séparent à la main. MultiBuild (Multiboard) : « Ironing Stack Prints have a 0.2 mm gap between each print », ironing des faces supérieures, 3 périmètres, 0,2 mm, 15 % remplissage, sans supports. Inconvénient cité : une face est moins belle qu'en impression unitaire.
  Source : https://docs.multibuild.io/beginner-section/printing-guidelines
- **Gridfinity, Stu142 [V]** : « stacked and oriented so that you can print multiple at a time with no support… The first is right side up then the rest are upside down to eliminate overhangs… designed for 0.2 mm layers and 0.4 mm nozzles with a one-layer gap between pieces ». Réglages : pas de supports, ironing sur toutes les faces supérieures, 3 périmètres, brim si besoin. Écart assumé : fente de bac +0,1 mm. Publié 2024-01-25, 5 229 téléchargements, 23 makes, 440 likes.
  Source : https://www.printables.com/model/725407-gridfinity-stack-printing-baseplate (lu via l'API GraphQL de Printables)
- **Idée clé pour Gridfinity [V]** : les poches étant traversantes, une plaque posée à l'endroit sur une autre devrait ponter chaque ouverture de poche ; en **retournant une plaque sur deux** (ou toutes sauf la première), les pentes à 45° du profil deviennent auto-portantes. Stu142 retourne toutes les plaques sauf la première ; gerolori/gridfinity-baseplate-stack-generator (OpenSCAD) alterne à 180° « for proper interlocking », `plate_height = 4.25`, `layer_height = 0.20`, ironing, brim/mouse ears recommandés.
  Source : https://github.com/gerolori/gridfinity-baseplate-stack-generator/blob/main/README.md
- **Air gap et PrusaSlicer [V]** : PrusaSlicer refuse les « empty layers » ; astuce du forum : un cylindre de 0,5 mm traversant toute la pile, et des pièces espacées exactement d'une hauteur de couche.
  Source : https://forum.prusa3d.com/forum/prusaslicer/stacking-how-to-set-up-in-prusaslicer/

### 1.2 Bi-matière, interface modélisée (film PETG/PLA)

- **Principe [V]** : PLA et PETG adhèrent mal l'un à l'autre à froid ; on intercale une fine couche de l'autre matière. Hackaday (2024-07-27) sur la méthode de Jonathan (Multiboard) : couches PETG entre plaques PLA, PETG sur-extrudé pour « verrouiller » mécaniquement la pile, deux piliers imprimés à côté pour que le slicer ne saute pas de couches.
  Source : https://hackaday.com/2024/07/27/need-many-thin-parts-try-multi-material-stack-printing/
- **MultiBuild, variante multi-matière [V]** : séparer le fichier par objets, tuiles en PLA et entretoises en PETG (ou l'inverse), même température de plateau, **flow PETG entre 1,0 et 1,3 (l'auteur utilise 1,1)**. Avantages : dessous plus propre, séparation plus facile ; inconvénients : plus lent, bi-matière obligatoire, réglages à tester.
  Source : https://docs.multibuild.io/beginner-section/printing-guidelines
- **Gridfinity 4-high, Bambu + AMS [V]** (Printables 796781, 2024-04-05, 601 téléchargements, 52 likes ; republié sur MakerWorld 819758 : 791 téléchargements, **356 impressions**, 135 likes) : « Set flushing volumes to 800 both ways. Set flow for the interface material at 105 %. I used PETG and PLA Plus. Note the modifier layer on either side of the "support" layers, this is to force the creation of top and bottom layers of the base grid parts, otherwise the slicer will treat the intermediate layer as just a modifier with infill the whole way through. » Mise à jour MakerWorld du 12/11/24 : mouse ears, languettes de préhension, refroidissement réduit ou coupé contre le warping.
  Sources : https://www.printables.com/model/796781-gridfinity-baseplate-stack-4-high-for-bambu-with-a ; https://makerworld.com/en/models/819758-gridfinity-base-5x5x4high-stacked-the-original
- **gridfinity-base-stacker (vit-ka) [V]**, l'implémentation la plus aboutie trouvée, en Python, pour Bambu Studio :
  - pile de plaques « separated by gaps filled with a solid printed in a second, non-bonding filament, PETG against PLA, which is peeled off afterwards » ;
  - `--gap` 0,6 mm par défaut ; **`--interface-clearance` 0,1 mm** : le film est tenu à 0,1 mm des plaques car « it has to leave one layer with no model material on it, or the slicer treats film and plate as one body and they print welded » ;
  - film de 2 couches, chacune débordant de 0,2 mm sur la précédente (pente de 45°, auto-portant) ;
  - plaques alternées à 180° avec recalage sur la grille de 42 mm ; **piliers** générés sous les bordures d'une plaque étroite posée au-dessus des ouvertures de poches d'une plaque plus large ;
  - « the slicer generates **no support at all** » : tout porte-à-faux est porté par la géométrie générée ;
  - sortie : `NAME.stl`, `NAME-interface.stl`, `NAME.plates.json`, et un **`NAME.3mf` projet Bambu Studio** construit à partir d'un gabarit `stack-template.3mf` qui porte la disposition du plateau, la tour de purge, les affectations de filaments et les réglages par partie. Les réglages par partie vivent dans `Metadata/model_settings.config`.
  Sources : https://github.com/vit-ka/gridfinity-base-stacker ; https://raw.githubusercontent.com/vit-ka/gridfinity-base-stacker/main/README.md

### 1.3 Bi-matière via les supports du slicer (« interface layers trick »)

- **Principe [V]** : on laisse un vide entre les pièces, on active les supports, et on choisit pour « Support/raft interface » (voire aussi « base ») un filament non adhérent, avec **Top/Bottom Z distance = 0** et **interface spacing = 0**. Le slicer remplit le vide par une couche d'interface.
- **Réglages publiés, Gridfinity PETG-Stacked (OrcaSlicer, X1C) [V]** (MakerWorld 133657) : hauteur de couche 0,25 mm (1re couche 0,25), 3 parois, 2 couches pleines haut/bas, supports activés en style Snug, support base et interface = PETG, Top Z distance 0,2 → 0, Bottom Z distance 0,2 → 0, interface Rectilinear, top/bottom interface spacing 0,5 → 0, distance XY support/objet 0,35 → 0,5, tour de purge désactivée, vitesse de support 100 ; filament PETG « support » ralenti (débit volumique max 13 → 8). Pièces ajoutées comme **parties** d'un même objet, espacées de 0,25 mm : z = (h + l) × n (h = 5 mm, l = 0,25 mm).
  Source : https://makerworld.com/en/models/133657-gridfinity-baseplate-petg-stacked (lu via l'API MakerWorld)
- **Recette Bambu Studio 2.3 + H2D [V]** (commentaire du 2025-10-23 sur Printables 995911) : Enable Support, type normal (auto), style Snug, « Support/raft interface » = PETG, **Initial layer expansion 0 mm**, **Bottom Z distance 0 mm** (« otherwise it's just a hint of support around the edges and the next layer is unsupported »).
  Source : https://www.printables.com/model/995911-gridfinity-grids-stacked-for-printing
- **Réglages recommandés par Bambu pour « Support for PLA » en interface [V]** (cités par KG7BHP) : Z distance 0, interface spacing 0, motif « interlaced rectilinear », pas de hauteur de couche de support indépendante. Surface de contact restant un peu rugueuse.
  Source : https://www.kg7bhp.org/2024/12/printing-with-supports-for-pla-filament.html
- **Profil MakerWorld 1335610 [V]** (« Easy separate support interface », 2025-04-19) : objets empilés **à 2 couches d'écart** (0,4 mm à 0,2 mm/couche), objets fusionnés (« merge ») pour qu'ils ne soient plus forcés au plateau, flush 700 (200 a aussi marché), profil pour pièces PETG avec interface PLA ; piles de 3 et 6 tuiles Multiboard.
  Source : https://makerworld.com/en/models/1335610-print-settings-easy-separate-support-interface
- **PrusaSlicer [V]** : l'équivalent est « Top contact Z distance = 0 (soluble) », plus un extrudeur dédié pour « Support material/raft interface ». Le mode « soluble » (Z = 0) est requis pour synchroniser les couches de support avec l'objet, et désactive le pont sur la 1re couche de l'objet.
  Source : https://help.prusa3d.com/article/support-material_1698

### 1.4 Support dans les slicers : ce qui est natif et ce qui ne l'est pas

- **Aucun des trois slicers n'a de fonction « empiler » native [V pour Orca, I pour les autres]** : la discussion OrcaSlicer #4433 constate l'absence d'empilement automatique (repositionnement manuel en Z). Les tutoriels Bambu et Prusa passent tous par un positionnement manuel.
  Source : https://github.com/OrcaSlicer/OrcaSlicer/discussions/4433
- **Les objets sont toujours posés sur le plateau ; les parties d'un objet peuvent flotter [V]** :
  - Bambu Studio : « select several objects and then right-click → Assemble. Afterwards the individual objects are not bound to the bed anymore » (forum Bambu, thread 16755).
  - PrusaSlicer : « The rule in PrusaSlicer is that ALL objects must touch the bed… parts can be moved around and can be floated » (forum Prusa).
  Sources : https://forum.bambulab.com/t/how-to-print-identical-flat-files-on-top-of-each-using-pla-support/16755 ; https://forum.prusa3d.com/forum/prusaslicer/multipart-objects-in-3mf/
- **Piège majeur : des parties du même objet qui se touchent sont fusionnées [V]** : « parts of the same object that touch get merged together by the slicer so they won't have walls separating them » (forum Bambu, thread 97019). Conséquence observée : le film d'interface n'est plus qu'un changement de filament dans un remplissage continu, les plaques perdent leurs couches pleines haut/bas. Parades publiées : modificateurs de couche de part et d'autre de l'interface (796781), ou jeu de 0,1 mm entre film et plaque (vit-ka). Un utilisateur du 796781 (2024-09-23) : « Didn't love the fact that some of the plates don't have the bottom layer ».
  Sources : https://forum.bambulab.com/t/please-let-objects-float-above-the-build-plate/97019 ; https://forum.bambulab.com/t/print-multi-parts-with-1-layer-support-in-between/119816
- **Le gap doit être aligné sur la grille de couches [V]** : sur 995911 (gap de 0,2 mm figé dans le modèle), « if you wanted to use a .6mm nozzle and a .24mm or .3mm layer height… the slicer won't create the support layers above the first layer. If you reduce the layer height below .24 (.21, .22, .23 all worked) then it will render the support layer » (2026-04-10). Stu142 : « Very important to set the layer height the same as the 0.2mm gap » (2024-04-29).

---

## 2. Un 3MF peut-il encoder la pile et les matières ?

### 2.1 Position en Z à l'ouverture

- **Objets séparés → posés sur le plateau [V]**. Dans le code d'OrcaSlicer, chaque objet chargé passe par `model_object->ensure_on_bed(is_project_file)` (Plater.cpp). Même comportement dans PrusaSlicer (forum ci-dessus) et Bambu Studio (« it centers the X-Y and the lowest Z on the build plate », forum Bambu, thread 260189).
  Sources : https://github.com/SoftFever/OrcaSlicer/blob/main/src/slic3r/GUI/Plater.cpp ; https://forum.bambulab.com/t/import-3mf-as-part-not-object/260189
- **Exception : la boîte de dialogue « Multi-part object detected » [V]**. Bambu Studio, OrcaSlicer et PrusaSlicer 2.9 affichent, pour un fichier **qui n'est pas un projet** et dont les objets n'ont pas tous le même Z mini : « This file contains several objects positioned at multiple heights. Instead of considering them as multiple objects, should the file be loaded as a single object having multiple parts? ». Si l'utilisateur répond « Oui », tout devient **un objet à plusieurs parties qui gardent leurs positions relatives** (`Model::looks_like_multipart_object` / `convert_multipart_object`). Condition de détection : plus d'un objet, **chaque objet n'a qu'un seul volume**, et les Z mini diffèrent.
  Sources : https://github.com/bambulab/BambuStudio/blob/master/src/slic3r/GUI/Plater.cpp (l. ~9437) ; https://github.com/SoftFever/OrcaSlicer/blob/main/src/libslic3r/Model.cpp ; https://github.com/prusa3d/PrusaSlicer/blob/version_2.9.4/src/slic3r/GUI/Plater.cpp (l. ~1523)
  - Affectation des matières dans cette conversion **[V]** : **PrusaSlicer** attribue les extrudeurs **en tourniquet** (1, 2, 1, 2… modulo le nombre d'extrudeurs), sans tenir compte du fichier (`ModelProcessing::convert_to_multipart_object`) ; **Bambu/Orca** reprennent l'extrudeur du volume, sinon celui de l'objet, sinon le défaut.
  - **[I]** Avec 2 filaments et des objets écrits dans l'ordre plaque, interface, plaque, interface…, le tourniquet de PrusaSlicer tomberait juste par coïncidence. Pas testé.
- **Un seul objet `<object>` avec `<components>` [V partiel]** :
  - **Bambu Studio** : pour un 3MF non-Bambu sans config, chaque composant devient une partie (volume) de l'objet (`bbs_3mf.cpp`, boucle sur `object_id_list` puis `_generate_volumes_new`). L'objet entier est posé sur le plateau, les parties gardent leurs décalages relatifs. [I] pour le rendu final : pas testé.
  - **PrusaSlicer 2.9.x** : les composants sont instanciés récursivement comme des **objets séparés** (`_create_object_instance`), donc posés sur le plateau un par un. Sans `Slic3r_PE_model.config`, chaque maillage devient un seul volume. [V, code de la version 2.9.4]
  - **PrusaSlicer master** (loader réécrit, commits 2026, pas encore publié en 2.9.6) : chaque composant devient un volume du même `ModelObject` avec sa transformation (`process_object_with_components`). [V, code master ; version de sortie inconnue]
  - Source : https://github.com/prusa3d/PrusaSlicer/blob/master/src/slic3r-shared/src/Slic3r/Biz/Format/3mf.cpp

### 2.2 Affectation d'une matière par partie

- **Core spec + extension Materials (`m:colorgroup`, `pid`/`pindex`)** :
  - **Bambu Studio [V]** : pour un 3MF non-Bambu, lit `m:colorgroup` et les `pid`/`pindex` d'objet ou de triangle. Chaque couleur distincte reçoit un numéro de filament (1, 2, …) et l'extrudeur est posé sur l'objet ; les couleurs par triangle d'un sous-objet deviennent de la peinture multi-matière (`mmu_segmentation_facets`) du volume. [I] En pratique, une couleur « interface » distincte devrait donner un filament distinct par partie, mais l'utilisateur doit encore faire correspondre ces numéros aux bonnes bobines. Pas testé de bout en bout.
  - **OrcaSlicer [I, source secondaire]** : `m:colorgroup` est lu, avec une invite « Standard 3MF Color Parsing » pour associer les groupes aux emplacements (article de blog Layerpaint, non recoupé dans le code).
    Source : https://layerpaint.app/blog/open-layerpaint-3mf-in-orcaslicer
  - **PrusaSlicer [V]** : la lecture de `basematerials` est commentée dans le loader master ; rien trouvé pour `colorgroup` en 2.9.4. **Les couleurs du core spec ne pilotent pas les extrudeurs.**
- **Métadonnées propres à chaque slicer (la voie fiable)** :
  - **Bambu Studio / OrcaSlicer : `Metadata/model_settings.config` [V]**. Bambu la lit **même si le 3MF ne vient pas de Bambu** (l'erreur n'est bloquante que pour un 3MF Bambu). Structure : `<object id="…">` avec `<metadata key="name"/>` et `<metadata key="extruder" value="1"/>`, puis des `<part id="N" subtype="normal_part">` où `id` = identifiant du sous-objet référencé par le composant (ou `firstid`/`lastid` pour une plage de triangles), chacun avec ses métadonnées (`extruder`, `matrix`, réglages par partie). Des outils tiers (vit-ka, kernelCAD) écrivent ce fichier. **Mise en garde de kernelCAD** : ne pas écrire de `project_settings.config` partiel (« a partial one crashes the loader »), et un complet écraserait les presets de l'utilisateur.
    Sources : https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/Format/bbs_3mf.cpp ; https://printago.io/blog/3mf-file-format ; https://github.com/w1ne/kernelCAD-web/pull/788
  - **PrusaSlicer : `Metadata/Slic3r_PE_model.config` [V]**. `<object id>` puis `<volume firstid="…" lastid="…">` (plage de triangles dans **un seul maillage** d'objet) avec `<metadata type="volume" key="…" value="…"/>`. Les clés `name`, `volume_type`, `matrix` et `source_*` sont reconnues ; **toute autre clé (dont `extruder`) est appliquée à la config du volume**. Il faut donc écrire la pile comme **un seul maillage**, découpé en volumes par plages de triangles.
    Source : https://github.com/prusa3d/PrusaSlicer/blob/version_2.9.4/src/libslic3r/Format/3mf.cpp
- **Réglages par partie (Z distance, modificateurs, supports désactivés)** : ils vont aussi dans `model_settings.config` (Bambu/Orca) ou `Slic3r_PE_model.config` (Prusa) [V]. Les réglages d'impression globaux (supports, interface, flush) sont des presets de l'utilisateur ; les imposer supposerait un `project_settings.config` complet, lié à une imprimante [I].

### 2.3 Conséquence pour un générateur navigateur [I]

- Le plus portable : **un objet unique**, avec plaques et films en parties séparées, un **jeu d'au moins une couche entre film et plaque** (sinon fusion), et un film qui ne dépend d'aucun support généré. Plus deux fichiers de config propres à chaque slicer, pour l'extrudeur par partie.
- Un 3MF « plain » avec objets séparés à des Z différents s'ouvre avec la boîte de dialogue « multi-part » ; s'appuyer dessus est fragile : l'utilisateur doit répondre Oui, PrusaSlicer impose le tourniquet, et Bambu/Orca ne demandent rien si le fichier est traité comme un projet.

---

## 3. Exemples, résultats et modes d'échec

| Modèle / source | Méthode | Interface / jeu | Résultats rapportés |
|---|---|---|---|
| Printables 725407, Stu142, Gridfinity [V] | Mono-matière, plaques retournées, ironing | 1 couche d'air (0,2 mm) | 5 229 téléchargements ; nombreux succès en piles de 4 et 8 (X1C, P1P, MK4, XL, K1C, Core One, Kobra Neo 2…) |
| Printables 796781 / MakerWorld 819758, Gridfinity [V] | PLA + interface PETG modélisée, modificateurs de couche | Film d'une épaisseur de couche, flow 105 %, flush 800 | 356 impressions MakerWorld ; « stacked them 16 high » (2026-04-19) ; inversion PETG + interface PLA réussie (2024-12-20) |
| MakerWorld 133657, Gridfinity (Orca) [V] | Supports Snug, interface PETG, Z = 0 | 0,25 mm | Peu d'audience (8 téléchargements) ; l'auteur « doubt this is optimal » |
| Printables 995911, Gridfinity (Fusion) [V] | Supports, interface Bambu « Support for PLA » | 0,2 mm | Succès sur Prusa XL ; « takes a bit of effort to break apart and decent amount of cleanup » |
| vit-ka/gridfinity-base-stacker [V] | Film PETG modélisé + piliers, sans supports | gap 0,6, jeu 0,1, film 2 couches | Aucune donnée de résultats publiée |
| Printables 405935, HSW (pas Gridfinity) [V] | Interface Support W, puis Support G | 1 couche (0,2), puis 2 couches | Nettoyage très long avec 1 couche (« 30-45 min per tile », « 300 hours cleaning ») ; avec 2 couches, « very easy… in just a few sheets » |
| MultiBuild / Multiboard [V] | Ironing mono-matière, ou PLA + PETG | 0,2 mm d'air ; flow PETG 1,0–1,3 | Méthode officielle, piles courantes de 3 à 6+ |

**Modes d'échec observés [V, commentaires Printables 725407 / 796781 / 995911 / 405935 et MakerWorld 819758]** :
- **Soulèvement des coins, surtout des plaques 2 et 3** (A1 Mini, PLA mat, grandes grilles) ; mise à jour 819758 : mouse ears et refroidissement réduit contre le warping.
- **Parade publiée contre le soulèvement** (2024-10-12) : mouse ears d'une couche aux coins, plus des **pions de 0,8 mm traversant toute la pile aux 4 coins**, fusionnés au modèle ; les coins se coupent au cutter ensuite.
- **Fusion des plaques** : « the top 4 started printing weird. They wouldn't separate » (AnkerMake M5C, PLA+). En PETG, « detect overhang walls » doit être désactivé, sinon la 1re couche de chaque plaque, ralentie, colle trop.
- **Séparation inégale** : « The first and second plate are quite hard to separate, plates after that are much easier » ; outils cités : spatule, couteau de peintre, couteau inséré dans le jeu puis tourné.
- **Faces de contact** : « Stack-printed tiles will have one side that's smooth and the other side… a bit rough » (asciipip) ; même constat chez MultiBuild. Pour une baseplate, la face rugueuse est le dessous posé au fond du tiroir [I : peu gênant].
- **Couches pleines manquantes** quand l'interface touche les plaques dans le même objet (voir 1.4).
- **Écrasement / bourrelet du PLA imprimé sur une interface PETG** : issue BambuStudio #2015 (2023, P1P), non résolue (fermée faute de réponse du rapporteur).
  Source : https://github.com/bambulab/BambuStudio/issues/2015
- **Adhérence PETG sur PLA trop faible dans l'autre sens** : « You really need to slow down that first layer on top of the pla. The pla pops right off » (405935, 2023-12-07).
- **Coût en temps** : l'ironing double le temps (« printing a 4-stack takes twice as long as printing 4 individual plates ») ; sans ironing ça marche souvent aussi. Exemples : 5 × 5 × 8 en 13,5 h ramené à 8 h 47 sans ironing ; 8 × 8 × 8 en 25 à 30 h.

**Épaisseurs d'interface typiques [V]** : une couche (0,2 mm) en mono-matière ; 1 à 2 couches (0,2–0,4 mm) de matière d'interface en bi-matière ; 0,25 mm avec des couches de 0,25 (133657). vit-ka monte à 0,6 mm de gap, avec un film de 2 couches et 0,1 mm de jeu de chaque côté. Une seule couche de matière de support est jugée pénible à retirer ; deux couches se retirent en feuilles (405935).

**Coût matière du bi-matière [I]** : chaque interface impose deux changements de filament (aller-retour) par couche d'interface. Les profils publiés règlent la purge entre 200 et 800 (unités de flush Bambu). Sur une pile de N plaques, ça fait 2 × (N−1) × (couches d'interface) purges, plus une tour de purge éventuelle. C'est contraire au principe « économique par défaut », face au mono-matière qui ne purge rien.

---

## 4. Part des utilisateurs équipés multi-matière

- **Aucune statistique publique fiable trouvée** sur la part d'utilisateurs équipés d'un AMS, MMU, CFS ou d'un changeur d'outils [V : recherches négatives ; l'enquête Printables 2026 (3d-survey.printables.com) n'est pas accessible hors navigateur (403)].
- **Proxy [V]** : selon CONTEXT, Bambu Lab détenait **37 % des livraisons d'imprimantes entry-level (< 2 500 $) au T4 2025**, devant Creality ; les fabricants chinois font plus de 90 % du segment.
  Sources : https://manufactur3dmag.com/entry-level-3d-printers-context-q4-2025-report/ ; https://3dprintingindustry.com/news/context-report-entry-level-3d-printer-shipments-surge-as-industrial-segment-declines-241811/
- **Proxy [I]** : la plupart des modèles Bambu actuels (A1, A1 mini, P1S, P2S, X1C) existent en « Combo » avec AMS, et le H2D/H2C est orienté multi-matière, mais aucun attach rate n'est publié. Une part significative mais minoritaire, et inconnue, d'utilisateurs a donc 2 matières disponibles ; il faut aussi que ce soit PLA + PETG (ou Support for PLA), ce qui réduit encore la population.

---

## Sources principales (liste)

- https://github.com/vit-ka/gridfinity-base-stacker
- https://github.com/gerolori/gridfinity-baseplate-stack-generator
- https://www.printables.com/model/725407-gridfinity-stack-printing-baseplate
- https://www.printables.com/model/796781-gridfinity-baseplate-stack-4-high-for-bambu-with-a
- https://www.printables.com/model/995911-gridfinity-grids-stacked-for-printing
- https://www.printables.com/model/405935 (HSW 4 layer)
- https://makerworld.com/en/models/133657-gridfinity-baseplate-petg-stacked
- https://makerworld.com/en/models/819758-gridfinity-base-5x5x4high-stacked-the-original
- https://makerworld.com/en/models/1335610-print-settings-easy-separate-support-interface
- https://makerworld.com/en/models/2348738-parametric-multiboard-tile-stacks
- https://hackaday.com/2024/07/27/need-many-thin-parts-try-multi-material-stack-printing/
- https://docs.multibuild.io/beginner-section/printing-guidelines
- https://github.com/asciipip/multiboard-parametric-stacked
- https://forum.bambulab.com/t/how-to-print-identical-flat-files-on-top-of-each-using-pla-support/16755
- https://forum.bambulab.com/t/please-let-objects-float-above-the-build-plate/97019
- https://forum.bambulab.com/t/print-multi-parts-with-1-layer-support-in-between/119816
- https://forum.bambulab.com/t/import-3mf-as-part-not-object/260189
- https://forum.prusa3d.com/forum/prusaslicer/stacking-how-to-set-up-in-prusaslicer/
- https://forum.prusa3d.com/forum/prusaslicer/multipart-objects-in-3mf/
- https://github.com/OrcaSlicer/OrcaSlicer/discussions/4433
- https://www.kg7bhp.org/2024/12/printing-with-supports-for-pla-filament.html
- https://help.prusa3d.com/article/support-material_1698
- https://github.com/bambulab/BambuStudio/issues/2015
- Code : BambuStudio `src/libslic3r/Format/bbs_3mf.cpp` et `src/slic3r/GUI/Plater.cpp` (master, 2026-09) ; OrcaSlicer `src/libslic3r/Model.cpp`, `src/libslic3r/Format/bbs_3mf.cpp` et `src/slic3r/GUI/Plater.cpp` (main) ; PrusaSlicer `version_2.9.4` `src/libslic3r/Format/3mf.cpp`, `src/libslic3r/ModelProcessing.cpp` et `src/slic3r/GUI/Plater.cpp`, plus master `src/slic3r-shared/src/Slic3r/Biz/Format/3mf.cpp`
- https://printago.io/blog/3mf-file-format ; https://github.com/w1ne/kernelCAD-web/pull/788
- https://manufactur3dmag.com/entry-level-3d-printers-context-q4-2025-report/

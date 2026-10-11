---
status: accepted
---

# Un projet Bambu Studio quand l'imprimante est une Bambu Lab

> **Kit de test retiré** (2026-10-11, ADR 0002) : il n'y a plus de kit à mettre sur un plateau.

Bambu Studio ouvre nos 3MF avec un avertissement : « The 3mf is not from Bambu Lab, load geometry data only ». Il charge alors les objets seuls, sur un plateau unique : une baseplate découpée en 4 pièces arrive en 5 objets à répartir à la main. Le code de Bambu Studio 2.8 (`Plater.cpp`, `bbs_3mf.cpp`) l'explique. Sans `Metadata/project_settings.config`, ou si cette config ne nomme pas une imprimante Bambu (`printer_model`), il ne charge pas la config. Et sans config chargée, il ignore les plateaux de `Metadata/model_settings.config`. Des plateaux sans config ne servent donc à rien.

Un 3MF qui embarque une config impose son imprimante. Le site sert tous les trancheurs et toutes les imprimantes : on ne peut pas imposer celle du mainteneur à tout le monde.

## Décision

- **Une préférence « Imprimante »**, dans le menu engrenage : « Autre » par défaut, ou « Bambu Lab P1S ». Comme les autres préférences, elle reste dans ce navigateur et n'entre pas dans le lien de partage. « Autre » donne le 3MF standard d'avant.
- **Avec une Bambu Lab, le 3MF devient un projet Bambu Studio** (`serializeBambu3mf`, `packages/geometry/src/bambu.ts`). C'est le 3MF standard, plus trois choses :
  - la métadonnée `Application` (`BambuStudio-<version>`) ;
  - les plateaux, dans `Metadata/model_settings.config` ;
  - la config, dans `Metadata/project_settings.config`.
- **Les maillages restent dans le modèle principal**, sans l'extension Production qu'utilise Bambu Studio (un fichier par objet). Bambu Studio les lit ainsi : mêmes plateaux, mêmes masses au trancheur, au centième de gramme. Les autres trancheurs lisent le fichier comme avant.
- **Un plateau par pièce**, ou par pile d'une impression empilée, nommé comme la pièce. Les clips vont à côté de la dernière pièce s'ils tiennent sur le plateau avec elle, sinon sur un plateau à eux (`partPlates`). Le contenu de chaque plateau est centré, et sort du coin exclu de la P1S (18 × 28 mm, devant à gauche) s'il y a la place. Un bin, une baseplate d'une pièce ou le kit de test tiennent sur un plateau.
- **Le plateau de l'imprimante devient le plateau de la découpe** : 256 × 256 mm pour la P1S. Les champs du plateau laissent la place à cette taille.
- **La config complète**, telle que Bambu Studio l'écrit, pour chaque buse (0,2 à 0,8 mm) et chaque filament de la page :
  - PLA : Bambu PLA Basic ;
  - PETG : Bambu PETG HF ;
  - ABS : Bambu ABS ;
  - ASA : Bambu ASA ;
  - TPU : Bambu TPU 95A HF ;
  - « Autre » : Generic PLA.

  Le process est celui que Bambu associe à la buse (0.20mm Standard @BBL X1C en 0,4), et la plaque la Textured PEI, celle livrée avec la P1S. `apps/web/scripts/bambu-profiles.mjs` produit `apps/web/lib/printers/bambu-p1s.json` à partir des profils système du Bambu Studio installé. Il aplatit chaque profil (`inherits`, `include`), puis fait écrire la config du projet par la CLI de Bambu Studio. Le fichier fait 174 Ko (37 Ko compressés) ; le worker le charge seulement pour un export Bambu.
- **La hauteur de couche des réglages remplace celle du process**, et `different_settings_to_system` la déclare modifiée. Elle compte pour la géométrie : l'impression empilée laisse exactement une couche d'air (ADR 0016), et les fentes de clip s'arrondissent à la couche.
- **Une combinaison sans profil Bambu** (TPU avec une buse de 0,2 mm) donne le 3MF standard.

## Considered Options

- **Toujours un projet P1S** : impose la P1S à tous les visiteurs. Un utilisateur d'OrcaSlicer, qui lit le format de Bambu, ou d'une autre Bambu, se retrouverait sur une P1S. Écarté.
- **Les plateaux sans config** : Bambu Studio les ignore et avertit quand même (voir plus haut). Écarté.
- **Une config réduite aux noms des profils**, que Bambu Studio complète par ses profils système (`update_non_diff_values_to_base_config`, `Preset.cpp`) : quelques clés, aucun contenu de Bambu dans le site. La CLI plante sur un tel fichier, et l'interface n'a pas pu être essayée. Le mainteneur a préféré la config complète, vérifiée. Écarté pour l'instant.
- **Toute la gamme Bambu d'emblée** : les noms de profils changent d'un modèle à l'autre, et il faudrait vérifier chaque modèle. On commence par la P1S, l'imprimante du mainteneur ; une autre Bambu s'ajoute dans `PRINTERS` et le script.

## Consequences

- **Licence** : les profils de Bambu Studio sont dans son dépôt, sous AGPL-3.0, et la config embarquée en reprend le contenu, G-codes de la machine compris. Le site, sous MIT, redistribue donc des données AGPL dans `bambu-p1s.json` et dans chaque projet téléchargé. Le mainteneur a fait ce choix en connaissance de cause. La config réduite aux noms de profils l'éviterait, si elle s'avère fiable dans l'interface.
- **La config date de la version de Bambu Studio qui l'a écrite** (`version`, 2.8.2 aujourd'hui). Un Bambu Studio plus ancien avertit en ouvrant le projet. On relance le script après une mise à jour.
- **Vérifié** : des projets du moteur (une pièce, 4 pièces avec leurs clips, des piles) sont tranchés par la CLI de Bambu Studio 2.8.2, un G-code par plateau, avec la P1S 0.4, le PETG HF, la Textured PEI et la couche des réglages. L'e2e `bambu.spec.ts` télécharge une baseplate découpée depuis la page et relit ses plateaux et sa config. L'ouverture dans l'interface de Bambu Studio, sans avertissement, reste à confirmer par le mainteneur.
- Les fichiers des prototypes passent par le même format (`prototypes/bambu-plates/`), avec leur propre config P1S.

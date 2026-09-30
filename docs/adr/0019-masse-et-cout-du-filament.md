---
status: proposed
---

# Masse et coût du filament : volume mesuré × densité déclarée

Le grilling du 2026-09-30 (#31, parent #20) ajoute la **masse** de filament, en grammes, et en option son **coût**. Jusqu'ici, l'interface ne montrait que le volume de matière mesuré sur le maillage final, et le moteur refusait explicitement la masse, « qui prendrait une densité supposée ». Cet ADR acte l'exception au principe « jamais d'estimation ». Glossaire : Masse, Filament, Densité.

## Décision

- **Masse = volume mesuré × densité du filament.** Le volume est celui des pièces (`stats.volume`), plus celui de tous les clips (`stats.clipsVolume` : le volume d'un clip, mesuré sur son maillage `Baseplate.clip`, × leur nombre). La pièce est comptée **imprimée pleine**. Ce n'est pas une estimation au sens du principe : c'est un calcul exact sur un volume mesuré et une densité déclarée. Les pièces sont faites de parois fines (murets de 0,8 à 2,85 mm, fond de 0,6 mm, marge de 2 mm), que le trancheur remplit de périmètres pleins : il n'y a presque pas de remplissage à pourcentage. Le trancheur peut varier de quelques %, à cause du débit, du pied d'éléphant et des chevauchements de lignes. L'infobulle le dit.
- **Filament** : une préférence locale, dans le menu engrenage. Elle est gardée dans ce navigateur, n'entre pas dans le lien de partage, et une réinitialisation des réglages ne la touche pas. PLA par défaut, le moins cher. Le type CLICKbase ne change pas le filament tout seul : il recommande le PETG dans son avertissement, mais c'est l'utilisateur qui choisit.
- **Densités** (g/cm³, fiches techniques des fabricants, ISO 1183) :

  | Filament | Densité | Source |
  |---|---|---|
  | PLA | 1,24 | [Prusament PLA, fiche technique](https://prusament.com/wp-content/uploads/2022/10/PLA_Prusament_TDS_2021_10_EN.pdf) |
  | PETG | 1,27 | [Prusament PETG, fiche technique v1.1](https://www.prusa3d.com/file/2765253/prusament-petg-technical-data-sheet.pdf) |
  | ABS | 1,04 | [Fillamentum ABS Extrafill, fiche technique](https://fillamentum.com/wp-content/uploads/2020/10/Technical-Data-Sheet_ABS-Extrafill_03012019-1.pdf) (1,04 aussi chez eSUN) |
  | ASA | 1,07 | [Prusament ASA, fiche technique v1.1](https://prusament.com/wp-content/uploads/2022/10/ASA_Prusament_TDS_2022_16_EN.pdf) |
  | TPU | 1,21 | [BCN3D TPU, fiche technique](https://bcn3d.com/wp-content/uploads/2019/09/BCN3D_FILAMENTS_TechnicalDataSheet_TPU_EN.pdf) (1,20 à 1,24 chez Polymaker PolyFlex TPU95) |

  « **Autre** » ouvre un champ de densité, de 0,5 à 5 g/cm³ (du filament allégé au filament chargé de métal), au centième, 1,24 au départ.
- **Prix** : une préférence facultative, en €/kg, **vide par défaut**. Une fois rempli, le coût « ≈ x,xx € » s'affiche à côté de la masse. La devise est l'euro dans les deux langues pour l'instant (`Intl` en EUR : « 1,97 € », « €1.97 »).
- **Affichage** :
  - arrondi au gramme, précédé de « ≈ » ;
  - une masse qui s'arrondit à zéro s'écrit « < 1 g ». C'est le cas des clips du tiroir par défaut : 8 × 18,25 mm³ = 0,15 cm³, soit 0,18 g en PLA ;
  - statistiques : « Matière 79,2 cm³ · ≈ 98 g », puis, en dessous, « dont < 1 g de clips » et le coût. Tant que la finale n'est pas prête, on affiche « … » ;
  - surplus de chaque forme de marge : « + 4,2 cm³ · + 5 g » ;
  - chaque type : « 79,2 cm³ · ≈ 98 g ».
- **Sans recalcul** : la requête `volumes` du worker (types et formes de marge comparés) renvoie aussi le volume des clips de chaque baseplate, qu'elle calculait déjà. Le cache des volumes de la page garde les deux (`Material` = pièces + clips, `lib/mass.ts`). Changer de filament ou de prix ne relance aucun calcul.
- **Module** : `apps/web/lib/mass.ts`, pur et testé, côté application, là où vivent déjà les préférences et les formats. Le moteur ne donne que des volumes.

## Conséquences

- Les cm³ affichés restent ceux des **pièces seules** (inchangés, tests existants compris). Les grammes, eux, **incluent les clips**. Un type en Tray a des clips plus hauts, donc plus lourds (22,9 mm³ au lieu de 18,2). Le surplus d'une forme de marge ne change pas, puisque la grille seule a les mêmes clips.
- Tiroir par défaut, découpé pour 256 mm : 79,18 cm³ de pièces + 0,15 cm³ de clips. Cela donne ≈ 98 g en PLA, ≈ 101 g en PETG, et 2,01 € en PETG à 20 €/kg. Types : Tray 175 g, Skeleton 52 g, CLICKbase 83 g. Surplus : cadre + 5 g, cellules + 28 g, grille + 20 g.
- `CLAUDE.md` (Product principles) note l'exception.

## À valider

- cm³ sans les clips, mais grammes avec les clips, sur la même ligne.
- « < 1 g » pour une masse qui s'arrondit à zéro (le ticket donnait « dont 1 g de clips » en exemple).
- Densité par défaut d'« Autre » : 1,24 ; plage de 0,5 à 5 g/cm³.
- Coût calculé sur la masse non arrondie.

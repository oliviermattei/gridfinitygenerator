---
status: proposed
---

# CLICKbase d'après CLICKbase Refined, et sa licence CC BY-NC-SA

La spec v1.1 (#20, ticket #27) ajoute le type de baseplate **CLICKbase** (ADR 0013) : les bacs s'enclenchent dans les poches et y tiennent sans aimant. Le mainteneur a fixé le point de départ : **CLICKbase Refined** (Printables 1487592, ZeroCtrl, 2025), dérivé de **CLICKbase** (Printables 982173, John Hall). Les deux sont sous licence **CC BY-NC-SA 4.0**, comme toute la lignée (ClickPlates, Clickfinity). Le dépôt est sous MIT.

La recherche (`docs/research/retenue-des-bacs-clickbase.md`) recommandait au contraire de ne rien reprendre de cette lignée et de concevoir une retenue maison en « salle blanche ». Le mainteneur a décidé d'**ignorer les licences pour l'instant** : cet ADR l'acte, avec les alternatives.

## Décision

- **Géométrie** (`packages/geometry/src/clickbase.ts`), relevée sur les STL publics de Refined (`prototypes/clickbase/refined.mjs`, sans compte, par l'API de Printables ; aucun fichier de Refined n'entre dans le dépôt) :
  - dans la paroi de chaque côté de poche, deux **lamelles** : un morceau de 0,8 mm de la paroi verticale, libéré du muret par une **saignée** de 0,5 mm derrière lui, sur 12 mm de long, tenu à ses deux bouts. Elles sont centrées à un quart de la cellule, de 4,5 mm du milieu du côté jusqu'à 0,5 mm avant l'arrondi de la poche ; sous 34 mm de cellule, une seule, centrée ;
  - l'**ergot** : la lamelle cintrée de 0,5 mm vers la poche, à épaisseur constante (plat de 3 mm, raccords de 1,4 mm, plat jusqu'à z = 2,0, puis 45°). Il serre de **0,25 mm** la bande verticale du pied d'un bac standard ;
  - **imprimée en place** : la première couche reste pleine sous la lamelle ; au-dessus, une **toile** évidée de 0,4 mm côté poche, amincie côté saignée jusqu'à une arête de 0,1 mm, porte la lamelle. Le premier bac la casse ;
  - le **chanfrein bas de la poche est conservé**, comme dans Refined (extrabold, d'après le CLICKbase d'origine, le supprime).
- **Adaptations** (prototype `prototypes/clickbase/`) :
  - les **deux profils** gardent la lamelle : son bas est le pied de la paroi verticale, arrondi à la couche (1,20 mm en hybride, 0,80 en ras). L'ergot reste à la même hauteur absolue, car le pied d'un bac assis est à z = 0 dans les deux profils. Le profil hybride reste le défaut : le bac est assis sur ses pentes, et serré par les lamelles ;
  - l'ergot est une pyramide tronquée, à bas plat sur la toile ; la saignée garde 0,5 mm partout, à bouts droits.
- **Où** : sur les quatre côtés de chaque cellule de la **grille**. Pas de lamelle dans la **marge**, cellules entières et tronquées comprises : le plus économe (**à valider**). Un côté sur le contour garde ses lamelles tant que 0,8 mm de peau reste derrière la saignée, en haut de la base, chanfrein du dessous compris.
- **Clips (#22)** : ils restent au milieu des côtés, dans les 9 mm pleins entre les lamelles. La fente de 5 mm ne change pas (8 mm au plus, spec). `clipLayoutOf` reçoit les lamelles comme zones interdites (`KeepOut`, avec 0,5 mm de dégagement). Sur une cellule à lamelle unique, le clip est décalé (9 mm du milieu à 30 mm de cellule), ou absent s'il n'a pas la place (cellule de 20 mm).
- **Aimants (#24)** : conservés sous les croisements (Refined en prévoit, emmanchés). La saignée s'arrête à 4,6 mm de l'axe d'un croisement, pour un logement de 3,25 mm de rayon.
- **Numéros de pièce (#21)** : un côté dont les chiffres atteindraient une lamelle n'en a pas (cellule à lamelle unique, numéro de 3 chiffres). Sinon, le numéro tient entre les deux lamelles.
- **Vis** : inchangées.
- **Interface** : le type CLICKbase avertit, dans sa famille et avec les statistiques : PETG (le PLA flue sous la contrainte permanente et ne serre plus), générateur de parois Arachne, buse de 0,4 mm. L'indication cite Refined, CLICKbase et leur licence.
- **Lien** : `ty=clickbase`, que la table v1 lisait déjà.

## Licence (décision du mainteneur)

- Refined et CLICKbase sont sous **CC BY-NC-SA 4.0** : ils n'accordent de droits que pour un usage non commercial, et toute adaptation doit garder la même licence. Une géométrie qui en dérive n'est pas compatible avec la MIT du dépôt, qui autorise la vente (recherche, section 3).
- Le mainteneur choisit de **l'ignorer pour l'instant**, pour avoir un type qui a fait ses preuves. En contrepartie :
  - l'attribution est faite (`ATTRIBUTIONS.md`, indication du type dans l'interface), avec la licence et « pas d'usage commercial » ;
  - le code du moteur reste MIT, mais la géométrie du type CLICKbase, et les fichiers générés avec lui, doivent être considérés comme **dérivés d'une œuvre CC BY-NC-SA** tant que la question n'est pas réglée. extrabold marque ainsi ses fichiers CLICKbase ;
  - la question reste **ouverte**, à trancher avant toute promotion du type (**à valider**).
- **Voies de sortie** :
  1. **Demander une autorisation** à ZeroCtrl et John Hall (une licence MIT pour cette géométrie) : peu coûteux, et règle tout.
  2. **Lamelle maison** (concept A de la recherche, section 4.3) : une seule lame longue de 20 à 28 mm par côté, à deux appuis, profil hybride intact, cotes justifiées par le calcul (F·δ ≤ σ²V/9E) et par le banc, conçue sans lire les cotes de CLICKbase. Elle vise moins de contrainte (≤ 15 MPa en PETG) donc moins de fluage.
  3. **Porter GridFlock** (MIT + CC-BY 4.0, « clean-room implementation ») : la lame en arc, ou **ClickGroove**, qui ne serre qu'à l'insertion et au retrait quand le bac a une rainure (aucun fluage), avec la notice MIT de Jonas Konrad.
- La spec (#20, Out of Scope) renvoie la lamelle maison à plus tard, si la licence compte. L'architecture le permet : une variante de type de plus (`BASEPLATE_TYPE_VARIANTS`) ou un autre `clickPocketTool`.

## Assemblage (ADR 0004)

- **Briques** : une sorte de cellule se distingue aussi par ses côtés à lamelles (4 bits, `,lamellas:`). L'outil de poche d'une cellule avec ses lamelles est construit une fois par motif de côtés, par booléens : la poche, moins les ergots, plus les saignées, évidements et saignées de toile. Chaque morceau est un ruban construit directement comme un maillage (niveaux en hauteur, stations le long du côté, fermetures en échelle), dont les faces cintrées sont les plans d'une pyramide tronquée. Tout reste à 0,85 mm à l'intérieur de la cellule : les coutures des briques ne changent pas.
- **Booléens** : le même outil pour chaque cellule de la grille, composé avec les autres poches.
- **Mêmes volumes** par les deux voies (à 0,1 mm³ près), `NoError`, et aucune arête pincée : 3 marges coupées ou non, chanfrein et vis, cellules entières de la marge, profil ras, cellules de 20, 30, 36 et 80 mm, couches de 0,12 à 0,28. Le banc, construit indépendamment par enveloppes convexes, retrouve le volume du moteur.
- **Aperçu** : seulement les saignées, droites, de la base au-dessus de la baseplate. Les ergots, toiles et évidements, sous le millimètre, n'apparaissent qu'au maillage final, celui qu'on exporte et qu'on mesure, qui remplace l'aperçu à l'écran. Avec tout, l'aperçu du tiroir de 1000 × 1000 coupé en 16 passait de 73 à 200 ms (seuil 100).
- **Performance** (locale, médianes) : aperçu du 1000 × 1000 en 16 pièces, 88 ms, 98 ms avec vis (**marge mince**, comme le Skeleton à 96 ms) ; tiroir par défaut, 33 ms. Finale du 1000 × 1000 en 16 pièces : 1,7 s (seuil 3 s), tiroir par défaut 0,3 s. Les triangles triplent au final (8 lamelles par cellule).

## Mesures (prototypes/clickbase, qualité finale)

| Cas | Normal | CLICKbase | Rapport |
|---|---|---|---|
| 2 × 2 (1 aimant) | 5,58 cm³ | 4,67 cm³ | × 0,84 |
| tiroir par défaut, 40 aimants | 78,42 | 66,14 | × 0,84 |
| tiroir par défaut coupé en 4, 15 clips | 78,98 | 66,70 | × 0,84 |

- Contre Refined (profil ras, sans aimant, 2 × 2 de 84 × 84 × 4,25 mm) : 4,363 cm³ contre 4,268 cm³ (+2 %, ses encoches de clips).
- Serrage mesuré sur la coupe à z = 1,5 : 0,250 mm (banc : 0,150 et 0,350 pour les variantes à imprimer).

## Considered Options

- **Lamelle maison ou GridFlock tout de suite** (recommandation de la recherche) : écarté par le mainteneur pour l'instant ; ce sont les voies de sortie ci-dessus.
- **Supprimer le chanfrein bas de la poche et imposer le profil ras** (CLICKbase d'origine, extrabold) : Refined le garde, et le profil hybride garde l'assise sur les pentes (ADR 0002). Les deux profils restent au choix.
- **Désactiver les aimants** (extrabold) : inutile, ils sont loin des lamelles ; Refined en prévoit.
- **Lamelles dans les cellules de la marge** : de la matière et des triangles pour des cellules qu'on remplit rarement ; à revoir si l'usage le demande.
- **Tout le détail dans l'aperçu** : 200 ms sur le plus grand tiroir coupé.

## Consequences

- `GridFrame.clickbase` (`Clickbase { centres, length, protrusion, grip, base, bottom, slitsOnly }`), `clickbaseOf(cellSize, profile, layerHeight)` et `POCKET_PROFILES` sont exportés ; `lamellaSides` et `lamellaStretches` servent aux briques, aux booléens et aux clips. `insideOutline` passe de magnets.ts à shapes.ts.
- Impression empilée (#28) : une plaque CLICKbase retournée pose sur ses murets ; les toiles et les lamelles, fragiles, sont alors en haut. À vérifier au ticket.
- **À valider par l'impression** (recette #16) : l'enclenchement et le retrait d'un bac, la rupture des toiles au premier bac, le serrage (0,15 / 0,25 / 0,35), et le fluage à une semaine en PETG.

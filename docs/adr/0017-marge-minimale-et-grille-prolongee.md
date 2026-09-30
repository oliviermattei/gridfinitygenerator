---
status: proposed
---

# Marge minimale et grille prolongée ouverte

Le grilling du 2026-09-30 (#29, suite de #23) garde trois formes de marge, mais remplace les équerres par la **grille prolongée**, ouverte, et ajoute une case **« Marge minimale »** qui réduit chaque forme à ses appuis. Cet ADR remplace en partie l'ADR 0011 (retrait des équerres) ; les règles du cadre (ADR 0006-marge, 0011) et des cellules tronquées (ADR 0008) restent valables pour la marge complète. Glossaire : Marge, Marge minimale, Grille prolongée, Appui, Talon, Surplus. Mesures : `prototypes/minimal-margin/`.

## Décision

- **Réglages** (`packages/geometry/src/settings.ts`) :
  - `marginShape: "frame" | "cells" | "extended"` (clé `mg`, écrite hors défaut ; `mg=extended` pour la grille prolongée) ;
  - `minimalMargin: boolean`, décoché par défaut, clé `min`, écrite seulement `min=1` ;
  - un ancien lien `mg=brackets` est lu comme **cadre + marge minimale** (`decodeSettings`) et réécrit `min=1`. La table v1 garde `brackets` en lecture seule, sans nouvelle version de lien (la v1 n'est pas publiée).
- **Grille prolongée** (`EXTENDED_GRID`, margin.ts) : les murets de la grille continuent dans la marge, profil et hauteur complets, jusqu'au contour. Chacun s'arrête sur un **talon** plein, pleine hauteur, large comme le pied du muret (2 × 2,85 = 5,70 mm, `footWidth`) et profond d'un mur (1,2 mm arrondi à la ligne, plus le chanfrein du dessous, comme le mur extérieur). Pas de mur extérieur : entre deux talons, la bande du mur est vide et les cellules restent ouvertes côté tiroir.
  - **Muret parallèle au bord** (marge plus large qu'une cellule) : il n'existe que si tout son pied tient à l'intérieur de la bande. Sinon il n'est pas construit, et la cellule d'avant s'ouvre jusqu'au contour (sa poche est étirée au-delà, `pocketTool(…, grow)`). La bande ne coupe donc jamais un muret dans sa longueur en lamelle.
  - **« Pas de fente » adapté à une forme ouverte** : le trou d'une cellule ouverte débouche sur le tiroir par la bande (au moins un mur de large). Il n'a donc ni fond ni remplissage : les règles de l'ADR 0008 ne valent que pour un trou fermé par le mur extérieur. Une poche qui ne laisserait dans la bande qu'une languette plus étroite qu'un mur au sommet n'est pas creusée : le muret garde une face plane sur la bande. La bande entre deux talons suit la règle des trous ouverts sur le contour (ADR 0011) : un mur de large au moins au-delà du pied du chanfrein, sinon pleine. Une marge plus étroite que la bande (1,2 mm + chanfrein) reste donc pleine, sans talon ni trou.
  - **Coins arrondis** : la bande suit l'intérieur arrondi du mur (congés compris) ; un talon près d'un coin est ce que sa bande garde de l'arc.
- **Marge minimale**, sur chaque côté qui a une marge, **deux appuis** sur la première et la dernière ligne de la grille de ce côté ; le reste de la marge, **coins compris, est vide** sur toute la hauteur, ouvert sur le tiroir :
  - **Cadre** : les traverses des deux lignes, chacune avec un morceau de mur extérieur à son bout, long comme le pied d'un muret (5,70 mm), dans l'emprise de la grille (comme les traverses des premières et dernières lignes, ADR 0011). **Pleine hauteur, 3 lignes au moins** (1,2 mm à 0,4), en attendant la recette ; le cadre complet reste à 2 mm.
  - **Cellules** : la première et la dernière cellule tronquée du côté, fermées : leurs deux murets entiers (la marge est gardée un demi-pied au-delà) et leur morceau de mur extérieur.
  - **Grille** : les murets des deux lignes, entiers, et leurs talons.
  - Une marge minimale n'a pas de cellule entière dans le treillis (`wholeCells` nul) : ses quelques cellules sont découpées avec les briques du bord.
  - `layout.supports` donne, dans le contour, ce que la marge minimale garde (null pour une marge complète).
- **Surplus** : sous chaque forme, « + x cm³ » = volume de la baseplate avec cette forme (et l'état de la case) moins celui de la même baseplate **sans marge**. `GenerateOptions.margin: false` construit cette grille seule : la marge vidée sur toute sa hauteur (sauf ce qui serait plus étroit qu'un mur au-delà du chanfrein, comme toute forme), la disposition, la découpe et les clips inchangés, les aimants du bord perdus avec la marge. Le client la mesure en arrière-plan avec les autres formes (`compare`, requête `volumes` : des `Comparison { settings, bare }`), après la finale, famille Marge ouverte et marge non nulle. L'aperçu n'en paie rien.
- **Aimants** (`hasMagnet`) : au bord du treillis seulement si la marge porte les murets (cellules, grille prolongée), si le trou et son mur tiennent dans le contour (chanfrein compris), et **si le trou garde un mur de toute zone vide de la marge** (`MarginVariant.emptyAreas` : bande entre les talons, marge minimale entre les appuis). En marge minimale, il n'en reste presque aucun : il faut des cellules gardées des deux côtés d'un muret d'appui (tiroir par défaut : 40 aimants, comme le cadre).
- **Empilement** (`stackRuleOf`, ADR 0016) : le **cadre est refusé**, complet (2 mm) ou minimal (traverses seules) ; les cellules et la grille prolongée sont permises, complètes ou minimales. En marge minimale, une pièce ne se pose sur une autre que si **chacun de ses appuis tombe sur un appui** de celle du dessous (`stackPlanOf` lit `layout.supports`).
- **Interface** : famille Marge à trois formes (Cadre, Cellules, Grille, dessin `MarginArt kind="extended"`), le surplus sous chacune, un interrupteur « Marge minimale » avec une courte explication, et « , minimale » dans le résumé de la famille. Les interrupteurs de l'application servent de case à cocher (à valider).

## Briques (ADR 0004)

- Une forme vidée sur toute sa hauteur a des trous ouverts sur le contour : la brique les retire de sa dalle **avant** le chanfrein du dessous (`MarginCut.holesInSlab`), comme la voie booléenne les retire du contour. Retirés après, leurs flancs rencontreraient ailleurs un arc de coin chanfreiné.
- Grille prolongée : une poche ouverte n'est **pas coupée au plan de la bande**. Ce plan est aussi celui où commence le trou de la bande, et deux soustractions sur un même plan laissaient à manifold des lamelles différentes d'une voie à l'autre (0,1 à 6 mm³, mesuré). La poche, étirée au-delà du contour, perd les **talons** (qu'elle traverse), une soustraction par forme de cellule. Elle vide alors la bande entre les talons. La bande n'est ajoutée à l'outil (union) que là où une poche manque (languette non creusée) ou sur un fond de Tray.
- Les pièces de bande ne traversent aucune couture : les talons sont sur les lignes du treillis.
- `sectionKey` (shapes.ts) est la clé de forme partagée par les briques et par les outils de la marge.

## Mesures (tiroir par défaut, qualité finale)

| Forme | Marge | Entière (cm³) | Surplus | Aimants | Découpée pour 256 mm (cm³) | Surplus | Aimants |
|---|---|---|---|---|---|---|---|
| Grille seule | — | 74,29 | — | 40 | 74,75 | — | 28 |
| Cadre | complète | 78,42 | + 4,13 | 40 | 78,98 | + 4,24 | 28 |
| Cadre | minimale | 75,02 | + 0,73 | 40 | 75,47 | + 0,73 | 28 |
| Cellules | complète | 96,43 | + 22,14 | 70 | 97,18 | + 22,43 | 54 |
| Cellules | minimale | 82,23 | + 7,94 | 40 | 82,68 | + 7,94 | 28 |
| Grille prolongée | complète | 90,07 | + 15,78 | 70 | 90,82 | + 16,07 | 54 |
| Grille prolongée | minimale | 76,10 | + 1,81 | 40 | 76,55 | + 1,81 | 28 |

Sans aimants, le cadre et les cellules complètes retrouvent les volumes du prototype #3 (81,34 et 101,53 cm³) ; la grille prolongée fait 95,18 cm³.

**Performance** (médianes locales, aperçu, seuil 100 ms) : tiroir par défaut en grille prolongée 59 ms (découpé en 4 : 75 ms), minimale 39 ms ; 1000 × 1000 en grille prolongée 72 ms ; cadre minimal 18 ms, cellules minimales 53 ms. Les cas limites existants ne bougent pas (Skeleton et CLICKbase avec vis, 1000² en 16 pièces : 95 et 94 ms). Finales : 191 à 380 ms sur le tiroir par défaut.

## Considered Options

- **Garder les équerres** comme quatrième forme : la marge minimale du cadre les remplace, en plus simple (deux appuis par côté, plus de T intermédiaires) et en moins de matière (0,73 contre 1,05 cm³ de surplus sur le tiroir par défaut, sans aimants).
- **Appuis de 2 mm** comme le cadre complet : 0,41 cm³ de moins sur le banc, mais un appui unique par ligne doit tenir seul le côté ; pleine hauteur en attendant la recette (variante B du banc).
- **Grille prolongée coupée au plan de la bande**, avec la bande en trous séparés : mêmes formes, mais les deux voies divergeaient (lamelles de manifold). Remplacé par les talons retirés des poches.
- **Muret parallèle au bord gardé, recoupé par la bande** : une lamelle de muret, jusqu'à une arête sans épaisseur au sommet. Écarté : le muret disparaît, la cellule d'avant s'ouvre.
- **Surplus calculé sur une baseplate « cellules » sans marge** (autre taille) : la découpe, les clips et les aimants changeraient avec elle. La grille seule garde le plan de découpe de la baseplate.

## Consequences

- **À valider à l'impression** (#16, `prototypes/minimal-margin/files/`) : la tenue des appuis (pleine hauteur, 3 lignes), la longueur du morceau de mur du cadre (5,70 mm), la profondeur du talon (1,2 mm).
- **À valider** : les pièces d'une baseplate découpée qui ne portent aucun appui ont une marge vide ; seuls les clips et les voisines les tiennent (comme les pièces sans équerre de l'ADR 0011). En cellules minimales, l'appui du bout d'une rangée déborde d'un demi-muret sur la pièce voisine quand une coupe passe sur son muret intérieur.
- **À valider** : aimants presque absents du bord en marge minimale, faute de murets tout autour du trou.
- **À valider** : une baseplate à marge minimale ne s'empile que si les appuis des pièces se superposent (souvent les pièces de coin, symétriques) ; sinon plus de piles.
- La matrice de `combination-matrix.test.ts` croise désormais la marge minimale avec le type, la forme, la découpe, le profil et les vis (paires), et un tiroir à marges de 50 mm.

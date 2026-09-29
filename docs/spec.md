# Spec v1 : générateur de baseplates

> Statut : **validée** le 29/09/2026 (décisions en section 12). Sources : `docs/handoff.md`, `CONTEXT.md` (glossaire, dont les termes sont repris tels quels), ADR 0001 à 0004, `docs/research/gridfinity-baseplate.md`, `prototypes/geometry-perf/RESULTS.md`, `prototypes/ui-directions/README.md`.

## 1. Objectif

Un générateur web, public, gratuit et open source (MIT), qui produit une **baseplate** Gridfinity imprimable en 3D, taillée pour un **tiroir** donné. Tout est calculé dans le navigateur, sans backend. Le moteur, l'aperçu et l'export sont conçus pour être réutilisés par les générateurs suivants (bacs, shadowbox, séparateurs, étiquettes).

Critères de réussite de la v1 :
- n'importe quel **bac** Gridfinity standard s'emboîte dans la baseplate générée, et y est **bien assis** (tenu par les pentes à 45°, sans jeu latéral) avec le profil hybride ;
- le fichier exporté est un maillage fermé (manifold), qui se tranche sans réparation ;
- l'aperçu suit les réglages en temps réel, y compris sur mobile.

## 2. Périmètre

### Dans la v1

- Type de baseplate **Normal** (cadre ajouré, poches ouvertes en dessous).
- Taille saisie de deux façons : **dimensions intérieures du tiroir** ou **nombre de cellules + marge**.
- **Alignement** de la grille sur 9 positions ; **marge pleine**.
- **Profil de poche** : Hybride (par défaut) ou Ras.
- **Aimants** (taille réglable, trous d'éjection en option) et **vis** de fixation (taille réglable).
- Réglages avancés : taille de cellule, jeu des trous, rayon des coins extérieurs, chanfrein du dessous.
- Aperçu 3D ; export **3MF** (par défaut) ou **STL**.
- Lien de partage versionné ; derniers réglages mémorisés dans le navigateur.
- Interface **FR / EN**, **mm / pouces**, utilisable sur mobile.
- Kit de test du profil (voir 5.8).

### Hors v1 (plus tard)

Découpe pour le **plateau** d'impression (pièces, connecteurs), presets de tiroirs, types Tray / Skeleton, marges Half Grid / Overtile / Margin Fit, nervures de serrage pour aimants, mode « contour libre », générateurs de bacs et autres, communauté et backend.

## 3. Réglages

Toutes les longueurs sont stockées en **mm** dans l'état, quelle que soit l'unité affichée. Les réglages sont regroupés en **familles**, qui correspondent aux sections de l'accordéon (voir 8).

### 3.1 Taille

| Réglage | Clé URL | Type | Plage | Défaut | Effet |
|---|---|---|---|---|---|
| Mode de saisie | `mode` | onglets | `drawer`, `cells` | `drawer` | Choisit les champs affichés. |
| Largeur du tiroir | `w` | longueur | 42 – 1000 mm, pas 1 (0,05 in) | 400 | Largeur intérieure du tiroir. |
| Profondeur du tiroir | `d` | longueur | 42 – 1000 mm | 280 | Profondeur intérieure du tiroir. |
| Colonnes | `cx` | entier | 1 – 24 | 4 | Mode `cells`. |
| Rangées | `cy` | entier | 1 – 24 | 3 | Mode `cells`. |
| Marge en largeur | `mx` | longueur | 0 – 500 mm | 0 | Mode `cells` : marge totale, répartie selon l'alignement. |
| Marge en profondeur | `my` | longueur | 0 – 500 mm | 0 | Idem en profondeur. |

Les limites (1000 mm, 24 × 24 cellules) couvrent les tiroirs réels, y compris d'établi, et bornent le calcul et la mémoire. Elles seront relevées avec la découpe pour le plateau.

### 3.2 Alignement

| Réglage | Clé URL | Type | Valeurs | Défaut | Effet |
|---|---|---|---|---|---|
| Alignement | `al` | pavé 3 × 3 | `tl t tr l c r bl b br` | `c` | Où placer la grille quand la marge ne tombe pas juste. « Haut » = arrière du tiroir, « bas » = avant. |

### 3.3 Profil de poche

| Réglage | Clé URL | Valeurs | Défaut | Effet |
|---|---|---|---|---|
| Profil | `pr` | `hybrid`, `flush` | `hybrid` | Voir 5.2. |

### 3.4 Aimants

| Réglage | Clé URL | Type | Plage | Défaut | Effet |
|---|---|---|---|---|---|
| Aimants | `mg` | interrupteur | — | non | Ajoute les logements d'aimant et le socle (5.4). |
| Ø de l'aimant | `md` | longueur | 3 – 10 mm, pas 0,1 | 6 | Ø **de l'aimant** ; le trou ajoute le jeu (3.6). |
| Épaisseur de l'aimant | `mh` | longueur | 1 – 4 mm, pas 0,1 | 2 | Profondeur du trou = épaisseur + 0,4 mm, arrondie à la couche (5.3). |
| Trous d'éjection | `mr` | fond plein / trou | — | fond plein | Trou traversant Ø = Ø aimant / 2, pour pousser l'aimant. |

Avec les défauts, le trou fait **Ø 6,5 × 2,4 mm**, soit les cotes de la spec (`handoff.md`).

### 3.5 Vis

| Réglage | Clé URL | Type | Plage | Défaut | Effet |
|---|---|---|---|---|---|
| Vis | `sc` | interrupteur | — | non | Trous fraisés pour visser la baseplate au fond du tiroir, aux intersections de la grille (5.5). |
| Ø de la tige | `ss` | longueur | 2 – 6 mm, pas 0,1 | 3 | Ø de passage. |
| Ø de la tête | `sh` | longueur | 2 – 8 mm, pas 0,1, ≥ Ø tige | 6 | Ø du fraisage à 90°. |

### 3.6 Avancé

Un bandeau prévient qu'hors des valeurs par défaut, les bacs standard risquent de ne plus s'emboîter.

| Réglage | Clé URL | Plage | Défaut | Effet |
|---|---|---|---|---|
| Taille de cellule | `cs` | 20 – 80 mm, pas 0,5 | 42 | Pas de la grille. |
| Jeu des trous | `tol` | 0 – 1 mm, pas 0,05 | 0,5 | Ajouté au Ø des trous d'aimant et de vis. **Jamais appliqué à la poche** (comme la spec et extrabold). |
| Rayon des coins extérieurs | `or` | 0 – 10 mm, pas 0,5 | 4 | Coins de la baseplate. |
| Chanfrein du dessous | `ch` | 0 – 3 mm, pas 0,1 | 0 | Contre le « pied d'éléphant » de la première couche. |
| Jeu au tiroir | `gap` | 0 – 5 mm, pas 0,1 | 1 | Retiré de chaque dimension du tiroir (mode `drawer`), pour que la baseplate rentre. |

### 3.7 Préférences (hors familles, menu engrenage)

Ce ne sont pas des réglages de la baseplate. Elles ne font pas partie du lien de partage et sont mémorisées dans le navigateur.

| Préférence | Valeurs | Défaut | Effet |
|---|---|---|---|
| Langue | Français, English | selon le navigateur | Voir 9. |
| Unités | mm, in | mm | Affichage et saisie des longueurs de tiroir et de marge. Aimants et vis restent en mm (ils se vendent en mm). |
| Buse | 0,2 / 0,4 / 0,6 / 0,8 mm | 0,4 | Profil d'impression. |
| Largeur de ligne | libre, 0,1 – 1,2 mm | = buse | Profil d'impression. |
| Hauteur de couche | 0,12 / 0,16 / 0,2 / 0,28 mm | 0,2 | Arrondi des épaisseurs (5.3) ; hauteur affichée en couches. |
| Plateau (largeur × profondeur) | 100 – 1000 mm | 256 × 256 | Taille utile du plateau d'impression : avertissement si la baseplate ne tient pas (6.3). Servira ensuite à la découpe. |
| Couleur de l'aperçu | accent + 4 neutres | accent | Couleur du plastique dans l'aperçu uniquement. |

Le profil d'impression sert au **calcul** : les épaisseurs que nous choisissons (profondeur des trous d'aimant, fond sous l'aimant, socle) sont arrondies à un nombre entier de couches (5.3). Il sert aussi à l'affichage (nombre de couches) et aux avertissements (6.3). Le profil de poche, lui, suit le standard et n'est pas arrondi.

Comme la hauteur de couche et la largeur de ligne changent la géométrie ou ses avertissements, elles font partie du **lien de partage** (clés `lh`, `lw`). La buse, le plateau et la couleur de l'aperçu restent des préférences locales.

## 4. Mise en page de la grille

Entrées : taille (3.1), alignement, taille de cellule `c`, jeu au tiroir `g`.

- **Mode `drawer`** : `W = w − g`, `D = d − g`. `nx = floor(W / c)`, `ny = floor(D / c)`, avec au moins 1. Reste : `rx = W − nx·c`, `ry = D − ny·c`.
- **Mode `cells`** : `W = nx·c + mx`, `D = ny·c + my` ; `rx = mx`, `ry = my`.
- **Répartition du reste** selon l'alignement : colonne gauche → tout le reste à droite, centre → moitié-moitié, droite → tout à gauche. Même principe entre l'arrière et l'avant.
- La **marge** est pleine, à la hauteur du plat de muret, et suit le profil extérieur de la baseplate (5.6).
- Le mode `drawer` affiche en permanence `nx × ny cellules` et la marge obtenue. Le mode `cells` affiche la taille totale.

## 5. Géométrie

Les cotes Gridfinity (42 mm, profil 0,7 / 1,8 / 2,15, rayon 4) viennent de `docs/research/gridfinity-baseplate.md` (B.2, B.3). Le **profil de poche est une donnée du moteur**, pas une valeur codée en dur (ADR 0002).

### 5.1 Repère

Origine au coin arrière gauche, en bas. `x` vers la droite, `y` vers l'avant, `z` vers le haut. Le dessous de la baseplate est à `z = 0`.

### 5.2 Profils de poche

Retraits comptés depuis l'axe du muret, de bas en haut ; le rayon du congé de poche vaut `4 − retrait`.

| Profil | Du bas vers le haut | Hauteur |
|---|---|---|
| **Hybride** (défaut) | vertical 0,35 (retrait 2,85) → 45° 0,7 → vertical 1,8 → 45° jusqu'au plat de 0,4 de chaque côté du muret | **4,60 mm** (23 couches de 0,2) |
| **Ras** | 45° 0,7 dès `z = 0` → vertical 1,8 → 45° jusqu'au plat | **4,25 mm** |

Dans les deux cas, le sommet du muret est un **plat de 0,8 mm** (0,4 de chaque côté), et non une arête vive. Au bord extérieur, le plat fait 0,4 mm.

### 5.3 Hauteur totale

`hauteur = hauteur du profil + (aimants ou vis ? socle : 0)`.

Arrondi à la couche (`lh` = hauteur de couche ; `⌈x⌉` = multiple de `lh` immédiatement supérieur ou égal à `x`) :
- fond sous l'aimant : `f = ⌈0,4⌉` ;
- profondeur du trou : `p = ⌈épaisseur de l'aimant + 0,4⌉` ;
- socle : `p + f`.

Avec les défauts (aimant de 2 mm, couche de 0,2) : `p = 2,4`, `f = 0,4`, socle **2,8 mm**, hauteur **7,40 mm** en hybride. Avec des vis sans aimants, le socle est calculé comme pour l'aimant par défaut. Le profil de poche (4,60 ou 4,25 mm) suit le standard : la hauteur totale n'est donc pas toujours un nombre entier de couches, le trancheur s'en charge.

### 5.4 Aimants

- Un logement dans chaque coin de chaque cellule, centre à **13 mm** du centre de la cellule sur chaque axe (spec et rebuilt ; extrabold met 14 mm).
- Trou borgne ouvert vers le haut (dans la poche) : Ø = Ø aimant + jeu, profondeur `p` (5.3).
- Socle : prolongement vertical des murets sur 2,8 mm et **bloc carré de Ø du trou + 4 mm** (10,5 mm avec les défauts) dans chaque coin de cellule, fusionné au muret. Le centre de la cellule reste ouvert. Le fond sous l'aimant fait `f` (5.3).
- Trou d'éjection en option : traversant, Ø = Ø aimant / 2, centré sur le logement.
- **À revoir une fois le moteur écrit** : taille des blocs de coin, et place des aimants face à une future base à clips (12).

### 5.5 Vis

- Trou fraisé à 90° : tige Ø `ss + jeu` traversante, fraisage jusqu'à Ø `sh + jeu` au ras du fond de poche.
- Position : aux **intersections de la grille**, comme extrabold, là où les blocs de coin se rejoignent. Une seule disposition, sans option (12). La règle exacte (intersections intérieures seulement, ou aussi en bordure) sera relevée sur un export extrabold avant d'écrire le moteur.
- Activer les vis ajoute le socle de 5.4 (même sans aimants), pour que le fraisage ait de la matière.

### 5.6 Contour et marge

- Contour extérieur : rectangle `W × D` à coins arrondis de rayon `or`. Si `or` dépasse la moitié du plus petit côté, il est ramené à cette moitié.
- Chanfrein du dessous `ch` sur tout le pourtour extérieur, à 45°.
- La marge est un bloc plein qui monte jusqu'au plat de muret ; la poche de bord garde son profil complet côté marge.

### 5.7 Qualité du maillage

- Maillage **fermé et manifold** : chaque export est validé par `new Manifold(mesh)` (statut `NoError`) dans les tests.
- Arrondis : 32 segments par quart de cercle en export, 8 en aperçu ; trous : 64 segments en export, 16 en aperçu.
- Construction par **briques de cellule assemblées au niveau du maillage** (ADR 0004). Les booléens groupés (`batch`) servent de voie de repli, et de référence de volume dans les tests.
- Grilles de 1 cellule sur un axe (1 × N) : prises en charge (la voie briques suppose au moins 2 cellules par axe ; on passe alors par la voie de repli).

### 5.8 Kit de test

Un bouton télécharge une baseplate **1 × 2** avec une cellule **Hybride** et une cellule **Ras**, pour comparer l'assise d'un bac à l'impression. Les deux bacs 1 × 1 du kit arriveront avec le générateur de bacs.

## 6. Aperçu 3D

### 6.1 Rendu

- react-three-fiber, plastique mat sous éclairage studio procédural, occlusion ambiante, ombre de contact (repris du prototype v3).
- La baseplate prend la couleur de l'accent par défaut ; les autres couleurs sont dans les Préférences.
- Orbite amortie, zoom borné, pas de déplacement latéral. Cadrage automatique animé à chaque changement de taille, dans la zone laissée visible par le panneau. Bouton « Recentrer la vue ».

### 6.2 Réactivité

- Géométrie calculée dans un **Web Worker** (manifold-3d), en qualité aperçu pendant les réglages, puis en qualité finale.
- Objectifs : aperçu < **100 ms** ; calcul final < **1 s** en 10 × 10 et < **3 s** en 20 × 20, aimants compris (le prototype fait 40 ms en 20 × 20).
- Un réglage qui change pendant un calcul annule le calcul en cours ; seul le dernier état est rendu.

### 6.3 Avertissements (non bloquants)

- Marge non nulle plus étroite que 2 largeurs de ligne : risque de bande imprimable mal.
- Baseplate plus grande que le plateau des Préférences (256 × 256 mm par défaut, les deux orientations sont essayées) : elle ne s'imprime pas d'un seul tenant, et la découpe n'existe pas encore en v1.
- Réglage avancé modifié : bandeau de compatibilité.

## 7. Export

- Bouton principal **Télécharger 3MF**, avec un menu pour **STL**.
- **Un seul fichier**, pas de zip (un zip seulement quand il y aura plusieurs pièces).
- Nom : `baseplate-{nx}x{ny}-{W}x{D}mm.{ext}`, le nom du site n'étant pas fixé.
- 3MF : un objet nommé, unités en mm, métadonnée « lien de partage » (réglages versionnés). La miniature est facultative en v1.
- Export calculé en qualité finale dans le worker. Objectif : < 1 s pour un 3MF 20 × 20 (le sérialiseur naïf du prototype fait 1,8 s ; à écrire en tampons binaires).
- Le worker est recréé après un gros export, car la mémoire WASM ne rétrécit pas (ADR 0004).

## 8. Interface

Décisions du prototype v3 (`prototypes/ui-directions/`, captures dans `screenshots/v3/`) :

- Direction **Studio** : aperçu plein écran sur fond studio, panneaux flottants aux formes douces.
- **Un seul accent**, terre cuite `#C4502F`, défini à **un seul endroit** (les jetons CSS et la couleur de l'aperçu en dérivent). Neutres blanc cassé. Typo **Outfit**.
- **Panneau de réglages à gauche** : cotes en tête (`400 × 280 mm`, cellules, hauteur en couches), familles en **accordéon exclusif** (une seule ouverte à la fois, chacune résumée sur une ligne quand elle est fermée), **Télécharger** en bas du panneau. Activer les aimants ou les vis ouvre leur section.
- **Menu Préférences** (engrenage) en haut à droite : langue (liste déroulante), unités, imprimante, couleur de l'aperçu, puis Partager, Réinitialiser, Offrir un café.
- **Mobile** : aperçu en haut ; dock en bas avec les cotes, « Réglages » et « 3MF » ; les réglages s'ouvrent dans un panneau par le bas qui laisse l'aperçu visible ; même menu Préférences.
- Contrôles : curseur + champ libre (virgule acceptée, ↑/↓ au clavier), longueurs avec −/+, boutons illustrés pour les choix (profil, trous d'éjection), pavé d'alignement 3 × 3.
- Accessibilité : tout est utilisable au clavier (Base UI), focus visible, contraste AA (texte sur l'accent ≥ 4,5:1), `prefers-reduced-motion` respecté.

## 9. Langue, unités, adresses

- Routes `/fr/…` et `/en/…`. À la première visite de `/`, redirection selon la langue du navigateur ; le choix fait dans les Préférences est mémorisé et l'emporte ensuite.
- Page du générateur : `/{lang}/baseplate`.
- Les libellés FR suivent le glossaire `CONTEXT.md` (baseplate, cellule, poche, muret, marge, tiroir…).
- Nombres formatés selon la langue (virgule décimale en FR).

## 10. Partage et persistance

- **Lien de partage** : les réglages de la baseplate (clés URL de la section 3, plus `lh` et `lw`) dans la query string, plus `v=1`. On n'écrit que les valeurs qui diffèrent des défauts de la version indiquée.
- Un lien d'une version ancienne est lu avec les défauts **de cette version**, pour que la même URL redonne toujours la même baseplate. Une clé inconnue est ignorée ; une valeur hors plage est ramenée dans la plage.
- **Derniers réglages** gardés dans `localStorage`. À l'ouverture, un lien partagé l'emporte sur les réglages mémorisés.
- **Réinitialiser** remet les réglages de la baseplate aux défauts, sans toucher aux Préférences.
- Mesure d'audience sans cookie (Umami pressenti), sans bandeau de consentement.

## 11. Architecture et qualité

- Monorepo pnpm + Turborepo (ADR 0003) :
  - `packages/geometry` : TypeScript pur + manifold-3d, sans React. Entrée : réglages validés ; sortie : maillage (tampons typés) + métadonnées (dimensions, `nx × ny`, hauteur). Pattern « arène » pour libérer la mémoire WASM.
  - `packages/viewer` : aperçu react-three-fiber, indépendant du générateur.
  - `packages/ui` : design system (jetons, dont l'accent unique ; contrôles Base UI + Tailwind).
  - `apps/web` : Next.js App Router, pages, i18n, worker, export.
- **Tests** :
  - Moteur en **TDD** (Vitest) : dimensions et bounding box, cotes du profil par coupes, position et Ø des trous, maillage `NoError`, volume identique entre la voie briques et la voie `batch`, cas 1 × 1 et 1 × N.
  - Lien de partage : aller-retour réglages → URL → réglages, lecture d'un lien `v=1` figé.
  - **Playwright** : parcours complet (saisie du tiroir, aimants, export 3MF et STL, partage, bascule FR/EN et mm/in), desktop et mobile.
- Déploiement Vercel (plan Hobby). Licence MIT, avec un fichier d'attributions (Zack Freedman, gridfinity-rebuilt).

## 12. Décisions et points reportés

Décisions du 29/09/2026 :
1. **Jeu au tiroir** : 1 mm retiré à chaque dimension par défaut, réglable dans Avancé.
2. **Vis** : une seule disposition, aux intersections de la grille comme extrabold. On préfère un choix par défaut assumé à une option de plus ; la disposition de gridfinity-rebuilt pourra être ajoutée si elle est demandée.
3. **Kit de test** : baseplate 1 × 2 en v1 ; les bacs 1 × 1 avec le générateur de bacs.
4. **Profil d'impression** : il sert au calcul (épaisseurs arrondies à la couche), pas seulement à l'affichage.
5. **Plateau** : taille configurable dans les Préférences (256 × 256 mm par défaut) ; elle sert à l'avertissement, puis à la découpe.
6. **Adresse** : `/{lang}/baseplate`.
7. **Limites** : 1000 mm et 24 × 24 cellules, relevées avec la découpe.

Reportés, sans bloquer la v1 :
- **Aimants ou base à clips** : les aimants restent en v1. Une base à clips est envisagée. CLICKbase est sous licence CC BY-NC-SA 4.0 (recherche, A.2 et « Licence Gridfinity ») : la reprendre telle quelle est incompatible avec un projet MIT, il faudra concevoir notre propre système.
- Taille des blocs d'aimant (après le moteur).
- Nom du site.

# Prototype jetable : contour d'objet hors ligne pour les shadowbox (ticket #36)

> Question posée : peut-on passer d'une photo d'outils posés sur une feuille à un contour en mm exact à ±0,5 mm, puis à une poche, **entièrement dans le navigateur, sans backend** ? Quelle méthode par défaut (vision classique) et quelle option (SlimSAM) ?
>
> Recherche préalable : `docs/research/shadowbox-contour-hors-ligne.md`. C'est du code jetable : on ne le reprend pas tel quel.

## Lancer

```bash
# depuis ce dossier ; hors du workspace, comme les autres prototypes
pnpm install --ignore-workspace
pnpm assets   # dépose sous public/ OpenCV.js 4.13.0, SlimSAM-77, IS-Net, BiRefNet Lite et le runtime ONNX (≈ 820 Mo, non versionnés)
pnpm dev      # la page : http://localhost:5179
pnpm bench    # le banc sur photos de synthèse : écrit results.md
pnpm page     # la page dans un Chrome sans écran (Playwright), seule sur la machine : états et tableaux de chaque méthode
```

`pnpm page` demande `pnpm dev` lancé, Chrome installé et les dépendances de `apps/web` (Playwright y est déjà). Réglages et photo : voir l'en-tête de `scripts/run-page.mjs`.

## La page (`index.html`, `src/main.ts`)

On choisit une photo et tout se lance seul, sans clic, comme le ferait l'application finale. Seuls les réglages de chaque méthode sont à gauche ; en changer un relance le calcul. Les méthodes passent **l'une après l'autre**, chacune seule sur la machine et dans son **bac à sable** : aucun modèle en mémoire quand elle commence, et rien de ce qu'une autre a calculé sur l'image (modèle du papier, objets, seuils). Elle refait donc tout son travail, compté dans son temps ; le chargement de son modèle se compte à part. Seul l'affichage compare : numéros et couleurs suivent les objets de la classique, et les tableaux donnent l'écart à ses cotes.

Ce que le bac à sable ne remet pas à zéro, parce que c'est le navigateur qui le garde : les shaders WebGPU déjà compilés et les poids déjà téléchargés. « SlimSAM + bord recalé », lancé après « SlimSAM », a ainsi une passe 1 de 1,6 s au lieu de 4,3 s. Pour un temps vraiment à froid, lancer la méthode seule dans un navigateur neuf : décocher les autres, ou `pnpm page '{"samOn":false,"isnetOn":false}'`.

1. **Photo** : les outils posés à plat sur une feuille A4 ou Letter. Le format est reconnu seul, au rapport des côtés de la feuille trouvée (cotes mesurées possibles) ; si la photo est trop penchée pour trancher, ou si la feuille n'a ni l'un ni l'autre format, l'état le dit (« INCERTAIN ») au lieu de deviner en silence.
2. **Coins** : détectés automatiquement ; on les glisse sur la vignette pour corriger. D'abord par la clarté de la feuille (plus grande zone claire, quadrilatère, côtés recalés par droites ajustées), ce qui suffit sur une table sombre. Si ce quadrilatère n'a pas ses quatre côtés sur des bords nets (reflet de la table collé à la feuille, table claire), par ses bords : parmi les quadrilatères de droites marquées (Canny, Hough), celui qui ressemble le plus à une feuille, recalé à pleine résolution. Un bon côté de feuille est un bord net, dont le côté clair est dedans, qui s'arrête aux coins, derrière lequel c'est déjà du papier, et qui n'a pas un autre bord net juste derrière lui.
3. **Redressement** à 10 px/mm (0,1 mm par pixel).
4. **Objets** : tous ceux de la feuille d'au moins 20 mm² (réglable), trouvés par chaque méthode pour son compte.
5. **Une colonne par méthode**, côte à côte : l'image redressée, le masque de chaque objet par-dessus, son contour, le rectangle de ses cotes en pointillé et son numéro ; dessous, le tableau (L × l du rectangle d'aire minimale, comme un pied à coulisse, et aire). Un clic sur l'image l'agrandit et y écrit les cotes.
   - **Classique** (défaut) : distance de couleur au papier, dont l'éclairage est une surface quadratique ajustée sur la feuille ; seuil d'Otsu ; morphologie ; bord replacé à mi-hauteur entre papier et objet. Réglages : seuil manuel, ouverture, fermeture, surface minimale.
   - **SlimSAM, 2 passes** (décoché par défaut, comme le suivant : lent et peu fiable sur les vraies photos) : feuille entière (trouver chaque objet), puis fenêtre recadrée autour de chacun (précision) ; WebGPU ou WASM ; fp16, quantifié ou fp32. SAM a besoin de points : la méthode commence par sa propre détection des objets (celle de la chaîne classique, refaite dans son bac à sable et comptée dans son temps, « amorces ») et pose 3 points (réglable) dans chacun, le plus intérieur puis les plus éloignés. Réglages : poids, moteur, points d'amorce, marge de la fenêtre.
   - **SlimSAM + bord recalé** : sa propre détection et son propre passage de SlimSAM (mêmes réglages), puis le bord à mi-hauteur de la méthode classique dans une bande de 1,5 mm (réglable). Se lance ou non à part.
   - **IS-Net** (`onnx-community/ISNet-ONNX`) : modèle de saillance, il détoure « ce qui ressort » de la feuille (sans la table, sinon c'est la feuille qui ressort) et trouve donc les objets **seul**, sans amorce ; chaque composante du masque est un objet. Entrée de 1024 × 1024 px, étirée. Réglages : poids, moteur, seuil du masque, passe 2 recadrée autour de chaque objet (décochée : elle dégrade le résultat, voir plus bas), marge de sa fenêtre.
   - **BiRefNet Lite** (`onnx-community/BiRefNet_lite-ONNX`) : même principe et mêmes réglages ; **décoché, il ne tourne pas dans le navigateur à ce jour** (voir plus bas).
   Les tableaux autres que celui de la classique donnent l'écart de chaque cote à la classique ; un objet d'IS-Net ou de BiRefNet prend le numéro de l'objet de la classique dont il couvre le cœur.

Le panneau « Requêtes réseau » liste chaque origine contactée par la page : il doit n'y avoir que la sienne.

Limites de ce tout-automatique :

- **SlimSAM ne trouve pas les objets seul** : il lui faut la détection de la chaîne classique avant lui ; un objet qu'elle ne voit pas n'est pas tracé par SlimSAM. IS-Net, lui, n'en dépend pas.
- **Un seul point d'amorce ne suffit pas** : posé au cœur du manche du tournevis, il fait parfois garder à SAM le manche sans la tige (96 × 28 mm au lieu de 190 × 28), d'un lancement à l'autre. Avec 3 points répartis dans l'objet, il le garde entier.
- **La passe 2 recadrée dessert IS-Net** : sur une fenêtre autour d'un seul outil, il ne garde plus qu'une partie du tournevis (135 mm au lieu de 190) et perd la clé Allen, alors qu'en une passe sur la feuille il trace les quatre outils.
- **BiRefNet Lite ne tourne pas** avec `onnxruntime-web` 1.31.0-dev (PC à GPU Intel Xe, Chrome) : en WebGPU, les `Split` à 16 et 32 sorties de son décodeur dépassent les 16 tampons permis par shader (« Too many storage buffers in shader »), et cet échec casse aussi les modèles lancés ensuite sur WebGPU ; ces nœuds renvoyés au CPU, c'est la mémoire WASM de 4 Go qui déborde (`std::bad_alloc`), comme en WASM seul. Son entrée est fixée à 1024 × 1024 : on ne peut pas la réduire.
- **Les poids d'IS-Net n'ont pas de licence de leurs auteurs** (vérifié le 2026-10-02, détail dans la note de recherche) : Apache-2.0 ne couvre que le code et la métrique, le jeu DIS5K est réservé à l'usage non commercial, et la question posée aux auteurs (`xuebinqin/DIS` #150) est sans réponse. L'étiquette AGPL-3.0 d'`onnx-community/ISNet-ONNX` et l'étiquette MIT d'`imgly/isnet-general-onnx` viennent de tiers et se contredisent. Bon pour ce banc, **pas embarquable dans le site (MIT) en l'état**.

La page ne fait plus le clic sur un outil, le tableau des cotes au pied à coulisse, l'estimation de la parallaxe ni le gabarit STL : ils sont dans l'historique git (`pocketBlock` et `toStl` restent dans `src/pocket.ts`, vérifiés par le banc).

## Réponse (synthèse, navigateur et 13 vraies photos ; les cotes au pied à coulisse restent à mesurer)

**Oui, tout tient dans le navigateur.** Sur des photos de synthèse (12 MP, sans parallaxe), la chaîne classique tient les cotes à ±0,16 mm dans presque tous les cas, 0,31 mm au pire. La page ne contacte que sa propre origine.

**Mais sur de vraies photos, la méthode la plus fiable du premier coup est IS-Net, pas la classique** (détail ci-dessous) : il trace le bon nombre d'outils sur les 11 photos conformes et rien sur la feuille vide, là où la classique prend une ombre ou un dégradé d'éclairage pour un objet sur 2 photos, et où SlimSAM se trompe sur 8. Ses poids n'ont cependant pas de licence de leurs auteurs : il n'est pas embarquable dans le site en l'état (voir « Limites de ce tout-automatique »).

### Sur de vraies photos (13 photos de trois dépôts open source)

Photos d'outils sur une feuille prises par d'autres, donc dans des conditions qu'on n'a pas choisies : `tracefinity/tracefinity` (`frontend/e2e/fixtures/tool.jpg`), `georgslazdans/outline-app` (`tests/tool.jpg`, `app/instructions/images/paper_on_tble.jpg`) et `SamShmid/gridfinity-tracer` (`gridfinity-tracer-photos/IMG_5132` à `5142`, HEIC convertis en JPEG par ffmpeg). Elles ne sont pas dans ce dépôt. Dix d'entre elles sont sur une table en inox dont les reflets sont aussi clairs que le papier, avec l'ombre du photographe et d'autres outils autour ; les outils vont du manche transparent à l'étui noir. On n'a pas leurs cotes au pied à coulisse : on juge ici le nombre d'objets et la forme, pas le dixième de millimètre.

**La feuille d'abord.** La détection par la clarté ratait la feuille sur 10 photos sur 13 (le reflet de la table et la feuille ne faisaient qu'une zone claire), et tout ce qui suivait était faux. Avec la recherche par les bords, les 13 feuilles sont trouvées, y compris quand on ajoute du bruit à la photo, et le format est reconnu : Letter sur les 10 photos de `gridfinity-tracer`, A4 sur 2, « incertain » sur la tablette lumineuse d'`outline-app` qui n'est pas une feuille (rapport 1,78).

**Le détourage ensuite**, feuille juste (page lancée par Playwright, GPU Intel Xe, une méthode à la fois) :

| Photo | Outils | Classique | SlimSAM | IS-Net |
|---|---|---|---|---|
| Feuille vide | 0 | 0 (60 faux objets avant le garde-fou : voir plus bas) | — | 0 |
| Scie à métaux | 1 | 1 : 222,2 × 93,3 | 1, trop grand de 10 mm (ombre) | 1 : 222,4 × 93,4 |
| Tournevis à manche transparent et embout (5132) | 2 | 2, manche troué et bavé | 2, trop courts de 3 à 6 mm | 2, manche plein et net |
| Tournevis à manche transparent (5133) | 1 | 1 | 1, trop court de 6 mm | 1 |
| Embout seul, ombre du photographe (5134) | 1 | **2 : l'ombre est prise pour un objet** | **la feuille entière** à la place de l'ombre | 1 |
| Pince coupante (5136) | 1 | 1 : 125,6 × 106,0 | 1, une branche seule | 1 : 125,8 × 106,0 |
| Pince coupante (5137) | 1 | 1 | 1 | 1 |
| Pince à bec (5138) | 1 | 1 | 1, coupée de 29 mm | 1 |
| Pince à bec (5139) | 1 | 1 | 1, coupée de 44 mm | 1 |
| Clé USB (5140) | 1 | 1 | 1 | 1 |
| Étui noir (5141) | 1 | **5 : un halo ovale autour de l'étui et les 4 coins de la feuille** | la feuille entière, 5 fois | 1 |
| Jeu de clés Allen (5142) | 1 | 1 | 1 | 1 |

- **IS-Net : bon nombre d'objets sur les 12 photos**, en 1,0 à 1,8 s. Là où la classique a raison aussi, leurs cotes diffèrent de 0,1 à 1,0 mm (jusqu'à 2,5 mm sur le manche transparent et le jeu de clés, dont le bord est flou ou ombré).
- **La classique se trompe quand l'éclairage du papier n'est pas un simple dégradé** : son modèle du papier (une surface quadratique) ne suit ni l'ombre du photographe ni le halo autour d'un objet sombre, et l'écart devient un « objet ». C'est le cas vu de « la feuille prise pour une partie de la forme ». Sur la feuille vide, le seuil d'Otsu coupait dans le bruit du papier (seuil de 1 ou 2, 60 faux objets) : sous un seuil de 8, la chaîne rend maintenant « aucun objet ».
- **SlimSAM est le moins fiable** : il hérite des faux objets de la classique et en fait la feuille entière, et sur un outil juste il n'en garde souvent qu'une partie. 5 à 20 s par photo. Il est décoché par défaut dans la page.
- La treizième photo (`outline-app/tests/tool.jpg`, des outils sur un tapis gris posé sur une tablette lumineuse) n'est pas dans notre protocole ; aucune méthode n'y sépare les outils du tapis.

### Banc de synthèse (`bench.test.ts`, détail dans `results.md`)

Quatre outils aux cotes connues (clé à œil avec trou, tournevis, bloc, clé Allen de 4 mm) posés sur une A4, photographiés par une caméra sténopé, avec flou, bruit et éclairage en dégradé. La vérité tient compte du débord du rendu (`fillPoly`, 0,046 mm par bord), mesuré par le banc.

| Cas | Coins de la feuille | Écart sur les cotes | Écart max du bord | Écart moyen du bord |
|---|---|---|---|---|
| De face | 0,78 px | −0,09 à +0,13 mm | 0,25 mm | 0,008 à 0,035 mm |
| Inclinée de 20° | 0,59 px | −0,09 à +0,11 mm | 0,25 mm | 0,025 à 0,031 mm |
| Inclinée de 30°, tournée de 10°, flou 2 px | 0,62 px | +0,01 à **+0,31** mm | 0,24 mm | 0,005 à 0,037 mm |
| Acier (gris 165) sur papier, dégradé de 30 % | 0,72 px | +0,01 à +0,14 mm | 0,25 mm | 0,030 à 0,042 mm |
| Gris 200 sur papier 236 | 0,59 px | +0,01 à +0,16 mm | 0,21 mm | 0,031 à 0,057 mm |

Deux réglages ont été nécessaires, et le banc les justifie :

- **Papier modélisé, pas une couleur unique.** Avec la médiane du papier comme référence, le dégradé d'éclairage de 30 % faisait prendre le papier sombre pour un objet : le bloc de 60 × 40 sortait à 208 × 97 mm. Une surface quadratique par canal, ajustée sur la feuille en écartant les objets, règle le cas (+0,13 mm).
- **Bord à mi-hauteur.** Le seuil d'Otsu tombe sous la mi-hauteur entre papier et objet et fait gonfler l'objet. Replacer le bord à mi-hauteur (médiane de l'intérieur de l'objet, divisée par deux) retire ce biais ; il ne reste que 0,03 mm d'écart moyen du bord.

La poche (manifold-3d 3.5.4) sort `NoError` avec le volume exact attendu : `CrossSection` (`EvenOdd`), `offset` (demi-pixel, puis jeu), `extrude`, `subtract` suffisent, sans dépendance de plus.

### Dans le navigateur (Chromium sans écran, conteneur sans GPU)

Clé à œil de la photo de synthèse inclinée de 30° (vérité 145,09 × 30,08 mm) :

| Méthode | Cotes trouvées | Écart | Temps |
|---|---|---|---|
| Classique | 145,40 × 30,14 | +0,31 / +0,06 | 1,2 s pour le premier clic (seuil de toute la feuille), puis 0,1 à 0,7 s |
| SlimSAM quantifié, WASM | 145,23 × 29,97 | +0,14 / −0,11 | chargement 3,5 s, passe 1 : 20,6 s, passe 2 : 11,3 s |
| SlimSAM fp32, WASM | 145,11 × 29,88 | +0,02 / −0,20 | chargement 1,6 s, passe 1 : 12,5 s, passe 2 : 12,1 s |
| SlimSAM + bord recalé | 145,40 × 30,14 | comme la classique | + 38 s |
| SlimSAM fp16, WASM | — | — | plus de 10 min : **inutilisable sur CPU** |
| SlimSAM, WebGPU | — | — | plus de 4 min, mais WebGPU est logiciel dans ce conteneur : **à mesurer sur une vraie machine** |

- **Aucun tiers contacté** : les 37 requêtes (59,6 Mo, toutes variantes chargées) vont à la page elle-même. Les chiffres de la classique sont identiques à ceux du banc Node.
- **Sur CPU, fp32 est plus rapide que le quantifié** (12 s contre 21 s pour la passe 1) : la page choisit fp16 en WebGPU et fp32 en WASM. Les threads WASM demandent une page isolée (COOP/COEP) ; ici `crossOriginIsolated` est faux, donc les temps WASM sont sur un seul fil.
- **Sur un PC avec WebGPU** (GPU Intel Xe, Chrome sans écran lancé par `pnpm page`, la même photo, les 4 outils, une méthode à la fois) :

  | Méthode | Temps pour les 4 outils | Chargement du modèle | Écart des cotes à la classique |
  |---|---|---|---|
  | Classique | 1,2 à 1,5 s | — | — |
  | SlimSAM fp16, WebGPU | 11,4 à 13,1 s (amorces : 1,6 à 2,2 s ; passe 1 : 3,1 à 3,7 s ; passe 2 : 6,7 à 7,1 s, soit 1,7 s par outil) | 1,9 à 2,3 s | −0,36 à −0,05 mm |
  | SlimSAM + bord recalé, seul dans un navigateur neuf | 15,6 s (amorces : 1,5 s ; passe 1 : 4,3 s ; passe 2 : 7,1 s ; recalage : 2,7 s) | 2,0 s | 0 à +0,06 mm |
  | IS-Net fp16, WebGPU, une passe | **1,4 s** | 1,7 s | +0,07 à +0,30 mm |
  | IS-Net fp32, WASM (page isolée, threads), une passe | 5,6 s | 1,9 s | +0,07 à +0,30 mm |
  | BiRefNet Lite | ne tourne pas | — | — |

  IS-Net trouve les quatre outils sans amorce, en un temps proche de la classique ; son contour déborde de 0,15 mm par bord au plus. Dans un onglet ouvert à la main, les temps de la classique et de SlimSAM ont varié du simple au triple d'un lancement à l'autre (onglet en arrière-plan) : mesurer avec `pnpm page`.
- Le serveur de dev sert la page **isolée** (COOP/COEP, `vite.config.ts`) : `crossOriginIsolated` est vrai et le WASM d'ORT a ses threads. Les temps WASM du tableau plus haut (conteneur) restent ceux d'un seul fil.
- **SAM n'apporte rien sur une photo propre** : la classique est déjà à ±0,3 mm, en 50 fois moins de temps et sans 20 à 40 Mo de modèle. On attendait son intérêt sur les vraies photos difficiles (reflets, ombres, objet de la couleur du fond) : il n'y est pas non plus, voir « Sur de vraies photos ».

### Ce qui reste à mesurer : les cotes, au pied à coulisse

Les 13 vraies photos disent quelle méthode trouve les bons objets ; elles ne disent pas à combien de dixièmes près, faute de cotes mesurées, ni ce que coûte la parallaxe d'un outil épais. Protocole avec la page :

1. 5 à 8 outils (clé plate, tournevis, pince, objet brillant, objet sombre, objet épais), 3 ou 4 cotes au pied à coulisse chacun.
2. Pour chaque condition (fond clair ou sombre, rétroéclairage, de près ou de loin avec zoom, scanner), une photo : la page trace chaque outil avec chaque méthode ; comparer les cotes des tableaux à celles du pied à coulisse.
3. Noter les écarts dans `RESULTS.md`, avec l'épaisseur h et la distance d pour chaque outil épais : la parallaxe Δ = r·h/(d−h), r étant la distance au centre de la photo, dit si l'écart s'explique par elle.
4. Imprimer un gabarit ajouré (2 mm, jeu 0,5) des outils les plus mal tracés : l'outil y entre-t-il, et avec quel jeu ? (Le gabarit STL n'est plus dans la page : `pocketBlock` de `src/pocket.ts`.)
5. Mesurer le temps de SlimSAM en WebGPU sur un portable et un téléphone (ligne d'état du panneau SlimSAM).

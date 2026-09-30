# Recherche : contour d'objet hors ligne pour les shadowbox

> Date : 2026-09-30. Ticket : #36. Objectif : trouver quelle chaîne photo → contour en mm donne un contour exact à ±0,5 mm, **dans le navigateur, sans serveur**, et quelle mise en place demander à l'utilisateur. Aucune image ne doit quitter la machine.
> Légende : **[V]** = vérifié dans une source primaire (code, fichier de licence, fiche de modèle, paquet publié, spec) · **[I]** = inféré, à confirmer par le prototype ou par une mesure.
> Terme du glossaire : **shadowbox** (voir `CONTEXT.md`). « Détourage » désigne ici l'étape photo → masque de l'objet ; « contour » le polygone en mm qui en sort.

## Sources primaires

| Id | Source | Détail |
|----|--------|--------|
| T1 | Dépôt `tracefinity/tracefinity`, commit `13a00d3151ff` (2026-09-21), dernier tag `0.9.4` | `LICENSE` (MIT), `README.md`, `docs/usage/tracing.md`, `backend/app/services/{ai_tracer,image_processor,tracer_registry,polygon_scaler}.py`, `backend/app/constants.py` |
| T2 | `https://tracefinity.net/` et `/privacy` (« Last updated: 13 February 2026 »), lus le 2026-09-30 | service hébergé |
| T3 | Dépôt `tensornext/tooltrace-designer`, commit `6218bd882512` | `LICENSE` (MIT), `README.md`, `docs/REVERSE_ENGINEERING.md`, `src/lib/segment/{classical,sam}.ts`, `src/lib/warp.ts` |
| T4 | Dépôt `SamShmid/gridfinity-tracer`, commit `fe63b90fb810` | `LICENSE` (MIT), `README.md` (pipeline, modèles, vitesse, « Accuracy ») |
| T5 | Dépôt `georgslazdans/outline-app`, commit `afcdd9b5bc70` | `LICENSE` (AGPL-3.0), `package.json`, `lib/opencv/processor/*` |
| T6 | Dépôt `themightyjables/Trace3D`, commit `e4f0a11444e3` | `readme.md`, `index.html` (pas de fichier de licence) |
| T7 | Dépôt `exostasis/gridfinityTrace`, commit `2ae7f0fbcc8e` (2025-11-25) | `pages/svgTracing.py` (pas de fichier de licence) |
| T8 | `https://www.tooltrace.ai/`, lu le 2026-09-30 | page d'accueil et tarifs |
| T9 | `docs/research/generateurs-de-bacs.md` (ce dépôt) | module **Cutout** de gridfinitygenerator.com |
| O1 | `opencv/opencv`, tags `4.14.0` et `5.0.0` : `platforms/js/opencv_js.config.py`, `platforms/js/build_js.py` ; `LICENSE` aux tags `4.4.0` et `4.5.0` | liste blanche des fonctions exportées en JS |
| O2 | `https://docs.opencv.org/4.13.0/opencv.js` téléchargé le 2026-09-30 (`/4.x/` redirige vers `4.13.0` ; `/4.14.0/` et `/5.0.0/` répondent 404) | 10 964 323 octets ; WASM embarqué en base64 extrait : 8 053 876 octets |
| O3 | Registre npm, lu le 2026-09-30 : `@techstark/opencv-js@5.0.0-release.1`, `@opencvjs/web@5.0.0-release.2`, `js-aruco2@2.0.0` | licences, tailles des tarballs |
| H1 | API Hugging Face `api/models/<id>` et `tree/main/onnx`, lue le 2026-09-30 (sha entre parenthèses) | `Xenova/slimsam-77-uniform` (`5850ab4`), `Xenova/slimsam-50-uniform` (`3959c85`), `onnx-community/sam2.1-hiera-tiny-ONNX` (`814a066`), `onnx-community/sam2.1-hiera-small-ONNX` (`a7df49d`), `onnx-community/sam3-tracker-ONNX` (`429305c`), `onnx-community/ISNet-ONNX` (`3fe6e3d`), `imgly/isnet-general-onnx` (`440dea9`), `onnx-community/BiRefNet_lite-ONNX` (`de15b22`), `briaai/RMBG-1.4` (`2ceba5a`), `briaai/RMBG-2.0` (`5df4c9c`) ; Space `yunyangx/EfficientSAM` |
| H2 | `preprocessor_config.json` de `Xenova/slimsam-77-uniform` et de `onnx-community/sam2.1-hiera-tiny-ONNX` | taille d'entrée du modèle |
| L1 | Fichiers `LICENSE` sur la branche par défaut, lus le 2026-09-30 | `facebookresearch/segment-anything`, `facebookresearch/sam2`, `facebookresearch/sam3`, `czg1225/SlimSAM`, `ChaoningZhang/MobileSAM`, `yformer/EfficientSAM`, `xuebinqin/DIS` (+ `README.md` l. 170), `xuebinqin/U-2-Net`, `ZhengPeng7/BiRefNet`, `danielgatis/rembg` |
| L2 | `facebookresearch/segment-anything`, `segment_anything/modeling/sam.py` l. 94 | « shape BxCxHxW, where H=W=256 » (masques basse résolution) |
| R1 | `danielgatis/rembg`, `rembg/sessions/{dis_general_use,birefnet_general,u2netp}.py` | taille d'entrée des modèles utilisés par Tracefinity |
| X1 | `@huggingface/transformers@4.3.0` (npm, publié le 2026-09-16) : `README.md`, `package.json`, `dist/transformers.web.js` | `env` l. 132-146 ; chemins WASM l. 8731-8741 ; `post_process_masks` l. 17346-17374 |
| X2 | `onnxruntime-web@1.30.0` (npm, publié le 2026-09-14) : `README.md` (tableau de compatibilité), `package.json` (`exports`), `dist/*.wasm` | |
| X3 | `https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html`, lu le 2026-09-30 | import `onnxruntime-web/webgpu` |
| W1 | `@mdn/browser-compat-data@8.1.3` (2026-09-24), entrée `api.GPU` | prise en charge de WebGPU par navigateur |
| W2 | MDN, « Storage quotas and eviction criteria » (modifiée le 2026-01-05) | Cache API, `navigator.storage.persist()`, règle des 7 jours de Safari |
| M1 | `manifold-3d@3.5.4` (version épinglée dans `packages/geometry/package.json`), tarball npm : `manifold-encapsulated-types.d.ts`, `manifold-global-types.d.ts`, `manifold.js` | API `CrossSection` |

---

## Résumé

1. **Tracefinity ne dépend plus de Gemini.** Au commit `13a00d3` (T1), le détourage par défaut est un modèle de saillance **local côté serveur** (IS-Net via `rembg`, ONNX Runtime CPU), avec BiRefNet Lite et InSPyReNet en option ; Gemini (`gemini-3.1-flash-image-preview` par défaut), Replicate et fal ne servent que si une clé est fournie [V]. Dans tous les cas le calcul se fait **sur un serveur Python** (FastAPI + OpenCV) et jamais dans le navigateur [V]. Le rôle exact de l'IA : produire un **masque noir et blanc** de la photo déjà redressée ; échelle, contour (`findContours`), lissage, jeu et CAO sont de la géométrie classique [V]. L'hypothèse du ticket (« Tracefinity envoie la photo à Gemini ») n'est vraie qu'en option.
2. **Deux outils libres font déjà presque exactement notre piste 1 + 2 dans le navigateur.** `tooltrace-designer` (MIT, T3) : feuille A4/Letter, homographie, segmenteur classique au clic dans un Web Worker (« well under a second »), et **SlimSAM via transformers.js** en option (« ~40 MB download ») [V]. `outline-app` (AGPL-3.0, T5) : OpenCV.js (`@techstark/opencv-js`), seuillage adaptatif, `findContours`, `approxPolyDP` [V]. On peut s'en inspirer ; on ne peut pas copier le code d'`outline-app` (AGPL) dans un projet MIT [I].
3. **OpenCV.js suffit pour la piste 1, ArUco compris.** La liste blanche officielle (4.14.0 et 5.0.0) exporte `getPerspectiveTransform`, `warpPerspective`, `findHomography`, `threshold` (Otsu est un drapeau de `threshold`), `adaptiveThreshold`, `findContours`, `approxPolyDP`, `grabCut`, `IntelligentScissorsMB` (lasso magnétique) **et `aruco_ArucoDetector`** [V O1]. `cornerSubPix` n'y est pas [V]. Poids : `opencv.js` officiel 4.13.0 = **10,96 Mo** (3,54 Mo en gzip), WASM inclus en base64 [V O2]. Licence **Apache-2.0 depuis 4.5.0** (BSD-3 avant) [V O1].
4. **Le modèle local le plus léger qui convienne est SlimSAM-77** (Apache-2.0) : **13,8 Mo** en quantifié (encodeur 8,9 + décodeur 4,9), 20,8 Mo en fp16, 39,9 Mo en fp32, prêt pour transformers.js (`Xenova/slimsam-77-uniform`) [V H1, L1]. SAM 2.1 tiny (Apache-2.0) pèse **33,6 Mo** en q4f16 et 62 Mo en int8 [V H1]. MobileSAM et EfficientSAM (Apache-2.0) n'ont **pas** de dépôt transformers.js publié par leurs auteurs ni par `Xenova`/`onnx-community` [V absence dans la recherche H1]. **SAM 3** est exclu : encodeur ≥ 296 Mo et licence propre « SAM License » [V]. **RMBG-1.4 et 2.0 sont non commerciaux** [V]. IS-Net a une licence ambiguë (code Apache-2.0, jeu d'entraînement DIS5K sous conditions d'usage à part, conversion `onnx-community` étiquetée AGPL-3.0) [V].
5. **La résolution de SAM est le vrai plafond de précision.** SAM/SlimSAM redimensionnent l'image à **1024 px** de grand côté et le décodeur sort des masques de **256 × 256** interpolés bilinéairement jusqu'à la taille d'origine [V H2, L2, X1]. Sur une feuille A4 entière, cela fait **0,29 mm par pixel d'entrée** et **1,16 mm par pixel de masque**. Pour tenir ±0,5 mm, il faut soit recadrer autour de l'objet avant l'encodage (ce que fait `gridfinity-tracer` : « 3 to 5x more pixels per mm » [V T4]), soit affiner le bord du masque par une méthode classique à pleine résolution [I].
6. **La parallaxe domine l'erreur des objets épais, pas la résolution.** Un bord supérieur à la hauteur h, vu d'une distance d, sort de r·h/(d−h), où r est sa distance au centre optique. Pour un outil de 20 mm d'épaisseur photographié à 50 cm, cela fait **+4,2 % de r**, soit 4,2 mm à 100 mm du centre (§ 6.2). ±0,5 mm à 100 mm du centre exige d ≥ 2 m pour h = 10 mm. Il faut donc : un objet centré dans l'image, une photo de loin avec zoom, un tracé pris à la base de l'objet, ou une correction explicite par la hauteur. Un **scanner à plat** (0,085 mm/px à 300 dpi) n'a pas cette parallaxe dans le sens du défilement [V calcul ; I optique du scanner].
7. **WebGPU est disponible presque partout, mais pas partout.** Chrome/Edge 113+ (ChromeOS, macOS, Windows ; Linux avec GPU Intel Gen12+ depuis 144), Chrome Android 121+, **Safari 26 (macOS et iOS)**, Firefox 141+ sur Windows seulement (macOS Apple Silicon depuis 145/147, pas Linux, pas Android) [V W1]. transformers.js 4.3.0 choisit `device: 'webgpu'` ou WASM ; par défaut il télécharge les modèles depuis `huggingface.co` et le runtime WASM (26,8 Mo, 6,6 Mo en gzip) depuis **jsDelivr**, puis les garde dans le **Cache API** (`transformers-cache`) [V X1, X2]. Pour qu'aucune requête ne sorte vers des tiers, il faut héberger modèle et WASM sur notre propre origine [I].
8. **manifold-3d 3.5.4 couvre toute la géométrie en aval sans nouvelle dépendance** : `new CrossSection(polygons, fillRule)`, `offset(delta, joinType = "Round", miterLimit = 2, circularSegments = 0)` (Clipper2), `simplify(epsilon = 1e-6)`, `extrude(height, …)` et `Manifold.subtract` [V M1]. C'est conforme à l'ADR 0004.

---

## 1. Outils existants de shadowbox par photo

### 1.1 Tracefinity (T1, T2)

| Élément | Constat | Statut |
|---|---|---|
| Nature | application web **auto-hébergée** (Docker, Helm, sources) et service hébergé `tracefinity.net` (« 10 free traces to get started ») | [V] T1 README, T2 |
| Licence | MIT, « Copyright (c) 2024 Tracefinity Contributors » | [V] T1 `LICENSE` |
| Pile technique | backend Python/FastAPI, OpenCV, manifold3d, ONNX Runtime ; frontend Next.js 16 / React 19 / react-three-fiber | [V] T1 README |
| Mise en place utilisateur | outils posés sur une feuille A4, Letter, A3 ou Tabloid (ils peuvent dépasser), photo de dessus, ajustement des 4 coins de la feuille | [V] T1 README « How It Works » |
| Détection de la feuille | modèle **U²-Net portable** (`u2netp`, entrée 320 × 320) pour un masque grossier des outils, puis OpenCV (seuils de luminosité multiples, Canny, `approxPolyDP`, seuil adaptatif) ; repli OpenCV seul sans ONNX | [V] `image_processor.py` l. 111-135, 177-345 ; R1 `u2netp.py` |
| Redressement | `getPerspectiveTransform` des 4 coins vers un rectangle à **`PX_PER_MM = 10`** (0,1 mm/px), image redressée étendue au-delà de la feuille (jusqu'à 3 × sa taille) | [V] `image_processor.py` l. 14, 377-425 |
| Détourage par défaut | **IS-Net** `isnet-general-use` via `rembg` (entrée **1024 × 1024**), sur la zone de la feuille recadrée (« saliency models pick the most salient object; on the full corrected image that is the bright paper ») | [V] README, `tracer_registry.py`, `ai_tracer.py` l. 370-376, R1 |
| Autres détoureurs locaux | BiRefNet Lite (`birefnet-general-lite`, entrée 1024 × 1024, 8 Go de RAM mini), InSPyReNet (6 Go) ; vitesses CPU annoncées 0,8 / 3,6 / 2,8 s | [V] README « Tracing Modes » ; R1 |
| Détoureurs distants | **Gemini** (`GOOGLE_API_KEY`, modèle `gemini-3.1-flash-image-preview` par défaut, `gemini-3-pro-image-preview` dans l'image Docker), OpenRouter, **Replicate** et **fal.ai** (BiRefNet hébergé) | [V] README, `tracing.md`, `remote_saliency.py` |
| Ce que fait Gemini | modèle **générateur d'image** : on lui envoie la photo redressée (réduite à 2048 px max « to keep output in the 1K/2K pricing tier ») avec un prompt « Create a black and white mask of this image… EXACTLY {width}x{height} pixels… Trace the actual edges of each object, NOT the shadow edges » ; il renvoie une image masque. Pour `gemini-2.5-flash-image`, qui ne respecte pas les dimensions, un recalage par corrélation (`matchTemplate`) est ajouté | [V] `ai_tracer.py` l. 24-72, 440-459, 616-617 |
| Masque → polygone | `threshold` à 127, `findContours(RETR_CCOMP, CHAIN_APPROX_SIMPLE)` (trous intérieurs conservés, p. ex. clés à œil) | [V] `ai_tracer.py` l. 597-625 |
| Lissage | Douglas-Peucker à tolérance absolue **0,3 à 1,5 mm** (« trace noise is a property of the camera/mask resolution, not the tool »), Chaikin optionnel (coin droit tenu à ~0,4 mm) | [V] `polygon_scaler.py` l. 10-21 |
| Mode manuel | télécharger l'image redressée, la donner à Gemini dans le navigateur, renvoyer le masque | [V] README |
| Service hébergé | « To process your images for tool tracing (processed locally on our servers) » ; sous-traitants cités : Stripe et DigitalOcean. Le modèle utilisé n'est pas nommé | [V] T2 privacy ; modèle [I] |

**Conclusion** : Tracefinity n'est pas une solution « navigateur ». Il valide en revanche la chaîne « feuille connue → homographie → masque → `findContours` → Douglas-Peucker → offset », et montre que le seul maillon « IA » est le masque binaire.

### 1.2 Autres outils

| Outil | Licence | Où tourne le détourage | Méthode | Statut |
|---|---|---|---|---|
| **tooltrace.ai** (T8) | propriétaire, Free (3 tracés actifs) / Pro 8 $/mois | serveur [I] | feuille 8,5 × 11 in, « AI-powered outline detection » ; le dépôt `tooltrace-designer` suppose un modèle de type SAM côté serveur | [V] T8 ; méthode [I] |
| **tooltrace-designer** (T3) | MIT | **navigateur** (Web Worker) | coins de la feuille détectés automatiquement (Otsu → plus grande composante claire → enveloppe convexe → quadrilatère d'aire max), homographie DLT à 4 points maison, image redressée à **4 px/mm** (plafonnée à ~6 MP), photo réduite à 2400 px. Détourage **classique** par défaut (distance à la couleur du papier, ouverture/fermeture morphologique, composante sous le clic, clics négatifs, remplissage des trous) ; **SlimSAM** (`Xenova/slimsam-77-uniform`, transformers.js 3.7.0 chargé depuis jsDelivr) en option, repli sur le classique s'il ne se charge pas. Offsets Clipper (`clipper-lib`), jeu 0,5/1/2 mm. Aucun code OpenCV | [V] `README.md`, `REVERSE_ENGINEERING.md`, `classical.ts`, `sam.ts`, `warp.ts` l. 35 |
| **outline-app** (T5) | **AGPL-3.0** | navigateur | OpenCV.js (`@techstark/opencv-js` ^4.9.0), étapes flou, seuil adaptatif, Canny, morphologie, `findContours`, `approxPolyDP`, `getPerspectiveTransform`/`warpPerspective` ; mode sans feuille pour images scannées ; CAO par `replicad` | [V] |
| **Trace3D** (T6) | aucun fichier de licence | navigateur, un seul HTML | **tracé manuel** au clic (pas de détourage automatique) ; les 4 coins de la feuille pour l'homographie ; conseils : fond sombre, photo « from arm's length or farther », tracer les objets hauts « where they meet the paper » | [V] ; « accurate to within about 0.1% in testing » est une affirmation du README [V citation, I valeur] |
| **gridfinity-tracer** (T4) | MIT | serveur local (Docker) | SAM 2.1 Hiera-Tiny (ONNX, ~155 Mo) pour la feuille et le clic, IS-Net pour la détection automatique, **passe de raffinement recadrée** (3 à 5 × plus de px/mm), homographie à 4 px/mm, lissage gaussien σ = 1 mm, jeu + 0,2 mm de compensation. Vitesses sur Apple M5, CPU : feuille < 1 s, IS-Net ~3 s, SAM ~1 s d'encodage puis ~50 ms par clic | [V] README |
| **gridfinityTrace** (T7) | aucun fichier de licence | serveur (Streamlit) | planche de **marqueurs ArUco** (`cv2.aruco.GridBoard`) pour l'échelle et la perspective, GroundingDINO + SAM pour le masque, `findContours`, export SVG en mm | [V] `svgTracing.py` l. 13-15, 63-80, 229-253 |
| **gridfinitygenerator.com « Cutout »** (T9) | propriétaire | navigateur | pas de photo : **import d'un STL** soustrait d'un bac plein | [V] T9 |

---

## 2. Piste 1 : vision classique avec OpenCV.js

### 2.1 Fonctions disponibles dans la version JS par défaut

La version JS n'exporte que les fonctions de la liste blanche `platforms/js/opencv_js.config.py` [V O1]. Présence vérifiée aux tags 4.14.0 et 5.0.0, et par les symboles du WASM de la 4.13.0 officielle (O2) :

| Besoin | Fonction | Présente | Statut |
|---|---|---|---|
| Homographie depuis 4 coins | `getPerspectiveTransform` ; `findHomography` (≥ 4 points, RANSAC) | oui | [V] O1 imgproc, calib3d |
| Redressement | `warpPerspective`, `perspectiveTransform` | oui | [V] |
| Seuil global / Otsu | `threshold` (Otsu = drapeau `THRESH_OTSU`) | oui | [V] fonction ; drapeau [I] (constante non vérifiée dans le build) |
| Seuil adaptatif | `adaptiveThreshold` | oui | [V] |
| Contours | `findContours`, `contourArea`, `arcLength`, `drawContours` | oui | [V] |
| Douglas-Peucker | `approxPolyDP` (et `approxPolyN`) | oui | [V] |
| Morphologie, flous, Canny, Hough | `morphologyEx`, `GaussianBlur`, `bilateralFilter`, `Canny`, `HoughLinesP` | oui | [V] |
| Détourage interactif classique | **`grabCut`**, **`segmentation_IntelligentScissorsMB`** (lasso magnétique), `watershed`, `floodFill` | oui | [V] |
| Raffinement sous-pixel des coins | `cornerSubPix` | **non** (absent de la liste blanche) | [V] |
| ArUco | `aruco_ArucoDetector` (`detectMarkers`, `refineDetectedMarkers`), `aruco_GridBoard`, `aruco_CharucoDetector`, `getPredefinedDictionary`, `generateImageMarker` | **oui**, dans le module `objdetect` du build par défaut | [V] O1 ; symbole `ArucoDetector` présent dans le WASM 4.13.0 [V] O2 |

### 2.2 Poids, paquets, licence

| Artefact | Version | Taille | Licence | Statut |
|---|---|---|---|---|
| `opencv.js` officiel (`docs.opencv.org/4.13.0/opencv.js`) | 4.13.0 | 10 964 323 o, **3,54 Mo en gzip -9** ; un seul fichier, WASM (8,05 Mo) en base64 dedans | Apache-2.0 | [V] O2 ; le lien `/4.x/` y redirige ; pas de build publié pour 4.14.0 ni 5.0.0 à cette date [V] |
| `@techstark/opencv-js` | 5.0.0-release.1 (2026-06-24) | `dist/opencv.js` 13 298 869 o ; tarball décompressé 14,7 Mo avec types TypeScript | Apache-2.0 | [V] O3 |
| `@opencvjs/web` | 5.0.0-release.2 (2026-06-25) | `lib/opencv_js.js` 13 312 208 o ; fonction `loadOpenCV()` | Apache-2.0 | [V] O3 |
| Build sur mesure | `build_js.py --build_wasm --config <liste>` (et `--disable_single_file`, `--simd`, `--threads`) | plus petit si on ne garde qu'imgproc + aruco [I, gain à mesurer] | Apache-2.0 | [V] options O1 `build_js.py` l. 246-265 |

- **Licence** : `LICENSE` est le texte **Apache License 2.0** au tag 4.5.0 et au-delà ; au tag 4.4.0 c'était la licence BSD-3 d'Intel (« By downloading, copying, installing or using… ») [V O1]. Apache-2.0 est compatible avec un projet MIT à condition de redistribuer la notice et la licence (à ajouter dans `ATTRIBUTIONS.md`) [I].
- **Alternatives plus légères** :
  - **Sans OpenCV** : `tooltrace-designer` fait homographie DLT, rectification, morphologie, remplissage de trous, suivi de contour (Moore), RDP et Chaikin en ~1 200 lignes de TypeScript (`src/lib/*.ts`, `segment/*.ts`) [V T3]. C'est faisable chez nous en quelques centaines de lignes sans dépendance, la seule fonction coûteuse à réécrire étant un bon détecteur de coins [I].
  - **`js-aruco2`** 2.0.0 (MIT, 424 Ko décompressé) pour les seuls marqueurs ArUco [V O3 ; qualité I].
  - `opencv.js` du paquet npm `opencv.js` (2017) et `opencv-wasm` (2021, 4.3.0, BSD-3) sont trop anciens [V dates O3].

### 2.3 Chaîne type et limites connues

1. Détecter la feuille : seuil (Otsu) ou Canny → plus grand quadrilatère (`approxPolyDP` à ~2 % du périmètre, c'est ce que fait Tracefinity) → l'utilisateur corrige les coins à la souris [V T1, T3].
2. `getPerspectiveTransform` vers un rectangle aux dimensions de la feuille à k px/mm, puis `warpPerspective` de toute la photo (les objets peuvent dépasser la feuille) [V T1, T3].
3. Séparer l'objet : Otsu si le contraste est franc, `adaptiveThreshold` si l'éclairage varie, distance à la couleur du papier (T3) ; morphologie ; composante sous le clic ; `grabCut` ou `IntelligentScissorsMB` pour les cas durs [I].
4. `findContours` (avec hiérarchie pour les trous), puis Douglas-Peucker à tolérance **absolue en mm** (Tracefinity : 0,3 mm au minimum) [V T1].

Échecs connus (documentés par les projets) : **outils argentés sur papier blanc** (« hard for plain contrast », T4), **reflets et pièces transparentes**, **outils très fins**, **outils qui se touchent** (fusionnés en un contour) [V T1 `tracing.md`, T4]. L'ombre portée est l'autre source classique d'erreur d'un seuillage [I] : le rétroéclairage la supprime.

---

## 3. Piste 2 : segmentation par IA locale

### 3.1 Modèles candidats

Tailles lues dans les dépôts Hugging Face (H1), en Mo décimaux. « Encodeur » = ce qui tourne une fois par image ; « décodeur » = ce qui tourne à chaque clic.

| Modèle | Licence (source) | Dépôt ONNX prêt pour le web | fp32 (enc + déc) | fp16 | quantifié | Statut |
|---|---|---|---|---|---|---|
| **SlimSAM-77** (SAM élagué, 9,1 M paramètres selon ses auteurs) | Apache-2.0 (`czg1225/SlimSAM` `LICENSE` ; fiche `license: apache-2.0`) | `Xenova/slimsam-77-uniform`, bibliothèque `transformers.js` | 23,3 + 16,6 = **39,9** | 12,2 + 8,6 = **20,8** | 8,9 + 4,9 = **13,8** | [V] H1, L1 |
| SlimSAM-50 | Apache-2.0 | `Xenova/slimsam-50-uniform` | 96,2 + 16,6 = 112,8 | 48,6 + 8,6 = 57,2 | 30,1 + 4,9 = 35,0 | [V] |
| **SAM 2.1 Hiera-Tiny** | Apache-2.0 (`facebookresearch/sam2` `LICENSE`) ; le dépôt ONNX n'a pas de fiche | `onnx-community/sam2.1-hiera-tiny-ONNX` (graphe + `.onnx_data`) | 134,5 + 21,2 = 155,7 | 67,3 + 10,7 = 78,0 | int8 : 53,0 + 9,0 = 62,0 ; q4f16 : 28,8 + 4,8 = **33,6** | [V] H1, L1 |
| SAM 2.1 Hiera-Small | Apache-2.0 | `onnx-community/sam2.1-hiera-small-ONNX` | 163,0 + 21,2 = 184,2 | 81,6 + 10,7 = 92,3 | q4f16 : 32,9 + 4,8 = 37,7 | [V] |
| SAM 3 (tracker) | **« SAM License »** propre à Meta (2025-11-19), dépôt `facebook/sam3` à accès contrôlé | `onnx-community/sam3-tracker-ONNX` | 1 870 + 22 | 936 + 11 | q4f16 : 297 + 5 | [V] ; **exclu** (poids) |
| MobileSAM | Apache-2.0 (`ChaoningZhang/MobileSAM`) | aucun dépôt transformers.js ; dépôts ONNX communautaires sans garantie ; le script officiel `export_onnx_model.py` exporte le décodeur SAM | — | — | — | [V] licence ; export [I] |
| EfficientSAM | Apache-2.0 (`yformer/EfficientSAM`) | ONNX dans le Space `yunyangx/EfficientSAM` : Ti = 24,8 + 16,6 = 41,4 ; S = 89,6 + 16,6 = 106,2 ; pas de dépôt transformers.js | 41,4 (Ti) | — | — | [V] |
| U²-Net / U²-Netp (saillance, pas de clic) | Apache-2.0 (`xuebinqin/U-2-Net`) | via `rembg` (entrée 320 × 320) | — | — | — | [V] L1, R1 |
| IS-Net `isnet-general-use` (saillance) | code Apache-2.0 (`xuebinqin/DIS`), mais « Terms of use for our DIS5K dataset » à part (`README.md` l. 170) ; `onnx-community/ISNet-ONNX` étiqueté **AGPL-3.0**, `imgly/isnet-general-onnx` étiqueté MIT | `onnx-community/ISNet-ONNX` (transformers.js, pipeline `background-removal`) | 176,1 | 88,1 | 44,3 | [V] ; licence **ambiguë** |
| BiRefNet Lite (saillance) | MIT (`ZhengPeng7/BiRefNet` ; fiche `license: mit`) | `onnx-community/BiRefNet_lite-ONNX` | 224,0 | 114,5 | — | [V] |
| RMBG-1.4 (BRIA) | `bria-rmbg-1.4` : « available as a source-available model for non-commercial use » | `briaai/RMBG-1.4` | 176,2 | 88,2 | 44,4 | [V] ; **exclu** (non commercial) |
| RMBG-2.0 (BRIA) | `bria-rmbg-2.0` → **CC BY-NC 4.0**, accès contrôlé : « open source for non commercial use only » | `briaai/RMBG-2.0` | 1 024,3 | 513,6 | q4f16 : 233,8 | [V] ; **exclu** |

Les modèles de **saillance** (U²-Net, IS-Net, BiRefNet, RMBG) détourent « l'objet le plus saillant » sans clic : Tracefinity doit recadrer sur la feuille pour que ce ne soit pas la feuille elle-même [V T1]. Les modèles **SAM** détourent ce qu'on désigne par un clic, ce qui colle à l'UX « cliquer sur chaque outil » [V T3, T4].

Temps d'inférence : aucun chiffre **navigateur** de première main n'a été trouvé pour ces modèles. Chiffres publiés par les auteurs, hors navigateur : MobileSAM « around 12ms per image: 8ms on the image encoder and 4ms on the mask decoder » sur un GPU [V `MobileSAM/README.md` l. 36] ; `gridfinity-tracer`, SAM 2.1 tiny en ONNX CPU sur Apple M5 : ~1 s d'encodage, ~50 ms par clic [V T4]. `tooltrace-designer` parle de « a few seconds of compute per image » pour SlimSAM dans le navigateur [V T3, valeur I]. **À mesurer dans le prototype.**

### 3.2 Résolution des masques et précision en mm

- **SlimSAM / SAM (transformers.js)** : `SamImageProcessor` avec `size.longest_edge = 1024`, remplissage jusqu'à 1024 × 1024 [V H2]. Le décodeur produit des logits de **256 × 256** (« H=W=256 ») [V L2]. `post_process_masks` les interpole **bilinéairement** à 1024 × 1024, recadre, réinterpole à la taille d'origine puis seuille à 0 [V X1 l. 17346-17374]. Le bord est donc un seuil sur une grille de 256 px lissée, et non un bord mesuré au pixel.
- **SAM 2.1 (transformers.js)** : `Sam2ImageProcessorFast` avec `size = 1024 × 1024` (redimensionnement **non homogène** : une photo 4:3 est écrasée) et `mask_size = 256 × 256` [V H2].
- **IS-Net et BiRefNet (rembg)** : entrée redimensionnée à 1024 × 1024 [V R1].

Taille d'un pixel pour une feuille A4 (297 × 210 mm) qui remplit toute l'entrée [V calcul] :

| Étape | Grand côté (297 mm) | Petit côté (210 mm) |
|---|---|---|
| Entrée de l'encodeur SAM, 1024 px | **0,290 mm/px** | 0,290 (SAM 1, homogène) ; 0,205 (SAM 2, étiré) |
| Grille du masque, 256 px | **1,16 mm/px** | 0,82 mm/px (SAM 2) |
| Image redressée de Tracefinity (10 px/mm) | 0,10 mm/px | 0,10 mm/px |
| Envoi à Gemini, 2048 px max | ≥ 0,145 mm/px | ≥ 0,145 mm/px |
| Image redressée de `tooltrace-designer` et de `gridfinity-tracer` (4 px/mm) | 0,25 mm/px | 0,25 mm/px |

Conséquences [I] :

- SAM sur la feuille entière ne peut pas garantir ±0,5 mm : un pixel de masque fait plus que la tolérance. L'interpolation bilinéaire des logits donne un bord sous-pixel, mais sa justesse n'est pas garantie et **doit être mesurée**.
- En **recadrant** autour de l'objet avant l'encodage (boîte englobante + marge), la résolution suit la taille de l'objet : un outil de 200 mm donne ~0,2 mm/px en entrée et ~0,8 mm/px de masque ; un outil de 100 mm, ~0,1 et ~0,4. C'est la « zoom-in pass » de `gridfinity-tracer` [V T4].
- Une approche **hybride** est plausible : SAM pour *quel* objet (topologie, régions sombres ou brillantes), puis bord recalé à pleine résolution par seuil local ou gradient dans une bande de quelques pixels autour du masque SAM.

---

## 4. Exécution dans le navigateur

### 4.1 transformers.js et ONNX Runtime Web

| Point | Constat | Statut |
|---|---|---|
| Version | `@huggingface/transformers` **4.3.0** (2026-09-16), Apache-2.0 ; dépend de `onnxruntime-web` `1.31.0-dev.20260914` | [V] X1, O3 |
| Architectures SAM | README : « Segment Anything », « Segment Anything 2 », « Segment Anything 3 » ; SlimSAM passe par l'architecture SAM (`SamModel`) | [V] X1 README l. 415-417 ; T3 `sam.ts` |
| Backends | `device: 'webgpu'` (fp32 par défaut en WebGPU), sinon WASM ; `dtype` `fp32`/`fp16`/`q8`… ; WebNN aussi listé | [V] X1 README l. 103-120, dist l. 8558-8574 |
| Poids du code | `transformers.web.min.js` 450 Ko | [V] X1 |
| Runtime WASM | par défaut **chargé depuis `https://cdn.jsdelivr.net/npm/onnxruntime-web@<version>/dist/`**, variante `.asyncify` (sauf Safari < 26 sans WebGPU) | [V] X1 dist l. 8731-8741 |
| Tailles WASM ORT 1.30.0 | `ort-wasm-simd-threaded.wasm` 14,2 Mo (3,65 Mo gzip) ; `.jsep.wasm` 28,3 Mo (6,6 Mo) ; `.asyncify.wasm` 26,8 Mo (6,6 Mo) | [V] X2 |
| Modèles | par défaut depuis `https://huggingface.co/{model}/resolve/{revision}/` ; `allowLocalModels` est faux dans le navigateur par défaut, `env.remoteHost` et `env.localModelPath` sont réglables | [V] X1 dist l. 132-137 |
| Cache | `useBrowserCache` vrai si le Cache API est disponible, `cacheKey: "transformers-cache"` ; `useWasmCache` garde aussi le WASM en cache | [V] X1 dist l. 140-146 |
| Multi-thread WASM | ORT n'active les threads que si un `SharedArrayBuffer` peut être posté (`isMultiThreadSupported`), ce qui exige une page **cross-origin isolated** (en-têtes COOP/COEP) | [V] code X2 `ort.all.mjs` l. 25906-25915 ; exigence COOP/COEP [I, règle de la plate-forme web] |
| WebGPU dans ORT | import `onnxruntime-web/webgpu` (ou `ort.webgpu.min.js`) ; « WebGPU backend is still an experimental feature » ; tableau de compatibilité du README 1.30.0 : WebGPU ✔ sur Chrome/Edge Windows, Android, macOS ; ❌ sur Safari macOS et iOS et sur Firefox Windows | [V] X2 README l. 40-66, X3. Ce tableau est **en retard** sur W1 pour Safari 26 et Firefox 141 [I] |

### 4.2 WebGPU dans les navigateurs (W1, 2026-09-24)

| Navigateur | Depuis | Restrictions notées |
|---|---|---|
| Chrome / Edge desktop | 113 (ChromeOS, macOS, Windows) ; 144 ajoute Linux | Linux : « Intel Gen12+ GPUs only » |
| Chrome Android, WebView Android | 121 | — |
| Samsung Internet | 25.0 | — |
| Safari macOS, **Safari iOS** | **26** | — |
| Firefox desktop | 141 (partiel) | Windows depuis 141 ; macOS Tahoe Apple Silicon depuis 145 ; macOS plus ancien Apple Silicon depuis 147 ; **pas de macOS Intel, pas de Linux** ; pas dans les service workers |
| Firefox Android | non | — |

Il faut donc **toujours** prévoir le repli WASM [V]. Sur les navigateurs sans WebGPU (Firefox Linux et Android, anciens iOS), SlimSAM tournera sur CPU [I, durée à mesurer].

### 4.3 Hors ligne et vie privée

- Après le premier chargement, les poids et le WASM sont relus depuis le Cache API : le détourage fonctionne ensuite **sans réseau** [V X1 mécanisme ; I bout à bout].
- Le Cache API est du stockage « best-effort » : il peut être évincé ; `navigator.storage.persist()` le protège (Firefox affiche une demande à l'utilisateur, Chromium et Safari décident seuls). Safari, avec la protection contre le pistage, **supprime les données créées par script d'une origine sans interaction depuis 7 jours** d'utilisation du navigateur [V W2]. Il faut donc prévoir un nouveau téléchargement silencieux et l'annoncer avec son poids réel [I].
- **Aucune image ne sort** : l'inférence est locale. Mais avec la configuration par défaut, le navigateur contacte `huggingface.co` et `cdn.jsdelivr.net` (IP, horodatage). Pour un site sans backend et sans tiers, on sert les fichiers `.onnx` et `.wasm` depuis **notre origine** (`env.remoteHost` ou `localModelPath` + `allowLocalModels`, `env.backends.onnx.wasm.wasmPaths`) [V réglages X1 ; I déploiement].

---

## 5. Géométrie en aval avec manifold-3d 3.5.4 (M1)

Version épinglée : `"manifold-3d": "3.5.4"` dans `packages/geometry/package.json` [V]. Lignes citées dans le tarball npm `manifold-3d-3.5.4.tgz` :

| Besoin | API | Référence | Statut |
|---|---|---|---|
| Polygone(s) en mm → section | `constructor(contours: Polygons, fillRule?: FillRule)` ; `static ofPolygons(contours, fillRule?)` ; « A boolean union operation (with Positive filling rule by default) is performed » | `manifold-encapsulated-types.d.ts` l. 105-117, 388 ; binding `Module.CrossSection=function(polygons,fillRule="Positive")` dans `manifold.js` | [V] |
| Types | `SimplePolygon = Vec2[]`, `Polygons = SimplePolygon \| SimplePolygon[]`, `FillRule = 'EvenOdd'\|'NonZero'\|'Positive'\|'Negative'`, `JoinType = 'Square'\|'Round'\|'Miter'` | `manifold-global-types.d.ts` l. 80-81, 115, 117 | [V] |
| Jeu autour de l'objet | `offset(delta, joinType?, miterLimit?, circularSegments?)` ; `delta` dans les unités du polygone (mm chez nous), positif = les contours extérieurs grossissent et les trous rétrécissent ; défaut `Round` ; `miterLimit` 2 au minimum ; renvoie vers Clipper2 | `.d.ts` l. 240-263 ; défauts `offset=function(delta,joinType="Round",miterLimit=2,circularSegments=0)` dans `manifold.js` | [V] |
| Nettoyage | `simplify(epsilon?)` (défaut 1e-6) ; « recommended to apply this function following Offset » | `.d.ts` l. 265-282 | [V] |
| Unions, doigts | `add`, `subtract`, `intersect`, `static union([...])`, `static difference([...])`, `hull()`, `static circle(radius, circularSegments?)` | `.d.ts` l. 284-355, 140 | [V] |
| Mesures exactes | `area()`, `bounds()`, `numVert()`, `toPolygons()` | `.d.ts` l. 394-428 | [V] |
| Poche | `extrude(height, nDivisions?, twistDegrees?, scaleTop?, center?)` → `Manifold` ; aussi `Manifold.extrude(polygons, height, …)` | `.d.ts` l. 161-163, 554-556 | [V] |
| Creuser le bac | `Manifold.subtract(other: Manifold)` ; `static difference(manifolds[])` | `.d.ts` l. 883, 904, 925 | [V] |

Remarques [I] :

- Les contours de `findContours` alternent extérieur et trous ; `fillRule: 'EvenOdd'` évite de devoir réorienter les trous (sinon, avec `Positive`, les trous doivent être dans le sens inverse de l'extérieur).
- Un **chanfrein** d'entrée de poche ne se fait pas avec `scaleTop` (mise à l'échelle et non décalage). Il faut empiler quelques tranches `offset(+k)` extrudées, ou faire l'enveloppe convexe de deux tranches par morceau convexe. À prototyper.
- Aucune nouvelle dépendance géométrique n'est nécessaire (ADR 0004). Le lissage (Chaikin, RDP en mm) tient en quelques dizaines de lignes, sinon `simplify(epsilon)` suffit.

---

## 6. Géométrie de la prise de vue

### 6.1 Taille d'un pixel

A4 = 297 × 210 mm. Le pixel utile est limité par le côté le plus contraint [V calcul].

| Capteur | Définition | Feuille = 100 % du cadre | Feuille = 80 % du cadre |
|---|---|---|---|
| 12 MP (4:3) | 4032 × 3024 | **0,074 mm/px** | 0,092 mm/px |
| 48 MP (4:3) | 8064 × 6048 | **0,037 mm/px** | 0,046 mm/px |
| Entrée SAM | 1024 px de grand côté | 0,290 mm/px | 0,363 mm/px |
| Masque SAM | 256 px | 1,16 mm/px | 1,45 mm/px |
| Scanner 300 dpi | A4 = 2480 × 3508 px | **0,0847 mm/px** | — |
| Scanner 600 dpi | A4 = 4961 × 7016 px | **0,0423 mm/px** | — |

Beaucoup de téléphones « 48 MP » enregistrent par défaut en 12 MP (regroupement de pixels) [I]. La résolution du capteur n'est pas le facteur limitant : la netteté, le bruit et la parallaxe le sont [I].

### 6.2 Parallaxe d'un objet épais

Modèle sténopé, caméra à la distance d au-dessus de la feuille, axe optique perpendiculaire. Un point à la hauteur h, à la distance r (mesurée dans le plan de la feuille) du pied de l'axe optique, se projette sur le plan de la feuille à r' = r·d/(d−h). L'erreur est donc :

  **Δ = r · h / (d − h)** (vers l'extérieur, en s'éloignant du centre de l'image) [V calcul].

Pour un objet à flancs droits, le bord le plus éloigné du centre est agrandi par l'arête du haut ; le bord tourné vers le centre reste celui de la base (l'arête du haut part vers l'extérieur et se cache derrière l'objet) [I géométrie]. Ce qu'on voit est donc l'union de la base et du dessus projeté.

Erreur relative h/(d−h), et erreur absolue pour un bord à r = 100 mm et à r = 10 mm du centre :

| d \ h | 10 mm | 20 mm | 30 mm |
|---|---|---|---|
| **300 mm** | 3,45 % → **3,45 mm** à r = 100 ; 0,34 mm à r = 10 | 7,14 % → **7,14 mm** ; 0,71 mm | 11,1 % → **11,1 mm** ; 1,11 mm |
| **500 mm** | 2,04 % → **2,04 mm** ; 0,20 mm | 4,17 % → **4,17 mm** ; 0,42 mm | 6,38 % → **6,38 mm** ; 0,64 mm |
| **1000 mm** | 1,01 % → **1,01 mm** ; 0,10 mm | 2,04 % → **2,04 mm** ; 0,20 mm | 3,09 % → **3,09 mm** ; 0,31 mm |

Distance minimale pour tenir une erreur ε : d ≥ h·(1 + r/ε). Pour ε = 0,5 mm : h = 10 mm → d ≥ 1,01 m à r = 50 mm, 2,01 m à r = 100 mm ; h = 20 mm → 2,02 m et 4,02 m ; h = 30 mm → 3,03 m et 6,03 m [V calcul]. `gridfinity-tracer` donne le même ordre de grandeur : « A tool 20 mm tall shot from 50 cm away traces about 4% oversize » [V T4].

Leviers, du plus simple au plus coûteux [I] :

1. **Centrer l'objet** sous l'objectif et photographier **un objet à la fois** : r devient la demi-largeur de l'objet (et non sa distance au centre de la feuille). Un outil de 20 mm de large et 20 mm d'épaisseur, pris à 50 cm : 10 × 4,17 % = **0,42 mm** par bord.
2. **Photo de loin avec le zoom** (téléobjectif ×2 ou ×3) : d double ou triple, l'erreur est divisée d'autant.
3. **Correction par la hauteur** : l'utilisateur saisit h. On estime d à partir de l'homographie et de la focale (EXIF `FocalLengthIn35mmFilm`, absente des captures `getUserMedia`), puis on ramène le bord extérieur de h/(d−h). C'est un calcul exact si d est connu, mais d n'est qu'estimé : cela reste une correction et non une mesure.
4. **Scanner à plat** : projection orthographique dans le sens du défilement, mais pas forcément en travers (optique à réduction des scanners CCD). Profondeur de champ faible des capteurs CIS, couvercle qui ne ferme pas sur un objet épais.

### 6.3 Autres sources d'erreur

- **Dimensions réelles de la feuille** : la norme ISO 216 admet des tolérances de l'ordre de ±2 mm sur les côtés de 150 à 600 mm [I, norme payante non lue]. 2 mm sur 297 mm font 0,67 %, soit 1,3 mm sur un outil de 200 mm. Il faut proposer de **saisir les cotes mesurées** de la feuille, et mesurer quelques ramettes dans le prototype.
- **Pointé des coins** : une erreur de 2 px à 0,1 mm/px fait 0,2 mm sur 297 mm, soit 0,07 % [V calcul] : négligeable devant la parallaxe.
- **Distorsion de l'objectif** : l'homographie ne la corrige pas. Les téléphones la corrigent en grande partie dans leur traitement d'image [I].
- **Feuille non plane**, ombre portée, reflets : sans remède géométrique [I]. Le rétroéclairage (tablette ou écran blanc sous une feuille fine, ou vitre) supprime l'ombre et rend le seuillage presque binaire, mais la feuille devient translucide et ses bords moins nets [I, à tester].

---

## 7. Comparaison des chaînes

| Critère | A. Classique OpenCV.js | A'. Classique en TypeScript pur | B. SlimSAM-77 (transformers.js) | C. SAM 2.1 tiny | D. Scanner / import SVG-DXF / STL |
|---|---|---|---|---|---|
| Téléchargement | 3,5 Mo gzip (10,96 Mo brut) [V] | ~0 (code maison) [I] | 13,8 Mo (q) à 39,9 Mo (fp32) + runtime ORT 3,7 à 6,6 Mo gzip + 0,45 Mo JS [V] | 33,6 Mo (q4f16) à 155,7 Mo + runtime [V] | 0 |
| Licence | Apache-2.0 [V] | MIT (nous) | Apache-2.0 (modèle, transformers.js), MIT (ORT) [V] | Apache-2.0 [V] | — |
| Hors ligne | oui, après le 1er chargement [I] | oui | oui, après le 1er chargement et avec auto-hébergement [I] | idem | oui |
| Clics | 4 coins (auto + correction) + 1 clic par objet | idem | idem + clics négatifs | idem | aucun (scanner : échelle connue par le dpi) |
| Résolution du bord | pleine résolution (0,04 à 0,1 mm/px) [V calcul] | idem | grille de masque 1,16 mm/px sur A4 entière, 0,4 à 0,8 mm/px recadré [V/I] | idem, image étirée en carré [V] | 0,04 à 0,085 mm/px [V] |
| Fonds difficiles (acier brillant sur blanc, sombre sur sombre) | faible [V T4] | faible | bon, selon les projets [I] | bon [I] | scanner : bon (fond uniforme du capot) [I] |
| Déterminisme | total | total | total à poids fixés, mais boîte noire | idem | total |
| Parallaxe | la même pour toutes les chaînes photo (§ 6.2) | idem | idem | idem | aucune (import) ; faible (scanner) [I] |

---

## Recommandation provisoire

Pour le **prototype** `prototypes/shadowbox-trace/` (jetable) :

1. **Chaîne par défaut : vision classique**, avec OpenCV.js 4.13.0 officiel chargé à la demande dans un Web Worker (3,5 Mo gzip, uniquement sur la page shadowbox). OpenCV donne tout de suite `findContours`, les seuils, `grabCut`, `IntelligentScissorsMB` et ArUco, ce qui permet de comparer les méthodes vite. La décision OpenCV contre TypeScript pur (piste A') se prendra après les mesures : si seuls l'homographie, Otsu, la morphologie et le suivi de contour servent, une réécriture sans dépendance (comme `tooltrace-designer`) sera plus légère.
   - Redressement à **10 px/mm** (comme Tracefinity) et non 4 px/mm, pour que le pixel (0,1 mm) reste bien sous la tolérance.
   - Détourage : distance à la couleur du papier ou Otsu, puis morphologie, composante sous le clic, trous conservés, Douglas-Peucker en mm (0,1 à 0,3 mm).
   - Sortie : polygone en mm → `CrossSection` (`EvenOdd`) → `offset(jeu, 'Round')` → `simplify` → `extrude` → `subtract` (manifold-3d 3.5.4, aucune nouvelle dépendance).
2. **Option : SlimSAM-77** (`Xenova/slimsam-77-uniform`, fp16 20,8 Mo ou quantifié 13,8 Mo, à comparer) via transformers.js 4.3.0, WebGPU avec repli WASM, **servi depuis notre origine** et mis en cache. Utilisation : **recadrer** sur la boîte de l'objet avant l'encodage, puis recaler le bord à pleine résolution par la méthode classique dans une bande étroite (hybride). SAM 2.1 tiny q4f16 (33,6 Mo) sert de deuxième candidat si SlimSAM déçoit. IS-Net, BiRefNet et RMBG sont écartés : licences ambiguës ou non commerciales, et 44 à 224 Mo.
3. **Mise en place à guider dans l'UI**, et à valider par les mesures :
   - Feuille **A4 ou Letter** posée à plat sur un **fond sombre et mat** (les coins ressortent), option « cotes mesurées de ma feuille ».
   - **Un objet à la fois, centré** sous le téléphone, photo **de loin avec le zoom** et bien de face. Afficher l'erreur de parallaxe calculée à partir de la hauteur saisie de l'objet.
   - **Rétroéclairage** recommandé pour les outils brillants ou sombres. **Scanner** recommandé pour les objets plats (≤ ~5 mm) et comme référence de précision.
   - Le jeu par défaut doit absorber l'erreur restante. Tracefinity, tooltrace-designer et gridfinity-tracer proposent 0,3 à 2 mm ; notre défaut sortira des mesures.
4. **Pour les avancés** : import SVG/DXF (contour déjà en mm) et import STL soustrait tel quel (comme le Cutout de gridfinitygenerator.com).
5. **ArUco** : pas au début. Il faut imprimer les marqueurs à l'échelle exacte, ce que la feuille A4 évite. À réévaluer seulement si la feuille donne une échelle instable. `aruco_ArucoDetector` est déjà dans `opencv.js`.

Si la recommandation est retenue après les mesures : ADR « détourage hors ligne : classique par défaut, SlimSAM en option, modèles auto-hébergés », et entrée `ATTRIBUTIONS.md` (Apache-2.0 d'OpenCV, de SlimSAM et de transformers.js, MIT d'ORT).

---

## Questions ouvertes

Seuls le prototype et les mesures peuvent y répondre :

- **Q1. Précision réelle** par chaîne et par condition (fond blanc, fond sombre, rétroéclairage, scanner ; près ou loin avec zoom), sur 5 à 8 outils (clé plate, tournevis, pince, objet brillant, objet sombre, objet épais), 3 ou 4 cotes au pied à coulisse par outil. ±0,5 mm est-il atteint hors parallaxe ?
- **Q2. Justesse du bord SAM** : écart du bord SlimSAM (entier, recadré, hybride) par rapport au bord classique à pleine résolution et au pied à coulisse. Quantifié, fp16 ou fp32 changent-ils le bord ?
- **Q3. Temps et mémoire** : SlimSAM et SAM 2.1 tiny en WebGPU et en WASM (avec et sans threads, donc avec et sans COOP/COEP) sur un portable moyen, un Android moyen et un iPhone (Safari 26). Un onglet iOS tient-il OpenCV.js (11 Mo) + ORT (27 Mo) + modèle ?
- **Q4. Dimensions réelles des feuilles** A4 et Letter du commerce (quelques ramettes mesurées) : faut-il imposer la saisie des cotes ?
- **Q5. Détection automatique des coins** : taux de réussite sur fonds clairs et brillants. Faut-il un détecteur plus robuste (Hough, raffinement des bords) alors que `cornerSubPix` n'est pas exporté ?
- **Q6. Correction de parallaxe par la hauteur** : l'estimation de d (homographie + EXIF) est-elle assez stable pour être proposée, ou se limite-t-on à afficher l'erreur calculée et à guider la prise de vue ?
- **Q7. Rétroéclairage** : la feuille translucide garde-t-elle des coins détectables ? Faut-il une autre référence d'échelle dans ce mode (règle, carte bancaire de 85,60 × 53,98 mm) ?
- **Q8. OpenCV.js ou TypeScript pur** : quelles fonctions OpenCV le prototype a-t-il vraiment utilisées ? Un build sur mesure (`--config`) vaut-il la peine ?
- **Q9. Hébergement des poids** : servir 14 à 40 Mo de modèle depuis notre hébergement statique (limites de taille de fichier, bande passante) et gérer l'éviction du cache (règle des 7 jours de Safari).
- **Q10. Glossaire** : ajouter « détourage » (photo → masque) et « contour » (polygone en mm) à `CONTEXT.md` ?

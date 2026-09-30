# Prototype jetable : contour d'objet hors ligne pour les shadowbox (ticket #36)

> Question posée : peut-on passer d'une photo d'outils posés sur une feuille à un contour en mm exact à ±0,5 mm, puis à une poche, **entièrement dans le navigateur, sans backend** ? Quelle méthode par défaut (vision classique) et quelle option (SlimSAM) ?
>
> Recherche préalable : `docs/research/shadowbox-contour-hors-ligne.md`. C'est du code jetable : on ne le reprend pas tel quel.

## Lancer

```bash
# depuis ce dossier ; hors du workspace, comme les autres prototypes
pnpm install --ignore-workspace
pnpm assets   # dépose sous public/ OpenCV.js 4.13.0, SlimSAM-77 et le runtime ONNX (≈ 170 Mo, non versionnés)
pnpm dev      # la page : http://localhost:5179
pnpm bench    # le banc sur photos de synthèse : écrit results.md
```

## La page (`index.html`, `src/main.ts`)

1. **Photo** : les outils posés à plat sur une feuille A4 ou Letter (cotes mesurées possibles), sur un fond sombre.
2. **Coins** : détectés automatiquement (plus grande zone claire, quadrilatère, côtés recalés par droites ajustées) ; on les glisse pour corriger.
3. **Redressement** à 10 px/mm (0,1 mm par pixel).
4. **Clic sur un outil**, trois méthodes :
   - **Classique** (défaut) : distance de couleur au papier, dont l'éclairage est une surface quadratique ajustée sur la feuille ; seuil d'Otsu ; morphologie ; composante sous le clic ; bord replacé à mi-hauteur entre papier et objet.
   - **SlimSAM, 2 passes** : feuille entière (trouver l'objet), puis fenêtre recadrée autour de lui (précision) ; WebGPU ou WASM ; fp16, quantifié ou fp32.
   - **SlimSAM + bord recalé** : le masque SAM, puis le bord à mi-hauteur de la méthode classique dans une bande de 1,5 mm.
5. **Mesures** : rectangle d'aire minimale (L × l, comme un pied à coulisse), aire, et erreur de parallaxe estimée Δ = r·h/(d−h) au point du contour le plus éloigné du centre optique (h = épaisseur de l'objet, d = distance de prise de vue, saisies). On saisit les cotes au pied à coulisse : le tableau calcule les écarts et se copie en Markdown.
6. **Gabarit d'essai** : plaque ajourée (défaut 2 mm, jeu 0,5, paroi 3) ou poche avec fond, en STL, par manifold-3d : on l'imprime et on pose l'outil dedans.

Le panneau « Requêtes réseau » liste chaque origine contactée par la page : il doit n'y avoir que la sienne.

## Réponse (provisoire : synthèse et navigateur ; les vraies photos restent à mesurer)

**Oui, tout tient dans le navigateur.** Sur des photos de synthèse (12 MP, sans parallaxe), la chaîne classique tient les cotes à ±0,16 mm dans presque tous les cas, 0,31 mm au pire, et SlimSAM fait aussi bien. La page ne contacte que sa propre origine.

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
- **SAM n'apporte rien sur une photo propre** : la classique est déjà à ±0,3 mm, en 50 fois moins de temps et sans 20 à 40 Mo de modèle. Son intérêt éventuel est sur les vraies photos difficiles (reflets, ombres, objet de la couleur du fond), que la synthèse ne reproduit pas.

### Ce qui reste à mesurer, sur de vraies photos

La synthèse n'a ni parallaxe, ni ombre portée, ni reflet, ni vignetage réel, ni compression JPEG. Protocole avec la page :

1. 5 à 8 outils (clé plate, tournevis, pince, objet brillant, objet sombre, objet épais), 3 ou 4 cotes au pied à coulisse chacun.
2. Pour chaque condition (fond clair ou sombre, rétroéclairage, de près ou de loin avec zoom, scanner), une photo, un clic par outil avec chaque méthode, cotes au pied à coulisse saisies, « Ajouter au tableau ».
3. « Copier le tableau » et coller dans `RESULTS.md`, avec l'épaisseur h et la distance d pour chaque outil épais : la colonne « Parallaxe estimée » dit si l'écart s'explique par elle.
4. Imprimer un gabarit ajouré (2 mm, jeu 0,5) des outils les plus mal tracés : l'outil y entre-t-il, et avec quel jeu ?
5. Mesurer le temps de SlimSAM en WebGPU sur un portable et un téléphone (ligne « méthode » de l'état).

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

## Réponse

_(voir plus bas : banc de synthèse, puis mesures réelles à faire)_

# PROTOTYPE JETABLE v3 : direction « Studio » du générateur de baseplates

> Question posée : **à quoi doit ressembler l'écran du générateur de baseplates v1 ?**
> Troisième itération. La direction B « Studio » de la v2 est retenue (29/09/2026) ; A « Calibre » est abandonnée (son code reste dans l'historique git).
> Les prototypes vivent désormais sur `main`, dans `prototypes/`. Ce code ne sera pas repris tel quel dans `apps/web`.

## Lancer

```bash
cd prototypes/ui-directions
pnpm install
pnpm dev            # http://localhost:3100/
```

Raccourcis d'URL pour les captures : `?accent=<clé>`, `&magnets`, `&screws`, `&release`, `&lang=en`. Pastille jaune `{ }` : état des réglages en JSON (hors design évalué).

## Décisions de design (retours du 29/09/2026)

- **Direction Studio** : aperçu 3D plein écran sur fond studio, panneaux flottants aux formes douces, un seul accent, typo Outfit.
- **Accent : l'outremer est rejeté** (« pas beau »). Six candidats à comparer dans `lib/accents.ts` : orange signal, terre cuite, sapin, pétrole, moutarde, graphite (monochrome, plastique blanc). Texte sur l'accent ≥ 4,5:1 pour chacun. Pilule jaune en bas (‹ › ou ← →) ou `?accent=terracotta` dans l'URL. La baseplate prend la couleur de l'accent par défaut.
- **Panneau de réglages à gauche** (et non plus à droite). L'aperçu se recadre dans la zone restée visible (`insetLeft` dans `Preview3D`).
- **Familles en accordéon exclusif** : en ouvrir une referme les autres. Activer les aimants ou les vis ouvre leur section.
- **Menu Préférences en haut à droite** (icône engrenage) : langue (liste déroulante), unités, imprimante (buse, hauteur de couche), couleur de l'aperçu, puis Partager, Réinitialiser, Offrir un café. Rien de tout cela n'est dans la mise en page principale : la couleur de l'aperçu n'est pas un réglage de la baseplate.
- Mobile : même menu Préférences en haut à droite ; le dock du bas ne garde que les cotes, « Réglages » et « 3MF ».

## Captures v3 (`screenshots/v3/`)

| | Desktop 1440 px | Mobile 390 px |
|---|---|---|
| Par défaut | `desktop.png` | `mobile.png` |
| Aimants activés (section ouverte, les autres fermées) | `desktop-aimants.png` | `mobile-reglages.png` (panneau ouvert) |
| Menu Préférences | `desktop-preferences.png`, `desktop-langue.png` (liste ouverte) | `mobile-preferences.png` |
| EN, aimants + vis | `desktop-en.png` | |
| Accents candidats (aimants activés) | `accent-orange.png`, `accent-terracotta.png`, `accent-fir.png`, `accent-petrol.png`, `accent-mustard.png`, `accent-graphite.png` | |

Les captures `desktop*.png` et `mobile*.png` datent d'avant le rejet de l'outremer.

Note : les captures sont faites en Chromium headless (rendu WebGL logiciel). Ce rendu est si lent que les animations d'ouverture des menus n'avancent pas ; le script de capture les neutralise. Dans un vrai navigateur, elles se jouent normalement.

---

# Historique : v2 (2 directions visuelles, commit `de1a3ee`)

Stack : Next.js 16, Tailwind v4, Base UI (`@base-ui/react` 1.8 : Tabs, Switch, Slider, NumberField, ToggleGroup, Collapsible, Menu, Popover, Drawer), react-three-fiber 9 + drei 10 + `@react-three/postprocessing` (N8AO, SMAA, ToneMapping), lucide pour les petites icônes utilitaires.

## 1. Ce qui rend extrabold.tools réussi (étude du 29/09/2026)

Captures de référence (usage interne) : `screenshots/reference/extrabold-*.png` (1440 px et 390 px).

- **Une seule couleur.** Neutres « slate » (`#F8FAFC` fond, `#E2E8F0` bordures, `#64748B` texte secondaire, `#1E293B` encre) et un seul accent corail `#F75069`. L'accent sert à l'état actif, au CTA… et au modèle 3D lui-même : le produit est la couleur de la marque, tout l'écran est cohérent.
- **Typo unique**, Space Grotesk : titre d'outil 18 px/600, catégories en petites capitales 12 px/600 grises, nom du réglage 14–15 px/500, valeurs 14 px. Trois niveaux nets : catégorie > réglage > valeur.
- **Bordures plutôt qu'ombres.** Filets 1 px partout, aucune ombre sauf les popovers. Rayons petits et constants (4–8 px) ; le CTA « Download 3MF » est même à angle vif.
- **Contrôles :** curseur à piste fine (6 px, gris) remplie d'accent, pouce rond, et champ numérique « 6 mm » éditable à droite ; interrupteurs presque carrés (48 × 28, r 8, pouce carré) ; segmented « Direct / Grid / Preset / Path » avec icône + libellé ; **boutons-images** 90 × 108 (vignette claire avec pictogramme, libellé dessous), sélection = fond teinté à 20 % + libellé accent. Chaque réglage a son petit ↺ de remise à zéro.
- **Densité :** panneau de 400 px, tout visible, long défilement ; CTA collé en bas du panneau.
- **Rendu 3D :** three.js r182, env map HDRI (`/hdri.hdr`), plastique uni couleur accent, vue quasi isométrique très plongeante, fond blanc avec grille isométrique pointillée ton sur ton, pas d'ombre portée. Le cadrage remplit tout le canevas (quitte à déborder).
- **Mobile :** barre d'outils d'icônes en haut, aperçu sur ~45 % de l'écran, panneau qui défile dessous, CTA collant pleine largeur.
- **Limites** (où on peut faire mieux) : capitales pour chaque catégorie, défilement très long, pop-ups au démarrage (cookies, imprimante), pub dans l'aperçu, 3D plate (peu de volume, pas d'ombre, pas d'occlusion dans les poches).

On garde : une couleur, la rigueur des gris, les boutons-images, curseur + champ, le modèle teinté comme la marque. On ne reprend ni leurs illustrations, ni leur logo, ni leur corail, ni leurs capitales.

## 2. Ce qui est commun aux deux directions

- **Aperçu 3D (priorité n° 1)**, `components/Preview3D.tsx` + `components/plateGeometry.ts` :
  - Vraie silhouette de baseplate : dalle à coins arrondis, **poches au profil de la spec** (45° 0,7 mm / vertical 1,8 mm / 45° 2,15 mm, rayon 4 → 1,15 mm, plat de muret de 0,8 mm = Top Cutoff 0,4), une géométrie de poche instanciée (`InstancedMesh`) par cellule ; profil Hybride = 0,35 mm de muret vertical sous le profil.
  - Sans aimants ni vis : cadre **ouvert** (comme la baseplate réelle et extrabold). Avec aimants ou vis : dalle pleine de 2,8 mm percée de 4 logements Ø d + tolérance par cellule (13 mm du centre), fonds assombris, trous d'éjection traversants ; vis = fraisage conique + tige.
  - Plastique PLA : `meshPhysicalMaterial` (rugosité 0,48, clearcoat 0,2). Éclairage **studio procédural** (5 `Lightformer` dans un `Environment` : plafond, grande boîte arrière pour le reflet, clé chaude, contre froide, débouchage) + lampe directionnelle à ombres + hémisphère. Pas de HDRI téléchargé : rendu identique hors ligne, pas de question de licence.
  - Occlusion ambiante N8AO (fond des poches), `ContactShadows` + ombre portée sur sol invisible, SMAA, tone mapping **ACES** (le fond est précompensé pour garder la teinte CSS exacte).
  - `OrbitControls` amortis, pan désactivé, zoom borné. **Cadrage automatique animé** (0,7 s) à chaque changement de taille : recherche de la distance où les 8 coins tiennent dans la zone réellement visible (décalage de projection pour ne pas passer sous un panneau flottant ou le panneau mobile). En portrait, vue plus plongeante et baseplate tournée pour occuper la hauteur. Bouton « Recentrer la vue ».
  - Sélecteur de filament (5 pastilles). La couleur rendue est légèrement corrigée (`render`) pour qu'après ACES le plastique ait la même teinte que la pastille.
- **Kit de contrôles** (`components/kit.tsx`), sans couleur propre : tout passe par des jetons CSS (`--accent`, `--ink`, `--line`, `--r-ctl`…) posés par chaque direction. Segmented, interrupteur, curseur + champ libre (virgule acceptée, ↑/↓ au clavier, validation à Entrée/sortie), longueur avec −/+ et « scrub » sur le libellé, boutons-images avec coche, pavé d'alignement 3 × 3, pastilles, bouton de téléchargement scindé 3MF/STL. États survol / focus clavier (anneau accent) / actif / désactivé visibles ; tout est atteignable au clavier (Base UI).
- **Illustrations maison** (`components/illustrations.tsx`) : coupes Hybride/Ras aux proportions de la spec, logement d'aimant plein / avec trou d'éjection, vis fraisée, tiroir coté, grille comptée, pavés d'alignement, marque « poche vue de dessus ». Trait 1,5 px, matière à 10 %, et **l'accent n'apparaît que sur l'option sélectionnée** (variable `--art`), le reste est monochrome.
- **Mobile :** le panneau s'ouvre par le bas sur 58 % de la hauteur, sans voile : l'aperçu reste visible au-dessus et se recadre, on voit l'effet de chaque réglage.
- Contenu identique à la v1 (libellés du glossaire `CONTEXT.md`, textes EN dans `lib/settings.ts`).

## 3. Direction A « Calibre » : l'instrument de mesure

Intention : la plus proche d'extrabold dans la structure (panneau latéral qui défile, tout visible, filets plutôt qu'ombres), mais avec sa propre voix : **les cotes**. La taille de la baseplate s'affiche en très gros chiffres tabulaires sur l'aperçu, comme sur un pied à coulisse, et la baseplate est posée sur un **tapis quadrillé au pas de 42 mm** : le fond de l'aperçu est lui-même une grille Gridfinity. Angles serrés, gris froids d'atelier, orange signal.

| Jeton | Hex |
|---|---|
| Fond de page | `#ECEEF1` (aperçu `#E9EBEE`, tapis `#D6D9DE` / `#B9BEC7`) |
| Surface | `#FFFFFF` |
| Creux (pistes, onglets) | `#F2F3F5` |
| Filet / filet fort | `#E2E4E8` / `#C9CDD4` |
| Encre / secondaire / discret | `#15171C` / `#676D78` / `#9AA0AA` |
| **Accent orange signal** | `#F26A21` (texte d'accent `#B8470C`, texte sur accent `#1A0F08`, teinte `#FFF0E6`) |

- Typo : **Instrument Sans** (grotesque étroite, précise), une seule famille, chiffres tabulaires. Titres de section 14,5 px/600 en casse normale (pas de capitales), cotes 40 px/600.
- Rayons : 6 px contrôles, 8 px cartes, interrupteur à coins de 5 px. Texte **foncé sur l'orange** (contraste 7:1, look outillage).
- Filaments : Orange signal, Blanc, Galet, Graphite, Sauge.
- Mobile : barre fixe en bas (résumé + « Réglages » en noir), 3MF dans l'en-tête, unités/langue/impression/partage/don dans « … ».

## 4. Direction B « Studio » : la photo produit

Intention : l'aperçu d'abord. La baseplate occupe tout l'écran sur un **fond studio** (dégradé radial clair) et tout le reste flotte : pilule de marque, pilule d'actions, **panneau de réglages flottant à droite** en accordéon (une ligne par famille avec icône et résumé ; l'icône passe en bleu quand Aimants ou Vis sont activés), cotes en tête de panneau, **gros CTA en bas du panneau**. Formes douces, ombres légères, bleu outremer.

| Jeton | Hex |
|---|---|
| Fond / studio | `#F1F1F3` ; dégradé `#F6F6F7` → `#DADBE0` |
| Surface | `#FFFFFF` (pilules : blanc à 86 % + flou) |
| Creux | `#F3F3F6` |
| Filet / filet fort | `#E8E8ED` / `#CFD0D8` |
| Encre / secondaire / discret | `#121319` / `#6B6D78` / `#A0A2AD` |
| **Accent outremer** | `#2F4BF5` (texte blanc sur accent, teinte `#EEF1FF`) |

- Typo : **Outfit** (géométrique, ronde, compacte), une seule famille. Cotes 28 px/600 serrées.
- Rayons : 10 px contrôles, 14 px cartes, 22 px panneau, interrupteurs en pilule.
- Filaments : Outremer, Blanc, Galet, Graphite, Sable.
- Mobile : dock flottant en bas (cotes + « Réglages » + « 3MF »), pastilles de filament au-dessus, « … » en haut à droite.

## Captures (`screenshots/v2/`)

| | Desktop 1440 px | Mobile 390 px |
|---|---|---|
| A sans aimants | `A-desktop.png` | `A-mobile.png` |
| A avec aimants | `A-desktop-aimants-vis.png` (+ vis) | `A-mobile-reglages-aimants.png` (panneau ouvert) |
| B sans aimants | `B-desktop.png` | `B-mobile.png` |
| B avec aimants | `B-desktop-aimants-vis.png` (+ vis) | `B-mobile-reglages-aimants.png` (panneau ouvert) |
| Détail 3D | `B-desktop-zoom-3d.png` (aimants, trous d'éjection, vis) | |

Les captures v1 rejetées restent dans `screenshots/` (A/B/C-*.png).

## Autocritique (contre extrabold) et corrections faites

1er passage → corrigé :
- Plastique délavé et « saumon » (ACES + trop de lumière) → lumières baissées, reflet de boîte arrière, couleur de rendu corrigée par filament.
- Fond d'aperçu grisâtre au lieu de la teinte voulue (le dégradé 8 bits saturait avant ACES) → fond en shader précompensé.
- Aucune ombre au sol, puis carré gris sous la plaque (le compositeur coupe `autoClear` et le canevas opaque vide en alpha 1) → correctif `AutoClearForShadows`.
- Plaque coupée à droite (cadrage calculé sur la mauvaise zone) → cadrage sur la zone visible réelle.
- Tapis 42 mm invisible → fondu calculé depuis l'origine, contraste relevé.
- Accent partout dans les illustrations (9 pavés orange) → accent réservé à l'option choisie.
- Mobile : plaque minuscule en portrait, panneau qui masquait l'aperçu → vue plongeante tournée, panneau à 58 % sans voile et recadrage.

Reste perfectible : le bleu vire au marine sur les chants (ACES) ; petites lignes de z-fighting visibles de très près en bord de marge ; le panneau B vide en bas quand tout est replié ; la pilule de prototype masque un peu de contenu sur mobile.

## Choix faits sans toi (à valider)

- **Pas de HDRI** : environnement procédural (Lightformers). Plus léger, sans licence, identique hors ligne. Un vrai HDRI studio pourrait être essayé plus tard.
- **ACES** comme demandé, avec deux compensations (fond précompensé, couleur de rendu par filament). `NeutralToneMapping` garderait mieux les couleurs de marque sans correction : à tester.
- **Filament par défaut = couleur d'accent**, comme extrabold : l'écran reste d'une seule couleur.
- **Vis** placées au centre des cellules dans l'aperçu (extrabold les met aux intersections) : décor, à caler sur le vrai moteur.
- **Sans aimants ni vis, cadre ouvert** ; avec l'un des deux, dalle pleine de 2,8 mm (hauteur affichée en conséquence).
- Le profil **Ras** n'est plus décrit « comme extrabold » (on ne cite pas un concurrent dans l'interface).
- Mobile : panneau non modal à 58 % au lieu d'un plein écran, pour garder l'aperçu vivant.

## Points à trancher

1. **Structure** : A (panneau fixe, tout visible, dense) ou B (aperçu plein écran, panneau flottant en accordéon) ?
2. **Accent** : orange signal (texte foncé) ou outremer (texte blanc) ? Ou un autre, avec le même système.
3. **Typo** : Instrument Sans (étroite, technique) ou Outfit (ronde, produit) ?
4. **Fond d'aperçu** : tapis quadrillé 42 mm (A) ou studio neutre (B) ?
5. **Place du téléchargement** : en-tête (A) ou bas du panneau (B) ?
6. **Coût du rendu** : N8AO + ombres coûtent sur les petites machines ; prévoir un mode « léger » automatique ?
7. **Nom** : « Pocketfit » reste un placeholder.
